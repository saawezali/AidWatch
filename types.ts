export enum Severity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  NOISE = 'NOISE'
}

export enum CrisisType {
  NATURAL_DISASTER = 'NATURAL_DISASTER',
  CONFLICT = 'CONFLICT',
  DISEASE_OUTBREAK = 'DISEASE_OUTBREAK',
  INFRASTRUCTURE_FAILURE = 'INFRASTRUCTURE_FAILURE',
  DISPLACEMENT = 'DISPLACEMENT',
  OTHER = 'OTHER'
}

export interface GeoLocation {
  lat: number;
  lng: number;
  region: string;
  country: string;
}

export interface CrisisSignal {
  id: string;
  timestamp: string;
  sourceType: 'NEWS' | 'SOCIAL' | 'SENSOR' | 'OFFICIAL';
  originalText: string;
  summary: string;
  severity: Severity;
  type: CrisisType;
  location: GeoLocation;
  affectedPopulationEstimate?: number;
  confidenceScore: number; // 0-100
}

export interface ActionPlan {
  situationAnalysis: string;
  immediateNeeds: string[];
  safetyRisks: string[];
  recommendedResponse: string[];
  logisticalChallenges: string;
  sources: string[];
}