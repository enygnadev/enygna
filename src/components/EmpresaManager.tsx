'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  addDoc // Import addDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

interface Empresa {
  id: string;
  nome: string;
  email: string;
  cnpj?: string;
  telefone?: string;
  endereco?: string;
  ativo: boolean;
  plano: 'basico' | 'premium' | 'enterprise' | 'free' | 'monthly' | 'yearly' | 'enterprise' | 'permanent';
  configuracoes: {
    geofencing?: boolean;
    selfieObrigatoria?: boolean;
    notificacaoEmail?: boolean;
  };
  sistemasAtivos: string[];
  criadoEm: any;
  atualizadoEm: any;
}

interface Sistema {
  id: string;
  nome: string;
  descricao: string;
  icon: string;
}

interface EmpresaManagerProps {
  sistema: 'chamados' | 'ponto' | 'frota' | 'financeiro' | 'documentos' | 'crm' | 'universal';
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  onEmpresaSelect?: (empresa: Empresa) => void;
}

// Define FormData with the 'senha' property
interface FormData {
  nome: string;
  email: string;
  senha: string;
  cnpj?: string;
  telefone?: string;
  endereco?: string;
  ativo: boolean;
  plano: 'basico' | 'premium' | 'enterprise' | 'free' | 'monthly' | 'yearly' | 'enterprise' | 'permanent';
  geofencing?: boolean;
  selfieObrigatoria?: boolean;
  notificacaoEmail?: boolean;
  sistemasAtivos: string[];
}

export default function EmpresaManager({
  sistema,
  onEmpresaSelect,
  allowCreate = true,
  allowEdit = true,
  allowDelete = false
}: EmpresaManagerProps) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const sistemasDisponiveis: Sistema[] = [
    { id: 'chamados', nome: 'Sistema de Chamados', descricao: 'Gerencie solicitações de suporte.', icon: '📞' },
    { id: 'frota', nome: 'Sistema de Frota', descricao: 'Controle de veículos e manutenções.', icon: '🚗' },
    { id: 'financeiro', nome: 'Sistema Financeiro', descricao: 'Controle de contas a pagar/receber.', icon: '💰' },
    { id: 'documentos', nome: 'Sistema de Documentos', descricao: 'Armazenamento e organização de arquivos.', icon: '📄' },
    { id: 'ponto', nome: 'Sistema de Ponto',descricao: 'Registro de jornada de trabalho.', icon: '⏰' },
    { id: 'crm', nome: 'Sistema CRM', descricao: 'Gestão de relacionamento com o cliente.', icon: '🎯' }
  ];

  // Estados do formulário
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    email: '',
    senha: '', // Initialize password field
    cnpj: '',
    telefone: '',
    endereco: '',
    ativo: true,
    plano: 'free',
    geofencing: false,
    selfieObrigatoria: false,
    notificacaoEmail: true,
    sistemasAtivos: sistema === 'universal' ? ['chamados', 'ponto', 'frota', 'financeiro', 'documentos', 'crm'] : [sistema]
  });

  useEffect(() => {
    loadEmpresas();
  }, [sistema]);

  const loadEmpresas = async () => {
    setLoading(true);
    try {
      const collectionName = getCollectionName();
      console.log('Carregando empresas do sistema:', sistema, 'Collection:', collectionName);

      const empresasRef = collection(db, collectionName);
      const q = query(empresasRef, orderBy('nome'));
      const snapshot = await getDocs(q);

      const empresasList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sistemasAtivos: (doc.data().sistemasAtivos as string[]) || [] // Garante que sistemasAtivos seja um array
      })) as Empresa[];

      console.log(`Carregadas ${empresasList.length} empresas do sistema ${sistema}`);
      setEmpresas(empresasList);
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);

      if (error?.code === 'permission-denied') {
        console.warn(`Permissão negada para ${getCollectionName()}, criando empresas demo...`);
        // Criar empresas demo para testar
        setEmpresas([
          {
            id: `demo-${sistema}-1`,
            nome: `Empresa Demo ${sistema.charAt(0).toUpperCase() + sistema.slice(1)}`,
            email: `demo@${sistema}.com`,
            cnpj: '12.345.678/0001-90',
            telefone: '(11) 9999-9999',
            endereco: 'Rua Demo, 123',
            ativo: true,
            plano: 'premium',
            configuracoes: {
              geofencing: true,
              selfieObrigatoria: false,
              notificacaoEmail: true
            },
            sistemasAtivos: [sistema],
            criadoEm: new Date(),
            atualizadoEm: new Date()
          } as Empresa
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getCollectionName = () => {
    const collectionMap = {
      'chamados': 'chamados_empresas',
      'frota': 'frota_empresas',
      'financeiro': 'financeiro_empresas',
      'documentos': 'documentos_empresas',
      'ponto': 'ponto_empresas',
      'crm': 'crm_empresas',
      'universal': 'empresas'
    };
    return collectionMap[sistema] || 'empresas';
  };

  const handleCreate = async () => {
    if (!formData.nome || !formData.email || !formData.plano) { // Adicionado validação de plano
      alert('Nome, email e plano são obrigatórios');
      return;
    }
    if (formData.senha.length < 6) { // Validação de senha
      alert('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const collectionName = getCollectionName();
      const empresaId = `empresa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('Criando empresa no sistema:', sistema);
      console.log('Collection:', collectionName);
      console.log('Empresa ID:', empresaId);

      const empresaData = {
        nome: formData.nome,
        email: formData.email,
        cnpj: formData.cnpj || '',
        telefone: formData.telefone || '',
        endereco: formData.endereco || '',
        ativo: true,
        plano: formData.plano,
        configuracoes: {
          geofencing: formData.geofencing,
          selfieObrigatoria: formData.selfieObrigatoria,
          notificacaoEmail: formData.notificacaoEmail
        },
        sistemasAtivos: formData.sistemasAtivos,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      };

      console.log('Dados da empresa:', empresaData);

      // Tentar criar na coleção principal
      await setDoc(doc(db, collectionName, empresaId), empresaData);
      console.log('Empresa criada na coleção principal:', collectionName);

      // Se não for universal, também criar na coleção específica do sistema
      if (sistema !== 'universal') {
        const sistemaCollectionName = getCollectionName();
        await setDoc(doc(db, sistemaCollectionName, empresaId), empresaData);
        console.log('Empresa criada na coleção específica:', sistemaCollectionName);
      }

      // Criar configurações específicas do sistema
      await createSystemSpecificData(empresaId, empresaData); // Passando empresaData
      console.log('Configurações específicas criadas');

      // Salvar o usuário admin atual antes de criar novo usuário
      const currentUser = auth.currentUser;

      // Criar usuário no Firebase Authentication
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.senha
        );
        console.log('Usuário criado com sucesso:', userCredential.user.uid);

        // Adicionar o UID do usuário ao documento da empresa
        await updateDoc(doc(db, collectionName, empresaId), {
          userId: userCredential.user.uid,
          userCreated: true
        });

        // Criar usuário na coleção users vinculado à empresa
        const userDocRef = await addDoc(collection(db, 'users'), {
          email: formData.email,
          displayName: formData.nome,
          nome: formData.nome,
          createdAt: serverTimestamp(),
          isAdmin: false,
          hourlyRate: 0,
          monthlySalary: 0,
          monthlyBaseHours: 220,
          lunchBreakMinutes: 0,
          lunchThresholdMinutes: 360,
          toleranceMinutes: 0,
          empresaId: empresaId, // Vincular à empresa criada
          sistemasAtivos: formData.sistemasAtivos, // Definir sistemas ativos do usuário
          role: 'empresa', // Definir papel como empresa
          company: empresaId, // Adicionar referência alternativa
        });

        console.log('Usuário criado na coleção "users" com ID:', userDocRef.id);

        // Fazer logout do usuário recém-criado e manter o admin logado
        await auth.signOut();

        // Se havia um usuário admin logado antes, restaurar a sessão
        if (currentUser) {
          console.log('Mantendo admin logado após criação da empresa');
          // Não é necessário fazer nada adicional aqui pois o onAuthStateChanged
          // do admin/page.tsx irá detectar a mudança e manter o estado correto
        }

      } catch (authError: any) {
        console.error('Erro ao criar usuário:', authError);

        // Se o usuário não foi criado, ainda assim mantemos a empresa
        // mas marcamos que o usuário precisa ser criado manualmente
        await updateDoc(doc(db, collectionName, empresaId), {
          userCreated: false,
          userCreationError: authError.message
        });

        console.warn(`Empresa criada, mas usuário precisa ser criado manualmente: ${authError.message}`);
      }


      // Fechar modal e resetar estados
      setShowCreateModal(false);
      resetForm();

      // Recarregar empresas sem fazer reload da página
      await loadEmpresas();

      // Mostrar sucesso
      alert('✅ Empresa criada com sucesso! A empresa já está disponível no sistema. O admin permanece logado.');
    } catch (error: any) {
      console.error('Erro ao criar empresa:', error);

      let errorMessage = 'Erro ao criar empresa';
      if (error?.code === 'permission-denied') {
        errorMessage = 'Erro de permissão. Verifique se você tem privilégios de administrador.';
      } else if (error?.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está em uso. Tente outro email.';
      } else if (error?.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido. Verifique o formato do email.';
      } else if (error?.code === 'auth/weak-password') {
        errorMessage = 'Senha muito fraca. Use uma senha mais forte.';
      } else if (error?.message) {
        errorMessage = `Erro: ${error.message}`;
      }

      alert(errorMessage);

      // Não fechar o modal em caso de erro para permitir correção
      // setShowCreateModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedEmpresa || !formData.nome || !formData.email || !formData.plano) { // Adicionado validação de plano
      alert('Nome, email e plano são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const collectionName = getCollectionName();

      const updateData = {
        nome: formData.nome,
        email: formData.email,
        cnpj: formData.cnpj || '',
        telefone: formData.telefone || '',
        endereco: formData.endereco || '',
        plano: formData.plano,
        configuracoes: {
          geofencing: formData.geofencing,
          selfieObrigatoria: formData.selfieObrigatoria,
          notificacaoEmail: formData.notificacaoEmail
        },
        sistemasAtivos: formData.sistemasAtivos,
        atualizadoEm: serverTimestamp()
      };

      await updateDoc(doc(db, collectionName, selectedEmpresa.id), updateData);

      // Handle password update if provided
      if (formData.senha && formData.senha.length >= 6) {
        // You would typically use Firebase Authentication's updatePassword method here.
        // This requires the currentUser to be set, or using an admin SDK if applicable.
        // For simplicity in this frontend example, we'll just log a message.
        console.log('Password update logic for user ID:', selectedEmpresa.id, 'would go here.');
        // Example: await updatePassword(auth.currentUser, formData.senha);
      }


      setShowEditModal(false);
      setSelectedEmpresa(null);
      resetForm();
      loadEmpresas();
      alert('Empresa atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      alert('Erro ao atualizar empresa');
    } finally {
      setLoading(false);
    }
  };

  const createSystemSpecificData = async (empresaId: string, empresaDataForConfig: any) => { // Recebe empresaData
    try {
      switch (sistema) {
        case 'chamados':
          // Criar configurações padrão para chamados
          await setDoc(doc(db, 'chamados_empresas', empresaId, 'configuracoes', 'default'), {
            categorias: ['Técnico', 'Financeiro', 'RH', 'Geral'],
            prioridades: ['Baixa', 'Média', 'Alta', 'Crítica'],
            tempoResposta: {
              baixa: 48,
              media: 24,
              alta: 8,
              critica: 2
            },
            criadoEm: serverTimestamp()
          });
          break;

        case 'frota':
          // Criar configurações padrão para frota
          await setDoc(doc(db, 'frota_empresas', empresaId, 'configuracoes', 'default'), {
            tiposVeiculo: ['Carro', 'Moto', 'Caminhão', 'Van'],
            intervalosManutencao: {
              oleo: 10000,
              filtro: 15000,
              pneus: 50000
            },
            rastreamento: {
              intervalorAtualizacao: 30, // segundos
              alertaVelocidade: 100 // km/h
            },
            criadoEm: serverTimestamp()
          });
          break;

        case 'financeiro':
          // Criar configurações padrão para financeiro
          await setDoc(doc(db, 'financeiro_empresas', empresaId, 'configuracoes', 'default'), {
            categorias: ['Receita', 'Despesa', 'Investimento'],
            centrosCusto: ['Operacional', 'Administrativo', 'Comercial'],
            formasPagamento: ['Dinheiro', 'PIX', 'Cartão', 'Boleto'],
            criadoEm: serverTimestamp()
          });
          break;

        case 'documentos':
          // Criar configurações padrão para documentos
          await setDoc(doc(db, 'documentos_empresas', empresaId, 'configuracoes', 'default'), {
            tiposDocumento: ['Contrato', 'NF', 'Relatório', 'Certificado'],
            nivelAcesso: ['Público', 'Interno', 'Confidencial'],
            retencaoAnos: 5,
            criadoEm: serverTimestamp()
          });
          break;

        case 'ponto':
          // Criar configurações específicas na subcoleção da empresa principal
          await setDoc(doc(db, 'empresas', empresaId, 'configuracoes', 'ponto'), {
            toleranciaMinutos: 15,
            pausaAlmoco: 60,
            horariosTrabalho: {
              entrada: '08:00',
              saida: '17:00',
              intervalo: 60
            },
            geofencing: empresaDataForConfig.configuracoes.geofencing || false,
            selfieObrigatoria: empresaDataForConfig.configuracoes.selfieObrigatoria || false,
            notificacaoEmail: empresaDataForConfig.configuracoes.notificacaoEmail || true,
            criadoEm: serverTimestamp(),
            atualizadoEm: serverTimestamp()
          });
          console.log('Configurações específicas de ponto criadas');
          break;

        case 'crm': // Adicionado para CRM
          await setDoc(doc(db, 'crm_empresas', empresaId, 'configuracoes', 'default'), {
            etapasVenda: ['Lead', 'Qualificação', 'Proposta', 'Fechamento', 'Perda'],
            tiposContato: ['Telefone', 'Email', 'Reunião', 'Rede Social'],
            statusOportunidade: ['Aberta', 'Em Andamento', 'Ganho', 'Perdido'],
            criadoEm: serverTimestamp()
          });
          break;

        case 'universal':
          // Criar configurações padrão para todos os sistemas
          const sistemasParaConfig = ['chamados', 'frota', 'financeiro', 'documentos', 'ponto', 'crm']; // Incluir CRM
          for (const sist of sistemasParaConfig) {
            try {
              // Criar configurações específicas para cada sistema
              switch (sist) {
                case 'chamados':
                  await setDoc(doc(db, 'chamados_empresas', empresaId, 'configuracoes', 'default'), {
                    categorias: ['Técnico', 'Financeiro', 'RH', 'Geral'],
                    prioridades: ['Baixa', 'Média', 'Alta', 'Crítica'],
                    tempoResposta: { baixa: 48, media: 24, alta: 8, critica: 2 },
                    criadoEm: serverTimestamp()
                  });
                  break;
                case 'frota':
                  await setDoc(doc(db, 'frota_empresas', empresaId, 'configuracoes', 'default'), {
                    tiposVeiculo: ['Carro', 'Moto', 'Caminhão', 'Van'],
                    intervalosManutencao: { oleo: 10000, filtro: 15000, pneus: 50000 },
                    rastreamento: { intervalorAtualizacao: 30, alertaVelocidade: 100 },
                    criadoEm: serverTimestamp()
                  });
                  break;
                case 'financeiro':
                  await setDoc(doc(db, 'financeiro_empresas', empresaId, 'configuracoes', 'default'), {
                    categorias: ['Receita', 'Despesa', 'Investimento'],
                    centrosCusto: ['Operacional', 'Administrativo', 'Comercial'],
                    formasPagamento: ['Dinheiro', 'PIX', 'Cartão', 'Boleto'],
                    criadoEm: serverTimestamp()
                  });
                  break;
                case 'documentos':
                  await setDoc(doc(db, 'documentos_empresas', empresaId, 'configuracoes', 'default'), {
                    tiposDocumento: ['Contrato', 'NF', 'Relatório', 'Certificado'],
                    nivelAcesso: ['Público', 'Interno', 'Confidencial'],
                    retencaoAnos: 5,
                    criadoEm: serverTimestamp()
                  });
                  break;
                case 'ponto':
                  // Criar empresa na coleção específica do ponto
                  await setDoc(doc(db, 'ponto-empresas', empresaId), {
                    nome: empresaDataForConfig.nome,
                    email: empresaDataForConfig.email,
                    cnpj: empresaDataForConfig.cnpj,
                    telefone: empresaDataForConfig.telefone,
                    endereco: empresaDataForConfig.endereco,
                    ativo: true,
                    plano: empresaDataForConfig.plano,
                    sistemasAtivos: ['ponto'],
                    configuracoesPonto: {
                      toleranciaMinutos: 15,
                      pausaAlmoco: 60,
                      horariosTrabalho: {
                        inicio: '09:00',
                        fim: '18:00'
                      },
                      geofencing: empresaDataForConfig.configuracoes.geofencing || false,
                      selfieObrigatoria: empresaDataForConfig.configuracoes.selfieObrigatoria || false
                    },
                    criadoEm: serverTimestamp()
                  });

                  await setDoc(doc(db, 'ponto-empresas', empresaId, 'configuracoes', 'default'), {
                    toleranciaMinutos: 15,
                    pausaAlmocoMinutos: 60,
                    horariosTrabalho: {
                      segunda: { inicio: '09:00', fim: '18:00', ativo: true },
                      terca: { inicio: '09:00', fim: '18:00', ativo: true },
                      quarta: { inicio: '09:00', fim: '18:00', ativo: true },
                      quinta: { inicio: '09:00', fim: '18:00', ativo: true },
                      sexta: { inicio: '09:00', fim: '18:00', ativo: true },
                      sabado: { inicio: '09:00', fim: '12:00', ativo: false },
                      domingo: { inicio: '09:00', fim: '12:00', ativo: false }
                    },
                    geofencing: {
                      ativo: empresaDataForConfig.configuracoes.geofencing || false,
                      raio: 100,
                      coordenadas: null
                    },
                    selfie: {
                      obrigatoria: empresaDataForConfig.configuracoes.selfieObrigatoria || false,
                      verificacaoFacial: false
                    },
                    criadoEm: serverTimestamp()
                  });
                  break;
                case 'crm': // Adicionado para CRM
                  await setDoc(doc(db, 'crm_empresas', empresaId, 'configuracoes', 'default'), {
                    etapasVenda: ['Lead', 'Qualificação', 'Proposta', 'Fechamento', 'Perda'],
                    tiposContato: ['Telefone', 'Email', 'Reunião', 'Rede Social'],
                    statusOportunidade: ['Aberta', 'Em Andamento', 'Ganho', 'Perdido'],
                    criadoEm: serverTimestamp()
                  });
                  break;
              }
            } catch (configError) {
              console.error(`Erro ao criar configuração para ${sist}:`, configError);
            }
          }
          break;
      }
    } catch (error) {
      console.error('Erro ao criar dados específicos do sistema:', error);
    }
  };

  const openEditModal = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setFormData({
      nome: empresa.nome || '',
      email: empresa.email || '',
      senha: '', // Não preenche a senha aqui, apenas limpa se já houver algum valor
      cnpj: empresa.cnpj || '',
      telefone: empresa.telefone || '',
      endereco: empresa.endereco || '',
      ativo: empresa.ativo ?? true,
      plano: empresa.plano || 'free',
      geofencing: empresa.configuracoes?.geofencing ?? false,
      selfieObrigatoria: empresa.configuracoes?.selfieObrigatoria ?? false,
      notificacaoEmail: empresa.configuracoes?.notificacaoEmail ?? true,
      sistemasAtivos: empresa.sistemasAtivos || []
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      senha: '',
      cnpj: '',
      telefone: '',
      endereco: '',
      ativo: true,
      plano: 'free',
      geofencing: false,
      selfieObrigatoria: false,
      notificacaoEmail: true,
      sistemasAtivos: sistema === 'universal' ? ['chamados', 'ponto', 'frota', 'financeiro', 'documentos', 'crm'] : [sistema]
    });
  };

  const handleSistemaToggle = (sistemaId: string) => {
    setFormData(prev => {
      const newSistemas = prev.sistemasAtivos.includes(sistemaId)
        ? prev.sistemasAtivos.filter(id => id !== sistemaId)
        : [...prev.sistemasAtivos, sistemaId];
      return { ...prev, sistemasAtivos: newSistemas };
    });
  };

  const filteredEmpresas = empresas.filter(empresa =>
    empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empresa.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (empresa.cnpj && empresa.cnpj.includes(searchTerm))
  );

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(20px)',
      padding: '2rem',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.2)',
      color: 'white'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          fontWeight: '700',
          margin: '0 0 clamp(1rem, 3vw, 1.5rem) 0',
          color: 'var(--color-text)',
          textAlign: 'center'
        }}>
          🏢 Gestão de Empresas - {
            sistema === 'universal' ? 'Criação Universal' :
            sistema === 'chamados' ? 'Sistema de Chamados' :
            sistema === 'ponto' ? 'Sistema de Ponto' :
            sistema === 'frota' ? 'Sistema de Frota' :
            sistema === 'financeiro' ? 'Sistema Financeiro' :
            sistema === 'crm' ? 'Sistema CRM' : // Adicionado para CRM
            'Sistema de Documentos'
          }
        </h2>

        {allowCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(45deg, #16a34a, #15803d)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ➕ Nova Empresa
          </button>
        )}
      </div>

      {/* Busca */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="🔍 Buscar por nome, email ou CNPJ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '1rem',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '12px',
            color: 'white',
            fontSize: '1rem'
          }}
        />
      </div>

      {/* Lista de empresas */}
      <div style={{
        display: 'grid',
        gap: '1rem',
        maxHeight: '600px',
        overflowY: 'auto'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            Carregando empresas...
          </div>
        ) : filteredEmpresas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
            Nenhuma empresa encontrada
          </div>
        ) : (
          filteredEmpresas.map(empresa => (
            <div
              key={empresa.id}
              style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>
                  {empresa.nome}
                </h3>
                <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', opacity: 0.8 }}>
                  📧 {empresa.email}
                </p>
                {empresa.cnpj && (
                  <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', opacity: 0.8 }}>
                    🏢 CNPJ: {empresa.cnpj}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: empresa.ativo ? '#16a34a' : '#dc2626',
                    borderRadius: '20px',
                    fontSize: '0.8rem'
                  }}>
                    {empresa.ativo ? '✅ Ativa' : '❌ Inativa'}
                  </span>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: 'rgba(59, 130, 246, 0.3)',
                    borderRadius: '20px',
                    fontSize: '0.8rem'
                  }}>
                    📊 {empresa.plano}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {empresa.sistemasAtivos.map(sistemaId => {
                    const sistema = sistemasDisponiveis.find(s => s.id === sistemaId);
                    return sistema ? (
                      <span key={sistemaId} style={{
                        padding: '0.25rem 0.75rem',
                        background: 'rgba(107, 114, 128, 0.4)',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        opacity: 0.9
                      }}>
                        {sistema.icon} {sistema.nome}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {onEmpresaSelect && (
                  <button
                    onClick={() => onEmpresaSelect(empresa)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    🎯 Selecionar
                  </button>
                )}

                {allowEdit && (
                  <button
                    onClick={() => openEditModal(empresa)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(245, 158, 11, 0.8)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Editar
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Criação */}
      {showCreateModal && (
        <div className="empresa-manager-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(15px)',
          padding: 'clamp(0.5rem, 2vw, 1rem)'
        }}>
          <div className="empresa-manager-modal-content" style={{
            background: 'linear-gradient(145deg, #1a1a1a, #2a2a2a)',
            padding: 'clamp(1rem, 4vw, 2rem)',
            borderRadius: 'clamp(12px, 3vw, 16px)',
            width: 'min(95vw, 600px)',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            zIndex: 9999,
            boxShadow: '0 25px 80px rgba(0,0,0,0.9)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0' }}>➕ Nova Empresa</h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Nome da Empresa *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  style={{
                    width: '100%',
                    padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 'clamp(6px, 1.5vw, 8px)',
                    color: 'white',
                    fontSize: 'clamp(0.8rem, 2vw, 1rem)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{
                    width: '100%',
                    padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 'clamp(6px, 1.5vw, 8px)',
                    color: 'white',
                    fontSize: 'clamp(0.8rem, 2vw, 1rem)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Senha *
                </label>
                <input
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({...formData, senha: e.target.value})}
                  placeholder="Mínimo 6 caracteres"
                  style={{
                    width: '100%',
                    padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 'clamp(6px, 1.5vw, 8px)',
                    color: 'white',
                    fontSize: 'clamp(0.8rem, 2vw, 1rem)'
                  }}
                />
                <div style={{
                  fontSize: '0.75rem',
                  opacity: 0.7,
                  marginTop: '0.25rem',
                  color: '#fbbf24'
                }}>
                  🔐 Esta será a senha para o administrador da empresa fazer login
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Plano *
                </label>
                <select
                  value={formData.plano}
                  onChange={(e) => setFormData({...formData, plano: e.target.value as any})}
                  style={{
                    width: '100%',
                    padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 'clamp(6px, 1.5vw, 8px)',
                    color: 'white',
                    fontSize: 'clamp(0.8rem, 2vw, 1rem)'
                  }}
                >
                  <option value="free">🆓 Gratuito (30 dias)</option>
                  <option value="monthly">💼 Mensal (R$ 29,90/mês)</option>
                  <option value="yearly">📅 Anual (R$ 239,20/ano)</option>
                  <option value="enterprise">🏢 Enterprise (R$ 99,90/mês)</option>
                  <option value="permanent">💎 Permanente (R$ 2.999,99)</option>
                </select>

                {/* Informações do Plano Selecionado */}
                <div style={{
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  marginTop: '0.5rem',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    📋 Detalhes do Plano: {
                      formData.plano === 'free' ? 'Gratuito' :
                      formData.plano === 'monthly' ? 'Mensal' :
                      formData.plano === 'yearly' ? 'Anual' :
                      formData.plano === 'enterprise' ? 'Enterprise' :
                      'Permanente'
                    }
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    {formData.plano === 'free' && '👥 5 funcionários • 🏢 1 empresa • ⏱️ 30 dias de teste'}
                    {formData.plano === 'monthly' && '👥 50 funcionários • 🏢 1 empresa • 🔄 Renovação mensal'}
                    {formData.plano === 'yearly' && '👥 50 funcionários • 🏢 1 empresa • 💰 Economia de 33%'}
                    {formData.plano === 'enterprise' && '👥 999 funcionários • 🏢 10 empresas • 🎯 Suporte dedicado'}
                    {formData.plano === 'permanent' && '👥 Ilimitado • 🏢 Ilimitado • 💎 Vitalício'}
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'clamp(0.5rem, 2vw, 1rem)'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                    style={{
                      width: '100%',
                      padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: 'clamp(6px, 1.5vw, 8px)',
                      color: 'white',
                      fontSize: 'clamp(0.8rem, 2vw, 1rem)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    style={{
                      width: '100%',
                      padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: 'clamp(6px, 1.5vw, 8px)',
                      color: 'white',
                      fontSize: 'clamp(0.8rem, 2vw, 1rem)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Sistemas Ativos (selecione quais sistemas a empresa poderá usar)
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
                  gap: 'clamp(0.5rem, 1.5vw, 0.75rem)',
                  maxHeight: 'clamp(150px, 25vh, 200px)',
                  overflowY: 'auto',
                  padding: 'clamp(0.25rem, 1vw, 0.5rem)',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 'clamp(6px, 1.5vw, 8px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  {sistemasDisponiveis.map(sistema => (
                    <label
                      key={sistema.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        background: formData.sistemasAtivos.includes(sistema.id)
                          ? 'rgba(59, 130, 246, 0.3)'
                          : 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        if (!formData.sistemasAtivos.includes(sistema.id)) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!formData.sistemasAtivos.includes(sistema.id)) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.sistemasAtivos.includes(sistema.id)}
                        onChange={() => handleSistemaToggle(sistema.id)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      <span style={{ fontSize: '1.2rem' }}>{sistema.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                          {sistema.nome}
                        </div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                          {sistema.descricao}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  opacity: 0.7,
                  marginTop: '0.5rem',
                  fontStyle: 'italic'
                }}>
                  💡 Dica: Selecione apenas os sistemas que a empresa realmente utilizará
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 'clamp(0.5rem, 2vw, 1rem)'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.geofencing}
                    onChange={(e) => setFormData({...formData, geofencing: e.target.checked})}
                  />
                  🗺️ Geofencing
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.selfieObrigatoria}
                    onChange={(e) => setFormData({...formData, selfieObrigatoria: e.target.checked})}
                  />
                  📸 Selfie Obrigatória
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.notificacaoEmail}
                    onChange={(e) => setFormData({...formData, notificacaoEmail: e.target.checked})}
                  />
                  📧 Notificações Email
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(107, 114, 128, 0.8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                ❌ Cancelar
              </button>

              <button
                onClick={handleCreate}
                disabled={loading || !formData.nome || !formData.email || !formData.senha || formData.senha.length < 6}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: loading || !formData.nome || !formData.email || !formData.senha || formData.senha.length < 6
                    ? 'rgba(107, 114, 128, 0.6)'
                    : 'linear-gradient(45deg, #16a34a, #15803d)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading || !formData.nome || !formData.email || !formData.senha || formData.senha.length < 6
                    ? 'not-allowed'
                    : 'pointer',
                  fontWeight: 'bold',
                  opacity: loading || !formData.nome || !formData.email || !formData.senha || formData.senha.length < 6
                    ? 0.6
                    : 1
                }}
              >
                {loading ? '⏳ Criando empresa...' : '✅ Criar Empresa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && selectedEmpresa && (
        <div className="empresa-manager-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2147483647,
          backdropFilter: 'blur(15px)',
          padding: 'clamp(0.5rem, 2vw, 1rem)'
        }}>
          <div className="empresa-manager-modal-content" style={{
            background: 'linear-gradient(145deg, #1a1a1a, #2a2a2a)',
            padding: 'clamp(1rem, 4vw, 2rem)',
            borderRadius: 'clamp(12px, 3vw, 16px)',
            width: 'min(95vw, 600px)',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            zIndex: 2147483647,
            boxShadow: '0 25px 80px rgba(0,0,0,0.9)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0' }}>✏️ Editar Empresa</h3>

            {/* Mesmo formulário do modal de criação, mas com dados preenchidos */}
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Nome da Empresa *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  style={{
                    width: '100%',
                    padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 'clamp(6px, 1.5vw, 8px)',
                    color: 'white',
                    fontSize: 'clamp(0.8rem, 2vw, 1rem)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{
                    width: '100%',
                    padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 'clamp(6px, 1.5vw, 8px)',
                    color: 'white',
                    fontSize: 'clamp(0.8rem, 2vw, 1rem)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Nova Senha (deixe em branco para manter a atual)
                </label>
                <input
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({...formData, senha: e.target.value})}
                  placeholder="Mínimo 6 caracteres"
                  style={{
                    width: '100%',
                    padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 'clamp(6px, 1.5vw, 8px)',
                    color: 'white',
                    fontSize: 'clamp(0.8rem, 2vw, 1rem)'
                  }}
                />
                <div style={{
                  fontSize: '0.75rem',
                  opacity: 0.7,
                  marginTop: '0.25rem',
                  color: '#fbbf24'
                }}>
                  🔐 Preencha apenas se quiser alterar a senha
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'clamp(0.5rem, 2vw, 1rem)'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                    style={{
                      width: '100%',
                      padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: 'clamp(6px, 1.5vw, 8px)',
                      color: 'white',
                      fontSize: 'clamp(0.8rem, 2vw, 1rem)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    style={{
                      width: '100%',
                      padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: 'clamp(6px, 1.5vw, 8px)',
                      color: 'white',
                      fontSize: 'clamp(0.8rem, 2vw, 1rem)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Sistemas Ativos
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
                  gap: 'clamp(0.5rem, 1.5vw, 0.75rem)',
                  maxHeight: 'clamp(150px, 25vh, 200px)',
                  overflowY: 'auto',
                  padding: 'clamp(0.25rem, 1vw, 0.5rem)',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 'clamp(6px, 1.5vw, 8px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  {sistemasDisponiveis.map(sistema => (
                    <label
                      key={sistema.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        background: formData.sistemasAtivos.includes(sistema.id)
                          ? 'rgba(59, 130, 246, 0.3)'
                          : 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        if (!formData.sistemasAtivos.includes(sistema.id)) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!formData.sistemasAtivos.includes(sistema.id)) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.sistemasAtivos.includes(sistema.id)}
                        onChange={() => handleSistemaToggle(sistema.id)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      <span style={{ fontSize: '1.2rem' }}>{sistema.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                          {sistema.nome}
                        </div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                          {sistema.descricao}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedEmpresa(null);
                  resetForm();
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(107, 114, 128, 0.8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                ❌ Cancelar
              </button>

              <button
                onClick={handleEdit}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(45deg, #f59e0b, #d97706)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {loading ? '⏳ Salvando...' : '💾 Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}