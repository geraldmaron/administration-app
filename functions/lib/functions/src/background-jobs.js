"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.recoverZombieJobs = exports.onScenarioJobCreated = exports.GENERATION_JOB_TRIGGER_CONCURRENCY = exports.GENERATION_JOB_MAX_INSTANCES = exports.MAX_SCENARIOS_PER_JOB = exports.MAX_PENDING_JOBS = exports.MAX_BUNDLE_CONCURRENCY = void 0;
exports.resolveBundles = resolveBundles;
exports.createGenerationJob = createGenerationJob;
exports.getJobStatus = getJobStatus;
exports.cancelJob = cancelJob;
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const scenario_engine_1 = require("./scenario-engine");
const storage_1 = require("./storage");
const bundleIds_1 = require("./data/schemas/bundleIds");
const config_validator_1 = require("./lib/config-validator");
const generation_scope_1 = require("./lib/generation-scope");
const model_providers_1 = require("./lib/model-providers");
const generation_job_1 = require("../../shared/generation-job");
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
exports.MAX_BUNDLE_CONCURRENCY = 5;
/** Maximum pending jobs allowed globally to prevent queue flooding */
exports.MAX_PENDING_JOBS = 10;
/** Maximum scenarios per job to prevent runaway costs */
exports.MAX_SCENARIOS_PER_JOB = 50;
/** Hard cap on parallel function instances processing generation jobs */
exports.GENERATION_JOB_MAX_INSTANCES = 2;
/** Process a single Firestore trigger event per instance to prevent request fanout. */
exports.GENERATION_JOB_TRIGGER_CONCURRENCY = 1;
// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------
/**
 * Resolve bundle specification to array of valid bundle IDs
 */
function resolveBundles(bundleSpec) {
    if (bundleSpec === 'all') {
        return [...bundleIds_1.ALL_BUNDLE_IDS];
    }
    if (bundleSpec === 'standard') {
        return [...bundleIds_1.STANDARD_BUNDLE_IDS];
    }
    return bundleSpec.filter((b) => (0, bundleIds_1.isValidBundleId)(b));
}
/**
 * Check if we've exceeded the pending job limit
 */
async function checkPendingJobLimit(db, maxPendingJobs = exports.MAX_PENDING_JOBS) {
    const pendingJobs = await db.collection('generation_jobs')
        .where('status', '==', 'pending')
        .count()
        .get();
    const currentCount = pendingJobs.data().count;
    return {
        allowed: currentCount < maxPendingJobs,
        currentCount
    };
}
async function appendJobEvent(jobRef, event, heartbeat) {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    await Promise.all([
        jobRef.collection('events').add(Object.assign(Object.assign(Object.assign(Object.assign({ timestamp, level: event.level, code: event.code, message: event.message }, (event.bundle ? { bundle: event.bundle } : {})), (event.phase ? { phase: event.phase } : {})), (event.scenarioId ? { scenarioId: event.scenarioId } : {})), (event.data ? { data: event.data } : {}))),
        jobRef.set(Object.assign(Object.assign(Object.assign({ lastHeartbeatAt: timestamp, eventCount: admin.firestore.FieldValue.increment(1) }, ((heartbeat === null || heartbeat === void 0 ? void 0 : heartbeat.currentBundle) !== undefined ? { currentBundle: heartbeat.currentBundle } : {})), ((heartbeat === null || heartbeat === void 0 ? void 0 : heartbeat.currentPhase) !== undefined ? { currentPhase: heartbeat.currentPhase } : {})), ((heartbeat === null || heartbeat === void 0 ? void 0 : heartbeat.currentMessage) !== undefined ? { currentMessage: heartbeat.currentMessage } : {})), { merge: true })
    ]);
}
async function updateJobHeartbeat(jobRef, heartbeat) {
    await jobRef.set(Object.assign(Object.assign(Object.assign({ lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp() }, (heartbeat.currentBundle !== undefined ? { currentBundle: heartbeat.currentBundle } : {})), (heartbeat.currentPhase !== undefined ? { currentPhase: heartbeat.currentPhase } : {})), (heartbeat.currentMessage !== undefined ? { currentMessage: heartbeat.currentMessage } : {})), { merge: true });
}
// ---------------------------------------------------------------------------
// Firestore Trigger: Process Generation Jobs
// ---------------------------------------------------------------------------
exports.onScenarioJobCreated = (0, firestore_1.onDocumentCreated)({
    document: "generation_jobs/{jobId}",
    timeoutSeconds: 540,
    memory: "1GiB",
    maxInstances: exports.GENERATION_JOB_MAX_INSTANCES,
    concurrency: exports.GENERATION_JOB_TRIGGER_CONCURRENCY,
    secrets: ["OPENAI_API_KEY"]
}, async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
    const snapshot = event.data;
    if (!snapshot)
        return;
    const jobData = snapshot.data();
    const jobId = event.params.jobId;
    const jobRef = snapshot.ref;
    if (jobData.status !== 'pending') {
        logger.info(`Job ${jobId} skipped - status is ${jobData.status}`);
        return;
    }
    // Jobs with executionTarget=n8n are driven by the n8n orchestrator instead.
    // The Firestore trigger must not process them to avoid a double-execution conflict.
    if (jobData.executionTarget === 'n8n') {
        logger.info(`Job ${jobId} skipped - executionTarget is n8n; loop will be driven by n8n orchestrator`);
        return;
    }
    const normalizedScope = (0, generation_scope_1.normalizeGenerationScopeInput)(jobData);
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
            message: (_a = normalizedScope.error) !== null && _a !== void 0 ? _a : 'Invalid scope configuration.',
        }, { currentPhase: 'failed', currentMessage: normalizedScope.error });
        return;
    }
    const scope = normalizedScope.value;
    // Validate bundles
    const requestedBundles = Array.isArray(jobData.bundles) ? jobData.bundles : [];
    const validBundles = requestedBundles.filter((b) => (0, bundleIds_1.isValidBundleId)(b));
    if (validBundles.length === 0) {
        logger.error(`Job ${jobId} failed - no valid bundles`);
        await snapshot.ref.update({
            status: 'failed',
            error: `No valid bundles provided. Valid bundles: ${bundleIds_1.ALL_BUNDLE_IDS.join(', ')}`,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await appendJobEvent(jobRef, {
            level: 'error',
            code: 'job_invalid_bundles',
            message: 'No valid bundles provided.',
        }, { currentPhase: 'failed', currentMessage: 'No valid bundles provided.' });
        return;
    }
    const configValidation = (0, config_validator_1.validateConfig)(jobData.modelConfig);
    if (!configValidation.valid) {
        (0, config_validator_1.logConfigStatus)();
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
    // Fetch generation config (cached after first call)
    const genConfig = await (0, scenario_engine_1.getGenerationConfig)();
    const db = admin.firestore();
    // Validate count
    const count = Math.min(Math.max(1, jobData.count || 1), genConfig.max_scenarios_per_job);
    const mode = jobData.mode || 'manual';
    const distributionConfig = jobData.distributionConfig || { mode: 'auto' };
    const totalScenariosExpected = (0, generation_job_1.estimateExpectedScenarios)(validBundles.length, count, distributionConfig);
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
            var _a;
            try {
                const current = await snapshot.ref.get();
                if (((_a = current.data()) === null || _a === void 0 ? void 0 : _a.status) === 'cancelled') {
                    forceCancelled = true;
                    clearInterval(cancellationPoll);
                    logger.info(`Job ${jobId} cancellation detected — will stop after current operations`);
                }
            }
            catch (_b) {
                // ignore read errors during poll
            }
        }, 5000);
        let totalCompleted = 0;
        let totalFailed = 0;
        const jobTokenSummary = { inputTokens: 0, outputTokens: 0, costUsd: 0, callCount: 0 };
        const allResults = [];
        const allErrors = [];
        const savedScenarioIds = [];
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
            }
            catch (err) {
                logger.warn('Failed to update progress:', err);
            }
        };
        (0, model_providers_1.resetProviderRetryTelemetry)();
        logger.info(`Processing ${validBundles.length} bundles with adaptive batching (API concurrency capped at ${process.env.OPENAI_MAX_CONCURRENT || '3'} requests, max instances ${exports.GENERATION_JOB_MAX_INSTANCES}, trigger concurrency ${exports.GENERATION_JOB_TRIGGER_CONCURRENCY})`);
        // Adaptive batching configuration
        let maxBundleConcurrency = Math.min((_b = genConfig.max_bundle_concurrency) !== null && _b !== void 0 ? _b : 3, 5);
        let adaptiveBundleConcurrency = maxBundleConcurrency;
        let consecutiveCleanBatches = 0;
        // Process bundles in adaptive parallel batches — each bundle internally runs concept_concurrency
        // parallel LLM calls, so total concurrent API calls ≈ adaptiveBundleConcurrency × concept_concurrency.
        for (let batchStart = 0; batchStart < validBundles.length; batchStart += adaptiveBundleConcurrency) {
            const batchBundles = validBundles.slice(batchStart, batchStart + adaptiveBundleConcurrency);
            logger.info(`[batch] Bundle batch ${Math.floor(batchStart / adaptiveBundleConcurrency) + 1}/${Math.ceil(validBundles.length / adaptiveBundleConcurrency)} ` +
                `with concurrency=${adaptiveBundleConcurrency}: [${batchBundles.join(', ')}]`);
            (0, model_providers_1.resetProviderRetryTelemetry)();
            const batchResults = await Promise.all(batchBundles.map(async (bundle, index) => {
                var _a, _b, _c;
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
                const activeCount = await (0, storage_1.getActiveBundleCount)(bundle, db);
                if (activeCount >= genConfig.max_active_scenarios_per_bundle) {
                    logger.warn(`[ceiling] Bundle ${bundle} at ceiling: ${activeCount}/${genConfig.max_active_scenarios_per_bundle} active scenarios — skipping`);
                    await appendJobEvent(jobRef, {
                        level: 'warning',
                        code: 'bundle_skipped_ceiling',
                        message: `Skipped ${bundle}; active scenario ceiling reached (${activeCount}/${genConfig.max_active_scenarios_per_bundle}).`,
                        bundle,
                        phase: 'generate',
                    }, { currentBundle: bundle, currentPhase: 'generate', currentMessage: `Skipped ${bundle} at ceiling` });
                    return { bundle, scenarios: [], error: null, skippedReason: 'ceiling', ceilingCount: activeCount, tokenSummary: undefined };
                }
                try {
                    const genResult = await (0, scenario_engine_1.generateScenarios)(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ mode,
                        bundle,
                        count,
                        distributionConfig }, (jobData.region ? { region: jobData.region } : {})), (((_a = jobData.regions) === null || _a === void 0 ? void 0 : _a.length) ? { regions: jobData.regions } : {})), { scopeTier: scope.scopeTier, scopeKey: scope.scopeKey }), (scope.clusterId ? { clusterId: scope.clusterId } : {})), (scope.exclusivityReason ? { exclusivityReason: scope.exclusivityReason } : {})), (((_b = scope.applicable_countries) === null || _b === void 0 ? void 0 : _b.length) ? { applicable_countries: scope.applicable_countries } : {})), { sourceKind: scope.sourceKind }), (((_c = jobData.newsContext) === null || _c === void 0 ? void 0 : _c.length) ? { newsContext: jobData.newsContext } : {})), (jobData.modelConfig ? { modelConfig: jobData.modelConfig } : {})), { onAttemptFailed: ({ attempt, maxAttempts, score, topIssues }) => {
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
                        } }), (jobData.lowLatencyMode ? { lowLatencyMode: true } : {})));
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
                }
                catch (err) {
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
                }
                if (error === 'cancelled')
                    continue;
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
                    executionTarget: (_c = jobData.executionTarget) !== null && _c !== void 0 ? _c : 'cloud_function',
                    modelUsed: (_e = (_d = jobData.modelConfig) === null || _d === void 0 ? void 0 : _d.drafterModel) !== null && _e !== void 0 ? _e : 'gpt-4o-mini',
                    generatedAt: new Date().toISOString(),
                };
                for (const s of scenarios) {
                    s.metadata = Object.assign(Object.assign({}, s.metadata), { generationProvenance: provenance });
                    try {
                        if (forceCancelled) {
                            logger.info(`Job ${jobId} - skipping save due to cancellation`);
                            break;
                        }
                        if (jobData.dryRun) {
                            // Dry run: store in subcollection for review instead of saving to library
                            await db.collection('generation_jobs').doc(jobId)
                                .collection('pending_scenarios').doc(s.id).set(s);
                            const auditMeta = (_f = s.metadata) === null || _f === void 0 ? void 0 : _f.auditMetadata;
                            allResults.push({
                                id: s.id,
                                title: s.title,
                                bundle,
                                difficulty: (_g = s.metadata) === null || _g === void 0 ? void 0 : _g.difficulty,
                                actCount: ((_h = s.acts) === null || _h === void 0 ? void 0 : _h.length) || 1,
                                isRoot: s.isRootScenario !== false,
                                auditScore: auditMeta === null || auditMeta === void 0 ? void 0 : auditMeta.score,
                                autoFixed: (_j = auditMeta === null || auditMeta === void 0 ? void 0 : auditMeta.autoFixed) !== null && _j !== void 0 ? _j : false,
                                scopeTier: (_k = s.metadata) === null || _k === void 0 ? void 0 : _k.scopeTier,
                                scopeKey: (_l = s.metadata) === null || _l === void 0 ? void 0 : _l.scopeKey,
                                sourceKind: (_m = s.metadata) === null || _m === void 0 ? void 0 : _m.sourceKind,
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
                        }
                        else {
                            const savedResult = await (0, storage_1.saveScenario)(s);
                            if (savedResult.saved) {
                                const actCount = ((_o = s.acts) === null || _o === void 0 ? void 0 : _o.length) || 1;
                                const isRoot = s.isRootScenario !== false;
                                const auditMeta = (_p = s.metadata) === null || _p === void 0 ? void 0 : _p.auditMetadata;
                                const acceptanceMeta = (_q = s.metadata) === null || _q === void 0 ? void 0 : _q.acceptanceMetadata;
                                allResults.push({
                                    id: s.id,
                                    title: s.title,
                                    bundle,
                                    difficulty: (_r = s.metadata) === null || _r === void 0 ? void 0 : _r.difficulty,
                                    actCount,
                                    isRoot,
                                    auditScore: auditMeta === null || auditMeta === void 0 ? void 0 : auditMeta.score,
                                    autoFixed: (_s = auditMeta === null || auditMeta === void 0 ? void 0 : auditMeta.autoFixed) !== null && _s !== void 0 ? _s : false,
                                    countrySource: (_t = acceptanceMeta === null || acceptanceMeta === void 0 ? void 0 : acceptanceMeta.countrySource) === null || _t === void 0 ? void 0 : _t.kind,
                                    policyVersion: acceptanceMeta === null || acceptanceMeta === void 0 ? void 0 : acceptanceMeta.policyVersion,
                                    scopeTier: (_u = s.metadata) === null || _u === void 0 ? void 0 : _u.scopeTier,
                                    scopeKey: (_v = s.metadata) === null || _v === void 0 ? void 0 : _v.scopeKey,
                                    sourceKind: (_w = s.metadata) === null || _w === void 0 ? void 0 : _w.sourceKind,
                                });
                                savedScenarioIds.push(s.id);
                                totalCompleted++;
                                logger.info(`Saved: ${s.id} - ${s.title} [${actCount}-act, difficulty: ${((_x = s.metadata) === null || _x === void 0 ? void 0 : _x.difficulty) || '?'}, countrySource: ${((_y = acceptanceMeta === null || acceptanceMeta === void 0 ? void 0 : acceptanceMeta.countrySource) === null || _y === void 0 ? void 0 : _y.kind) || 'unknown'}]`);
                                await appendJobEvent(jobRef, {
                                    level: 'success',
                                    code: 'scenario_saved',
                                    message: `Saved ${s.id} (${s.title}).`,
                                    bundle,
                                    phase: 'save',
                                    scenarioId: s.id,
                                    data: { difficulty: (_z = s.metadata) === null || _z === void 0 ? void 0 : _z.difficulty, actCount },
                                }, { currentBundle: bundle, currentPhase: 'save', currentMessage: `Saved ${s.id}` });
                            }
                            else {
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
                    }
                    catch (saveErr) {
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
            const telemetry = (0, model_providers_1.getProviderRetryTelemetry)();
            if (telemetry.rateLimitRetries > 0) {
                consecutiveCleanBatches = 0;
                if (adaptiveBundleConcurrency > 1) {
                    adaptiveBundleConcurrency -= 1;
                    logger.warn(`[adaptive] Observed ${telemetry.rateLimitRetries} provider 429 retries in batch; ` +
                        `reducing bundle concurrency to ${adaptiveBundleConcurrency}`);
                }
            }
            else if (adaptiveBundleConcurrency < maxBundleConcurrency) {
                consecutiveCleanBatches += 1;
                if (consecutiveCleanBatches >= 2) {
                    adaptiveBundleConcurrency += 1;
                    consecutiveCleanBatches = 0;
                    logger.info(`[adaptive] Two clean batches; increasing bundle concurrency to ${adaptiveBundleConcurrency}`);
                }
            }
        }
        clearInterval(cancellationPoll);
        const finalTelemetry = (0, model_providers_1.getProviderRetryTelemetry)();
        if (finalTelemetry.rateLimitRetries > 0) {
            logger.warn(`[concurrency] Observed ${finalTelemetry.rateLimitRetries} total rate-limit retries across all batches`);
        }
        // Compute audit score metrics for time-series monitoring
        const scoredResults = allResults.filter(r => typeof r.auditScore === 'number');
        const auditSummary = scoredResults.length > 0 ? {
            avgScore: Math.round((scoredResults.reduce((s, r) => s + r.auditScore, 0) / scoredResults.length) * 10) / 10,
            minScore: Math.min(...scoredResults.map(r => r.auditScore)),
            maxScore: Math.max(...scoredResults.map(r => r.auditScore)),
            below70Count: scoredResults.filter(r => r.auditScore < 70).length,
            above90Count: scoredResults.filter(r => r.auditScore >= 90).length,
        } : null;
        const currentSnap = await snapshot.ref.get();
        if (((_0 = currentSnap.data()) === null || _0 === void 0 ? void 0 : _0.status) === 'cancelled') {
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
        await snapshot.ref.update(Object.assign(Object.assign({ status: finalStatus, completedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(), progress: 100, total: totalScenariosExpected, totalCount: totalScenariosExpected, completedCount: totalCompleted, failedCount: totalFailed, createdScenarioIds: savedScenarioIds, savedScenarioIds, results: allResults.slice(0, 100), errors: allErrors.slice(0, 50) }, (auditSummary ? { auditSummary } : {})), { rateLimitRetries: finalTelemetry.rateLimitRetries, tokenSummary: {
                inputTokens: jobTokenSummary.inputTokens,
                outputTokens: jobTokenSummary.outputTokens,
                costUsd: Math.round(jobTokenSummary.costUsd * 10000) / 10000,
                callCount: jobTokenSummary.callCount,
            }, currentPhase: finalStatus, currentMessage: `Job ${finalStatus}: ${totalCompleted} saved, ${totalFailed} failed` }));
        await appendJobEvent(jobRef, {
            level: finalStatus === 'failed' ? 'error' : 'success',
            code: 'job_completed',
            message: `Job ${finalStatus}: ${totalCompleted} saved, ${totalFailed} failed.`,
            data: { totalCompleted, totalFailed, finalStatus },
        }, { currentPhase: finalStatus, currentMessage: `Job ${finalStatus}` });
        logger.info(`Job ${jobId} ${finalStatus}: ${totalCompleted} saved, ${totalFailed} failed`);
        // Export updated bundles to Firebase Storage so clients get incremental updates.
        // Runs async — does not block the job completion response.
        if (finalStatus === 'completed' && validBundles.length > 0 && !jobData.dryRun) {
            const { exportBundle } = await Promise.resolve().then(() => __importStar(require('./bundle-exporter')));
            Promise.all(validBundles.map(b => exportBundle(b))).catch(err => logger.error('[BundleExporter] Post-job export failed:', err));
        }
    }
    catch (error) {
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
async function createGenerationJob(db, options) {
    const genConfig = await (0, scenario_engine_1.getGenerationConfig)();
    // Check pending job limit
    const { allowed, currentCount } = await checkPendingJobLimit(db, genConfig.max_pending_jobs);
    if (!allowed) {
        throw new Error(`Too many pending jobs (${currentCount}/${genConfig.max_pending_jobs}). Wait for existing jobs to complete.`);
    }
    // Resolve and validate bundles
    const bundles = resolveBundles(options.bundles);
    if (bundles.length === 0) {
        throw new Error(`No valid bundles specified. Valid bundles: ${bundleIds_1.ALL_BUNDLE_IDS.join(', ')}`);
    }
    // Validate count
    const count = Math.min(Math.max(1, options.count), genConfig.max_scenarios_per_job);
    if (count !== options.count) {
        logger.warn(`Count adjusted from ${options.count} to ${count} (max: ${genConfig.max_scenarios_per_job})`);
    }
    const jobRef = db.collection('generation_jobs').doc();
    const jobData = (0, generation_job_1.buildGenerationJobRecord)({
        bundles,
        count,
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
    const normalizedScope = (0, generation_scope_1.normalizeGenerationScopeInput)(jobData);
    if (!normalizedScope.ok) {
        throw new Error(normalizedScope.error);
    }
    const scope = normalizedScope.value;
    jobData.scopeTier = scope.scopeTier;
    jobData.scopeKey = scope.scopeKey;
    if (scope.clusterId !== undefined) {
        jobData.clusterId = scope.clusterId;
    }
    else {
        delete jobData.clusterId;
    }
    if (scope.exclusivityReason !== undefined) {
        jobData.exclusivityReason = scope.exclusivityReason;
    }
    else {
        delete jobData.exclusivityReason;
    }
    if (scope.applicable_countries !== undefined) {
        jobData.applicable_countries = scope.applicable_countries;
    }
    else {
        delete jobData.applicable_countries;
    }
    jobData.sourceKind = scope.sourceKind;
    await jobRef.set(jobData);
    logger.info(`Created job ${jobRef.id}: ${bundles.length} bundles, ${count} scenarios each`);
    return {
        jobId: jobRef.id,
        bundles,
        expectedScenarios: (0, generation_job_1.estimateExpectedScenarios)(bundles.length, count, options.distributionConfig)
    };
}
/**
 * Get job status by ID
 */
async function getJobStatus(db, jobId) {
    const doc = await db.collection('generation_jobs').doc(jobId).get();
    return doc.exists ? doc.data() : null;
}
/**
 * Cancel a pending job
 */
async function cancelJob(db, jobId) {
    const docRef = db.collection('generation_jobs').doc(jobId);
    const doc = await docRef.get();
    if (!doc.exists)
        return false;
    const data = doc.data();
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
function toMillis(ts) {
    if (!ts)
        return null;
    return ts.toDate().getTime();
}
/**
 * Detects generation jobs stuck in 'running' state and marks them as failed.
 * Runs every 5 minutes. Two sweeps per invocation:
 *
 * 1. Stale-heartbeat sweep — catches crashed workers (Cloud Function killed,
 *    n8n workflow stopped). Jobs whose updatedAt hasn't moved in
 *    `zombie_staleness_minutes` (default 15) are finalized.
 *
 * 2. Loop-failure sweep — catches n8n jobs alive but spinning on failures.
 *    Jobs running > `loop_failure_min_runtime_minutes` with failure rate above
 *    `loop_failure_rate_threshold` and at least `loop_failure_min_attempts`
 *    total attempts are terminated.
 *
 * Thresholds are read from world_state/generation_config; safe defaults apply
 * when the fields are absent so no redeploy is needed to tune them.
 */
exports.recoverZombieJobs = (0, scheduler_1.onSchedule)({
    schedule: 'every 5 minutes',
    timeoutSeconds: 60,
    memory: '256MiB',
}, async () => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    try {
        const db = admin.firestore();
        // --- Read configurable thresholds ---
        const configSnap = await db.doc('world_state/generation_config').get();
        const configData = (_a = configSnap.data()) !== null && _a !== void 0 ? _a : {};
        const zombieStalenessMinutes = (_b = configData.zombie_staleness_minutes) !== null && _b !== void 0 ? _b : 15;
        const loopFailureMinRuntimeMinutes = (_c = configData.loop_failure_min_runtime_minutes) !== null && _c !== void 0 ? _c : 15;
        const loopFailureMinAttempts = (_d = configData.loop_failure_min_attempts) !== null && _d !== void 0 ? _d : 15;
        const loopFailureRateThreshold = (_e = configData.loop_failure_rate_threshold) !== null && _e !== void 0 ? _e : 0.90;
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
            const data = doc.data();
            const startedAtMs = toMillis(data.startedAt);
            const updatedAtMs = toMillis(data.updatedAt);
            const heartbeat = Math.max(startedAtMs !== null && startedAtMs !== void 0 ? startedAtMs : 0, updatedAtMs !== null && updatedAtMs !== void 0 ? updatedAtMs : 0);
            return heartbeat > 0 && heartbeat < cutoff.getTime();
        });
        if (candidates.length > 0) {
            logger.warn(`[ZombieRecovery] Sweep 1: Found ${candidates.length} stale-heartbeat zombie job(s) — finalizing`);
            const batch = db.batch();
            for (const doc of candidates) {
                const data = doc.data();
                const total = Math.max(0, Number((_g = (_f = data.total) !== null && _f !== void 0 ? _f : data.totalCount) !== null && _g !== void 0 ? _g : 0));
                const completedCount = Math.max(0, Number((_h = data.completedCount) !== null && _h !== void 0 ? _h : 0));
                const failedCount = Math.max(0, Number((_j = data.failedCount) !== null && _j !== void 0 ? _j : 0));
                const partialFromResults = Array.isArray(data.results) && data.results.length > 0;
                const hasPartial = completedCount > 0 || partialFromResults;
                const remaining = total > 0 ? Math.max(0, total - completedCount - failedCount) : 0;
                const normalizedFailedCount = failedCount + remaining;
                const normalizedProgress = total > 0
                    ? Math.min(100, Math.round(((completedCount + normalizedFailedCount) / total) * 100))
                    : (hasPartial ? 100 : 0);
                if (hasPartial) {
                    logger.warn(`[ZombieRecovery] Finalizing job ${doc.id} as completed with partial timeout ` +
                        `(completed=${completedCount}, failed=${normalizedFailedCount}, total=${total})`);
                    batch.update(doc.ref, {
                        status: 'completed',
                        progress: normalizedProgress,
                        completedCount,
                        failedCount: normalizedFailedCount,
                        error: `Job timed out after partial completion: ${completedCount}/${total || completedCount} scenarios finished before the worker exceeded its execution window.`,
                        completedAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
                else {
                    logger.warn(`[ZombieRecovery] Marking job ${doc.id} as failed (stuck since ${(_m = (_l = (_k = data.startedAt) === null || _k === void 0 ? void 0 : _k.toDate) === null || _l === void 0 ? void 0 : _l.call(_k)) === null || _m === void 0 ? void 0 : _m.toISOString()})`);
                    batch.update(doc.ref, {
                        status: 'failed',
                        progress: normalizedProgress,
                        completedCount,
                        failedCount: normalizedFailedCount,
                        error: `Job timed out: no completion signal received within ${zombieStalenessMinutes} minutes. The Cloud Function likely exceeded its 540s execution limit. Retry the job.`,
                        completedAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
            }
            await batch.commit();
            logger.info(`[ZombieRecovery] Sweep 1: Finalized ${candidates.length} stale-heartbeat zombie job(s)`);
        }
        else {
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
            var _a, _b;
            const data = doc.data();
            const failed = Math.max(0, Number((_a = data.failedCount) !== null && _a !== void 0 ? _a : 0));
            const completed = Math.max(0, Number((_b = data.completedCount) !== null && _b !== void 0 ? _b : 0));
            const total = failed + completed;
            if (total < loopFailureMinAttempts)
                return false;
            if (completed > 0)
                return (failed / total) >= loopFailureRateThreshold;
            return failed >= loopFailureMinAttempts;
        });
        if (loopCandidates.length > 0) {
            logger.warn(`[ZombieRecovery] Sweep 2: Found ${loopCandidates.length} loop-failure job(s) — terminating`);
            const loopBatch = db.batch();
            for (const doc of loopCandidates) {
                const data = doc.data();
                const failed = Math.max(0, Number((_o = data.failedCount) !== null && _o !== void 0 ? _o : 0));
                const completed = Math.max(0, Number((_p = data.completedCount) !== null && _p !== void 0 ? _p : 0));
                const total = failed + completed;
                const rate = total > 0 ? Math.round((failed / total) * 100) : 100;
                logger.warn(`[ZombieRecovery] Sweep 2: Terminating loop-failure job ${doc.id}: ${failed}/${total} attempts failed (${rate}%)`);
                loopBatch.update(doc.ref, {
                    status: 'failed',
                    error: `Job terminated: excessive failure rate — ${failed}/${total} generation attempts failed (${rate}%) after ${loopFailureMinRuntimeMinutes}+ minutes with ${completed === 0 ? 'no' : 'few'} successful scenarios. Check model config and retry.`,
                    completedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            await loopBatch.commit();
            logger.info(`[ZombieRecovery] Sweep 2: Terminated ${loopCandidates.length} loop-failure job(s)`);
        }
        else {
            logger.info('[ZombieRecovery] Sweep 2: No loop-failure jobs found');
        }
    }
    catch (err) {
        logger.error('[ZombieRecovery] Uncaught error in scheduler handler:', err);
    }
});
//# sourceMappingURL=background-jobs.js.map