'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ThemeSelector from '@/src/components/ThemeSelector';
import Tutorial from '@/src/components/Tutorial';
import { themeManager } from '@/src/lib/themes';
import { homeTutorialSteps } from '@/src/lib/tutorialSteps';

// Define the AdminLoginButton component for accessing the /admin panel.
function AdminLoginButton({ variant, size, style }: { variant: 'primary' | 'secondary', size: 'small' | 'medium' | 'large', style?: React.CSSProperties }) {
  const buttonStyle: React.CSSProperties = {
    padding: '0.8rem 1.8rem',
    borderRadius: '12px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontSize: '0.95rem',
    ...style,
  };

  if (size === 'medium') {
    buttonStyle.padding = '1rem 2rem';
    buttonStyle.fontSize = '1rem';
  } else if (size === 'large') {
    buttonStyle.padding = '1.2rem 2.5rem';
    buttonStyle.fontSize = '1.1rem';
  }

  if (variant === 'primary') {
    buttonStyle.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    buttonStyle.color = 'white';
    buttonStyle.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.4)';
  } else {
    buttonStyle.background = 'rgba(255, 255, 255, 0.1)';
    buttonStyle.color = 'white';
    buttonStyle.border = '2px solid rgba(255, 255, 255, 0.2)';
    buttonStyle.backdropFilter = 'blur(10px)';
  }

  return (
    <Link href="/admin" style={buttonStyle}>
      <span>Login Admin</span>
      <div className="button-glow"></div>
    </Link>
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeSection, setActiveSection] = useState('hero');
  const [isScrolled, setIsScrolled] = useState(false);

  const heroRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const plansRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
    themeManager.getCurrentTheme();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // Detectar seção ativa
      const sections = [
        { id: 'hero', ref: heroRef },
        { id: 'features', ref: featuresRef },
        { id: 'plans', ref: plansRef },
        { id: 'contact', ref: contactRef }
      ];

      for (const section of sections) {
        if (section.ref.current) {
          const rect = section.ref.current.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    const refs = {
      hero: heroRef,
      features: featuresRef,
      plans: plansRef,
      contact: contactRef
    };

    const ref = refs[sectionId as keyof typeof refs];
    if (ref?.current) {
      const headerHeight = 100;
      const elementTop = ref.current.offsetTop - headerHeight;

      window.scrollTo({
        top: elementTop,
        behavior: 'smooth'
      });
    }
  };

  const features = [
    {
      icon: '🕒',
      title: 'Sistema de Ponto Inteligente',
      description: 'Controle de ponto com GPS, reconhecimento facial e relatórios em tempo real',
      color: '#667eea',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      stats: '+50K pontos/dia'
    },
    {
      icon: '🎫',
      title: 'Help Desk com IA',
      description: 'Suporte técnico automatizado com inteligência artificial e chatbot 24/7',
      color: '#f093fb',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      stats: '98% satisfação'
    },
    {
      icon: '💼',
      title: 'CRM Empresarial',
      description: 'Sistema completo de vendas com pipeline inteligente e analytics avançados',
      color: '#4facfe',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      stats: '+300% vendas'
    },
    {
      icon: '📦',
      title: 'Gestão de Estoque',
      description: 'Controle total com código de barras, IoT e previsão de demanda',
      color: '#43e97b',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      stats: '99.7% precisão'
    },
    {
      icon: '💰',
      title: 'Sistema Financeiro',
      description: 'DRE automatizado, fluxo de caixa e integração bancária completa',
      color: '#fa709a',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      stats: 'ROI +250%'
    },
    {
      icon: '👥',
      title: 'RH Completo',
      description: 'Gestão de pessoas, folha de pagamento e desenvolvimento profissional',
      color: '#a8edea',
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      stats: '+10K funcionários'
    }
  ];

  const plans = [
    {
      id: 'free',
      name: 'Teste Gratuito',
      price: 0,
      period: '30 dias',
      description: 'Ideal para pequenas empresas testarem a plataforma',
      features: [
        '✅ Acesso a todos os sistemas',
        '👥 Até 5 colaboradores',
        '🏢 1 empresa',
        '📊 Relatórios básicos',
        '💬 Suporte por email',
        '🔒 Segurança padrão'
      ],
      color: '#10b981',
      popular: false
    },
    {
      id: 'professional',
      name: 'Profissional',
      price: 29.90,
      period: 'por mês',
      description: 'Para empresas em crescimento que precisam de mais recursos',
      features: [
        '✅ Todos os sistemas completos',
        '👥 Até 100 colaboradores',
        '🏢 3 empresas',
        '📊 Relatórios avançados',
        '🗺️ GPS e Geofencing',
        '📄 Exportação ilimitada',
        '🔐 Segurança enterprise',
        '📞 Suporte prioritário',
        '📈 Analytics em tempo real'
      ],
      color: '#3b82f6',
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99.90,
      period: 'por mês',
      description: 'Solução completa para grandes empresas e corporações',
      features: [
        '✅ Plataforma completa ilimitada',
        '👥 Colaboradores ilimitados',
        '🏢 Empresas ilimitadas',
        '🤖 IA e Machine Learning',
        '🔗 API e integrações customizadas',
        '👨‍💼 Gerente de conta dedicado',
        '🎓 Treinamento especializado',
        '📋 SLA 99.9% garantido',
        '🛡️ Segurança militar',
        '☁️ Cloud privada opcional'
      ],
      color: '#8b5cf6',
      popular: false
    }
  ];

  if (!mounted) {
    return <LoadingScreen />;
  }

  return (
    <>
      <AnimatedBackground mousePosition={mousePosition} />

      <div className="premium-container">
        <PremiumHeader 
          isScrolled={isScrolled} 
          activeSection={activeSection} 
          onNavigate={scrollToSection} 
        />

        <section ref={heroRef} id="hero">
          <HeroSection features={features} onNavigate={scrollToSection} />
        </section>

        <section ref={featuresRef} id="features">
          <SystemsShowcase 
            features={features} 
            currentFeature={currentFeature} 
            setCurrentFeature={setCurrentFeature} 
          />
        </section>
        <SectionIndicator targetSection="plans" onNavigate={scrollToSection} />

        <section ref={plansRef} id="plans">
          <PlansSection plans={plans} />
        </section>
        <SectionIndicator targetSection="contact" onNavigate={scrollToSection} />

        <PremiumFeatures />
        <CallToAction />
        <SectionIndicator targetSection="contact" onNavigate={scrollToSection} />

        <section ref={contactRef} id="contact">
          <PremiumFooter />
        </section>
      </div>

      <ScrollToTop />
      <NavigationDots activeSection={activeSection} onNavigate={scrollToSection} />

      <Tutorial 
        steps={homeTutorialSteps} 
        tutorialKey="home" 
        onComplete={() => console.log('Tutorial concluído')}
        onSkip={() => console.log('Tutorial pulado')}
      />

      <GlobalStyles />
    </>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div className="loading-premium">
        <div className="spinner-premium"></div>
        <p style={{ color: 'white', marginTop: '1rem', fontSize: '1.2rem', fontWeight: '600' }}>
          Carregando Portal Premium...
        </p>
      </div>
    </div>
  );
}

function AnimatedBackground({ mousePosition }: { mousePosition: { x: number; y: number } }) {
  return (
    <div className="premium-background">
      <div className="gif-background">
        <img 
          src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
          alt="Tech Background"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.08,
            filter: 'blur(2px)'
          }}
        />
      </div>

      <div className="floating-particles"></div>
      <div className="gradient-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="orb orb-4"></div>
      </div>
      <div 
        className="mouse-glow"
        style={{
          left: mousePosition.x - 100,
          top: mousePosition.y - 100
        }}
      ></div>
    </div>
  );
}

function PremiumHeader({ 
  isScrolled, 
  activeSection, 
  onNavigate 
}: { 
  isScrolled: boolean; 
  activeSection: string; 
  onNavigate: (section: string) => void; 
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className={`premium-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-content">
        <div className="brand-section">
          <div className="brand-icon">
            <div className="rotating-logo">🏢</div>
          </div>
          <div className="brand-text">
            <h1 className="brand-title">ENY-GNA Lab</h1>
            <p className="brand-subtitle">Global Network Architecture</p>
          </div>
        </div>

        <nav className={`header-nav ${isMenuOpen ? 'mobile-open' : ''}`}>
          <button 
            className={`nav-link ${activeSection === 'hero' ? 'active' : ''}`}
            onClick={() => {
              onNavigate('hero');
              setIsMenuOpen(false);
            }}
          >
            <span>Início</span>
          </button>
          <Link 
            href="/sistemas"
            className={`nav-link ${activeSection === 'features' ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(false)}
          >
            <span>Sistemas</span>
          </Link>
          <Link 
            href="/planos"
            className={`nav-link ${activeSection === 'plans' ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(false)}
          >
            <span>Planos</span>
          </Link>
          <button 
            className={`nav-link ${activeSection === 'contact' ? 'active' : ''}`}
            onClick={() => {
              onNavigate('contact');
              setIsMenuOpen(false);
            }}
          >
            <span>Contato</span>
          </button>
          <ThemeSelector size="medium" showLabels={false} />
          <Link href="/sistemas" className="cta-button">
            <span>Acessar Plataforma</span>
            <div className="button-glow"></div>
          </Link>
        </nav>
        <button 
            className="mobile-menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
      </div>
    </header>
  );
}

function HeroSection({ features, onNavigate }: { features: any[]; onNavigate: (section: string) => void }) {
  return (
    <section className="hero-premium">
      <div className="hero-content">
        <div className="hero-badge">
          <span className="badge-text">🚀 Mais de 50 Anos de Experiência</span>
        </div>

        <h1 className="hero-title">
          <span className="title-line">Transforme sua</span>
          <span className="title-line gradient-text">Gestão Empresarial</span>
          <span className="title-line">com Inteligência</span>
        </h1>

        <p className="hero-description">
          Plataforma integrada com 6 sistemas empresariais de última geração. 
          Desenvolvida pela ENY-GNA (Global Network Architecture) Lab com décadas de expertise em soluções corporativas.
        </p>

        <div className="hero-stats">
          <div className="stat-item">
            <div className="stat-number">50K+</div>
            <div className="stat-label">Empresas Ativas</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">99.9%</div>
            <div className="stat-label">Uptime SLA</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Suporte Premium</div>
          </div>
        </div>

        <div className="hero-actions">
          <Link href="/sistemas" className="primary-cta">
            <span>Começar Demonstração</span>
            <div className="cta-arrow">→</div>
          </Link>
          <button className="secondary-cta" onClick={() => onNavigate('plans')}>
            <span>Ver Planos</span>
            <div className="pulse-ring"></div>
          </button>
        </div>

        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            marginTop: '2rem'
          }}>
            <Link 
              href="/sistemas" 
              className="button button-primary"
              style={{
                fontSize: '1.1rem',
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                textDecoration: 'none',
                color: 'white',
                fontWeight: '600',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.3s ease',
                border: 'none'
              }}
            >
              🚀 Acessar Sistema Completo
            </Link>

            <AdminLoginButton 
              variant="secondary"
              size="medium"
              style={{ marginTop: '0.5rem' }}
            />
        </div>

        <div className="hero-social-proof">
          <p>Confiado por empresas de todos os portes</p>
          <div className="company-logos">
            <div className="logo" title="Indústrias">🏭</div>
            <div className="logo" title="Corporações">🏢</div>
            <div className="logo" title="Comércio">🏪</div>
            <div className="logo" title="Instituições">🏛️</div>
            <div className="logo" title="Tecnologia">💻</div>
            <div className="logo" title="Saúde">🏥</div>
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <div className="visual-container">
          <div className="floating-cards">
            {features.slice(0, 3).map((feature, index) => (
              <div 
                key={index}
                className="floating-card"
                style={{
                  background: feature.gradient,
                  animationDelay: `${index * 0.5}s`
                }}
              >
                <div className="card-icon">{feature.icon}</div>
                <div className="card-title">{feature.title}</div>
                <div className="card-stat">{feature.stats}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SystemsShowcase({ features, currentFeature, setCurrentFeature }: { 
  features: any[], 
  currentFeature: number, 
  setCurrentFeature: (index: number) => void 
}) {
  return (
    <section className="systems-showcase">
      <div className="section-header">
        <h2 className="section-title">
          Sistemas de Classe Mundial
        </h2>
        <p className="section-subtitle">
          Cada módulo desenvolvido com tecnologia de ponta e anos de expertise
        </p>
      </div>

      <div className="carousel-container">
        <div className="current-system">
          <div 
            className="system-card-large"
            style={{ background: features[currentFeature].gradient }}
          >
            <div className="system-content">
              <div className="system-icon-large">
                {features[currentFeature].icon}
              </div>
              <div className="system-info">
                <h3 className="system-title">{features[currentFeature].title}</h3>
                <p className="system-description">{features[currentFeature].description}</p>
                <div className="system-stat">{features[currentFeature].stats}</div>
              </div>
            </div>
            <div className="system-preview">
              <div className="preview-screen">
                <div className="screen-content">
                  <div className="chart-bars">
                    <div className="bar" style={{height: '60%'}}></div>
                    <div className="bar" style={{height: '80%'}}></div>
                    <div className="bar" style={{height: '45%'}}></div>
                    <div className="bar" style={{height: '90%'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="systems-grid">
          {features.map((feature, index) => (
            <button
              key={index}
              className={`system-thumbnail ${currentFeature === index ? 'active' : ''}`}
              onClick={() => setCurrentFeature(index)}
              style={{ 
                background: index === currentFeature ? feature.gradient : 'var(--color-surface)'
              }}
            >
              <div className="thumbnail-icon">{feature.icon}</div>
              <div className="thumbnail-title">{feature.title.split(' ')[0]}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlansSection({ plans }: { plans: any[] }) {
  return (
    <section className="plans-section">
      <div className="section-header">
        <h2 className="section-title">Escolha seu Plano</h2>
        <p className="section-subtitle">
          Soluções flexíveis para empresas de todos os tamanhos
        </p>
      </div>

      <div className="plans-grid">
        {plans.map((plan, index) => (
          <div 
            key={plan.id} 
            className={`plan-card ${plan.popular ? 'popular' : ''}`}
            style={{ animationDelay: `${index * 0.2}s` }}
          >
            {plan.popular && (
              <div className="popular-badge">
                <span>🔥 Mais Popular</span>
              </div>
            )}

            <div className="plan-header">
              <div 
                className="plan-icon"
                style={{ background: plan.color }}
              >
                {plan.id === 'free' ? '🆓' : plan.id === 'professional' ? '💼' : '🏢'}
              </div>
              <h3 className="plan-name">{plan.name}</h3>
              <p className="plan-description">{plan.description}</p>
            </div>

            <div className="plan-pricing">
              <div className="price-container">
                <span className="currency">R$</span>
                <span className="price">{plan.price.toFixed(2).replace('.', ',')}</span>
                <span className="period">/{plan.period}</span>
              </div>
            </div>

            <div className="plan-features">
              {plan.features.map((feature: string, idx: number) => (
                <div key={idx} className="feature-item">
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="plan-action">
              <Link 
                href={plan.id === 'free' ? '/sistemas' : '/planos'}
                className={`plan-button ${plan.popular ? 'popular' : ''}`}
                style={{ background: plan.popular ? plan.color : 'transparent' }}
              >
                {plan.id === 'free' ? 'Começar Teste' : 'Escolher Plano'}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="plans-guarantee">
        <div className="guarantee-content">
          <div className="guarantee-icon">🛡️</div>
          <div className="guarantee-text">
            <h4>Garantia de 30 dias</h4>
            <p>Teste sem riscos com garantia total de satisfação</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PremiumFeatures() {
  const premiumFeatures = [
    {
      icon: '⚡',
      title: 'Performance Extrema',
      description: 'Arquitetura cloud-native com resposta em menos de 100ms',
      metric: '<100ms'
    },
    {
      icon: '🧠',
      title: 'IA Integrada',
      description: 'Machine Learning em todos os módulos para insights preditivos',
      metric: 'ML/AI'
    },
    {
      icon: '🔒',
      title: 'Segurança Militar',
      description: 'Criptografia de grau militar e conformidade internacional',
      metric: 'ISO 27001'
    },
    {
      icon: '🌐',
      title: 'Escalabilidade Infinita',
      description: 'Suporte a milhões de usuários simultâneos',
      metric: '∞ Users'
    }
  ];

  return (
    <section className="features-premium">
      <div className="section-header">
        <h2 className="section-title">Por que somos diferentes?</h2>
        <p className="section-subtitle">50+ anos de expertise em uma única plataforma</p>
      </div>

      <div className="features-grid">
        {premiumFeatures.map((feature, index) => (
          <div key={index} className="feature-card-premium">
            <div className="feature-header">
              <div className="feature-icon-container">
                <div className="feature-icon">{feature.icon}</div>
              </div>
              <div className="feature-metric">{feature.metric}</div>
            </div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-description">{feature.description}</p>
            <div className="feature-glow"></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CallToAction() {
  return (
    <section className="cta-premium">
      <div className="cta-content">
        <div className="cta-text">
          <h2 className="cta-title">
            Pronto para liderar o futuro?
          </h2>
          <p className="cta-description">
            Junte-se a mais de 50.000 empresas que já revolucionaram seus negócios
          </p>
        </div>
        <div className="cta-actions">
          <Link href="/sistemas" className="cta-button-large">
            <span>Iniciar Jornada Premium</span>
            <div className="button-shine"></div>
          </Link>
          <div className="cta-guarantee">
            ✅ Garantia de 30 dias • ✅ ROI garantido • ✅ Suporte white-glove
          </div>
        </div>
      </div>
    </section>
  );
}

function ScrollToTop() {
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
      className={`scroll-to-top ${isVisible ? 'visible' : ''}`}
    >
      ↑
    </button>
  );
}

function NavigationDots({ activeSection, onNavigate }: { activeSection: string; onNavigate: (section: string) => void }) {
  const sections = [
    { id: 'hero', label: 'Início' },
    { id: 'features', label: 'Sistemas' },
    { id: 'plans', label: 'Planos' },
    { id: 'contact', label: 'Contato' }
  ];

  return (
    <div className="navigation-dots">
      {sections.map((section) => (
        <div
          key={section.id}
          className={`nav-dot ${activeSection === section.id ? 'active' : ''}`}
          data-label={section.label}
          onClick={() => onNavigate(section.id)}
        />
      ))}
    </div>
  );
}

function SectionIndicator({ targetSection, onNavigate }: { targetSection: string; onNavigate: (section: string) => void }) {
  return (
    <div 
      className="section-indicator"
      onClick={() => onNavigate(targetSection)}
    >
      <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
        {targetSection === 'features' ? 'Explorar Sistemas' : 
         targetSection === 'plans' ? 'Ver Planos' : 
         targetSection === 'contact' ? 'Fale Conosco' : 'Continue'}
      </span>
      <div className="scroll-arrow">↓</div>
    </div>
  );
}

function PremiumFooter() {
  return (
    <footer className="footer-premium">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="footer-logo">🏢</div>
          <p>ENY-GNA (Global Network Architecture) Lab</p>
          <p className="footer-tagline">Transformando negócios há mais de 50 anos</p>
        </div>
        <div className="footer-links">
          <div className="link-group">
            <h4>Produtos</h4>
            <Link href="/sistemas">Todos os Sistemas</Link>
            <Link href="/planos">Planos & Preços</Link>
            <Link href="/dashboard">Sistema de Ponto</Link>
            <Link href="/chamados">Help Desk IA</Link>
          </div>
          <div className="link-group">
            <h4>Empresa</h4>
            <Link href="/sobre">Nossa História</Link>
            <Link href="/cases">Cases de Sucesso</Link>
            <Link href="/carreiras">Trabalhe Conosco</Link>
            <Link href="/parceiros">Seja Parceiro</Link>
          </div>
          <div className="link-group">
            <h4>Suporte</h4>
            <Link href="/chamados">Central de Ajuda</Link>
            <Link href="/status">Status do Sistema</Link>
            <Link href="/docs">Documentação</Link>
            <Link href="/contato">Fale Conosco</Link>
          </div>
          <div className="link-group">
            <h4>Legal</h4>
            <Link href="/privacy">Privacidade</Link>
            <Link href="/termos">Termos de Uso</Link>
            <Link href="/lgpd">LGPD</Link>
            <Link href="/seguranca">Segurança</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2024 ENY-GNA Lab. Todos os direitos reservados.</p>
        <p>Desenvolvido com tecnologia de ponta e 50+ anos de experiência</p>
      </div>
    </footer>
  );
}

function GlobalStyles() {
  return (
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Playfair+Display:wght@400;500;600;700;800;900&display=swap');

      :root {
        --gradient-primary: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
        --gradient-secondary: linear-gradient(45deg, #f093fb 0%, #f5576c 100%);
        --color-primary: #667eea;
        --color-secondary: #764ba2;
        --color-accent: #f093fb;
        --color-surface: #1f2937;
        --color-text-muted: rgba(255, 255, 255, 0.7);
        --color-text-primary: white;
      }

      html {
        scroll-behavior: smooth;
      }

      .premium-background {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #2d1b69 50%, #1a1a3e 75%, #0f0f23 100%);
        z-index: -2;
        overflow: hidden;
      }

      .gif-background {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
      }

      .floating-particles {
        position: absolute;
        width: 100%;
        height: 100%;
        background-image: 
          radial-gradient(circle at 20% 20%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 60%, rgba(59, 130, 246, 0.2) 0%, transparent 50%);
        animation: float-particles 20s ease-in-out infinite;
      }

      @keyframes float-particles {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        33% { transform: translateY(-20px) rotate(120deg); }
        66% { transform: translateY(20px) rotate(240deg); }
      }

      .gradient-orbs {
        position: absolute;
        width: 100%;
        height: 100%;
      }

      .orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(40px);
        animation: orbit 30s linear infinite;
      }

      .orb-1 {
        width: 300px;
        height: 300px;
        background: linear-gradient(45deg, #667eea, #764ba2);
        top: 10%;
        left: 10%;
        animation-duration: 25s;
      }

      .orb-2 {
        width: 200px;
        height: 200px;
        background: linear-gradient(45deg, #f093fb, #f5576c);
        top: 60%;
        right: 10%;
        animation-duration: 30s;
        animation-direction: reverse;
      }

      .orb-3 {
        width: 150px;
        height: 150px;
        background: linear-gradient(45deg, #4facfe, #00f2fe);
        bottom: 20%;
        left: 20%;
        animation-duration: 35s;
      }

      .orb-4 {
        width: 100px;
        height: 100px;
        background: linear-gradient(45deg, #43e97b, #38f9d7);
        top: 30%;
        left: 50%;
        animation-duration: 20s;
        animation-direction: reverse;
      }

      @keyframes orbit {
        from { transform: rotate(0deg) translateX(100px) rotate(0deg); }
        to { transform: rotate(360deg) translateX(100px) rotate(-360deg); }
      }

      .mouse-glow {
        position: absolute;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        transition: all 0.1s ease-out;
        z-index: -1;
      }

      .premium-container {
        position: relative;
        min-height: 100vh;
        overflow-x: hidden;
        background: transparent;
        scroll-behavior: smooth;
      }

      /* Progress Bar */
      .progress-bar-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        z-index: 9999;
        backdrop-filter: blur(10px);
      }

      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4);
        background-size: 200% 100%;
        animation: gradient-shift 3s ease infinite;
        transition: width 0.1s ease;
        border-radius: 0 2px 2px 0;
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
      }

      @keyframes gradient-shift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }

      /* Scroll to Top Button */
      .scroll-to-top {
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        background: var(--gradient-primary);
        border: none;
        border-radius: 50%;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transform: translateY(20px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
      }

      .scroll-to-top.visible {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      .scroll-to-top:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 30px rgba(59, 130, 246, 0.4);
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      }

      .scroll-to-top:active {
        transform: translateY(-1px);
      }

      .premium-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: rgba(15, 15, 35, 0.8);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 1000;
        padding: 1rem 2rem;
        transition: all 0.3s ease;
      }

      .premium-header.scrolled {
        background: rgba(15, 15, 35, 0.95);
        padding: 0.8rem 2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }

      .header-content {
        max-width: 1400px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .brand-section {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .brand-icon {
        position: relative;
      }

      .rotating-logo {
        font-size: 2.5rem;
        animation: rotate-logo 10s linear infinite;
        background: linear-gradient(45deg, #667eea, #764ba2);
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      @keyframes rotate-logo {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .brand-title {
        font-family: 'Playfair Display', serif;
        font-size: 1.8rem;
        font-weight: 800;
        margin: 0;
        background: linear-gradient(45deg, #ffffff, #e0e7ff);
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .brand-subtitle {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.7);
        margin: 0;
        font-weight: 500;
        letter-spacing: 2px;
        text-transform: uppercase;
      }

      .header-nav {
        display: flex;
        gap: 2rem;
        align-items: center;
      }

      .nav-link {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.8);
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        transition: all 0.3s ease;
        position: relative;
        text-decoration: none;
      }

      .nav-link:hover {
        color: white;
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-1px);
      }

      .nav-link.active {
        color: #60a5fa;
        background: rgba(96, 165, 250, 0.15);
        font-weight: 600;
      }

      .nav-link.active::after {
        content: '';
        position: absolute;
        bottom: -4px;
        left: 50%;
        transform: translateX(-50%);
        width: 30px;
        height: 2px;
        background: #60a5fa;
        border-radius: 1px;
      }

      /* Mobile Navigation */
      .mobile-menu-toggle {
        display: none;
        flex-direction: column;
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        gap: 4px;
      }

      .mobile-menu-toggle span {
        width: 25px;
        height: 3px;
        background: white;
        border-radius: 2px;
        transition: all 0.3s ease;
      }

      @media (max-width: 768px) {
        .header-nav {
          position: fixed;
          top: 100%;
          left: 0;
          width: 100%;
          background: rgba(0, 0, 0, 0.95);
          backdrop-filter: blur(20px);
          flex-direction: column;
          padding: 2rem;
          gap: 1rem;
          transform: translateY(-100%);
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          z-index: 999;
        }

        .header-nav.mobile-open {
          transform: translateY(0);
          opacity: 1;
          visibility: visible;
        }

        .mobile-menu-toggle {
          display: flex;
        }

        .nav-link {
          width: 100%;
          text-align: center;
          padding: 1rem;
          font-size: 1.1rem;
        }
      }

      /* Section spacing for better navigation */
      section {
        scroll-margin-top: 100px;
        padding: 4rem 0;
      }

      section:first-child {
        padding-top: 0;
      }

      .cta-button {
        background: linear-gradient(45deg, #667eea, #764ba2);
        color: white;
        padding: 0.8rem 2rem;
        border-radius: 50px;
        text-decoration: none;
        font-weight: 600;
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
      }

      .cta-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4);
      }

      .button-glow {
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
        transform: rotate(45deg);
        transition: all 0.6s ease;
      }

      .cta-button:hover .button-glow {
        animation: shine 1.5s ease-in-out;
      }

      @keyframes shine {
        0% { transform: rotate(45deg) translateX(-100%); }
        100% { transform: rotate(45deg) translateX(100%); }
      }

      .hero-premium {
        padding: clamp(6rem, 12vh, 8rem) clamp(1rem, 4vw, 2rem) 4rem;
        max-width: 1400px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: clamp(2rem, 6vw, 4rem);
        align-items: center;
        min-height: clamp(80vh, 90vh, 95vh);
      }

      .hero-content {
        space-y: 2rem;
      }

      .hero-badge {
        display: inline-block;
        background: rgba(102, 126, 234, 0.1);
        border: 1px solid rgba(102, 126, 234, 0.3);
        padding: 0.8rem 1.5rem;
        border-radius: 50px;
        margin-bottom: 2rem;
        animation: pulse-glow 3s ease-in-out infinite;
      }

      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.2); }
        50% { box-shadow: 0 0 40px rgba(102, 126, 234, 0.4); }
      }

      .badge-text {
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.9rem;
      }

      .hero-title {
        font-family: 'Playfair Display', serif;
        font-size: clamp(3rem, 6vw, 5rem);
        font-weight: 900;
        line-height: 1.1;
        margin: 2rem 0;
      }

      .title-line {
        display: block;
        animation: slide-up 1s ease-out forwards;
        opacity: 0;
        transform: translateY(50px);
      }

      .title-line:nth-child(1) { animation-delay: 0.2s; }
      .title-line:nth-child(2) { animation-delay: 0.4s; }
      .title-line:nth-child(3) { animation-delay: 0.6s; }

      @keyframes slide-up {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .gradient-text {
        background: linear-gradient(45deg, #667eea, #764ba2, #f093fb);
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-size: 200% 200%;
        animation: gradient-shift 3s ease-in-out infinite;
      }

      .hero-description {
        font-size: 1.3rem;
        line-height: 1.6;
        color: rgba(255, 255, 255, 0.8);
        margin: 2rem 0;
        font-weight: 400;
      }

      .hero-stats {
        display: flex;
        gap: 3rem;
        margin: 3rem 0;
      }

      .stat-item {
        text-align: center;
      }

      .stat-number {
        font-family: 'JetBrains Mono', monospace;
        font-size: 2.5rem;
        font-weight: 800;
        background: linear-gradient(45deg, #ffffff, #e0e7ff);
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .stat-label {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 500;
        margin-top: 0.5rem;
      }

      .hero-actions {
        display: flex;
        gap: 1.5rem;
        margin: 3rem 0;
        align-items: center;
      }

      .primary-cta {
        background: linear-gradient(45deg, #667eea, #764ba2);
        color: white;
        padding: 1.2rem 3rem;
        border-radius: 50px;
        text-decoration: none;
        font-weight: 700;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        transition: all 0.3s ease;
        box-shadow: 0 8px 30px rgba(102, 126, 234, 0.3);
        position: relative;
        overflow: hidden;
      }

      .primary-cta:hover {
        transform: translateY(-3px);
        box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
      }

      .cta-arrow {
        font-size: 1.2rem;
        transition: transform 0.3s ease;
      }

      .primary-cta:hover .cta-arrow {
        transform: translateX(5px);
      }

      .secondary-cta {
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.2);
        color: white;
        padding: 1.2rem 3rem;
        border-radius: 50px;
        font-weight: 600;
        font-size: 1.1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        backdrop-filter: blur(10px);
      }

      .secondary-cta:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
      }

      .pulse-ring {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.6);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        animation: pulse-ring-anim 2s ease-out infinite;
      }

      @keyframes pulse-ring-anim {
        0% {
          transform: translate(-50%, -50%) scale(0.1);
          opacity: 1;
        }
        100% {
          transform: translate(-50%, -50%) scale(2);
          opacity: 0;
        }
      }

      .hero-social-proof {
        margin-top: 3rem;
        text-align: center;
      }

      .hero-social-proof p {
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 1rem;
        font-size: 0.9rem;
      }

      .company-logos {
        display: flex;
        gap: clamp(1rem, 3vw, 2rem);
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
        margin-top: 1rem;
      }

      .logo {
        font-size: clamp(1.8rem, 4vw, 2.2rem);
        opacity: 0.6;
        transition: all 0.3s ease;
        padding: 0.5rem;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        cursor: pointer;
      }

      .logo:hover {
        opacity: 1;
        transform: scale(1.2);
        background: rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 20px rgba(255, 255, 255, 0.1);
      }

      .hero-visual {
        position: relative;
        height: 600px;
      }

      .visual-container {
        position: relative;
        width: 100%;
        height: 100%;
      }

      .floating-cards {
        position: absolute;
        width: 100%;
        height: 100%;
      }

      .floating-card {
        position: absolute;
        width: 250px;
        padding: 1.5rem;
        border-radius: 20px;
        color: white;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        animation: float-card 6s ease-in-out infinite;
      }

      .floating-card:nth-child(1) {
        top: 10%;
        right: 10%;
        animation-delay: 0s;
      }

      .floating-card:nth-child(2) {
        top: 40%;
        left: 0%;
        animation-delay: 2s;
      }

      .floating-card:nth-child(3) {
        bottom: 10%;
        right: 20%;
        animation-delay: 4s;
      }

      @keyframes float-card {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(2deg); }
      }

      .card-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }

      .card-title {
        font-weight: 700;
        font-size: 1.1rem;
        margin-bottom: 0.5rem;
      }

      .card-stat {
        font-family: 'JetBrains Mono', monospace;
        font-weight: 600;
        opacity: 0.9;
      }

      .systems-showcase {
        padding: clamp(4rem, 8vh, 6rem) clamp(1rem, 4vw, 2rem);
        max-width: 1400px;
        margin: 0 auto;
      }

      .section-header {
        text-align: center;
        margin-bottom: 4rem;
      }

      .section-title {
        font-family: 'Playfair Display', serif;
        font-size: clamp(2.5rem, 5vw, 4rem);
        font-weight: 800;
        margin-bottom: 1rem;
        background: linear-gradient(45deg, #ffffff, #e0e7ff);
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .section-subtitle {
        font-size: 1.3rem;
        color: rgba(255, 255, 255, 0.7);
        max-width: 600px;
        margin: 0 auto;
      }

      .carousel-container {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: clamp(2rem, 4vw, 3rem);
        align-items: start;
      }

      @media (max-width: 1024px) {
        .carousel-container {
          grid-template-columns: 1fr;
          gap: 2rem;
        }
      }

      .system-card-large {
        padding: 3rem;
        border-radius: 30px;
        position: relative;
        overflow: hidden;
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .system-content {
        position: relative;
        z-index: 2;
      }

      .system-icon-large {
        font-size: 4rem;
        margin-bottom: 2rem;
      }

      .system-title {
        font-family: 'Playfair Display', serif;
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 1rem;
        color: white;
      }

      .system-description {
        font-size: 1.2rem;
        color: rgba(255, 255, 255, 0.9);
        line-height: 1.6;
        margin-bottom: 2rem;
      }

      .system-stat {
        font-family: 'JetBrains Mono', monospace;
        font-size: 1.1rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
        background: rgba(255, 255, 255, 0.1);
        padding: 0.8rem 1.5rem;
        border-radius: 50px;
        display: inline-block;
      }

      .systems-grid {
        display: grid;
        gap: 1rem;
      }

      .system-thumbnail {
        padding: 1.5rem;
        border-radius: 15px;
        border: 2px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: center;
      }

      .system-thumbnail:hover,
      .system-thumbnail.active {
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }

      .thumbnail-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }

      .thumbnail-title {
        font-weight: 600;
        font-size: 0.9rem;
      }

      .plans-section {
        padding: clamp(4rem, 8vh, 6rem) clamp(1rem, 4vw, 2rem);
        max-width: 1400px;
        margin: 0 auto;
        background: rgba(255, 255, 255, 0.02);
        border-radius: clamp(15px, 3vw, 30px);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .plans-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
        gap: clamp(1.5rem, 3vw, 2rem);
        margin-top: clamp(2rem, 6vh, 4rem);
      }

      .plan-card {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 25px;
        padding: 2.5rem;
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
        animation: fadeInUp 0.6s ease-out forwards;
        opacity: 0;
        transform: translateY(50px);
      }

      @keyframes fadeInUp {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .plan-card:hover {
        transform: translateY(-8px);
        border-color: rgba(255, 255, 255, 0.2);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      }

      .plan-card.popular {
        border-color: #3b82f6;
        box-shadow: 0 0 40px rgba(59, 130, 246, 0.3);
      }

      .popular-badge {
        position: absolute;
        top: -1px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(45deg, #f59e0b, #ef4444);
        color: white;
        padding: 0.5rem 2rem;
        border-radius: 0 0 20px 20px;
        font-weight: 700;
        font-size: 0.9rem;
        animation: pulse-badge 2s ease-in-out infinite;
      }

      @keyframes pulse-badge {
        0%, 100% { transform: translateX(-50%) scale(1); }
        50% { transform: translateX(-50%) scale(1.05); }
      }

      .plan-header {
        text-align: center;
        margin-bottom: 2rem;
      }

      .plan-icon {
        width: 80px;
        height: 80px;
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        margin: 0 auto 1.5rem;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
      }

      .plan-name {
        font-family: 'Playfair Display', serif;
        font-size: 1.8rem;
        font-weight: 700;
        margin-bottom: 1rem;
        color: white;
      }

      .plan-description {
        color: rgba(255, 255, 255, 0.8);
        font-size: 1rem;
        line-height: 1.5;
      }

      .plan-pricing {
        text-align: center;
        margin: 2rem 0;
      }

      .price-container {
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 0.5rem;
      }

      .currency {
        font-size: 1.5rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
      }

      .price {
        font-family: 'JetBrains Mono', monospace;
        font-size: 3rem;
        font-weight: 800;
        color: white;
      }

      .period {
        font-size: 1.2rem;
        color: rgba(255, 255, 255, 0.6);
      }

      .plan-features {
        margin: 2rem 0;
      }

      .feature-item {
        display: flex;
        align-items: center;
        padding: 0.75rem 0;
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.95rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .feature-item:last-child {
        border-bottom: none;
      }

      .plan-action {
        margin-top: 2rem;
      }

      .plan-button {
        width: 100%;
        padding: 1.2rem 2rem;
        border-radius: 50px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        color: white;
        font-weight: 700;
        font-size: 1.1rem;
        text-decoration: none;
        display: block;
        text-align: center;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .plan-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      }

      .plan-button.popular {
        color: white;
        border-color: transparent;
      }

      .plans-guarantee {
        margin-top: 4rem;
        text-align: center;
      }

      .guarantee-content {
        display: inline-flex;
        align-items: center;
        gap: 1rem;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.3);
        padding: 1.5rem 2rem;
        border-radius: 50px;
      }

      .guarantee-icon {
        font-size: 2rem;
      }

      .guarantee-text h4 {
        color: white;
        margin: 0 0 0.5rem 0;
        font-weight: 700;
      }

      .guarantee-text p {
        color: rgba(255, 255, 255, 0.8);
        margin: 0;
      }

      .features-premium {
        padding: clamp(4rem, 8vh, 6rem) clamp(1rem, 4vw, 2rem);
        max-width: 1400px;
        margin: 0 auto;
      }

      .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
        gap: clamp(1.5rem, 3vw, 2rem);
        margin-top: clamp(2rem, 6vh, 4rem);
      }

      .feature-card-premium {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 25px;
        padding: 2.5rem;
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
      }

      .feature-card-premium:hover {
        transform: translateY(-8px);
        border-color: rgba(255, 255, 255, 0.2);
      }

      .feature-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }

      .feature-icon-container {
        width: 60px;
        height: 60px;
        border-radius: 15px;
        background: linear-gradient(45deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .feature-icon {
        font-size: 2rem;
      }

      .feature-metric {
        font-family: 'JetBrains Mono', monospace;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.7);
        font-size: 0.9rem;
      }

      .feature-title {
        font-family: 'Playfair Display', serif;
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 1rem;
        color: white;
      }

      .feature-description {
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.6;
        font-size: 1rem;
      }

      .feature-glow {
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%);
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .feature-card-premium:hover .feature-glow {
        opacity: 1;
      }

      .cta-premium {
        padding: clamp(4rem, 8vh, 6rem) clamp(1rem, 4vw, 2rem);
        text-align: center;
        background: rgba(255, 255, 255, 0.02);
        backdrop-filter: blur(30px);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .cta-content {
        max-width: 800px;
        margin: 0 auto;
      }

      .cta-title {
        font-family: 'Playfair Display', serif;
        font-size: clamp(2.5rem, 5vw, 4rem);
        font-weight: 800;
        margin-bottom: 1.5rem;
        background: linear-gradient(45deg, #ffffff, #e0e7ff);
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .cta-description {
        font-size: 1.3rem;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 3rem;
      }

      .cta-button-large {
        background: linear-gradient(45deg, #667eea, #764ba2);
        color: white;
        padding: 1.5rem 4rem;
        border-radius: 50px;
        text-decoration: none;
        font-weight: 700;
        font-size: 1.3rem;
        display: inline-block;
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
        box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
      }

      .cta-button-large:hover {
        transform: translateY(-3px);
        box-shadow: 0 20px 60px rgba(102, 126, 234, 0.4);
      }

      .button-shine {
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.2), transparent);
        transform: rotate(45deg) translateX(-100%);
        transition: transform 0.6s ease;
      }

      .cta-button-large:hover .button-shine {
        transform: rotate(45deg) translateX(100%);
      }

      .cta-guarantee {
        margin-top: 2rem;
        color: rgba(255, 255, 255, 0.7);
        font-size: 1rem;
      }

      .loading-premium {
        text-align: center;
      }

      .spinner-premium {
        width: 60px;
        height: 60px;
        border: 4px solid rgba(255, 255, 255, 0.1);
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin-premium 1s linear infinite;
      }

      @keyframes spin-premium {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .preview-screen {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1rem;
        margin-top: 2rem;
        height: 150px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .chart-bars {
        display: flex;
        gap: 8px;
        align-items: end;
        height: 80px;
      }

      .bar {
        width: 20px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        animation: bar-grow 2s ease-in-out infinite;
      }

      @keyframes bar-grow {
        0%, 100% { transform: scaleY(1); }
        50% { transform: scaleY(1.2); }
      }

      /* Enhanced Responsive Design */
      @media (max-width: 1200px) {
        .hero-premium {
          gap: 3rem;
        }

        .system-card-large {
          padding: 2rem;
        }
      }

      @media (max-width: 1024px) {
        .hero-premium {
          grid-template-columns: 1fr;
          text-align: center;
          gap: clamp(2rem, 4vh, 3rem);
          padding: clamp(4rem, 8vh, 6rem) clamp(1rem, 4vw, 2rem) 2rem;
          min-height: auto;
        }

        .hero-visual {
          height: clamp(300px, 50vh, 500px);
        }

        .floating-card {
          width: clamp(200px, 45vw, 250px);
          padding: 1rem;
        }

        .carousel-container {
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        .features-grid {
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        }

        .footer-content {
          grid-template-columns: 1fr;
          text-align: center;
        }

        .footer-links {
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 2rem;
        }

        .plans-grid {
          grid-template-columns: 1fr;
        }

        .systems-grid {
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        }
      }

      @media (max-width: 768px) {
        .premium-header {
          padding: clamp(0.75rem, 2vw, 1rem);
        }

        .header-content {
          flex-wrap: wrap;
          gap: clamp(0.5rem, 2vw, 1rem);
        }

        .brand-section {
          gap: 0.75rem;
        }

        .brand-title {
          font-size: clamp(1.2rem, 4vw, 1.6rem);
        }

        .hero-premium {
          padding: clamp(4rem, 10vh, 6rem) clamp(1rem, 4vw, 1.5rem) 2rem;
          min-height: clamp(70vh, 80vh, 85vh);
        }

        .hero-stats {
          flex-direction: column;
          gap: clamp(1rem, 3vh, 1.5rem);
        }

        .hero-actions {
          flex-direction: column;
          width: 100%;
          align-items: stretch;
        }

        .primary-cta,
        .secondary-cta {
          width: 100%;
          justify-content: center;
          padding: clamp(1rem, 3vw, 1.2rem) clamp(2rem, 6vw, 3rem);
        }

        .systems-showcase,
        .features-premium,
        .cta-premium,
        .plans-section {
          padding: clamp(3rem, 6vh, 4rem) clamp(1rem, 4vw, 1.5rem);
        }

        .section-title {
          font-size: clamp(2rem, 6vw, 3rem);
        }

        .section-subtitle {
          font-size: clamp(1rem, 3vw, 1.2rem);
        }

        .guarantee-content {
          flex-direction: column;
          text-align: center;
          padding: 1rem;
        }

        .plan-card {
          padding: clamp(1.5rem, 4vw, 2rem);
        }

        .floating-card {
          width: clamp(180px, 40vw, 220px);
          padding: 0.8rem;
        }

        .card-title {
          font-size: 0.9rem;
        }

        .system-card-large {
          padding: clamp(1.5rem, 4vw, 2rem);
        }

        .system-title {
          font-size: clamp(1.5rem, 5vw, 2rem);
        }
      }

      @media (max-width: 480px) {
        .hero-premium {
          padding: clamp(3rem, 8vh, 4rem) clamp(0.75rem, 3vw, 1rem) 1.5rem;
        }

        .hero-title {
          font-size: clamp(2rem, 8vw, 3rem);
          line-height: 1.2;
        }

        .hero-description {
          font-size: clamp(1rem, 3vw, 1.2rem);
        }

        .stat-number {
          font-size: clamp(1.8rem, 6vw, 2.2rem);
        }

        .plans-grid {
          gap: 1rem;
        }

        .plan-card {
          padding: 1.2rem;
        }

        .features-grid {
          gap: 1rem;
        }

        .feature-card-premium {
          padding: 1.5rem;
        }

        .brand-section {
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.5rem;
        }

        .rotating-logo {
          font-size: 2rem;
        }

        .nav-link {
          padding: 0.8rem 1.2rem;
          font-size: 0.95rem;
        }

        .system-thumbnail {
          padding: 1rem;
        }

        .thumbnail-icon {
          font-size: 1.5rem;
        }

        .cta-button-large {
          padding: 1.2rem 2.5rem;
          font-size: 1.1rem;
        }
      }

      @media (max-width: 360px) {
        .premium-header {
          padding: 0.5rem;
        }

        .hero-premium {
          padding: clamp(2.5rem, 6vh, 3rem) 0.75rem 1rem;
        }

        .hero-actions {
          gap: 0.75rem;
        }

        .systems-showcase,
        .features-premium,
        .cta-premium,
        .plans-section {
          padding: clamp(2rem, 4vh, 3rem) 0.75rem;
        }

        .floating-card {
          width: clamp(160px, 45vw, 180px);
          padding: 0.6rem;
        }
      }

      /* Improved scrolling behavior */
      html {
        scroll-behavior: smooth;
        scroll-padding-top: 100px;
      }

      @media (prefers-reduced-motion: reduce) {
        html {
          scroll-behavior: auto;
        }

        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* Better touch targets for mobile */
      @media (pointer: coarse) {
        .nav-link,
        .cta-button,
        .plan-button,
        .system-thumbnail {
          min-height: 44px;
          min-width: 44px;
        }
      }

      /* Navigation Dots */
      .navigation-dots {
        position: fixed;
        right: 30px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 15px;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.2);
        padding: 20px 8px;
        border-radius: 25px;
        backdrop-filter: blur(10px);
      }

      .nav-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.4);
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
      }

      .nav-dot:hover {
        background: rgba(255, 255, 255, 0.7);
        transform: scale(1.2);
      }

      .nav-dot.active {
        background: #3b82f6;
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        transform: scale(1.3);
      }

      .nav-dot::before {
        content: attr(data-label);
        position: absolute;
        right: 25px;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 0.8rem;
        font-weight: 600;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        pointer-events: none;
      }

      .nav-dot:hover::before {
        opacity: 1;
        visibility: visible;
        transform: translateY(-50%) translateX(-5px);
      }

      /* Section Indicators */
      .section-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 40px 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        opacity: 0.6;
      }

      .section-indicator:hover {
        opacity: 1;
        transform: translateY(-5px);
      }

      .section-indicator span {
        color: rgba(255, 255, 255, 0.8);
        font-weight: 500;
        font-size: 0.9rem;
        letter-spacing: 1px;
        text-transform: uppercase;
      }

      .scroll-arrow {
        font-size: 1.5rem;
        animation: bounce-arrow 2s ease-in-out infinite;
        color: #3b82f6;
      }

      @keyframes bounce-arrow {
        0%, 20%, 50%, 80%, 100% {
          transform: translateY(0);
        }
        40% {
          transform: translateY(-10px);
        }
        60% {
          transform: translateY(-5px);
        }
      }

      /* Enhanced Mobile Navigation Dots */
      @media (max-width: 768px) {
        .navigation-dots {
          right: 15px;
          padding: 15px 6px;
          gap: 12px;
        }

        .nav-dot {
          width: 10px;
          height: 10px;
        }

        .nav-dot::before {
          font-size: 0.75rem;
          padding: 6px 10px;
        }

        .section-indicator {
          padding: 30px 15px;
        }

        .section-indicator span {
          font-size: 0.8rem;
        }

        .scroll-arrow {
          font-size: 1.2rem;
        }
      }

      /* Smooth scrolling enhancements */
      .premium-container {
        overflow-x: hidden;
        scroll-behavior: smooth;
      }

      .section-header,
      .cta-content {
        max-width: min(800px, 90vw);
        margin-left: auto;
        margin-right: auto;
      }

      /* Better section transitions */
      section {
        position: relative;
        transition: all 0.3s ease;
      }

      section::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
      }
    `}</style>
  );
}