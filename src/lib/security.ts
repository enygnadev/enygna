
import { auth, db } from './firebase';
import { User } from 'firebase/auth';
import { query, where, Query, DocumentReference, collection } from 'firebase/firestore';
import { UserData, UserPermissions } from '@/src/lib/types';

// ===== TIPOS DE SEGURANÇA =====
export interface AuthClaims {
  bootstrapAdmin?: boolean;
  role?: 'superadmin' | 'admin' | 'gestor' | 'colaborador' | 'adminmaster';
  empresaId?: string;
  company?: string;
  permissions?: UserPermissions;
  sistemasAtivos?: string[];
  canAccessSystems?: string[];
  isEmpresa?: boolean;
  tipo?: string;
  email_verified?: boolean;
}

export interface SecureUser {
  uid: string;
  email?: string;
  role?: string;
  empresaId?: string;
  claims: AuthClaims;
}

// ===== CACHE DE CLAIMS =====
let claimsCache: Map<string, { claims: AuthClaims; timestamp: number }> = new Map();
const CLAIMS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// ===== FUNÇÕES DE VERIFICAÇÃO DE ACESSO =====
export function isSuperAdmin(claims: AuthClaims): boolean {
  return claims.bootstrapAdmin === true ||
         claims.role === 'superadmin' ||
         claims.role === 'adminmaster';
}

export function isAdmin(claims: AuthClaims): boolean {
  return isSuperAdmin(claims) || 
         claims.role === 'admin' || 
         claims.role === 'gestor';
}

export function hasSystemAccess(claims: AuthClaims, system: string): boolean {
  if (isSuperAdmin(claims) || isAdmin(claims)) return true;
  
  return (claims.sistemasAtivos?.includes(system) || 
          claims.canAccessSystems?.includes(system)) === true;
}

export function belongsToCompany(claims: AuthClaims, empresaId: string): boolean {
  if (isSuperAdmin(claims)) return true;
  return claims.empresaId === empresaId || claims.company === empresaId;
}

export function canAccessRoute(user: User | null, claims: AuthClaims | null, route: string): boolean {
  if (!user || !claims) return false;
  
  if (isSuperAdmin(claims)) return true;

  const routeSystemMap: Record<string, string> = {
    '/financeiro': 'financeiro',
    '/chamados': 'chamados',
    '/ponto': 'ponto',
    '/crm': 'crm',
    '/frota': 'frota',
    '/documentos': 'documentos'
  };

  const system = routeSystemMap[route];
  if (system) {
    return hasSystemAccess(claims, system);
  }

  return true; // Rotas públicas
}

export function hasAccess(profile: any, requiredRole: string, requiredSystem?: string): boolean {
  if (!profile) return false;
  
  const claims = profile.claims || {};
  
  // Verificar se é superadmin
  if (isSuperAdmin(claims)) return true;
  
  // Verificar role
  const roles = ['colaborador', 'gestor', 'admin', 'superadmin', 'adminmaster'];
  const userRoleIndex = roles.indexOf(profile.role || 'colaborador');
  const requiredRoleIndex = roles.indexOf(requiredRole);
  
  if (userRoleIndex < requiredRoleIndex) return false;
  
  // Verificar sistema se especificado
  if (requiredSystem && !hasSystemAccess(claims, requiredSystem)) {
    return false;
  }
  
  return true;
}

export function getCurrentEmpresaId(profile: any): string | null {
  if (!profile) return null;
  return profile.empresaId || profile.claims?.empresaId || profile.claims?.company || null;
}

export function isEmailVerified(profile: any): boolean {
  return profile?.claims?.email_verified === true;
}

// ===== FUNÇÕES ADICIONAIS =====
export async function getClaims(user: User): Promise<AuthClaims | null> {
  if (!user) return null;
  
  const cacheKey = user.uid;
  const cached = claimsCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CLAIMS_CACHE_DURATION) {
    return cached.claims;
  }
  
  try {
    const tokenResult = await user.getIdTokenResult(true);
    const claims = tokenResult.claims as AuthClaims;
    
    claimsCache.set(cacheKey, { claims, timestamp: Date.now() });
    return claims;
  } catch (error) {
    console.error('Erro ao obter claims:', error);
    return null;
  }
}

export async function refreshClaims(user: User): Promise<AuthClaims | null> {
  if (!user) return null;
  
  claimsCache.delete(user.uid);
  return getClaims(user);
}

export function clearClaimsCache(): void {
  claimsCache.clear();
}

export function withEmpresa(empresaId: string) {
  return (ref: any) => {
    return query(ref, where('empresaId', '==', empresaId));
  };
}

export function secureQuery(baseQuery: Query, claims: AuthClaims): Query {
  if (isSuperAdmin(claims)) return baseQuery;
  
  const empresaId = claims.empresaId || claims.company;
  if (empresaId) {
    return query(baseQuery, where('empresaId', '==', empresaId));
  }
  
  return baseQuery;
}

export function canCreatePonto(claims: AuthClaims): boolean {
  return hasSystemAccess(claims, 'ponto') && claims.email_verified === true;
}

export function canEditFinanceiro(claims: AuthClaims): boolean {
  return hasSystemAccess(claims, 'financeiro') && isAdmin(claims);
}

export function canEditPonto(claims: AuthClaims, pontoUserId: string, pontoTimestamp: number): boolean {
  if (isAdmin(claims)) return true;
  
  // Usuário pode editar próprio ponto dentro de 5 minutos
  const agora = Date.now();
  const cincoMinutos = 5 * 60 * 1000;
  
  return claims.empresaId === pontoUserId && 
         (agora - pontoTimestamp) < cincoMinutos;
}

export function handlePermissionError(error: any): string {
  if (error?.code === 'permission-denied') {
    return 'Você não tem permissão para acessar este recurso.';
  }
  return 'Erro de permissão desconhecido.';
}

export function debugSecurity(user: User | null, claims: AuthClaims | null): void {
  console.log('=== DEBUG SECURITY ===');
  console.log('User:', user?.uid);
  console.log('Claims:', claims);
  console.log('Is SuperAdmin:', claims ? isSuperAdmin(claims) : false);
  console.log('Is Admin:', claims ? isAdmin(claims) : false);
  console.log('======================');
}
