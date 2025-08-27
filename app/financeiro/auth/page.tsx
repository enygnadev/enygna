'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ThemeSelector from '@/src/components/ThemeSelector';

type UserType = 'colaborador' | 'empresa' | 'cliente' | 'contador';

interface AuthFormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  userType: UserType;
  cnpj?: string;
  cpf?: string;
  crc?: string; // Registro do contador
  razaoSocial?: string;
  nomeFantasia?: string;
}

export default function FinanceiroAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const [formData, setFormData] = useState<AuthFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    userType: 'colaborador'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password) {
      setError('Email e senha são obrigatórios');
      return false;
    }

    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        setError('Senhas não conferem');
        return false;
      }

      if (!formData.displayName) {
        setError('Nome é obrigatório');
        return false;
      }

      if (formData.userType === 'empresa' && !formData.cnpj) {
        setError('CNPJ é obrigatório para empresas');
        return false;
      }

      if (formData.userType === 'contador' && !formData.crc) {
        setError('CRC é obrigatório para contadores');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        const userDoc = await getDoc(doc(db, 'financeiro_users', userCredential.user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Redirecionar baseado no tipo de usuário
          switch (userData.userType) {
            case 'empresa':
              router.push('/financeiro/empresa');
              break;
            case 'colaborador':
              router.push('/financeiro/colaborador');
              break;
            case 'cliente':
              router.push('/financeiro/cliente');
              break;
            case 'contador':
              router.push('/financeiro/contador');
              break;
            default:
              router.push('/financeiro/dashboard');
          }
        } else {
          setError('Usuário não encontrado no sistema financeiro');
        }
      } else {
        // Registro
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

        // Salvar dados do usuário
        await setDoc(doc(db, 'financeiro_users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: formData.email,
          displayName: formData.displayName,
          userType: formData.userType,
          cnpj: formData.cnpj || null,
          cpf: formData.cpf || null,
          crc: formData.crc || null,
          razaoSocial: formData.razaoSocial || null,
          nomeFantasia: formData.nomeFantasia || null,
          createdAt: new Date().toISOString(),
          isActive: true,
          permissions: getDefaultPermissions(formData.userType)
        });

        setSuccess('Conta criada com sucesso! Você será redirecionado...');
        setTimeout(() => {
          router.push(`/financeiro/${formData.userType}`);
        }, 2000);
      }
    } catch (error: any) {
      setError(error.message || 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPermissions = (userType: UserType) => {
    const permissions = {
      colaborador: ['view_own_documents', 'create_receipts'],
      empresa: ['manage_employees', 'view_reports', 'export_data', 'ocr_processing'],
      cliente: ['view_invoices', 'download_documents'],
      contador: ['full_access', 'audit_trail', 'tax_calculations', 'compliance_reports']
    };
    return permissions[userType] || [];
  };

  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style jsx>{`
        .auth-container {
          max-width: 500px;
          width: 100%;
          margin: 0 auto;
          padding: var(--gap-xl);
          background: var(--gradient-surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-xl);
        }

        .user-type-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--gap-sm);
          margin: var(--gap-md) 0;
        }

        .user-type-option {
          padding: var(--gap-md);
          border: 2px solid var(--color-border);
          border-radius: var(--radius);
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;
          background: var(--color-surface);
        }

        .user-type-option:hover {
          border-color: var(--color-primary);
          transform: translateY(-2px);
        }

        .user-type-option.selected {
          border-color: var(--color-primary);
          background: var(--color-primary)10;
        }

        .form-section {
          margin: var(--gap-lg) 0;
          padding: var(--gap-md);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          background: var(--color-surface)50;
        }

        .permissions-list {
          list-style: none;
          padding: 0;
          margin: var(--gap-sm) 0;
        }

        .permissions-list li {
          padding: var(--gap-xs);
          margin: var(--gap-xs) 0;
          background: var(--color-success)10;
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          color: var(--color-success);
        }

        .auth-toggle {
          text-align: center;
          margin-top: var(--gap-lg);
          padding-top: var(--gap-lg);
          border-top: 1px solid var(--color-border);
        }

        .theme-selector-wrapper {
          position: absolute;
          top: var(--gap-md);
          right: var(--gap-md);
        }
      `}</style>

      <div className="theme-selector-wrapper">
        <ThemeSelector size="small" showLabels={false} />
      </div>

      <div className="auth-container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--gap-xl)' }}>
          <h1 className="h1" style={{ marginBottom: 'var(--gap-sm)' }}>
            💰 Sistema Financeiro
          </h1>
          <p className="text-muted">
            {isLogin ? 'Entre na sua conta' : 'Crie sua conta'}
          </p>
        </div>

        {/* Mensagens */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--gap-md)' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ marginBottom: 'var(--gap-md)' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Tipo de Usuário (apenas no registro) */}
          {!isLogin && (
            <div className="form-section">
              <label className="label">Tipo de Conta</label>
              <div className="user-type-grid">
                {[
                  { type: 'colaborador', icon: '👤', label: 'Colaborador' },
                  { type: 'empresa', icon: '🏢', label: 'Empresa' },
                  { type: 'cliente', icon: '🤝', label: 'Cliente' },
                  { type: 'contador', icon: '🧮', label: 'Contador' }
                ].map(({ type, icon, label }) => (
                  <div
                    key={type}
                    className={`user-type-option ${formData.userType === type ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, userType: type as UserType }))}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: 'var(--gap-xs)' }}>{icon}</div>
                    <div style={{ fontWeight: '600' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Permissões do tipo selecionado */}
              <div style={{ marginTop: 'var(--gap-md)' }}>
                <label className="label">Permissões incluídas:</label>
                <ul className="permissions-list">
                  {getDefaultPermissions(formData.userType).map((permission, index) => (
                    <li key={index}>✓ {permission.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Campos básicos */}
          <div className="form-group">
            <label className="label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="input"
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Senha</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="input"
              required
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label className="label">Confirmar Senha</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Nome Completo</label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>

              {/* Campos específicos por tipo */}
              {formData.userType === 'empresa' && (
                <div className="form-section">
                  <h4>Dados da Empresa</h4>
                  <div className="form-group">
                    <label className="label">CNPJ</label>
                    <input
                      type="text"
                      name="cnpj"
                      value={formData.cnpj || ''}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="00.000.000/0000-00"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Razão Social</label>
                    <input
                      type="text"
                      name="razaoSocial"
                      value={formData.razaoSocial || ''}
                      onChange={handleInputChange}
                      className="input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Nome Fantasia</label>
                    <input
                      type="text"
                      name="nomeFantasia"
                      value={formData.nomeFantasia || ''}
                      onChange={handleInputChange}
                      className="input"
                    />
                  </div>
                </div>
              )}

              {formData.userType === 'contador' && (
                <div className="form-section">
                  <h4>Dados Profissionais</h4>
                  <div className="form-group">
                    <label className="label">CRC (Registro no CRC)</label>
                    <input
                      type="text"
                      name="crc"
                      value={formData.crc || ''}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="CRC/UF 000000"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">CPF</label>
                    <input
                      type="text"
                      name="cpf"
                      value={formData.cpf || ''}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <button 
            type="submit" 
            className="button button-primary"
            style={{ width: '100%', marginTop: 'var(--gap-lg)' }}
            disabled={loading}
          >
            {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
          </button>
        </form>

        {/* Toggle entre login/registro */}
        <div className="auth-toggle">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="button button-ghost"
          >
            {isLogin ? 'Não tem conta? Criar agora' : 'Já tem conta? Fazer login'}
          </button>
        </div>

        {/* Links úteis */}
        <div style={{ textAlign: 'center', marginTop: 'var(--gap-md)' }}>
          <Link href="/sistemas" className="button button-ghost">
            ← Voltar aos Sistemas
          </Link>
        </div>
      </div>
    </div>
  );
}