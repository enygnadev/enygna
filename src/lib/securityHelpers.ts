
// src/lib/securityHelpers.ts
import { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

export interface AuthClaims {
  role?: 'superadmin' | 'admin' | 'gestor' | 'colaborador' | 'adminmaster';
  empresaId?: string;
  sistemasAtivos?: string[];
  canAccessSystems?: string[];
  bootstrapAdmin?: boolean;
  tipo?: string;
  company?: string;
  isEmpresa?: boolean;
}

export interface SecureUser extends User {
  claims?: AuthClaims;
}

/**
 * Injeta empresaId das claims em todas as criações de documentos
 */
export function withEmpresa<T extends Record<string, any>>(
  data: T, 
  user?: SecureUser | null
): T & { empresaId?: string } {
  if (!user?.claims?.empresaId) {
    return data;
  }
  
  return {
    ...data,
    empresaId: user.claims.empresaId,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  };
}

/**
 * Aplica filtro de empresa em queries quando necessário
 */
export function secureQuery(
  collectionRef: any,
  user?: SecureUser | null,
  forceCompanyFilter = false
) {
  if (!user?.claims?.empresaId || (!forceCompanyFilter && isAdmin(user))) {
    return collectionRef;
  }
  
  return query(collectionRef, where('empresaId', '==', user.claims.empresaId));
}

/**
 * Verifica se o usuário tem acesso a um sistema específico
 */
export function hasSystemAccess(sistema: string, user?: SecureUser | null): boolean {
  if (!user?.claims) return false;
  
  const claims = user.claims;
  
  // SuperAdmins e Admins têm acesso a tudo
  if (claims.role === 'superadmin' || 
      claims.role === 'adminmaster' || 
      claims.role === 'admin' || 
      claims.role === 'gestor') {
    return true;
  }
  
  // Verificar sistemas ativos
  if (claims.sistemasAtivos && claims.sistemasAtivos.includes(sistema)) {
    return true;
  }
  
  if (claims.canAccessSystems && claims.canAccessSystems.includes(sistema)) {
    return true;
  }
  
  return false;
}

/**
 * Verifica se é admin
 */
export function isAdmin(user?: SecureUser | null): boolean {
  if (!user?.claims) return false;
  
  return ['superadmin', 'adminmaster', 'admin', 'gestor'].includes(user.claims.role || '');
}

/**
 * Verifica se é superadmin
 */
export function isSuperAdmin(user?: SecureUser | null): boolean {
  if (!user?.claims) return false;
  
  return user.claims.role === 'superadmin' || 
         user.claims.role === 'adminmaster' || 
         user.claims.bootstrapAdmin === true;
}

/**
 * Verifica se pertence à mesma empresa
 */
export function sameCompany(empresaId: string, user?: SecureUser | null): boolean {
  if (!user?.claims) return false;
  
  if (isSuperAdmin(user)) return true;
  
  return user.claims.empresaId === empresaId || user.claims.company === empresaId;
}

/**
 * Cria documento com validação de campos obrigatórios
 */
export async function secureCreate<T extends Record<string, any>>(
  collectionPath: string,
  data: T,
  requiredFields: string[],
  user?: SecureUser | null
): Promise<string> {
  // Validar campos obrigatórios
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`Campo obrigatório ausente: ${field}`);
    }
  }
  
  // Adicionar empresaId se necessário
  const secureData = withEmpresa(data, user);
  
  // Criar documento
  const docRef = await addDoc(collection(db, collectionPath), secureData);
  return docRef.id;
}

/**
 * Atualiza claims do usuário (força refresh do token)
 */
export async function refreshUserClaims(): Promise<void> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    await currentUser.getIdToken(true); // Force refresh
  }
}

/**
 * Trata erros de permissão com mensagens amigáveis
 */
export function handlePermissionError(error: any): string {
  if (error?.code === 'permission-denied') {
    return 'Você não tem permissão para realizar esta ação. Entre em contato com o administrador.';
  }
  
  if (error?.code === 'auth/insufficient-permission') {
    return 'Permissões insuficientes. Verifique se você está logado com a conta correta.';
  }
  
  if (error?.code === 'unauthenticated') {
    return 'Você precisa estar logado para realizar esta ação.';
  }
  
  return error?.message || 'Erro desconhecido';
}

/**
 * Valida se o usuário pode acessar uma rota específica
 */
export function canAccessRoute(route: string, user?: SecureUser | null): boolean {
  if (!user) return false;
  
  const routeSystemMap: Record<string, string> = {
    '/chamados': 'chamados',
    '/crm': 'crm',
    '/frota': 'frota',
    '/ponto': 'ponto',
    '/financeiro': 'financeiro',
    '/documentos': 'documentos'
  };
  
  const sistema = routeSystemMap[route];
  if (sistema) {
    return hasSystemAccess(sistema, user);
  }
  
  // Rotas administrativas
  if (route.startsWith('/admin')) {
    return isAdmin(user);
  }
  
  // Rotas públicas
  const publicRoutes = ['/', '/sobre', '/contato', '/planos'];
  if (publicRoutes.includes(route)) {
    return true;
  }
  
  return false;
}
