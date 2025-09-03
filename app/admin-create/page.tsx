
'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import Tutorial from '@/components/Tutorial';
import { homeTutorialSteps } from '@/lib/tutorialSteps';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

async function routeAfterLoginByFirestore() {
  const u = auth.currentUser;
  if (!u) return (window.location.href = '/dashboard');
  const profSnap = await getDoc(doc(db, 'users', u.uid));
  const d = profSnap.exists() ? (profSnap.data() as any) : {};
  const role = d.role;
  const empresaId = d.empresaId;

  if (role === 'superadmin') return (window.location.href = '/admin');
  if ((role === 'admin' || role === 'gestor') && empresaId)
    return (window.location.href = '/empresa/dashboard');
  if (role === 'colaborador' && empresaId)
    return (window.location.href = '/colaborador/dashboard');
  return (window.location.href = '/dashboard');
}

export default function CreateAccount() {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [role, setRole] = useState<'empresa' | 'colaborador' | 'adminmaster'>('empresa');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [empresaIdInput, setEmpresaIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Adicionado para lidar com a criação de Admin Master
  const [displayName, setDisplayName] = useState(''); // Renomeado de 'name' para evitar conflito
  const [message, setMessage] = useState(''); // Para mensagens de status na criação de Admin Master


  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // já logado → roteia por Firestore
        await routeAfterLoginByFirestore();
      }
    });
    return () => unsub();
  }, []);

  async function handleSignup() {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (!isValidEmail(email)) throw new Error('Digite um e-mail válido.');
      if (password.length < 6) throw new Error('Senha mínima de 6 caracteres.');
      if (role === 'colaborador' && !empresaIdInput.trim())
        throw new Error('Informe o ID da sua empresa.');

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });

      let empresaId = '';
      let roleForUser: 'superadmin' | 'admin' | 'gestor' | 'colaborador' = 'colaborador';

      if (role === 'adminmaster') {
        // Admin Master (Super Admin)
        roleForUser = 'superadmin';

        // Perfil de super admin
        await setDoc(
          doc(db, 'users', cred.user.uid),
          {
            email,
            displayName: name || '',
            role: 'superadmin',
            hourlyRate: 0,
            monthlySalary: 0,
            monthlyBaseHours: 220,
            toleranceMinutes: 0,
            lunchBreakMinutes: 0,
            lunchThresholdMinutes: 360,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        setSuccess('Admin Master criado com sucesso!');
      } else if (role === 'empresa') {
        // Empresa nova
        empresaId = cred.user.uid;
        roleForUser = 'admin';

        // empresa
        await setDoc(
          doc(db, 'empresas', empresaId),
          {
            nome: name || email,
            ownerUid: cred.user.uid,
            ownerEmail: email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            ativa: true,
          },
          { merge: true }
        );

        // colaborador (o próprio dono)
        await setDoc(
          doc(db, 'empresas', empresaId, 'colaboradores', cred.user.uid),
          {
            email,
            displayName: name || '',
            role: 'admin',
            effectiveHourlyRate: 0,
            monthlySalary: 0,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Perfil base do usuário (fonte da verdade para role/empresaId)
        await setDoc(
          doc(db, 'users', cred.user.uid),
          {
            email,
            displayName: name || '',
            role: roleForUser,
            empresaId,
            hourlyRate: 0,
            monthlySalary: 0,
            monthlyBaseHours: 220,
            toleranceMinutes: 0,
            lunchBreakMinutes: 0,
            lunchThresholdMinutes: 360,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        // Colaborador de empresa existente
        const emp = await getDoc(doc(db, 'empresas', empresaIdInput));
        if (!emp.exists()) throw new Error('Empresa não encontrada.');
        empresaId = empresaIdInput;
        roleForUser = 'colaborador';

        await setDoc(
          doc(db, 'empresas', empresaId, 'colaboradores', cred.user.uid),
          {
            email,
            displayName: name || '',
            role: roleForUser,
            effectiveHourlyRate: 0,
            monthlySalary: 0,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Perfil base do usuário (fonte da verdade para role/empresaId)
        await setDoc(
          doc(db, 'users', cred.user.uid),
          {
            email,
            displayName: name || '',
            role: roleForUser,
            empresaId,
            hourlyRate: 0,
            monthlySalary: 0,
            monthlyBaseHours: 220,
            toleranceMinutes: 0,
            lunchBreakMinutes: 0,
            lunchThresholdMinutes: 360,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      await routeAfterLoginByFirestore();
    } catch (e: any) {
      setError(e?.message || 'Erro ao cadastrar.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignin() {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      if (!isValidEmail(email)) throw new Error('Digite um e-mail válido.');
      await signInWithEmailAndPassword(auth, email, password);
      await routeAfterLoginByFirestore();
    } catch (e: any) {
      setError(e?.message || 'Erro ao entrar.');
    } finally {
      setLoading(false);
    }
  }

  // Função para criar Admin Master com promoção a SuperAdmin
  async function handleCreateAdminMaster() {
    if (!email.trim() || !password.trim()) {
      setMessage("Email e senha são obrigatórios");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Criar usuário
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
      const user = userCredential.user;

      // Atualizar perfil
      await updateProfile(user, {
        displayName: displayName.trim() || "Admin Master"
      });

      // Marcar como auto-promoção no Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        displayName: displayName.trim() || "Admin Master",
        role: "superadmin",
        createdAt: new Date().toISOString(),
        promotedBy: "auto-promotion-adminmaster",
        isAdminMaster: true
      });

      setMessage("✅ Admin Master criado! Promovendo a Super Admin...");

      // Obter token para fazer a promoção
      const idToken = await user.getIdToken(true);

      // Promover a superadmin via API
      const response = await fetch("/api/admin/promote-superadmin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid: user.uid }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage("✅ Admin Master criado e promovido com sucesso! Redirecionando...");

        // Forçar reload do token para pegar as novas claims
        await user.getIdToken(true);

        // Aguardar um pouco e redirecionar para admin
        setTimeout(() => {
          window.location.href = "/admin";
        }, 2000);
      } else {
        setMessage(`⚠️ Usuário criado, mas erro na promoção: ${result.error}`);
      }

    } catch (error: any) {
      console.error("Erro ao criar Admin Master:", error);
      setMessage(`❌ Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="container">
      <Tutorial 
        steps={homeTutorialSteps}
        tutorialKey="home"
        onComplete={() => console.log('Tutorial home completado')}
        onSkip={() => console.log('Tutorial home pulado')}
      />
      <div className="card" style={{ marginTop: 32 }}>
        <span className="badge">Criar Nova Conta</span>
        <h1 className="h1">Registro de Nova Conta no Sistema</h1>
        <p className="h2">Crie sua empresa, colaborador ou Admin Master</p>

        <div style={{ marginBottom: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
          <a
            href="/"
            className="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              fontSize: 14,
              backgroundColor: '#6b7280'
            }}
          >
            ← Voltar para Login
          </a>
        </div>

        <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => { setRole('empresa'); setMode('signup'); }}
            className={role === 'empresa' ? 'button button-primary' : 'button'}
          >
            Criar Empresa
          </button>
          <button
            onClick={() => { setRole('colaborador'); setMode('signup'); }}
            className={role === 'colaborador' ? 'button button-primary' : 'button'}
          >
            Criar Colaborador
          </button>
          <button
            onClick={() => { setRole('adminmaster'); setMode('signup'); }}
            className={role === 'adminmaster' ? 'button button-primary' : 'button'}
            style={{ backgroundColor: role === 'adminmaster' ? '#dc2626' : '', borderColor: role === 'adminmaster' ? '#b91c1c' : '' }}
          >
            🛡️ Admin Master
          </button>
        </div>

        {mode === 'signup' && role === 'colaborador' && (
          <div className="stack" style={{ marginTop: 8 }}>
            <input
              className="input"
              placeholder="ID da Empresa"
              value={empresaIdInput}
              onChange={(e) => setEmpresaIdInput(e.target.value)}
            />
          </div>
        )}

        {role === 'adminmaster' && (
          <div style={{
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: 8,
            padding: 12,
            marginTop: 8,
            fontSize: 14
          }}>
            ⚠️ <strong>Admin Master:</strong> Acesso total ao sistema. Use apenas para administração do sistema.
          </div>
        )}

        <div className="stack" style={{ marginTop: 12 }}>
          {mode === 'signup' && (
            <input
              className="input"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            className="input"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input"
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {/* Input para displayName ao criar Admin Master */}
          {mode === 'signup' && role === 'adminmaster' && (
            <input
              className="input"
              placeholder="Nome do Admin Master"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
          {error && <div style={{ color: '#ff8a8a', fontSize: 12 }}>{error}</div>}
          {success && <div style={{ color: '#34d399', fontSize: 12 }}>{success}</div>}
          {/* Exibir mensagem de status para criação de Admin Master */}
          {message && (
            <div style={{ color: message.startsWith('✅') ? '#34d399' : message.startsWith('⚠️') ? '#fcd34d' : '#ff8a8a', fontSize: 12 }}>
              {message}
            </div>
          )}
          <div className="row" style={{ gap: 8 }}>
            {mode === 'signup' ? (
              <button className="button button-primary" onClick={role === 'adminmaster' ? handleCreateAdminMaster : handleSignup} disabled={loading}>
                {loading ? 'Criando...' : role === 'adminmaster' ? 'Criar Admin Master' : 'Criar conta e começar'}
              </button>
            ) : (
              <button className="button button-primary" onClick={handleSignin} disabled={loading}>
                {loading ? 'Entrando...' : role === 'adminmaster' ? 'Entrar como Admin Master' : 'Entrar'}
              </button>
            )}
            <button
              className="button button-ghost"
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup');
                setError(null); // Limpa o erro ao mudar o modo
                setSuccess(null); // Limpa o sucesso ao mudar o modo
                setMessage(''); // Limpa a mensagem de status
              }}
            >
              {mode === 'signup' ? 'Já tenho conta' : 'Quero me cadastrar'}
            </button>
          </div>
        </div>
      </div>
      <footer>Implante em minutos na Vercel.</footer>
    </div>
  );
}
