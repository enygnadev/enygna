
'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

interface SystemIssue {
  id?: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  affectedSystems: string[];
  createdAt: number;
  resolvedAt?: number;
}

interface SystemStatusProps {
  compact?: boolean;
}

export default function SystemStatus({ compact = false }: SystemStatusProps) {
  const [issues, setIssues] = useState<SystemIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<'operational' | 'degraded' | 'outage'>('operational');

  useEffect(() => {
    const issuesQuery = query(
      collection(db, 'system_status'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(issuesQuery, (snapshot) => {
      const issuesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SystemIssue[];

      setIssues(issuesData);
      
      // Determinar status geral do sistema
      const activeIssues = issuesData.filter(issue => issue.status !== 'resolved');
      if (activeIssues.length === 0) {
        setSystemHealth('operational');
      } else if (activeIssues.some(issue => issue.severity === 'critical')) {
        setSystemHealth('outage');
      } else {
        setSystemHealth('degraded');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626'
    };
    return colors[severity as keyof typeof colors] || '#6b7280';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      investigating: '#f59e0b',
      identified: '#ef4444',
      monitoring: '#3b82f6',
      resolved: '#10b981'
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  };

  const getHealthStatus = () => {
    switch (systemHealth) {
      case 'operational':
        return { text: 'Todos os sistemas operacionais', color: '#10b981', icon: '✅' };
      case 'degraded':
        return { text: 'Degradação em alguns sistemas', color: '#f59e0b', icon: '⚠️' };
      case 'outage':
        return { text: 'Problemas críticos identificados', color: '#dc2626', icon: '🚨' };
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: compact ? 'var(--gap-sm)' : 'var(--gap-md)' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Verificando status do sistema...
        </div>
      </div>
    );
  }

  const healthStatus = getHealthStatus();

  if (compact) {
    return (
      <div 
        className="card" 
        style={{ 
          padding: 'var(--gap-sm)',
          border: `2px solid ${healthStatus.color}`,
          background: `linear-gradient(135deg, ${healthStatus.color}10, transparent)`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-sm)' }}>
          <span style={{ fontSize: '1.2rem' }}>{healthStatus.icon}</span>
          <div>
            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
              Status do Sistema TI
            </div>
            <div style={{ fontSize: '0.8rem', color: healthStatus.color }}>
              {healthStatus.text}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ marginBottom: 'var(--gap-lg)' }}>
        <h3 style={{ 
          margin: '0 0 var(--gap-sm) 0', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--gap-sm)' 
        }}>
          {healthStatus.icon} Status do Sistema TI
        </h3>
        <div style={{ 
          padding: 'var(--gap-sm)', 
          borderRadius: 'var(--radius)',
          background: `${healthStatus.color}20`,
          border: `1px solid ${healthStatus.color}`,
          color: healthStatus.color,
          fontWeight: '600'
        }}>
          {healthStatus.text}
        </div>
      </div>

      {issues.length > 0 ? (
        <div>
          <h4 style={{ margin: '0 0 var(--gap-md) 0', fontSize: '1rem' }}>
            Incidentes Recentes
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)' }}>
            {issues.map((issue) => (
              <div
                key={issue.id}
                style={{
                  padding: 'var(--gap-sm)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--color-surface)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                    {issue.title}
                  </span>
                  <div style={{ display: 'flex', gap: 'var(--gap-xs)' }}>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: getSeverityColor(issue.severity),
                        color: 'white',
                        fontSize: '0.7rem'
                      }}
                    >
                      {issue.severity.toUpperCase()}
                    </span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: getStatusColor(issue.status),
                        color: 'white',
                        fontSize: '0.7rem'
                      }}
                    >
                      {issue.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  {issue.description}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Sistemas afetados: {issue.affectedSystems.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 'var(--gap-lg)', color: 'var(--color-text-secondary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--gap-sm)' }}>🎉</div>
          <div>Nenhum incidente reportado nas últimas 24 horas</div>
        </div>
      )}
    </div>
  );
}
