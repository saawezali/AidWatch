import { GoogleGenAI, Type } from "@google/genai";
import { CrisisSignal, ActionPlan, Severity, CrisisType } from "../types";

const getAI = () => {
    // IMPORTANT: In a real app, this should be handled securely.
    // Assuming process.env.API_KEY is available as per instructions.
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Simulates scanning public data by asking Gemini to generate realistic
 * potential crisis signals based on real-world patterns.
 */
export const scanPublicSignals = async (): Promise<CrisisSignal[]> => {
  const ai = getAI();
  
  // Using Flash for fast generation/structuring of multiple signals
  const model = "gemini-3-flash-preview"; 

  const prompt = `
    Generate 3 to 5 distinct, realistic, and hypothetical "raw public data signals" that might indicate an emerging humanitarian crisis or infrastructure failure happening right now in different parts of the world.
    Mix of news headlines, social media snippets, and official reports.
    Some should be Critical/High severity, others Medium/Low.
    Include a mix of natural disasters, conflicts, or disease outbreaks.
    
    Return the data strictly as a JSON array adhering to the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              timestamp: { type: Type.STRING, description: "ISO string, recent time" },
              sourceType: { type: Type.STRING, enum: ["NEWS", "SOCIAL", "SENSOR", "OFFICIAL"] },
              originalText: { type: Type.STRING },
              summary: { type: Type.STRING, description: "Brief 1 sentence summary" },
              severity: { type: Type.STRING, enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NOISE"] },
              type: { type: Type.STRING, enum: ["NATURAL_DISASTER", "CONFLICT", "DISEASE_OUTBREAK", "INFRASTRUCTURE_FAILURE", "DISPLACEMENT", "OTHER"] },
              location: {
                type: Type.OBJECT,
                properties: {
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER },
                  region: { type: Type.STRING },
                  country: { type: Type.STRING }
                }
              },
              affectedPopulationEstimate: { type: Type.NUMBER },
              confidenceScore: { type: Type.NUMBER, description: "0 to 100" }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");
    return data as CrisisSignal[];
  } catch (error) {
    console.error("Error scanning signals:", error);
    return [];
  }
};

/**
 * Generates a detailed action plan and deep analysis for a specific crisis signal.
 * Uses Gemini Pro with Thinking Budget for deeper reasoning.
 */
export const generateSituationReport = async (signal: CrisisSignal): Promise<ActionPlan> => {
  const ai = getAI();
  const model = "gemini-3-pro-preview";

  const prompt = `
    You are an expert humanitarian aid coordinator and risk analyst.
    Analyze the following incoming signal of a potential crisis:
    
    Signal: "${signal.originalText}"
    Location: ${signal.location.region}, ${signal.location.country}
    Type: ${signal.type}
    Severity: ${signal.severity}
    
    Provide a detailed Situation Report and Action Plan for NGOs and First Responders.
    Consider logistical constraints, political context of the region, and standard humanitarian protocols (Sphere Standards).
    
    If the signal is vague, infer likely scenarios based on the region's history.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // Enable thinking for better reasoning on logistics and risks
        thinkingConfig: { thinkingBudget: 2048 }, 
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            situationAnalysis: { type: Type.STRING, description: "Detailed analysis of what is likely happening." },
            immediateNeeds: { type: Type.ARRAY, items: { type: Type.STRING } },
            safetyRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedResponse: { type: Type.ARRAY, items: { type: Type.STRING } },
            logisticalChallenges: { type: Type.STRING },
            sources: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Potential sources to cross-check (e.g. 'UN OCHA', 'Local News')" }
          }
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return data as ActionPlan;
  } catch (error) {
    console.error("Error generating report:", error);
    throw error;
  }
};