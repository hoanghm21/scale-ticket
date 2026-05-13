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
  // Proxy API calls to the gateway so the frontend never needs hardcoded URLs.
  // In production, set GATEWAY_URL to the real gateway address.
  async rewrites() {
    const gateway = process.env.GATEWAY_URL || "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${gateway}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
