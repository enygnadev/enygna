'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, getDocs, query, where, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import ThemeSelector from '@/src/components/ThemeSelector';
import { useRouter } from 'next/navigation'; // Import useRouter

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
      const usuariosRef = collection(db, 'users');
      const q = query(usuariosRef, where('email', '==', userEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        setUserPermissions(userData);

        const role = userData.role?.toLowerCase();
        const canAccessFleet = role === 'superadmin' || role === 'admin' || role === 'gestor' || role === 'colaborador';
        setHasAccess(canAccessFleet);

        if (canAccessFleet) {
          showSnackbar('Acesso autorizado ao sistema de frota!', 'success');
        } else {
          showSnackbar('Acesso negado ao sistema de frota', 'error');
        }
      } else {
        setHasAccess(false);
        showSnackbar('Usuário não encontrado no sistema', 'error');
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      setHasAccess(false);
      showSnackbar('Erro ao verificar permissões do usuário', 'error');
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
        toleranceMinutes: 0,
        lunchBreakMinutes: 0,
        lunchThresholdMinutes: 360,
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
        lunchThresholdMinutes: 360,
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

      // Verificar papel do usuário primeiro
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userRole = userData.role?.toLowerCase();

          // Se for colaborador, redirecionar para área específica
          if (userRole === 'colaborador') {
            router.push('/frota/colaborador');
            return;
          }
        }
      } catch (error) {
        console.error('Erro ao verificar papel do usuário:', error);
      }

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
        <style jsx>{`
          .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: var(--color-background);
          }
        `}</style>
        <div className="loading">
          <div className="spinner"></div> {/* Adiciona um spinner de carregamento */}
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  // Renderização principal da página de frota
  return (
    <div className="container py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary mb-4 sm:mb-0">Gerenciamento de Frota</h1>
        <div className="flex items-center space-x-4">
          <ThemeSelector />
          <button 
            onClick={() => setShowAddVehicleModal(true)} 
            className="button button-primary"
            disabled={!hasAccess}
          >
            Adicionar Veículo
          </button>
          <button 
            onClick={() => setShowAddColaboradorModal(true)} 
            className="button button-secondary"
            disabled={!hasAccess}
          >
            Adicionar Colaborador
          </button>
          <button 
            onClick={generateAIAnalysis} 
            className="button button-outline"
            disabled={loading || !hasAccess}
          >
            Análise IA
          </button>
        </div>
      </div>

      {/* Estatísticas da Frota */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <h3 className="text-xl font-semibold text-primary">Total de Veículos</h3>
          <p className="text-3xl font-bold">{stats.totalVeiculos}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-xl font-semibold text-primary">Veículos Ativos</h3>
          <p className="text-3xl font-bold">{stats.veiculosAtivos}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-xl font-semibold text-primary">Multas Pendentes</h3>
          <p className="text-3xl font-bold">{stats.multasPendentes}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-xl font-semibold text-primary">Débitos Totais</h3>
          <p className="text-3xl font-bold">R$ {stats.totalDebitos.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 p-4 card">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <select 
            value={selectedCountry} 
            onChange={(e) => setSelectedCountry(parseInt(e.target.value))}
            className="select w-full sm:w-auto"
          >
            {countries.map((country, index) => (
              <option key={index} value={index}>{country}</option>
            ))}
          </select>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select w-full sm:w-auto"
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">Ativo</option>
            <option value="manutencao">Manutenção</option>
            <option value="inativo">Inativo</option>
            <option value="em_viagem">Em Viagem</option>
          </select>
          <input 
            type="text" 
            placeholder="Buscar por placa, condutor ou modelo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full sm:w-64"
          />
        </div>
      </div>

      {/* Tabela de Veículos */}
      <div className="overflow-x-auto card">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placa</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modelo</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condutor</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredVeiculos.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                  Nenhum veículo encontrado.
                </td>
              </tr>
            ) : (
              filteredVeiculos.map((veiculo) => (
                <tr key={veiculo.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{veiculo.placa}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{veiculo.modelo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{veiculo.condutorNome || 'Não atribuído'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      style={{ backgroundColor: getStatusColor(veiculo.status), color: '#fff' }}
                    >
                      {veiculo.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button 
                      onClick={() => { setSelectedVehicle(veiculo); setDetailsModalOpen(true); }} 
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Ver
                    </button>
                    <button 
                      onClick={() => { setSelectedVehicle(veiculo); setEditMode(true); }} 
                      className="text-yellow-600 hover:text-yellow-900"
                      disabled={!hasAccess}
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => { setVeiculoParaAtribuir(veiculo); setShowAtribuirModal(true); loadColaboradoresDisponiveis(); }} 
                      className="text-green-600 hover:text-green-900"
                      disabled={!hasAccess}
                    >
                      Atribuir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

      {/* Estilos básicos dos modais e snackbar (adicione a um arquivo CSS global ou use Tailwind CSS) */}
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 50;
        }
        .modal-content {
          background: var(--color-surface);
          padding: 2rem;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          width: 90%;
          max-width: 600px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          z-index: 51;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 1rem;
          margin-bottom: 1rem;
        }
        .modal-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--color-primary);
        }
        .modal-close-button {
          font-size: 2rem;
          line-height: 1;
          color: var(--color-text-secondary);
          background: none;
          border: none;
          cursor: pointer;
        }
        .modal-body {
          max-height: 70vh;
          overflow-y: auto;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          border-top: 1px solid var(--color-border);
          padding-top: 1rem;
          margin-top: 1rem;
        }
        .snackbar {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-md);
          color: white;
          font-weight: bold;
          z-index: 60;
          opacity: 0.9;
          animation: fadein 0.5s, fadeout 0.5s 2.5s;
        }
        .snackbar-success {
          background-color: #4CAF50; /* Verde */
        }
        .snackbar-error {
          background-color: #f44336; /* Vermelho */
        }
        @keyframes fadein {
          from { bottom: 0; opacity: 0; }
          to { bottom: 2rem; opacity: 0.9; }
        }
        @keyframes fadeout {
          from { bottom: 2rem; opacity: 0.9; }
          to { bottom: 0; opacity: 0; }
        }
        .card {
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
        }
        .input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background-color: var(--color-background);
          color: var(--color-text-primary);
        }
        .select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background-color: var(--color-surface);
          color: var(--color-text-primary);
        }
        .button {
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-md);
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }
        .button-primary {
          background-color: var(--color-primary);
          color: white;
        }
        .button-primary:hover {
          background-color: var(--color-primary-dark);
        }
        .button-secondary {
          background-color: var(--color-secondary);
          color: white;
        }
        .button-secondary:hover {
          background-color: var(--color-secondary-dark);
        }
        .button-outline {
          background-color: transparent;
          color: var(--color-primary);
          border: 1px solid var(--color-primary);
        }
        .button-outline:hover {
          background-color: var(--color-primary-light);
          color: var(--color-primary-dark);
        }
        .button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Spinner de carregamento */
        .spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border-left-color: var(--color-primary);
          animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .loading {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 70vh; /* Ajuste conforme necessário */
          text-align: center;
          color: var(--color-text-secondary);
        }

      `}</style>
    </div>
  );
}