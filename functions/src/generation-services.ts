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
import { generateScenarios, getGenerationConfig, addEngineEventHandler, removeEngineEventHandler } from './scenario-engine';
import { saveScenario, getActiveBundleCount } from './storage';
import { isValidBundleId, type BundleId } from './data/schemas/bundleIds';
import { normalizeGenerationScopeInput } from './lib/generation-scope';
import { hasMeaningfulModelConfig, isOllamaGeneration, normalizeModelConfig } from './lib/generation-models';
import type {
    GenerationModelConfig,
    GenerationNewsContextItem,
    GenerationScopeFields,
    GenerationMode,
} from './shared/generation-contract';
import type { Scenario } from './types';

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
    return candidates.some((value) => {
        const normalized = value.split(':', 1)[0]?.toLowerCase() ?? value.toLowerCase();
        return normalized === 'localhost' || normalized === '127.0.0.1' || normalized.endsWith('.localhost');
    });
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

export interface ProcessBundleBody extends GenerationScopeFields {
    jobId: string;
    bundle: string;
    count: number;
    mode?: GenerationMode;
    lowLatencyMode?: boolean;
    modelConfig?: GenerationModelConfig;
    dryRun?: boolean;
    newsContext?: GenerationNewsContextItem[];
    preSeededConcepts?: Array<{
        concept: string;
        theme: string;
        severity: string;
        difficulty: 1 | 2 | 3 | 4 | 5;
        primaryMetrics?: string[];
        actorPattern?: 'domestic' | 'ally' | 'adversary' | 'border_rival' | 'legislature' | 'cabinet' | 'judiciary' | 'mixed';
        optionShape?: 'redistribute' | 'regulate' | 'escalate' | 'negotiate' | 'invest' | 'cut' | 'reform' | 'delay';
        loopEligible?: boolean;
    }>;
}

export interface BundleResult {
    completedCount: number;
    failedCount: number;
    scenarioIds: string[];
    errors: Array<{ id?: string; bundle: string; error: string }>;
    skipped: boolean;
    skipReason?: string;
    tokenSummary?: { inputTokens: number; outputTokens: number; costUsd: number; callCount: number; conceptCount?: number; totalDurationMs?: number };
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

export interface UpdateJobProgressBody {
    jobId: string;
    status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'pending_review';
    currentBundle?: string;
    currentPhase?: string;
    currentMessage?: string;
    completedCount?: number;
    failedCount?: number;
    totalCount?: number;
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
            updatedAt: timestamp,
            eventCount: admin.firestore.FieldValue.increment(1),
            ...(heartbeat?.currentBundle !== undefined ? { currentBundle: heartbeat.currentBundle } : {}),
            ...(heartbeat?.currentPhase !== undefined ? { currentPhase: heartbeat.currentPhase } : {}),
            ...(heartbeat?.currentMessage !== undefined ? { currentMessage: heartbeat.currentMessage } : {}),
        }, { merge: true }),
    ]);
}

function inferEngineEventPhase(event: import('./lib/model-providers').ModelEvent, activePhase?: string): string | undefined {
    if (typeof event.data?.phase === 'string') return event.data.phase;
    if (event.code === 'audit_pass' || event.code === 'audit_fail') return 'audit';
    if (event.code === 'repair_action' || event.code === 'repair_rollback' || event.code === 'repair_failed' || event.code === 'repair_skipped_hopeless') return 'repair';
    if (event.code === 'quality_gate') return 'quality_gate';
    if (event.code === 'narrative_review') return 'narrative_review';
    if (event.code === 'phase_draft') return 'details';
    if (event.code === 'phase_blueprint') return 'blueprint';
    if (event.code === 'phase_skeleton' || event.code === 'phase_skeleton_result' || event.code === 'skeleton_validated' || event.code === 'skeleton_rejected') return 'skeleton';
    if (event.code === 'phase_effects' || event.code === 'phase_effects_result' || event.code === 'effects_validated' || event.code === 'effects_rejected') return 'effects';
    if (event.code === 'phase_advisor' || event.code === 'phase_advisor_result') return 'advisor';
    if (event.code === 'concept_expand' || event.code === 'concept_retry' || event.code === 'concept_zero_output' || event.code === 'concept_critical_failure') return 'concept';
    if (event.code === 'loop_validated') return 'blueprint';
    if (event.code === 'llm_request' || event.code === 'llm_response' || event.code === 'llm_progress') return activePhase;
    if (event.code?.startsWith('phase_')) return event.code.replace('phase_', '');
    return activePhase;
}

function getScenarioAuditScore(scenario: any): number | undefined {
    const score = scenario?.metadata?.auditMetadata?.score;
    return typeof score === 'number' ? score : undefined;
}

export function buildJobProgressEvent(body: UpdateJobProgressBody): JobEventInput | undefined {
    const completedCount = body.completedCount ?? 0;
    const failedCount = body.failedCount ?? 0;

    if (body.status === 'running') {
        if (body.currentPhase === 'starting') {
            return {
                level: 'info',
                code: 'job_started',
                message: body.currentMessage ?? 'n8n runner started the job.',
                phase: body.currentPhase,
                data: {
                    ...(body.totalCount !== undefined ? { totalCount: body.totalCount } : {}),
                },
            };
        }

        if (body.currentBundle && body.currentPhase) {
            return {
                level: 'info',
                code: 'job_progress',
                message: body.currentMessage ?? `Processing ${body.currentBundle}`,
                bundle: body.currentBundle,
                phase: body.currentPhase,
                data: {
                    ...(body.totalCount !== undefined ? { totalCount: body.totalCount } : {}),
                    ...(body.completedCount !== undefined ? { completedCount } : {}),
                    ...(body.failedCount !== undefined ? { failedCount } : {}),
                },
            };
        }
    }

    if (body.status === 'completed' || body.status === 'pending_review') {
        return {
            level: 'success',
            code: body.status === 'pending_review' ? 'job_pending_review' : 'job_completed',
            message: body.currentMessage ?? `Job ${body.status}: ${completedCount} saved, ${failedCount} failed`,
            phase: body.status,
            data: { completedCount, failedCount },
        };
    }

    if (body.status === 'failed') {
        return {
            level: 'error',
            code: 'job_failed',
            message: body.currentMessage ?? `Job failed after ${completedCount} saved, ${failedCount} failed`,
            phase: 'failed',
            data: { completedCount, failedCount },
        };
    }

    if (body.status === 'cancelled') {
        return {
            level: 'warning',
            code: 'job_cancelled',
            message: body.currentMessage ?? 'Job cancelled.',
            phase: 'cancelled',
            data: { completedCount, failedCount },
        };
    }

    return undefined;
}

function validateBundleBody(body: ProcessBundleBody): { ok: true } | { ok: false; error: string } {
    if (!body.jobId || typeof body.jobId !== 'string') return { ok: false, error: 'jobId is required.' };
    if (!isValidBundleId(body.bundle)) return { ok: false, error: `Invalid bundle: ${body.bundle}` };
    if (!Number.isInteger(body.count) || body.count < 1 || body.count > 50) return { ok: false, error: 'count must be an integer between 1 and 50.' };
    return { ok: true };
}

export async function executeGenerationBundle(body: ProcessBundleBody): Promise<BundleResult> {
    const { jobId, count, mode, lowLatencyMode, dryRun, newsContext } = body;
    const modelConfig = normalizeModelConfig(body.modelConfig as Record<string, unknown>);
    const bundle = body.bundle as BundleId;

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
        throw new Error(scopeResult.error ?? 'Invalid scope.');
    }

    const scope = scopeResult.value;
    const db = admin.firestore();
    const jobRef = db.collection('generation_jobs').doc(jobId);

    const [genConfig, activeCount] = await Promise.all([
        getGenerationConfig(),
        getActiveBundleCount(bundle, db),
    ]);

    const maxActive = genConfig.max_active_scenarios_per_bundle ?? 500;
    if (activeCount >= maxActive) {
        logger.info(`[processGenerationBundle] Ceiling reached for ${bundle}: ${activeCount}/${maxActive}`);
        await appendJobEvent(jobRef, {
            level: 'warning',
            code: 'bundle_skipped_ceiling',
            message: `Skipped ${bundle}; active scenario ceiling reached (${activeCount}/${maxActive}).`,
            bundle,
            phase: 'generate',
            data: { activeCount, maxActive },
        }, {
            currentBundle: bundle,
            currentPhase: 'generate',
            currentMessage: `Skipped ${bundle}; active scenario ceiling reached`,
        });
        return {
            completedCount: 0,
            failedCount: count,
            scenarioIds: [],
            errors: [{ bundle, error: `ceiling:${activeCount}/${maxActive}` }],
            skipped: true,
            skipReason: 'ceiling',
        };
    }

    await appendJobEvent(jobRef, {
        level: 'info',
        code: 'bundle_started',
        message: `Started processing ${bundle}.`,
        bundle,
        phase: 'generate',
        data: { count },
    }, {
        currentBundle: bundle,
        currentPhase: 'generate',
        currentMessage: `Generating ${bundle}`,
    });

    const completedScenarioIds: string[] = [];
    const errors: Array<{ id?: string; bundle: string; error: string }> = [];
    let completedCount = 0;
    let failedCount = 0;
    let bundleTokenSummary: { inputTokens: number; outputTokens: number; costUsd: number; callCount: number; conceptCount?: number; totalDurationMs?: number } | undefined;

    const jobSnap = await jobRef.get();
    const jobModelConfig = jobSnap.data()?.modelConfig;
    const effectiveModelConfig = hasMeaningfulModelConfig(modelConfig)
        ? modelConfig
        : (hasMeaningfulModelConfig(jobModelConfig) ? jobModelConfig : modelConfig);
    const effectiveModelUsed = effectiveModelConfig?.drafterModel ?? 'unknown';
    const provenance = {
        jobId,
        executionTarget: jobSnap.data()?.executionTarget ?? 'n8n',
        modelUsed: effectiveModelUsed,
        generatedAt: new Date().toISOString(),
    };

    const eventsRef = jobRef.collection('events');
    const pendingEventWrites: Promise<unknown>[] = [];
    const THROTTLED_CODES = new Set(['llm_request', 'llm_response']);
    const HEARTBEAT_ONLY_CODES = new Set(['llm_progress']);
    let lastThrottledWriteMs = 0;
    const THROTTLE_INTERVAL_MS = 3000;
    let failedEventWrites = 0;
    let activeEnginePhase = 'generate';

    const bundleEventHandler = (event: import('./lib/model-providers').ModelEvent) => {
        const now = Date.now();
        const eventPhase = inferEngineEventPhase(event, activeEnginePhase);
        if (eventPhase) activeEnginePhase = eventPhase;
        if (HEARTBEAT_ONLY_CODES.has(event.code)) {
            jobRef.set({
                lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
                currentBundle: bundle,
                currentPhase: eventPhase,
                currentMessage: event.message,
            }, { merge: true }).catch(() => {});
            return;
        }
        if (THROTTLED_CODES.has(event.code) && now - lastThrottledWriteMs < THROTTLE_INTERVAL_MS) return;
        if (THROTTLED_CODES.has(event.code)) lastThrottledWriteMs = now;
        const write = eventsRef.add({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            level: event.level,
            code: event.code,
            message: event.message,
            bundle,
            ...(eventPhase ? { phase: eventPhase } : {}),
            ...(typeof event.data?.scenarioId === 'string' ? { scenarioId: event.data.scenarioId } : {}),
            ...(event.data ? { data: event.data } : {}),
        }).then(() => {
            return jobRef.set({
                lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
                currentBundle: bundle,
                ...(eventPhase ? { currentPhase: eventPhase } : {}),
                currentMessage: event.message,
                eventCount: admin.firestore.FieldValue.increment(1),
            }, { merge: true });
        }).catch((err) => {
            failedEventWrites++;
            logger.warn(`[processGenerationBundle] Event write failed (non-fatal, total=${failedEventWrites}): ${err?.message ?? err}`);
            jobRef.set({
                lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true }).catch((hbErr) => {
                logger.warn(`[processGenerationBundle] Heartbeat fallback also failed: ${hbErr?.message ?? hbErr}`);
            });
        });
        pendingEventWrites.push(write);
    };
    addEngineEventHandler(bundleEventHandler);

    const HEARTBEAT_INTERVAL_MS = 30_000;
    const heartbeatTimer = setInterval(async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await jobRef.set({
                    lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                break;
            } catch (err) {
                if (attempt === 2) {
                    logger.error(`[processGenerationBundle] Heartbeat write failed after 3 attempts for ${jobId}: ${(err as Error)?.message ?? err}`);
                } else {
                    await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
                }
            }
        }
    }, HEARTBEAT_INTERVAL_MS);

    const savedByCallback = new Set<string>();
    const erroredByCallback = new Set<string>();
    const onScenarioAccepted = async (scenario: any) => {
        scenario.metadata = { ...scenario.metadata, generationProvenance: provenance };
        if (dryRun) {
            await jobRef.collection('pending_scenarios').doc(scenario.id).set(scenario);
            completedScenarioIds.push(scenario.id);
            completedCount++;
            savedByCallback.add(scenario.id);
            logger.info(`[processGenerationBundle] Staged for review: ${scenario.id}`);
            await appendJobEvent(jobRef, {
                level: 'success',
                code: 'scenario_staged',
                message: `Staged scenario "${scenario.title ?? scenario.id}" for review.`,
                bundle,
                phase: 'save',
                scenarioId: scenario.id,
                data: {
                    completedCount,
                    ...(getScenarioAuditScore(scenario) !== undefined ? { score: getScenarioAuditScore(scenario) } : {}),
                },
            }, {
                currentBundle: bundle,
                currentPhase: 'save',
                currentMessage: `Staged ${scenario.title ?? scenario.id} for review`,
            });
        } else {
            const saved = await saveScenario(scenario);
            if (saved.saved) {
                completedScenarioIds.push(scenario.id);
                completedCount++;
                savedByCallback.add(scenario.id);
                logger.info(`[processGenerationBundle] Saved: ${scenario.id} (${scenario.title})`);
                await jobRef.update({
                    completedCount: admin.firestore.FieldValue.increment(1),
                    savedScenarioIds: admin.firestore.FieldValue.arrayUnion(scenario.id),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                await appendJobEvent(jobRef, {
                    level: 'success',
                    code: 'scenario_saved',
                    message: `Saved scenario "${scenario.title ?? scenario.id}".`,
                    bundle,
                    phase: 'save',
                    scenarioId: scenario.id,
                    data: {
                        completedCount,
                        ...(getScenarioAuditScore(scenario) !== undefined ? { score: getScenarioAuditScore(scenario) } : {}),
                    },
                }, {
                    currentBundle: bundle,
                    currentPhase: 'save',
                    currentMessage: `Saved ${scenario.title ?? scenario.id}`,
                });
            } else {
                const errorEntry = { id: scenario.id, bundle, error: saved.reason ?? 'Save rejected' };
                errors.push(errorEntry);
                failedCount++;
                erroredByCallback.add(scenario.id);
                await jobRef.update({
                    failedCount: admin.firestore.FieldValue.increment(1),
                    errors: admin.firestore.FieldValue.arrayUnion(errorEntry),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                await appendJobEvent(jobRef, {
                    level: 'warning',
                    code: 'scenario_rejected',
                    message: `Rejected scenario "${scenario.title ?? scenario.id}": ${saved.reason ?? 'Save rejected'}.`,
                    bundle,
                    phase: 'save',
                    scenarioId: scenario.id,
                    data: { failedCount, reason: saved.reason ?? 'Save rejected' },
                }, {
                    currentBundle: bundle,
                    currentPhase: 'save',
                    currentMessage: `Rejected ${scenario.title ?? scenario.id}`,
                });
            }
        }
    };

    const JOB_TIMEOUT_MS = 500_000;
    const abortController = new AbortController();
    const isCloudFunctionTarget = (jobSnap.data()?.executionTarget ?? 'cloud_function') === 'cloud_function';
    const abortTimer = isCloudFunctionTarget ? setTimeout(() => {
        logger.warn(`[processGenerationBundle] Job timeout (${JOB_TIMEOUT_MS / 1000}s) reached for ${bundle} — aborting gracefully`);
        abortController.abort();
    }, JOB_TIMEOUT_MS) : null;

    try {
        const genResult = await generateScenarios({
            mode: mode ?? 'manual',
            bundle,
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
            ...(effectiveModelConfig ? { modelConfig: effectiveModelConfig } : {}),
            ...(lowLatencyMode ? { lowLatencyMode: true } : {}),
            abortSignal: abortController.signal,
            ...(body.preSeededConcepts?.length ? { preSeededConcepts: body.preSeededConcepts } : {}),
            onAttemptFailed: ({ attempt, maxAttempts, score, topIssues }) => {
                logger.warn(`[processGenerationBundle] ${bundle} attempt ${attempt}/${maxAttempts}: score ${score} — ${topIssues.slice(0, 3).join('; ')}`);
                const write = appendJobEvent(jobRef, {
                    level: 'warning',
                    code: 'generation_attempt_failed',
                    message: `Attempt ${attempt}/${maxAttempts} failed for ${bundle}: score ${score} — ${topIssues.slice(0, 3).join('; ')}`,
                    bundle,
                    phase: 'audit',
                    data: { attempt, maxAttempts, score, topIssues },
                }, {
                    currentBundle: bundle,
                    currentPhase: 'audit',
                    currentMessage: `Repairing ${bundle} attempt ${attempt}/${maxAttempts}`,
                }).catch((err) => {
                    failedEventWrites++;
                    logger.warn(`[processGenerationBundle] Attempt event write failed (non-fatal, total=${failedEventWrites}): ${err?.message ?? err}`);
                });
                pendingEventWrites.push(write);
            },
            onScenarioAccepted,
        });

        bundleTokenSummary = genResult.tokenSummary;

        for (const scenario of genResult.scenarios) {
            if (savedByCallback.has(scenario.id)) continue;
            (scenario as any).metadata = { ...scenario.metadata, generationProvenance: provenance };
            if (dryRun) {
                await jobRef.collection('pending_scenarios').doc(scenario.id).set(scenario);
                completedScenarioIds.push(scenario.id);
                completedCount++;
                logger.info(`[processGenerationBundle] Staged for review (fallback): ${scenario.id}`);
                await appendJobEvent(jobRef, {
                    level: 'success',
                    code: 'scenario_staged',
                    message: `Staged scenario "${scenario.title ?? scenario.id}" for review.`,
                    bundle,
                    phase: 'save',
                    scenarioId: scenario.id,
                    data: {
                        completedCount,
                        fallback: true,
                        ...(getScenarioAuditScore(scenario) !== undefined ? { score: getScenarioAuditScore(scenario) } : {}),
                    },
                }, {
                    currentBundle: bundle,
                    currentPhase: 'save',
                    currentMessage: `Staged ${scenario.title ?? scenario.id} for review`,
                });
            } else {
                const saved = await saveScenario(scenario as unknown as Scenario);
                if (saved.saved) {
                    completedScenarioIds.push(scenario.id);
                    completedCount++;
                    logger.info(`[processGenerationBundle] Saved (fallback): ${scenario.id} (${scenario.title})`);
                    await appendJobEvent(jobRef, {
                        level: 'success',
                        code: 'scenario_saved',
                        message: `Saved scenario "${scenario.title ?? scenario.id}".`,
                        bundle,
                        phase: 'save',
                        scenarioId: scenario.id,
                        data: {
                            completedCount,
                            fallback: true,
                            ...(getScenarioAuditScore(scenario) !== undefined ? { score: getScenarioAuditScore(scenario) } : {}),
                        },
                    }, {
                        currentBundle: bundle,
                        currentPhase: 'save',
                        currentMessage: `Saved ${scenario.title ?? scenario.id}`,
                    });
                } else {
                    errors.push({ id: scenario.id, bundle, error: saved.reason ?? 'Save rejected' });
                    failedCount++;
                    await appendJobEvent(jobRef, {
                        level: 'warning',
                        code: 'scenario_rejected',
                        message: `Rejected scenario "${scenario.title ?? scenario.id}": ${saved.reason ?? 'Save rejected'}.`,
                        bundle,
                        phase: 'save',
                        scenarioId: scenario.id,
                        data: { failedCount, fallback: true, reason: saved.reason ?? 'Save rejected' },
                    }, {
                        currentBundle: bundle,
                        currentPhase: 'save',
                        currentMessage: `Rejected ${scenario.title ?? scenario.id}`,
                    });
                }
            }
        }

        const fallbackCompletedIds = completedScenarioIds.filter(id => !savedByCallback.has(id));
        const fallbackErrors = errors.filter(e => e.id !== undefined && !erroredByCallback.has(e.id));

        // If generation ran but produced nothing (all scenarios rejected by audit),
        // record the unaccounted count as failures so jobs don't silently show 0/0.
        const totalAccountedFor = completedCount + failedCount;
        let auditRejectCount = 0;
        const pendingFailErrors: Array<{ id?: string; bundle: string; error: string }> = [...fallbackErrors];
        if (totalAccountedFor < count && genResult.scenarios.length === 0) {
            auditRejectCount = count - totalAccountedFor;
            failedCount += auditRejectCount;
            pendingFailErrors.push({ bundle, error: `${auditRejectCount} scenario(s) rejected — audit score below threshold` });
            logger.warn(`[processGenerationBundle] ${bundle}: ${auditRejectCount} scenario(s) rejected by audit, none saved`);
        }
        const pendingFailCount = fallbackErrors.length + auditRejectCount;

        await jobRef.update({
            currentPhase: 'done',
            currentMessage: `${bundle}: ${completedCount} saved, ${failedCount} failed`,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(fallbackCompletedIds.length > 0 ? {
                completedCount: admin.firestore.FieldValue.increment(fallbackCompletedIds.length),
                savedScenarioIds: admin.firestore.FieldValue.arrayUnion(...fallbackCompletedIds),
            } : {}),
            ...(pendingFailCount > 0 ? {
                failedCount: admin.firestore.FieldValue.increment(pendingFailCount),
                errors: admin.firestore.FieldValue.arrayUnion(...pendingFailErrors),
            } : {}),
            ...(failedEventWrites > 0 ? { failedEventWrites } : {}),
        });
        await appendJobEvent(jobRef, {
            level: failedCount > 0 && completedCount === 0 ? 'warning' : 'success',
            code: 'bundle_completed',
            message: `Finished ${bundle}: ${completedCount} saved, ${failedCount} failed.`,
            bundle,
            phase: 'done',
            data: {
                completedCount,
                failedCount,
                ...(failedEventWrites > 0 ? { failedEventWrites } : {}),
            },
        }, {
            currentBundle: bundle,
            currentPhase: 'done',
            currentMessage: `${bundle}: ${completedCount} saved, ${failedCount} failed`,
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
        await appendJobEvent(jobRef, {
            level: 'error',
            code: 'bundle_failed',
            message: `Failed ${bundle}: ${message}`,
            bundle,
            phase: 'generate',
        }, {
            currentBundle: bundle,
            currentPhase: 'generate',
            currentMessage: `Failed ${bundle}: ${message}`,
        });
    } finally {
        if (abortTimer !== null) clearTimeout(abortTimer);
        clearInterval(heartbeatTimer);
        removeEngineEventHandler(bundleEventHandler);
        await Promise.allSettled(pendingEventWrites);
    }

    return {
        completedCount,
        failedCount,
        scenarioIds: completedScenarioIds,
        errors,
        skipped: false,
        ...(bundleTokenSummary ? { tokenSummary: bundleTokenSummary } : {}),
    };
}

export const processGenerationBundle = onRequest({
    cors: false,
    timeoutSeconds: 540,
    memory: '1GiB',
    maxInstances: 4,
    secrets: ['GENERATION_INTAKE_SECRET', 'OPENROUTER_API_KEY', 'OPENROUTER_MANAGEMENT_KEY'],
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

    const validation = validateBundleBody(body);
    if (!validation.ok) {
        response.status(400).json({ error: validation.error });
        return;
    }

    const isDeployed = !process.env.FUNCTIONS_EMULATOR && Boolean(process.env.K_SERVICE);
    if (isDeployed && isOllamaGeneration(body.modelConfig)) {
        response.status(422).json({
            error: 'Ollama models require local execution. Route through local-gen-server instead of Cloud Functions.',
            ollamaDetected: true,
        });
        return;
    }

    const result = await executeGenerationBundle(body);
    response.status(200).json(result);
});

// ---------------------------------------------------------------------------
// updateJobProgress
// ---------------------------------------------------------------------------

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
        lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
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

    if (status === 'completed' || status === 'pending_review') {
        update.progress = 100;
        update.currentBundle = admin.firestore.FieldValue.delete();
        update.currentPhase = status;
        update.currentMessage = `Job ${status}: ${completedCount ?? 0} saved, ${failedCount ?? 0} failed`;
    }

    const jobRef = admin.firestore().collection('generation_jobs').doc(jobId);
    await jobRef.update(update);

    const event = buildJobProgressEvent(body);
    if (event) {
        await appendJobEvent(jobRef, event, {
            ...(currentBundle !== undefined ? { currentBundle } : {}),
            ...(currentPhase !== undefined ? { currentPhase } : {}),
            ...(currentMessage !== undefined ? { currentMessage } : {}),
        });
    }

    response.status(200).json({ ok: true, jobId });
});
