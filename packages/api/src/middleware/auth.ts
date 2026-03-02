import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../lib/logger';

// JWT secret - should match authService
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'aidwatch-access-secret-change-in-production';

// Admin API key getter - reads env dynamically to support hot reload
function getAdminApiKey(): string | undefined {
  return process.env.ADMIN_API_KEY;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  isAdmin?: boolean;
  isDemo?: boolean;
  user?: TokenPayload;
}

/**
 * Middleware to require admin API key for protected routes
 * Usage: router.use('/admin', requireAdminAuth);
 */
export function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const ADMIN_API_KEY = getAdminApiKey();

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
  const ADMIN_API_KEY = getAdminApiKey();
  
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
  const ADMIN_API_KEY = getAdminApiKey();
  
  if (ADMIN_API_KEY && apiKey === ADMIN_API_KEY) {
    req.isAdmin = true;
  } else {
    req.isAdmin = false;
  }
  
  next();
}

/**
 * Middleware to require JWT authentication
 * Validates Bearer token and sets req.user
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Please log in.',
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer '

  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
    req.user = payload;
    req.isDemo = false;
    req.isAdmin = payload.role === 'ADMIN';
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED',
      });
    }
    logger.warn(`Invalid JWT token attempt from ${req.ip}`);
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Authentication failed. Please log in again.',
    });
  }
}

/**
 * Optional JWT auth - sets user if valid token present, but doesn't require it
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
      req.user = payload;
      req.isDemo = false;
      req.isAdmin = payload.role === 'ADMIN';
    } catch {
      // Token invalid, treat as demo user
      req.isDemo = true;
    }
  } else {
    req.isDemo = true;
  }
  
  next();
}
