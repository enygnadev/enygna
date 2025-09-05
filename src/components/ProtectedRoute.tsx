'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { hasSystemAccess, canAccessRoute, handlePermissionError } from '@/lib/securityHelpers';

interface ProtectedRouteProps {
  children: ReactNode;
  sistema?: string;
  route?: string;
  adminOnly?: boolean;
  fallback?: ReactNode;
}

export default function ProtectedRoute({ 
  children, 
  sistema, 
  route, 
  adminOnly = false,
  fallback 
}: ProtectedRouteProps) {
  const { loading, user, profile } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">Você precisa estar logado para acessar esta página.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Ir para Home
          </button>
        </div>
      </div>
    );
  }

  // Verificar acesso administrativo
  if (adminOnly && !profile?.claims?.role) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-gray-600 mb-4">Esta área é restrita a administradores.</p>
          <button 
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Verificar acesso ao sistema específico
  if (sistema && !hasSystemAccess(sistema, user)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Sistema Não Disponível</h2>
          <p className="text-gray-600 mb-4">
            Você não tem acesso ao sistema {sistema}. Entre em contato com o administrador.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
          >
            Voltar
          </button>
          <button 
            onClick={() => window.location.href = '/sistemas'}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Ver Sistemas Disponíveis
          </button>
        </div>
      </div>
    );
  }

  // Verificar acesso à rota específica
  if (route && !canAccessRoute(route, user)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">Você não tem permissão para acessar esta rota.</p>
          <button 
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}