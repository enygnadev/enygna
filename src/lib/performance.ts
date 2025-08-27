
// src/lib/performance.ts
'use client';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url?: string;
  userAgent?: string;
}

interface VitalMetrics {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
}

class PerformanceService {
  private metrics: PerformanceMetric[] = [];
  private vitals: VitalMetrics = {};
  private observer: PerformanceObserver | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Observe performance entries
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processEntry(entry);
        }
      });

      try {
        // Observe different types of performance entries
        this.observer.observe({ entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
      } catch (e) {
        // Fallback for older browsers
        this.observer.observe({ entryTypes: ['navigation', 'resource', 'paint'] });
      }
    }

    // Monitor page load
    window.addEventListener('load', () => {
      setTimeout(() => this.collectLoadMetrics(), 0);
    });

    // Monitor route changes (for SPA)
    this.monitorRouteChanges();
  }

  private processEntry(entry: PerformanceEntry) {
    const metric: PerformanceMetric = {
      name: entry.name,
      value: entry.duration || (entry as any).value || 0,
      timestamp: entry.startTime,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.metrics.push(metric);

    // Process Web Vitals
    switch (entry.entryType) {
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          this.vitals.FCP = entry.startTime;
        }
        break;
      case 'largest-contentful-paint':
        this.vitals.LCP = entry.startTime;
        break;
      case 'first-input':
        this.vitals.FID = (entry as any).processingStart - entry.startTime;
        break;
      case 'layout-shift':
        if (!(entry as any).hadRecentInput) {
          this.vitals.CLS = (this.vitals.CLS || 0) + (entry as any).value;
        }
        break;
      case 'navigation':
        this.vitals.TTFB = (entry as any).responseStart;
        break;
    }

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-50);
    }
  }

  private collectLoadMetrics() {
    if (!window.performance) return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return;

    const metrics = {
      DNS: navigation.domainLookupEnd - navigation.domainLookupStart,
      TCP: navigation.connectEnd - navigation.connectStart,
      Request: navigation.responseStart - navigation.requestStart,
      Response: navigation.responseEnd - navigation.responseStart,
      Processing: navigation.domContentLoadedEventStart - navigation.responseEnd,
      Load: navigation.loadEventStart - navigation.domContentLoadedEventStart,
      Total: navigation.loadEventEnd - navigation.fetchStart
    };

    Object.entries(metrics).forEach(([name, value]) => {
      this.addMetric(`load.${name.toLowerCase()}`, value);
    });
  }

  private monitorRouteChanges() {
    let currentPath = window.location.pathname;
    
    const checkRouteChange = () => {
      if (window.location.pathname !== currentPath) {
        const startTime = performance.now();
        currentPath = window.location.pathname;
        
        // Measure route change performance
        requestAnimationFrame(() => {
          const endTime = performance.now();
          this.addMetric('route.change', endTime - startTime);
        });
      }
    };

    // Monitor history API changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(checkRouteChange, 0);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(checkRouteChange, 0);
    };

    window.addEventListener('popstate', checkRouteChange);
  }

  addMetric(name: string, value: number) {
    this.metrics.push({
      name,
      value,
      timestamp: performance.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getVitals(): VitalMetrics {
    return { ...this.vitals };
  }

  getAverageMetric(name: string): number {
    const filteredMetrics = this.metrics.filter(m => m.name.includes(name));
    if (filteredMetrics.length === 0) return 0;
    
    const sum = filteredMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / filteredMetrics.length;
  }

  // Memory usage
  getMemoryUsage(): { used: number; total: number; percent: number } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percent: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
      };
    }
    return null;
  }

  // Generate performance report
  generateReport(): string {
    const vitals = this.getVitals();
    const memory = this.getMemoryUsage();
    
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      vitals,
      memory,
      averageMetrics: {
        dnsLookup: this.getAverageMetric('dns'),
        tcpConnect: this.getAverageMetric('tcp'),
        requestTime: this.getAverageMetric('request'),
        responseTime: this.getAverageMetric('response'),
        routeChange: this.getAverageMetric('route.change')
      },
      recentMetrics: this.metrics.slice(-10)
    };

    return JSON.stringify(report, null, 2);
  }

  // Clean up
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

export const performanceService = new PerformanceService();

// Helper to measure function execution time
export function measureTime<T>(fn: () => T, name: string): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  performanceService.addMetric(`function.${name}`, end - start);
  return result;
}

// Helper to measure async function execution time
export async function measureTimeAsync<T>(fn: () => Promise<T>, name: string): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  performanceService.addMetric(`async.${name}`, end - start);
  return result;
}
