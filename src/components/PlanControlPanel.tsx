
'use client';

import { useState, useEffect } from 'react';
import { automaticPlanManager, PLAN_CONFIGS } from '@/src/lib/planManager';
import { useAuth } from '@/src/hooks/useAuth';

interface PlanControlPanelProps {
  userId: string;
  isAdmin?: boolean;
}

export default function PlanControlPanel({ userId, isAdmin = false }: PlanControlPanelProps) {
  const { user } = useAuth();
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string>('');

  useEffect(() => {
    loadPlanInfo();
  }, [userId]);

  const loadPlanInfo = async () => {
    try {
      setLoading(true);
      const info = await automaticPlanManager.getPlanInfo(userId);
      setPlanInfo(info);
    } catch (error) {
      console.error('Erro ao carregar informações do plano:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePausePlan = async () => {
    try {
      setLoading(true);
      setAction('pausing');
      await automaticPlanManager.pausePlan(userId, 'Pausado manualmente pelo usuário', true);
      await loadPlanInfo();
      alert('Plano pausado com sucesso!');
    } catch (error) {
      console.error('Erro ao pausar plano:', error);
      alert('Erro ao pausar plano. Tente novamente.');
    } finally {
      setLoading(false);
      setAction('');
    }
  };

  const handleResumePlan = async () => {
    try {
      setLoading(true);
      setAction('resuming');
      await automaticPlanManager.resumePlan(userId);
      await loadPlanInfo();
      alert('Plano reativado com sucesso!');
    } catch (error) {
      console.error('Erro ao reativar plano:', error);
      alert('Erro ao reativar plano. Tente novamente.');
    } finally {
      setLoading(false);
      setAction('');
    }
  };

  const handleActivatePermanent = async () => {
    try {
      setLoading(true);
      setAction('activating');
      await automaticPlanManager.activatePlan(userId, 'permanent');
      await loadPlanInfo();
      alert('Plano permanente ativado com sucesso!');
    } catch (error) {
      console.error('Erro ao ativar plano permanente:', error);
      alert('Erro ao ativar plano permanente. Tente novamente.');
    } finally {
      setLoading(false);
      setAction('');
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getDaysRemaining = () => {
    if (!planInfo?.status?.expiresAt) return null;
    const now = new Date();
    const expiry = planInfo.status.expiresAt;
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'paused': return '#f59e0b';
      case 'expired': return '#ef4444';
      case 'permanent': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '✅';
      case 'paused': return '⏸️';
      case 'expired': return '⏰';
      case 'permanent': return '💎';
      default: return '❓';
    }
  };

  if (loading && !planInfo) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
        <div>Carregando informações do plano...</div>
      </div>
    );
  }

  if (!planInfo) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
        <div>Erro ao carregar informações do plano</div>
      </div>
    );
  }

  const { config, status, userData } = planInfo;
  const daysRemaining = getDaysRemaining();

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '2rem',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: '700',
            margin: '0 0 0.5rem 0',
            color: 'var(--color-text)'
          }}>
            Controle do Plano
          </h2>
          <p style={{
            color: 'var(--color-textSecondary)',
            margin: 0
          }}>
            Gerencie seu plano e pagamentos
          </p>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: getStatusColor(status.status) + '20',
          border: `2px solid ${getStatusColor(status.status)}`,
          borderRadius: '12px',
          padding: '0.5rem 1rem',
          fontSize: '1.1rem',
          fontWeight: '600'
        }}>
          <span>{getStatusIcon(status.status)}</span>
          <span style={{ color: getStatusColor(status.status), textTransform: 'uppercase' }}>
            {status.status}
          </span>
        </div>
      </div>

      {/* Informações do Plano */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: 'var(--color-text)'
          }}>
            📋 Plano Atual
          </h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>{config?.name || 'N/A'}</strong>
          </div>
          <div style={{ color: 'var(--color-textSecondary)', fontSize: '0.9rem' }}>
            {config?.period === 'permanent' ? 'Vitalício' : 
             config?.period === 'month' ? 'Mensal' : 
             config?.period === 'year' ? 'Anual' : 'N/A'}
          </div>
          {config?.price !== undefined && (
            <div style={{ marginTop: '0.5rem', fontSize: '1.2rem', fontWeight: '600', color: '#3b82f6' }}>
              {config.period === 'permanent' ? 
                `R$ ${config.price.toFixed(2)} (único)` :
                `R$ ${config.price.toFixed(2)}/${config.period === 'month' ? 'mês' : 'ano'}`
              }
            </div>
          )}
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: 'var(--color-text)'
          }}>
            ⏰ Validade
          </h3>
          {config?.period === 'permanent' ? (
            <div style={{ color: '#8b5cf6', fontWeight: '600' }}>
              💎 Plano Vitalício
            </div>
          ) : status.expiresAt ? (
            <>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>{formatDate(status.expiresAt)}</strong>
              </div>
              {daysRemaining !== null && (
                <div style={{
                  color: daysRemaining <= 7 ? '#ef4444' : 
                        daysRemaining <= 15 ? '#f59e0b' : '#10b981',
                  fontWeight: '600'
                }}>
                  {daysRemaining > 0 ? 
                    `${daysRemaining} dias restantes` : 
                    'Expirado'
                  }
                </div>
              )}
            </>
          ) : (
            <div style={{ color: 'var(--color-textSecondary)' }}>
              Sem data de expiração
            </div>
          )}
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: 'var(--color-text)'
          }}>
            👥 Limites
          </h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Funcionários:</strong> {config?.maxEmployees === 999 ? 'Ilimitado' : config?.maxEmployees}
          </div>
          <div>
            <strong>Empresas:</strong> {config?.maxCompanies === 999 ? 'Ilimitado' : config?.maxCompanies}
          </div>
        </div>
      </div>

      {/* Avisos */}
      {daysRemaining !== null && daysRemaining <= 15 && daysRemaining > 0 && status.status === 'active' && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <strong>Atenção!</strong> Seu plano expira em {daysRemaining} dias.
            <br />
            <span style={{ fontSize: '0.9rem', color: 'var(--color-textSecondary)' }}>
              Renove agora para evitar interrupções no serviço.
            </span>
          </div>
        </div>
      )}

      {status.status === 'paused' && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⏸️</span>
          <div>
            <strong>Plano Pausado</strong>
            <br />
            <span style={{ fontSize: '0.9rem', color: 'var(--color-textSecondary)' }}>
              Motivo: {status.pausedReason || 'Não especificado'}
            </span>
          </div>
        </div>
      )}

      {/* Controles */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {/* Botão Pausar */}
        {status.status === 'active' && config?.period !== 'permanent' && (
          <button
            onClick={handlePausePlan}
            disabled={loading}
            style={{
              background: 'rgba(245, 158, 11, 0.2)',
              border: '2px solid #f59e0b',
              borderRadius: '12px',
              color: '#f59e0b',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {action === 'pausing' ? '⏳' : '⏸️'}
            {action === 'pausing' ? 'Pausando...' : 'Pausar Plano'}
          </button>
        )}

        {/* Botão Reativar */}
        {(status.status === 'paused' || status.status === 'expired') && (
          <button
            onClick={handleResumePlan}
            disabled={loading}
            style={{
              background: 'rgba(16, 185, 129, 0.2)',
              border: '2px solid #10b981',
              borderRadius: '12px',
              color: '#10b981',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {action === 'resuming' ? '⏳' : '▶️'}
            {action === 'resuming' ? 'Reativando...' : 'Reativar Plano'}
          </button>
        )}

        {/* Botão Plano Permanente (apenas admin) */}
        {isAdmin && config?.id !== 'permanent' && (
          <button
            onClick={handleActivatePermanent}
            disabled={loading}
            style={{
              background: 'rgba(139, 92, 246, 0.2)',
              border: '2px solid #8b5cf6',
              borderRadius: '12px',
              color: '#8b5cf6',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {action === 'activating' ? '⏳' : '💎'}
            {action === 'activating' ? 'Ativando...' : 'Ativar Permanente'}
          </button>
        )}

        {/* Botão Renovar */}
        <a
          href="/planos"
          style={{
            background: 'rgba(59, 130, 246, 0.2)',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            color: '#3b82f6',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            textDecoration: 'none',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          🔄 Renovar/Alterar Plano
        </a>
      </div>

      {/* Informações Adicionais */}
      {status.lastPayment && (
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '8px',
          fontSize: '0.9rem',
          color: 'var(--color-textSecondary)'
        }}>
          <strong>Último pagamento:</strong> {formatDate(status.lastPayment)}
          {status.nextPayment && (
            <>
              <br />
              <strong>Próximo pagamento:</strong> {formatDate(status.nextPayment)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
