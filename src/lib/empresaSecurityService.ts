
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  limit,
  Timestamp 
} from 'firebase/firestore';
import { AuthClaims, validateEmpresaAccess, createSecureQuery, sanitizeDataForEmpresa } from './securityHelpers';

export class EmpresaSecurityService {
  private static instance: EmpresaSecurityService;

  static getInstance(): EmpresaSecurityService {
    if (!this.instance) {
      this.instance = new EmpresaSecurityService();
    }
    return this.instance;
  }

  // Validar se empresa pode acessar determinado sistema
  async validateSystemAccess(userClaims: AuthClaims | null, empresaId: string, system: string): Promise<boolean> {
    if (!validateEmpresaAccess(userClaims, empresaId)) {
      return false;
    }

    try {
      const empresaDoc = await getDoc(doc(db, 'empresas', empresaId));
      if (!empresaDoc.exists()) {
        return false;
      }

      const empresaData = empresaDoc.data();
      const sistemasAtivos = empresaData.sistemasAtivos || [];
      
      return sistemasAtivos.includes(system);
    } catch (error) {
      console.error('Erro ao validar acesso ao sistema:', error);
      return false;
    }
  }

  // Buscar dados específicos da empresa de forma segura
  async getEmpresaData(userClaims: AuthClaims | null, empresaId: string): Promise<any> {
    if (!validateEmpresaAccess(userClaims, empresaId)) {
      throw new Error('Acesso negado: você não tem permissão para acessar dados desta empresa');
    }

    try {
      const empresaDoc = await getDoc(doc(db, 'empresas', empresaId));
      if (!empresaDoc.exists()) {
        throw new Error('Empresa não encontrada');
      }

      return {
        id: empresaDoc.id,
        ...empresaDoc.data()
      };
    } catch (error) {
      console.error('Erro ao buscar dados da empresa:', error);
      throw error;
    }
  }

  // Buscar colaboradores da empresa de forma segura
  async getEmpresaColaboradores(userClaims: AuthClaims | null, empresaId: string): Promise<any[]> {
    if (!validateEmpresaAccess(userClaims, empresaId)) {
      throw new Error('Acesso negado: você não tem permissão para acessar colaboradores desta empresa');
    }

    try {
      const colaboradoresQuery = query(
        collection(db, 'users'),
        where('empresaId', '==', empresaId),
        orderBy('displayName', 'asc')
      );

      const snapshot = await getDocs(colaboradoresQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
      throw error;
    }
  }

  // Criar colaborador para empresa específica
  async createEmpresaColaborador(
    userClaims: AuthClaims | null, 
    empresaId: string, 
    colaboradorData: any
  ): Promise<string> {
    if (!validateEmpresaAccess(userClaims, empresaId)) {
      throw new Error('Acesso negado: você não tem permissão para criar colaboradores nesta empresa');
    }

    // Verificar se usuário tem permissão de admin na empresa
    if (!userClaims || !['admin', 'gestor', 'superadmin', 'adminmaster'].includes(userClaims.role || '')) {
      throw new Error('Acesso negado: você não tem permissão para criar colaboradores');
    }

    try {
      const sanitizedData = sanitizeDataForEmpresa(colaboradorData, userClaims, empresaId);
      const colaboradorRef = doc(collection(db, 'users'));
      
      const finalData = {
        ...sanitizedData,
        role: 'colaborador', // Colaboradores sempre têm role padrão
        empresaId: empresaId,
        createdAt: Timestamp.now(),
        createdBy: userClaims.sub || userClaims.empresaId || 'system',
        ativo: true
      };

      await setDoc(colaboradorRef, finalData);
      
      // Log de auditoria
      await this.logEmpresaAction(userClaims, empresaId, 'CREATE_COLABORADOR', {
        colaboradorId: colaboradorRef.id,
        colaboradorEmail: colaboradorData.email
      });

      return colaboradorRef.id;
    } catch (error) {
      console.error('Erro ao criar colaborador:', error);
      throw error;
    }
  }

  // Atualizar dados de colaborador
  async updateEmpresaColaborador(
    userClaims: AuthClaims | null,
    empresaId: string,
    colaboradorId: string,
    updateData: any
  ): Promise<void> {
    if (!validateEmpresaAccess(userClaims, empresaId)) {
      throw new Error('Acesso negado: você não tem permissão para atualizar colaboradores desta empresa');
    }

    try {
      // Verificar se colaborador pertence à empresa
      const colaboradorDoc = await getDoc(doc(db, 'users', colaboradorId));
      if (!colaboradorDoc.exists()) {
        throw new Error('Colaborador não encontrado');
      }

      const colaboradorData = colaboradorDoc.data();
      if (colaboradorData.empresaId !== empresaId) {
        throw new Error('Colaborador não pertence a esta empresa');
      }

      const sanitizedData = sanitizeDataForEmpresa(updateData, userClaims, empresaId);
      
      // Remover campos que não podem ser alterados por empresas
      delete sanitizedData.role;
      delete sanitizedData.empresaId;
      delete sanitizedData.uid;

      await updateDoc(doc(db, 'users', colaboradorId), sanitizedData);

      // Log de auditoria
      await this.logEmpresaAction(userClaims, empresaId, 'UPDATE_COLABORADOR', {
        colaboradorId,
        updatedFields: Object.keys(updateData)
      });
    } catch (error) {
      console.error('Erro ao atualizar colaborador:', error);
      throw error;
    }
  }

  // Buscar dados específicos de um sistema para a empresa
  async getEmpresaSystemData(
    userClaims: AuthClaims | null,
    empresaId: string,
    system: string,
    collectionName: string
  ): Promise<any[]> {
    if (!validateEmpresaAccess(userClaims, empresaId)) {
      throw new Error('Acesso negado: você não tem permissão para acessar dados desta empresa');
    }

    if (!await this.validateSystemAccess(userClaims, empresaId, system)) {
      throw new Error(`Acesso negado: empresa não tem acesso ao sistema ${system}`);
    }

    try {
      const systemQuery = createSecureQuery(
        collection(db, collectionName),
        userClaims,
        empresaId
      );

      const snapshot = await getDocs(systemQuery);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        };
      });
    } catch (error) {
      console.error(`Erro ao buscar dados do sistema ${system}:`, error);
      throw error;
    }
  }

  // Criar registro no sistema específico da empresa
  async createEmpresaSystemRecord(
    userClaims: AuthClaims | null,
    empresaId: string,
    system: string,
    collectionName: string,
    recordData: any
  ): Promise<string> {
    if (!validateEmpresaAccess(userClaims, empresaId)) {
      throw new Error('Acesso negado: você não tem permissão para criar dados nesta empresa');
    }

    if (!await this.validateSystemAccess(userClaims, empresaId, system)) {
      throw new Error(`Acesso negado: empresa não tem acesso ao sistema ${system}`);
    }

    try {
      const sanitizedData = sanitizeDataForEmpresa(recordData, userClaims, empresaId);
      const recordRef = doc(collection(db, collectionName));
      
      const finalData = {
        ...sanitizedData,
        createdAt: Timestamp.now(),
        createdBy: userClaims?.sub || userClaims?.empresaId || 'system'
      };

      await setDoc(recordRef, finalData);

      // Log de auditoria
      await this.logEmpresaAction(userClaims, empresaId, `CREATE_${system.toUpperCase()}_RECORD`, {
        recordId: recordRef.id,
        collection: collectionName
      });

      return recordRef.id;
    } catch (error) {
      console.error(`Erro ao criar registro no sistema ${system}:`, error);
      throw error;
    }
  }

  // Log de ações da empresa para auditoria
  private async logEmpresaAction(
    userClaims: AuthClaims | null,
    empresaId: string,
    action: string,
    details: any
  ): Promise<void> {
    try {
      const logData = {
        empresaId,
        userId: userClaims?.sub || userClaims?.empresaId || 'unknown',
        userEmail: userClaims?.email || 'unknown',
        userRole: userClaims?.role || 'unknown',
        action,
        details,
        timestamp: Timestamp.now(),
        ipAddress: 'client-side', // Em produção seria obtido do servidor
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      };

      await setDoc(doc(collection(db, 'empresa_audit_logs')), logData);
    } catch (error) {
      console.error('Erro ao registrar log de auditoria:', error);
      // Não falhar a operação principal por causa do log
    }
  }

  // Verificar se empresa está ativa e tem permissões
  async validateEmpresaStatus(empresaId: string): Promise<boolean> {
    try {
      const empresaDoc = await getDoc(doc(db, 'empresas', empresaId));
      if (!empresaDoc.exists()) {
        return false;
      }

      const empresaData = empresaDoc.data();
      return empresaData.ativo === true;
    } catch (error) {
      console.error('Erro ao validar status da empresa:', error);
      return false;
    }
  }
}

export const empresaSecurityService = EmpresaSecurityService.getInstance();
