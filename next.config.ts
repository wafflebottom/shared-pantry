import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["192.168.0.11", "192.168.0.55", "Simons-MacBook-Pro.local"],
};

export default nextConfig;
