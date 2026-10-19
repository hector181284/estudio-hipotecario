import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Optimización de paquetes para iconos y componentes
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
