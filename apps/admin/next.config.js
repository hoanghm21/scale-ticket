/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@scale-ticket/shared-types"],
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
