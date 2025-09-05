'use client';

import { auth, db } from './firebase';
import { getIdTokenResult, User } from 'firebase/auth';
import { doc, getDoc, DocumentSnapshot, DocumentData } from 'firebase/firestore';
import { 
  getClaims,
  refreshClaims,
  withEmpresa,
  secureQuery,
  hasAccess,
  isAdmin,
  baseSuperAdmin,
  isEmailVerified,
  getCurrentEmpresaId,
  belongsToCompany,
  clearClaimsCache,
  canCreatePonto,
  canEditFinanceiro,
  canEditPonto,
  handlePermissionError,
  canAccessRoute,
  debugSecurity,
  type AuthClaims,
  type SecureUser
} from './security';

// Interface para perfil de sessão
export interface SessionProfile {
  uid: string;
  email?: string;
  displayName?: string;
  role?: 'superadmin' | 'admin' | 'gestor' | 'colaborador' | 'adminmaster';
  empresaId?: string;
  sistemasAtivos?: string[];
  claims?: AuthClaims;
}

// Função de verificação de super admin com validação adicional de segurança
export function isSuperAdmin(user: any): boolean {
  if (!user) return false;

  // Validação de entrada para prevenir ataques
  if (typeof user !== 'object' || user === null) return false;

  // Verificar claims do token (mais seguro)
  if (user.claims?.bootstrapAdmin === true) return true;
  if (user.claims?.role === 'superadmin') return true;
  if (user.claims?.role === 'adminmaster') return true;

  // Verificar dados do documento (fallback)
  if (user.bootstrapAdmin === true) return true;
  if (user.role === 'superadmin') return true;
  if (user.role === 'adminmaster') return true;

  // Lista controlada de emails de desenvolvimento (validação adicional)
  const devEmails = ['enygnadev@gmail.com', 'enygna@enygna.com'];
  if (user.email && devEmails.includes(user.email)) {
    // Log de acesso de desenvolvimento para auditoria
    console.warn('[SECURITY] Dev admin access:', user.email);
    return true;
  }

  return false;
}

// Função específica para perfis de sessão
export function isAdminMaster(profile: SessionProfile | null): boolean {
  if (!profile) return false;

  return profile.role === 'adminmaster' ||
         profile.role === 'superadmin' ||
         profile.claims?.bootstrapAdmin === true;
}

// Verificação de acesso administrativo com validação de segurança
export function hasAdminAccess(user: any): boolean {
  if (!user) return false;

  // Primeiro verificar se é super admin
  if (isSuperAdmin(user)) return true;

  // Verificar role com validação de tipo
  const role = user.role || user.claims?.role;
  const adminRoles = ['admin', 'gestor'];

  return typeof role === 'string' && adminRoles.includes(role);
}

// Verificação de acesso a sistema específico com validação de segurança
export function hasSystemAccess(profile: SessionProfile | null, system: string): boolean {
  if (!profile || !system) return false;

  // Validação de entrada
  if (typeof system !== 'string' || system.length === 0) return false;

  // SuperAdmins podem acessar tudo
  if (isAdminMaster(profile)) return true;

  // Verificar sistemasAtivos com validação de array
  const sistemasAtivos = profile.sistemasAtivos;
  if (Array.isArray(sistemasAtivos) && sistemasAtivos.includes(system)) return true;

  // Verificar claims com validação adicional
  if (profile.claims) {
    const claimsSistemas = profile.claims.sistemasAtivos;
    const canAccessSystems = profile.claims.canAccessSystems;

    if (Array.isArray(claimsSistemas) && claimsSistemas.includes(system)) return true;
    if (Array.isArray(canAccessSystems) && canAccessSystems.includes(system)) return true;
  }

  return false;
}

// Verificação de acesso a sistema (função alternativa com validação)
export function canAccessSystem(user: any, system: string): boolean {
  if (!user || !system) return false;

  // Validação de entrada
  if (typeof system !== 'string') return false;

  if (isSuperAdmin(user) || hasAdminAccess(user)) return true;

  const sistemasAtivos = user.sistemasAtivos || user.claims?.sistemasAtivos || [];
  const canAccessSystems = user.canAccessSystems || user.claims?.canAccessSystems || [];

  // Validação de arrays para prevenir ataques
  if (!Array.isArray(sistemasAtivos) || !Array.isArray(canAccessSystems)) return false;

  return sistemasAtivos.includes(system) || canAccessSystems.includes(system);
}

// Obter empresa ID com validação de segurança
export function getUserEmpresaId(user: any): string | null {
  if (!user) return null;

  const empresaId = user.empresaId || user.claims?.empresaId || user.claims?.company;

  // Validação do tipo e formato
  if (typeof empresaId === 'string' && empresaId.length > 0) {
    return empresaId;
  }

  return null;
}

// Função para obter perfil completo do usuário com validações de segurança
export async function getUserProfile(user: User): Promise<SessionProfile> {
  try {
    // Validação de entrada
    if (!user || !user.uid) {
      throw new Error('Usuário inválido');
    }

    const tokenResult = await user.getIdTokenResult(true);
    const claims = tokenResult.claims as AuthClaims;

    // Tentar obter dados do Firestore com timeout
    let userData: any = {};
    try {
      const userDoc = await Promise.race([
        getDoc(doc(db, 'users', user.uid)),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]) as DocumentSnapshot<DocumentData>;

      if (userDoc && userDoc.exists()) {
        userData = userDoc.data() || {};
      }
    } catch (error) {
      console.warn('Erro ao obter dados do usuário do Firestore:', error);
      // Continuar com dados básicos do token
    }

    // Validação e sanitização dos dados
    const profile: SessionProfile = {
      uid: user.uid,
      email: user.email || undefined,
      displayName: user.displayName || userData.displayName || undefined,
      role: validateRole(claims.role || userData.role),
      empresaId: claims.empresaId || userData.empresaId || undefined,
      sistemasAtivos: validateStringArray(claims.sistemasAtivos || userData.sistemasAtivos),
      claims
    };

    return profile;
  } catch (error) {
    console.error('Erro ao obter perfil do usuário:', error);

    // Fallback básico seguro
    return {
      uid: user.uid,
      email: user.email || undefined,
      displayName: user.displayName || undefined,
      role: 'colaborador',
      claims: {}
    };
  }
}

// Função para validar role
function validateRole(role: any): SessionProfile['role'] {
  const validRoles = ['superadmin', 'admin', 'gestor', 'colaborador', 'adminmaster'];

  if (typeof role === 'string' && validRoles.includes(role)) {
    return role as SessionProfile['role'];
  }

  return 'colaborador'; // Default seguro
}

// Função para validar array de strings
function validateStringArray(arr: any): string[] {
  if (!Array.isArray(arr)) return [];

  return arr.filter(item => typeof item === 'string' && item.length > 0);
}

// Re-exportar funções com nomes não conflitantes
export { 
  getClaims,
  refreshClaims,
  withEmpresa,
  secureQuery,
  hasAccess,
  isAdmin,
  baseSuperAdmin,
  isEmailVerified,
  getCurrentEmpresaId,
  belongsToCompany,
  clearClaimsCache,
  canCreatePonto,
  canEditFinanceiro,
  canEditPonto,
  handlePermissionError,
  canAccessRoute,
  debugSecurity
};

// Re-exportar tipos
export type { AuthClaims, SecureUser };