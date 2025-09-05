
import { auth } from './firebase';
import * as CryptoJS from 'crypto-js';

// Advanced Security Configuration
export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  encryptionKey: string;
  csrfSecret: string;
  honeypotEndpoints: string[];
}

// Session Security Manager
class SessionSecurityManager {
  private static instance: SessionSecurityManager;
  private activeSessions = new Map<string, SessionData>();
  private suspiciousIPs = new Set<string>();
  private rateLimitStore = new Map<string, RateLimitData>();

  private constructor() {}

  static getInstance(): SessionSecurityManager {
    if (!SessionSecurityManager.instance) {
      SessionSecurityManager.instance = new SessionSecurityManager();
    }
    return SessionSecurityManager.instance;
  }

  // Multi-factor Session Validation
  validateSession(sessionId: string, userAgent: string, ipAddress: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    // Check session expiry
    if (Date.now() > session.expiresAt) {
      this.invalidateSession(sessionId);
      return false;
    }

    // Validate user agent fingerprint
    if (session.userAgentHash !== this.hashUserAgent(userAgent)) {
      this.logSecurityEvent('SESSION_HIJACK_ATTEMPT', { sessionId, ipAddress });
      this.invalidateSession(sessionId);
      return false;
    }

    // Check for suspicious IP changes
    if (session.ipAddress !== ipAddress && this.suspiciousIPs.has(ipAddress)) {
      this.logSecurityEvent('SUSPICIOUS_IP_ACCESS', { sessionId, oldIP: session.ipAddress, newIP: ipAddress });
      return false;
    }

    return true;
  }

  private hashUserAgent(userAgent: string): string {
    return CryptoJS.SHA256(userAgent).toString();
  }

  private invalidateSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  private logSecurityEvent(event: string, data: any): void {
    console.error(`[SECURITY ALERT] ${event}:`, data);
    // Send to monitoring system
  }
}

// Advanced Input Sanitization
export class InputSanitizer {
  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /expression\s*\(/gi,
    /eval\s*\(/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi
  ];

  private static readonly SQL_PATTERNS = [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b|\bUPDATE\b)/gi,
    /(\bOR\b\s+\d+\s*=\s*\d+|\bAND\b\s+\d+\s*=\s*\d+)/gi,
    /(';|'--|\bor\b\s+'1'\s*=\s*'1')/gi,
    /(\bEXEC\b|\bEXECUTE\b)/gi
  ];

  static sanitizeInput(input: string, type: 'html' | 'sql' | 'text' = 'text'): string {
    if (!input || typeof input !== 'string') return '';

    let sanitized = input.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // HTML sanitization
    if (type === 'html' || type === 'text') {
      for (const pattern of this.XSS_PATTERNS) {
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // SQL injection prevention
    if (type === 'sql' || type === 'text') {
      for (const pattern of this.SQL_PATTERNS) {
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // Encode HTML entities
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    return sanitized;
  }

  static validateFileUpload(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check file size (10MB max for security)
    if (file.size > 10 * 1024 * 1024) {
      errors.push('Arquivo muito grande (máximo 10MB)');
    }

    // Strict file type validation
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push('Tipo de arquivo não permitido');
    }

    // Check for double extensions and executable extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js', '.jar'];
    const fileName = file.name.toLowerCase();
    
    for (const ext of dangerousExtensions) {
      if (fileName.includes(ext)) {
        errors.push('Extensão de arquivo perigosa detectada');
      }
    }

    // Check for suspicious file names
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      errors.push('Nome de arquivo suspeito');
    }

    return { isValid: errors.length === 0, errors };
  }
}

// Advanced Rate Limiting with IP Intelligence
export class AdvancedRateLimit {
  private static limiter = new Map<string, RateLimitEntry[]>();
  private static suspiciousIPs = new Set<string>();
  private static blockedIPs = new Set<string>();

  static checkLimit(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const entries = this.limiter.get(key) || [];

    // Remove old entries
    const recentEntries = entries.filter(entry => now - entry.timestamp < windowMs);

    if (recentEntries.length >= maxAttempts) {
      this.suspiciousIPs.add(key);
      if (recentEntries.length >= maxAttempts * 2) {
        this.blockedIPs.add(key);
      }
      return false;
    }

    // Record this attempt
    recentEntries.push({ timestamp: now, suspicious: this.suspiciousIPs.has(key) });
    this.limiter.set(key, recentEntries);

    return true;
  }

  static isBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  static unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
  }
}

// Security Event Logger
class AdvancedSecurityLogger {
  static logEvent(event: SecurityEventType, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      severity,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      ip: details.ip || 'unknown'
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[SECURITY EVENT] ${severity.toUpperCase()}: ${event}`, logEntry);
    }

    // Send to monitoring service in production
    if (severity === 'high' || severity === 'critical') {
      this.sendAlert(logEntry);
    }

    // Store in Firebase for audit trail
    this.storeSecurityEvent(logEntry);
  }

  private static async sendAlert(logEntry: any): Promise<void> {
    try {
      // Implementation for real-time alerts
      await fetch('/api/security/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  private static async storeSecurityEvent(logEntry: any): Promise<void> {
    try {
      // Store in Firebase security_events collection
      // Implementation depends on your Firebase setup
    } catch (error) {
      console.error('Failed to store security event:', error);
    }
  }
}

// Types
interface SessionData {
  userId: string;
  expiresAt: number;
  userAgentHash: string;
  ipAddress: string;
  createdAt: number;
}

interface RateLimitData {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
}

interface RateLimitEntry {
  timestamp: number;
  suspicious: boolean;
}

type SecurityEventType = 
  | 'LOGIN_ATTEMPT'
  | 'LOGIN_FAILURE'
  | 'SESSION_HIJACK_ATTEMPT'
  | 'SUSPICIOUS_IP_ACCESS'
  | 'XSS_ATTEMPT'
  | 'SQL_INJECTION_ATTEMPT'
  | 'FILE_UPLOAD_VIOLATION'
  | 'RATE_LIMIT_EXCEEDED'
  | 'HONEYPOT_ACCESS'
  | 'CRITICAL_INPUT_THREAT'
  | 'HIGH_INPUT_THREAT'
  | 'INVALID_EMPRESA_ACCESS'
  | 'SUSPICIOUS_REQUEST'
  | 'SUSPICIOUS_USER_AGENT'
  | 'BOT_ACCESS_ATTEMPT'
  | 'CSRF_PROTECTION_TRIGGERED';

export { SessionSecurityManager, AdvancedSecurityLogger as SecurityLogger };
