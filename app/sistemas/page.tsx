'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Tutorial from '@/src/components/Tutorial';
import ThemeSelector from '@/src/components/ThemeSelector';
import AnimatedSystemsMenu from '@/src/components/AnimatedSystemsMenu';
import { homeTutorialSteps } from '@/src/lib/tutorialSteps';
import { themeManager } from '@/src/lib/themes';
import { useAuthData } from '@/src/hooks/useAuth';

// Define the UserData interface with the new property
interface UserData {
  uid: string;
  email: string;
  role?: string;
  empresaId?: string;
  sistemasAtivos?: string[];
  permissions?: {
    frota?: boolean;
    ponto?: boolean;
    chamados?: boolean;
    documentos?: boolean;
    admin?: boolean;
    canAccessSystems?: string[];
  };
  tipo?: string;
  nome?: string;
  bootstrapAdmin?: boolean;
}


export default function SistemasPage() {
  const [isOnline, setIsOnline] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const { user, userData, loading, signOut } = useAuthData();

  // Função para verificar acesso aos sistemas
  const hasAccess = (sistema: string): boolean => {
    if (!user || !userData) return false;
    
    // Admins sempre têm acesso
    if (userData.role === 'superadmin' || userData.role === 'adminmaster' || (userData as any).bootstrapAdmin) {
      return true;
    }
    
    // Verificar sistemas ativos do usuário
    if ((userData as any).sistemasAtivos && (userData as any).sistemasAtivos.includes(sistema)) {
      return true;
    }
    
    // Verificar permissões específicas
    if (userData.permissions && (userData.permissions as any).canAccessSystems && (userData.permissions as any).canAccessSystems.includes(sistema)) {
      return true;
    }
    
    // Verificar permissões diretas
    if (userData.permissions && (userData.permissions as any)[sistema]) {
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
        sistemasAtivos: (userData as any)?.sistemasAtivos || [],
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





  const systems = [
    {
      id: 'ponto',
      name: 'Sistema de Ponto',
      description: 'Controle de ponto profissional com GPS e relatórios',
      icon: '🕒',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderColor: '#667eea'
    },
    {
      id: 'chamados',
      name: 'Chamados TI',
      description: 'Sistema de help desk e suporte técnico com IA',
      icon: '🎫',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      borderColor: '#f093fb'
    },
    {
      id: 'vendas',
      name: 'Sistema de Vendas',
      description: 'CRM e gestão comercial avançada',
      icon: '💼',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      borderColor: '#4facfe'
    },
    {
      id: 'estoque',
      name: 'Controle de Estoque',
      description: 'Gestão de inventário e logística',
      icon: '📦',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      borderColor: '#43e97b'
    },
    {
      id: 'financeiro',
      name: 'Sistema Financeiro',
      description: 'Contabilidade avançada com OCR e automação fiscal',
      icon: '💰',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      borderColor: '#fa709a'
    },
    {
      id: 'rh',
      name: 'Recursos Humanos',
      description: 'Gestão de pessoas e folha de pagamento',
      icon: '👥',
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      borderColor: '#a8edea'
    },
    {
      id: 'documentos',
      name: 'Gerador de Documentos',
      description: 'Criação automática de documentos e relatórios',
      icon: '📄',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderColor: '#667eea'
    },
    {
      id: 'frota',
      name: 'Gerenciamento de Frota',
      description: 'Sistema neural de controle de frotas com IA e GPS',
      icon: '🚗',
      gradient: 'linear-gradient(135deg, #00ff7f 0%, #8a2be2 100%)',
      borderColor: '#00ff7f'
    }
  ];

  const handleSystemSelect = (systemId: string) => {
    if (systemId === 'ponto') {
      // Redirecionar para a autenticação do sistema de ponto
      window.location.href = '/ponto/auth';
    } else if (systemId === 'chamados') {
      // Redirecionar para o sistema de chamados
      window.location.href = '/chamados/auth';
    } else if (systemId === 'documentos') {
      // Redirecionar para o sistema de documentos
      window.location.href = '/documentos/auth';
    } else if (systemId === 'frota') {
      // Redirecionar para o sistema de frota
      window.location.href = '/frota/auth';
    } else if (systemId === 'financeiro') {
      // Redirecionar para o sistema financeiro
      window.location.href = '/financeiro/auth';
    } else if (systemId === 'vendas') {
      // Redirecionar para o sistema de CRM/Vendas
      window.location.href = '/crm/auth';
    } else {
      // Para outros sistemas, mostrar mensagem
      alert(`Sistema ${systems.find(s => s.id === systemId)?.name} será implementado em breve!`);
    }
  };

  const empresaId = userData?.empresaId;

  return (
      <div className="container" style={{
        background: 'linear-gradient(135deg, var(--gradient-primary))',
        minHeight: '100vh',
        padding: 'var(--gap-xl)'
      }}>
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
                {user ? `👤 ${userData?.nome || user.email?.split('@')[0]}` : '🔒 Não logado'}
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
                {userData.permissions?.admin && <span className="tag" style={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)' }}>👑 Admin</span>}
                {(!(userData as any).sistemasAtivos || (userData as any).sistemasAtivos.length === 0) && <span className="tag" style={{ background: 'var(--color-error)' }}>❌ Nenhum sistema ativo</span>}
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

        {/* Menu de Sistemas com Animated Beams */}
        <div style={{ marginBottom: 'var(--gap-2xl)' }}>
          <AnimatedSystemsMenu
            onSystemSelect={handleSystemSelect}
            hasAccess={hasAccess}
            user={user}
            userData={userData}
          />
        </div>

        {/* Legenda dos Sistemas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'var(--gap-md)',
          marginBottom: 'var(--gap-2xl)',
          padding: 'var(--gap-lg)',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {systems.map((system) => {
            const hasSystemAccess = user && userData && hasAccess(system.id);
            const isAccessible = !user || hasSystemAccess || ['vendas', 'estoque', 'rh'].includes(system.id);

            return (
              <div key={system.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--gap-sm)',
                padding: 'var(--gap-sm)',
                borderRadius: '8px',
                background: isAccessible ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 128, 128, 0.1)'
              }}>
                <span style={{ fontSize: '1.2rem', filter: isAccessible ? 'none' : 'grayscale(100%)' }}>
                  {system.icon}
                </span>
                <div>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: isAccessible ? 'var(--color-text)' : 'var(--color-textSecondary)'
                  }}>
                    {system.name}
                  </div>
                  <div style={{
                    fontSize: '0.7rem',
                    color: 'var(--color-textSecondary)',
                    opacity: 0.8
                  }}>
                    {user && userData ? (
                      hasSystemAccess ? '✅ Disponível' : 
                      ['vendas', 'estoque', 'rh'].includes(system.id) ? '🚧 Em breve' : '🔒 Sem acesso'
                    ) : 'Clique para acessar'}
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