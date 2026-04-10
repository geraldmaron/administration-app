export interface EvidenceMetrics {
  stageAccuracy: number;
  sampleSize: number;
  topIssues: string[];
}

export interface RecommendationItem {
  id: string;
  pipelineStage: 'architect' | 'drafter' | 'repair';
  targetSection: string;
  reason: string;
  currentExcerpt: string;
  suggestedChange: string;
  evidenceMetrics: EvidenceMetrics;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface GaiaRunPromptRecommendations {
  architect: RecommendationItem[];
  drafter: RecommendationItem[];
  repair: RecommendationItem[];
  summary: string;
}

export interface ScenarioResult {
  id: string;
  type: 'sampled' | 'generated';
  title: string;
  descriptionSnippet: string;
  auditScore: number;
  issueCount: number;
  issueTypes: string[];
  unresolvedTokens: number;
  verbiageFlagged: boolean;
  repaired: boolean;
}

export interface LogEntry {
  ts: number;
  msg: string;
  level: 'info' | 'warn' | 'error';
}

export interface GaiaProgress {
  phase: string;
  phaseLabel: string;
  step: number;
  totalSteps: number;
  detail: string;
  scenariosAudited: number;
  scenariosTotal: number;
  issuesFound: number;
  topIssuesSoFar: string[];
  unresolvedTokensSoFar: number;
  verbiageFindingsSoFar: string[];
  scenarioResults: ScenarioResult[];
  log: LogEntry[];
  updatedAt: string;
}

export interface GaiaRun {
  runId: string;
  triggeredAt: string | null;
  triggeredBy: 'schedule' | 'manual';
  triggeredByUid?: string;
  sampledScenarioIds: string[];
  generatedScenarioIds: string[];
  auditSummary: {
    totalIssues: number;
    byType: Record<string, number>;
  };
  tokenResolutionSummary: {
    unresolvedCount: number;
    fallbackCount: number;
    countriesTested: number;
  };
  tokenFindings?: string[];
  verbiageFindings: string[];
  promptRecommendations: GaiaRunPromptRecommendations;
  scenarioResults: ScenarioResult[];
  status: 'queued' | 'running' | 'complete' | 'failed' | 'cancelled';
  progress?: GaiaProgress | null;
  error?: string;
}

export type PipelineStage = 'architect' | 'drafter' | 'tokenResolve' | 'audit' | 'repair';

export interface StageMetrics {
  passRate: number;
  sampleSize: number;
  topIssues: string[];
  weeklyPassRates: number[];
}

export type StageMetricsMap = Record<PipelineStage, StageMetrics>;
