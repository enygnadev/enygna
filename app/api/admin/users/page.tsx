'use client';
import { useState } from 'react';
import { getIdToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AdminUsers() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [salaryType, setSalaryType] = useState<'hourly'|'monthly'>('hourly');
  const [hourlyRate, setHourlyRate] = useState<number | ''>('');
  const [monthlyBase, setMonthlyBase] = useState<number | ''>('');
  const [monthlyBaseHours, setMonthlyBaseHours] = useState<number | ''>('');
  const [msg, setMsg] = useState<string | null>(null);

  async function createUser() {
    setMsg(null);
    const user = auth.currentUser;
    if (!user) { setMsg('Faça login como admin.'); return; }
    const token = await getIdToken(user, true);
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ email, password, displayName: name, salaryType, hourlyRate: hourlyRate===''?null:hourlyRate, monthlyBase: monthlyBase===''?null:monthlyBase, monthlyBaseHours: monthlyBaseHours===''?null:monthlyBaseHours })
    });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error || 'Erro'); }
    else { setMsg('Usuário criado: ' + data.uid); }
  }

  return (
    <div style={{maxWidth: 640, margin: '0 auto'}}>
      <h1>Colaboradores — Criar</h1>
      <div className="card">
        <label>Nome</label>
        <input value={name} onChange={e=>setName(e.target.value)} />
        <label>Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} />
        <label>Senha provisória</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <label>Tipo de salário</label>
        <select value={salaryType} onChange={e=>setSalaryType(e.target.value as any)}>
          <option value="hourly">Por hora</option>
          <option value="monthly">Mensal</option>
        </select>
        {salaryType==='hourly' ? (
          <>
            <label>Valor hora (R$)</label>
            <input type="number" value={hourlyRate as any} onChange={e=>setHourlyRate(e.target.value===''?'':Number(e.target.value))} />
          </>
        ) : (
          <>
            <label>Salário base mensal (R$)</label>
            <input type="number" value={monthlyBase as any} onChange={e=>setMonthlyBase(e.target.value===''?'':Number(e.target.value))} />
            <label>Carga horária base (h/mês)</label>
            <input type="number" value={monthlyBaseHours as any} onChange={e=>setMonthlyBaseHours(e.target.value===''?'':Number(e.target.value))} />
          </>
        )}
        <button onClick={createUser}>Criar colaborador</button>
        {msg && <p>{msg}</p>}
      </div>
    </div>
  );
}
