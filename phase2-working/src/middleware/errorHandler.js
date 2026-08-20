/**
 * Global Error Handler Middleware & Async Wrapper
 * 
 * Standardizes all error responses with consistent format:
 * { error, code, details?, requestId? }
 * 
 * Prevents unhandled promise rejections from crashing the Node process.
 * Intercepts raw 3rd-party API errors (Stripe, OpenAI) and
 * masks them into organic application messages ("High Cognitive Load").
 */

/**
 * Wraps async route handlers to pass rejections directly to the global error handler.
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Create a standardized API error with code, status, and optional details.
 */
class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
  }
}

/**
 * Global Express Error Handler.
 * Place this AFTER all other app.use() routes in server.js.
 * 
 * Returns a consistent JSON envelope: { error, code, details?, requestId? }
 */
const globalErrorHandler = (err, req, res, _next) => {
  const requestId = req?.id || 'unknown';
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(`[Error Intercepted] [${requestId}]`, err.message);
  if (!isProduction) {
    console.error(err.stack);
  }

  // 1. Handle known ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      details: isProduction ? undefined : err.details,
      requestId,
    });
  }

  // 2. Mask LLM / API errors gracefully
  const message = err.message ? err.message.toLowerCase() : '';
  if (
    message.includes('rate limit') || 
    message.includes('quota') || 
    message.includes('timeout') ||
    message.includes('billing') ||
    message.includes('insufficient_quota') ||
    message.includes('stripe') ||
    message.includes('openai') ||
    err.status === 429
  ) {
    return res.status(503).json({
      error: 'The cognitive engine is currently under high load processing background memories. Please try again in a moment.',
      code: 'HIGH_COGNITIVE_LOAD',
      requestId,
    });
  }

  // 3. Handle DB/SQL errors safely without leaking schema
  if (err.code && typeof err.code === 'string' && err.code.length === 5) {
    return res.status(500).json({
      error: 'Synthesizing too many thoughts simultaneously, please wait.',
      code: 'DB_SYNC_DELAY',
      requestId,
    });
  }

  // 4. Handle validation errors
  if (err.name === 'ValidationError' || err.name === 'SyntaxError') {
    return res.status(400).json({
      error: isProduction ? 'Invalid request format.' : err.message,
      code: 'VALIDATION_ERROR',
      requestId,
    });
  }

  // 5. Fallback for all other errors
  res.status(err.status || 500).json({
    error: isProduction 
      ? 'An unexpected ripple occurred in the memory graph.' 
      : err.message,
    code: err.code || 'INTERNAL_ERROR',
    requestId,
  });
};

module.exports = {
  asyncHandler,
  globalErrorHandler,
  ApiError,
};
