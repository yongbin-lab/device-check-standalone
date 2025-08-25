import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: '/device-check-standalone',
  assetPrefix: '/device-check-standalone/',
};

export default nextConfig;
