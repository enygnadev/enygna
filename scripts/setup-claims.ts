
import { auth, db } from '../src/lib/firebase';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';

interface ClaimsConfig {
  role: 'colaborador' | 'gestor' | 'admin' | 'adminmaster' | 'superadmin';
  empresaId?: string;
  sistemasAtivos: string[];
  permissions: {
    canCreateUsers?: boolean;
    canManageCompany?: boolean;
    canAccessFinanceiro?: boolean;
    canAccessAllCompanies?: boolean;
    canManageSystem?: boolean;
  };
}

export async function setupUserClaims(user: User, config: ClaimsConfig): Promise<boolean> {
  try {
    // Verificar se o usuário atual tem permissão para definir claims
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }

    const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const currentUserData = currentUserDoc.data();
    
    if (!currentUserData?.claims?.role || 
        (currentUserData.claims.role !== 'superadmin' && 
         currentUserData.claims.role !== 'adminmaster')) {
      throw new Error('Permissão insuficiente para definir claims');
    }

    // Atualizar documento do usuário com as claims
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      role: config.role,
      empresaId: config.empresaId,
      sistemasAtivos: config.sistemasAtivos,
      claims: {
        role: config.role,
        empresaId: config.empresaId,
        sistemasAtivos: config.sistemasAtivos,
        permissions: config.permissions,
        email_verified: user.emailVerified,
        updatedAt: new Date().toISOString()
      },
      updatedAt: new Date()
    });

    // Log de auditoria
    await setDoc(doc(db, 'audit_logs', `claims_${Date.now()}`), {
      action: 'UPDATE_USER_CLAIMS',
      targetUserId: user.uid,
      targetUserEmail: user.email,
      adminUserId: currentUser.uid,
      adminUserEmail: currentUser.email,
      newClaims: config,
      timestamp: new Date(),
      severity: 'medium'
    });

    return true;
  } catch (error) {
    console.error('Erro ao configurar claims:', error);
    return false;
  }
}

// Configurações pré-definidas para cada role
export const ROLE_CONFIGS: Record<string, Omit<ClaimsConfig, 'empresaId'>> = {
  colaborador: {
    role: 'colaborador',
    sistemasAtivos: ['ponto', 'chamados'],
    permissions: {}
  },
  gestor: {
    role: 'gestor',
    sistemasAtivos: ['ponto', 'chamados', 'crm', 'documentos'],
    permissions: {
      canAccessFinanceiro: false
    }
  },
  admin: {
    role: 'admin',
    sistemasAtivos: ['ponto', 'chamados', 'crm', 'documentos', 'financeiro', 'frota'],
    permissions: {
      canCreateUsers: true,
      canManageCompany: true,
      canAccessFinanceiro: true
    }
  },
  adminmaster: {
    role: 'adminmaster',
    sistemasAtivos: ['ponto', 'chamados', 'crm', 'documentos', 'financeiro', 'frota'],
    permissions: {
      canCreateUsers: true,
      canManageCompany: true,
      canAccessFinanceiro: true,
      canAccessAllCompanies: true
    }
  },
  superadmin: {
    role: 'superadmin',
    sistemasAtivos: ['ponto', 'chamados', 'crm', 'documentos', 'financeiro', 'frota'],
    permissions: {
      canCreateUsers: true,
      canManageCompany: true,
      canAccessFinanceiro: true,
      canAccessAllCompanies: true,
      canManageSystem: true
    }
  }
};
