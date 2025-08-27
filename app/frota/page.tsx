'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, getDocs, query, where, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import ThemeSelector from '@/src/components/ThemeSelector';
import { useRouter } from 'next/navigation'; // Import useRouter
import EmpresaManager from '@/src/components/EmpresaManager';

interface Veiculo {
  id: string;
  placa: string;
  renavam: string;
  marca: string;
  modelo: string;
  ano: number;
  cor: string;
  condutor: string;
  condutorNome?: string; // Adicionado para suportar nome do condutor
  status: 'ativo' | 'manutencao' | 'inativo' | 'em_viagem';
  pais: string;
  cidade: string;
  multas: number;
  valorMultas: number;
  vencimentoIPVA: string;
  vencimentoLicenciamento: string;
  kmRodados: number;
  consumoMedio: number;
  ultimaManutencao: string;
  proximaManutencao: string;
  seguro: {
    vencimento: string;
    valor: number;
    seguradora: string;
  };
  gps: {
    latitude: number;
    longitude: number;
    ultimaAtualizacao: string;
  };
  combustivel: {
    nivel: number;
    tipo: string;
    custoMes: number;
  };
}

interface FleetStats {
  totalVeiculos: number;
  veiculosAtivos: number;
  multasPendentes: number;
  motoristasCadastrados: number;
  totalDebitos: number;
  kmTotalMes: number;
  consumoTotalCombustivel: number;
  custosManutencao: number;
}

export default function FrotaPage() {
  const router = useRouter(); // Initialize router
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userPermissions, setUserPermissions] = useState<any>(null);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [filteredVeiculos, setFilteredVeiculos] = useState<Veiculo[]>([]);
  const [stats, setStats] = useState<FleetStats>({
    totalVeiculos: 0,
    veiculosAtivos: 0,
    multasPendentes: 0,
    motoristasCadastrados: 0,
    totalDebitos: 0,
    kmTotalMes: 0,
    consumoTotalCombustivel: 0,
    custosManutencao: 0,
  });

  // Estados de controle
  const [selectedCountry, setSelectedCountry] = useState(0);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Veiculo | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [addVehicleModal, setAddVehicleModal] = useState(false);
  const [aiAnalysisModal, setAiAnalysisModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState<Partial<Veiculo>>({});
  const [aiInsights, setAiInsights] = useState<{id:number,titulo:string,descricao:string,prioridade:string,confianca:number,economia_estimada:string,risk_score:number}[]>([]);
  const [snackbar, setSnackbar] = useState<{open:boolean,message:string,type:'success'|'error'}>({ open: false, message: '', type: 'success' });

  // Estados para modal de adicionar colaborador
  const [showAddColaboradorModal, setShowAddColaboradorModal] = useState(false);
  const [newColaborador, setNewColaborador] = useState({
    nome: '',
    email: '',
    senha: ''
  });
  const [isAddingColaborador, setIsAddingColaborador] = useState(false);

  // Estados para modal de adicionar veículo
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newVehicleData, setNewVehicleData] = useState({
    marca: '',
    modelo: '',
    placa: '',
    ano: '',
    cor: ''
  });
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);

  // Estados para atribuir colaborador
  const [showAtribuirModal, setShowAtribuirModal] = useState(false);
  const [veiculoParaAtribuir, setVeiculoParaAtribuir] = useState<Veiculo | null>(null);
  const [colaboradoresDisponiveis, setColaboradoresDisponiveis] = useState<any[]>([]);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState('');
  const [isAtribuindo, setIsAtribuindo] = useState(false);

  const countries = ['🌍 Todos', '🇧🇷 Brasil', '🇺🇸 EUA', '🇦🇷 Argentina', '🇨🇱 Chile', '🇵🇪 Peru', '🇨🇴 Colômbia'];

  const [activeTab, setActiveTab] = useState('dashboard'); // Estado para gerenciar a aba ativa

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'veiculos', label: 'Veículos', icon: '🚗' },
    { id: 'motoristas', label: 'Motoristas', icon: '👨‍💼' },
    { id: 'viagens', label: 'Viagens', icon: '🛣️' },
    { id: 'manutencao', label: 'Manutenção', icon: '🔧' },
    { id: 'combustivel', label: 'Combustível', icon: '⛽' },
    { id: 'empresas', label: 'Empresas', icon: '🏢' },
    { id: 'relatorios', label: 'Relatórios', icon: '📈' }
  ];

  const userRole = userPermissions?.role || ''; // Obtém o papel do usuário para controle de permissões

  // Função para gerar análise IA
  const generateAIAnalysis = async () => {
    try {
      setLoading(true);

      // Simular análise IA baseada nos dados da frota
      const insights = [
        {
          id: 1,
          titulo: "Otimização de Rotas Detectada",
          descricao: "Baseado nos padrões de GPS, 23% dos veículos podem otimizar suas rotas para economizar combustível.",
          prioridade: "alta",
          confianca: 87,
          economia_estimada: "2.840",
          risk_score: 3
        },
        {
          id: 2,
          titulo: "Manutenção Preventiva Recomendada",
          descricao: `${stats.veiculosAtivos} veículos estão próximos do limite de quilometragem para manutenção.`,
          prioridade: "media",
          confianca: 74,
          economia_estimada: "1.250",
          risk_score: 5
        },
        {
          id: 3,
          titulo: "Alerta de Combustível",
          descricao: "Consumo acima da média detectado em 3 veículos da frota.",
          prioridade: "baixa",
          confianca: 65,
          economia_estimada: "890",
          risk_score: 2
        }
      ];

      setAiInsights(insights);
      setAiAnalysisModal(true);
      showSnackbar('Análise IA concluída com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao gerar análise IA:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao gerar análise IA',
        type: 'error'
      });
    } finally {
      setLoading(false);
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
        permissions: { frota: true }
      });

      showSnackbar('Acesso autorizado ao sistema de frota!', 'success');
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      setHasAccess(true); // Permitir acesso mesmo com erro
      showSnackbar('Acesso autorizado (modo de recuperação)', 'success');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados do Firestore
  const loadVeiculos = async () => {
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
            console.log('Empresa encontrada para carregar veículos:', empresaId);
            break;
          }
        }
      }

      if (!empresaId) {
        console.log('Empresa não encontrada para carregar veículos');
        showSnackbar('Empresa não encontrada para carregar veículos', 'error');
        return;
      }

      // Buscar veículos na subcoleção da empresa
      const veiculosRef = collection(db, 'empresas', empresaId, 'veiculos');
      const querySnapshot = await getDocs(veiculosRef);

      const veiculosData: Veiculo[] = [];
      querySnapshot.forEach((doc) => {
        veiculosData.push({ id: doc.id, ...doc.data() } as Veiculo);
      });

      console.log('Veículos carregados:', veiculosData.length);
      setVeiculos(veiculosData);
      calculateStats(veiculosData);
    } catch (error) {
      console.error('Erro ao carregar veículos:', error);
      showSnackbar('Erro ao carregar dados da frota', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Calcular estatísticas
  const calculateStats = (veiculosData: Veiculo[]) => {
    const newStats: FleetStats = {
      totalVeiculos: veiculosData.length,
      veiculosAtivos: veiculosData.filter(v => v.status === 'ativo').length,
      multasPendentes: veiculosData.reduce((sum, v) => sum + v.multas, 0),
      motoristasCadastrados: new Set(veiculosData.map(v => v.condutor)).size,
      totalDebitos: veiculosData.reduce((sum, v) => sum + v.valorMultas, 0),
      kmTotalMes: veiculosData.reduce((sum, v) => sum + v.kmRodados, 0),
      consumoTotalCombustivel: veiculosData.reduce((sum, v) => sum + (v.combustivel?.custoMes || 0), 0),
      custosManutencao: veiculosData.length * 450,
    };
    setStats(newStats);
  };

  // Carregar colaboradores disponíveis
  const loadColaboradoresDisponiveis = async () => {
    if (!user) return;

    try {
      // Buscar dados do usuário para obter empresaId
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      let empresaId = userData?.empresaId;

      // Se não encontrar empresaId no usuário, buscar empresa onde é admin
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

      // Buscar colaboradores da empresa
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

  // Filtrar veículos
  useEffect(() => {
    if (veiculos.length === 0) {
      setFilteredVeiculos([]);
      return;
    }

    let filtered = [...veiculos];

    if (selectedCountry > 0 && countries[selectedCountry]) {
      const countryName = countries[selectedCountry].split(' ')[1];
      filtered = filtered.filter(v => v.pais === countryName);
    }

    if (statusFilter !== 'todos') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.placa?.toLowerCase().includes(searchLower) ||
        v.condutor?.toLowerCase().includes(searchLower) ||
        v.modelo?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredVeiculos(filtered);
  }, [veiculos, selectedCountry, statusFilter, searchTerm]);

  // Função para adicionar colaborador - Mesma lógica do cartão ponto
  async function handleAddColaborador() {
    if (!user || !newColaborador.nome || !newColaborador.email || !newColaborador.senha) {
      showSnackbar('Preencha todos os campos obrigatórios!', 'error');
      return;
    }

    try {
      setIsAddingColaborador(true);

      let empresaId: string | null = null;
      let userRole: string = '';

      console.log('Iniciando busca da empresa para o usuário:', user.email);

      // 1. Primeiro tenta buscar no documento do usuário
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        empresaId = userData?.empresaId;
        userRole = userData?.role || '';

        console.log('Dados encontrados no documento do usuário:', {
          empresaId,
          role: userRole,
          email: user.email
        });
      }

      // 2. Se não encontrou empresaId, verifica se o usuário é dono da empresa (admin)
      if (!empresaId) {
        console.log('EmpresaId não encontrado no documento do usuário. Buscando empresas criadas pelo usuário...');

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

          console.log('Empresa encontrada onde usuário é admin:', {
            empresaId,
            adminId: user.uid,
            email: user.email
          });

          // Cria ou atualiza o documento do usuário com o empresaId encontrado
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

      // 3. Se ainda não encontrou, busca em todas as empresas por colaborador
      if (!empresaId) {
        console.log('Usuário não é admin de nenhuma empresa. Buscando como colaborador...');

        const empresasSnap = await getDocs(collection(db, 'empresas'));
        console.log('Total de empresas encontradas:', empresasSnap.docs.length);

        for (const empresaDoc of empresasSnap.docs) {
          console.log('Verificando empresa:', empresaDoc.id);

          // Verifica se o usuário é admin direto na empresa
          const empresaData = empresaDoc.data();
          if (empresaData.email === user.email || empresaData.adminId === user.uid) {
            empresaId = empresaDoc.id;
            userRole = 'admin';

            console.log('Usuário encontrado como admin da empresa:', {
              empresaId: empresaDoc.id,
              email: user.email
            });

            // Cria ou atualiza o documento do usuário
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

          // Se não é admin, verifica nos colaboradores
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

            console.log('Colaborador encontrado na empresa:', {
              empresaId: empresaDoc.id,
              role: userRole,
              email: user.email
            });

            // Cria ou atualiza o documento do usuário com o empresaId encontrado
            await setDoc(doc(db, 'users', user.uid), {
              empresaId: empresaId,
              role: userRole,
              email: user.email,
              displayName: user.displayName || user.email,
              dataCriacao: serverTimestamp(),
              lastLogin: serverTimestamp()
            }, { merge: true });

            console.log('Documento do usuário atualizado com empresaId:', empresaId);
            break;
          }
        }
      }

      // 4. Se o usuário tem role superadmin, permite criar colaborador para qualquer empresa
      if (!empresaId && (userRole === 'superadmin' || userPermissions?.role === 'superadmin')) {
        // Para superadmin, vamos usar a primeira empresa disponível ou permitir selecionar
        const empresasSnap = await getDocs(collection(db, 'empresas'));
        if (!empresasSnap.empty) {
          empresaId = empresasSnap.docs[0].id;
          console.log('SuperAdmin usando primeira empresa disponível:', empresaId);
        }
      }

      // 5. Validação final se encontrou uma empresa
      if (!empresaId) {
        console.error('Nenhuma empresa encontrada para o usuário:', user.email);

        // Mensagem mais detalhada para diferentes cenários
        if (userRole === 'colaborador') {
          showSnackbar('Você não tem permissão para adicionar colaboradores. Apenas administradores podem adicionar novos colaboradores.', 'error');
        } else {
          showSnackbar('Não foi possível identificar sua empresa. Verifique suas permissões ou entre em contato com o suporte.', 'error');
        }
        return;
      }

      // 4. Verificação de permissão para adicionar colaboradores
      const rolesPermitidos = ['superadmin', 'admin', 'gestor'];
      const hasPermission = rolesPermitidos.includes(userRole) || rolesPermitidos.includes(userPermissions?.role || '');

      if (!hasPermission) {
        console.error('Usuário sem permissão:', {
          userRole,
          userPermissionsRole: userPermissions?.role,
          email: user.email
        });
        showSnackbar('Você não tem permissão para adicionar colaboradores', 'error');
        return;
      }

      console.log('Criando colaborador para empresa:', empresaId, 'com permissões válidas');

      // 5. Criar conta no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newColaborador.email,
        newColaborador.senha
      );

      // 6. Atualizar perfil do usuário com o nome
      await updateProfile(userCredential.user, {
        displayName: newColaborador.nome
      });

      // 7. Criar documento principal do colaborador (igual ao cartão ponto)
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: newColaborador.email,
        displayName: newColaborador.nome,
        role: 'colaborador',
        tipo: 'colaborador',
        empresaId: empresaId, // Vincula à empresa automaticamente
        ativo: true,
        isPessoal: false,
        hourlyRate: 0,
        monthlySalary: 0,
        monthlyBaseHours: 220,
        permissions: {
          frota: true,
          ponto: true,
          chamados: true,
          documentos: true
        },
        dataCriacao: serverTimestamp(),
        lastLogin: serverTimestamp()
      });

      // 8. Criar documento do colaborador na empresa (igual ao cartão ponto)
      await setDoc(doc(db, 'empresas', empresaId, 'colaboradores', userCredential.user.uid), {
        email: newColaborador.email,
        displayName: newColaborador.nome,
        role: 'colaborador',
        effectiveHourlyRate: 0,
        monthlySalary: 0,
        workDaysPerMonth: 22,
        salaryType: 'monthly',
        hourlyRate: 0,
        dailyRate: 0,
        monthlyRate: 0,
        monthlyBaseHours: 220,
        toleranceMinutes: 0,
        lunchBreakMinutes: 0,
        lunchThresholdMinutes: 0,
        ativo: true,
        isAuthUser: true, // Indica que tem conta Auth
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('Colaborador criado com sucesso! EmpresaId:', empresaId);
      showSnackbar(`Colaborador adicionado com sucesso! Vinculado à empresa ${empresaId}`, 'success');
      setNewColaborador({ nome: '', email: '', senha: '' });
      setShowAddColaboradorModal(false);

    } catch (error: any) {
      console.error('Erro detalhado ao adicionar colaborador:', {
        error: error.message,
        code: error.code,
        userEmail: user.email,
        stack: error.stack
      });

      // Tratamento de erros específicos
      if (error.code === 'auth/email-already-in-use') {
        showSnackbar('Este email já está sendo usado por outro usuário', 'error');
      } else if (error.code === 'auth/weak-password') {
        showSnackbar('A senha deve ter pelo menos 6 caracteres', 'error');
      } else if (error.code === 'auth/invalid-email') {
        showSnackbar('Email inválido', 'error');
      } else if (error.message?.includes('permission-denied')) {
        showSnackbar('Erro de permissão. Verifique suas credenciais.', 'error');
      } else {
        showSnackbar(`Erro ao adicionar colaborador: ${error.message}`, 'error');
      }
    } finally {
      setIsAddingColaborador(false);
    }
  }

  // Função para atribuir colaborador ao veículo
  const handleAtribuirColaborador = async () => {
    if (!veiculoParaAtribuir || !colaboradorSelecionado || !user) {
      showSnackbar('Selecione um colaborador', 'error');
      return;
    }

    setIsAtribuindo(true);

    try {
      // Buscar dados do usuário para obter empresaId
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      let empresaId = userData?.empresaId;

      // Se não encontrar empresaId no usuário, buscar empresa onde é admin
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

      // Buscar dados do colaborador selecionado
      const colaboradorDoc = await getDoc(doc(db, 'empresas', empresaId, 'colaboradores', colaboradorSelecionado));
      if (!colaboradorDoc.exists()) {
        showSnackbar('Colaborador não encontrado', 'error');
        return;
      }

      const colaboradorData = colaboradorDoc.data();

      // Atualizar o veículo com o novo condutor
      await updateDoc(doc(db, 'empresas', empresaId, 'veiculos', veiculoParaAtribuir.id), {
        condutor: colaboradorData.email,
        condutorNome: colaboradorData.displayName || colaboradorData.email,
        condutorId: colaboradorSelecionado,
        dataAtribuicao: serverTimestamp(),
        ultimaAtualizacao: serverTimestamp()
      });

      // Registrar no histórico
      await addDoc(collection(db, 'empresas', empresaId, 'atribuicoes'), {
        veiculoId: veiculoParaAtribuir.id,
        veiculoPlaca: veiculoParaAtribuir.placa,
        colaboradorId: colaboradorSelecionado,
        colaboradorEmail: colaboradorData.email,
        colaboradorNome: colaboradorData.displayName || colaboradorData.email,
        adminId: user.uid,
        adminEmail: user.email,
        tipo: 'atribuicao',
        timestamp: serverTimestamp()
      });

      showSnackbar(`Veículo ${veiculoParaAtribuir.placa} atribuído a ${colaboradorData.displayName || colaboradorData.email}!`, 'success');

      // Fechar modal e limpar estados
      setShowAtribuirModal(false);
      setVeiculoParaAtribuir(null);
      setColaboradorSelecionado('');

      // Recarregar lista de veículos
      await loadVeiculos();

    } catch (error) {
      console.error('Erro ao atribuir colaborador:', error);
      showSnackbar('Erro ao atribuir colaborador ao veículo', 'error');
    } finally {
      setIsAtribuindo(false);
    }
  };

  // Função para adicionar veículo
  async function handleAddVehicle() {
    if (!user || !newVehicleData.marca || !newVehicleData.modelo || !newVehicleData.placa) {
      alert('Preencha todos os campos obrigatórios!');
      return;
    }

    setIsAddingVehicle(true);

    try {
      // Buscar dados do usuário primeiro
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      let empresaId = userData?.empresaId;

      // Se não encontrar empresaId no usuário, buscar empresa onde é admin
      if (!empresaId) {
        console.log('EmpresaId não encontrado no usuário, buscando empresas...');
        const empresasSnap = await getDocs(collection(db, 'empresas'));

        for (const empresaDoc of empresasSnap.docs) {
          const empresaData = empresaDoc.data();
          if (empresaData.adminId === user.uid || empresaData.email === user.email) {
            empresaId = empresaDoc.id;
            console.log('Empresa encontrada:', empresaId);
            break;
          }
        }
      }

      if (!empresaId) {
        alert('Empresa não encontrada. Verifique suas permissões.');
        return;
      }

      // Criar objeto do veículo com dados padrão
      const vehicleData = {
        marca: newVehicleData.marca,
        modelo: newVehicleData.modelo,
        placa: newVehicleData.placa.toUpperCase(),
        ano: parseInt(newVehicleData.ano) || new Date().getFullYear(),
        cor: newVehicleData.cor,
        renavam: '',
        adminId: user.uid,
        empresaId: empresaId,
        ativo: true,
        status: 'ativo' as const,
        condutor: '',
        pais: 'Brasil',
        cidade: 'São Paulo',
        multas: 0,
        valorMultas: 0,
        vencimentoIPVA: '',
        vencimentoLicenciamento: '',
        kmRodados: 0,
        consumoMedio: 0,
        ultimaManutencao: '',
        proximaManutencao: '',
        seguro: {
          vencimento: '',
          valor: 0,
          seguradora: ''
        },
        gps: {
          latitude: -23.5505,
          longitude: -46.6333,
          ultimaAtualizacao: new Date().toISOString()
        },
        combustivel: {
          nivel: 100,
          tipo: 'Gasolina',
          custoMes: 0
        },
        dataCriacao: serverTimestamp(),
        dataAtualizacao: serverTimestamp()
      };

      console.log('Adicionando veículo:', vehicleData);
      const docRef = await addDoc(collection(db, 'empresas', empresaId, 'veiculos'), vehicleData);
      console.log('Veículo adicionado com ID:', docRef.id);

      showSnackbar('Veículo adicionado com sucesso!', 'success');
      setNewVehicleData({ marca: '', modelo: '', placa: '', ano: '', cor: '' });
      setShowAddVehicleModal(false);

      // Recarregar lista de veículos
      await loadVeiculos();

    } catch (error) {
      console.error('Erro ao adicionar veículo:', error);
      alert('Erro ao adicionar veículo: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsAddingVehicle(false);
    }
  }

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbar({ open: true, message, type });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return '#00ff7f';
      case 'manutencao': return '#ffd700';
      case 'inativo': return '#ff6b6b';
      case 'em_viagem': return '#1e90ff';
      default: return '#666';
    }
  };

  // Verificar autenticação e obter dados do usuário
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/frota/auth');
        return;
      }

      setUser(currentUser);

      // Permitir acesso a todos os usuários autenticados temporariamente
      console.log('Usuário autenticado:', currentUser.email);

      // Carregar dados do usuário e empresa para admins/gestores
      await checkUserPermissions(currentUser.email!);
    });

    return () => unsubscribe();
  }, [router]); // Added router to dependency array

  useEffect(() => {
    if (hasAccess && user) {
      loadVeiculos();
    } else if (!hasAccess && user && !loading) {
    } else if (!user && !loading) {
    }
    if (hasAccess || (!hasAccess && user)) {
      setLoading(false);
    }
  }, [hasAccess, user, loading]);


  if (!hasAccess && !loading) {
    return (
      <div className="container">
        <style jsx>{`
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
        `}</style>

        <div className="access-denied">
          <div className="access-card">
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
            <h1>Acesso Restrito</h1>
            <p style={{ marginBottom: '2rem' }}>
              Você não tem permissão para acessar o sistema de frota.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link href="/frota/auth" className="button button-primary">
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
          <div className="loading-text">Carregando sistema de frota...</div>
        </div>
      </div>
    );
  }

  // Renderização principal da página de frota
  return (
    <div className="container py-8 px-4 sm:px-6 lg:px-8">
      <div className="fleet-header fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="fleet-title">🚗 Gerenciamento de Frota</h1>
            <p className="fleet-subtitle">Controle total da sua frota em tempo real</p>
          </div>
          <div className="action-buttons">
            <ThemeSelector />
            <button
              onClick={() => setShowAddVehicleModal(true)}
              className="button button-primary interactive"
              disabled={!hasAccess}
            >
              🚗 Adicionar Veículo
            </button>
            <button
              onClick={() => setShowAddColaboradorModal(true)}
              className="button button-secondary interactive"
              disabled={!hasAccess}
            >
              👨‍💼 Adicionar Colaborador
            </button>
            <button
              onClick={generateAIAnalysis}
              className="button button-outline interactive"
              disabled={loading || !hasAccess}
            >
              🤖 Análise IA
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
            {/* Estatísticas da Frota */}
            <div className="stats-grid fade-in">
              <div className="stat-card interactive">
                <span className="stat-icon">🚗</span>
                <div className="stat-title">Total de Veículos</div>
                <div className="stat-value">{stats.totalVeiculos}</div>
                <div className="stat-change positive">
                  <span>↗</span> +{Math.floor(stats.totalVeiculos * 0.1)} este mês
                </div>
              </div>
              <div className="stat-card interactive">
                <span className="stat-icon">✅</span>
                <div className="stat-title">Veículos Ativos</div>
                <div className="stat-value">{stats.veiculosAtivos}</div>
                <div className="stat-change positive">
                  <span>↗</span> {((stats.veiculosAtivos / Math.max(stats.totalVeiculos, 1)) * 100).toFixed(0)}% da frota
                </div>
              </div>
              <div className="stat-card interactive">
                <span className="stat-icon">⚠️</span>
                <div className="stat-title">Multas Pendentes</div>
                <div className="stat-value">{stats.multasPendentes}</div>
                <div className="stat-change negative">
                  <span>↘</span> -2 esta semana
                </div>
              </div>
              <div className="stat-card interactive">
                <span className="stat-icon">💰</span>
                <div className="stat-title">Débitos Totais</div>
                <div className="stat-value">R$ {(stats.totalDebitos / 1000).toFixed(0)}K</div>
                <div className="stat-change negative">
                  <span>↘</span> R$ {stats.totalDebitos.toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="stat-card interactive">
                <span className="stat-icon">👨‍💼</span>
                <div className="stat-title">Motoristas</div>
                <div className="stat-value">{stats.motoristasCadastrados}</div>
                <div className="stat-change positive">
                  <span>↗</span> {stats.motoristasCadastrados} cadastrados
                </div>
              </div>
              <div className="stat-card interactive">
                <span className="stat-icon">📊</span>
                <div className="stat-title">KM Total/Mês</div>
                <div className="stat-value">{(stats.kmTotalMes / 1000).toFixed(1)}K</div>
                <div className="stat-change positive">
                  <span>↗</span> {stats.kmTotalMes.toLocaleString('pt-BR')} km
                </div>
              </div>
              <div className="stat-card interactive">
                <span className="stat-icon">⛽</span>
                <div className="stat-title">Combustível/Mês</div>
                <div className="stat-value">R$ {(stats.consumoTotalCombustivel / 1000).toFixed(0)}K</div>
                <div className="stat-change negative">
                  <span>↗</span> R$ {stats.consumoTotalCombustivel.toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="stat-card interactive">
                <span className="stat-icon">🔧</span>
                <div className="stat-title">Manutenção</div>
                <div className="stat-value">R$ {(stats.custosManutencao / 1000).toFixed(0)}K</div>
                <div className="stat-change positive">
                  <span>↘</span> -15% vs mês passado
                </div>
              </div>
            </div>

            {/* Filtros e Busca */}
            <div className="filters-container fade-in">
              <div className="filters-grid">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🌍 País/Região</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(parseInt(e.target.value))}
                    className="select"
                  >
                    {countries.map((country, index) => (
                      <option key={index} value={index}>{country}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📊 Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="select"
                  >
                    <option value="todos">📋 Todos os Status</option>
                    <option value="ativo">✅ Ativo</option>
                    <option value="manutencao">🔧 Manutenção</option>
                    <option value="inativo">❌ Inativo</option>
                    <option value="em_viagem">🛣️ Em Viagem</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🔍 Buscar</label>
                  <input
                    type="text"
                    placeholder="Buscar por placa, condutor ou modelo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Aba Veículos */}
        {activeTab === 'veiculos' && (
          <div className="table-container fade-in">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="table-header">
                  <tr>
                    <th className="table-cell text-left font-semibold">🚗 Placa</th>
                    <th className="table-cell text-left font-semibold">🏭 Modelo</th>
                    <th className="table-cell text-left font-semibold">👨‍💼 Condutor</th>
                    <th className="table-cell text-left font-semibold">📊 Status</th>
                    <th className="table-cell text-left font-semibold">⚙️ Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredVeiculos.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={5} className="table-cell text-center">
                        <div className="empty-state">
                          <div className="empty-icon">🚗</div>
                          <div className="empty-title">Nenhum veículo encontrado</div>
                          <div className="empty-description">
                            Adicione veículos à sua frota ou ajuste os filtros de busca.
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredVeiculos.map((veiculo) => (
                      <tr key={veiculo.id} className="table-row interactive">
                        <td className="table-cell">
                          <div className="font-semibold text-gray-900">{veiculo.placa}</div>
                          <div className="text-sm text-gray-500">{veiculo.marca}</div>
                        </td>
                        <td className="table-cell">
                          <div className="font-medium">{veiculo.modelo}</div>
                          <div className="text-sm text-gray-500">{veiculo.ano}</div>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center">
                            {veiculo.condutorNome ? (
                              <div>
                                <div className="font-medium">{veiculo.condutorNome}</div>
                                <div className="text-sm text-gray-500">{veiculo.condutor}</div>
                              </div>
                            ) : (
                              <div className="text-gray-400 italic">👤 Não atribuído</div>
                            )}
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className={`status-badge status-${veiculo.status}`}>
                            {veiculo.status === 'ativo' && '✅ Ativo'}
                            {veiculo.status === 'manutencao' && '🔧 Manutenção'}
                            {veiculo.status === 'inativo' && '❌ Inativo'}
                            {veiculo.status === 'em_viagem' && '🛣️ Em Viagem'}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => { setSelectedVehicle(veiculo); setDetailsModalOpen(true); }}
                              className="button button-outline"
                              style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                              title="Ver detalhes"
                            >
                              👁️ Ver
                            </button>
                            <button
                              onClick={() => { setSelectedVehicle(veiculo); setEditMode(true); }}
                              className="button button-primary"
                              style={{
                                padding: '0.5rem 0.75rem',
                                fontSize: '0.8rem',
                                background: 'linear-gradient(135deg, var(--frota-warning), #d97706)'
                              }}
                              disabled={!hasAccess}
                              title="Editar veículo"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => { setVeiculoParaAtribuir(veiculo); setShowAtribuirModal(true); loadColaboradoresDisponiveis(); }}
                              className="button button-secondary"
                              style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                              disabled={!hasAccess}
                              title="Atribuir condutor"
                            >
                              👥 Atribuir
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

        {/* Aba Motoristas (exemplo, precisa ser implementado) */}
        {activeTab === 'motoristas' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">👨‍💼 Motoristas</h2>
            <p>Gerenciamento de motoristas será implementado aqui.</p>
          </div>
        )}

        {/* Aba Viagens (exemplo, precisa ser implementado) */}
        {activeTab === 'viagens' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">🛣️ Viagens</h2>
            <p>Gerenciamento de viagens será implementado aqui.</p>
          </div>
        )}

        {/* Aba Manutenção (exemplo, precisa ser implementado) */}
        {activeTab === 'manutencao' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">🔧 Manutenção</h2>
            <p>Gerenciamento de manutenção será implementado aqui.</p>
          </div>
        )}

        {/* Aba Combustível (exemplo, precisa ser implementado) */}
        {activeTab === 'combustivel' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">⛽ Combustível</h2>
            <p>Gerenciamento de combustível será implementado aqui.</p>
          </div>
        )}

        {/* Aba Empresas */}
        {activeTab === 'empresas' && (
          <EmpresaManager
            sistema="frota"
            allowCreate={userRole === 'admin' || userRole === 'superadmin'}
            allowEdit={userRole === 'admin' || userRole === 'superadmin'}
            allowDelete={userRole === 'superadmin'}
            onEmpresaSelect={(empresa) => {
              console.log('Empresa selecionada para frota:', empresa);
              // Implementar filtros de veículos por empresa
            }}
          />
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
                performance da frota, custos operacionais, eficiência de combustível e muito mais.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}

      {/* Modal de Detalhes do Veículo */}
      {selectedVehicle && detailsModalOpen && (
        <div className="modal-overlay" onClick={() => setDetailsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Detalhes do Veículo: {selectedVehicle.placa}</h2>
              <button onClick={() => setDetailsModalOpen(false)} className="modal-close-button">&times;</button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-4">
                <div><strong>Marca:</strong> {selectedVehicle.marca}</div>
                <div><strong>Modelo:</strong> {selectedVehicle.modelo}</div>
                <div><strong>Ano:</strong> {selectedVehicle.ano}</div>
                <div><strong>Cor:</strong> {selectedVehicle.cor}</div>
                <div><strong>Placa:</strong> {selectedVehicle.placa}</div>
                <div><strong>Renavam:</strong> {selectedVehicle.renavam || 'N/A'}</div>
                <div><strong>Condutor:</strong> {selectedVehicle.condutorNome || 'Não atribuído'}</div>
                <div><strong>Status:</strong> {selectedVehicle.status}</div>
                <div><strong>País:</strong> {selectedVehicle.pais}</div>
                <div><strong>Cidade:</strong> {selectedVehicle.cidade}</div>
                <div><strong>Multas:</strong> {selectedVehicle.multas}</div>
                <div><strong>Valor Multas:</strong> R$ {selectedVehicle.valorMultas.toLocaleString('pt-BR')}</div>
                <div><strong>IPVA:</strong> {selectedVehicle.vencimentoIPVA || 'N/A'}</div>
                <div><strong>Licenciamento:</strong> {selectedVehicle.vencimentoLicenciamento || 'N/A'}</div>
                <div><strong>KM Rodados:</strong> {selectedVehicle.kmRodados} km</div>
                <div><strong>Consumo Médio:</strong> {selectedVehicle.consumoMedio} km/l</div>
                <div><strong>Última Manutenção:</strong> {selectedVehicle.ultimaManutencao || 'N/A'}</div>
                <div><strong>Próxima Manutenção:</strong> {selectedVehicle.proximaManutencao || 'N/A'}</div>
                <div><strong>Seguro Vencimento:</strong> {selectedVehicle.seguro?.vencimento || 'N/A'}</div>
                <div><strong>Seguro Valor:</strong> R$ {selectedVehicle.seguro?.valor.toLocaleString('pt-BR') || '0'}</div>
                <div><strong>Seguradora:</strong> {selectedVehicle.seguro?.seguradora || 'N/A'}</div>
                <div><strong>Combustível:</strong> {selectedVehicle.combustivel?.nivel}% {selectedVehicle.combustivel?.tipo}</div>
                <div><strong>Custo Combustível Mês:</strong> R$ {selectedVehicle.combustivel?.custoMes.toLocaleString('pt-BR') || '0'}</div>
                <div><strong>Latitude:</strong> {selectedVehicle.gps?.latitude}</div>
                <div><strong>Longitude:</strong> {selectedVehicle.gps?.longitude}</div>
                <div><strong>Última Atualização GPS:</strong> {selectedVehicle.gps?.ultimaAtualizacao ? new Date(selectedVehicle.gps.ultimaAtualizacao).toLocaleString('pt-BR') : 'N/A'}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDetailsModalOpen(false)} className="button button-outline">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição do Veículo */}
      {selectedVehicle && editMode && (
        <div className="modal-overlay" onClick={() => { setEditMode(false); setSelectedVehicle(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Editar Veículo: {selectedVehicle.placa}</h2>
              <button onClick={() => { setEditMode(false); setSelectedVehicle(null); }} className="modal-close-button">&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); /* Lógica de atualização aqui */ }}>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Marca" value={selectedVehicle.marca} onChange={(e) => setSelectedVehicle({ ...selectedVehicle, marca: e.target.value })} className="input" />
                  <input type="text" placeholder="Modelo" value={selectedVehicle.modelo} onChange={(e) => setSelectedVehicle({ ...selectedVehicle, modelo: e.target.value })} className="input" />
                  <input type="number" placeholder="Ano" value={selectedVehicle.ano} onChange={(e) => setSelectedVehicle({ ...selectedVehicle, ano: parseInt(e.target.value) || 0 })} className="input" />
                  <input type="text" placeholder="Cor" value={selectedVehicle.cor} onChange={(e) => setSelectedVehicle({ ...selectedVehicle, cor: e.target.value })} className="input" />
                  <input type="text" placeholder="Placa" value={selectedVehicle.placa} onChange={(e) => setSelectedVehicle({ ...selectedVehicle, placa: e.target.value.toUpperCase() })} className="input" />
                  <input type="text" placeholder="Renavam" value={selectedVehicle.renavam || ''} onChange={(e) => setSelectedVehicle({ ...selectedVehicle, renavam: e.target.value })} className="input" />
                  <select value={selectedVehicle.status} onChange={(e) => setSelectedVehicle({ ...selectedVehicle, status: e.target.value as Veiculo['status'] })} className="select">
                    <option value="ativo">Ativo</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="inativo">Inativo</option>
                    <option value="em_viagem">Em Viagem</option>
                  </select>
                  <input type="text" placeholder="País" value={selectedVehicle.pais} onChange={(e) => setSelectedVehicle({ ...selectedVehicle, pais: e.target.value })} className="input" />
                  <input type="text" placeholder="Cidade" value={selectedVehicle.cidade} onChange={(e) => setSelectedVehicle({ ...selectedVehicle, cidade: e.target.value })} className="input" />
                  {/* Adicione outros campos editáveis conforme necessário */}
                </div>
                <div className="modal-footer mt-6">
                  <button type="submit" className="button button-primary mr-2">Salvar</button>
                  <button type="button" onClick={() => { setEditMode(false); setSelectedVehicle(null); }} className="button button-outline">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Veículo */}
      {showAddVehicleModal && (
        <div className="modal-overlay" onClick={() => setShowAddVehicleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Adicionar Novo Veículo</h2>
              <button onClick={() => setShowAddVehicleModal(false)} className="modal-close-button">&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleAddVehicle(); }}>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Marca*" value={newVehicleData.marca} onChange={(e) => setNewVehicleData({ ...newVehicleData, marca: e.target.value })} className="input" required />
                  <input type="text" placeholder="Modelo*" value={newVehicleData.modelo} onChange={(e) => setNewVehicleData({ ...newVehicleData, modelo: e.target.value })} className="input" required />
                  <input type="text" placeholder="Placa*" value={newVehicleData.placa} onChange={(e) => setNewVehicleData({ ...newVehicleData, placa: e.target.value.toUpperCase() })} className="input" required />
                  <input type="number" placeholder="Ano" value={newVehicleData.ano} onChange={(e) => setNewVehicleData({ ...newVehicleData, ano: e.target.value })} className="input" />
                  <input type="text" placeholder="Cor" value={newVehicleData.cor} onChange={(e) => setNewVehicleData({ ...newVehicleData, cor: e.target.value })} className="input" />
                </div>
                <div className="modal-footer mt-6">
                  <button type="submit" className="button button-primary mr-2" disabled={isAddingVehicle}>
                    {isAddingVehicle ? 'Adicionando...' : 'Adicionar Veículo'}
                  </button>
                  <button type="button" onClick={() => setShowAddVehicleModal(false)} className="button button-outline">Cancelar</button>
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

      {/* Modal de Atribuir Colaborador */}
      {showAtribuirModal && veiculoParaAtribuir && (
        <div className="modal-overlay" onClick={() => setShowAtribuirModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Atribuir Veículo {veiculoParaAtribuir.placa}</h2>
              <button onClick={() => setShowAtribuirModal(false)} className="modal-close-button">&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleAtribuirColaborador(); }}>
                <div className="grid grid-cols-1 gap-4">
                  <select value={colaboradorSelecionado} onChange={(e) => setColaboradorSelecionado(e.target.value)} className="select" required>
                    <option value="">Selecione um Colaborador</option>
                    {colaboradoresDisponiveis.map((colab) => (
                      <option key={colab.id} value={colab.id}>{colab.displayName || colab.email}</option>
                    ))}
                  </select>
                </div>
                <div className="modal-footer mt-6">
                  <button type="submit" className="button button-primary mr-2" disabled={isAtribuindo}>
                    {isAtribuindo ? 'Atribuindo...' : 'Atribuir'}
                  </button>
                  <button type="button" onClick={() => setShowAtribuirModal(false)} className="button button-outline">Cancelar</button>
                </div>
              </form>
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

      {/* Estilos avançados e modernos para o sistema de frota */}
      <style jsx>{`
        /* Variáveis CSS personalizadas para o tema de frota */
        :global(:root) {
          --frota-primary: #667eea; /* Azul suave */
          --frota-primary-dark: #5164a8; /* Azul mais escuro */
          --frota-secondary: #764ba2; /* Roxo suave */
          --frota-accent: #f59e0b; /* Amarelo/Ocre */
          --frota-danger: #ef4444; /* Vermelho */
          --frota-warning: #f59e0b; /* Amarelo/Ocre */
          --frota-success: #10b981; /* Verde */
          --frota-glass: rgba(255, 255, 255, 0.1);
          --frota-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          --frota-shadow-hover: 0 12px 40px rgba(102, 126, 234, 0.15); /* Sombra com base no azul suave */
        }

        /* Container principal */
        .container {
          background: linear-gradient(135deg,
            rgba(102, 126, 234, 0.05) 0%, /* Azul suave */
            rgba(118, 75, 162, 0.05) 100%); /* Roxo suave */
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
        }

        .container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(circle at 20% 20%, rgba(102, 126, 234, 0.1) 0%, transparent 50%), /* Azul suave */
            radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.1) 0%, transparent 50%), /* Roxo suave */
            radial-gradient(circle at 40% 60%, rgba(245, 158, 11, 0.05) 0%, transparent 50%); /* Âmbar suave */
          pointer-events: none;
          z-index: 0;
        }

        /* Header principal */
        .fleet-header {
          position: relative;
          z-index: 2;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: var(--frota-shadow);
        }

        .fleet-title {
          background: linear-gradient(135deg, var(--frota-primary), var(--frota-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 0.5rem;
        }

        .fleet-subtitle {
          color: var(--color-text-secondary);
          font-size: 1.1rem;
          opacity: 0.8;
        }

        /* Botões melhorados */
        .action-buttons {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .button {
          padding: 0.875rem 1.75rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
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
        }

        .button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }

        .button:hover::before {
          left: 100%;
        }

        .button-primary {
          background: linear-gradient(135deg, var(--frota-primary), var(--frota-primary-dark));
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); /* Sombra com base no azul suave */
        }

        .button-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4); /* Sombra com base no azul suave */
        }

        .button-secondary {
          background: linear-gradient(135deg, var(--frota-secondary), #48bf53); /* Verde como secundário */
          color: white;
          box-shadow: 0 4px 15px rgba(72, 191, 83, 0.3); /* Sombra com base no verde */
        }

        .button-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(72, 191, 83, 0.4); /* Sombra com base no verde */
        }

        .button-outline {
          background: rgba(255, 255, 255, 0.1);
          color: var(--frota-primary); /* Usa a cor primária para contorno */
          border: 2px solid var(--frota-primary);
          backdrop-filter: blur(10px);
        }

        .button-outline:hover {
          background: var(--frota-primary);
          color: white;
          transform: translateY(-2px);
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        /* Cards de estatísticas modernos */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--frota-primary), var(--frota-secondary));
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--frota-shadow-hover);
        }

        .stat-card:hover::before {
          transform: scaleX(1);
        }

        .stat-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          display: block;
          opacity: 0.8;
        }

        .stat-title {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--frota-primary), var(--frota-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
        }

        .stat-change {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-top: 0.5rem;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .stat-change.positive { color: var(--frota-success); }
        .stat-change.negative { color: var(--frota-danger); }

        /* Sistema de abas moderno */
        .tabs {
          display: flex;
          overflow-x: auto;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          padding: 0.5rem;
          margin-bottom: 2rem;
          gap: 0.25rem;
          box-shadow: var(--frota-shadow);
        }

        .tab {
          padding: 0.875rem 1.5rem;
          background: transparent;
          border: none;
          color: var(--color-text-secondary);
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
          background: linear-gradient(135deg, #667eea, #764ba2); /* Azul para Roxo */
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .tab-active::before {
          opacity: 1;
        }

        .tab-active {
          color: white;
          transform: translateY(-1px);
        }

        .tab:hover:not(:disabled):not(.tab-active) {
          background: rgba(102, 126, 234, 0.1); /* Fundo azul suave semi-transparente */
          color: #667eea; /* Texto azul suave */
          transform: translateY(-1px);
        }

        .tab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Área de conteúdo */
        .content-area {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: var(--frota-shadow);
          position: relative;
          z-index: 1;
        }

        /* Filtros e busca */
        .filters-container {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: var(--frota-shadow);
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        /* Inputs melhorados */
        .input, .select {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid rgba(102, 126, 234, 0.2); /* Borda azul suave */
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          color: var(--color-text-primary);
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }

        .input:focus, .select:focus {
          outline: none;
          border-color: var(--frota-primary); /* Borda primária ao focar */
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); /* Sombra azul suave */
          transform: translateY(-1px);
        }

        /* Tabela moderna */
        .table-container {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: var(--frota-shadow);
        }

        .table-header {
          background: linear-gradient(135deg, #667eea, #764ba2); /* Azul suave para Roxo */
          color: white;
        }

        .table-row {
          transition: all 0.2s ease;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .table-row:hover {
          background: rgba(102, 126, 234, 0.05); /* Fundo azul suave semi-transparente */
          transform: translateX(5px);
        }

        .table-cell {
          padding: 1rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        /* Status badges */
        .status-badge {
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .status-ativo {
          background: rgba(16, 185, 129, 0.1); /* Verde */
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-manutencao {
          background: rgba(245, 158, 11, 0.1); /* Amarelo/Ocre */
          color: #d97706;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .status-inativo {
          background: rgba(239, 68, 68, 0.1); /* Vermelho */
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .status-em_viagem {
          background: rgba(59, 130, 246, 0.1); /* Azul */
          color: #2563eb;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        /* Modais melhorados */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 50;
          animation: modal-fade-in 0.3s ease;
        }

        .modal-content {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: modal-slide-up 0.3s ease;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid rgba(102, 126, 234, 0.1); /* Borda azul suave */
          padding-bottom: 1rem;
          margin-bottom: 1.5rem;
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--frota-primary), var(--frota-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .modal-close-button {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.1); /* Vermelho suave */
          color: #dc2626; /* Vermelho */
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          transition: all 0.2s ease;
        }

        .modal-close-button:hover {
          background: rgba(239, 68, 68, 0.2);
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
          border-top: 2px solid rgba(102, 126, 234, 0.1); /* Borda azul suave */
          padding-top: 1.5rem;
          margin-top: 1.5rem;
        }

        /* Snackbar melhorado */
        .snackbar {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          padding: 1rem 1.5rem;
          border-radius: 12px;
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
          background: linear-gradient(135deg, var(--frota-success), #059669); /* Verde */
        }

        .snackbar-error {
          background: linear-gradient(135deg, var(--frota-danger), #dc2626); /* Vermelho */
        }

        /* Loading melhorado */
        .loading {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 50vh;
          text-align: center;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(102, 126, 234, 0.1); /* Borda azul suave */
          border-left: 4px solid var(--frota-primary); /* Borda primária */
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        .loading-text {
          color: var(--color-text-secondary);
          font-size: 1.1rem;
          font-weight: 500;
        }

        /* Seção vazia melhorada */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--color-text-secondary);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: var(--color-text-primary);
        }

        .empty-description {
          font-size: 1rem;
          opacity: 0.8;
          max-width: 400px;
          margin: 0 auto;
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

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .pulse {
          animation: pulse 2s ease-in-out infinite;
        }

        /* Responsividade melhorada */
        @media (max-width: 768px) {
          .fleet-header {
            padding: 1.5rem;
            text-align: center;
          }

          .fleet-title {
            font-size: 2rem;
          }

          .action-buttons {
            justify-content: center;
            width: 100%;
          }

          .tabs {
            padding: 0.25rem;
          }

          .tab {
            padding: 0.75rem 1rem;
            font-size: 0.9rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .filters-grid {
            grid-template-columns: 1fr;
          }

          .modal-content {
            width: 95%;
            padding: 1.5rem;
            margin: 1rem;
          }

          .snackbar {
            bottom: 1rem;
            right: 1rem;
            left: 1rem;
            max-width: none;
          }
        }

        /* Melhorias de acessibilidade */
        .button:focus,
        .tab:focus,
        .input:focus,
        .select:focus {
          outline: 2px solid var(--frota-primary);
          outline-offset: 2px;
        }

        /* Animação de entrada para elementos */
        .fade-in {
          animation: fade-in 0.6s ease-out;
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

        /* Efeito de glassmorphism para cards */
        .glass-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        /* Hover effects para interatividade */
        .interactive:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        }

        .interactive {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}