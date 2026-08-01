"use strict";
/**
 * Application Error Classes
 * All errors extend AppError for consistent handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutError = exports.ServiceUnavailableError = exports.InternalError = exports.ConflictError = exports.RateLimitError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    constructor(code, statusCode, message, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.message = message;
        this.details = details;
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
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, details) {
        super('VALIDATION_ERROR', 400, message, details);
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(resource, id) {
        super('NOT_FOUND', 404, `${resource} not found: ${id}`);
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super('UNAUTHORIZED', 401, message);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super('FORBIDDEN', 403, message);
    }
}
exports.ForbiddenError = ForbiddenError;
class RateLimitError extends AppError {
    constructor(retryAfter) {
        super('RATE_LIMIT', 429, `Rate limit exceeded. Retry after ${retryAfter}s`, {
            retry_after: retryAfter,
        });
    }
}
exports.RateLimitError = RateLimitError;
class ConflictError extends AppError {
    constructor(message) {
        super('CONFLICT', 409, message);
    }
}
exports.ConflictError = ConflictError;
class InternalError extends AppError {
    constructor(message, originalError) {
        super('INTERNAL_ERROR', 500, message, originalError ? { original_error: originalError.message } : undefined);
    }
}
exports.InternalError = InternalError;
class ServiceUnavailableError extends AppError {
    constructor(service) {
        super('SERVICE_UNAVAILABLE', 503, `${service} is currently unavailable`);
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
class TimeoutError extends AppError {
    constructor(operation, timeout_ms) {
        super('TIMEOUT', 504, `${operation} timed out after ${timeout_ms}ms`);
    }
}
exports.TimeoutError = TimeoutError;
//# sourceMappingURL=index.js.map