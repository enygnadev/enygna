'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/src/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import ThemeSelector from '@/src/components/ThemeSelector';

export default function DocumentosAuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'empresa' | 'colaborador' | 'adminmaster'>('empresa');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Verificar se o usuário tem acesso ao sistema de documentos
        try {
          const userDocRef = doc(db, 'documentos_users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            window.location.href = '/documentos';
          }
        } catch (error) {
          console.error('Erro ao verificar usuário:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Verificar se o usuário existe na coleção de documentos
      const userDocRef = doc(db, 'documentos_users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setError('Usuário não tem acesso ao sistema de documentos');
        await auth.signOut();
        return;
      }

      // Redirecionar para o sistema de documentos
      window.location.href = '/documentos';
    } catch (error: any) {
      console.error('Erro no login:', error);
      if (error.code === 'auth/user-not-found') {
        setError('Usuário não encontrado');
      } else if (error.code === 'auth/wrong-password') {
        setError('Senha incorreta');
      } else if (error.code === 'auth/invalid-email') {
        setError('Email inválido');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !nome) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (role !== 'adminmaster' && !empresaId) {
      setError('ID da empresa é obrigatório');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verificar se o email já está cadastrado no sistema de documentos
      const existingUsers = await getDocs(
        query(
          collection(db, 'documentos_users'),
          where('email', '==', email)
        )
      );

      if (!existingUsers.empty) {
        setError('Este email já está cadastrado no sistema de documentos. Faça login.');
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Criar perfil na coleção de documentos
      const userData = {
        uid: user.uid,
        email: user.email,
        nome: nome,
        role: role,
        empresaId: role === 'adminmaster' ? null : empresaId,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: 'self-registration'
      };

      await setDoc(doc(db, 'documentos_users', user.uid), userData);

      // Se for empresa, criar documento da empresa
      if (role === 'empresa' && empresaId) {
        const empresaRef = doc(db, 'documentos_empresas', empresaId);
        const empresaDoc = await getDoc(empresaRef);

        if (!empresaDoc.exists()) {
          await setDoc(empresaRef, {
            id: empresaId,
            nome: nome,
            adminId: user.uid,
            createdAt: new Date().toISOString(),
            isActive: true
          });
        }
      }

      // Sucesso - redirecionar
      window.location.href = '/documentos';
    } catch (error: any) {
      console.error('Erro no cadastro:', error);

      if (error.code === 'auth/email-already-in-use') {
        setError('Este email já possui uma conta. Faça login ou use outro email.');
      } else if (error.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('Digite seu email');
      return;
    }

    setResetLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);
    } catch (error: any) {
      setError('Erro ao enviar email de recuperação');
    } finally {
      setResetLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="container">
        <style jsx>{`
          .auth-container {
            max-width: 400px;
            margin: 0 auto;
            padding: 2rem;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
        `}</style>

        <div className="auth-container">
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
              <h1>Recuperar Senha</h1>
              <p>Sistema de Documentos</p>
            </div>

            {resetSuccess ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--color-success)', marginBottom: '1rem' }}>
                  Email de recuperação enviado!
                </p>
                <button
                  className="button button-outline"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSuccess(false);
                    setResetEmail('');
                  }}
                >
                  Voltar ao Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <div className="stack">
                  <div>
                    <label>Email</label>
                    <input
                      className="input"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>

                  {error && (
                    <div className="alert alert-error">
                      {error}
                    </div>
                  )}

                  <div className="row" style={{ gap: '1rem' }}>
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() => setShowForgotPassword(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="button button-primary"
                      disabled={resetLoading}
                    >
                      {resetLoading ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <style jsx>{`
        .auth-container {
          max-width: 500px;
          margin: 0 auto;
          padding: 2rem;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .tab-buttons {
          display: flex;
          border-radius: var(--radius);
          overflow: hidden;
          margin-bottom: 2rem;
          border: 1px solid var(--color-border);
        }

        .tab-button {
          flex: 1;
          padding: 1rem;
          background: var(--color-surface);
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .tab-button.active {
          background: var(--color-primary);
          color: white;
        }

        .role-selector {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .role-option {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          background: var(--color-surface);
          cursor: pointer;
          text-align: center;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .role-option.selected {
          border-color: var(--color-primary);
          background: var(--color-primary)10;
          color: var(--color-primary);
        }
      `}</style>

      {/* Header */}
      <div className="responsive-flex" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: '1rem',
        background: 'var(--color-background)',
        borderBottom: '1px solid var(--color-border)',
        backdropFilter: 'blur(10px)'
      }}>
        <Link href="/sistemas" className="button button-ghost">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Voltar aos Sistemas
        </Link>
        <ThemeSelector size="medium" />
      </div>

      <div className="auth-container" style={{ paddingTop: '5rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📄</div>
            <h1>Gerador de Documentos</h1>
            <p>Sistema independente de geração de documentos</p>
          </div>

          <div className="tab-buttons">
            <button
              className={`tab-button ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Entrar
            </button>
            <button
              className={`tab-button ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={isLogin ? handleLogin : handleRegister}>
            <div className="stack">
              {!isLogin && (
                <>
                  <div>
                    <label>Tipo de Conta</label>
                    <div className="role-selector">
                      <div
                        className={`role-option ${role === 'empresa' ? 'selected' : ''}`}
                        onClick={() => setRole('empresa')}
                      >
                        🏢 Empresa
                      </div>
                      <div
                        className={`role-option ${role === 'colaborador' ? 'selected' : ''}`}
                        onClick={() => setRole('colaborador')}
                      >
                        👤 Colaborador
                      </div>
                      <div
                        className={`role-option ${role === 'adminmaster' ? 'selected' : ''}`}
                        onClick={() => setRole('adminmaster')}
                      >
                        ⚡ Admin Master
                      </div>
                    </div>
                  </div>

                  <div>
                    <label>Nome *</label>
                    <input
                      className="input"
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Seu nome completo"
                      required={!isLogin}
                    />
                  </div>
                </>
              )}

              {role !== 'adminmaster' && (
                <div>
                  <label>ID da Empresa *</label>
                  <input
                    className="input"
                    type="text"
                    value={empresaId}
                    onChange={(e) => setEmpresaId(e.target.value)}
                    placeholder="ex: empresa123"
                    required={!isLogin}  
                  />
                  <small style={{ color: 'var(--color-textSecondary)' }}>
                    Identificador único da sua empresa
                  </small>
                </div>
              )}

              <div>
                <label>Email</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div>
                <label>Senha</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="alert alert-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="button button-primary"
                disabled={loading}
              >
                {loading ? (isLogin ? 'Entrando...' : 'Cadastrando...') : (isLogin ? 'Entrar' : 'Cadastrar')}
              </button>

              {isLogin && (
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Esqueci minha senha
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}