/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Removido: devIndicators (deprecated no Next.js 15+)

  env: {
    CUSTOM_PORT: '5000',
  },

  // Mantido conforme seu projeto
  serverExternalPackages: ['firebase-admin'],

  webpack: (config, { isServer }) => {
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
};

module.exports = nextConfig;
