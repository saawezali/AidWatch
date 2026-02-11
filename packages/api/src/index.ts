import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';
import { initializeScheduledJobs } from './jobs/scheduler';

// Routes
import crisisRoutes from './routes/crisis';
import eventRoutes from './routes/events';
import alertRoutes from './routes/alerts';
import healthRoutes from './routes/health';
import aiRoutes from './routes/ai';
import webhookRoutes from './routes/webhooks';
import subscriptionRoutes from './routes/subscriptions';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.API_PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://aidwatch.org'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/crises', crisisRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

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
app.listen(PORT, () => {
  logger.info(`[Server] AidWatch API running on http://localhost:${PORT}`);
  logger.info(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize scheduled jobs for data ingestion and AI analysis
  if (process.env.NODE_ENV !== 'test') {
    initializeScheduledJobs();
  }
});

export default app;
