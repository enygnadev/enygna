
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function PontoLogin() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !senha) {
      setError('Email e senha são obrigatórios');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Buscar empresa por email nas diferentes coleções
      const collections = ['empresas', 'companies', 'chamados_empresas', 'frota_empresas', 'financeiro_empresas', 'documentos_empresas'];
      let empresaEncontrada = null;
      let sistemaEncontrado = '';

      for (const collectionName of collections) {
        const q = query(
          collection(db, collectionName),
          where('email', '==', email),
          where('senha', '==', senha), // Em produção, use hash da senha
          where('ativo', '==', true)
        );

        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          empresaEncontrada = snapshot.docs[0];
          sistemaEncontrado = collectionName.replace('_empresas', '');
          if (sistemaEncontrado === 'empresas' || sistemaEncontrado === 'companies') sistemaEncontrado = 'ponto';
          break;
        }
      }

      if (empresaEncontrada) {
        // Salvar dados da sessão no localStorage
        const empresaData = {
          id: empresaEncontrada.id,
          ...empresaEncontrada.data(),
          sistema: sistemaEncontrado
        };

        localStorage.setItem('empresaSession', JSON.stringify(empresaData));

        // Redirecionar para o dashboard correspondente
        switch (sistemaEncontrado) {
          case 'chamados':
            router.push('/chamados');
            break;
          case 'frota':
            router.push('/frota');
            break;
          case 'financeiro':
            router.push('/financeiro/empresa');
            break;
          case 'documentos':
            router.push('/documentos');
            break;
          case 'ponto':
            router.push(`/ponto/dashboard?empresaId=${empresaEncontrada.id}`);
            break;
          default:
            router.push('/sistemas');
        }
      } else {
        setError('Email ou senha incorretos, ou empresa inativa');
      }

    } catch (error) {
      console.error('Erro no login:', error);
      setError('Erro interno. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        padding: '3rem',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.2)',
        width: '100%',
        maxWidth: '400px',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
            🕒 Login Ponto
          </h1>
          <p style={{ opacity: 0.8, marginTop: '0.5rem' }}>
            Acesse o sistema de controle de ponto
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '1rem',
            color: '#fca5a5'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'grid', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Email da Empresa
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="empresa@exemplo.com"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '1rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '1rem'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.75rem',
              background: loading ? 'rgba(107, 114, 128, 0.8)' : 'linear-gradient(45deg, #16a34a, #15803d)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
              transition: 'all 0.3s ease'
            }}
          >
            {loading ? '🔄 Entrando...' : '🚀 Entrar'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            💡 <strong>Não tem conta?</strong>
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.25rem' }}>
            Entre em contato com nosso suporte para criar sua conta empresarial
          </div>
          <button
            onClick={() => router.push('/contato')}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid rgba(59, 130, 246, 0.5)',
              borderRadius: '6px',
              color: '#60a5fa',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            📞 Falar com Suporte
          </button>
        </div>
      </div>
    </div>
  );
}
