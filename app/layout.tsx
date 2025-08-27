import './globals.css';
import '@/src/lib/themeInit';
import type { Metadata, Viewport } from 'next';
import React from 'react';
import { NotificationProvider } from '@/src/hooks/useNotifications';

export const metadata: Metadata = {
  title: 'Cartão Ponto Web Pro - Sistema Profissional de Registro de Ponto',
  description: 'Sistema completo de registro de ponto com geolocalização, aprovação automática, relatórios profissionais e interface moderna. Multi-tenant com suporte a empresas e colaboradores.',
  keywords: 'ponto eletrônico, registro de ponto, GPS, geolocalização, relatórios, RH, gestão',
  authors: [{ name: 'Cartão Ponto Web' }],
  openGraph: {
    title: 'Cartão Ponto Web Pro',
    description: 'Sistema profissional de registro de ponto com tecnologia avançada',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true}>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}