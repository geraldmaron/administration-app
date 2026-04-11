import * as logger from 'firebase-functions/logger';
import type * as FirebaseFirestore from '@google-cloud/firestore';
import { generateScenarios, type GenerationRequest, type GenerationResult } from '../scenario-engine';
import { generateEmbedding, getEmbeddingText } from './semantic-dedup';
import { buildCloudFullSendModelConfig } from './generation-models';
import type { BundleId } from '../data/schemas/bundleIds';
import type { GenerationDistributionConfig, GenerationNewsContextItem, GenerationModelConfig } from '../shared/generation-contract';
import type { NormalizedGenerationScope } from '../shared/generation-contract';
import type { BundleScenario } from './audit-rules';

const FULL_SEND_DEDUP_SIMILARITY_THRESHOLD = 0.88;
const FULL_SEND_CLOUD_CONCURRENCY = parseInt(process.env.FULL_SEND_CLOUD_CONCURRENCY ?? process.env.FULL_SEND_OPENAI_CONCURRENCY ?? '6', 10);

export interface FullSendCoordinatorParams {
  jobId: string;
  jobRef: FirebaseFirestore.DocumentReference;
  validBundles: BundleId[];
  count: number;
  scope: NormalizedGenerationScope;
  distributionConfig: GenerationDistributionConfig;
  localModelConfig?: GenerationModelConfig;
  newsContext?: GenerationNewsContextItem[];
  maxBundleConcurrency: number;
  dryRun?: boolean;
  onAttemptFailed?: (info: { bundle: string; attempt: number; maxAttempts: number; score: number; topIssues: string[] }) => void;
}

export interface FullSendResult {
  localScenarios: BundleScenario[];
  cloudScenarios: BundleScenario[];
  mergedScenarios: BundleScenario[];
  localTokenSummary: GenerationResult['tokenSummary'];
  cloudTokenSummary: GenerationResult['tokenSummary'];
  localFailed: boolean;
  cloudFailed: boolean;
}

function buildBundleRequest(
  bundle: BundleId,
  params: FullSendCoordinatorParams,
  modelConfig: GenerationModelConfig | undefined,
): GenerationRequest {
  return {
    mode: 'full_send',
    bundle,
    count: params.count,
    distributionConfig: params.distributionConfig,
    ...(params.scope.regions?.length ? { regions: params.scope.regions } : {}),
    scopeTier: params.scope.scopeTier,
    scopeKey: params.scope.scopeKey,
    ...(params.scope.clusterId ? { clusterId: params.scope.clusterId } : {}),
    ...(params.scope.exclusivityReason ? { exclusivityReason: params.scope.exclusivityReason } : {}),
    ...(params.scope.applicable_countries?.length ? { applicable_countries: params.scope.applicable_countries } : {}),
    sourceKind: params.scope.sourceKind,
    ...(params.newsContext?.length ? { newsContext: params.newsContext as any } : {}),
    ...(modelConfig ? { modelConfig } : {}),
    ...(params.onAttemptFailed ? { onAttemptFailed: params.onAttemptFailed } : {}),
  };
}

async function runPipeline(
  label: 'local' | 'cloud',
  bundles: BundleId[],
  params: FullSendCoordinatorParams,
  modelConfig: GenerationModelConfig | undefined,
  concurrency: number,
): Promise<{ scenarios: BundleScenario[]; tokenSummary: GenerationResult['tokenSummary'] }> {
  const allScenarios: BundleScenario[] = [];
  const combined = { inputTokens: 0, outputTokens: 0, costUsd: 0, callCount: 0, conceptCount: 0, totalDurationMs: 0 };

  for (let i = 0; i < bundles.length; i += concurrency) {
    const batch = bundles.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((bundle) => generateScenarios(buildBundleRequest(bundle, params, modelConfig)))
    );
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const bundle = batch[j]!;
      if (result.status === 'fulfilled') {
        allScenarios.push(...result.value.scenarios);
        const ts = result.value.tokenSummary;
        combined.inputTokens += ts.inputTokens;
        combined.outputTokens += ts.outputTokens;
        combined.costUsd += ts.costUsd;
        combined.callCount += ts.callCount;
        combined.conceptCount += ts.conceptCount ?? 0;
        combined.totalDurationMs += ts.totalDurationMs ?? 0;
      } else {
        logger.warn(`[FullSend:${label}] Bundle ${bundle} failed: ${result.reason?.message ?? result.reason}`);
      }
    }
  }

  return { scenarios: allScenarios, tokenSummary: combined };
}

async function cosineSimilarity(a: number[], b: number[]): Promise<number> {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function deduplicateAcrossProviders(
  localScenarios: BundleScenario[],
  cloudScenarios: BundleScenario[],
): Promise<BundleScenario[]> {
  if (cloudScenarios.length === 0) return localScenarios;
  if (localScenarios.length === 0) return cloudScenarios;

  const localEmbeddings: Array<{ scenario: BundleScenario; embedding: number[] }> = await Promise.all(
    localScenarios.map(async (s) => ({
      scenario: s,
      embedding: await generateEmbedding(getEmbeddingText(s)).catch(() => []),
    }))
  );

  const accepted: BundleScenario[] = [...localScenarios];
  const acceptedEmbeddings: number[][] = localEmbeddings.map((e) => e.embedding);

  for (const candidate of cloudScenarios) {
    let embedding: number[];
    try {
      embedding = await generateEmbedding(getEmbeddingText(candidate));
    } catch {
      accepted.push(candidate);
      acceptedEmbeddings.push([]);
      continue;
    }

    if (embedding.length === 0) {
      accepted.push(candidate);
      acceptedEmbeddings.push([]);
      continue;
    }

    let tooSimilar = false;
    for (const existingEmbedding of acceptedEmbeddings) {
      if (existingEmbedding.length === 0) continue;
      const sim = await cosineSimilarity(embedding, existingEmbedding);
      if (sim >= FULL_SEND_DEDUP_SIMILARITY_THRESHOLD) {
        tooSimilar = true;
        break;
      }
    }

    if (!tooSimilar) {
      accepted.push(candidate);
      acceptedEmbeddings.push(embedding);
    }
  }

  return accepted.sort((a, b) => {
    const scoreA = (a as any).metadata?.auditMetadata?.score ?? 0;
    const scoreB = (b as any).metadata?.auditMetadata?.score ?? 0;
    return scoreB - scoreA;
  });
}

export async function runFullSendCoordinator(params: FullSendCoordinatorParams): Promise<FullSendResult> {
  const cloudModelConfig = buildCloudFullSendModelConfig();

  logger.info(`[FullSend] Starting dual-pipeline for job ${params.jobId}: ${params.validBundles.length} bundles`);

  const [localSettled, cloudSettled] = await Promise.allSettled([
    runPipeline('local', params.validBundles, params, params.localModelConfig, params.maxBundleConcurrency),
    runPipeline('cloud', params.validBundles, params, cloudModelConfig, FULL_SEND_CLOUD_CONCURRENCY),
  ]);

  const emptyTokenSummary = () => ({ inputTokens: 0, outputTokens: 0, costUsd: 0, callCount: 0 });

  const localResult = localSettled.status === 'fulfilled' ? localSettled.value : null;
  const cloudResult = cloudSettled.status === 'fulfilled' ? cloudSettled.value : null;

  if (localSettled.status === 'rejected') {
    logger.error(`[FullSend] Local pipeline failed: ${localSettled.reason?.message ?? localSettled.reason}`);
  }
  if (cloudSettled.status === 'rejected') {
    logger.error(`[FullSend] Cloud pipeline failed: ${cloudSettled.reason?.message ?? cloudSettled.reason}`);
  }

  const localScenarios = localResult?.scenarios ?? [];
  const cloudScenarios = (cloudResult?.scenarios ?? []).map((s) => ({
    ...s,
    metadata: { ...s.metadata, fullSendProvider: 'cloud' as const },
  }));

  logger.info(`[FullSend] Local: ${localScenarios.length} scenarios, Cloud: ${cloudScenarios.length} scenarios — deduplicating`);

  const mergedScenarios = await deduplicateAcrossProviders(localScenarios, cloudScenarios);

  logger.info(`[FullSend] Merged: ${mergedScenarios.length} unique scenarios`);

  return {
    localScenarios,
    cloudScenarios,
    mergedScenarios,
    localTokenSummary: localResult?.tokenSummary ?? emptyTokenSummary(),
    cloudTokenSummary: cloudResult?.tokenSummary ?? emptyTokenSummary(),
    localFailed: localSettled.status === 'rejected',
    cloudFailed: cloudSettled.status === 'rejected',
  };
}
