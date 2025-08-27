import { db } from '@/src/lib/firebase';
import { collection, doc, setDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  timestamp: Date;
  details?: any;
  region?: string;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  activeUsers: number;
  requestsPerMinute: number;
  errorRate: number;
}

class HealthCheckService {
  private checks: Map<string, HealthStatus> = new Map();
  private metrics: SystemMetrics | null = null;
  private alertThresholds = {
    responseTime: 5000, // 5s
    errorRate: 0.05, // 5%
    cpu: 80, // 80%
    memory: 85, // 85%
  };

  async runAllChecks(): Promise<HealthStatus[]> {
    const checks = await Promise.allSettled([
      this.checkFirebase(),
      this.checkDatabase(),
      this.checkAuth(),
      this.checkStorage(),
      this.checkExternalAPIs(),
      this.checkCDN(),
      this.checkSSL(),
    ]);

    const results = checks.map(result => 
      result.status === 'fulfilled' ? result.value : this.createErrorStatus(result.reason)
    );

    // Salvar resultados
    await this.saveHealthResults(results);
    
    // Verificar alertas
    await this.checkAlerts(results);

    return results;
  }

  private async checkFirebase(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const testRef = doc(collection(db, 'health_checks'));
      await setDoc(testRef, {
        test: true,
        timestamp: serverTimestamp()
      });

      return {
        service: 'firebase',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: { connection: 'ok', latency: Date.now() - startTime }
      };
    } catch (error: unknown) {
      return {
        service: 'firebase',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: { error: (error instanceof Error) ? error.message : String(error) }
      };
    }
  }

  private async checkDatabase(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      await getDocs(usersQuery);

      return {
        service: 'database',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error: unknown) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: { error: (error instanceof Error) ? error.message : String(error) }
      };
    }
  }

  private async checkAuth(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      // Verificar se Firebase Auth está respondendo
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`, {
        method: 'HEAD'
      });

      return {
        service: 'auth',
        status: response.ok ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: { httpStatus: response.status }
      };
    } catch (error: unknown) {
      return {
        service: 'auth',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: { error: (error instanceof Error) ? error.message : String(error) }
      };
    }
  }

  private async checkStorage(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      // Verificar Firebase Storage
      const response = await fetch(`https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o`, {
        method: 'HEAD'
      });

      return {
        service: 'storage',
        status: response.ok ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error: unknown) {
      return {
        service: 'storage',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: { error: (error instanceof Error) ? error.message : String(error) }
      };
    }
  }

  private async checkExternalAPIs(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      // Verificar APIs críticas
      const checks = await Promise.allSettled([
        fetch('https://api.ipify.org', { method: 'HEAD' }),
        fetch('https://maps.googleapis.com', { method: 'HEAD' })
      ]);

      const failures = checks.filter(check => check.status === 'rejected').length;
      const status = failures === 0 ? 'healthy' : failures < checks.length ? 'degraded' : 'unhealthy';

      return {
        service: 'external_apis',
        status,
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: { failures, total: checks.length }
      };
    } catch (error: unknown) {
      return {
        service: 'external_apis',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: { error: (error instanceof Error) ? error.message : String(error) }
      };
    }
  }

  private async checkCDN(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      // Verificar recursos estáticos
      const response = await fetch('/manifest.json', { method: 'HEAD' });
      
      return {
        service: 'cdn',
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: { httpStatus: response.status }
      };
    } catch (error: unknown) {
      return {
        service: 'cdn',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: { error: (error instanceof Error) ? error.message : String(error) }
      };
    }
  }

  private async checkSSL(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const isSecure = window.location.protocol === 'https:';
      
      return {
        service: 'ssl',
        status: isSecure ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: { protocol: window.location.protocol }
      };
    } catch (error: unknown) {
      return {
        service: 'ssl',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: { error: (error instanceof Error) ? error.message : String(error) }
      };
    }
  }

  async collectSystemMetrics(): Promise<SystemMetrics> {
    try {
      const metrics: SystemMetrics = {
        cpu: await this.getCPUUsage(),
        memory: await this.getMemoryUsage(),
        disk: await this.getDiskUsage(),
        network: await this.getNetworkLatency(),
        activeUsers: await this.getActiveUsers(),
        requestsPerMinute: await this.getRequestsPerMinute(),
        errorRate: await this.getErrorRate()
      };

      this.metrics = metrics;
      await this.saveMetrics(metrics);
      
      return metrics;
    } catch (error: unknown) {
      console.error('Erro ao coletar métricas:', error);
      return {
        cpu: 0,
        memory: 0,
        disk: 0,
        network: 0,
        activeUsers: 0,
        requestsPerMinute: 0,
        errorRate: 0
      };
    }
  }

  private async getCPUUsage(): Promise<number> {
    // Simular uso de CPU baseado em performance
    const start = performance.now();
    let count = 0;
    while (performance.now() - start < 10) {
      count++;
    }
    return Math.min(count / 100000 * 100, 100);
  }

  private async getMemoryUsage(): Promise<number> {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
    }
    return 0;
  }

  private async getDiskUsage(): Promise<number> {
    // Estimar baseado em localStorage
    let totalSize = 0;
    for (let key in localStorage) {
      totalSize += localStorage[key].length;
    }
    return Math.min((totalSize / (1024 * 1024)) * 10, 100); // Simular
  }

  private async getNetworkLatency(): Promise<number> {
    const start = Date.now();
    try {
      await fetch('/favicon.ico', { method: 'HEAD' });
      return Date.now() - start;
    } catch (error: unknown) {
      return 9999;
    }
  }

  private async getActiveUsers(): Promise<number> {
    try {
      const sessionsQuery = query(
        collection(db, 'user_sessions'),
        where('active', '==', true),
        where('lastActivity', '>=', new Date(Date.now() - 30 * 60 * 1000)) // 30 min
      );
      const sessions = await getDocs(sessionsQuery);
      return sessions.size;
    } catch (error: unknown) {
      return 0;
    }
  }

  private async getRequestsPerMinute(): Promise<number> {
    try {
      const logsQuery = query(
        collection(db, 'request_logs'),
        where('timestamp', '>=', new Date(Date.now() - 60 * 1000)), // 1 min
        orderBy('timestamp', 'desc')
      );
      const logs = await getDocs(logsQuery);
      return logs.size;
    } catch (error: unknown) {
      return 0;
    }
  }

  private async getErrorRate(): Promise<number> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const [totalLogs, errorLogs] = await Promise.all([
        getDocs(query(
          collection(db, 'request_logs'),
          where('timestamp', '>=', oneHourAgo)
        )),
        getDocs(query(
          collection(db, 'error_logs'),
          where('timestamp', '>=', oneHourAgo)
        ))
      ]);

      return totalLogs.size > 0 ? errorLogs.size / totalLogs.size : 0;
    } catch (error: unknown) {
      return 0;
    }
  }

  private async saveHealthResults(results: HealthStatus[]): Promise<void> {
    try {
      const healthRef = doc(collection(db, 'system_health'));
      await setDoc(healthRef, {
        results,
        timestamp: serverTimestamp(),
        overall: this.calculateOverallHealth(results)
      });
    } catch (error: unknown) {
      console.error('Erro ao salvar health check:', error);
    }
  }

  private async saveMetrics(metrics: SystemMetrics): Promise<void> {
    try {
      const metricsRef = doc(collection(db, 'system_metrics'));
      await setDoc(metricsRef, {
        ...metrics,
        timestamp: serverTimestamp()
      });
    } catch (error: unknown) {
      console.error('Erro ao salvar métricas:', error);
    }
  }

  private calculateOverallHealth(results: HealthStatus[]): string {
    const unhealthy = results.filter(r => r.status === 'unhealthy').length;
    const degraded = results.filter(r => r.status === 'degraded').length;
    
    if (unhealthy > 0) return 'unhealthy';
    if (degraded > 0) return 'degraded';
    return 'healthy';
  }

  private async checkAlerts(results: HealthStatus[]): Promise<void> {
    for (const result of results) {
      if (result.status === 'unhealthy' || 
          result.responseTime > this.alertThresholds.responseTime) {
        await this.sendAlert(result);
      }
    }

    if (this.metrics) {
      if (this.metrics.cpu > this.alertThresholds.cpu ||
          this.metrics.memory > this.alertThresholds.memory ||
          this.metrics.errorRate > this.alertThresholds.errorRate) {
        await this.sendMetricsAlert(this.metrics);
      }
    }
  }

  private async sendAlert(healthStatus: HealthStatus): Promise<void> {
    try {
      const alertRef = doc(collection(db, 'system_alerts'));
      await setDoc(alertRef, {
        type: 'health_check',
        service: healthStatus.service,
        status: healthStatus.status,
        responseTime: healthStatus.responseTime,
        details: healthStatus.details,
        timestamp: serverTimestamp(),
        resolved: false
      });
    } catch (error: unknown) {
      console.error('Erro ao enviar alerta:', error);
    }
  }

  private async sendMetricsAlert(metrics: SystemMetrics): Promise<void> {
    try {
      const alertRef = doc(collection(db, 'system_alerts'));
      await setDoc(alertRef, {
        type: 'metrics',
        metrics,
        timestamp: serverTimestamp(),
        resolved: false
      });
    } catch (error: unknown) {
      console.error('Erro ao enviar alerta de métricas:', error);
    }
  }

  private createErrorStatus(error: unknown): HealthStatus {
    return {
      service: 'unknown',
      status: 'unhealthy',
      responseTime: 0,
      timestamp: new Date(),
      details: { error: (error instanceof Error) ? error.message : String(error) }
    };
  }

  // Métodos públicos para dashboard
  getLastResults(): HealthStatus[] {
    return Array.from(this.checks.values());
  }

  getLastMetrics(): SystemMetrics | null {
    return this.metrics;
  }

  async getHistoricalData(hours: number = 24): Promise<any> {
    try {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const [healthData, metricsData] = await Promise.all([
        getDocs(query(
          collection(db, 'system_health'),
          where('timestamp', '>=', cutoff),
          orderBy('timestamp', 'desc')
        )),
        getDocs(query(
          collection(db, 'system_metrics'),
          where('timestamp', '>=', cutoff),
          orderBy('timestamp', 'desc')
        ))
      ]);

      return {
        health: healthData.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        metrics: metricsData.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      };
    } catch (error: unknown) {
      console.error('Erro ao buscar dados históricos:', error);
      return { health: [], metrics: [] };
    }
  }
}

export const healthCheckService = new HealthCheckService();