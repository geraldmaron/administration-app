/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3001', 'adminapp.localhost:3001'] },
    serverComponentsExternalPackages: [
      'firebase-admin',
      '@google-cloud/firestore',
      '@opentelemetry/api',
      '@opentelemetry/core',
      '@opentelemetry/sdk-trace-base',
      '@opentelemetry/sdk-node',
      '@opentelemetry/resources',
      '@opentelemetry/semantic-conventions',
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
