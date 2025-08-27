
// Tipos de usuário do sistema financeiro
export type FinanceiroUserType = 'colaborador' | 'empresa' | 'cliente' | 'contador';

// Tipos de documentos fiscais
export type DocumentoFiscalType = 
  | 'nfe' 
  | 'nfce' 
  | 'nfse' 
  | 'cte' 
  | 'mdfe' 
  | 'recibo' 
  | 'nota_debito' 
  | 'nota_credito'
  | 'boleto'
  | 'comprovante_pagamento'
  | 'contrato'
  | 'balancete'
  | 'demonstrativo';

// Status de processamento
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'error' | 'canceled';

// Status de aprovação
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision_needed';

// Interface do usuário financeiro
export interface FinanceiroUser {
  uid: string;
  email: string;
  displayName: string;
  userType: FinanceiroUserType;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastAccess?: string;
  
  // Dados específicos por tipo
  cnpj?: string;
  cpf?: string;
  crc?: string; // Registro do contador
  razaoSocial?: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  endereco?: EnderecoEmpresa;
  
  // Permissões e configurações
  permissions: string[];
  settings: UserSettings;
  
  // Estatísticas
  documentsCount?: number;
  totalValue?: number;
  lastDocumentDate?: string;
}

// Endereço da empresa
export interface EnderecoEmpresa {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  pais: string;
}

// Configurações do usuário
export interface UserSettings {
  notificacoes: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  preferencias: {
    tema: 'light' | 'dark' | 'auto';
    idioma: 'pt-BR' | 'en-US' | 'es-ES';
    timezone: string;
  };
  integracao: {
    api_contabil?: string;
    sistema_erp?: string;
    banco_principal?: string;
  };
}

// Documento financeiro principal
export interface DocumentoFinanceiro {
  id?: string;
  tipo: DocumentoFiscalType;
  numero: string;
  serie?: string;
  chaveAcesso?: string;
  
  // Datas
  dataEmissao: string;
  dataVencimento?: string;
  competencia: string;
  
  // Partes envolvidas
  emitente: PessoaJuridica;
  destinatario: PessoaJuridica;
  
  // Valores
  valores: ValoresDocumento;
  
  // Itens/Serviços
  itens: ItemDocumento[];
  
  // Impostos
  impostos: ImpostoDocumento[];
  
  // Status e processamento
  status: ProcessingStatus;
  statusAprovacao: ApprovalStatus;
  
  // OCR e processamento
  ocrResult?: OCRResult;
  processedAt?: string;
  processedBy?: string;
  
  // Auditoria
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  
  // Anexos
  anexos: AnexoDocumento[];
  
  // Observações
  observacoes?: string;
  observacoesInternas?: string;
  
  // Classificação contábil
  classificacao?: ClassificacaoContabil;
}

// Pessoa jurídica
export interface PessoaJuridica {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  endereco: EnderecoEmpresa;
  email?: string;
  telefone?: string;
}

// Valores do documento
export interface ValoresDocumento {
  valorBruto: number;
  valorLiquido: number;
  valorDesconto?: number;
  valorAcrescimo?: number;
  valorFrete?: number;
  valorSeguro?: number;
  valorOutrasDespesas?: number;
  valorTotalTributos: number;
  valorTotalProdutos?: number;
  valorTotalServicos?: number;
}

// Item do documento
export interface ItemDocumento {
  codigo: string;
  descricao: string;
  ncm?: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  valorDesconto?: number;
  impostos: ImpostoItem[];
}

// Imposto por item
export interface ImpostoItem {
  tipo: TipoImposto;
  baseCalculo: number;
  aliquota: number;
  valor: number;
  cst?: string;
  csosn?: string;
}

// Imposto do documento
export interface ImpostoDocumento {
  tipo: TipoImposto;
  valorTotal: number;
  detalhes: ImpostoItem[];
}

// Tipos de impostos
export type TipoImposto = 
  | 'ICMS' 
  | 'IPI' 
  | 'PIS' 
  | 'COFINS' 
  | 'ISS' 
  | 'IRRF' 
  | 'CSLL' 
  | 'INSS'
  | 'ICMS_ST'
  | 'ICMS_DIFAL'
  | 'FCP';

// Anexo do documento
export interface AnexoDocumento {
  id: string;
  nome: string;
  tipo: 'xml' | 'pdf' | 'image' | 'excel' | 'other';
  tamanho: number;
  url: string;
  hash: string;
  uploadedAt: string;
  uploadedBy: string;
}

// Resultado do OCR
export interface OCRResult {
  confidence: number;
  extractedText: string;
  fields: Record<string, any>;
  processedAt: string;
  engine: 'google' | 'aws' | 'azure' | 'custom';
  validationErrors?: string[];
  suggestedCorrections?: Record<string, any>;
}

// Classificação contábil
export interface ClassificacaoContabil {
  planoContas: string;
  contaDebito: string;
  contaCredito: string;
  centroCusto?: string;
  projeto?: string;
  historico: string;
  tipoLancamento: 'receita' | 'despesa' | 'transferencia' | 'aplicacao';
}

// Relatório fiscal
export interface RelatorioFiscal {
  id?: string;
  tipo: TipoRelatorio;
  periodo: PeriodoRelatorio;
  status: ProcessingStatus;
  
  // Dados calculados
  totalReceitas: number;
  totalDespesas: number;
  totalTributos: number;
  totalLucro: number;
  
  // Impostos por tipo
  impostosPorTipo: Record<TipoImposto, number>;
  
  // Documentos incluídos
  documentosIncluidos: string[];
  
  // Geração
  geradoEm: string;
  geradoPor: string;
  
  // Arquivo gerado
  arquivoUrl?: string;
  arquivoHash?: string;
}

// Tipos de relatório
export type TipoRelatorio = 
  | 'sped_fiscal' 
  | 'sped_contribuicoes' 
  | 'sintegra' 
  | 'dapi' 
  | 'dimob'
  | 'dirf'
  | 'declaracao_ir'
  | 'balancete'
  | 'dre'
  | 'fluxo_caixa';

// Período do relatório
export interface PeriodoRelatorio {
  dataInicio: string;
  dataFim: string;
  mes?: number;
  ano: number;
  trimestre?: number;
  semestre?: number;
}

// Configuração de integração
export interface IntegracaoConfig {
  id?: string;
  userId: string;
  tipo: TipoIntegracao;
  nome: string;
  isActive: boolean;
  configuracao: Record<string, any>;
  ultimaSincronizacao?: string;
  proximaSincronizacao?: string;
  erros?: IntegracaoErro[];
}

// Tipos de integração
export type TipoIntegracao = 
  | 'sefaz_nfe' 
  | 'sefaz_nfce' 
  | 'prefeitura_nfse'
  | 'banco_bradesco'
  | 'banco_itau'
  | 'banco_bb'
  | 'contabilizei'
  | 'omie'
  | 'bling'
  | 'tiny_erp';

// Erro de integração
export interface IntegracaoErro {
  timestamp: string;
  codigo: string;
  mensagem: string;
  detalhes?: string;
  resolvido: boolean;
}

// Auditoria
export interface AuditoriaFinanceiro {
  id?: string;
  entityType: 'documento' | 'usuario' | 'relatorio' | 'integracao';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'export' | 'approve' | 'reject';
  userId: string;
  timestamp: string;
  changes?: Record<string, { before: any; after: any }>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Dashboard analytics
export interface FinanceiroDashboard {
  periodo: PeriodoRelatorio;
  resumo: {
    totalDocumentos: number;
    valorTotalProcessado: number;
    documentosPendentes: number;
    taxaAprovacao: number;
    tempoMedioProcessamento: number;
  };
  graficos: {
    receitasPorMes: { mes: string; valor: number }[];
    despesasPorCategoria: { categoria: string; valor: number; percentual: number }[];
    impostosPorTipo: { tipo: TipoImposto; valor: number }[];
    documentosPorStatus: { status: ProcessingStatus; quantidade: number }[];
  };
  alertas: AlertaFinanceiro[];
  tendencias: {
    crescimentoReceita: number;
    crescimentoDespesa: number;
    eficienciaProcessamento: number;
    satisfacaoUsuario: number;
  };
}

// Alerta financeiro
export interface AlertaFinanceiro {
  id: string;
  tipo: 'prazo_vencimento' | 'limite_credito' | 'inconsistencia_dados' | 'falha_integracao';
  prioridade: 'low' | 'medium' | 'high' | 'critical';
  titulo: string;
  descricao: string;
  dataVencimento?: string;
  documentoId?: string;
  userId?: string;
  acoes: AcaoAlerta[];
  lido: boolean;
  criadoEm: string;
}

// Ação do alerta
export interface AcaoAlerta {
  label: string;
  action: string;
  style: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  url?: string;
}

// Configurações do sistema
export interface ConfiguracaoSistema {
  ocr: {
    provider: 'google' | 'aws' | 'azure';
    confidence_threshold: number;
    auto_processing: boolean;
  };
  fiscal: {
    regime_tributario: 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
    codigo_municipio: string;
    uf: string;
  };
  integracao: {
    auto_sync: boolean;
    sync_interval: number;
    retry_attempts: number;
  };
  backup: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    retention_days: number;
  };
  notificacoes: {
    email_admin: string[];
    webhook_url?: string;
    slack_webhook?: string;
  };
}

// Constantes e enums úteis
export const DOCUMENT_TYPES = {
  nfe: 'Nota Fiscal Eletrônica',
  nfce: 'NFC-e',
  nfse: 'Nota Fiscal de Serviços',
  cte: 'Conhecimento de Transporte',
  mdfe: 'Manifesto de Documentos Fiscais',
  recibo: 'Recibo',
  nota_debito: 'Nota de Débito',
  nota_credito: 'Nota de Crédito',
  boleto: 'Boleto Bancário',
  comprovante_pagamento: 'Comprovante de Pagamento',
  contrato: 'Contrato',
  balancete: 'Balancete',
  demonstrativo: 'Demonstrativo'
} as const;

export const USER_TYPES = {
  colaborador: 'Colaborador',
  empresa: 'Empresa',
  cliente: 'Cliente',
  contador: 'Contador'
} as const;

export const PROCESSING_STATUS = {
  pending: 'Pendente',
  processing: 'Processando',
  completed: 'Concluído',
  error: 'Erro',
  canceled: 'Cancelado'
} as const;

export const APPROVAL_STATUS = {
  pending: 'Aguardando Aprovação',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  revision_needed: 'Revisão Necessária'
} as const;

// Funções utilitárias
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatCNPJ(cnpj: string): string {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function validateCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  if (cleanCNPJ.length !== 14) return false;
  
  // Implementar validação de CNPJ completa
  return true;
}

export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  
  // Implementar validação de CPF completa
  return true;
}

export function calculateTaxes(documento: DocumentoFinanceiro): Record<TipoImposto, number> {
  const taxes: Record<string, number> = {};
  
  documento.impostos.forEach(imposto => {
    taxes[imposto.tipo] = (taxes[imposto.tipo] || 0) + imposto.valorTotal;
  });
  
  return taxes as Record<TipoImposto, number>;
}

export function getDocumentStatusColor(status: ProcessingStatus): string {
  const colors = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    completed: '#10b981',
    error: '#ef4444',
    canceled: '#6b7280'
  };
  return colors[status];
}

export function getApprovalStatusColor(status: ApprovalStatus): string {
  const colors = {
    pending: '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
    revision_needed: '#8b5cf6'
  };
  return colors[status];
}
