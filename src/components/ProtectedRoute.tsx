
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { hasAccess, canAccessRoute, getCurrentEmpresaId, isEmailVerified } from '@/src/lib/security';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredSystems?: string[];
  requiredRoles?: string[];
  requireEmailVerified?: boolean;
  requireEmpresa?: boolean;
  fallback?: React.ReactNode;
  onAccessDenied?: () => void;
}

export default function ProtectedRoute({
  children,
  requiredSystems = [],
  requiredRoles = [],
  requireEmailVerified = false,
  requireEmpresa = false,
  fallback = null,
  onAccessDenied
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [accessError, setAccessError] = useState<string>('');

  useEffect(() => {
    async function checkAccess() {
      if (!user) {
        setHasPermission(false);
        setAccessError('Usuário não autenticado');
        return;
      }

      try {
        // Verificar email verificado se necessário
        if (requireEmailVerified) {
          const emailVerified = isEmailVerified(profile);
          if (!emailVerified) {
            setHasPermission(false);
            setAccessError('Email não verificado. Verifique seu email antes de continuar.');
            return;
          }
        }

        // Verificar se possui empresa se necessário
        if (requireEmpresa) {
          const empresaId = getCurrentEmpresaId(profile);
          if (!empresaId) {
            setHasPermission(false);
            setAccessError('Usuário não está associado a uma empresa');
            return;
          }
        }

        // Verificar acesso aos sistemas e roles
        const canAccess = canAccessRoute(user, profile?.claims || null, window.location.pathname);
        
        if (!canAccess) {
          setHasPermission(false);
          setAccessError('Você não tem permissão para acessar esta página');
          onAccessDenied?.();
          return;
        }

        setHasPermission(true);
        setAccessError('');

      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        setHasPermission(false);
        setAccessError('Erro ao verificar permissões');
      }
    }

    if (!loading) {
      checkAccess();
    }
  }, [user, profile, loading, requiredSystems, requiredRoles, requireEmailVerified, requireEmpresa, onAccessDenied]);

  // Loading state
  if (loading || hasPermission === null) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'white'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Verificando permissões...
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Access denied
  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        background: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🚫</div>
        <h2 style={{ 
          color: '#ef4444', 
          marginBottom: '1rem',
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>
          Acesso Negado
        </h2>
        <p style={{ 
          color: 'rgba(255,255,255,0.8)', 
          marginBottom: '1.5rem',
          maxWidth: '400px',
          lineHeight: '1.5'
        }}>
          {accessError}
        </p>
        
        {!user && (
          <button
            onClick={() => window.location.href = '/login'}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Fazer Login
          </button>
        )}

        {user && accessError.includes('email') && (
          <button
            onClick={() => window.location.href = '/verify-email'}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(45deg, #f59e0b, #d97706)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Verificar Email
          </button>
        )}

        {user && accessError.includes('empresa') && (
          <button
            onClick={() => window.location.href = '/empresa/criar'}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(45deg, #10b981, #047857)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Criar/Vincular Empresa
          </button>
        )}

        {user && accessError.includes('permissão') && (
          <button
            onClick={() => window.location.href = '/contato'}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(45deg, #6366f1, #4f46e5)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Solicitar Acesso
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

// Hook para usar proteção de rota
export function useRouteProtection(
  requiredSystems: string[] = [],
  requiredRoles: string[] = [],
  requireEmailVerified = false
) {
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function check() {
      try {
        if (requireEmailVerified && !isEmailVerified(profile)) {
          setCanAccess(false);
          setError('Email não verificado');
          return;
        }

        const access = canAccessRoute(user, profile?.claims || null, window.location.pathname);
        setCanAccess(access);
        
        if (!access) {
          setError('Acesso negado');
        }
      } catch (err) {
        setCanAccess(false);
        setError('Erro ao verificar acesso');
      }
    }

    check();
  }, [requiredSystems, requiredRoles, requireEmailVerified]);

  return { canAccess, error };
}
