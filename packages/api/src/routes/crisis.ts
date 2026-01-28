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

export default router;
