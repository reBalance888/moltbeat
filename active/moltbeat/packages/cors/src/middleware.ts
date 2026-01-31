import { getConfig } from '@moltbeat/config';

export interface CorsConfig {
  allowedOrigins?: string[];
  allowCredentials?: boolean;
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  maxAge?: number;
}

const DEFAULT_CONFIG: CorsConfig = {
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
  allowCredentials: true,
};

function getAllowedOrigins(): string[] {
  const config = getConfig();
  const originsEnv = process.env.CORS_ALLOWED_ORIGINS;

  if (originsEnv) {
    return originsEnv.split(',').map((o) => o.trim());
  }

  // Default origins by environment
  if (config.isDevelopment()) {
    return ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'];
  }

  // Production - must be explicitly set
  return [];
}

/**
 * Express CORS middleware
 */
export function corsMiddleware(customConfig: CorsConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const allowedOrigins = config.allowedOrigins || getAllowedOrigins();

  return (req: any, res: any, next: any) => {
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    // Set credentials header
    if (config.allowCredentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      if (config.allowedMethods) {
        res.setHeader('Access-Control-Allow-Methods', config.allowedMethods.join(', '));
      }

      if (config.allowedHeaders) {
        res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
      }

      if (config.maxAge) {
        res.setHeader('Access-Control-Max-Age', config.maxAge.toString());
      }

      res.status(204).end();
      return;
    }

    // Expose headers for actual requests
    if (config.exposedHeaders) {
      res.setHeader('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
    }

    next();
  };
}

/**
 * Hono CORS middleware
 */
export function honoCorsMiddleware(customConfig: CorsConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const allowedOrigins = config.allowedOrigins || getAllowedOrigins();

  return async (c: any, next: any) => {
    const origin = c.req.header('origin');

    // Check if origin is allowed
    if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
      c.header('Access-Control-Allow-Origin', origin);
    }

    // Set credentials header
    if (config.allowCredentials) {
      c.header('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight requests
    if (c.req.method === 'OPTIONS') {
      if (config.allowedMethods) {
        c.header('Access-Control-Allow-Methods', config.allowedMethods.join(', '));
      }

      if (config.allowedHeaders) {
        c.header('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
      }

      if (config.maxAge) {
        c.header('Access-Control-Max-Age', config.maxAge.toString());
      }

      return c.body(null, 204);
    }

    // Expose headers for actual requests
    if (config.exposedHeaders) {
      c.header('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
    }

    await next();
  };
}
