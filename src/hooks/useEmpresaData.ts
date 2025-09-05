
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { empresaSecurityService } from '@/src/lib/empresaSecurityService';

interface UseEmpresaDataOptions {
  empresaId: string;
  system?: string;
  collectionName?: string;
  autoLoad?: boolean;
}

export function useEmpresaData({ empresaId, system, collectionName, autoLoad = true }: UseEmpresaDataOptions) {
  const { profile, hasEmpresaAccess } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [empresaInfo, setEmpresaInfo] = useState<any>(null);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados da empresa
  const loadEmpresaData = async () => {
    if (!profile || !hasEmpresaAccess(empresaId)) {
      setError('Acesso negado à empresa');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Buscar informações da empresa
      const empresaData = await empresaSecurityService.getEmpresaData(
        profile.claims || null,
        empresaId
      );
      setEmpresaInfo(empresaData);

      // Buscar colaboradores
      const colaboradoresData = await empresaSecurityService.getEmpresaColaboradores(
        profile.claims || null,
        empresaId
      );
      setColaboradores(colaboradoresData);

      // Buscar dados do sistema específico se informado
      if (system && collectionName) {
        const systemData = await empresaSecurityService.getEmpresaSystemData(
          profile.claims || null,
          empresaId,
          system,
          collectionName
        );
        setData(systemData);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados da empresa');
      console.error('Erro ao carregar dados da empresa:', err);
    } finally {
      setLoading(false);
    }
  };

  // Criar colaborador
  const createColaborador = async (colaboradorData: any) => {
    if (!profile || !hasEmpresaAccess(empresaId)) {
      throw new Error('Acesso negado à empresa');
    }

    try {
      const colaboradorId = await empresaSecurityService.createEmpresaColaborador(
        profile.claims || null,
        empresaId,
        colaboradorData
      );

      // Recarregar colaboradores
      const colaboradoresData = await empresaSecurityService.getEmpresaColaboradores(
        profile.claims || null,
        empresaId
      );
      setColaboradores(colaboradoresData);

      return colaboradorId;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar colaborador');
      throw err;
    }
  };

  // Atualizar colaborador
  const updateColaborador = async (colaboradorId: string, updateData: any) => {
    if (!profile || !hasEmpresaAccess(empresaId)) {
      throw new Error('Acesso negado à empresa');
    }

    try {
      await empresaSecurityService.updateEmpresaColaborador(
        profile.claims || null,
        empresaId,
        colaboradorId,
        updateData
      );

      // Recarregar colaboradores
      const colaboradoresData = await empresaSecurityService.getEmpresaColaboradores(
        profile.claims || null,
        empresaId
      );
      setColaboradores(colaboradoresData);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar colaborador');
      throw err;
    }
  };

  // Criar registro no sistema
  const createSystemRecord = async (recordData: any) => {
    if (!profile || !hasEmpresaAccess(empresaId) || !system || !collectionName) {
      throw new Error('Acesso negado ou sistema não especificado');
    }

    try {
      const recordId = await empresaSecurityService.createEmpresaSystemRecord(
        profile.claims || null,
        empresaId,
        system,
        collectionName,
        recordData
      );

      // Recarregar dados do sistema
      const systemData = await empresaSecurityService.getEmpresaSystemData(
        profile.claims || null,
        empresaId,
        system,
        collectionName
      );
      setData(systemData);

      return recordId;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar registro');
      throw err;
    }
  };

  useEffect(() => {
    if (autoLoad && profile && empresaId) {
      loadEmpresaData();
    }
  }, [profile, empresaId, system, collectionName, autoLoad]);

  return {
    data,
    empresaInfo,
    colaboradores,
    loading,
    error,
    loadEmpresaData,
    createColaborador,
    updateColaborador,
    createSystemRecord,
    refresh: loadEmpresaData
  };
}
