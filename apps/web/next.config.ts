import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // 👈 All HTTPS domains allowed
      },
      {
        protocol: 'http',
        hostname: '**', // 👈 All HTTP domains allowed
      },
    ],
  },
};

export default nextConfig;
