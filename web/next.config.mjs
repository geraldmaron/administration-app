/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ['localhost:3001'] } },
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