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

// Main ingestion function to be called by job scheduler
export async function runDataIngestion(): Promise<void> {
  logger.info('Starting data ingestion...');

  await Promise.allSettled([
    fetchNewsAPI(),
    fetchGDELT(),
    fetchReliefWeb(),
  ]);

  logger.info('Data ingestion completed');
}
