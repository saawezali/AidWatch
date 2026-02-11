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

// Humanitarian-related search terms - focused on ACTIVE disasters and crises only
const CRISIS_KEYWORDS = [
  'earthquake hits',
  'flooding evacuation',
  'hurricane landfall',
  'wildfire spreads',
  'drought emergency declaration',
  'refugee crisis ongoing',
  'humanitarian emergency relief',
  'disease outbreak cases',
  'mass displacement fleeing',
  'famine hunger crisis',
  'tsunami alert warning',
  'volcanic eruption evacuate',
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
    // GDELT Doc API - search for ACTIVE humanitarian emergencies and disasters only
    const query = '(earthquake OR flood OR hurricane OR wildfire OR tsunami OR famine) AND (hits OR strikes OR victims OR evacuation OR emergency OR relief OR killed OR injured OR displaced)';
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=30&format=json&sourcelang=english`;

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

// ============================================
// SATELLITE & REMOTE SENSING DATA SOURCES
// ============================================

// Fetch NASA EONET (Earth Observatory Natural Event Tracker) - Real-time natural events
export async function fetchNASAEONET(): Promise<void> {
  try {
    // Get events from the last 30 days
    const response = await axios.get(
      'https://eonet.gsfc.nasa.gov/api/v3/events',
      {
        params: {
          status: 'open',
          limit: 50,
          days: 30,
        },
        timeout: 30000,
      }
    );

    const events = response.data.events || [];

    for (const event of events) {
      const eventUrl = event.link || `nasa-eonet-${event.id}`;
      
      const existing = await prisma.event.findFirst({
        where: { source: eventUrl },
      });

      if (!existing && event.title) {
        // Get the most recent geometry (location)
        const geometry = event.geometry?.[0];
        const coordinates = geometry?.coordinates;

        await prisma.event.create({
          data: {
            title: `NASA EONET: ${event.title}`,
            description: `Category: ${event.categories?.[0]?.title || 'Unknown'}. ${event.description || ''}`.trim(),
            source: eventUrl,
            sourceType: SourceType.SATELLITE,
            latitude: coordinates?.[1],
            longitude: coordinates?.[0],
            location: event.categories?.[0]?.title,
            publishedAt: new Date(geometry?.date || Date.now()),
          },
        });
      }
    }

    logger.info(`NASA EONET fetch completed: ${events.length} events`);
  } catch (error) {
    logger.error('NASA EONET fetch failed:', error);
  }
}

// Fetch NASA FIRMS (Fire Information for Resource Management System) - Active fires
export async function fetchNASAFIRMS(): Promise<void> {
  try {
    // Get significant fire clusters from FIRMS - using VIIRS data
    // This is the free/public endpoint for recent global fire data
    const response = await axios.get(
      'https://firms.modaps.eosdis.nasa.gov/api/area/csv/VIIRS_SNPP_NRT/world/1',
      {
        timeout: 60000,
        headers: {
          'Accept': 'text/csv',
        },
      }
    );

    // Parse CSV data - only process significant clusters
    const lines = response.data.split('\n').slice(1); // Skip header
    const significantFires: Map<string, { lat: number; lon: number; count: number; brightness: number; country: string }> = new Map();

    // Aggregate fires by approximate region (0.5 degree grid)
    for (const line of lines.slice(0, 5000)) { // Limit processing
      const parts = line.split(',');
      if (parts.length < 10) continue;

      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      const brightness = parseFloat(parts[2]) || 0;
      const country = parts[6] || 'Unknown';

      // Grid key for clustering
      const gridKey = `${Math.round(lat * 2) / 2},${Math.round(lon * 2) / 2}`;
      
      const existing = significantFires.get(gridKey);
      if (existing) {
        existing.count++;
        existing.brightness = Math.max(existing.brightness, brightness);
      } else {
        significantFires.set(gridKey, { lat, lon, count: 1, brightness, country });
      }
    }

    // Only store clusters with 10+ fires (significant fire activity)
    let storedCount = 0;
    for (const [gridKey, fire] of significantFires) {
      if (fire.count < 10) continue;

      const eventUrl = `nasa-firms-${gridKey}-${new Date().toISOString().split('T')[0]}`;
      
      const existing = await prisma.event.findFirst({
        where: { source: eventUrl },
      });

      if (!existing) {
        await prisma.event.create({
          data: {
            title: `Active Fire Cluster: ${fire.country}`,
            description: `${fire.count} fire detections in area. Max brightness: ${fire.brightness.toFixed(1)}K. Location: ${fire.lat.toFixed(2)}°, ${fire.lon.toFixed(2)}°`,
            source: eventUrl,
            sourceType: SourceType.SATELLITE,
            latitude: fire.lat,
            longitude: fire.lon,
            location: fire.country,
            publishedAt: new Date(),
          },
        });
        storedCount++;
      }
    }

    logger.info(`NASA FIRMS fetch completed: ${storedCount} significant fire clusters`);
  } catch (error) {
    logger.error('NASA FIRMS fetch failed:', error);
  }
}

// Fetch Global Disaster Alert and Coordination System (GDACS) - Multi-hazard alerts
export async function fetchGDACS(): Promise<void> {
  try {
    const response = await axios.get(
      'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH',
      {
        params: {
          eventlist: 'EQ,TC,FL,VO,DR,WF', // Earthquake, Tropical Cyclone, Flood, Volcano, Drought, Wildfire
          alertlevel: 'Green;Orange;Red',
          fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        timeout: 30000,
      }
    );

    const events = response.data.features || [];

    for (const event of events) {
      const props = event.properties || {};
      const geometry = event.geometry;
      const eventUrl = props.url || `gdacs-${props.eventid}`;

      const existing = await prisma.event.findFirst({
        where: { source: eventUrl },
      });

      if (!existing && props.name) {
        // Map GDACS alert level to our severity (alertlevel available in props)
        
        await prisma.event.create({
          data: {
            title: `GDACS Alert: ${props.name}`,
            description: `Type: ${props.eventtype}. Alert Level: ${props.alertlevel}. ${props.description || ''}`.trim(),
            source: eventUrl,
            sourceType: SourceType.SATELLITE,
            latitude: geometry?.coordinates?.[1],
            longitude: geometry?.coordinates?.[0],
            location: props.country || props.name,
            publishedAt: new Date(props.fromdate || Date.now()),
          },
        });
      }
    }

    logger.info(`GDACS fetch completed: ${events.length} alerts`);
  } catch (error) {
    logger.error('GDACS fetch failed:', error);
  }
}

// Fetch Copernicus EMS (Emergency Management Service) activations
export async function fetchCopernicusEMS(): Promise<void> {
  try {
    // Copernicus EMS RSS feed for rapid mapping activations
    const response = await axios.get(
      'https://emergency.copernicus.eu/mapping/activations-rapid/feed',
      {
        timeout: 30000,
        headers: { 'Accept': 'application/xml' },
      }
    );

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
            title: `Copernicus EMS: ${title}`,
            description: description.substring(0, 1000).replace(/<[^>]*>/g, ''),
            source: link,
            sourceType: SourceType.SATELLITE,
            publishedAt: pubDate ? new Date(pubDate) : new Date(),
          },
        });
      }
    }

    logger.info('Copernicus EMS fetch completed');
  } catch (error) {
    logger.error('Copernicus EMS fetch failed:', error);
  }
}

// ============================================
// FOOD SECURITY & FAMINE DATA SOURCES
// ============================================

// Fetch FEWS NET (Famine Early Warning Systems Network) alerts
export async function fetchFEWSNET(): Promise<void> {
  try {
    const response = await axios.get(
      'https://fews.net/api/v1/reports',
      {
        params: {
          page_size: 20,
          ordering: '-created',
          report_type: 'food-security-outlook,alert,special-report',
        },
        timeout: 30000,
      }
    );

    const reports = response.data.results || [];

    for (const report of reports) {
      const reportUrl = report.url || `fewsnet-${report.id}`;

      const existing = await prisma.event.findFirst({
        where: { source: reportUrl },
      });

      if (!existing && report.title) {
        await prisma.event.create({
          data: {
            title: `FEWS NET: ${report.title}`,
            description: report.summary?.substring(0, 1000) || '',
            source: reportUrl,
            sourceType: SourceType.NGO_REPORT,
            location: report.country?.name,
            publishedAt: new Date(report.created || Date.now()),
          },
        });
      }
    }

    logger.info('FEWS NET fetch completed');
  } catch (error) {
    logger.error('FEWS NET fetch failed:', error);
  }
}

// Fetch IPC (Integrated Food Security Phase Classification) data
export async function fetchIPCData(): Promise<void> {
  try {
    const response = await axios.get(
      'https://api.ipcinfo.org/country',
      {
        timeout: 30000,
      }
    );

    const countries = response.data || [];

    for (const country of countries) {
      // Only process countries with recent analyses and high food insecurity
      if (!country.analysis_date) continue;
      
      const analysisDate = new Date(country.analysis_date);
      const daysSinceAnalysis = (Date.now() - analysisDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Only recent analyses (last 90 days)
      if (daysSinceAnalysis > 90) continue;

      const eventUrl = `ipc-${country.country_code}-${country.analysis_date}`;

      const existing = await prisma.event.findFirst({
        where: { source: eventUrl },
      });

      if (!existing && country.country_name) {
        const phase3Plus = country.phase3_plus_population || 0;
        const phase4Plus = country.phase4_plus_population || 0;

        if (phase3Plus > 100000) { // Only significant food crises
          await prisma.event.create({
            data: {
              title: `IPC Food Security: ${country.country_name}`,
              description: `${phase3Plus.toLocaleString()} people in Crisis or worse (IPC Phase 3+). ${phase4Plus.toLocaleString()} in Emergency or Famine (Phase 4+).`,
              source: eventUrl,
              sourceType: SourceType.UN_REPORT,
              location: country.country_name,
              publishedAt: analysisDate,
            },
          });
        }
      }
    }

    logger.info('IPC data fetch completed');
  } catch (error) {
    logger.error('IPC data fetch failed:', error);
  }
}

// ============================================
// CONFLICT & DISPLACEMENT DATA SOURCES
// ============================================

// Fetch UNHCR (UN Refugee Agency) operational data
export async function fetchUNHCRData(): Promise<void> {
  try {
    const response = await axios.get(
      'https://api.unhcr.org/population/v1/situations/',
      {
        params: {
          limit: 20,
          year: new Date().getFullYear(),
        },
        timeout: 30000,
      }
    );

    const situations = response.data.items || [];

    for (const situation of situations) {
      const situationUrl = situation.url || `unhcr-${situation.id}`;

      const existing = await prisma.event.findFirst({
        where: { source: situationUrl },
      });

      if (!existing && situation.name) {
        await prisma.event.create({
          data: {
            title: `UNHCR Situation: ${situation.name}`,
            description: `Refugees: ${situation.refugees?.toLocaleString() || 'N/A'}. IDPs: ${situation.idps?.toLocaleString() || 'N/A'}. ${situation.description || ''}`.trim(),
            source: situationUrl,
            sourceType: SourceType.UN_REPORT,
            location: situation.name,
            publishedAt: new Date(situation.date || Date.now()),
          },
        });
      }
    }

    logger.info('UNHCR data fetch completed');
  } catch (error) {
    logger.error('UNHCR data fetch failed:', error);
  }
}

// Fetch ACLED (Armed Conflict Location & Event Data) recent events
export async function fetchACLEDEvents(): Promise<void> {
  try {
    // ACLED requires API key but has a public preview endpoint
    const response = await axios.get(
      'https://api.acleddata.com/acled/read',
      {
        params: {
          terms: 'accept',
          limit: 50,
          event_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          event_date_where: '>=',
        },
        timeout: 30000,
      }
    );

    const events = response.data.data || [];

    for (const event of events) {
      const eventUrl = `acled-${event.data_id}`;

      const existing = await prisma.event.findFirst({
        where: { source: eventUrl },
      });

      if (!existing && event.event_type) {
        await prisma.event.create({
          data: {
            title: `ACLED: ${event.event_type} in ${event.country}`,
            description: `${event.notes || event.sub_event_type}. Location: ${event.location}. Fatalities: ${event.fatalities || 0}`,
            source: eventUrl,
            sourceType: SourceType.NGO_REPORT,
            latitude: parseFloat(event.latitude),
            longitude: parseFloat(event.longitude),
            location: `${event.location}, ${event.country}`,
            publishedAt: new Date(event.event_date || Date.now()),
          },
        });
      }
    }

    logger.info('ACLED events fetch completed');
  } catch (error) {
    logger.error('ACLED events fetch failed:', error);
  }
}

// ============================================
// WEATHER & CLIMATE DATA SOURCES
// ============================================

// Fetch severe weather alerts from Open-Meteo
export async function fetchSevereWeather(): Promise<void> {
  try {
    // High-risk regions for humanitarian crises
    const regions = [
      { name: 'Bangladesh', lat: 23.8, lon: 90.4 },
      { name: 'Philippines', lat: 12.9, lon: 122.0 },
      { name: 'Somalia', lat: 5.2, lon: 46.2 },
      { name: 'Haiti', lat: 18.9, lon: -72.3 },
      { name: 'Myanmar', lat: 21.9, lon: 96.0 },
      { name: 'Pakistan', lat: 30.4, lon: 69.3 },
      { name: 'Mozambique', lat: -18.7, lon: 35.5 },
      { name: 'Madagascar', lat: -18.8, lon: 47.5 },
    ];

    for (const region of regions) {
      const response = await axios.get(
        'https://api.open-meteo.com/v1/forecast',
        {
          params: {
            latitude: region.lat,
            longitude: region.lon,
            daily: 'precipitation_sum,temperature_2m_max,temperature_2m_min',
            timezone: 'auto',
            forecast_days: 7,
          },
          timeout: 10000,
        }
      );

      const daily = response.data.daily;
      if (!daily) continue;

      // Check for extreme conditions
      for (let i = 0; i < daily.time.length; i++) {
        const precip = daily.precipitation_sum[i] || 0;
        const tempMax = daily.temperature_2m_max[i] || 0;
        const tempMin = daily.temperature_2m_min[i] || 0;

        // Alert thresholds
        const isExtremeRain = precip > 100; // >100mm in a day
        const isExtremeHeat = tempMax > 45; // >45°C
        const isExtremeCold = tempMin < -10; // <-10°C

        if (isExtremeRain || isExtremeHeat || isExtremeCold) {
          const date = daily.time[i];
          const eventUrl = `weather-alert-${region.name}-${date}`;

          const existing = await prisma.event.findFirst({
            where: { source: eventUrl },
          });

          if (!existing) {
            let alertType = '';
            let description = '';
            
            if (isExtremeRain) {
              alertType = 'Heavy Rainfall Alert';
              description = `Expected precipitation: ${precip}mm. High flood risk.`;
            } else if (isExtremeHeat) {
              alertType = 'Extreme Heat Alert';
              description = `Expected temperature: ${tempMax}°C. Heat stress risk.`;
            } else {
              alertType = 'Extreme Cold Alert';
              description = `Expected temperature: ${tempMin}°C. Hypothermia risk.`;
            }

            await prisma.event.create({
              data: {
                title: `${alertType}: ${region.name}`,
                description: `${description} Date: ${date}`,
                source: eventUrl,
                sourceType: SourceType.SENSOR,
                latitude: region.lat,
                longitude: region.lon,
                location: region.name,
                publishedAt: new Date(date),
              },
            });
          }
        }
      }
    }

    logger.info('Severe weather alerts fetch completed');
  } catch (error) {
    logger.error('Severe weather alerts fetch failed:', error);
  }
}

// ============================================
// INFRASTRUCTURE & CONNECTIVITY DATA
// ============================================

// Fetch Internet Outage Detection data (IODA)
export async function fetchInternetOutages(): Promise<void> {
  try {
    const response = await axios.get(
      'https://api.ioda.inetintel.cc.gatech.edu/v2/alerts',
      {
        params: {
          from: Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000),
          until: Math.floor(Date.now() / 1000),
          limit: 50,
        },
        timeout: 30000,
      }
    );

    const alerts = response.data.data || [];

    for (const alert of alerts) {
      const alertUrl = `ioda-${alert.entity_code}-${alert.time}`;

      const existing = await prisma.event.findFirst({
        where: { source: alertUrl },
      });

      if (!existing && alert.entity_name) {
        await prisma.event.create({
          data: {
            title: `Internet Outage: ${alert.entity_name}`,
            description: `Significant connectivity drop detected. Level: ${alert.level}. Duration: ${alert.duration_seconds}s`,
            source: alertUrl,
            sourceType: SourceType.SENSOR,
            location: alert.entity_name,
            publishedAt: new Date(alert.time * 1000),
          },
        });
      }
    }

    logger.info('Internet outage alerts fetch completed');
  } catch (error) {
    logger.error('Internet outage alerts fetch failed:', error);
  }
}

// Main ingestion function to be called by job scheduler
export async function runDataIngestion(): Promise<void> {
  logger.info('Starting data ingestion...');

  // Phase 1: News and reports
  await Promise.allSettled([
    fetchNewsAPI(),
    fetchGDELT(),
    fetchReliefWeb(),
    fetchOCHASitReps(),
    fetchWHOOutbreaks(),
  ]);

  // Phase 2: Natural disasters and satellite data
  await Promise.allSettled([
    fetchUSGSEarthquakes(),
    fetchNASAEONET(),
    fetchNASAFIRMS(),
    fetchGDACS(),
    fetchCopernicusEMS(),
  ]);

  // Phase 3: Food security and humanitarian data
  await Promise.allSettled([
    fetchFEWSNET(),
    fetchIPCData(),
    fetchHDXDatasets(),
    fetchACAPSCrisis(),
  ]);

  // Phase 4: Conflict, displacement, and infrastructure
  await Promise.allSettled([
    fetchUNHCRData(),
    fetchACLEDEvents(),
    fetchSevereWeather(),
    fetchInternetOutages(),
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
