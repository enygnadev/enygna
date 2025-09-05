'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, orderBy, limit, onSnapshot, where, startAfter, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Ticket, TicketFilter, TICKET_STATUS_LABELS, TICKET_PRIORITIES } from '@/src/types/ticket';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SystemStatus from '@/src/components/SystemStatus';
import { useChamadosSessionProfile, canCreateTickets, canManageTickets } from '@/src/lib/chamadosAuth';
import { auth } from '@/src/lib/firebase';
import { useAuth, AuthContext, useAuthData } from '@/src/hooks/useAuth';
import TicketForm from '@/src/components/TicketForm';
import EmpresaManager from '@/src/components/EmpresaManager';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

// AuthProvider wrapper component
function AuthProvider({ children }: { children: React.ReactNode }) {
  const authData = useAuthData();
  return (
    <AuthContext.Provider value={authData}>
      {children}
    </AuthContext.Provider>
  );
}

function ChamadosPage() {
  const router = useRouter();
  const { loading: authLoading, profile } = useChamadosSessionProfile();
  const { user, userData, loading: generalAuthLoading, hasAccess } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TicketFilter>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 20;

  // Menu lateral (exemplo, pode ser substituído por um componente de navegação real)
  const [activeTab, setActiveTab] = useState('tickets'); // Estado para controlar a aba ativa

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'tickets', label: 'Tickets', icon: '🎫' },
    { id: 'create', label: 'Novo Ticket', icon: '➕' },
    { id: 'empresas', label: 'Empresas', icon: '🏢' },
  ];

  // Verificar autenticação e acesso
  useEffect(() => {
    console.log('🔍 Verificando acesso ao sistema chamados para:', user?.email);
    
    // Se ainda está carregando, aguardar
    if (authLoading || generalAuthLoading) {
      console.log('⏳ Ainda carregando autenticação...');
      return;
    }

    // Se não está logado no sistema geral, redirecionar para login
    if (!user) {
      console.log('❌ Usuário não logado no sistema geral, redirecionando...');
      // Salvar intenção de acessar este sistema
      if (typeof window !== 'undefined') {
        localStorage.setItem('redirectAfterLogin', '/sistemas?target=chamados');
        window.location.href = '/';
      }
      return;
    }

    // Se está logado, verificar acesso ao sistema de chamados
    if (user && userData) {
      const hasSystemAccess = hasAccess('chamados');
      console.log('🔍 Acesso ao sistema chamados:', hasSystemAccess);
      console.log('📋 Sistemas ativos do usuário:', userData.sistemasAtivos);
      
      if (!hasSystemAccess) {
        console.log('❌ Usuário não tem acesso ao sistema chamados');
        router.push('/sistemas');
        return;
      }

      console.log('✅ Usuário tem acesso ao sistema chamados');
      
      // Aguardar o perfil do sistema de chamados ser carregado
      if (!profile && !authLoading) {
        console.log('⚠️ Aguardando perfil do sistema de chamados...');
        return;
      }
    }
  }, [authLoading, generalAuthLoading, profile, user, userData, hasAccess, router]);

  // Mostrar loading durante autenticação
  if (authLoading || generalAuthLoading) {
    return (
      <div className="container" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--gap-md)' }}>🎫</div>
          <div>Carregando...</div>
        </div>
      </div>
    );
  }

  // Redirecionar se não autenticado ou sem acesso
  if (!user || !userData || !hasAccess('chamados')) {
    return null;
  }

  // Se não tem perfil ainda, aguardar
  if (!profile && !authLoading) {
    return (
      <div className="container" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--gap-md)' }}>🎫</div>
          <div>Carregando perfil do sistema...</div>
        </div>
      </div>
    );
  }

  // Carregar tickets
  useEffect(() => {
    if (!profile || !userData) return;

    setLoading(true);

    // Construir query base
    let q = query(
      collection(db, 'tickets'),
      orderBy('createdAt', 'desc'),
      limit(itemsPerPage)
    );

    // Aplicar filtros baseados no perfil
    const empresaId = userData.empresaId || userData.company;
    
    if (!canManageTickets(profile) && empresaId) {
      // Usuários normais só veem tickets da sua empresa
      q = query(q, where('empresaId', '==', empresaId));
    }

    if (!canManageTickets(profile)) {
      // Usuários normais só veem seus próprios tickets
      q = query(q, where('createdBy', '==', profile.uid));
    }

    // Aplicar filtros adicionais
    if (filter.status && filter.status.length > 0) {
      q = query(q, where('status', 'in', filter.status));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];

      // Filtro local para busca por texto
      let filteredTickets = ticketsData;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredTickets = ticketsData.filter(ticket => 
          ticket.assunto.toLowerCase().includes(term) ||
          ticket.descricao.toLowerCase().includes(term) ||
          ticket.analysis?.classificacao.categoria.toLowerCase().includes(term) ||
          ticket.produto?.toLowerCase().includes(term)
        );
      }

      setTickets(filteredTickets);
      setHasMore(ticketsData.length === itemsPerPage);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter, searchTerm, profile, userData]); // Adicionado userData como dependência

  const getPriorityBadge = (ticket: Ticket) => {
    const priority = ticket.analysis?.prioridade.prioridade_resultante;
    if (!priority) return null;

    const config = TICKET_PRIORITIES[priority];
    return (
      <span
        className="badge"
        style={{
          backgroundColor: config.color,
          color: 'white',
          fontSize: '0.75rem'
        }}
      >
        {priority}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      aberto: '#3b82f6',
      em_andamento: '#f59e0b',
      resolvido: '#10b981',
      cancelado: '#6b7280'
    };

    return (
      <span
        className="badge"
        style={{
          backgroundColor: colors[status as keyof typeof colors] || '#6b7280',
          color: 'white',
          fontSize: '0.75rem'
        }}
      >
        {TICKET_STATUS_LABELS[status as keyof typeof TICKET_STATUS_LABELS] || status}
      </span>
    );
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), 'dd/MM/yy HH:mm', { locale: ptBR });
  };

  const getRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'agora';
  };

  const stats = {
    total: tickets.length,
    abertos: tickets.filter(t => t.status === 'aberto').length,
    emAndamento: tickets.filter(t => t.status === 'em_andamento').length,
    resolvidos: tickets.filter(t => t.status === 'resolvido').length,
  };

  return (
    <div className="container" style={{ minHeight: '100vh', padding: 'var(--gap-xl)', display: 'flex', gap: 'var(--gap-xl)' }}>
      {/* Menu Lateral */}
      <nav style={{ 
        width: '200px', 
        flexShrink: 0, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 'var(--gap-sm)',
        background: 'var(--color-surface-alt)',
        padding: 'var(--gap-md)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)'
      }}>
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="button-nav"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--gap-sm)',
              padding: 'var(--gap-md) var(--gap-lg)',
              borderRadius: '8px',
              fontWeight: '600',
              justifyContent: 'flex-start',
              backgroundColor: activeTab === item.id ? 'var(--color-primary-light)' : 'transparent',
              color: activeTab === item.id ? 'var(--color-primary)' : 'var(--color-text-secondary)'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Conteúdo Principal */}
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 'var(--gap-md)'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
              {activeTab === 'tickets' ? 'Chamados de TI' : 
               activeTab === 'empresas' ? 'Gestão de Empresas' : 
               activeTab === 'create' ? 'Novo Chamado' : 'Dashboard'}
            </h1>
            {activeTab === 'tickets' && (
              <p style={{ 
                margin: '4px 0 0 0', 
                color: 'var(--color-text-secondary)',
                fontSize: '0.9rem'
              }}>
                {stats.total} chamados • {stats.abertos} abertos • {stats.emAndamento} em andamento
              </p>
            )}
            <p style={{ 
              margin: '4px 0 0 0', 
              color: 'var(--color-text-secondary)',
              fontSize: '0.8rem'
            }}>
              Olá, {profile.displayName || profile.email} • {profile.role}
              {profile.departamento && ` • ${profile.departamento}`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--gap-sm)' }}>
            {activeTab === 'tickets' && canCreateTickets(profile) && (
              <Link href="/chamados/novo" className="button button-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Novo Chamado
              </Link>
            )}

            {activeTab === 'tickets' && canManageTickets(profile) && (
              <Link href="/chamados/admin" className="button button-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 15l3-3-3-3M9 15l3-3-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Administrar
              </Link>
            )}

            <button
              onClick={() => {
                auth.signOut();
                router.push('/chamados/auth');
              }}
              className="button button-ghost"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Conteúdo da Aba Selecionada */}

        {/* Aba Dashboard (Exemplo) */}
        {activeTab === 'dashboard' && (
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📊 Dashboard</h3>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <p style={{ opacity: 0.8 }}>
                Dashboard em desenvolvimento...
              </p>
            </div>
          </div>
        )}

        {/* Aba Tickets */}
        {activeTab === 'tickets' && (
          <>
            {/* Status do Sistema */}
            <div style={{ marginBottom: 'var(--gap-lg)' }}>
              <SystemStatus compact={true} />
            </div>

            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--gap-md)',
              marginBottom: 'var(--gap-xl)'
            }}>
              <div className="card" style={{ textAlign: 'center', padding: 'var(--gap-md)' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                  {stats.total}
                </div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  Total de Chamados
                </div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: 'var(--gap-md)' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>
                  {stats.abertos}
                </div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  Abertos
                </div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: 'var(--gap-md)' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
                  {stats.emAndamento}
                </div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  Em Andamento
                </div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: 'var(--gap-md)' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
                  {stats.resolvidos}
                </div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  Resolvidos
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="card" style={{ marginBottom: 'var(--gap-lg)' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--gap-md)',
                alignItems: 'end'
              }}>
                {/* Busca */}
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--gap-xs)', fontSize: '0.9rem', fontWeight: '600' }}>
                    Buscar
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Assunto, descrição, categoria..."
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Status */}
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--gap-xs)', fontSize: '0.9rem', fontWeight: '600' }}>
                    Status
                  </label>
                  <select
                    value={filter.status?.[0] || ''}
                    onChange={(e) => setFilter(prev => ({
                      ...prev,
                      status: e.target.value ? [e.target.value as any] : undefined
                    }))}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="">Todos os status</option>
                    <option value="aberto">Aberto</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="resolvido">Resolvido</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                {/* Limpar filtros */}
                <button
                  onClick={() => {
                    setFilter({});
                    setSearchTerm('');
                  }}
                  className="button button-ghost"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>

            {/* Lista de Tickets */}
            <div className="card">
              {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--gap-xl)', color: 'var(--color-text-secondary)' }}>
                  Carregando chamados...
                </div>
              ) : tickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--gap-xl)', color: 'var(--color-text-secondary)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 'var(--gap-md)' }}>🎫</div>
                  <h3>Nenhum chamado encontrado</h3>
                  <p>Comece criando seu primeiro chamado de TI</p>
                  <Link href="/chamados/novo" className="button button-primary" style={{ marginTop: 'var(--gap-md)' }}>
                    Criar Primeiro Chamado
                  </Link>
                </div>
              ) : (
                <div style={{ overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                        <th style={{ textAlign: 'left', padding: 'var(--gap-md)', fontWeight: '600' }}>Chamado</th>
                        <th style={{ textAlign: 'left', padding: 'var(--gap-md)', fontWeight: '600' }}>Status</th>
                        <th style={{ textAlign: 'left', padding: 'var(--gap-md)', fontWeight: '600' }}>Prioridade</th>
                        <th style={{ textAlign: 'left', padding: 'var(--gap-md)', fontWeight: '600' }}>Categoria</th>
                        <th style={{ textAlign: 'left', padding: 'var(--gap-md)', fontWeight: '600' }}>Criado</th>
                        <th style={{ textAlign: 'center', padding: 'var(--gap-md)', fontWeight: '600' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((ticket) => (
                        <tr 
                          key={ticket.id} 
                          style={{ 
                            borderBottom: '1px solid var(--color-border)',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <td style={{ padding: 'var(--gap-md)' }}>
                            <div>
                              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                {ticket.assunto}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: '1.3' }}>
                                {ticket.descricao.substring(0, 120)}
                                {ticket.descricao.length > 120 && '...'}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: 'var(--gap-md)' }}>
                            {getStatusBadge(ticket.status)}
                          </td>
                          <td style={{ padding: 'var(--gap-md)' }}>
                            {getPriorityBadge(ticket)}
                          </td>
                          <td style={{ padding: 'var(--gap-md)' }}>
                            <div style={{ fontSize: '0.85rem' }}>
                              {ticket.analysis?.classificacao.categoria || 'Não classificado'}
                            </div>
                          </td>
                          <td style={{ padding: 'var(--gap-md)' }}>
                            <div style={{ fontSize: '0.85rem' }}>
                              {formatDate(ticket.createdAt)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                              há {getRelativeTime(ticket.createdAt)}
                            </div>
                          </td>
                          <td style={{ padding: 'var(--gap-md)', textAlign: 'center' }}>
                            <Link 
                              href={`/chamados/${ticket.id}`}
                              className="button button-ghost"
                              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            >
                              Ver Detalhes
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Aba Novo Chamado */}
        {activeTab === 'create' && (
          <TicketForm onSubmit={async (ticket) => {
            // Handle ticket submission
            console.log('Novo chamado:', ticket);
          }} />
        )}

        {/* Aba Empresas */}
        {activeTab === 'empresas' && (
          <EmpresaManager 
            sistema="chamados"
            allowCreate={profile?.role === 'admin' || profile?.role === 'superadmin'}
            allowEdit={profile?.role === 'admin' || profile?.role === 'superadmin'}
            allowDelete={profile?.role === 'superadmin'}
            onEmpresaSelect={(empresa) => {
              console.log('Empresa selecionada para chamados:', empresa);
              // Implementar filtros de tickets por empresa se necessário
            }}
          />
        )}
      </main>
    </div>
  );
}

export default function ChamadosPageWrapper() {
  return (
    <AuthProvider>
      <ChamadosPage />
    </AuthProvider>
  );
}