"use strict";
/**
 * Generation Services — HTTP endpoints for n8n-driven scenario generation.
 *
 * n8n is the primary orchestrator. These endpoints provide the deterministic
 * domain services that n8n calls per bundle:
 *   1. processGenerationBundle — run full generation pipeline for one bundle
 *   2. updateJobProgress       — heartbeat / status updates from n8n
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
exports.updateJobProgress = exports.processGenerationBundle = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const scenario_engine_1 = require("./scenario-engine");
const storage_1 = require("./storage");
const bundleIds_1 = require("./data/schemas/bundleIds");
const generation_scope_1 = require("./lib/generation-scope");
// ---------------------------------------------------------------------------
// Auth helpers (same contract as index.ts)
// ---------------------------------------------------------------------------
function getIntakeSecret() {
    return process.env.GENERATION_INTAKE_SECRET || process.env.ADMIN_SECRET;
}
function readBearerToken(headerValue) {
    if (!headerValue)
        return undefined;
    const [scheme, token] = headerValue.split(' ', 2);
    if ((scheme === null || scheme === void 0 ? void 0 : scheme.toLowerCase()) !== 'bearer' || !token)
        return undefined;
    return token;
}
function isLocalRequest(hostname, forwardedHost) {
    const candidates = [hostname, forwardedHost].filter((v) => Boolean(v));
    return candidates.some((v) => v.startsWith('localhost') || v.startsWith('127.0.0.1'));
}
function isAuthorized(req) {
    var _a;
    const secret = getIntakeSecret();
    const provided = (_a = req.get('x-admin-secret')) !== null && _a !== void 0 ? _a : readBearerToken(req.get('authorization'));
    if (secret && provided === secret)
        return true;
    if (process.env.FUNCTIONS_EMULATOR === 'true' && isLocalRequest(req.hostname, req.get('x-forwarded-host')))
        return true;
    return false;
}
function parseBody(raw) {
    if (typeof raw === 'string')
        return JSON.parse(raw);
    return raw;
}
/**
 * Run the full generation pipeline for a single bundle.
 * Called by n8n per bundle during parallel fan-out.
 * Returns a summary so n8n can track progress.
 */
exports.processGenerationBundle = (0, https_1.onRequest)({
    cors: false,
    timeoutSeconds: 540,
    memory: '1GiB',
    secrets: ['GENERATION_INTAKE_SECRET', 'OPENAI_API_KEY'],
}, async (request, response) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method not allowed' });
        return;
    }
    if (!isAuthorized(request)) {
        response.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const body = parseBody(request.body);
    const { jobId, bundle, count, mode, lowLatencyMode, modelConfig, dryRun, newsContext } = body;
    if (!jobId || typeof jobId !== 'string') {
        response.status(400).json({ error: 'jobId is required.' });
        return;
    }
    if (!(0, bundleIds_1.isValidBundleId)(bundle)) {
        response.status(400).json({ error: `Invalid bundle: ${bundle}` });
        return;
    }
    if (!Number.isInteger(count) || count < 1 || count > 50) {
        response.status(400).json({ error: 'count must be an integer between 1 and 50.' });
        return;
    }
    const scopeResult = (0, generation_scope_1.normalizeGenerationScopeInput)({
        mode,
        scopeTier: body.scopeTier,
        scopeKey: body.scopeKey,
        region: body.region,
        regions: body.regions,
        applicable_countries: body.applicable_countries,
        sourceKind: body.sourceKind,
        exclusivityReason: body.exclusivityReason,
        clusterId: body.clusterId,
    });
    if (!scopeResult.ok || !scopeResult.value) {
        response.status(400).json({ error: (_a = scopeResult.error) !== null && _a !== void 0 ? _a : 'Invalid scope.' });
        return;
    }
    const scope = scopeResult.value;
    const db = admin.firestore();
    const jobRef = db.collection('generation_jobs').doc(jobId);
    // Ceiling check — skip if this bundle is already at max active scenarios
    const [genConfig, activeCount] = await Promise.all([
        (0, scenario_engine_1.getGenerationConfig)(),
        (0, storage_1.getActiveBundleCount)(bundle, db),
    ]);
    const maxActive = (_b = genConfig.max_active_scenarios_per_bundle) !== null && _b !== void 0 ? _b : 500;
    if (activeCount >= maxActive) {
        logger.info(`[processGenerationBundle] Ceiling reached for ${bundle}: ${activeCount}/${maxActive}`);
        response.status(200).json({
            completedCount: 0,
            failedCount: count,
            scenarioIds: [],
            errors: [{ bundle, error: `ceiling:${activeCount}/${maxActive}` }],
            skipped: true,
            skipReason: 'ceiling',
        });
        return;
    }
    // Announce bundle start in Firestore so the admin UI shows live progress
    await jobRef.update({
        currentBundle: bundle,
        currentPhase: 'generate',
        currentMessage: `Generating ${bundle}`,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const completedScenarioIds = [];
    const errors = [];
    let completedCount = 0;
    let failedCount = 0;
    let bundleTokenSummary;
    try {
        const genResult = await (0, scenario_engine_1.generateScenarios)(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ mode: mode !== null && mode !== void 0 ? mode : 'manual', bundle: bundle, count }, (scope.regions[0] ? { region: scope.regions[0] } : {})), (scope.regions.length > 0 ? { regions: scope.regions } : {})), { scopeTier: scope.scopeTier, scopeKey: scope.scopeKey }), (scope.clusterId ? { clusterId: scope.clusterId } : {})), (scope.exclusivityReason ? { exclusivityReason: scope.exclusivityReason } : {})), (((_c = scope.applicable_countries) === null || _c === void 0 ? void 0 : _c.length) ? { applicable_countries: scope.applicable_countries } : {})), { sourceKind: scope.sourceKind }), ((newsContext === null || newsContext === void 0 ? void 0 : newsContext.length) ? { newsContext } : {})), (modelConfig ? { modelConfig } : {})), (lowLatencyMode ? { lowLatencyMode: true } : {})), { onAttemptFailed: ({ attempt, maxAttempts, score, topIssues }) => {
                logger.warn(`[processGenerationBundle] ${bundle} attempt ${attempt}/${maxAttempts}: score ${score} — ${topIssues.slice(0, 3).join('; ')}`);
            } }));
        const scenarios = genResult.scenarios;
        bundleTokenSummary = genResult.tokenSummary;
        const jobSnap = await jobRef.get();
        const jobModelConfig = (_d = jobSnap.data()) === null || _d === void 0 ? void 0 : _d.modelConfig;
        const effectiveModelUsed = (_f = (_e = modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.drafterModel) !== null && _e !== void 0 ? _e : jobModelConfig === null || jobModelConfig === void 0 ? void 0 : jobModelConfig.drafterModel) !== null && _f !== void 0 ? _f : 'gpt-4o-mini';
        const provenance = {
            jobId,
            executionTarget: (_h = (_g = jobSnap.data()) === null || _g === void 0 ? void 0 : _g.executionTarget) !== null && _h !== void 0 ? _h : 'n8n',
            modelUsed: effectiveModelUsed,
            generatedAt: new Date().toISOString(),
        };
        for (const scenario of scenarios) {
            scenario.metadata = Object.assign(Object.assign({}, scenario.metadata), { generationProvenance: provenance });
            if (dryRun) {
                await jobRef.collection('pending_scenarios').doc(scenario.id).set(scenario);
                completedScenarioIds.push(scenario.id);
                completedCount++;
                logger.info(`[processGenerationBundle] Staged for review: ${scenario.id}`);
            }
            else {
                const saved = await (0, storage_1.saveScenario)(scenario);
                if (saved.saved) {
                    completedScenarioIds.push(scenario.id);
                    completedCount++;
                    logger.info(`[processGenerationBundle] Saved: ${scenario.id} (${scenario.title})`);
                }
                else {
                    errors.push({ id: scenario.id, bundle, error: (_j = saved.reason) !== null && _j !== void 0 ? _j : 'Save rejected' });
                    failedCount++;
                }
            }
        }
        // Write summary back to the job record so n8n can aggregate
        await jobRef.update(Object.assign({ currentPhase: 'done', currentMessage: `${bundle}: ${completedCount} saved, ${failedCount} failed`, updatedAt: admin.firestore.FieldValue.serverTimestamp(), completedCount: admin.firestore.FieldValue.increment(completedCount), failedCount: admin.firestore.FieldValue.increment(failedCount) }, (completedScenarioIds.length > 0 ? { savedScenarioIds: admin.firestore.FieldValue.arrayUnion(...completedScenarioIds) } : {})));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[processGenerationBundle] Failed bundle ${bundle}:`, error);
        errors.push({ bundle, error: message });
        failedCount += count;
        await jobRef.update({
            currentMessage: `Failed ${bundle}: ${message}`,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            failedCount: admin.firestore.FieldValue.increment(count),
        });
    }
    response.status(200).json(Object.assign({ completedCount,
        failedCount, scenarioIds: completedScenarioIds, errors, skipped: false }, (bundleTokenSummary ? { tokenSummary: bundleTokenSummary } : {})));
});
/**
 * Heartbeat / status-update endpoint called by n8n throughout the generation run.
 * Keeps the Firestore job record current so the admin UI can track live progress.
 */
exports.updateJobProgress = (0, https_1.onRequest)({
    cors: false,
    timeoutSeconds: 30,
    memory: '256MiB',
    secrets: ['GENERATION_INTAKE_SECRET'],
}, async (request, response) => {
    if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method not allowed' });
        return;
    }
    if (!isAuthorized(request)) {
        response.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const body = parseBody(request.body);
    const { jobId, status, currentBundle, currentPhase, currentMessage, completedCount, failedCount, totalCount } = body;
    if (!jobId || typeof jobId !== 'string') {
        response.status(400).json({ error: 'jobId is required.' });
        return;
    }
    const update = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (status !== undefined)
        update.status = status;
    if (currentBundle !== undefined)
        update.currentBundle = currentBundle;
    if (currentPhase !== undefined)
        update.currentPhase = currentPhase;
    if (currentMessage !== undefined)
        update.currentMessage = currentMessage;
    if (completedCount !== undefined)
        update.completedCount = completedCount;
    if (failedCount !== undefined)
        update.failedCount = failedCount;
    if (totalCount !== undefined)
        update.totalCount = totalCount;
    if (status === 'running') {
        update.startedAt = admin.firestore.FieldValue.serverTimestamp();
    }
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        update.completedAt = admin.firestore.FieldValue.serverTimestamp();
    }
    await admin.firestore().collection('generation_jobs').doc(jobId).update(update);
    response.status(200).json({ ok: true, jobId });
});
//# sourceMappingURL=generation-services.js.map