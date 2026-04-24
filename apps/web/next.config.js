/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@scale-ticket/ui", "@scale-ticket/shared-types", "@scale-ticket/utils"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.scaleticket.io",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["@scale-ticket/ui"],
  },
};

module.exports = nextConfig;
