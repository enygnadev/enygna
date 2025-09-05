'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import TicketForm from '@/src/components/TicketForm';
import { Ticket, TicketAnalysis, TicketAudit } from '@/src/types/ticket';
import { useAuth, AuthContext, useAuthData } from '@/src/hooks/useAuth';

// Force dynamic rendering
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

function NovoTicketPageContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const userData = profile;

  const handleAnalyze = async (formData: any): Promise<{ markdown: string; json: TicketAnalysis }> => {
    const response = await fetch('/api/ai/assist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro na análise');
    }

    const result = await response.json();
    return {
      markdown: result.markdown,
      json: result.json
    };
  };

  const handleSubmit = async (ticketData: Omit<Ticket, 'id'>) => {
    setLoading(true);
    try {
      // Criar o ticket no Firestore dentro da nova estrutura de chamados
      const ticketsRef = collection(db, 'chamados/tickets'); // Updated collection path
      const ticketDoc = await addDoc(ticketsRef, {
        ...ticketData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'aberto'
      });

      // Registrar log de auditoria na coleção específica
      await addDoc(collection(db, 'chamados/tickets', ticketDoc.id, 'audit'), {
        ticketId: ticketDoc.id,
        at: Date.now(),
        action: 'create',
        by: userData?.uid || 'unknown',
        byName: userData?.nome || userData?.email || 'Unknown User',
        payload: { ticket: ticketData }
      } as TicketAudit);

      // Redirecionar para o ticket criado na nova rota de chamados
      router.push(`/chamados/${ticketDoc.id}`);

    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/chamados');
  };

  return (
    <div className="container" style={{ minHeight: '100vh', padding: 'var(--gap-xl)' }}>
      {/* Header */}
      <div style={{
        marginBottom: 'var(--gap-xl)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--gap-md)'
      }}>
        <button
          onClick={handleBack}
          className="button button-ghost"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--gap-sm)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Voltar aos Chamados
        </button>

        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
            Novo Chamado de TI
          </h1>
          <p style={{
            margin: '4px 0 0 0',
            color: 'var(--color-text-secondary)',
            fontSize: '0.9rem'
          }}>
            Descreva seu problema e nossa IA ajudará na qualificação
          </p>
        </div>
      </div>

      {/* Guia rápido */}
      <div className="card" style={{
        marginBottom: 'var(--gap-xl)',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <h3 style={{ margin: '0 0 var(--gap-md) 0', display: 'flex', alignItems: 'center', gap: 'var(--gap-sm)' }}>
          💡 Dicas para um bom chamado
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'var(--gap-md)'
        }}>
          <div>
            <strong>📝 Seja específico:</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
              Inclua mensagens de erro exatas, horários e passos para reproduzir
            </p>
          </div>
          <div>
            <strong>🎯 Contexto importante:</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
              Quando começou, quantos usuários afetados, urgência real
            </p>
          </div>
          <div>
            <strong>📎 Evidências:</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
              Prints, logs, IDs de erro ajudam no diagnóstico
            </p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <TicketForm
        onSubmit={handleSubmit}
        onAnalyze={handleAnalyze}
        loading={loading}
        mode="create"
      />
    </div>
  );
}

export default function NovoTicketPage() {
  return (
    <AuthProvider>
      <NovoTicketPageContent />
    </AuthProvider>
  );
}