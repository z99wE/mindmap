// Middleware: Audit logging + RLS context + XSS sanitization
const { pool } = require('./db');

// ── Audit Logger ─────────────────────────────────────────────────────────────
// Logs sensitive operations (DELETE, status changes, key storage, account deletion)
// Does NOT log reads to avoid noisy writes on free-tier storage
async function logAudit({ userId, action, resourceType, resourceId, ipAddress }) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, action, resource_type, resource_id, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, resourceType, resourceId, ipAddress]
    );
  } catch {
    // Audit logging should never break the request
  }
}

// Express middleware: auto-log DELETE requests and POST actions on sensitive routes
function auditMiddleware(req, res, next) {
  const originalEnd = res.end;
  res.end = function (...args) {
    // Only log successful write operations on sensitive routes
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user?.userId) {
      const method = req.method;
      const path = req.path;

      if (
        method === 'DELETE' ||
        (method === 'POST' && (path.includes('/witness') || path.includes('/keys'))) ||
        (method === 'PUT' && path.includes('/tier')) ||
        (method === 'PUT' && path.includes('/complete'))
      ) {
        logAudit({
          userId: req.user.userId,
          action: method,
          resourceType: path.split('/').filter(Boolean).join('/'),
          resourceId: req.params?.id || null,
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
        });
      }
    }
    return originalEnd.apply(res, args);
  };
  next();
}

// ── XSS Sanitizer ────────────────────────────────────────────────────────────
// Lightweight regex-based sanitizer (no external deps)
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)[^>]*>/gi, (match) =>
      match.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    )
    .replace(/javascript\s*:/gi, '')
    .replace(/<\s*iframe\b[^>]*>.*?<\s*\/\s*iframe\s*>/gi, '')
    .replace(/<\s*object\b[^>]*>.*?<\s*\/\s*object\s*>/gi, '')
    .replace(/<\s*embed\b[^>]*>/gi, '');
}

// Express middleware: sanitize all string fields in req.body
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    }
  }
  next();
}

module.exports = { logAudit, auditMiddleware, sanitizeInput, sanitizeBody };
