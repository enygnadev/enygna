
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, addDoc, collection, updateDoc, deleteDoc } from 'firebase/firestore';

// Mock do Firebase para testes
const firebaseConfig = {
  apiKey: "demo-project",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "demo-app-id"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

describe('Segurança do Firestore', () => {
  
  beforeAll(async () => {
    // Conectar aos emuladores
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      console.log('Conectando aos emuladores para testes...');
    }
  });

  afterEach(async () => {
    // Fazer logout após cada teste
    if (auth.currentUser) {
      await signOut(auth);
    }
  });

  describe('Regras de Empresas', () => {
    it('deve permitir criar empresa com dados válidos', async () => {
      // Login como usuário autenticado
      await signInWithEmailAndPassword(auth, 'test@empresa.com', 'password123');
      
      const empresaData = {
        nome: 'Empresa Teste',
        email: 'test@empresa.com',
        ownerUid: auth.currentUser?.uid,
        plano: 'premium',
        sistemasAtivos: ['crm', 'ponto'],
        ativo: true
      };

      // Deve conseguir criar empresa
      await expect(
        setDoc(doc(db, 'empresas', auth.currentUser!.uid), empresaData)
      ).resolves.not.toThrow();
    });

    it('deve negar criação de empresa sem dados obrigatórios', async () => {
      await signInWithEmailAndPassword(auth, 'test@empresa.com', 'password123');
      
      const empresaDataIncompleta = {
        // falta nome e email obrigatórios
        plano: 'premium'
      };

      // Deve falhar por falta de campos obrigatórios
      await expect(
        setDoc(doc(db, 'empresas', 'empresa_teste'), empresaDataIncompleta)
      ).rejects.toThrow();
    });
  });

  describe('Regras de Ponto', () => {
    it('colaborador deve conseguir criar próprio ponto com email verificado', async () => {
      // Simular usuário com email verificado
      await signInWithEmailAndPassword(auth, 'colaborador@empresa.com', 'password123');
      
      const pontoData = {
        empresaId: 'empresa_teste',
        userId: auth.currentUser?.uid,
        timestamp: Date.now(),
        tipo: 'entrada',
        localizacao: { lat: -23.5505, lng: -46.6333 }
      };

      // Deve conseguir criar ponto próprio
      await expect(
        addDoc(collection(db, 'ponto_empresas/empresa_teste/registros'), pontoData)
      ).resolves.not.toThrow();
    });

    it('colaborador NÃO deve conseguir criar ponto para outro usuário', async () => {
      await signInWithEmailAndPassword(auth, 'colaborador@empresa.com', 'password123');
      
      const pontoDataOutroUser = {
        empresaId: 'empresa_teste',
        userId: 'outro_usuario_id', // Tentando criar para outro usuário
        timestamp: Date.now(),
        tipo: 'entrada'
      };

      // Deve falhar
      await expect(
        addDoc(collection(db, 'ponto_empresas/empresa_teste/registros'), pontoDataOutroUser)
      ).rejects.toThrow();
    });

    it('colaborador deve conseguir editar ponto próprio dentro de 5 minutos', async () => {
      await signInWithEmailAndPassword(auth, 'colaborador@empresa.com', 'password123');
      
      const agora = Date.now();
      const pontoId = 'ponto_teste';
      
      // Simular ponto criado há 3 minutos
      const pontoData = {
        empresaId: 'empresa_teste',
        userId: auth.currentUser?.uid,
        timestamp: agora - (3 * 60 * 1000), // 3 minutos atrás
        tipo: 'entrada'
      };

      // Primeiro criar o ponto
      await setDoc(doc(db, `ponto_empresas/empresa_teste/registros/${pontoId}`), pontoData);

      // Tentar editar (deve funcionar)
      await expect(
        updateDoc(doc(db, `ponto_empresas/empresa_teste/registros/${pontoId}`), {
          observacoes: 'Editado pelo usuário'
        })
      ).resolves.not.toThrow();
    });

    it('colaborador NÃO deve conseguir editar ponto próprio após 5 minutos', async () => {
      await signInWithEmailAndPassword(auth, 'colaborador@empresa.com', 'password123');
      
      const agora = Date.now();
      const pontoId = 'ponto_antigo';
      
      // Simular ponto criado há 10 minutos
      const pontoDataAntigo = {
        empresaId: 'empresa_teste',
        userId: auth.currentUser?.uid,
        timestamp: agora - (10 * 60 * 1000), // 10 minutos atrás
        tipo: 'entrada'
      };

      await setDoc(doc(db, `ponto_empresas/empresa_teste/registros/${pontoId}`), pontoDataAntigo);

      // Tentar editar (deve falhar)
      await expect(
        updateDoc(doc(db, `ponto_empresas/empresa_teste/registros/${pontoId}`), {
          observacoes: 'Tentativa de edição tardia'
        })
      ).rejects.toThrow();
    });
  });

  describe('Regras de Financeiro', () => {
    it('usuário comum NÃO deve conseguir criar registros financeiros', async () => {
      await signInWithEmailAndPassword(auth, 'colaborador@empresa.com', 'password123');
      
      const financeiroData = {
        empresaId: 'empresa_teste',
        tipo: 'receita',
        valor: 1000,
        descricao: 'Venda teste'
      };

      // Deve falhar - usuário comum não tem acesso ao financeiro
      await expect(
        addDoc(collection(db, 'financeiro_empresas/empresa_teste/transacoes'), financeiroData)
      ).rejects.toThrow();
    });

    it('admin deve conseguir criar registros financeiros', async () => {
      // Simular login de admin
      await signInWithEmailAndPassword(auth, 'admin@empresa.com', 'password123');
      
      const financeiroData = {
        empresaId: 'empresa_teste',
        tipo: 'receita',
        valor: 1000,
        descricao: 'Venda teste',
        categoria: 'vendas'
      };

      // Admin deve conseguir criar
      await expect(
        addDoc(collection(db, 'financeiro_empresas/empresa_teste/transacoes'), financeiroData)
      ).resolves.not.toThrow();
    });
  });

  describe('Regras de Notificações', () => {
    it('usuário deve conseguir criar notificação para si mesmo', async () => {
      await signInWithEmailAndPassword(auth, 'user@empresa.com', 'password123');
      
      const notificationData = {
        userId: auth.currentUser?.uid,
        titulo: 'Teste de notificação',
        mensagem: 'Esta é uma notificação de teste',
        timestamp: Date.now(),
        lida: false
      };

      // Deve conseguir criar notificação própria
      await expect(
        addDoc(collection(db, `Notifications/${auth.currentUser?.uid}/items`), notificationData)
      ).resolves.not.toThrow();
    });

    it('usuário NÃO deve conseguir criar notificação para outro usuário', async () => {
      await signInWithEmailAndPassword(auth, 'user@empresa.com', 'password123');
      
      const notificationDataOutroUser = {
        userId: 'outro_usuario_id', // Tentando criar para outro usuário
        titulo: 'Notificação inválida',
        mensagem: 'Esta notificação não deveria ser criada',
        timestamp: Date.now(),
        lida: false
      };

      // Deve falhar
      await expect(
        addDoc(collection(db, 'Notifications/outro_usuario_id/items'), notificationDataOutroUser)
      ).rejects.toThrow();
    });
  });

  describe('Isolamento entre Empresas', () => {
    it('usuário da empresa A NÃO deve acessar dados da empresa B', async () => {
      await signInWithEmailAndPassword(auth, 'user_empresa_a@test.com', 'password123');
      
      // Tentar acessar dados da empresa B
      await expect(
        getDoc(doc(db, 'crm_empresas/empresa_b/leads/lead_teste'))
      ).rejects.toThrow();
    });

    it('usuário deve conseguir acessar apenas dados da própria empresa', async () => {
      await signInWithEmailAndPassword(auth, 'user_empresa_a@test.com', 'password123');
      
      const crmData = {
        empresaId: 'empresa_a',
        nome: 'Lead Teste',
        email: 'lead@test.com',
        status: 'novo'
      };

      // Deve conseguir criar dados para própria empresa
      await expect(
        addDoc(collection(db, 'crm_empresas/empresa_a/leads'), crmData)
      ).resolves.not.toThrow();
    });
  });
});
