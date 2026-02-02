/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@crypto-tracker/shared-types'],
  experimental: {
    optimizePackageImports: ['lightweight-charts'],
  },
};

module.exports = nextConfig;
