import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { SourceType } from '@prisma/client';

const router = Router();

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  crisisId: z.string().optional(),
  sourceType: z.nativeEnum(SourceType).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// Get all events
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const { page, limit, crisisId, sourceType, from, to } = query;

    const where = {
      ...(crisisId && { crisisId }),
      ...(sourceType && { sourceType }),
      ...(from || to
        ? {
            publishedAt: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {}),
    };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          crisis: {
            select: { id: true, title: true, type: true, severity: true },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    res.json({
      success: true,
      data: events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// Get event by ID
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        crisis: true,
      },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    res.json({
      success: true,
      data: event,
    });
  })
);

// Get event statistics
router.get(
  '/stats/sources',
  asyncHandler(async (req: Request, res: Response) => {
    const bySource = await prisma.event.groupBy({
      by: ['sourceType'],
      _count: { id: true },
    });

    const last24h = await prisma.event.count({
      where: {
        fetchedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    res.json({
      success: true,
      data: {
        bySource: Object.fromEntries(bySource.map((s) => [s.sourceType, s._count.id])),
        last24h,
      },
    });
  })
);

export default router;
