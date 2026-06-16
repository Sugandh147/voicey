import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias["@clerk/nextjs/server"] = path.resolve(__dirname, "./src/lib/clerk-mock-server.ts");
    config.resolve.alias["@clerk/nextjs"] = path.resolve(__dirname, "./src/lib/clerk-mock-client.tsx");
    return config;
  },
  turbopack: {
    resolveAlias: {
      "@clerk/nextjs/server": "./src/lib/clerk-mock-server.ts",
      "@clerk/nextjs": "./src/lib/clerk-mock-client.tsx"
    }
  }
};

export default nextConfig;
