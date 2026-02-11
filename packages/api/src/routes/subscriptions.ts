import { Router, Request, Response } from 'express';
import { CrisisType, Severity } from '@prisma/client';
import { randomBytes } from 'crypto';
import { emailService } from '../services/emailService';
import { prisma } from '../lib/prisma';

const router = Router();

// NotificationFreq enum values (defined in schema, may not be in client until regenerated)
const NOTIFICATION_FREQ = ['IMMEDIATE', 'DAILY', 'WEEKLY'] as const;
type NotificationFreq = typeof NOTIFICATION_FREQ[number];

// List of valid regions (countries and major regions)
const VALID_REGIONS = [
  // Africa
  'Ethiopia', 'Somalia', 'Sudan', 'South Sudan', 'Kenya', 'Uganda', 'DRC', 'Nigeria', 
  'Niger', 'Mali', 'Burkina Faso', 'Chad', 'Cameroon', 'Central African Republic',
  'Mozambique', 'Zimbabwe', 'Malawi', 'Madagascar', 'South Africa',
  // Middle East
  'Syria', 'Yemen', 'Iraq', 'Lebanon', 'Palestine', 'Jordan', 'Afghanistan',
  // Asia
  'Bangladesh', 'Myanmar', 'Pakistan', 'India', 'Nepal', 'Philippines', 'Indonesia',
  // Americas
  'Haiti', 'Venezuela', 'Colombia', 'Honduras', 'Guatemala',
  // Europe
  'Ukraine',
  // Regions
  'East Africa', 'West Africa', 'Horn of Africa', 'Sahel', 'Middle East', 
  'South Asia', 'Southeast Asia', 'Central America', 'Caribbean',
  'Global' // For users who want all alerts
];

// Crisis type labels for display
const CRISIS_TYPE_LABELS: Record<string, string> = {
  NATURAL_DISASTER: 'Natural Disasters',
  CONFLICT: 'Conflicts & Violence',
  DISEASE_OUTBREAK: 'Disease Outbreaks',
  FOOD_SECURITY: 'Food Security',
  DISPLACEMENT: 'Population Displacement',
  INFRASTRUCTURE: 'Infrastructure Failures',
  ECONOMIC: 'Economic Crises',
  ENVIRONMENTAL: 'Environmental Hazards',
  OTHER: 'Other'
};

/**
 * GET /api/subscriptions/regions
 * Get list of available regions for subscription
 */
router.get('/regions', (_req: Request, res: Response) => {
  res.json({
    regions: VALID_REGIONS,
    crisisTypes: Object.entries(CRISIS_TYPE_LABELS).map(([value, label]) => ({ value, label })),
    severities: [
      { value: 'LOW', label: 'Low (All alerts)' },
      { value: 'MEDIUM', label: 'Medium and above' },
      { value: 'HIGH', label: 'High and Critical only' },
      { value: 'CRITICAL', label: 'Critical only' }
    ],
    frequencies: [
      { value: 'IMMEDIATE', label: 'Immediate (as they happen)' },
      { value: 'DAILY', label: 'Daily digest' },
      { value: 'WEEKLY', label: 'Weekly summary' }
    ]
  });
});

/**
 * POST /api/subscriptions
 * Create a new alert subscription
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, name, regions, crisisTypes, minSeverity, frequency } = req.body;

    // Validation
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    if (!regions || !Array.isArray(regions) || regions.length === 0) {
      return res.status(400).json({ error: 'At least one region is required' });
    }

    // Validate regions
    const invalidRegions = regions.filter((r: string) => !VALID_REGIONS.includes(r));
    if (invalidRegions.length > 0) {
      return res.status(400).json({ 
        error: `Invalid regions: ${invalidRegions.join(', ')}`,
        validRegions: VALID_REGIONS
      });
    }

    // Validate crisis types if provided
    const validCrisisTypes = Object.keys(CrisisType);
    const selectedTypes = crisisTypes && crisisTypes.length > 0 
      ? crisisTypes.filter((t: string) => validCrisisTypes.includes(t))
      : validCrisisTypes;

    // Use prisma as any until Prisma client is regenerated with new models
    const alertSub = (prisma as any);

    // Check for existing subscription
    const existing = await alertSub.alertSubscription.findFirst({
      where: { email, isActive: true }
    });

    if (existing) {
      // Update existing subscription
      const verificationToken = randomBytes(32).toString('hex');
      
      const updated = await alertSub.alertSubscription.update({
        where: { id: existing.id },
        data: {
          name: name || existing.name,
          regions,
          crisisTypes: selectedTypes as CrisisType[],
          minSeverity: (minSeverity as Severity) || 'MEDIUM',
          frequency: (frequency as NotificationFreq) || 'IMMEDIATE',
          verificationToken: existing.emailVerified ? null : verificationToken,
        }
      });

      // Send verification email if not verified
      if (!existing.emailVerified) {
        await emailService.sendVerificationEmail(email, verificationToken, name);
      }

      return res.json({
        message: existing.emailVerified 
          ? 'Subscription updated successfully'
          : 'Subscription updated. Please check your email to verify.',
        subscriptionId: updated.id,
        verified: existing.emailVerified
      });
    }

    // Create new subscription
    const verificationToken = randomBytes(32).toString('hex');
    
    const subscription = await alertSub.alertSubscription.create({
      data: {
        email,
        name,
        regions,
        crisisTypes: selectedTypes as CrisisType[],
        minSeverity: (minSeverity as Severity) || 'MEDIUM',
        frequency: (frequency as NotificationFreq) || 'IMMEDIATE',
        verificationToken,
        unsubscribeToken: randomBytes(16).toString('hex')
      }
    });

    // Send verification email
    await emailService.sendVerificationEmail(email, verificationToken, name);

    res.status(201).json({
      message: 'Subscription created. Please check your email to verify.',
      subscriptionId: subscription.id
    });
  } catch (error) {
    console.error('[Subscriptions] Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

/**
 * GET /api/subscriptions/verify/:token
 * Verify email subscription
 */
router.get('/verify/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const alertSub = (prisma as any);

    const subscription = await alertSub.alertSubscription.findUnique({
      where: { verificationToken: token }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Invalid or expired verification token' });
    }

    await alertSub.alertSubscription.update({
      where: { id: subscription.id },
      data: {
        emailVerified: true,
        verificationToken: null
      }
    });

    res.json({ 
      message: 'Email verified successfully! You will now receive crisis alerts.',
      regions: subscription.regions
    });
  } catch (error) {
    console.error('[Subscriptions] Error verifying email:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

/**
 * GET /api/subscriptions/manage/:token
 * Get subscription details for management
 */
router.get('/manage/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const alertSub = (prisma as any);

    const subscription = await alertSub.alertSubscription.findUnique({
      where: { unsubscribeToken: token },
      include: {
        notifications: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({
      id: subscription.id,
      email: subscription.email,
      name: subscription.name,
      regions: subscription.regions,
      crisisTypes: subscription.crisisTypes,
      minSeverity: subscription.minSeverity,
      frequency: subscription.frequency,
      isActive: subscription.isActive,
      emailVerified: subscription.emailVerified,
      createdAt: subscription.createdAt,
      recentNotifications: subscription.notifications
    });
  } catch (error) {
    console.error('[Subscriptions] Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * PUT /api/subscriptions/manage/:token
 * Update subscription preferences
 */
router.put('/manage/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { name, regions, crisisTypes, minSeverity, frequency, isActive } = req.body;
    const alertSub = (prisma as any);

    const subscription = await alertSub.alertSubscription.findUnique({
      where: { unsubscribeToken: token }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Validate regions if provided
    if (regions) {
      const invalidRegions = regions.filter((r: string) => !VALID_REGIONS.includes(r));
      if (invalidRegions.length > 0) {
        return res.status(400).json({ error: `Invalid regions: ${invalidRegions.join(', ')}` });
      }
    }

    const updated = await alertSub.alertSubscription.update({
      where: { id: subscription.id },
      data: {
        ...(name !== undefined && { name }),
        ...(regions && { regions }),
        ...(crisisTypes && { crisisTypes: crisisTypes as CrisisType[] }),
        ...(minSeverity && { minSeverity: minSeverity as Severity }),
        ...(frequency && { frequency: frequency as NotificationFreq }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json({
      message: 'Subscription updated successfully',
      subscription: {
        id: updated.id,
        regions: updated.regions,
        crisisTypes: updated.crisisTypes,
        minSeverity: updated.minSeverity,
        frequency: updated.frequency,
        isActive: updated.isActive
      }
    });
  } catch (error) {
    console.error('[Subscriptions] Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

/**
 * DELETE /api/subscriptions/unsubscribe/:token
 * Unsubscribe from alerts
 */
router.delete('/unsubscribe/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const alertSub = (prisma as any);

    const subscription = await alertSub.alertSubscription.findUnique({
      where: { unsubscribeToken: token }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await alertSub.alertSubscription.update({
      where: { id: subscription.id },
      data: { isActive: false }
    });

    res.json({ message: 'Successfully unsubscribed from crisis alerts' });
  } catch (error) {
    console.error('[Subscriptions] Error unsubscribing:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

/**
 * POST /api/subscriptions/resubscribe/:token
 * Reactivate a subscription
 */
router.post('/resubscribe/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const alertSub = (prisma as any);

    const subscription = await alertSub.alertSubscription.findUnique({
      where: { unsubscribeToken: token }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await alertSub.alertSubscription.update({
      where: { id: subscription.id },
      data: { isActive: true }
    });

    res.json({ message: 'Subscription reactivated successfully' });
  } catch (error) {
    console.error('[Subscriptions] Error resubscribing:', error);
    res.status(500).json({ error: 'Failed to resubscribe' });
  }
});

export default router;
