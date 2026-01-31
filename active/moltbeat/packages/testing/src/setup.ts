/**
 * Test setup utilities
 */

import { prisma } from '@moltbeat/database';
import { cache } from '@moltbeat/cache';

/**
 * Setup function to run before all tests
 */
export async function setupTests() {
  // Clear database
  await prisma.$executeRaw`TRUNCATE TABLE agents, posts, metrics, alerts, users, api_keys, refresh_tokens CASCADE`;

  // Clear cache
  const redis = cache.getClient();
  await redis.flushdb();
}

/**
 * Teardown function to run after all tests
 */
export async function teardownTests() {
  await prisma.$disconnect();
}

/**
 * Setup function for each test
 */
export async function beforeEachTest() {
  // Optional: clear specific data before each test
}

/**
 * Teardown function for each test
 */
export async function afterEachTest() {
  // Optional: cleanup after each test
}
