
'use client';

import React, { useState } from 'react';
import { Ticket, TicketAnalysis, IMPACTO_OPTIONS, URGENCIA_OPTIONS, CATEGORIAS_PADRAO } from '@/src/types/ticket';
import MarkdownView from './MarkdownView';

interface TicketFormProps {
  initialData?: Partial<Ticket>;
  onSubmit: (ticket: Omit<Ticket, 'id'>) => Promise<void>;
  onAnalyze?: (data: any) => Promise<{ markdown: string; json: TicketAnalysis }>;
  loading?: boolean;
  mode?: 'create' | 'edit';
}

export default function TicketForm({ 
  initialData = {}, 
  onSubmit, 
  onAnalyze,
  loading = false,
  mode = 'create'
}: TicketFormProps) {
  const [formData, setFormData] = useState({
    assunto: initialData.assunto || '',
    descricao: initialData.descricao || '',
    produto: initialData.produto || '',
    ambiente: initialData.ambiente || '',
    impacto: initialData.impacto || '',
    urgencia: initialData.urgencia || '',
    anexos: initialData.anexos || ''
  });

  const [analysis, setAnalysis] = useState<{
    markdown: string;
    json: TicketAnalysis;
  } | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.assunto.trim()) {
      newErrors.assunto = 'Assunto é obrigatório';
    } else if (formData.assunto.length < 5) {
      newErrors.assunto = 'Assunto deve ter pelo menos 5 caracteres';
    }

    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    } else if (formData.descricao.length < 20) {
      newErrors.descricao = 'Descrição deve ter pelo menos 20 caracteres';
    } else if (formData.descricao.length > 10000) {
      newErrors.descricao = 'Descrição muito longa (máximo 10.000 caracteres)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAnalyze = async () => {
    if (!validateForm() || !onAnalyze) return;

    setAnalyzing(true);
    try {
      const result = await onAnalyze(formData);
      setAnalysis(result);
    } catch (error) {
      console.error('Erro na análise:', error);
      alert('Erro ao analisar o chamado. Tente novamente.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const ticketData: Omit<Ticket, 'id'> = {
        assunto: formData.assunto.trim(),
        descricao: formData.descricao.trim(),
        produto: formData.produto.trim() || undefined,
        ambiente: formData.ambiente.trim() || undefined,
        impacto: formData.impacto as any || undefined,
        urgencia: formData.urgencia as any || undefined,
        anexos: formData.anexos.trim() || undefined,
        status: initialData.status || 'aberto',
        createdAt: initialData.createdAt || Date.now(),
        analysis: analysis?.json || initialData.analysis
      };

      await onSubmit(ticketData);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar o chamado. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--gap-xl)' }}>
        {/* Formulário */}
        <div style={{ flex: 1, minWidth: '400px' }}>
          <div className="card">
            <h2 style={{ marginBottom: 'var(--gap-lg)' }}>
              {mode === 'create' ? 'Novo Chamado' : 'Editar Chamado'}
            </h2>

            {/* Assunto */}
            <div style={{ marginBottom: 'var(--gap-md)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--gap-sm)', fontWeight: '600' }}>
                Assunto *
              </label>
              <input
                type="text"
                value={formData.assunto}
                onChange={(e) => handleInputChange('assunto', e.target.value)}
                placeholder="Descreva brevemente o problema"
                className={`input ${errors.assunto ? 'input-error' : ''}`}
                maxLength={200}
                disabled={loading}
                style={{ width: '100%' }}
              />
              {errors.assunto && (
                <span style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>
                  {errors.assunto}
                </span>
              )}
            </div>

            {/* Descrição */}
            <div style={{ marginBottom: 'var(--gap-md)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--gap-sm)', fontWeight: '600' }}>
                Descrição Detalhada *
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                placeholder="Descreva o problema detalhadamente: o que aconteceu, quando, onde, como reproduzir..."
                className={`input ${errors.descricao ? 'input-error' : ''}`}
                rows={6}
                maxLength={10000}
                disabled={loading}
                style={{ width: '100%', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                {errors.descricao && (
                  <span style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>
                    {errors.descricao}
                  </span>
                )}
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                  {formData.descricao.length}/10.000
                </span>
              </div>
            </div>

            {/* Linha com campos menores */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--gap-md)', marginBottom: 'var(--gap-md)' }}>
              {/* Impacto */}
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--gap-sm)', fontWeight: '600' }}>
                  Impacto
                </label>
                <select
                  value={formData.impacto}
                  onChange={(e) => handleInputChange('impacto', e.target.value)}
                  className="input"
                  disabled={loading}
                  style={{ width: '100%' }}
                >
                  <option value="">Selecione...</option>
                  {IMPACTO_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {/* Urgência */}
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--gap-sm)', fontWeight: '600' }}>
                  Urgência
                </label>
                <select
                  value={formData.urgencia}
                  onChange={(e) => handleInputChange('urgencia', e.target.value)}
                  className="input"
                  disabled={loading}
                  style={{ width: '100%' }}
                >
                  <option value="">Selecione...</option>
                  {URGENCIA_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Produto/Sistema */}
            <div style={{ marginBottom: 'var(--gap-md)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--gap-sm)', fontWeight: '600' }}>
                Produto/Sistema
              </label>
              <input
                type="text"
                value={formData.produto}
                onChange={(e) => handleInputChange('produto', e.target.value)}
                placeholder="Ex: Windows 11, Office 365, SAP, etc."
                className="input"
                maxLength={100}
                disabled={loading}
                style={{ width: '100%' }}
              />
            </div>

            {/* Ambiente */}
            <div style={{ marginBottom: 'var(--gap-md)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--gap-sm)', fontWeight: '600' }}>
                Ambiente
              </label>
              <select
                value={formData.ambiente}
                onChange={(e) => handleInputChange('ambiente', e.target.value)}
                className="input"
                disabled={loading}
                style={{ width: '100%' }}
              >
                <option value="">Selecione...</option>
                <option value="Produção">Produção</option>
                <option value="Homologação">Homologação</option>
                <option value="Desenvolvimento">Desenvolvimento</option>
                <option value="Teste">Teste</option>
              </select>
            </div>

            {/* Anexos */}
            <div style={{ marginBottom: 'var(--gap-lg)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--gap-sm)', fontWeight: '600' }}>
                Anexos/Links
              </label>
              <textarea
                value={formData.anexos}
                onChange={(e) => handleInputChange('anexos', e.target.value)}
                placeholder="URLs de prints, logs, documentos relevantes..."
                className="input"
                rows={3}
                maxLength={1000}
                disabled={loading}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            {/* Botões */}
            <div style={{ display: 'flex', gap: 'var(--gap-md)' }}>
              {mode === 'create' && onAnalyze && (
                <button
                  type="button"
                  onClick={handleAnalyze}
                  className="button button-outline"
                  disabled={analyzing || loading || !formData.assunto || !formData.descricao}
                  style={{ flex: 1 }}
                >
                  {analyzing ? 'Analisando...' : '🤖 Qualificar com IA'}
                </button>
              )}
              
              <button
                type="submit"
                className="button button-primary"
                disabled={submitting || loading}
                style={{ flex: 1 }}
              >
                {submitting ? 'Salvando...' : mode === 'create' ? 'Criar Chamado' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>

        {/* Análise da IA */}
        {analysis && (
          <div style={{ flex: 1, minWidth: '400px' }}>
            <div className="card">
              <h3 style={{ marginBottom: 'var(--gap-md)', display: 'flex', alignItems: 'center', gap: 'var(--gap-sm)' }}>
                🤖 Análise da IA
                <span className="badge badge-success">Qualificado</span>
              </h3>
              
              {/* Markdown */}
              <div style={{ marginBottom: 'var(--gap-lg)' }}>
                <MarkdownView content={analysis.markdown} />
              </div>

              {/* Resumo JSON */}
              <details style={{ marginBottom: 'var(--gap-md)' }}>
                <summary style={{ cursor: 'pointer', fontWeight: '600', marginBottom: 'var(--gap-sm)' }}>
                  📊 Dados Estruturados
                </summary>
                <div style={{
                  background: 'var(--color-surface)',
                  padding: 'var(--gap-md)',
                  borderRadius: 'var(--radius)',
                  marginTop: 'var(--gap-sm)'
                }}>
                  <div style={{ marginBottom: 'var(--gap-sm)' }}>
                    <strong>Prioridade:</strong>{' '}
                    <span style={{ 
                      color: analysis.json.prioridade.prioridade_resultante === 'P1' ? '#dc2626' :
                             analysis.json.prioridade.prioridade_resultante === 'P2' ? '#ea580c' :
                             analysis.json.prioridade.prioridade_resultante === 'P3' ? '#ca8a04' : '#16a34a'
                    }}>
                      {analysis.json.prioridade.prioridade_resultante}
                    </span>
                    {' '}(SLA: {analysis.json.prioridade.sla_sugerida_horas}h)
                  </div>
                  <div style={{ marginBottom: 'var(--gap-sm)' }}>
                    <strong>Categoria:</strong> {analysis.json.classificacao.categoria} → {analysis.json.classificacao.subcategoria}
                  </div>
                  <div>
                    <strong>Sistema:</strong> {analysis.json.classificacao.produto_sistema}
                  </div>
                </div>
              </details>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
