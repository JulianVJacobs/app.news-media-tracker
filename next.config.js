/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output only in production for Electron compatibility
  // In development, run normally for better dev experience
  // ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),

  // Configure webpack for Electron compatibility
  webpack: (config, { isServer, dev }) => {
    // Don't bundle these packages - they'll be available in the Electron environment
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }

    return config;
  },

  // Keep TypeScript and ESLint checking enabled for better development experience
  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
