import cron from 'node-cron';
import { logger } from '../lib/logger';
import { runDataIngestion, getIngestionStats } from '../services/dataIngestion';
import { 
  processUnanalyzedEvents, 
  runEarlyWarningDetection, 
  getAIProcessingStats,
  generateMissingSummaries,
} from '../services/aiService';
import {
  processImmediateNotifications,
  processDailyDigest,
  processWeeklyDigest,
} from '../services/notificationService';

let isIngestionRunning = false;
let isAnalysisRunning = false;
let isSummaryGenerationRunning = false;

// Configuration from environment
const ENABLE_EMAIL_NOTIFICATIONS = process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true';
const AI_ANALYSIS_INTERVAL = parseInt(process.env.AI_ANALYSIS_INTERVAL_MINUTES || '30', 10);
const AI_BATCH_SIZE = parseInt(process.env.AI_BATCH_SIZE || '5', 10);

// Run data ingestion every 30 minutes
export function scheduleDataIngestion(): void {
  cron.schedule('*/30 * * * *', async () => {
    if (isIngestionRunning) {
      logger.warn('Data ingestion already running, skipping...');
      return;
    }

    isIngestionRunning = true;
    try {
      logger.info('Scheduled data ingestion starting...');
      await runDataIngestion();
      const stats = await getIngestionStats();
      logger.info('Scheduled data ingestion completed:', stats);
    } catch (error) {
      logger.error('Scheduled data ingestion failed:', error);
    } finally {
      isIngestionRunning = false;
    }
  });

  logger.info('[Scheduler] Data ingestion scheduled: every 30 minutes');
}

// Run AI analysis at configurable interval (default: every 30 minutes)
export function scheduleAIAnalysis(): void {
  cron.schedule(`*/${AI_ANALYSIS_INTERVAL} * * * *`, async () => {
    if (isAnalysisRunning) {
      logger.warn('AI analysis already running, skipping...');
      return;
    }

    isAnalysisRunning = true;
    try {
      logger.info('Scheduled AI analysis starting...');
      const stats = await processUnanalyzedEvents(AI_BATCH_SIZE);
      logger.info('Scheduled AI analysis completed:', stats);
    } catch (error) {
      logger.error('Scheduled AI analysis failed:', error);
    } finally {
      isAnalysisRunning = false;
    }
  });

  logger.info(`[Scheduler] AI analysis scheduled: every ${AI_ANALYSIS_INTERVAL} minutes (batch size: ${AI_BATCH_SIZE})`);
}

// Run early warning detection every hour
export function scheduleEarlyWarning(): void {
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Early warning detection starting...');
      const result = await runEarlyWarningDetection();
      
      if (result.detected && result.confidence > 0.7) {
        logger.warn('[ALERT] EARLY WARNING SIGNALS DETECTED:', {
          signals: result.signals,
          confidence: result.confidence,
        });
      }
      
      // Process immediate notifications after analysis (only if email enabled)
      if (ENABLE_EMAIL_NOTIFICATIONS) {
        await processImmediateNotifications();
      }
    } catch (error) {
      logger.error('Early warning detection failed:', error);
    }
  });

  logger.info('[Scheduler] Early warning detection scheduled: every hour');
}

// Run immediate notifications every 15 minutes (only if email enabled)
export function scheduleImmediateNotifications(): void {
  if (!ENABLE_EMAIL_NOTIFICATIONS) {
    logger.info('[Scheduler] Email notifications disabled - skipping immediate notifications scheduler');
    return;
  }

  cron.schedule('5,20,35,50 * * * *', async () => {
    try {
      logger.info('Processing immediate notifications...');
      await processImmediateNotifications();
      logger.info('Immediate notifications processed');
    } catch (error) {
      logger.error('Immediate notifications failed:', error);
    }
  });

  logger.info('[Scheduler] Immediate notifications scheduled: every 15 minutes');
}

// Run daily digest at 8 AM UTC (only if email enabled)
export function scheduleDailyDigest(): void {
  if (!ENABLE_EMAIL_NOTIFICATIONS) {
    logger.info('[Scheduler] Email notifications disabled - skipping daily digest scheduler');
    return;
  }

  cron.schedule('0 8 * * *', async () => {
    try {
      logger.info('Processing daily digest...');
      await processDailyDigest();
      logger.info('Daily digest sent');
    } catch (error) {
      logger.error('Daily digest failed:', error);
    }
  });

  logger.info('[Scheduler] Daily digest scheduled: 8 AM UTC');
}

// Run weekly digest on Mondays at 8 AM UTC (only if email enabled)
export function scheduleWeeklyDigest(): void {
  if (!ENABLE_EMAIL_NOTIFICATIONS) {
    logger.info('[Scheduler] Email notifications disabled - skipping weekly digest scheduler');
    return;
  }

  cron.schedule('0 8 * * 1', async () => {
    try {
      logger.info('Processing weekly digest...');
      await processWeeklyDigest();
      logger.info('Weekly digest sent');
    } catch (error) {
      logger.error('Weekly digest failed:', error);
    }
  });

  logger.info('[Scheduler] Weekly digest scheduled: Monday 8 AM UTC');
}

// Generate AI summaries for crises every 30 minutes (offset from analysis)
export function scheduleSummaryGeneration(): void {
  cron.schedule('15,45 * * * *', async () => {
    if (isSummaryGenerationRunning) {
      logger.warn('Summary generation already running, skipping...');
      return;
    }

    isSummaryGenerationRunning = true;
    try {
      logger.info('Scheduled summary generation starting...');
      const stats = await generateMissingSummaries(Math.max(3, Math.floor(AI_BATCH_SIZE / 2)));
      logger.info('Scheduled summary generation completed:', stats);
    } catch (error) {
      logger.error('Scheduled summary generation failed:', error);
    } finally {
      isSummaryGenerationRunning = false;
    }
  });

  logger.info('[Scheduler] Summary generation scheduled: every 30 minutes');
}

// Initialize all scheduled jobs
export function initializeScheduledJobs(): void {
  logger.info('Initializing scheduled jobs...');
  
  scheduleDataIngestion();
  scheduleAIAnalysis();
  scheduleSummaryGeneration();
  scheduleEarlyWarning();
  scheduleImmediateNotifications();
  scheduleDailyDigest();
  scheduleWeeklyDigest();

  logger.info('[Scheduler] All scheduled jobs initialized');
}

// Get job status
export async function getJobStatus(): Promise<{
  ingestion: { running: boolean; stats: Awaited<ReturnType<typeof getIngestionStats>> };
  analysis: { running: boolean; stats: Awaited<ReturnType<typeof getAIProcessingStats>> };
}> {
  const [ingestionStats, analysisStats] = await Promise.all([
    getIngestionStats(),
    getAIProcessingStats(),
  ]);

  return {
    ingestion: { running: isIngestionRunning, stats: ingestionStats },
    analysis: { running: isAnalysisRunning, stats: analysisStats },
  };
}

// Manual trigger functions
export async function triggerDataIngestion(): Promise<Awaited<ReturnType<typeof getIngestionStats>>> {
  if (isIngestionRunning) {
    throw new Error('Data ingestion already running');
  }

  isIngestionRunning = true;
  try {
    await runDataIngestion();
    return await getIngestionStats();
  } finally {
    isIngestionRunning = false;
  }
}

export async function triggerAIAnalysis(batchSize: number = AI_BATCH_SIZE): Promise<Awaited<ReturnType<typeof processUnanalyzedEvents>>> {
  if (isAnalysisRunning) {
    throw new Error('AI analysis already running');
  }

  isAnalysisRunning = true;
  try {
    return await processUnanalyzedEvents(batchSize);
  } finally {
    isAnalysisRunning = false;
  }
}
