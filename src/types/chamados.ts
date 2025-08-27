
export type ChamadosUserRole = 'adminmaster' | 'superadmin' | 'admin' | 'gestor' | 'colaborador';

export type ChamadosUserDoc = {
  email: string;
  displayName?: string;
  role: ChamadosUserRole;
  empresaId?: string;
  departamento?: string;
  isActive?: boolean;
  permissions?: {
    canCreateTickets?: boolean;
    canAssignTickets?: boolean;
    canCloseTickets?: boolean;
    canViewAllTickets?: boolean;
    canManageUsers?: boolean;
    canViewReports?: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type ChamadosSessionProfile = {
  uid: string;
  email?: string;
  displayName?: string;
  role: ChamadosUserRole;
  empresaId?: string;
  departamento?: string;
  permissions?: ChamadosUserDoc['permissions'];
};

// Helper para verificar se é admin master do sistema de chamados
export function isChamadosAdminMaster(profile: ChamadosSessionProfile | null): boolean {
  return profile?.role === 'adminmaster' || profile?.role === 'superadmin';
}

// Helper para verificar se tem acesso de administração no sistema de chamados
export function hasChamadosAdminAccess(profile: ChamadosSessionProfile | null): boolean {
  return ['adminmaster', 'superadmin', 'admin', 'gestor'].includes(profile?.role || '');
}

// Helper para verificar permissões específicas
export function hasChamadosPermission(
  profile: ChamadosSessionProfile | null, 
  permission: keyof NonNullable<ChamadosUserDoc['permissions']>
): boolean {
  if (!profile) return false;
  if (isChamadosAdminMaster(profile)) return true;
  return profile.permissions?.[permission] || false;
}
