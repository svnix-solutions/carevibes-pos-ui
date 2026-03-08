import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "carevibes.m.frappe.cloud",
      },
    ],
  },
};

export default nextConfig;
