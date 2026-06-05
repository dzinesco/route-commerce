import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable strict mode
  reactStrictMode: true,

  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      // Local self-hosted MinIO (replaces Supabase Storage)
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9000",
        pathname: "/**",
      },
      // Production MinIO behind route.crispygoat.com
      {
        protocol: "https",
        hostname: "storage.route.crispygoat.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // API routes - more restrictive
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-API-Key",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400",
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      // Redirect old paths if needed
      // {
      //   source: '/old-path',
      //   destination: '/new-path',
      //   permanent: true,
      // },
    ];
  },

  // Rewrites for API proxy
  async rewrites() {
    // Storage proxy: /storage/* -> MinIO at the same path
    // Lets brand assets and product images use portable relative URLs
    // (e.g. /storage/brand-logos/<id>/logo.png) in the DB, with Next.js
    // proxying to whichever MinIO endpoint is configured for the environment.
    // Avoids the next/image "upstream resolved to private ip" block on
    // localhost MinIO by keeping the upstream fetch on the server side.
    const storageBase = process.env.STORAGE_PUBLIC_URL || "http://localhost:9000";
    return [
      {
        source: "/storage/:path*",
        destination: `${storageBase}/:path*`,
      },
    ];
  },

  // Experimental features
  experimental: {
    // Enable optimizePackageImports for better bundle size
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons", "framer-motion"],
  },

  // Compiler options
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === "production" 
      ? { exclude: ["error", "warn"] }
      : false,
  },

  // Logging
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
};

export default nextConfig;