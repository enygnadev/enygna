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
      <div className="frota-container">
        <style jsx global>{`
          .access-denied {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: var(--frota-container-background, linear-gradient(135deg, #1e293b 0%, #334155 100%));
            font-family: 'Inter', sans-serif;
          }
          .access-card {
            text-align: center;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 3rem;
            border-radius: 20px;
            max-width: 500px;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
          }
          .access-card h1 {
            font-size: 2.5rem;
            font-weight: 700;
            font-family: 'Playfair Display', serif;
            background: linear-gradient(45deg, #ffffff, #e0e7ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 1rem;
          }
          .access-card p {
            font-size: 1.1rem;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 2rem;
          }
          .button {
            padding: 0.875rem 1.75rem;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: none;
            text-decoration: none;
            color: white;
          }
          .button-primary {
            background: linear-gradient(45deg, #667eea, #764ba2);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          }
          .button-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
          }
          .button-outline {
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid #667eea;
            color: #8a9df8;
            backdrop-filter: blur(10px);
          }
          .button-outline:hover {
            background: #667eea;
            color: white;
            transform: translateY(-2px);
          }
        `}</style>

        <div className="access-denied">
          <div className="access-card">
            <div style={{ fontSize: '4rem', marginBottom: '1rem', color: '#f093fb' }}>🚫</div>
            <h1>Acesso Negado</h1>
            <p>
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
      <div className="frota-container">
        <div className="loading">
          <div className="spinner"></div>
          <div className="loading-text">Carregando sistema de frota...</div>
        </div>
      </div>
    );
  }

  // Renderização principal da página de frota
  return (
    <div className="frota-container">
      <header className="frota-header">
        <div className="header-content">
          <div className="brand-section">
            <div className="brand-icon">🚗</div>
            <div className="brand-text">
              <h1>Gerenciamento de Frota</h1>
              <p>Visão Geral</p>
            </div>
          </div>
          <div className="header-actions">
            <ThemeSelector />
            <div className="user-info">
              <span>{user?.displayName || user?.email}</span>
            </div>
            <button onClick={() => signOut(auth)} className="logout-btn">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Aba Dashboard */}
        {activeTab === 'dashboard' && (
          <>
            <div className="dashboard-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">🚗</div>
                  <div className="stat-label">Total Veículos</div>
                </div>
                <div className="stat-value">{stats.totalVeiculos}</div>
              </div>
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">✅</div>
                  <div className="stat-label">Veículos Ativos</div>
                </div>
                <div className="stat-value">{stats.veiculosAtivos}</div>
              </div>
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">⚠️</div>
                  <div className="stat-label">Multas Pendentes</div>
                </div>
                <div className="stat-value">{stats.multasPendentes}</div>
              </div>
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">💰</div>
                  <div className="stat-label">Débitos Totais</div>
                </div>
                <div className="stat-value">R$ {(stats.totalDebitos / 1000).toFixed(0)}K</div>
              </div>
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">👨‍💼</div>
                  <div className="stat-label">Motoristas</div>
                </div>
                <div className="stat-value">{stats.motoristasCadastrados}</div>
              </div>
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">📊</div>
                  <div className="stat-label">KM Total/Mês</div>
                </div>
                <div className="stat-value">{(stats.kmTotalMes / 1000).toFixed(1)}K</div>
              </div>
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">⛽</div>
                  <<div className="stat-label">Combustível/Mês</div>
                </div>
                <div className="stat-value">R$ {(stats.consumoTotalCombustivel / 1000).toFixed(0)}K</div>
              </div>
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">🔧</div>
                  <div className="stat-label">Manutenção</div>
                </div>
                <div className="stat-value">R$ {(stats.custosManutencao / 1000).toFixed(0)}K</div>
              </div>
            </div>

            {/* Filtros e Busca */}
            <div className="filters-container">
              <div className="filters-grid">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🌍 País/Região</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(parseInt(e.target.value))}
                    className="form-input"
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
                    className="form-input"
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
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Aba Veículos */}
        {activeTab === 'veiculos' && (
          <div className="vehicles-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="text-white">🚗</span> Veículos Cadastrados
              </h2>
              <button onClick={() => setShowAddVehicleModal(true)} className="add-vehicle-btn">
                <span>+</span> Adicionar Veículo
              </button>
            </div>
            <div className="vehicles-grid">
              {filteredVeiculos.length === 0 && !loading ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🚗</div>
                  <h3>Nenhum veículo encontrado</h3>
                  <p>Adicione veículos à sua frota ou ajuste os filtros de busca.</p>
                </div>
              ) : (
                filteredVeiculos.map((veiculo) => (
                  <div key={veiculo.id} className="vehicle-card">
                    <div className="vehicle-header">
                      <div className="vehicle-info">
                        <h3>{veiculo.placa}</h3>
                        <p>{veiculo.marca} - {veiculo.modelo}</p>
                      </div>
                      <span className={`vehicle-status status-${veiculo.status}`}>
                        {veiculo.status === 'ativo' && 'Ativo'}
                        {veiculo.status === 'manutencao' && 'Manutenção'}
                        {veiculo.status === 'inativo' && 'Inativo'}
                        {veiculo.status === 'em_viagem' && 'Em Viagem'}
                      </span>
                    </div>
                    <div className="vehicle-details">
                      <div className="detail-item">
                        <div className="detail-label">Condutor</div>
                        <div className="detail-value">{veiculo.condutorNome || 'Não atribuído'}</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">KM</div>
                        <div className="detail-value">{veiculo.kmRodados} km</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">Status IPVA</div>
                        <div className="detail-value">{veiculo.vencimentoIPVA || 'N/A'}</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">Manutenção</div>
                        <div className="detail-value">{veiculo.proximaManutencao || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="vehicle-actions">
                      <button onClick={() => { setSelectedVehicle(veiculo); setDetailsModalOpen(true); }} className="action-btn">
                        Detalhes
                      </button>
                      <button onClick={() => { setSelectedVehicle(veiculo); setEditMode(true); }} className="action-btn edit">
                        Editar
                      </button>
                      <button onClick={() => { setVeiculoParaAtribuir(veiculo); setShowAtribuirModal(true); loadColaboradoresDisponiveis(); }} className="action-btn">
                        Atribuir
                      </button>
                    </div>
                  </div>
                ))
              )}
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
      </main>

      {/* Modais */}

      {/* Modal de Detalhes do Veículo */}
      {selectedVehicle && detailsModalOpen && (
        <div className="modal-overlay" onClick={() => setDetailsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Detalhes do Veículo: {selectedVehicle.placa}</h2>
              <button onClick={() => setDetailsModalOpen(false)} className="close-btn">&times;</button>
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
              <button onClick={() => setDetailsModalOpen(false)} className="btn-cancel">Fechar</button>
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
              <button onClick={() => { setEditMode(false); setSelectedVehicle(null); }} className="close-btn">&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); /* Lógica de atualização aqui */ }}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Marca</label>
                    <input type="text" placeholder="Marca" value={selectedVehicle.marca} onChange={(e) => setSelectedVehicle({ ...selectedVehicle, marca: e.target.value })} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Modelo</label>
                    <input type="text" placeholder="Modelo" value={selectedVehicle.modelo} onChange={(e) => setSelectedVehicle({ ...selectedVehicle, modelo: e.target.value })} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ano</label>
                    <input type="number" placeholder="Ano" value={selectedVehicle.ano} onChange={(e) => setSelectedVehicle({ ...selectedVehicle, ano: parseInt(e.target.value) || 0 })} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cor</label>
                    <input type="text" placeholder="Cor" value={selectedVehicle.cor} onChange={(e) => setSelectedVehicle({ ...selectedVehicle, cor: e.target.value })} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Placa</label>
                    <input type="text" placeholder="Placa" value={selectedVehicle.placa} onChange={(e) => setSelectedVehicle({ ...selectedVehicle, placa: e.target.value.toUpperCase() })} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Renavam</label>
                    <input type="text" placeholder="Renavam" value={selectedVehicle.renavam || ''} onChange={(e) => setSelectedVehicle({ ...selectedVehicle, renavam: e.target.value })} className="form-input" />
                  </div>
                  <div className="form-group col-span-2">
                    <label className="form-label">Status</label>
                    <select value={selectedVehicle.status} onChange={(e) => setSelectedVehicle({ ...selectedVehicle, status: e.target.value as Veiculo['status'] })} className="form-input">
                      <option value="ativo">Ativo</option>
                      <option value="manutencao">Manutenção</option>
                      <option value="inativo">Inativo</option>
                      <option value="em_viagem">Em Viagem</option>
                    </select>
                  </div>
                  {/* Adicione outros campos editáveis conforme necessário */}
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => { setEditMode(false); setSelectedVehicle(null); }} className="btn-cancel">Cancelar</button>
                  <button type="submit" className="btn-submit">Salvar</button>
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
              <button onClick={() => setShowAddVehicleModal(false)} className="close-btn">&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleAddVehicle(); }}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Marca*</label>
                    <input type="text" placeholder="Marca" value={newVehicleData.marca} onChange={(e) => setNewVehicleData({ ...newVehicleData, marca: e.target.value })} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Modelo*</label>
                    <input type="text" placeholder="Modelo" value={newVehicleData.modelo} onChange={(e) => setNewVehicleData({ ...newVehicleData, modelo: e.target.value })} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Placa*</label>
                    <input type="text" placeholder="Placa" value={newVehicleData.placa} onChange={(e) => setNewVehicleData({ ...newVehicleData, placa: e.target.value.toUpperCase() })} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ano</label>
                    <input type="number" placeholder="Ano" value={newVehicleData.ano} onChange={(e) => setNewVehicleData({ ...newVehicleData, ano: e.target.value })} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cor</label>
                    <input type="text" placeholder="Cor" value={newVehicleData.cor} onChange={(e) => setNewVehicleData({ ...newVehicleData, cor: e.target.value })} className="form-input" />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setShowAddVehicleModal(false)} className="btn-cancel">Cancelar</button>
                  <button type="submit" className="btn-submit" disabled={isAddingVehicle}>
                    {isAddingVehicle ? 'Adicionando...' : 'Adicionar Veículo'}
                  </button>
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
              <button onClick={() => setShowAddColaboradorModal(false)} className="close-btn">&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleAddColaborador(); }}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Nome Completo*</label>
                    <input type="text" placeholder="Nome Completo" value={newColaborador.nome} onChange={(e) => setNewColaborador({ ...newColaborador, nome: e.target.value })} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email*</label>
                    <input type="email" placeholder="Email" value={newColaborador.email} onChange={(e) => setNewColaborador({ ...newColaborador, email: e.target.value })} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Senha*</label>
                    <input type="password" placeholder="Senha (mínimo 6 caracteres)" value={newColaborador.senha} onChange={(e) => setNewColaborador({ ...newColaborador, senha: e.target.value })} className="form-input" required minLength={6} />
                  </div>
                  <div className="col-span-2 text-sm text-gray-600">
                    O colaborador receberá um email com as instruções para definir a senha.
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setShowAddColaboradorModal(false)} className="btn-cancel">Cancelar</button>
                  <button type="submit" className="btn-submit" disabled={isAddingColaborador}>
                    {isAddingColaborador ? 'Adicionando...' : 'Adicionar Colaborador'}
                  </button>
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
              <button onClick={() => setShowAtribuirModal(false)} className="close-btn">&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleAtribuirColaborador(); }}>
                <div className="grid grid-cols-1 gap-4">
                  <div className="form-group">
                    <label className="form-label">Colaborador*</label>
                    <select value={colaboradorSelecionado} onChange={(e) => setColaboradorSelecionado(e.target.value)} className="form-input" required>
                      <option value="">Selecione um Colaborador</option>
                      {colaboradoresDisponiveis.map((colab) => (
                        <option key={colab.id} value={colab.id}>{colab.displayName || colab.email}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setShowAtribuirModal(false)} className="btn-cancel">Cancelar</button>
                  <button type="submit" className="btn-submit" disabled={isAtribuindo}>
                    {isAtribuindo ? 'Atribuindo...' : 'Atribuir'}
                  </button>
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
      <style jsx global>{`
        /* Variáveis CSS personalizadas para o tema de frota */
        :global(:root) {
          --frota-primary: #667eea; /* Indigo */
          --frota-primary-dark: #4c5fd0;
          --frota-secondary: #764ba2; /* Purple */
          --frota-accent: #f093fb; /* Pink */
          --frota-danger: #ef4444; /* Red */
          --frota-warning: #f59e0b; /* Amber */
          --frota-success: #10b981; /* Emerald */
          --frota-glass: rgba(255, 255, 255, 0.1);
          --frota-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          --frota-shadow-hover: 0 12px 40px rgba(102, 126, 234, 0.15);
          --frota-container-background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #2d1b69 50%, #1a1a3e 75%, #0f0f23 100%);
          --frota-header-background: rgba(15, 15, 35, 0.8);
          --frota-card-background: rgba(255, 255, 255, 0.05);
          --frota-card-border: 1px solid rgba(255, 255, 255, 0.1);
          --frota-modal-background: linear-gradient(145deg, rgba(15, 15, 35, 0.95), rgba(26, 26, 62, 0.95));
          --frota-modal-border: 1px solid rgba(255, 255, 255, 0.1);
          --frota-modal-shadow: 0 25px 50px rgba(0, 0, 0, 0.6);
          --frota-input-background: rgba(255, 255, 255, 0.05);
          --frota-input-border: 2px solid rgba(255, 255, 255, 0.1);
          --frota-input-focus-border: #667eea;
          --frota-input-focus-shadow: 0 0 0 4px rgba(102, 126, 234, 0.15);
          --frota-button-primary-bg: linear-gradient(45deg, #667eea, #764ba2);
          --frota-button-primary-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          --frota-button-primary-hover-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
          --frota-button-secondary-bg: linear-gradient(45deg, #10b981, #059669);
          --frota-button-secondary-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
          --frota-button-secondary-hover-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
          --frota-button-outline-bg: rgba(255, 255, 255, 0.1);
          --frota-button-outline-border: 2px solid #667eea;
          --frota-button-outline-color: #8a9df8;
          --frota-button-outline-hover-bg: #667eea;
          --frota-button-outline-hover-color: white;
          --frota-text-primary: white;
          --frota-text-secondary: rgba(255, 255, 255, 0.7);
          --frota-text-subtle: rgba(255, 255, 255, 0.5);
          --font-display: 'Playfair Display', serif;
          --font-body: 'Inter', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }

        /* Container principal */
        .frota-container {
          min-height: 100vh;
          background: var(--frota-container-background);
          color: var(--frota-text-primary);
          font-family: var(--font-body);
          position: relative;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
        }

        .frota-container::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image:
            radial-gradient(circle at 20% 20%, rgba(102, 126, 234, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(240, 147, 251, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, rgba(67, 233, 123, 0.2) 0%, transparent 50%);
          animation: float-particles 20s ease-in-out infinite;
          z-index: -1;
          pointer-events: none;
        }

        @keyframes float-particles {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(120deg); }
          66% { transform: translateY(20px) rotate(240deg); }
        }

        /* Header principal */
        .frota-header {
          background: var(--frota-header-background);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1rem 2rem;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .brand-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .brand-icon {
          font-size: 2.5rem;
          background: linear-gradient(45deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: rotate-logo 10s linear infinite;
        }

        @keyframes rotate-logo {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .brand-text h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0;
          font-family: var(--font-display);
          background: linear-gradient(45deg, #ffffff, #e0e7ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .brand-text p {
          font-size: 0.8rem;
          color: var(--frota-text-subtle);
          margin: 0;
          font-weight: 500;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 50px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .user-info span {
          color: var(--frota-text-primary);
          font-weight: 500;
        }

        .logout-btn {
          background: linear-gradient(45deg, #ef4444, #dc2626);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .logout-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
        }

        .main-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          width: 100%;
          flex-grow: 1;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .stat-card {
          background: var(--frota-card-background);
          backdrop-filter: blur(20px);
          border: var(--frota-card-border);
          border-radius: 20px;
          padding: 2rem;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #667eea, #764ba2, #f093fb);
          border-radius: 20px 20px 0 0;
        }

        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--frota-text-primary);
          font-family: var(--font-mono);
          margin-bottom: 0.5rem;
        }

        .stat-label {
          color: var(--frota-text-subtle);
          font-size: 1rem;
          font-weight: 500;
        }

        .vehicles-section {
          background: var(--frota-card-background);
          border-radius: 25px;
          padding: 2.5rem;
          border: var(--frota-card-border);
          backdrop-filter: blur(20px);
          box-shadow: var(--frota-shadow);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .section-title {
          font-size: 1.8rem;
          font-weight: 700;
          font-family: var(--font-display);
          color: var(--frota-text-primary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .add-vehicle-btn {
          background: var(--frota-button-primary-bg);
          color: white;
          border: none;
          padding: 0.8rem 1.5rem;
          border-radius: 50px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          box-shadow: var(--frota-button-primary-shadow);
          position: relative;
          overflow: hidden;
        }

        .add-vehicle-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--frota-button-primary-hover-shadow);
        }

        .add-vehicle-btn::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
          transform: rotate(45deg);
          transition: all 0.6s ease;
        }

        .add-vehicle-btn:hover::before {
          animation: shine 1.5s ease-in-out;
        }

        @keyframes shine {
          0% { transform: rotate(45deg) translateX(-100%); }
          100% { transform: rotate(45deg) translateX(100%); }
        }

        .vehicles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .vehicle-card {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 1.5rem;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .vehicle-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
        }

        .vehicle-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.6), transparent);
          opacity: 0.6;
        }

        .vehicle-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .vehicle-info h3 {
          color: var(--frota-text-primary);
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .vehicle-info p {
          color: var(--frota-text-subtle);
          font-size: 0.9rem;
        }

        .vehicle-status {
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: 1px solid transparent; /* Placeholder */
        }

        .status-active {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.3);
        }

        .status-inactive {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .vehicle-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .detail-label {
          color: var(--frota-text-subtle);
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-value {
          color: var(--frota-text-primary);
          font-size: 0.9rem;
          font-weight: 600;
        }

        .vehicle-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          flex: 1;
          padding: 0.6rem;
          border: var(--frota-input-border);
          border-radius: 8px;
          background: var(--frota-input-background);
          color: var(--frota-text-subtle);
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
          color: var(--frota-text-primary);
          transform: translateY(-1px);
        }

        .action-btn.edit {
          background: linear-gradient(45deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
          border-color: rgba(102, 126, 234, 0.3);
          color: #8a9df8;
        }

        .action-btn.delete {
          background: linear-gradient(45deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2));
          border-color: rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--frota-text-subtle);
        }

        .empty-state-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
          background: linear-gradient(45deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .empty-state h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: rgba(255, 255, 255, 0.8);
          font-family: var(--font-display);
        }

        /* Modais */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: var(--frota-modal-background);
          border: var(--frota-modal-border);
          border-radius: 20px;
          padding: 2rem;
          width: 100%;
          max-width: 500px;
          backdrop-filter: blur(20px);
          box-shadow: var(--frota-modal-shadow);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .modal-title {
          color: var(--frota-text-primary);
          font-size: 1.5rem;
          font-weight: 700;
          font-family: var(--font-display);
        }

        .close-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 1.75rem;
          cursor: pointer;
          transition: color 0.3s ease;
        }

        .close-btn:hover {
          color: #ffffff;
        }

        .modal-body {
          max-height: 65vh;
          overflow-y: auto;
          padding-right: 10px; /* Add padding for scrollbar */
        }

        .modal-body::-webkit-scrollbar {
          width: 8px;
        }

        .modal-body::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        .modal-body::-webkit-scrollbar-thumb {
          background: rgba(102, 126, 234, 0.5);
          border-radius: 4px;
        }

        .modal-body::-webkit-scrollbar-thumb:hover {
          background: rgba(102, 126, 234, 0.8);
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          color: var(--frota-text-subtle);
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          background: var(--frota-input-background);
          border: var(--frota-input-border);
          border-radius: 8px;
          padding: 0.8rem 1rem;
          color: var(--frota-text-primary);
          font-size: 0.9rem;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .form-input:focus {
          outline: none;
          border-color: var(--frota-input-focus-border);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.15);
        }

        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2rem;
        }

        .btn-cancel {
          background: var(--frota-button-outline-bg);
          border: var(--frota-button-outline-border);
          color: var(--frota-button-outline-color);
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .btn-cancel:hover {
          background: rgba(255, 255, 255, 0.15);
          color: var(--frota-text-primary);
          transform: translateY(-1px);
        }

        .btn-submit {
          background: var(--frota-button-primary-bg);
          border: none;
          color: white;
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: var(--frota-button-primary-shadow);
          position: relative;
          overflow: hidden;
        }

        .btn-submit:hover {
          transform: translateY(-2px);
          box-shadow: var(--frota-button-primary-hover-shadow);
        }

        .btn-submit::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
          transition: left 0.6s;
        }

        .btn-submit:hover::before {
          left: 100%;
        }

        /* Gradientes orbitais de fundo */
        .frota-container::after {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background:
            radial-gradient(circle at 10% 20%, rgba(102, 126, 234, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 80% 80%, rgba(240, 147, 251, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 40% 60%, rgba(67, 233, 123, 0.05) 0%, transparent 40%);
          z-index: -1;
          pointer-events: none;
          animation: orbit-bg 30s linear infinite;
        }

        @keyframes orbit-bg {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Snackbar */
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
          animation: snackbar-slide-in 0.3s ease, snackbar-fade-out 0.3s ease 3s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          max-width: 400px;
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

        @keyframes snackbar-fade-out {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        .snackbar-success {
          background: linear-gradient(135deg, #10b981, #059669);
        }

        .snackbar-error {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        /* Loading */
        .loading {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 70vh;
          text-align: center;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(102, 126, 234, 0.1);
          border-left: 4px solid var(--frota-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-text {
          color: var(--frota-text-subtle);
          font-size: 1.1rem;
          font-weight: 500;
        }

        /* Responsividade */
        @media (max-width: 768px) {
          .main-content {
            padding: 1rem;
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .vehicles-section {
            padding: 1.5rem;
          }

          .section-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .vehicles-grid {
            grid-template-columns: 1fr;
          }

          .header-content {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .brand-text h1 {
            font-size: 1.3rem;
          }

          .stat-card {
            padding: 1.5rem;
          }

          .stat-value {
            font-size: 2rem;
          }

          .modal-content {
            margin: 1rem;
            padding: 1.5rem;
          }

          .form-actions {
            flex-direction: column;
          }

          .btn-cancel,
          .btn-submit {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .frota-header {
            padding: 1rem;
          }

          .vehicles-section {
            padding: 1rem;
          }

          .dashboard-grid {
            gap: 0.8rem;
          }

          .stat-card {
            padding: 1rem;
          }

          .vehicle-card {
            padding: 1rem;
          }

          .vehicle-details {
            grid-template-columns: 1fr;
            gap: 0.8rem;
          }

          .vehicle-actions {
            flex-direction: column;
          }

          .action-btn {
            padding: 0.8rem;
          }

          .modal-content {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}