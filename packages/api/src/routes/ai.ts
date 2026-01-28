import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { SummaryType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { 
  generateCrisisSummary, 
  runEarlyWarningDetection, 
  getAIProcessingStats,
  processUnanalyzedEvents,
} from '../services/aiService';
import { 
  getJobStatus, 
  triggerDataIngestion, 
  triggerAIAnalysis 
} from '../jobs/scheduler';
import { analyzeContent } from '../ai/analyzer';

const router = Router();

// Get AI processing stats
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

// Get job status
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

// Trigger data ingestion manually
router.post(
  '/jobs/ingest',
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await triggerDataIngestion();
    res.json({
      success: true,
      message: 'Data ingestion completed',
      data: stats,
    });
  })
);

// Trigger AI analysis manually
router.post(
  '/jobs/analyze',
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

// Analyze arbitrary content
router.post(
  '/analyze',
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

// Generate summary for a crisis
router.post(
  '/summary/:crisisId',
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

// Run early warning detection
router.post(
  '/early-warning',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await runEarlyWarningDetection();
    
    res.json({
      success: true,
      data: result,
    });
  })
);

// Process unanalyzed events manually (run analysis on a batch)
router.post(
  '/process-events',
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

export default router;
