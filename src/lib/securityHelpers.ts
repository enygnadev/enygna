'use client';

import { auth, db } from './firebase';
import { getIdTokenResult, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Re-export from security.ts
export {
  getClaims,
  refreshClaims,
  withEmpresa,
  secureQuery,
  hasAccess,
  isAdmin,
  isSuperAdmin,
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

import { AuthClaims } from './security';

// Manter funções específicas que já existiam
export interface SessionProfile {
  uid: string;
  email?: string;
  displayName?: string;
  role?: 'superadmin' | 'admin' | 'gestor' | 'colaborador' | 'adminmaster';
  empresaId?: string;
  sistemasAtivos?: string[];
  claims?: AuthClaims;
}

export function isAdminMaster(profile: SessionProfile | null): boolean {
  return profile?.role === 'adminmaster' ||
         profile?.role === 'superadmin' ||
         profile?.claims?.bootstrapAdmin === true;
}

export function hasAdminAccess(profile: SessionProfile | null): boolean {
  return ['adminmaster', 'superadmin', 'admin', 'gestor'].includes(profile?.role || '');
}

// Função para verificar se usuário pode acessar sistema específico
export function hasSystemAccess(profile: SessionProfile | null, system: string): boolean {
  if (!profile) return false;

  // SuperAdmins podem acessar tudo
  if (isAdminMaster(profile)) return true;

  // Verificar sistemasAtivos
  if (profile.sistemasAtivos?.includes(system)) return true;

  // Verificar claims
  if (profile.claims?.sistemasAtivos?.includes(system)) return true;
  if (profile.claims?.canAccessSystems?.includes(system)) return true;

  return false;
}

// Função para obter perfil completo do usuário
export async function getUserProfile(user: User): Promise<SessionProfile> {
  try {
    const tokenResult = await user.getIdTokenResult();
    const claims = tokenResult.claims as AuthClaims;

    // Tentar obter dados do Firestore
    let userData: any = {};
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        userData = userDoc.data();
      }
    } catch (error) {
      console.warn('Erro ao obter dados do usuário do Firestore:', error);
    }

    return {
      uid: user.uid,
      email: user.email || undefined,
      displayName: user.displayName || userData.displayName,
      role: claims.role || userData.role || 'colaborador',
      empresaId: claims.empresaId || userData.empresaId,
      sistemasAtivos: claims.sistemasAtivos || userData.sistemasAtivos || [],
      claims
    };
  } catch (error) {
    console.error('Erro ao obter perfil do usuário:', error);

    // Fallback básico
    return {
      uid: user.uid,
      email: user.email || undefined,
      displayName: user.displayName || undefined,
      role: 'colaborador',
      claims: {}
    };
  }
}