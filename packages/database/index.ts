import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// If an existing global instance lacks new models (e.g., dev server started before schema push), refresh it
if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).tournamentDraw) {
  try {
    (globalForPrisma.prisma as any).$disconnect?.();
  } catch {}
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
})

globalForPrisma.prisma = prisma

export { PrismaClient, Prisma } from '@prisma/client'
