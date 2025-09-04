export type UserDoc = {
  email: string;
  displayName?: string;
  hourlyRate?: number;
  monthlySalary?: number;
  monthlyBaseHours?: number;
  toleranceMinutes?: number;     // tolerância para arredondar
  lunchBreakMinutes?: number;    // desconta pausa de almoço quando sessão > threshold
  lunchThresholdMinutes?: number;// limiar para aplicar desconto de almoço
  isAdmin?: boolean;
  createdAt: string;
};

export type SessionDoc = {
  start: string;
  end?: string | null;
  durationSec?: number;
  earnings?: number;
  locationStart?: { lat:number; lng:number; acc?:number };
  locationEnd?: { lat:number; lng:number; acc?:number };
  status?: 'pending' | 'approved' | 'rejected';
  notes?: string;
};

export interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  role: string;
  empresaId?: string;
  company?: string;
  ativo: boolean;
  createdAt: any;
  updatedAt: any;
  bootstrapAdmin?: boolean;
  sistemasAtivos?: string[];
  permissions: {
    frota: boolean;
    ponto: boolean;
    chamados: boolean;
    documentos: boolean;
    admin?: boolean;
    canAccessSystems?: string[];
  };
  // Campos específicos para colaboradores
  monthlySalary?: number;
  hourlyRate?: number;
  monthlyBaseHours?: number;
  toleranceMinutes?: number;
  lunchBreakMinutes?: number;
  lunchThresholdMinutes?: number;
  isAdmin?: boolean;
}