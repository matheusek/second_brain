/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  bundlePagesRouterDependencies: true,
  experimental: {
    devtoolSegmentExplorer: false
  }
};

export default nextConfig;
