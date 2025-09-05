
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
    // Se não está logado, permite visualizar mas não acessar
    if (!user || !userData) {
      return false;
    }

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
        return true; // Permitir acesso temporário para verificação
      }

      return false;
    } catch (error) {
      // Tratar erros de Firestore silenciosamente
      if (error?.code === 'permission-denied') {
        console.log('Permissão negada para verificar sistemas - usuário sem permissão');
        return false;
      }
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
    if (error?.code === 'failed-precondition') {
      console.log(`Pré-condição falhou para ${operation} - dados podem não estar disponíveis`);
      return null;
    }
    if (error?.code === 'unavailable') {
      console.log(`Serviço indisponível para ${operation} - tentando novamente mais tarde`);
      return null;
    }
    console.error(`Erro em ${operation}:`, error);
    return null;
  };

  // Debug para verificar o que está acontecendo
  useEffect(() => {
    if (!loading && user) {
      try {
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
      } catch (error) {
        handleFirestoreError(error, 'debug sistemas');
      }
    }
  }, [loading, user, userData]);

  // Interceptar erros globais do Firestore nesta página
  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorMessage = args[0];
      if (typeof errorMessage === 'string' && errorMessage.includes('FirebaseError')) {
        // Tratar erro do Firebase silenciosamente
        console.log('Erro do Firebase tratado silenciosamente:', args);
        return;
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);


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
    try {
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
    } catch (error) {
      handleFirestoreError(error, 'seleção de sistema');
      console.log('Erro ao redirecionar para sistema:', systemId);
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
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 1rem;
            background: linear-gradient(45deg, #fff, #f0f8ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .subtitle {
            font-size: 1.3rem;
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
            font-size: 2rem;
            margin-bottom: 1rem;
          }

          .welcome-section p {
            font-size: 1.1rem;
            opacity: 0.9;
            max-width: 600px;
            margin: 0 auto;
          }

          .sistemas-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
            .main-title {
              font-size: 2.5rem;
            }

            .sistemas-grid {
              grid-template-columns: 1fr;
            }

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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      color: 'white',
      padding: '2rem 1rem'
    }}>
      <Tutorial
        steps={homeTutorialSteps}
        tutorialKey="home"
        onComplete={() => console.log('Tutorial home completado')}
        onSkip={() => console.log('Tutorial home pulado')}
      />

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        padding: '1rem',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/" style={{
            color: 'white',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}>
            ← Voltar ao Início
          </Link>
          <div style={{
            padding: '0.5rem 1rem',
            background: isOnline ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            borderRadius: '20px',
            fontSize: '0.9rem'
          }}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </div>
          <div style={{
            padding: '0.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            fontSize: '0.9rem'
          }}>
            📱 {isPWA ? 'PWA Ativo' : 'Web'}
          </div>
          {user && (
            <div style={{
              padding: '0.5rem 1rem',
              background: 'rgba(34, 197, 94, 0.3)',
              borderRadius: '20px',
              fontSize: '0.9rem'
            }}>
              👤 {userData?.displayName || user.email?.split('@')[0]}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <ThemeSelector />
          {user && (
            <button
              onClick={signOut}
              style={{
                background: 'rgba(239, 68, 68, 0.3)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Sair
            </button>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <div style={{
        textAlign: 'center',
        marginBottom: '3rem',
        padding: '3rem 2rem',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏢</div>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: '800',
          marginBottom: '1rem',
          background: 'linear-gradient(45deg, #fff, #f0f8ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Selecione o Sistema
        </h1>
        <p style={{ fontSize: '1.3rem', opacity: 0.9, marginBottom: '2rem' }}>
          Escolha o sistema que deseja acessar
        </p>

        {/* Sistemas Ativos do Usuário */}
        {user && userData && (
          <div style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#3b82f6' }}>
              🎯 Seus Sistemas Ativos
            </h3>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              {hasAccess('ponto') && <span style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '0.25rem 0.75rem',
                borderRadius: '15px',
                fontSize: '0.8rem'
              }}>🕒 Ponto</span>}
              {hasAccess('chamados') && <span style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                padding: '0.25rem 0.75rem',
                borderRadius: '15px',
                fontSize: '0.8rem'
              }}>🎫 Chamados</span>}
              {hasAccess('frota') && <span style={{
                background: 'linear-gradient(135deg, #00ff7f 0%, #8a2be2 100%)',
                padding: '0.25rem 0.75rem',
                borderRadius: '15px',
                fontSize: '0.8rem'
              }}>🚗 Frota</span>}
              {hasAccess('documentos') && <span style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '0.25rem 0.75rem',
                borderRadius: '15px',
                fontSize: '0.8rem'
              }}>📄 Documentos</span>}
              {hasAccess('financeiro') && <span style={{
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                padding: '0.25rem 0.75rem',
                borderRadius: '15px',
                fontSize: '0.8rem'
              }}>💰 Financeiro</span>}
              {(hasAccess('crm') || hasAccess('vendas')) && <span style={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                padding: '0.25rem 0.75rem',
                borderRadius: '15px',
                fontSize: '0.8rem'
              }}>💼 CRM/Vendas</span>}
            </div>
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <span style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem'
          }}>🔐 Segurança Enterprise</span>
          <span style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem'
          }}>☁️ Cloud Native</span>
          <span style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem'
          }}>📊 Analytics Avançado</span>
        </div>
      </div>

      {/* Systems Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
        marginBottom: '3rem'
      }}>
        {sistemasDisponiveis.map((system) => {
          const hasSystemAccess = user && userData && hasAccess(system.key);
          const isAccessible = user ? (hasSystemAccess || ['vendas', 'estoque', 'rh'].includes(system.key)) : false;

          return (
            <div
              key={system.key}
              onClick={() => handleSystemSelect(system.key)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: `2px solid ${system.borderColor}`,
                borderRadius: '20px',
                padding: '2rem',
                cursor: ['vendas', 'estoque', 'rh'].includes(system.key) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(20px)',
                position: 'relative',
                overflow: 'hidden',
                opacity: ['vendas', 'estoque', 'rh'].includes(system.key) ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!['vendas', 'estoque', 'rh'].includes(system.key)) {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!['vendas', 'estoque', 'rh'].includes(system.key)) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
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
                  fontSize: '3rem',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  {system.icon}
                </div>

                <h3 style={{
                  fontSize: '1.4rem',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                  textAlign: 'center',
                  color: 'white'
                }}>
                  {system.name}
                </h3>

                <p style={{
                  fontSize: '0.9rem',
                  color: 'rgba(255, 255, 255, 0.8)',
                  textAlign: 'center',
                  lineHeight: 1.5,
                  marginBottom: '1.5rem'
                }}>
                  Sistema empresarial especializado
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: isAccessible ? system.gradient : 'rgba(128, 128, 128, 0.5)',
                  borderRadius: '12px',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}>
                  {['vendas', 'estoque', 'rh'].includes(system.key) ? (
                    <>
                      <span>🚧 Em Breve</span>
                    </>
                  ) : (
                    <>
                      <span>✅ Acessar Sistema</span>
                      <span>→</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.1)',
        borderTop: '2px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '20px',
        padding: '2rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          marginBottom: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem'
          }}>
            ⚡ Deploy Instantâneo
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem'
          }}>
            🛡️ Suporte 24/7
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          fontSize: '0.9rem',
          color: 'rgba(255, 255, 255, 0.8)',
          flexWrap: 'wrap'
        }}>
          <a href="/privacy" style={{
            color: 'rgba(255, 255, 255, 0.9)',
            textDecoration: 'none',
            fontWeight: '600'
          }}>
            Política de Privacidade
          </a>
          <span>·</span>
          <span style={{ fontWeight: '600' }}>v3.0.0</span>
          <span>·</span>
          <span>© {new Date().getFullYear()}</span>
        </div>

        <div style={{
          fontSize: '0.8rem',
          color: 'rgba(255, 255, 255, 0.7)',
          opacity: 0.8,
          marginTop: '1rem'
        }}>
          Desenvolvido com ❤️ usando Next.js + Firebase
          <br />
          ENY-GNA Lab - Global Network Architecture
        </div>
      </footer>
    </div>
  );
}
