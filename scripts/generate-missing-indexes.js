
const PROJECT_ID = 'enygna-4957d';

// Índices que você JÁ TEM (não precisam ser criados)
const EXISTING_INDEXES = [
  'security_alerts: resolved + timestamp',
  'financeiro_documentos: userId + status + criadoEm', 
  'sessions: end + start',
  'financeiro_documentos: userId + tipo + criadoEm',
  'financeiro_documentos: userId + criadoEm'
];

// Índices que ainda FALTAM baseado no seu projeto
const MISSING_INDEXES = [
  // ===== SISTEMA DE ADMINISTRAÇÃO =====
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

  // ===== SISTEMA FINANCEIRO =====
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

  // ===== SISTEMA DE CHAMADOS =====
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

  // ===== SISTEMA DE FROTA/GPS =====
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

  // ===== SISTEMA DE USUÁRIOS E SESSÕES =====
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

  // ===== SISTEMA DE LGPD =====
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

  // ===== SISTEMA DE NOTIFICAÇÕES =====
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

function generateMissingIndexLinks() {
  console.log('\n🔗 ÍNDICES QUE AINDA FALTAM NO SEU PROJETO');
  console.log('=' .repeat(80));
  console.log(`Projeto: ${PROJECT_ID}\n`);

  console.log('✅ ÍNDICES QUE VOCÊ JÁ TEM:');
  EXISTING_INDEXES.forEach((index, i) => {
    console.log(`${i + 1}. ${index}`);
  });

  console.log('\n❌ ÍNDICES QUE AINDA FALTAM:');
  console.log(`Total: ${MISSING_INDEXES.length} índices\n`);

  MISSING_INDEXES.forEach((index, i) => {
    console.log(`${i + 1}. 📋 ${index.collection}`);
    console.log(`   Descrição: ${index.description}`);
    
    const fieldsStr = index.fields.map(f => 
      `${f.name} (${f.direction.toUpperCase()})`
    ).join(' + ');
    
    console.log(`   Campos: ${fieldsStr}`);
    console.log(`   🔗 https://console.firebase.google.com/project/${PROJECT_ID}/firestore/indexes\n`);
  });

  console.log('\n⚡ PRIORIDADE DE CRIAÇÃO (baseado nos erros do console):');
  console.log('🚨 ALTA PRIORIDADE:');
  console.log('1. security_events (para resolver erro "failed-precondition")');
  console.log('2. sessions (para queries de usuário + status)');
  console.log('3. notifications (para painel de notificações)');
  
  console.log('\n🔶 MÉDIA PRIORIDADE:');
  console.log('1. chamados (sistema de tickets)');
  console.log('2. user_activity (auditoria de ações)');
  console.log('3. financeiro_auditoria (auditoria financeira)');
  
  console.log('\n🔷 BAIXA PRIORIDADE:');
  console.log('1. gps_tracking (funcionalidade GPS)');
  console.log('2. lgpd_* (conformidade LGPD)');
  console.log('3. frota_veiculos (gestão de frota)');

  console.log('\n📋 RESUMO:');
  console.log(`- Índices existentes: ${EXISTING_INDEXES.length}`);
  console.log(`- Índices faltantes: ${MISSING_INDEXES.length}`);
  console.log(`- Total necessários: ${EXISTING_INDEXES.length + MISSING_INDEXES.length}`);
  
  console.log('\n🌐 LINK PRINCIPAL:');
  console.log(`https://console.firebase.google.com/project/${PROJECT_ID}/firestore/indexes`);
}

// Executar o script
if (require.main === module) {
  generateMissingIndexLinks();
}

module.exports = { generateMissingIndexLinks, MISSING_INDEXES };
