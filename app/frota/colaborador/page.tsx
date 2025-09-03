'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, orderBy, limit } from 'firebase/firestore';
import ThemeSelector from '@/src/components/ThemeSelector';
import LocationMap from '@/src/components/LocationMap';

interface Veiculo {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  combustivel: {
    nivel: number;
    tipo: string;
    custoMes: number;
  };
  kmRodados: number;
}

interface Abastecimento {
  id?: string;
  veiculoId: string;
  colaboradorId: string;
  data: string;
  litros: number;
  valorTotal: number;
  valorPorLitro: number;
  posto: string;
  kmAtual: number;
  observacoes: string;
  comprovante?: string;
  timestamp: any;
}

interface Despesa {
  id?: string;
  veiculoId: string;
  colaboradorId: string;
  tipo: 'combustivel' | 'manutencao' | 'multa' | 'pedagio' | 'estacionamento' | 'outros';
  descricao: string;
  valor: number;
  data: string;
  comprovante?: string;
  observacoes: string;
  timestamp: any;
}

interface RastreamentoData {
  latitude: number;
  longitude: number;
  velocidade: number;
  timestamp: string;
  status: 'ativo' | 'parado' | 'em_viagem';
}

export default function ColaboradorFrotaPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [empresaId, setEmpresaId] = useState<string>('');
  const [veiculo, setVeiculo] = useState<Veiculo | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [rastreamentoAtivo, setRastreamentoAtivo] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<RastreamentoData | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Estados para abastecimento
  const [showAbastecimentoForm, setShowAbastecimentoForm] = useState(false);
  const [novoAbastecimento, setNovoAbastecimento] = useState<Partial<Abastecimento>>({
    litros: 0,
    valorTotal: 0,
    valorPorLitro: 0,
    posto: '',
    kmAtual: 0,
    observacoes: ''
  });
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);

  // Estados para despesas
  const [showDespesaForm, setShowDespesaForm] = useState(false);
  const [novaDespesa, setNovaDespesa] = useState<Partial<Despesa>>({
    tipo: 'combustivel',
    descricao: '',
    valor: 0,
    observacoes: ''
  });
  const [despesas, setDespesas] = useState<Despesa[]>([]);

  // Estados para atualização do veículo
  const [showVeiculoForm, setShowVeiculoForm] = useState(false);
  const [atualizacaoVeiculo, setAtualizacaoVeiculo] = useState({
    kmRodados: 0,
    nivelCombustivel: 0,
    observacoes: ''
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbar({ open: true, message, type });
    setTimeout(() => setSnackbar({ ...snackbar, open: false }), 5000);
  };

  // Verificar autenticação e papel do usuário
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        window.location.href = '/frota/auth';
        return;
      }

      try {
        // Verificar papel do usuário
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role?.toLowerCase();

          // Verificar se é colaborador
          if (role !== 'colaborador') {
            window.location.href = '/frota'; // Redirecionar para área principal se não for colaborador
            return;
          }

          setUserRole(role);
          setEmpresaId(userData.empresaId || '');
        } else {
          window.location.href = '/frota/auth';
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar dados do usuário:', error);
        window.location.href = '/frota/auth';
        return;
      }

      setUser(currentUser);
      await loadUserVehicle(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Função para carregar o veículo do colaborador
  const loadUserVehicle = async (currentUser: any) => {
    try {
      setLoading(true);

      // Buscar o colaborador nas empresas
      const empresasSnap = await getDocs(collection(db, 'empresas'));

      for (const empresaDoc of empresasSnap.docs) {
        const colaboradoresSnap = await getDocs(
          query(
            collection(db, 'empresas', empresaDoc.id, 'colaboradores'),
            where('email', '==', currentUser.email)
          )
        );

        if (!colaboradoresSnap.empty) {
          // Buscar veículos da empresa onde o colaborador é condutor
          const veiculosSnap = await getDocs(
            query(
              collection(db, 'empresas', empresaDoc.id, 'veiculos'),
              where('condutor', '==', currentUser.email)
            )
          );

          if (!veiculosSnap.empty) {
            const veiculoData = { id: veiculosSnap.docs[0].id, ...veiculosSnap.docs[0].data() } as Veiculo;
            setVeiculo(veiculoData);
            setAtualizacaoVeiculo({
              kmRodados: veiculoData.kmRodados || 0,
              nivelCombustivel: veiculoData.combustivel?.nivel || 0,
              observacoes: ''
            });

            // Carregar histórico de abastecimentos e despesas
            await loadAbastecimentos(empresaDoc.id, veiculoData.id);
            await loadDespesas(empresaDoc.id, veiculoData.id);
            break;
          }
        }
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showSnackbar('Erro ao carregar dados do veículo', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Carregar histórico de abastecimentos
  const loadAbastecimentos = async (empresaId: string, veiculoId: string) => {
    try {
      // Buscar todos os abastecimentos do veículo sem orderBy para evitar índice composto
      const abastecimentosSnap = await getDocs(
        query(
          collection(db, 'empresas', empresaId, 'abastecimentos'),
          where('veiculoId', '==', veiculoId)
        )
      );

      const abastecimentosData = abastecimentosSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Abastecimento[];

      // Ordenar no cliente e limitar a 10
      const sortedData = abastecimentosData
        .sort((a, b) => {
          if (a.timestamp && b.timestamp) {
            return b.timestamp.toDate() - a.timestamp.toDate();
          }
          return new Date(b.data).getTime() - new Date(a.data).getTime();
        })
        .slice(0, 10);

      setAbastecimentos(sortedData);
    } catch (error) {
      console.error('Erro ao carregar abastecimentos:', error);
    }
  };

  // Carregar histórico de despesas
  const loadDespesas = async (empresaId: string, veiculoId: string) => {
    try {
      // Buscar todas as despesas do veículo sem orderBy para evitar índice composto
      const despesasSnap = await getDocs(
        query(
          collection(db, 'empresas', empresaId, 'despesas'),
          where('veiculoId', '==', veiculoId)
        )
      );

      const despesasData = despesasSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Despesa[];

      // Ordenar no cliente e limitar a 10
      const sortedData = despesasData
        .sort((a, b) => {
          if (a.timestamp && b.timestamp) {
            return b.timestamp.toDate() - a.timestamp.toDate();
          }
          return new Date(b.data).getTime() - new Date(a.data).getTime();
        })
        .slice(0, 10);

      setDespesas(sortedData);
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
    }
  };

  // Função para iniciar/parar rastreamento GPS
  const toggleRastreamento = () => {
    if (rastreamentoAtivo) {
      // Parar rastreamento
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setRastreamentoAtivo(false);
      showSnackbar('Rastreamento GPS desativado', 'success');
    } else {
      // Iniciar rastreamento
      if ('geolocation' in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation: RastreamentoData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              velocidade: position.coords.speed || 0,
              timestamp: new Date().toISOString(),
              status: position.coords.speed && position.coords.speed > 5 ? 'em_viagem' : 'parado'
            };

            setCurrentLocation(newLocation);

            // Salvar no Firebase (opcional - pode ser configurado para salvar periodicamente)
            saveLocationToFirebase(newLocation);
          },
          (error) => {
            console.error('Erro no GPS:', error);
            showSnackbar('Erro ao acessar GPS', 'error');
          },
          {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 15000
          }
        );

        setRastreamentoAtivo(true);
        showSnackbar('Rastreamento GPS ativado', 'success');
      } else {
        showSnackbar('GPS não disponível neste dispositivo', 'error');
      }
    }
  };

  // Salvar localização no Firebase
  const saveLocationToFirebase = async (location: RastreamentoData) => {
    if (!veiculo || !user) return;

    try {
      // Buscar empresa do veículo
      const empresasSnap = await getDocs(collection(db, 'empresas'));

      for (const empresaDoc of empresasSnap.docs) {
        const veiculoDoc = await getDoc(doc(db, 'empresas', empresaDoc.id, 'veiculos', veiculo.id));

        if (veiculoDoc.exists()) {
          // Atualizar localização em tempo real
          await updateDoc(doc(db, 'empresas', empresaDoc.id, 'veiculos', veiculo.id), {
            gps: {
              latitude: location.latitude,
              longitude: location.longitude,
              ultimaAtualizacao: location.timestamp
            },
            status: location.status,
            ultimaLocalizacao: serverTimestamp()
          });

          // Salvar histórico de rastreamento
          await addDoc(collection(db, 'empresas', empresaDoc.id, 'rastreamento'), {
            veiculoId: veiculo.id,
            colaboradorId: user.uid,
            ...location,
            timestamp: serverTimestamp()
          });
          break;
        }
      }
    } catch (error) {
      console.error('Erro ao salvar localização:', error);
    }
  };

  // Adicionar abastecimento
  const handleAddAbastecimento = async () => {
    if (!veiculo || !user || !novoAbastecimento.litros || !novoAbastecimento.valorTotal) {
      showSnackbar('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    try {
      // Buscar empresa do veículo
      const empresasSnap = await getDocs(collection(db, 'empresas'));

      for (const empresaDoc of empresasSnap.docs) {
        const veiculoDoc = await getDoc(doc(db, 'empresas', empresaDoc.id, 'veiculos', veiculo.id));

        if (veiculoDoc.exists()) {
          const abastecimentoData: Abastecimento = {
            veiculoId: veiculo.id,
            colaboradorId: user.uid,
            data: new Date().toISOString().split('T')[0],
            litros: Number(novoAbastecimento.litros),
            valorTotal: Number(novoAbastecimento.valorTotal),
            valorPorLitro: Number(novoAbastecimento.valorTotal) / Number(novoAbastecimento.litros),
            posto: novoAbastecimento.posto || '',
            kmAtual: Number(novoAbastecimento.kmAtual) || 0,
            observacoes: novoAbastecimento.observacoes || '',
            timestamp: serverTimestamp()
          };

          await addDoc(collection(db, 'empresas', empresaDoc.id, 'abastecimentos'), abastecimentoData);

          // Atualizar veículo com novo nível de combustível e KM
          const novoNivel = Math.min(100, veiculo.combustivel.nivel + (Number(novoAbastecimento.litros) * 2));
          await updateDoc(doc(db, 'empresas', empresaDoc.id, 'veiculos', veiculo.id), {
            'combustivel.nivel': novoNivel,
            kmRodados: Number(novoAbastecimento.kmAtual) || veiculo.kmRodados,
            ultimaAtualizacao: serverTimestamp()
          });

          showSnackbar('Abastecimento registrado com sucesso!', 'success');
          setShowAbastecimentoForm(false);
          setNovoAbastecimento({
            litros: 0,
            valorTotal: 0,
            valorPorLitro: 0,
            posto: '',
            kmAtual: 0,
            observacoes: ''
          });

          // Recarregar dados
          await loadAbastecimentos(empresaDoc.id, veiculo.id);
          break;
        }
      }
    } catch (error) {
      console.error('Erro ao adicionar abastecimento:', error);
      showSnackbar('Erro ao registrar abastecimento', 'error');
    }
  };

  // Adicionar despesa
  const handleAddDespesa = async () => {
    if (!veiculo || !user || !novaDespesa.tipo || !novaDespesa.valor) {
      showSnackbar('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    try {
      // Buscar empresa do veículo
      const empresasSnap = await getDocs(collection(db, 'empresas'));

      for (const empresaDoc of empresasSnap.docs) {
        const veiculoDoc = await getDoc(doc(db, 'empresas', empresaDoc.id, 'veiculos', veiculo.id));

        if (veiculoDoc.exists()) {
          const despesaData: Despesa = {
            veiculoId: veiculo.id,
            colaboradorId: user.uid,
            tipo: novaDespesa.tipo || 'outros',
            descricao: novaDespesa.descricao || '',
            valor: Number(novaDespesa.valor),
            data: new Date().toISOString().split('T')[0],
            observacoes: novaDespesa.observacoes || '',
            timestamp: serverTimestamp()
          };

          await addDoc(collection(db, 'empresas', empresaDoc.id, 'despesas'), despesaData);

          showSnackbar('Despesa registrada com sucesso!', 'success');
          setShowDespesaForm(false);
          setNovaDespesa({
            tipo: 'combustivel',
            descricao: '',
            valor: 0,
            observacoes: ''
          });

          // Recarregar dados
          await loadDespesas(empresaDoc.id, veiculo.id);
          break;
        }
      }
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      showSnackbar('Erro ao registrar despesa', 'error');
    }
  };

  // Atualizar dados do veículo
  const handleUpdateVeiculo = async () => {
    if (!veiculo || !user) return;

    try {
      // Buscar empresa do veículo
      const empresasSnap = await getDocs(collection(db, 'empresas'));

      for (const empresaDoc of empresasSnap.docs) {
        const veiculoDoc = await getDoc(doc(db, 'empresas', empresaDoc.id, 'veiculos', veiculo.id));

        if (veiculoDoc.exists()) {
          await updateDoc(doc(db, 'empresas', empresaDoc.id, 'veiculos', veiculo.id), {
            kmRodados: Number(atualizacaoVeiculo.kmRodados),
            'combustivel.nivel': Number(atualizacaoVeiculo.nivelCombustivel),
            ultimaAtualizacao: serverTimestamp(),
            observacoes: atualizacaoVeiculo.observacoes
          });

          // Registrar atualização no histórico
          await addDoc(collection(db, 'empresas', empresaDoc.id, 'atualizacoes'), {
            veiculoId: veiculo.id,
            colaboradorId: user.uid,
            tipo: 'atualizacao_dados',
            dados: {
              kmAntigo: veiculo.kmRodados,
              kmNovo: Number(atualizacaoVeiculo.kmRodados),
              combustivelAntigo: veiculo.combustivel.nivel,
              combustivelNovo: Number(atualizacaoVeiculo.nivelCombustivel)
            },
            observacoes: atualizacaoVeiculo.observacoes,
            timestamp: serverTimestamp()
          });

          showSnackbar('Dados do veículo atualizados!', 'success');
          setShowVeiculoForm(false);

          // Atualizar estado local
          setVeiculo({
            ...veiculo,
            kmRodados: Number(atualizacaoVeiculo.kmRodados),
            combustivel: {
              ...veiculo.combustivel,
              nivel: Number(atualizacaoVeiculo.nivelCombustivel)
            }
          });
          break;
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar veículo:', error);
      showSnackbar('Erro ao atualizar dados do veículo', 'error');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          background: 'var(--color-background)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid var(--color-border)',
              borderTop: '4px solid var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p>Carregando dados do motorista...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!veiculo) {
    return (
      <div className="container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          background: 'var(--color-background)'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚗</div>
            <h1>Nenhum Veículo Atribuído</h1>
            <p style={{ marginBottom: '1rem', opacity: 0.8 }}>
              Você ainda não possui um veículo atribuído na frota. Entre em contato com o administrador.
            </p>
            {user && (
              <p style={{ marginBottom: '2rem', fontSize: '0.9rem', opacity: 0.7 }}>
                👤 Logado como: {user.email}
              </p>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/frota" className="button button-primary">
                Voltar à Frota
              </Link>
              <Link href="/sistemas" className="button button-outline">
                Ver Sistemas
              </Link>
              <button
                onClick={async () => {
                  await signOut(auth);
                  window.location.href = '/frota/auth';
                }}
                className="button button-outline"
                style={{ 
                  background: 'linear-gradient(45deg, #ff6b6b, #ee5a5a)', 
                  color: 'white', 
                  border: 'none' 
                }}
              >
                🚪 Sair da Conta
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .motorista-root {
          background: linear-gradient(135deg, var(--gradient-primary));
          min-height: 100vh;
          color: var(--color-text);
        }

        .tabs-container {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          padding: 0.5rem;
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          overflow-x: auto;
        }

        .tab {
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius);
          background: transparent;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
          white-space: nowrap;
          color: var(--color-textSecondary);
        }

        .tab.active {
          background: linear-gradient(45deg, #00ff7f, #8a2be2);
          color: white;
        }

        .tab:hover:not(.active) {
          background: var(--color-background);
        }

        .status-card {
          background: var(--gradient-card);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .status-icon {
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .status-active {
          background: rgba(0, 255, 127, 0.2);
        }

        .status-inactive {
          background: rgba(255, 107, 107, 0.2);
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .history-item {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .history-date {
          font-size: 0.9rem;
          opacity: 0.7;
        }

        .expense-type {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: white;
        }

        .expense-combustivel { background: #ff6b35; }
        .expense-manutencao { background: #8a2be2; }
        .expense-multa { background: #ff3333; }
        .expense-pedagio { background: #1e90ff; }
        .expense-estacionamento { background: #32cd32; }
        .expense-outros { background: #666; }
      `}</style>

      <div className="motorista-root">
        <div style={{ padding: 'var(--gap-xl)' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            padding: '1rem',
            background: 'var(--gradient-surface)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <Link href="/frota" className="button button-ghost" style={{ marginRight: '1rem' }}>
                ← Voltar à Frota
              </Link>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                🚗 {veiculo.marca} {veiculo.modelo} - {veiculo.placa}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                👤 {user?.email}
              </span>
              <button
                onClick={async () => {
                  await signOut(auth);
                  window.location.href = '/frota/auth';
                }}
                className="button button-outline"
                style={{ background: 'linear-gradient(45deg, #ff6b6b, #ee5a5a)', color: 'white', border: 'none' }}
              >
                🚪 Sair
              </button>
              <ThemeSelector />
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs-container">
            <button 
              className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              📊 Dashboard
            </button>
            <button 
              className={`tab ${activeTab === 'gps' ? 'active' : ''}`}
              onClick={() => setActiveTab('gps')}
            >
              📍 GPS & Rastreamento
            </button>
            <button 
              className={`tab ${activeTab === 'combustivel' ? 'active' : ''}`}
              onClick={() => setActiveTab('combustivel')}
            >
              ⛽ Combustível
            </button>
            <button 
              className={`tab ${activeTab === 'despesas' ? 'active' : ''}`}
              onClick={() => setActiveTab('despesas')}
            >
              💰 Despesas
            </button>
            <button 
              className={`tab ${activeTab === 'veiculo' ? 'active' : ''}`}
              onClick={() => setActiveTab('veiculo')}
            >
              🔧 Atualizar Veículo
            </button>
          </div>

          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Status Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                <div className="status-card">
                  <div className={`status-icon ${rastreamentoAtivo ? 'status-active' : 'status-inactive'}`}>
                    📍
                  </div>
                  <div>
                    <h3>Rastreamento GPS</h3>
                    <p style={{ margin: 0, opacity: 0.8 }}>
                      {rastreamentoAtivo ? 'Ativo' : 'Inativo'}
                    </p>
                    {currentLocation && (
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', opacity: 0.7 }}>
                        Velocidade: {Math.round(currentLocation.velocidade * 3.6)} km/h
                      </p>
                    )}
                  </div>
                </div>

                <div className="status-card">
                  <div className="status-icon" style={{ background: 'rgba(255, 215, 0, 0.2)' }}>
                    ⛽
                  </div>
                  <div>
                    <h3>Combustível</h3>
                    <p style={{ margin: 0, opacity: 0.8 }}>
                      {veiculo.combustivel.nivel}% - {veiculo.combustivel.tipo}
                    </p>
                    <div style={{ 
                      width: '100%', 
                      height: '8px', 
                      background: 'var(--color-border)', 
                      borderRadius: '4px',
                      marginTop: '0.5rem'
                    }}>
                      <div style={{ 
                        width: `${veiculo.combustivel.nivel}%`, 
                        height: '100%', 
                        background: veiculo.combustivel.nivel > 25 ? '#00ff7f' : '#ff6b6b',
                        borderRadius: '4px'
                      }}></div>
                    </div>
                  </div>
                </div>

                <div className="status-card">
                  <div className="status-icon" style={{ background: 'rgba(138, 43, 226, 0.2)' }}>
                    🛣️
                  </div>
                  <div>
                    <h3>Quilometragem</h3>
                    <p style={{ margin: 0, opacity: 0.8 }}>
                      {veiculo.kmRodados.toLocaleString()} km
                    </p>
                  </div>
                </div>
              </div>

              {/* Ações Rápidas */}
              <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>🎯 Ações Rápidas</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <button 
                    className="button button-primary"
                    onClick={() => setActiveTab('combustivel')}
                  >
                    ⛽ Registrar Abastecimento
                  </button>
                  <button 
                    className="button button-primary"
                    onClick={() => setActiveTab('despesas')}
                  >
                    💰 Adicionar Despesa
                  </button>
                  <button 
                    className="button button-primary"
                    onClick={() => setActiveTab('veiculo')}
                  >
                    🔧 Atualizar KM/Combustível
                  </button>
                  <button 
                    className="button button-primary"
                    onClick={toggleRastreamento}
                    style={{ 
                      background: rastreamentoAtivo 
                        ? 'linear-gradient(45deg, #ff6b6b, #ee5a5a)' 
                        : 'linear-gradient(45deg, #00ff7f, #8a2be2)' 
                    }}
                  >
                    📍 {rastreamentoAtivo ? 'Parar' : 'Iniciar'} GPS
                  </button>
                </div>
              </div>

              {/* Resumos Recentes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                <div className="card">
                  <h3>⛽ Últimos Abastecimentos</h3>
                  {abastecimentos.slice(0, 3).map((abast, index) => (
                    <div key={index} className="history-item">
                      <div className="history-header">
                        <strong>{abast.posto}</strong>
                        <span className="history-date">{abast.data}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        {abast.litros}L - R$ {abast.valorTotal.toFixed(2)}
                      </p>
                    </div>
                  ))}
                  {abastecimentos.length === 0 && (
                    <p style={{ textAlign: 'center', opacity: 0.7, padding: '2rem' }}>
                      Nenhum abastecimento registrado
                    </p>
                  )}
                </div>

                <div className="card">
                  <h3>💰 Últimas Despesas</h3>
                  {despesas.slice(0, 3).map((desp, index) => (
                    <div key={index} className="history-item">
                      <div className="history-header">
                        <span className={`expense-type expense-${desp.tipo}`}>
                          {desp.tipo.toUpperCase()}
                        </span>
                        <span className="history-date">{desp.data}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        {desp.descricao} - R$ {desp.valor.toFixed(2)}
                      </p>
                    </div>
                  ))}
                  {despesas.length === 0 && (
                    <p style={{ textAlign: 'center', opacity: 0.7, padding: '2rem' }}>
                      Nenhuma despesa registrada
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* GPS & Rastreamento */}
          {activeTab === 'gps' && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div className="card">
                <h3>📍 Rastreamento em Tempo Real</h3>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <button 
                    className="button button-primary"
                    onClick={toggleRastreamento}
                    style={{ 
                      background: rastreamentoAtivo 
                        ? 'linear-gradient(45deg, #ff6b6b, #ee5a5a)' 
                        : 'linear-gradient(45deg, #00ff7f, #8a2be2)' 
                    }}
                  >
                    📍 {rastreamentoAtivo ? 'Parar Rastreamento' : 'Iniciar Rastreamento'}
                  </button>

                  {currentLocation && (
                    <button 
                      className="button button-outline"
                      onClick={() => saveLocationToFirebase(currentLocation)}
                    >
                      💾 Salvar Localização Atual
                    </button>
                  )}
                </div>

                {rastreamentoAtivo && currentLocation && (
                  <div style={{ 
                    background: 'rgba(0, 255, 127, 0.1)', 
                    border: '1px solid rgba(0, 255, 127, 0.3)', 
                    borderRadius: '8px', 
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <h4>📊 Status Atual</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div>
                        <strong>Coordenadas:</strong><br />
                        {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                      </div>
                      <div>
                        <strong>Velocidade:</strong><br />
                        {Math.round(currentLocation.velocidade * 3.6)} km/h
                      </div>
                      <div>
                        <strong>Status:</strong><br />
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '4px', 
                          background: currentLocation.status === 'em_viagem' ? '#00ff7f' : '#ffd700',
                          color: '#000'
                        }}>
                          {currentLocation.status === 'em_viagem' ? 'Em Viagem' : 'Parado'}
                        </span>
                      </div>
                      <div>
                        <strong>Última Atualização:</strong><br />
                        {new Date(currentLocation.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mapa */}
                <div style={{ height: '400px', borderRadius: '8px', overflow: 'hidden' }}>
                  {currentLocation ? (
                    <LocationMap
                      lat={currentLocation.latitude}
                      lng={currentLocation.longitude}
                      label="Localização Atual"
                      useGeoWatch={rastreamentoAtivo}
                      autoRecenter={true}
                      preferClientLocation={true}
                    />
                  ) : (
                    <div style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--color-surface)',
                      color: 'var(--color-textSecondary)'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📍</div>
                        <p>Ative o rastreamento GPS para ver sua localização no mapa</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Combustível */}
          {activeTab === 'combustivel' && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>⛽ Gerenciamento de Combustível</h3>
                  <button 
                    className="button button-primary"
                    onClick={() => setShowAbastecimentoForm(!showAbastecimentoForm)}
                  >
                    {showAbastecimentoForm ? '❌ Cancelar' : '➕ Novo Abastecimento'}
                  </button>
                </div>

                {/* Status atual do combustível */}
                <div style={{
                  background: 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <h4>📊 Status Atual</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <strong>Nível Atual:</strong><br />
                      <span style={{ fontSize: '1.5rem', color: veiculo.combustivel.nivel > 25 ? '#00ff7f' : '#ff6b6b' }}>
                        {veiculo.combustivel.nivel}%
                      </span>
                    </div>
                    <div>
                      <strong>Tipo:</strong><br />
                      {veiculo.combustivel.tipo}
                    </div>
                    <div>
                      <strong>Gasto Mensal:</strong><br />
                      R$ {veiculo.combustivel.custoMes.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Formulário de abastecimento */}
                {showAbastecimentoForm && (
                  <div className="card" style={{ background: 'var(--color-background)', border: '2px solid var(--color-primary)' }}>
                    <h4>➕ Novo Abastecimento</h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Litros *</label>
                        <input
                          className="input"
                          type="number"
                          step="0.01"
                          placeholder="Ex: 45.50"
                          value={novoAbastecimento.litros || ''}
                          onChange={(e) => setNovoAbastecimento({
                            ...novoAbastecimento,
                            litros: parseFloat(e.target.value) || 0
                          })}
                        />
                      </div>

                      <div className="form-group">
                        <label>Valor Total (R$) *</label>
                        <input
                          className="input"
                          type="number"
                          step="0.01"
                          placeholder="Ex: 250.00"
                          value={novoAbastecimento.valorTotal || ''}
                          onChange={(e) => {
                            const valor = parseFloat(e.target.value) || 0;
                            setNovoAbastecimento({
                              ...novoAbastecimento,
                              valorTotal: valor,
                              valorPorLitro: novoAbastecimento.litros ? valor / novoAbastecimento.litros : 0
                            });
                          }}
                        />
                      </div>

                      <div className="form-group">
                        <label>Valor por Litro (R$)</label>
                        <input
                          className="input"
                          type="number"
                          step="0.001"
                          placeholder="Calculado automaticamente"
                          value={novoAbastecimento.valorPorLitro?.toFixed(3) || ''}
                          readOnly
                        />
                      </div>

                      <div className="form-group">
                        <label>Posto</label>
                        <input
                          className="input"
                          type="text"
                          placeholder="Nome do posto"
                          value={novoAbastecimento.posto || ''}
                          onChange={(e) => setNovoAbastecimento({
                            ...novoAbastecimento,
                            posto: e.target.value
                          })}
                        />
                      </div>

                      <div className="form-group">
                        <label>KM Atual</label>
                        <input
                          className="input"
                          type="number"
                          placeholder={`Atual: ${veiculo.kmRodados}`}
                          value={novoAbastecimento.kmAtual || ''}
                          onChange={(e) => setNovoAbastecimento({
                            ...novoAbastecimento,
                            kmAtual: parseInt(e.target.value) || 0
                          })}
                        />
                      </div>

                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Observações</label>
                        <textarea
                          className="input"
                          rows={3}
                          placeholder="Observações adicionais..."
                          value={novoAbastecimento.observacoes || ''}
                          onChange={(e) => setNovoAbastecimento({
                            ...novoAbastecimento,
                            observacoes: e.target.value
                          })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button 
                        className="button button-primary"
                        onClick={handleAddAbastecimento}
                      >
                        💾 Salvar Abastecimento
                      </button>
                      <button 
                        className="button button-outline"
                        onClick={() => setShowAbastecimentoForm(false)}
                      >
                        ❌ Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Histórico de abastecimentos */}
                <div className="card">
                  <h4>📋 Histórico de Abastecimentos</h4>
                  {abastecimentos.length > 0 ? (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {abastecimentos.map((abast, index) => (
                        <div key={index} className="history-item">
                          <div className="history-header">
                            <strong>{abast.posto || 'Posto não informado'}</strong>
                            <span className="history-date">{abast.data}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', fontSize: '0.9rem' }}>
                            <div><strong>Litros:</strong> {abast.litros}L</div>
                            <div><strong>Total:</strong> R$ {abast.valorTotal.toFixed(2)}</div>
                            <div><strong>Por Litro:</strong> R$ {abast.valorPorLitro.toFixed(3)}</div>
                            <div><strong>KM:</strong> {abast.kmAtual.toLocaleString()}</div>
                          </div>
                          {abast.observacoes && (
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', opacity: 0.7 }}>
                              💬 {abast.observacoes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ textAlign: 'center', opacity: 0.7, padding: '2rem' }}>
                      Nenhum abastecimento registrado ainda.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Despesas */}
          {activeTab === 'despesas' && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>💰 Gestão de Despesas</h3>
                  <button 
                    className="button button-primary"
                    onClick={() => setShowDespesaForm(!showDespesaForm)}
                  >
                    {showDespesaForm ? '❌ Cancelar' : '➕ Nova Despesa'}
                  </button>
                </div>

                {/* Formulário de despesa */}
                {showDespesaForm && (
                  <div className="card" style={{ background: 'var(--color-background)', border: '2px solid var(--color-primary)' }}>
                    <h4>➕ Nova Despesa</h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Tipo de Despesa *</label>
                        <select
                          className="input"
                          value={novaDespesa.tipo}
                          onChange={(e) => setNovaDespesa({
                            ...novaDespesa,
                            tipo: e.target.value as any
                          })}
                        >
                          <option value="combustivel">Combustível</option>
                          <option value="manutencao">Manutenção</option>
                          <option value="multa">Multa</option>
                          <option value="pedagio">Pedágio</option>
                          <option value="estacionamento">Estacionamento</option>
                          <option value="outros">Outros</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Valor (R$) *</label>
                        <input
                          className="input"
                          type="number"
                          step="0.01"
                          placeholder="Ex: 25.50"
                          value={novaDespesa.valor || ''}
                          onChange={(e) => setNovaDespesa({
                            ...novaDespesa,
                            valor: parseFloat(e.target.value) || 0
                          })}
                        />
                      </div>

                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Descrição *</label>
                        <input
                          className="input"
                          type="text"
                          placeholder="Descrição da despesa"
                          value={novaDespesa.descricao || ''}
                          onChange={(e) => setNovaDespesa({
                            ...novaDespesa,
                            descricao: e.target.value
                          })}
                        />
                      </div>

                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Observações</label>
                        <textarea
                          className="input"
                          rows={3}
                          placeholder="Observações adicionais..."
                          value={novaDespesa.observacoes || ''}
                          onChange={(e) => setNovaDespesa({
                            ...novaDespesa,
                            observacoes: e.target.value
                          })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button 
                        className="button button-primary"
                        onClick={handleAddDespesa}
                      >
                        💾 Salvar Despesa
                      </button>
                      <button 
                        className="button button-outline"
                        onClick={() => setShowDespesaForm(false)}
                      >
                        ❌ Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Histórico de despesas */}
                <div className="card">
                  <h4>📋 Histórico de Despesas</h4>
                  {despesas.length > 0 ? (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {despesas.map((desp, index) => (
                        <div key={index} className="history-item">
                          <div className="history-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span className={`expense-type expense-${desp.tipo}`}>
                                {desp.tipo.toUpperCase()}
                              </span>
                              <strong>R$ {desp.valor.toFixed(2)}</strong>
                            </div>
                            <span className="history-date">{desp.data}</span>
                          </div>
                          <p style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>
                            {desp.descricao}
                          </p>
                          {desp.observacoes && (
                            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>
                              💬 {desp.observacoes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ textAlign: 'center', opacity: 0.7, padding: '2rem' }}>
                      Nenhuma despesa registrada ainda.
                    </p>
                  )}
                </div>

                {/* Resumo mensal */}
                <div className="card">
                  <h4>📊 Resumo do Mês</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                    {['combustivel', 'manutencao', 'multa', 'pedagio', 'estacionamento', 'outros'].map(tipo => {
                      const total = despesas
                        .filter(d => d.tipo === tipo)
                        .reduce((sum, d) => sum + d.valor, 0);

                      return (
                        <div key={tipo} style={{ textAlign: 'center', padding: '1rem', background: 'var(--color-surface)', borderRadius: '8px' }}>
                          <div className={`expense-type expense-${tipo}`} style={{ margin: '0 auto 0.5rem auto', display: 'inline-block' }}>
                            {tipo.toUpperCase()}
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                            R$ {total.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Atualizar Veículo */}
          {activeTab === 'veiculo' && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>🔧 Atualizar Dados do Veículo</h3>
                  <button 
                    className="button button-primary"
                    onClick={() => setShowVeiculoForm(!showVeiculoForm)}
                  >
                    {showVeiculoForm ? '❌ Cancelar' : '✏️ Editar Dados'}
                  </button>
                </div>

                {/* Dados atuais */}
                <div style={{
                  background: 'rgba(138, 43, 226, 0.1)',
                  border: '1px solid rgba(138, 43, 226, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <h4>📊 Dados Atuais</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <strong>Veículo:</strong><br />
                      {veiculo.marca} {veiculo.modelo} ({veiculo.ano})
                    </div>
                    <div>
                      <strong>Placa:</strong><br />
                      {veiculo.placa}
                    </div>
                    <div>
                      <strong>Quilometragem:</strong><br />
                      {veiculo.kmRodados.toLocaleString()} km
                    </div>
                    <div>
                      <strong>Nível Combustível:</strong><br />
                      {veiculo.combustivel.nivel}%
                    </div>
                  </div>
                </div>

                {/* Formulário de atualização */}
                {showVeiculoForm && (
                  <div className="card" style={{ background: 'var(--color-background)', border: '2px solid var(--color-primary)' }}>
                    <h4>✏️ Atualizar Dados</h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Nova Quilometragem (km)</label>
                        <input
                          className="input"
                          type="number"
                          placeholder={`Atual: ${veiculo.kmRodados}`}
                          value={atualizacaoVeiculo.kmRodados || ''}
                          onChange={(e) => setAtualizacaoVeiculo({
                            ...atualizacaoVeiculo,
                            kmRodados: parseInt(e.target.value) || 0
                          })}
                        />
                        <small style={{ opacity: 0.7 }}>
                          Quilometragem deve ser maior que {veiculo.kmRodados.toLocaleString()} km
                        </small>
                      </div>

                      <div className="form-group">
                        <label>Nível de Combustível (%)</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          max="100"
                          placeholder={`Atual: ${veiculo.combustivel.nivel}%`}
                          value={atualizacaoVeiculo.nivelCombustivel || ''}
                          onChange={(e) => setAtualizacaoVeiculo({
                            ...atualizacaoVeiculo,
                            nivelCombustivel: parseInt(e.target.value) || 0
                          })}
                        />
                        <div style={{ 
                          width: '100%', 
                          height: '8px', 
                          background: 'var(--color-border)', 
                          borderRadius: '4px',
                          marginTop: '0.5rem'
                        }}>
                          <div style={{ 
                            width: `${atualizacaoVeiculo.nivelCombustivel || 0}%`, 
                            height: '100%', 
                            background: (atualizacaoVeiculo.nivelCombustivel || 0) > 25 ? '#00ff7f' : '#ff6b6b',
                            borderRadius: '4px'
                          }}></div>
                        </div>
                      </div>

                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Observações</label>
                        <textarea
                          className="input"
                          rows={3}
                          placeholder="Motivo da atualização, condições do veículo, etc..."
                          value={atualizacaoVeiculo.observacoes}
                          onChange={(e) => setAtualizacaoVeiculo({
                            ...atualizacaoVeiculo,
                            observacoes: e.target.value
                          })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button 
                        className="button button-primary"
                        onClick={handleUpdateVeiculo}
                      >
                        💾 Salvar Atualizações
                      </button>
                      <button 
                        className="button button-outline"
                        onClick={() => setShowVeiculoForm(false)}
                      >
                        ❌ Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Snackbar */}
      {snackbar.open && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: snackbar.type === 'success' ? '#00ff7f' : '#ff6b6b',
          color: '#000',
          padding: '1rem 2rem',
          borderRadius: '0.5rem',
          fontWeight: 'bold',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {snackbar.message}
          <button
            onClick={() => setSnackbar({ ...snackbar, open: false })}
            style={{ marginLeft: '1rem', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}