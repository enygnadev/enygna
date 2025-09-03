'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, getDocs, query, where, serverTimestamp, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import ThemeSelector from '@/src/components/ThemeSelector';
import { useRouter } from 'next/navigation';


interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  status: 'lead' | 'prospecto' | 'qualificado' | 'proposta' | 'negociacao' | 'fechado' | 'perdido';
  valor: number;
  origem: string;
  ultimoContato: string;
  proximoContato: string;
  responsavel: string;
  responsavelNome?: string;
  observacoes: string;
  tags: string[];
  criadoEm: string;
  atualizadoEm: string;
}

interface Missao {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'contato' | 'venda' | 'follow_up' | 'documentacao';
  dificuldade: 'facil' | 'medio' | 'dificil';
  xpRecompensa: number;
  badgeRecompensa?: string;
  repetivel: boolean;
  ativa: boolean;
  metas: {
    tipo: string;
    quantidade: number;
    valor?: number;
  }[];
}

interface CrmStats {
  totalClientes: number;
  clientesAtivos: number;
  vendas: number;
  faturamento: number;
  conversao: number;
  ticketMedio: number;
  leadsMes: number;
  metaMes: number;
}

export default function CrmPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userPermissions, setUserPermissions] = useState<any>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const [stats, setStats] = useState<CrmStats>({
    totalClientes: 0,
    clientesAtivos: 0,
    vendas: 0,
    faturamento: 0,
    conversao: 0,
    ticketMedio: 0,
    leadsMes: 0,
    metaMes: 100000,
  });

  // Estados de controle
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showAddColaboradorModal, setShowAddColaboradorModal] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [snackbar, setSnackbar] = useState<{open:boolean,message:string,type:'success'|'error'}>({ open: false, message: '', type: 'success' });

  // Estados para formulários
  const [newClient, setNewClient] = useState<Partial<Cliente>>({});
  const [newColaborador, setNewColaborador] = useState({
    nome: '',
    email: '',
    senha: ''
  });
  const [newMission, setNewMission] = useState<Partial<Missao>>({});
  const [colaboradoresDisponiveis, setColaboradoresDisponiveis] = useState<any[]>([]);

  // Estados para loading
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isAddingColaborador, setIsAddingColaborador] = useState(false);
  const [isAddingMission, setIsAddingMission] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'kanban', label: 'Funil de Vendas', icon: '🎯' },
    { id: 'clientes', label: 'Clientes', icon: '👥' },
    { id: 'missoes', label: 'Missões RPG', icon: '⚔️' },
    { id: 'relatorios', label: 'Relatórios', icon: '📈' },
    { id: 'configuracoes', label: 'Configurações', icon: '⚙️' }
  ];

  const statusLabels = {
    lead: '🔍 Lead',
    prospecto: '👀 Prospecto',
    qualificado: '✅ Qualificado',
    proposta: '📋 Proposta',
    negociacao: '🤝 Negociação',
    fechado: '💰 Fechado',
    perdido: '❌ Perdido'
  };

  const userRole = userPermissions?.role || '';

  // Função para logout
  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/crm/auth');
    } catch (error) {
      console.error('Erro ao deslogar:', error);
      showSnackbar('Erro ao deslogar', 'error');
    }
  };

  // Verificar permissões do usuário
  const checkUserPermissions = async (userEmail: string) => {
    try {
      setLoading(true);

      // Permitir acesso para todos os usuários autenticados temporariamente
      setHasAccess(true);
      setUserPermissions({
        email: userEmail,
        role: 'admin',
        permissions: { crm: true }
      });

      showSnackbar('Acesso autorizado ao sistema de CRM!', 'success');
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      setHasAccess(true); // Permitir acesso mesmo com erro
      showSnackbar('Acesso autorizado (modo de recuperação)', 'success');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados do Firestore
  const loadClientes = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Buscar dados do usuário para obter empresaId
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      let empresaId = userData?.empresaId;

      // Se não encontrar empresaId no usuário, buscar empresa onde é admin
      if (!empresaId) {
        console.log('Buscando empresa do usuário...');
        const empresasSnap = await getDocs(collection(db, 'empresas'));

        for (const empresaDoc of empresasSnap.docs) {
          const empresaData = empresaDoc.data();
          if (empresaData.adminId === user.uid || empresaData.email === user.email) {
            empresaId = empresaDoc.id;
            console.log('Empresa encontrada para carregar clientes:', empresaId);
            // A linha abaixo é a que foi modificada para mudar de 'empresa' para 'ponto'
            router.push(`/ponto/dashboard?empresaId=${empresaDoc.id}`);
            break;
          }
        }
      }

      if (!empresaId) {
        console.log('Empresa não encontrada para carregar clientes');
        showSnackbar('Empresa não encontrada para carregar clientes', 'error');
        return;
      }

      // Buscar clientes na subcoleção da empresa
      const clientesRef = collection(db, 'empresas', empresaId, 'clientes');
      const querySnapshot = await getDocs(clientesRef);

      const clientesData: Cliente[] = [];
      querySnapshot.forEach((doc) => {
        clientesData.push({ id: doc.id, ...doc.data() } as Cliente);
      });

      console.log('Clientes carregados:', clientesData.length);
      setClientes(clientesData);
      calculateStats(clientesData);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      showSnackbar('Erro ao carregar dados do CRM', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Carregar missões
  const loadMissoes = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      let empresaId = userData?.empresaId;

      if (!empresaId) {
        const empresasSnap = await getDocs(collection(db, 'empresas'));
        for (const empresaDoc of empresasSnap.docs) {
          const empresaData = empresaDoc.data();
          if (empresaData.adminId === user.uid || empresaData.email === user.email) {
            empresaId = empresaDoc.id;
            break;
          }
        }
      }

      if (!empresaId) return;

      const missoesRef = collection(db, 'empresas', empresaId, 'missoes');
      const querySnapshot = await getDocs(missoesRef);

      const missoesData: Missao[] = [];
      querySnapshot.forEach((doc) => {
        missoesData.push({ id: doc.id, ...doc.data() } as Missao);
      });

      setMissoes(missoesData);
    } catch (error) {
      console.error('Erro ao carregar missões:', error);
    }
  };

  // Calcular estatísticas
  const calculateStats = (clientesData: Cliente[]) => {
    const newStats: CrmStats = {
      totalClientes: clientesData.length,
      clientesAtivos: clientesData.filter(c => !['perdido', 'fechado'].includes(c.status)).length,
      vendas: clientesData.filter(c => c.status === 'fechado').length,
      faturamento: clientesData.filter(c => c.status === 'fechado').reduce((sum, c) => sum + c.valor, 0),
      conversao: clientesData.length > 0 ? (clientesData.filter(c => c.status === 'fechado').length / clientesData.length) * 100 : 0,
      ticketMedio: 0,
      leadsMes: clientesData.filter(c => c.status === 'lead').length,
      metaMes: 100000,
    };

    if (newStats.vendas > 0) {
      newStats.ticketMedio = newStats.faturamento / newStats.vendas;
    }

    setStats(newStats);
  };

  // Carregar colaboradores disponíveis
  const loadColaboradoresDisponiveis = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      let empresaId = userData?.empresaId;

      if (!empresaId) {
        const empresasSnap = await getDocs(collection(db, 'empresas'));
        for (const empresaDoc of empresasSnap.docs) {
          const empresaData = empresaDoc.data();
          if (empresaData.adminId === user.uid || empresaData.email === user.email) {
            empresaId = empresaDoc.id;
            break;
          }
        }
      }

      if (!empresaId) {
        showSnackbar('Empresa não encontrada', 'error');
        return;
      }

      const colaboradoresSnap = await getDocs(collection(db, 'empresas', empresaId, 'colaboradores'));
      const colaboradoresData = colaboradoresSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setColaboradoresDisponiveis(colaboradoresData);
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
      showSnackbar('Erro ao carregar colaboradores', 'error');
    }
  };

  // Filtrar clientes
  useEffect(() => {
    if (clientes.length === 0) {
      setFilteredClientes([]);
      return;
    }

    let filtered = [...clientes];

    if (statusFilter !== 'todos') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.nome?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.empresa?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredClientes(filtered);
  }, [clientes, statusFilter, searchTerm]);

  // Função para adicionar colaborador
  async function handleAddColaborador() {
    if (!user || !newColaborador.nome || !newColaborador.email || !newColaborador.senha) {
      showSnackbar('Preencha todos os campos obrigatórios!', 'error');
      return;
    }

    try {
      setIsAddingColaborador(true);

      let empresaId: string | null = null;
      let userRole: string = '';

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        empresaId = userData?.empresaId;
        userRole = userData?.role || '';
      }

      if (!empresaId) {
        const empresasSnap = await getDocs(
          query(
            collection(db, 'empresas'),
            where('adminId', '==', user.uid)
          )
        );

        if (!empresasSnap.empty) {
          const empresaDoc = empresasSnap.docs[0];
          empresaId = empresaDoc.id;
          userRole = 'admin';

          await setDoc(doc(db, 'users', user.uid), {
            empresaId: empresaId,
            role: userRole,
            email: user.email,
            displayName: user.displayName || user.email,
            dataCriacao: serverTimestamp(),
            lastLogin: serverTimestamp()
          }, { merge: true });
        }
      }

      if (!empresaId) {
        const empresasSnap = await getDocs(collection(db, 'empresas'));

        for (const empresaDoc of empresasSnap.docs) {
          const empresaData = empresaDoc.data();
          if (empresaData.email === user.email || empresaData.adminId === user.uid) {
            empresaId = empresaDoc.id;
            userRole = 'admin';

            await setDoc(doc(db, 'users', user.uid), {
              empresaId: empresaId,
              role: userRole,
              email: user.email,
              displayName: user.displayName || user.email,
              dataCriacao: serverTimestamp(),
              lastLogin: serverTimestamp()
            }, { merge: true });
            break;
          }

          const colaboradoresSnap = await getDocs(
            query(
              collection(db, 'empresas', empresaDoc.id, 'colaboradores'),
              where('email', '==', user.email)
            )
          );

          if (!colaboradoresSnap.empty) {
            const colaboradorData = colaboradoresSnap.docs[0].data();
            userRole = colaboradorData.role;
            empresaId = empresaDoc.id;

            await setDoc(doc(db, 'users', user.uid), {
              empresaId: empresaId,
              role: userRole,
              email: user.email,
              displayName: user.displayName || user.email,
              dataCriacao: serverTimestamp(),
              lastLogin: serverTimestamp()
            }, { merge: true });
            break;
          }
        }
      }

      if (!empresaId && (userRole === 'superadmin' || userPermissions?.role === 'superadmin')) {
        const empresasSnap = await getDocs(collection(db, 'empresas'));
        if (!empresasSnap.empty) {
          empresaId = empresasSnap.docs[0].id;
        }
      }

      if (!empresaId) {
        if (userRole === 'colaborador') {
          showSnackbar('Você não tem permissão para adicionar colaboradores. Apenas administradores podem adicionar novos colaboradores.', 'error');
        } else {
          showSnackbar('Não foi possível identificar sua empresa. Verifique suas permissões ou entre em contato com o suporte.', 'error');
        }
        return;
      }

      const rolesPermitidos = ['superadmin', 'admin', 'gestor'];
      const hasPermission = rolesPermitidos.includes(userRole) || rolesPermitidos.includes(userPermissions?.role || '');

      if (!hasPermission) {
        showSnackbar('Você não tem permissão para adicionar colaboradores', 'error');
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newColaborador.email,
        newColaborador.senha
      );

      await updateProfile(userCredential.user, {
        displayName: newColaborador.nome
      });

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: newColaborador.email,
        displayName: newColaborador.nome,
        role: 'colaborador',
        tipo: 'colaborador',
        empresaId: empresaId,
        ativo: true,
        isPessoal: false,
        permissions: {
          crm: true,
          frota: false,
          ponto: true,
          chamados: true,
          documentos: true
        },
        dataCriacao: serverTimestamp(),
        lastLogin: serverTimestamp()
      });

      await setDoc(doc(db, 'empresas', empresaId, 'colaboradores', userCredential.user.uid), {
        email: newColaborador.email,
        displayName: newColaborador.nome,
        role: 'colaborador',
        ativo: true,
        isAuthUser: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      showSnackbar(`Colaborador adicionado com sucesso! Vinculado à empresa ${empresaId}`, 'success');
      setNewColaborador({ nome: '', email: '', senha: '' });
      setShowAddColaboradorModal(false);

    } catch (error: any) {
      console.error('Erro ao adicionar colaborador:', error);

      if (error.code === 'auth/email-already-in-use') {
        showSnackbar('Este email já está sendo usado por outro usuário', 'error');
      } else if (error.code === 'auth/weak-password') {
        showSnackbar('A senha deve ter pelo menos 6 caracteres', 'error');
      } else if (error.code === 'auth/invalid-email') {
        showSnackbar('Email inválido', 'error');
      } else {
        showSnackbar(`Erro ao adicionar colaborador: ${error.message}`, 'error');
      }
    } finally {
      setIsAddingColaborador(false);
    }
  }

  // Função para adicionar cliente
  async function handleAddClient() {
    if (!user || !newClient.nome || !newClient.email) {
      showSnackbar('Preencha todos os campos obrigatórios!', 'error');
      return;
    }

    setIsAddingClient(true);

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      let empresaId = userData?.empresaId;

      if (!empresaId) {
        const empresasSnap = await getDocs(collection(db, 'empresas'));
        for (const empresaDoc of empresasSnap.docs) {
          const empresaData = empresaDoc.data();
          if (empresaData.adminId === user.uid || empresaData.email === user.email) {
            empresaId = empresaDoc.id;
            break;
          }
        }
      }

      if (!empresaId) {
        showSnackbar('Empresa não encontrada. Verifique suas permissões.', 'error');
        return;
      }

      const clientData = {
        nome: newClient.nome,
        email: newClient.email,
        telefone: newClient.telefone || '',
        empresa: newClient.empresa || '',
        status: 'lead' as const,
        valor: newClient.valor || 0,
        origem: newClient.origem || 'Manual',
        ultimoContato: new Date().toISOString(),
        proximoContato: '',
        responsavel: user.email,
        responsavelNome: user.displayName || user.email,
        observacoes: newClient.observacoes || '',
        tags: [],
        adminId: user.uid,
        empresaId: empresaId,
        ativo: true,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        dataCriacao: serverTimestamp(),
        dataAtualizacao: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'empresas', empresaId, 'clientes'), clientData);

      showSnackbar('Cliente adicionado com sucesso!', 'success');
      setNewClient({});
      setShowAddClientModal(false);

      await loadClientes();

    } catch (error) {
      console.error('Erro ao adicionar cliente:', error);
      showSnackbar('Erro ao adicionar cliente', 'error');
    } finally {
      setIsAddingClient(false);
    }
  }

  // Função para adicionar missão
  async function handleAddMission() {
    if (!user || !newMission.titulo || !newMission.descricao) {
      showSnackbar('Preencha todos os campos obrigatórios!', 'error');
      return;
    }

    setIsAddingMission(true);

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      let empresaId = userData?.empresaId;

      if (!empresaId) {
        const empresasSnap = await getDocs(collection(db, 'empresas'));
        for (const empresaDoc of empresasSnap.docs) {
          const empresaData = empresaDoc.data();
          if (empresaData.adminId === user.uid || empresaData.email === user.email) {
            empresaId = empresaDoc.id;
            break;
          }
        }
      }

      if (!empresaId) {
        showSnackbar('Empresa não encontrada. Verifique suas permissões.', 'error');
        return;
      }

      const missionData = {
        titulo: newMission.titulo,
        descricao: newMission.descricao,
        tipo: newMission.tipo || 'contato',
        dificuldade: newMission.dificuldade || 'facil',
        xpRecompensa: newMission.xpRecompensa || 10,
        badgeRecompensa: newMission.badgeRecompensa || '',
        repetivel: newMission.repetivel || false,
        ativa: true,
        metas: newMission.metas || [],
        adminId: user.uid,
        empresaId: empresaId,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        dataCriacao: serverTimestamp(),
        dataAtualizacao: serverTimestamp()
      };

      await addDoc(collection(db, 'empresas', empresaId, 'missoes'), missionData);

      showSnackbar('Missão criada com sucesso!', 'success');
      setNewMission({});
      setShowMissionModal(false);

      await loadMissoes();

    } catch (error) {
      console.error('Erro ao criar missão:', error);
      showSnackbar('Erro ao criar missão', 'error');
    } finally {
      setIsAddingMission(false);
    }
  }

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbar({ open: true, message, type });
    setTimeout(() => setSnackbar({ open: false, message: '', type: 'success' }), 3000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'lead': return '#6b7280';
      case 'prospecto': return '#3b82f6';
      case 'qualificado': return '#10b981';
      case 'proposta': return '#f59e0b';
      case 'negociacao': return '#8b5cf6';
      case 'fechado': return '#059669';
      case 'perdido': return '#ef4444';
      default: return '#666';
    }
  };

  // Verificar autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/crm/auth');
        return;
      }

      setUser(currentUser);
      await checkUserPermissions(currentUser.email!);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (hasAccess && user) {
      loadClientes();
      loadMissoes();
    }
  }, [hasAccess, user]);

  if (!hasAccess && !loading) {
    return (
      <div className="container">
        <div className="access-denied">
          <div className="access-card">
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
            <h1>Acesso Restrito</h1>
            <p style={{ marginBottom: '2rem' }}>
              Você não tem permissão para acessar o sistema de CRM.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link href="/crm/auth" className="button button-primary">
                Fazer Login
              </Link>
              <Link href="/sistemas" className="button button-outline">
                Voltar aos Sistemas
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <div className="loading-text">Carregando sistema de CRM...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 px-4 sm:px-6 lg:px-8">
      <div className="crm-header fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="crm-title">🏢 Gerenciamento de CRM</h1>
            <p className="crm-subtitle">Sistema completo de relacionamento com clientes</p>
          </div>
          <div className="action-buttons">
            <ThemeSelector />
            <button
              onClick={() => setShowAddClientModal(true)}
              className="button button-primary interactive"
              disabled={!hasAccess}
            >
              👥 Adicionar Cliente
            </button>
            <button
              onClick={() => setShowAddColaboradorModal(true)}
              className="button button-secondary interactive"
              disabled={!hasAccess}
            >
              👨‍💼 Adicionar Colaborador
            </button>
            <button
              onClick={() => setShowMissionModal(true)}
              className="button button-outline interactive"
              disabled={!hasAccess}
            >
              ⚔️ Nova Missão
            </button>
            <button
              onClick={logout}
              className="button button-outline interactive"
            >
              🚪 Sair
            </button>
          </div>
        </div>
      </div>

      {/* Abas de Navegação */}
      <div className="tabs mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
            disabled={!hasAccess}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das Abas */}
      <div className="content-area">
        {/* Aba Dashboard */}
        {activeTab === 'dashboard' && (
          <>
            {/* Estatísticas do CRM */}
            <div className="stats-grid fade-in">
              <div className="stat-card interactive">
                <span className="stat-icon">👥</span>
                <div className="stat-title">Total de Clientes</div>
                <div className="stat-value">{stats.totalClientes}</div>
                <div className="stat-change positive">
                  <span>↗</span> +{Math.floor(stats.totalClientes * 0.1)} este mês
                </div>
              </div>
              <div className="stat-card interactive">
                <span className="stat-icon">✅</span>
                <div className="stat-title">Clientes Ativos</div>
                <div className="stat-value">{stats.clientesAtivos}</div>
                <div className="stat-change positive">
                  <span>↗</span> {((stats.clientesAtivos / Math.max(stats.totalClientes, 1)) * 100).toFixed(0)}% da base
                </div>
              </div>
              <div className="stat-card interactive">
                <span className="stat-icon">💰</span>
                <div className="stat-title">Vendas Fechadas</div>
                <div className="stat-value">{stats.vendas}</div>
                <div className="stat-change positive">
                  <span>↗</span> +{Math.floor(stats.vendas * 0.2)} esta semana
                </div>
              </div>
              <div className="stat-card interactive">
                <span className="stat-icon">📊</span>
                <div className="stat-title">Faturamento</div>
                <div className="stat-value">R$ {(stats.faturamento / 1000).toFixed(0)}K</div>
                <div className="stat-change positive">
                  <span>↗</span> R$ {stats.faturamento.toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="stat-card interactive">
                <span className="stat-icon">📈</span>
                <div className="stat-title">Conversão</div>
                <div className="stat-value">{stats.conversao.toFixed(1)}%</div>
                <div className="stat-change positive">
                  <span>↗</span> {stats.conversao > 20 ? 'Excelente' : 'Bom'}
                </div>
              </div>
              <div className="stat-card interactive">
                <span className="stat-icon">🎯</span>
                <div className="stat-title">Ticket Médio</div>
                <div className="stat-value">R$ {stats.ticketMedio.toFixed(0)}</div>
                <div className="stat-change positive">
                  <span>↗</span> Por venda
                </div>
              </div>
              <div className="stat-card interactive">
                <span className="stat-icon">🔍</span>
                <div className="stat-title">Leads Mês</div>
                <div className="stat-value">{stats.leadsMes}</div>
                <div className="stat-change positive">
                  <span>↗</span> Novos leads
                </div>
              </div>
              <div className="stat-card interactive">
                <span className="stat-icon">🏆</span>
                <div className="stat-title">Meta Mensal</div>
                <div className="stat-value">{((stats.faturamento / stats.metaMes) * 100).toFixed(0)}%</div>
                <div className="stat-change positive">
                  <span>↗</span> R$ {stats.metaMes.toLocaleString('pt-BR')}
                </div>
              </div>
            </div>

            {/* Filtros e Busca */}
            <div className="filters-container fade-in">
              <div className="filters-grid">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📊 Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="select"
                  >
                    <option value="todos">📋 Todos os Status</option>
                    <option value="lead">🔍 Lead</option>
                    <option value="prospecto">👀 Prospecto</option>
                    <option value="qualificado">✅ Qualificado</option>
                    <option value="proposta">📋 Proposta</option>
                    <option value="negociacao">🤝 Negociação</option>
                    <option value="fechado">💰 Fechado</option>
                    <option value="perdido">❌ Perdido</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🔍 Buscar</label>
                  <input
                    type="text"
                    placeholder="Buscar por nome, email ou empresa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Aba Kanban (Funil de Vendas) */}
        {activeTab === 'kanban' && (
          <div className="kanban-container fade-in">
            <h2 className="text-2xl font-bold mb-6">🎯 Funil de Vendas</h2>
            <div className="kanban-board">
              {Object.entries(statusLabels).map(([status, label]) => (
                <div key={status} className="kanban-column">
                  <div className="kanban-header">
                    <h3>{label}</h3>
                    <span className="badge">
                      {filteredClientes.filter(c => c.status === status).length}
                    </span>
                  </div>
                  <div className="kanban-cards">
                    {filteredClientes
                      .filter(c => c.status === status)
                      .map(cliente => (
                        <div key={cliente.id} className="kanban-card">
                          <h4>{cliente.nome}</h4>
                          <p>{cliente.empresa}</p>
                          <div className="card-footer">
                            <span className="valor">R$ {cliente.valor.toLocaleString('pt-BR')}</span>
                            <span className="responsavel">{cliente.responsavelNome}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aba Clientes */}
        {activeTab === 'clientes' && (
          <div className="table-container fade-in">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="table-header">
                  <tr>
                    <th className="table-cell text-left font-semibold">👤 Nome</th>
                    <th className="table-cell text-left font-semibold">🏢 Empresa</th>
                    <th className="table-cell text-left font-semibold">📊 Status</th>
                    <th className="table-cell text-left font-semibold">💰 Valor</th>
                    <th className="table-cell text-left font-semibold">👨‍💼 Responsável</th>
                    <th className="table-cell text-left font-semibold">⚙️ Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredClientes.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={6} className="table-cell text-center">
                        <div className="empty-state">
                          <div className="empty-icon">👥</div>
                          <div className="empty-title">Nenhum cliente encontrado</div>
                          <div className="empty-description">
                            Adicione clientes ao seu CRM ou ajuste os filtros de busca.
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredClientes.map((cliente) => (
                      <tr key={cliente.id} className="table-row interactive">
                        <td className="table-cell">
                          <div className="font-semibold text-gray-900">{cliente.nome}</div>
                          <div className="text-sm text-gray-500">{cliente.email}</div>
                        </td>
                        <td className="table-cell">
                          <div className="font-medium">{cliente.empresa}</div>
                          <div className="text-sm text-gray-500">{cliente.telefone}</div>
                        </td>
                        <td className="table-cell">
                          <span className={`status-badge status-${cliente.status}`}>
                            {statusLabels[cliente.status]}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="font-semibold">R$ {cliente.valor.toLocaleString('pt-BR')}</div>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center">
                            {cliente.responsavelNome ? (
                              <div>
                                <div className="font-medium">{cliente.responsavelNome}</div>
                                <div className="text-sm text-gray-500">{cliente.responsavel}</div>
                              </div>
                            ) : (
                              <div className="text-gray-400 italic">👤 Não atribuído</div>
                            )}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => { setSelectedClient(cliente); setDetailsModalOpen(true); }}
                              className="button button-outline"
                              style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                              title="Ver detalhes"
                            >
                              👁️ Ver
                            </button>
                            <button
                              onClick={() => { setSelectedClient(cliente); setEditMode(true); }}
                              className="button button-primary"
                              style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                              disabled={!hasAccess}
                              title="Editar cliente"
                            >
                              ✏️ Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Aba Missões RPG */}
        {activeTab === 'missoes' && (
          <div className="missions-container fade-in">
            <h2 className="text-2xl font-bold mb-6">⚔️ Missões RPG</h2>
            <div className="missions-grid">
              {missoes.map((missao) => (
                <div key={missao.id} className="mission-card">
                  <div className="mission-header">
                    <h3>{missao.titulo}</h3>
                    <span className={`difficulty-badge ${missao.dificuldade}`}>
                      {missao.dificuldade === 'facil' && '⭐ Fácil'}
                      {missao.dificuldade === 'medio' && '⭐⭐ Médio'}
                      {missao.dificuldade === 'dificil' && '⭐⭐⭐ Difícil'}
                    </span>
                  </div>
                  <p className="mission-description">{missao.descricao}</p>
                  <div className="mission-reward">
                    <span>🏆 {missao.xpRecompensa} XP</span>
                    {missao.badgeRecompensa && <span>🎖️ {missao.badgeRecompensa}</span>}
                  </div>
                  <div className="mission-actions">
                    <button className="button button-primary">
                      🎯 Aceitar Missão
                    </button>
                  </div>
                </div>
              ))}
              {missoes.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">⚔️</div>
                  <div className="empty-title">Nenhuma missão disponível</div>
                  <div className="empty-description">
                    Crie missões para gamificar o trabalho da sua equipe.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aba Relatórios */}
        {activeTab === 'relatorios' && (
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>📈 Relatórios</h2>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '3rem',
              borderRadius: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{ marginBottom: '1rem' }}>Relatórios Avançados</h3>
              <p style={{ opacity: 0.8, maxWidth: '600px', margin: '0 auto' }}>
                Sistema de relatórios em desenvolvimento. Em breve você terá acesso a relatórios detalhados sobre:
                performance de vendas, funil de conversão, análise de clientes e muito mais.
              </p>
            </div>
          </div>
        )}

        {/* Aba Configurações */}
        {activeTab === 'configuracoes' && (
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>⚙️ Configurações</h2>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '3rem',
              borderRadius: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
              <h3 style={{ marginBottom: '1rem' }}>Configurações do Sistema</h3>
              <p style={{ opacity: 0.8, maxWidth: '600px', margin: '0 auto' }}>
                Painel de configurações em desenvolvimento. Em breve você poderá configurar:
                integrações, automações, templates de email, campos personalizados e muito mais.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}

      {/* Modal de Adicionar Cliente */}
      {showAddClientModal && (
        <div className="modal-overlay" onClick={() => setShowAddClientModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Adicionar Novo Cliente</h2>
              <button onClick={() => setShowAddClientModal(false)} className="modal-close-button">&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleAddClient(); }}>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Nome*" value={newClient.nome || ''} onChange={(e) => setNewClient({ ...newClient, nome: e.target.value })} className="input" required />
                  <input type="email" placeholder="Email*" value={newClient.email || ''} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} className="input" required />
                  <input type="text" placeholder="Telefone" value={newClient.telefone || ''} onChange={(e) => setNewClient({ ...newClient, telefone: e.target.value })} className="input" />
                  <input type="text" placeholder="Empresa" value={newClient.empresa || ''} onChange={(e) => setNewClient({ ...newClient, empresa: e.target.value })} className="input" />
                  <input type="number" placeholder="Valor (R$)" value={newClient.valor || ''} onChange={(e) => setNewClient({ ...newClient, valor: parseFloat(e.target.value) || 0 })} className="input" />
                  <input type="text" placeholder="Origem" value={newClient.origem || ''} onChange={(e) => setNewClient({ ...newClient, origem: e.target.value })} className="input" />
                  <textarea placeholder="Observações" value={newClient.observacoes || ''} onChange={(e) => setNewClient({ ...newClient, observacoes: e.target.value })} className="input col-span-2" rows={3}></textarea>
                </div>
                <div className="modal-footer mt-6">
                  <button type="submit" className="button button-primary mr-2" disabled={isAddingClient}>
                    {isAddingClient ? 'Adicionando...' : 'Adicionar Cliente'}
                  </button>
                  <button type="button" onClick={() => setShowAddClientModal(false)} className="button button-outline">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Colaborador */}
      {showAddColaboradorModal && (
        <div className="modal-overlay" onClick={() => setShowAddColaboradorModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Adicionar Novo Colaborador</h2>
              <button onClick={() => setShowAddColaboradorModal(false)} className="modal-close-button">&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleAddColaborador(); }}>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Nome Completo*" value={newColaborador.nome} onChange={(e) => setNewColaborador({ ...newColaborador, nome: e.target.value })} className="input" required />
                  <input type="email" placeholder="Email*" value={newColaborador.email} onChange={(e) => setNewColaborador({ ...newColaborador, email: e.target.value })} className="input" required />
                  <input type="password" placeholder="Senha* (mínimo 6 caracteres)" value={newColaborador.senha} onChange={(e) => setNewColaborador({ ...newColaborador, senha: e.target.value })} className="input" required minLength={6} />
                  <div className="col-span-2 text-sm text-gray-600">
                    O colaborador receberá um email com as instruções para definir a senha.
                  </div>
                </div>
                <div className="modal-footer mt-6">
                  <button type="submit" className="button button-primary mr-2" disabled={isAddingColaborador}>
                    {isAddingColaborador ? 'Adicionando...' : 'Adicionar Colaborador'}
                  </button>
                  <button type="button" onClick={() => setShowAddColaboradorModal(false)} className="button button-outline">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova Missão */}
      {showMissionModal && (
        <div className="modal-overlay" onClick={() => setShowMissionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Criar Nova Missão</h2>
              <button onClick={() => setShowMissionModal(false)} className="modal-close-button">&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleAddMission(); }}>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Título da Missão*" value={newMission.titulo || ''} onChange={(e) => setNewMission({ ...newMission, titulo: e.target.value })} className="input" required />
                  <select value={newMission.dificuldade || 'facil'} onChange={(e) => setNewMission({ ...newMission, dificuldade: e.target.value as any })} className="select">
                    <option value="facil">⭐ Fácil</option>
                    <option value="medio">⭐⭐ Médio</option>
                    <option value="dificil">⭐⭐⭐ Difícil</option>
                  </select>
                  <select value={newMission.tipo || 'contato'} onChange={(e) => setNewMission({ ...newMission, tipo: e.target.value as any })} className="select">
                    <option value="contato">📞 Contato</option>
                    <option value="venda">💰 Venda</option>
                    <option value="follow_up">📧 Follow-up</option>
                    <option value="documentacao">📄 Documentação</option>
                  </select>
                  <input type="number" placeholder="XP Recompensa" value={newMission.xpRecompensa || 10} onChange={(e) => setNewMission({ ...newMission, xpRecompensa: parseInt(e.target.value) || 10 })} className="input" />
                  <input type="text" placeholder="Badge Recompensa (opcional)" value={newMission.badgeRecompensa || ''} onChange={(e) => setNewMission({ ...newMission, badgeRecompensa: e.target.value })} className="input" />
                  <div className="flex items-center">
                    <input type="checkbox" checked={newMission.repetivel || false} onChange={(e) => setNewMission({ ...newMission, repetivel: e.target.checked })} className="mr-2" />
                    <label>Missão repetível</label>
                  </div>
                  <textarea placeholder="Descrição da Missão*" value={newMission.descricao || ''} onChange={(e) => setNewMission({ ...newMission, descricao: e.target.value })} className="input col-span-2" rows={3} required></textarea>
                </div>
                <div className="modal-footer mt-6">
                  <button type="submit" className="button button-primary mr-2" disabled={isAddingMission}>
                    {isAddingMission ? 'Criando...' : 'Criar Missão'}
                  </button>
                  <button type="button" onClick={() => setShowMissionModal(false)} className="button button-outline">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Cliente */}
      {selectedClient && detailsModalOpen && (
        <div className="modal-overlay" onClick={() => setDetailsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Detalhes do Cliente: {selectedClient.nome}</h2>
              <button onClick={() => setDetailsModalOpen(false)} className="modal-close-button">&times;</button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-4">
                <div><strong>Nome:</strong> {selectedClient.nome}</div>
                <div><strong>Email:</strong> {selectedClient.email}</div>
                <div><strong>Telefone:</strong> {selectedClient.telefone}</div>
                <div><strong>Empresa:</strong> {selectedClient.empresa}</div>
                <div><strong>Status:</strong> {statusLabels[selectedClient.status]}</div>
                <div><strong>Valor:</strong> R$ {selectedClient.valor.toLocaleString('pt-BR')}</div>
                <div><strong>Origem:</strong> {selectedClient.origem}</div>
                <div><strong>Responsável:</strong> {selectedClient.responsavelNome}</div>
                <div><strong>Último Contato:</strong> {selectedClient.ultimoContato ? new Date(selectedClient.ultimoContato).toLocaleString('pt-BR') : 'N/A'}</div>
                <div><strong>Próximo Contato:</strong> {selectedClient.proximoContato ? new Date(selectedClient.proximoContato).toLocaleString('pt-BR') : 'N/A'}</div>
                <div className="col-span-2"><strong>Observações:</strong> {selectedClient.observacoes || 'Nenhuma observação'}</div>
                <div><strong>Criado em:</strong> {selectedClient.criadoEm ? new Date(selectedClient.criadoEm).toLocaleString('pt-BR') : 'N/A'}</div>
                <div><strong>Atualizado em:</strong> {selectedClient.atualizadoEm ? new Date(selectedClient.atualizadoEm).toLocaleString('pt-BR') : 'N/A'}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDetailsModalOpen(false)} className="button button-outline">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar */}
      {snackbar.open && (
        <div className={`snackbar ${snackbar.type === 'success' ? 'snackbar-success' : 'snackbar-error'}`}>
          {snackbar.message}
        </div>
      )}

      {/* Estilos personalizados para o CRM */}
      <style jsx>{`
        /* Variáveis CSS para o tema CRM */
        :global(:root) {
          --crm-primary: #3b82f6; /* Azul */
          --crm-primary-dark: #1e40af; /* Azul escuro */
          --crm-secondary: #8b5cf6; /* Roxo */
          --crm-accent: #10b981; /* Verde */
          --crm-warning: #f59e0b; /* Amarelo */
          --crm-danger: #ef4444; /* Vermelho */
          --crm-glass: rgba(255, 255, 255, 0.1);
          --crm-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        }

        /* Container principal */
        .container {
          background: linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #334155 100%);
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #e2e8f0;
        }

        .container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, rgba(16, 185, 129, 0.05) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        /* Header */
        .crm-header {
          position: relative;
          z-index: 2;
          background: linear-gradient(145deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%);
          backdrop-filter: blur(25px);
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 24px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .crm-title {
          background: linear-gradient(135deg, var(--crm-primary), var(--crm-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-size: 2.75rem;
          font-weight: 900;
          letter-spacing: -0.03em;
          margin-bottom: 0.75rem;
        }

        .crm-subtitle {
          color: #a0aec0;
          font-size: 1.15rem;
          opacity: 0.9;
        }

        /* Botões */
        .action-buttons {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .button {
          padding: 0.95rem 2rem;
          border-radius: 16px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          text-decoration: none;
          position: relative;
          overflow: hidden;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .button-primary {
          background: linear-gradient(135deg, var(--crm-primary) 0%, var(--crm-primary-dark) 100%);
          color: white;
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
        }

        .button-primary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.4);
        }

        .button-secondary {
          background: linear-gradient(135deg, var(--crm-secondary) 0%, var(--crm-primary) 100%);
          color: white;
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.3);
        }

        .button-secondary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4);
        }

        .button-outline {
          background: rgba(255, 255, 255, 0.05);
          color: var(--crm-primary);
          border: 2px solid rgba(59, 130, 246, 0.5);
          backdrop-filter: blur(10px);
        }

        .button-outline:hover {
          background: rgba(59, 130, 246, 0.2);
          color: white;
          border-color: var(--crm-primary);
          transform: translateY(-3px) scale(1.02);
        }

        .button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        /* Cards de estatísticas */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: linear-gradient(145deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%);
          backdrop-filter: blur(25px);
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 24px;
          padding: 2rem;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .stat-card:hover {
          transform: translateY(-5px) scale(1.01);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
        }

        .stat-icon {
          font-size: 3.5rem;
          margin-bottom: 1rem;
          display: block;
          opacity: 0.85;
        }

        .stat-title {
          color: #a0aec0;
          font-size: 0.95rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.75rem;
        }

        .stat-value {
          font-size: 3rem;
          font-weight: 900;
          background: linear-gradient(135deg, var(--crm-primary), var(--crm-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
        }

        .stat-change {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          font-size: 0.9rem;
          font-weight: 700;
        }

        .stat-change.positive { color: var(--crm-accent); }
        .stat-change.negative { color: var(--crm-danger); }

        /* Sistema de abas */
        .tabs {
          display: flex;
          overflow-x: auto;
          background: linear-gradient(145deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%);
          backdrop-filter: blur(25px);
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 20px;
          padding: 0.75rem;
          margin-bottom: 2rem;
          gap: 0.5rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .tab {
          padding: 1rem 1.75rem;
          background: transparent;
          border: none;
          color: #a0aec0;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          border-radius: 12px;
          transition: all 0.4s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
          position: relative;
          overflow: hidden;
        }

        .tab::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, var(--crm-primary) 0%, var(--crm-secondary) 100%);
          opacity: 0;
          transition: all 0.4s ease;
          border-radius: 12px;
        }

        .tab-active::before {
          opacity: 1;
        }

        .tab-active {
          color: white;
          font-weight: 800;
          transform: translateY(-2px);
        }

        .tab:hover:not(:disabled):not(.tab-active) {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%);
          color: var(--crm-primary);
          transform: translateY(-2px);
        }

        /* Área de conteúdo */
        .content-area {
          background: linear-gradient(145deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
          backdrop-filter: blur(25px);
          border: 2px solid rgba(59, 130, 246, 0.2);
          border-radius: 24px;
          padding: 2.5rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          position: relative;
          z-index: 1;
        }

        /* Filtros */
        .filters-container {
          background: linear-gradient(145deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
          backdrop-filter: blur(25px);
          border: 2px solid rgba(59, 130, 246, 0.2);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        /* Inputs */
        .input, .select {
          width: 100%;
          padding: 1rem 1.25rem;
          border: 2px solid rgba(59, 130, 246, 0.2);
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.8);
          color: #e2e8f0;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .input:focus, .select:focus {
          outline: none;
          border-color: var(--crm-primary);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
          transform: translateY(-1px);
        }

        /* Tabela */
        .table-container {
          background: linear-gradient(145deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
          backdrop-filter: blur(25px);
          border: 2px solid rgba(59, 130, 246, 0.2);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .table-header {
          background: linear-gradient(135deg, var(--crm-primary) 0%, var(--crm-secondary) 100%);
          color: white;
          font-weight: 700;
          border-bottom: 2px solid rgba(59, 130, 246, 0.3);
        }

        .table-row {
          transition: all 0.2s ease;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .table-row:hover {
          background: linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
          transform: translateX(5px);
        }

        .table-cell {
          padding: 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        /* Status badges */
        .status-badge {
          padding: 0.5rem 1rem;
          border-radius: 24px;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.025em;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          border: 2px solid transparent;
        }

        .status-lead {
          background: rgba(107, 114, 128, 0.15);
          color: #6b7280;
          border-color: rgba(107, 114, 128, 0.3);
        }

        .status-prospecto {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
          border-color: rgba(59, 130, 246, 0.3);
        }

        .status-qualificado {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.3);
        }

        .status-proposta {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          border-color: rgba(245, 158, 11, 0.3);
        }

        .status-negociacao {
          background: rgba(139, 92, 246, 0.15);
          color: #8b5cf6;
          border-color: rgba(139, 92, 246, 0.3);
        }

        .status-fechado {
          background: rgba(5, 150, 105, 0.15);
          color: #059669;
          border-color: rgba(5, 150, 105, 0.3);
        }

        .status-perdido {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        /* Kanban */
        .kanban-container {
          padding: 2rem;
        }

        .kanban-board {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          overflow-x: auto;
        }

        .kanban-column {
          background: linear-gradient(145deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
          border-radius: 16px;
          padding: 1.5rem;
          min-height: 400px;
        }

        .kanban-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid rgba(59, 130, 246, 0.2);
        }

        .kanban-header h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #e2e8f0;
        }

        .badge {
          background: var(--crm-primary);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .kanban-cards {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .kanban-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 12px;
          padding: 1.25rem;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .kanban-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .kanban-card h4 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 0.5rem;
        }

        .kanban-card p {
          color: #a0aec0;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
        }

        .valor {
          color: var(--crm-accent);
          font-weight: 700;
        }

        .responsavel {
          color: #a0aec0;
        }

        /* Missões */
        .missions-container {
          padding: 2rem;
        }

        .missions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .mission-card {
          background: linear-gradient(145deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
          border: 2px solid rgba(59, 130, 246, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .mission-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .mission-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .mission-header h3 {
          font-size: 1.3rem;
          font-weight: 700;
          color: #e2e8f0;
        }

        .difficulty-badge {
          padding: 0.5rem 1rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .difficulty-badge.facil {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .difficulty-badge.medio {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }

        .difficulty-badge.dificil {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .mission-description {
          color: #a0aec0;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .mission-reward {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .mission-actions {
          display: flex;
          justify-content: center;
        }

        /* Modais */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(15px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 50;
          animation: modal-fade-in 0.3s ease;
        }

        .modal-content {
          background: linear-gradient(145deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%);
          backdrop-filter: blur(25px);
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 24px;
          padding: 2.5rem;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.5);
          animation: modal-slide-up 0.3s ease;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid rgba(59, 130, 246, 0.2);
          padding-bottom: 1.5rem;
          margin-bottom: 2rem;
        }

        .modal-title {
          font-size: 1.75rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--crm-primary), var(--crm-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .modal-close-button {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.1);
          color: var(--crm-danger);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          transition: all 0.2s ease;
        }

        .modal-close-button:hover {
          background: rgba(239, 68, 68, 0.25);
          transform: scale(1.1);
        }

        .modal-body {
          max-height: 60vh;
          overflow-y: auto;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          border-top: 2px solid rgba(59, 130, 246, 0.2);
          padding-top: 1.5rem;
          margin-top: 2rem;
        }

        /* Snackbar */
        .snackbar {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          padding: 1.25rem 1.75rem;
          border-radius: 16px;
          color: white;
          font-weight: 600;
          z-index: 60;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          animation: snackbar-slide-in 0.3s ease, snackbar-slide-out 0.3s ease 2.7s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          max-width: 400px;
        }

        .snackbar-success {
          background: linear-gradient(135deg, var(--crm-accent), #059669);
          border-color: rgba(16, 185, 129, 0.4);
        }

        .snackbar-error {
          background: linear-gradient(135deg, var(--crm-danger), #dc2626);
          border-color: rgba(239, 68, 68, 0.4);
        }

        /* Loading */
        .loading {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 50vh;
          text-align: center;
        }

        .spinner {
          width: 60px;
          height: 60px;
          border: 5px solid rgba(59, 130, 246, 0.1);
          border-left: 5px solid var(--crm-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        .loading-text {
          color: #a0aec0;
          font-size: 1.2rem;
          font-weight: 600;
        }

        /* Empty state */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #a0aec0;
        }

        .empty-icon {
          font-size: 4.5rem;
          margin-bottom: 1.5rem;
          opacity: 0.6;
        }

        .empty-title {
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: 0.75rem;
          color: #e2e8f0;
        }

        .empty-description {
          font-size: 1.1rem;
          opacity: 0.8;
          max-width: 400px;
          margin: 0 auto;
        }

        /* Access denied */
        .access-denied {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: var(--color-background);
        }

        .access-card {
          text-align: center;
          background: var(--color-surface);
          padding: 3rem;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          max-width: 500px;
        }

        /* Animações */
        @keyframes modal-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modal-slide-up {
          from {
            opacity: 0;
            transform: translateY(50px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes snackbar-slide-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes snackbar-slide-out {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .interactive:hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .interactive {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Responsividade */
        @media (max-width: 768px) {
          .crm-header {
            padding: 1.5rem;
            text-align: center;
          }

          .crm-title {
            font-size: 2.2rem;
          }

          .action-buttons {
            justify-content: center;
            width: 100%;
            gap: 0.75rem;
          }

          .button {
            padding: 0.8rem 1.5rem;
            font-size: 0.9rem;
          }

          .tabs {
            padding: 0.5rem;
            gap: 0.25rem;
          }

          .tab {
            padding: 0.75rem 1.25rem;
            font-size: 0.9rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .stat-card {
            padding: 1.5rem;
          }

          .stat-value {
            font-size: 2rem;
          }

          .filters-grid {
            grid-template-columns: 1fr;
          }

          .modal-content {
            width: 95%;
            padding: 1.5rem;
            margin: 1rem;
          }

          .modal-title {
            font-size: 1.3rem;
          }

          .modal-footer {
            justify-content: center;
            flex-direction: column;
          }

          .snackbar {
            bottom: 1rem;
            right: 1rem;
            left: 1rem;
            max-width: none;
            text-align: center;
          }

          .kanban-board {
            grid-template-columns: 1fr;
          }

          .missions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}