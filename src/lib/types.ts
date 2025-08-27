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
