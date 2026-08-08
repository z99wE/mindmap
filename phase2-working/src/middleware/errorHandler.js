/**
 * Global Error Handler Middleware & Async Wrapper
 * 
 * Prevents unhandled promise rejections from crashing the Node process.
 * Intercepts raw 3rd-party API errors (Stripe, OpenAI, Caspian) and
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
 * Global Express Error Handler.
 * Place this AFTER all other app.use() routes in server.js.
 */
const globalErrorHandler = (err, req, res, next) => {
  console.error('[Error Intercepted]', err.message, err.stack);

  // 1. Mask LLM / API errors gracefully
  const message = err.message.toLowerCase();
  if (
    message.includes('rate limit') || 
    message.includes('quota') || 
    message.includes('timeout') ||
    message.includes('billing') ||
    message.includes('insufficient_quota') ||
    message.includes('stripe') ||
    message.includes('openai') ||
    message.includes('caspian') ||
    err.status === 429
  ) {
    return res.status(503).json({
      error: 'The cognitive engine is currently under high load processing background memories. Please try again in a moment.',
      code: 'HIGH_COGNITIVE_LOAD'
    });
  }

  // 2. Handle DB/SQL errors safely without leaking schema
  if (err.code && err.code.length === 5) { // typical postgres error codes are 5 chars
    return res.status(500).json({
      error: 'Synthesizing too many thoughts simultaneously, please wait.',
      code: 'DB_SYNC_DELAY'
    });
  }

  // 3. Fallback for all other errors
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'An unexpected ripple occurred in the memory graph.' 
      : err.message
  });
};

module.exports = {
  asyncHandler,
  globalErrorHandler
};
