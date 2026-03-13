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
import { generateScenarios, getGenerationConfig } from './scenario-engine';
import { saveScenario } from './storage';
import { ALL_BUNDLE_IDS, isValidBundleId, STANDARD_BUNDLE_IDS, type BundleId } from './data/schemas/bundleIds';
import { validateConfig, logConfigStatus } from './lib/config-validator';
import { getProviderRetryTelemetry, resetProviderRetryTelemetry } from './lib/model-providers';

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
export const MAX_BUNDLE_CONCURRENCY = 5;

/** Maximum pending jobs allowed globally to prevent queue flooding */
export const MAX_PENDING_JOBS = 10;

/** Maximum scenarios per job to prevent runaway costs */
export const MAX_SCENARIOS_PER_JOB = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenerationJobData {
    // Required fields
    bundles: BundleId[];
    count: number;
    
    // Optional configuration
    mode?: 'news' | 'manual';
    distributionConfig?: {
        mode: 'fixed' | 'auto';
        loopLength?: 1 | 2 | 3;
        gameLength?: 'short' | 'medium' | 'long';
    };

    // Region targeting — scenarios are tagged and filtered by region
    region?: string;    // Single region hint for prompt context
    regions?: string[]; // Canonical region IDs written to scenario metadata.region_tags
    
    // Job metadata (set by client)
    requestedBy?: string;
    requestedAt?: admin.firestore.Timestamp;
    priority?: 'low' | 'normal' | 'high';
    description?: string;
    
    // Job status (set by system)
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    startedAt?: admin.firestore.Timestamp;
    completedAt?: admin.firestore.Timestamp;
    progress?: number;
    total?: number;
    completedCount?: number;
    failedCount?: number;
    savedScenarioIds?: string[];
    results?: { id: string; title: string; bundle: string; difficulty?: number; actCount?: number; isRoot?: boolean }[];
    errors?: { id?: string; bundle?: string; error: string }[];
    error?: string;
}

export interface CreateJobOptions {
    bundles: BundleId[] | 'all' | 'standard';
    count: number;
    mode?: 'news' | 'manual';
    distributionConfig?: GenerationJobData['distributionConfig'];
    requestedBy?: string;
    priority?: 'low' | 'normal' | 'high';
    description?: string;
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

export const onScenarioJobCreated = onDocumentCreated({
    document: "generation_jobs/{jobId}",
    timeoutSeconds: 540,
    memory: "1GiB",
    secrets: ["OPENAI_API_KEY", "MOONSHOT_API_KEY"]
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const jobData = snapshot.data() as GenerationJobData;
    const jobId = event.params.jobId;

    if (jobData.status !== 'pending') {
        logger.info(`Job ${jobId} skipped - status is ${jobData.status}`);
        return;
    }

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
        return;
    }

    const configValidation = validateConfig();
    if (!configValidation.valid) {
        logConfigStatus();
        await snapshot.ref.update({
            status: 'failed',
            error: 'Scenario generation is misconfigured. Set OPENAI_API_KEY and MOONSHOT_API_KEY in Firebase secrets. ' + configValidation.errors.join('; '),
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
    }

    // Fetch generation config (cached after first call)
    const genConfig = await getGenerationConfig();

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
        const allResults: { id: string; title: string; bundle: string; difficulty?: number; actCount?: number; isRoot?: boolean; auditScore?: number }[] = [];
        const allErrors: { id?: string; bundle?: string; error: string }[] = [];
        const savedScenarioIds: string[] = [];

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
            } catch (err) {
                logger.warn('Failed to update progress:', err);
            }
        };

        resetProviderRetryTelemetry();
        logger.info(`Processing ${validBundles.length} bundles in parallel (API concurrency capped at ${process.env.OPENAI_MAX_CONCURRENT || '20'} requests): ${validBundles.join(', ')}`);

        await Promise.all(validBundles.map(async (bundle, index) => {
            logger.info(`[${index + 1}/${validBundles.length}] Processing bundle: ${bundle}`);

                try {
                    const scenarios = await generateScenarios({
                        mode,
                        bundle,
                        count,
                        distributionConfig,
                        ...(jobData.region ? { region: jobData.region } : {}),
                        ...(jobData.regions?.length ? { regions: jobData.regions } : {}),
                    });

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
                            const savedResult = await saveScenario(s);
                            if (savedResult.saved) {
                                const actCount = s.acts?.length || 1;
                                const isRoot = s.isRootScenario !== false;
                                const auditScore = s.metadata?.auditMetadata?.score;
                                allResults.push({ id: s.id, title: s.title, bundle, difficulty: s.metadata?.difficulty, actCount, isRoot, auditScore });
                                savedScenarioIds.push(s.id);
                                totalCompleted++;
                                logger.info(`Saved: ${s.id} - ${s.title} [${actCount}-act, difficulty: ${s.metadata?.difficulty || '?'}]`);
                            } else {
                                allErrors.push({ id: s.id, bundle, error: savedResult.reason || 'Save rejected' });
                                totalFailed++;
                                logger.warn(`Rejected: ${s.id} - ${savedResult.reason}`);
                            }
                        } catch (saveErr: any) {
                            allErrors.push({ id: s.id, bundle, error: saveErr.message });
                            totalFailed++;
                            logger.error(`Save error for ${s.id}:`, saveErr);
                        }

                        await updateProgress();
                    }
                } catch (err: any) {
                    logger.error(`Failed to generate bundle ${bundle}:`, err);
                    allErrors.push({ bundle, error: err.message });
                    totalFailed += count;
                    await updateProgress();
                }
            }));

            const telemetry = getProviderRetryTelemetry();
            if (telemetry.rateLimitRetries > 0) {
                logger.warn(`[concurrency] Observed ${telemetry.rateLimitRetries} rate-limit retries across all bundles`);
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

        // Final update
        const finalStatus = totalCompleted > 0 ? 'completed' : 'failed';
        await snapshot.ref.update({
            status: finalStatus,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            progress: 100,
            completedCount: totalCompleted,
            failedCount: totalFailed,
            savedScenarioIds,
            results: allResults.slice(0, 100),
            errors: allErrors.slice(0, 50),
            ...(auditSummary ? { auditSummary } : {}),
        });

        logger.info(`Job ${jobId} ${finalStatus}: ${totalCompleted} saved, ${totalFailed} failed`);

        // Export updated bundles to Firebase Storage so clients get incremental updates.
        // Runs async — does not block the job completion response.
        if (finalStatus === 'completed' && validBundles.length > 0) {
            const { exportBundle } = await import('./bundle-exporter');
            Promise.all(validBundles.map(b => exportBundle(b))).catch(err =>
                logger.error('[BundleExporter] Post-job export failed:', err)
            );
        }

    } catch (error: any) {
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
export async function createGenerationJob(
    db: admin.firestore.Firestore,
    options: CreateJobOptions
): Promise<{ jobId: string; bundles: BundleId[]; expectedScenarios: number }> {
    const genConfig = await getGenerationConfig();

    // Check pending job limit
    const { allowed, currentCount } = await checkPendingJobLimit(db, genConfig.max_pending_jobs);
    if (!allowed) {
        throw new Error(`Too many pending jobs (${currentCount}/${genConfig.max_pending_jobs}). Wait for existing jobs to complete.`);
    }

    // Resolve and validate bundles
    const bundles = resolveBundles(options.bundles);
    if (bundles.length === 0) {
        throw new Error(`No valid bundles specified. Valid bundles: ${ALL_BUNDLE_IDS.join(', ')}`);
    }

    // Validate count
    const count = Math.min(Math.max(1, options.count), genConfig.max_scenarios_per_job);
    if (count !== options.count) {
        logger.warn(`Count adjusted from ${options.count} to ${count} (max: ${genConfig.max_scenarios_per_job})`);
    }

    const jobRef = db.collection('generation_jobs').doc();
    
    const jobData: GenerationJobData = {
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
