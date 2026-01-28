import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router = Router();

// Get alerts
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const querySchema = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      unreadOnly: z.coerce.boolean().default(false),
    });

    const { page, limit, unreadOnly } = querySchema.parse(req.query);

    const where = {
      ...(unreadOnly && { isRead: false }),
    };

    const [alerts, total, unreadCount] = await Promise.all([
      prisma.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          crisis: {
            select: { id: true, title: true, type: true, severity: true },
          },
        },
      }),
      prisma.alert.count({ where }),
      prisma.alert.count({ where: { isRead: false } }),
    ]);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  })
);

// Mark alert as read
router.patch(
  '/:id/read',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const alert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      throw new AppError('Alert not found', 404);
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

// Mark all alerts as read
router.patch(
  '/read-all',
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.alert.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: 'All alerts marked as read',
    });
  })
);

export default router;
