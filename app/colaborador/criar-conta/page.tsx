
'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function CriarContaColaborador() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    empresaNome: '',
    cargo: '',
    hourlyRate: '',
    monthlySalary: '',
    salaryType: 'monthly' as 'hourly' | 'monthly'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.displayName) {
      setError('Preencha todos os campos obrigatórios');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }
    
    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // Criar conta no Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      // Atualizar perfil
      if (formData.displayName) {
        await updateProfile(cred.user, { displayName: formData.displayName });
      }

      // Criar documento do usuário
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: formData.email,
        displayName: formData.displayName,
        empresaNome: formData.empresaNome || 'Controle Pessoal',
        cargo: formData.cargo || '',
        role: 'colaborador',
        isPessoal: true, // Flag para indicar que é conta pessoal
        salaryType: formData.salaryType,
        hourlyRate: formData.salaryType === 'hourly' ? Number(formData.hourlyRate) || 0 : 0,
        monthlySalary: formData.salaryType === 'monthly' ? Number(formData.monthlySalary) || 0 : 0,
        monthlyBaseHours: 220,
        toleranceMinutes: 0,
        lunchBreakMinutes: 0,
        lunchThresholdMinutes: 360,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/colaborador/dashboard';
      }, 2000);

    } catch (e: any) {
      console.error('Erro ao criar conta:', e);
      setError(e.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container">
        <div className="card" style={{ marginTop: 32, textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: 16 }}>✅</div>
          <h1 className="h1">Conta criada com sucesso!</h1>
          <p className="h2">Redirecionando para seu dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card" style={{ marginTop: 32 }}>
        <span className="badge">Controle Pessoal</span>
        <h1 className="h1">Criar Conta de Colaborador</h1>
        <p className="h2">Gerencie seu próprio controle de ponto</p>
        
        <form onSubmit={handleSubmit} className="stack" style={{ marginTop: 24 }}>
          <div className="form-group">
            <label>Nome completo *</label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              className="input"
              placeholder="Seu nome completo"
              required
            />
          </div>

          <div className="form-group">
            <label>E-mail *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Senha *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirmar senha *</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input"
              placeholder="Digite a senha novamente"
              required
            />
          </div>

          <div className="form-group">
            <label>Nome da empresa (opcional)</label>
            <input
              type="text"
              name="empresaNome"
              value={formData.empresaNome}
              onChange={handleChange}
              className="input"
              placeholder="Nome da sua empresa"
            />
          </div>

          <div className="form-group">
            <label>Cargo (opcional)</label>
            <input
              type="text"
              name="cargo"
              value={formData.cargo}
              onChange={handleChange}
              className="input"
              placeholder="Seu cargo/função"
            />
          </div>

          <div className="form-group">
            <label>Tipo de salário</label>
            <select
              name="salaryType"
              value={formData.salaryType}
              onChange={handleChange}
              className="input"
            >
              <option value="monthly">Salário mensal</option>
              <option value="hourly">Valor por hora</option>
            </select>
          </div>

          {formData.salaryType === 'hourly' && (
            <div className="form-group">
              <label>Valor por hora (R$)</label>
              <input
                type="number"
                step="0.01"
                name="hourlyRate"
                value={formData.hourlyRate}
                onChange={handleChange}
                className="input"
                placeholder="25.00"
              />
            </div>
          )}

          {formData.salaryType === 'monthly' && (
            <div className="form-group">
              <label>Salário mensal (R$)</label>
              <input
                type="number"
                step="0.01"
                name="monthlySalary"
                value={formData.monthlySalary}
                onChange={handleChange}
                className="input"
                placeholder="2500.00"
              />
            </div>
          )}

          {error && (
            <div style={{ color: '#ff8a8a', fontSize: 14, padding: 12, backgroundColor: '#ffe8e8', borderRadius: 8 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="button button-primary"
            disabled={loading}
            style={{ marginTop: 16 }}
          >
            {loading ? 'Criando conta...' : 'Criar minha conta'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <a href="/criar" className="button button-ghost">
              Já tenho conta - Fazer login
            </a>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Vantagens do controle pessoal:</h3>
        <ul style={{ marginTop: 12, paddingLeft: 20 }}>
          <li>✅ Controle total dos seus registros de ponto</li>
          <li>✅ Relatórios detalhados de horas trabalhadas</li>
          <li>✅ Cálculo automático de ganhos</li>
          <li>✅ Exportação para PDF e Excel</li>
          <li>✅ Registro com localização GPS</li>
          <li>✅ Histórico completo de atividades</li>
        </ul>
      </div>

      <footer style={{ marginTop: 32 }}>
        Sistema de controle de ponto pessoal
      </footer>
    </div>
  );
}
