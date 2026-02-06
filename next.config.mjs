/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: 'buffer/',
        process: 'process/browser',
        fs: false,
        path: false,
        os: false,
        net: false,
        tls: false,
      };
      
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );
    }
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
