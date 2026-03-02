import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAdminAuth, blockInDemoMode, AuthenticatedRequest } from '../middleware/auth';
import { SummaryType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { 
  generateCrisisSummary, 
  runEarlyWarningDetection, 
  getAIProcessingStats,
  processUnanalyzedEvents,
  generateMissingSummaries,
} from '../services/aiService';
import { 
  getJobStatus, 
  triggerDataIngestion, 
  triggerAIAnalysis 
} from '../jobs/scheduler';
import { analyzeContent } from '../ai/analyzer';

const router = Router();

// Get AI processing stats (public - read only)
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await getAIProcessingStats();
    res.json({
      success: true,
      data: stats,
    });
  })
);

// Get job status (public - read only)
router.get(
  '/jobs/status',
  asyncHandler(async (req: Request, res: Response) => {
    const status = await getJobStatus();
    res.json({
      success: true,
      data: status,
    });
  })
);

// Trigger data ingestion manually (admin only)
router.post(
  '/jobs/ingest',
  requireAdminAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await triggerDataIngestion();
    res.json({
      success: true,
      message: 'Data ingestion completed',
      data: stats,
    });
  })
);

// Trigger AI analysis manually (admin only)
router.post(
  '/jobs/analyze',
  requireAdminAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      batchSize: z.coerce.number().min(1).max(50).default(10),
    });
    
    const { batchSize } = schema.parse(req.body);
    const stats = await triggerAIAnalysis(batchSize);
    
    res.json({
      success: true,
      message: 'AI analysis completed',
      data: stats,
    });
  })
);

// Analyze arbitrary content (blocked in demo mode)
router.post(
  '/analyze',
  blockInDemoMode,
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      content: z.string().min(10).max(10000),
    });
    
    const { content } = schema.parse(req.body);
    const analysis = await analyzeContent(content);
    
    res.json({
      success: true,
      data: analysis,
    });
  })
);

// Generate summary for a crisis (blocked in demo mode)
router.post(
  '/summary/:crisisId',
  blockInDemoMode,
  asyncHandler(async (req: Request, res: Response) => {
    const { crisisId } = req.params;
    const schema = z.object({
      type: z.nativeEnum(SummaryType).default(SummaryType.SITUATION),
    });
    
    const { type } = schema.parse(req.body);
    const summary = await generateCrisisSummary(crisisId, type);
    
    res.json({
      success: true,
      data: summary,
    });
  })
);

// Get summaries for a crisis
router.get(
  '/summaries/:crisisId',
  asyncHandler(async (req: Request, res: Response) => {
    const { crisisId } = req.params;
    const schema = z.object({
      limit: z.coerce.number().min(1).max(20).default(10),
    });
    
    const { limit } = schema.parse(req.query);
    
    const summaries = await prisma.summary.findMany({
      where: { crisisId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    
    res.json({
      success: true,
      data: summaries,
    });
  })
);

// Run early warning detection (admin only)
router.post(
  '/early-warning',
  requireAdminAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await runEarlyWarningDetection();
    
    res.json({
      success: true,
      data: result,
    });
  })
);

// Process unanalyzed events manually (admin only)
router.post(
  '/process-events',
  requireAdminAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      batchSize: z.coerce.number().min(1).max(50).default(10),
    });
    
    const { batchSize } = schema.parse(req.body);
    const result = await processUnanalyzedEvents(batchSize);
    
    res.json({
      success: true,
      message: 'Events processed',
      data: result,
    });
  })
);

// Generate missing summaries for crises (admin only)
router.post(
  '/generate-summaries',
  requireAdminAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      batchSize: z.coerce.number().min(1).max(20).default(5),
    });
    
    const { batchSize } = schema.parse(req.body);
    const result = await generateMissingSummaries(batchSize);
    
    res.json({
      success: true,
      message: 'Summaries generated',
      data: result,
    });
  })
);

export default router;
