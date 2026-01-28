import axios from 'axios';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { SourceType } from '@prisma/client';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { name: string };
}

interface GDELTEvent {
  title: string;
  url: string;
  seendate: string;
  domain: string;
  tone: number;
}

interface USGSEarthquake {
  properties: {
    title: string;
    place: string;
    mag: number;
    time: number;
    url: string;
    alert: string | null;
  };
  geometry: {
    coordinates: [number, number, number];
  };
}

// Humanitarian-related search terms
const CRISIS_KEYWORDS = [
  'humanitarian crisis',
  'refugee',
  'displacement',
  'famine',
  'drought',
  'flooding',
  'earthquake',
  'conflict',
  'epidemic',
  'outbreak',
  'emergency aid',
  'food shortage',
];

export async function fetchNewsAPI(): Promise<void> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    logger.warn('NEWS_API_KEY not configured, skipping NewsAPI fetch');
    return;
  }

  try {
    for (const keyword of CRISIS_KEYWORDS.slice(0, 5)) { // Limit to avoid rate limits
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: keyword,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: 10,
          apiKey,
        },
      });

      const articles: NewsArticle[] = response.data.articles || [];

      for (const article of articles) {
        // Check if event already exists
        const existing = await prisma.event.findFirst({
          where: { source: article.url },
        });

        if (!existing && article.title && article.description) {
          await prisma.event.create({
            data: {
              title: article.title,
              description: article.description || '',
              source: article.url,
              sourceType: SourceType.NEWS,
              publishedAt: new Date(article.publishedAt),
            },
          });
        }
      }
    }

    logger.info('NewsAPI fetch completed');
  } catch (error) {
    logger.error('NewsAPI fetch failed:', error);
  }
}

export async function fetchGDELT(): Promise<void> {
  try {
    // GDELT Doc API - search for humanitarian-related news
    const query = 'humanitarian OR refugee OR crisis OR disaster';
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=50&format=json`;

    const response = await axios.get(url, { timeout: 30000 });
    const articles: GDELTEvent[] = response.data.articles || [];

    for (const article of articles) {
      const existing = await prisma.event.findFirst({
        where: { source: article.url },
      });

      if (!existing && article.title) {
        await prisma.event.create({
          data: {
            title: article.title,
            description: '', // GDELT doesn't always provide descriptions
            source: article.url,
            sourceType: SourceType.NEWS,
            publishedAt: new Date(article.seendate),
            sentiment: article.tone ? article.tone / 10 : null, // Normalize GDELT tone
          },
        });
      }
    }

    logger.info('GDELT fetch completed');
  } catch (error) {
    logger.error('GDELT fetch failed:', error);
  }
}

export async function fetchReliefWeb(): Promise<void> {
  try {
    const response = await axios.get('https://api.reliefweb.int/v1/reports', {
      params: {
        appname: 'aidwatch',
        limit: 20,
        preset: 'latest',
        fields: {
          include: ['title', 'body', 'url', 'date.created', 'source.name', 'country.name'],
        },
      },
    });

    const reports = response.data.data || [];

    for (const report of reports) {
      const existing = await prisma.event.findFirst({
        where: { source: report.fields.url },
      });

      if (!existing) {
        await prisma.event.create({
          data: {
            title: report.fields.title,
            description: report.fields.body?.substring(0, 1000) || '',
            source: report.fields.url,
            sourceType: SourceType.UN_REPORT,
            location: report.fields.country?.[0]?.name,
            publishedAt: new Date(report.fields.date.created),
          },
        });
      }
    }

    logger.info('ReliefWeb fetch completed');
  } catch (error) {
    logger.error('ReliefWeb fetch failed:', error);
  }
}

// Fetch USGS Earthquake data (significant earthquakes)
export async function fetchUSGSEarthquakes(): Promise<void> {
  try {
    // Get significant earthquakes from the past week
    const response = await axios.get(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson',
      { timeout: 30000 }
    );

    const earthquakes: USGSEarthquake[] = response.data.features || [];

    for (const eq of earthquakes) {
      const { properties, geometry } = eq;
      const eventUrl = properties.url || `usgs-eq-${properties.time}`;

      const existing = await prisma.event.findFirst({
        where: { source: eventUrl },
      });

      if (!existing && properties.title) {
        await prisma.event.create({
          data: {
            title: `Earthquake: ${properties.title}`,
            description: `Magnitude ${properties.mag} earthquake detected. Location: ${properties.place}. ${properties.alert ? `Alert level: ${properties.alert}` : ''}`,
            source: eventUrl,
            sourceType: SourceType.GOVERNMENT,
            location: properties.place,
            latitude: geometry.coordinates[1],
            longitude: geometry.coordinates[0],
            publishedAt: new Date(properties.time),
          },
        });
      }
    }

    logger.info(`USGS earthquakes fetch completed: ${earthquakes.length} events`);
  } catch (error) {
    logger.error('USGS earthquakes fetch failed:', error);
  }
}

// Fetch WHO Disease Outbreak News
export async function fetchWHOOutbreaks(): Promise<void> {
  try {
    // WHO provides RSS feed for disease outbreak news
    const response = await axios.get(
      'https://www.who.int/feeds/entity/csr/don/en/rss.xml',
      { 
        timeout: 30000,
        headers: { 'Accept': 'application/xml' }
      }
    );

    // Simple XML parsing for RSS
    const xmlText = response.data;
    const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];

    for (const itemXml of itemMatches.slice(0, 20)) {
      const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || '';
      const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
      const description = itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || '';
      const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';

      if (!title || !link) continue;

      const existing = await prisma.event.findFirst({
        where: { source: link },
      });

      if (!existing) {
        await prisma.event.create({
          data: {
            title: `WHO: ${title}`,
            description: description.substring(0, 1000).replace(/<[^>]*>/g, ''),
            source: link,
            sourceType: SourceType.UN_REPORT,
            publishedAt: pubDate ? new Date(pubDate) : new Date(),
          },
        });
      }
    }

    logger.info('WHO outbreaks fetch completed');
  } catch (error) {
    logger.error('WHO outbreaks fetch failed:', error);
  }
}

// Fetch HDX (Humanitarian Data Exchange) datasets
export async function fetchHDXDatasets(): Promise<void> {
  try {
    // Search for recent crisis-related datasets
    const response = await axios.get(
      'https://data.humdata.org/api/3/action/package_search',
      {
        params: {
          q: 'crisis OR emergency OR disaster OR conflict',
          rows: 20,
          sort: 'metadata_modified desc',
        },
        timeout: 30000,
      }
    );

    const datasets = response.data.result?.results || [];

    for (const dataset of datasets) {
      const datasetUrl = `https://data.humdata.org/dataset/${dataset.name}`;

      const existing = await prisma.event.findFirst({
        where: { source: datasetUrl },
      });

      if (!existing && dataset.title) {
        // Extract location from dataset groups
        const location = dataset.groups?.[0]?.display_name || null;

        await prisma.event.create({
          data: {
            title: `HDX Dataset: ${dataset.title}`,
            description: dataset.notes?.substring(0, 1000) || '',
            source: datasetUrl,
            sourceType: SourceType.NGO_REPORT,
            location,
            publishedAt: new Date(dataset.metadata_modified || Date.now()),
          },
        });
      }
    }

    logger.info('HDX datasets fetch completed');
  } catch (error) {
    logger.error('HDX datasets fetch failed:', error);
  }
}

// Fetch ACAPS Crisis Data (publicly available crisis briefs)
export async function fetchACAPSCrisis(): Promise<void> {
  try {
    const response = await axios.get(
      'https://api.acaps.org/api/v1/crisis-profiles/',
      {
        params: {
          limit: 20,
          ordering: '-updated_at',
        },
        timeout: 30000,
      }
    );

    const crises = response.data.results || [];

    for (const crisis of crises) {
      const crisisUrl = `https://www.acaps.org/en/countries/${crisis.country_slug}`;

      const existing = await prisma.event.findFirst({
        where: { source: crisisUrl },
      });

      if (!existing && crisis.country_name) {
        await prisma.event.create({
          data: {
            title: `ACAPS: ${crisis.country_name} Crisis Profile`,
            description: crisis.description?.substring(0, 1000) || `Crisis overview for ${crisis.country_name}`,
            source: crisisUrl,
            sourceType: SourceType.NGO_REPORT,
            location: crisis.country_name,
            publishedAt: new Date(crisis.updated_at || Date.now()),
          },
        });
      }
    }

    logger.info('ACAPS crisis data fetch completed');
  } catch (error) {
    logger.error('ACAPS crisis data fetch failed:', error);
  }
}

// Fetch OCHA Situation Reports from ReliefWeb
export async function fetchOCHASitReps(): Promise<void> {
  try {
    const response = await axios.get('https://api.reliefweb.int/v1/reports', {
      params: {
        appname: 'aidwatch',
        limit: 20,
        preset: 'latest',
        filter: {
          field: 'source.shortname',
          value: 'OCHA',
        },
        fields: {
          include: ['title', 'body', 'url', 'date.created', 'source.name', 'country.name'],
        },
      },
      timeout: 30000,
    });

    const reports = response.data.data || [];

    for (const report of reports) {
      const existing = await prisma.event.findFirst({
        where: { source: report.fields.url },
      });

      if (!existing) {
        await prisma.event.create({
          data: {
            title: `OCHA SitRep: ${report.fields.title}`,
            description: report.fields.body?.substring(0, 1000) || '',
            source: report.fields.url,
            sourceType: SourceType.UN_REPORT,
            location: report.fields.country?.[0]?.name,
            publishedAt: new Date(report.fields.date.created),
          },
        });
      }
    }

    logger.info('OCHA SitReps fetch completed');
  } catch (error) {
    logger.error('OCHA SitReps fetch failed:', error);
  }
}

// Main ingestion function to be called by job scheduler
export async function runDataIngestion(): Promise<void> {
  logger.info('Starting data ingestion...');

  await Promise.allSettled([
    fetchNewsAPI(),
    fetchGDELT(),
    fetchReliefWeb(),
    fetchUSGSEarthquakes(),
    fetchWHOOutbreaks(),
    fetchHDXDatasets(),
    fetchACAPSCrisis(),
    fetchOCHASitReps(),
  ]);

  logger.info('Data ingestion completed');
}

// Get ingestion status
export async function getIngestionStats(): Promise<{
  totalEvents: number;
  bySource: Record<string, number>;
  last24h: number;
  unanalyzed: number;
}> {
  const [totalEvents, bySource, last24h, unanalyzed] = await Promise.all([
    prisma.event.count(),
    prisma.event.groupBy({
      by: ['sourceType'],
      _count: { id: true },
    }),
    prisma.event.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.event.count({
      where: { crisisId: null },
    }),
  ]);

  return {
    totalEvents,
    bySource: Object.fromEntries(bySource.map(s => [s.sourceType, s._count.id])),
    last24h,
    unanalyzed,
  };
}
