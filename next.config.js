/** @type {import('next').NextConfig} */

// Headers de segurança robustos para produção
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: process.env.NODE_ENV === 'production'
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.firebase.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests;"
      : "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.firebase.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none';"
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=(), browsing-topics=()'
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin'
  },
  {
    key: 'Cross-Origin-Resource-Policy', 
    value: 'same-site'
  },
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'require-corp'
  }
];

const nextConfig = {
  reactStrictMode: true,
  
  // Desabilitar source maps em produção para não vazar código
  productionBrowserSourceMaps: false,
  
  // Otimizações de produção
  poweredByHeader: false,
  compress: true,
  
  env: {
    CUSTOM_PORT: '5000',
  },

  // Mantido conforme seu projeto
  serverExternalPackages: ['firebase-admin'],
  
  // Headers de segurança aplicados a todas as rotas
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  webpack: (config, { isServer }) => {
    // Otimizações do cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        child_process: false,
        module: false,
      };
    }

    // Fix para protobufjs
    config.resolve.alias = {
      ...config.resolve.alias,
      'protobufjs/minimal': require.resolve('protobufjs/minimal.js'),
    };

    // Ignorar módulos problemáticos no server
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      });
    }

    return config;
  },
  
  // Configuração TypeScript estrita
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Configuração ESLint
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;