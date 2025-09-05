
// Helpers de segurança que podem ser usados no client-side
import { getAuth, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export type UserRole = 'colaborador' | 'gestor' | 'admin' | 'adminMaster' | 'adminmaster' | 'superadmin';

export interface UserClaims {
  role?: UserRole;
  empresaId?: string;
  company?: string;
  canAccessSystems?: string[];
  sistemasAtivos?: string[];
  bootstrapAdmin?: boolean;
  email_verified?: boolean;
  exp?: number;
  iat?: number;
  iss?: string;
  aud?: string;
}

export interface AuthClaims extends UserClaims {
  custom_claims_set?: boolean;
  security_level?: 'low' | 'medium' | 'high';
}

export interface SecurityContext {
  user: User | null;
  claims: UserClaims | null;
  empresaId?: string;
  role?: UserRole;
}

export async function getUserClaims(user: User | null): Promise<UserClaims | null> {
  if (!user) return null;
  
  try {
    const tokenResult = await user.getIdTokenResult(true);
    return tokenResult.claims as UserClaims;
  } catch (error) {
    console.error('Erro ao obter claims:', error);
    return null;
  }
}

export function hasRole(claims: UserClaims | null, minRole: UserRole): boolean {
  if (!claims?.role) return false;
  
  const roleHierarchy: Record<UserRole, number> = {
    'colaborador': 1,
    'gestor': 2, 
    'admin': 3,
    'adminMaster': 4,
    'adminmaster': 4,
    'superadmin': 5
  };
  
  return roleHierarchy[claims.role] >= roleHierarchy[minRole];
}

export function isSuperAdmin(claims: UserClaims | null): boolean {
  return claims?.role === 'superadmin';
}

export function isAdmin(claims: UserClaims | null): boolean {
  return hasRole(claims, 'admin');
}

export function isGestor(claims: UserClaims | null): boolean {
  return hasRole(claims, 'gestor');
}

export function belongsToCompany(claims: UserClaims | null, empresaId: string): boolean {
  if (isSuperAdmin(claims)) return true;
  return claims?.empresaId === empresaId;
}

export async function checkCompanyAccess(user: User | null, empresaId: string): Promise<boolean> {
  if (!user) return false;
  
  const claims = await getUserClaims(user);
  return belongsToCompany(claims, empresaId);
}

export function createSecurityContext(user: User | null, claims: UserClaims | null): SecurityContext {
  return {
    user,
    claims,
    empresaId: claims?.empresaId,
    role: claims?.role
  };
}

export async function validateUserAccess(
  user: User | null, 
  requiredRole: UserRole, 
  empresaId?: string
): Promise<boolean> {
  if (!user) return false;
  
  const claims = await getUserClaims(user);
  if (!hasRole(claims, requiredRole)) return false;
  
  if (empresaId && !belongsToCompany(claims, empresaId)) return false;
  
  return true;
}

export function sanitizeUserData(user: User | null) {
  if (!user) return null;
  
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified
  };
}

export function hasAdminAccess(claims: UserClaims | null): boolean {
  return hasRole(claims, 'admin');
}

export function canAccessSystem(claims: UserClaims | null, system: string): boolean {
  if (isSuperAdmin(claims)) return true;
  if (hasRole(claims, 'admin')) return true;
  
  return (claims?.sistemasAtivos?.includes(system) || 
          claims?.canAccessSystems?.includes(system)) === true;
}

export function getUserEmpresaId(claims: UserClaims | null): string | null {
  return claims?.empresaId || claims?.company || null;
}

export async function logSecurityEvent(
  user: User | null, 
  event: string, 
  details: any = {}
) {
  try {
    if (!user) return;
    
    const eventData = {
      userId: user.uid,
      userEmail: user.email,
      event,
      details,
      timestamp: Timestamp.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      ip: 'client-side' // Em produção, seria obtido do servidor
    };
    
    console.log('Security Event:', eventData);
    // Em produção, enviaria para um endpoint de auditoria
  } catch (error) {
    console.error('Erro ao registrar evento de segurança:', error);
  }
}
