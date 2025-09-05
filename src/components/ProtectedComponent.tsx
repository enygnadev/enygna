'use client';

import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface ProtectedComponentProps {
  children: ReactNode;
  requiredRoles?: string[];
  requireEmailVerification?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * Componente wrapper para proteger conteúdo sensível
 * Exemplo de uso:
 * 
 * <ProtectedComponent requiredRoles={['admin', 'gestor']}>
 *   <AdminDashboard />
 * </ProtectedComponent>
 */
export default function ProtectedComponent({
  children,
  requiredRoles = [],
  requireEmailVerification = false,
  fallback = <div>Carregando...</div>,
  redirectTo = '/login'
}: ProtectedComponentProps) {
  const { user, profile, claims, claimsLoaded, loading, hasRole, isEmailVerified } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    // Aguardar carregamento completo
    if (loading || !claimsLoaded) return;
    
    // Verificar autenticação
    if (!user) {
      router.push(redirectTo);
      return;
    }
    
    // Verificar email verificado
    if (requireEmailVerification && !isEmailVerified()) {
      router.push('/verify-email');
      return;
    }
    
    // Verificar roles
    if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
      router.push('/unauthorized');
      return;
    }
  }, [
    user, 
    loading, 
    claimsLoaded, 
    hasRole, 
    isEmailVerified, 
    requiredRoles, 
    requireEmailVerification, 
    redirectTo, 
    router
  ]);
  
  // Estados de carregamento
  if (loading || !claimsLoaded) {
    return <>{fallback}</>;
  }
  
  // Não autenticado
  if (!user) {
    return <>{fallback}</>;
  }
  
  // Email não verificado
  if (requireEmailVerification && !isEmailVerified()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Verificação de Email Pendente
          </h3>
          <p className="text-yellow-700">
            Por favor, verifique seu email para acessar este conteúdo.
          </p>
          <button
            onClick={() => router.push('/verify-email')}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Verificar Email
          </button>
        </div>
      </div>
    );
  }
  
  // Sem permissão
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Acesso Negado
          </h3>
          <p className="text-red-700">
            Você não tem permissão para acessar este conteúdo.
          </p>
          <p className="text-sm text-red-600 mt-2">
            Roles necessárias: {requiredRoles.join(', ')}
          </p>
          <p className="text-sm text-red-600">
            Sua role: {profile?.role || 'nenhuma'}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  // Autorizado - renderizar conteúdo
  return <>{children}</>;
}

/**
 * Exemplo de uso em uma página:
 * 
 * import ProtectedComponent from '@/components/ProtectedComponent';
 * 
 * export default function AdminPage() {
 *   return (
 *     <ProtectedComponent 
 *       requiredRoles={['admin', 'adminmaster']}
 *       requireEmailVerification={true}
 *     >
 *       <div>
 *         <h1>Painel Administrativo</h1>
 *         // Conteúdo admin aqui
 *       </div>
 *     </ProtectedComponent>
 *   );
 * }
 */