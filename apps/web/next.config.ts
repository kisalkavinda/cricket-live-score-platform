import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["database"],
  env: {
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:[REDACTED]@localhost:5432/postgres",
    DIRECT_URL: process.env.DIRECT_URL || "postgresql://postgres:[REDACTED]@localhost:5432/postgres",
  },
};

export default nextConfig;
