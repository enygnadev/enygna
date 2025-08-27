
const admin = require('firebase-admin');

// Configuração do projeto
const PROJECT_ID = 'enygna-4957d';
const BASE_URL = `https://console.firebase.google.com/v1/r/project/${PROJECT_ID}/firestore/indexes`;

// Função para codificar índices compostos
function encodeCompositeIndex(collection, fields) {
  const fieldsEncoded = fields.map(field => {
    const direction = field.direction === 'desc' ? 'DESCENDING' : 'ASCENDING';
    return `${field.name}:${direction}`;
  }).join(',');
  
  // Formato esperado pelo Firebase Console
  const indexData = {
    collectionGroup: collection,
    fields: fields.map(f => ({
      fieldPath: f.name,
      order: f.direction === 'desc' ? 'DESCENDING' : 'ASCENDING'
    }))
  };
  
  return encodeURIComponent(JSON.stringify(indexData));
}

// Definir todos os índices necessários do projeto
const REQUIRED_INDEXES = [
  // ===== SISTEMA DE ADMINISTRAÇÃO =====
  {
    collection: 'security_alerts',
    fields: [
      { name: 'resolved', direction: 'asc' },
      { name: 'timestamp', direction: 'desc' }
    ],
    description: 'Alertas de segurança por status e timestamp'
  },
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
      { name: 'criadoEm', direction: 'desc' }
    ],
    description: 'Documentos financeiros por usuário e data'
  },
  {
    collection: 'financeiro_documentos',
    fields: [
      { name: 'userId', direction: 'asc' },
      { name: 'status', direction: 'asc' },
      { name: 'criadoEm', direction: 'desc' }
    ],
    description: 'Documentos financeiros por usuário, status e data'
  },
  {
    collection: 'financeiro_documentos',
    fields: [
      { name: 'userId', direction: 'asc' },
      { name: 'tipo', direction: 'asc' },
      { name: 'criadoEm', direction: 'desc' }
    ],
    description: 'Documentos financeiros por usuário, tipo e data'
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

  // ===== SISTEMA DE CACHE E PERFORMANCE =====
  {
    collection: 'cache',
    fields: [
      { name: 'namespace', direction: 'asc' },
      { name: 'expiresAt', direction: 'asc' }
    ],
    description: 'Cache por namespace e data de expiração'
  },
  {
    collection: 'performance_metrics',
    fields: [
      { name: 'userId', direction: 'asc' },
      { name: 'timestamp', direction: 'desc' }
    ],
    description: 'Métricas de performance por usuário e timestamp'
  },
  {
    collection: 'error_reports',
    fields: [
      { name: 'severity', direction: 'asc' },
      { name: 'timestamp', direction: 'desc' }
    ],
    description: 'Relatórios de erro por severidade e timestamp'
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
  },
  {
    collection: 'notification_templates',
    fields: [
      { name: 'type', direction: 'asc' },
      { name: 'isActive', direction: 'asc' }
    ],
    description: 'Templates de notificação por tipo e status ativo'
  }
];

// Função para gerar links diretos
function generateIndexLinks() {
  console.log('\n🔗 LINKS DIRETOS PARA CRIAR ÍNDICES FIRESTORE');
  console.log('=' .repeat(80));
  console.log(`Projeto: ${PROJECT_ID}\n`);

  REQUIRED_INDEXES.forEach((index, i) => {
    console.log(`${i + 1}. ${index.collection}`);
    console.log(`   Descrição: ${index.description}`);
    
    // Criar URL direta para o Firebase Console
    const fieldsStr = index.fields.map(f => 
      `${f.name} (${f.direction.toUpperCase()})`
    ).join(' + ');
    
    console.log(`   Campos: ${fieldsStr}`);
    
    // Gerar link direto
    const createUrl = `${BASE_URL}?create_composite=` + 
      `ClRwcm9qZWN0cy8ke2VuY29kZVVSSUNvbXBvbmVudChQUk9KRUNUX0lEKX0vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzLyR7aW5kZXguY29sbGVjdGlvbn0vaW5kZXhlcy9f`
      .replace('${PROJECT_ID}', PROJECT_ID)
      .replace('${index.collection}', encodeURIComponent(index.collection));
    
    console.log(`   🔗 Link: https://console.firebase.google.com/project/${PROJECT_ID}/firestore/indexes`);
    console.log('');
  });

  console.log('\n⚡ INSTRUÇÕES DE USO:');
  console.log('1. Acesse cada link acima');
  console.log('2. Configure os índices compostos conforme especificado');
  console.log('3. Aguarde a criação dos índices (pode levar alguns minutos)');
  console.log('4. Teste as queries que estavam falhando');
  
  console.log('\n🚀 LINK PRINCIPAL DO FIREBASE CONSOLE:');
  console.log(`https://console.firebase.google.com/project/${PROJECT_ID}/firestore/indexes`);
  
  console.log('\n📋 RESUMO DE ÍNDICES NECESSÁRIOS:');
  console.log(`Total de índices compostos: ${REQUIRED_INDEXES.length}`);
  
  const collectionCounts = {};
  REQUIRED_INDEXES.forEach(index => {
    collectionCounts[index.collection] = (collectionCounts[index.collection] || 0) + 1;
  });
  
  Object.entries(collectionCounts).forEach(([collection, count]) => {
    console.log(`- ${collection}: ${count} índices`);
  });

  return REQUIRED_INDEXES;
}

// Executar o script
if (require.main === module) {
  generateIndexLinks();
}

module.exports = { generateIndexLinks, REQUIRED_INDEXES };
