
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import { useAuth, AuthContext, useAuthData } from '@/src/hooks/useAuth';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

// AuthProvider wrapper component
function AuthProvider({ children }: { children: React.ReactNode }) {
  const authData = useAuthData();
  return (
    <AuthContext.Provider value={authData}>
      {children}
    </AuthContext.Provider>
  );
}

type LoginRole = 'colaborador' | 'empresa' | 'admin';
type AuthMode = 'login' | 'register';
type ChamadosUserRole = 'adminmaster' | 'admin' | 'colaborador';

interface ChamadosUserDoc {
  email: string;
  role: ChamadosUserRole;
  empresaId?: string;
  permissions: {
    canCreateTickets: boolean;
    canViewAllTickets: boolean;
    canAssignTickets: boolean;
    canDeleteTickets: boolean;
    canManageUsers: boolean;
  };
  createdAt: Date;
  lastLogin: Date;
}

function ChamadosAdminAuthContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<LoginRole>('colaborador');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    empresaIdInput: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user) {
      router.push('/chamados');
    }
  }, [loading, user, router]);

  const getRoleFromTab = (tab: LoginRole): ChamadosUserRole => {
    switch (tab) {
      case 'empresa':
        return 'admin';
      case 'admin':
        return 'adminmaster';
      case 'colaborador':
      default:
        return 'colaborador';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (authMode === 'login') {
        // Login
        const userCredential = await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        // Verificar se usuário existe na coleção chamados_users
        const userDoc = doc(db, 'chamados_users', userCredential.user.uid);
        
        // Se não existir, criar com role baseado na aba ativa
        if (userCredential.user) {
          const role = getRoleFromTab(activeTab);
          await setDoc(userDoc, {
            email: formData.email,
            role,
            permissions: getDefaultPermissions(role),
            createdAt: new Date(),
            lastLogin: new Date(),
            ...(activeTab === 'colaborador' && formData.empresaIdInput ? 
              { empresaId: formData.empresaIdInput } : {})
          } as ChamadosUserDoc);
        }

        router.push('/chamados');
      } else {
        // Registro
        if (activeTab === 'colaborador' && formData.empresaIdInput && !formData.empresaIdInput.trim()) {
          setError('ID da empresa é obrigatório para colaboradores');
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          setError('As senhas não coincidem');
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        const role = getRoleFromTab(activeTab);
        const userData: ChamadosUserDoc = {
          email: formData.email,
          role,
          permissions: getDefaultPermissions(role),
          createdAt: new Date(),
          lastLogin: new Date()
        };

        // Definir empresaId baseado no tipo
        if (activeTab === 'empresa') {
          userData.empresaId = userCredential.user.uid; // Empresa usa seu próprio ID
        } else if (activeTab === 'colaborador') {
          userData.empresaId = formData.empresaIdInput;
        }

        // Salvar na coleção chamados_users
        await setDoc(doc(db, 'chamados_users', userCredential.user.uid), userData);

        // Se for empresa, criar documento na coleção chamados_empresas
        if (activeTab === 'empresa') {
          await setDoc(doc(collection(db, 'chamados_empresas'), userCredential.user.uid), {
            nome: formData.email.split('@')[0], // Nome baseado no email por enquanto
            email: formData.email,
            adminId: userCredential.user.uid,
            createdAt: new Date()
          });
        }

        router.push('/chamados');
      }
    } catch (error: any) {
      console.error('Erro na autenticação:', error);
      setError(error.message || 'Erro na autenticação');
    } finally {
      setSubmitting(false);
    }
  };

  const getDefaultPermissions = (role: ChamadosUserRole) => {
    switch (role) {
      case 'adminmaster':
        return {
          canCreateTickets: true,
          canViewAllTickets: true,
          canAssignTickets: true,
          canDeleteTickets: true,
          canManageUsers: true
        };
      case 'admin':
        return {
          canCreateTickets: true,
          canViewAllTickets: true,
          canAssignTickets: true,
          canDeleteTickets: false,
          canManageUsers: false
        };
      case 'colaborador':
      default:
        return {
          canCreateTickets: true,
          canViewAllTickets: false,
          canAssignTickets: false,
          canDeleteTickets: false,
          canManageUsers: false
        };
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      empresaIdInput: ''
    });
    setError('');
  };

  const handleTabChange = (tab: LoginRole) => {
    setActiveTab(tab);
    resetForm();
  };

  const handleModeChange = (mode: AuthMode) => {
    setAuthMode(mode);
    resetForm();
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Carregando...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        padding: '40px',
        width: '100%',
        maxWidth: '500px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ 
            color: '#333', 
            fontSize: '28px', 
            fontWeight: 'bold',
            marginBottom: '10px'
          }}>
            🎫 Sistema de Chamados
          </h1>
          <p style={{ color: '#666', fontSize: '16px' }}>
            {authMode === 'login' ? 'Faça login para continuar' : 'Crie sua conta'}
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div style={{
          display: 'flex',
          background: '#f8f9fa',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '30px'
        }}>
          <button
            type="button"
            onClick={() => handleModeChange('login')}
            style={{
              flex: 1,
              padding: '12px',
              background: authMode === 'login' ? 'white' : 'transparent',
              color: authMode === 'login' ? '#333' : '#666',
              border: 'none',
              borderRadius: '8px',
              fontWeight: authMode === 'login' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: authMode === 'login' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('register')}
            style={{
              flex: 1,
              padding: '12px',
              background: authMode === 'register' ? 'white' : 'transparent',
              color: authMode === 'register' ? '#333' : '#666',
              border: 'none',
              borderRadius: '8px',
              fontWeight: authMode === 'register' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: authMode === 'register' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Registrar
          </button>
        </div>

        {/* Role Tabs */}
        <div style={{
          display: 'flex',
          marginBottom: '30px',
          borderBottom: '1px solid #eee'
        }}>
          {(['colaborador', 'empresa', 'admin'] as LoginRole[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #667eea' : '3px solid transparent',
                color: activeTab === tab ? '#667eea' : '#666',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '14px',
                textTransform: 'capitalize'
              }}
            >
              {tab === 'colaborador' ? '👨‍💼 Colaborador' : 
               tab === 'empresa' ? '🏢 Empresa' : '👑 Admin'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Email */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#333',
              fontWeight: '500',
              fontSize: '14px'
            }}>
              📧 Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '2px solid #e1e5e9',
                borderRadius: '12px',
                fontSize: '16px',
                transition: 'border-color 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
              placeholder="Digite seu email"
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#333',
              fontWeight: '500',
              fontSize: '14px'
            }}>
              🔒 Senha
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '2px solid #e1e5e9',
                borderRadius: '12px',
                fontSize: '16px',
                transition: 'border-color 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
              placeholder="Digite sua senha"
            />
          </div>

          {/* Confirm Password (only for register) */}
          {authMode === 'register' && (
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#333',
                fontWeight: '500',
                fontSize: '14px'
              }}>
                🔒 Confirmar Senha
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '12px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
                placeholder="Confirme sua senha"
              />
            </div>
          )}

          {/* Empresa ID (only for colaborador) */}
          {activeTab === 'colaborador' && (
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#333',
                fontWeight: '500',
                fontSize: '14px'
              }}>
                🏢 ID da Empresa
              </label>
              <input
                type="text"
                value={formData.empresaIdInput}
                onChange={(e) => setFormData({ ...formData, empresaIdInput: e.target.value })}
                required={activeTab === 'colaborador'}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '12px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
                placeholder="Digite o ID da empresa"
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              border: '1px solid #fecaca'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '16px',
              background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              transform: submitting ? 'scale(0.98)' : 'scale(1)'
            }}
          >
            {submitting ? 
              '⏳ Processando...' : 
              authMode === 'login' ? '🚀 Entrar' : '✨ Criar Conta'
            }
          </button>
        </form>

        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid #eee'
        }}>
          <button
            type="button"
            onClick={() => router.push('/')}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            ← Voltar ao início
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChamadosAdminAuth() {
  return (
    <AuthProvider>
      <ChamadosAdminAuthContent />
    </AuthProvider>
  );
}
