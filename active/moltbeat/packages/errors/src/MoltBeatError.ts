import { ErrorCode, ErrorHttpStatus, RetryableErrors } from './codes';

/**
 * Base error class for all MoltBeat errors
 */
export class MoltBeatError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly isRetryable: boolean;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    code: ErrorCode,
    message: string,
    context?: Record<string, any>,
    isRetryable?: boolean
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = ErrorHttpStatus[code] || 500;
    this.isRetryable = isRetryable !== undefined ? isRetryable : RetryableErrors.has(code);
    this.context = context;
    this.timestamp = new Date();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for API responses
   * @param includeStack - Whether to include stack trace (only in development)
   */
  public toJSON(includeStack: boolean = false): Record<string, any> {
    const json: Record<string, any> = {
      error: {
        code: this.code,
        message: this.message,
        timestamp: this.timestamp.toISOString(),
      },
    };

    if (this.context) {
      json.error.context = this.context;
    }

    if (includeStack && this.stack) {
      json.error.stack = this.stack.split('\n');
    }

    return json;
  }
}

/**
 * Authentication errors (1xxx)
 */
export class AuthenticationError extends MoltBeatError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.AUTHENTICATION_REQUIRED, message, context, false);
  }
}

export class InvalidCredentialsError extends MoltBeatError {
  constructor(message: string = 'Invalid credentials', context?: Record<string, any>) {
    super(ErrorCode.INVALID_CREDENTIALS, message, context, false);
  }
}

export class TokenExpiredError extends MoltBeatError {
  constructor(message: string = 'Token has expired', context?: Record<string, any>) {
    super(ErrorCode.TOKEN_EXPIRED, message, context, false);
  }
}

export class InsufficientPermissionsError extends MoltBeatError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
    super(ErrorCode.INSUFFICIENT_PERMISSIONS, message, context, false);
  }
}

/**
 * Validation errors (2xxx)
 */
export class ValidationError extends MoltBeatError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.VALIDATION_FAILED, message, context, false);
  }
}

export class InvalidInputError extends MoltBeatError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.INVALID_INPUT, message, context, false);
  }
}

/**
 * Not found errors (3xxx)
 */
export class NotFoundError extends MoltBeatError {
  constructor(resource: string, identifier: string | number, context?: Record<string, any>) {
    super(
      ErrorCode.RESOURCE_NOT_FOUND,
      `${resource} with identifier '${identifier}' not found`,
      { resource, identifier, ...context },
      false
    );
  }
}

export class AgentNotFoundError extends MoltBeatError {
  constructor(agentId: string, context?: Record<string, any>) {
    super(ErrorCode.AGENT_NOT_FOUND, `Agent '${agentId}' not found`, { agentId, ...context }, false);
  }
}

export class PostNotFoundError extends MoltBeatError {
  constructor(postId: string, context?: Record<string, any>) {
    super(ErrorCode.POST_NOT_FOUND, `Post '${postId}' not found`, { postId, ...context }, false);
  }
}

/**
 * External service errors (4xxx)
 */
export class ExternalServiceError extends MoltBeatError {
  constructor(service: string, message: string, context?: Record<string, any>) {
    super(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      `External service '${service}' error: ${message}`,
      { service, ...context },
      true
    );
  }
}

export class MoltbookApiError extends MoltBeatError {
  constructor(message: string, statusCode?: number, context?: Record<string, any>) {
    super(
      ErrorCode.MOLTBOOK_API_ERROR,
      `Moltbook API error: ${message}`,
      { statusCode, ...context },
      true
    );
  }
}

export class DatabaseError extends MoltBeatError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.DATABASE_ERROR, `Database error: ${message}`, context, true);
  }
}

/**
 * Rate limiting errors (5xxx)
 */
export class RateLimitError extends MoltBeatError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, context?: Record<string, any>) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, message, { retryAfter, ...context }, false);
    this.retryAfter = retryAfter;
  }
}

/**
 * Internal errors (7xxx)
 */
export class InternalServerError extends MoltBeatError {
  constructor(message: string = 'Internal server error', context?: Record<string, any>) {
    super(ErrorCode.INTERNAL_SERVER_ERROR, message, context, false);
  }
}

export class ConfigurationError extends MoltBeatError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.CONFIGURATION_ERROR, `Configuration error: ${message}`, context, false);
  }
}
