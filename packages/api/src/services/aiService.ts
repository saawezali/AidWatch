import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { analyzeContent, generateSummary, detectCrisisSignals, AnalysisResult } from '../ai/analyzer';
import { CrisisType, Severity, CrisisStatus, SummaryType } from '@prisma/client';

// Map AI analysis crisis types to Prisma enum
function mapCrisisType(aiType: string): CrisisType {
  const typeMap: Record<string, CrisisType> = {
    'NATURAL_DISASTER': CrisisType.NATURAL_DISASTER,
    'CONFLICT': CrisisType.CONFLICT,
    'DISEASE_OUTBREAK': CrisisType.DISEASE_OUTBREAK,
    'FOOD_SECURITY': CrisisType.FOOD_SECURITY,
    'DISPLACEMENT': CrisisType.DISPLACEMENT,
    'INFRASTRUCTURE': CrisisType.INFRASTRUCTURE,
    'ECONOMIC': CrisisType.ECONOMIC,
    'ENVIRONMENTAL': CrisisType.ENVIRONMENTAL,
    'OTHER': CrisisType.OTHER,
  };
  return typeMap[aiType] || CrisisType.OTHER;
}

// Map AI severity to Prisma enum
function mapSeverity(aiSeverity: string): Severity {
  const severityMap: Record<string, Severity> = {
    'CRITICAL': Severity.CRITICAL,
    'HIGH': Severity.HIGH,
    'MEDIUM': Severity.MEDIUM,
    'LOW': Severity.LOW,
    'UNKNOWN': Severity.UNKNOWN,
  };
  return severityMap[aiSeverity] || Severity.UNKNOWN;
}

// Analyze unprocessed events and create/update crises
export async function processUnanalyzedEvents(batchSize: number = 10): Promise<{
  processed: number;
  crisesCreated: number;
  crisesUpdated: number;
  errors: number;
}> {
  const stats = { processed: 0, crisesCreated: 0, crisesUpdated: 0, errors: 0 };

  try {
    // Get events that haven't been linked to a crisis yet
    const unanalyzedEvents = await prisma.event.findMany({
      where: { crisisId: null },
      orderBy: { publishedAt: 'desc' },
      take: batchSize,
    });

    logger.info(`Processing ${unanalyzedEvents.length} unanalyzed events`);

    // Filter out events older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const event of unanalyzedEvents) {
      try {
        // Skip events older than 30 days
        if (event.publishedAt && event.publishedAt < thirtyDaysAgo) {
          await prisma.event.update({
            where: { id: event.id },
            data: { analyzed: true },
          });
          logger.info(`Skipped old event (>${30} days): "${event.title.substring(0, 50)}..."`);
          stats.processed++;
          continue;
        }

        // Analyze the event content
        const content = `${event.title}\n\n${event.description}`;
        const analysis = await analyzeContent(content);

        stats.processed++;

        // Skip non-crisis content (general news)
        if (!analysis.isRelevantCrisis) {
          await prisma.event.update({
            where: { id: event.id },
            data: { analyzed: true },
          });
          logger.info(`Skipped non-crisis event: "${event.title.substring(0, 50)}..."`);
          continue;
        }

        // Check if this event should be linked to an existing crisis
        const existingCrisis = await findMatchingCrisis(event, analysis);

        if (existingCrisis) {
          // Link event to existing crisis
          await prisma.event.update({
            where: { id: event.id },
            data: {
              crisisId: existingCrisis.id,
              analyzed: true,
            },
          });

          // Update crisis if this event has higher severity
          if (shouldUpdateCrisisSeverity(existingCrisis.severity, analysis.severity)) {
            await prisma.crisis.update({
              where: { id: existingCrisis.id },
              data: { severity: mapSeverity(analysis.severity) },
            });
          }

          stats.crisesUpdated++;
          logger.info(`Linked event "${event.title.substring(0, 50)}..." to crisis "${existingCrisis.title}"`);
        } else {
          // Create new crisis from this event
          const newCrisis = await createCrisisFromAnalysis(event, analysis);
          stats.crisesCreated++;
          logger.info(`Created new crisis: "${newCrisis.title}"`);
        }

        // Small delay to avoid rate limiting
        await sleep(500);
      } catch (error) {
        stats.errors++;
        logger.error(`Error processing event ${event.id}:`, error);
        
        // Mark as analyzed to avoid reprocessing
        await prisma.event.update({
          where: { id: event.id },
          data: { analyzed: true },
        });
      }
    }

    return stats;
  } catch (error) {
    logger.error('Error in processUnanalyzedEvents:', error);
    throw error;
  }
}

// Find a matching existing crisis based on analysis
async function findMatchingCrisis(
  event: { title: string; location?: string | null },
  analysis: AnalysisResult
): Promise<{ id: string; title: string; severity: Severity } | null> {
  // Search for crises with similar type and location
  const locations = analysis.entities.locations;
  const crisisType = mapCrisisType(analysis.crisisType);

  // Look for active crises matching type and location
  const matchingCrises = await prisma.crisis.findMany({
    where: {
      type: crisisType,
      status: { in: [CrisisStatus.EMERGING, CrisisStatus.ONGOING, CrisisStatus.DEVELOPING] },
      OR: [
        // Match by location in crisis
        ...(locations.length > 0
          ? locations.map((loc) => ({
              OR: [
                { location: { contains: loc, mode: 'insensitive' as const } },
                { country: { contains: loc, mode: 'insensitive' as const } },
                { region: { contains: loc, mode: 'insensitive' as const } },
              ],
            }))
          : []),
        // Match by event location
        ...(event.location
          ? [{ location: { contains: event.location, mode: 'insensitive' as const } }]
          : []),
      ],
    },
    orderBy: { detectedAt: 'desc' },
    take: 1,
  });

  return matchingCrises[0] || null;
}

// Create a new crisis from event analysis
async function createCrisisFromAnalysis(
  event: { id: string; title: string; location?: string | null; latitude?: number | null; longitude?: number | null },
  analysis: AnalysisResult
) {
  // Extract primary location
  const primaryLocation = analysis.entities.locations[0] || event.location || 'Unknown Location';

  const crisis = await prisma.crisis.create({
    data: {
      title: analysis.summary.split('.')[0] || event.title,
      description: analysis.summary,
      type: mapCrisisType(analysis.crisisType),
      severity: mapSeverity(analysis.severity),
      status: CrisisStatus.EMERGING,
      confidence: analysis.confidence,
      location: primaryLocation,
      country: extractCountry(analysis.entities.locations),
      latitude: event.latitude,
      longitude: event.longitude,
      tags: [...analysis.entities.keywords.slice(0, 10)],
      events: {
        connect: { id: event.id },
      },
    },
  });

  // Mark event as analyzed
  await prisma.event.update({
    where: { id: event.id },
    data: { analyzed: true },
  });

  return crisis;
}

// Check if crisis severity should be updated
function shouldUpdateCrisisSeverity(current: Severity, incoming: string): boolean {
  const severityOrder = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const currentIndex = severityOrder.indexOf(current);
  const incomingIndex = severityOrder.indexOf(incoming);
  return incomingIndex > currentIndex;
}

// Simple country extraction (could be enhanced with a geo library)
function extractCountry(locations: string[]): string | undefined {
  // Common country patterns in crisis locations
  const countries = locations.filter((loc) =>
    /^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(loc) && loc.length < 30
  );
  return countries[0];
}

// Generate and store a summary for a crisis
export async function generateCrisisSummary(
  crisisId: string,
  type: SummaryType = SummaryType.SITUATION
): Promise<{ id: string; content: string }> {
  const crisis = await prisma.crisis.findUnique({
    where: { id: crisisId },
    include: {
      events: {
        orderBy: { publishedAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!crisis) {
    throw new Error(`Crisis not found: ${crisisId}`);
  }

  const events = crisis.events.map((e) => ({
    title: e.title,
    description: e.description,
    source: e.source,
  }));

  const summaryContent = await generateSummary(crisis.title, events, type);

  // Store the summary
  const summary = await prisma.summary.create({
    data: {
      crisisId,
      type,
      content: summaryContent,
    },
  });

  logger.info(`Generated ${type} summary for crisis "${crisis.title}"`);

  return { id: summary.id, content: summaryContent };
}

// Generate summaries for crises that don't have them
export async function generateMissingSummaries(batchSize: number = 5): Promise<{
  generated: number;
  errors: number;
}> {
  const stats = { generated: 0, errors: 0 };

  try {
    // Find active crises without any summaries
    const crisesWithoutSummaries = await prisma.crisis.findMany({
      where: {
        status: { in: [CrisisStatus.EMERGING, CrisisStatus.ONGOING, CrisisStatus.DEVELOPING] },
        summaries: { none: {} },
      },
      include: {
        events: { take: 1 }, // Just check if there are events
      },
      take: batchSize,
      orderBy: { createdAt: 'desc' },
    });

    logger.info(`Found ${crisesWithoutSummaries.length} crises without summaries`);

    for (const crisis of crisesWithoutSummaries) {
      // Only generate summary if crisis has at least one event
      if (crisis.events.length === 0) {
        continue;
      }

      try {
        await generateCrisisSummary(crisis.id, SummaryType.SITUATION);
        stats.generated++;
        logger.info(`Generated summary for crisis: ${crisis.title}`);
        
        // Delay to avoid rate limiting
        await sleep(1000);
      } catch (error) {
        stats.errors++;
        logger.error(`Failed to generate summary for crisis ${crisis.id}:`, error);
      }
    }

    // Also update summaries for crises that haven't been updated in 24 hours
    const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const crisesWithStaleSummaries = await prisma.crisis.findMany({
      where: {
        status: { in: [CrisisStatus.EMERGING, CrisisStatus.ONGOING, CrisisStatus.DEVELOPING] },
        updatedAt: { gte: staleThreshold }, // Crisis was updated recently
        summaries: {
          every: {
            createdAt: { lt: staleThreshold }, // But summaries are old
          },
        },
      },
      take: batchSize,
    });

    for (const crisis of crisesWithStaleSummaries) {
      try {
        await generateCrisisSummary(crisis.id, SummaryType.SITUATION);
        stats.generated++;
        logger.info(`Updated summary for crisis: ${crisis.title}`);
        
        await sleep(1000);
      } catch (error) {
        stats.errors++;
        logger.error(`Failed to update summary for crisis ${crisis.id}:`, error);
      }
    }

    return stats;
  } catch (error) {
    logger.error('Error generating missing summaries:', error);
    throw error;
  }
}

// Detect early warning signals from recent events
export async function runEarlyWarningDetection(): Promise<{
  detected: boolean;
  signals: string[];
  confidence: number;
}> {
  // Get recent unlinked event headlines
  const recentEvents = await prisma.event.findMany({
    where: {
      crisisId: null,
      publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { publishedAt: 'desc' },
    take: 50,
    select: { title: true },
  });

  if (recentEvents.length === 0) {
    return { detected: false, signals: [], confidence: 0 };
  }

  const headlines = recentEvents.map((e) => e.title);
  const result = await detectCrisisSignals(headlines);

  if (result.detected && result.confidence > 0.7) {
    logger.warn('Early warning signals detected:', result.signals);
  }

  return result;
}

// Get AI processing status
export async function getAIProcessingStats(): Promise<{
  totalEvents: number;
  analyzedEvents: number;
  unanalyzedEvents: number;
  totalCrises: number;
  activeCrises: number;
  recentSummaries: number;
}> {
  const [totalEvents, analyzedEvents, totalCrises, activeCrises, recentSummaries] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { analyzed: true } }),
    prisma.crisis.count(),
    prisma.crisis.count({
      where: { status: { in: [CrisisStatus.EMERGING, CrisisStatus.ONGOING, CrisisStatus.DEVELOPING] } },
    }),
    prisma.summary.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return {
    totalEvents,
    analyzedEvents,
    unanalyzedEvents: totalEvents - analyzedEvents,
    totalCrises,
    activeCrises,
    recentSummaries,
  };
}

// Helper function
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
