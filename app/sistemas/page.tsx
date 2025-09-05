'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Tutorial from '@/src/components/Tutorial';
import ThemeSelector from '@/src/components/ThemeSelector';
import { homeTutorialSteps } from '@/src/lib/tutorialSteps';
import { themeManager } from '@/src/lib/themes';
import { useAuthData } from '@/src/hooks/useAuth';
import { UserPermissions } from '@/src/lib/types';

// Definição de todos os sistemas disponíveis (necessário para o useMemo)
const todosOsSistemas = [
  { key: 'ponto', name: 'Sistema de Ponto', icon: '🕒', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderColor: '#667eea' },
  { key: 'chamados', name: 'Chamados TI', icon: '🎫', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderColor: '#f093fb' },
  { key: 'vendas', name: 'Sistema de Vendas', icon: '💼', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderColor: '#4facfe' },
  { key: 'estoque', name: 'Controle de Estoque', icon: '📦', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderColor: '#43e97b' },
  { key: 'financeiro', name: 'Sistema Financeiro', icon: '💰', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', borderColor: '#fa709a' },
  { key: 'rh', name: 'Recursos Humanos', icon: '👥', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', borderColor: '#a8edea' },
  { key: 'documentos', name: 'Gerador de Documentos', icon: '📄', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderColor: '#667eea' },
  { key: 'frota', name: 'Gerenciamento de Frota', icon: '🚗', gradient: 'linear-gradient(135deg, #00ff7f 0%, #8a2be2 100%)', borderColor: '#00ff7f' }
];

// Função auxiliar para verificar se o usuário é super admin
const isSuperAdmin = (userData: any): boolean => {
  return userData?.role === 'superadmin' || userData?.role === 'adminmaster' || userData?.claims?.bootstrapAdmin;
};


export default function SistemasPage() {
  const [isOnline, setIsOnline] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const { user, profile, loading, signOut } = useAuthData();
  const userData = profile;

  // Função para verificar acesso aos sistemas
  const hasAccess = (sistema: string): boolean => {
    if (!user || !userData) return false;

    // Admins sempre têm acesso
    if (isSuperAdmin(userData)) {
      return true;
    }

    // Verificar sistemas ativos do usuário (priorizar dados do Firestore)
    if (userData.sistemasAtivos?.includes(sistema)) {
      return true;
    }

    // Verificar claims do token
    if (userData.claims?.sistemasAtivos?.includes(sistema)) {
      return true;
    }

    // Verificar permissões específicas
    if (userData.claims?.permissions?.canAccessSystems?.includes(sistema)) {
      return true;
    }

    // NOVA VERIFICAÇÃO: Se o usuário tem empresaId, buscar sistemas da empresa
    if (userData.empresaId || userData.claims?.empresaId) {
      // Para esta verificação em tempo real, assumimos que se o usuário está 
      // associado a uma empresa, ele tem acesso aos sistemas da empresa
      // Esta é uma verificação de fallback que será confirmada pelo useSystemAccess
      return true; // Permitir acesso temporário enquanto carrega os dados corretos
    }

    // Verificar se é admin com acesso geral
    if (['admin', 'gestor'].includes(userData.role || '') && userData.empresaId) {
      return true;
    }

    return false;
  };

  // Debug para verificar o que está acontecendo
  useEffect(() => {
    if (!loading && user) {
      console.log('Debug sistemas completo:', {
        userEmail: user.email,
        userId: user.uid,
        userData: userData,
        sistemasAtivos: userData?.sistemasAtivos || [],
        hasAccessPonto: hasAccess('ponto'),
        hasAccessChamados: hasAccess('chamados'),
        hasAccessCrm: hasAccess('crm'),
        loading
      });
    }
  }, [loading, user, userData]);


  // Check online status and PWA mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      setIsPWA(window.matchMedia('(display-mode: standalone)').matches);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Initialize theme system
  useEffect(() => {
    themeManager.getCurrentTheme();
  }, []);


  // Determinar sistemas disponíveis baseado nas permissões do usuário
  const sistemasDisponiveis = useMemo(() => {
    // Se não há usuário logado, mostrar todos os sistemas (mas com acesso bloqueado)
    if (!user || !userData) {
      return todosOsSistemas;
    }

    const isSuperAdminUser = isSuperAdmin(userData);

    if (isSuperAdminUser) {
      return todosOsSistemas;
    }

    // Obter sistemas de todas as fontes possíveis
    const sistemasDoUsuario = userData.sistemasAtivos || [];
    const sistemasClaims = userData.claims?.sistemasAtivos || [];
    const sistemasCanAccess = userData.claims?.canAccessSystems || [];

    // Combinar todas as fontes
    const todosSistemasDoUsuario = [
      ...sistemasDoUsuario,
      ...sistemasClaims,
      ...sistemasCanAccess
    ].filter((sistema, index, array) => array.indexOf(sistema) === index); // remover duplicatas

    console.log('Sistemas do usuário:', todosSistemasDoUsuario);

    // Se o usuário logado não tem sistemas, mostrar todos mas com acesso bloqueado
    if (todosSistemasDoUsuario.length === 0) {
      return todosOsSistemas;
    }

    return todosOsSistemas.filter(sistema =>
      todosSistemasDoUsuario.includes(sistema.key)
    );
  }, [user, userData]);


  const handleSystemSelect = (systemId: string) => {
    // Se não está logado, redirecionar para login
    if (!user) {
      // Salvar o sistema desejado para redirecionar após login
      sessionStorage.setItem('redirectAfterLogin', `/sistemas?target=${systemId}`);
      window.location.href = '/';
      return;
    }

    // Se está logado, verificar acesso
    if (user && userData) {
      const hasSystemAccess = hasAccess(systemId);
      
      if (hasSystemAccess) {
        // Tem acesso, redirecionar para o sistema
        if (systemId === 'ponto') {
          window.location.href = '/ponto/auth';
        } else if (systemId === 'chamados') {
          window.location.href = '/chamados/auth';
        } else if (systemId === 'documentos') {
          window.location.href = '/documentos/auth';
        } else if (systemId === 'frota') {
          window.location.href = '/frota/auth';
        } else if (systemId === 'financeiro') {
          window.location.href = '/financeiro/auth';
        } else if (systemId === 'vendas') {
          window.location.href = '/crm/auth';
        }
      } else if (['vendas', 'estoque', 'rh'].includes(systemId)) {
        // Sistema em desenvolvimento
        alert(`Sistema ${todosOsSistemas.find(s => s.key === systemId)?.name} será implementado em breve!`);
      } else {
        // Sem acesso - redirecionar para contato
        const sistemaNome = todosOsSistemas.find(s => s.key === systemId)?.name;
        if (confirm(`Você não tem acesso ao ${sistemaNome}. Deseja entrar em contato para solicitar acesso?`)) {
          window.location.href = `/contato?sistema=${systemId}`;
        }
      }
    }
  };



  return (
      <div className="container" style={{
        background: 'linear-gradient(135deg, var(--gradient-primary))',
        minHeight: '100vh',
        padding: 'var(--gap-xl)'
      }}>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>

        <Tutorial
          steps={homeTutorialSteps}
          tutorialKey="home"
          onComplete={() => console.log('Tutorial home completado')}
          onSkip={() => console.log('Tutorial home pulado')}
        />

        {/* Header */}
        <div
          className="responsive-flex"
          style={{
            marginBottom: 'var(--gap-sm)',
            padding: 'var(--gap-sm)',
            background: 'var(--gradient-surface)',
            borderRadius: 'var(--radius)',
            zIndex: 1000,
            border: 'clamp(1px, 0.2vw, 2px) solid var(--color-border)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="row" style={{ gap: 'var(--gap-lg)' }}>
            <Link href="/" className="button button-ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Voltar ao Início
            </Link>
            <div className="badge">
              <span
                className="status-indicator status-online"
                style={{
                  background: isOnline
                    ? 'var(--color-success)'
                    : 'var(--color-error)',
                }}
              ></span>
              {isOnline ? 'Conectado' : 'Offline'}
            </div>
            <div className="badge">📱 PWA: {isPWA ? 'Ativo' : 'Web'}</div>

            {/* Status de Login */}
            {!loading && (
              <div className="badge">
                <span
                  className="status-indicator"
                  style={{
                    background: user ? 'var(--color-success)' : 'var(--color-error)',
                  }}
                ></span>
                {user ? `👤 ${userData?.displayName || user.email?.split('@')[0]}` : '🔒 Não logado'}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--gap-md)', flexWrap: 'wrap' }}>
            <ThemeSelector />
            <button
              onClick={() => console.log('Tutorial clicked')} // Dummy function for now
              className="button button-ghost"
              style={{ fontSize: '0.9rem' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Tutorial
            </button>

            {/* Botão de Sair */}
            {user && (
              <button
                onClick={signOut}
                className="button button-ghost"
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-error)',
                  borderColor: 'var(--color-error)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Sair
              </button>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <div className="card fade-in" style={{
          textAlign: 'center',
          marginBottom: 'var(--gap-2xl)',
          background: 'var(--gradient-card)',
          border: '2px solid var(--color-border)',
          borderRadius: '24px',
          padding: 'var(--gap-2xl)',
          backdropFilter: 'blur(30px)'
        }}>
          <div style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            marginBottom: 'var(--gap-lg)',
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🏢
          </div>
          <h1 className="h1" style={{
            marginBottom: 'var(--gap-md)',
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: '800',
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Selecione o Sistema
          </h1>
          <p className="h2" style={{
            marginBottom: 'var(--gap-xl)',
            fontSize: 'clamp(1rem, 2vw, 1.5rem)',
            opacity: 0.9
          }}>
            Escolha o sistema que deseja acessar
          </p>

          {/* Sistemas Ativos do Usuário */}
          {user && userData && (
            <div style={{
              marginBottom: 'var(--gap-xl)',
              padding: 'var(--gap-lg)',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <h3 style={{
                fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                marginBottom: 'var(--gap-md)',
                color: 'var(--color-primary)'
              }}>
                🎯 Seus Sistemas Ativos
              </h3>
              <div className="row center" style={{ gap: 'var(--gap-sm)', flexWrap: 'wrap' }}>
                {hasAccess('ponto') && <span className="tag" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>🕒 Ponto</span>}
                {hasAccess('chamados') && <span className="tag" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>🎫 Chamados</span>}
                {hasAccess('frota') && <span className="tag" style={{ background: 'linear-gradient(135deg, #00ff7f 0%, #8a2be2 100%)' }}>🚗 Frota</span>}
                {hasAccess('documentos') && <span className="tag" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>📄 Documentos</span>}
                {hasAccess('financeiro') && <span className="tag" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>💰 Financeiro</span>}
                {(hasAccess('crm') || hasAccess('vendas')) && <span className="tag" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>💼 CRM/Vendas</span>}
                {userData.claims?.permissions?.admin && <span className="tag" style={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)' }}>👑 Admin</span>}
                {(!userData.sistemasAtivos?.length && !userData.claims?.sistemasAtivos?.length && !userData.claims?.canAccessSystems?.length) && <span className="tag" style={{ background: 'var(--color-error)' }}>❌ Nenhum sistema ativo</span>}
              </div>
            </div>
          )}

          <div className="row center" style={{ gap: 'var(--gap-sm)', flexWrap: 'wrap' }}>
            <span className="tag">🔐 Segurança Enterprise</span>
            <span className="tag">☁️ Cloud Native</span>
            <span className="tag">📊 Analytics Avançado</span>
            <span className="tag">🚀 Alta Performance</span>
          </div>
        </div>

        {/* Systems Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(280px, 25vw, 360px), 1fr))',
          gap: 'var(--gap-xl)',
          marginBottom: 'var(--gap-2xl)'
        }}>
          {sistemasDisponiveis.map((system) => {
            const hasSystemAccess = user && userData && hasAccess(system.key);
            // Para usuários não logados, sistemas são mostrados mas não acessíveis
            // Para usuários logados, verificar permissões
            const isAccessible = user ? (hasSystemAccess || ['vendas', 'estoque', 'rh'].includes(system.key)) : false;

            return (
              <div
                key={system.key}
                className="system-card"
                onClick={() => !user ? handleSystemSelect(system.key) : (isAccessible ? handleSystemSelect(system.key) : null)}
                style={{
                  background: 'var(--gradient-card)',
                  border: `2px solid ${system.borderColor}`,
                  borderRadius: '20px',
                  padding: 'var(--gap-xl)',
                  cursor: isAccessible ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(20px)',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: isAccessible ? 1 : 0.5
                }}
                onMouseEnter={(e) => {
                  if (isAccessible) {
                    e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
                    e.currentTarget.style.borderColor = system.borderColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (isAccessible) {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }
                }}
              >
              {/* Background gradient overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: system.gradient,
                opacity: 0.05,
                borderRadius: '18px'
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontSize: 'clamp(2.5rem, 6vw, 3.5rem)',
                  marginBottom: 'var(--gap-md)',
                  textAlign: 'center'
                }}>
                  {system.icon}
                </div>

                <h3 style={{
                  fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
                  fontWeight: '700',
                  marginBottom: 'var(--gap-sm)',
                  textAlign: 'center',
                  color: 'var(--color-text)'
                }}>
                  {system.name}
                </h3>

                <p style={{
                  fontSize: 'clamp(0.9rem, 1.5vw, 1rem)',
                  color: 'var(--color-textSecondary)',
                  textAlign: 'center',
                  lineHeight: 1.5,
                  marginBottom: 'var(--gap-lg)'
                }}>
                  {(system as any).description || 'Sistema empresarial'}
                </p>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--gap-sm)',
                  width: '100%'
                }}>
                  {/* Botão Principal */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--gap-sm)',
                    padding: 'var(--gap-md)',
                    background: !user ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 
                               isAccessible ? system.gradient : 'rgba(128, 128, 128, 0.5)',
                    borderRadius: '12px',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {!user ? (
                      <>
                        <span>🔑 Entrar para Acessar</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="10 17 15 12 10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </>
                    ) : user && userData ? (
                      hasSystemAccess ? (
                        <>
                          <span>🚀 Acessar {system.name}</span>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </>
                      ) : ['vendas', 'estoque', 'rh'].includes(system.key) ? (
                        <>
                          <span>🚧 Sistema em Desenvolvimento</span>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                            <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </>
                      ) : (
                        <>
                          <span>📞 Solicitar Acesso</span>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </>
                      )
                    ) : (
                      <>
                        <span>⏳ Verificando Acesso...</span>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                      </>
                    )}
                  </div>

                  {/* Status/Info adicional */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--gap-xs)',
                    padding: 'var(--gap-sm)',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.8)'
                  }}>
                    {!user ? (
                      <>
                        <span>🌐</span>
                        <span>Área pública - Faça login para acessar</span>
                      </>
                    ) : user && userData ? (
                      hasSystemAccess ? (
                        <>
                          <span>✅</span>
                          <span>Acesso liberado</span>
                        </>
                      ) : ['vendas', 'estoque', 'rh'].includes(system.key) ? (
                        <>
                          <span>🛠️</span>
                          <span>Em desenvolvimento</span>
                        </>
                      ) : (
                        <>
                          <span>📋</span>
                          <span>Entre em contato para solicitar</span>
                        </>
                      )
                    ) : (
                      <>
                        <span>🔍</span>
                        <span>Verificando permissões...</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="card" style={{
          textAlign: 'center',
          background: 'var(--gradient-surface)',
          borderTop: '2px solid var(--color-primary)',
          borderRadius: '20px',
          padding: 'var(--gap-xl)'
        }}>
          <div className="stack" style={{ gap: 'var(--gap-md)' }}>
            <div className="row center" style={{ gap: 'var(--gap-lg)' }}>
              <div className="badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2"/>
                </svg>
                Deploy Instantâneo
              </div>
              <div className="badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9" stroke="currentColor" strokeWidth="2"/>
                  <line x1="15" y1="9" x2="15.01" y2="9" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Suporte 24/7
              </div>
            </div>

            <div className="row center" style={{ gap: 'var(--gap-md)', fontSize: 'clamp(0.8rem, 1.5vw, 1rem)', color: 'var(--color-textSecondary)' }}>
              <a href="/privacy" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '600' }}>
                Política de Privacidade
              </a>
              <span>·</span>
              <span style={{ fontWeight: '600' }}>v3.0.0</span>
              <span>·</span>
              <span>© {new Date().getFullYear()}</span>
            </div>

            <div style={{ fontSize: 'clamp(0.7rem, 1.3vw, 0.9rem)', color: 'var(--color-textSecondary)', opacity: 0.8 }}>
              Desenvolvido com ❤️ usando Next.js + Firebase por ENY-GNA Lab
              <br />
              Global Network Architecture
            </div>
          </div>
        </footer>
      </div>
    );
}