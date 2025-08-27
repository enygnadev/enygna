
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface PlanLimits {
  maxEmployees: number;
  maxCompanies: number;
  features: string[];
  price: number;
  period: 'month' | 'year' | 'free';
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxEmployees: 5,
    maxCompanies: 1,
    features: ['basic_reports', 'time_tracking', 'mobile_app'],
    price: 0,
    period: 'free'
  },
  monthly: {
    maxEmployees: 50,
    maxCompanies: 1,
    features: ['advanced_reports', 'gps_tracking', 'pdf_export', 'security'],
    price: 29.90,
    period: 'month'
  },
  yearly: {
    maxEmployees: 50,
    maxCompanies: 1,
    features: ['premium_reports', 'gps_tracking', 'unlimited_export', 'enterprise_security', 'support_24_7', 'analytics'],
    price: 239.20,
    period: 'year'
  },
  enterprise: {
    maxEmployees: 999,
    maxCompanies: 10,
    features: ['custom_reports', 'api_integrations', 'multi_tenant', 'dedicated_support', 'training', 'sla'],
    price: 99.90,
    period: 'month'
  },
  permanent: {
    maxEmployees: 999,
    maxCompanies: 999,
    features: ['lifetime_access', 'all_features', 'priority_support', 'unlimited_everything'],
    price: 2999.99,
    period: 'free'
  }
};

export class PlanManager {
  // Verificar se o usuário pode adicionar mais funcionários
  static async canAddEmployee(userId: string): Promise<{ can: boolean; currentCount: number; limit: number }> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return { can: false, currentCount: 0, limit: 0 };
      }

      const userData = userDoc.data();
      const plan = userData.plan || 'free';
      const limits = PLAN_LIMITS[plan];

      if (!limits) {
        return { can: false, currentCount: 0, limit: 0 };
      }

      // Aqui você implementaria a lógica para contar funcionários atuais
      // Por simplicidade, retornando valores de exemplo
      const currentCount = userData.employeeCount || 0;

      return {
        can: currentCount < limits.maxEmployees,
        currentCount,
        limit: limits.maxEmployees
      };
    } catch (error) {
      console.error('Erro ao verificar limite de funcionários:', error);
      return { can: false, currentCount: 0, limit: 0 };
    }
  }

  // Verificar se o usuário pode criar mais empresas
  static async canAddCompany(userId: string): Promise<{ can: boolean; currentCount: number; limit: number }> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return { can: false, currentCount: 0, limit: 0 };
      }

      const userData = userDoc.data();
      const plan = userData.plan || 'free';
      const limits = PLAN_LIMITS[plan];

      if (!limits) {
        return { can: false, currentCount: 0, limit: 0 };
      }

      const currentCount = userData.companyCount || 0;

      return {
        can: currentCount < limits.maxCompanies,
        currentCount,
        limit: limits.maxCompanies
      };
    } catch (error) {
      console.error('Erro ao verificar limite de empresas:', error);
      return { can: false, currentCount: 0, limit: 0 };
    }
  }

  // Verificar se o usuário tem acesso a uma feature específica
  static async hasFeature(userId: string, feature: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data();
      const plan = userData.plan || 'free';
      const limits = PLAN_LIMITS[plan];

      return limits?.features.includes(feature) || false;
    } catch (error) {
      console.error('Erro ao verificar feature:', error);
      return false;
    }
  }

  // Verificar se o plano está ativo (não expirado)
  static async isPlanActive(userId: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data();
      const planExpiresAt = userData.planExpiresAt;

      if (!planExpiresAt) {
        return true; // Se não tem data de expiração, considera ativo
      }

      return new Date(planExpiresAt) > new Date();
    } catch (error) {
      console.error('Erro ao verificar status do plano:', error);
      return false;
    }
  }

  // Obter informações do plano atual
  static async getCurrentPlan(userId: string): Promise<{ plan: string; limits: PlanLimits; active: boolean }> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return { plan: 'free', limits: PLAN_LIMITS.free, active: false };
      }

      const userData = userDoc.data();
      const plan = userData.plan || 'free';
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
      const active = await this.isPlanActive(userId);

      return { plan, limits, active };
    } catch (error) {
      console.error('Erro ao obter plano atual:', error);
      return { plan: 'free', limits: PLAN_LIMITS.free, active: false };
    }
  }
}
