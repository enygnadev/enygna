
'use client';

import { useState } from 'react';

interface Sistema {
  id: string;
  nome: string;
  icon: string;
  descricao: string;
}

interface EmpresaSistemasModalProps {
  empresa: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSistemas: (empresaId: string, sistemas: string[]) => void;
}

const sistemasDisponiveis: Sistema[] = [
  { id: 'ponto', nome: 'Sistema de Ponto', icon: '🕒', descricao: 'Controle de ponto eletrônico' },
  { id: 'chamados', nome: 'Sistema de Chamados', icon: '🎫', descricao: 'Help desk e suporte técnico' },
  { id: 'frota', nome: 'Sistema de Frota', icon: '🚗', descricao: 'Gestão de veículos e rastreamento' },
  { id: 'financeiro', nome: 'Sistema Financeiro', icon: '💰', descricao: 'Contabilidade e documentos fiscais' },
  { id: 'documentos', nome: 'Sistema de Documentos', icon: '📁', descricao: 'Gestão documental' },
  { id: 'vendas', nome: 'Sistema de Vendas', icon: '💼', descricao: 'CRM e gestão comercial' },
  { id: 'estoque', nome: 'Controle de Estoque', icon: '📦', descricao: 'Gestão de inventário' },
  { id: 'rh', nome: 'Recursos Humanos', icon: '👥', descricao: 'Gestão de pessoas' }
];

export default function EmpresaSistemasModal({ 
  empresa, 
  isOpen, 
  onClose, 
  onUpdateSistemas 
}: EmpresaSistemasModalProps) {
  const [selectedSistemas, setSelectedSistemas] = useState<string[]>(empresa?.sistemasAtivos || []);

  if (!isOpen || !empresa) return null;

  const handleSistemaToggle = (sistemaId: string) => {
    setSelectedSistemas(prev => 
      prev.includes(sistemaId)
        ? prev.filter(id => id !== sistemaId)
        : [...prev, sistemaId]
    );
  };

  const handleSave = () => {
    onUpdateSistemas(empresa.id, selectedSistemas);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(10px)',
      padding: 'clamp(0.5rem, 2vw, 1rem)'
    }}>
      <div style={{
        background: '#1a1a1a',
        padding: 'clamp(1rem, 4vw, 2rem)',
        borderRadius: 'clamp(12px, 3vw, 16px)',
        width: 'min(95vw, 800px)',
        maxHeight: '90vh',
        overflowY: 'auto',
        color: 'white',
        position: 'relative',
        zIndex: 10000,
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
      }}>
        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
          🎯 Sistemas Ativos - {empresa.nome}
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: 'clamp(0.75rem, 2vw, 1rem)',
          marginBottom: 'clamp(1rem, 3vw, 2rem)'
        }}>
          {sistemasDisponiveis.map(sistema => {
            const isActive = selectedSistemas.includes(sistema.id);
            return (
              <label
                key={sistema.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  background: isActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.1)',
                  border: '2px solid ' + (isActive ? '#3b82f6' : 'rgba(255,255,255,0.2)'),
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => handleSistemaToggle(sistema.id)}
                  style={{ 
                    width: '20px', 
                    height: '20px',
                    accentColor: '#3b82f6'
                  }}
                />
                <span style={{ fontSize: '2rem' }}>{sistema.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                    {sistema.nome}
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                    {sistema.descricao}
                  </div>
                </div>
                {isActive && (
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: '#10b981',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}>
                    ✅ ATIVO
                  </span>
                )}
              </label>
            );
          })}
        </div>

        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '2rem'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#93c5fd' }}>
            📊 Resumo da Configuração
          </h4>
          <p style={{ margin: '0', fontSize: '0.9rem', opacity: 0.9 }}>
            <strong>{selectedSistemas.length}</strong> de <strong>{sistemasDisponiveis.length}</strong> sistemas selecionados
          </p>
          {selectedSistemas.length > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
              <strong>Sistemas ativos:</strong> {selectedSistemas.map(id => {
                const sistema = sistemasDisponiveis.find(s => s.id === id);
                return sistema ? `${sistema.icon} ${sistema.nome}` : id;
              }).join(', ')}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(107, 114, 128, 0.8)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            ❌ Cancelar
          </button>
          
          <button
            onClick={handleSave}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(45deg, #3b82f6, #1e40af)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '700'
            }}
          >
            💾 Salvar Configuração
          </button>
        </div>
      </div>
    </div>
  );
}
