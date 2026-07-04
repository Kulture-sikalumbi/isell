import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Azure zip deploy often skips dot-folders like ".next"
  distDir: "build",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
