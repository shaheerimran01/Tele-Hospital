/** @type {import('next').NextConfig} */
const nextConfig = {
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

module.exports = nextConfig;