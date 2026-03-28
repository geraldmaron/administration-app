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
exports.resolveAction = void 0;
exports.clamp = clamp;
exports.clampMetricDeltas = clampMetricDeltas;
exports.buildPrompt = buildPrompt;
exports.sanitizeResponse = sanitizeResponse;
exports.validateRequest = validateRequest;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const model_providers_1 = require("./lib/model-providers");
const action_resolution_contract_1 = require("../../shared/action-resolution-contract");
const auth_1 = require("firebase-admin/auth");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
async function isAuthorized(req) {
    var _a;
    const secret = getIntakeSecret();
    const provided = (_a = req.get('x-admin-secret')) !== null && _a !== void 0 ? _a : readBearerToken(req.get('authorization'));
    if (secret && provided === secret)
        return true;
    if (process.env.FUNCTIONS_EMULATOR === 'true' && isLocalRequest(req.hostname, req.get('x-forwarded-host')))
        return true;
    if (provided) {
        try {
            await (0, auth_1.getAuth)().verifyIdToken(provided);
            return true;
        }
        catch (_b) {
            return false;
        }
    }
    return false;
}
function parseBody(raw) {
    if (typeof raw === 'string')
        return JSON.parse(raw);
    return raw;
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
const VALID_METRIC_IDS = new Set([
    'metric_approval', 'metric_economy', 'metric_foreign_relations', 'metric_public_order',
    'metric_military', 'metric_health', 'metric_education', 'metric_environment',
    'metric_technology', 'metric_corruption', 'metric_inflation', 'metric_crime',
    'metric_employment', 'metric_inequality', 'metric_energy', 'metric_infrastructure',
    'metric_media_freedom', 'metric_civil_liberties', 'metric_food_security',
    'metric_housing', 'metric_digital_infrastructure',
]);
function clampMetricDeltas(deltas, bounds) {
    return deltas
        .filter((d) => VALID_METRIC_IDS.has(d.metricId))
        .map((d) => ({
        metricId: d.metricId,
        delta: clamp(d.delta, bounds.min, bounds.max),
    }));
}
function getSeverityMultiplier(severity) {
    if (severity === 'high')
        return 2.0;
    if (severity === 'low')
        return 0.5;
    return 1.0;
}
function loadLocalPrompt() {
    const filePath = path.join(__dirname, 'prompts', 'action-resolution.prompt.md');
    try {
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8');
        }
    }
    catch (err) {
        logger.warn('[ActionResolution] Could not read local prompt fallback:', err);
    }
    return '';
}
function buildPrompt(req) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const basePrompt = loadLocalPrompt();
    const topMetrics = Object.entries(req.metrics)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 12)
        .map(([id, val]) => `${id}=${val.toFixed(1)}`)
        .join(', ');
    const recentStr = ((_a = req.recentActions) === null || _a === void 0 ? void 0 : _a.length)
        ? `Recent actions: ${req.recentActions.join(', ')}`
        : 'No recent actions.';
    let contextBlock;
    if (req.actionCategory === 'trust_your_gut') {
        contextBlock = [
            `EXECUTIVE COMMAND: "${req.freeFormCommand}"`,
            '',
            `Player country: ${req.countryName} (${(_b = req.governmentCategory) !== null && _b !== void 0 ? _b : 'unknown'})`,
            `Leader: ${(_c = req.leaderTitle) !== null && _c !== void 0 ? _c : 'Head of State'}`,
            `Turn: ${req.turn}/${req.maxTurns}, Phase: ${req.phase}`,
            `Key metrics: ${topMetrics}`,
            recentStr,
        ].join('\n');
    }
    else {
        contextBlock = [
            `ACTION: ${req.actionType} (${req.actionCategory})`,
            req.severity ? `SEVERITY: ${req.severity}` : '',
            `TARGET: ${(_e = (_d = req.targetCountryName) !== null && _d !== void 0 ? _d : req.targetCountryId) !== null && _e !== void 0 ? _e : 'unknown'}`,
            `RELATIONSHIP: ${(_f = req.relationship) !== null && _f !== void 0 ? _f : 0} (${(_g = req.relationshipType) !== null && _g !== void 0 ? _g : 'neutral'})`,
            '',
            `Player country: ${req.countryName} (${(_h = req.governmentCategory) !== null && _h !== void 0 ? _h : 'unknown'})`,
            `Leader: ${(_j = req.leaderTitle) !== null && _j !== void 0 ? _j : 'Head of State'}`,
            `Turn: ${req.turn}/${req.maxTurns}, Phase: ${req.phase}`,
            `Key metrics: ${topMetrics}`,
            recentStr,
            req.targetMilitaryStrength !== undefined ? `Target military strength: ${req.targetMilitaryStrength}` : '',
            req.targetCyberCapability !== undefined ? `Target cyber capability: ${req.targetCyberCapability}` : '',
            req.targetNuclearCapable ? 'Target is nuclear-capable.' : '',
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
function sanitizeResponse(raw, req) {
    const category = req.actionCategory;
    const isAtrocity = category === 'trust_your_gut' && raw.isAtrocity === true;
    let metricBounds;
    let relBounds;
    if (isAtrocity) {
        metricBounds = action_resolution_contract_1.ATROCITY_DELTA_BOUNDS.metric;
        relBounds = action_resolution_contract_1.ATROCITY_DELTA_BOUNDS.relationship;
    }
    else if (category === 'trust_your_gut') {
        metricBounds = action_resolution_contract_1.TYG_DELTA_BOUNDS.metric;
        relBounds = action_resolution_contract_1.TYG_DELTA_BOUNDS.relationship;
    }
    else if (category === 'military') {
        const sm = getSeverityMultiplier(req.severity);
        metricBounds = { min: action_resolution_contract_1.MILITARY_DELTA_BOUNDS.metric.min * sm, max: action_resolution_contract_1.MILITARY_DELTA_BOUNDS.metric.max };
        relBounds = { min: -50 * sm, max: 5 };
    }
    else {
        metricBounds = action_resolution_contract_1.DIPLOMATIC_DELTA_BOUNDS.metric;
        relBounds = action_resolution_contract_1.DIPLOMATIC_DELTA_BOUNDS.relationship;
    }
    const metricDeltas = clampMetricDeltas(Array.isArray(raw.metricDeltas) ? raw.metricDeltas : [], metricBounds);
    const relationshipDelta = clamp(typeof raw.relationshipDelta === 'number' ? raw.relationshipDelta : 0, relBounds.min, relBounds.max);
    let targetMilitaryStrengthDelta = 0;
    let targetCyberCapabilityDelta = 0;
    if (category === 'military') {
        const milBounds = action_resolution_contract_1.MILITARY_DELTA_BOUNDS.targetMilitary;
        const cyberBounds = action_resolution_contract_1.MILITARY_DELTA_BOUNDS.targetCyber;
        targetMilitaryStrengthDelta = clamp(typeof raw.targetMilitaryStrengthDelta === 'number' ? raw.targetMilitaryStrengthDelta : 0, milBounds.min, milBounds.max);
        targetCyberCapabilityDelta = clamp(typeof raw.targetCyberCapabilityDelta === 'number' ? raw.targetCyberCapabilityDelta : 0, cyberBounds.min, cyberBounds.max);
    }
    return {
        headline: typeof raw.headline === 'string' ? raw.headline.slice(0, 200) : 'Action Executed',
        summary: typeof raw.summary === 'string' ? raw.summary.slice(0, 1000) : '',
        context: typeof raw.context === 'string' ? raw.context.slice(0, 2000) : '',
        metricDeltas,
        relationshipDelta,
        targetMilitaryStrengthDelta,
        targetCyberCapabilityDelta,
        newsCategory: typeof raw.newsCategory === 'string' ? raw.newsCategory : (category === 'trust_your_gut' ? 'executive' : category),
        newsTags: Array.isArray(raw.newsTags) ? raw.newsTags.filter((t) => typeof t === 'string').slice(0, 5) : [],
        isAtrocity,
    };
}
function validateRequest(body) {
    if (!body.actionCategory)
        return 'actionCategory is required.';
    const validCategories = ['diplomatic', 'military', 'trust_your_gut'];
    if (!validCategories.includes(body.actionCategory))
        return `Invalid actionCategory: ${body.actionCategory}`;
    if (!body.actionType && body.actionCategory !== 'trust_your_gut')
        return 'actionType is required for diplomatic/military actions.';
    if (!body.countryId || !body.countryName)
        return 'countryId and countryName are required.';
    if (typeof body.turn !== 'number' || body.turn < 1)
        return 'turn must be a positive number.';
    if (body.actionCategory === 'trust_your_gut' && !body.freeFormCommand)
        return 'freeFormCommand is required for trust_your_gut.';
    return null;
}
exports.resolveAction = (0, https_1.onRequest)({
    cors: true,
    timeoutSeconds: 30,
    memory: '256MiB',
    minInstances: 0,
    secrets: ['GENERATION_INTAKE_SECRET', 'OPENAI_API_KEY'],
}, async (request, response) => {
    var _a, _b;
    if (request.method !== 'POST') {
        response.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }
    if (!(await isAuthorized(request))) {
        response.status(401).json({ success: false, error: 'Unauthorized' });
        return;
    }
    const body = parseBody(request.body);
    const validationError = validateRequest(body);
    if (validationError) {
        response.status(400).json({ success: false, error: validationError });
        return;
    }
    try {
        const prompt = buildPrompt(body);
        const model = (0, model_providers_1.getPhaseModels)().actionResolution;
        const config = model_providers_1.PHASE_CONFIGS.actionResolution;
        logger.info(`[ActionResolution] ${body.actionCategory}/${(_a = body.actionType) !== null && _a !== void 0 ? _a : 'freeform'} → ${model}`);
        const result = await (0, model_providers_1.callModelProvider)(config, prompt, RESPONSE_SCHEMA, model);
        if (!result.data) {
            logger.warn(`[ActionResolution] AI call failed: ${result.error}`);
            response.status(200).json({ success: false, error: (_b = result.error) !== null && _b !== void 0 ? _b : 'AI generation failed', fallback: true });
            return;
        }
        const sanitized = sanitizeResponse(result.data, body);
        logger.info(`[ActionResolution] Success: "${sanitized.headline}" — ${sanitized.metricDeltas.length} deltas`);
        response.status(200).json({ success: true, result: sanitized });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[ActionResolution] Unhandled error:', error);
        response.status(200).json({ success: false, error: message, fallback: true });
    }
});
//# sourceMappingURL=action-resolution.js.map