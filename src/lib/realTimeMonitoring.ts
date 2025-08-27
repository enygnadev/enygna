
import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  addDoc
} from 'firebase/firestore';

interface MonitoringAlert {
  id?: string;
  type: 'geofence_violation' | 'suspicious_activity' | 'overtime' | 'late_punch' | 'system_error';
  companyId: string;
  employeeId?: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, any>;
}

interface SystemMetrics {
  totalActiveUsers: number;
  totalActiveSessions: number;
  averageResponseTime: number;
  errorRate: number;
  lastUpdated: Date;
}

class RealTimeMonitoring {
  private alertListeners: Map<string, () => void> = new Map();
  private metricsCache: SystemMetrics | null = null;
  private cacheExpiry: Date | null = null;

  // Monitoramento de alertas em tempo real
  subscribeToAlerts(companyId: string, callback: (alerts: MonitoringAlert[]) => void): () => void {
    const alertsRef = collection(db, 'companies', companyId, 'alerts');
    const alertsQuery = query(
      alertsRef,
      where('resolved', '==', false),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(alertsQuery, (snapshot) => {
      const alerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as MonitoringAlert[];
      
      callback(alerts);
    });

    this.alertListeners.set(companyId, unsubscribe);
    return unsubscribe;
  }

  // Criar alerta
  async createAlert(alert: Omit<MonitoringAlert, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    try {
      await addDoc(collection(db, 'companies', alert.companyId, 'alerts'), {
        ...alert,
        timestamp: Timestamp.now(),
        resolved: false
      });
    } catch (error) {
      console.error('Erro ao criar alerta:', error);
    }
  }

  // Resolver alerta
  async resolveAlert(companyId: string, alertId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'companies', companyId, 'alerts', alertId), {
        resolved: true,
        resolvedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
    }
  }

  // Métricas do sistema em tempo real
  async getSystemMetrics(): Promise<SystemMetrics> {
    // Cache por 30 segundos
    if (this.metricsCache && this.cacheExpiry && new Date() < this.cacheExpiry) {
      return this.metricsCache;
    }

    try {
      // Simular métricas - em produção você faria queries reais
      const metrics: SystemMetrics = {
        totalActiveUsers: Math.floor(Math.random() * 1000) + 100,
        totalActiveSessions: Math.floor(Math.random() * 500) + 50,
        averageResponseTime: Math.floor(Math.random() * 200) + 50,
        errorRate: Math.random() * 5,
        lastUpdated: new Date()
      };

      this.metricsCache = metrics;
      this.cacheExpiry = new Date(Date.now() + 30000); // 30 segundos

      return metrics;
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      throw error;
    }
  }

  // Verificar violações de geofencing
  async checkGeofenceViolations(companyId: string, location: {lat: number; lng: number}, employeeId: string): Promise<boolean> {
    try {
      const companyDoc = await getDoc(doc(db, 'companies', companyId));
      if (!companyDoc.exists()) return false;

      const companyData = companyDoc.data();
      const geofencing = companyData.geofencing;

      if (!geofencing || !geofencing.lat || !geofencing.lng || !geofencing.radius) {
        return true; // Se não há configuração, permite
      }

      // Calcular distância usando fórmula de Haversine
      const distance = this.calculateDistance(
        location.lat,
        location.lng,
        geofencing.lat,
        geofencing.lng
      );

      const isViolation = distance > geofencing.radius;

      if (isViolation) {
        await this.createAlert({
          type: 'geofence_violation',
          companyId,
          employeeId,
          message: `Tentativa de ponto fora da área permitida. Distância: ${Math.round(distance)}m`,
          severity: 'high',
          metadata: {
            distance: Math.round(distance),
            allowedRadius: geofencing.radius,
            location
          }
        });
      }

      return !isViolation;
    } catch (error) {
      console.error('Erro ao verificar geofencing:', error);
      return true; // Em caso de erro, permite o ponto
    }
  }

  // Fórmula de Haversine para calcular distância
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Raio da Terra em metros
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Limpar listeners
  cleanup(): void {
    this.alertListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.alertListeners.clear();
  }
}

export const realTimeMonitoring = new RealTimeMonitoring();

// Tipos para exportação
export type {
  MonitoringAlert,
  SystemMetrics
};
