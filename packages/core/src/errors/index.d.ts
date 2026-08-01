/**
 * Application Error Classes
 * All errors extend AppError for consistent handling
 */
export declare class AppError extends Error {
    code: string;
    statusCode: number;
    message: string;
    details?: Record<string, unknown> | undefined;
    constructor(code: string, statusCode: number, message: string, details?: Record<string, unknown> | undefined);
    toJSON(): {
        error: {
            code: string;
            message: string;
            details: Record<string, unknown> | undefined;
        };
    };
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class NotFoundError extends AppError {
    constructor(resource: string, id: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class RateLimitError extends AppError {
    constructor(retryAfter: number);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
export declare class InternalError extends AppError {
    constructor(message: string, originalError?: Error);
}
export declare class ServiceUnavailableError extends AppError {
    constructor(service: string);
}
export declare class TimeoutError extends AppError {
    constructor(operation: string, timeout_ms: number);
}
//# sourceMappingURL=index.d.ts.map