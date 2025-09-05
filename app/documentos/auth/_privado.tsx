'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';

export default function DocumentosPrivado() {
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
        router.push('/documentos');
      } else {
        router.push('/documentos');
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      router.push('/documentos');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Carregando documentos...</p>
      </div>
    </div>
  );
}