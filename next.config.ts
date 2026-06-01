import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  httpAgentOptions: {
    keepAlive: false,
  },
  images: {
    remotePatterns: [
      { hostname: "wnzkhezyhnfzhkhiflrp.supabase.co" },
      { hostname: "images.unsplash.com" },
      { hostname: "cdn.shopify.com" },
    ],
  },
  devIndicators: {
    position: "bottom-left",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  serverExternalPackages: ['@prisma/adapter-pg'],
  
  // Netlify deployment settings
  output: 'standalone',
};

export default nextConfig;
