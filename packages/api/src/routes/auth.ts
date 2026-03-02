import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../lib/logger';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
});

// Cookie options for refresh token
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth',
};

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors,
      });
      return;
    }

    const { email, password, name } = result.data;

    try {
      const user = await authService.register(email, password, name);
      
      // Auto-login after registration
      const { tokens } = await authService.login(email, password);

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', tokens.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

      res.status(201).json({
        message: 'Registration successful',
        user,
        accessToken: tokens.accessToken,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      logger.error('Registration error:', error);
      res.status(400).json({ error: message });
    }
  })
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors,
      });
      return;
    }

    const { email, password } = result.data;

    try {
      const { user, tokens } = await authService.login(email, password);

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', tokens.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

      res.json({
        message: 'Login successful',
        user,
        accessToken: tokens.accessToken,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      res.status(401).json({ error: message });
    }
  })
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token provided' });
      return;
    }

    try {
      const tokens = await authService.refreshTokens(refreshToken);

      // Update refresh token cookie
      res.cookie('refreshToken', tokens.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

      res.json({
        accessToken: tokens.accessToken,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed';
      res.status(401).json({ error: message });
    }
  })
);

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', { path: '/api/auth' });

    res.json({ message: 'Logged out successfully' });
  })
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await authService.getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  })
);

/**
 * PATCH /api/auth/profile
 * Update user profile
 */
router.patch(
  '/profile',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = updateProfileSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors,
      });
      return;
    }

    try {
      const user = await authService.updateProfile(req.user!.userId, result.data);
      res.json(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed';
      res.status(400).json({ error: message });
    }
  })
);

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = changePasswordSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors,
      });
      return;
    }

    const { currentPassword, newPassword } = result.data;

    try {
      await authService.changePassword(req.user!.userId, currentPassword, newPassword);
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password change failed';
      res.status(400).json({ error: message });
    }
  })
);

export default router;
