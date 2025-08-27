
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  startAt,
  endAt
} from 'firebase/firestore';

interface AuditLog {
  id?: string;
  companyId: string;
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  resourceType: 'session' | 'user' | 'company' | 'schedule' | 'settings' | 'backup';
  resourceId?: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface SecurityEvent {
  id?: string;
  type: 'login_attempt' | 'failed_login' | 'suspicious_activity' | 'data_access' | 'permission_change';
  companyId?: string;
  userId?: string;
  userEmail?: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

interface AuditReport {
  period: { start: Date; end: Date };
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topUsers: Array<{ userId: string; email: string; eventCount: number }>;
  securityEvents: SecurityEvent[];
  recommendations: string[];
}

class AuditService {
  // Registrar evento de auditoria
  async logEvent(event: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        ...event,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      console.error('Erro ao registrar log de auditoria:', error);
      // Não relançar o erro para não quebrar a funcionalidade principal
    }
  }

  // Registrar evento de segurança
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    try {
      await addDoc(collection(db, 'security_events'), {
        ...event,
        timestamp: Timestamp.now(),
        resolved: false
      });

      // Se for crítico ou alto risco, criar alerta
      if (event.riskLevel === 'critical' || event.riskLevel === 'high') {
        // Integrar com sistema de notificações
        console.warn('Evento de segurança crítico:', event);
      }
    } catch (error) {
      console.error('Erro ao registrar evento de segurança:', error);
    }
  }

  // Buscar logs de auditoria
  async getAuditLogs(
    companyId: string, 
    filters: {
      userId?: string;
      action?: string;
      resourceType?: string;
      severity?: string;
      startDate?: Date;
      endDate?: Date;
      limitCount?: number;
    } = {}
  ): Promise<AuditLog[]> {
    try {
      let auditQuery = query(
        collection(db, 'audit_logs'),
        where('companyId', '==', companyId),
        orderBy('timestamp', 'desc')
      );

      if (filters.userId) {
        auditQuery = query(auditQuery, where('userId', '==', filters.userId));
      }

      if (filters.action) {
        auditQuery = query(auditQuery, where('action', '==', filters.action));
      }

      if (filters.resourceType) {
        auditQuery = query(auditQuery, where('resourceType', '==', filters.resourceType));
      }

      if (filters.severity) {
        auditQuery = query(auditQuery, where('severity', '==', filters.severity));
      }

      if (filters.startDate) {
        auditQuery = query(auditQuery, startAt(Timestamp.fromDate(filters.startDate)));
      }

      if (filters.endDate) {
        auditQuery = query(auditQuery, endAt(Timestamp.fromDate(filters.endDate)));
      }

      if (filters.limitCount) {
        auditQuery = query(auditQuery, limit(filters.limitCount));
      }

      const snapshot = await getDocs(auditQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as AuditLog[];
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      return [];
    }
  }

  // Gerar relatório de auditoria
  async generateAuditReport(
    companyId: string, 
    period: { start: Date; end: Date }
  ): Promise<AuditReport> {
    try {
      const logs = await this.getAuditLogs(companyId, {
        startDate: period.start,
        endDate: period.end
      });

      const securityEventsQuery = query(
        collection(db, 'security_events'),
        where('companyId', '==', companyId),
        where('timestamp', '>=', Timestamp.fromDate(period.start)),
        where('timestamp', '<=', Timestamp.fromDate(period.end)),
        orderBy('timestamp', 'desc')
      );

      const securitySnapshot = await getDocs(securityEventsQuery);
      const securityEvents = securitySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as SecurityEvent[];

      // Análises
      const eventsByType: Record<string, number> = {};
      const eventsBySeverity: Record<string, number> = {};
      const userEventCount: Record<string, { email: string; count: number }> = {};

      logs.forEach(log => {
        // Contar por ação
        eventsByType[log.action] = (eventsByType[log.action] || 0) + 1;
        
        // Contar por severidade
        eventsBySeverity[log.severity] = (eventsBySeverity[log.severity] || 0) + 1;
        
        // Contar por usuário
        if (!userEventCount[log.userId]) {
          userEventCount[log.userId] = { email: log.userEmail, count: 0 };
        }
        userEventCount[log.userId].count++;
      });

      const topUsers = Object.entries(userEventCount)
        .map(([userId, data]) => ({ userId, email: data.email, eventCount: data.count }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      // Recomendações baseadas na análise
      const recommendations = this.generateRecommendations(logs, securityEvents);

      return {
        period,
        totalEvents: logs.length,
        eventsByType,
        eventsBySeverity,
        topUsers,
        securityEvents,
        recommendations
      };
    } catch (error) {
      console.error('Erro ao gerar relatório de auditoria:', error);
      throw error;
    }
  }

  // Detectar atividades suspeitas
  async detectSuspiciousActivity(companyId: string): Promise<SecurityEvent[]> {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentLogs = await this.getAuditLogs(companyId, {
        startDate: last24Hours,
        limitCount: 1000
      });

      const suspiciousEvents: SecurityEvent[] = [];

      // Detectar múltiplas tentativas de login falhadas
      const failedLogins = recentLogs.filter(log => 
        log.action === 'failed_login'
      );

      if (failedLogins.length > 5) {
        suspiciousEvents.push({
          type: 'failed_login',
          companyId,
          details: {
            attempts: failedLogins.length,
            timeframe: '24 hours'
          },
          timestamp: new Date(),
          riskLevel: 'high',
          resolved: false
        });
      }

      // Detectar acessos fora do horário normal
      const afterHoursAccess = recentLogs.filter(log => {
        const hour = log.timestamp.getHours();
        return hour < 6 || hour > 22; // Fora do horário 6h-22h
      });

      if (afterHoursAccess.length > 3) {
        suspiciousEvents.push({
          type: 'suspicious_activity',
          companyId,
          details: {
            afterHoursAccess: afterHoursAccess.length,
            description: 'Múltiplos acessos fora do horário comercial'
          },
          timestamp: new Date(),
          riskLevel: 'medium',
          resolved: false
        });
      }

      // Detectar mudanças massivas de dados
      const massChanges = recentLogs.filter(log => 
        ['bulk_approve', 'bulk_reject', 'mass_delete'].includes(log.action)
      );

      if (massChanges.length > 2) {
        suspiciousEvents.push({
          type: 'data_access',
          companyId,
          details: {
            massChanges: massChanges.length,
            description: 'Múltiplas operações em massa detectadas'
          },
          timestamp: new Date(),
          riskLevel: 'medium',
          resolved: false
        });
      }

      // Salvar eventos suspeitos encontrados
      for (const event of suspiciousEvents) {
        await this.logSecurityEvent(event);
      }

      return suspiciousEvents;
    } catch (error) {
      console.error('Erro ao detectar atividades suspeitas:', error);
      return [];
    }
  }

  // Gerar recomendações baseadas nos logs
  private generateRecommendations(logs: AuditLog[], securityEvents: SecurityEvent[]): string[] {
    const recommendations: string[] = [];

    // Análise de erros frequentes
    const errorLogs = logs.filter(log => log.severity === 'error');
    if (errorLogs.length > logs.length * 0.1) {
      recommendations.push('Taxa alta de erros detectada. Considere revisar configurações do sistema.');
    }

    // Análise de eventos de segurança
    const highRiskEvents = securityEvents.filter(event => 
      event.riskLevel === 'high' || event.riskLevel === 'critical'
    );
    if (highRiskEvents.length > 0) {
      recommendations.push('Eventos de segurança de alto risco detectados. Revise imediatamente.');
    }

    // Análise de atividades de usuários
    const userActivities = logs.reduce((acc, log) => {
      acc[log.userId] = (acc[log.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageActivity = Object.values(userActivities).reduce((sum, count) => sum + count, 0) / Object.keys(userActivities).length;
    const hyperActiveUsers = Object.entries(userActivities).filter(([, count]) => count > averageActivity * 3);

    if (hyperActiveUsers.length > 0) {
      recommendations.push('Usuários com atividade muito acima da média detectados. Verifique se não são bots ou atividades automatizadas.');
    }

    // Recomendações de backup
    const backupActions = logs.filter(log => log.resourceType === 'backup');
    if (backupActions.length === 0) {
      recommendations.push('Nenhuma atividade de backup detectada no período. Configure backups automáticos.');
    }

    return recommendations;
  }

  // Métodos de conveniência para logging comum
  async logUserAction(
    companyId: string,
    user: { id: string; email: string; role: string },
    action: string,
    resourceType: AuditLog['resourceType'],
    details: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      companyId,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action,
      resourceType,
      details,
      severity: 'info'
    });
  }

  async logSystemError(
    companyId: string,
    error: Error,
    context: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      companyId,
      userId: 'system',
      userEmail: 'system@internal',
      userRole: 'system',
      action: 'error',
      resourceType: 'company',
      details: {
        error: error.message,
        stack: error.stack,
        context
      },
      severity: 'error'
    });
  }
}

export const auditService = new AuditService();

export type {
  AuditLog,
  SecurityEvent,
  AuditReport
};
