
export type Impacto = 'Baixo' | 'Médio' | 'Alto' | 'Crítico';
export type Urgencia = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type Prioridade = 'P4' | 'P3' | 'P2' | 'P1';
export type TicketStatus = 'aberto' | 'em_andamento' | 'resolvido' | 'cancelado';

export interface TicketAnalysis {
  assunto: string;
  resumo_executivo: string;
  classificacao: {
    categoria: string;
    subcategoria: string;
    produto_sistema: string;
  };
  prioridade: {
    impacto: Impacto;
    urgencia: Urgencia;
    prioridade_resultante: Prioridade;
    sla_sugerida_horas: number;
  };
  analise_inicial: {
    hipoteses: string[];
    possiveis_causas_raiz: string[];
  };
  perguntas_faltantes: string[];
  checklist_coleta: string[];
  passos_sugeridos: {
    mitigacao_imediata: string[];
    diagnostico: string[];
    correcao: string[];
  };
  riscos_seguranca: string[];
  criterios_aceite: string[];
}

export interface Ticket {
  id?: string;
  assunto: string;
  descricao: string;
  produto?: string;
  ambiente?: string;
  impacto?: Impacto;
  urgencia?: Urgencia;
  anexos?: string;
  status: TicketStatus;
  createdAt: number;
  updatedAt?: number;
  createdBy?: string;
  assignedTo?: string;
  analysis?: TicketAnalysis;
  tags?: string[];
  resolucao?: string;
  tempoGasto?: number; // em minutos
}

export interface TicketAudit {
  id?: string;
  ticketId: string;
  at: number;
  action: 'create' | 'update' | 'status_change' | 'assign' | 'comment' | 'resolve';
  by?: string;
  oldValue?: any;
  newValue?: any;
  payload?: Record<string, unknown>;
  comment?: string;
}

export interface TicketComment {
  id?: string;
  ticketId: string;
  content: string;
  createdAt: number;
  createdBy?: string;
  isInternal?: boolean;
  attachments?: string[];
}

export interface TicketFilter {
  status?: TicketStatus[];
  prioridade?: Prioridade[];
  impacto?: Impacto[];
  urgencia?: Urgencia[];
  categoria?: string[];
  assignedTo?: string;
  createdBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}

// Constantes para validação
export const TICKET_PRIORITIES: Record<Prioridade, { label: string; color: string; slaHours: number }> = {
  P1: { label: 'Crítica', color: '#dc2626', slaHours: 4 },
  P2: { label: 'Alta', color: '#ea580c', slaHours: 8 },
  P3: { label: 'Média', color: '#ca8a04', slaHours: 24 },
  P4: { label: 'Baixa', color: '#16a34a', slaHours: 72 }
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido',
  cancelado: 'Cancelado'
};

export const IMPACTO_OPTIONS: Impacto[] = ['Baixo', 'Médio', 'Alto', 'Crítico'];
export const URGENCIA_OPTIONS: Urgencia[] = ['Baixa', 'Média', 'Alta', 'Crítica'];

export const CATEGORIAS_PADRAO = [
  'Hardware',
  'Software',
  'Rede',
  'Segurança',
  'Banco de Dados',
  'Email',
  'Telefonia',
  'Acesso/Permissão',
  'Backup/Restore',
  'Performance',
  'Outros'
];
