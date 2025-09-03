import { db } from './firebase';
import { doc, updateDoc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

export interface PlanStatus {
  planId: string;
  status: 'active' | 'paused' | 'expired' | 'permanent';
  expiresAt?: Date;
  lastPayment?: Date;
  nextPayment?: Date;
  warningsSent: number;
  gracePeriodEnd?: Date;
  pausedAt?: Date;
  pausedReason?: string;
}

export interface PlanConfig {
  id: string;
  name: string;
  price: number;
  period: 'month' | 'year' | 'permanent';
  features: string[];
  maxEmployees: number;
  maxCompanies: number;
  gracePeriodDays: number;
  warningDays: number[];
}

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Gratuito',
    price: 0,
    period: 'month',
    features: ['basic_reports', 'time_tracking'],
    maxEmployees: 5,
    maxCompanies: 1,
    gracePeriodDays: 7,
    warningDays: [30, 15, 7, 3, 1]
  },
  monthly: {
    id: 'monthly',
    name: 'Mensal',
    price: 29.90,
    period: 'month',
    features: ['advanced_reports', 'gps_tracking', 'export'],
    maxEmployees: 50,
    maxCompanies: 1,
    gracePeriodDays: 7,
    warningDays: [15, 7, 3, 1]
  },
  yearly: {
    id: 'yearly',
    name: 'Anual',
    price: 239.20,
    period: 'year',
    features: ['premium_reports', 'analytics', 'priority_support'],
    maxEmployees: 50,
    maxCompanies: 1,
    gracePeriodDays: 14,
    warningDays: [30, 15, 7, 3, 1]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Empresarial',
    price: 99.90,
    period: 'month',
    features: ['unlimited_everything', 'custom_features'],
    maxEmployees: 999,
    maxCompanies: 10,
    gracePeriodDays: 30,
    warningDays: [30, 15, 7, 3, 1]
  },
  permanent: {
    id: 'permanent',
    name: 'Permanente',
    price: 2999.99,
    period: 'permanent',
    features: ['lifetime_access', 'all_features', 'priority_support'],
    maxEmployees: 999,
    maxCompanies: 999,
    gracePeriodDays: 0,
    warningDays: []
  }
};

class AutomaticPlanManager {

  // Inicializar monitoramento automático
  async initializeAutomaticMonitoring(): Promise<void> {
    console.log('🚀 Inicializando monitoramento automático de planos...');

    // Verificar planos a cada hora
    setInterval(() => {
      this.checkAllPlans();
    }, 60 * 60 * 1000); // 1 hora

    // Verificação inicial
    await this.checkAllPlans();
  }

  // Verificar todos os planos ativos
  async checkAllPlans(): Promise<void> {
    try {
      console.log('🔍 Verificando status de todos os planos...');

      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);

      for (const userDoc of snapshot.docs) {
        const userData = userDoc.data();
        if (userData.plan && userData.plan !== 'free') {
          await this.checkUserPlan(userDoc.id, userData);
        }
      }

      console.log('✅ Verificação de planos concluída');
    } catch (error) {
      console.error('❌ Erro ao verificar planos:', error);
    }
  }

  // Verificar plano específico do usuário
  async checkUserPlan(userId: string, userData: any): Promise<void> {
    try {
      const planConfig = PLAN_CONFIGS[userData.plan];
      if (!planConfig) return;

      // Planos permanentes não expiram
      if (planConfig.period === 'permanent') {
        await this.ensurePermanentPlanActive(userId);
        return;
      }

      const planStatus = await this.getPlanStatus(userId);
      const now = new Date();

      // Verificar se está no período de aviso
      if (planStatus.expiresAt && planStatus.status === 'active') {
        const daysUntilExpiry = Math.ceil((planStatus.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Enviar avisos conforme configurado
        if (planConfig.warningDays.includes(daysUntilExpiry)) {
          await this.sendExpirationWarning(userId, daysUntilExpiry, planConfig);
        }

        // Verificar se expirou
        if (now >= planStatus.expiresAt) {
          await this.handlePlanExpiration(userId, planConfig);
        }
      }

      // Verificar se está no período de graça
      if (planStatus.status === 'expired' && planStatus.gracePeriodEnd) {
        if (now >= planStatus.gracePeriodEnd) {
          await this.pausePlan(userId, 'Período de graça expirado');
        }
      }

    } catch (error) {
      console.error('❌ Erro ao verificar plano do usuário:', userId, error);
    }
  }

  // Obter status atual do plano
  async getPlanStatus(userId: string): Promise<PlanStatus> {
    try {
      const statusDoc = await getDoc(doc(db, 'plan_status', userId));

      if (statusDoc.exists()) {
        const data = statusDoc.data();
        return {
          planId: data.planId || '',
          status: data.status || 'active',
          warningsSent: data.warningsSent || 0,
          expiresAt: data.expiresAt?.toDate(),
          lastPayment: data.lastPayment?.toDate(),
          nextPayment: data.nextPayment?.toDate(),
          gracePeriodEnd: data.gracePeriodEnd?.toDate(),
          pausedAt: data.pausedAt?.toDate()
        };
      }

      // Status padrão se não existe
      return {
        planId: 'free',
        status: 'active',
        warningsSent: 0
      };
    } catch (error) {
      console.error('❌ Erro ao obter status do plano:', error);
      throw error;
    }
  }

  // Atualizar status do plano
  async updatePlanStatus(userId: string, status: Partial<PlanStatus>): Promise<void> {
    try {
      const statusRef = doc(db, 'plan_status', userId);
      await setDoc(statusRef, {
        ...status,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('❌ Erro ao atualizar status do plano:', error);
      throw error;
    }
  }

  // Ativar plano automaticamente
  async activatePlan(userId: string, planId: string, paymentData?: any): Promise<void> {
    try {
      console.log(`🟢 Ativando plano ${planId} para usuário ${userId}`);

      const planConfig = PLAN_CONFIGS[planId];
      if (!planConfig) throw new Error('Plano não encontrado');

      const now = new Date();
      let expiresAt: Date | undefined;
      let nextPayment: Date | undefined;

      // Calcular data de expiração
      if (planConfig.period === 'month') {
        expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        nextPayment = new Date(expiresAt.getTime());
      } else if (planConfig.period === 'year') {
        expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        nextPayment = new Date(expiresAt.getTime());
      }
      // Planos permanentes não tem expiração

      // Atualizar usuário
      await updateDoc(doc(db, 'users', userId), {
        plan: planId,
        planActivatedAt: serverTimestamp(),
        planUpdatedAt: serverTimestamp()
      });

      // Atualizar status do plano
      await this.updatePlanStatus(userId, {
        planId,
        status: 'active',
        expiresAt,
        lastPayment: now,
        nextPayment,
        warningsSent: 0,
        gracePeriodEnd: undefined,
        pausedAt: undefined,
        pausedReason: undefined
      });

      // Log da ativação
      await this.logPlanAction(userId, 'plan_activated', {
        planId,
        paymentData,
        expiresAt: expiresAt?.toISOString()
      });

      console.log(`✅ Plano ${planId} ativado com sucesso para ${userId}`);
    } catch (error) {
      console.error('❌ Erro ao ativar plano:', error);
      throw error;
    }
  }

  // Pausar plano manualmente ou automaticamente
  async pausePlan(userId: string, reason: string, manual: boolean = false): Promise<void> {
    try {
      console.log(`⏸️ Pausando plano para usuário ${userId}. Motivo: ${reason}`);

      // Atualizar usuário para plano gratuito
      await updateDoc(doc(db, 'users', userId), {
        plan: 'free',
        planPausedAt: serverTimestamp(),
        planPausedReason: reason
      });

      // Atualizar status
      await this.updatePlanStatus(userId, {
        status: 'paused',
        pausedAt: new Date(),
        pausedReason: reason
      });

      // Log da pausa
      await this.logPlanAction(userId, 'plan_paused', {
        reason,
        manual,
        pausedAt: new Date().toISOString()
      });

      // Notificar usuário
      await this.sendNotification(userId, 'plan_paused', {
        reason,
        manual
      });

      console.log(`✅ Plano pausado com sucesso para ${userId}`);
    } catch (error) {
      console.error('❌ Erro ao pausar plano:', error);
      throw error;
    }
  }

  // Reativar plano pausado
  async resumePlan(userId: string, planId?: string): Promise<void> {
    try {
      const planStatus = await this.getPlanStatus(userId);
      const targetPlanId = planId || planStatus.planId;

      console.log(`▶️ Reativando plano ${targetPlanId} para usuário ${userId}`);

      await this.activatePlan(userId, targetPlanId);

      // Log da reativação
      await this.logPlanAction(userId, 'plan_resumed', {
        planId: targetPlanId,
        resumedAt: new Date().toISOString()
      });

      console.log(`✅ Plano reativado com sucesso para ${userId}`);
    } catch (error) {
      console.error('❌ Erro ao reativar plano:', error);
      throw error;
    }
  }

  // Garantir que plano permanente esteja ativo
  async ensurePermanentPlanActive(userId: string): Promise<void> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();

      if (userData?.plan === 'permanent') {
        await this.updatePlanStatus(userId, {
          planId: 'permanent',
          status: 'active'
        });
      }
    } catch (error) {
      console.error('❌ Erro ao garantir plano permanente:', error);
    }
  }

  // Processar expiração do plano
  async handlePlanExpiration(userId: string, planConfig: PlanConfig): Promise<void> {
    try {
      console.log(`⏰ Plano expirado para usuário ${userId}`);

      const gracePeriodEnd = new Date(Date.now() + planConfig.gracePeriodDays * 24 * 60 * 60 * 1000);

      // Atualizar status para expirado
      await this.updatePlanStatus(userId, {
        status: 'expired',
        gracePeriodEnd
      });

      // Notificar usuário
      await this.sendNotification(userId, 'plan_expired', {
        gracePeriodDays: planConfig.gracePeriodDays,
        gracePeriodEnd: gracePeriodEnd.toISOString()
      });

      // Log da expiração
      await this.logPlanAction(userId, 'plan_expired', {
        planId: planConfig.id,
        gracePeriodEnd: gracePeriodEnd.toISOString()
      });

    } catch (error) {
      console.error('❌ Erro ao processar expiração:', error);
    }
  }

  // Enviar aviso de expiração
  async sendExpirationWarning(userId: string, daysLeft: number, planConfig: PlanConfig): Promise<void> {
    try {
      console.log(`⚠️ Enviando aviso de expiração para ${userId}. ${daysLeft} dias restantes`);

      await this.sendNotification(userId, 'expiration_warning', {
        daysLeft,
        planName: planConfig.name,
        planPrice: planConfig.price
      });

      // Incrementar contador de avisos
      const planStatus = await this.getPlanStatus(userId);
      await this.updatePlanStatus(userId, {
        warningsSent: planStatus.warningsSent + 1
      });

      // Log do aviso
      await this.logPlanAction(userId, 'warning_sent', {
        daysLeft,
        warningCount: planStatus.warningsSent + 1
      });

    } catch (error) {
      console.error('❌ Erro ao enviar aviso:', error);
    }
  }

  // Enviar notificação para o usuário
  async sendNotification(userId: string, type: string, data: any): Promise<void> {
    try {
      const notificationRef = doc(collection(db, 'notifications'));
      await setDoc(notificationRef, {
        userId,
        type,
        data,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Erro ao enviar notificação:', error);
    }
  }

  // Log de ações do plano
  async logPlanAction(userId: string, action: string, data: any): Promise<void> {
    try {
      const logRef = doc(collection(db, 'plan_logs'));
      await setDoc(logRef, {
        userId,
        action,
        data,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Erro ao registrar log:', error);
    }
  }

  // Verificar se usuário pode usar funcionalidade
  async canUseFeature(userId: string, feature: string): Promise<boolean> {
    try {
      const planStatus = await this.getPlanStatus(userId);

      // Se o plano está pausado, só permite funcionalidades básicas
      if (planStatus.status === 'paused') {
        return ['basic_reports', 'time_tracking'].includes(feature);
      }

      // Se o plano está expirado, permite apenas visualização
      if (planStatus.status === 'expired') {
        return ['view_only'].includes(feature);
      }

      // Verificar se o plano atual inclui a funcionalidade
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      const planConfig = PLAN_CONFIGS[userData?.plan || 'free'];

      return planConfig?.features.includes(feature) || false;
    } catch (error) {
      console.error('❌ Erro ao verificar funcionalidade:', error);
      return false;
    }
  }

  // Obter informações detalhadas do plano
  async getPlanInfo(userId: string): Promise<any> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      const planStatus = await this.getPlanStatus(userId);
      const planConfig = PLAN_CONFIGS[userData?.plan || 'free'];

      return {
        config: planConfig,
        status: planStatus,
        userData: {
          plan: userData?.plan,
          planActivatedAt: userData?.planActivatedAt,
          planPausedAt: userData?.planPausedAt,
          planPausedReason: userData?.planPausedReason
        }
      };
    } catch (error) {
      console.error('❌ Erro ao obter informações do plano:', error);
      throw error;
    }
  }
}

export const automaticPlanManager = new AutomaticPlanManager();

// Inicializar monitoramento quando o módulo for carregado
if (typeof window !== 'undefined') {
  automaticPlanManager.initializeAutomaticMonitoring();
}