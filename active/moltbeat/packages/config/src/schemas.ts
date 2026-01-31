import { z } from 'zod';

/**
 * Environment configuration schemas with validation
 */

const NodeEnvSchema = z.enum(['development', 'staging', 'production', 'test']);

const BaseConfigSchema = z.object({
  NODE_ENV: NodeEnvSchema.default('development'),

  // Database
  DATABASE_URL: z.string().url('Invalid DATABASE_URL').min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().url('Invalid DIRECT_URL').optional(),

  // Redis Cache
  UPSTASH_REDIS_REST_URL: z.string().url('Invalid UPSTASH_REDIS_REST_URL').min(1, 'UPSTASH_REDIS_REST_URL is required'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),

  // JWT Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Moltbook API
  MOLTBOOK_API_KEY: z.string().min(1, 'MOLTBOOK_API_KEY is required'),
  MOLTBOOK_BASE_URL: z.string().url().default('https://www.moltbook.com/api/v1'),

  // API Configuration
  API_PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  API_HOST: z.string().default('0.0.0.0'),
  API_RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).default('60000'), // 1 minute
  API_RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).transform(Number).default('1000'),

  // CORS
  CORS_ALLOWED_ORIGINS: z.string().transform((val) => val.split(',')).default('http://localhost:3000,http://localhost:5173'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Optional Services
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Agent API Keys (for MoltBeat agents)
  MOLTBEAT_NEWS_API_KEY: z.string().optional(),
  MOLTBEAT_DATA_API_KEY: z.string().optional(),
  MOLTBEAT_WELCOME_API_KEY: z.string().optional(),
  MOLTBEAT_ARCHIVE_API_KEY: z.string().optional(),
  MOLTBEAT_ALERTS_API_KEY: z.string().optional(),
});

export type BaseConfig = z.infer<typeof BaseConfigSchema>;
export type NodeEnv = z.infer<typeof NodeEnvSchema>;

export { BaseConfigSchema, NodeEnvSchema };
