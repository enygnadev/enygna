
'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ChamadosSessionProfile } from '@/src/types/chamados';

export function useChamadosSessionProfile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ChamadosSessionProfile | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Verificando acesso ao sistema chamados para:', user.email);
        
        // Buscar dados do usuário na coleção unificada users
        const userDocRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userDocRef);
        
        if (snap.exists()) {
          const userData = snap.data();
          console.log('📊 Dados do usuário encontrados:', userData);
          
          // Verificar se tem acesso ao sistema chamados
          const sistemasAtivos = userData.sistemasAtivos || [];
          const temAcessoChamados = sistemasAtivos.includes('chamados') || 
                                 userData.permissions?.canAccessSystems?.includes('chamados') ||
                                 ['superadmin', 'admin', 'adminmaster'].includes(userData.role);

          if (temAcessoChamados) {
            console.log('✅ Usuário tem acesso ao sistema chamados');
            setProfile({
              uid: user.uid,
              email: user.email || undefined,
              displayName: user.displayName || userData.displayName,
              role: userData.role || 'colaborador',
              empresaId: userData.empresaId || userData.company,
              departamento: userData.departamento,
              permissions: {
                canCreateTickets: true,
                canAssignTickets: ['admin', 'superadmin', 'adminmaster', 'gestor'].includes(userData.role),
                canCloseTickets: ['admin', 'superadmin', 'adminmaster', 'gestor'].includes(userData.role),
                canViewAllTickets: ['admin', 'superadmin', 'adminmaster', 'gestor'].includes(userData.role),
                canManageUsers: ['admin', 'superadmin', 'adminmaster'].includes(userData.role),
                canViewReports: ['admin', 'superadmin', 'adminmaster', 'gestor'].includes(userData.role),
              }
            });
          } else {
            console.log('❌ Usuário não tem acesso ao sistema chamados');
            setProfile(null);
          }
        } else {
          console.log('❌ Documento do usuário não encontrado');
          setProfile(null);
        }
      } catch (error) {
        console.error('Erro ao carregar perfil do sistema de chamados:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return { loading, profile };
}

// Helper para verificar se o usuário tem acesso ao sistema de chamados
export function hasTicketSystemAccess(profile: ChamadosSessionProfile | null): boolean {
  return profile !== null;
}

// Helper para verificar se pode criar chamados
export function canCreateTickets(profile: ChamadosSessionProfile | null): boolean {
  if (!profile) return false;
  return profile.permissions?.canCreateTickets || false;
}

// Helper para verificar se pode gerenciar chamados
export function canManageTickets(profile: ChamadosSessionProfile | null): boolean {
  if (!profile) return false;
  return ['adminmaster', 'superadmin', 'admin', 'gestor'].includes(profile.role);
}
