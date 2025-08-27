
import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SystemAccess {
  hasAccess: (sistema: string) => boolean;
  systemsAvailable: string[];
  loading: boolean;
  empresaId: string | null;
}

export function useSystemAccess(user: User | null): SystemAccess {
  const [systemsAvailable, setSystemsAvailable] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  useEffect(() => {
    const checkSystemAccess = async () => {
      if (!user) {
        setSystemsAvailable([]);
        setLoading(false);
        return;
      }

      try {
        // Verificar se é admin/superadmin (tem acesso a tudo)
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          if (userData.role === 'superadmin' || userData.role === 'adminmaster' || userData.bootstrapAdmin) {
            setSystemsAvailable(['ponto', 'chamados', 'frota', 'financeiro', 'documentos', 'vendas', 'estoque', 'rh']);
            setLoading(false);
            return;
          }

          // Verificar empresa do usuário
          const userEmpresaId = userData.empresaId || userData.company;
          setEmpresaId(userEmpresaId);

          if (userEmpresaId) {
            // Tentar buscar em diferentes coleções de empresas
            const collections = ['empresas', 'companies', 'chamados_empresas', 'financeiro_empresas', 'documentos_empresas'];
            
            for (const collectionName of collections) {
              try {
                const empresaDoc = await getDoc(doc(db, collectionName, userEmpresaId));
                if (empresaDoc.exists()) {
                  const empresaData = empresaDoc.data();
                  const sistemas = empresaData.sistemasAtivos || [];
                  setSystemsAvailable(sistemas);
                  break;
                }
              } catch (error) {
                console.log(`Erro ao buscar empresa em ${collectionName}:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar acesso aos sistemas:', error);
        setSystemsAvailable([]);
      } finally {
        setLoading(false);
      }
    };

    checkSystemAccess();
  }, [user]);

  const hasAccess = (sistema: string): boolean => {
    if (!user) return false;
    
    // Admins sempre têm acesso
    if (systemsAvailable.includes('*') || systemsAvailable.length > 6) {
      return true;
    }
    
    return systemsAvailable.includes(sistema);
  };

  return {
    hasAccess,
    systemsAvailable,
    loading,
    empresaId
  };
}
