export interface ScenarioSummary {
  id: string;
  title: string;
  bundle: string | null;
  severity: string | null;
  isActive: boolean;
  createdAt: string;
  auditScore: number | null;
  region: string | null;
  tags: string[];
  difficulty: number | null;
}

export interface OptionEffect {
  targetMetricId: string;
  value: number;
  duration: number;
  probability: number;
  type?: string;
  scope?: string;
}

export interface AdvisorFeedback {
  roleId: string;
  stance: 'support' | 'oppose' | 'neutral' | 'concerned';
  feedback: string;
}

export interface Option {
  id: string;
  text: string;
  label?: string;
  effects: OptionEffect[];
  advisorFeedback?: AdvisorFeedback[];
  outcomeHeadline?: string;
  outcomeSummary?: string;
  outcomeContext?: string;
}

export interface ScenarioCondition {
  metricId: string;
  min?: number;
  max?: number;
}

export interface LegislatureRequirement {
  min_approval: number;
  chamber?: 'upper' | 'lower' | 'both';
}

export interface AuditMetadata {
  lastAudited: string;
  score: number;
  issues: string[];
  autoFixed?: boolean;
}

export interface ScenarioMetadata {
  bundle?: string;
  severity?: string;
  urgency?: string;
  difficulty?: number;
  tags?: string[];
  applicable_countries?: string[] | string;
  source?: string;
  isNeighborEvent?: boolean;
  involvedCountries?: string[];
  auditMetadata?: AuditMetadata;
  regionalBoost?: Record<string, number>;
}

export interface ScenarioDetail {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  createdAt: string;
  phase?: string;
  actIndex?: number;
  options: Option[];
  metadata?: ScenarioMetadata;
  conditions?: ScenarioCondition[];
  legislature_requirement?: LegislatureRequirement;
}

export interface AuditSummary {
  avgScore: number;
  minScore: number;
  maxScore: number;
  below70Count: number;
  above90Count: number;
}

export interface JobResult {
  id: string;
  title: string;
  bundle: string;
  auditScore?: number;
  autoFixed?: boolean;
}

export interface JobError {
  id?: string;
  bundle?: string;
  error: string;
}

export interface JobLiveActivityBundle {
  attempts: number;
  concept: number;
  blueprint: number;
  details: number;
  successes: number;
  avgAuditScore?: number;
}

export interface JobLiveActivity {
  totalAttempts: number;
  lastMetricAt?: string;
  byBundle: Record<string, JobLiveActivityBundle>;
}

export interface DistributionConfig {
  mode: 'fixed' | 'auto';
  loopLength?: 1 | 2 | 3;
}

export interface PendingScenario {
  id: string;
  title: string;
  description: string;
  bundle: string;
  difficulty?: number;
  auditScore?: number;
  options: Option[];
  metadata?: ScenarioMetadata;
  conditions?: ScenarioCondition[];
}

export interface JobSummary {
  id: string;
  status: string;
  bundles: string[];
  count: number;
  requestedAt: string;
  progress?: number;
  completedCount?: number;
  failedCount?: number;
  description?: string;
  total?: number;
  errors?: JobError[];
  auditSummary?: AuditSummary;
}

export interface JobDetail extends JobSummary {
  mode: string;
  distributionConfig: DistributionConfig;
  regions?: string[];
  region?: string;
  requestedBy?: string;
  priority: string;
  startedAt?: string;
  completedAt?: string;
  savedScenarioIds?: string[];
  results?: JobResult[];
  errors?: JobError[];
  error?: string;
  auditSummary?: AuditSummary;
  rateLimitRetries?: number;
  liveActivity?: JobLiveActivity;
  dryRun?: boolean;
  pendingScenarioCount?: number;
}

export interface CountrySummary {
  id: string;
  name: string;
  region: string;
}

export interface GenerationJobRequest {
  bundles: string[];
  count: number;
  regions?: string[];
  region?: string;
  description?: string;
  priority?: 'low' | 'normal' | 'high';
  distributionConfig?: DistributionConfig;
  dryRun?: boolean;
  modelConfig?: {
    architectModel?: string;
    drafterModel?: string;
    repairModel?: string;
    contentQualityModel?: string;
    narrativeReviewModel?: string;
    embeddingModel?: string;
  };
}
