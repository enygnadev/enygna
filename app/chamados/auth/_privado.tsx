'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';

// Componente privado carregado apenas após autenticação
export default function ChamadosPrivado() {
  const router = useRouter();

  useEffect(() => {
    checkUserPermissions();
  }, []);

  const checkUserPermissions = async () => {
    try {
      if (!auth.currentUser?.uid) return;

      // Verificar na coleção users
      const usersRef = doc(db, 'users', auth.currentUser.uid);
      const usersSnapshot = await getDoc(usersRef);

      if (usersSnapshot.exists()) {
        const userData = usersSnapshot.data();
        const role = userData.role?.toLowerCase();

        if (role === 'superadmin' || role === 'admin' || role === 'adminmaster') {
          router.push('/chamados/admin');
          return;
        }
      }

      // Verificar no sistema de chamados
      const chamadosUserRef = doc(db, 'chamados_users', auth.currentUser.uid);
      const chamadosUserSnap = await getDoc(chamadosUserRef);

      if (chamadosUserSnap.exists()) {
        const userData = chamadosUserSnap.data();
        const role = userData.role?.toLowerCase();

        if (role === 'adminmaster' || role === 'admin') {
          router.push('/chamados/admin');
        } else {
          router.push('/chamados');
        }
      } else {
        router.push('/chamados');
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      router.push('/chamados');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Verificando permissões...</p>
      </div>
    </div>
  );
}