import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { emailService } from './emailService';
import { Severity } from '@prisma/client';

// Map severity enum to numeric values for comparison
const severityOrder: Record<Severity, number> = {
  UNKNOWN: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

function severityToNumber(severity: Severity): number {
  return severityOrder[severity] ?? 0;
}

/**
 * Check for new crises and send immediate notifications to matching subscribers
 */
export async function processImmediateNotifications(): Promise<void> {
  try {
    // Find crises that haven't had notifications sent yet (created in last hour)
    // Only notify for MEDIUM severity and above
    const recentCrises = await prisma.crisis.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
        severity: {
          in: ['MEDIUM', 'HIGH', 'CRITICAL'],
        },
      },
    });

    if (recentCrises.length === 0) {
      return;
    }

    // Find all active subscribers with IMMEDIATE frequency
    // Note: alertSubscription model available after prisma generate
    const immediateSubscribers = await (prisma as any).alertSubscription.findMany({
      where: {
        isActive: true,
        emailVerified: true,
        frequency: 'IMMEDIATE',
      },
    });

    for (const crisis of recentCrises) {
      // Find matching subscribers
      const matchingSubscribers = immediateSubscribers.filter((sub: any) => {
        // Check region match (region can be null)
        const crisisRegion = crisis.region || '';
        const regionMatch =
          sub.regions.length === 0 ||
          sub.regions.some((r: string) =>
            crisisRegion.toLowerCase().includes(r.toLowerCase())
          );

        // Check crisis type match (using type enum)
        const typeMatch =
          sub.crisisTypes.length === 0 ||
          sub.crisisTypes.includes(crisis.type);

        // Check minimum severity
        const crisisSeverityNum = severityToNumber(crisis.severity);
        const minSeverityNum = severityToNumber(sub.minSeverity);
        const severityMatch = crisisSeverityNum >= minSeverityNum;

        return regionMatch && typeMatch && severityMatch;
      });

      for (const subscriber of matchingSubscribers) {
        // Check if we already sent this notification
        const existingNotification = await (prisma as any).sentNotification.findFirst({
          where: {
            subscriptionId: subscriber.id,
            crisisId: crisis.id,
          },
        });

        if (existingNotification) {
          continue;
        }

        // Create pending notification record
        const notification = await (prisma as any).sentNotification.create({
          data: {
            subscriptionId: subscriber.id,
            crisisId: crisis.id,
            subject: `🚨 Crisis Alert: ${crisis.title}`,
            content: crisis.description || '',
            status: 'PENDING',
          },
        });

        try {
          // Send the email
          await emailService.sendCrisisAlert(
            subscriber.email,
            {
              crisisId: crisis.id,
              crisisTitle: crisis.title,
              crisisType: crisis.type,
              severity: crisis.severity,
              location: crisis.region || 'Unknown location',
              description: crisis.description || 'Analysis in progress...',
            },
            subscriber.unsubscribeToken,
            subscriber.name
          );

          // Mark as sent
          await (prisma as any).sentNotification.update({
            where: { id: notification.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          });

          logger.info(`Sent crisis alert to ${subscriber.email} for crisis ${crisis.id}`);
        } catch (error) {
          // Mark as failed
          await (prisma as any).sentNotification.update({
            where: { id: notification.id },
            data: { status: 'FAILED' },
          });

          logger.error(`Failed to send alert to ${subscriber.email}:`, error);
        }
      }
    }
  } catch (error) {
    logger.error('Error processing immediate notifications:', error);
    throw error;
  }
}

/**
 * Send daily digest emails to subscribers
 */
export async function processDailyDigest(): Promise<void> {
  try {
    // Find crises from the last 24 hours
    const recentCrises = await prisma.crisis.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { severity: 'desc' },
    });

    if (recentCrises.length === 0) {
      logger.info('No crises for daily digest');
      return;
    }

    // Find all active subscribers with DAILY frequency
    const dailySubscribers = await (prisma as any).alertSubscription.findMany({
      where: {
        isActive: true,
        emailVerified: true,
        frequency: 'DAILY',
      },
    });

    for (const subscriber of dailySubscribers) {
      // Filter crises matching subscriber preferences
      const matchingCrises = recentCrises.filter((crisis) => {
        const crisisRegion = crisis.region || '';
        const regionMatch =
          subscriber.regions.length === 0 ||
          subscriber.regions.some((r: string) =>
            crisisRegion.toLowerCase().includes(r.toLowerCase())
          );

        const typeMatch =
          subscriber.crisisTypes.length === 0 ||
          subscriber.crisisTypes.includes(crisis.type);

        const crisisSeverityNum = severityToNumber(crisis.severity);
        const minSeverityNum = severityToNumber(subscriber.minSeverity);
        const severityMatch = crisisSeverityNum >= minSeverityNum;

        return regionMatch && typeMatch && severityMatch;
      });

      if (matchingCrises.length === 0) {
        continue;
      }

      try {
        // Build crisis list for email in CrisisAlertData format
        const crisisList = matchingCrises.map((c) => ({
          crisisId: c.id,
          crisisTitle: c.title,
          crisisType: c.type,
          severity: c.severity,
          location: c.region || 'Unknown',
          description: c.description || '',
        }));

        await emailService.sendDailyDigest(
          subscriber.email,
          crisisList,
          subscriber.unsubscribeToken,
          subscriber.name
        );

        logger.info(`Sent daily digest to ${subscriber.email} with ${matchingCrises.length} crises`);
      } catch (error) {
        logger.error(`Failed to send daily digest to ${subscriber.email}:`, error);
      }
    }
  } catch (error) {
    logger.error('Error processing daily digest:', error);
    throw error;
  }
}

/**
 * Send weekly digest emails to subscribers
 */
export async function processWeeklyDigest(): Promise<void> {
  try {
    // Find crises from the last 7 days
    const recentCrises = await prisma.crisis.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { severity: 'desc' },
    });

    if (recentCrises.length === 0) {
      logger.info('No crises for weekly digest');
      return;
    }

    // Find all active subscribers with WEEKLY frequency
    const weeklySubscribers = await (prisma as any).alertSubscription.findMany({
      where: {
        isActive: true,
        emailVerified: true,
        frequency: 'WEEKLY',
      },
    });

    for (const subscriber of weeklySubscribers) {
      // Filter crises matching subscriber preferences
      const matchingCrises = recentCrises.filter((crisis) => {
        const crisisRegion = crisis.region || '';
        const regionMatch =
          subscriber.regions.length === 0 ||
          subscriber.regions.some((r: string) =>
            crisisRegion.toLowerCase().includes(r.toLowerCase())
          );

        const typeMatch =
          subscriber.crisisTypes.length === 0 ||
          subscriber.crisisTypes.includes(crisis.type);

        const crisisSeverityNum = severityToNumber(crisis.severity);
        const minSeverityNum = severityToNumber(subscriber.minSeverity);
        const severityMatch = crisisSeverityNum >= minSeverityNum;

        return regionMatch && typeMatch && severityMatch;
      });

      if (matchingCrises.length === 0) {
        continue;
      }

      try {
        // Build crisis list for email in CrisisAlertData format
        const crisisList = matchingCrises.map((c) => ({
          crisisId: c.id,
          crisisTitle: c.title,
          crisisType: c.type,
          severity: c.severity,
          location: c.region || 'Unknown',
          description: c.description || '',
        }));

        await emailService.sendDailyDigest(
          subscriber.email,
          crisisList,
          subscriber.unsubscribeToken,
          subscriber.name
        );

        logger.info(`Sent weekly digest to ${subscriber.email} with ${matchingCrises.length} crises`);
      } catch (error) {
        logger.error(`Failed to send weekly digest to ${subscriber.email}:`, error);
      }
    }
  } catch (error) {
    logger.error('Error processing weekly digest:', error);
    throw error;
  }
}
