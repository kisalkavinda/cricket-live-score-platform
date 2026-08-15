if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://postgres.gogtqabihqcoxozanklp:Cricket%402026%40CPL@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = "postgres://postgres.gogtqabihqcoxozanklp:Cricket%402026%40CPL@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
}

import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export { PrismaClient, Prisma } from '@prisma/client'
