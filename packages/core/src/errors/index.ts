/**
 * Application Error Classes
 * All errors extend AppError for consistent handling
 */

export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    public message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', 400, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', 404, `${resource} not found: ${id}`);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', 403, message);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('RATE_LIMIT', 429, `Rate limit exceeded. Retry after ${retryAfter}s`, {
      retry_after: retryAfter,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', 409, message);
  }
}

export class InternalError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(
      'INTERNAL_ERROR',
      500,
      message,
      originalError ? { original_error: originalError.message } : undefined
    );
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super('SERVICE_UNAVAILABLE', 503, `${service} is currently unavailable`);
  }
}

export class TimeoutError extends AppError {
  constructor(operation: string, timeout_ms: number) {
    super(
      'TIMEOUT',
      504,
      `${operation} timed out after ${timeout_ms}ms`
    );
  }
}
