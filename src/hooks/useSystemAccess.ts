
import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
        console.log('Verificando acesso aos sistemas para:', user.email);

        // Verificar se é admin/superadmin (tem acesso a tudo)
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('Dados do usuário encontrados:', userData);
          
          if (userData.role === 'superadmin' || userData.role === 'adminmaster' || userData.bootstrapAdmin) {
            console.log('Usuário é admin, concedendo acesso a todos os sistemas');
            setSystemsAvailable(['ponto', 'chamados', 'frota', 'financeiro', 'documentos', 'crm']);
            setLoading(false);
            return;
          }

          // Verificar sistemas ativos diretos no usuário
          if (userData.sistemasAtivos && userData.sistemasAtivos.length > 0) {
            console.log('Sistemas encontrados no usuário:', userData.sistemasAtivos);
            setSystemsAvailable(userData.sistemasAtivos);
            setEmpresaId(userData.empresaId || null);
            setLoading(false);
            return;
          }

          // Verificar empresa do usuário
          const userEmpresaId = userData.empresaId || userData.company;
          setEmpresaId(userEmpresaId);

          if (userEmpresaId) {
            console.log('Buscando empresa:', userEmpresaId);
            // Tentar buscar em diferentes coleções de empresas
            const collections = ['empresas', 'ponto-empresas', 'chamados_empresas', 'financeiro_empresas', 'documentos_empresas', 'crm_empresas'];
            
            let sistemasEncontrados: string[] = [];
            
            for (const collectionName of collections) {
              try {
                const empresaDoc = await getDoc(doc(db, collectionName, userEmpresaId));
                if (empresaDoc.exists()) {
                  const empresaData = empresaDoc.data();
                  const sistemas = empresaData.sistemasAtivos || [];
                  console.log(`Sistemas encontrados em ${collectionName}:`, sistemas);
                  
                  // Adicionar sistemas específicos baseados na coleção
                  if (collectionName === 'ponto-empresas') {
                    sistemasEncontrados.push('ponto');
                  } else if (collectionName === 'chamados_empresas') {
                    sistemasEncontrados.push('chamados');
                  } else if (collectionName === 'financeiro_empresas') {
                    sistemasEncontrados.push('financeiro');
                  } else if (collectionName === 'documentos_empresas') {
                    sistemasEncontrados.push('documentos');
                  } else if (collectionName === 'crm_empresas') {
                    sistemasEncontrados.push('crm');
                  } else {
                    // Para coleção 'empresas', usar os sistemas definidos
                    sistemasEncontrados = [...sistemasEncontrados, ...sistemas];
                  }
                }
              } catch (error) {
                console.log(`Erro ao buscar empresa em ${collectionName}:`, error);
              }
            }
            
            // Remover duplicatas
            const sistemasUnicos = [...new Set(sistemasEncontrados)];
            console.log('Sistemas únicos encontrados:', sistemasUnicos);
            setSystemsAvailable(sistemasUnicos);
          }
        } else {
          console.log('Documento do usuário não encontrado, tentando buscar por email');
          
          // Se não encontrou o usuário por UID, tentar buscar por email nas coleções de empresas
          const collections = ['empresas', 'ponto-empresas', 'chamados_empresas', 'financeiro_empresas', 'documentos_empresas', 'crm_empresas'];
          let sistemasEncontrados: string[] = [];
          let empresaEncontrada: string | null = null;
          
          for (const collectionName of collections) {
            try {
              const empresaQuery = query(collection(db, collectionName), where('email', '==', user.email));
              const empresaSnapshot = await getDocs(empresaQuery);
              
              if (!empresaSnapshot.empty) {
                const empresaDoc = empresaSnapshot.docs[0];
                const empresaData = empresaDoc.data();
                empresaEncontrada = empresaDoc.id;
                
                console.log(`Empresa encontrada em ${collectionName}:`, empresaDoc.id);
                
                // Adicionar sistemas baseados na coleção
                if (collectionName === 'ponto-empresas') {
                  sistemasEncontrados.push('ponto');
                } else if (collectionName === 'chamados_empresas') {
                  sistemasEncontrados.push('chamados');
                } else if (collectionName === 'financeiro_empresas') {
                  sistemasEncontrados.push('financeiro');
                } else if (collectionName === 'documentos_empresas') {
                  sistemasEncontrados.push('documentos');
                } else if (collectionName === 'crm_empresas') {
                  sistemasEncontrados.push('crm');
                } else {
                  // Para coleção 'empresas', usar os sistemas definidos
                  const sistemas = empresaData.sistemasAtivos || [];
                  sistemasEncontrados = [...sistemasEncontrados, ...sistemas];
                }
              }
            } catch (error) {
              console.log(`Erro ao buscar empresa por email em ${collectionName}:`, error);
            }
          }
          
          const sistemasUnicos = [...new Set(sistemasEncontrados)];
          console.log('Sistemas encontrados por email:', sistemasUnicos);
          setSystemsAvailable(sistemasUnicos);
          setEmpresaId(empresaEncontrada);
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
    if (systemsAvailable.includes('*') || systemsAvailable.length > 4) {
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
