
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase';

// Configurar para usar emuladores se disponível
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Conectar aos emuladores se estiverem rodando
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log('🔧 Conectando aos emuladores...');
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectAuthEmulator(auth, 'http://localhost:9099');
}

interface SeedUser {
  email: string;
  password: string;
  displayName: string;
  role: string;
  empresaId: string;
  sistemasAtivos: string[];
}

interface SeedEmpresa {
  id: string;
  nome: string;
  email: string;
  cnpj: string;
  ownerUid: string;
  plano: string;
  sistemasAtivos: string[];
}

const empresas: SeedEmpresa[] = [
  {
    id: 'empresa_a',
    nome: 'Tech Solutions Ltda',
    email: 'admin@techsolutions.com',
    cnpj: '12.345.678/0001-90',
    ownerUid: 'user_admin_a',
    plano: 'enterprise',
    sistemasAtivos: ['crm', 'ponto', 'frota', 'financeiro', 'documentos', 'chamados']
  },
  {
    id: 'empresa_b',
    nome: 'Digital Commerce Inc',
    email: 'admin@digitalcommerce.com',
    cnpj: '98.765.432/0001-10',
    ownerUid: 'user_admin_b',
    plano: 'premium',
    sistemasAtivos: ['crm', 'ponto', 'financeiro', 'chamados']
  }
];

const users: SeedUser[] = [
  // Empresa A
  {
    email: 'admin@techsolutions.com',
    password: 'admin123',
    displayName: 'Admin Tech Solutions',
    role: 'admin',
    empresaId: 'empresa_a',
    sistemasAtivos: ['crm', 'ponto', 'frota', 'financeiro', 'documentos', 'chamados']
  },
  {
    email: 'gestor@techsolutions.com',
    password: 'gestor123',
    displayName: 'Gestor Tech Solutions',
    role: 'gestor',
    empresaId: 'empresa_a',
    sistemasAtivos: ['crm', 'ponto', 'financeiro']
  },
  {
    email: 'colaborador@techsolutions.com',
    password: 'colab123',
    displayName: 'Colaborador Tech Solutions',
    role: 'colaborador',
    empresaId: 'empresa_a',
    sistemasAtivos: ['ponto', 'chamados']
  },
  
  // Empresa B
  {
    email: 'admin@digitalcommerce.com',
    password: 'admin123',
    displayName: 'Admin Digital Commerce',
    role: 'admin',
    empresaId: 'empresa_b',
    sistemasAtivos: ['crm', 'ponto', 'financeiro', 'chamados']
  },
  {
    email: 'vendedor@digitalcommerce.com',
    password: 'vendas123',
    displayName: 'Vendedor Digital Commerce',
    role: 'colaborador',
    empresaId: 'empresa_b',
    sistemasAtivos: ['crm', 'chamados']
  },

  // SuperAdmin
  {
    email: 'superadmin@enygna.com',
    password: 'super123',
    displayName: 'Super Administrador',
    role: 'superadmin',
    empresaId: '',
    sistemasAtivos: ['crm', 'ponto', 'frota', 'financeiro', 'documentos', 'chamados']
  }
];

async function createEmpresas() {
  console.log('📊 Criando empresas...');
  
  for (const empresa of empresas) {
    await setDoc(doc(db, 'empresas', empresa.id), {
      nome: empresa.nome,
      email: empresa.email,
      cnpj: empresa.cnpj,
      ownerUid: empresa.ownerUid,
      plano: empresa.plano,
      sistemasAtivos: empresa.sistemasAtivos,
      ativo: true,
      configuracoes: {
        geofencing: false,
        selfieObrigatoria: false,
        notificacaoEmail: true
      },
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    });
    
    console.log(`✅ Empresa criada: ${empresa.nome}`);
  }
}

async function createUsers() {
  console.log('👥 Criando usuários...');
  
  for (const user of users) {
    try {
      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, user.email, user.password);
      const uid = userCredential.user.uid;
      
      // Criar documento do usuário no Firestore
      await setDoc(doc(db, 'users', uid), {
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        empresaId: user.empresaId,
        sistemasAtivos: user.sistemasAtivos,
        ativo: true,
        permissions: {
          crm: user.sistemasAtivos.includes('crm'),
          ponto: user.sistemasAtivos.includes('ponto'),
          frota: user.sistemasAtivos.includes('frota'),
          financeiro: user.sistemasAtivos.includes('financeiro'),
          documentos: user.sistemasAtivos.includes('documentos'),
          chamados: user.sistemasAtivos.includes('chamados')
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ Usuário criado: ${user.displayName} (${user.email})`);
      
      // Fazer logout para não interferir na criação do próximo usuário
      await auth.signOut();
      
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️ Usuário já existe: ${user.email}`);
      } else {
        console.error(`❌ Erro ao criar usuário ${user.email}:`, error);
      }
    }
  }
}

async function seedSystemData() {
  console.log('🌱 Populando dados dos sistemas...');
  
  // CRM - Leads e Oportunidades
  for (const empresa of empresas) {
    await addDoc(collection(db, `crm_empresas/${empresa.id}/leads`), {
      empresaId: empresa.id,
      nome: 'João Silva',
      email: 'joao@exemplo.com',
      telefone: '(11) 99999-9999',
      status: 'novo',
      origem: 'website',
      criadoEm: serverTimestamp()
    });

    await addDoc(collection(db, `crm_empresas/${empresa.id}/oportunidades`), {
      empresaId: empresa.id,
      titulo: 'Venda Sistema ERP',
      valor: 15000,
      status: 'em_andamento',
      probabilidade: 70,
      criadoEm: serverTimestamp()
    });
  }

  // Financeiro - Receitas e Despesas
  for (const empresa of empresas) {
    await addDoc(collection(db, `financeiro_empresas/${empresa.id}/transacoes`), {
      empresaId: empresa.id,
      tipo: 'receita',
      descricao: 'Venda de Software',
      valor: 5000,
      status: 'pago',
      categoria: 'vendas',
      dataVencimento: new Date(),
      criadoEm: serverTimestamp()
    });

    await addDoc(collection(db, `financeiro_empresas/${empresa.id}/transacoes`), {
      empresaId: empresa.id,
      tipo: 'despesa',
      descricao: 'Aluguel do Escritório',
      valor: 2500,
      status: 'pendente',
      categoria: 'operacional',
      dataVencimento: new Date(),
      criadoEm: serverTimestamp()
    });
  }

  // Chamados
  for (const empresa of empresas) {
    await addDoc(collection(db, `chamados_empresas/${empresa.id}/tickets`), {
      empresaId: empresa.id,
      titulo: 'Problema no Sistema',
      descricao: 'Sistema está lento',
      status: 'aberto',
      prioridade: 'media',
      categoria: 'tecnico',
      criadoEm: serverTimestamp()
    });
  }

  console.log('✅ Dados dos sistemas criados');
}

async function seedDatabase() {
  try {
    console.log('🚀 Iniciando seed do banco de dados...');
    
    await createEmpresas();
    await createUsers();
    await seedSystemData();
    
    console.log('🎉 Seed concluído com sucesso!');
    console.log('\n📋 Resumo:');
    console.log(`- ${empresas.length} empresas criadas`);
    console.log(`- ${users.length} usuários criados`);
    console.log('- Dados de teste para CRM, Financeiro e Chamados');
    
    console.log('\n🔑 Credenciais de teste:');
    users.forEach(user => {
      console.log(`${user.role}: ${user.email} / ${user.password}`);
    });
    
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
  } finally {
    process.exit(0);
  }
}

// Executar seed
seedDatabase();
