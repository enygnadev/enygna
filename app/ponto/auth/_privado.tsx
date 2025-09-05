'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';

export default function PontoPrivado() {
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
        if (userData.role === 'admin' || userData.role === 'adminmaster' || userData.role === 'superadmin') {
          router.push('/ponto/empresa');
        } else {
          router.push('/ponto/colaborador');
        }
      } else {
        router.push('/ponto/colaborador');
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      router.push('/ponto/colaborador');
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