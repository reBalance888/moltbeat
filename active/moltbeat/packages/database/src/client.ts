import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma client instance with optimized configuration
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'minimal',
});

/**
 * Prisma client with connection pooling optimized for production
 */
export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Check database connectivity
 * @returns True if connected, false otherwise
 */
export async function isDatabaseConnected(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get database connection latency in milliseconds
 */
export async function getDatabaseLatency(): Promise<number> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Date.now() - start;
  } catch (error) {
    return -1;
  }
}

// Graceful shutdown on process termination
if (process.env.NODE_ENV !== 'test') {
  process.on('beforeExit', async () => {
    await disconnectDatabase();
  });
}

export default prisma;
