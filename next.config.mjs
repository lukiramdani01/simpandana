import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'api.telegram.org'],
  },
  generateBuildId: async () => {
    return 'simpanuang-prod-build';
  },
  experimental: {
    instrumentationHook: true,
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(process.cwd(), 'src');
    return config;
  },
};

export default nextConfig;
