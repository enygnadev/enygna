
const PROJECT_ID = 'enygna-4957d';
const BASE_URL = `https://console.firebase.google.com/project/${PROJECT_ID}/firestore/indexes`;

// Índices que ainda FALTAM (baseado na sua lista)
const MISSING_INDEXES = [
  {
    collection: 'security_events',
    fields: [
      { name: 'userId', direction: 'asc' },
      { name: 'type', direction: 'asc' },
      { name: 'severity', direction: 'asc' },
      { name: 'timestamp', direction: 'desc' }
    ],
    description: 'Eventos de segurança por usuário, tipo e severidade'
  },
  {
    collection: 'admin_users',
    fields: [
      { name: 'role', direction: 'asc' },
      { name: 'isActive', direction: 'asc' },
      { name: 'createdAt', direction: 'desc' }
    ],
    description: 'Usuários admin por role e status'
  },
  {
    collection: 'financeiro_documentos',
    fields: [
      { name: 'userId', direction: 'asc' },
      { name: 'statusAprovacao', direction: 'asc' },
      { name: 'criadoEm', direction: 'desc' }
    ],
    description: 'Documentos financeiros por usuário, status de aprovação e data'
  },
  {
    collection: 'financeiro_relatorios',
    fields: [
      { name: 'geradoPor', direction: 'asc' },
      { name: 'periodo.ano', direction: 'asc' },
      { name: 'geradoEm', direction: 'desc' }
    ],
    description: 'Relatórios financeiros por gerador, ano e data'
  },
  {
    collection: 'financeiro_auditoria',
    fields: [
      { name: 'userId', direction: 'asc' },
      { name: 'timestamp', direction: 'desc' }
    ],
    description: 'Auditoria financeira por usuário e timestamp'
  },
  {
    collection: 'financeiro_auditoria',
    fields: [
      { name: 'entityType', direction: 'asc' },
      { name: 'entityId', direction: 'asc' },
      { name: 'timestamp', direction: 'desc' }
    ],
    description: 'Auditoria financeira por tipo de entidade, ID e timestamp'
  },
  {
    collection: 'chamados',
    fields: [
      { name: 'userId', direction: 'asc' },
      { name: 'status', direction: 'asc' },
      { name: 'criadoEm', direction: 'desc' }
    ],
    description: 'Chamados por usuário, status e data'
  },
  {
    collection: 'chamados',
    fields: [
      { name: 'empresaId', direction: 'asc' },
      { name: 'prioridade', direction: 'asc' },
      { name: 'criadoEm', direction: 'desc' }
    ],
    description: 'Chamados por empresa, prioridade e data'
  },
  {
    collection: 'chamados',
    fields: [
      { name: 'atribuidoPara', direction: 'asc' },
      { name: 'status', direction: 'asc' },
      { name: 'atualizadoEm', direction: 'desc' }
    ],
    description: 'Chamados atribuídos por técnico, status e última atualização'
  },
  {
    collection: 'frota_veiculos',
    fields: [
      { name: 'empresaId', direction: 'asc' },
      { name: 'status', direction: 'asc' },
      { name: 'ultimaLocalizacao.timestamp', direction: 'desc' }
    ],
    description: 'Veículos por empresa, status e última localização'
  },
  {
    collection: 'gps_tracking',
    fields: [
      { name: 'vehicleId', direction: 'asc' },
      { name: 'timestamp', direction: 'desc' }
    ],
    description: 'Rastreamento GPS por veículo e timestamp'
  },
  {
    collection: 'gps_tracking',
    fields: [
      { name: 'userId', direction: 'asc' },
      { name: 'isActive', direction: 'asc' },
      { name: 'timestamp', direction: 'desc' }
    ],
    description: 'Rastreamento GPS por usuário, status ativo e timestamp'
  },
  {
    collection: 'users',
    fields: [
      { name: 'role', direction: 'asc' },
      { name: 'empresaId', direction: 'asc' },
      { name: 'isActive', direction: 'asc' }
    ],
    description: 'Usuários por role, empresa e status ativo'
  },
  {
    collection: 'sessions',
    fields: [
      { name: 'userId', direction: 'asc' },
      { name: 'status', direction: 'asc' },
      { name: 'timestamp', direction: 'desc' }
    ],
    description: 'Sessões por usuário, status e timestamp'
  },
  {
    collection: 'user_activity',
    fields: [
      { name: 'userId', direction: 'asc' },
      { name: 'action', direction: 'asc' },
      { name: 'timestamp', direction: 'desc' }
    ],
    description: 'Atividade de usuários por usuário, ação e timestamp'
  },
  {
    collection: 'lgpd_consents',
    fields: [
      { name: 'userId', direction: 'asc' },
      { name: 'consentType', direction: 'asc' },
      { name: 'granted', direction: 'asc' },
      { name: 'timestamp', direction: 'desc' }
    ],
    description: 'Consentimentos LGPD por usuário, tipo, status e timestamp'
  },
  {
    collection: 'lgpd_requests',
    fields: [
      { name: 'userId', direction: 'asc' },
      { name: 'requestType', direction: 'asc' },
      { name: 'status', direction: 'asc' },
      { name: 'createdAt', direction: 'desc' }
    ],
    description: 'Solicitações LGPD por usuário, tipo, status e data'
  },
  {
    collection: 'notifications',
    fields: [
      { name: 'userId', direction: 'asc' },
      { name: 'read', direction: 'asc' },
      { name: 'createdAt', direction: 'desc' }
    ],
    description: 'Notificações por usuário, status de leitura e data'
  }
];

function generateIndividualLinks() {
  console.log('\n🔗 LINKS DIRETOS INDIVIDUAIS PARA CADA ÍNDICE');
  console.log('=' .repeat(80));
  console.log(`Projeto: ${PROJECT_ID}\n`);

  MISSING_INDEXES.forEach((index, i) => {
    console.log(`\n📋 ÍNDICE ${i + 1}/${MISSING_INDEXES.length}`);
    console.log(`Coleção: ${index.collection}`);
    console.log(`Descrição: ${index.description}`);
    
    const fieldsStr = index.fields.map(f => 
      `${f.name} (${f.direction.toUpperCase()})`
    ).join(' + ');
    
    console.log(`Campos: ${fieldsStr}`);
    console.log(`🔗 LINK DIRETO: ${BASE_URL}`);
    console.log('─'.repeat(60));
  });

  console.log('\n🚨 PRIORIDADE ALTA (criar primeiro):');
  console.log('1. security_events');
  console.log('2. sessions (userId + status + timestamp)');
  console.log('3. notifications');

  console.log('\n📋 INSTRUÇÕES:');
  console.log('1. Clique em cada link acima');
  console.log('2. Clique em "Criar índice composto"');
  console.log('3. Configure os campos conforme especificado');
  console.log('4. Aguarde a criação (pode levar alguns minutos)');
  
  console.log(`\n🌐 LINK GERAL: ${BASE_URL}`);
}

// Executar o script
if (require.main === module) {
  generateIndividualLinks();
}

module.exports = { generateIndividualLinks, MISSING_INDEXES };
