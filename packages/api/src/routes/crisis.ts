import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { CrisisType, Severity, CrisisStatus } from '@prisma/client';

const router = Router();

// Query params schema
const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.nativeEnum(CrisisType).optional(),
  severity: z.nativeEnum(Severity).optional(),
  status: z.nativeEnum(CrisisStatus).optional(),
  country: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['detectedAt', 'severity', 'updatedAt']).default('detectedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Get all crises with filtering and pagination
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const { page, limit, type, severity, status, country, search, sortBy, sortOrder } = query;

    const where = {
      ...(type && { type }),
      ...(severity && { severity }),
      ...(status && { status }),
      ...(country && { country: { contains: country, mode: 'insensitive' as const } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { location: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [crises, total] = await Promise.all([
      prisma.crisis.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { events: true, alerts: true },
          },
        },
      }),
      prisma.crisis.count({ where }),
    ]);

    res.json({
      success: true,
      data: crises,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// Get crisis by ID
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const crisis = await prisma.crisis.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { publishedAt: 'desc' },
          take: 20,
        },
        summaries: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: { events: true, alerts: true, reports: true },
        },
      },
    });

    if (!crisis) {
      throw new AppError('Crisis not found', 404);
    }

    res.json({
      success: true,
      data: crisis,
    });
  })
);

// Get crisis statistics
router.get(
  '/stats/overview',
  asyncHandler(async (req: Request, res: Response) => {
    const [byType, bySeverity, byStatus, total, recentCount] = await Promise.all([
      prisma.crisis.groupBy({
        by: ['type'],
        _count: { id: true },
      }),
      prisma.crisis.groupBy({
        by: ['severity'],
        _count: { id: true },
      }),
      prisma.crisis.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.crisis.count(),
      prisma.crisis.count({
        where: {
          detectedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        recentCount,
        byType: Object.fromEntries(byType.map((t) => [t.type, t._count.id])),
        bySeverity: Object.fromEntries(bySeverity.map((s) => [s.severity, s._count.id])),
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.id])),
      },
    });
  })
);

// Create crisis
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const createSchema = z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      type: z.nativeEnum(CrisisType),
      severity: z.nativeEnum(Severity),
      country: z.string().optional(),
      region: z.string().optional(),
      location: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      tags: z.array(z.string()).default([]),
    });

    const data = createSchema.parse(req.body);

    const crisis = await prisma.crisis.create({
      data: {
        ...data,
        confidence: 1.0, // Manually created
        status: CrisisStatus.EMERGING,
      },
    });

    res.status(201).json({
      success: true,
      data: crisis,
    });
  })
);

// Update crisis
router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const updateSchema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      severity: z.nativeEnum(Severity).optional(),
      status: z.nativeEnum(CrisisStatus).optional(),
      tags: z.array(z.string()).optional(),
    });

    const data = updateSchema.parse(req.body);

    const crisis = await prisma.crisis.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      data: crisis,
    });
  })
);

// Get historical trends
router.get(
  '/stats/trends',
  asyncHandler(async (req: Request, res: Response) => {
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all crises in the date range
    const crises = await prisma.crisis.findMany({
      where: {
        detectedAt: { gte: startDate },
      },
      select: {
        detectedAt: true,
        type: true,
        severity: true,
      },
      orderBy: { detectedAt: 'asc' },
    });

    // Group by date
    const trendMap = new Map<string, { 
      total: number; 
      byType: Record<string, number>; 
      bySeverity: Record<string, number>;
    }>();

    // Initialize all dates in range
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      trendMap.set(dateKey, { 
        total: 0, 
        byType: {}, 
        bySeverity: {} 
      });
    }

    // Populate with actual data
    crises.forEach(crisis => {
      const dateKey = crisis.detectedAt.toISOString().split('T')[0];
      const dayData = trendMap.get(dateKey);
      
      if (dayData) {
        dayData.total += 1;
        dayData.byType[crisis.type] = (dayData.byType[crisis.type] || 0) + 1;
        dayData.bySeverity[crisis.severity] = (dayData.bySeverity[crisis.severity] || 0) + 1;
      }
    });

    const trends = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    res.json({
      success: true,
      data: {
        days,
        startDate: startDate.toISOString(),
        trends,
        summary: {
          totalCrises: crises.length,
          avgPerDay: (crises.length / days).toFixed(2),
        },
      },
    });
  })
);

// Get crisis timeline (events over time)
router.get(
  '/:id/timeline',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const crisis = await prisma.crisis.findUnique({
      where: { id },
      select: { id: true, title: true, detectedAt: true },
    });

    if (!crisis) {
      throw new AppError('Crisis not found', 404);
    }

    const events = await prisma.event.findMany({
      where: { crisisId: id },
      orderBy: { publishedAt: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        publishedAt: true,
        source: true,
        sourceType: true,
      },
    });

    // Group events by date
    const timelineMap = new Map<string, typeof events>();
    
    events.forEach(event => {
      const dateKey = event.publishedAt.toISOString().split('T')[0];
      const existing = timelineMap.get(dateKey) || [];
      existing.push(event);
      timelineMap.set(dateKey, existing);
    });

    const timeline = Array.from(timelineMap.entries())
      .map(([date, dayEvents]) => ({
        date,
        eventCount: dayEvents.length,
        events: dayEvents,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        crisis: {
          id: crisis.id,
          title: crisis.title,
          startDate: crisis.detectedAt,
        },
        timeline,
        totalEvents: events.length,
      },
    });
  })
);

export default router;
