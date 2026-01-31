/**
 * Error code ranges:
 * 1xxx - Authentication errors
 * 2xxx - Validation errors
 * 3xxx - Not found errors
 * 4xxx - External service errors
 * 5xxx - Rate limiting errors
 * 6xxx - Database errors
 * 7xxx - Internal server errors
 */

export enum ErrorCode {
  // Authentication (1xxx)
  AUTHENTICATION_REQUIRED = 1001,
  INVALID_CREDENTIALS = 1002,
  TOKEN_EXPIRED = 1003,
  TOKEN_INVALID = 1004,
  INSUFFICIENT_PERMISSIONS = 1005,
  API_KEY_INVALID = 1006,
  API_KEY_EXPIRED = 1007,

  // Validation (2xxx)
  VALIDATION_FAILED = 2001,
  INVALID_INPUT = 2002,
  MISSING_REQUIRED_FIELD = 2003,
  INVALID_FORMAT = 2004,
  VALUE_OUT_OF_RANGE = 2005,

  // Not Found (3xxx)
  RESOURCE_NOT_FOUND = 3001,
  AGENT_NOT_FOUND = 3002,
  POST_NOT_FOUND = 3003,
  USER_NOT_FOUND = 3004,
  ALERT_NOT_FOUND = 3005,

  // External Service (4xxx)
  EXTERNAL_SERVICE_ERROR = 4001,
  MOLTBOOK_API_ERROR = 4002,
  REDIS_ERROR = 4003,
  DATABASE_ERROR = 4004,
  NETWORK_ERROR = 4005,
  SERVICE_UNAVAILABLE = 4006,

  // Rate Limiting (5xxx)
  RATE_LIMIT_EXCEEDED = 5001,
  TOO_MANY_REQUESTS = 5002,
  QUOTA_EXCEEDED = 5003,

  // Database (6xxx)
  DATABASE_CONNECTION_ERROR = 6001,
  QUERY_FAILED = 6002,
  TRANSACTION_FAILED = 6003,
  CONSTRAINT_VIOLATION = 6004,
  DUPLICATE_ENTRY = 6005,

  // Internal (7xxx)
  INTERNAL_SERVER_ERROR = 7001,
  CONFIGURATION_ERROR = 7002,
  NOT_IMPLEMENTED = 7003,
  OPERATION_FAILED = 7004,
}

/**
 * HTTP status codes for error responses
 */
export const ErrorHttpStatus: Record<ErrorCode, number> = {
  // Authentication
  [ErrorCode.AUTHENTICATION_REQUIRED]: 401,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.TOKEN_INVALID]: 401,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.API_KEY_INVALID]: 401,
  [ErrorCode.API_KEY_EXPIRED]: 401,

  // Validation
  [ErrorCode.VALIDATION_FAILED]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_FORMAT]: 400,
  [ErrorCode.VALUE_OUT_OF_RANGE]: 400,

  // Not Found
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.AGENT_NOT_FOUND]: 404,
  [ErrorCode.POST_NOT_FOUND]: 404,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.ALERT_NOT_FOUND]: 404,

  // External Service
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.MOLTBOOK_API_ERROR]: 502,
  [ErrorCode.REDIS_ERROR]: 503,
  [ErrorCode.DATABASE_ERROR]: 503,
  [ErrorCode.NETWORK_ERROR]: 503,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,

  // Rate Limiting
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.TOO_MANY_REQUESTS]: 429,
  [ErrorCode.QUOTA_EXCEEDED]: 429,

  // Database
  [ErrorCode.DATABASE_CONNECTION_ERROR]: 503,
  [ErrorCode.QUERY_FAILED]: 500,
  [ErrorCode.TRANSACTION_FAILED]: 500,
  [ErrorCode.CONSTRAINT_VIOLATION]: 400,
  [ErrorCode.DUPLICATE_ENTRY]: 409,

  // Internal
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.CONFIGURATION_ERROR]: 500,
  [ErrorCode.NOT_IMPLEMENTED]: 501,
  [ErrorCode.OPERATION_FAILED]: 500,
};

/**
 * Determine if an error is retryable based on error code
 */
export const RetryableErrors = new Set<ErrorCode>([
  ErrorCode.EXTERNAL_SERVICE_ERROR,
  ErrorCode.MOLTBOOK_API_ERROR,
  ErrorCode.REDIS_ERROR,
  ErrorCode.DATABASE_ERROR,
  ErrorCode.NETWORK_ERROR,
  ErrorCode.SERVICE_UNAVAILABLE,
  ErrorCode.DATABASE_CONNECTION_ERROR,
  ErrorCode.QUERY_FAILED,
  ErrorCode.RATE_LIMIT_EXCEEDED,
  ErrorCode.TOO_MANY_REQUESTS,
]);
