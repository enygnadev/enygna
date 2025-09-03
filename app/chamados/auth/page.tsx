
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import { useChamadosSessionProfile } from '@/src/lib/chamadosAuth';
import { ChamadosUserDoc, ChamadosUserRole } from '@/src/types/chamados';

type LoginRole = 'empresa' | 'colaborador' | 'adminmaster';
type AuthMode = 'login' | 'signup';

export default function ChamadosAuthPage() {
  const router = useRouter();
  const { loading, profile } = useChamadosSessionProfile();
  const [activeTab, setActiveTab] = useState<LoginRole>('colaborador');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    departamento: '',
    empresaNome: '',
    empresaIdInput: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (!loading && profile) {
      router.push('/chamados');
    }
  }, [loading, profile, router]);

  const getRoleFromTab = (tab: LoginRole): ChamadosUserRole => {
    switch (tab) {
      case 'empresa':
        return 'admin';
      case 'colaborador':
        return 'colaborador';
      case 'adminmaster':
        return 'adminmaster';
      default:
        return 'colaborador';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (authMode === 'login') {
        // Login
        const userCredential = await signInWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );

        // Verificar se o usuário existe no sistema de chamados
        const userDocRef = doc(db, 'chamados/users', userCredential.user.uid);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
          // Criar perfil básico se não existir
          const role = getRoleFromTab(activeTab);
          await setDoc(userDocRef, {
            email: formData.email,
            displayName: userCredential.user.displayName || formData.displayName || '',
            role: role,
            isActive: true,
            permissions: getDefaultPermissions(role),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as ChamadosUserDoc);
        }

        router.push('/chamados');
      } else {
        // Registro
        if (activeTab === 'colaborador' && formData.empresaIdInput && !formData.empresaIdInput.trim()) {
          setError('ID da empresa é obrigatório para colaboradores');
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );

        // Criar perfil no sistema de chamados
        const role = getRoleFromTab(activeTab);
        const userData: ChamadosUserDoc = {
          email: formData.email,
          displayName: formData.displayName,
          role: role,
          isActive: true,
          permissions: getDefaultPermissions(role),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Adicionar dados específicos por tipo
        if (activeTab === 'empresa') {
          userData.empresaId = userCredential.user.uid; // Empresa usa seu próprio ID
          userData.departamento = 'Administração';
        } else if (activeTab === 'colaborador') {
          userData.empresaId = formData.empresaIdInput;
          userData.departamento = formData.departamento;
        }
        // adminmaster não precisa de empresa

        await setDoc(doc(db, 'chamados/users', userCredential.user.uid), userData);

        // Se é empresa, criar documento da empresa também
        if (activeTab === 'empresa') {
          await setDoc(doc(db, 'chamados/empresas', userCredential.user.uid), {
            nome: formData.empresaNome || formData.displayName,
            ownerUid: userCredential.user.uid,
            ownerEmail: formData.email,
            ativa: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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
          canAssignTickets: true,
          canCloseTickets: true,
          canViewAllTickets: true,
          canManageUsers: true,
          canViewReports: true,
        };
      case 'admin':
        return {
          canCreateTickets: true,
          canAssignTickets: true,
          canCloseTickets: true,
          canViewAllTickets: true,
          canManageUsers: true,
          canViewReports: true,
        };
      default:
        return {
          canCreateTickets: true,
          canAssignTickets: false,
          canCloseTickets: false,
          canViewAllTickets: false,
          canManageUsers: false,
          canViewReports: false,
        };
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      displayName: '',
      departamento: '',
      empresaNome: '',
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
      <div className="container" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--gap-md)' }}>🎫</div>
          <div>Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ minHeight: '100vh', padding: 'var(--gap-xl)' }}>
      <div style={{ 
        maxWidth: '500px', 
        margin: '0 auto',
        paddingTop: 'var(--gap-lg)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--gap-xl)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--gap-md)' }}>🎫</div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>
            Sistema de Chamados
          </h1>
          <p style={{ 
            margin: '8px 0 0 0', 
            color: 'var(--color-text-secondary)',
            fontSize: '0.9rem'
          }}>
            {authMode === 'login' ? 'Entre com sua conta' : 'Crie sua conta'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          marginBottom: 'var(--gap-lg)',
          borderRadius: '12px',
          background: 'var(--color-surface)',
          padding: '4px'
        }}>
          {(['colaborador', 'empresa', 'adminmaster'] as LoginRole[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              style={{
                flex: 1,
                padding: '12px 8px',
                border: 'none',
                borderRadius: '8px',
                background: activeTab === tab ? 'var(--color-primary)' : 'transparent',
                color: activeTab === tab ? 'white' : 'var(--color-text)',
                fontWeight: activeTab === tab ? '600' : '500',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab === 'colaborador' && '👤 Colaborador'}
              {tab === 'empresa' && '🏢 Empresa'}
              {tab === 'adminmaster' && '🛡️ Admin Master'}
            </button>
          ))}
        </div>

        {/* Mode Toggle */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: 'var(--gap-lg)',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => handleModeChange('login')}
            className={authMode === 'login' ? 'button button-primary' : 'button button-ghost'}
            style={{ fontSize: '0.9rem' }}
          >
            Fazer Login
          </button>
          <button
            onClick={() => handleModeChange('signup')}
            className={authMode === 'signup' ? 'button button-primary' : 'button button-ghost'}
            style={{ fontSize: '0.9rem' }}
          >
            Criar Conta
          </button>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 'var(--gap-md)' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 'var(--gap-xs)', 
                fontSize: '0.9rem',
                fontWeight: '600'
              }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="input"
                placeholder="seu@email.com"
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 'var(--gap-md)' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 'var(--gap-xs)', 
                fontSize: '0.9rem',
                fontWeight: '600'
              }}>
                Senha
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="input"
                placeholder="••••••••"
                required
                style={{ width: '100%' }}
              />
            </div>

            {authMode === 'signup' && (
              <>
                <div style={{ marginBottom: 'var(--gap-md)' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 'var(--gap-xs)', 
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}>
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="input"
                    placeholder="Seu nome completo"
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                {activeTab === 'empresa' && (
                  <div style={{ marginBottom: 'var(--gap-md)' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: 'var(--gap-xs)', 
                      fontSize: '0.9rem',
                      fontWeight: '600'
                    }}>
                      Nome da Empresa
                    </label>
                    <input
                      type="text"
                      value={formData.empresaNome}
                      onChange={(e) => setFormData(prev => ({ ...prev, empresaNome: e.target.value }))}
                      className="input"
                      placeholder="Nome da sua empresa"
                      style={{ width: '100%' }}
                    />
                  </div>
                )}

                {activeTab === 'colaborador' && (
                  <>
                    <div style={{ marginBottom: 'var(--gap-md)' }}>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: 'var(--gap-xs)', 
                        fontSize: '0.9rem',
                        fontWeight: '600'
                      }}>
                        ID da Empresa
                      </label>
                      <input
                        type="text"
                        value={formData.empresaIdInput}
                        onChange={(e) => setFormData(prev => ({ ...prev, empresaIdInput: e.target.value }))}
                        className="input"
                        placeholder="ID fornecido pela empresa"
                        required
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div style={{ marginBottom: 'var(--gap-md)' }}>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: 'var(--gap-xs)', 
                        fontSize: '0.9rem',
                        fontWeight: '600'
                      }}>
                        Departamento
                      </label>
                      <input
                        type="text"
                        value={formData.departamento}
                        onChange={(e) => setFormData(prev => ({ ...prev, departamento: e.target.value }))}
                        className="input"
                        placeholder="TI, RH, Vendas, etc."
                        style={{ width: '100%' }}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {error && (
              <div style={{ 
                padding: 'var(--gap-sm)', 
                backgroundColor: 'var(--color-error)', 
                color: 'white', 
                borderRadius: 'var(--radius-md)', 
                marginBottom: 'var(--gap-md)',
                fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="button button-primary"
              style={{ width: '100%', marginBottom: 'var(--gap-md)' }}
            >
              {submitting ? 'Processando...' : (authMode === 'login' ? 'Entrar' : 'Criar Conta')}
            </button>
          </form>
        </div>

        {/* Info Cards */}
        {authMode === 'signup' && (
          <div style={{ marginTop: 'var(--gap-lg)' }}>
            {activeTab === 'colaborador' && (
              <div style={{ 
                padding: 'var(--gap-md)', 
                background: 'var(--color-surface)', 
                borderRadius: 'var(--radius-md)', 
                fontSize: '0.9rem',
                marginBottom: 'var(--gap-md)'
              }}>
                <strong>📋 Colaborador:</strong> Você poderá criar e acompanhar chamados, mas precisará do ID da sua empresa para se conectar ao sistema.
              </div>
            )}

            {activeTab === 'empresa' && (
              <div style={{ 
                padding: 'var(--gap-md)', 
                background: 'var(--color-surface)', 
                borderRadius: 'var(--radius-md)', 
                fontSize: '0.9rem',
                marginBottom: 'var(--gap-md)'
              }}>
                <strong>🏢 Empresa:</strong> Você será o administrador da empresa, poderá gerenciar colaboradores, chamados e ter acesso completo ao sistema.
              </div>
            )}

            {activeTab === 'adminmaster' && (
              <div style={{ 
                padding: 'var(--gap-md)', 
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)', 
                color: 'white',
                borderRadius: 'var(--radius-md)', 
                fontSize: '0.9rem',
                marginBottom: 'var(--gap-md)'
              }}>
                <strong>🛡️ Admin Master:</strong> Acesso total ao sistema, pode gerenciar todas as empresas, usuários e configurações globais.
              </div>
            )}
          </div>
        )}

        {/* Link para voltar ao cartão ponto */}
        <div style={{ textAlign: 'center', marginTop: 'var(--gap-lg)' }}>
          <Link href="/" className="button button-ghost">
            ← Voltar ao Cartão Ponto
          </Link>
        </div>
      </div>
    </div>
  );
}
