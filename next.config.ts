import type { NextConfig } from "next";
import path from "path";

const isDummyClerk =
  !process.env.CLERK_SECRET_KEY ||
  process.env.CLERK_SECRET_KEY === "sk_test_dummy" ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes("dummy");

const nextConfig: NextConfig = {
  webpack: (config) => {
    if (isDummyClerk) {
      config.resolve.alias["@clerk/nextjs/server"] = path.resolve(__dirname, "./src/lib/clerk-mock-server.ts");
      config.resolve.alias["@clerk/nextjs"] = path.resolve(__dirname, "./src/lib/clerk-mock-client.tsx");
    }
    return config;
  },
  turbopack: isDummyClerk
    ? {
        resolveAlias: {
          "@clerk/nextjs/server": "./src/lib/clerk-mock-server.ts",
          "@clerk/nextjs": "./src/lib/clerk-mock-client.tsx",
        },
      }
    : undefined,
};

export default nextConfig;
