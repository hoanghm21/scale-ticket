/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@scale-ticket/shared-types"],
};

module.exports = nextConfig;
