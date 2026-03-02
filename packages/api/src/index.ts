import dotenv from 'dotenv';
// Load environment variables FIRST before any other imports
dotenv.config({ path: '../../.env' });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { checkDemoMode } from './middleware/auth';
import { prisma } from './lib/prisma';
import { initializeScheduledJobs } from './jobs/scheduler';
import { swaggerSpec } from './swagger';

// Routes
import crisisRoutes from './routes/crisis';
import eventRoutes from './routes/events';
import alertRoutes from './routes/alerts';
import healthRoutes from './routes/health';
import aiRoutes from './routes/ai';
import webhookRoutes from './routes/webhooks';
import subscriptionRoutes from './routes/subscriptions';
import feedRoutes from './routes/feeds';
import authRoutes from './routes/auth';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
// CORS configuration
const corsOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.APP_URL,                    // Your Vercel frontend URL
      'https://aidwatch.vercel.app',          // Default Vercel domain
      /\.vercel\.app$/,                       // Any Vercel preview deployments
    ].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: corsOrigins as (string | RegExp)[],
  credentials: true,
}));

// Rate limiting - Different limits for different endpoints
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many requests to this endpoint, please try again later.',
});

app.use('/api/', standardLimiter);
app.use('/api/ai/', strictLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Demo mode check - adds isDemo flag to requests
app.use('/api/', checkDemoMode);

// Swagger Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AidWatch API Documentation',
}));
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/crises', crisisRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/feeds', feedRoutes);

// Error handling
app.use(errorHandler);

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
app.listen(Number(PORT), HOST, () => {
  logger.info(`[Server] AidWatch API running on http://${HOST}:${PORT}`);
  logger.info(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize scheduled jobs for data ingestion and AI analysis
  if (process.env.NODE_ENV !== 'test') {
    initializeScheduledJobs();
  }
});

export default app;
