import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { callModelProvider, getPhaseModels, PHASE_CONFIGS } from './lib/model-providers';
import { isValidMetricId } from './data/schemas/metricIds';
import { applyMetricDeltasAsDecision, createInitialBackendState } from './lib/scoring-engine';
import type {
    ActionResolutionRequest,
    ActionResolutionResponse,
    ActionResolutionResult,
    MetricDelta,
    PlayerActionCategory,
    SeverityLevel,
} from './shared/action-resolution-contract';
import {
    DIPLOMATIC_DELTA_BOUNDS,
    MILITARY_DELTA_BOUNDS,
    TYG_DELTA_BOUNDS,
    ATROCITY_DELTA_BOUNDS,
} from './shared/action-resolution-contract';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';
import { resolveActionTemplate } from './lib/action-templates';

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

async function isAuthorized(req: { get(name: string): string | undefined; hostname?: string }): Promise<boolean> {
    const secret = getIntakeSecret();
    const provided = req.get('x-admin-secret') ?? readBearerToken(req.get('authorization'));
    if (secret && provided === secret) return true;
    if (process.env.FUNCTIONS_EMULATOR === 'true' && isLocalRequest(req.hostname, req.get('x-forwarded-host'))) return true;
    if (provided) {
        try {
            await getAuth().verifyIdToken(provided);
            return true;
        } catch {
            return false;
        }
    }
    return false;
}

function parseBody<T>(raw: unknown): T {
    if (typeof raw === 'string') return JSON.parse(raw) as T;
    return raw as T;
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function clampMetricDeltas(
    deltas: MetricDelta[],
    bounds: { min: number; max: number },
): MetricDelta[] {
    return deltas
        .filter((d) => isValidMetricId(d.metricId))
        .map((d) => ({
            metricId: d.metricId,
            delta: clamp(d.delta, bounds.min, bounds.max),
        }));
}

export function getSeverityMultiplier(severity?: SeverityLevel): number {
    if (severity === 'high') return 2.0;
    if (severity === 'low') return 0.5;
    return 1.0;
}

function loadLocalPrompt(): string {
    const filePath = path.join(__dirname, 'prompts', 'action-resolution.prompt.md');
    try {
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8');
        }
    } catch (err) {
        logger.warn('[ActionResolution] Could not read local prompt fallback:', err);
    }
    return '';
}

export function buildPrompt(req: ActionResolutionRequest): string {
    const basePrompt = loadLocalPrompt();

    const topMetrics = Object.entries(req.metrics)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 12)
        .map(([id, val]) => `${id}=${val.toFixed(1)}`)
        .join(', ');

    const recentStr = req.recentActions?.length
        ? `Recent actions: ${req.recentActions.join(', ')}`
        : 'No recent actions.';

    let contextBlock: string;

    if (req.actionCategory === 'trust_your_gut') {
        contextBlock = [
            `EXECUTIVE COMMAND: "${req.freeFormCommand}"`,
            '',
            `Player country: ${req.countryName} (${req.governmentCategory ?? 'unknown'})`,
            `Leader: ${req.leaderTitle ?? 'Head of State'}`,
            `Turn: ${req.turn}/${req.maxTurns}, Phase: ${req.phase}`,
            `Key metrics: ${topMetrics}`,
            recentStr,
        ].join('\n');
    } else {
        const targetProfile = [
            req.targetGovernmentCategory ? `Target government: ${req.targetGovernmentCategory}` : '',
            req.targetRegion ? `Target region: ${req.targetRegion}` : '',
            req.targetGdpTier ? `Target economic scale: ${req.targetGdpTier} economy` : '',
            req.targetGeopoliticalTags?.length ? `Target tags: ${req.targetGeopoliticalTags.slice(0, 8).join(', ')}` : '',
            req.targetVulnerabilities?.length ? `Target vulnerabilities: ${req.targetVulnerabilities.join(', ')}` : '',
            req.targetMilitaryStrength !== undefined ? `Target military strength: ${req.targetMilitaryStrength}` : '',
            req.targetCyberCapability !== undefined ? `Target cyber capability: ${req.targetCyberCapability}` : '',
            req.targetNuclearCapable ? 'Target is nuclear-capable.' : '',
            req.comparativePower ? `Power dynamic: ${req.comparativePower}` : '',
        ].filter(Boolean).join('\n');

        contextBlock = [
            `ACTION: ${req.actionType} (${req.actionCategory})`,
            req.severity ? `SEVERITY: ${req.severity}` : '',
            `TARGET: ${req.targetCountryName ?? req.targetCountryId ?? 'unknown'}`,
            `RELATIONSHIP: ${req.relationship ?? 0} (${req.relationshipType ?? 'neutral'})`,
            '',
            `Player country: ${req.countryName} (${req.governmentCategory ?? 'unknown'})`,
            `Leader: ${req.leaderTitle ?? 'Head of State'}`,
            `Turn: ${req.turn}/${req.maxTurns}, Phase: ${req.phase}`,
            `Key metrics: ${topMetrics}`,
            recentStr,
            '',
            targetProfile,
        ].filter(Boolean).join('\n');
    }

    return `${basePrompt}\n\n---\n\n## CURRENT ACTION CONTEXT\n\n${contextBlock}`;
}

const RESPONSE_SCHEMA = {
    type: 'object',
    required: ['headline', 'summary', 'context', 'metricDeltas', 'relationshipDelta', 'newsCategory', 'newsTags'],
    properties: {
        headline: { type: 'string' },
        summary: { type: 'string' },
        context: { type: 'string' },
        metricDeltas: {
            type: 'array',
            items: {
                type: 'object',
                required: ['metricId', 'delta'],
                properties: {
                    metricId: { type: 'string' },
                    delta: { type: 'number' },
                },
            },
        },
        relationshipDelta: { type: 'number' },
        targetMilitaryStrengthDelta: { type: 'number' },
        targetCyberCapabilityDelta: { type: 'number' },
        newsCategory: { type: 'string' },
        newsTags: { type: 'array', items: { type: 'string' } },
        isAtrocity: { type: 'boolean' },
    },
};

export function sanitizeResponse(
    raw: ActionResolutionResponse,
    req: ActionResolutionRequest,
): ActionResolutionResponse {
    const category = req.actionCategory;
    const isAtrocity = category === 'trust_your_gut' && raw.isAtrocity === true;

    let metricBounds: { min: number; max: number };
    let relBounds: { min: number; max: number };

    if (isAtrocity) {
        metricBounds = ATROCITY_DELTA_BOUNDS.metric;
        relBounds = ATROCITY_DELTA_BOUNDS.relationship;
    } else if (category === 'trust_your_gut') {
        metricBounds = TYG_DELTA_BOUNDS.metric;
        relBounds = TYG_DELTA_BOUNDS.relationship;
    } else if (category === 'military') {
        const sm = getSeverityMultiplier(req.severity);
        metricBounds = { min: MILITARY_DELTA_BOUNDS.metric.min * sm, max: MILITARY_DELTA_BOUNDS.metric.max };
        relBounds = { min: -50 * sm, max: 5 };
    } else {
        metricBounds = DIPLOMATIC_DELTA_BOUNDS.metric;
        relBounds = DIPLOMATIC_DELTA_BOUNDS.relationship;
    }

    const metricDeltas = clampMetricDeltas(
        Array.isArray(raw.metricDeltas) ? raw.metricDeltas : [],
        metricBounds,
    );

    const relationshipDelta = clamp(
        typeof raw.relationshipDelta === 'number' ? raw.relationshipDelta : 0,
        relBounds.min,
        relBounds.max,
    );

    let targetMilitaryStrengthDelta = 0;
    let targetCyberCapabilityDelta = 0;
    if (category === 'military') {
        const milBounds = MILITARY_DELTA_BOUNDS.targetMilitary;
        const cyberBounds = MILITARY_DELTA_BOUNDS.targetCyber;
        targetMilitaryStrengthDelta = clamp(
            typeof raw.targetMilitaryStrengthDelta === 'number' ? raw.targetMilitaryStrengthDelta : 0,
            milBounds.min, milBounds.max,
        );
        targetCyberCapabilityDelta = clamp(
            typeof raw.targetCyberCapabilityDelta === 'number' ? raw.targetCyberCapabilityDelta : 0,
            cyberBounds.min, cyberBounds.max,
        );
    }

    const resolvedState = applyMetricDeltasAsDecision(
        createInitialBackendState(req.metrics, req.turn, req.maxTurns),
        metricDeltas,
    );

    return {
        headline: typeof raw.headline === 'string' ? raw.headline.slice(0, 200) : 'Action Executed',
        summary: typeof raw.summary === 'string' ? raw.summary.slice(0, 1000) : '',
        context: typeof raw.context === 'string' ? raw.context.slice(0, 2000) : '',
        metricDeltas,
        relationshipDelta,
        targetMilitaryStrengthDelta,
        targetCyberCapabilityDelta,
        newsCategory: typeof raw.newsCategory === 'string' ? raw.newsCategory : (category === 'trust_your_gut' ? 'executive' : category),
        newsTags: Array.isArray(raw.newsTags) ? raw.newsTags.filter((t): t is string => typeof t === 'string').slice(0, 5) : [],
        isAtrocity,
        resolvedState,
    };
}

export function validateRequest(body: ActionResolutionRequest): string | null {
    if (!body.actionCategory) return 'actionCategory is required.';
    const validCategories: PlayerActionCategory[] = ['diplomatic', 'military', 'trust_your_gut'];
    if (!validCategories.includes(body.actionCategory)) return `Invalid actionCategory: ${body.actionCategory}`;
    if (!body.actionType && body.actionCategory !== 'trust_your_gut') return 'actionType is required for diplomatic/military actions.';
    if (!body.countryId || !body.countryName) return 'countryId and countryName are required.';
    if (typeof body.turn !== 'number' || body.turn < 1) return 'turn must be a positive number.';
    if (body.actionCategory === 'trust_your_gut' && !body.freeFormCommand) return 'freeFormCommand is required for trust_your_gut.';
    return null;
}

export const resolveAction = onRequest({
    cors: true,
    timeoutSeconds: 30,
    memory: '256MiB',
    minInstances: 0,
    secrets: ['GENERATION_INTAKE_SECRET', 'OPENROUTER_API_KEY', 'OPENROUTER_MANAGEMENT_KEY'],
}, async (request, response) => {
    if (request.method !== 'POST') {
        response.status(405).json({ success: false, error: 'Method not allowed' } satisfies ActionResolutionResult);
        return;
    }

    if (!(await isAuthorized(request))) {
        response.status(401).json({ success: false, error: 'Unauthorized' } satisfies ActionResolutionResult);
        return;
    }

    const body = parseBody<ActionResolutionRequest>(request.body);
    const validationError = validateRequest(body);
    if (validationError) {
        response.status(400).json({ success: false, error: validationError } satisfies ActionResolutionResult);
        return;
    }

    if (body.actionCategory !== 'trust_your_gut') {
        const templateResult = resolveActionTemplate(body);
        if (templateResult) {
            const sanitized = sanitizeResponse(templateResult, body);
            logger.info(`[ActionResolution] Template: ${body.actionType} → "${sanitized.headline}"`);
            response.status(200).json({ success: true, result: sanitized } satisfies ActionResolutionResult);
            return;
        }
    }

    try {
        const prompt = buildPrompt(body);
        const model = getPhaseModels().actionResolution;
        const config = PHASE_CONFIGS.actionResolution;

        logger.info(`[ActionResolution] ${body.actionCategory}/${body.actionType ?? 'freeform'} → ${model}`);

        const result = await callModelProvider<ActionResolutionResponse>(
            config,
            prompt,
            RESPONSE_SCHEMA,
            model,
        );

        if (!result.data) {
            logger.warn(`[ActionResolution] AI call failed: ${result.error}`);
            response.status(200).json({ success: false, error: result.error ?? 'AI generation failed', fallback: true } satisfies ActionResolutionResult);
            return;
        }

        const sanitized = sanitizeResponse(result.data, body);

        logger.info(`[ActionResolution] Success: "${sanitized.headline}" — ${sanitized.metricDeltas.length} deltas`);

        response.status(200).json({ success: true, result: sanitized } satisfies ActionResolutionResult);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[ActionResolution] Unhandled error:', error);
        response.status(200).json({ success: false, error: message, fallback: true } satisfies ActionResolutionResult);
    }
});
