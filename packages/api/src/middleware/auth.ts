import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

// Admin API key from environment
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

export interface AuthenticatedRequest extends Request {
  isAdmin?: boolean;
  isDemo?: boolean;
}

/**
 * Middleware to require admin API key for protected routes
 * Usage: router.use('/admin', requireAdminAuth);
 */
export function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!ADMIN_API_KEY) {
    logger.warn('ADMIN_API_KEY not configured - admin routes are disabled');
    return res.status(503).json({ 
      error: 'Admin API not configured',
      message: 'Contact system administrator to enable admin features'
    });
  }

  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'API key required. Include X-API-Key header.'
    });
  }

  if (apiKey !== ADMIN_API_KEY) {
    logger.warn(`Invalid admin API key attempt from ${req.ip}`);
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Invalid API key'
    });
  }

  req.isAdmin = true;
  next();
}

/**
 * Middleware for demo mode - allows read-only access
 * Sets req.isDemo = true for demo users
 */
export function checkDemoMode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  // Check if user has valid admin key
  if (ADMIN_API_KEY && apiKey === ADMIN_API_KEY) {
    req.isAdmin = true;
    req.isDemo = false;
  } else {
    req.isAdmin = false;
    req.isDemo = true;
  }
  
  next();
}

/**
 * Middleware to block write operations in demo mode
 */
export function blockInDemoMode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.isDemo && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return res.status(403).json({
      error: 'Demo Mode',
      message: 'Write operations are disabled in demo mode. Contact administrator for full access.',
      isDemo: true
    });
  }
  next();
}

/**
 * Optional admin auth - sets isAdmin flag but doesn't require it
 */
export function optionalAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (ADMIN_API_KEY && apiKey === ADMIN_API_KEY) {
    req.isAdmin = true;
  } else {
    req.isAdmin = false;
  }
  
  next();
}
