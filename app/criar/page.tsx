'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function Landing() {
  const [mode, setMode] = useState<'signin'|'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup() {
    try {
      setLoading(true); setError(null);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db, 'users', cred.user.uid), {
        email,
        displayName: name || '',
        hourlyRate: 0,
        monthlySalary: 0,
        monthlyBaseHours: 220,
        toleranceMinutes: 0,
        lunchBreakMinutes: 0,
        lunchThresholdMinutes: 360, // 6h
        isAdmin: false,
        createdAt: new Date().toISOString(),
      });
      window.location.href = '/dashboard';
    } catch (e:any) {
      setError(e.message || 'Erro ao cadastrar');
    } finally { setLoading(false); }
  }

  async function handleSignin() {
    try {
      setLoading(true); setError(null);
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = '/dashboard';
    } catch (e:any) {
      setError(e.message || 'Erro ao entrar');
    } finally { setLoading(false); }
  }

  return (
    <div className="container">
      <div className="card" style={{marginTop: 32}}>
        <span className="badge">Cartão Ponto Web</span>
        <h1 className="h1">Registro de Ponto com Aprovação & Fechamento</h1>
        <p className="h2">Email/Senha · GPS · Mapas · Admin · Holerite PDF.</p>
        <div className="stack" style={{marginTop: 12}}>
          {mode === 'signup' && (
            <input className="input" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} />
          )}
          <input className="input" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="input" placeholder="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div style={{color:'#ff8a8a', fontSize:12}}>{error}</div>}
          <div className="row">
            {mode==='signup' ? (
              <button className="button button-primary" onClick={handleSignup} disabled={loading}>
                {loading ? 'Criando...' : 'Criar conta e começar'}
              </button>
            ) : (
              <button className="button button-primary" onClick={handleSignin} disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            )}
            <button className="button button-ghost" onClick={()=>setMode(mode==='signup'?'signin':'signup')}>
              {mode==='signup' ? 'Já tenho conta' : 'Quero me cadastrar'}
            </button>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: 24, padding: 16, backgroundColor: 'var(--color-surface)', borderRadius: 12 }}>
            <h3 style={{ marginBottom: 8 }}>👤 Colaborador Individual?</h3>
            <p style={{ fontSize: 14, marginBottom: 12, opacity: 0.8 }}>
              Crie sua conta pessoal para controle individual de ponto
            </p>
            <a href="/colaborador/criar-conta" className="button button-outline">
              Criar conta pessoal
            </a>
          </div>
        </div>
      </div>
      <footer>Implante em minutos na Vercel.</footer>
    </div>
  );
}
