'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import ThemeSelector from '@/src/components/ThemeSelector';

export default function DocumentosPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        console.log('❌ Usuário não logado, redirecionando para auth');
        router.replace('/documentos/auth');
        return;
      }

      setUser(currentUser);

      try {
        // Verificar acesso ao sistema documentos
        const accessCheck = await checkDocumentosAccess(currentUser);

        if (!accessCheck) {
          console.log('❌ Usuário sem acesso ao sistema documentos');
          await auth.signOut();
          router.replace('/documentos/auth');
          return;
        }

        setHasAccess(true);
        console.log('✅ Acesso ao sistema documentos confirmado');
      } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        router.replace('/documentos/auth');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const checkDocumentosAccess = async (user: any): Promise<boolean> => {
    try {
      // 1. Verificar claims do token
      try {
        const tokenResult = await user.getIdTokenResult(true);
        const claims = tokenResult.claims;

        // Super admin sempre tem acesso
        if (claims.role === 'superadmin' || claims.role === 'adminmaster' || claims.bootstrapAdmin) {
          return true;
        }

        // Verificar sistemas ativos nas claims
        if (claims.sistemasAtivos?.includes('documentos') || 
            claims.permissions?.canAccessSystems?.includes('documentos')) {
          return true;
        }
      } catch (claimsError) {
        console.log('⚠️ Erro ao verificar claims:', claimsError);
      }

      // 2. Verificar documento do usuário
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (userData.sistemasAtivos?.includes('documentos') || 
            userData.permissions?.documentos ||
            userData.permissions?.canAccessSystems?.includes('documentos')) {
          return true;
        }
      }

      // 3. Verificar se é empresa com sistema documents ativo
      const empresasQuery = query(collection(db, 'empresas'), where('email', '==', user.email));
      const empresasSnapshot = await getDocs(empresasQuery);

      for (const empresaDoc of empresasSnapshot.docs) {
        const empresaData = empresaDoc.data();
        if (empresaData.ativo && 
            empresaData.sistemasAtivos?.includes('documentos')) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      return false;
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.replace('/sistemas');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
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
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p>Carregando sistema de documentos...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="container" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para acessar o sistema de documentos.</p>
          <Link href="/sistemas" className="button button-primary">
            Voltar aos Sistemas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ minHeight: '100vh', padding: 'var(--gap-xl)' }}>
      <style jsx>{`
        .document-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--gap-lg);
          margin-top: var(--gap-xl);
        }

        .document-card {
          background: var(--gradient-card);
          border: 2px solid var(--color-border);
          border-radius: 16px;
          padding: var(--gap-lg);
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .document-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          border-color: var(--color-primary);
        }
      `}</style>

      {/* Header */}
      <div className="responsive-flex" style={{
        marginBottom: 'var(--gap-lg)',
        padding: 'var(--gap-md)',
        background: 'var(--gradient-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)'
      }}>
        <div className="row" style={{ gap: 'var(--gap-md)' }}>
          <Link href="/sistemas" className="button button-ghost">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Voltar aos Sistemas
          </Link>
          <div className="badge">
            📄 Sistema de Documentos
          </div>
          {user && (
            <div className="badge">
              👤 {user.email?.split('@')[0]}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--gap-sm)' }}>
          <ThemeSelector />
          <button
            onClick={handleSignOut}
            className="button button-ghost"
            style={{ color: 'var(--color-error)' }}
          >
            🚪 Sair
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="card" style={{
        textAlign: 'center',
        marginBottom: 'var(--gap-xl)',
        background: 'var(--gradient-card)',
        border: '2px solid var(--color-primary)',
        borderRadius: '20px',
        padding: 'var(--gap-xl)'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: 'var(--gap-md)' }}>📄</div>
        <h1 style={{ 
          fontSize: 'clamp(2rem, 4vw, 3rem)', 
          marginBottom: 'var(--gap-md)',
          background: 'var(--gradient-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Gerador de Documentos
        </h1>
        <p style={{ 
          fontSize: 'clamp(1rem, 2vw, 1.2rem)', 
          opacity: 0.8,
          marginBottom: 'var(--gap-lg)'
        }}>
          Crie e gerencie documentos empresariais com facilidade
        </p>
        <div className="row center" style={{ gap: 'var(--gap-sm)', flexWrap: 'wrap' }}>
          <span className="tag">📋 Contratos</span>
          <span className="tag">📊 Relatórios</span>
          <span className="tag">📑 Formulários</span>
          <span className="tag">🏷️ Etiquetas</span>
        </div>
      </div>

      {/* Document Types Grid */}
      <div className="document-grid">
        <div className="document-card">
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--gap-md)' }}>📋</div>
          <h3 style={{ marginBottom: 'var(--gap-sm)' }}>Contratos</h3>
          <p style={{ opacity: 0.8, marginBottom: 'var(--gap-md)' }}>
            Gere contratos personalizados com campos automáticos
          </p>
          <button className="button button-primary" style={{ width: '100%' }}>
            Criar Contrato
          </button>
        </div>

        <div className="document-card">
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--gap-md)' }}>📊</div>
          <h3 style={{ marginBottom: 'var(--gap-sm)' }}>Relatórios</h3>
          <p style={{ opacity: 0.8, marginBottom: 'var(--gap-md)' }}>
            Relatórios empresariais e análises personalizadas
          </p>
          <button className="button button-primary" style={{ width: '100%' }}>
            Gerar Relatório
          </button>
        </div>

        <div className="document-card">
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--gap-md)' }}>📑</div>
          <h3 style={{ marginBottom: 'var(--gap-sm)' }}>Formulários</h3>
          <p style={{ opacity: 0.8, marginBottom: 'var(--gap-md)' }}>
            Formulários dinâmicos para coleta de dados
          </p>
          <button className="button button-primary" style={{ width: '100%' }}>
            Criar Formulário
          </button>
        </div>

        <div className="document-card">
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--gap-md)' }}>🏷️</div>
          <h3 style={{ marginBottom: 'var(--gap-sm)' }}>Etiquetas</h3>
          <p style={{ opacity: 0.8, marginBottom: 'var(--gap-md)' }}>
            Etiquetas de endereço e identificação
          </p>
          <button className="button button-primary" style={{ width: '100%' }}>
            Criar Etiquetas
          </button>
        </div>

        <div className="document-card">
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--gap-md)' }}>📄</div>
          <h3 style={{ marginBottom: 'var(--gap-sm)' }}>Templates</h3>
          <p style={{ opacity: 0.8, marginBottom: 'var(--gap-md)' }}>
            Modelos personalizados para sua empresa
          </p>
          <button className="button button-outline" style={{ width: '100%' }}>
            Gerenciar Templates
          </button>
        </div>

        <div className="document-card">
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--gap-md)' }}>📁</div>
          <h3 style={{ marginBottom: 'var(--gap-sm)' }}>Histórico</h3>
          <p style={{ opacity: 0.8, marginBottom: 'var(--gap-md)' }}>
            Documentos gerados anteriormente
          </p>
          <button className="button button-outline" style={{ width: '100%' }}>
            Ver Histórico
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{
        marginTop: 'var(--gap-xl)',
        padding: 'var(--gap-lg)',
        background: 'var(--gradient-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px'
      }}>
        <h3 style={{ marginBottom: 'var(--gap-md)' }}>🚀 Ações Rápidas</h3>
        <div className="row" style={{ gap: 'var(--gap-md)', flexWrap: 'wrap' }}>
          <button className="button button-outline">
            📋 Novo Documento
          </button>
          <button className="button button-outline">
            📂 Abrir Modelo
          </button>
          <button className="button button-outline">
            🔍 Buscar Documento
          </button>
          <button className="button button-outline">
            ⚙️ Configurações
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: 'var(--gap-xl)', 
        opacity: 0.7,
        fontSize: '0.9rem'
      }}>
        <p>
          🔐 Todos os documentos são criptografados e seguem as normas da LGPD
        </p>
      </div>
    </div>
  );
}