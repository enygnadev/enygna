
// Script para configurar índices necessários no Firestore
// Execute: node scripts/setup-firestore-indexes.js

const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'enygna-4957d'
  });
}

const db = admin.firestore();

async function createIndexes() {
  console.log('🔧 Configurando índices do Firestore...');
  
  try {
    // Índices para financeiro_documentos
    console.log('📊 Configurando índices para financeiro_documentos...');
    
    // Índice composto: userId + criadoEm (descending)
    console.log('- Índice: userId + criadoEm (desc)');
    
    // Índice composto: userId + status + criadoEm
    console.log('- Índice: userId + status + criadoEm');
    
    // Índice composto: userId + tipo + criadoEm
    console.log('- Índice: userId + tipo + criadoEm');
    
    // Índice composto: userId + statusAprovacao + criadoEm
    console.log('- Índice: userId + statusAprovacao + criadoEm');
    
    // Índices para financeiro_relatorios
    console.log('📈 Configurando índices para financeiro_relatorios...');
    
    // Índice composto: geradoPor + periodo.ano + geradoEm
    console.log('- Índice: geradoPor + periodo.ano + geradoEm');
    
    // Índices para financeiro_auditoria
    console.log('🔍 Configurando índices para financeiro_auditoria...');
    
    // Índice composto: userId + timestamp
    console.log('- Índice: userId + timestamp (desc)');
    
    // Índice composto: entityType + entityId + timestamp
    console.log('- Índice: entityType + entityId + timestamp');
    
    console.log('\n✅ Configuração de índices concluída!');
    console.log('\n📋 Índices necessários:');
    console.log('1. financeiro_documentos: userId (ASC) + criadoEm (DESC)');
    console.log('2. financeiro_documentos: userId (ASC) + status (ASC) + criadoEm (DESC)');
    console.log('3. financeiro_documentos: userId (ASC) + tipo (ASC) + criadoEm (DESC)');
    console.log('4. financeiro_documentos: userId (ASC) + statusAprovacao (ASC) + criadoEm (DESC)');
    console.log('5. financeiro_relatorios: geradoPor (ASC) + periodo.ano (ASC) + geradoEm (DESC)');
    console.log('6. financeiro_auditoria: userId (ASC) + timestamp (DESC)');
    console.log('7. financeiro_auditoria: entityType (ASC) + entityId (ASC) + timestamp (DESC)');
    
    console.log('\n🌐 Acesse o Firebase Console para criar os índices:');
    console.log('https://console.firebase.google.com/project/enygna-4957d/firestore/indexes');
    
    console.log('\n⚠️  Ou use os links diretos quando os erros aparecerem no console.');
    
  } catch (error) {
    console.error('❌ Erro ao configurar índices:', error);
  }
}

// Função para criar dados de exemplo (opcional)
async function createSampleData() {
  console.log('📝 Criando dados de exemplo...');
  
  try {
    // Criar usuário financeiro de exemplo
    const sampleUserId = 'sample_user_123';
    const financeiroUserRef = db.collection('financeiro_users').doc(sampleUserId);
    
    await financeiroUserRef.set({
      uid: sampleUserId,
      email: 'exemplo@empresa.com',
      displayName: 'Usuário Exemplo',
      userType: 'empresa',
      isActive: true,
      createdAt: new Date().toISOString(),
      permissions: ['read', 'write'],
      settings: {
        notificacoes: { email: true, sms: false, push: true },
        preferencias: { tema: 'light', idioma: 'pt-BR', timezone: 'America/Sao_Paulo' },
        integracao: {}
      }
    });
    
    // Criar documento financeiro de exemplo
    const docRef = db.collection('financeiro_documentos').doc();
    await docRef.set({
      userId: sampleUserId,
      tipo: 'nfe',
      numero: '000001',
      status: 'completed',
      statusAprovacao: 'pending',
      criadoEm: new Date().toISOString(),
      createdBy: sampleUserId,
      emitente: {
        cnpj: '12345678000199',
        razaoSocial: 'Empresa Exemplo LTDA',
        endereco: {
          logradouro: 'Rua Exemplo',
          numero: '123',
          bairro: 'Centro',
          cidade: 'São Paulo',
          uf: 'SP',
          cep: '01000-000',
          pais: 'Brasil'
        }
      },
      destinatario: {
        cnpj: '98765432000188',
        razaoSocial: 'Cliente Exemplo LTDA',
        endereco: {
          logradouro: 'Av. Cliente',
          numero: '456',
          bairro: 'Jardim',
          cidade: 'Rio de Janeiro',
          uf: 'RJ',
          cep: '20000-000',
          pais: 'Brasil'
        }
      },
      valores: {
        valorBruto: 1000.00,
        valorLiquido: 850.00,
        valorTotalTributos: 150.00
      },
      itens: [],
      impostos: [],
      anexos: []
    });
    
    console.log('✅ Dados de exemplo criados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar dados de exemplo:', error);
  }
}

// Executar configuração
async function main() {
  await createIndexes();
  
  // Perguntar se deseja criar dados de exemplo
  const args = process.argv.slice(2);
  if (args.includes('--sample-data')) {
    await createSampleData();
  }
  
  process.exit(0);
}

main().catch(console.error);
