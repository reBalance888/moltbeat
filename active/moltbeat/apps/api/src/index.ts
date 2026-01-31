import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { getConfig } from '@moltbeat/config';
import { honoErrorHandler } from '@moltbeat/errors';
import { corsMiddleware } from './middleware/cors';
import { tracingMiddleware } from './middleware/tracing';
import { compressionMiddleware } from './middleware/compression';
import { authMiddleware } from './middleware/auth';
import { loggingMiddleware } from './middleware/logging';
import { honoRateLimitMiddleware } from '@moltbeat/rate-limiter';
import healthRoutes from './routes/health';
import docsRoutes from './routes/docs';
import authRoutes from './routes/auth';
import agentRoutes from './routes/agents';
import postRoutes from './routes/posts';
import metricRoutes from './routes/metrics';
import alertRoutes from './routes/alerts';
import analyticsRoutes from './routes/analytics';
import { disconnectDatabase } from '@moltbeat/database';

// Initialize configuration (validates env vars)
const config = getConfig();
const apiConfig = config.getApiConfig();

// Create Hono app
const app = new Hono();

// Apply global middleware
app.use('*', compressionMiddleware());
app.use('*', corsMiddleware());
app.use('*', tracingMiddleware());
app.use('*', loggingMiddleware());
app.use('*', authMiddleware());
app.use('*', honoRateLimitMiddleware({
  windowMs: apiConfig.rateLimitWindowMs,
  maxRequests: apiConfig.rateLimitMaxRequests,
}));

// Routes
app.route('/health', healthRoutes);
app.route('/', docsRoutes); // Docs and OpenAPI spec
app.route('/auth', authRoutes);
app.route('/api/agents', agentRoutes);
app.route('/api/posts', postRoutes);
app.route('/api/metrics', metricRoutes);
app.route('/api/alerts', alertRoutes);
app.route('/api/analytics', analyticsRoutes);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'MoltBeat API',
    version: '1.0.0',
    status: 'running',
    documentation: '/docs',
    openapi: '/api.json',
  });
});

// Error handler (must be last)
app.onError(honoErrorHandler);

// Start server
const server = serve({
  fetch: app.fetch,
  port: apiConfig.port,
  hostname: apiConfig.host,
});

console.log(`🚀 MoltBeat API running on http://${apiConfig.host}:${apiConfig.port}`);

/**
 * Graceful shutdown handler (P0-009)
 * Handles SIGTERM and SIGINT signals
 */
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  const shutdownTimeout = 30000; // 30 seconds
  let isShuttingDown = false;

  if (isShuttingDown) {
    console.log('Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;

  // Set timeout for forced shutdown
  const forceShutdownTimer = setTimeout(() => {
    console.error('⚠️  Graceful shutdown timeout. Forcing exit...');
    process.exit(1);
  }, shutdownTimeout);

  try {
    // Stop accepting new requests
    console.log('1. Closing HTTP server...');
    server.close();

    // Wait for in-flight requests to complete (handled by server.close())
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Close database connections
    console.log('2. Closing database connections...');
    await disconnectDatabase();

    console.log('✅ Graceful shutdown complete');
    clearTimeout(forceShutdownTimer);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    clearTimeout(forceShutdownTimer);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});
