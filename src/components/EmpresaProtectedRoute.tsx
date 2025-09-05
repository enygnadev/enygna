
'use client';

import { useAuth } from '@/src/hooks/useAuth';
import { useEffect, useState } from 'react';
import { empresaSecurityService } from '@/src/lib/empresaSecurityService';

interface EmpresaProtectedRouteProps {
  children: React.ReactNode;
  empresaId: string;
  requiredSystem?: string;
  fallback?: React.ReactNode;
}

export default function EmpresaProtectedRoute({ 
  children, 
  empresaId, 
  requiredSystem,
  fallback 
}: EmpresaProtectedRouteProps) {
  const { profile, loading, hasEmpresaAccess } = useAuth();
  const [hasSystemAccess, setHasSystemAccess] = useState<boolean>(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (loading || !profile) return;

      try {
        // Verificar acesso à empresa
        if (!hasEmpresaAccess(empresaId)) {
          setHasSystemAccess(false);
          setChecking(false);
          return;
        }

        // Se um sistema específico é requerido, verificar acesso
        if (requiredSystem) {
          const hasAccess = await empresaSecurityService.validateSystemAccess(
            profile.claims || null,
            empresaId,
            requiredSystem
          );
          setHasSystemAccess(hasAccess);
        } else {
          setHasSystemAccess(true);
        }
      } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        setHasSystemAccess(false);
      } finally {
        setChecking(false);
      }
    };

    checkAccess();
  }, [profile, loading, empresaId, requiredSystem, hasEmpresaAccess]);

  if (loading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h2>
          <p className="text-gray-600">Você precisa estar logado para acessar esta página.</p>
        </div>
      </div>
    );
  }

  if (!hasSystemAccess) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h2>
          <p className="text-gray-600">
            Você não tem permissão para acessar {requiredSystem ? `o sistema ${requiredSystem} desta` : 'esta'} empresa.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Entre em contato com o administrador se você acredita que isso é um erro.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
