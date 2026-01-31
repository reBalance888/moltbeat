import { z, ZodSchema } from 'zod';
import { ValidationError } from '@moltbeat/errors';

/**
 * Validation middleware for Express/Hono
 */

/**
 * Validate request body against a Zod schema
 *
 * Usage (Express):
 * ```typescript
 * app.post('/agents', validateBody(createAgentSchema), async (req, res) => {
 *   // req.body is now typed and validated
 * });
 * ```
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: any, res: any, next: any) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError('Request body validation failed', {
          errors: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
        next(validationError);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate query parameters against a Zod schema
 *
 * Usage (Express):
 * ```typescript
 * app.get('/posts', validateQuery(getPostsQuerySchema), async (req, res) => {
 *   // req.query is now typed and validated
 * });
 * ```
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: any, res: any, next: any) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError('Query parameters validation failed', {
          errors: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
        next(validationError);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate URL parameters against a Zod schema
 *
 * Usage (Express):
 * ```typescript
 * app.get('/agents/:agentId', validateParams(agentIdParamSchema), async (req, res) => {
 *   // req.params is now typed and validated
 * });
 * ```
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return (req: any, res: any, next: any) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError('URL parameters validation failed', {
          errors: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
        next(validationError);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Hono-compatible validation middleware
 *
 * Usage (Hono):
 * ```typescript
 * import { honoValidate } from '@moltbeat/validation';
 *
 * app.post('/agents', honoValidate('body', createAgentSchema), async (c) => {
 *   const body = c.req.valid('body');
 *   // body is typed and validated
 * });
 * ```
 */
export function honoValidate(target: 'body' | 'query' | 'param', schema: ZodSchema) {
  return async (c: any, next: any) => {
    let data: any;

    if (target === 'body') {
      data = await c.req.json();
    } else if (target === 'query') {
      data = c.req.query();
    } else if (target === 'param') {
      data = c.req.param();
    }

    try {
      const validated = schema.parse(data);
      c.req.addValidatedData(target, validated);
      await next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(`${target} validation failed`, {
          errors: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      throw error;
    }
  };
}

/**
 * Validate data against a schema without middleware
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws ValidationError if validation fails
 *
 * Usage:
 * ```typescript
 * const validatedData = validate(createAgentSchema, requestData);
 * ```
 */
export function validate<T extends ZodSchema>(schema: T, data: unknown): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Validation failed', {
        errors: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    throw error;
  }
}

/**
 * Safe validation that returns a result object instead of throwing
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Result object with success flag and data/errors
 *
 * Usage:
 * ```typescript
 * const result = safeValidate(createAgentSchema, requestData);
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.errors);
 * }
 * ```
 */
export function safeValidate<T extends ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: Array<{ path: string; message: string }> } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      };
    }
    return {
      success: false,
      errors: [{ path: '', message: error.message || 'Unknown validation error' }],
    };
  }
}
