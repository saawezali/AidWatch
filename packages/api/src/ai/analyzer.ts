import Groq from 'groq-sdk';
import { logger } from '../lib/logger';

// Lazy initialization to ensure env vars are loaded
let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

// Using Llama 3.3 70B - the latest available model on Groq
const MODEL = 'llama-3.3-70b-versatile';

export interface AnalysisResult {
  isRelevantCrisis: boolean; // True only for actual humanitarian crises or natural disasters
  crisisType: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  confidence: number;
  summary: string;
  entities: {
    locations: string[];
    organizations: string[];
    keywords: string[];
  };
  sentiment: number;
  recommendations: string[];
}

export async function analyzeContent(content: string): Promise<AnalysisResult> {
  try {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const prompt = `You are an expert humanitarian crisis analyst for AidWatch, an early warning system for NGOs and humanitarian responders.

TODAY'S DATE: ${currentDate}

IMPORTANT: AidWatch tracks ONLY ACTIVE, CURRENT emergencies happening NOW or in the past 7 days:
- Natural disasters CURRENTLY HAPPENING (earthquakes, floods, hurricanes, wildfires, droughts, tsunamis, volcanic eruptions)
- Active humanitarian crises (famines, refugee crises, mass displacement, disease outbreaks/epidemics)
- Ongoing armed conflicts affecting civilian populations RIGHT NOW
- Infrastructure failures causing immediate humanitarian emergencies

ABSOLUTELY DO NOT classify as relevant (set isRelevantCrisis to FALSE):
- ANY event that occurred more than 7 days ago (check dates mentioned in the content)
- Crime news, court cases, trials, criminal investigations, shootings, murders, terrorism trials
- Historical events, anniversaries of past disasters, memorials, commemorations
- Articles discussing past disasters in retrospect (e.g., "2024 earthquake", "last year's flood")
- General political news, elections, policy debates, legislation
- Economic news, stock markets, business updates, company news
- Sports, entertainment, celebrity news
- Technology announcements, product launches
- Routine government activities, diplomatic meetings
- Opinion pieces, editorials, analysis articles
- Weather forecasts (unless severe warning with imminent threat)
- News about recovery, rebuilding, or aftermath of past events
          
Return a JSON object with the following structure (no markdown, just pure JSON):
{
  "isRelevantCrisis": true/false,
  "crisisType": "NATURAL_DISASTER|CONFLICT|DISEASE_OUTBREAK|FOOD_SECURITY|DISPLACEMENT|INFRASTRUCTURE|OTHER",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW|UNKNOWN",
  "confidence": 0.0-1.0,
  "summary": "Brief 2-3 sentence summary of the situation",
  "entities": {
    "locations": ["list of mentioned locations"],
    "organizations": ["list of mentioned organizations"],
    "keywords": ["key terms and phrases"]
  },
  "sentiment": -1.0 to 1.0 (negative to positive),
  "recommendations": ["actionable recommendations for responders"]
}

Set isRelevantCrisis to TRUE only if this describes an actual humanitarian crisis, natural disaster, or emergency requiring humanitarian response. Set to FALSE for general news.

Analyze this content:

${content}`;

    const chatCompletion = await getGroqClient().chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: MODEL,
      temperature: 0.3,
      max_tokens: 1024,
    });

    const text = chatCompletion.choices[0]?.message?.content || '';
    
    // Parse JSON from response (handle potential markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    return JSON.parse(jsonMatch[0]) as AnalysisResult;
  } catch (error) {
    logger.error('AI analysis failed:', error);
    throw error;
  }
}

export async function generateSummary(
  crisisTitle: string,
  events: { title: string; description: string; source: string }[],
  type: 'SITUATION' | 'TIMELINE' | 'IMPACT' | 'RESPONSE' | 'BRIEFING'
): Promise<string> {
  const prompts = {
    SITUATION: 'Provide a comprehensive situation overview covering current conditions, affected populations, and immediate concerns.',
    TIMELINE: 'Create a chronological summary of events and how the situation has developed over time.',
    IMPACT: 'Assess the humanitarian impact including affected populations, infrastructure damage, and resource needs.',
    RESPONSE: 'Recommend specific response actions, priority interventions, and resource allocation.',
    BRIEFING: 'Create an executive briefing suitable for decision-makers, highlighting key facts and required actions.',
  };

  try {
    const prompt = `You are a humanitarian crisis analyst creating actionable summaries for NGOs and responders. 
Be concise, factual, and focus on actionable information. Use bullet points where appropriate.

Crisis: ${crisisTitle}

${prompts[type]}

Based on these events:
${events.map((e, i) => `${i + 1}. [${e.source}] ${e.title}: ${e.description}`).join('\n')}`;

    const chatCompletion = await getGroqClient().chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: MODEL,
      temperature: 0.5,
      max_tokens: 2048,
    });

    return chatCompletion.choices[0]?.message?.content || '';
  } catch (error) {
    logger.error('Summary generation failed:', error);
    throw error;
  }
}

export async function detectCrisisSignals(
  headlines: string[]
): Promise<{ detected: boolean; signals: string[]; confidence: number }> {
  try {
    const prompt = `You are an early warning system detecting emerging humanitarian crises.
Analyze headlines for crisis signals. Return only valid JSON (no markdown):
{
  "detected": boolean,
  "signals": ["list of concerning patterns or indicators"],
  "confidence": 0.0-1.0
}

Analyze these headlines for emerging crisis signals:

${headlines.join('\n')}`;

    const chatCompletion = await getGroqClient().chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: MODEL,
      temperature: 0.3,
      max_tokens: 512,
    });

    const text = chatCompletion.choices[0]?.message?.content || '';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { detected: false, signals: [], confidence: 0 };
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    logger.error('Signal detection failed:', error);
    throw error;
  }
}
