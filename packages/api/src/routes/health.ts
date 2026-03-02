import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const dbHealthy = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    services: {
      database: dbHealthy ? 'connected' : 'disconnected',
    },
  });
});

router.get('/ready', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false, error: 'Database not ready' });
  }
});

router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Check database
  let dbStatus = 'healthy';
  let dbLatency = 0;
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch {
    dbStatus = 'unhealthy';
  }

  // Get stats
  let stats = {
    totalCrises: 0,
    activeCrises: 0,
    totalEvents: 0,
    totalAlerts: 0,
    totalSubscriptions: 0,
  };
  
  try {
    const [crisisCount, activeCount, eventCount, alertCount, subscriptionCount] = await Promise.all([
      prisma.crisis.count(),
      prisma.crisis.count({ where: { status: { not: 'RESOLVED' } } }),
      prisma.event.count(),
      prisma.alert.count(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).alertSubscription.count({ where: { isActive: true } }).catch(() => 0),
    ]);
    
    stats = {
      totalCrises: crisisCount,
      activeCrises: activeCount,
      totalEvents: eventCount,
      totalAlerts: alertCount,
      totalSubscriptions: subscriptionCount,
    };
  } catch {
    // Stats unavailable
  }

  // Check AI service (Groq)
  const aiConfigured = !!process.env.GROQ_API_KEY;

  // Check SMTP
  const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER);

  const overallStatus = dbStatus === 'healthy' ? 'ok' : 'degraded';
  const responseTime = Date.now() - startTime;

  res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    uptime: process.uptime(),
    responseTime: `${responseTime}ms`,
    services: {
      database: {
        status: dbStatus,
        latency: `${dbLatency}ms`,
      },
      ai: {
        status: aiConfigured ? 'configured' : 'not_configured',
        provider: 'groq',
      },
      email: {
        status: smtpConfigured ? 'configured' : 'not_configured',
      },
    },
    stats,
    environment: process.env.NODE_ENV || 'development',
  });
});

export default router;
