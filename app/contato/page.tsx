
'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ContatoPage() {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    empresa: '',
    telefone: '',
    assunto: '',
    mensagem: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui você implementaria o envio do formulário
    alert('Mensagem enviada! Retornaremos em breve.');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #2d1b69 50%, #1a1a3e 75%, #0f0f23 100%)',
      color: 'white',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
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
            Fale Conosco
          </h1>
          <p style={{ fontSize: '1.3rem', opacity: 0.8 }}>
            Estamos aqui para ajudar sua empresa a crescer
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }}>
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>📞 Informações de Contato</h2>
            
            <div style={{ display: 'grid', gap: '2rem' }}>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '1.5rem',
                borderRadius: '15px',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>🏢 Vendas</h3>
                <p>vendas@enygna.com</p>
                <p>(11) 9999-9999</p>
              </div>

              <div style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '1.5rem',
                borderRadius: '15px',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>🛠️ Suporte Técnico</h3>
                <p>suporte@enygna.com</p>
                <p>(11) 8888-8888</p>
              </div>

              <div style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '1.5rem',
                borderRadius: '15px',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>📍 Endereço</h3>
                <p>São Paulo - SP, Brasil</p>
                <p>Atendimento Nacional</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '2rem',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>✉️ Envie sua Mensagem</h2>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Nome completo"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem'
                }}
                required
              />
              
              <input
                type="email"
                placeholder="E-mail"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem'
                }}
                required
              />
              
              <input
                type="text"
                placeholder="Empresa"
                value={formData.empresa}
                onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
              
              <input
                type="tel"
                placeholder="Telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
              
              <select
                value={formData.assunto}
                onChange={(e) => setFormData({...formData, assunto: e.target.value})}
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem'
                }}
                required
              >
                <option value="">Selecione o assunto</option>
                <option value="vendas">Vendas e Planos</option>
                <option value="suporte">Suporte Técnico</option>
                <option value="parceria">Parcerias</option>
                <option value="outro">Outro</option>
              </select>
              
              <textarea
                placeholder="Sua mensagem"
                value={formData.mensagem}
                onChange={(e) => setFormData({...formData, mensagem: e.target.value})}
                rows={5}
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
                required
              />
              
              <button
                type="submit"
                style={{
                  padding: '1rem 2rem',
                  borderRadius: '50px',
                  border: 'none',
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  marginTop: '1rem'
                }}
              >
                Enviar Mensagem 📤
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
