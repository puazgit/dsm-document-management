/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Experimental features
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs']
  },

  // Environment variables
  env: {
    APP_NAME: process.env.APP_NAME || 'Document Management System',
    APP_VERSION: process.env.APP_VERSION || '1.0.0',
  },

  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Headers for security
  async headers() {
    return [
      // Default security headers for all routes except API documents
      {
        source: '/((?!api/documents).)*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      },
      // Allow iframe for document view API
      {
        source: '/api/documents/:id/view',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'"
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false
      }
    ]
  },

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Handle PDF.js worker
    config.resolve.alias = {
      ...config.resolve.alias,
      'pdfjs-dist/build/pdf.worker.js': 'pdfjs-dist/build/pdf.worker.min.js',
    }

    // Handle canvas for PDF rendering
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    }

    // Ignore specific warnings
    config.ignoreWarnings = [
      /Module not found: Can't resolve 'canvas'/,
      /Critical dependency: the request of a dependency is an expression/,
    ]

    // Optimize chunks to prevent loading errors
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            default: {
              chunks: 'async',
              minSize: 20000,
              maxSize: 244000,
            },
          },
        },
      }
    }

    return config
  },

  // Output configuration for standalone deployment
  output: 'standalone',

  // Compression
  compress: true,

  // Power to disable X-Powered-By header
  poweredByHeader: false,

  // Trailing slash handling
  trailingSlash: false,

  // ESLint configuration
  eslint: {
    dirs: ['src', 'prisma'],
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // Page extensions
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],

  // API routes configuration
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/uploads/:path*',
          destination: '/uploads/:path*',
        },
      ],
    }
  },

  // Custom server configuration for file uploads
  serverRuntimeConfig: {
    maxFileSize: process.env.MAX_FILE_SIZE || '52428800', // 50MB
    uploadPath: process.env.UPLOAD_PATH || './public/uploads',
  },

  // Public runtime configuration
  publicRuntimeConfig: {
    appName: process.env.APP_NAME || 'Document Management System',
    maxFileSize: process.env.MAX_FILE_SIZE || '52428800',
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,jpg,png',
  },
}

module.exports = nextConfig