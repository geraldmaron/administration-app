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
exports.recoverZombieJobs = exports.onScenarioJobCreated = exports.MAX_SCENARIOS_PER_JOB = exports.MAX_PENDING_JOBS = exports.MAX_BUNDLE_CONCURRENCY = void 0;
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
const model_providers_1 = require("./lib/model-providers");
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/**
 * Concurrency Configuration for OpenAI API
 *
 * Concurrent HTTP requests are capped via semaphore in model-providers.ts
 * (OPENAI_MAX_CONCURRENT env var, default 20).
 * All bundles run in parallel — each gets its own concurrent slot.
 * Rate-limit backoff is handled per-call inside model-providers.ts.
 */
/** Maximum bundles to process concurrently */
exports.MAX_BUNDLE_CONCURRENCY = 5;
/** Maximum pending jobs allowed globally to prevent queue flooding */
exports.MAX_PENDING_JOBS = 10;
/** Maximum scenarios per job to prevent runaway costs */
exports.MAX_SCENARIOS_PER_JOB = 50;
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
// ---------------------------------------------------------------------------
// Firestore Trigger: Process Generation Jobs
// ---------------------------------------------------------------------------
exports.onScenarioJobCreated = (0, firestore_1.onDocumentCreated)({
    document: "generation_jobs/{jobId}",
    timeoutSeconds: 540,
    memory: "1GiB",
    secrets: ["OPENAI_API_KEY"]
}, async (event) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const snapshot = event.data;
    if (!snapshot)
        return;
    const jobData = snapshot.data();
    const jobId = event.params.jobId;
    if (jobData.status !== 'pending') {
        logger.info(`Job ${jobId} skipped - status is ${jobData.status}`);
        return;
    }
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
        return;
    }
    const configValidation = (0, config_validator_1.validateConfig)();
    if (!configValidation.valid) {
        (0, config_validator_1.logConfigStatus)();
        await snapshot.ref.update({
            status: 'failed',
            error: 'Scenario generation is misconfigured. Set OPENAI_API_KEY in Firebase secrets (firebase functions:secrets:set OPENAI_API_KEY). ' + configValidation.errors.join('; '),
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
    }
    if (!process.env.FUNCTIONS_EMULATOR && jobData.modelConfig) {
        const lmModels = [jobData.modelConfig.architectModel, jobData.modelConfig.drafterModel]
            .filter(m => m === null || m === void 0 ? void 0 : m.startsWith('lmstudio:'));
        if (lmModels.length > 0) {
            logger.error(`Job ${jobId} failed — LM Studio models cannot be used in deployed Cloud Functions`);
            await snapshot.ref.update({
                status: 'failed',
                error: 'LM Studio models are only available when running locally with the Firebase emulator. Use OpenAI models for deployed functions.',
                completedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return;
        }
    }
    // Fetch generation config (cached after first call)
    const genConfig = await (0, scenario_engine_1.getGenerationConfig)();
    const db = admin.firestore();
    // Validate count
    const count = Math.min(Math.max(1, jobData.count || 1), genConfig.max_scenarios_per_job);
    const mode = jobData.mode || 'manual';
    const distributionConfig = jobData.distributionConfig || { mode: 'auto' };
    const loopLength = distributionConfig.mode === 'fixed' && distributionConfig.loopLength
        ? distributionConfig.loopLength
        : undefined;
    const totalScenariosExpected = loopLength != null
        ? count * loopLength * validBundles.length
        : Math.ceil(count * validBundles.length * 3);
    logger.info(`Job ${jobId} starting: ${validBundles.length} bundles, ${count} scenarios each, mode=${mode}`);
    // Update status to running
    await snapshot.ref.update({
        status: 'running',
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        progress: 0,
        total: totalScenariosExpected,
        completedCount: 0,
        failedCount: 0,
        bundles: validBundles // Store validated bundles
    });
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
        const allResults = [];
        const allErrors = [];
        const savedScenarioIds = [];
        // Progress update helper - updates immediately for real-time tracking
        const updateProgress = async () => {
            const progress = Math.round(((totalCompleted + totalFailed) / totalScenariosExpected) * 100);
            try {
                await snapshot.ref.update({
                    progress,
                    completedCount: totalCompleted,
                    failedCount: totalFailed,
                    results: allResults.slice(0, 100), // Include partial results for live tracking
                    errors: allErrors.slice(0, 50) // Include partial errors for live tracking
                });
            }
            catch (err) {
                logger.warn('Failed to update progress:', err);
            }
        };
        (0, model_providers_1.resetProviderRetryTelemetry)();
        logger.info(`Processing ${validBundles.length} bundles with adaptive batching (API concurrency capped at ${process.env.OPENAI_MAX_CONCURRENT || '20'} requests)`);
        // Adaptive batching configuration
        let maxBundleConcurrency = Math.min((_a = genConfig.max_bundle_concurrency) !== null && _a !== void 0 ? _a : 3, 5);
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
                var _a;
                const batchIndex = batchStart + index + 1;
                logger.info(`[${batchIndex}/${validBundles.length}] Processing bundle: ${bundle}`);
                if (forceCancelled) {
                    logger.info(`Job ${jobId} - skipping bundle ${bundle} due to cancellation`);
                    return { bundle, scenarios: [], error: 'cancelled', skippedReason: undefined, ceilingCount: undefined };
                }
                const activeCount = await (0, storage_1.getActiveBundleCount)(bundle, db);
                if (activeCount >= genConfig.max_active_scenarios_per_bundle) {
                    logger.warn(`[ceiling] Bundle ${bundle} at ceiling: ${activeCount}/${genConfig.max_active_scenarios_per_bundle} active scenarios — skipping`);
                    return { bundle, scenarios: [], error: null, skippedReason: 'ceiling', ceilingCount: activeCount };
                }
                try {
                    const scenarios = await (0, scenario_engine_1.generateScenarios)(Object.assign(Object.assign(Object.assign(Object.assign({ mode,
                        bundle,
                        count,
                        distributionConfig }, (jobData.region ? { region: jobData.region } : {})), (((_a = jobData.regions) === null || _a === void 0 ? void 0 : _a.length) ? { regions: jobData.regions } : {})), (jobData.modelConfig ? { modelConfig: jobData.modelConfig } : {})), { onAttemptFailed: ({ attempt, maxAttempts, score, topIssues }) => {
                            const msg = `score ${score} — ${topIssues.slice(0, 3).join('; ')}`;
                            allErrors.push({ bundle, error: `attempt ${attempt}/${maxAttempts} failed: ${msg}` });
                            void updateProgress();
                        } }));
                    logger.info(`Bundle ${bundle}: generated ${scenarios.length} scenarios`);
                    return { bundle, scenarios, error: null, skippedReason: undefined, ceilingCount: undefined };
                }
                catch (err) {
                    logger.error(`Failed to generate bundle ${bundle}:`, err);
                    return { bundle, scenarios: [], error: err.message, skippedReason: undefined, ceilingCount: undefined };
                }
            }));
            // Process batch results
            for (const { bundle, scenarios, error, skippedReason, ceilingCount } of batchResults) {
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
                    await updateProgress();
                    continue;
                }
                for (const s of scenarios) {
                    try {
                        if (forceCancelled) {
                            logger.info(`Job ${jobId} - skipping save due to cancellation`);
                            break;
                        }
                        const savedResult = await (0, storage_1.saveScenario)(s);
                        if (savedResult.saved) {
                            const actCount = ((_b = s.acts) === null || _b === void 0 ? void 0 : _b.length) || 1;
                            const isRoot = s.isRootScenario !== false;
                            const auditMeta = (_c = s.metadata) === null || _c === void 0 ? void 0 : _c.auditMetadata;
                            allResults.push({ id: s.id, title: s.title, bundle, difficulty: (_d = s.metadata) === null || _d === void 0 ? void 0 : _d.difficulty, actCount, isRoot, auditScore: auditMeta === null || auditMeta === void 0 ? void 0 : auditMeta.score, autoFixed: (_e = auditMeta === null || auditMeta === void 0 ? void 0 : auditMeta.autoFixed) !== null && _e !== void 0 ? _e : false });
                            savedScenarioIds.push(s.id);
                            totalCompleted++;
                            logger.info(`Saved: ${s.id} - ${s.title} [${actCount}-act, difficulty: ${((_f = s.metadata) === null || _f === void 0 ? void 0 : _f.difficulty) || '?'}]`);
                        }
                        else {
                            allErrors.push({ id: s.id, bundle, error: savedResult.reason || 'Save rejected' });
                            totalFailed++;
                            logger.warn(`Rejected: ${s.id} - ${savedResult.reason}`);
                        }
                    }
                    catch (saveErr) {
                        allErrors.push({ id: s.id, bundle, error: saveErr.message });
                        totalFailed++;
                        logger.error(`Save error for ${s.id}:`, saveErr);
                    }
                    await updateProgress();
                }
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
        if (((_g = currentSnap.data()) === null || _g === void 0 ? void 0 : _g.status) === 'cancelled') {
            await snapshot.ref.update({
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
                progress: Math.round(((totalCompleted + totalFailed) / totalScenariosExpected) * 100),
                completedCount: totalCompleted,
                failedCount: totalFailed,
                savedScenarioIds,
                results: allResults.slice(0, 100),
                errors: allErrors.slice(0, 50),
                rateLimitRetries: finalTelemetry.rateLimitRetries,
            });
            logger.info(`Job ${jobId} stopped by external cancellation: ${totalCompleted} saved`);
            return;
        }
        // Final update
        const finalStatus = totalCompleted > 0 ? 'completed' : 'failed';
        await snapshot.ref.update(Object.assign(Object.assign({ status: finalStatus, completedAt: admin.firestore.FieldValue.serverTimestamp(), progress: 100, completedCount: totalCompleted, failedCount: totalFailed, savedScenarioIds, results: allResults.slice(0, 100), errors: allErrors.slice(0, 50) }, (auditSummary ? { auditSummary } : {})), { rateLimitRetries: finalTelemetry.rateLimitRetries }));
        logger.info(`Job ${jobId} ${finalStatus}: ${totalCompleted} saved, ${totalFailed} failed`);
        // Export updated bundles to Firebase Storage so clients get incremental updates.
        // Runs async — does not block the job completion response.
        if (finalStatus === 'completed' && validBundles.length > 0) {
            const { exportBundle } = await Promise.resolve().then(() => __importStar(require('./bundle-exporter')));
            Promise.all(validBundles.map(b => exportBundle(b))).catch(err => logger.error('[BundleExporter] Post-job export failed:', err));
        }
    }
    catch (error) {
        logger.error(`Job ${jobId} failed with exception:`, error);
        await snapshot.ref.update({
            status: 'failed',
            error: error.message,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
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
    const jobData = {
        bundles,
        count,
        mode: options.mode || 'manual',
        distributionConfig: options.distributionConfig || { mode: 'auto' },
        requestedBy: options.requestedBy || 'system',
        requestedAt: admin.firestore.Timestamp.now(),
        priority: options.priority || 'normal',
        description: options.description,
        status: 'pending'
    };
    await jobRef.set(jobData);
    logger.info(`Created job ${jobRef.id}: ${bundles.length} bundles, ${count} scenarios each`);
    return {
        jobId: jobRef.id,
        bundles,
        expectedScenarios: bundles.length * count
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
/** Jobs stuck in 'running' beyond this threshold are considered zombies */
const ZOMBIE_THRESHOLD_MINUTES = 15;
/**
 * Detects generation jobs stuck in 'running' state beyond the Cloud Function
 * timeout window and marks them as failed. Runs every 15 minutes.
 *
 * Root cause: Cloud Functions Gen 2 may be killed mid-execution (e.g. due to
 * rate-limit-induced timeouts exhausting the 540s budget) without reaching the
 * catch block, leaving the job document permanently in 'running' state.
 */
exports.recoverZombieJobs = (0, scheduler_1.onSchedule)({
    schedule: 'every 15 minutes',
    timeoutSeconds: 60,
    memory: '256MiB',
}, async () => {
    var _a, _b, _c;
    try {
        const db = admin.firestore();
        const cutoff = new Date(Date.now() - ZOMBIE_THRESHOLD_MINUTES * 60 * 1000);
        const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoff);
        const zombies = await db.collection('generation_jobs')
            .where('status', '==', 'running')
            .where('startedAt', '<', cutoffTimestamp)
            .get();
        if (zombies.empty) {
            logger.info('[ZombieRecovery] No stuck jobs found');
            return;
        }
        logger.warn(`[ZombieRecovery] Found ${zombies.size} zombie job(s) — marking as failed`);
        const batch = db.batch();
        for (const doc of zombies.docs) {
            logger.warn(`[ZombieRecovery] Marking job ${doc.id} as failed (stuck since ${(_c = (_b = (_a = doc.data().startedAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()})`);
            batch.update(doc.ref, {
                status: 'failed',
                error: `Job timed out: no completion signal received within ${ZOMBIE_THRESHOLD_MINUTES} minutes. The Cloud Function likely exceeded its 540s execution limit. Retry the job.`,
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        await batch.commit();
        logger.info(`[ZombieRecovery] Marked ${zombies.size} zombie job(s) as failed`);
    }
    catch (err) {
        logger.error('[ZombieRecovery] Uncaught error in scheduler handler:', err);
    }
});
//# sourceMappingURL=background-jobs.js.map