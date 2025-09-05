import { db } from './firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';

interface SecurityEvent {
  type: 'LOGIN_ATTEMPT' | 'PERMISSION_DENIED' | 'SUSPICIOUS_ACTIVITY' | 'HONEYPOT_ACCESS' | 'RATE_LIMIT_EXCEEDED' | 'EMPRESA_ACCESS';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip?: string;
  userAgent?: string;
  empresaId?: string;
  details: Record<string, any>;
  timestamp: Date;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  suspiciousIPs: string[];
  blockedAttempts: number;
  lastUpdate: Date;
}

class SecurityMonitor {
  private static instance: SecurityMonitor;
  private metrics: SecurityMetrics = {
    totalEvents: 0,
    criticalEvents: 0,
    suspiciousIPs: [],
    blockedAttempts: 0,
    lastUpdate: new Date()
  };

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  async logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
    try {
      const securityEvent: SecurityEvent = {
        ...event,
        timestamp: new Date()
      };

      // Salvar no Firestore
      await addDoc(collection(db, 'security_events'), {
        ...securityEvent,
        timestamp: serverTimestamp()
      });

      // Atualizar métricas
      this.updateMetrics(securityEvent);

      // Alertas automáticos para eventos críticos
      if (event.severity === 'critical') {
        await this.sendCriticalAlert(securityEvent);
      }

      console.warn(`[SECURITY EVENT] ${event.severity.toUpperCase()}: ${event.type}`, event.details);
    } catch (error) {
      console.error('Erro ao registrar evento de segurança:', error);
    }
  }

  async logEmpresaSecurityEvent(
    empresaId: string,
    userId: string,
    eventType: string,
    details: any,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    try {
      const event: Omit<SecurityEvent, 'timestamp'> = {
        type: 'EMPRESA_ACCESS',
        severity,
        empresaId,
        userId,
        details: {
          eventType,
          ...details,
          timestamp: new Date().toISOString(),
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        }
      };

      await this.logSecurityEvent(event as SecurityEvent); // Cast for logSecurityEvent

      // Se for evento crítico, alertar admins
      if (severity === 'critical') {
        await this.alertAdmins(event as SecurityEvent); // Cast for alertAdmins
      }
    } catch (error) {
      console.error('Erro ao registrar evento de segurança da empresa:', error);
    }
  }

  private async alertAdmins(event: SecurityEvent): Promise<void> {
    try {
      // Implementar notificação para admins sobre eventos críticos
      console.warn('EVENTO CRÍTICO DE SEGURANÇA:', event);
      // Em produção, enviaria email/SMS para admins
      await addDoc(collection(db, 'system_alerts'), {
        type: 'SECURITY_CRITICAL',
        title: `Evento Crítico de Segurança da Empresa: ${event.details.eventType}`,
        message: `Detectado evento crítico na empresa ${event.empresaId}: ${event.details.eventType}`,
        severity: 'critical',
        details: event.details,
        userId: event.userId,
        empresaId: event.empresaId,
        resolved: false,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao alertar admins:', error);
    }
  }


  private updateMetrics(event: SecurityEvent): void {
    this.metrics.totalEvents++;

    if (event.severity === 'critical') {
      this.metrics.criticalEvents++;
    }

    if (event.ip && !this.metrics.suspiciousIPs.includes(event.ip)) {
      if (event.type === 'SUSPICIOUS_ACTIVITY' || event.severity === 'high') {
        this.metrics.suspiciousIPs.push(event.ip);
      }
    }

    if (event.type === 'RATE_LIMIT_EXCEEDED') {
      this.metrics.blockedAttempts++;
    }

    this.metrics.lastUpdate = new Date();
  }

  private async sendCriticalAlert(event: SecurityEvent): Promise<void> {
    try {
      await addDoc(collection(db, 'system_alerts'), {
        type: 'SECURITY_CRITICAL',
        title: `Evento Crítico de Segurança: ${event.type}`,
        message: `Detectado evento crítico: ${event.type}`,
        severity: 'critical',
        details: event.details,
        userId: event.userId,
        ip: event.ip,
        resolved: false,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao enviar alerta crítico:', error);
    }
  }

  async getRecentSecurityEvents(limitValue: number = 50): Promise<SecurityEvent[]> {
    try {
      const q = query(
        collection(db, 'security_events'),
        orderBy('timestamp', 'desc'),
        limit(limitValue)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type || 'unknown',
          severity: data.severity || 'low',
          details: data.details || {},
          timestamp: data.timestamp?.toDate() || new Date()
        };
      }) as SecurityEvent[];
    } catch (error) {
      console.error('Erro ao buscar eventos de segurança:', error);
      return [];
    }
  }

  async getSuspiciousIPs(): Promise<string[]> {
    try {
      const q = query(
        collection(db, 'security_events'),
        where('severity', 'in', ['high', 'critical']),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);
      const ips = new Set<string>();

      snapshot.docs.forEach(doc => {
        const ip = doc.data().ip;
        if (ip) ips.add(ip);
      });

      return Array.from(ips);
    } catch (error) {
      console.error('Erro ao buscar IPs suspeitos:', error);
      return [];
    }
  }

  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  // Verificar honeypot
  async checkHoneypotAccess(ip: string, endpoint: string): Promise<void> {
    await this.logSecurityEvent({
      type: 'HONEYPOT_ACCESS',
      severity: 'high',
      ip,
      details: {
        endpoint,
        message: 'Acesso a endpoint honeypot detectado',
        action: 'BLOCK_IP'
      }
    });
  }

  // Verificar tentativas de login suspeitas
  async checkSuspiciousLogin(userId: string, ip: string, userAgent: string, details: any): Promise<void> {
    const severity = details.failed ? 'medium' : 'low';

    await this.logSecurityEvent({
      type: 'LOGIN_ATTEMPT',
      severity,
      userId,
      ip,
      userAgent,
      details
    });
  }

  // Verificar acesso negado
  async checkPermissionDenied(userId: string, resource: string, action: string): Promise<void> {
    await this.logSecurityEvent({
      type: 'PERMISSION_DENIED',
      severity: 'medium',
      userId,
      details: {
        resource,
        action,
        message: 'Acesso negado a recurso protegido'
      }
    });
  }
}

export default SecurityMonitor;
export type { SecurityEvent, SecurityMetrics };