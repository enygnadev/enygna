
import { db } from '@/src/lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  category: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  data?: any;
  stack?: string;
  fingerprint?: string;
  environment: string;
  version: string;
}

export interface LogFilter {
  level?: LogLevel;
  category?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLocalLogs = 1000;
  private minLevel = LogLevel.INFO;
  private categories = new Set<string>();
  private sessionId = this.generateSessionId();
  private environment = process.env.NODE_ENV || 'development';
  private version = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

  constructor() {
    // Configurar captura de erros globais
    this.setupGlobalErrorHandling();
    this.setupPerformanceMonitoring();
  }

  // Métodos principais de logging
  debug(message: string, data?: any, category = 'general'): void {
    this.log(LogLevel.DEBUG, message, category, data);
  }

  info(message: string, data?: any, category = 'general'): void {
    this.log(LogLevel.INFO, message, category, data);
  }

  warn(message: string, data?: any, category = 'general'): void {
    this.log(LogLevel.WARN, message, category, data);
  }

  error(message: string, error?: Error | any, category = 'general'): void {
    const data = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    } : error;

    this.log(LogLevel.ERROR, message, category, data, error?.stack);
  }

  fatal(message: string, error?: Error | any, category = 'general'): void {
    const data = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    } : error;

    this.log(LogLevel.FATAL, message, category, data, error?.stack);
    
    // Para erros fatais, enviar imediatamente
    this.flushLogs();
  }

  // Logging estruturado
  private async log(
    level: LogLevel,
    message: string,
    category: string,
    data?: any,
    stack?: string
  ): Promise<void> {
    if (level < this.minLevel) return;

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      message,
      category,
      userId: this.getCurrentUserId(),
      sessionId: this.sessionId,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      data,
      stack,
      fingerprint: this.generateFingerprint(message, category, stack),
      environment: this.environment,
      version: this.version
    };

    // Adicionar à categoria
    this.categories.add(category);

    // Adicionar ao buffer local
    this.logs.push(logEntry);
    
    // Manter apenas os últimos logs
    if (this.logs.length > this.maxLocalLogs) {
      this.logs = this.logs.slice(-this.maxLocalLogs);
    }

    // Log no console (desenvolvimento)
    if (this.environment === 'development') {
      this.logToConsole(logEntry);
    }

    // Enviar para Firestore (produção ou erros críticos)
    if (this.environment === 'production' || level >= LogLevel.ERROR) {
      await this.sendToFirestore(logEntry);
    }

    // Alertas para erros críticos
    if (level >= LogLevel.ERROR) {
      await this.handleCriticalError(logEntry);
    }
  }

  // Logging especializado
  async logUserAction(action: string, details?: any): Promise<void> {
    await this.info(`Ação do usuário: ${action}`, details, 'user_action');
  }

  async logAPICall(endpoint: string, method: string, duration: number, status: number): Promise<void> {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    await this.log(level, `API Call: ${method} ${endpoint}`, 'api', {
      endpoint,
      method,
      duration,
      status
    });
  }

  async logPerformance(metric: string, value: number, unit = 'ms'): Promise<void> {
    await this.info(`Performance: ${metric}`, { value, unit }, 'performance');
  }

  async logSecurity(event: string, details?: any): Promise<void> {
    await this.warn(`Evento de segurança: ${event}`, details, 'security');
  }

  async logBusinessEvent(event: string, details?: any): Promise<void> {
    await this.info(`Evento de negócio: ${event}`, details, 'business');
  }

  // Busca e filtros
  getLogs(filter?: LogFilter): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.level >= filter.level!);
      }
      
      if (filter.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filter.category);
      }
      
      if (filter.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
      }
      
      if (filter.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startDate!);
      }
      
      if (filter.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endDate!);
      }
      
      if (filter.search) {
        const search = filter.search.toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(search) ||
          JSON.stringify(log.data).toLowerCase().includes(search)
        );
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Estatísticas
  getStats(timeRange?: { start: Date; end: Date }): any {
    let logs = this.logs;
    
    if (timeRange) {
      logs = logs.filter(log => 
        log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
      );
    }

    const stats = {
      total: logs.length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      errorRate: 0,
      topErrors: [] as Array<{ message: string; count: number }>,
      averageLogsPerHour: 0
    };

    // Contar por nível
    Object.values(LogLevel).forEach(level => {
      if (typeof level === 'number') {
        stats.byLevel[LogLevel[level]] = logs.filter(log => log.level === level).length;
      }
    });

    // Contar por categoria
    this.categories.forEach(category => {
      stats.byCategory[category] = logs.filter(log => log.category === category).length;
    });

    // Taxa de erro
    const errors = logs.filter(log => log.level >= LogLevel.ERROR).length;
    stats.errorRate = logs.length > 0 ? errors / logs.length : 0;

    // Top erros
    const errorCounts = new Map<string, number>();
    logs.filter(log => log.level >= LogLevel.ERROR).forEach(log => {
      const key = log.fingerprint || log.message;
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    });
    
    stats.topErrors = Array.from(errorCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Média por hora
    if (logs.length > 0 && timeRange) {
      const hours = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60);
      stats.averageLogsPerHour = logs.length / Math.max(hours, 1);
    }

    return stats;
  }

  // Configuração
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  setMaxLocalLogs(max: number): void {
    this.maxLocalLogs = max;
    if (this.logs.length > max) {
      this.logs = this.logs.slice(-max);
    }
  }

  // Exportação
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = 'Timestamp,Level,Category,Message,UserId,URL\n';
      const rows = this.logs.map(log => 
        `${log.timestamp.toISOString()},${LogLevel[log.level]},${log.category},"${log.message}",${log.userId || ''},${log.url || ''}`
      ).join('\n');
      return headers + rows;
    }
    
    return JSON.stringify(this.logs, null, 2);
  }

  // Limpeza
  clearLogs(): void {
    this.logs = [];
  }

  async flushLogs(): Promise<void> {
    const logsToFlush = [...this.logs];
    this.logs = [];
    
    for (const log of logsToFlush) {
      await this.sendToFirestore(log);
    }
  }

  // Métodos privados
  private setupGlobalErrorHandling(): void {
    if (typeof window === 'undefined') return;

    // Erros JavaScript
    window.addEventListener('error', (event) => {
      this.error('Erro JavaScript global', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      }, 'javascript_error');
    });

    // Promises rejeitadas
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Promise rejeitada não tratada', {
        reason: event.reason
      }, 'unhandled_promise');
    });

    // Erros de recursos
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        this.error('Erro ao carregar recurso', {
          source: (event.target as any).src || (event.target as any).href,
          type: (event.target as any).tagName
        }, 'resource_error');
      }
    }, true);
  }

  private setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    // Observar Web Vitals
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.logPerformance(entry.name, entry.startTime);
        }
      });
      
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (error) {
      // Ignorar se não suportado
    }
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${level}] [${entry.category}]`;
    
    const style = this.getConsoleStyle(entry.level);
    
    if (entry.data) {
      console.groupCollapsed(`%c${prefix} ${entry.message}`, style);
      console.log('Data:', entry.data);
      if (entry.stack) console.log('Stack:', entry.stack);
      console.groupEnd();
    } else {
      console.log(`%c${prefix} ${entry.message}`, style);
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return 'color: #888';
      case LogLevel.INFO: return 'color: #2196F3';
      case LogLevel.WARN: return 'color: #FF9800';
      case LogLevel.ERROR: return 'color: #F44336; font-weight: bold';
      case LogLevel.FATAL: return 'color: #FF0000; font-weight: bold; background: #FFEBEE';
      default: return '';
    }
  }

  private async sendToFirestore(entry: LogEntry): Promise<void> {
    try {
      const logRef = doc(collection(db, 'application_logs'));
      await setDoc(logRef, {
        ...entry,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao enviar log para Firestore:', error);
    }
  }

  private async handleCriticalError(entry: LogEntry): Promise<void> {
    try {
      // Enviar alerta para administradores
      const alertRef = doc(collection(db, 'critical_alerts'));
      await setDoc(alertRef, {
        type: 'critical_error',
        logEntry: entry,
        timestamp: serverTimestamp(),
        acknowledged: false
      });
    } catch (error) {
      console.error('Erro ao enviar alerta crítico:', error);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFingerprint(message: string, category: string, stack?: string): string {
    const content = stack || message;
    return btoa(content.substring(0, 100)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  private getCurrentUserId(): string | undefined {
    try {
      return localStorage.getItem('userId') || undefined;
    } catch {
      return undefined;
    }
  }
}

// Instância global
export const logger = new Logger();

// Hook para React
export function useLogger() {
  return {
    debug: logger.debug.bind(logger),
    info: logger.info.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger),
    fatal: logger.fatal.bind(logger),
    logUserAction: logger.logUserAction.bind(logger),
    logAPICall: logger.logAPICall.bind(logger),
    logPerformance: logger.logPerformance.bind(logger),
    getLogs: logger.getLogs.bind(logger),
    getStats: logger.getStats.bind(logger)
  };
}
