// src/lib/auth.ts
'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export type SessionProfile = {
  uid: string;
  email?: string;
  displayName?: string;
  role?: 'superadmin' | 'admin' | 'gestor' | 'colaborador' | 'adminmaster';
  empresaId?: string;
};

// Helper para verificar se é admin master
export function isAdminMaster(profile: SessionProfile | null): boolean {
  return profile?.role === 'adminmaster' || profile?.role === 'superadmin';
}

// Helper para verificar se tem acesso de administração
export function hasAdminAccess(profile: SessionProfile | null): boolean {
  return ['adminmaster', 'superadmin', 'admin', 'gestor'].includes(profile?.role || '');
}


export function useSessionProfile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SessionProfile | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        const d = snap.exists() ? (snap.data() as any) : {};
        setProfile({
          uid: u.uid,
          email: u.email || undefined,
          displayName: u.displayName || d.displayName,
          role: d.role || 'colaborador',
          empresaId: d.empresaId || undefined,
        });
      } catch {
        setProfile({
          uid: u.uid,
          email: u.email || undefined,
          displayName: u.displayName || undefined,
          role: 'colaborador',
        });
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return { loading, profile };
}