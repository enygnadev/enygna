'use client';

import React from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import Link from 'next/link';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  redirectTo?: string;
  system?: string;
}

export default function ProtectedRoute({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  redirectTo = '/sistemas',
  system = 'Sistema'
}: ProtectedRouteProps) {
  const { user, userData, loading, hasPermission, isRole } = useAuth();

  if (loading) {
    return (
      <div className="container">
        <style jsx>{`
          .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: var(--color-background);
          }

          .spinner {
            width: 60px;
            height: 60px;
            border: 4px solid var(--color-border);
            border-top: 4px solid var(--color-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>

        <div className="loading-container">
          <div style={{ textAlign: 'center' }}>
            <div className="spinner"></div>
            <p>Carregando {system}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container">
        <style jsx>{`
          .auth-required {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: var(--color-background);
          }

          .auth-card {
            text-align: center;
            background: var(--color-surface);
            padding: 3rem;
            border-radius: var(--radius-lg);
            border: 1px solid var(--color-border);
            max-width: 500px;
          }
        `}</style>

        <div className="auth-required">
          <div className="auth-card">
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔐</div>
            <h1>Autenticação Necessária</h1>
            <p style={{ marginBottom: '2rem' }}>
              Você precisa fazer login para acessar o {system}.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={redirectTo} className="button button-primary">
                Fazer Login
              </Link>
              <Link href="/sistemas" className="button button-outline">
                Voltar aos Sistemas
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verificar permissões
  const hasRequiredPermissions = requiredPermissions.length === 0 || 
    requiredPermissions.some(permission => hasPermission(permission as 'frota' | 'ponto' | 'chamados' | 'documentos' | 'admin'));

  const hasRequiredRoles = requiredRoles.length === 0 || 
    requiredRoles.some(role => isRole(role));

  if (!hasRequiredPermissions || !hasRequiredRoles) {
    return (
      <div className="container">
        <style jsx>{`
          .access-denied {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: var(--color-background);
          }

          .access-card {
            text-align: center;
            background: var(--color-surface);
            padding: 3rem;
            border-radius: var(--radius-lg);
            border: 1px solid var(--color-border);
            max-width: 500px;
          }
        `}</style>

        <div className="access-denied">
          <div className="access-card">
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
            <h1>Acesso Restrito</h1>
            <p style={{ marginBottom: '2rem' }}>
              Você não tem permissão para acessar o {system}.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link href="/sistemas" className="button button-outline">
                Voltar aos Sistemas
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}