'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';

export default function FrotaPrivado() {
  const router = useRouter();

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      if (!auth.currentUser?.uid) return;
      
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role?.toLowerCase();
        
        if (role === 'admin' || role === 'adminmaster' || role === 'superadmin') {
          router.push('/frota/auth/admin');
        } else {
          router.push('/frota/colaborador');
        }
      } else {
        router.push('/frota/colaborador');
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      router.push('/frota/colaborador');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Verificando permissões de frota...</p>
      </div>
    </div>
  );
}