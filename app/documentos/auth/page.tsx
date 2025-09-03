'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/src/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

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

      // Verificar se já existe no documentos_users
      const existingUserRef = doc(db, 'documentos_users', user.uid);
      const existingUserDoc = await getDoc(existingUserRef);

      if (existingUserDoc.exists() && existingUserDoc.data()?.isActive) {
        // Usuário já existe e está ativo - atualizar último login e redirecionar
        await setDoc(existingUserRef, {
          lastLogin: new Date().toISOString()
        }, { merge: true });

        router.push('/documentos');
        return;
      }

      // Verificar se existe na coleção users principal
      const mainUserRef = doc(db, 'users', user.uid);
      const mainUserDoc = await getDoc(mainUserRef);

      if (mainUserDoc.exists()) {
        const userData = mainUserDoc.data();
        // Verificar se tem acesso ao sistema de documentos
        if (userData.permissions?.documentos || userData.sistema === 'documentos' || userData.sistema === 'universal') {
          // Criar ou atualizar entrada no documentos_users
          await setDoc(existingUserRef, {
            uid: user.uid,
            email: user.email,
            nome: userData.displayName || user.displayName || email.split('@')[0],
            role: userData.role || 'colaborador',
            empresaId: userData.empresaId,
            isActive: true,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            sistema: 'documentos',
            permissions: userData.permissions || { documentos: true }
          }, { merge: true });

          router.push('/documentos');
          return;
        }
      }

      // 2. Verificar se é empresa com sistema documentos ativo
      const empresasCollection = collection(db, 'empresas');
      const empresasSnapshot = await getDocs(empresasCollection);

      for (const empresaDoc of empresasSnapshot.docs) {
        const empresaData = empresaDoc.data();
        
        // Verificar se é esta empresa e se tem documentos ativo
        if (empresaData.email === email && 
            empresaData.ativo && 
            empresaData.sistemasAtivos && 
            empresaData.sistemasAtivos.includes('documentos')) {
          
          // É empresa com documentos ativo - criar/atualizar perfil
          await setDoc(doc(db, 'documentos_users', user.uid), {
            uid: user.uid,
            email: user.email,
            nome: empresaData.nome,
            role: 'empresa',
            empresaId: empresaDoc.id,
            isActive: true,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            sistema: 'documentos'
          }, { merge: true });

          console.log('Empresa logada no sistema de documentos:', empresaData.nome);
          router.push('/documentos');
          return;
        }
      }

      // 3. Verificar se é colaborador em alguma empresa com documentos ativo
      const todasEmpresas = await getDocs(collection(db, 'empresas'));
      let colaboradorEmpresaId = null;
      let colaboradorData = null;

      for (const empresaDoc of todasEmpresas.docs) {
        const empresaData = empresaDoc.data();

        // Verificar se a empresa tem documentos ativo
        if (empresaData.ativo && empresaData.sistemasAtivos && empresaData.sistemasAtivos.includes('documentos')) {
          // Verificar se é colaborador nesta empresa
          const colaboradoresRef = collection(db, 'empresas', empresaDoc.id, 'colaboradores');
          const colaboradorQuery = query(colaboradoresRef, where('email', '==', email));
          const colaboradorSnapshot = await getDocs(colaboradorQuery);

          if (!colaboradorSnapshot.empty) {
            colaboradorEmpresaId = empresaDoc.id;
            colaboradorData = colaboradorSnapshot.docs[0].data();
            break;
          }
        }
      }

      if (colaboradorEmpresaId && colaboradorData) {
        // É colaborador - criar/atualizar perfil no documentos_users
        await setDoc(doc(db, 'documentos_users', user.uid), {
          uid: user.uid,
          email: user.email,
          nome: colaboradorData.nome || nome || email.split('@')[0],
          role: 'colaborador',
          empresaId: colaboradorEmpresaId,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }, { merge: true });

        router.push('/documentos');
        return;
      }

      // 4. Se chegou até aqui, não tem acesso ao sistema de documentos
      setError('Este email não tem acesso ao sistema de documentos. Entre em contato com o administrador.');
      await auth.signOut();

    } catch (error: any) {
      console.error('Erro no login:', error);
      if (error.code === 'auth/user-not-found') {
        setError('Usuário não encontrado');
      } else if (error.code === 'auth/wrong-password') {
        setError('Senha incorreta');
      } else if (error.code === 'auth/invalid-email') {
        setError('Email inválido');
      } else if (error.code === 'auth/invalid-credential') {
        setError('Credenciais inválidas');
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
      setError('Preencha todos os campos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verificar se o email já está cadastrado
      const existingUsers = await getDocs(
        query(
          collection(db, 'documentos_users'),
          where('email', '==', email)
        )
      );

      if (!existingUsers.empty) {
        setError('Este email já está cadastrado. Faça login.');
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Criar perfil na coleção 'users'
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: nome,
        role: 'colaborador',
        sistema: 'documentos',
        permissions: {
          documentos: true
        },
        createdAt: new Date().toISOString(),
        empresaId: null // Empresa será definida posteriormente se necessário
      });

      // Buscar empresas que tenham documentos ativo
      const empresasCollection = collection(db, 'empresas');
      const empresasQuery = query(
        empresasCollection,
        where('ativo', '==', true)
      );
      const empresasSnapshot = await getDocs(empresasQuery);

      // Filtrar empresas que têm sistema documentos ativo
      const empresasComDocumentos = empresasSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.sistemasAtivos && data.sistemasAtivos.includes('documentos');
      });

      if (empresasComDocumentos.length === 0) {
        setError('Nenhuma empresa com sistema de documentos encontrada. Entre em contato com o administrador.');
        await auth.signOut();
        return;
      }

      // Por padrão, registrar como colaborador na primeira empresa encontrada
      const primeiraEmpresa = empresasComDocumentos[0];

      // Criar perfil na coleção de documentos
      const userData = {
        uid: user.uid,
        email: user.email,
        nome: nome,
        role: 'colaborador',
        empresaId: primeiraEmpresa.id,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: 'self-registration',
        lastLogin: new Date().toISOString()
      };

      await setDoc(doc(db, 'documentos_users', user.uid), userData);

      // Adicionar como colaborador na empresa
      await setDoc(doc(db, 'empresas', primeiraEmpresa.id, 'colaboradores', user.uid), {
        email: user.email,
        nome: nome,
        role: 'colaborador',
        sistema: 'documentos',
        ativo: true,
        criadoEm: new Date().toISOString()
      });

      // Sucesso - redirecionar
      router.push('/documentos');

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
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <button
                type="button"
                className="button button-ghost"
                onClick={() => setShowForgotPassword(true)}
              >
                Esqueci minha senha
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}