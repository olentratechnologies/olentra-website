/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/founders',
        destination: '/about#founders',
        permanent: true,
      },
    ];
  },
  webpack(config, { dev }) {
    if (dev) {
      config.module.rules.push({
        test: /mini-css-extract-plugin[\\/]hmr[\\/]hotModuleReplacement\.js$/,
        enforce: 'pre',
        use: require.resolve('./scripts/webpack/css-hmr-guard-loader.cjs'),
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
