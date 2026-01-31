import * as crypto from 'crypto';
import { hashPassword, verifyPassword } from './password';
import { prisma, ApiKey } from '@moltbeat/database';
import { AuthenticationError } from '@moltbeat/errors';
import { hasPermission, Permission } from './roles';

/**
 * Generate a new API key
 * @returns API key string (store hash, return plain to user once)
 */
export function generateApiKey(): string {
  return `mb_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Create API key for user
 * @param userId - User ID
 * @param name - API key name/description
 * @param permissions - Permissions array
 * @param expiresAt - Optional expiration date
 * @returns API key object with plain key (only time it's returned)
 */
export async function createApiKey(
  userId: string,
  name: string,
  permissions: Permission[],
  expiresAt?: Date
): Promise<{ apiKey: ApiKey; plainKey: string }> {
  const plainKey = generateApiKey();
  const hashedKey = await hashPassword(plainKey);

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      key: hashedKey,
      name,
      permissions,
      expiresAt,
    },
  });

  return { apiKey, plainKey };
}

/**
 * Verify API key and return user context
 * @param plainKey - Plain API key from request
 * @returns User context or throws error
 */
export async function verifyApiKey(plainKey: string): Promise<{
  userId: string;
  permissions: Permission[];
  apiKeyId: string;
}> {
  // Find all API keys (we need to hash-compare them)
  const apiKeys = await prisma.apiKey.findMany({
    where: {
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    },
  });

  // Find matching key by comparing hashes
  for (const apiKey of apiKeys) {
    const isValid = await verifyPassword(plainKey, apiKey.key);

    if (isValid) {
      // Update last used timestamp
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      });

      return {
        userId: apiKey.userId,
        permissions: apiKey.permissions as Permission[],
        apiKeyId: apiKey.id,
      };
    }
  }

  throw new AuthenticationError('Invalid API key');
}

/**
 * Middleware for API key authentication (Express)
 *
 * Usage:
 * ```typescript
 * app.get('/api/data', requireApiKey(['read']), async (req, res) => {
 *   // req.apiKey is populated
 * });
 * ```
 */
export function requireApiKey(requiredPermissions: Permission[] = ['read']) {
  return async (req: any, res: any, next: any) => {
    const apiKeyHeader = req.headers['x-api-key'];

    if (!apiKeyHeader) {
      return next(new AuthenticationError('API key required'));
    }

    try {
      const context = await verifyApiKey(apiKeyHeader);

      // Check permissions
      for (const required of requiredPermissions) {
        if (!hasPermission(context.permissions, required)) {
          throw new AuthenticationError(`Missing required permission: ${required}`);
        }
      }

      req.apiKey = context;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Revoke (delete) API key
 */
export async function revokeApiKey(apiKeyId: string): Promise<void> {
  await prisma.apiKey.delete({
    where: { id: apiKeyId },
  });
}

/**
 * List user's API keys
 */
export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  return prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}
