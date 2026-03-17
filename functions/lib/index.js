"use strict";
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
exports.generateScenariosManual = exports.getScenarios = exports.rebuildScenarioBundles = exports.dailyNewsToScenarios = exports.recoverZombieJobs = exports.onScenarioJobCreated = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const scenario_engine_1 = require("./scenario-engine");
const bundleIds_1 = require("./data/schemas/bundleIds");
const storage_1 = require("./storage");
const config_validator_1 = require("./lib/config-validator");
const model_providers_1 = require("./lib/model-providers");
var background_jobs_1 = require("./background-jobs");
Object.defineProperty(exports, "onScenarioJobCreated", { enumerable: true, get: function () { return background_jobs_1.onScenarioJobCreated; } });
Object.defineProperty(exports, "recoverZombieJobs", { enumerable: true, get: function () { return background_jobs_1.recoverZombieJobs; } });
var news_to_scenarios_1 = require("./news-to-scenarios");
Object.defineProperty(exports, "dailyNewsToScenarios", { enumerable: true, get: function () { return news_to_scenarios_1.dailyNewsToScenarios; } });
// Admin callable: rebuild all scenario bundle JSON files in Firebase Storage.
// Invoke after bulk imports, schema changes, or any time the manifest is stale.
// Requires admin auth (same gate as generateScenariosManual).
exports.rebuildScenarioBundles = (0, https_1.onCall)({
    cors: true,
    enforceAppCheck: false,
    timeoutSeconds: 540,
    memory: '1GiB',
}, async (request) => {
    var _a;
    if (!request.auth)
        throw new Error('Authentication required');
    const userEmail = ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.email) || '';
    const userId = request.auth.uid;
    const adminUid = process.env.ADMIN_UID;
    const adminEmail = process.env.ADMIN_EMAIL;
    if ((adminUid || adminEmail) && userId !== adminUid && userEmail !== adminEmail) {
        throw new Error('Admin privileges required');
    }
    const { bundleId } = request.data || {};
    const { exportBundle, exportAllBundles } = await Promise.resolve().then(() => __importStar(require('./bundle-exporter')));
    if (bundleId) {
        if (!(0, bundleIds_1.isValidBundleId)(bundleId))
            throw new Error(`Invalid bundle ID: ${bundleId}`);
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
async function checkAndUpdateBundleGeneration(bundle, mode, cooldownMinutes = 30) {
    const trackingDoc = db.collection('generation_tracking').doc(`${bundle}_${mode}`);
    try {
        return await db.runTransaction(async (tx) => {
            var _a, _b;
            const doc = await tx.get(trackingDoc);
            if (doc.exists && cooldownMinutes > 0) {
                const lastGenerated = (_b = (_a = doc.data()) === null || _a === void 0 ? void 0 : _a.timestamp) === null || _b === void 0 ? void 0 : _b.toDate();
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
    }
    catch (err) {
        // On transaction failure (e.g. contention), allow generation rather than silently drop
        logger.warn(`[generate] Cooldown transaction failed for ${bundle}: ${err.message}. Allowing generation.`);
        return true;
    }
}
// Callable: Fetch Scenarios
exports.getScenarios = (0, https_1.onCall)({
    cors: true,
    enforceAppCheck: false,
}, async (request) => {
    const { hideNewsScenarios = false, limit = 100 } = request.data || {};
    try {
        const { fetchScenarios } = await Promise.resolve().then(() => __importStar(require('./storage')));
        const scenarios = await fetchScenarios(hideNewsScenarios, limit);
        return { success: true, scenarios, count: scenarios.length };
    }
    catch (error) {
        logger.error('Error fetching scenarios:', error);
        throw new Error('Failed to fetch scenarios');
    }
});
// Callable: Manual Generation (Dev Tools) - Requires admin authentication
exports.generateScenariosManual = (0, https_1.onCall)({
    cors: true,
    enforceAppCheck: false,
    timeoutSeconds: 540,
    memory: '1GiB',
    secrets: ["OPENAI_API_KEY"]
}, async (request) => {
    var _a, _b, _c;
    if (!request.auth) {
        throw new Error('Authentication required');
    }
    const userEmail = ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.email) || '';
    const userId = request.auth.uid;
    const adminUid = process.env.ADMIN_UID;
    const adminEmail = process.env.ADMIN_EMAIL;
    logger.info(`Manual generation request from: ${userId} (${userEmail})`);
    if ((adminUid || adminEmail) && userId !== adminUid && userEmail !== adminEmail) {
        logger.warn(`Access denied for User: ${userId}, Email: ${userEmail}`);
        throw new Error('Admin privileges required');
    }
    const configValidation = (0, config_validator_1.validateConfig)();
    logger.info(`[generate] Config valid: ${configValidation.valid}`, { errors: configValidation.errors });
    if (!configValidation.valid) {
        (0, config_validator_1.logConfigStatus)();
        throw new Error('Scenario generation is misconfigured. Set OPENAI_API_KEY in Firebase secrets (firebase functions:secrets:set). ' + configValidation.errors.join('; '));
    }
    const { bundles, count, distributionConfig, region, applicable_countries, modelConfig, bypassCooldown } = request.data;
    logger.info(`[generate] Params: bundles=${JSON.stringify(bundles)}, count=${count}, region=${region}, bypassCooldown=${!!bypassCooldown}`);
    if (!bundles || !Array.isArray(bundles)) {
        throw new Error("Invalid arguments: 'bundles' must be an array of strings.");
    }
    const invalidBundles = bundles.filter((b) => !(0, bundleIds_1.isValidBundleId)(b));
    if (invalidBundles.length > 0) {
        throw new Error(`Invalid bundle IDs: ${invalidBundles.join(', ')}. Valid bundles: ${bundleIds_1.ALL_BUNDLE_IDS.join(', ')}`);
    }
    const genConfigSnap = await db.doc('world_state/generation_config').get();
    const genConfigData = genConfigSnap.data();
    const maxPendingJobs = (_b = genConfigData === null || genConfigData === void 0 ? void 0 : genConfigData.max_pending_jobs) !== null && _b !== void 0 ? _b : 10;
    const [pendingSnap, runningSnap] = await Promise.all([
        db.collection('generation_jobs').where('status', '==', 'pending').count().get(),
        db.collection('generation_jobs').where('status', '==', 'running').count().get(),
    ]);
    const activeJobCount = pendingSnap.data().count + runningSnap.data().count;
    if (activeJobCount >= maxPendingJobs) {
        throw new Error(`Too many active jobs (${activeJobCount}/${maxPendingJobs}). Wait for running jobs to complete.`);
    }
    const results = [];
    const skipped = [];
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
    const maxBundleConcurrency = Math.min((_c = genConfigData === null || genConfigData === void 0 ? void 0 : genConfigData.max_bundle_concurrency) !== null && _c !== void 0 ? _c : 3, 5);
    let adaptiveBundleConcurrency = maxBundleConcurrency;
    let consecutiveCleanBatches = 0;
    // Process bundles in adaptive parallel batches — each bundle internally runs concept_concurrency
    // parallel LLM calls, so total concurrent API calls ≈ adaptiveBundleConcurrency × concept_concurrency.
    for (let batchStart = 0; batchStart < bundles.length; batchStart += adaptiveBundleConcurrency) {
        const batchBundles = bundles.slice(batchStart, batchStart + adaptiveBundleConcurrency);
        logger.info(`[generate] Bundle batch ${Math.floor(batchStart / adaptiveBundleConcurrency) + 1}/${Math.ceil(bundles.length / adaptiveBundleConcurrency)} ` +
            `with concurrency=${adaptiveBundleConcurrency}: [${batchBundles.join(', ')}]`);
        (0, model_providers_1.resetProviderRetryTelemetry)();
        const batchResults = await Promise.all(batchBundles.map(async (bundle) => {
            const bundleSaved = [];
            const bundleSkipped = [];
            // Ceiling check - skip bundle if active scenario count is at or above configured ceiling
            const ceiling = await (0, scenario_engine_1.getGenerationConfig)();
            const bundleActiveCount = await (0, storage_1.getActiveBundleCount)(bundle, db);
            if (bundleActiveCount >= ceiling.max_active_scenarios_per_bundle) {
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
            }
            else {
                // Still update timestamp so subsequent calls know when it was last generated
                await checkAndUpdateBundleGeneration(bundle, 'manual', 0);
            }
            logger.info(`[generate] Calling generateScenarios for bundle: ${bundle}`);
            let scenarios;
            try {
                scenarios = await (0, scenario_engine_1.generateScenarios)(Object.assign(Object.assign(Object.assign({ mode: 'manual', bundle: bundle, count: count || 1, distributionConfig }, (region ? { region: String(region) } : {})), (Array.isArray(applicable_countries) && applicable_countries.length > 0 ? { applicable_countries } : {})), (modelConfig ? { modelConfig } : {})));
            }
            catch (err) {
                logger.error(`[generate] generateScenarios threw for bundle ${bundle}: ${err.message}`, { stack: err.stack });
                return { bundle, bundleSaved, bundleSkipped, error: err.message };
            }
            logger.info(`[generate] generateScenarios returned ${scenarios.length} scenarios for bundle: ${bundle}`);
            // Save all scenarios in this bundle in parallel
            const saveResults = await Promise.all(scenarios.map(s => (0, storage_1.saveScenario)(s).then(r => ({ s, r }))));
            for (const { s, r } of saveResults) {
                if (r.saved) {
                    bundleSaved.push(s);
                }
                else {
                    logger.info(`Skipped scenario ${s.id}: ${r.reason}`);
                    bundleSkipped.push({ scenarioId: s.id, reason: r.reason, existingId: r.existingId });
                }
            }
            return { bundle, bundleSaved, bundleSkipped };
        }));
        const telemetry = (0, model_providers_1.getProviderRetryTelemetry)();
        if (telemetry.rateLimitRetries > 0) {
            consecutiveCleanBatches = 0;
            if (adaptiveBundleConcurrency > 1) {
                adaptiveBundleConcurrency -= 1;
                logger.warn(`[generate] Observed ${telemetry.rateLimitRetries} provider 429 retries in batch; ` +
                    `reducing bundle concurrency to ${adaptiveBundleConcurrency}`);
            }
        }
        else if (adaptiveBundleConcurrency < maxBundleConcurrency) {
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
            for (const s of bundleSaved) {
                results.push(s);
                totalSaved++;
            }
            for (const sk of bundleSkipped) {
                skipped.push(sk);
                totalSkipped++;
            }
            processedBundles++;
            await jobRef.update({
                progress: Math.min(100, Math.round((processedBundles / Math.max(1, bundles.length)) * 100)),
                completedCount: totalSaved,
                failedCount: totalSkipped,
                results: results.slice(0, 100).map((s) => { var _a, _b, _c, _d, _e, _f; return ({ id: s.id, title: s.title, bundle: (_a = s.metadata) === null || _a === void 0 ? void 0 : _a.bundle, auditScore: (_c = (_b = s.metadata) === null || _b === void 0 ? void 0 : _b.auditMetadata) === null || _c === void 0 ? void 0 : _c.score, autoFixed: (_f = (_e = (_d = s.metadata) === null || _d === void 0 ? void 0 : _d.auditMetadata) === null || _e === void 0 ? void 0 : _e.autoFixed) !== null && _f !== void 0 ? _f : false }); }),
                errors: skipped.slice(0, 50),
            });
        }
    }
    const scoredResults = results.filter(r => { var _a, _b; return typeof ((_b = (_a = r.metadata) === null || _a === void 0 ? void 0 : _a.auditMetadata) === null || _b === void 0 ? void 0 : _b.score) === 'number'; });
    const auditSummary = scoredResults.length > 0 ? {
        avgScore: Math.round((scoredResults.reduce((s, r) => { var _a, _b, _c; return s + ((_c = (_b = (_a = r.metadata) === null || _a === void 0 ? void 0 : _a.auditMetadata) === null || _b === void 0 ? void 0 : _b.score) !== null && _c !== void 0 ? _c : 0); }, 0) / scoredResults.length) * 10) / 10,
        minScore: Math.min(...scoredResults.map(r => { var _a, _b; return (_b = (_a = r.metadata) === null || _a === void 0 ? void 0 : _a.auditMetadata) === null || _b === void 0 ? void 0 : _b.score; })),
        maxScore: Math.max(...scoredResults.map(r => { var _a, _b; return (_b = (_a = r.metadata) === null || _a === void 0 ? void 0 : _a.auditMetadata) === null || _b === void 0 ? void 0 : _b.score; })),
        below70Count: scoredResults.filter(r => { var _a, _b, _c; return ((_c = (_b = (_a = r.metadata) === null || _a === void 0 ? void 0 : _a.auditMetadata) === null || _b === void 0 ? void 0 : _b.score) !== null && _c !== void 0 ? _c : 0) < 70; }).length,
        above90Count: scoredResults.filter(r => { var _a, _b, _c; return ((_c = (_b = (_a = r.metadata) === null || _a === void 0 ? void 0 : _a.auditMetadata) === null || _b === void 0 ? void 0 : _b.score) !== null && _c !== void 0 ? _c : 0) >= 90; }).length,
    } : null;
    const finalTelemetry = (0, model_providers_1.getProviderRetryTelemetry)();
    await jobRef.update(Object.assign(Object.assign({ status: 'completed', completedAt: admin.firestore.FieldValue.serverTimestamp(), progress: 100, completedCount: totalSaved, failedCount: totalSkipped, results: results.slice(0, 100).map((s) => { var _a, _b, _c, _d, _e, _f; return ({ id: s.id, title: s.title, bundle: (_a = s.metadata) === null || _a === void 0 ? void 0 : _a.bundle, auditScore: (_c = (_b = s.metadata) === null || _b === void 0 ? void 0 : _b.auditMetadata) === null || _c === void 0 ? void 0 : _c.score, autoFixed: (_f = (_e = (_d = s.metadata) === null || _d === void 0 ? void 0 : _d.auditMetadata) === null || _e === void 0 ? void 0 : _e.autoFixed) !== null && _f !== void 0 ? _f : false }); }), errors: skipped.slice(0, 50) }, (auditSummary ? { auditSummary } : {})), { rateLimitRetries: finalTelemetry.rateLimitRetries }));
    return {
        success: true,
        jobId: jobRef.id,
        saved: totalSaved,
        skipped: totalSkipped,
        scenarios: results,
        skippedDetails: skipped
    };
});
//# sourceMappingURL=index.js.map