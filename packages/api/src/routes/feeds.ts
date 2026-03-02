import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * Generate RSS feed for crises
 * GET /api/feeds/rss
 */
router.get('/rss', async (req: Request, res: Response) => {
  try {
    const crises = await prisma.crisis.findMany({
      where: { status: { not: 'RESOLVED' } },
      orderBy: { detectedAt: 'desc' },
      take: 50,
    });

    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    const buildDate = new Date().toUTCString();

    const rssItems = crises.map(crisis => `
    <item>
      <title><![CDATA[${crisis.title}]]></title>
      <link>${baseUrl}/crises/${crisis.id}</link>
      <guid isPermaLink="true">${baseUrl}/crises/${crisis.id}</guid>
      <description><![CDATA[${crisis.description || 'No description available'}]]></description>
      <pubDate>${new Date(crisis.detectedAt).toUTCString()}</pubDate>
      <category>${crisis.type}</category>
      <category>Severity: ${crisis.severity}</category>
      ${crisis.location ? `<category>Location: ${crisis.location}</category>` : ''}
    </item>`).join('\n');

    const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AidWatch Crisis Alerts</title>
    <link>${baseUrl}</link>
    <description>Real-time humanitarian crisis alerts and updates from AidWatch</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/api/feeds/rss" rel="self" type="application/rss+xml"/>
    <ttl>30</ttl>
    ${rssItems}
  </channel>
</rss>`;

    res.set('Content-Type', 'application/rss+xml');
    res.send(rssFeed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate RSS feed' });
  }
});

/**
 * Generate Atom feed for crises
 * GET /api/feeds/atom
 */
router.get('/atom', async (req: Request, res: Response) => {
  try {
    const crises = await prisma.crisis.findMany({
      where: { status: { not: 'RESOLVED' } },
      orderBy: { detectedAt: 'desc' },
      take: 50,
    });

    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    const updatedDate = new Date().toISOString();

    const atomEntries = crises.map(crisis => `
  <entry>
    <title><![CDATA[${crisis.title}]]></title>
    <link href="${baseUrl}/crises/${crisis.id}"/>
    <id>urn:uuid:${crisis.id}</id>
    <updated>${new Date(crisis.updatedAt).toISOString()}</updated>
    <published>${new Date(crisis.detectedAt).toISOString()}</published>
    <summary><![CDATA[${crisis.description || 'No description available'}]]></summary>
    <category term="${crisis.type}"/>
    <category term="severity:${crisis.severity}"/>
    ${crisis.latitude && crisis.longitude ? `<georss:point>${crisis.latitude} ${crisis.longitude}</georss:point>` : ''}
  </entry>`).join('\n');

    const atomFeed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:georss="http://www.georss.org/georss">
  <title>AidWatch Crisis Alerts</title>
  <subtitle>Real-time humanitarian crisis alerts and updates</subtitle>
  <link href="${baseUrl}"/>
  <link href="${baseUrl}/api/feeds/atom" rel="self"/>
  <id>urn:uuid:aidwatch-main-feed</id>
  <updated>${updatedDate}</updated>
  <author>
    <name>AidWatch System</name>
  </author>
  ${atomEntries}
</feed>`;

    res.set('Content-Type', 'application/atom+xml');
    res.send(atomFeed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate Atom feed' });
  }
});

/**
 * Generate RSS feed filtered by severity
 * GET /api/feeds/rss/critical
 */
router.get('/rss/:severity', async (req: Request, res: Response) => {
  try {
    const { severity } = req.params;
    const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    
    if (!validSeverities.includes(severity.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid severity. Use: CRITICAL, HIGH, MEDIUM, or LOW' });
    }

    const crises = await prisma.crisis.findMany({
      where: { 
        status: { not: 'RESOLVED' },
        severity: severity.toUpperCase() as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
      },
      orderBy: { detectedAt: 'desc' },
      take: 50,
    });

    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    const buildDate = new Date().toUTCString();

    const rssItems = crises.map(crisis => `
    <item>
      <title><![CDATA[${crisis.title}]]></title>
      <link>${baseUrl}/crises/${crisis.id}</link>
      <guid isPermaLink="true">${baseUrl}/crises/${crisis.id}</guid>
      <description><![CDATA[${crisis.description || 'No description available'}]]></description>
      <pubDate>${new Date(crisis.detectedAt).toUTCString()}</pubDate>
      <category>${crisis.type}</category>
      <category>Severity: ${crisis.severity}</category>
    </item>`).join('\n');

    const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AidWatch ${severity.toUpperCase()} Alerts</title>
    <link>${baseUrl}</link>
    <description>${severity.toUpperCase()} severity crisis alerts from AidWatch</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/api/feeds/rss/${severity}" rel="self" type="application/rss+xml"/>
    <ttl>15</ttl>
    ${rssItems}
  </channel>
</rss>`;

    res.set('Content-Type', 'application/rss+xml');
    res.send(rssFeed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate RSS feed' });
  }
});

export default router;
