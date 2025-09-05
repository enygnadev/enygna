// Papéis de usuário possíveis no sistema
export type Role = 'user' | 'admin' | 'adminmaster' | 'superadmin';

// Permissões de acesso a sistemas
export interface UserPermissions {
  frota: boolean;
  ponto: boolean;
  chamados: boolean;
  documentos: boolean;
  admin?: boolean;
  canAccessSystems?: string[]; // lista explícita de sistemas que o usuário pode acessar
}

// Documento básico de usuário
export type UserDoc = {
  email: string;
  displayName?: string;
  hourlyRate?: number;
  monthlySalary?: number;
  monthlyBaseHours?: number;
  toleranceMinutes?: number;      // tolerância para arredondar
  lunchBreakMinutes?: number;     // desconta pausa de almoço
  lunchThresholdMinutes?: number; // limiar para aplicar desconto de almoço
  isAdmin?: boolean;
  createdAt: string;
};

// Documento de sessão (ex.: ponto eletrônico)
export type SessionDoc = {
  start: string;
  end?: string | null;
  durationSec?: number;
  earnings?: number;
  locationStart?: { lat: number; lng: number; acc?: number };
  locationEnd?: { lat: number; lng: number; acc?: number };
  status?: 'pending' | 'approved' | 'rejected';
  notes?: string;
};

// Dados completos de usuário
export interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  role: Role | string;  // mantém flexibilidade para roles extras
  empresaId?: string;
  company?: string;
  ativo: boolean;
  createdAt: any;
  updatedAt: any;

  // Acessos e permissões
  bootstrapAdmin?: boolean;
  sistemasAtivos?: string[];
  permissions?: UserPermissions;

  // Campos específicos para colaboradores
  monthlySalary?: number;
  hourlyRate?: number;
  monthlyBaseHours?: number;
  toleranceMinutes?: number;
  lunchBreakMinutes?: number;
  lunchThresholdMinutes?: number;
  isAdmin?: boolean;

  // Campos adicionais para empresas
  tipo?: string;
  nome?: string;
  plano?: string;
}

// Evita warning “declared but never read”
export type _EnsureUse = UserData;
