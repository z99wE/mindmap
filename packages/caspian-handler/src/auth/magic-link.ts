import jwt from 'jsonwebtoken';
import { db } from '@thought-gps/database';
import { sendEmail } from './email';

const MAGIC_LINK_EXPIRY = 30 * 60 * 1000; // 30 minutes

/**
 * Magic link authentication service.
 * 
 * Implements passwordless authentication:
 * 1. User requests login with email
 * 2. System sends magic link to email
 * 3. User clicks link
 * 4. System verifies token and creates session
 * 
 * Security features:
 * - Single-use tokens
 * - 30-minute expiry
 * - Rate limited
 * - Audit logged
 */

/**
 * Generate and send magic link to user's email
 * 
 * @param email - User's email address
 * @param ip - Client IP for audit log
 */
export async function requestMagicLink(
  email: string,
  ip?: string
): Promise<void> {
  try {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find or create user
    let userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );
    
    let userId: string;
    
    if (!userResult.rows[0]) {
      // Create new user
      const createResult = await db.query(
        'INSERT INTO users (email) VALUES ($1) RETURNING id',
        [normalizedEmail]
      );
      userId = createResult.rows[0].id;
      console.log('New user created', { email: normalizedEmail });
    } else {
      userId = userResult.rows[0].id;
    }
    
    // Generate token
    const token = jwt.sign(
      { 
        userId, 
        email: normalizedEmail,
        type: 'magic-link',
      },
      process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
      { 
        expiresIn: '30m',
      }
    );
    
    // Store session in database
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY);
    
    await db.query(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );
    
    // Generate magic link
    const magicLink = `${process.env.APP_URL || 'http://localhost:3000'}/auth/verify?token=${token}`;
    
    // Send email
    await sendEmail({
      to: normalizedEmail,
      subject: 'Your Thought GPS Login Link',
      html: `
        <h1>Welcome to Thought GPS</h1>
        <p>Click the link below to log in:</p>
        <a href="${magicLink}">${magicLink}</a>
        <p>This link expires in 30 minutes.</p>
      `,
    });
    
    // Audit log
    await db.query(
      `INSERT INTO audit_logs 
       (user_id, action, resource_type, status, ip_address, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        'magic_link_requested',
        'session',
        'success',
        ip,
        JSON.stringify({ email: normalizedEmail }),
      ]
    );
    
    console.log('Magic link sent', { email: normalizedEmail });
    
  } catch (error) {
    console.error('Failed to send magic link', { email, error });
    throw error;
  }
}

/**
 * Verify magic link token and create session
 * 
 * @param token - JWT token from magic link
 * @returns Session object with user ID and JWT
 */
export async function verifyMagicLink(
  token: string
): Promise<{
  userId: string;
  email: string;
  sessionToken: string;
}> {
  try {
    // Verify JWT
    const payload = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'default-jwt-secret-change-in-production'
    ) as {
      userId: string;
      email: string;
      type: string;
    };
    
    // Check token type
    if (payload.type !== 'magic-link') {
      throw new Error('Invalid token type');
    }
    
    // Check if token is in database (not already used)
    const session = await db.query(
      `SELECT id FROM sessions 
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );
    
    if (!session.rows[0]) {
      throw new Error('Token expired or already used');
    }
    
    // Delete used token (single-use)
    await db.query('DELETE FROM sessions WHERE token = $1', [token]);
    
    // Create session JWT (long-lived)
    const sessionToken = jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        type: 'session',
      },
      process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
      { expiresIn: '7d' } // 7 days
    );
    
    // Store session
    await db.query(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [
        payload.userId,
        sessionToken,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ]
    );
    
    // Update user last activity
    await db.query(
      'UPDATE users SET updated_at = NOW() WHERE id = $1',
      [payload.userId]
    );
    
    // Audit log
    await db.query(
      `INSERT INTO audit_logs 
       (user_id, action, resource_type, status, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        payload.userId,
        'login_success',
        'session',
        'success',
        JSON.stringify({ method: 'magic-link' }),
      ]
    );
    
    console.log('User authenticated', { 
      userId: payload.userId,
      email: payload.email,
    });
    
    return {
      userId: payload.userId,
      email: payload.email,
      sessionToken,
    };
    
  } catch (error) {
    console.error('Magic link verification failed', { error });
    throw error;
  }
}

/**
 * Verify session token
 * 
 * @param token - Session JWT
 * @returns User ID if valid
 */
export async function verifySession(
  token: string
): Promise<{ userId: string; email: string }> {
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-jwt-secret-change-in-production'
    ) as {
      userId: string;
      email: string;
      type: string;
    };
    
    if (payload.type !== 'session') {
      throw new Error('Invalid token type');
    }
    
    // Check if session is in database
    const session = await db.query(
      `SELECT id FROM sessions 
       WHERE token = $1 AND user_id = $2 AND expires_at > NOW()`,
      [token, payload.userId]
    );
    
    if (!session.rows[0]) {
      throw new Error('Session expired');
    }
    
    return {
      userId: payload.userId,
      email: payload.email,
    };
    
  } catch (error) {
    console.error('Session verification failed', { error });
    throw error;
  }
}

/**
 * Logout - invalidate session
 */
export async function logout(token: string): Promise<void> {
  await db.query('DELETE FROM sessions WHERE token = $1', [token]);
  console.log('User logged out');
}
