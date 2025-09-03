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

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
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
          <p style={{ color: 'var(--color-textSecondary)' }}>
              Acesso somente para usuários autorizados
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

          <button 
            type="submit" 
            className="button button-primary"
            style={{ width: '100%', marginTop: 'var(--gap-lg)' }}
            disabled={loading}
          >
            {loading ? 'Processando...' : 'Entrar'}
          </button>
        </form>

        {/* Links úteis */}
        <div style={{ textAlign: 'center', marginTop: 'var(--gap-md)' }}>
          <Link href="/sistemas" className="button button-ghost">
            ← Voltar aos Sistemas
          </Link>
        </div>

        {/* Footer Message */}
        <div style={{ textAlign: 'center', marginTop: 'var(--gap-lg)' }}>
          <p style={{ marginBottom: 'var(--gap-md)' }}>
                🔐 Acesso controlado pelo Admin Master
              </p>
        </div>
      </div>
    </div>
  );
}