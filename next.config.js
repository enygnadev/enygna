
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
    
    // Fix for protobufjs
    config.resolve.alias = {
      ...config.resolve.alias,
      'protobufjs/minimal': require.resolve('protobufjs/minimal.js'),
    };
    
    // Ignore problematic modules
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
