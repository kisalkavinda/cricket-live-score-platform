if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:[REDACTED]@localhost:5432/postgres"
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = "postgresql://postgres:[REDACTED]@localhost:5432/postgres"
}

import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export { PrismaClient, Prisma } from '@prisma/client'
