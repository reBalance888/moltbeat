import * as dotenv from 'dotenv';
import * as path from 'path';
import { BaseConfigSchema, type BaseConfig, type NodeEnv } from './schemas';

/**
 * Configuration service for MoltBeat
 * Validates environment variables on startup and provides type-safe access
 */
export class ConfigService {
  private static instance: ConfigService | null = null;
  private config: BaseConfig;

  private constructor() {
    // Load environment variables from .env files
    this.loadEnvFiles();

    // Validate and parse configuration
    this.config = this.validateConfig();
  }

  /**
   * Get singleton instance of ConfigService
   * @throws Error if configuration is invalid
   */
  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Load environment variables from .env files
   * Loads in order: .env.local, .env.[NODE_ENV], .env
   */
  private loadEnvFiles(): void {
    const env = process.env.NODE_ENV || 'development';
    const rootDir = this.findRootDir();

    // Load in reverse priority order (later files override earlier ones)
    const envFiles = [
      path.join(rootDir, '.env'),
      path.join(rootDir, `.env.${env}`),
      path.join(rootDir, '.env.local'),
    ];

    for (const file of envFiles) {
      dotenv.config({ path: file });
    }
  }

  /**
   * Find the monorepo root directory
   */
  private findRootDir(): string {
    let currentDir = __dirname;
    while (currentDir !== path.parse(currentDir).root) {
      if (require('fs').existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    // Fallback to current directory if not found
    return process.cwd();
  }

  /**
   * Validate configuration against schema
   * @throws Error with detailed validation errors if invalid
   */
  private validateConfig(): BaseConfig {
    try {
      return BaseConfigSchema.parse(process.env);
    } catch (error: any) {
      const errorMessage = this.formatValidationError(error);
      console.error('❌ Configuration validation failed:\n', errorMessage);
      throw new Error(`Invalid configuration: ${errorMessage}`);
    }
  }

  /**
   * Format Zod validation errors for readability
   */
  private formatValidationError(error: any): string {
    if (error.errors && Array.isArray(error.errors)) {
      return error.errors
        .map((err: any) => {
          const path = err.path.join('.');
          return `  - ${path}: ${err.message}`;
        })
        .join('\n');
    }
    return error.message || 'Unknown validation error';
  }

  /**
   * Get the full configuration object
   */
  public getConfig(): Readonly<BaseConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Get a specific configuration value
   */
  public get<K extends keyof BaseConfig>(key: K): BaseConfig[K] {
    return this.config[key];
  }

  /**
   * Check if running in production
   */
  public isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  /**
   * Check if running in development
   */
  public isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  /**
   * Check if running in test
   */
  public isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  /**
   * Get the current environment
   */
  public getEnvironment(): NodeEnv {
    return this.config.NODE_ENV;
  }

  /**
   * Get database connection URL
   */
  public getDatabaseUrl(): string {
    return this.config.DATABASE_URL;
  }

  /**
   * Get Redis configuration
   */
  public getRedisConfig(): { url: string; token: string } {
    return {
      url: this.config.UPSTASH_REDIS_REST_URL,
      token: this.config.UPSTASH_REDIS_REST_TOKEN,
    };
  }

  /**
   * Get JWT configuration
   */
  public getJwtConfig(): { secret: string; expiresIn: string; refreshExpiresIn: string } {
    return {
      secret: this.config.JWT_SECRET,
      expiresIn: this.config.JWT_EXPIRES_IN,
      refreshExpiresIn: this.config.JWT_REFRESH_EXPIRES_IN,
    };
  }

  /**
   * Get API configuration
   */
  public getApiConfig(): { port: number; host: string; rateLimitWindowMs: number; rateLimitMaxRequests: number } {
    return {
      port: this.config.API_PORT,
      host: this.config.API_HOST,
      rateLimitWindowMs: this.config.API_RATE_LIMIT_WINDOW_MS,
      rateLimitMaxRequests: this.config.API_RATE_LIMIT_MAX_REQUESTS,
    };
  }

  /**
   * Get CORS allowed origins
   */
  public getCorsOrigins(): string[] {
    return this.config.CORS_ALLOWED_ORIGINS;
  }

  /**
   * Get Moltbook API configuration
   */
  public getMoltbookConfig(): { apiKey: string; baseUrl: string } {
    return {
      apiKey: this.config.MOLTBOOK_API_KEY,
      baseUrl: this.config.MOLTBOOK_BASE_URL,
    };
  }
}

/**
 * Convenience function to get config instance
 */
export function getConfig(): ConfigService {
  return ConfigService.getInstance();
}

// Re-export types and utilities
export * from './schemas';
export * from './secrets';
