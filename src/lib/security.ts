// src/lib/security.ts - Sistema de Segurança Avançado
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  limit,
  orderBy 
} from 'firebase/firestore';

export interface SecurityEvent {
  id: string;
  userId: string;
  type: 'login_attempt' | 'suspicious_activity' | 'data_access' | 'permission_change' | 'security_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ipAddress: string;
  userAgent: string;
  timestamp: any;
  metadata?: Record<string, any>;
}

export interface RateLimitRule {
  endpoint: string;
  maxRequests: number;
  windowMs: number;
  blockDurationMs: number;
}

export interface SecurityPolicy {
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireUppercase: boolean;
  sessionTimeoutMs: number;
  maxLoginAttempts: number;
  lockoutDurationMs: number;
  requireMFA: boolean;
  allowedCountries: string[];
  blockedIPs: string[];
  rateLimits: RateLimitRule[];
}

class SecurityService {
  private defaultPolicy: SecurityPolicy = {
    passwordMinLength: 8,
    passwordRequireSpecialChars: true,
    passwordRequireNumbers: true,
    passwordRequireUppercase: true,
    sessionTimeoutMs: 8 * 60 * 60 * 1000, // 8 horas
    maxLoginAttempts: 5,
    lockoutDurationMs: 30 * 60 * 1000, // 30 minutos
    requireMFA: false,
    allowedCountries: ['BR'],
    blockedIPs: [],
    rateLimits: [
      { endpoint: '/api/auth', maxRequests: 10, windowMs: 15 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 },
      { endpoint: '/api/admin', maxRequests: 100, windowMs: 15 * 60 * 1000, blockDurationMs: 15 * 60 * 1000 }
    ]
  };

  // Registrar evento de segurança
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const eventRef = doc(collection(db, 'security_events'));
      await setDoc(eventRef, {
        ...event,
        id: eventRef.id,
        timestamp: serverTimestamp()
      });

      // Alertas para eventos críticos
      if (event.severity === 'critical') {
        await this.sendSecurityAlert(event);
      }
    } catch (error) {
      console.error('Erro ao registrar evento de segurança:', error);
    }
  }

  // Verificar tentativas de login suspeitas
  async checkSuspiciousLogin(userId: string, ipAddress: string): Promise<{
    allowed: boolean;
    reason?: string;
    remainingAttempts?: number;
  }> {
    try {
      const policy = await this.getSecurityPolicy();
      
      // Verificar IP bloqueado
      if (policy.blockedIPs.includes(ipAddress)) {
        await this.logSecurityEvent({
          userId,
          type: 'login_attempt',
          severity: 'high',
          description: 'Tentativa de login de IP bloqueado',
          ipAddress,
          userAgent: navigator.userAgent
        });
        
        return { allowed: false, reason: 'IP bloqueado' };
      }

      // Verificar tentativas recentes
      const recentAttempts = await this.getRecentLoginAttempts(userId, ipAddress);
      
      if (recentAttempts >= policy.maxLoginAttempts) {
        await this.logSecurityEvent({
          userId,
          type: 'suspicious_activity',
          severity: 'high',
          description: 'Muitas tentativas de login falharam',
          ipAddress,
          userAgent: navigator.userAgent,
          metadata: { attempts: recentAttempts }
        });
        
        return { 
          allowed: false, 
          reason: 'Muitas tentativas falharam. Tente novamente em 30 minutos.' 
        };
      }

      return { 
        allowed: true, 
        remainingAttempts: policy.maxLoginAttempts - recentAttempts 
      };
    } catch (error) {
      console.error('Erro ao verificar login suspeito:', error);
      return { allowed: true };
    }
  }

  // Validar senha com política de segurança
  validatePassword(password: string): {
    valid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
  } {
    const errors: string[] = [];
    const policy = this.defaultPolicy;

    if (password.length < policy.passwordMinLength) {
      errors.push(`Senha deve ter pelo menos ${policy.passwordMinLength} caracteres`);
    }

    if (policy.passwordRequireNumbers && !/\d/.test(password)) {
      errors.push('Senha deve conter pelo menos um número');
    }

    if (policy.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula');
    }

    if (policy.passwordRequireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Senha deve conter pelo menos um caractere especial');
    }

    // Verificar padrões comuns
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /letmein/i
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      errors.push('Senha muito comum ou previsível');
    }

    // Calcular força da senha
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    let score = 0;

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
    if (password.length >= 16) score += 1;

    if (score <= 3) strength = 'weak';
    else if (score <= 5) strength = 'medium';
    else strength = 'strong';

    return {
      valid: errors.length === 0,
      errors,
      strength
    };
  }

  // Criptografar dados sensíveis
  async encryptSensitiveData(data: string): Promise<string> {
    try {
      // Implementar criptografia AES-256
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
      );
      
      // Combinar IV e dados criptografados
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      return btoa(String.fromCharCode(...Array.from(combined)));
    } catch (error) {
      console.error('Erro ao criptografar dados:', error);
      throw error;
    }
  }

  // Verificar integridade de dados
  async verifyDataIntegrity(originalData: string, hash: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(originalData);
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex === hash;
    } catch (error) {
      console.error('Erro ao verificar integridade:', error);
      return false;
    }
  }

  // Detectar atividade suspeita
  async detectSuspiciousActivity(userId: string, activity: {
    type: string;
    ipAddress: string;
    userAgent: string;
    metadata?: any;
  }): Promise<boolean> {
    try {
      // Verificar múltiplos IPs em pouco tempo
      const recentEvents = await this.getRecentSecurityEvents(userId);
      const uniqueIPs = new Set(recentEvents.map(e => e.ipAddress));
      
      if (uniqueIPs.size > 3) {
        await this.logSecurityEvent({
          userId,
          type: 'suspicious_activity',
          severity: 'medium',
          description: 'Múltiplos IPs detectados em período curto',
          ipAddress: activity.ipAddress,
          userAgent: activity.userAgent,
          metadata: { uniqueIPs: Array.from(uniqueIPs) }
        });
        return true;
      }

      // Verificar horários incomuns (fora do horário comercial)
      const now = new Date();
      const hour = now.getHours();
      if (hour < 6 || hour > 22) {
        await this.logSecurityEvent({
          userId,
          type: 'suspicious_activity',
          severity: 'low',
          description: 'Atividade fora do horário comercial',
          ipAddress: activity.ipAddress,
          userAgent: activity.userAgent,
          metadata: { hour }
        });
      }

      return false;
    } catch (error) {
      console.error('Erro ao detectar atividade suspeita:', error);
      return false;
    }
  }

  // Auditoria de acesso a dados
  async auditDataAccess(audit: {
    userId: string;
    dataType: string;
    action: 'read' | 'write' | 'delete';
    resourceId: string;
    ipAddress: string;
  }): Promise<void> {
    try {
      await this.logSecurityEvent({
        userId: audit.userId,
        type: 'data_access',
        severity: 'low',
        description: `${audit.action.toUpperCase()} em ${audit.dataType}`,
        ipAddress: audit.ipAddress,
        userAgent: navigator.userAgent,
        metadata: {
          dataType: audit.dataType,
          action: audit.action,
          resourceId: audit.resourceId
        }
      });
    } catch (error) {
      console.error('Erro ao auditar acesso a dados:', error);
    }
  }

  // Helpers privados
  private async getSecurityPolicy(): Promise<SecurityPolicy> {
    try {
      const policyDoc = await getDoc(doc(db, 'security_policies', 'default'));
      if (policyDoc.exists()) {
        return { ...this.defaultPolicy, ...policyDoc.data() };
      }
      return this.defaultPolicy;
    } catch {
      return this.defaultPolicy;
    }
  }

  private async getRecentLoginAttempts(userId: string, ipAddress: string): Promise<number> {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      const q = query(
        collection(db, 'security_events'),
        where('userId', '==', userId),
        where('type', '==', 'login_attempt'),
        where('ipAddress', '==', ipAddress),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.filter(doc => {
        const timestamp = doc.data().timestamp?.toDate();
        return timestamp && timestamp > thirtyMinutesAgo;
      }).length;
    } catch {
      return 0;
    }
  }

  private async getRecentSecurityEvents(userId: string): Promise<SecurityEvent[]> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const q = query(
        collection(db, 'security_events'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => doc.data() as SecurityEvent)
        .filter(event => {
          const timestamp = event.timestamp?.toDate();
          return timestamp && timestamp > oneHourAgo;
        });
    } catch {
      return [];
    }
  }

  private async sendSecurityAlert(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      // Implementar notificação para administradores
      console.warn('ALERTA DE SEGURANÇA CRÍTICO:', event);
      
      // Em produção, integrar com sistema de notificações
      // await emailService.sendSecurityAlert(event);
      // await slackService.sendAlert(event);
    } catch (error) {
      console.error('Erro ao enviar alerta de segurança:', error);
    }
  }
}

export const securityService = new SecurityService();

// Hook para React
export function useSecurity() {
  const checkSecurity = async (userId: string, ipAddress: string) => {
    return await securityService.checkSuspiciousLogin(userId, ipAddress);
  };
  
  const validatePassword = (password: string) => {
    return securityService.validatePassword(password);
  };
  
  const logEvent = async (event: Omit<SecurityEvent, 'id' | 'timestamp'>) => {
    await securityService.logSecurityEvent(event);
  };
  
  return {
    checkSecurity,
    validatePassword,
    logEvent
  };
}