
interface SecurityMetrics {
  totalRequests: number;
  suspiciousRequests: number;
  blockedRequests: number;
  activeThreats: number;
  lastUpdate: number;
}

class SecurityMonitor {
  private static instance: SecurityMonitor;
  private metrics: SecurityMetrics;
  private alertCallbacks: ((alert: SecurityAlert) => void)[] = [];

  private constructor() {
    this.metrics = {
      totalRequests: 0,
      suspiciousRequests: 0,
      blockedRequests: 0,
      activeThreats: 0,
      lastUpdate: Date.now()
    };
  }

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  recordRequest(type: 'normal' | 'suspicious' | 'blocked' | 'threat'): void {
    this.metrics.totalRequests++;
    
    switch (type) {
      case 'suspicious':
        this.metrics.suspiciousRequests++;
        break;
      case 'blocked':
        this.metrics.blockedRequests++;
        break;
      case 'threat':
        this.metrics.activeThreats++;
        this.triggerAlert({
          type: 'ACTIVE_THREAT',
          severity: 'critical',
          timestamp: Date.now(),
          message: 'Active threat detected in system'
        });
        break;
    }

    this.metrics.lastUpdate = Date.now();
  }

  private triggerAlert(alert: SecurityAlert): void {
    this.alertCallbacks.forEach(callback => callback(alert));
  }

  onAlert(callback: (alert: SecurityAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }
}

interface SecurityAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  message: string;
}

export { SecurityMonitor };
