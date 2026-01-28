import cron from 'node-cron';
import { logger } from '../lib/logger';
import { runDataIngestion, getIngestionStats } from '../services/dataIngestion';
import { 
  processUnanalyzedEvents, 
  runEarlyWarningDetection, 
  getAIProcessingStats 
} from '../services/aiService';

let isIngestionRunning = false;
let isAnalysisRunning = false;

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

  logger.info('📅 Data ingestion scheduled: every 30 minutes');
}

// Run AI analysis every 15 minutes
export function scheduleAIAnalysis(): void {
  cron.schedule('*/15 * * * *', async () => {
    if (isAnalysisRunning) {
      logger.warn('AI analysis already running, skipping...');
      return;
    }

    isAnalysisRunning = true;
    try {
      logger.info('Scheduled AI analysis starting...');
      const stats = await processUnanalyzedEvents(10);
      logger.info('Scheduled AI analysis completed:', stats);
    } catch (error) {
      logger.error('Scheduled AI analysis failed:', error);
    } finally {
      isAnalysisRunning = false;
    }
  });

  logger.info('📅 AI analysis scheduled: every 15 minutes');
}

// Run early warning detection every hour
export function scheduleEarlyWarning(): void {
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Early warning detection starting...');
      const result = await runEarlyWarningDetection();
      
      if (result.detected && result.confidence > 0.7) {
        logger.warn('⚠️ EARLY WARNING SIGNALS DETECTED:', {
          signals: result.signals,
          confidence: result.confidence,
        });
        // TODO: Send alerts/notifications
      }
    } catch (error) {
      logger.error('Early warning detection failed:', error);
    }
  });

  logger.info('📅 Early warning detection scheduled: every hour');
}

// Initialize all scheduled jobs
export function initializeScheduledJobs(): void {
  logger.info('Initializing scheduled jobs...');
  
  scheduleDataIngestion();
  scheduleAIAnalysis();
  scheduleEarlyWarning();

  logger.info('✅ All scheduled jobs initialized');
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

export async function triggerAIAnalysis(batchSize: number = 10): Promise<Awaited<ReturnType<typeof processUnanalyzedEvents>>> {
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
