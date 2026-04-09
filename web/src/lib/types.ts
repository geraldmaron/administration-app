import type {
  GenerationDistributionConfig,
  GenerationExecutionTarget,
  GenerationMode,
  GenerationModelConfig,
  GenerationRunKind,
  GenerationScopeFields,
  ScenarioExclusivityReason,
  ScenarioScopeTier,
  ScenarioSourceKind,
} from '@/lib/generation-contract';

export type {
  ScenarioExclusivityReason,
  ScenarioScopeTier,
  ScenarioSourceKind,
} from '@/lib/generation-contract';

export interface ScenarioSummary {
  id: string;
  title: string;
  bundle: string | null;
  severity: string | null;
  isActive: boolean;
  createdAt: string | undefined;
  updatedAt: string | null;
  auditScore: number | null;
  region: string | null;
  tags: string[];
  difficulty: number | null;
  source: string | null;
  sourceKind: string | null;
  scopeTier: string | null;
  scopeKey: string | null;
  countryCount: number | null;
  conditionCount?: number;
  tagCount: number;
  tagResolutionStatus: 'unresolved' | 'resolved' | 'manual' | null;
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

export type RelationshipRoleId =
  | 'border_rival'
  | 'adversary'
  | 'ally'
  | 'trade_partner'
  | 'partner'
  | 'rival'
  | 'regional_rival'
  | 'neutral'
  | 'neighbor'
  | 'nation';

export interface RelationshipEffect {
  relationshipId: RelationshipRoleId;
  delta: number;
  probability?: number;
}

export interface ScenarioRequirements {
  land_border_adversary?: boolean;
  formal_ally?: boolean;
  adversary?: boolean;
  trade_partner?: boolean;
  nuclear_state?: boolean;
  island_nation?: boolean;
  landlocked?: boolean;
  coastal?: boolean;
  min_power_tier?: 'superpower' | 'great_power' | 'regional_power' | 'middle_power' | 'small_state';
  cyber_capable?: boolean;
  power_projection?: boolean;
  large_military?: boolean;
  authoritarian_regime?: boolean;
  democratic_regime?: boolean;
  fragile_state?: boolean;
  has_legislature?: boolean;
  has_opposition_party?: boolean;
  has_stock_exchange?: boolean;
  has_central_bank?: boolean;
  resource_rich?: boolean;
}

export interface Option {
  id: string;
  text: string;
  label?: string;
  effects: OptionEffect[];
  relationshipEffects?: RelationshipEffect[];
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

export interface RelationshipCondition {
  relationshipId: string;
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
  requiredGeopoliticalTags?: string[];
  excludedGeopoliticalTags?: string[];
  requiredGovernmentCategories?: string[];
  excludedGovernmentCategories?: string[];
  source?: string;
  sourceKind?: string;
  theme?: string;
  scopeTier?: string;
  scopeKey?: string;
  clusterId?: string;
  exclusivityReason?: string;
  region_tags?: string[];
  isNeighborEvent?: boolean;
  involvedCountries?: string[];
  auditMetadata?: AuditMetadata;
  regionalBoost?: Record<string, number>;
  requires?: ScenarioRequirements;
  tagResolution?: TagResolutionMetadata;
  repairMetadata?: RepairMetadata;
  actorPattern?: string;
}

export interface RepairMetadata {
  lastRepairedAt: string;
  repairCount: number;
}

export type { FieldChange, RepairAnalysis, ApprovedRepair } from '@shared/scenario-repair';

export interface TagResolutionMetadata {
  status: 'unresolved' | 'resolved' | 'manual';
  method?: 'deterministic' | 'llm' | 'manual';
  resolverVersion?: number;
  resolvedAt?: string;
  resolvedTags?: string[];
  confidence?: number;
}

export interface ScenarioDetail {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  isGolden?: boolean;
  createdAt?: string;
  updatedAt?: string;
  phase?: string;
  actIndex?: number;
  chain_id?: string;
  token_map?: Record<string, string>;
  options: Option[];
  metadata?: ScenarioMetadata;
  conditions?: ScenarioCondition[];
  relationship_conditions?: RelationshipCondition[];
  legislature_requirement?: LegislatureRequirement;
  generationProvenance?: {
    jobId: string;
    executionTarget: string;
    modelUsed: string;
    generatedAt: string;
  };
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
  scopeTier?: string;
  countryCount?: number | null;
  requires?: Record<string, boolean | string>;
  tags?: string[];
}

export interface JobError {
  id?: string;
  bundle?: string;
  error: string;
}

export interface JobEvent {
  id: string;
  timestamp?: string;
  level: 'info' | 'warning' | 'error' | 'success';
  code: string;
  message: string;
  bundle?: string;
  phase?: string;
  scenarioId?: string;
  data?: Record<string, unknown>;
}

export interface JobLiveActivityBundle {
  attempts: number;
  concept: number;
  blueprint: number;
  details: number;
  successes: number;
  generatedDrafts: number;
  avgAuditScore?: number;
}

export interface JobLiveActivity {
  totalAttempts: number;
  totalGeneratedDrafts: number;
  lastMetricAt?: string;
  byBundle: Record<string, JobLiveActivityBundle>;
}

export interface DistributionConfig extends GenerationDistributionConfig {}

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
  runId?: string;
  runKind?: GenerationRunKind;
  runJobIndex?: number;
  runTotalJobs?: number;
  runLabel?: string;
  bundles: string[];
  count: number;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  progress?: number;
  completedCount?: number;
  failedCount?: number;
  description?: string;
  total?: number;
  totalCount?: number;
  errors?: JobError[];
  auditSummary?: AuditSummary;
  currentBundle?: string;
  currentPhase?: string;
  currentMessage?: string;
  lastHeartbeatAt?: string;
  executionTarget?: GenerationExecutionTarget;
  requestedBy?: string;
  modelConfig?: JobModelConfig;
  eventCount?: number;
}

export interface JobModelConfig extends GenerationModelConfig {}

export interface JobAttemptSummary {
  bundle: string;
  phase: string;
  modelUsed: string;
  success: boolean;
  auditScore?: number;
  failureReasons?: string[];
  retryCount: number;
  tokenUsage?: { input: number; output: number };
}

export interface JobFailureAnalysis {
  source: 'runner-log';
  summary: string;
  evidence: string[];
}

export interface JobIssueSummary {
  category: 'fatal' | 'audit' | 'token' | 'timeout' | 'runtime' | 'dedup' | 'cooldown';
  severity: 'error' | 'warning' | 'info';
  title: string;
  summary: string;
  count: number;
  examples: string[];
}

export interface GenerationRunSummary {
  id: string;
  kind: 'blitz' | 'manual';
  status: string;
  requestedAt?: string;
  submittedAt?: string;
  requestedBy?: string;
  totalJobs: number;
  failedJobCount?: number;
  description?: string;
  executionTarget?: GenerationExecutionTarget;
  jobIds: string[];
}

export interface GenerationRunDetail extends GenerationRunSummary {
  summary?: Record<string, unknown>;
  jobs: JobSummary[];
  mergedEvents?: Array<JobEvent & { jobId: string; jobLabel?: string }>;
  issueSummaries?: JobIssueSummary[];
}

export interface NewsContextArticle {
  title: string;
  link: string;
  snippet?: string;
  source: string;
  pubDate: string;
}

export interface JobDetail extends JobSummary {
  mode: string;
  distributionConfig: DistributionConfig;
  regions?: string[];
  region?: string;
  scopeTier?: string;
  scopeKey?: string;
  applicable_countries?: string[];
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
  currentBundle?: string;
  currentPhase?: string;
  currentMessage?: string;
  lastHeartbeatAt?: string;
  executionTarget?: GenerationExecutionTarget;
  modelConfig?: JobModelConfig;
  tokenSummary?: { inputTokens: number; outputTokens: number; costUsd: number; callCount: number; conceptCount?: number; totalDurationMs?: number };
  eventCount?: number;
  events?: JobEvent[];
  siblingJobs?: JobSummary[];
  issueSummaries?: JobIssueSummary[];
  attemptSummary?: JobAttemptSummary[];
  failureAnalysis?: JobFailureAnalysis;
  sourceKind?: string;
  newsContext?: NewsContextArticle[];
}

export interface CountrySummary {
  id: string;
  name: string;
  region: string;
}

export interface SimulationTokenUsage {
  token: string;
  raw: string;
  value: string;
  source: 'context' | 'fallback' | 'optional-empty';
}

export interface SimulationConditionCheck {
  metricId: string;
  actual: number;
  min?: number;
  max?: number;
  passed: boolean;
  detail: string;
}

export interface SimulationRelationshipConditionCheck {
  relationshipId: string;
  resolvedCountryId: string | null;
  actual: number | null;
  min?: number;
  max?: number;
  passed: boolean;
  detail: string;
}

export interface SimulationValidationCheck {
  kind: string;
  passed: boolean;
  detail: string;
}

export interface SimulationDiagnostics {
  tokenUsages: SimulationTokenUsage[];
  fallbackTokens: string[];
  unresolvedTokens: string[];
  conditionChecks: SimulationConditionCheck[];
  relationshipConditionChecks: SimulationRelationshipConditionCheck[];
  validationChecks: SimulationValidationCheck[];
}

export interface SimulationCountry {
  id: string;
  name: string;
  region: string;
  governmentCategory?: string;
  tags: string[];
}

export interface SimulationScenario extends ScenarioDetail {
  diagnostics: SimulationDiagnostics;
}

export interface SimulationFilteredScenario {
  scenario: Pick<ScenarioDetail, 'id' | 'title' | 'metadata' | 'legislature_requirement'>;
  reason: string;
  diagnostics: Pick<SimulationDiagnostics, 'conditionChecks' | 'relationshipConditionChecks' | 'validationChecks' | 'fallbackTokens' | 'unresolvedTokens'>;
}

export interface SimulationResult {
  country: SimulationCountry;
  metrics: Record<string, number>;
  context: Record<string, string>;
  totalScenarios: number;
  eligibleCount: number;
  filteredCount: number;
  eligible: SimulationScenario[];
  filtered?: SimulationFilteredScenario[];
}

export interface AnalyticsDailyPoint {
  date: string;
  totalAttempts: number;
  successRate: number;
  avgScore: number;
}

export interface AnalyticsBundleRow {
  bundle: string;
  attempts: number;
  successes: number;
  avgScore: number;
}

export interface AnalyticsRuleRow {
  rule: string;
  count: number;
}

export interface AnalyticsFailureRow {
  id: string;
  bundle: string;
  category: string;
  score: number;
  topIssue: string;
  timestamp: string;
}

export interface AnalyticsSummary {
  days: number;
  totalAttempts: number;
  totalSuccesses: number;
  successRate: number;
  avgAuditScore: number;
  topFailureCategory: string | null;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  dailyTrend: AnalyticsDailyPoint[];
  byBundle: AnalyticsBundleRow[];
  topRules: AnalyticsRuleRow[];
  recentFailures: AnalyticsFailureRow[];
}

export interface NewsArticle {
  title: string;
  link: string;
  snippet?: string;
  source: string;
  pubDate: string;
}

export interface ArticleClassification {
  articleIndex: number;
  bundle: string;
  scope: 'global' | 'regional' | 'country';
  region?: string;
  applicable_countries?: string[];
  relevance_score: number;
  rationale: string;
}

export interface GenerationJobRequest extends GenerationScopeFields {
  bundles: string[];
  count: number;
  runId?: string;
  runKind?: GenerationRunKind;
  runJobIndex?: number;
  runTotalJobs?: number;
  runLabel?: string;
  lowLatencyMode?: boolean;
  description?: string;
  priority?: 'low' | 'normal' | 'high';
  distributionConfig?: DistributionConfig;
  dryRun?: boolean;
  mode?: GenerationMode;
  newsContext?: NewsArticle[];
  modelConfig?: GenerationModelConfig;
  executionTarget?: 'cloud_function' | 'n8n' | 'local';
}
