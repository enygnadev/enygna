
'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ChamadosSessionProfile, ChamadosUserDoc } from '@/src/types/chamados';

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
        // Buscar dados do usuário na coleção específica do sistema de chamados
        const userDocRef = doc(db, 'chamados_users', user.uid);
        const snap = await getDoc(userDocRef);
        
        if (snap.exists()) {
          const userData = snap.data() as ChamadosUserDoc;
          setProfile({
            uid: user.uid,
            email: user.email || undefined,
            displayName: user.displayName || userData.displayName,
            role: userData.role || 'colaborador',
            empresaId: userData.empresaId,
            departamento: userData.departamento,
            permissions: userData.permissions,
          });
        } else {
          // Se não existe no sistema de chamados, criar perfil básico
          setProfile({
            uid: user.uid,
            email: user.email || undefined,
            displayName: user.displayName || undefined,
            role: 'colaborador',
            permissions: {
              canCreateTickets: true,
              canAssignTickets: false,
              canCloseTickets: false,
              canViewAllTickets: false,
              canManageUsers: false,
              canViewReports: false,
            }
          });
        }
      } catch (error) {
        console.error('Erro ao carregar perfil do sistema de chamados:', error);
        // Fallback para perfil básico
        setProfile({
          uid: user.uid,
          email: user.email || undefined,
          displayName: user.displayName || undefined,
          role: 'colaborador',
          permissions: {
            canCreateTickets: true,
            canAssignTickets: false,
            canCloseTickets: false,
            canViewAllTickets: false,
            canManageUsers: false,
            canViewReports: false,
          }
        });
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
