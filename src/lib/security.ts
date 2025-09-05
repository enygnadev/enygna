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
  orderBy,
  updateDoc,
  arrayUnion,
  arrayRemove,
  FieldPath
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

export interface UserSecurityData {
  failedLoginAttempts: number;
  lastFailedLoginTime: any;
  isLockedOut: boolean;
  lockoutEndTime: any;
  blockedIPs: string[];
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

  // Obter dados de segurança do usuário
  private async getUserSecurityData(userId: string): Promise<UserSecurityData> {
    try {
      const userDoc = await getDoc(doc(db, 'user_security_data', userId));
      if (userDoc.exists()) {
        return userDoc.data() as UserSecurityData;
      }
      return {
        failedLoginAttempts: 0,
        lastFailedLoginTime: null,
        isLockedOut: false,
        lockoutEndTime: null,
        blockedIPs: []
      };
    } catch (error) {
      console.error('Erro ao obter dados de segurança do usuário:', error);
      return {
        failedLoginAttempts: 0,
        lastFailedLoginTime: null,
        isLockedOut: false,
        lockoutEndTime: null,
        blockedIPs: []
      };
    }
  }

  // Atualizar dados de segurança do usuário
  private async updateUserSecurityData(userId: string, data: Partial<UserSecurityData>): Promise<void> {
    try {
      await setDoc(doc(db, 'user_security_data', userId), data, { merge: true });
    } catch (error) {
      console.error('Erro ao atualizar dados de segurança do usuário:', error);
    }
  }

  // Bloquear um IP
  async blockIP(ipAddress: string, reason: string): Promise<void> {
    try {
      const policyRef = doc(db, 'security_policies', 'default');
      await updateDoc(policyRef, {
        blockedIPs: arrayUnion(ipAddress)
      });
      await this.logSecurityEvent({
        userId: 'system',
        type: 'security_violation',
        severity: 'high',
        description: `IP bloqueado: ${ipAddress} - ${reason}`,
        ipAddress: ipAddress,
        userAgent: navigator.userAgent
      });
    } catch (error) {
      console.error('Erro ao bloquear IP:', error);
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
      const userSecurityData = await this.getUserSecurityData(userId);

      // Verificar IP bloqueado globalmente
      if (policy.blockedIPs.includes(ipAddress)) {
        await this.logSecurityEvent({
          userId,
          type: 'login_attempt',
          severity: 'high',
          description: 'Tentativa de login de IP globalmente bloqueado',
          ipAddress,
          userAgent: navigator.userAgent
        });
        return { allowed: false, reason: 'IP bloqueado' };
      }

      // Verificar se o IP está bloqueado para este usuário específico
      if (userSecurityData.blockedIPs.includes(ipAddress)) {
        await this.logSecurityEvent({
          userId,
          type: 'login_attempt',
          severity: 'high',
          description: 'Tentativa de login de IP bloqueado para este usuário',
          ipAddress,
          userAgent: navigator.userAgent
        });
        return { allowed: false, reason: 'IP bloqueado' };
      }

      // Verificar se o usuário está bloqueado
      if (userSecurityData.isLockedOut && userSecurityData.lockoutEndTime && userSecurityData.lockoutEndTime.toDate() > new Date()) {
        await this.logSecurityEvent({
          userId,
          type: 'login_attempt',
          severity: 'high',
          description: 'Tentativa de login de conta bloqueada',
          ipAddress,
          userAgent: navigator.userAgent
        });
        return { allowed: false, reason: `Conta bloqueada. Tente novamente em ${userSecurityData.lockoutEndTime.toDate().toLocaleTimeString()}` };
      }

      // Verificar tentativas recentes
      const recentAttempts = userSecurityData.failedLoginAttempts;
      const lastFailedLoginTime = userSecurityData.lastFailedLoginTime?.toDate();
      const lockoutDuration = policy.lockoutDurationMs;

      if (recentAttempts >= policy.maxLoginAttempts) {
        // Bloquear IP automaticamente após muitas tentativas
        await this.blockIP(ipAddress, 'Muitas tentativas de login falharam');
        await this.updateUserSecurityData(userId, {
          isLockedOut: true,
          lockoutEndTime: new Date(Date.now() + lockoutDuration),
          failedLoginAttempts: recentAttempts + 1,
          lastFailedLoginTime: serverTimestamp()
        });

        await this.logSecurityEvent({
          userId,
          type: 'suspicious_activity',
          severity: 'high',
          description: 'Muitas tentativas de login falharam. Usuário bloqueado.',
          ipAddress,
          userAgent: navigator.userAgent,
          metadata: { attempts: recentAttempts + 1 }
        });

        return {
          allowed: false,
          reason: 'Muitas tentativas falharam. Sua conta foi temporariamente bloqueada.'
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
        // Merge com os padrões para garantir que todos os campos estejam presentes
        return { ...this.defaultPolicy, ...policyDoc.data() };
      }
      return this.defaultPolicy;
    } catch (error) {
      console.error('Erro ao obter política de segurança:', error);
      return this.defaultPolicy;
    }
  }

  // Obter tentativas de login recentes para um usuário específico
  private async getRecentLoginAttempts(userId: string, ipAddress: string): Promise<number> {
    try {
      const policy = await this.getSecurityPolicy();
      const lockoutDuration = policy.lockoutDurationMs;
      const lockoutStartTime = new Date(Date.now() - lockoutDuration);

      const q = query(
        collection(db, 'security_events'),
        where('userId', '==', userId),
        where('type', '==', 'login_attempt'),
        where('ipAddress', '==', ipAddress),
        where('timestamp', '>=', lockoutStartTime),
        orderBy('timestamp', 'desc'),
        limit(policy.maxLoginAttempts + 1) // Pega um a mais para verificar o limite
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Erro ao obter tentativas de login recentes:', error);
      return 0;
    }
  }

  // Obter eventos de segurança recentes para um usuário
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
    } catch (error) {
      console.error('Erro ao obter eventos de segurança recentes:', error);
      return [];
    }
  }

  // Enviar alerta de segurança
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
'use client';

import { auth, db } from './firebase';
import { getIdTokenResult, User } from 'firebase/auth';
import { query, where, Query, DocumentReference, collection } from 'firebase/firestore';

// ===== TIPOS =====
export interface AuthClaims {
  role?: string;
  empresaId?: string;
  company?: string;
  sistemasAtivos?: string[];
  canAccessSystems?: string[];
  permissions?: Record<string, boolean>;
  bootstrapAdmin?: boolean;
  email_verified?: boolean;
}

export interface SecureUser {
  uid: string;
  email?: string;
  claims: AuthClaims;
}

// ===== CACHE DE CLAIMS =====
let claimsCache: AuthClaims | null = null;
let lastClaimsUpdate = 0;
const CLAIMS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// ===== OBTER CLAIMS ATUAIS =====
export async function getClaims(forceRefresh = false): Promise<AuthClaims> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const now = Date.now();
  
  // Usar cache se não forçar refresh e cache ainda válido
  if (!forceRefresh && claimsCache && (now - lastClaimsUpdate) < CLAIMS_CACHE_TTL) {
    return claimsCache;
  }

  try {
    // Forçar refresh do token se solicitado
    const tokenResult = await user.getIdTokenResult(forceRefresh);
    claimsCache = tokenResult.claims as AuthClaims;
    lastClaimsUpdate = now;
    
    console.log('Claims obtidas:', claimsCache);
    return claimsCache;
  } catch (error) {
    console.error('Erro ao obter claims:', error);
    
    // Fallback para claims vazias
    claimsCache = {};
    return claimsCache;
  }
}

// ===== FORÇAR REFRESH DE CLAIMS =====
export async function refreshClaims(): Promise<AuthClaims> {
  console.log('Forçando refresh das claims...');
  return await getClaims(true);
}

// ===== INJETAR EMPRESAID EM DOCUMENTOS =====
export async function withEmpresa<T extends Record<string, any>>(doc: T): Promise<T & { empresaId: string }> {
  const claims = await getClaims();
  const empresaId = claims.empresaId || claims.company;
  
  if (!empresaId) {
    throw new Error('EmpresaId não encontrado nas claims do usuário');
  }

  return {
    ...doc,
    empresaId
  };
}

// ===== QUERY SEGURA COM FILTRO DE EMPRESA =====
export async function secureQuery<T>(colRef: Query<T> | any): Promise<Query<T>> {
  const claims = await getClaims();
  const empresaId = claims.empresaId || claims.company;
  
  if (!empresaId) {
    throw new Error('EmpresaId não encontrado nas claims do usuário. Usuário não está associado a uma empresa.');
  }

  // Aplicar filtro de empresa
  return query(colRef, where('empresaId', '==', empresaId)) as Query<T>;
}

// ===== VERIFICAR ACESSO A SISTEMA =====
export async function hasAccess(system: 'crm' | 'frota' | 'ponto' | 'financeiro' | 'documentos' | 'chamados'): Promise<boolean> {
  try {
    const claims = await getClaims();
    
    // SuperAdmins têm acesso a tudo
    if (claims.role === 'superadmin' || claims.role === 'adminmaster' || claims.bootstrapAdmin) {
      return true;
    }

    // Admins e gestores têm acesso a tudo
    if (claims.role === 'admin' || claims.role === 'gestor') {
      return true;
    }

    // Verificar sistemasAtivos
    if (claims.sistemasAtivos && claims.sistemasAtivos.includes(system)) {
      return true;
    }

    // Verificar canAccessSystems (fallback)
    if (claims.canAccessSystems && claims.canAccessSystems.includes(system)) {
      return true;
    }

    // Verificar permissions específicas
    if (claims.permissions && claims.permissions[system] === true) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Erro ao verificar acesso:', error);
    return false;
  }
}

// ===== VERIFICAR SE É ADMIN =====
export async function isAdmin(): Promise<boolean> {
  try {
    const claims = await getClaims();
    return ['superadmin', 'adminmaster', 'admin', 'gestor'].includes(claims.role || '');
  } catch {
    return false;
  }
}

// ===== VERIFICAR SE É SUPERADMIN =====
export async function isSuperAdmin(): Promise<boolean> {
  try {
    const claims = await getClaims();
    return claims.role === 'superadmin' || 
           claims.role === 'adminmaster' || 
           claims.bootstrapAdmin === true;
  } catch {
    return false;
  }
}

// ===== VERIFICAR SE EMAIL ESTÁ VERIFICADO =====
export async function isEmailVerified(): Promise<boolean> {
  try {
    const claims = await getClaims();
    return claims.email_verified === true;
  } catch {
    return false;
  }
}

// ===== OBTER EMPRESAID ATUAL =====
export async function getCurrentEmpresaId(): Promise<string | null> {
  try {
    const claims = await getClaims();
    return claims.empresaId || claims.company || null;
  } catch {
    return null;
  }
}

// ===== VERIFICAR SE USUÁRIO PERTENCE À EMPRESA =====
export async function belongsToCompany(empresaId: string): Promise<boolean> {
  try {
    const currentEmpresaId = await getCurrentEmpresaId();
    return currentEmpresaId === empresaId;
  } catch {
    return false;
  }
}

// ===== LIMPAR CACHE DE CLAIMS =====
export function clearClaimsCache(): void {
  claimsCache = null;
  lastClaimsUpdate = 0;
}

// ===== VERIFICAR PERMISSÕES PARA OPERAÇÕES ESPECÍFICAS =====
export async function canCreatePonto(): Promise<boolean> {
  const emailVerified = await isEmailVerified();
  const systemAccess = await hasAccess('ponto');
  return emailVerified && systemAccess;
}

export async function canEditFinanceiro(): Promise<boolean> {
  const adminAccess = await isAdmin();
  const systemAccess = await hasAccess('financeiro');
  return adminAccess && systemAccess;
}

export async function canEditPonto(pontoTimestamp: number): Promise<boolean> {
  const isAdminUser = await isAdmin();
  const systemAccess = await hasAccess('ponto');
  
  if (!systemAccess) return false;
  if (isAdminUser) return true;
  
  // Verificar janela de 5 minutos para edição própria
  const now = Date.now();
  const fiveMinutesInMs = 5 * 60 * 1000;
  return (now - pontoTimestamp) <= fiveMinutesInMs;
}

// ===== TRATAMENTO DE ERROS DE PERMISSÃO =====
export function handlePermissionError(error: any): string {
  if (error?.code === 'permission-denied') {
    return 'Você não tem permissão para realizar esta ação. Entre em contato com o administrador do sistema.';
  }
  
  if (error?.message?.includes('empresaId')) {
    return 'Erro: Usuário não está associado a uma empresa válida.';
  }
  
  if (error?.message?.includes('email_verified')) {
    return 'Erro: É necessário verificar seu email antes de continuar.';
  }
  
  return error?.message || 'Erro desconhecido ao processar a solicitação.';
}

// ===== VERIFICAR SE PODE ACESSAR ROTA =====
export async function canAccessRoute(requiredSystems: string[], requiredRoles?: string[]): Promise<boolean> {
  try {
    const claims = await getClaims();
    
    // SuperAdmins podem acessar tudo
    if (await isSuperAdmin()) {
      return true;
    }
    
    // Verificar role se especificado
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(claims.role || '')) {
        return false;
      }
    }
    
    // Verificar acesso aos sistemas necessários
    for (const system of requiredSystems) {
      if (!(await hasAccess(system as any))) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

// ===== DEBUG: IMPRIMIR INFORMAÇÕES DE SEGURANÇA =====
export async function debugSecurity(): Promise<void> {
  try {
    console.group('🔐 Informações de Segurança');
    
    const user = auth.currentUser;
    console.log('👤 Usuário:', user?.email, user?.uid);
    
    const claims = await getClaims();
    console.log('🎫 Claims:', claims);
    
    const empresaId = await getCurrentEmpresaId();
    console.log('🏢 EmpresaId:', empresaId);
    
    const isEmailVerifiedResult = await isEmailVerified();
    console.log('📧 Email Verificado:', isEmailVerifiedResult);
    
    const systems = ['crm', 'frota', 'ponto', 'financeiro', 'documentos', 'chamados'];
    for (const system of systems) {
      const access = await hasAccess(system as any);
      console.log(`🎯 Acesso ${system}:`, access);
    }
    
    console.groupEnd();
  } catch (error) {
    console.error('Erro ao imprimir informações de segurança:', error);
  }
}
