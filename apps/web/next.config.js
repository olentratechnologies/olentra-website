const path = require('node:path');

const repoRoot = path.join(__dirname, '../..');
// The website reads, and the company workspace (apps/admin) writes, one shared
// feature-switch file. Both apps default to the same repository-level path.
process.env.OLENTRA_FEATURE_STORE_PATH ||= path.join(repoRoot, '.data', 'site-features.json');
const adminUrl = (process.env.OLENTRA_ADMIN_URL || 'http://localhost:3002').replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@olentra/site-features', '@olentra/ui', '@olentra/realtime'],
  outputFileTracingRoot: repoRoot,
  async redirects() {
    return [
      {
        source: '/founders',
        destination: '/about#founders',
        permanent: true,
      },
      // The company workspace is a separate app; keep old /dashboard links working.
      {
        source: '/dashboard/:path*',
        destination: `${adminUrl}/dashboard/:path*`,
        permanent: false,
      },
    ];
  },
  webpack(config, { dev }) {
    if (dev) {
      config.module.rules.push({
        test: /mini-css-extract-plugin[\\/]hmr[\\/]hotModuleReplacement\.js$/,
        enforce: 'pre',
        use: require.resolve('@olentra/ui/build/css-hmr-guard-loader.cjs'),
      });
    }
    return config;
  },
  images: {
    qualities: [65, 75],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'rami-silks-api.s3.ap-south-1.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
