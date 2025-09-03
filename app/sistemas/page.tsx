'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/src/lib/firebase';
import Tutorial from '@/src/components/Tutorial';
import ThemeSelector from '@/src/components/ThemeSelector';
import { homeTutorialSteps } from '@/src/lib/tutorialSteps';
import { themeManager } from '@/src/lib/themes';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where, serverTimestamp, setDoc } from 'firebase/firestore';
import AdminLoginButton from '@/src/components/AdminLoginButton';

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

async function routeAfterLoginByFirestore() {
  const u = auth.currentUser;
  if (!u) return (window.location.href = '/dashboard');

  // Primeiro verifica no documento principal de usuários
  const profSnap = await getDoc(doc(db, 'users', u.uid));
  const d = profSnap.exists() ? (profSnap.data() as any) : {};
  const role = d.role;
  const empresaId = d.empresaId;

  if (role === 'superadmin') return (window.location.href = '/admin');
  if ((role === 'admin' || role === 'gestor') && empresaId)
    return (window.location.href = '/empresa/dashboard');
  if (role === 'colaborador' && empresaId)
    return (window.location.href = '/colaborador/dashboard');

  // Se não encontrou dados no documento principal, procura nas coleções de empresas
  if (!role || !empresaId) {
    const colaboradorData = await findColaboradorInEmpresas(u.email!);
    if (colaboradorData) {
      return (window.location.href = '/colaborador/dashboard');
    }
  }

  return (window.location.href = '/dashboard');
}

// Função para buscar colaborador em todas as empresas
async function findColaboradorInEmpresas(email: string) {
  try {
    // Busca em todas as empresas
    const empresasSnap = await getDocs(collection(db, 'empresas'));

    for (const empresaDoc of empresasSnap.docs) {
      const empresaId = empresaDoc.id;

      // Busca colaborador nesta empresa pelo email
      const colaboradoresSnap = await getDocs(
        query(
          collection(db, 'empresas', empresaId, 'colaboradores'),
          where('email', '==', email)
        )
      );

      if (!colaboradoresSnap.empty) {
        const colaboradorDoc = colaboradoresSnap.docs[0];
        const colaboradorData = colaboradorDoc.data();

        // Retorna os dados encontrados
        return {
          empresaId,
          colaboradorId: colaboradorDoc.id,
          ...colaboradorData
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao buscar colaborador:', error);
    return null;
  }
}

export default function SistemasPage() {
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [role, setRole] = useState<'empresa' | 'colaborador' | 'adminmaster'>('empresa');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [empresaIdInput, setEmpresaIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState(0);
  const [isOnline, setIsOnline] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u && selectedSystem === 'ponto') {
        // já logado → roteia por Firestore
        await routeAfterLoginByFirestore();
      }
    });
    return () => unsub();
  }, [selectedSystem]);

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

  // Remember me functionality
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Login attempts blocking
  useEffect(() => {
    const attempts = parseInt(localStorage.getItem('loginAttempts') || '0');
    const lastAttempt = parseInt(localStorage.getItem('lastLoginAttempt') || '0');
    const now = Date.now();

    if (attempts >= 5 && now - lastAttempt < 300000) { // 5 minutes block
      setIsBlocked(true);
      setLoginAttempts(attempts);
      const timeLeft = Math.ceil((300000 - (now - lastAttempt)) / 1000);
      setBlockTimeLeft(timeLeft);

      const interval = setInterval(() => {
        const newTimeLeft = Math.ceil((300000 - (Date.now() - lastAttempt)) / 1000);
        if (newTimeLeft <= 0) {
          setIsBlocked(false);
          setLoginAttempts(0);
          localStorage.removeItem('loginAttempts');
          localStorage.removeItem('lastLoginAttempt');
          clearInterval(interval);
        } else {
          setBlockTimeLeft(newTimeLeft);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, []);

  const handleForgotPassword = async () => {
    if (!resetEmail || !isValidEmail(resetEmail)) {
      setError('Digite um email válido para recuperação.');
      return;
    }

    try {
      setResetLoading(true);
      setError(null);
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);

      // Log the password reset attempt
      await setDoc(doc(db, 'security_logs', Date.now().toString()), {
        type: 'password_reset',
        email: resetEmail,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        ip: 'unknown'
      });

    } catch (error: any) {
      setError('Erro ao enviar email de recuperação. Tente novamente.');
    } finally {
      setResetLoading(false);
    }
  };

  async function handleSignin() {
    if (isBlocked) {
      setError(`Muitas tentativas. Tente novamente em ${Math.floor(blockTimeLeft / 60)}:${(blockTimeLeft % 60).toString().padStart(2, '0')}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!isValidEmail(email)) throw new Error('Digite um e-mail válido.');
      if (!password || password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');

      // Para colaboradores, primeiro verifica se existe no sistema
      if (role === 'colaborador') {
        const colaboradorData = await findColaboradorInEmpresas(email);
        if (!colaboradorData) {
          throw new Error('Colaborador não encontrado. Verifique seu email ou entre em contato com sua empresa.');
        }
      }

      await signInWithEmailAndPassword(auth, email, password);

      // Reset login attempts on success
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('lastLoginAttempt');

      // Remember me functionality
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // Log successful login
      await setDoc(doc(db, 'security_logs', Date.now().toString()), {
        type: 'login_success',
        email: email,
        role: role,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        ip: 'unknown'
      });

      await routeAfterLoginByFirestore();
    } catch (e: any) {
      // Increment login attempts
      const currentAttempts = loginAttempts + 1;
      setLoginAttempts(currentAttempts);
      localStorage.setItem('loginAttempts', currentAttempts.toString());
      localStorage.setItem('lastLoginAttempt', Date.now().toString());

      // Log failed login attempt
      await setDoc(doc(db, 'security_logs', Date.now().toString()), {
        type: 'login_failed',
        email: email,
        role: role,
        error: e.code || e.message,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        ip: 'unknown'
      });

      if (currentAttempts >= 5) {
        setIsBlocked(true);
        setBlockTimeLeft(300); // 5 minutes
        setError('Muitas tentativas de login. Conta bloqueada por 5 minutos.');
        return;
      }

      if (e.code === 'auth/user-not-found') {
        setError('Usuário não encontrado. Verifique seu email.');
      } else if (e.code === 'auth/wrong-password') {
        setError(`Senha incorreta. ${5 - currentAttempts} tentativas restantes.`);
      } else if (e.code === 'auth/invalid-email') {
        setError('Email inválido. Verifique o formato do email.');
      } else if (e.code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Tente novamente mais tarde.');
      } else {
        setError(e?.message || 'Erro ao entrar.');
      }
    } finally {
      setLoading(false);
    }
  }

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
      setSelectedSystem(systemId);
    } else if (systemId === 'chamados') {
      // Redirecionar para o sistema de chamados já implementado
      window.location.href = '/chamados';
    } else if (systemId === 'documentos') {
      // Redirecionar para o sistema de documentos
      window.location.href = '/documentos';
    } else if (systemId === 'frota') {
      // Redirecionar para o sistema de frota
      window.location.href = '/frota';
    } else if (systemId === 'financeiro') {
      // Redirecionar para o sistema financeiro
      window.location.href = '/financeiro/auth';
    } else if (systemId === 'crm') {
      // Redirecionar para o sistema de CRM
      window.location.href = '/crm/auth';
    } else {
      // Para outros sistemas, mostrar mensagem
      alert(`Sistema ${systems.find(s => s.id === systemId)?.name} será implementado em breve!`);
    }
  };

  const handleBackToSystems = () => {
    setSelectedSystem(null);
    setError(null);
    setEmail('');
    setPassword('');
  };

  if (!selectedSystem) {
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
          {systems.map((system) => (
            <div
              key={system.id}
              className="system-card"
              onClick={() => handleSystemSelect(system.id)}
              style={{
                background: 'var(--gradient-card)',
                border: `2px solid ${system.borderColor}`,
                borderRadius: '20px',
                padding: 'var(--gap-xl)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(20px)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
                e.currentTarget.style.borderColor = system.borderColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
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
                  {system.description}
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--gap-sm)',
                  padding: 'var(--gap-sm) var(--gap-md)',
                  background: system.gradient,
                  borderRadius: '12px',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}>
                  <span>Acessar Sistema</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          ))}
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

  // Login Interface for selected system
  return (
    <div className="container">
      {/* Header with back button */}
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
          <button
            onClick={handleBackToSystems}
            className="button button-ghost"
            style={{
              padding: 'var(--gap-sm) var(--gap-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--gap-sm)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Voltar aos Sistemas
          </button>
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
        </div>
        <ThemeSelector size="medium" showLabels={false} />
      </div>

      <div className="card fade-in">
        <div className="responsive-flex" style={{ marginBottom: 'var(--gap-xl)' }}>
          <span className="badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2"/>
              <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
            {systems.find(s => s.id === selectedSystem)?.name} v3.0
          </span>
          <div className="badge">
            <span className="pulse" style={{ width: '8px', height: '8px', background: 'var(--color-success)', borderRadius: '50%' }}></span>
            Sistema Ativo
          </div>
        </div>

        <h1 className="h1" style={{ marginBottom: 'var(--gap-md)', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)' }}>
          {systems.find(s => s.id === selectedSystem)?.name}
        </h1>
        <p className="h2" style={{ marginBottom: 'var(--gap-xl)', fontSize: 'clamp(1.1rem, 2vw, 1.3rem)' }}>
          {systems.find(s => s.id === selectedSystem)?.description}
        </p>

        <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--gap-sm)' }}>
          <span className="tag">🔐 Segurança Avançada</span>
          <span className="tag">📍 GPS Preciso</span>
          <span className="tag">🗺️ Mapas Integrados</span>
          <span className="tag">👨‍💼 Painel Admin</span>
          <span className="tag">📄 Relatórios PDF</span>
          <span className="tag">🚀 Multi-tenant</span>
        </div>

        <div style={{ marginBottom: 'var(--gap-xl)' }}>
          <h3 style={{ marginBottom: 'var(--gap-md)', color: 'var(--color-textSecondary)', fontSize: 'clamp(1rem, 2vw, 1.1rem)' }}>Selecione o tipo de acesso:</h3>
          <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--gap-md)' }}>
            <button
              onClick={() => setRole('empresa')}
              className={role === 'empresa' ? 'button-primary' : 'button'}
              style={{ flex: '1', minWidth: '150px', fontSize: 'clamp(0.9rem, 1.5vw, 1rem)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 21h18V8l-9-5-9 5v13z" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Empresa
            </button>
            <button
              onClick={() => setRole('colaborador')}
              className={role === 'colaborador' ? 'button-primary' : 'button'}
              style={{ flex: '1', minWidth: '150px', fontSize: 'clamp(0.9rem, 1.5vw, 1rem)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Colaborador
            </button>
            <button
              onClick={() => setRole('adminmaster')}
              className={role === 'adminmaster' ? 'button-primary' : 'button'}
              style={{
                flex: '1',
                minWidth: '150px',
                background: role === 'adminmaster' ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : undefined,
                borderColor: role === 'adminmaster' ? '#dc2626' : undefined,
                fontSize: 'clamp(0.9rem, 1.5vw, 1rem)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Admin Master
            </button>
          </div>
        </div>

        {role === 'colaborador' && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 8,
            padding: 12,
            marginTop: 8,
            fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              💡 <strong>Colaborador:</strong> Digite apenas seu email e senha. O sistema localizará automaticamente sua empresa.
            </div>
            <div style={{ textAlign: 'center' }}>
              <a
                href="/colaborador/criar-conta"
                className="button button-outline"
                style={{
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)',
                  padding: '8px 16px'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  <line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" strokeWidth="2"/>
                  <line x1="22" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Criar Conta Pessoal
              </a>
            </div>
          </div>
        )}

        {role === 'adminmaster' && (
          <div style={{
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: 8,
            padding: 12,
            marginTop: 8,
            fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)'
          }}>
            ⚠️ <strong>Admin Master:</strong> Acesso total ao sistema. Use apenas para administração do sistema.
          </div>
        )}

        {showForgotPassword ? (
          <div className="stack" style={{ marginTop: 12 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <h3>🔐 Recuperar Senha</h3>
              <p style={{ fontSize: 'clamp(0.7rem, 1.3vw, 0.9rem)', color: '#666' }}>
                Digite seu email para receber o link de recuperação
              </p>
            </div>

            <input
              className="input"
              placeholder="E-mail para recuperação"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              disabled={resetLoading}
            />

            {error && <div style={{ color: '#ff8a8a', fontSize: 'clamp(0.7rem, 1.3vw, 0.9rem)' }}>{error}</div>}

            {resetSuccess && (
              <div style={{
                color: '#10b981',
                fontSize: 'clamp(0.7rem, 1.3vw, 0.9rem)',
                textAlign: 'center',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: 8,
                borderRadius: 4,
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                ✅ Email de recuperação enviado! Verifique sua caixa de entrada.
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="button button-primary"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                style={{ flex: 1 }}
              >
                {resetLoading ? 'Enviando...' : 'Enviar Email'}
              </button>
              <button
                className="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError(null);
                  setResetSuccess(false);
                  setResetEmail('');
                }}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="stack" style={{ marginTop: 12 }}>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                placeholder="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || isBlocked}
                style={{ paddingRight: email ? 30 : 12 }}
              />
              {email && (
                <button
                  onClick={() => setEmail('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 16,
                    color: '#999'
                  }}
                >
                  ×
                </button>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <input
                className="input"
                placeholder="Senha"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || isBlocked}
                style={{ paddingRight: 40 }}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 'clamp(0.7rem, 1.3vw, 0.9rem)',
              flexWrap: 'wrap',
              gap: 8
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Lembrar-me
              </label>

              <button
                onClick={() => setShowForgotPassword(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: 'clamp(0.7rem, 1.3vw, 0.9rem)'
                }}
              >
                Esqueci minha senha
              </button>
            </div>

            {error && (
              <div style={{
                color: '#ef4444',
                fontSize: 'clamp(0.7rem, 1.3vw, 0.9rem)',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: 8,
                borderRadius: 4,
                border: '1px solid rgba(239, 68, 68, 0.3)',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {isBlocked && (
              <div style={{
                color: '#f59e0b',
                fontSize: 'clamp(0.7rem, 1.3vw, 0.9rem)',
                background: 'rgba(245, 158, 11, 0.1)',
                padding: 8,
                borderRadius: 4,
                border: '1px solid rgba(245, 158, 11, 0.3)',
                textAlign: 'center'
              }}>
                🔒 Conta temporariamente bloqueada. Tempo restante: {Math.floor(blockTimeLeft / 60)}:{(blockTimeLeft % 60).toString().padStart(2, '0')}
              </div>
            )}

            <button
              className="button button-primary"
              onClick={handleSignin}
              disabled={loading || isBlocked || !email || !password}
              style={{
                opacity: (loading || isBlocked || !email || !password) ? 0.5 : 1,
                cursor: (loading || isBlocked || !email || !password) ? 'not-allowed' : 'pointer',
                fontSize: 'clamp(0.9rem, 1.5vw, 1rem)',
                padding: 'var(--gap-sm) var(--gap-md)'
              }}
            >
              {loading ? '🔄 Entrando...' : isBlocked ? '🔒 Bloqueado' : '🚀 Entrar'}
            </button>

            {/* Status da sessão */}
            <div style={{
              fontSize: 'clamp(0.7rem, 1.3vw, 0.8rem)',
              color: '#666',
              textAlign: 'center',
              marginTop: 8
            }}>
              {loginAttempts > 0 && loginAttempts < 5 && (
                <span>⚠️ {loginAttempts}/5 tentativas utilizadas</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}