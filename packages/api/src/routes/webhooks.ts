import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';
import { WebhookSource, WebhookEventStatus, SourceType } from '@prisma/client';
import { analyzeContent } from '../ai/analyzer';

const router = Router();

// ============================================
// WEBHOOK MANAGEMENT ENDPOINTS
// ============================================

// List all webhooks
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { events: true } },
      },
    });

    // Hide secrets in response
    const safeWebhooks = webhooks.map(w => ({
      ...w,
      secret: '••••••••',
    }));

    res.json({
      success: true,
      data: safeWebhooks,
    });
  })
);

// Create a new webhook
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      sourceType: z.nativeEnum(WebhookSource),
      keywords: z.array(z.string()).default([]),
      regions: z.array(z.string()).default([]),
      minSeverity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
    });

    const data = schema.parse(req.body);

    // Generate unique endpoint and secret
    const endpoint = `wh_${crypto.randomBytes(16).toString('hex')}`;
    const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;

    const webhook = await prisma.webhook.create({
      data: {
        ...data,
        endpoint,
        secret,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...webhook,
        webhookUrl: `${process.env.API_URL || 'http://localhost:3001'}/api/webhooks/receive/${endpoint}`,
      },
      message: 'Webhook created. Save the secret - it will only be shown once.',
    });
  })
);

// Get webhook details
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const webhook = await prisma.webhook.findUnique({
      where: { id: req.params.id },
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { events: true } },
      },
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    res.json({
      success: true,
      data: {
        ...webhook,
        secret: '••••••••',
        webhookUrl: `${process.env.API_URL || 'http://localhost:3001'}/api/webhooks/receive/${webhook.endpoint}`,
      },
    });
  })
);

// Update webhook
router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      isActive: z.boolean().optional(),
      keywords: z.array(z.string()).optional(),
      regions: z.array(z.string()).optional(),
      minSeverity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).nullable().optional(),
    });

    const data = schema.parse(req.body);

    const webhook = await prisma.webhook.update({
      where: { id: req.params.id },
      data,
    });

    res.json({
      success: true,
      data: { ...webhook, secret: '••••••••' },
    });
  })
);

// Regenerate webhook secret
router.post(
  '/:id/regenerate-secret',
  asyncHandler(async (req: Request, res: Response) => {
    const newSecret = `whsec_${crypto.randomBytes(32).toString('hex')}`;

    const webhook = await prisma.webhook.update({
      where: { id: req.params.id },
      data: { secret: newSecret },
    });

    res.json({
      success: true,
      data: {
        id: webhook.id,
        secret: newSecret,
      },
      message: 'Secret regenerated. Update your integration with the new secret.',
    });
  })
);

// Delete webhook
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.webhookEvent.deleteMany({
      where: { webhookId: req.params.id },
    });

    await prisma.webhook.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Webhook deleted',
    });
  })
);

// Get webhook events/logs
router.get(
  '/:id/events',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      status: z.nativeEnum(WebhookEventStatus).optional(),
    });

    const { page, limit, status } = schema.parse(req.query);

    const [events, total] = await Promise.all([
      prisma.webhookEvent.findMany({
        where: {
          webhookId: req.params.id,
          ...(status && { status }),
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.webhookEvent.count({
        where: {
          webhookId: req.params.id,
          ...(status && { status }),
        },
      }),
    ]);

    res.json({
      success: true,
      data: events,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  })
);

// ============================================
// WEBHOOK RECEIVE ENDPOINT
// ============================================

// Receive webhook - this is the public endpoint that external services call
router.post(
  '/receive/:endpoint',
  asyncHandler(async (req: Request, res: Response) => {
    const { endpoint } = req.params;

    // Find the webhook
    const webhook = await prisma.webhook.findUnique({
      where: { endpoint },
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    if (!webhook.isActive) {
      throw new AppError('Webhook is inactive', 403);
    }

    // Verify signature if provided
    const signature = req.headers['x-webhook-signature'] || req.headers['x-hub-signature-256'];
    if (signature) {
      const expectedSig = crypto
        .createHmac('sha256', webhook.secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      const providedSig = String(signature).replace('sha256=', '');
      
      if (!crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(providedSig))) {
        logger.warn(`Invalid webhook signature for ${webhook.name}`);
        throw new AppError('Invalid signature', 401);
      }
    }

    // Store the webhook event
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        webhookId: webhook.id,
        payload: req.body,
        headers: req.headers as object,
        status: WebhookEventStatus.PENDING,
      },
    });

    // Process asynchronously
    processWebhookEvent(webhookEvent.id, webhook).catch(error => {
      logger.error(`Webhook processing failed for event ${webhookEvent.id}:`, error);
    });

    // Update webhook stats
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        lastReceived: new Date(),
        totalEvents: { increment: 1 },
      },
    });

    res.status(202).json({
      success: true,
      message: 'Webhook received and queued for processing',
      eventId: webhookEvent.id,
    });
  })
);

// ============================================
// WEBHOOK PROCESSING LOGIC
// ============================================

async function processWebhookEvent(
  eventId: string,
  webhook: { id: string; name: string; sourceType: WebhookSource; keywords: string[]; regions: string[]; minSeverity: string | null }
): Promise<void> {
  try {
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: { status: WebhookEventStatus.PROCESSING },
    });

    const webhookEvent = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!webhookEvent) return;

    const payload = webhookEvent.payload as Record<string, unknown>;

    // Parse based on source type
    let eventData: { title: string; description: string; source: string; location?: string; latitude?: number; longitude?: number; publishedAt?: Date } | null = null;

    switch (webhook.sourceType) {
      case WebhookSource.GDACS:
        eventData = parseGDACSWebhook(payload);
        break;
      case WebhookSource.USGS:
        eventData = parseUSGSWebhook(payload);
        break;
      case WebhookSource.RELIEFWEB:
        eventData = parseReliefWebWebhook(payload);
        break;
      case WebhookSource.WHO:
        eventData = parseWHOWebhook(payload);
        break;
      case WebhookSource.SLACK:
      case WebhookSource.TEAMS:
        eventData = parseMessagingWebhook(payload, webhook.sourceType);
        break;
      case WebhookSource.TWITTER:
        eventData = parseTwitterWebhook(payload);
        break;
      case WebhookSource.RSS_FEED:
        eventData = parseRSSWebhook(payload);
        break;
      case WebhookSource.CUSTOM:
      case WebhookSource.ZAPIER:
      case WebhookSource.IFTTT:
        eventData = parseCustomWebhook(payload);
        break;
      default:
        eventData = parseCustomWebhook(payload);
    }

    if (!eventData) {
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          status: WebhookEventStatus.SKIPPED,
          error: 'Could not parse webhook payload',
          processedAt: new Date(),
        },
      });
      return;
    }

    // Apply keyword filter
    if (webhook.keywords.length > 0) {
      const text = `${eventData.title} ${eventData.description}`.toLowerCase();
      const hasKeyword = webhook.keywords.some(k => text.includes(k.toLowerCase()));
      if (!hasKeyword) {
        await prisma.webhookEvent.update({
          where: { id: eventId },
          data: {
            status: WebhookEventStatus.SKIPPED,
            error: 'No matching keywords',
            processedAt: new Date(),
          },
        });
        return;
      }
    }

    // Apply region filter
    if (webhook.regions.length > 0 && eventData.location) {
      const hasRegion = webhook.regions.some(r => 
        eventData!.location!.toLowerCase().includes(r.toLowerCase())
      );
      if (!hasRegion) {
        await prisma.webhookEvent.update({
          where: { id: eventId },
          data: {
            status: WebhookEventStatus.SKIPPED,
            error: 'No matching regions',
            processedAt: new Date(),
          },
        });
        return;
      }
    }

    // Create the event
    const event = await prisma.event.create({
      data: {
        title: eventData.title.substring(0, 500),
        description: eventData.description.substring(0, 2000),
        source: eventData.source,
        sourceType: mapWebhookSourceToSourceType(webhook.sourceType),
        location: eventData.location,
        latitude: eventData.latitude,
        longitude: eventData.longitude,
        publishedAt: eventData.publishedAt || new Date(),
      },
    });

    // Optionally analyze with AI
    try {
      const analysis = await analyzeContent(`${eventData.title}\n\n${eventData.description}`);
      
      // Check severity filter
      if (webhook.minSeverity) {
        const severityOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const minIndex = severityOrder.indexOf(webhook.minSeverity);
        const actualIndex = severityOrder.indexOf(analysis.severity);
        
        if (actualIndex < minIndex) {
          // Keep the event but mark as skipped for alerting
          await prisma.webhookEvent.update({
            where: { id: eventId },
            data: {
              status: WebhookEventStatus.SUCCESS,
              eventId: event.id,
              error: `Severity ${analysis.severity} below threshold ${webhook.minSeverity}`,
              processedAt: new Date(),
            },
          });
          return;
        }
      }
    } catch {
      // AI analysis failed, continue without it
    }

    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: WebhookEventStatus.SUCCESS,
        eventId: event.id,
        processedAt: new Date(),
      },
    });

    logger.info(`Webhook event processed: ${event.title}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: WebhookEventStatus.FAILED,
        error: errorMessage,
        processedAt: new Date(),
      },
    });

    await prisma.webhook.update({
      where: { id: webhook.id },
      data: { failedEvents: { increment: 1 } },
    });

    throw error;
  }
}

// ============================================
// WEBHOOK PAYLOAD PARSERS
// ============================================

function parseGDACSWebhook(payload: Record<string, unknown>): ReturnType<typeof parseCustomWebhook> {
  const props = (payload.properties || payload) as Record<string, unknown>;
  return {
    title: `GDACS Alert: ${props.name || props.title || 'Unknown Event'}`,
    description: String(props.description || props.message || ''),
    source: String(props.url || props.link || `gdacs-webhook-${Date.now()}`),
    location: String(props.country || props.location || ''),
    latitude: typeof props.latitude === 'number' ? props.latitude : undefined,
    longitude: typeof props.longitude === 'number' ? props.longitude : undefined,
    publishedAt: props.date ? new Date(String(props.date)) : undefined,
  };
}

function parseUSGSWebhook(payload: Record<string, unknown>): ReturnType<typeof parseCustomWebhook> {
  const props = (payload.properties || payload) as Record<string, unknown>;
  const geometry = payload.geometry as { coordinates?: number[] } | undefined;
  
  return {
    title: `Earthquake: ${props.title || props.place || 'Unknown Location'}`,
    description: `Magnitude ${props.mag || 'N/A'}. ${props.place || ''}`,
    source: String(props.url || props.id || `usgs-webhook-${Date.now()}`),
    location: String(props.place || ''),
    latitude: geometry?.coordinates?.[1],
    longitude: geometry?.coordinates?.[0],
    publishedAt: typeof props.time === 'number' ? new Date(props.time) : undefined,
  };
}

function parseReliefWebWebhook(payload: Record<string, unknown>): ReturnType<typeof parseCustomWebhook> {
  const fields = (payload.fields || payload) as Record<string, unknown>;
  return {
    title: String(fields.title || fields.name || 'ReliefWeb Report'),
    description: String(fields.body || fields.description || '').substring(0, 1000),
    source: String(fields.url || fields.url_alias || `reliefweb-webhook-${Date.now()}`),
    location: String((fields.country as { name?: string })?.name || ''),
    publishedAt: fields.date ? new Date(String((fields.date as { created?: string })?.created || fields.date)) : undefined,
  };
}

function parseWHOWebhook(payload: Record<string, unknown>): ReturnType<typeof parseCustomWebhook> {
  return {
    title: `WHO Alert: ${payload.title || payload.headline || 'Health Alert'}`,
    description: String(payload.description || payload.body || payload.content || ''),
    source: String(payload.url || payload.link || `who-webhook-${Date.now()}`),
    location: String(payload.country || payload.region || ''),
    publishedAt: payload.date ? new Date(String(payload.date)) : undefined,
  };
}

function parseMessagingWebhook(payload: Record<string, unknown>, source: WebhookSource): ReturnType<typeof parseCustomWebhook> {
  // Slack format
  if (source === WebhookSource.SLACK) {
    const text = String(payload.text || (payload.event as Record<string, unknown>)?.text || '');
    return {
      title: text.substring(0, 100),
      description: text,
      source: `slack-${payload.event_id || Date.now()}`,
      publishedAt: typeof payload.event_time === 'number' ? new Date(payload.event_time * 1000) : undefined,
    };
  }
  
  // Teams format
  const text = String(payload.text || payload.body || payload.message || '');
  return {
    title: text.substring(0, 100),
    description: text,
    source: `teams-${payload.id || Date.now()}`,
  };
}

function parseTwitterWebhook(payload: Record<string, unknown>): ReturnType<typeof parseCustomWebhook> {
  const tweet = (payload.data || payload.tweet || payload) as Record<string, unknown>;
  const text = String(tweet.text || tweet.full_text || '');
  
  return {
    title: text.substring(0, 100),
    description: text,
    source: `twitter-${tweet.id || Date.now()}`,
    publishedAt: tweet.created_at ? new Date(String(tweet.created_at)) : undefined,
  };
}

function parseRSSWebhook(payload: Record<string, unknown>): ReturnType<typeof parseCustomWebhook> {
  const item = (payload.item || payload.entry || payload) as Record<string, unknown>;
  return {
    title: String(item.title || 'RSS Item'),
    description: String(item.description || item.content || item.summary || ''),
    source: String(item.link || item.url || item.guid || `rss-${Date.now()}`),
    publishedAt: item.pubDate ? new Date(String(item.pubDate)) : undefined,
  };
}

function parseCustomWebhook(payload: Record<string, unknown>): {
  title: string;
  description: string;
  source: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  publishedAt?: Date;
} | null {
  // Try common field names
  const title = String(
    payload.title ||
    payload.name ||
    payload.headline ||
    payload.subject ||
    payload.event ||
    ''
  );

  const description = String(
    payload.description ||
    payload.body ||
    payload.content ||
    payload.message ||
    payload.text ||
    payload.summary ||
    ''
  );

  if (!title && !description) {
    return null;
  }

  return {
    title: title || description.substring(0, 100),
    description: description || title,
    source: String(
      payload.url ||
      payload.link ||
      payload.source ||
      payload.id ||
      `custom-${Date.now()}`
    ),
    location: String(payload.location || payload.country || payload.region || ''),
    latitude: typeof payload.latitude === 'number' ? payload.latitude : 
              typeof payload.lat === 'number' ? payload.lat : undefined,
    longitude: typeof payload.longitude === 'number' ? payload.longitude :
               typeof payload.lng === 'number' ? payload.lng :
               typeof payload.lon === 'number' ? payload.lon : undefined,
    publishedAt: payload.date || payload.timestamp || payload.created_at
      ? new Date(String(payload.date || payload.timestamp || payload.created_at))
      : undefined,
  };
}

function mapWebhookSourceToSourceType(source: WebhookSource): SourceType {
  const mapping: Record<WebhookSource, SourceType> = {
    GDACS: SourceType.SATELLITE,
    RELIEFWEB: SourceType.UN_REPORT,
    USGS: SourceType.GOVERNMENT,
    WHO: SourceType.UN_REPORT,
    CUSTOM: SourceType.OTHER,
    SLACK: SourceType.SOCIAL_MEDIA,
    TEAMS: SourceType.OTHER,
    TWITTER: SourceType.SOCIAL_MEDIA,
    RSS_FEED: SourceType.NEWS,
    ZAPIER: SourceType.OTHER,
    IFTTT: SourceType.OTHER,
  };
  return mapping[source] || SourceType.OTHER;
}

// ============================================
// TEST WEBHOOK ENDPOINT
// ============================================

// Send a test payload to a webhook
router.post(
  '/:id/test',
  asyncHandler(async (req: Request, res: Response) => {
    const webhook = await prisma.webhook.findUnique({
      where: { id: req.params.id },
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    // Create test payload based on source type
    const testPayloads: Record<WebhookSource, object> = {
      GDACS: {
        name: 'Test Earthquake Event',
        description: 'This is a test GDACS alert for webhook verification',
        country: 'Test Country',
        latitude: 35.6762,
        longitude: 139.6503,
        date: new Date().toISOString(),
      },
      USGS: {
        properties: {
          title: 'M 5.0 - Test Location',
          place: 'Test Location',
          mag: 5.0,
          time: Date.now(),
        },
        geometry: { coordinates: [139.6503, 35.6762, 10] },
      },
      RELIEFWEB: {
        fields: {
          title: 'Test ReliefWeb Report',
          body: 'This is a test report for webhook verification',
          country: { name: 'Test Country' },
        },
      },
      WHO: {
        title: 'Test WHO Health Alert',
        description: 'This is a test health alert for webhook verification',
        country: 'Test Country',
      },
      CUSTOM: {
        title: 'Test Custom Event',
        description: 'This is a test custom webhook payload',
        location: 'Test Location',
      },
      SLACK: {
        text: 'Test crisis alert from Slack integration',
        event_id: 'test-123',
      },
      TEAMS: {
        text: 'Test crisis alert from Teams integration',
      },
      TWITTER: {
        data: {
          text: 'Breaking: Test humanitarian crisis alert #crisis #humanitarian',
          id: 'test-tweet-123',
        },
      },
      RSS_FEED: {
        item: {
          title: 'Test RSS Item',
          description: 'Test RSS feed item for webhook verification',
          link: 'https://example.com/test',
        },
      },
      ZAPIER: {
        title: 'Test Zapier Event',
        description: 'Event from Zapier integration',
      },
      IFTTT: {
        title: 'Test IFTTT Event',
        description: 'Event from IFTTT integration',
      },
    };

    const payload = testPayloads[webhook.sourceType] || testPayloads.CUSTOM;

    // Create signature
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    // Store as webhook event
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        webhookId: webhook.id,
        payload,
        headers: { 'x-webhook-signature': `sha256=${signature}`, 'x-test': 'true' },
        status: WebhookEventStatus.PENDING,
      },
    });

    // Process the test event
    await processWebhookEvent(webhookEvent.id, webhook);

    const updatedEvent = await prisma.webhookEvent.findUnique({
      where: { id: webhookEvent.id },
    });

    res.json({
      success: true,
      message: 'Test webhook processed',
      data: updatedEvent,
    });
  })
);

export default router;
