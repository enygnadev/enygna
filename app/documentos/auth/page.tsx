
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/src/lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import ThemeSelector from '@/src/components/ThemeSelector';

export default function DocumentosAuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Verificar se usuário já está logado e tem acesso
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('👤 Usuário já logado, verificando acesso ao sistema documentos...');
        
        try {
          // Verificar se tem acesso ao sistema documentos
          const hasDocumentosAccess = await checkDocumentosAccess(user);
          
          if (hasDocumentosAccess) {
            console.log('✅ Usuário já tem acesso ao sistema documentos, redirecionando...');
            // Evitar loop: verificar se já estamos sendo redirecionados
            const currentPath = window.location.pathname;
            if (currentPath === '/documentos/auth') {
              router.replace('/documentos');
            }
            return;
          } else {
            console.log('❌ Usuário logado mas sem acesso ao sistema documentos');
            await auth.signOut(); // Deslogar se não tem acesso
          }
        } catch (error) {
          console.error('Erro ao verificar acesso:', error);
        }
      }
      
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  const checkDocumentosAccess = async (user: any): Promise<boolean> => {
    try {
      console.log('🔍 Verificando acesso ao sistema documentos para:', user.email);

      // 1. Verificar claims do token primeiro (mais confiável)
      try {
        const tokenResult = await user.getIdTokenResult(true);
        const claims = tokenResult.claims;
        
        console.log('🎫 Claims do usuário:', claims);
        
        // Super admin sempre tem acesso
        if (claims.role === 'superadmin' || claims.role === 'adminmaster' || claims.bootstrapAdmin) {
          console.log('👑 Super admin detectado - acesso liberado');
          return true;
        }
        
        // Verificar sistemas ativos nas claims
        if (claims.sistemasAtivos?.includes('documentos') || 
            claims.permissions?.canAccessSystems?.includes('documentos')) {
          console.log('✅ Acesso encontrado nas claims');
          return true;
        }
      } catch (claimsError) {
        console.log('⚠️ Erro ao verificar claims, continuando com Firestore:', claimsError);
      }

      // 2. Verificar documento do usuário
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('📊 Dados do usuário encontrados:', userData);
        
        // Verificar se tem acesso ao sistema documentos
        if (userData.sistemasAtivos?.includes('documentos') || 
            userData.permissions?.documentos ||
            userData.permissions?.canAccessSystems?.includes('documentos')) {
          console.log('✅ Acesso encontrado no documento do usuário');
          return true;
        }
      }

      // 3. Verificar se é empresa com sistema documentos ativo
      const empresasQuery = query(collection(db, 'empresas'), where('email', '==', user.email));
      const empresasSnapshot = await getDocs(empresasQuery);

      for (const empresaDoc of empresasSnapshot.docs) {
        const empresaData = empresaDoc.data();
        console.log('🏢 Verificando empresa:', empresaDoc.id, empresaData);
        
        if (empresaData.ativo && 
            empresaData.sistemasAtivos && 
            empresaData.sistemasAtivos.includes('documentos')) {
          console.log('✅ Acesso encontrado na empresa');
          return true;
        }
      }

      // 4. Verificar se é colaborador em empresa com documentos ativo
      const todasEmpresas = await getDocs(collection(db, 'empresas'));
      for (const empresaDoc of todasEmpresas.docs) {
        const empresaData = empresaDoc.data();
        
        if (empresaData.ativo && empresaData.sistemasAtivos?.includes('documentos')) {
          const colaboradoresRef = collection(db, 'empresas', empresaDoc.id, 'colaboradores');
          const colaboradorQuery = query(colaboradoresRef, where('email', '==', user.email));
          const colaboradorSnapshot = await getDocs(colaboradorQuery);
          
          if (!colaboradorSnapshot.empty) {
            console.log('✅ Acesso encontrado como colaborador');
            return true;
          }
        }
      }

      console.log('❌ Nenhum acesso encontrado ao sistema documentos');
      return false;
    } catch (error) {
      console.error('Erro ao verificar acesso ao documentos:', error);
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔐 Fazendo login para sistema documentos...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Verificar acesso após login
      const hasAccess = await checkDocumentosAccess(user);
      
      if (hasAccess) {
        console.log('✅ Login realizado com sucesso, redirecionando para /documentos');
        // Usar replace para evitar loop de navegação
        router.replace('/documentos');
      } else {
        setError('Este email não tem acesso ao sistema de documentos. Entre em contato com o administrador.');
        await auth.signOut();
      }

    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      
      if (error.code === 'auth/user-not-found') {
        setError('Usuário não encontrado');
      } else if (error.code === 'auth/wrong-password') {
        setError('Senha incorreta');
      } else if (error.code === 'auth/invalid-email') {
        setError('Email inválido');
      } else if (error.code === 'auth/invalid-credential') {
        setError('Credenciais inválidas');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Muitas tentativas de login. Tente novamente mais tarde.');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
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
      console.error('Erro ao enviar email de recuperação:', error);
      setError('Erro ao enviar email de recuperação. Verifique se o email está correto.');
    } finally {
      setResetLoading(false);
    }
  };

  // Mostrar loading enquanto verifica autenticação
  if (checkingAuth) {
    return (
      <div className="container" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p>Verificando acesso...</p>
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
                <div style={{ 
                  background: 'rgba(34, 197, 94, 0.1)', 
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <p style={{ color: 'var(--color-success)', margin: 0 }}>
                    ✅ Email de recuperação enviado com sucesso!
                  </p>
                </div>
                <p style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
                  Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
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
                    <div style={{ 
                      background: 'rgba(239, 68, 68, 0.1)', 
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      padding: '1rem'
                    }}>
                      <p style={{ color: 'var(--color-error)', margin: 0 }}>
                        ❌ {error}
                      </p>
                    </div>
                  )}

                  <div className="row" style={{ gap: '1rem' }}>
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setError(null);
                      }}
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

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
            <h1 style={{ marginBottom: '0.5rem' }}>Gerador de Documentos</h1>
            <p style={{ opacity: 0.8 }}>Entre com seu email e senha</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="stack">
              <div>
                <label>Email</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
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
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <p style={{ color: 'var(--color-error)', margin: 0 }}>
                    ❌ {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="button button-primary"
                disabled={loading}
                style={{
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Entrando...
                  </div>
                ) : (
                  '🚀 Entrar no Sistema'
                )}
              </button>

              <button
                type="button"
                className="button button-ghost"
                onClick={() => {
                  setShowForgotPassword(true);
                  setError(null);
                }}
              >
                Esqueci minha senha
              </button>
            </div>
          </form>

          {/* Informações de Segurança */}
          <div style={{ 
            textAlign: 'center', 
            paddingTop: 'var(--gap-lg)', 
            borderTop: '1px solid var(--color-border)',
            marginTop: 'var(--gap-lg)'
          }}>
            <div style={{ marginBottom: 'var(--gap-md)' }}>
              <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>
                🔐 Acesso seguro ao sistema de documentos
              </p>
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                justifyContent: 'center', 
                flexWrap: 'wrap',
                fontSize: '0.8rem'
              }}>
                <span className="tag" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-success)' }}>
                  ✅ Criptografia End-to-End
                </span>
                <span className="tag" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' }}>
                  🛡️ Proteção LGPD
                </span>
                <span className="tag" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                  🔒 Login Seguro
                </span>
              </div>
            </div>
            
            <p style={{ fontSize: '0.8rem', opacity: 0.7, lineHeight: 1.4 }}>
              Apenas usuários autorizados podem acessar o sistema.<br />
              Se você é empresa ou colaborador cadastrado, use suas credenciais de acesso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
