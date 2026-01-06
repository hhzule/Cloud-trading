import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  
  // Environment variables
  env: {
    NEXT_PUBLIC_TRADING_API: process.env.NEXT_PUBLIC_TRADING_API || 'http://localhost:3000',
    NEXT_PUBLIC_MARKET_DATA_API: process.env.NEXT_PUBLIC_MARKET_DATA_API || 'http://localhost:8000',
    NEXT_PUBLIC_MARKET_DATA_WS: process.env.NEXT_PUBLIC_MARKET_DATA_WS || 'ws://localhost:8000',
  },
  
  // Disable strict mode in production for better performance
  reactStrictMode: true,
  
  // Image optimization
  images: {
    domains: [],
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
