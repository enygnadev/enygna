'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function BootstrapAdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreateBootstrapAdmin = async () => {
    if (!email || !password || !name) {
      setError('Todos os campos são obrigatórios.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Atualizar profile
      await updateProfile(newUser, {
        displayName: name
      });

      // Criar documento no Firestore com role superadmin
      // Este documento será criado sem validação de regras pois é bootstrap
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: email,
        displayName: name,
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
        email: email,
        displayName: name,
        createdAt: serverTimestamp(),
        bootstrapped: true
      });

      setSuccess(`✅ Admin Master "${name}" criado com sucesso!
📧 Email: ${email}
🔑 UID: ${newUser.uid}

🚨 IMPORTANTE: Agora delete esta página (/bootstrap-admin) por segurança!
Você pode acessar o painel admin em /admin`);

      setEmail('');
      setPassword('');
      setName('');

    } catch (error: any) {
      console.error('Erro ao criar bootstrap admin:', error);

      if (error.code === 'auth/email-already-in-use') {
        setError('❌ Este email já está em uso. Escolha outro email.');
      } else if (error.code === 'auth/invalid-email') {
        setError('❌ Email inválido. Verifique o formato do email.');
      } else if (error.code === 'auth/weak-password') {
        setError('❌ Senha muito fraca. Use uma senha mais forte.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('❌ Criação de contas desabilitada. Contate o desenvolvedor.');
      } else {
        setError(`❌ Erro: ${error.message || 'Falha desconhecida'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 25%, #6d28d9 50%, #5b21b6 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'white',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(139,92,246,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(124,58,237,0.3) 0%, transparent 50%)',
        animation: 'pulse 4s ease-in-out infinite alternate'
      }}></div>

      <div style={{
        textAlign: 'center',
        padding: '4rem',
        background: 'rgba(0,0,0,0.4)',
        borderRadius: '32px',
        backdropFilter: 'blur(20px)',
        border: '2px solid rgba(255,255,255,0.1)',
        maxWidth: '600px',
        position: 'relative',
        zIndex: 10,
        boxShadow: '0 30px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
      }}>
        <div style={{
          fontSize: '5rem',
          marginBottom: '2rem',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
        }}>👑</div>

        <h1 style={{
          fontSize: '3rem',
          fontWeight: '900',
          marginBottom: '1.5rem',
          background: 'linear-gradient(45deg, #ffffff, #e0e7ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
        }}>
          BOOTSTRAP ADMIN MASTER
        </h1>

        <div style={{
          background: 'rgba(139,92,246,0.2)',
          border: '2px solid rgba(139,92,246,0.4)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <p style={{
            opacity: 0.95,
            marginBottom: '1rem',
            fontSize: '1.3rem',
            fontWeight: '600'
          }}>
            🚨 PÁGINA TEMPORÁRIA DE INICIALIZAÇÃO
          </p>
          <p style={{ opacity: 0.9, fontSize: '1.1rem' }}>
            Esta página permite criar o <strong>primeiro Admin Master</strong> do sistema.
            <br />
            <strong>⚠️ DELETE esta página após criar o admin!</strong>
          </p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: '700',
            marginBottom: '2rem',
            color: '#ffffff'
          }}>
            🔐 Criar Admin Master
          </h2>

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
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            {error && (
              <div style={{
                padding: '1rem',
                background: 'rgba(239,68,68,0.2)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '8px',
                color: '#fca5a5',
                fontSize: '0.9rem',
                whiteSpace: 'pre-line'
              }}>
                {error}
              </div>
            )}

            {success && (
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
                {success}
              </div>
            )}

            {success && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => window.location.href = '/admin'}
                  style={{
                    padding: '1rem 2rem',
                    background: 'linear-gradient(45deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '700',
                    transition: 'all 0.3s ease'
                  }}
                >
                  🚀 Ir para Painel Admin
                </button>
              </div>
            )}

            <button
              onClick={handleCreateBootstrapAdmin}
              disabled={loading || !email || !password || !name}
              style={{
                padding: '1rem 2rem',
                background: loading ? 'rgba(139,92,246,0.5)' : 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '700',
                transition: 'all 0.3s ease',
                opacity: (!email || !password || !name) ? 0.5 : 1
              }}
            >
              {loading ? '🔄 Criando Admin Master...' : '👑 Criar Admin Master'}
            </button>
          </div>
        </div>

        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '2px solid rgba(239,68,68,0.3)',
          borderRadius: '16px',
          padding: '1.5rem'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#fca5a5', fontSize: '1.2rem' }}>
            ⚠️ INSTRUÇÕES IMPORTANTES:
          </h3>
          <ul style={{
            textAlign: 'left',
            margin: 0,
            padding: '0 0 0 1.5rem',
            color: 'rgba(255,255,255,0.9)',
            lineHeight: '1.6'
          }}>
            <li>Esta é uma página <strong>TEMPORÁRIA</strong> para bootstrap</li>
            <li>Após criar o admin, <strong>DELETE</strong> esta página</li>
            <li>O admin criado terá acesso total ao sistema</li>
            <li>Acesse o painel admin em <code>/admin</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}