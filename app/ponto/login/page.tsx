'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PontoLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirecionar para a nova página de autenticação
    router.replace('/ponto/auth');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white'
    }}>
      <div>Redirecionando para autenticação...</div>
    </div>
  );
}