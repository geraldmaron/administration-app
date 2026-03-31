export type PlayerActionCategory = 'diplomatic' | 'military' | 'trust_your_gut';

export type DiplomaticActionType =
  | 'trade_agreement'
  | 'impose_sanctions'
  | 'request_alliance'
  | 'expel_ambassador';

export type MilitaryActionType =
  | 'covert_ops'
  | 'special_ops'
  | 'military_strike'
  | 'nuclear_strike'
  | 'cyberattack'
  | 'naval_blockade';

export type SeverityLevel = 'low' | 'medium' | 'high';

export interface ActionResolutionRequest {
  actionCategory: PlayerActionCategory;
  actionType: string;
  targetCountryId?: string;
  severity?: SeverityLevel;
  freeFormCommand?: string;

  countryId: string;
  countryName: string;
  leaderTitle?: string;
  targetCountryName?: string;
  turn: number;
  maxTurns: number;
  phase: string;
  metrics: Record<string, number>;
  relationship?: number;
  relationshipType?: string;
  recentActions?: string[];
  governmentCategory?: string;
  playerApproach?: string;
  targetMilitaryStrength?: number;
  targetCyberCapability?: number;
  targetNuclearCapable?: boolean;
  targetGovernmentCategory?: string;
  targetGeopoliticalTags?: string[];
  targetRegion?: string;
  targetGdpTier?: 'micro' | 'small' | 'medium' | 'large' | 'major';
  targetVulnerabilities?: string[];
  comparativePower?: 'striking_up' | 'peer_conflict' | 'striking_down';
}

export interface MetricDelta {
  metricId: string;
  delta: number;
}

export interface ActionResolutionResponse {
  headline: string;
  summary: string;
  context: string;
  metricDeltas: MetricDelta[];
  relationshipDelta: number;
  targetMilitaryStrengthDelta?: number;
  targetCyberCapabilityDelta?: number;
  newsCategory: string;
  newsTags: string[];
  isAtrocity?: boolean;
}

export interface ActionResolutionResult {
  success: boolean;
  result?: ActionResolutionResponse;
  error?: string;
  fallback?: boolean;
}

export const DIPLOMATIC_DELTA_BOUNDS = {
  relationship: { min: -35, max: 20 },
  metric: { min: -10, max: 6 },
} as const;

export const MILITARY_DELTA_BOUNDS = {
  metric: { min: -50, max: 5 },
  targetMilitary: { min: -50, max: 0 },
  targetCyber: { min: -50, max: 0 },
} as const;

export const TYG_DELTA_BOUNDS = {
  metric: { min: -20, max: 5 },
  relationship: { min: -25, max: 10 },
} as const;

export const ATROCITY_DELTA_BOUNDS = {
  metric: { min: -50, max: 0 },
  relationship: { min: -50, max: 0 },
} as const;
