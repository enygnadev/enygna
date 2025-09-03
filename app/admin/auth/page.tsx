
'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function AdminAuthPage() {
  const router = useRouter();
  
  // Estados para login
  const [email, setEmail] = useState('enygna@enygna.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para criar super admin
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createName, setCreateName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  useEffect(() => {
    // Se já estiver logado, redirecionar para admin
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/admin');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleAdminLogin = async () => {
    if (!email || !password) {
      setError('Email e senha são obrigatórios.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // O useEffect acima irá redirecionar automaticamente
    } catch (error: any) {
      console.error('Erro no login:', error);
      if (error.code === 'auth/user-not-found') {
        setError('Usuário não encontrado.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Senha incorreta.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else if (error.code === 'auth/invalid-credential') {
        setError('Credenciais inválidas.');
      } else {
        setError('Erro no login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuperAdmin = async () => {
    if (!createEmail || !createPassword || !createName) {
      setCreateError('Todos os campos são obrigatórios.');
      return;
    }

    if (createPassword.length < 6) {
      setCreateError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setCreateLoading(true);
    setCreateError('');
    setCreateSuccess('');

    try {
      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, createEmail, createPassword);
      const newUser = userCredential.user;

      // Atualizar profile
      await updateProfile(newUser, {
        displayName: createName
      });

      // Criar documento no Firestore com role superadmin
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: createEmail,
        displayName: createName,
        role: 'superadmin',
        createdAt: serverTimestamp(),
        createdBy: 'bootstrap',
        isActive: true,
        permissions: ['all'],
        lastLogin: null,
        bootstrapAdmin: true,
        masterAccess: true,
        systemOwner: true,
        totalControl: true
      });

      // Criar documento adicional para bypass das regras
      await setDoc(doc(db, 'bootstrap_admins', newUser.uid), {
        uid: newUser.uid,
        email: createEmail,
        displayName: createName,
        createdAt: serverTimestamp(),
        bootstrapped: true
      });

      // Log da ação crítica
      await addDoc(collection(db, 'admin_actions'), {
        adminId: newUser.uid,
        action: 'super_admin_created',
        targetEmail: createEmail,
        targetUid: newUser.uid,
        timestamp: serverTimestamp(),
        severity: 'critical',
        details: {
          createdUserName: createName,
          createdUserEmail: createEmail
        }
      });

      setCreateSuccess(`✅ Super Administrador "${createName}" criado com sucesso!\n📧 Email: ${createEmail}\n🔑 UID: ${newUser.uid}\n\nVocê pode fazer login agora.`);
      setCreateEmail('');
      setCreatePassword('');
      setCreateName('');

    } catch (error: any) {
      console.error('Erro ao criar super admin:', error);

      if (error.code === 'auth/email-already-in-use') {
        setCreateError('❌ Este email já está em uso. Escolha outro email.');
      } else if (error.code === 'auth/invalid-email') {
        setCreateError('❌ Email inválido. Verifique o formato do email.');
      } else if (error.code === 'auth/weak-password') {
        setCreateError('❌ Senha muito fraca. Use uma senha mais forte.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setCreateError('❌ Criação de contas desabilitada. Contate o desenvolvedor.');
      } else {
        setCreateError(`❌ Erro: ${error.message || 'Falha desconhecida'}`);
      }
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0b3c 0%, #1e1b4b 15%, #3730a3 30%, #4338ca 45%, #4f46e5 60%, #6366f1 75%, #8b5cf6 90%, #a855f7 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'white',
      position: 'relative',
      padding: '2rem'
    }}>
      {/* Elementos decorativos */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '10%',
        width: '200px',
        height: '200px',
        background: 'linear-gradient(45deg, #8b5cf6, #06b6d4)',
        borderRadius: '50%',
        opacity: 0.1,
        animation: 'float 6s ease-in-out infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '15%',
        width: '150px',
        height: '150px',
        background: 'linear-gradient(45deg, #f59e0b, #ef4444)',
        borderRadius: '50%',
        opacity: 0.1,
        animation: 'float 8s ease-in-out infinite reverse'
      }}></div>

      {/* Card principal */}
      <div style={{
        textAlign: 'center',
        padding: '3rem',
        background: 'rgba(0,0,0,0.4)',
        borderRadius: '32px',
        backdropFilter: 'blur(20px)',
        border: '2px solid rgba(255,255,255,0.1)',
        maxWidth: '600px',
        width: '100%',
        position: 'relative',
        zIndex: 10,
        boxShadow: '0 30px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1.5rem',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
        }}>
          👑
        </div>

        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '900',
          marginBottom: '1rem',
          background: 'linear-gradient(45deg, #ffffff, #e0e7ff, #c7d2fe)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
        }}>
          PAINEL MASTER ADMIN
        </h1>

        <p style={{
          opacity: 0.9,
          fontSize: '1.2rem',
          fontWeight: '500',
          marginBottom: '2rem'
        }}>
          {showCreateForm ? 'Criar Super Administrador' : 'Entre com suas credenciais de administrador'}
        </p>

        {!showCreateForm ? (
          // Formulário de login
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            textAlign: 'left'
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)'
              }}>
                📧 Email de Administrador:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@exemplo.com"
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  backdropFilter: 'blur(10px)'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)'
              }}>
                🔑 Senha:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAdminLogin();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  backdropFilter: 'blur(10px)'
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '1rem',
                background: 'rgba(239,68,68,0.2)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '8px',
                color: '#fca5a5',
                fontSize: '0.9rem'
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleAdminLogin}
              disabled={loading || !email || !password}
              style={{
                padding: '1.2rem 2rem',
                background: loading
                  ? 'rgba(59,130,246,0.5)'
                  : 'linear-gradient(45deg, #3b82f6, #1e40af)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1.1rem',
                fontWeight: '700',
                transition: 'all 0.3s ease',
                opacity: (!email || !password) ? 0.5 : 1,
                boxShadow: '0 4px 15px rgba(59,130,246,0.4)'
              }}
            >
              {loading ? '🔄 Entrando...' : '🚀 Entrar como Admin'}
            </button>

            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              marginTop: '1rem'
            }}>
              <button
                onClick={() => router.push('/')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
              >
                🏠 Voltar ao Início
              </button>

              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(45deg, #fbbf24, #f59e0b)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(245,158,11,0.4)'
                }}
              >
                👑 Criar Super Admin
              </button>
            </div>
          </div>
        ) : (
          // Formulário de criação de super admin
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            textAlign: 'left'
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)'
              }}>
                👤 Nome Completo:
              </label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ex: João Silva"
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  backdropFilter: 'blur(10px)'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)'
              }}>
                📧 Email:
              </label>
              <input
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="admin@empresa.com"
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  backdropFilter: 'blur(10px)'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)'
              }}>
                🔑 Senha:
              </label>
              <input
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  backdropFilter: 'blur(10px)'
                }}
              />
            </div>

            {createError && (
              <div style={{
                padding: '1rem',
                background: 'rgba(239,68,68,0.2)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '8px',
                color: '#fca5a5',
                fontSize: '0.9rem',
                whiteSpace: 'pre-line'
              }}>
                {createError}
              </div>
            )}

            {createSuccess && (
              <div style={{
                padding: '1rem',
                background: 'rgba(16,185,129,0.2)',
                border: '1px solid rgba(16,185,129,0.4)',
                borderRadius: '8px',
                color: '#6ee7b7',
                fontSize: '0.9rem',
                whiteSpace: 'pre-line',
                marginBottom: '1rem'
              }}>
                {createSuccess}
              </div>
            )}

            <button
              onClick={handleCreateSuperAdmin}
              disabled={createLoading || !createEmail || !createPassword || !createName}
              style={{
                padding: '1rem 2rem',
                background: createLoading ? 'rgba(139,92,246,0.5)' : 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: createLoading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '700',
                transition: 'all 0.3s ease',
                opacity: (!createEmail || !createPassword || !createName) ? 0.5 : 1
              }}
            >
              {createLoading ? '🔄 Criando Super Admin...' : '👑 Criar Super Admin'}
            </button>

            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              marginTop: '1rem'
            }}>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateError('');
                  setCreateSuccess('');
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
              >
                ← Voltar ao Login
              </button>

              <button
                onClick={() => router.push('/')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
              >
                🏠 Voltar ao Início
              </button>
            </div>
          </div>
        )}

        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: '12px',
          fontSize: '0.9rem'
        }}>
          <p style={{ margin: 0, opacity: 0.9 }}>
            💡 <strong>Primeira vez?</strong> Use "Criar Super Admin" para configurar sua conta de administrador
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
      `}</style>
    </div>
  );
}
