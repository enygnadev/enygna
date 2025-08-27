
<old_str>'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import { useChamadosSessionProfile } from '@/src/lib/chamadosAuth';

export default function ChamadosAuthPage() {
  const router = useRouter();
  const { loading, profile } = useChamadosSessionProfile();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (!loading && profile) {
      router.push('/chamados');
    }
  }, [loading, profile, router]);

  const checkUserPermissions = async (userEmail: string) => {
    try {
      // Primeiro verificar na coleção users (sistema geral)
      const usersRef = doc(db, 'users');
      const usersSnapshot = await getDoc(usersRef);
      
      if (usersSnapshot.exists()) {
        const userData = usersSnapshot.data();
        const role = userData.role?.toLowerCase();
        
        if (role === 'superadmin' || role === 'admin' || role === 'adminmaster') {
          router.push('/chamados/admin');
          return;
        }
      }

      // Verificar na coleção específica do sistema de chamados
      const chamadosUserRef = doc(db, 'chamados_users', auth.currentUser?.uid || '');
      const chamadosUserSnap = await getDoc(chamadosUserRef);
      
      if (chamadosUserSnap.exists()) {
        const userData = chamadosUserSnap.data();
        const role = userData.role?.toLowerCase();
        
        // Redirecionar baseado no papel do usuário
        if (role === 'adminmaster' || role === 'admin') {
          router.push('/chamados/admin');
        } else if (role === 'colaborador') {
          router.push('/chamados');
        } else {
          router.push('/chamados');
        }
      } else {
        // Usuário não encontrado no sistema de chamados
        router.push('/chamados');
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      setError('Erro ao verificar permissões do usuário');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Preencha todos os campos');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      await checkUserPermissions(userCredential.user.email!);
    } catch (error: any) {
      console.error('Erro no login:', error);
      const errorMessage = getErrorMessage(error.code);
      setError(errorMessage);

      // Notificação adicional para credenciais inválidas
      if (error.code === 'auth/invalid-credential') {
        setTimeout(() => {
          setError('💡 Dica: Verifique se você digitou o email e a senha corretamente. Se esqueceu sua senha, use a opção "Esqueci minha senha".');
        }, 3000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('Digite seu email');
      return;
    }

    setResetLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);
    } catch (error: any) {
      setError(getErrorMessage(error.code));
    } finally {
      setResetLoading(false);
    }
  };

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'Usuário não encontrado';
      case 'auth/wrong-password':
        return 'Senha incorreta';
      case 'auth/invalid-credential':
        return '🚫 Credenciais inválidas. Verifique seu email e senha.';
      case 'auth/email-already-in-use':
        return 'Este email já está em uso';
      case 'auth/weak-password':
        return 'Senha muito fraca';
      case 'auth/invalid-email':
        return 'Email inválido';
      case 'auth/too-many-requests':
        return '⚠️ Muitas tentativas de login. Tente novamente mais tarde.';
      default:
        return 'Erro no sistema. Tente novamente.';
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="container" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--gap-md)' }}>🎫</div>
          <div>Carregando...</div>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="container">
        <style jsx>{`
          .auth-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #2d1b69 50%, #1a1a3e 75%, #0f0f23 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--gap-md);
          }

          .auth-card {
            background: var(--gradient-card);
            border-radius: var(--radius-lg);
            padding: 2rem;
            width: 100%;
            max-width: 400px;
            border: 1px solid rgba(0, 255, 127, 0.3);
            backdrop-filter: blur(15px);
          }

          .form-group {
            margin-bottom: var(--gap-md);
          }

          .error-message {
            background: rgba(255, 107, 107, 0.1);
            border: 1px solid #ff6b6b;
            color: #ff6b6b;
            padding: var(--gap-sm);
            border-radius: var(--radius);
            margin-bottom: var(--gap-md);
          }

          .success-message {
            background: rgba(0, 255, 127, 0.1);
            border: 1px solid #00ff7f;
            color: #00ff7f;
            padding: var(--gap-sm);
            border-radius: var(--radius);
            margin-bottom: var(--gap-md);
          }
        `}</style>

        <div className="auth-container">
          <div className="auth-card">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔑</div>
              <h1 style={{ color: 'var(--color-text)', marginBottom: '0.5rem' }}>
                Recuperar Senha
              </h1>
              <p style={{ color: 'var(--color-textSecondary)' }}>
                Sistema de Chamados
              </p>
            </div>

            {error && <div className="error-message">{error}</div>}
            {resetSuccess && (
              <div className="success-message">
                Email de recuperação enviado! Verifique sua caixa de entrada.
              </div>
            )}

            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label htmlFor="resetEmail">Email</label>
                <input
                  id="resetEmail"
                  type="email"
                  className="input"
                  placeholder="Digite seu email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="button button-primary"
                disabled={resetLoading}
                style={{ width: '100%', marginBottom: 'var(--gap-md)' }}
              >
                {resetLoading ? 'Enviando...' : 'Enviar Email de Recuperação'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError('');
                    setResetSuccess(false);
                  }}
                  className="button button-ghost"
                >
                  Voltar ao Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #2d1b69 50%, #1a1a3e 75%, #0f0f23 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--gap-md);
        }

        .auth-card {
          background: var(--gradient-card);
          border-radius: var(--radius-lg);
          padding: 2rem;
          width: 100%;
          max-width: 400px;
          border: 1px solid rgba(0, 255, 127, 0.3);
          backdrop-filter: blur(15px);
        }

        .form-group {
          margin-bottom: var(--gap-md);
        }

        .error-message {
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid #ff6b6b;
          color: #ff6b6b;
          padding: var(--gap-sm);
          border-radius: var(--radius);
          margin-bottom: var(--gap-md);
        }
      `}</style>

      <div className="auth-container">
        <div className="auth-card">
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
            <h1 style={{ color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              Sistema de Chamados
            </h1>
            <p style={{ color: 'var(--color-textSecondary)' }}>
              Acesso somente para usuários autorizados
            </p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha *</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="Digite sua senha"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="button button-primary"
              disabled={submitting}
              style={{ width: '100%', marginBottom: 'var(--gap-md)' }}
            >
              {submitting ? 'Processando...' : 'Entrar no Sistema'}
            </button>

            <div style={{ textAlign: 'center', marginBottom: 'var(--gap-md)' }}>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="button button-ghost"
                style={{ fontSize: '0.9rem' }}
              >
                Esqueceu sua senha?
              </button>
            </div>

            <div style={{ 
              textAlign: 'center', 
              paddingTop: 'var(--gap-md)', 
              borderTop: '1px solid var(--color-border)',
              fontSize: '0.9rem',
              color: 'var(--color-textSecondary)'
            }}>
              <p style={{ marginBottom: 'var(--gap-md)' }}>
                🔐 Acesso controlado pelo Admin Master
              </p>
              
              <Link href="/sistemas" className="button button-ghost">
                ← Voltar aos Sistemas
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}</old_str>
<new_str>'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import { useChamadosSessionProfile } from '@/src/lib/chamadosAuth';

export default function ChamadosAuthPage() {
  const router = useRouter();
  const { loading, profile } = useChamadosSessionProfile();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (!loading && profile) {
      router.push('/chamados');
    }
  }, [loading, profile, router]);

  const checkUserPermissions = async (userEmail: string) => {
    try {
      // Primeiro verificar na coleção users (sistema geral)
      const usersRef = doc(db, 'users', auth.currentUser?.uid || '');
      const usersSnapshot = await getDoc(usersRef);
      
      if (usersSnapshot.exists()) {
        const userData = usersSnapshot.data();
        const role = userData.role?.toLowerCase();
        
        if (role === 'superadmin' || role === 'admin' || role === 'adminmaster') {
          router.push('/chamados/admin');
          return;
        }
      }

      // Verificar na coleção específica do sistema de chamados
      const chamadosUserRef = doc(db, 'chamados_users', auth.currentUser?.uid || '');
      const chamadosUserSnap = await getDoc(chamadosUserRef);
      
      if (chamadosUserSnap.exists()) {
        const userData = chamadosUserSnap.data();
        const role = userData.role?.toLowerCase();
        
        // Redirecionar baseado no papel do usuário
        if (role === 'adminmaster' || role === 'admin') {
          router.push('/chamados/admin');
        } else if (role === 'colaborador') {
          router.push('/chamados');
        } else {
          router.push('/chamados');
        }
      } else {
        // Usuário não encontrado no sistema de chamados
        setError('Usuário não autorizado para este sistema. Contate o administrador.');
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      setError('Erro ao verificar permissões do usuário');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Preencha todos os campos');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      await checkUserPermissions(userCredential.user.email!);
    } catch (error: any) {
      console.error('Erro no login:', error);
      const errorMessage = getErrorMessage(error.code);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('Digite seu email');
      return;
    }

    setResetLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);
    } catch (error: any) {
      setError(getErrorMessage(error.code));
    } finally {
      setResetLoading(false);
    }
  };

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'Usuário não encontrado. Contate o administrador.';
      case 'auth/wrong-password':
        return 'Senha incorreta';
      case 'auth/invalid-credential':
        return '🚫 Credenciais inválidas. Contate o administrador se necessário.';
      case 'auth/email-already-in-use':
        return 'Este email já está em uso';
      case 'auth/weak-password':
        return 'Senha muito fraca';
      case 'auth/invalid-email':
        return 'Email inválido';
      case 'auth/too-many-requests':
        return '⚠️ Muitas tentativas de login. Tente novamente mais tarde.';
      default:
        return 'Erro no sistema. Tente novamente.';
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="container" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--gap-md)' }}>🎫</div>
          <div>Carregando...</div>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="container">
        <style jsx>{`
          .auth-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #2d1b69 50%, #1a1a3e 75%, #0f0f23 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--gap-md);
          }

          .auth-card {
            background: var(--gradient-card);
            border-radius: var(--radius-lg);
            padding: 2rem;
            width: 100%;
            max-width: 400px;
            border: 1px solid rgba(0, 255, 127, 0.3);
            backdrop-filter: blur(15px);
          }

          .form-group {
            margin-bottom: var(--gap-md);
          }

          .error-message {
            background: rgba(255, 107, 107, 0.1);
            border: 1px solid #ff6b6b;
            color: #ff6b6b;
            padding: var(--gap-sm);
            border-radius: var(--radius);
            margin-bottom: var(--gap-md);
          }

          .success-message {
            background: rgba(0, 255, 127, 0.1);
            border: 1px solid #00ff7f;
            color: #00ff7f;
            padding: var(--gap-sm);
            border-radius: var(--radius);
            margin-bottom: var(--gap-md);
          }
        `}</style>

        <div className="auth-container">
          <div className="auth-card">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔑</div>
              <h1 style={{ color: 'var(--color-text)', marginBottom: '0.5rem' }}>
                Recuperar Senha
              </h1>
              <p style={{ color: 'var(--color-textSecondary)' }}>
                Sistema de Chamados
              </p>
            </div>

            {error && <div className="error-message">{error}</div>}
            {resetSuccess && (
              <div className="success-message">
                Email de recuperação enviado! Verifique sua caixa de entrada.
              </div>
            )}

            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label htmlFor="resetEmail">Email</label>
                <input
                  id="resetEmail"
                  type="email"
                  className="input"
                  placeholder="Digite seu email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="button button-primary"
                disabled={resetLoading}
                style={{ width: '100%', marginBottom: 'var(--gap-md)' }}
              >
                {resetLoading ? 'Enviando...' : 'Enviar Email de Recuperação'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError('');
                    setResetSuccess(false);
                  }}
                  className="button button-ghost"
                >
                  Voltar ao Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #2d1b69 50%, #1a1a3e 75%, #0f0f23 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--gap-md);
        }

        .auth-card {
          background: var(--gradient-card);
          border-radius: var(--radius-lg);
          padding: 2rem;
          width: 100%;
          max-width: 400px;
          border: 1px solid rgba(0, 255, 127, 0.3);
          backdrop-filter: blur(15px);
        }

        .form-group {
          margin-bottom: var(--gap-md);
        }

        .error-message {
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid #ff6b6b;
          color: #ff6b6b;
          padding: var(--gap-sm);
          border-radius: var(--radius);
          margin-bottom: var(--gap-md);
        }
      `}</style>

      <div className="auth-container">
        <div className="auth-card">
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
            <h1 style={{ color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              Sistema de Chamados
            </h1>
            <p style={{ color: 'var(--color-textSecondary)' }}>
              Acesso somente para usuários autorizados
            </p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha *</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="Digite sua senha"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="button button-primary"
              disabled={submitting}
              style={{ width: '100%', marginBottom: 'var(--gap-md)' }}
            >
              {submitting ? 'Processando...' : 'Entrar no Sistema'}
            </button>

            <div style={{ textAlign: 'center', marginBottom: 'var(--gap-md)' }}>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="button button-ghost"
                style={{ fontSize: '0.9rem' }}
              >
                Esqueceu sua senha?
              </button>
            </div>

            <div style={{ 
              textAlign: 'center', 
              paddingTop: 'var(--gap-md)', 
              borderTop: '1px solid var(--color-border)',
              fontSize: '0.9rem',
              color: 'var(--color-textSecondary)'
            }}>
              <p style={{ marginBottom: 'var(--gap-md)' }}>
                🔐 Acesso controlado pelo Admin Master
              </p>
              
              <Link href="/sistemas" className="button button-ghost">
                ← Voltar aos Sistemas
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}</old_str>
