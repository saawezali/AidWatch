import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../lib/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface AnalysisResult {
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
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const prompt = `You are an expert humanitarian crisis analyst. Analyze the provided content and extract crisis-related information.
          
Return a JSON object with the following structure (no markdown, just pure JSON):
{
  "crisisType": "NATURAL_DISASTER|CONFLICT|DISEASE_OUTBREAK|FOOD_SECURITY|DISPLACEMENT|INFRASTRUCTURE|ECONOMIC|ENVIRONMENTAL|OTHER",
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

Analyze this content for humanitarian crisis indicators:

${content}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
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
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const prompt = `You are a humanitarian crisis analyst creating actionable summaries for NGOs and responders. 
Be concise, factual, and focus on actionable information. Use bullet points where appropriate.

Crisis: ${crisisTitle}

${prompts[type]}

Based on these events:
${events.map((e, i) => `${i + 1}. [${e.source}] ${e.title}: ${e.description}`).join('\n')}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    
    return response.text();
  } catch (error) {
    logger.error('Summary generation failed:', error);
    throw error;
  }
}

export async function detectCrisisSignals(
  headlines: string[]
): Promise<{ detected: boolean; signals: string[]; confidence: number }> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const prompt = `You are an early warning system detecting emerging humanitarian crises.
Analyze headlines for crisis signals. Return only valid JSON (no markdown):
{
  "detected": boolean,
  "signals": ["list of concerning patterns or indicators"],
  "confidence": 0.0-1.0
}

Analyze these headlines for emerging crisis signals:

${headlines.join('\n')}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
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
