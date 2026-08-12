import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client"],
  allowedDevOrigins: ["192.168.10.101", "172.20.10.2", "192.168.1.163"],
};

export default nextConfig;
