import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from 'firebase-admin';
import { generateScenarios, getGenerationConfig } from "./scenario-engine";
import { type BundleScenario } from "./lib/audit-rules";
import { isValidBundleId, ALL_BUNDLE_IDS, type BundleId } from "./data/schemas/bundleIds";
import { saveScenario, getActiveBundleCount } from "./storage";
import { validateConfig, logConfigStatus } from "./lib/config-validator";
import { getProviderRetryTelemetry, resetProviderRetryTelemetry } from './lib/model-providers';
export { onScenarioJobCreated, recoverZombieJobs } from "./background-jobs";
export { dailyNewsToScenarios } from "./news-to-scenarios";

// Admin callable: rebuild all scenario bundle JSON files in Firebase Storage.
// Invoke after bulk imports, schema changes, or any time the manifest is stale.
// Requires admin auth (same gate as generateScenariosManual).
export const rebuildScenarioBundles = onCall({
    cors: true,
    enforceAppCheck: false,
    timeoutSeconds: 540,
    memory: '1GiB',
}, async (request) => {
    if (!request.auth) throw new Error('Authentication required');

    const userEmail = request.auth.token?.email || '';
    const userId = request.auth.uid;
    const adminUid = process.env.ADMIN_UID;
    const adminEmail = process.env.ADMIN_EMAIL;

    if ((adminUid || adminEmail) && userId !== adminUid && userEmail !== adminEmail) {
        throw new Error('Admin privileges required');
    }

    const { bundleId } = request.data || {};
    const { exportBundle, exportAllBundles } = await import('./bundle-exporter');

    if (bundleId) {
        if (!isValidBundleId(bundleId)) throw new Error(`Invalid bundle ID: ${bundleId}`);
        const count = await exportBundle(bundleId);
        return { success: true, summary: { [bundleId]: count } };
    }

    const summary = await exportAllBundles();
    return { success: true, summary };
});

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * Atomically check and update bundle generation cooldown via Firestore transaction.
 * Using a transaction prevents two simultaneous requests for the same bundle from
 * both passing the cooldown gate (TOCTOU race condition).
 */
async function checkAndUpdateBundleGeneration(
    bundle: string,
    mode: 'news' | 'manual',
    cooldownMinutes: number = 30
): Promise<boolean> {
    const trackingDoc = db.collection('generation_tracking').doc(`${bundle}_${mode}`);
    try {
        return await db.runTransaction(async (tx) => {
            const doc = await tx.get(trackingDoc);
            if (doc.exists && cooldownMinutes > 0) {
                const lastGenerated = doc.data()?.timestamp?.toDate();
                if (lastGenerated) {
                    const minutesSinceLastGen = (Date.now() - lastGenerated.getTime()) / 1000 / 60;
                    if (minutesSinceLastGen < cooldownMinutes) {
                        logger.warn(`Bundle ${bundle} (${mode}) was generated ${minutesSinceLastGen.toFixed(1)} minutes ago. Skipping (cooldown: ${cooldownMinutes}m).`);
                        return false;
                    }
                }
            }
            tx.set(trackingDoc, {
                bundle,
                mode,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                lastGenerationDate: new Date().toISOString()
            });
            return true;
        });
    } catch (err: any) {
        // On transaction failure (e.g. contention), allow generation rather than silently drop
        logger.warn(`[generate] Cooldown transaction failed for ${bundle}: ${err.message}. Allowing generation.`);
        return true;
    }
}

// Callable: Fetch Scenarios
export const getScenarios = onCall({
    cors: true,
    enforceAppCheck: false,
}, async (request) => {
    const { hideNewsScenarios = false, limit = 100 } = request.data || {};

    try {
        const { fetchScenarios } = await import('./storage');
        const scenarios = await fetchScenarios(hideNewsScenarios, limit);
        return { success: true, scenarios, count: scenarios.length };
    } catch (error) {
        logger.error('Error fetching scenarios:', error);
        throw new Error('Failed to fetch scenarios');
    }
});

// Callable: Manual Generation (Dev Tools) - Requires admin authentication
export const generateScenariosManual = onCall({
    cors: true,
    enforceAppCheck: false,
    timeoutSeconds: 540,
    memory: '1GiB',
    secrets: ["OPENAI_API_KEY"]
}, async (request) => {
    if (!request.auth) {
        throw new Error('Authentication required');
    }

    const userEmail = request.auth.token?.email || '';
    const userId = request.auth.uid;
    const adminUid = process.env.ADMIN_UID;
    const adminEmail = process.env.ADMIN_EMAIL;

    logger.info(`Manual generation request from: ${userId} (${userEmail})`);

    if ((adminUid || adminEmail) && userId !== adminUid && userEmail !== adminEmail) {
        logger.warn(`Access denied for User: ${userId}, Email: ${userEmail}`);
        throw new Error('Admin privileges required');
    }

    const { bundles, count, distributionConfig, region, applicable_countries, modelConfig, bypassCooldown } = request.data;
    const configValidation = validateConfig(modelConfig);
    logger.info(`[generate] Config valid: ${configValidation.valid}`, { errors: configValidation.errors });
    if (!configValidation.valid) {
        logConfigStatus();
        throw new Error('Scenario generation is misconfigured. ' + configValidation.errors.join('; '));
    }

    logger.info(`[generate] Params: bundles=${JSON.stringify(bundles)}, count=${count}, region=${region}, bypassCooldown=${!!bypassCooldown}`);

    if (!bundles || !Array.isArray(bundles)) {
        throw new Error("Invalid arguments: 'bundles' must be an array of strings.");
    }

    const invalidBundles = bundles.filter((b: string) => !isValidBundleId(b));
    if (invalidBundles.length > 0) {
        throw new Error(`Invalid bundle IDs: ${invalidBundles.join(', ')}. Valid bundles: ${ALL_BUNDLE_IDS.join(', ')}`);
    }

    const genConfigSnap = await db.doc('world_state/generation_config').get();
    const genConfigData = genConfigSnap.data();
    const maxPendingJobs = genConfigData?.max_pending_jobs ?? 10;
    const [pendingSnap, runningSnap] = await Promise.all([
        db.collection('generation_jobs').where('status', '==', 'pending').count().get(),
        db.collection('generation_jobs').where('status', '==', 'running').count().get(),
    ]);
    const activeJobCount = pendingSnap.data().count + runningSnap.data().count;
    if (activeJobCount >= maxPendingJobs) {
        throw new Error(`Too many active jobs (${activeJobCount}/${maxPendingJobs}). Wait for running jobs to complete.`);
    }

    const results: BundleScenario[] = [];
    const skipped: Array<Record<string, unknown>> = [];
    let totalSaved = 0;
    let totalSkipped = 0;
    let processedBundles = 0;

    const normalizedCount = Math.max(1, Number(count) || 1);
    const estimatedTotal = Math.max(1, bundles.length * normalizedCount * 3);
    const jobRef = db.collection('generation_jobs').doc();
    await jobRef.set({
        bundles,
        count: normalizedCount,
        mode: 'manual',
        distributionConfig: distributionConfig || { mode: 'auto' },
        requestedBy: userEmail || userId,
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        priority: 'normal',
        description: 'Manual generation via /dev/generator',
        status: 'running',
        progress: 0,
        total: estimatedTotal,
        completedCount: 0,
        failedCount: 0,
        source: 'generateScenariosManual',
        region: region || null,
        applicable_countries: Array.isArray(applicable_countries) ? applicable_countries : [],
        modelConfig: modelConfig || null,
    });

    const maxBundleConcurrency = Math.min(genConfigData?.max_bundle_concurrency ?? 3, 5);

    let adaptiveBundleConcurrency = maxBundleConcurrency;
    let consecutiveCleanBatches = 0;

    // Process bundles in adaptive parallel batches — each bundle internally runs concept_concurrency
    // parallel LLM calls, so total concurrent API calls ≈ adaptiveBundleConcurrency × concept_concurrency.
    for (let batchStart = 0; batchStart < bundles.length; batchStart += adaptiveBundleConcurrency) {
        const batchBundles: string[] = bundles.slice(batchStart, batchStart + adaptiveBundleConcurrency);
        logger.info(
            `[generate] Bundle batch ${Math.floor(batchStart / adaptiveBundleConcurrency) + 1}/${Math.ceil(bundles.length / adaptiveBundleConcurrency)} ` +
            `with concurrency=${adaptiveBundleConcurrency}: [${batchBundles.join(', ')}]`
        );

        resetProviderRetryTelemetry();

        const batchResults = await Promise.all(
            batchBundles.map(async (bundle): Promise<{
                bundle: string;
                bundleSaved: BundleScenario[];
                bundleSkipped: Array<Record<string, unknown>>;
                error?: string;
            }> => {
                const bundleSaved: BundleScenario[] = [];
                const bundleSkipped: Array<Record<string, unknown>> = [];

                // Ceiling check - skip bundle if active scenario count is at or above configured ceiling
                const ceiling = await getGenerationConfig();
                const bundleActiveCount = await getActiveBundleCount(bundle as BundleId, db);
                if (bundleActiveCount >= ceiling.max_active_scenarios_per_bundle!) {
                    logger.warn(`[ceiling] Bundle ${bundle} at ceiling: ${bundleActiveCount}/${ceiling.max_active_scenarios_per_bundle} — skipping`);
                    bundleSkipped.push({ bundle, reason: 'ceiling', activeCount: bundleActiveCount });
                    return { bundle, bundleSaved, bundleSkipped };
                }

                // Check cooldown (shorter for manual: 5 minutes). Skipped when bypassCooldown is set.
                if (!bypassCooldown) {
                    const shouldGenerate = await checkAndUpdateBundleGeneration(bundle, 'manual', 5);
                    if (!shouldGenerate) {
                        logger.warn(`Bundle ${bundle} skipped - generated too recently`);
                        bundleSkipped.push({ bundle, reason: 'cooldown' });
                        return { bundle, bundleSaved, bundleSkipped };
                    }
                } else {
                    // Still update timestamp so subsequent calls know when it was last generated
                    await checkAndUpdateBundleGeneration(bundle, 'manual', 0);
                }

                logger.info(`[generate] Calling generateScenarios for bundle: ${bundle}`);
                let scenarios: BundleScenario[];
                try {
                    scenarios = await generateScenarios({
                        mode: 'manual',
                        bundle: bundle as BundleId,
                        count: count || 1,
                        distributionConfig,
                        ...(region ? { region: String(region) } : {}),
                        ...(Array.isArray(applicable_countries) && applicable_countries.length > 0 ? { applicable_countries } : {}),
                        ...(modelConfig ? { modelConfig } : {})
                    });
                } catch (err: any) {
                    logger.error(`[generate] generateScenarios threw for bundle ${bundle}: ${err.message}`, { stack: err.stack });
                    return { bundle, bundleSaved, bundleSkipped, error: err.message };
                }
                logger.info(`[generate] generateScenarios returned ${scenarios.length} scenarios for bundle: ${bundle}`);

                // Save all scenarios in this bundle in parallel
                const saveResults = await Promise.all(
                    scenarios.map(s => saveScenario(s).then(r => ({ s, r })))
                );
                for (const { s, r } of saveResults) {
                    if (r.saved) {
                        bundleSaved.push(s);
                    } else {
                        logger.info(`Skipped scenario ${s.id}: ${r.reason}`);
                        bundleSkipped.push({ scenarioId: s.id, reason: r.reason, existingId: r.existingId });
                    }
                }

                return { bundle, bundleSaved, bundleSkipped };
            })
        );

        const telemetry = getProviderRetryTelemetry();
        if (telemetry.rateLimitRetries > 0) {
            consecutiveCleanBatches = 0;
            if (adaptiveBundleConcurrency > 1) {
                adaptiveBundleConcurrency -= 1;
                logger.warn(
                    `[generate] Observed ${telemetry.rateLimitRetries} provider 429 retries in batch; ` +
                    `reducing bundle concurrency to ${adaptiveBundleConcurrency}`
                );
            }
        } else if (adaptiveBundleConcurrency < maxBundleConcurrency) {
            consecutiveCleanBatches += 1;
            if (consecutiveCleanBatches >= 2) {
                adaptiveBundleConcurrency += 1;
                consecutiveCleanBatches = 0;
                logger.info(`[generate] Two clean batches; increasing bundle concurrency to ${adaptiveBundleConcurrency}`);
            }
        }

        // Accumulate batch results; surface first generation error
        for (const { bundle, bundleSaved, bundleSkipped, error } of batchResults) {
            if (error) {
                await jobRef.update({
                    status: 'failed',
                    completedAt: admin.firestore.FieldValue.serverTimestamp(),
                    failedCount: totalSkipped + 1,
                    completedCount: totalSaved,
                    progress: Math.min(100, Math.round((processedBundles / Math.max(1, bundles.length)) * 100)),
                    errors: admin.firestore.FieldValue.arrayUnion({ bundle, error }),
                });
                throw new Error(`Bundle ${bundle} failed: ${error}`);
            }
            for (const s of bundleSaved) { results.push(s); totalSaved++; }
            for (const sk of bundleSkipped) { skipped.push(sk); totalSkipped++; }

            processedBundles++;
            await jobRef.update({
                progress: Math.min(100, Math.round((processedBundles / Math.max(1, bundles.length)) * 100)),
                completedCount: totalSaved,
                failedCount: totalSkipped,
                results: results.slice(0, 100).map((s) => ({ id: s.id, title: s.title, bundle: s.metadata?.bundle, auditScore: s.metadata?.auditMetadata?.score, autoFixed: s.metadata?.auditMetadata?.autoFixed ?? false })),
                errors: skipped.slice(0, 50),
            });
        }
    }

    const scoredResults = results.filter(r => typeof r.metadata?.auditMetadata?.score === 'number');
    const auditSummary = scoredResults.length > 0 ? {
        avgScore: Math.round((scoredResults.reduce((s, r) => s + (r.metadata?.auditMetadata?.score ?? 0), 0) / scoredResults.length) * 10) / 10,
        minScore: Math.min(...scoredResults.map(r => r.metadata?.auditMetadata?.score!)),
        maxScore: Math.max(...scoredResults.map(r => r.metadata?.auditMetadata?.score!)),
        below70Count: scoredResults.filter(r => (r.metadata?.auditMetadata?.score ?? 0) < 70).length,
        above90Count: scoredResults.filter(r => (r.metadata?.auditMetadata?.score ?? 0) >= 90).length,
    } : null;
    const finalTelemetry = getProviderRetryTelemetry();

    await jobRef.update({
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        progress: 100,
        completedCount: totalSaved,
        failedCount: totalSkipped,
        results: results.slice(0, 100).map((s) => ({ id: s.id, title: s.title, bundle: s.metadata?.bundle, auditScore: s.metadata?.auditMetadata?.score, autoFixed: s.metadata?.auditMetadata?.autoFixed ?? false })),
        errors: skipped.slice(0, 50),
        ...(auditSummary ? { auditSummary } : {}),
        rateLimitRetries: finalTelemetry.rateLimitRetries,
    });

    return {
        success: true,
        jobId: jobRef.id,
        saved: totalSaved,
        skipped: totalSkipped,
        scenarios: results,
        skippedDetails: skipped
    };
});


