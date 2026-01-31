import { MoltBeatError, InternalServerError } from './MoltBeatError';

/**
 * Express-compatible error handler middleware
 *
 * Usage:
 * ```typescript
 * import { errorHandler } from '@moltbeat/errors';
 * app.use(errorHandler);
 * ```
 */
export function errorHandler(
  error: any,
  req: any,
  res: any,
  next: any
): void {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  // Determine if we should show stack traces
  const isDevelopment = process.env.NODE_ENV === 'development';

  let moltbeatError: MoltBeatError;

  // Convert to MoltBeatError if not already
  if (error instanceof MoltBeatError) {
    moltbeatError = error;
  } else {
    // Wrap unknown errors
    moltbeatError = new InternalServerError(
      error.message || 'An unexpected error occurred',
      {
        originalError: error.name,
        ...(isDevelopment && { originalStack: error.stack }),
      }
    );
  }

  // Log error
  console.error('[ERROR]', {
    code: moltbeatError.code,
    message: moltbeatError.message,
    context: moltbeatError.context,
    stack: isDevelopment ? moltbeatError.stack : undefined,
    requestId: (req as any).id,
    path: req.path,
    method: req.method,
  });

  // Send error response
  res.status(moltbeatError.httpStatus).json(moltbeatError.toJSON(isDevelopment));
}

/**
 * Async handler wrapper to catch errors in async route handlers
 *
 * Usage:
 * ```typescript
 * import { asyncHandler } from '@moltbeat/errors';
 *
 * app.get('/agents/:id', asyncHandler(async (req, res) => {
 *   const agent = await getAgent(req.params.id);
 *   res.json(agent);
 * }));
 * ```
 */
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Hono-compatible error handler
 *
 * Usage:
 * ```typescript
 * import { honoErrorHandler } from '@moltbeat/errors';
 * app.onError(honoErrorHandler);
 * ```
 */
export function honoErrorHandler(error: any, c: any) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  let moltbeatError: MoltBeatError;

  if (error instanceof MoltBeatError) {
    moltbeatError = error;
  } else {
    moltbeatError = new InternalServerError(
      error.message || 'An unexpected error occurred',
      {
        originalError: error.name,
        ...(isDevelopment && { originalStack: error.stack }),
      }
    );
  }

  // Log error
  console.error('[ERROR]', {
    code: moltbeatError.code,
    message: moltbeatError.message,
    context: moltbeatError.context,
    stack: isDevelopment ? moltbeatError.stack : undefined,
  });

  return c.json(moltbeatError.toJSON(isDevelopment), moltbeatError.httpStatus);
}
