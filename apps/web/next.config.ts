import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["database"],
  env: {
    DATABASE_URL: process.env.DATABASE_URL || "postgres://postgres.gogtqabihqcoxozanklp:Cricket%402026%40CPL@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
    DIRECT_URL: process.env.DIRECT_URL || "postgres://postgres.gogtqabihqcoxozanklp:Cricket%402026%40CPL@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
  },
};

export default nextConfig;
