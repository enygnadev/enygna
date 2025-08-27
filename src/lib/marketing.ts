// src/lib/marketing.ts - Sistema de Marketing Digital (Google Ads + Meta Ads)
import { lgpdService } from './lgpd';
import { useEffect } from 'react';

export interface MarketingEvent {
  userId?: string;
  sessionId: string;
  eventType: 'page_view' | 'conversion' | 'add_to_cart' | 'purchase' | 'sign_up' | 'login';
  eventValue?: number;
  currency?: string;
  itemId?: string;
  customParameters?: Record<string, any>;
}

export interface ConversionGoal {
  id: string;
  name: string;
  type: 'purchase' | 'sign_up' | 'contact' | 'demo_request';
  value: number;
  googleAdsConversionId?: string;
  metaPixelEventName?: string;
}

class MarketingService {
  private googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '';
  private metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
  private googleAnalyticsId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

  // Inicializar tracking scripts
  async initializeTracking(): Promise<void> {
    try {
      // Verificar consentimento LGPD para marketing
      const hasMarketingConsent = await this.checkMarketingConsent();

      if (!hasMarketingConsent) {
        console.log('Marketing tracking desabilitado - sem consentimento LGPD');
        return;
      }

      // Inicializar Google Ads
      await this.initializeGoogleAds();

      // Inicializar Meta Pixel
      await this.initializeMetaPixel();

      // Inicializar Google Analytics
      await this.initializeGoogleAnalytics();

    } catch (error) {
      console.error('Erro ao inicializar tracking de marketing:', error);
    }
  }

  // Google Ads
  private async initializeGoogleAds(): Promise<void> {
    if (!this.googleAdsId) return;

    try {
      // Carregar script do Google Ads
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.googleAdsId}`;
      document.head.appendChild(script);

      // Configurar dataLayer
      (window as any).dataLayer = (window as any).dataLayer || [];
      const gtag = (...args: any[]) => {
        (window as any).dataLayer?.push(args);
      };

      gtag('js', new Date());
      gtag('config', this.googleAdsId, {
        send_page_view: true,
        allow_google_signals: true,
        allow_ad_personalization_signals: true
      });

      // Configurações de conversão
      gtag('config', this.googleAdsId, {
        custom_map: {
          'custom_user_id': 'user_id',
          'custom_company_size': 'company_size',
          'custom_plan_type': 'plan_type'
        }
      });

    } catch (error) {
      console.error('Erro ao inicializar Google Ads:', error);
    }
  }

  // Meta Pixel (Facebook Ads)
  private async initializeMetaPixel(): Promise<void> {
    if (!this.metaPixelId) return;

    try {
      // Carregar Meta Pixel
      (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function() {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

      (window as any).fbq('init', this.metaPixelId);
      (window as any).fbq('track', 'PageView');

    } catch (error) {
      console.error('Erro ao inicializar Meta Pixel:', error);
    }
  }

  // Google Analytics
  private async initializeGoogleAnalytics(): Promise<void> {
    if (!this.googleAnalyticsId) return;

    try {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.googleAnalyticsId}`;
      document.head.appendChild(script);

      (window as any).dataLayer = (window as any).dataLayer || [];
      const gtag = (...args: any[]) => {
        (window as any).dataLayer?.push(args);
      };

      gtag('js', new Date());
      gtag('config', this.googleAnalyticsId, {
        send_page_view: true,
        anonymize_ip: true, // LGPD compliance
        allow_google_signals: true
      });

    } catch (error) {
      console.error('Erro ao inicializar Google Analytics:', error);
    }
  }

  // Rastrear eventos personalizados
  async trackEvent(event: MarketingEvent): Promise<void> {
    try {
      const hasConsent = await this.checkMarketingConsent();
      if (!hasConsent) return;

      // Google Ads/Analytics
      if (typeof (window as any).gtag !== 'undefined') {
        (window as any).gtag('event', event.eventType, {
          event_category: 'engagement',
          event_label: event.itemId,
          value: event.eventValue,
          currency: event.currency || 'BRL',
          user_id: event.userId,
          session_id: event.sessionId,
          ...event.customParameters
        });
      }

      // Meta Pixel
      if (typeof (window as any).fbq !== 'undefined') {
        const metaEventName = this.mapEventToMeta(event.eventType);
        (window as any).fbq('track', metaEventName, {
          value: event.eventValue,
          currency: event.currency || 'BRL',
          content_ids: event.itemId ? [event.itemId] : undefined,
          ...event.customParameters
        });
      }

    } catch (error) {
      console.error('Erro ao rastrear evento:', error);
    }
  }

  // Rastrear conversões
  async trackConversion(goal: ConversionGoal, value?: number): Promise<void> {
    try {
      const hasConsent = await this.checkMarketingConsent();
      if (!hasConsent) return;

      // Google Ads Conversion
      if (goal.googleAdsConversionId && typeof (window as any).gtag !== 'undefined') {
        (window as any).gtag('event', 'conversion', {
          send_to: goal.googleAdsConversionId,
          value: value || goal.value,
          currency: 'BRL',
          transaction_id: `conv_${Date.now()}`
        });
      }

      // Meta Conversion
      if (goal.metaPixelEventName && typeof (window as any).fbq !== 'undefined') {
        (window as any).fbq('track', goal.metaPixelEventName, {
          value: value || goal.value,
          currency: 'BRL'
        });
      }

      // Analytics Enhanced Ecommerce
      if (typeof (window as any).gtag !== 'undefined') {
        (window as any).gtag('event', 'purchase', {
          transaction_id: `conv_${Date.now()}`,
          value: value || goal.value,
          currency: 'BRL',
          items: [{
            item_id: goal.id,
            item_name: goal.name,
            category: goal.type,
            quantity: 1,
            price: value || goal.value
          }]
        });
      }

    } catch (error) {
      console.error('Erro ao rastrear conversão:', error);
    }
  }

  // Configurar remarketing audiences
  async setupRemarketingAudiences(): Promise<void> {
    try {
      const hasConsent = await this.checkMarketingConsent();
      if (!hasConsent) return;

      // Configurar audiences personalizadas
      const audiences = [
        {
          name: 'visitantes_homepage',
          rules: { url_contains: '/' },
          retention_days: 30
        },
        {
          name: 'usuarios_cadastrados',
          rules: { event: 'sign_up' },
          retention_days: 180
        },
        {
          name: 'usuarios_ativos',
          rules: { event: 'login', frequency: 'weekly' },
          retention_days: 365
        }
      ];

      // Google Ads Custom Audiences
      if (typeof (window as any).gtag !== 'undefined') {
        audiences.forEach(audience => {
          (window as any).gtag('config', this.googleAdsId, {
            custom_map: {
              [audience.name]: 'custom_parameter_' + audience.name
            }
          });
        });
      }

      // Meta Custom Audiences
      if (typeof (window as any).fbq !== 'undefined') {
        (window as any).fbq('init', this.metaPixelId, {
          autoConfig: true,
          debug: false
        });
      }

    } catch (error) {
      console.error('Erro ao configurar remarketing:', error);
    }
  }

  // Attribution tracking
  async trackAttribution(source: string, medium: string, campaign: string): Promise<void> {
    try {
      const attribution = {
        source,
        medium,
        campaign,
        timestamp: new Date().toISOString(),
        referrer: document.referrer,
        landing_page: window.location.href
      };

      // Salvar no localStorage para persistência
      localStorage.setItem('marketing_attribution', JSON.stringify(attribution));

      // Enviar para Analytics
      if (typeof (window as any).gtag !== 'undefined') {
        (window as any).gtag('event', 'campaign_attribution', {
          campaign_name: campaign,
          campaign_source: source,
          campaign_medium: medium
        });
      }

    } catch (error) {
      console.error('Erro ao rastrear atribuição:', error);
    }
  }

  // Verificar consentimento para marketing
  private async checkMarketingConsent(): Promise<boolean> {
    try {
      // Verificar se há usuário logado
      const userId = localStorage.getItem('userId');
      if (!userId) return false;

      // Verificar consentimento LGPD
      const consent = await lgpdService.checkConsent(userId);
      return consent ? consent.marketing : false;
    } catch {
      return false;
    }
  }

  // Mapear eventos para Meta
  private mapEventToMeta(eventType: string): string {
    const mapping: Record<string, string> = {
      'page_view': 'PageView',
      'sign_up': 'CompleteRegistration',
      'login': 'Login',
      'purchase': 'Purchase',
      'add_to_cart': 'AddToCart',
      'conversion': 'Lead'
    };

    return mapping[eventType] || 'ViewContent';
  }

  // Gerar relatórios de performance
  async generateMarketingReport(): Promise<any> {
    try {
      const attribution = JSON.parse(
        localStorage.getItem('marketing_attribution') || '{}'
      );

      const report = {
        period: '30_days',
        attribution,
        campaigns: {
          google_ads: {
            impressions: 0,
            clicks: 0,
            conversions: 0,
            cost: 0,
            roi: 0
          },
          meta_ads: {
            impressions: 0,
            clicks: 0,
            conversions: 0,
            cost: 0,
            roi: 0
          }
        },
        top_performing_keywords: [],
        conversion_funnel: {
          visitors: 0,
          leads: 0,
          customers: 0,
          conversion_rate: 0
        }
      };

      return report;
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      return null;
    }
  }
}

export const marketingService = new MarketingService();

// Hook para React
export function useMarketing() {
  const trackEvent = async (event: MarketingEvent) => {
    await marketingService.trackEvent(event);
  };

  const trackConversion = async (goal: ConversionGoal, value?: number) => {
    await marketingService.trackConversion(goal, value);
  };

  const trackAttribution = async (source: string, medium: string, campaign: string) => {
    await marketingService.trackAttribution(source, medium, campaign);
  };

  return {
    trackEvent,
    trackConversion,
    trackAttribution
  };
}

// Componente para carregar scripts de marketing
export function MarketingScripts() {
  useEffect(() => {
    marketingService.initializeTracking();
  }, []);

  return null;
}