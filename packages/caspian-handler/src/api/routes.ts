import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { 
  requestMagicLink, 
  verifyMagicLink, 
  verifySession,
  logout 
} from '../auth/magic-link';
import ThoughtGPSCaspianHandler from '../handler';

const router = Router();
const handler = new ThoughtGPSCaspianHandler({
  // Channel config from environment
  whatsapp: process.env.WHATSAPP_API_TOKEN ? {
    apiToken: process.env.WHATSAPP_API_TOKEN,
  } : undefined,
  telegram: process.env.TELEGRAM_BOT_TOKEN ? {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  } : undefined,
  slack: process.env.SLACK_BOT_TOKEN ? {
    botToken: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
  } : undefined,
  discord: process.env.DISCORD_BOT_TOKEN ? {
    botToken: process.env.DISCORD_BOT_TOKEN,
  } : undefined,
  signal: process.env.SIGNAL_PHONE ? {
    phoneNumber: process.env.SIGNAL_PHONE,
  } : undefined,
  email: process.env.EMAIL_SMTP_HOST ? {
    smtpHost: process.env.EMAIL_SMTP_HOST,
    smtpPort: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
    smtpUser: process.env.EMAIL_SMTP_USER || '',
    smtpPassword: process.env.EMAIL_SMTP_PASSWORD || '',
  } : undefined,
});

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts, please try again later' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests, please slow down' },
});

// Validation schemas
const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const VerifySchema = z.object({
  token: z.string().min(1, 'Token required'),
});

// Auth middleware
async function authenticate(
  req: Request & { user?: any },
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('No token provided');
    }
    
    const { userId, email } = await verifySession(token);
    
    req.user = { id: userId, email };
    next();
    
  } catch (error) {
    next(error);
  }
}

// Error handler
function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('API error', {
    path: req.path,
    method: req.method,
    error,
  });
  
  if (error instanceof z.ZodError) {
    res.status(400).json({ 
      error: 'Validation failed', 
      details: error.errors 
    });
  } else {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

// === PUBLIC ROUTES ===

// Health check
router.get('/health', async (_req, res) => {
  const health = await handler.healthCheck();
  res.json({ status: 'ok', channels: health });
});

// Request magic link
router.post('/auth/login', authLimiter, async (req, res, next) => {
  try {
    const { email } = LoginSchema.parse(req.body);
    
    await requestMagicLink(email, req.ip);
    
    res.json({ 
      success: true, 
      message: 'Check your email for login link' 
    });
  } catch (error) {
    next(error);
  }
});

// Verify magic link
router.get('/auth/verify', async (req, res, next) => {
  try {
    const { token } = VerifySchema.parse(req.query);
    
    const session = await verifyMagicLink(token);
    
    res.json({ 
      success: true, 
      ...session 
    });
  } catch (error) {
    next(error);
  }
});

// === PROTECTED ROUTES ===

// Logout
router.post('/auth/logout', authenticate, async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await logout(token);
    }
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Webhook endpoints (Caspian sends to these)
router.post('/webhook/:channel', apiLimiter, async (req, res, next) => {
  try {
    const channel = req.params.channel as any;
    
    const message = await handler.handleIncomingMessage(
      channel,
      req.body
    );
    
    res.json({ 
      success: true, 
      messageId: message.id 
    });
  } catch (error) {
    next(error);
  }
});

// Send message
router.post(
  '/messages/send',
  authenticate,
  apiLimiter,
  async (req, res, next) => {
    try {
      const { userId, channel, content, attachments } = req.body;
      
      await handler.sendMessage(userId, channel, content, attachments);
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// Get user thoughts
router.get(
  '/thoughts',
  authenticate,
  apiLimiter,
  async (_req, res, next) => {
    try {
      // Implementation will be added in Phase 2
      res.json({ thoughts: [] });
    } catch (error) {
      next(error);
    }
  }
);

// Apply error handler
router.use(errorHandler);

export default router;
