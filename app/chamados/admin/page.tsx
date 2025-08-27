
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import { useChamadosSessionProfile, canManageTickets } from '@/src/lib/chamadosAuth';
import { ChamadosUserDoc } from '@/src/types/chamados';
import { Ticket } from '@/src/types/ticket';

export default function ChamadosAdminPage() {
  const router = useRouter();
  const { loading: authLoading, profile } = useChamadosSessionProfile();
  const [users, setUsers] = useState<(ChamadosUserDoc & { id: string })[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'tickets' | 'stats'>('stats');

  // Verificar autenticação e permissões
  useEffect(() => {
    if (!authLoading && (!profile || !canManageTickets(profile))) {
      router.push('/chamados');
    }
  }, [authLoading, profile, router]);

  // Carregar dados
  useEffect(() => {
    if (!profile || !canManageTickets(profile)) return;

    const loadData = async () => {
      try {
        // Carregar usuários
        const usersQuery = query(
          collection(db, 'chamados/users'),
          orderBy('createdAt', 'desc')
        );
        
        const usersUnsubscribe = onSnapshot(usersQuery, (snapshot) => {
          const usersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as (ChamadosUserDoc & { id: string })[];
          setUsers(usersData);
        });

        // Carregar tickets
        const ticketsQuery = query(
          collection(db, 'chamados/tickets'),
          orderBy('createdAt', 'desc')
        );

        const ticketsUnsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
          const ticketsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Ticket[];
          setTickets(ticketsData);
        });

        setLoading(false);

        return () => {
          usersUnsubscribe();
          ticketsUnsubscribe();
        };
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [profile]);

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'chamados/users', userId), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      alert('Erro ao atualizar permissões do usuário');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--gap-md)' }}>⚙️</div>
          <div>Carregando painel administrativo...</div>
        </div>
      </div>
    );
  }

  if (!profile || !canManageTickets(profile)) {
    return null;
  }

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive !== false).length,
    totalTickets: tickets.length,
    openTickets: tickets.filter(t => t.status === 'aberto').length,
    inProgressTickets: tickets.filter(t => t.status === 'em_andamento').length,
    resolvedTickets: tickets.filter(t => t.status === 'resolvido').length,
  };

  return (
    <div className="container" style={{ minHeight: '100vh', padding: 'var(--gap-xl)' }}>
      {/* Header */}
      <div style={{ 
        marginBottom: 'var(--gap-xl)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 'var(--gap-md)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
            Administração de Chamados
          </h1>
          <p style={{ 
            margin: '4px 0 0 0', 
            color: 'var(--color-text-secondary)',
            fontSize: '0.9rem'
          }}>
            Painel administrativo do sistema de chamados
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--gap-sm)' }}>
          <Link href="/chamados" className="button button-ghost">
            ← Voltar aos Chamados
          </Link>
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

      {/* Tabs */}
      <div style={{ 
        borderBottom: '2px solid var(--color-border)', 
        marginBottom: 'var(--gap-lg)' 
      }}>
        <div style={{ display: 'flex', gap: 'var(--gap-sm)' }}>
          {(['stats', 'tickets', 'users'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="button button-ghost"
              style={{
                borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : 'none',
                borderRadius: '0',
                marginBottom: '-2px'
              }}
            >
              {tab === 'stats' && '📊 Estatísticas'}
              {tab === 'tickets' && '🎫 Chamados'}
              {tab === 'users' && '👥 Usuários'}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo das tabs */}
      {activeTab === 'stats' && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--gap-md)',
            marginBottom: 'var(--gap-xl)'
          }}>
            <div className="card" style={{ textAlign: 'center', padding: 'var(--gap-md)' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                {stats.totalUsers}
              </div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                Total de Usuários
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: 'var(--gap-md)' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
                {stats.activeUsers}
              </div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                Usuários Ativos
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: 'var(--gap-md)' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                {stats.totalTickets}
              </div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                Total de Chamados
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: 'var(--gap-md)' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>
                {stats.openTickets}
              </div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                Chamados Abertos
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Gerenciar Usuários</h3>
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: 'var(--gap-md)' }}>Usuário</th>
                  <th style={{ textAlign: 'left', padding: 'var(--gap-md)' }}>Role</th>
                  <th style={{ textAlign: 'left', padding: 'var(--gap-md)' }}>Departamento</th>
                  <th style={{ textAlign: 'left', padding: 'var(--gap-md)' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: 'var(--gap-md)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--gap-md)' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>{user.displayName || 'Sem nome'}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                          {user.email}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: 'var(--gap-md)' }}>
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="input"
                        style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                      >
                        <option value="colaborador">Colaborador</option>
                        <option value="gestor">Gestor</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: 'var(--gap-md)' }}>
                      <span style={{ fontSize: '0.85rem' }}>
                        {user.departamento || 'Não informado'}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--gap-md)' }}>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: user.isActive !== false ? '#10b981' : '#6b7280',
                          color: 'white',
                          fontSize: '0.75rem'
                        }}
                      >
                        {user.isActive !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--gap-md)', textAlign: 'center' }}>
                      <button
                        className="button button-ghost"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Todos os Chamados</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            {tickets.length} chamados no total
          </p>
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: 'var(--gap-md)' }}>Chamado</th>
                  <th style={{ textAlign: 'left', padding: 'var(--gap-md)' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: 'var(--gap-md)' }}>Criado por</th>
                  <th style={{ textAlign: 'left', padding: 'var(--gap-md)' }}>Data</th>
                  <th style={{ textAlign: 'center', padding: 'var(--gap-md)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {tickets.slice(0, 50).map((ticket) => (
                  <tr key={ticket.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--gap-md)' }}>
                      <div>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          {ticket.assunto}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                          {ticket.descricao.substring(0, 80)}...
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: 'var(--gap-md)' }}>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: 
                            ticket.status === 'aberto' ? '#3b82f6' :
                            ticket.status === 'em_andamento' ? '#f59e0b' :
                            ticket.status === 'resolvido' ? '#10b981' : '#6b7280',
                          color: 'white',
                          fontSize: '0.75rem'
                        }}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--gap-md)' }}>
                      <span style={{ fontSize: '0.85rem' }}>
                        {ticket.createdBy || 'Desconhecido'}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--gap-md)' }}>
                      <span style={{ fontSize: '0.85rem' }}>
                        {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--gap-md)', textAlign: 'center' }}>
                      <Link 
                        href={`/chamados/${ticket.id}`}
                        className="button button-ghost"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
