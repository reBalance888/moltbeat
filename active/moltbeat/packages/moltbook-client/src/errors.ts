/**
 * MoltBook API Errors
 */

export class MoltBookError extends Error {
  constructor(
    message: string,
    public status: number,
    public hint?: string
  ) {
    super(message);
    this.name = 'MoltBookError';
  }
}

export class RateLimitError extends MoltBookError {
  constructor(message: string, public retryAfterSeconds: number) {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends MoltBookError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends MoltBookError {
  constructor(resource: string, id: string) {
    super(`${resource} '${id}' not found`, 404);
    this.name = 'NotFoundError';
  }
}
