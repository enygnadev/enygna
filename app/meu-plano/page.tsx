
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import PlanControlPanel from '@/src/components/PlanControlPanel';
import ThemeSelector from '@/components/ThemeSelector';

export default function MeuPlanoPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading]);

  if (loading || authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--color-background) 0%, var(--color-surface) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '3rem',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <h2 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>
            Carregando...
          </h2>
          <p style={{ color: 'var(--color-textSecondary)' }}>
            Verificando informações do seu plano
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--color-background) 0%, var(--color-surface) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '3rem',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>
            Acesso Restrito
          </h2>
          <p style={{ color: 'var(--color-textSecondary)', marginBottom: '2rem' }}>
            Faça login para visualizar seu plano
          </p>
          <a 
            href="/"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: 'white',
              padding: '0.75rem 2rem',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: '600',
              display: 'inline-block'
            }}
          >
            Fazer Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--color-background) 0%, var(--color-surface) 100%)',
      padding: 'clamp(1rem, 3vw, 2rem)'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: 'clamp(2rem, 4vw, 3rem)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: 'clamp(1.5rem, 3vw, 2rem)',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'clamp(16px, 2vw, 20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              fontWeight: '800',
              margin: '0 0 0.5rem 0',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              💳 Meu Plano
            </h1>
            <p style={{
              fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
              color: 'var(--color-textSecondary)',
              margin: 0
            }}>
              Gerencie seu plano e pagamentos
            </p>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              color: '#10b981'
            }}>
              👤 {user.email}
            </div>
            
            <ThemeSelector size="small" showLabels={false} />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: '2rem'
      }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '0.5rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          flexWrap: 'wrap'
        }}>
          {[
            { href: '/dashboard', label: '🏠 Dashboard', color: '#3b82f6' },
            { href: '/meu-plano', label: '💳 Meu Plano', color: '#8b5cf6', active: true },
            { href: '/planos', label: '📋 Ver Planos', color: '#10b981' },
            { href: '/sistemas', label: '⚙️ Sistemas', color: '#f59e0b' }
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                background: item.active ? `${item.color}20` : 'transparent',
                border: item.active ? `2px solid ${item.color}` : '2px solid transparent',
                color: item.active ? item.color : 'var(--color-text)',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!item.active) {
                  const target = e.target as HTMLElement;
                  target.style.background = `${item.color}10`;
                  target.style.borderColor = `${item.color}40`;
                }
              }}
              onMouseLeave={(e) => {
                if (!item.active) {
                  const target = e.target as HTMLElement;
                  target.style.background = 'transparent';
                  target.style.borderColor = 'transparent';
                }
              }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      {/* Plan Control Panel */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <PlanControlPanel userId={user.uid} isAdmin={false} />
      </div>

      {/* Quick Actions */}
      <div style={{
        maxWidth: '1200px',
        margin: '3rem auto 0',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem'
      }}>
        {[
          {
            title: '📊 Relatórios',
            description: 'Visualize relatórios detalhados',
            href: '/dashboard',
            color: '#3b82f6'
          },
          {
            title: '⚙️ Configurações',
            description: 'Ajuste suas preferências',
            href: '/sistemas',
            color: '#8b5cf6'
          },
          {
            title: '📞 Suporte',
            description: 'Precisa de ajuda? Entre em contato',
            href: '/contato',
            color: '#10b981'
          },
          {
            title: '📋 Documentação',
            description: 'Aprenda a usar o sistema',
            href: '/documentos',
            color: '#f59e0b'
          }
        ].map((action, index) => (
          <a
            key={index}
            href={action.href}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '1.5rem',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              display: 'block'
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLElement;
              target.style.borderColor = action.color;
              target.style.transform = 'translateY(-4px)';
              target.style.boxShadow = `0 8px 25px ${action.color}40`;
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLElement;
              target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              target.style.transform = 'translateY(0px)';
              target.style.boxShadow = 'none';
            }}
          >
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: action.color
            }}>
              {action.title}
            </h3>
            <p style={{
              color: 'var(--color-textSecondary)',
              fontSize: '0.9rem',
              margin: 0
            }}>
              {action.description}
            </p>
          </a>
        ))}
      </div>

      {/* Footer Info */}
      <div style={{
        maxWidth: '1200px',
        margin: '3rem auto 0',
        textAlign: 'center',
        padding: '2rem',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{
          fontSize: '1.2rem',
          fontWeight: '600',
          marginBottom: '1rem',
          color: 'var(--color-text)'
        }}>
          🛡️ Garantia de Satisfação
        </h3>
        <p style={{
          color: 'var(--color-textSecondary)',
          fontSize: '0.95rem',
          lineHeight: '1.6',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          Oferecemos 30 dias de garantia incondicional. Se não ficar satisfeito, 
          devolvemos 100% do seu dinheiro. Sem pegadinhas, sem perguntas.
        </p>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          marginTop: '1.5rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#10b981' }}>✅</span>
            <span style={{ fontSize: '0.9rem' }}>Pagamento Seguro</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#10b981' }}>✅</span>
            <span style={{ fontSize: '0.9rem' }}>Suporte 24/7</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#10b981' }}>✅</span>
            <span style={{ fontSize: '0.9rem' }}>Cancele Quando Quiser</span>
          </div>
        </div>
      </div>
    </div>
  );
}
