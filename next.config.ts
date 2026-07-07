import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "25mb",
  },
  allowedDevOrigins: ["10.209.178.28", "localhost", "127.0.0.1"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
