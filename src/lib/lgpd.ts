
// src/lib/lgpd.ts - Serviço completo de LGPD
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

export interface LGPDConsent {
  userId: string;
  dataProcessing: boolean;
  dataSharing: boolean;
  marketing: boolean;
  fileStorage: boolean;
  analytics: boolean;
  consentDate: Date;
  ipAddress?: string;
  userAgent?: string;
  version: string;
}

export interface DataRequest {
  id: string;
  userId: string;
  type: 'access' | 'portability' | 'deletion' | 'rectification';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestDate: Date;
  completedDate?: Date;
  description: string;
  data?: any;
}

export interface DataProcessingLog {
  id: string;
  userId: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'export';
  dataType: string;
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

class LGPDService {
  private readonly CURRENT_CONSENT_VERSION = '2024.1';

  // Registrar consentimento do usuário
  async recordConsent(consent: Omit<LGPDConsent, 'consentDate' | 'version'>): Promise<void> {
    try {
      const consentData: LGPDConsent = {
        ...consent,
        consentDate: new Date(),
        version: this.CURRENT_CONSENT_VERSION
      };

      await setDoc(doc(db, 'lgpd_consent', consent.userId), {
        ...consentData,
        consentDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Log da ação
      await this.logDataProcessing({
        userId: consent.userId,
        action: 'create',
        dataType: 'consent',
        purpose: 'LGPD compliance',
        legalBasis: 'consent',
        timestamp: new Date(),
        ipAddress: consent.ipAddress,
        userAgent: consent.userAgent
      });

    } catch (error) {
      console.error('Erro ao registrar consentimento:', error);
      throw error;
    }
  }

  // Verificar consentimento
  async checkConsent(userId: string): Promise<LGPDConsent | null> {
    try {
      const consentDoc = await getDoc(doc(db, 'lgpd_consent', userId));
      
      if (!consentDoc.exists()) {
        return null;
      }

      const data = consentDoc.data();
      return {
        userId,
        dataProcessing: data.dataProcessing || false,
        dataSharing: data.dataSharing || false,
        marketing: data.marketing || false,
        fileStorage: data.fileStorage || false,
        analytics: data.analytics || false,
        consentDate: data.consentDate?.toDate() || new Date(),
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        version: data.version || '1.0'
      };

    } catch (error) {
      console.error('Erro ao verificar consentimento:', error);
      return null;
    }
  }

  // Atualizar consentimento
  async updateConsent(userId: string, updates: Partial<LGPDConsent>): Promise<void> {
    try {
      await updateDoc(doc(db, 'lgpd_consent', userId), {
        ...updates,
        updatedAt: serverTimestamp(),
        version: this.CURRENT_CONSENT_VERSION
      });

      await this.logDataProcessing({
        userId,
        action: 'update',
        dataType: 'consent',
        purpose: 'Consent update',
        legalBasis: 'consent',
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Erro ao atualizar consentimento:', error);
      throw error;
    }
  }

  // Solicitar dados (Direito de Acesso)
  async requestData(userId: string, type: DataRequest['type'], description: string): Promise<string> {
    try {
      const requestRef = doc(collection(db, 'lgpd_requests'));
      const request: DataRequest = {
        id: requestRef.id,
        userId,
        type,
        status: 'pending',
        requestDate: new Date(),
        description
      };

      await setDoc(requestRef, {
        ...request,
        requestDate: serverTimestamp()
      });

      await this.logDataProcessing({
        userId,
        action: 'create',
        dataType: 'data_request',
        purpose: `Data ${type} request`,
        legalBasis: 'consent',
        timestamp: new Date()
      });

      return requestRef.id;

    } catch (error) {
      console.error('Erro ao solicitar dados:', error);
      throw error;
    }
  }

  // Exportar dados do usuário (Portabilidade)
  async exportUserData(userId: string): Promise<any> {
    try {
      const userData: any = {
        exportDate: new Date().toISOString(),
        userId,
        data: {}
      };

      // Coletar dados do usuário
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        userData.data.profile = userDoc.data();
      }

      // Coletar sessões
      const sessionsQuery = query(
        collection(db, 'users', userId, 'sessions'),
        where('userId', '==', userId)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      userData.data.sessions = sessionsSnapshot.docs.map(doc => doc.data());

      // Coletar documentos financeiros
      const financeiroQuery = query(
        collection(db, 'financeiro_documentos'),
        where('userId', '==', userId)
      );
      const financeiroSnapshot = await getDocs(financeiroQuery);
      userData.data.financeiro = financeiroSnapshot.docs.map(doc => doc.data());

      // Coletar chamados
      const chamadosQuery = query(
        collection(db, 'chamados/tickets'),
        where('userId', '==', userId)
      );
      const chamadosSnapshot = await getDocs(chamadosQuery);
      userData.data.chamados = chamadosSnapshot.docs.map(doc => doc.data());

      await this.logDataProcessing({
        userId,
        action: 'export',
        dataType: 'complete_profile',
        purpose: 'Data portability',
        legalBasis: 'consent',
        timestamp: new Date()
      });

      return userData;

    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      throw error;
    }
  }

  // Deletar dados do usuário (Direito ao Esquecimento)
  async deleteUserData(userId: string, keepEssential: boolean = true): Promise<void> {
    try {
      const batch = writeBatch(db);

      if (!keepEssential) {
        // Deletar dados principais
        batch.delete(doc(db, 'users', userId));
        batch.delete(doc(db, 'lgpd_consent', userId));
      } else {
        // Anonimizar dados essenciais
        batch.update(doc(db, 'users', userId), {
          email: `deleted-${userId}@anonimizado.com`,
          displayName: 'Usuário Deletado',
          telefone: null,
          endereco: null,
          cpf: null,
          deletedAt: serverTimestamp(),
          gdprDeleted: true
        });
      }

      // Deletar sessões
      const sessionsSnapshot = await getDocs(collection(db, 'users', userId, 'sessions'));
      sessionsSnapshot.docs.forEach(sessionDoc => {
        batch.delete(sessionDoc.ref);
      });

      // Deletar documentos financeiros pessoais
      const financeiroQuery = query(
        collection(db, 'financeiro_documentos'),
        where('userId', '==', userId)
      );
      const financeiroSnapshot = await getDocs(financeiroQuery);
      financeiroSnapshot.docs.forEach(docRef => {
        if (keepEssential) {
          batch.update(docRef.ref, {
            userId: 'deleted-user',
            dadosPessoais: null,
            gdprDeleted: true
          });
        } else {
          batch.delete(docRef.ref);
        }
      });

      await batch.commit();

      await this.logDataProcessing({
        userId: keepEssential ? 'system' : userId,
        action: 'delete',
        dataType: 'complete_profile',
        purpose: 'Right to be forgotten',
        legalBasis: 'consent',
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Erro ao deletar dados do usuário:', error);
      throw error;
    }
  }

  // Log de processamento de dados
  async logDataProcessing(log: Omit<DataProcessingLog, 'id'>): Promise<void> {
    try {
      const logRef = doc(collection(db, 'data_processing_log'));
      await setDoc(logRef, {
        ...log,
        id: logRef.id,
        timestamp: serverTimestamp()
      });

    } catch (error) {
      console.error('Erro ao registrar log de processamento:', error);
    }
  }

  // Verificar se precisa renovar consentimento
  needsConsentRenewal(consent: LGPDConsent): boolean {
    if (!consent) return true;
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    return consent.consentDate < oneYearAgo || consent.version !== this.CURRENT_CONSENT_VERSION;
  }

  // Gerar relatório de conformidade
  async generateComplianceReport(empresaId: string): Promise<any> {
    try {
      const report = {
        generatedAt: new Date().toISOString(),
        empresaId,
        statistics: {
          totalUsers: 0,
          usersWithConsent: 0,
          pendingRequests: 0,
          completedRequests: 0,
          deletedUsers: 0
        },
        recentActivity: []
      };

      // Contar usuários com consentimento
      const consentSnapshot = await getDocs(collection(db, 'lgpd_consent'));
      report.statistics.usersWithConsent = consentSnapshot.size;

      // Contar solicitações pendentes
      const pendingQuery = query(
        collection(db, 'lgpd_requests'),
        where('status', '==', 'pending')
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      report.statistics.pendingRequests = pendingSnapshot.size;

      return report;

    } catch (error) {
      console.error('Erro ao gerar relatório de conformidade:', error);
      throw error;
    }
  }
}

export const lgpdService = new LGPDService();

// Hook para React
export function useLGPD() {
  const recordConsent = async (consent: Omit<LGPDConsent, 'consentDate' | 'version'>) => {
    return await lgpdService.recordConsent(consent);
  };

  const checkConsent = async (userId: string) => {
    return await lgpdService.checkConsent(userId);
  };

  const requestData = async (userId: string, type: DataRequest['type'], description: string) => {
    return await lgpdService.requestData(userId, type, description);
  };

  const exportData = async (userId: string) => {
    return await lgpdService.exportUserData(userId);
  };

  const deleteData = async (userId: string, keepEssential: boolean = true) => {
    return await lgpdService.deleteUserData(userId, keepEssential);
  };

  return {
    recordConsent,
    checkConsent,
    requestData,
    exportData,
    deleteData,
    needsRenewal: lgpdService.needsConsentRenewal
  };
}
