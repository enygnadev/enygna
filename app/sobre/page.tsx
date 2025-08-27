
'use client';

import Link from 'next/link';

export default function SobrePage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #2d1b69 50%, #1a1a3e 75%, #0f0f23 100%)',
      color: 'white',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <Link href="/" style={{ 
            color: '#60a5fa', 
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '2rem'
          }}>
            ← Voltar ao Início
          </Link>
          <h1 style={{ 
            fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
            marginBottom: '1rem',
            background: 'linear-gradient(45deg, #ffffff, #e0e7ff)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Nossa História
          </h1>
          <p style={{ fontSize: '1.3rem', opacity: 0.8 }}>
            Mais de 50 anos transformando a gestão empresarial
          </p>
        </header>

        <div style={{ display: 'grid', gap: '3rem' }}>
          <section style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '2rem',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏢 ENY-GNA Lab</h2>
            <p style={{ lineHeight: 1.6, fontSize: '1.1rem' }}>
              A ENY-GNA (Global Network Architecture) Lab nasceu da visão de revolucionar 
              a gestão empresarial através da tecnologia. Com mais de 50 anos de experiência 
              combinada de nossos fundadores, desenvolvemos soluções que transformam a forma 
              como as empresas operam.
            </p>
          </section>

          <section style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '2rem',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎯 Nossa Missão</h2>
            <p style={{ lineHeight: 1.6, fontSize: '1.1rem' }}>
              Democratizar o acesso a sistemas empresariais de classe mundial, 
              oferecendo soluções integradas que aumentam a produtividade, 
              reduzem custos e impulsionam o crescimento dos nossos clientes.
            </p>
          </section>

          <section style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '2rem',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>📊 Nossos Números</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#60a5fa' }}>50K+</div>
                <div>Empresas Atendidas</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#10b981' }}>99.9%</div>
                <div>Uptime Garantido</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#f59e0b' }}>24/7</div>
                <div>Suporte Premium</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ef4444' }}>6</div>
                <div>Sistemas Integrados</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
