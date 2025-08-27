
// src/lib/analytics.ts
'use client';

import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  sessionId?: string;
  userId?: string;
}

interface UserSession {
  id: string;
  startTime: Date;
  lastActivity: Date;
  pageViews: number;
  events: AnalyticsEvent[];
  userAgent: string;
  referrer: string;
  language: string;
  timezone: string;
  screenResolution: string;
  isNewUser: boolean;
}

class AnalyticsService {
  private session: UserSession;
  private eventQueue: AnalyticsEvent[] = [];
  private isOnline = true;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.session = this.createSession();
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flush();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.track('page_visible');
        this.updateLastActivity();
      } else {
        this.track('page_hidden');
      }
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.track('page_unload');
      this.flush(true); // Force immediate flush
    });

    // Auto-flush events every 30 seconds
    this.flushTimer = setInterval(() => {
      this.flush();
    }, 30000);

    // Track initial page load
    this.track('page_load', {
      referrer: document.referrer,
      loadTime: performance.now()
    });

    // Monitor clicks
    this.trackClicks();
    
    // Monitor form submissions
    this.trackForms();
    
    // Monitor errors
    this.trackErrors();
  }

  private createSession(): UserSession {
    const sessionId = this.generateSessionId();
    const isNewUser = !localStorage.getItem('analytics_returning_user');
    
    if (!isNewUser) {
      localStorage.setItem('analytics_returning_user', 'true');
    }

    return {
      id: sessionId,
      startTime: new Date(),
      lastActivity: new Date(),
      pageViews: 1,
      events: [],
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${screen.width}x${screen.height}`,
      isNewUser
    };
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private updateLastActivity() {
    this.session.lastActivity = new Date();
  }

  track(eventName: string, properties?: Record<string, any>) {
    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        sessionId: this.session.id,
        url: window.location.href,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId: this.session.id
    };

    this.session.events.push(event);
    this.eventQueue.push(event);
    this.updateLastActivity();

    // Store in localStorage as backup
    this.storeEventLocally(event);

    // Auto-flush if queue gets too large
    if (this.eventQueue.length >= 10) {
      this.flush();
    }
  }

  private storeEventLocally(event: AnalyticsEvent) {
    try {
      const localEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      localEvents.push(event);
      
      // Keep only last 100 events locally
      if (localEvents.length > 100) {
        localEvents.splice(0, localEvents.length - 100);
      }
      
      localStorage.setItem('analytics_events', JSON.stringify(localEvents));
    } catch (error) {
      console.warn('Failed to store analytics event locally:', error);
    }
  }

  private async flush(force = false) {
    if (!this.isOnline && !force) return;
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Send to Firestore
      await addDoc(collection(db, 'analytics_events'), {
        events: eventsToSend,
        session: {
          ...this.session,
          events: undefined // Don't duplicate events
        },
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });

      // Clear local storage after successful send
      localStorage.removeItem('analytics_events');
      
    } catch (error) {
      console.warn('Failed to send analytics events:', error);
      
      // Put events back in queue if online
      if (this.isOnline) {
        this.eventQueue.unshift(...eventsToSend);
      }
    }
  }

  private trackClicks() {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const elementInfo = {
        tagName: target.tagName,
        className: target.className,
        id: target.id,
        text: target.textContent?.slice(0, 100) || '',
        href: (target as HTMLAnchorElement).href || null
      };

      this.track('click', {
        element: elementInfo,
        position: { x: event.clientX, y: event.clientY }
      });
    });
  }

  private trackForms() {
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      if (!form || form.tagName !== 'FORM') return;

      const formData = new FormData(form);
      const fields = Object.fromEntries(formData.entries());
      
      // Remove sensitive data
      const sanitizedFields = Object.keys(fields).reduce((acc, key) => {
        if (!key.toLowerCase().includes('password') && 
            !key.toLowerCase().includes('secret') &&
            !key.toLowerCase().includes('token')) {
          acc[key] = typeof fields[key] === 'string' ? 
            (fields[key] as string).length : 'non-string';
        }
        return acc;
      }, {} as Record<string, any>);

      this.track('form_submit', {
        formId: form.id,
        fieldCount: Object.keys(fields).length,
        fields: sanitizedFields
      });
    });
  }

  private trackErrors() {
    window.addEventListener('error', (event) => {
      this.track('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.track('unhandled_promise_rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack
      });
    });
  }

  // Public methods for common tracking
  trackPageView(path?: string) {
    this.session.pageViews++;
    this.track('page_view', {
      path: path || window.location.pathname,
      title: document.title
    });
  }

  trackUserAction(action: string, properties?: Record<string, any>) {
    this.track('user_action', {
      action,
      ...properties
    });
  }

  trackFeatureUsage(feature: string, properties?: Record<string, any>) {
    this.track('feature_usage', {
      feature,
      ...properties
    });
  }

  trackPerformance(metric: string, value: number, unit = 'ms') {
    this.track('performance_metric', {
      metric,
      value,
      unit
    });
  }

  trackConversion(event: string, value?: number, properties?: Record<string, any>) {
    this.track('conversion', {
      event,
      value,
      ...properties
    });
  }

  // Get session info
  getSession(): UserSession {
    return { ...this.session };
  }

  // Get user engagement metrics
  getEngagementMetrics() {
    const now = new Date();
    const sessionDuration = now.getTime() - this.session.startTime.getTime();
    const timeSinceLastActivity = now.getTime() - this.session.lastActivity.getTime();

    return {
      sessionDuration: Math.round(sessionDuration / 1000), // seconds
      timeSinceLastActivity: Math.round(timeSinceLastActivity / 1000), // seconds
      pageViews: this.session.pageViews,
      eventsCount: this.session.events.length,
      isActive: timeSinceLastActivity < 30000, // 30 seconds
      isNewUser: this.session.isNewUser
    };
  }

  // Clean up
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(true);
  }
}

export const analyticsService = new AnalyticsService();

// Helper function to track with user context
export function trackWithUser(eventName: string, properties?: Record<string, any>) {
  analyticsService.track(eventName, {
    ...properties,
    hasUser: !!window.localStorage.getItem('user_logged_in')
  });
}
