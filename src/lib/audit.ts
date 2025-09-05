import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

// Tipos de eventos de auditoria
export enum AuditEventType {
  // Autenticação
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Autorização
  ACCESS_DENIED = 'ACCESS_DENIED',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  
  // Dados
  DATA_CREATE = 'DATA_CREATE',
  DATA_UPDATE = 'DATA_UPDATE',
  DATA_DELETE = 'DATA_DELETE',
  DATA_EXPORT = 'DATA_EXPORT',
  
  // Segurança
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  HONEYPOT_TRIGGERED = 'HONEYPOT_TRIGGERED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  
  // Sistema
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

export interface AuditLog {
  eventType: AuditEventType;
  userId?: string;
  userEmail?: string;
  empresaId?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: any;
}

// Registrar evento de auditoria
export async function logAuditEvent(event: AuditLog): Promise<void> {
  try {
    await addDoc(collection(db, 'Auditoria', 'Logs', 'Events'), {
      ...event,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Em produção, enviar para sistema de backup
  }
}

// Detectar atividade suspeita
export async function checkSuspiciousActivity(
  userId: string,
  action: string
): Promise<boolean> {
  try {
    const recentLogs = await getDocs(
      query(
        collection(db, 'Auditoria', 'Logs', 'Events'),
        where('userId', '==', userId),
        where('eventType', '==', AuditEventType.LOGIN_FAILED),
        orderBy('timestamp', 'desc'),
        limit(5)
      )
    );
    
    // Se houver mais de 3 tentativas falhas recentes
    if (recentLogs.size >= 3) {
      await logAuditEvent({
        eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
        userId,
        action,
        severity: 'high',
        details: {
          failedAttempts: recentLogs.size,
          message: 'Multiple failed login attempts detected'
        }
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to check suspicious activity:', error);
    return false;
  }
}

// Helper para log de segurança
export async function logSecurityEvent(
  message: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details?: any
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
    severity,
    details: {
      message,
      ...details
    }
  });
}