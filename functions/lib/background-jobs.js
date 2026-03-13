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
exports.onScenarioJobCreated = exports.MAX_SCENARIOS_PER_JOB = exports.MAX_PENDING_JOBS = exports.MAX_BUNDLE_CONCURRENCY = void 0;
exports.resolveBundles = resolveBundles;
exports.createGenerationJob = createGenerationJob;
exports.getJobStatus = getJobStatus;
exports.cancelJob = cancelJob;
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-functions/v2/firestore");
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
    secrets: ["OPENAI_API_KEY", "MOONSHOT_API_KEY"]
}, async (event) => {
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
            error: 'Scenario generation is misconfigured. Set OPENAI_API_KEY and MOONSHOT_API_KEY in Firebase secrets. ' + configValidation.errors.join('; '),
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
    }
    // Fetch generation config (cached after first call)
    const genConfig = await (0, scenario_engine_1.getGenerationConfig)();
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
        logger.info(`Processing ${validBundles.length} bundles in parallel (API concurrency capped at ${process.env.OPENAI_MAX_CONCURRENT || '20'} requests): ${validBundles.join(', ')}`);
        await Promise.all(validBundles.map(async (bundle, index) => {
            var _a, _b, _c, _d, _e, _f;
            logger.info(`[${index + 1}/${validBundles.length}] Processing bundle: ${bundle}`);
            try {
                const scenarios = await (0, scenario_engine_1.generateScenarios)(Object.assign(Object.assign({ mode,
                    bundle,
                    count,
                    distributionConfig }, (jobData.region ? { region: jobData.region } : {})), (((_a = jobData.regions) === null || _a === void 0 ? void 0 : _a.length) ? { regions: jobData.regions } : {})));
                logger.info(`Bundle ${bundle}: generated ${scenarios.length} scenarios`);
                if (scenarios.length === 0) {
                    const message = `Bundle ${bundle} produced zero scenarios (concept generation or validation rejected all candidates)`;
                    allErrors.push({ bundle, error: message });
                    totalFailed += count;
                    logger.error(message);
                    await updateProgress();
                    return;
                }
                for (const s of scenarios) {
                    try {
                        const savedResult = await (0, storage_1.saveScenario)(s);
                        if (savedResult.saved) {
                            const actCount = ((_b = s.acts) === null || _b === void 0 ? void 0 : _b.length) || 1;
                            const isRoot = s.isRootScenario !== false;
                            const auditScore = (_d = (_c = s.metadata) === null || _c === void 0 ? void 0 : _c.auditMetadata) === null || _d === void 0 ? void 0 : _d.score;
                            allResults.push({ id: s.id, title: s.title, bundle, difficulty: (_e = s.metadata) === null || _e === void 0 ? void 0 : _e.difficulty, actCount, isRoot, auditScore });
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
            catch (err) {
                logger.error(`Failed to generate bundle ${bundle}:`, err);
                allErrors.push({ bundle, error: err.message });
                totalFailed += count;
                await updateProgress();
            }
        }));
        const telemetry = (0, model_providers_1.getProviderRetryTelemetry)();
        if (telemetry.rateLimitRetries > 0) {
            logger.warn(`[concurrency] Observed ${telemetry.rateLimitRetries} rate-limit retries across all bundles`);
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
        // Final update
        const finalStatus = totalCompleted > 0 ? 'completed' : 'failed';
        await snapshot.ref.update(Object.assign({ status: finalStatus, completedAt: admin.firestore.FieldValue.serverTimestamp(), progress: 100, completedCount: totalCompleted, failedCount: totalFailed, savedScenarioIds, results: allResults.slice(0, 100), errors: allErrors.slice(0, 50) }, (auditSummary ? { auditSummary } : {})));
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
//# sourceMappingURL=background-jobs.js.map