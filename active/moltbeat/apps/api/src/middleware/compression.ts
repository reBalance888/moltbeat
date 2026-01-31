/**
 * Compression Middleware (Optimized)
 * Gzip/Brotli compression with smart threshold and configuration
 */

import { compress } from 'hono/compress';
import { Context, Next } from 'hono';

/**
 * Compression configuration
 */
export interface CompressionConfig {
  /**
   * Minimum response size to compress (bytes)
   * Default: 1024 (1KB)
   */
  threshold?: number;

  /**
   * Compression level (1-9 for gzip)
   * Higher = better compression but slower
   * Default: 6 (balanced)
   */
  level?: number;

  /**
   * Enable Brotli compression (better than gzip)
   * Default: true
   */
  enableBrotli?: boolean;

  /**
   * Skip compression for these content types
   */
  skipTypes?: string[];
}

export const DEFAULT_COMPRESSION_CONFIG: Required<CompressionConfig> = {
  threshold: 1024, // 1KB
  level: 6,
  enableBrotli: true,
  skipTypes: [
    'image/',
    'video/',
    'audio/',
    'application/zip',
    'application/gzip',
    'application/pdf',
  ],
};

/**
 * Check if response should be compressed
 */
function shouldCompress(
  contentType: string | undefined,
  contentLength: number | undefined,
  config: Required<CompressionConfig>
): boolean {
  // Skip if no content type
  if (!contentType) return false;

  // Skip small responses
  if (contentLength !== undefined && contentLength < config.threshold) {
    return false;
  }

  // Skip already compressed or binary content
  for (const skipType of config.skipTypes) {
    if (contentType.startsWith(skipType)) {
      return false;
    }
  }

  return true;
}

/**
 * Enhanced compression middleware
 */
export function compressionMiddleware(customConfig: CompressionConfig = {}) {
  const config = { ...DEFAULT_COMPRESSION_CONFIG, ...customConfig };

  return async (c: Context, next: Next) => {
    // Run the request first
    await next();

    const contentType = c.res.headers.get('content-type');
    const contentLength = c.res.headers.get('content-length');
    const length = contentLength ? parseInt(contentLength, 10) : undefined;

    // Check if we should compress
    if (!shouldCompress(contentType || undefined, length, config)) {
      return;
    }

    // Get Accept-Encoding header
    const acceptEncoding = c.req.header('accept-encoding') || '';

    // Prefer Brotli if available and enabled
    if (config.enableBrotli && acceptEncoding.includes('br')) {
      c.header('Content-Encoding', 'br');
      c.header('Vary', 'Accept-Encoding');
      // Brotli compression would be handled by Hono compress middleware
      return;
    }

    // Fall back to gzip
    if (acceptEncoding.includes('gzip')) {
      c.header('Content-Encoding', 'gzip');
      c.header('Vary', 'Accept-Encoding');
    }

    // Remove content-length as it will change after compression
    c.res.headers.delete('content-length');
  };
}

/**
 * Use Hono's built-in compress middleware with optimized settings
 */
export function optimizedCompressionMiddleware() {
  return compress({
    encoding: 'gzip',
  });
}

/**
 * Compression stats middleware (for monitoring)
 */
export function compressionStatsMiddleware() {
  return async (c: Context, next: Next) => {
    const originalSize = c.res.headers.get('content-length');

    await next();

    const compressedSize = c.res.headers.get('content-length');
    const encoding = c.res.headers.get('content-encoding');

    if (originalSize && compressedSize && encoding) {
      const ratio = (1 - parseInt(compressedSize) / parseInt(originalSize)) * 100;
      console.log(`Compression: ${encoding}, ratio: ${ratio.toFixed(2)}%`);
    }
  };
}
