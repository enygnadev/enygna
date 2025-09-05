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

// Função para verificar se o usuário é super admin
const isSuperAdmin = (userData: any): boolean => {
  return userData?.role === 'superadmin' || userData?.role === 'adminmaster' || userData?.claims?.bootstrapAdmin;
};

export default function SistemasPage() {
  const [isOnline, setIsOnline] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const { user, profile, loading, signOut } = useAuthData();
  const userData = profile;

  // Função para verificar acesso aos sistemas - agora com tratamento de erro
  const hasAccess = (sistema: string): boolean => {
    // Se não está logado, não tem acesso aos sistemas
    if (!user || !userData) return false;

    try {
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
        return true; // Permitir acesso te
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      return false;
    }
  };

  // Função para tratar erros de Firestore de forma silenciosa
  const handleFirestoreError = (error: any, operation: string) => {
    if (error?.code === 'permission-denied') {
      console.log(`Permissão negada para ${operation} - usuário não autenticado ou sem permissão`);
      return null;
    }
    console.error(`Erro em ${operation}:`, error);
    return null;
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

  // Mock de dados de sistemas para a página de login
  const sistemas = [
    { id: 'ponto', nome: 'Sistema de Ponto', icon: '🕒', descricao: 'Controle de jornada de trabalho.' },
    { id: 'chamados', nome: 'Chamados TI', icon: '🎫', descricao: 'Gerenciamento de solicitações de TI.' },
    { id: 'vendas', nome: 'Sistema de Vendas', icon: '💼', descricao: 'Otimização do processo de vendas.' },
    { id: 'estoque', nome: 'Controle de Estoque', icon: '📦', descricao: 'Gestão de inventário.' },
    { id: 'financeiro', nome: 'Sistema Financeiro', icon: '💰', descricao: 'Controle de fluxo de caixa.' },
    { id: 'rh', nome: 'Recursos Humanos', icon: '👥', descricao: 'Gerenciamento de pessoal.' },
    { id: 'documentos', nome: 'Gerador de Documentos', icon: '📄', descricao: 'Criação de documentos padronizados.' },
    { id: 'frota', nome: 'Gerenciamento de Frota', icon: '🚗', descricao: 'Controle de veículos e manutenções.' }
  ];

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
      alert(`Sistema ${todosOsSistemas.find(s => s.key === systemId)?.name} será implementado em breve!`);
    }
  };

  // Se está carregando, mostrar loading
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  // Renderização para usuários não logados - PÁGINA PÚBLICA
  if (!user) {
    return (
      <div className="sistemas-container">
        <header className="header">
          <div className="header-content">
            <h1 className="main-title">
              🚀 Sistemas Empresariais Enygna
            </h1>
            <p className="subtitle">
              Plataforma completa para gestão empresarial
            </p>
          </div>
        </header>

        <main className="main-content">
          <div className="welcome-section">
            <h2>Bem-vindo à nossa plataforma!</h2>
            <p>Acesse nossos sistemas especializados para otimizar sua empresa:</p>
          </div>

          <div className="sistemas-grid">
            {sistemas.map((sistema) => (
              <div key={sistema.id} className="sistema-card disabled">
                <div className="sistema-header">
                  <span className="sistema-icon">{sistema.icon}</span>
                  <h3>{sistema.nome}</h3>
                </div>
                <p className="sistema-descricao">{sistema.descricao}</p>
                <div className="sistema-status">
                  <span className="status-badge locked">🔒 Login Necessário</span>
                </div>
                <div className="sistema-actions">
                  <button className="btn-disabled" disabled>
                    Acesso Restrito
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-section">
            <h3>Para acessar os sistemas:</h3>
            <div className="auth-buttons">
              <Link href="/admin/auth" className="btn-login">
                <span>👤</span> Fazer Login
              </Link>
              <Link href="/criar" className="btn-register">
                <span>✨</span> Criar Conta Empresa
              </Link>
            </div>
          </div>

          <div className="features-section">
            <h3>Nossos Diferenciais:</h3>
            <div className="features-grid">
              <div className="feature-item">
                <span>🔒</span>
                <h4>Segurança Avançada</h4>
                <p>Proteção de dados com criptografia de ponta</p>
              </div>
              <div className="feature-item">
                <span>☁️</span>
                <h4>Cloud Native</h4>
                <p>Acesse de qualquer lugar, a qualquer hora</p>
              </div>
              <div className="feature-item">
                <span>📊</span>
                <h4>Analytics Integrado</h4>
                <p>Relatórios e dashboards em tempo real</p>
              </div>
              <div className="feature-item">
                <span>🤖</span>
                <h4>IA Integrada</h4>
                <p>Assistente inteligente para otimização</p>
              </div>
            </div>
          </div>
        </main>

        <style jsx>{`
          .sistemas-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          }

          .header {
            text-align: center;
            padding: 2rem 1rem;
            background: rgba(0, 0, 0, 0.1);
          }

          .main-title {
            font-size: clamp(2rem, 5vw, 3.5rem);
            font-weight: 700;
            margin-bottom: 1rem;
            background: linear-gradient(45deg, #fff, #f0f8ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .subtitle {
            font-size: clamp(1rem, 3vw, 1.5rem);
            opacity: 0.9;
            margin-bottom: 0;
          }

          .main-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem 1rem;
          }

          .welcome-section {
            text-align: center;
            margin-bottom: 3rem;
          }

          .welcome-section h2 {
            font-size: clamp(1.5rem, 4vw, 2.5rem);
            margin-bottom: 1rem;
          }

          .welcome-section p {
            font-size: clamp(1rem, 2.5vw, 1.2rem);
            opacity: 0.9;
            max-width: 600px;
            margin: 0 auto;
          }

          .sistemas-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
          }

          .sistema-card.disabled {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 1.5rem;
            text-align: center;
            transition: all 0.3s ease;
            opacity: 0.8;
          }

          .sistema-card.disabled:hover {
            transform: translateY(-2px);
            background: rgba(255, 255, 255, 0.15);
          }

          .sistema-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            margin-bottom: 1rem;
          }

          .sistema-icon {
            font-size: 2rem;
          }

          .sistema-header h3 {
            font-size: 1.3rem;
            font-weight: 600;
            margin: 0;
          }

          .sistema-descricao {
            opacity: 0.8;
            margin-bottom: 1rem;
            line-height: 1.5;
          }

          .status-badge.locked {
            background: rgba(255, 193, 7, 0.2);
            color: #ffc107;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.85rem;
            border: 1px solid rgba(255, 193, 7, 0.3);
          }

          .btn-disabled {
            background: rgba(108, 117, 125, 0.3);
            color: rgba(255, 255, 255, 0.5);
            border: 1px solid rgba(108, 117, 125, 0.5);
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: not-allowed;
            font-weight: 500;
          }

          .auth-section {
            text-align: center;
            background: rgba(0, 0, 0, 0.1);
            padding: 2rem;
            border-radius: 16px;
            margin-bottom: 3rem;
          }

          .auth-section h3 {
            margin-bottom: 1.5rem;
            font-size: 1.5rem;
          }

          .auth-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
          }

          .btn-login, .btn-register {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem 2rem;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
            min-width: 160px;
            justify-content: center;
          }

          .btn-login {
            background: linear-gradient(45deg, #007bff, #0056b3);
            color: white;
            border: 2px solid transparent;
          }

          .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 123, 255, 0.4);
          }

          .btn-register {
            background: transparent;
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.3);
          }

          .btn-register:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-2px);
            border-color: rgba(255, 255, 255, 0.5);
          }

          .features-section {
            text-align: center;
          }

          .features-section h3 {
            margin-bottom: 2rem;
            font-size: 1.8rem;
          }

          .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
            gap: 1.5rem;
          }

          .feature-item {
            background: rgba(255, 255, 255, 0.05);
            padding: 1.5rem;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          .feature-item span {
            font-size: 2.5rem;
            display: block;
            margin-bottom: 1rem;
          }

          .feature-item h4 {
            margin-bottom: 0.5rem;
            font-size: 1.1rem;
          }

          .feature-item p {
            opacity: 0.8;
            font-size: 0.9rem;
            margin: 0;
          }

          @media (max-width: 768px) {
            .auth-buttons {
              flex-direction: column;
            }

            .btn-login, .btn-register {
              width: 100%;
              max-width: 300px;
            }
          }
        `}</style>
      </div>
    );
  }

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
                onClick={() => handleSystemSelect(system.key)}
                style={{
                  background: 'var(--gradient-card)',
                  border: `2px solid ${system.borderColor}`,
                  borderRadius: '20px',
                  padding: 'var(--gap-xl)',
                  cursor: ['vendas', 'estoque', 'rh'].includes(system.key) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(20px)',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: ['vendas', 'estoque', 'rh'].includes(system.key) ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!['vendas', 'estoque', 'rh'].includes(system.key)) {
                    e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
                    e.currentTarget.style.borderColor = system.borderColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!['vendas', 'estoque', 'rh'].includes(system.key)) {
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
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--gap-sm)',
                  padding: 'var(--gap-sm) var(--gap-md)',
                  background: isAccessible ? system.gradient : 'rgba(128, 128, 128, 0.5)',
                  borderRadius: '12px',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}>
                  {['vendas', 'estoque', 'rh'].includes(system.key) ? (
                    <>
                      <span>🚧 Em Breve</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </>
                  ) : (
                    <>
                      <span>✅ Acessar Sistema</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </>
                  )}
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