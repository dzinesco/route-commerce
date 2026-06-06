import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lock the file-tracing root to the project directory. Without this,
  // Next.js 16 walks up from package.json looking for a lockfile, finds
  // the homelab runner's stale `act` cache at
  // /home/tyler/.cache/act/.../package-lock.json, and warns:
  //   "We detected multiple lockfiles and selected the directory of
  //    /home/tyler/package-lock.json as the root directory."
  // The deploy runner's APP_DIR is /home/tyler/route-commerce, so
  // resolving relative to the project root is correct both locally and
  // in CI.
  outputFileTracingRoot: ".",

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
    return [
      // Add any necessary rewrites here
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