const path = require('node:path');

const repoRoot = path.join(__dirname, '../..');
// The company workspace writes, and the website (apps/web) reads, one shared
// feature-switch file. Both apps default to the same repository-level path.
if (process.env.NODE_ENV !== 'production') {
  process.env.OLENTRA_FEATURE_STORE_PATH ||= path.join(repoRoot, '.data', 'site-features.json');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['*.*.*.*', '*.*', '**.*'],
  transpilePackages: ['@olentra/site-features', '@olentra/ui', '@olentra/realtime'],
  outputFileTracingRoot: repoRoot,
  async redirects() {
    return [{ source: '/', destination: '/dashboard', permanent: false }];
  },
  async headers() {
    // Workspace pages and APIs are never cached (the website proxy set this before the split).
    return [{ source: '/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }] }];
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
};

module.exports = nextConfig;
