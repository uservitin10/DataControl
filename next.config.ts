import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "25mb",
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
