/**
 * Generation Services — HTTP endpoints for n8n-driven scenario generation.
 *
 * n8n is the primary orchestrator. These endpoints provide the deterministic
 * domain services that n8n calls per bundle:
 *   1. processGenerationBundle — run full generation pipeline for one bundle
 *   2. updateJobProgress       — heartbeat / status updates from n8n
 */

import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { generateScenarios, getGenerationConfig } from './scenario-engine';
import { saveScenario, getActiveBundleCount } from './storage';
import { isValidBundleId, type BundleId } from './data/schemas/bundleIds';
import { normalizeGenerationScopeInput } from './lib/generation-scope';
import type {
    ScenarioExclusivityReason,
    ScenarioScopeTier,
    ScenarioSourceKind,
} from './types';

// ---------------------------------------------------------------------------
// Auth helpers (same contract as index.ts)
// ---------------------------------------------------------------------------

function getIntakeSecret(): string | undefined {
    return process.env.GENERATION_INTAKE_SECRET || process.env.ADMIN_SECRET;
}

function readBearerToken(headerValue?: string): string | undefined {
    if (!headerValue) return undefined;
    const [scheme, token] = headerValue.split(' ', 2);
    if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
    return token;
}

function isLocalRequest(hostname?: string, forwardedHost?: string): boolean {
    const candidates = [hostname, forwardedHost].filter((v): v is string => Boolean(v));
    return candidates.some((v) => v.startsWith('localhost') || v.startsWith('127.0.0.1'));
}

function isAuthorized(req: { get(name: string): string | undefined; hostname?: string }): boolean {
    const secret = getIntakeSecret();
    const provided = req.get('x-admin-secret') ?? readBearerToken(req.get('authorization'));
    if (secret && provided === secret) return true;
    if (process.env.FUNCTIONS_EMULATOR === 'true' && isLocalRequest(req.hostname, req.get('x-forwarded-host'))) return true;
    return false;
}

function parseBody<T>(raw: unknown): T {
    if (typeof raw === 'string') return JSON.parse(raw) as T;
    return raw as T;
}

// ---------------------------------------------------------------------------
// processGenerationBundle
// ---------------------------------------------------------------------------

interface ProcessBundleBody {
    jobId: string;
    bundle: string;
    count: number;
    mode?: 'manual' | 'news';
    lowLatencyMode?: boolean;
    scopeTier?: ScenarioScopeTier;
    scopeKey?: string;
    region?: string;
    regions?: string[];
    applicable_countries?: string[];
    sourceKind?: ScenarioSourceKind;
    exclusivityReason?: ScenarioExclusivityReason;
    clusterId?: string;
    modelConfig?: {
        architectModel?: string;
        drafterModel?: string;
        repairModel?: string;
        contentQualityModel?: string;
        narrativeReviewModel?: string;
        embeddingModel?: string;
    };
    dryRun?: boolean;
    newsContext?: Array<{ title: string; link: string; snippet?: string; source: string; pubDate: string }>;
}

/**
 * Run the full generation pipeline for a single bundle.
 * Called by n8n per bundle during parallel fan-out.
 * Returns a summary so n8n can track progress.
 */
export const processGenerationBundle = onRequest({
    cors: false,
    timeoutSeconds: 540,
    memory: '1GiB',
    secrets: ['GENERATION_INTAKE_SECRET', 'OPENAI_API_KEY'],
}, async (request, response) => {
    if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method not allowed' });
        return;
    }

    if (!isAuthorized(request)) {
        response.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const body = parseBody<ProcessBundleBody>(request.body);
    const { jobId, bundle, count, mode, lowLatencyMode, modelConfig, dryRun, newsContext } = body;

    if (!jobId || typeof jobId !== 'string') {
        response.status(400).json({ error: 'jobId is required.' });
        return;
    }

    if (!isValidBundleId(bundle)) {
        response.status(400).json({ error: `Invalid bundle: ${bundle}` });
        return;
    }

    if (!Number.isInteger(count) || count < 1 || count > 50) {
        response.status(400).json({ error: 'count must be an integer between 1 and 50.' });
        return;
    }

    const scopeResult = normalizeGenerationScopeInput({
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
        response.status(400).json({ error: scopeResult.error ?? 'Invalid scope.' });
        return;
    }

    const scope = scopeResult.value;
    const db = admin.firestore();
    const jobRef = db.collection('generation_jobs').doc(jobId);

    // Ceiling check — skip if this bundle is already at max active scenarios
    const [genConfig, activeCount] = await Promise.all([
        getGenerationConfig(),
        getActiveBundleCount(bundle, db),
    ]);

    const maxActive = genConfig.max_active_scenarios_per_bundle ?? 500;
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

    const completedScenarioIds: string[] = [];
    const errors: Array<{ id?: string; bundle: string; error: string }> = [];
    let completedCount = 0;
    let failedCount = 0;
    let bundleTokenSummary: { inputTokens: number; outputTokens: number; costUsd: number; callCount: number } | undefined;

    try {
        const genResult = await generateScenarios({
            mode: mode ?? 'manual',
            bundle: bundle as BundleId,
            count,
            ...(scope.regions[0] ? { region: scope.regions[0] } : {}),
            ...(scope.regions.length > 0 ? { regions: scope.regions } : {}),
            scopeTier: scope.scopeTier,
            scopeKey: scope.scopeKey,
            ...(scope.clusterId ? { clusterId: scope.clusterId } : {}),
            ...(scope.exclusivityReason ? { exclusivityReason: scope.exclusivityReason } : {}),
            ...(scope.applicable_countries?.length ? { applicable_countries: scope.applicable_countries } : {}),
            sourceKind: scope.sourceKind,
            ...(newsContext?.length ? { newsContext } : {}),
            ...(modelConfig ? { modelConfig } : {}),
            ...(lowLatencyMode ? { lowLatencyMode: true } : {}),
            onAttemptFailed: ({ attempt, maxAttempts, score, topIssues }) => {
                logger.warn(`[processGenerationBundle] ${bundle} attempt ${attempt}/${maxAttempts}: score ${score} — ${topIssues.slice(0, 3).join('; ')}`);
            },
        });

        const scenarios = genResult.scenarios;
        bundleTokenSummary = genResult.tokenSummary;
        const jobSnap = await jobRef.get();
        const jobModelConfig = jobSnap.data()?.modelConfig;
        const effectiveModelUsed = modelConfig?.drafterModel ?? jobModelConfig?.drafterModel ?? 'gpt-4o-mini';
        const provenance = {
            jobId,
            executionTarget: jobSnap.data()?.executionTarget ?? 'n8n',
            modelUsed: effectiveModelUsed,
            generatedAt: new Date().toISOString(),
        };
        for (const scenario of scenarios) {
            (scenario as any).metadata = { ...scenario.metadata, generationProvenance: provenance };
            if (dryRun) {
                await jobRef.collection('pending_scenarios').doc(scenario.id).set(scenario);
                completedScenarioIds.push(scenario.id);
                completedCount++;
                logger.info(`[processGenerationBundle] Staged for review: ${scenario.id}`);
            } else {
                const saved = await saveScenario(scenario);
                if (saved.saved) {
                    completedScenarioIds.push(scenario.id);
                    completedCount++;
                    logger.info(`[processGenerationBundle] Saved: ${scenario.id} (${scenario.title})`);
                } else {
                    errors.push({ id: scenario.id, bundle, error: saved.reason ?? 'Save rejected' });
                    failedCount++;
                }
            }
        }

        // Write summary back to the job record so n8n can aggregate
        await jobRef.update({
            currentPhase: 'done',
            currentMessage: `${bundle}: ${completedCount} saved, ${failedCount} failed`,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            completedCount: admin.firestore.FieldValue.increment(completedCount),
            failedCount: admin.firestore.FieldValue.increment(failedCount),
            ...(completedScenarioIds.length > 0 ? { savedScenarioIds: admin.firestore.FieldValue.arrayUnion(...completedScenarioIds) } : {}),
        });

    } catch (error: unknown) {
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

    response.status(200).json({
        completedCount,
        failedCount,
        scenarioIds: completedScenarioIds,
        errors,
        skipped: false,
        ...(bundleTokenSummary ? { tokenSummary: bundleTokenSummary } : {}),
    });
});

// ---------------------------------------------------------------------------
// updateJobProgress
// ---------------------------------------------------------------------------

interface UpdateJobProgressBody {
    jobId: string;
    status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'pending_review';
    currentBundle?: string;
    currentPhase?: string;
    currentMessage?: string;
    completedCount?: number;
    failedCount?: number;
    totalCount?: number;
}

/**
 * Heartbeat / status-update endpoint called by n8n throughout the generation run.
 * Keeps the Firestore job record current so the admin UI can track live progress.
 */
export const updateJobProgress = onRequest({
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

    const body = parseBody<UpdateJobProgressBody>(request.body);
    const { jobId, status, currentBundle, currentPhase, currentMessage, completedCount, failedCount, totalCount } = body;

    if (!jobId || typeof jobId !== 'string') {
        response.status(400).json({ error: 'jobId is required.' });
        return;
    }

    const update: Record<string, unknown> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (status !== undefined) update.status = status;
    if (currentBundle !== undefined) update.currentBundle = currentBundle;
    if (currentPhase !== undefined) update.currentPhase = currentPhase;
    if (currentMessage !== undefined) update.currentMessage = currentMessage;
    if (completedCount !== undefined) update.completedCount = completedCount;
    if (failedCount !== undefined) update.failedCount = failedCount;
    if (totalCount !== undefined) update.totalCount = totalCount;

    if (status === 'running') {
        update.startedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        update.completedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await admin.firestore().collection('generation_jobs').doc(jobId).update(update);

    response.status(200).json({ ok: true, jobId });
});
