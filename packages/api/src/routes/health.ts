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
  } catch (error) {
    res.status(503).json({ ready: false, error: 'Database not ready' });
  }
});

export default router;
