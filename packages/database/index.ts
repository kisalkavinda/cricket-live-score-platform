import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
})

globalForPrisma.prisma = prisma


export { PrismaClient, Prisma } from '@prisma/client'
