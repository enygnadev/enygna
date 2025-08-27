
'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import ThemeSelector from '@/components/ThemeSelector';

interface Plan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  period: 'month' | 'year' | 'free';
  features: string[];
  popular?: boolean;
  color: string;
  maxEmployees: number;
  maxCompanies: number;
  badge?: string;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Starter',
    price: 0,
    period: 'free',
    color: '#10b981',
    maxEmployees: 5,
    maxCompanies: 1,
    badge: 'Ideal para começar',
    features: [
      'Teste gratuito por 30 dias',
      'Até 5 colaboradores',
      '1 empresa cadastrada',
      'Relatórios básicos',
      'Controle de ponto simplificado',
      'Aplicativo mobile',
      'Suporte por email'
    ]
  },
  {
    id: 'monthly',
    name: 'Professional',
    price: 29.90,
    period: 'month',
    color: '#3b82f6',
    maxEmployees: 50,
    maxCompanies: 1,
    badge: 'Mais flexibilidade',
    features: [
      'Até 50 colaboradores',
      '1 empresa completa',
      'Relatórios avançados',
      'Geolocalização GPS',
      'Exportação PDF/Excel',
      'Configurações personalizadas',
      'Segurança avançada',
      'Suporte prioritário',
      'Dashboard analítico'
    ]
  },
  {
    id: 'yearly',
    name: 'Business',
    price: 239.20,
    originalPrice: 358.80,
    period: 'year',
    popular: true,
    color: '#8b5cf6',
    maxEmployees: 50,
    maxCompanies: 1,
    badge: 'Melhor custo-benefício',
    features: [
      'Economia de 33% no ano',
      'Até 50 colaboradores',
      '1 empresa premium',
      'Relatórios ilimitados',
      'GPS tracking avançado',
      'Exportações ilimitadas',
      'Customizações avançadas',
      'Segurança enterprise',
      'Suporte 24/7',
      'Analytics preditivo',
      'Consultoria mensal inclusa'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.90,
    period: 'month',
    color: '#f59e0b',
    maxEmployees: 999,
    maxCompanies: 10,
    badge: 'Solução corporativa',
    features: [
      'Até 10 empresas',
      'Usuários ilimitados',
      'Multi-tenant completo',
      'Relatórios personalizados',
      'API e integrações',
      'Segurança máxima',
      'Backup automático',
      'Gerente dedicado',
      'Treinamento completo',
      'Performance otimizada',
      'Desenvolvimentos sob medida',
      'SLA de 99.9%'
    ]
  }
];

export default function PlansPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserPlan(userData.plan || 'free');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSelectPlan = async (planId: string) => {
    if (!currentUser) {
      alert('Faça login para selecionar um plano');
      window.location.href = '/';
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        plan: planId,
        planUpdatedAt: new Date().toISOString(),
        planExpiresAt: planId === 'free' 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : planId === 'yearly'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      setUserPlan(planId);
      alert(`Plano ${plans.find(p => p.id === planId)?.name} ativado com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      alert('Erro ao ativar plano. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getSavings = (plan: Plan) => {
    if (plan.originalPrice && plan.price < plan.originalPrice) {
      const savings = plan.originalPrice - plan.price;
      const percentage = Math.round((savings / plan.originalPrice) * 100);
      return { savings, percentage };
    }
    return null;
  };

  // Componente ScrollToTop
  const ScrollToTop = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      const toggleVisibility = () => {
        setIsVisible(window.scrollY > 300);
      };

      window.addEventListener('scroll', toggleVisibility);
      return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    };

    return (
      <button
        onClick={scrollToTop}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          transform: isVisible ? 'translateY(0)' : 'translateY(100px)',
          opacity: isVisible ? 1 : 0,
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.transform = isVisible ? 'translateY(-5px) scale(1.1)' : 'translateY(100px)';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.transform = isVisible ? 'translateY(0) scale(1)' : 'translateY(100px)';
        }}
      >
        ↑
      </button>
    );
  };

  // Função para scroll suave para seções
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = 80;
      const elementTop = element.offsetTop - headerHeight;
      
      window.scrollTo({
        top: elementTop,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--color-background) 0%, var(--color-surface) 100%)',
      padding: 'clamp(1rem, 3vw, 2rem)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      scrollBehavior: 'smooth'
    }}>
      {/* Header Premium */}
      <div id="header" style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: 'clamp(2rem, 5vw, 4rem)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: 'clamp(1.5rem, 4vw, 2.5rem)',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'clamp(16px, 2vw, 24px)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
              fontWeight: '800',
              margin: '0 0 0.5rem 0',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: '1.1'
            }}>
              Planos & Preços
            </h1>
            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: 'var(--color-textSecondary)',
              margin: 0,
              maxWidth: '600px'
            }}>
              Escolha a solução ideal para sua empresa. Sem compromisso, cancele quando quiser.
            </p>
          </div>
          <ThemeSelector size="medium" showLabels={false} />
        </div>
      </div>

      {/* Container Principal */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Status do Usuário */}
        {currentUser && (
          <div style={{
            marginBottom: 'clamp(2rem, 4vw, 3rem)',
            padding: 'clamp(1rem, 3vw, 1.5rem)',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'clamp(12px, 1.5vw, 16px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h3 style={{
                margin: '0 0 0.25rem 0',
                fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)',
                fontWeight: '600',
                color: 'var(--color-text)'
              }}>
                👤 {currentUser.email}
              </h3>
              <p style={{
                margin: 0,
                color: 'var(--color-textSecondary)',
                fontSize: 'clamp(0.9rem, 2vw, 1rem)'
              }}>
                Plano atual: <strong style={{ color: '#10b981' }}>
                  {plans.find(p => p.id === userPlan)?.name || 'Não definido'}
                </strong>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Menu de Navegação Rápida */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                {[
                  { id: 'planos', label: '📋 Planos', color: '#3b82f6' },
                  { id: 'garantias', label: '🛡️ Garantias', color: '#10b981' },
                  { id: 'faq', label: '❓ FAQ', color: '#8b5cf6' },
                  { id: 'contato', label: '📞 Contato', color: '#f59e0b' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text)',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      const target = e.target as HTMLElement;
                      target.style.background = `${item.color}20`;
                      target.style.color = item.color;
                      target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      const target = e.target as HTMLElement;
                      target.style.background = 'transparent';
                      target.style.color = 'var(--color-text)';
                      target.style.transform = 'translateY(0px)';
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <a 
                href="/dashboard" 
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
                  borderRadius: 'clamp(8px, 1vw, 12px)',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                  transition: 'all 0.3s ease',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.transform = 'translateY(0px)'}
              >
                🏠 Dashboard
              </a>
            </div>
          </div>
        )}

        {/* Grid de Planos */}
        <div id="planos" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'clamp(1.5rem, 3vw, 2rem)',
          marginBottom: 'clamp(3rem, 6vw, 5rem)'
        }}>
          {plans.map((plan) => {
            const savings = getSavings(plan);
            const isCurrentPlan = userPlan === plan.id;
            const isHovered = hoveredPlan === plan.id;
            
            return (
              <div
                key={plan.id}
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
                style={{
                  position: 'relative',
                  background: plan.popular 
                    ? `linear-gradient(145deg, ${plan.color}15, rgba(255,255,255,0.05))`
                    : 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(20px)',
                  border: plan.popular 
                    ? `2px solid ${plan.color}80`
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'clamp(16px, 2vw, 24px)',
                  padding: 'clamp(1.5rem, 4vw, 2rem)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: plan.popular 
                    ? 'scale(1.02) translateY(-8px)' 
                    : isHovered 
                      ? 'scale(1.02) translateY(-4px)' 
                      : 'scale(1)',
                  boxShadow: plan.popular
                    ? `0 25px 50px ${plan.color}40, 0 0 0 1px ${plan.color}30`
                    : isHovered
                      ? '0 20px 40px rgba(0, 0, 0, 0.4)'
                      : '0 10px 30px rgba(0, 0, 0, 0.2)',
                  overflow: 'hidden'
                }}
              >
                {/* Badge Popular */}
                {plan.popular && (
                  <div style={{
                    position: 'absolute',
                    top: '-1px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: `linear-gradient(135deg, ${plan.color}, ${plan.color}dd)`,
                    color: 'white',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '0 0 12px 12px',
                    fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    boxShadow: `0 4px 12px ${plan.color}40`
                  }}>
                    🔥 Mais Popular
                  </div>
                )}

                {/* Badge Plano Atual */}
                {isCurrentPlan && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: 'clamp(0.6rem, 1.2vw, 0.7rem)',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    ✅ Ativo
                  </div>
                )}

                {/* Header do Plano */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <div style={{
                    backgroundColor: `${plan.color}20`,
                    color: plan.color,
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)',
                    fontWeight: '600',
                    marginBottom: '1rem',
                    display: 'inline-block'
                  }}>
                    {plan.badge}
                  </div>

                  <h3 style={{
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                    fontWeight: '700',
                    color: plan.color,
                    marginBottom: '0.5rem',
                    lineHeight: '1.2'
                  }}>
                    {plan.name}
                  </h3>

                  {/* Preço */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    {plan.period === 'free' ? (
                      <div>
                        <div style={{
                          fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                          fontWeight: '900',
                          color: plan.color,
                          lineHeight: '1'
                        }}>
                          GRÁTIS
                        </div>
                        <div style={{
                          fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)',
                          color: 'var(--color-textSecondary)',
                          marginTop: '0.25rem'
                        }}>
                          Por 30 dias
                        </div>
                      </div>
                    ) : (
                      <div>
                        {savings && (
                          <div style={{
                            textDecoration: 'line-through',
                            color: 'var(--color-textSecondary)',
                            fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                            marginBottom: '0.25rem'
                          }}>
                            R$ {plan.originalPrice?.toFixed(2)}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.25rem' }}>
                          <span style={{
                            fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                            color: 'var(--color-textSecondary)'
                          }}>R$</span>
                          <span style={{
                            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                            fontWeight: '900',
                            color: plan.color,
                            lineHeight: '1'
                          }}>
                            {plan.price.toFixed(2)}
                          </span>
                          <span style={{
                            fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)',
                            color: 'var(--color-textSecondary)'
                          }}>
                            /{plan.period === 'month' ? 'mês' : 'ano'}
                          </span>
                        </div>
                        {savings && (
                          <div style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: 'clamp(0.7rem, 1.3vw, 0.8rem)',
                            fontWeight: '600',
                            marginTop: '0.75rem',
                            display: 'inline-block'
                          }}>
                            💰 Economize {savings.percentage}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Capacidade */}
                  <div style={{
                    background: `${plan.color}10`,
                    border: `1px solid ${plan.color}30`,
                    borderRadius: '12px',
                    padding: 'clamp(0.75rem, 2vw, 1rem)',
                    fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)',
                    fontWeight: '600',
                    color: 'var(--color-text)'
                  }}>
                    <div>👥 {plan.maxEmployees === 999 ? 'Usuários ilimitados' : `Até ${plan.maxEmployees} colaboradores`}</div>
                    <div style={{ marginTop: '0.25rem' }}>
                      🏢 {plan.maxCompanies === 10 ? 'Até 10 empresas' : `${plan.maxCompanies} empresa`}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'clamp(0.5rem, 1vw, 0.75rem)',
                  marginBottom: '2rem'
                }}>
                  {plan.features.map((feature, index) => (
                    <div 
                      key={index} 
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)',
                        lineHeight: '1.5',
                        color: 'var(--color-text)',
                        padding: '0.5rem 0'
                      }}
                    >
                      <span style={{ 
                        color: plan.color, 
                        fontWeight: '600',
                        minWidth: '16px'
                      }}>✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Botão de Ação */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loading || isCurrentPlan}
                  style={{
                    width: '100%',
                    background: isCurrentPlan 
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : plan.popular
                        ? `linear-gradient(135deg, ${plan.color}, ${plan.color}dd)`
                        : 'rgba(255, 255, 255, 0.1)',
                    border: `2px solid ${isCurrentPlan ? '#10b981' : plan.color}`,
                    borderRadius: 'clamp(10px, 1.5vw, 14px)',
                    color: plan.popular || isCurrentPlan ? 'white' : plan.color,
                    padding: 'clamp(0.75rem, 2.5vw, 1rem)',
                    fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                    fontWeight: '700',
                    cursor: isCurrentPlan ? 'not-allowed' : 'pointer',
                    opacity: isCurrentPlan ? 0.8 : 1,
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrentPlan && !loading) {
                      const target = e.target as HTMLElement;
                      target.style.transform = 'translateY(-2px)';
                      target.style.boxShadow = `0 8px 25px ${plan.color}40`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrentPlan && !loading) {
                      const target = e.target as HTMLElement;
                      target.style.transform = 'translateY(0px)';
                      target.style.boxShadow = 'none';
                    }
                  }}
                >
                  {loading ? (
                    <>⏳ Processando...</>
                  ) : isCurrentPlan ? (
                    <>✅ Plano Ativo</>
                  ) : plan.period === 'free' ? (
                    <>🎁 Começar Grátis</>
                  ) : (
                    <>🚀 Escolher {plan.name}</>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Seção de Garantias */}
        <div id="garantias" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'clamp(16px, 2vw, 24px)',
          padding: 'clamp(2rem, 4vw, 3rem)',
          marginBottom: 'clamp(3rem, 6vw, 5rem)',
          textAlign: 'center'
        }}>
          <h3 style={{
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            fontWeight: '700',
            marginBottom: 'clamp(1rem, 3vw, 2rem)',
            color: 'var(--color-text)'
          }}>
            🛡️ Garantias & Benefícios
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 'clamp(1rem, 3vw, 2rem)'
          }}>
            {[
              { icon: '🔒', title: 'Pagamento 100% Seguro', desc: 'Certificação SSL e criptografia bancária' },
              { icon: '📞', title: 'Suporte Especializado', desc: 'Equipe técnica disponível para ajudar' },
              { icon: '⚡', title: 'Ativação Imediata', desc: 'Acesso liberado em segundos' },
              { icon: '🔄', title: 'Cancele Quando Quiser', desc: 'Sem fidelidade ou multas' }
            ].map((item, index) => (
              <div key={index} style={{
                padding: 'clamp(1rem, 3vw, 1.5rem)',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'clamp(12px, 1.5vw, 16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', marginBottom: '0.5rem' }}>
                  {item.icon}
                </div>
                <h4 style={{
                  fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: 'var(--color-text)'
                }}>
                  {item.title}
                </h4>
                <p style={{
                  fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)',
                  color: 'var(--color-textSecondary)',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div id="faq" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'clamp(16px, 2vw, 24px)',
          padding: 'clamp(2rem, 4vw, 3rem)',
          marginBottom: 'clamp(3rem, 6vw, 5rem)'
        }}>
          <h3 style={{
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            fontWeight: '700',
            marginBottom: 'clamp(1.5rem, 3vw, 2rem)',
            color: 'var(--color-text)',
            textAlign: 'center'
          }}>
            ❓ Perguntas Frequentes
          </h3>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(1rem, 2vw, 1.5rem)'
          }}>
            {[
              {
                q: '🎁 Como funciona o período gratuito?',
                a: 'Oferecemos 30 dias completamente grátis para testar todas as funcionalidades básicas com até 5 colaboradores. Sem cartão de crédito necessário.'
              },
              {
                q: '💰 Posso cancelar quando quiser?',
                a: 'Sim! Todos os planos podem ser cancelados a qualquer momento através do painel de controle. Você mantém acesso até o final do período pago.'
              },
              {
                q: '🔄 Como fazer upgrade ou downgrade?',
                a: 'Mudanças de plano são instantâneas. Fazemos cálculo proporcional para upgrades e oferecemos créditos para downgrades.'
              },
              {
                q: '🛡️ Meus dados estão seguros?',
                a: 'Absolutamente! Utilizamos criptografia militar, backup automático e cumprimos rigorosamente a LGPD. Certificação ISO 27001.'
              }
            ].map((faq, index) => (
              <details 
                key={index}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'clamp(10px, 1.5vw, 14px)',
                  padding: 'clamp(1rem, 3vw, 1.5rem)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <summary style={{
                  fontWeight: '600',
                  fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                  color: 'var(--color-text)',
                  listStyle: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  {faq.q}
                  <span style={{ fontSize: '1.2rem', color: 'var(--color-textSecondary)' }}>+</span>
                </summary>
                <p style={{
                  marginTop: '1rem',
                  fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)',
                  color: 'var(--color-textSecondary)',
                  lineHeight: '1.6',
                  margin: '1rem 0 0 0'
                }}>
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* Footer de Contato */}
        <div id="contato" style={{
          textAlign: 'center',
          padding: 'clamp(2rem, 4vw, 3rem)',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 'clamp(16px, 2vw, 24px)',
          color: 'var(--color-textSecondary)'
        }}>
          <h4 style={{
            fontSize: 'clamp(1.2rem, 2.5vw, 1.4rem)',
            fontWeight: '600',
            marginBottom: '1rem',
            color: 'var(--color-text)'
          }}>
            Precisa de ajuda para escolher?
          </h4>
          <p style={{
            fontSize: 'clamp(0.9rem, 2vw, 1rem)',
            marginBottom: '1.5rem',
            lineHeight: '1.6'
          }}>
            Nossa equipe especializada está pronta para ajudar você a encontrar a solução ideal para sua empresa.
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 'clamp(1rem, 3vw, 2rem)',
            flexWrap: 'wrap'
          }}>
            <a 
              href="mailto:suporte@cartaoponto.com" 
              style={{
                color: '#3b82f6',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: 'clamp(0.9rem, 2vw, 1rem)'
              }}
            >
              📧 suporte@cartaoponto.com
            </a>
            <a 
              href="tel:+5511999999999" 
              style={{
                color: '#3b82f6',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: 'clamp(0.9rem, 2vw, 1rem)'
              }}
            >
              📞 (11) 99999-9999
            </a>
          </div>
        </div>
      </div>

      {/* Componente de Rolagem para o Topo */}
      <ScrollToTop />
    </div>
  );
}
