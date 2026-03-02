import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '../lib/logger';

const prisma = new PrismaClient();

// JWT secrets - should be in env vars in production
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'aidwatch-access-secret-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'aidwatch-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
}

// Store for invalidated refresh tokens (in production, use Redis)
const invalidatedTokens = new Set<string>();

export const authService = {
  /**
   * Register a new user
   */
  async register(email: string, password: string, name: string): Promise<SafeUser> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name.trim(),
        role: 'VIEWER', // Default role for new users
      },
    });

    logger.info(`New user registered: ${user.email}`);

    return this.sanitizeUser(user);
  },

  /**
   * Login user and return tokens
   */
  async login(email: string, password: string): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logger.warn(`Failed login attempt for: ${email}`);
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    logger.info(`User logged in: ${user.email}`);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // Check if token is invalidated
    if (invalidatedTokens.has(refreshToken)) {
      throw new Error('Token has been revoked');
    }

    try {
      const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as TokenPayload;
      
      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      throw new Error('Invalid refresh token');
    }
  },

  /**
   * Logout - invalidate refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    invalidatedTokens.add(refreshToken);
    // In production, store in Redis with TTL matching token expiry
    logger.info('User logged out, token invalidated');
  },

  /**
   * Verify access token and return payload
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      }
      throw new Error('Invalid access token');
    }
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<SafeUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    return user ? this.sanitizeUser(user) : null;
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: { name?: string; email?: string }): Promise<SafeUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.email && { email: data.email.toLowerCase().trim() }),
      },
    });
    return this.sanitizeUser(user);
  },

  /**
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }

    // Hash and update
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    logger.info(`Password changed for user: ${user.email}`);
  },

  // Helper functions
  generateTokens(user: User): AuthTokens {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    return { accessToken, refreshToken };
  },

  sanitizeUser(user: User): SafeUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  },
};
