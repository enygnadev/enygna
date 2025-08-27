
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import SystemStatus from '@/src/components/SystemStatus';

export default function StatusPage() {
  const [reportForm, setReportForm] = useState({
    title: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    affectedSystems: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);

  const systemOptions = [
    'Sistema de Ponto',
    'Chamados TI',
    'Email',
    'Rede',
    'Internet',
    'Telefonia',
    'Impressoras',
    'Servidores',
    'Banco de Dados',
    'Backup',
    'Outros'
  ];

  const handleSystemToggle = (system: string) => {
    setReportForm(prev => ({
      ...prev,
      affectedSystems: prev.affectedSystems.includes(system)
        ? prev.affectedSystems.filter(s => s !== system)
        : [...prev.affectedSystems, system]
    }));
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportForm.title.trim() || !reportForm.description.trim() || reportForm.affectedSystems.length === 0) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'system_status'), {
        title: reportForm.title.trim(),
        description: reportForm.description.trim(),
        severity: reportForm.severity,
        status: 'investigating',
        affectedSystems: reportForm.affectedSystems,
        createdAt: Date.now(),
        reportedBy: 'usuario' // TODO: usar dados do usuário logado
      });

      // Limpar formulário
      setReportForm({
        title: '',
        description: '',
        severity: 'medium',
        affectedSystems: []
      });
      setShowReportForm(false);
      alert('Problema reportado com sucesso! Nossa equipe foi notificada.');

    } catch (error) {
      console.error('Erro ao reportar problema:', error);
      alert('Erro ao reportar problema. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ minHeight: '100vh', padding: 'var(--gap-xl)' }}>
      {/* Header */}
      <div style={{ 
        marginBottom: 'var(--gap-xl)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 'var(--gap-md)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-md)', marginBottom: 'var(--gap-sm)' }}>
            <Link 
              href="/" 
              className="button button-ghost"
              style={{ padding: '6px 12px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Voltar
            </Link>
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
            Status dos Sistemas TI
          </h1>
          <p style={{ 
            margin: '4px 0 0 0', 
            color: 'var(--color-text-secondary)',
            fontSize: '0.9rem'
          }}>
            Monitore o status em tempo real dos nossos sistemas
          </p>
        </div>

        <button
          onClick={() => setShowReportForm(!showReportForm)}
          className="button button-primary"
        >
          🚨 Reportar Problema
        </button>
      </div>

      {/* Formulário de Reporte */}
      {showReportForm && (
        <div className="card" style={{ 
          marginBottom: 'var(--gap-xl)',
          border: '2px solid var(--color-primary)'
        }}>
          <h3 style={{ margin: '0 0 var(--gap-lg) 0', color: 'var(--color-primary)' }}>
            🚨 Reportar Problema do Sistema
          </h3>
          
          <form onSubmit={handleSubmitReport}>
            <div style={{ marginBottom: 'var(--gap-md)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--gap-sm)', fontWeight: '600' }}>
                Título do Problema *
              </label>
              <input
                type="text"
                value={reportForm.title}
                onChange={(e) => setReportForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Sistema de ponto indisponível"
                className="input"
                style={{ width: '100%' }}
                required
              />
            </div>

            <div style={{ marginBottom: 'var(--gap-md)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--gap-sm)', fontWeight: '600' }}>
                Descrição do Problema *
              </label>
              <textarea
                value={reportForm.description}
                onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o problema que você está enfrentando..."
                className="input"
                rows={4}
                style={{ width: '100%' }}
                required
              />
            </div>

            <div style={{ marginBottom: 'var(--gap-md)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--gap-sm)', fontWeight: '600' }}>
                Severidade
              </label>
              <select
                value={reportForm.severity}
                onChange={(e) => setReportForm(prev => ({ ...prev, severity: e.target.value as any }))}
                className="input"
                style={{ width: '100%' }}
              >
                <option value="low">Baixa - Inconveniência menor</option>
                <option value="medium">Média - Afeta alguns usuários</option>
                <option value="high">Alta - Afeta muitos usuários</option>
                <option value="critical">Crítica - Sistema completamente indisponível</option>
              </select>
            </div>

            <div style={{ marginBottom: 'var(--gap-lg)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--gap-sm)', fontWeight: '600' }}>
                Sistemas Afetados *
              </label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: 'var(--gap-sm)' 
              }}>
                {systemOptions.map(system => (
                  <label
                    key={system}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--gap-sm)',
                      padding: 'var(--gap-sm)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      backgroundColor: reportForm.affectedSystems.includes(system) 
                        ? 'var(--color-primary)20' 
                        : 'transparent'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={reportForm.affectedSystems.includes(system)}
                      onChange={() => handleSystemToggle(system)}
                    />
                    <span style={{ fontSize: '0.9rem' }}>{system}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--gap-sm)' }}>
              <button
                type="submit"
                className="button button-primary"
                disabled={submitting}
              >
                {submitting ? 'Enviando...' : 'Reportar Problema'}
              </button>
              <button
                type="button"
                onClick={() => setShowReportForm(false)}
                className="button button-ghost"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status do Sistema */}
      <SystemStatus />

      {/* Informações de Contato */}
      <div className="card" style={{ marginTop: 'var(--gap-xl)' }}>
        <h3 style={{ margin: '0 0 var(--gap-md) 0' }}>📞 Precisa de Ajuda Urgente?</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: 'var(--gap-md)' 
        }}>
          <div style={{ textAlign: 'center', padding: 'var(--gap-md)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--gap-sm)' }}>🎫</div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Abrir Chamado</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--gap-sm)' }}>
              Para problemas não urgentes
            </div>
            <Link href="/chamados/novo" className="button button-outline">
              Criar Chamado
            </Link>
          </div>
          
          <div style={{ textAlign: 'center', padding: 'var(--gap-md)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--gap-sm)' }}>📞</div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Suporte Telefônico</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--gap-sm)' }}>
              Para emergências críticas
            </div>
            <div style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
              (11) 9999-9999
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: 'var(--gap-md)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--gap-sm)' }}>📧</div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Email</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--gap-sm)' }}>
              Para dúvidas gerais
            </div>
            <div style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
              suporte@empresa.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
