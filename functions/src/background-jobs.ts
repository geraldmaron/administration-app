/**
 * Background Jobs for Scenario Generation
 * 
 * Handles async scenario generation via Firestore triggers.
 * Jobs are queued by creating documents in `generation_jobs` collection.
 * 
 * Per logic.md requirements:
 * - Validates bundles against canonical bundleIds.ts (14 bundles)
 * - Respects concurrency limits for API rate limiting
 * - Tracks progress and results in Firestore
 * - Supports difficulty rating (1-5) on all generated scenarios
 */

import * as admin from 'firebase-admin';
import * as logger from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { saveScenario, getActiveBundleCount, saveWorldEvent, saveCountryWorldState, loadCountryWorldStates } from './storage';
import { generateWorldTick, buildUpdatedWorldState } from './lib/world-simulation';
import type { CountryWorldState } from './types';
import type { CountryDocument } from './types';
import { ALL_BUNDLE_IDS, isValidBundleId, STANDARD_BUNDLE_IDS, type BundleId } from './data/schemas/bundleIds';
import type { Scenario, ScenarioExclusivityReason, ScenarioScopeTier, ScenarioSourceKind } from './types';
import { validateConfig, logConfigStatus } from './lib/config-validator';
import { normalizeGenerationScopeInput } from './lib/generation-scope';
import { exceedsBundleLimitForModel, getMaxBundlesPerJob, isOllamaGeneration } from './lib/generation-models';
import { getProviderRetryTelemetry, resetProviderRetryTelemetry } from './lib/model-providers';
import { buildGenerationJobRecord, estimateExpectedScenarios, type GenerationJobRecord } from './shared/generation-job';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Concurrency Configuration for OpenAI API
 *
 * Concurrent HTTP requests are capped via semaphore in model-providers.ts
 * (OPENAI_MAX_CONCURRENT env var, default 3 in deployed functions).
 * All bundles run in parallel — each gets its own concurrent slot.
 * Rate-limit backoff is handled per-call inside model-providers.ts.
 */

/** Maximum bundles to process concurrently */
export const MAX_BUNDLE_CONCURRENCY = 5;

/** Maximum pending jobs allowed globally to prevent queue flooding */
export const MAX_PENDING_JOBS = 10;

/** Maximum scenarios per job to prevent runaway costs */
export const MAX_SCENARIOS_PER_JOB = 50;

/** Hard cap on parallel function instances processing generation jobs */
export const GENERATION_JOB_MAX_INSTANCES = 2;

/** Process a single Firestore trigger event per instance to prevent request fanout. */
export const GENERATION_JOB_TRIGGER_CONCURRENCY = 1;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenerationJobData extends GenerationJobRecord<admin.firestore.Timestamp, BundleId> {
    results?: { id: string; title: string; bundle: string; difficulty?: number; actCount?: number; isRoot?: boolean; countrySource?: string; policyVersion?: string; scopeTier?: ScenarioScopeTier; scopeKey?: string; sourceKind?: ScenarioSourceKind; fullSendProvider?: 'openai' | 'local' }[];
    errors?: { id?: string; bundle?: string; error: string }[];
    error?: string;
}

export interface CreateJobOptions {
    bundles: BundleId[] | 'all' | 'standard';
    count: number;
    runId?: string;
    runKind?: GenerationJobData['runKind'];
    runJobIndex?: number;
    runTotalJobs?: number;
    runLabel?: string;
    lowLatencyMode?: boolean;
    mode?: 'news' | 'manual' | 'blitz' | 'full_send';
    distributionConfig?: GenerationJobData['distributionConfig'];
    dryRun?: boolean;
    newsContext?: GenerationJobData['newsContext'];
    region?: string;
    regions?: string[];
    scopeTier?: ScenarioScopeTier;
    scopeKey?: string;
    clusterId?: string;
    exclusivityReason?: ScenarioExclusivityReason;
    applicable_countries?: string[];
    sourceKind?: ScenarioSourceKind;
    modelConfig?: GenerationJobData['modelConfig'];
    requestedBy?: string;
    priority?: 'low' | 'normal' | 'high';
    description?: string;
    executionTarget?: GenerationJobData['executionTarget'];
    currentPhase?: string;
    currentMessage?: string;
}

interface JobEventInput {
    level: 'info' | 'warning' | 'error' | 'success';
    code: string;
    message: string;
    bundle?: string;
    phase?: string;
    scenarioId?: string;
    data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Resolve bundle specification to array of valid bundle IDs
 */
export function resolveBundles(bundleSpec: BundleId[] | 'all' | 'standard'): BundleId[] {
    if (bundleSpec === 'all') {
        return [...ALL_BUNDLE_IDS];
    }
    if (bundleSpec === 'standard') {
        return [...STANDARD_BUNDLE_IDS];
    }
    return bundleSpec.filter((b): b is BundleId => isValidBundleId(b));
}

/**
 * Check if we've exceeded the pending job limit
 */
async function checkPendingJobLimit(db: admin.firestore.Firestore, maxPendingJobs: number = MAX_PENDING_JOBS): Promise<{ allowed: boolean; currentCount: number }> {
    const [pendingJobs, runningJobs] = await Promise.all([
        db.collection('generation_jobs')
            .where('status', '==', 'pending')
            .count()
            .get(),
        db.collection('generation_jobs')
            .where('status', '==', 'running')
            .count()
            .get(),
    ]);

    const currentCount = pendingJobs.data().count + runningJobs.data().count;
    return {
        allowed: currentCount < maxPendingJobs,
        currentCount
    };
}

async function appendJobEvent(
    jobRef: admin.firestore.DocumentReference,
    event: JobEventInput,
    heartbeat?: { currentBundle?: string; currentPhase?: string; currentMessage?: string }
): Promise<void> {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    await Promise.all([
        jobRef.collection('events').add({
            timestamp,
            level: event.level,
            code: event.code,
            message: event.message,
            ...(event.bundle ? { bundle: event.bundle } : {}),
            ...(event.phase ? { phase: event.phase } : {}),
            ...(event.scenarioId ? { scenarioId: event.scenarioId } : {}),
            ...(event.data ? { data: event.data } : {}),
        }),
        jobRef.set({
            lastHeartbeatAt: timestamp,
            eventCount: admin.firestore.FieldValue.increment(1),
            ...(heartbeat?.currentBundle !== undefined ? { currentBundle: heartbeat.currentBundle } : {}),
            ...(heartbeat?.currentPhase !== undefined ? { currentPhase: heartbeat.currentPhase } : {}),
            ...(heartbeat?.currentMessage !== undefined ? { currentMessage: heartbeat.currentMessage } : {}),
        }, { merge: true })
    ]);
}

async function updateJobHeartbeat(
    jobRef: admin.firestore.DocumentReference,
    heartbeat: { currentBundle?: string; currentPhase?: string; currentMessage?: string }
): Promise<void> {
    await jobRef.set({
        lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(heartbeat.currentBundle !== undefined ? { currentBundle: heartbeat.currentBundle } : {}),
        ...(heartbeat.currentPhase !== undefined ? { currentPhase: heartbeat.currentPhase } : {}),
        ...(heartbeat.currentMessage !== undefined ? { currentMessage: heartbeat.currentMessage } : {}),
    }, { merge: true });
}

// ---------------------------------------------------------------------------
// Firestore Trigger: Process Generation Jobs
// ---------------------------------------------------------------------------

export const onScenarioJobCreated = onDocumentCreated({
    document: "generation_jobs/{jobId}",
    timeoutSeconds: 540,
    memory: "1GiB",
    maxInstances: GENERATION_JOB_MAX_INSTANCES,
    concurrency: GENERATION_JOB_TRIGGER_CONCURRENCY,
    secrets: ["OPENAI_API_KEY"]
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const jobData = snapshot.data() as GenerationJobData;
    const jobId = event.params.jobId;
    const jobRef = snapshot.ref;

    // Atomically claim this job to prevent duplicate trigger execution.
    // Firestore triggers can fire more than once; a plain status read is racy.
    const db = admin.firestore();
    const claimed = await db.runTransaction(async (txn) => {
        const freshSnap = await txn.get(jobRef);
        const freshData = freshSnap.data();
        if (!freshData || freshData.status !== 'pending') return false;
        if (freshData.executionTarget === 'n8n' || freshData.executionTarget === 'local') return false;
        txn.update(jobRef, { status: 'claimed', claimedAt: admin.firestore.FieldValue.serverTimestamp() });
        return true;
    });

    if (!claimed) {
        logger.info(`Job ${jobId} skipped - not claimable (status: ${jobData.status}, target: ${jobData.executionTarget ?? 'cloud_function'})`);
        return;
    }

    if (isOllamaGeneration(jobData.modelConfig)) {
        const ollamaError = 'Ollama models require local execution. Route through local-gen-server instead of Cloud Functions.';
        logger.error(`Job ${jobId} failed - ${ollamaError}`);
        await snapshot.ref.update({
            status: 'failed',
            error: ollamaError,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            currentPhase: 'failed',
            currentMessage: ollamaError,
        });
        await appendJobEvent(jobRef, {
            level: 'error',
            code: 'job_invalid_execution_target',
            message: ollamaError,
        }, { currentPhase: 'failed', currentMessage: ollamaError });
        return;
    }

    const normalizedScope = normalizeGenerationScopeInput(jobData);
    if (!normalizedScope.ok) {
        logger.error(`Job ${jobId} failed - invalid scope configuration: ${normalizedScope.error}`);
        await snapshot.ref.update({
            status: 'failed',
            error: normalizedScope.error,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await appendJobEvent(jobRef, {
            level: 'error',
            code: 'job_invalid_scope',
            message: normalizedScope.error ?? 'Invalid scope configuration.',
        }, { currentPhase: 'failed', currentMessage: normalizedScope.error });
        return;
    }
    const scope = normalizedScope.value!;

    // Validate bundles
    const requestedBundles = Array.isArray(jobData.bundles) ? jobData.bundles : [];
    const validBundles = requestedBundles.filter((b): b is BundleId => isValidBundleId(b));
    
    if (validBundles.length === 0) {
        logger.error(`Job ${jobId} failed - no valid bundles`);
        await snapshot.ref.update({
            status: 'failed',
            error: `No valid bundles provided. Valid bundles: ${ALL_BUNDLE_IDS.join(', ')}`,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await appendJobEvent(jobRef, {
            level: 'error',
            code: 'job_invalid_bundles',
            message: 'No valid bundles provided.',
        }, { currentPhase: 'failed', currentMessage: 'No valid bundles provided.' });
        return;
    }

    const configValidation = validateConfig(jobData.modelConfig);
    if (!configValidation.valid) {
        logConfigStatus();
        await snapshot.ref.update({
            status: 'failed',
            error: 'Scenario generation is misconfigured. Set OPENAI_API_KEY in Firebase secrets (firebase functions:secrets:set OPENAI_API_KEY). ' + configValidation.errors.join('; '),
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await appendJobEvent(jobRef, {
            level: 'error',
            code: 'job_invalid_config',
            message: configValidation.errors.join('; '),
        }, { currentPhase: 'failed', currentMessage: 'Scenario generation is misconfigured.' });
        return;
    }

    const { generateScenarios, getGenerationConfig } = await import('./scenario-engine');
    const genConfig = await getGenerationConfig();

    // Validate count
    const count = Math.min(Math.max(1, jobData.count || 1), genConfig.max_scenarios_per_job);
    const mode = jobData.mode || 'manual';
    const distributionConfig = jobData.distributionConfig || { mode: 'auto' };
    const totalScenariosExpected = estimateExpectedScenarios(validBundles.length, count, distributionConfig);

    logger.info(`Job ${jobId} starting: ${validBundles.length} bundles, ${count} scenarios each, mode=${mode}`);

    // Update status to running
    await snapshot.ref.update({
        status: 'running',
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        progress: 0,
        total: totalScenariosExpected,
        totalCount: totalScenariosExpected,
        completedCount: 0,
        failedCount: 0,
        createdScenarioIds: [],
        savedScenarioIds: [],
        bundles: validBundles, // Store validated bundles
        executionTarget: 'cloud_function',
        currentPhase: 'starting',
        currentMessage: `Starting job across ${validBundles.length} bundles`,
        lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
        eventCount: admin.firestore.FieldValue.increment(0),
    });
    await appendJobEvent(jobRef, {
        level: 'info',
        code: 'job_started',
        message: `Job started for ${validBundles.length} bundle${validBundles.length === 1 ? '' : 's'} × ${count} scenarios.`,
        data: { count, totalScenariosExpected, mode },
    }, { currentPhase: 'starting', currentMessage: 'Job started' });

    try {
        let forceCancelled = false;
        const cancellationPoll = setInterval(async () => {
            try {
                const current = await snapshot.ref.get();
                if (current.data()?.status === 'cancelled') {
                    forceCancelled = true;
                    clearInterval(cancellationPoll);
                    logger.info(`Job ${jobId} cancellation detected — will stop after current operations`);
                }
            } catch {
                // ignore read errors during poll
            }
        }, 5000);

        let totalCompleted = 0;
        let totalFailed = 0;
        const jobTokenSummary = { inputTokens: 0, outputTokens: 0, costUsd: 0, callCount: 0, conceptCount: 0, totalDurationMs: 0 };
        const allResults: { id: string; title: string; bundle: string; difficulty?: number; actCount?: number; isRoot?: boolean; auditScore?: number; autoFixed?: boolean; countrySource?: string; policyVersion?: string; scopeTier?: ScenarioScopeTier; scopeKey?: string; sourceKind?: ScenarioSourceKind; fullSendProvider?: 'openai' | 'local' }[] = [];
        const allErrors: { id?: string; bundle?: string; error: string }[] = [];
        const savedScenarioIds: string[] = [];

        // Progress update helper - updates immediately for real-time tracking
        const updateProgress = async () => {
            const progress = Math.round(((totalCompleted + totalFailed) / totalScenariosExpected) * 100);
            try {
                await snapshot.ref.update({
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
                    progress,
                    total: totalScenariosExpected,
                    totalCount: totalScenariosExpected,
                    completedCount: totalCompleted,
                    failedCount: totalFailed,
                    createdScenarioIds: savedScenarioIds,
                    savedScenarioIds,
                    results: allResults.slice(0, 100), // Include partial results for live tracking
                    errors: allErrors.slice(0, 50) // Include partial errors for live tracking
                });
            } catch (err) {
                logger.warn('Failed to update progress:', err);
            }
        };

        resetProviderRetryTelemetry();

        // Adaptive batching configuration
        let maxBundleConcurrency = Math.min(genConfig.max_bundle_concurrency ?? 3, 5);
        let adaptiveBundleConcurrency = maxBundleConcurrency;
        let consecutiveCleanBatches = 0;

        if (mode === 'full_send') {
            const { runFullSendCoordinator } = await import('./lib/full-send-coordinator');
            await appendJobEvent(jobRef, {
                level: 'info',
                code: 'full_send_started',
                message: `Full Send: firing local + OpenAI pipelines in parallel for ${validBundles.length} bundle${validBundles.length === 1 ? '' : 's'}.`,
                data: { bundles: validBundles },
            }, { currentPhase: 'full_send', currentMessage: 'Running dual-pipeline generation' });

            const fsResult = await runFullSendCoordinator({
                jobId,
                jobRef: jobRef as any,
                validBundles,
                count,
                scope,
                distributionConfig,
                localModelConfig: jobData.modelConfig,
                newsContext: jobData.newsContext,
                maxBundleConcurrency,
                dryRun: jobData.dryRun,
                onAttemptFailed: ({ bundle, attempt, maxAttempts, score, topIssues }) => {
                    const msg = `score ${score} — ${topIssues.slice(0, 3).join('; ')}`;
                    allErrors.push({ bundle, error: `attempt ${attempt}/${maxAttempts} failed: ${msg}` });
                    void appendJobEvent(jobRef, {
                        level: 'warning',
                        code: 'generation_attempt_failed',
                        message: `Attempt ${attempt}/${maxAttempts} failed for ${bundle}: ${msg}`,
                        bundle,
                        phase: 'audit',
                        data: { attempt, maxAttempts, score, topIssues },
                    }, { currentBundle: bundle, currentPhase: 'audit', currentMessage: `Repairing ${bundle} attempt ${attempt}/${maxAttempts}` });
                    void updateProgress();
                },
            });

            jobTokenSummary.inputTokens += fsResult.localTokenSummary.inputTokens + fsResult.openaiTokenSummary.inputTokens;
            jobTokenSummary.outputTokens += fsResult.localTokenSummary.outputTokens + fsResult.openaiTokenSummary.outputTokens;
            jobTokenSummary.costUsd += fsResult.localTokenSummary.costUsd + fsResult.openaiTokenSummary.costUsd;
            jobTokenSummary.callCount += fsResult.localTokenSummary.callCount + fsResult.openaiTokenSummary.callCount;

            await appendJobEvent(jobRef, {
                level: 'info',
                code: 'full_send_merged',
                message: `Full Send merged: ${fsResult.localScenarios.length} local + ${fsResult.openaiScenarios.length} OpenAI → ${fsResult.mergedScenarios.length} unique.`,
                data: {
                    localCount: fsResult.localScenarios.length,
                    openaiCount: fsResult.openaiScenarios.length,
                    mergedCount: fsResult.mergedScenarios.length,
                    localFailed: fsResult.localFailed,
                    openaiFailed: fsResult.openaiFailed,
                },
            }, { currentPhase: 'save', currentMessage: `Saving ${fsResult.mergedScenarios.length} merged scenarios` });

            const provenance = {
                jobId,
                executionTarget: 'full_send',
                modelUsed: 'dual-pipeline',
                generatedAt: new Date().toISOString(),
            };

            for (const s of fsResult.mergedScenarios) {
                (s as any).metadata = { ...s.metadata, generationProvenance: provenance };
                const bundle = (s.metadata?.bundle ?? s.id.split(':')[0] ?? 'unknown') as BundleId;
                try {
                    if (forceCancelled) break;

                    if (jobData.dryRun) {
                        await db.collection('generation_jobs').doc(jobId)
                            .collection('pending_scenarios').doc(s.id).set(s);
                        const auditMeta = s.metadata?.auditMetadata;
                        allResults.push({
                            id: s.id,
                            title: s.title,
                            bundle,
                            difficulty: s.metadata?.difficulty,
                            actCount: s.acts?.length || 1,
                            isRoot: s.isRootScenario !== false,
                            auditScore: auditMeta?.score,
                            autoFixed: auditMeta?.autoFixed ?? false,
                            scopeTier: s.metadata?.scopeTier,
                            scopeKey: s.metadata?.scopeKey,
                            sourceKind: s.metadata?.sourceKind,
                            fullSendProvider: (s.metadata as any)?.fullSendProvider,
                        });
                        savedScenarioIds.push(s.id);
                        totalCompleted++;
                    } else {
                        const savedResult = await saveScenario(s as unknown as Scenario);
                        if (savedResult.saved) {
                            const actCount = s.acts?.length || 1;
                            const auditMeta = s.metadata?.auditMetadata;
                            const acceptanceMeta = (s.metadata as any)?.acceptanceMetadata;
                            allResults.push({
                                id: s.id,
                                title: s.title,
                                bundle,
                                difficulty: s.metadata?.difficulty,
                                actCount,
                                isRoot: s.isRootScenario !== false,
                                auditScore: auditMeta?.score,
                                autoFixed: auditMeta?.autoFixed ?? false,
                                countrySource: acceptanceMeta?.countrySource?.kind,
                                policyVersion: acceptanceMeta?.policyVersion,
                                scopeTier: s.metadata?.scopeTier,
                                scopeKey: s.metadata?.scopeKey,
                                sourceKind: s.metadata?.sourceKind,
                                fullSendProvider: (s.metadata as any)?.fullSendProvider,
                            });
                            savedScenarioIds.push(s.id);
                            totalCompleted++;
                        } else {
                            allErrors.push({ id: s.id, bundle, error: savedResult.reason || 'Save rejected' });
                            totalFailed++;
                        }
                    }
                } catch (saveErr: any) {
                    allErrors.push({ id: s.id, bundle, error: saveErr.message });
                    totalFailed++;
                }
                await updateProgress();
            }
        } else {

        // Process bundles in adaptive parallel batches — each bundle internally runs concept_concurrency
        // parallel LLM calls, so total concurrent API calls ≈ adaptiveBundleConcurrency × concept_concurrency.
        for (let batchStart = 0; batchStart < validBundles.length; batchStart += adaptiveBundleConcurrency) {
            const batchBundles: BundleId[] = validBundles.slice(batchStart, batchStart + adaptiveBundleConcurrency);
            logger.info(
                `[batch] Bundle batch ${Math.floor(batchStart / adaptiveBundleConcurrency) + 1}/${Math.ceil(validBundles.length / adaptiveBundleConcurrency)} ` +
                `with concurrency=${adaptiveBundleConcurrency}: [${batchBundles.join(', ')}]`
            );

            resetProviderRetryTelemetry();

            const batchResults = await Promise.all(batchBundles.map(async (bundle, index) => {
                const batchIndex = batchStart + index + 1;
                logger.info(`[${batchIndex}/${validBundles.length}] Processing bundle: ${bundle}`);
                await appendJobEvent(jobRef, {
                    level: 'info',
                    code: 'bundle_started',
                    message: `Processing bundle ${bundle} (${batchIndex}/${validBundles.length}).`,
                    bundle,
                    phase: 'generate',
                }, { currentBundle: bundle, currentPhase: 'generate', currentMessage: `Generating ${bundle}` });

                if (forceCancelled) {
                    logger.info(`Job ${jobId} - skipping bundle ${bundle} due to cancellation`);
                    return { bundle, scenarios: [], error: 'cancelled', skippedReason: undefined, ceilingCount: undefined };
                }

                const activeCount = await getActiveBundleCount(bundle, db);
                if (activeCount >= genConfig.max_active_scenarios_per_bundle!) {
                    logger.warn(
                        `[ceiling] Bundle ${bundle} at ceiling: ${activeCount}/${genConfig.max_active_scenarios_per_bundle} active scenarios — skipping`
                    );
                    await appendJobEvent(jobRef, {
                        level: 'warning',
                        code: 'bundle_skipped_ceiling',
                        message: `Skipped ${bundle}; active scenario ceiling reached (${activeCount}/${genConfig.max_active_scenarios_per_bundle}).`,
                        bundle,
                        phase: 'generate',
                    }, { currentBundle: bundle, currentPhase: 'generate', currentMessage: `Skipped ${bundle} at ceiling` });
                    return { bundle, scenarios: [], error: null, skippedReason: 'ceiling' as const, ceilingCount: activeCount, tokenSummary: undefined };
                }

                try {
                    const genResult = await generateScenarios({
                        mode,
                        bundle,
                        count,
                        distributionConfig,
                        ...(jobData.region ? { region: jobData.region } : {}),
                        ...(jobData.regions?.length ? { regions: jobData.regions } : {}),
                        scopeTier: scope.scopeTier,
                        scopeKey: scope.scopeKey,
                        ...(scope.clusterId ? { clusterId: scope.clusterId } : {}),
                        ...(scope.exclusivityReason ? { exclusivityReason: scope.exclusivityReason } : {}),
                        ...(scope.applicable_countries?.length ? { applicable_countries: scope.applicable_countries } : {}),
                        sourceKind: scope.sourceKind,
                        ...(jobData.newsContext?.length ? { newsContext: jobData.newsContext } : {}),
                        ...(jobData.modelConfig ? { modelConfig: jobData.modelConfig } : {}),
                        onAttemptFailed: ({ attempt, maxAttempts, score, topIssues }) => {
                            const msg = `score ${score} — ${topIssues.slice(0, 3).join('; ')}`;
                            allErrors.push({ bundle, error: `attempt ${attempt}/${maxAttempts} failed: ${msg}` });
                            void appendJobEvent(jobRef, {
                                level: 'warning',
                                code: 'generation_attempt_failed',
                                message: `Attempt ${attempt}/${maxAttempts} failed for ${bundle}: ${msg}`,
                                bundle,
                                phase: 'audit',
                                data: { attempt, maxAttempts, score, topIssues },
                            }, { currentBundle: bundle, currentPhase: 'audit', currentMessage: `Repairing ${bundle} attempt ${attempt}/${maxAttempts}` });
                            void updateProgress();
                        },
                            ...(jobData.lowLatencyMode ? { lowLatencyMode: true } : {}),
                    });

                    const scenarios = genResult.scenarios;
                    logger.info(`Bundle ${bundle}: generated ${scenarios.length} scenarios (${genResult.tokenSummary.callCount} LLM calls, ${genResult.tokenSummary.inputTokens}+${genResult.tokenSummary.outputTokens} tokens, $${genResult.tokenSummary.costUsd})`);
                    await appendJobEvent(jobRef, {
                        level: 'success',
                        code: 'bundle_generated',
                        message: `Generated ${scenarios.length} scenario${scenarios.length === 1 ? '' : 's'} for ${bundle}.`,
                        bundle,
                        phase: 'generate',
                        data: { count: scenarios.length, tokenSummary: genResult.tokenSummary },
                    }, { currentBundle: bundle, currentPhase: 'save', currentMessage: `Saving ${scenarios.length} scenario${scenarios.length === 1 ? '' : 's'} for ${bundle}` });
                    return { bundle, scenarios, error: null, skippedReason: undefined, ceilingCount: undefined, tokenSummary: genResult.tokenSummary };
                } catch (err: any) {
                    logger.error(`Failed to generate bundle ${bundle}:`, err);
                    await appendJobEvent(jobRef, {
                        level: 'error',
                        code: 'bundle_generation_failed',
                        message: `Failed to generate ${bundle}: ${err.message}`,
                        bundle,
                        phase: 'generate',
                    }, { currentBundle: bundle, currentPhase: 'generate', currentMessage: `Failed ${bundle}` });
                    return { bundle, scenarios: [], error: err.message, skippedReason: undefined, ceilingCount: undefined, tokenSummary: undefined };
                }
            }));

            // Process batch results
            for (const { bundle, scenarios, error, skippedReason, ceilingCount, tokenSummary: bundleTokens } of batchResults) {
                if (bundleTokens) {
                    jobTokenSummary.inputTokens += bundleTokens.inputTokens;
                    jobTokenSummary.outputTokens += bundleTokens.outputTokens;
                    jobTokenSummary.costUsd += bundleTokens.costUsd;
                    jobTokenSummary.callCount += bundleTokens.callCount;
                    jobTokenSummary.conceptCount += bundleTokens.conceptCount ?? 0;
                    jobTokenSummary.totalDurationMs += bundleTokens.totalDurationMs ?? 0;
                }
                if (error === 'cancelled') continue;
                if (skippedReason === 'ceiling') {
                    totalFailed += count;
                    allErrors.push({ bundle, error: `ceiling:${ceilingCount}/${genConfig.max_active_scenarios_per_bundle}` });
                    await updateProgress();
                    continue;
                }
                if (error) {
                    allErrors.push({ bundle, error });
                    totalFailed += count;
                    await updateProgress();
                    continue;
                }

                if (scenarios.length === 0) {
                    const message = `Bundle ${bundle} produced zero scenarios (concept generation or validation rejected all candidates)`;
                    allErrors.push({ bundle, error: message });
                    totalFailed += count;
                    logger.error(message);
                    await appendJobEvent(jobRef, {
                        level: 'warning',
                        code: 'bundle_zero_output',
                        message,
                        bundle,
                        phase: 'generate',
                    }, { currentBundle: bundle, currentPhase: 'generate', currentMessage: message });
                    await updateProgress();
                    continue;
                }

                const provenance = {
                    jobId,
                    executionTarget: jobData.executionTarget ?? 'cloud_function',
                    modelUsed: jobData.modelConfig?.drafterModel ?? 'unknown',
                    generatedAt: new Date().toISOString(),
                };
                for (const s of scenarios) {
                    (s as any).metadata = { ...s.metadata, generationProvenance: provenance };
                    try {
                        if (forceCancelled) {
                            logger.info(`Job ${jobId} - skipping save due to cancellation`);
                            break;
                        }

                        if (jobData.dryRun) {
                            // Dry run: store in subcollection for review instead of saving to library
                            await db.collection('generation_jobs').doc(jobId)
                                .collection('pending_scenarios').doc(s.id).set(s);
                            const auditMeta = s.metadata?.auditMetadata;
                            allResults.push({
                                id: s.id,
                                title: s.title,
                                bundle,
                                difficulty: s.metadata?.difficulty,
                                actCount: s.acts?.length || 1,
                                isRoot: s.isRootScenario !== false,
                                auditScore: auditMeta?.score,
                                autoFixed: auditMeta?.autoFixed ?? false,
                                scopeTier: s.metadata?.scopeTier,
                                scopeKey: s.metadata?.scopeKey,
                                sourceKind: s.metadata?.sourceKind,
                            });
                            savedScenarioIds.push(s.id);
                            totalCompleted++;
                            logger.info(`Dry run — staged for review: ${s.id} - ${s.title}`);
                            await appendJobEvent(jobRef, {
                                level: 'success',
                                code: 'scenario_staged',
                                message: `Staged ${s.id} for review.`,
                                bundle,
                                phase: 'save',
                                scenarioId: s.id,
                            }, { currentBundle: bundle, currentPhase: 'save', currentMessage: `Staged ${s.id}` });
                        } else {
                            const savedResult = await saveScenario(s as unknown as Scenario);
                            if (savedResult.saved) {
                                const actCount = s.acts?.length || 1;
                                const isRoot = s.isRootScenario !== false;
                                const auditMeta = s.metadata?.auditMetadata;
                                const acceptanceMeta = (s.metadata as any)?.acceptanceMetadata;
                                allResults.push({
                                    id: s.id,
                                    title: s.title,
                                    bundle,
                                    difficulty: s.metadata?.difficulty,
                                    actCount,
                                    isRoot,
                                    auditScore: auditMeta?.score,
                                    autoFixed: auditMeta?.autoFixed ?? false,
                                    countrySource: acceptanceMeta?.countrySource?.kind,
                                    policyVersion: acceptanceMeta?.policyVersion,
                                    scopeTier: s.metadata?.scopeTier,
                                    scopeKey: s.metadata?.scopeKey,
                                    sourceKind: s.metadata?.sourceKind,
                                });
                                savedScenarioIds.push(s.id);
                                totalCompleted++;
                                logger.info(`Saved: ${s.id} - ${s.title} [${actCount}-act, difficulty: ${s.metadata?.difficulty || '?'}, countrySource: ${acceptanceMeta?.countrySource?.kind || 'unknown'}]`);
                                await appendJobEvent(jobRef, {
                                    level: 'success',
                                    code: 'scenario_saved',
                                    message: `Saved ${s.id} (${s.title}).`,
                                    bundle,
                                    phase: 'save',
                                    scenarioId: s.id,
                                    data: { difficulty: s.metadata?.difficulty, actCount },
                                }, { currentBundle: bundle, currentPhase: 'save', currentMessage: `Saved ${s.id}` });
                            } else {
                                allErrors.push({ id: s.id, bundle, error: savedResult.reason || 'Save rejected' });
                                totalFailed++;
                                logger.warn(`Rejected: ${s.id} - ${savedResult.reason}`);
                                await appendJobEvent(jobRef, {
                                    level: 'warning',
                                    code: 'scenario_rejected',
                                    message: `Rejected ${s.id}: ${savedResult.reason || 'Save rejected'}`,
                                    bundle,
                                    phase: 'save',
                                    scenarioId: s.id,
                                }, { currentBundle: bundle, currentPhase: 'save', currentMessage: `Rejected ${s.id}` });
                            }
                        }
                    } catch (saveErr: any) {
                        allErrors.push({ id: s.id, bundle, error: saveErr.message });
                        totalFailed++;
                        logger.error(`Save error for ${s.id}:`, saveErr);
                        await appendJobEvent(jobRef, {
                            level: 'error',
                            code: 'scenario_save_failed',
                            message: `Save failed for ${s.id}: ${saveErr.message}`,
                            bundle,
                            phase: 'save',
                            scenarioId: s.id,
                        }, { currentBundle: bundle, currentPhase: 'save', currentMessage: `Save failed for ${s.id}` });
                    }

                    await updateProgress();
                }

                await updateJobHeartbeat(jobRef, {
                    currentBundle: bundle,
                    currentPhase: 'bundle_complete',
                    currentMessage: `Finished processing ${bundle}`,
                });
            }

            // Adaptive concurrency adjustment based on rate limit telemetry
            const telemetry = getProviderRetryTelemetry();
            if (telemetry.rateLimitRetries > 0) {
                consecutiveCleanBatches = 0;
                if (adaptiveBundleConcurrency > 1) {
                    adaptiveBundleConcurrency -= 1;
                    logger.warn(
                        `[adaptive] Observed ${telemetry.rateLimitRetries} provider 429 retries in batch; ` +
                        `reducing bundle concurrency to ${adaptiveBundleConcurrency}`
                    );
                }
            } else if (adaptiveBundleConcurrency < maxBundleConcurrency) {
                consecutiveCleanBatches += 1;
                if (consecutiveCleanBatches >= 2) {
                    adaptiveBundleConcurrency += 1;
                    consecutiveCleanBatches = 0;
                    logger.info(`[adaptive] Two clean batches; increasing bundle concurrency to ${adaptiveBundleConcurrency}`);
                }
            }
        }

        } // end else (non-full_send)

        clearInterval(cancellationPoll);
        const finalTelemetry = getProviderRetryTelemetry();
        if (finalTelemetry.rateLimitRetries > 0) {
            logger.warn(`[concurrency] Observed ${finalTelemetry.rateLimitRetries} total rate-limit retries across all batches`);
        }

        // Compute audit score metrics for time-series monitoring
        const scoredResults = allResults.filter(r => typeof r.auditScore === 'number');
        const auditSummary = scoredResults.length > 0 ? {
            avgScore: Math.round((scoredResults.reduce((s, r) => s + r.auditScore!, 0) / scoredResults.length) * 10) / 10,
            minScore: Math.min(...scoredResults.map(r => r.auditScore!)),
            maxScore: Math.max(...scoredResults.map(r => r.auditScore!)),
            below70Count: scoredResults.filter(r => r.auditScore! < 70).length,
            above90Count: scoredResults.filter(r => r.auditScore! >= 90).length,
        } : null;

        const currentSnap = await snapshot.ref.get();
        if (currentSnap.data()?.status === 'cancelled') {
            await snapshot.ref.update({
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                progress: Math.round(((totalCompleted + totalFailed) / totalScenariosExpected) * 100),
                total: totalScenariosExpected,
                totalCount: totalScenariosExpected,
                completedCount: totalCompleted,
                failedCount: totalFailed,
                createdScenarioIds: savedScenarioIds,
                savedScenarioIds,
                results: allResults.slice(0, 100),
                errors: allErrors.slice(0, 50),
                rateLimitRetries: finalTelemetry.rateLimitRetries,
            });
            await appendJobEvent(jobRef, {
                level: 'warning',
                code: 'job_cancelled',
                message: `Job cancelled after ${totalCompleted} saved and ${totalFailed} failed.`,
            }, { currentPhase: 'cancelled', currentMessage: 'Job cancelled' });
            logger.info(`Job ${jobId} stopped by external cancellation: ${totalCompleted} saved`);
            return;
        }

        // Final update — dry run jobs land in 'pending_review' so the operator can accept/reject
        const finalStatus = jobData.dryRun && totalCompleted > 0
            ? 'pending_review'
            : totalCompleted > 0 ? 'completed' : 'failed';
        await snapshot.ref.update({
            status: finalStatus,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
            progress: 100,
            total: totalScenariosExpected,
            totalCount: totalScenariosExpected,
            completedCount: totalCompleted,
            failedCount: totalFailed,
            createdScenarioIds: savedScenarioIds,
            savedScenarioIds,
            results: allResults.slice(0, 100),
            errors: allErrors.slice(0, 50),
            ...(auditSummary ? { auditSummary } : {}),
            rateLimitRetries: finalTelemetry.rateLimitRetries,
            tokenSummary: {
                inputTokens: jobTokenSummary.inputTokens,
                outputTokens: jobTokenSummary.outputTokens,
                costUsd: Math.round(jobTokenSummary.costUsd * 10000) / 10000,
                callCount: jobTokenSummary.callCount,
                ...(jobTokenSummary.conceptCount > 0 ? {
                    conceptCount: jobTokenSummary.conceptCount,
                    totalDurationMs: jobTokenSummary.totalDurationMs,
                } : {}),
            },
            currentPhase: finalStatus,
            currentMessage: `Job ${finalStatus}: ${totalCompleted} saved, ${totalFailed} failed`,
        });

        await appendJobEvent(jobRef, {
            level: finalStatus === 'failed' ? 'error' : 'success',
            code: 'job_completed',
            message: `Job ${finalStatus}: ${totalCompleted} saved, ${totalFailed} failed.`,
            data: { totalCompleted, totalFailed, finalStatus },
        }, { currentPhase: finalStatus, currentMessage: `Job ${finalStatus}` });

        logger.info(`Job ${jobId} ${finalStatus}: ${totalCompleted} saved, ${totalFailed} failed`);

        if (finalStatus === 'completed' && validBundles.length > 0 && !jobData.dryRun) {
            const { exportBundle } = await import('./bundle-exporter');
            try {
                await Promise.all(validBundles.map((bundleId) => exportBundle(bundleId)));
            } catch (error) {
                logger.error('[BundleExporter] Post-job export failed:', error);
            }
        }

    } catch (error: any) {
        logger.error(`Job ${jobId} failed with exception:`, error);
        await snapshot.ref.update({
            status: 'failed',
            error: error.message,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
            currentPhase: 'failed',
            currentMessage: error.message,
        });
        await appendJobEvent(jobRef, {
            level: 'error',
            code: 'job_exception',
            message: error.message,
        }, { currentPhase: 'failed', currentMessage: error.message });
    }
});

// ---------------------------------------------------------------------------
// Public API: Create Generation Job
// ---------------------------------------------------------------------------

/**
 * Create a generation job document in Firestore.
 * The job will be picked up by the onScenarioJobCreated trigger.
 * 
 * @param db - Firestore instance
 * @param options - Job configuration
 * @returns Job ID for tracking
 * @throws Error if job limit exceeded or invalid configuration
 */
export async function createGenerationJob(
    db: admin.firestore.Firestore,
    options: CreateJobOptions
): Promise<{ jobId: string; bundles: BundleId[]; expectedScenarios: number }> {
    const { getGenerationConfig } = await import('./scenario-engine');
    const genConfig = await getGenerationConfig();

    const { allowed, currentCount } = await checkPendingJobLimit(db, genConfig.max_pending_jobs);
    if (!allowed) {
        throw new Error(`Too many active jobs (${currentCount}/${genConfig.max_pending_jobs}). Wait for existing jobs to complete.`);
    }

    // Resolve and validate bundles
    const bundles = resolveBundles(options.bundles);
    if (bundles.length === 0) {
        throw new Error(`No valid bundles specified. Valid bundles: ${ALL_BUNDLE_IDS.join(', ')}`);
    }

    if (exceedsBundleLimitForModel(bundles.length, options.modelConfig)) {
        const maxBundles = getMaxBundlesPerJob(options.modelConfig);
        throw new Error(
            `This model configuration supports at most ${maxBundles} bundle${maxBundles === 1 ? '' : 's'} per job. ` +
            `Requested ${bundles.length}. Split the request into smaller jobs.`
        );
    }

    // Validate count
    const count = Math.min(Math.max(1, options.count), genConfig.max_scenarios_per_job);
    if (count !== options.count) {
        logger.warn(`Count adjusted from ${options.count} to ${count} (max: ${genConfig.max_scenarios_per_job})`);
    }

    const jobRef = db.collection('generation_jobs').doc();
    
    const jobData: GenerationJobData = buildGenerationJobRecord<admin.firestore.Timestamp, BundleId>({
        bundles,
        count,
        runId: options.runId,
        runKind: options.runKind,
        runJobIndex: options.runJobIndex,
        runTotalJobs: options.runTotalJobs,
        runLabel: options.runLabel,
        mode: options.mode || 'manual',
        lowLatencyMode: options.lowLatencyMode,
        distributionConfig: options.distributionConfig || { mode: 'auto' },
        requestedBy: options.requestedBy || 'system',
        requestedAt: admin.firestore.Timestamp.now(),
        priority: options.priority || 'normal',
        description: options.description,
        modelConfig: options.modelConfig,
        dryRun: options.dryRun,
        newsContext: options.newsContext,
        region: options.region,
        regions: options.regions,
        scopeTier: options.scopeTier,
        scopeKey: options.scopeKey,
        clusterId: options.clusterId,
        exclusivityReason: options.exclusivityReason,
        applicable_countries: options.applicable_countries,
        sourceKind: options.sourceKind,
        status: 'pending',
        executionTarget: options.executionTarget,
        currentPhase: options.currentPhase,
        currentMessage: options.currentMessage,
        lastHeartbeatAt: admin.firestore.Timestamp.now(),
    });

    const normalizedScope = normalizeGenerationScopeInput(jobData);
    if (!normalizedScope.ok) {
        throw new Error(normalizedScope.error);
    }
    const scope = normalizedScope.value!;

    jobData.scopeTier = scope.scopeTier;
    jobData.scopeKey = scope.scopeKey;
    if (scope.clusterId !== undefined) {
        jobData.clusterId = scope.clusterId;
    } else {
        delete jobData.clusterId;
    }
    if (scope.exclusivityReason !== undefined) {
        jobData.exclusivityReason = scope.exclusivityReason;
    } else {
        delete jobData.exclusivityReason;
    }
    if (scope.applicable_countries !== undefined) {
        jobData.applicable_countries = scope.applicable_countries;
    } else {
        delete jobData.applicable_countries;
    }
    jobData.sourceKind = scope.sourceKind;
    
    await jobRef.set(jobData);
    
    logger.info(`Created job ${jobRef.id}: ${bundles.length} bundles, ${count} scenarios each`);
    
    return {
        jobId: jobRef.id,
        bundles,
        expectedScenarios: estimateExpectedScenarios(bundles.length, count, options.distributionConfig)
    };
}

/**
 * Get job status by ID
 */
export async function getJobStatus(
    db: admin.firestore.Firestore,
    jobId: string
): Promise<GenerationJobData | null> {
    const doc = await db.collection('generation_jobs').doc(jobId).get();
    return doc.exists ? (doc.data() as GenerationJobData) : null;
}

/**
 * Cancel a pending job
 */
export async function cancelJob(
    db: admin.firestore.Firestore,
    jobId: string
): Promise<boolean> {
    const docRef = db.collection('generation_jobs').doc(jobId);
    const doc = await docRef.get();
    
    if (!doc.exists) return false;
    
    const data = doc.data() as GenerationJobData;
    if (data.status !== 'pending') {
        throw new Error(`Cannot cancel job with status: ${data.status}`);
    }
    
    await docRef.update({
        status: 'cancelled',
        completedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return true;
}

// ---------------------------------------------------------------------------
// Scheduled: Zombie Job Recovery
// ---------------------------------------------------------------------------

function toMillis(ts?: admin.firestore.Timestamp): number | null {
    if (!ts) return null;
    return ts.toDate().getTime();
}


/**
 * Detects generation jobs stuck in abnormal states and marks them as failed.
 * Runs every 5 minutes. Four sweeps per invocation:
 *
 * 0. Stale-pending sweep — catches jobs stuck in 'pending' or 'claimed' whose
 *    dispatch failed or whose Firestore trigger never fired. Jobs older than
 *    `pending_staleness_minutes` (default 10) are failed.
 *
 * 1. Stale-heartbeat sweep — catches crashed workers (Cloud Function killed,
 *    n8n workflow stopped). Jobs whose updatedAt hasn't moved in
 *    `zombie_staleness_minutes` (default 5, configurable via world_state/generation_config) are finalized.
 *
 * 2. Loop-failure sweep — catches n8n jobs alive but spinning on failures.
 *    Jobs running > `loop_failure_min_runtime_minutes` with failure rate above
 *    `loop_failure_rate_threshold` and at least `loop_failure_min_attempts`
 *    total attempts are terminated.
 *
 * Thresholds are read from world_state/generation_config; safe defaults apply
 * when the fields are absent so no redeploy is needed to tune them.
 */
export const recoverZombieJobs = onSchedule({
    schedule: 'every 5 minutes',
    timeoutSeconds: 60,
    memory: '256MiB',
}, async () => {
    try {
        const db = admin.firestore();

        await db.doc('world_state/zombie_sweeper_health').set({
            lastRunStarted: admin.firestore.FieldValue.serverTimestamp(),
            status: 'running',
        }, { merge: true });

        // --- Read configurable thresholds ---
        const configSnap = await db.doc('world_state/generation_config').get();
        const configData = configSnap.data() ?? {};
        const zombieStalenessMinutes: number = configData.zombie_staleness_minutes ?? 5;
        const loopFailureMinRuntimeMinutes: number = configData.loop_failure_min_runtime_minutes ?? 15;
        const loopFailureMinAttempts: number = configData.loop_failure_min_attempts ?? 15;
        const loopFailureRateThreshold: number = configData.loop_failure_rate_threshold ?? 0.90;
        const pendingStalenessMinutes: number = configData.pending_staleness_minutes ?? 10;

        // -------------------------------------------------------------------------
        // Sweep 0: Stale pending/claimed jobs (dispatch failed, trigger didn't fire,
        // or claim transaction stalled). These jobs never reached 'running' so the
        // other sweeps (which query status == 'running') cannot catch them.
        // -------------------------------------------------------------------------
        const pendingCutoff = new Date(Date.now() - pendingStalenessMinutes * 60 * 1000);
        const pendingCutoffTs = admin.firestore.Timestamp.fromDate(pendingCutoff);

        const stalePending = await db.collection('generation_jobs')
            .where('status', 'in', ['pending', 'claimed'])
            .where('requestedAt', '<', pendingCutoffTs)
            .get();

        if (stalePending.docs.length > 0) {
            logger.warn(`[ZombieRecovery] Sweep 0: Found ${stalePending.docs.length} stale pending/claimed job(s) — failing`);
            const pendingBatch = db.batch();
            for (const doc of stalePending.docs) {
                const data = doc.data() as GenerationJobData;
                const target = data.executionTarget ?? 'cloud_function';
                const statusLabel = data.status ?? 'pending';
                const hint = target === 'n8n'
                    ? 'The n8n runner was never dispatched or failed to start. Check n8n connectivity and retry.'
                    : target === 'local'
                        ? 'The local generation server was never dispatched or failed to start. Check the local-gen-server and retry.'
                        : 'The Cloud Function trigger did not fire or failed to claim the job. Retry the job.';
                logger.warn(`[ZombieRecovery] Sweep 0: Failing stale ${statusLabel} job ${doc.id} (target=${target}, requestedAt=${data.requestedAt?.toDate?.()?.toISOString()})`);
                pendingBatch.update(doc.ref, {
                    status: 'failed',
                    currentPhase: 'failed',
                    currentMessage: `Job stuck in '${statusLabel}' for over ${pendingStalenessMinutes} minutes without being processed.`,
                    error: `Job stuck in '${statusLabel}' for over ${pendingStalenessMinutes} minutes. ${hint}`,
                    completedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            await pendingBatch.commit();
            logger.info(`[ZombieRecovery] Sweep 0: Failed ${stalePending.docs.length} stale pending/claimed job(s)`);
        } else {
            logger.info('[ZombieRecovery] Sweep 0: No stale pending/claimed jobs found');
        }

        // -------------------------------------------------------------------------
        // Sweep 1: Stale-heartbeat (orphaned / crashed worker)
        // -------------------------------------------------------------------------
        const cutoff = new Date(Date.now() - zombieStalenessMinutes * 60 * 1000);
        const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoff);

        const zombies = await db.collection('generation_jobs')
            .where('status', '==', 'running')
            .where('startedAt', '<', cutoffTimestamp)
            .get();

        const candidates = zombies.docs.filter((doc) => {
            const data = doc.data() as GenerationJobData;
            const startedAtMs = toMillis(data.startedAt);
            const updatedAtMs = toMillis(data.updatedAt);
            const lastHeartbeatAtMs = toMillis(data.lastHeartbeatAt);
            const heartbeat = Math.max(startedAtMs ?? 0, updatedAtMs ?? 0, lastHeartbeatAtMs ?? 0);
            return heartbeat > 0 && heartbeat < cutoff.getTime();
        });

        if (candidates.length > 0) {
            logger.warn(`[ZombieRecovery] Sweep 1: Found ${candidates.length} stale-heartbeat zombie job(s) — finalizing`);
            const batch = db.batch();
            for (const doc of candidates) {
                const data = doc.data() as GenerationJobData;
                const total = Math.max(0, Number(data.total ?? data.totalCount ?? 0));
                const completedCount = Math.max(0, Number(data.completedCount ?? 0));
                const failedCount = Math.max(0, Number(data.failedCount ?? 0));
                const partialFromResults = Array.isArray(data.results) && data.results.length > 0;
                const hasPartial = completedCount > 0 || partialFromResults;
                const remaining = total > 0 ? Math.max(0, total - completedCount - failedCount) : 0;
                const normalizedFailedCount = failedCount + remaining;
                const normalizedProgress = total > 0
                    ? Math.min(100, Math.round(((completedCount + normalizedFailedCount) / total) * 100))
                    : (hasPartial ? 100 : 0);

                if (hasPartial) {
                    logger.warn(
                        `[ZombieRecovery] Finalizing job ${doc.id} as completed with partial timeout ` +
                        `(completed=${completedCount}, failed=${normalizedFailedCount}, total=${total})`
                    );
                    batch.update(doc.ref, {
                        status: 'completed',
                        progress: normalizedProgress,
                        completedCount,
                        failedCount: normalizedFailedCount,
                        currentPhase: 'completed',
                        currentMessage: `Job timed out after partial completion: ${completedCount}/${total || completedCount} scenarios finished before the worker exceeded its execution window.`,
                        error: `Job timed out after partial completion: ${completedCount}/${total || completedCount} scenarios finished before the worker exceeded its execution window.`,
                        completedAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                } else {
                    logger.warn(`[ZombieRecovery] Marking job ${doc.id} as failed (stuck since ${data.startedAt?.toDate?.()?.toISOString()})`);
                    const timeoutHint = data.executionTarget === 'n8n'
                        ? 'The n8n workflow likely exceeded its execution time limit or lost connectivity. Retry the job.'
                        : data.executionTarget === 'local'
                            ? 'The local generation server likely stopped heartbeating or was restarted while work was in progress. Restart the local generator and retry the job.'
                        : 'The Cloud Function likely exceeded its 540s execution limit. Retry the job.';
                    batch.update(doc.ref, {
                        status: 'failed',
                        progress: normalizedProgress,
                        completedCount,
                        failedCount: normalizedFailedCount,
                        currentPhase: 'failed',
                        currentMessage: `Job timed out: no completion signal received within ${zombieStalenessMinutes} minutes.`,
                        error: `Job timed out: no completion signal received within ${zombieStalenessMinutes} minutes. ${timeoutHint}`,
                        completedAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
            }
            await batch.commit();
            logger.info(`[ZombieRecovery] Sweep 1: Finalized ${candidates.length} stale-heartbeat zombie job(s)`);
        } else {
            logger.info('[ZombieRecovery] Sweep 1: No stale-heartbeat zombies found');
        }

        // -------------------------------------------------------------------------
        // Sweep 2: Loop-failure (alive but spinning on failures — catches n8n loops)
        // -------------------------------------------------------------------------
        const loopCutoff = new Date(Date.now() - loopFailureMinRuntimeMinutes * 60 * 1000);
        const loopCutoffTs = admin.firestore.Timestamp.fromDate(loopCutoff);

        const activeSnap = await db.collection('generation_jobs')
            .where('status', '==', 'running')
            .where('startedAt', '<', loopCutoffTs)
            .get();

        const loopCandidates = activeSnap.docs.filter((doc) => {
            const data = doc.data() as GenerationJobData;
            const failed = Math.max(0, Number(data.failedCount ?? 0));
            const completed = Math.max(0, Number(data.completedCount ?? 0));
            const total = failed + completed;
            if (total < loopFailureMinAttempts) return false;
            if (completed > 0) return (failed / total) >= loopFailureRateThreshold;
            return failed >= loopFailureMinAttempts;
        });

        if (loopCandidates.length > 0) {
            logger.warn(`[ZombieRecovery] Sweep 2: Found ${loopCandidates.length} loop-failure job(s) — terminating`);
            const loopBatch = db.batch();
            for (const doc of loopCandidates) {
                const data = doc.data() as GenerationJobData;
                const failed = Math.max(0, Number(data.failedCount ?? 0));
                const completed = Math.max(0, Number(data.completedCount ?? 0));
                const total = failed + completed;
                const rate = total > 0 ? Math.round((failed / total) * 100) : 100;
                logger.warn(`[ZombieRecovery] Sweep 2: Terminating loop-failure job ${doc.id}: ${failed}/${total} attempts failed (${rate}%)`);
                loopBatch.update(doc.ref, {
                    status: 'failed',
                    currentPhase: 'failed',
                    currentMessage: `Job terminated due to excessive failure rate (${rate}% failed attempts).`,
                    error: `Job terminated: excessive failure rate — ${failed}/${total} generation attempts failed (${rate}%) after ${loopFailureMinRuntimeMinutes}+ minutes with ${completed === 0 ? 'no' : 'few'} successful scenarios. Check model config and retry.`,
                    completedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            await loopBatch.commit();
            logger.info(`[ZombieRecovery] Sweep 2: Terminated ${loopCandidates.length} loop-failure job(s)`);
        } else {
            logger.info('[ZombieRecovery] Sweep 2: No loop-failure jobs found');
        }

        // -------------------------------------------------------------------------
        // Sweep 3: Health-check sweep — catches jobs that have lost their heartbeat
        // signal but were missed by Sweep 1 (e.g., job started recently but
        // immediately went silent). Uses a separate, shorter staleness window so
        // newly-started dead jobs are caught quickly without a hard runtime cap
        // that would prematurely kill healthy long-running jobs.
        //
        // A job is terminated here only if ALL activity signals (updatedAt,
        // lastHeartbeatAt) have been silent for health_check_stale_minutes. Jobs
        // that are actively heartbeating — regardless of how long they have been
        // running — are never touched.
        // -------------------------------------------------------------------------
        const healthCheckStaleMinutes: number = configData.health_check_stale_minutes ?? zombieStalenessMinutes;
        const healthCutoff = new Date(Date.now() - healthCheckStaleMinutes * 60 * 1000);
        const healthCutoffTs = admin.firestore.Timestamp.fromDate(healthCutoff);

        const healthSnap = await db.collection('generation_jobs')
            .where('status', '==', 'running')
            .where('startedAt', '<', healthCutoffTs)
            .get();

        const healthCheckFailed = healthSnap.docs.filter((doc) => {
            if (candidates.some(c => c.id === doc.id) || loopCandidates.some(c => c.id === doc.id)) {
                return false;
            }
            const data = doc.data() as GenerationJobData;
            const startedAtMs = toMillis(data.startedAt) ?? 0;
            const updatedAtMs = toMillis(data.updatedAt) ?? 0;
            const lastHeartbeatAtMs = toMillis(data.lastHeartbeatAt) ?? 0;
            const lastActivityMs = Math.max(startedAtMs, updatedAtMs, lastHeartbeatAtMs);
            return lastActivityMs > 0 && lastActivityMs < healthCutoff.getTime();
        });

        if (healthCheckFailed.length > 0) {
            logger.warn(`[ZombieRecovery] Sweep 3: Found ${healthCheckFailed.length} job(s) failing health checks (no activity for ${healthCheckStaleMinutes}m) — finalizing`);
            const healthBatch = db.batch();
            for (const doc of healthCheckFailed) {
                const data = doc.data() as GenerationJobData;
                const completed = Math.max(0, Number(data.completedCount ?? 0));
                const hasPartial = completed > 0;
                healthBatch.update(doc.ref, {
                    status: hasPartial ? 'completed' : 'failed',
                    currentPhase: hasPartial ? 'completed' : 'failed',
                    currentMessage: `Job terminated: no health signal received for ${healthCheckStaleMinutes} minutes.`,
                    error: `Job terminated: no heartbeat or progress update for ${healthCheckStaleMinutes} minutes. ${completed > 0 ? `${completed} scenario(s) saved before cutoff.` : 'No scenarios were saved.'} Check provider connectivity and retry.`,
                    completedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            await healthBatch.commit();
            logger.info(`[ZombieRecovery] Sweep 3: Finalized ${healthCheckFailed.length} health-check failed job(s)`);
        } else {
            logger.info('[ZombieRecovery] Sweep 3: All running jobs are healthy');
        }

        const recovered = candidates.length + loopCandidates.length + healthCheckFailed.length;
        await db.doc('world_state/zombie_sweeper_health').set({
            lastRunCompleted: admin.firestore.FieldValue.serverTimestamp(),
            status: 'ok',
            jobsRecovered: recovered,
        }, { merge: true });
    } catch (err) {
        logger.error('[ZombieRecovery] Uncaught error in scheduler handler:', err);
    }
});

// ---------------------------------------------------------------------------
// World Simulation Tick
// ---------------------------------------------------------------------------

export const worldSimulationTick = onSchedule({
    schedule: 'every 6 hours',
    timeoutSeconds: 120,
    memory: '256MiB',
}, async () => {
    try {
        logger.info('[WorldSim] Starting world simulation tick');

        const db = admin.firestore();
        const snap = await db.collection('countries').limit(60).get();
        if (snap.empty) {
            logger.warn('[WorldSim] No countries found in Firestore — skipping tick');
            return;
        }

        const countries = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CountryDocument));
        const seed = Date.now();
        const events = generateWorldTick(countries, 1, seed);

        // Build a map of relationship deltas from world events so country world states can reflect them
        const relDeltasByCountry = new Map<string, Array<{ countryId: string; delta: number }>>();
        const REL_DELTA_BY_SEVERITY: Record<string, number> = { low: -2, medium: -5, high: -12 };
        for (const event of events) {
            const delta = event.actionCategory === 'military'
                ? -(REL_DELTA_BY_SEVERITY[event.severity] ?? 5)
                : event.severity === 'high' ? -3 : 1;
            const actorDeltas = relDeltasByCountry.get(event.actorCountryId) ?? [];
            actorDeltas.push({ countryId: event.targetCountryId, delta });
            relDeltasByCountry.set(event.actorCountryId, actorDeltas);
            const targetDeltas = relDeltasByCountry.get(event.targetCountryId) ?? [];
            targetDeltas.push({ countryId: event.actorCountryId, delta });
            relDeltasByCountry.set(event.targetCountryId, targetDeltas);
        }

        // Load existing world states, apply drift, and save
        const existingStates = await loadCountryWorldStates(countries.map(c => c.id), db);
        const updatedStates: CountryWorldState[] = countries.map(country => {
            const existing = existingStates.get(country.id) ?? null;
            const relDeltas = relDeltasByCountry.get(country.id) ?? [];
            return buildUpdatedWorldState(country, existing, relDeltas);
        });

        await Promise.all([
            ...events.map((event) => saveWorldEvent(event)),
            ...updatedStates.map((state) => saveCountryWorldState(state, db)),
        ]);

        const breakingCount = events.filter((e) => e.isBreakingNews).length;
        logger.info(`[WorldSim] Saved ${events.length} world events (${breakingCount} breaking), updated ${updatedStates.length} country world states`);
    } catch (err) {
        logger.error('[WorldSim] Uncaught error in world simulation tick:', err);
    }
});
