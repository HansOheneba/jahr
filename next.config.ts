import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Dynamic routes otherwise refetch on every click (stale time 0).
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
