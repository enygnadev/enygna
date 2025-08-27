'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
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
  where
} from 'firebase/firestore';

interface Empresa {
  id: string;
  nome: string;
  email: string;
  cnpj?: string;
  telefone?: string;
  endereco?: string;
  ativo: boolean;
  plano: 'basico' | 'premium' | 'enterprise';
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
  sistema: 'chamados' | 'frota' | 'financeiro' | 'documentos' | 'ponto';
  onEmpresaSelect?: (empresa: Empresa) => void;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
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
  ];

  // Estados do formulário
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '', // Adicionado campo de senha
    cnpj: '',
    telefone: '',
    endereco: '',
    plano: 'basico' as const,
    geofencing: false,
    selfieObrigatoria: false,
    notificacaoEmail: true,
    sistemasAtivos: [] as string[]
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
      'ponto': 'empresas'
    };
    return collectionMap[sistema] || 'empresas';
  };

  const handleCreate = async () => {
    if (!formData.nome || !formData.email || !formData.senha) { // Adicionado validação de senha
      alert('Nome, email e senha são obrigatórios');
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
        senha: formData.senha, // Incluindo senha nos dados da empresa
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

      // Criar configurações específicas do sistema
      await createSystemSpecificData(empresaId);
      console.log('Configurações específicas criadas');

      setShowCreateModal(false);
      resetForm();
      loadEmpresas();
      alert('Empresa criada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao criar empresa:', error);

      let errorMessage = 'Erro ao criar empresa';
      if (error?.code === 'permission-denied') {
        errorMessage = 'Erro de permissão. Verifique se você tem privilégios de administrador.';
      } else if (error?.message) {
        errorMessage = `Erro: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedEmpresa || !formData.nome || !formData.email) {
      alert('Nome e email são obrigatórios');
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

      // Se uma nova senha foi fornecida, adiciona ao updateData
      if (formData.senha) {
        updateData.senha = formData.senha;
      }

      await updateDoc(doc(db, collectionName, selectedEmpresa.id), updateData);

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

  const createSystemSpecificData = async (empresaId: string) => {
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
          // Criar configurações padrão para ponto
          await setDoc(doc(db, 'empresas', empresaId, 'configuracoes', 'default'), {
            horariosTrabalho: {
              entrada: '08:00',
              saida: '17:00',
              intervalo: 60 // minutos
            },
            tolerancia: 15, // minutos
            geofencing: formData.geofencing,
            criadoEm: serverTimestamp()
          });
          break;
      }
    } catch (error) {
      console.error('Erro ao criar dados específicos do sistema:', error);
    }
  };

  const openEditModal = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setFormData({
      nome: empresa.nome,
      email: empresa.email,
      senha: '', // Limpa o campo de senha ao abrir o modal de edição
      cnpj: empresa.cnpj || '',
      telefone: empresa.telefone || '',
      endereco: empresa.endereco || '',
      plano: empresa.plano,
      geofencing: empresa.configuracoes?.geofencing || false,
      selfieObrigatoria: empresa.configuracoes?.selfieObrigatoria || false,
      notificacaoEmail: empresa.configuracoes?.notificacaoEmail || true,
      sistemasAtivos: empresa.sistemasAtivos || []
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      senha: '', // Reseta a senha
      cnpj: '',
      telefone: '',
      endereco: '',
      plano: 'basico',
      geofencing: false,
      selfieObrigatoria: false,
      notificacaoEmail: true,
      sistemasAtivos: []
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
          fontSize: '1.8rem',
          fontWeight: 'bold',
          margin: 0
        }}>
          🏢 Gestão de Empresas - {sistema.charAt(0).toUpperCase() + sistema.slice(1)}
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
                  Senha de Acesso *
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
                  🔐 Esta senha será usada para login da empresa nos sistemas
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
                  Plano
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
                  <option value="basico">Básico</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
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
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(45deg, #16a34a, #15803d)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {loading ? '⏳ Criando...' : '✅ Criar Empresa'}
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
                  Plano
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
                  <option value="basico">Básico</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
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