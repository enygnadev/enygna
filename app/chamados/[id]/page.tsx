
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Ticket, TicketAudit, TICKET_STATUS_LABELS, TICKET_PRIORITIES } from '@/src/types/ticket';
import MarkdownView from '@/src/components/MarkdownView';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function TicketDetailsPage({ params }: TicketDetailsPageProps) {
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [auditLogs, setAuditLogs] = useState<TicketAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [resolution, setResolution] = useState('');
  const [showResolutionForm, setShowResolutionForm] = useState(false);

  // Carregar ticket
  useEffect(() => {
    const loadTicket = async () => {
      try {
        const resolvedParams = await params;
        if (!resolvedParams.id) return;

        const ticketDoc = await getDoc(doc(db, 'tickets', resolvedParams.id));
        if (ticketDoc.exists()) {
          setTicket({ id: ticketDoc.id, ...ticketDoc.data() } as Ticket);
        } else {
          console.error('Ticket não encontrado');
          router.push('/chamados');
        }
      } catch (error) {
        console.error('Erro ao carregar ticket:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTicket();
  }, [params, router]);

  // Carregar audit logs
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupAuditLogs = async () => {
      try {
        const resolvedParams = await params;
        if (!resolvedParams.id) return;

        const auditQuery = query(
          collection(db, 'tickets', resolvedParams.id, 'audit'),
          orderBy('at', 'desc')
        );

        unsubscribe = onSnapshot(auditQuery, (snapshot) => {
          const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as TicketAudit[];
          setAuditLogs(logs);
        });
      } catch (error) {
        console.error('Error setting up audit logs:', error);
      }
    };

    setupAuditLogs();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [params]);

  const updateTicketStatus = async (status: string, resolutionText?: string) => {
    if (!ticket) return;

    setUpdating(true);
    try {
      const resolvedParams = await params;
      if (!resolvedParams.id) return;

      const updates: any = {
        status,
        updatedAt: Date.now()
      };

      if (resolutionText) {
        updates.resolucao = resolutionText;
      }

      // Atualizar ticket
      await updateDoc(doc(db, 'tickets', resolvedParams.id), updates);

      // Registrar auditoria
      await addDoc(collection(db, 'tickets', resolvedParams.id, 'audit'), {
        ticketId: resolvedParams.id,
        at: Date.now(),
        action: 'status_change',
        by: 'sistema', // TODO: usar dados do usuário logado
        oldValue: ticket.status,
        newValue: status,
        payload: resolutionText ? { resolution: resolutionText } : {}
      } as TicketAudit);

      // Atualizar estado local
      setTicket(prev => prev ? { ...prev, status: status as any, resolucao: resolutionText } : null);
      setShowResolutionForm(false);
      setResolution('');
      
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do chamado');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusTransitions = (currentStatus: string) => {
    const transitions: Record<string, string[]> = {
      aberto: ['em_andamento', 'cancelado'],
      em_andamento: ['resolvido', 'aberto', 'cancelado'],
      resolvido: ['em_andamento'],
      cancelado: ['aberto']
    };
    return transitions[currentStatus] || [];
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      aberto: '#3b82f6',
      em_andamento: '#f59e0b',
      resolvido: '#10b981',
      cancelado: '#6b7280'
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  };

  const getPriorityInfo = (ticket: Ticket) => {
    const priority = ticket.analysis?.prioridade.prioridade_resultante;
    if (!priority) return null;
    return TICKET_PRIORITIES[priority];
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: 'var(--gap-xl)', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: 'var(--gap-md)' }}>🔄</div>
        <div>Carregando chamado...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container" style={{ padding: 'var(--gap-xl)', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: 'var(--gap-md)' }}>❌</div>
        <h2>Chamado não encontrado</h2>
        <Link href="/chamados" className="button button-primary">
          Voltar aos Chamados
        </Link>
      </div>
    );
  }

  const priorityInfo = getPriorityInfo(ticket);

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
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-md)', marginBottom: 'var(--gap-sm)' }}>
            <Link 
              href="/chamados" 
              className="button button-ghost"
              style={{ padding: '6px 12px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Voltar
            </Link>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Chamado #{ticket?.id?.slice(-8) || '...'}
            </span>
          </div>
          
          <h1 style={{ margin: 0, fontSize: 'clamp(1.2rem, 3vw, 1.8rem)' }}>
            {ticket.assunto}
          </h1>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--gap-md)', 
            marginTop: 'var(--gap-sm)',
            flexWrap: 'wrap'
          }}>
            <span
              className="badge"
              style={{
                backgroundColor: getStatusColor(ticket.status),
                color: 'white'
              }}
            >
              {TICKET_STATUS_LABELS[ticket.status]}
            </span>
            
            {priorityInfo && (
              <span
                className="badge"
                style={{
                  backgroundColor: priorityInfo.color,
                  color: 'white'
                }}
              >
                {ticket.analysis?.prioridade.prioridade_resultante} - {priorityInfo.label}
              </span>
            )}
            
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Criado em {formatDate(ticket.createdAt)}
            </span>
          </div>
        </div>

        {/* Ações de Status */}
        <div style={{ display: 'flex', gap: 'var(--gap-sm)', flexWrap: 'wrap' }}>
          {getStatusTransitions(ticket.status).map(status => (
            <button
              key={status}
              onClick={() => {
                if (status === 'resolvido') {
                  setShowResolutionForm(true);
                } else {
                  updateTicketStatus(status);
                }
              }}
              className="button button-outline"
              disabled={updating}
              style={{ fontSize: '0.85rem' }}
            >
              {updating ? 'Atualizando...' : `Marcar como ${TICKET_STATUS_LABELS[status as keyof typeof TICKET_STATUS_LABELS]}`}
            </button>
          ))}
        </div>
      </div>

      {/* Form de Resolução */}
      {showResolutionForm && (
        <div className="card" style={{ 
          marginBottom: 'var(--gap-lg)',
          border: '2px solid var(--color-success)'
        }}>
          <h3 style={{ margin: '0 0 var(--gap-md) 0', color: 'var(--color-success)' }}>
            ✅ Resolver Chamado
          </h3>
          <div style={{ marginBottom: 'var(--gap-md)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--gap-sm)', fontWeight: '600' }}>
              Descrição da Resolução
            </label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Descreva como o problema foi resolvido..."
              className="input"
              rows={4}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--gap-sm)' }}>
            <button
              onClick={() => updateTicketStatus('resolvido', resolution)}
              className="button button-primary"
              disabled={!resolution.trim() || updating}
            >
              {updating ? 'Resolvendo...' : 'Confirmar Resolução'}
            </button>
            <button
              onClick={() => {
                setShowResolutionForm(false);
                setResolution('');
              }}
              className="button button-ghost"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--gap-xl)' }}>
        {/* Conteúdo Principal */}
        <div>
          {/* Descrição */}
          <div className="card" style={{ marginBottom: 'var(--gap-lg)' }}>
            <h3 style={{ margin: '0 0 var(--gap-md) 0' }}>📝 Descrição</h3>
            <div style={{ 
              background: 'var(--color-surface)', 
              padding: 'var(--gap-md)', 
              borderRadius: 'var(--radius)',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6'
            }}>
              {ticket.descricao}
            </div>
          </div>

          {/* Análise da IA */}
          {ticket.analysis && (
            <div className="card" style={{ marginBottom: 'var(--gap-lg)' }}>
              <h3 style={{ margin: '0 0 var(--gap-md) 0', display: 'flex', alignItems: 'center', gap: 'var(--gap-sm)' }}>
                🤖 Análise Técnica
                <span className="badge badge-primary">IA Qualificada</span>
              </h3>
              
              {/* Resumo Executivo */}
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
                padding: 'var(--gap-md)',
                borderRadius: 'var(--radius)',
                marginBottom: 'var(--gap-md)',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                <h4 style={{ margin: '0 0 var(--gap-sm) 0' }}>💡 Resumo Executivo</h4>
                <p style={{ margin: 0, lineHeight: '1.6' }}>
                  {ticket.analysis.resumo_executivo}
                </p>
              </div>

              {/* Classificação */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: 'var(--gap-md)',
                marginBottom: 'var(--gap-lg)'
              }}>
                <div>
                  <h5 style={{ margin: '0 0 var(--gap-xs) 0', color: 'var(--color-text-secondary)' }}>Categoria</h5>
                  <div style={{ fontWeight: '600' }}>{ticket.analysis.classificacao.categoria}</div>
                </div>
                <div>
                  <h5 style={{ margin: '0 0 var(--gap-xs) 0', color: 'var(--color-text-secondary)' }}>Subcategoria</h5>
                  <div style={{ fontWeight: '600' }}>{ticket.analysis.classificacao.subcategoria}</div>
                </div>
                <div>
                  <h5 style={{ margin: '0 0 var(--gap-xs) 0', color: 'var(--color-text-secondary)' }}>Sistema</h5>
                  <div style={{ fontWeight: '600' }}>{ticket.analysis.classificacao.produto_sistema}</div>
                </div>
                <div>
                  <h5 style={{ margin: '0 0 var(--gap-xs) 0', color: 'var(--color-text-secondary)' }}>SLA</h5>
                  <div style={{ fontWeight: '600', color: priorityInfo?.color }}>
                    {ticket.analysis.prioridade.sla_sugerida_horas}h
                  </div>
                </div>
              </div>

              {/* Análise Detalhada em Tabs */}
              <div>
                <details style={{ marginBottom: 'var(--gap-md)' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: '600', padding: 'var(--gap-sm) 0' }}>
                    🔍 Hipóteses e Causas
                  </summary>
                  <div style={{ padding: 'var(--gap-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}>
                    <div style={{ marginBottom: 'var(--gap-md)' }}>
                      <h6 style={{ margin: '0 0 var(--gap-sm) 0' }}>Hipóteses:</h6>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {ticket.analysis.analise_inicial.hipoteses.map((item, index) => (
                          <li key={index} style={{ marginBottom: '4px' }}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h6 style={{ margin: '0 0 var(--gap-sm) 0' }}>Possíveis Causas:</h6>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {ticket.analysis.analise_inicial.possiveis_causas_raiz.map((item, index) => (
                          <li key={index} style={{ marginBottom: '4px' }}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </details>

                <details style={{ marginBottom: 'var(--gap-md)' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: '600', padding: 'var(--gap-sm) 0' }}>
                    📋 Checklist de Coleta
                  </summary>
                  <div style={{ padding: 'var(--gap-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {ticket.analysis.checklist_coleta.map((item, index) => (
                        <li key={index} style={{ marginBottom: '4px' }}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </details>

                <details style={{ marginBottom: 'var(--gap-md)' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: '600', padding: 'var(--gap-sm) 0' }}>
                    🛠️ Passos Sugeridos
                  </summary>
                  <div style={{ padding: 'var(--gap-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}>
                    <div style={{ marginBottom: 'var(--gap-md)' }}>
                      <h6 style={{ margin: '0 0 var(--gap-sm) 0', color: '#dc2626' }}>🚨 Mitigação Imediata:</h6>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {ticket.analysis.passos_sugeridos.mitigacao_imediata.map((item, index) => (
                          <li key={index} style={{ marginBottom: '4px' }}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ marginBottom: 'var(--gap-md)' }}>
                      <h6 style={{ margin: '0 0 var(--gap-sm) 0', color: '#f59e0b' }}>🔍 Diagnóstico:</h6>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {ticket.analysis.passos_sugeridos.diagnostico.map((item, index) => (
                          <li key={index} style={{ marginBottom: '4px' }}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h6 style={{ margin: '0 0 var(--gap-sm) 0', color: '#10b981' }}>✅ Correção:</h6>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {ticket.analysis.passos_sugeridos.correcao.map((item, index) => (
                          <li key={index} style={{ marginBottom: '4px' }}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </details>

                {ticket.analysis.riscos_seguranca.length > 0 && (
                  <details style={{ marginBottom: 'var(--gap-md)' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: '600', padding: 'var(--gap-sm) 0', color: '#dc2626' }}>
                      🔒 Riscos de Segurança
                    </summary>
                    <div style={{ padding: 'var(--gap-md)', background: 'rgba(220, 38, 38, 0.1)', borderRadius: 'var(--radius)', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {ticket.analysis.riscos_seguranca.map((item, index) => (
                          <li key={index} style={{ marginBottom: '4px' }}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </details>
                )}
              </div>
            </div>
          )}

          {/* Resolução */}
          {ticket.resolucao && (
            <div className="card" style={{ 
              marginBottom: 'var(--gap-lg)',
              border: '2px solid var(--color-success)'
            }}>
              <h3 style={{ margin: '0 0 var(--gap-md) 0', color: 'var(--color-success)' }}>
                ✅ Resolução
              </h3>
              <div style={{ 
                background: 'rgba(16, 185, 129, 0.1)', 
                padding: 'var(--gap-md)', 
                borderRadius: 'var(--radius)',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6'
              }}>
                {ticket.resolucao}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          {/* Informações */}
          <div className="card" style={{ marginBottom: 'var(--gap-lg)' }}>
            <h3 style={{ margin: '0 0 var(--gap-md) 0' }}>ℹ️ Informações</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-md)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
                  Status
                </div>
                <span
                  className="badge"
                  style={{
                    backgroundColor: getStatusColor(ticket.status),
                    color: 'white'
                  }}
                >
                  {TICKET_STATUS_LABELS[ticket.status]}
                </span>
              </div>

              {ticket.produto && (
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
                    Produto
                  </div>
                  <div>{ticket.produto}</div>
                </div>
              )}

              {ticket.ambiente && (
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
                    Ambiente
                  </div>
                  <div>{ticket.ambiente}</div>
                </div>
              )}

              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
                  Criado em
                </div>
                <div>{formatDate(ticket.createdAt)}</div>
              </div>

              {ticket.updatedAt && (
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
                    Atualizado em
                  </div>
                  <div>{formatDate(ticket.updatedAt)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Histórico de Auditoria */}
          <div className="card">
            <h3 style={{ margin: '0 0 var(--gap-md) 0' }}>📋 Histórico</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)' }}>
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: 'var(--gap-sm)',
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                    {log.action === 'create' && '📝 Chamado criado'}
                    {log.action === 'status_change' && `🔄 Status: ${log.oldValue} → ${log.newValue}`}
                    {log.action === 'update' && '✏️ Chamado atualizado'}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)' }}>
                    {formatDate(log.at)}
                  </div>
                  {(() => {
                    const resolution = log.payload?.resolution;
                    if (resolution && typeof resolution === 'string') {
                      return (
                        <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                          "{resolution}"
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
