import type {
  GenerationDistributionConfig,
  GenerationModelConfig,
  GenerationMode,
  GenerationNewsContextItem,
  GenerationScopeFields,
} from './generation-contract';

export type GenerationJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'pending_review';

export interface GenerationJobRecord<TTimestamp = unknown, TBundle extends string = string> extends GenerationScopeFields {
  bundles: TBundle[];
  count: number;
  mode?: GenerationMode;
  lowLatencyMode?: boolean;
  distributionConfig?: GenerationDistributionConfig;
  requestedBy?: string;
  requestedAt?: TTimestamp;
  priority?: 'low' | 'normal' | 'high';
  description?: string;
  modelConfig?: GenerationModelConfig;
  dryRun?: boolean;
  newsContext?: GenerationNewsContextItem[];
  status: GenerationJobStatus;
  startedAt?: TTimestamp;
  updatedAt?: TTimestamp;
  completedAt?: TTimestamp;
  progress?: number;
  total?: number;
  totalCount?: number;
  completedCount?: number;
  failedCount?: number;
  executionTarget?: string;
  tokenSummary?: {
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    callCount: number;
    conceptCount?: number;
    totalDurationMs?: number;
  };
  currentBundle?: string;
  currentPhase?: string;
  currentMessage?: string;
  lastHeartbeatAt?: TTimestamp;
  eventCount?: number;
  createdScenarioIds?: string[];
  savedScenarioIds?: string[];
  failureSummary?: {
    failureCategory?: string;
    topIssueRules?: string[];
    remediationBucket?: string;
    lastErrorMessage?: string;
  };
}

export interface BuildGenerationJobRecordOptions<TTimestamp = unknown, TBundle extends string = string>
  extends Omit<GenerationJobRecord<TTimestamp, TBundle>, 'status'> {
  status?: GenerationJobStatus;
}

export function estimateExpectedScenarios(
  bundleCount: number,
  count: number,
  distributionConfig?: GenerationDistributionConfig
): number {
  if (distributionConfig?.mode === 'fixed' && distributionConfig.loopLength) {
    return bundleCount * count * Math.max(1, Math.min(3, distributionConfig.loopLength));
  }

  if (!distributionConfig || distributionConfig.mode === 'auto') {
    return bundleCount * count;
  }

  return Math.ceil(bundleCount * count * 3);
}

export function buildGenerationJobRecord<TTimestamp = unknown, TBundle extends string = string>(
  options: BuildGenerationJobRecordOptions<TTimestamp, TBundle>
): GenerationJobRecord<TTimestamp, TBundle> {
  return {
    bundles: options.bundles,
    count: options.count,
    mode: options.mode ?? 'manual',
    ...(options.lowLatencyMode ? { lowLatencyMode: true } : {}),
    distributionConfig: options.distributionConfig ?? { mode: 'auto' },
    ...(options.region ? { region: options.region } : {}),
    ...(options.regions?.length ? { regions: options.regions } : {}),
    ...(options.scopeTier ? { scopeTier: options.scopeTier } : {}),
    ...(options.scopeKey ? { scopeKey: options.scopeKey } : {}),
    ...(options.clusterId ? { clusterId: options.clusterId } : {}),
    ...(options.exclusivityReason ? { exclusivityReason: options.exclusivityReason } : {}),
    ...(options.applicable_countries?.length ? { applicable_countries: options.applicable_countries } : {}),
    ...(options.sourceKind ? { sourceKind: options.sourceKind } : {}),
    ...(options.requestedBy ? { requestedBy: options.requestedBy } : {}),
    ...(options.requestedAt ? { requestedAt: options.requestedAt } : {}),
    priority: options.priority ?? 'normal',
    ...(options.description ? { description: options.description } : {}),
    ...(options.modelConfig ? { modelConfig: options.modelConfig } : {}),
    ...(options.dryRun ? { dryRun: true } : {}),
    ...(options.newsContext?.length ? { newsContext: options.newsContext } : {}),
    status: options.status ?? 'pending',
    ...(options.startedAt ? { startedAt: options.startedAt } : {}),
    ...(options.updatedAt ? { updatedAt: options.updatedAt } : {}),
    ...(options.completedAt ? { completedAt: options.completedAt } : {}),
    ...(options.progress !== undefined ? { progress: options.progress } : {}),
    ...(options.total !== undefined ? { total: options.total } : {}),
    ...(options.totalCount !== undefined ? { totalCount: options.totalCount } : {}),
    ...(options.completedCount !== undefined ? { completedCount: options.completedCount } : {}),
    ...(options.failedCount !== undefined ? { failedCount: options.failedCount } : {}),
    ...(options.executionTarget ? { executionTarget: options.executionTarget } : {}),
    ...(options.currentBundle ? { currentBundle: options.currentBundle } : {}),
    ...(options.currentPhase ? { currentPhase: options.currentPhase } : {}),
    ...(options.currentMessage ? { currentMessage: options.currentMessage } : {}),
    ...(options.lastHeartbeatAt ? { lastHeartbeatAt: options.lastHeartbeatAt } : {}),
    eventCount: options.eventCount ?? 0,
    createdScenarioIds: options.createdScenarioIds ?? [],
    savedScenarioIds: options.savedScenarioIds ?? [],
    ...(options.failureSummary ? { failureSummary: options.failureSummary } : {}),
  };
}
