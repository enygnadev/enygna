'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/src/lib/firebase';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function PontoAuthPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Usuário já logado, verificar permissões
        await checkUserPermissions(user.email!, user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  const checkUserPermissions = async (userEmail: string, userUid: string) => {
    try {
      console.log('Verificando permissões para:', userEmail);

      // 1. Primeiro verificar se é superadmin/adminmaster
      const userDocRef = doc(db, 'users', userUid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const role = userData.role?.toLowerCase();

        if (role === 'superadmin' || role === 'adminmaster') {
          console.log('Usuario é super admin, redirecionando para /admin');
          router.push('/admin');
          return;
        }
      }

      // 2. Verificar se é uma empresa na coleção 'empresas' (sistema universal)
      const empresasRef = collection(db, 'empresas');
      const empresaQuery = query(empresasRef, where('email', '==', userEmail));
      const empresaSnapshot = await getDocs(empresaQuery);

      if (!empresaSnapshot.empty) {
        const empresaDoc = empresaSnapshot.docs[0];
        const empresaData = empresaDoc.data();
        const sistemasAtivos = empresaData.sistemasAtivos || [];

        console.log('Empresa encontrada:', empresaDoc.id);
        console.log('Sistemas ativos:', sistemasAtivos);

        // Verificar se a empresa tem acesso ao sistema de ponto
        if (sistemasAtivos.includes('ponto')) {
          console.log('Empresa tem acesso ao sistema de ponto');
          router.push(`/ponto/empresa?empresaId=${empresaDoc.id}`);
          return;
        } else {
          setError('Esta empresa não tem permissão para acessar o sistema de ponto. Entre em contato com o administrador.');
          return;
        }
      }

      // 3. Verificar se é um usuário comum na coleção 'users'
      const usuariosRef = collection(db, 'users');
      const usuarioQuery = query(usuariosRef, where('email', '==', userEmail));
      const usuarioSnapshot = await getDocs(usuarioQuery);

      if (!usuarioSnapshot.empty) {
        const userData = usuarioSnapshot.docs[0].data();
        const role = userData.role?.toLowerCase();
        const empresaId = userData.empresaId;

        console.log('Usuário encontrado com role:', role, 'empresaId:', empresaId);

        // Verificar se tem empresaId e se a empresa tem acesso ao ponto
        if (empresaId) {
          // Verificar empresa em múltiplas coleções
          let empresaData: any = null;
          let empresaEncontrada = false;

          // 1. Primeiro, buscar na coleção específica do ponto
          try {
            const pontoEmpresaDoc = await getDoc(doc(db, 'ponto_empresas', empresaId));
            if (pontoEmpresaDoc.exists()) {
              empresaData = pontoEmpresaDoc.data();
              empresaEncontrada = true;
              console.log('Empresa encontrada em ponto_empresas:', empresaData);
            }
          } catch (error) {
            console.log('Empresa não encontrada em ponto_empresas:', error);
          }

          // 2. Se não encontrou, buscar na coleção geral de empresas
          if (!empresaEncontrada) {
            try {
              const empresaDoc = await getDoc(doc(db, 'empresas', empresaId));
              if (empresaDoc.exists()) {
                const dadosEmpresa = empresaDoc.data();
                console.log('Empresa encontrada em empresas:', dadosEmpresa);

                // Verificar se tem sistema ponto ativo
                if (dadosEmpresa.sistemasAtivos?.includes('ponto')) {
                  empresaData = dadosEmpresa;
                  empresaEncontrada = true;

                  // Migrar dados para ponto_empresas para otimizar futuras consultas
                  try {
                    await setDoc(doc(db, 'ponto_empresas', empresaId), {
                      ...dadosEmpresa,
                      tipo: 'empresa_ponto',
                      migradoEm: serverTimestamp()
                    });
                    console.log('Empresa migrada para ponto_empresas');
                  } catch (migrationError) {
                    console.error('Erro na migração:', migrationError);
                  }
                } else {
                  console.log('Sistema de ponto não ativo para esta empresa:', dadosEmpresa.sistemasAtivos);
                }
              }
            } catch (error) {
              console.error('Erro ao buscar empresa em empresas:', error);
            }
          }

          // 3. Verificar se a empresa foi encontrada
          if (!empresaEncontrada || !empresaData) {
            throw new Error('Empresa não encontrada ou sistema de ponto não está ativo');
          }

          const sistemasAtivos = empresaData.sistemasAtivos || [];

          if (sistemasAtivos.includes('ponto')) {
            // Redirecionar baseado no papel do usuário
            if (role === 'admin' || role === 'gestor') {
              router.push(`/ponto/empresa?empresaId=${empresaId}`);
              return;
            } else if (role === 'colaborador') {
              router.push(`/ponto/colaborador?empresaId=${empresaId}`);
              return;
            }
          }
        }

        // Se chegou até aqui, o usuário não tem acesso ao sistema de ponto
        setError('Você não tem permissão para acessar o sistema de ponto ou sua empresa não possui este módulo ativo.');
        return;
      }

      // 4. Se não encontrou o usuário na coleção 'users', verificar se é uma empresa diretamente
      // Isso acontece quando uma empresa é criada pelo admin mas o usuário não está na coleção 'users'
      const empresaDirectQuery = query(empresasRef, where('email', '==', userEmail));
      const empresaDirectSnapshot = await getDocs(empresaDirectQuery);

      if (!empresaDirectSnapshot.empty) {
        const empresaDoc = empresaDirectSnapshot.docs[0];
        const empresaData = empresaDoc.data();
        const sistemasAtivos = empresaData.sistemasAtivos || [];

        console.log('Empresa encontrada diretamente:', empresaDoc.id);
        console.log('Sistemas ativos:', sistemasAtivos);

        // Verificar se a empresa tem acesso ao sistema de ponto
        if (sistemasAtivos.includes('ponto')) {
          console.log('Empresa tem acesso ao sistema de ponto, criando usuário na coleção users');

          // Criar o documento do usuário na coleção 'users' para futuras consultas
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            email: userEmail,
            displayName: user.displayName || empresaData.nome || userEmail,
            role: 'admin', // Empresa é sempre admin do próprio sistema
            empresaId: empresaDoc.id,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
          }, { merge: true });

          console.log('Documento do usuário criado, redirecionando para dashboard');
          router.push(`/ponto/empresa?empresaId=${empresaDoc.id}`);
          return;
        } else {
          setError('Esta empresa não tem permissão para acessar o sistema de ponto. Entre em contato com o administrador.');
          return;
        }
      }

      // Se nenhuma verificação deu certo
      setError('Usuário não encontrado no sistema. Entre em contato com o administrador para configurar seu acesso.');

    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      setError('Erro ao verificar permissões do usuário. Tente novamente.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Preencha todos os campos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      await checkUserPermissions(userCredential.user.email!, userCredential.user.uid);
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
                Sistema de Ponto
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
                    setError(null);
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
          word-wrap: break-word;
          white-space: pre-wrap;
        }
      `}</style>

      <div className="auth-container">
        <div className="auth-card">
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🕒</div>
            <h1 style={{ color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              Sistema de Ponto
            </h1>
            <p style={{ color: 'var(--color-textSecondary)' }}>
              Controle de jornada e frequência
            </p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleLogin}>
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
              disabled={loading}
              style={{ width: '100%', marginBottom: 'var(--gap-md)' }}
            >
              {loading ? 'Verificando acesso...' : 'Entrar no Sistema'}
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

            {/* Admin controlled access message */}
            <div style={{ textAlign: 'center', paddingTop: 'var(--gap-md)', borderTop: '1px solid var(--color-border)' }}>
              <p style={{ marginBottom: 'var(--gap-md)', fontSize: '0.9rem', opacity: 0.8 }}>
                🔐 Acesso para empresas e colaboradores cadastrados
              </p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                Se você é uma empresa, use o email e senha fornecidos pelo administrador.
                Se você é um colaborador, use suas credenciais de acesso.
              </p>
            </div>

            <div style={{ textAlign: 'center', paddingTop: 'var(--gap-md)', borderTop: '1px solid var(--color-border)' }}>
              <Link href="/sistemas" className="button button-ghost">
                ← Voltar aos Sistemas
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}