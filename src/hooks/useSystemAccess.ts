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
        console.log('=== INICIANDO VERIFICAÇÃO DE SISTEMAS ===');
        console.log('Email do usuário:', user.email);
        console.log('UID do usuário:', user.uid);

        // Verificar se é admin/superadmin (tem acesso a tudo)
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        console.log('Documento do usuário existe?', userDoc.exists());
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('Dados do usuário encontrados:', userData);
          console.log('Email do usuário:', user.email);
          console.log('UID do usuário:', user.uid);

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
            setEmpresaId(userData.empresaId || userData.company || null);
            setLoading(false);
            return;
          }

          // Se tem empresaId, buscar sistemas da empresa
          if (userData.empresaId || userData.company) {
            const empresaId = userData.empresaId || userData.company;
            console.log('Buscando empresa pelo ID:', empresaId);

            try {
              const empresaDoc = await getDoc(doc(db, 'empresas', empresaId));
              if (empresaDoc.exists()) {
                const empresaData = empresaDoc.data();
                console.log('Dados da empresa encontrados:', empresaData);
                const sistemas = empresaData.sistemasAtivos || [];
                console.log('Sistemas ativos da empresa:', sistemas);
                setSystemsAvailable(sistemas);
                setEmpresaId(empresaId);
                setLoading(false);
                return;
              }
            } catch (error) {
              console.error('Erro ao buscar empresa por ID:', error);
            }
          }

          // NOVA VERIFICAÇÃO: Buscar por tipo = 'empresa' e email
          if (userData.tipo === 'empresa' || userData.role === 'empresa') {
            console.log('Usuário é do tipo empresa, buscando por email:', user.email);
            try {
              const empresaQuery = query(collection(db, 'empresas'), where('email', '==', user.email));
              const empresaSnapshot = await getDocs(empresaQuery);

              if (!empresaSnapshot.empty) {
                const empresaDoc = empresaSnapshot.docs[0];
                const empresaData = empresaDoc.data();
                const empresaId = empresaDoc.id;
                console.log('Empresa encontrada por email:', empresaId, empresaData);

                const sistemas = empresaData.sistemasAtivos || [];
                console.log('Sistemas da empresa:', sistemas);
                setSystemsAvailable(sistemas);
                setEmpresaId(empresaId);
                setLoading(false);
                return;
              }
            } catch (error) {
              console.error('Erro ao buscar empresa por email:', error);
            }
          }

          // VERIFICAÇÃO ADICIONAL: Buscar por userId vinculado à empresa
          if (userData.empresaId) {
            console.log('Buscando empresa pelo empresaId do usuário:', userData.empresaId);
            try {
              const empresaDoc = await getDoc(doc(db, 'empresas', userData.empresaId));
              if (empresaDoc.exists()) {
                const empresaData = empresaDoc.data();
                console.log('Empresa encontrada pelo empresaId:', empresaData);
                const sistemas = empresaData.sistemasAtivos || [];
                console.log('Sistemas da empresa (por empresaId):', sistemas);
                setSystemsAvailable(sistemas);
                setEmpresaId(userData.empresaId);
                setLoading(false);
                return;
              }
            } catch (error) {
              console.error('Erro ao buscar empresa por empresaId:', error);
            }
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
          console.log('Email para busca:', user.email);
          console.log('UID do usuário:', user.uid);

          // Primeiro, tentar buscar na coleção users por email
          try {
            const usersQuery = query(collection(db, 'users'), where('email', '==', user.email));
            const usersSnapshot = await getDocs(usersQuery);

            if (!usersSnapshot.empty) {
              const userDoc = usersSnapshot.docs[0];
              const userData = userDoc.data();
              console.log('Usuário encontrado por email:', userData);

              if (userData.sistemasAtivos && userData.sistemasAtivos.length > 0) {
                console.log('Sistemas encontrados no usuário por email:', userData.sistemasAtivos);
                setSystemsAvailable(userData.sistemasAtivos);
                setEmpresaId(userData.empresaId || userData.company || null);
                setLoading(false);
                return;
              }

              // Se é do tipo empresa, buscar na coleção empresas
              if (userData.tipo === 'empresa' || userData.role === 'empresa') {
                console.log('Usuário é empresa, buscando dados da empresa');
                try {
                  const empresaQuery = query(collection(db, 'empresas'), where('email', '==', user.email));
                  const empresaSnapshot = await getDocs(empresaQuery);

                  if (!empresaSnapshot.empty) {
                    const empresaDoc = empresaSnapshot.docs[0];
                    const empresaData = empresaDoc.data();
                    console.log('Dados da empresa encontrados:', empresaData);
                    const sistemas = empresaData.sistemasAtivos || [];
                    console.log('Sistemas da empresa:', sistemas);
                    setSystemsAvailable(sistemas);
                    setEmpresaId(empresaDoc.id);
                    setLoading(false);
                    return;
                  }
                } catch (error) {
                  console.error('Erro ao buscar empresa:', error);
                }
              }
            }
          } catch (error) {
            console.error('Erro ao buscar usuário por email:', error);
          }

          // BUSCA DIRETA NA COLEÇÃO EMPRESAS POR EMAIL (PRIORIDADE)
          console.log('Tentando busca direta na coleção empresas por email');
          try {
            const empresaQuery = query(collection(db, 'empresas'), where('email', '==', user.email));
            const empresaSnapshot = await getDocs(empresaQuery);

            if (!empresaSnapshot.empty) {
              const empresaDoc = empresaSnapshot.docs[0];
              const empresaData = empresaDoc.data();
              const empresaId = empresaDoc.id;
              console.log('Empresa encontrada diretamente por email:', empresaId, empresaData);

              const sistemas = empresaData.sistemasAtivos || [];
              console.log('Sistemas encontrados na empresa:', sistemas);
              setSystemsAvailable(sistemas);
              setEmpresaId(empresaId);
              setLoading(false);
              return;
            } else {
              console.log('Nenhuma empresa encontrada com o email:', user.email);
            }
          } catch (error) {
            console.error('Erro na busca direta por empresa:', error);
          }

          // BUSCA POR userId VINCULADO À EMPRESA
          console.log('Tentando buscar empresa por userId');
          try {
            const empresaQuery = query(collection(db, 'empresas'), where('userId', '==', user.uid));
            const empresaSnapshot = await getDocs(empresaQuery);

            if (!empresaSnapshot.empty) {
              const empresaDoc = empresaSnapshot.docs[0];
              const empresaData = empresaDoc.data();
              const empresaId = empresaDoc.id;
              console.log('Empresa encontrada por userId:', empresaId, empresaData);

              const sistemas = empresaData.sistemasAtivos || [];
              console.log('Sistemas encontrados na empresa (por userId):', sistemas);
              setSystemsAvailable(sistemas);
              setEmpresaId(empresaId);
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error('Erro ao buscar empresa por userId:', error);
          }

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

            // Se não encontrou por email, tentar por userId
            if (!empresaEncontrada) {
              try {
                const empresaByUserQuery = query(collection(db, collectionName), where('userId', '==', user.uid));
                const empresaByUserSnapshot = await getDocs(empresaByUserQuery);

                if (!empresaByUserSnapshot.empty) {
                  const empresaDoc = empresaByUserSnapshot.docs[0];
                  const empresaData = empresaDoc.data();
                  empresaEncontrada = empresaDoc.id;

                  console.log(`Empresa encontrada por userId em ${collectionName}:`, empresaDoc.id);

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
                console.log(`Erro ao buscar empresa por userId em ${collectionName}:`, error);
              }
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