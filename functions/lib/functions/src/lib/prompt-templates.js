"use strict";
/**
 * Prompt Templates — Firebase-first versioning system.
 *
 * Prompt content lives in the `prompt_templates` Firestore collection.
 * When a template is unavailable (missing or Firestore error), the system
 * falls back to local .prompt.md files in functions/src/prompts/.
 * This ensures generation can proceed even during cold-start or seed-script outages.
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
exports.getPromptTemplate = getPromptTemplate;
exports.getPromptTemplateByVersion = getPromptTemplateByVersion;
exports.savePromptTemplate = savePromptTemplate;
exports.listPromptVersions = listPromptVersions;
exports.activatePromptVersion = activatePromptVersion;
exports.getCurrentPromptVersions = getCurrentPromptVersions;
exports.getDrafterPromptBase = getDrafterPromptBase;
exports.getReflectionPrompt = getReflectionPrompt;
exports.getArchitectPromptBase = getArchitectPromptBase;
exports.getBundlePromptOverlay = getBundlePromptOverlay;
exports.getScopePromptOverlay = getScopePromptOverlay;
exports.getBundlesWithPromptOverlays = getBundlesWithPromptOverlays;
exports.buildDrafterPrompt = buildDrafterPrompt;
exports.buildArchitectPrompt = buildArchitectPrompt;
const firestore_1 = require("firebase-admin/firestore");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const token_registry_1 = require("./token-registry");
const bundleIds_1 = require("../data/schemas/bundleIds");
const BUNDLE_PROMPT_OVERLAYS = {
    economy: {
        architect: 'Center the blueprint on fiscal tradeoffs, inflation pressure, jobs, market confidence, and knock-on budget consequences.',
        drafter: 'Favor concrete economic levers such as taxes, subsidies, debt issuance, price controls, labor support, trade exposure, and central-bank tension. Make option tradeoffs legible for budget, employment, inflation, and approval. When an option raises or lowers taxes, changes spending allocations, or shifts trade policy, include policyImplications targeting the relevant fiscal/policy settings (e.g. fiscal.taxIncome, fiscal.spendingSocial, policy.tradeOpenness).',
    },
    politics: {
        architect: 'Frame the arc around legitimacy, coalition pressure, scandals, constitutional stress, electoral fallout, and elite factional conflict.',
        drafter: 'Favor political maneuvering, legitimacy management, party discipline, institutional brinkmanship, and public narrative control. Options should create visible tradeoffs between stability, democracy, liberty, and approval.',
    },
    military: {
        architect: 'Frame the conflict around escalation risk, deterrence credibility, readiness, civilian costs, alliance signaling, and strategic uncertainty.',
        drafter: 'Favor mobilization, procurement, border security, intelligence, force posture, veterans, and wartime tradeoffs. Keep consequences grounded in military readiness, public order, budget, foreign relations, and approval. When an option increases or decreases military spending or shifts defense posture, include policyImplications targeting fiscal.spendingMilitary and/or policy.defenseSpending.',
    },
    tech: {
        architect: 'Center the arc on cyber risk, AI governance, digital dependence, innovation upside, privacy costs, and infrastructure fragility.',
        drafter: 'Favor cybersecurity, platform regulation, AI deployment, digital sovereignty, surveillance, semiconductor dependence, and broadband or grid resilience. Make the tradeoffs explicit between innovation, liberty, security, and employment.',
    },
    environment: {
        architect: 'Frame the arc around climate shocks, adaptation costs, environmental regulation, resource stress, infrastructure resilience, and public backlash.',
        drafter: 'Favor natural disasters, pollution, emissions controls, land use, resilience spending, relocation, and ecological restoration. Options should force tradeoffs between environment, economy, health, infrastructure, and social stability. When an option tightens or relaxes environmental regulation, include policyImplications targeting policy.environmentalPolicy and/or policy.environmentalProtection.',
    },
    social: {
        architect: 'Center the arc on inequality, education strain, labor unrest, demographic pressure, service delivery, and social cohesion.',
        drafter: 'Favor strikes, welfare reforms, education access, housing stress, migration integration, and inequality-driven backlash. Make the consequences visible across equality, employment, housing, liberty, and approval. When an option changes social spending, healthcare access, education funding, or immigration policy, include policyImplications targeting the relevant settings (e.g. fiscal.spendingSocial, policy.healthcareAccess, policy.educationFunding, policy.immigration).',
    },
    health: {
        architect: 'Frame the arc around public-health capacity, outbreak control, medical scarcity, trust in institutions, and unequal access to care.',
        drafter: 'Favor outbreaks, hospital overload, medicine shortages, vaccine politics, mental health strain, and emergency public-health measures. Keep tradeoffs clear between health, liberty, budget, public order, and approval.',
    },
    diplomacy: {
        architect: 'Center the blueprint on alliances, sanctions, trade leverage, crisis signaling, regional credibility, and diplomatic blowback.',
        drafter: 'Favor sanctions, summit diplomacy, hostage crises, treaty leverage, recognition disputes, tariffs, aid, and alliance bargaining. Make every option expose tradeoffs in foreign relations, trade, sovereignty, military posture, and approval.',
    },
    justice: {
        architect: 'Frame the arc around judicial legitimacy, policing strain, civil liberties, sentencing choices, and the state’s response to disorder.',
        drafter: 'Favor court reform, prosecutorial discretion, prison policy, crime waves, emergency powers, and judicial independence. Make the tradeoffs visible between public order, liberty, equality, democracy, and corruption.',
    },
    corruption: {
        architect: 'Center the arc on graft networks, procurement abuse, elite impunity, anti-corruption drives, and the political cost of enforcement.',
        drafter: 'Favor bribery scandals, procurement fraud, shell companies, whistleblowers, watchdog bodies, and integrity crackdowns. Make the tradeoffs explicit between corruption, bureaucracy, economy, democracy, and approval.',
    },
    culture: {
        architect: 'Frame the arc around identity conflict, media narratives, censorship pressure, education symbolism, and social polarization.',
        drafter: 'Favor cultural heritage disputes, broadcasting rules, censorship fights, language policy, artistic backlash, and symbolic national controversies. Keep the tradeoffs clear between liberty, equality, public order, and approval.',
    },
    infrastructure: {
        architect: 'Center the arc on service reliability, maintenance backlogs, disaster resilience, logistics bottlenecks, and capital-investment tradeoffs.',
        drafter: 'Favor transit breakdowns, grid failures, water systems, ports, rail, telecoms, and public works. Make option tradeoffs explicit for infrastructure, economy, housing, environment, and budget.',
    },
    resources: {
        architect: 'Frame the arc around extraction, scarcity, energy security, water stress, export leverage, and local backlash from resource decisions.',
        drafter: 'Favor mining, drilling, water allocation, food or fuel scarcity, export controls, and commodity dependence. Make the tradeoffs legible across energy, trade, environment, sovereignty, and public order.',
    },
    dick_mode: {
        architect: 'Frame the arc around coercion, repression, fear-based control, moral compromise, and strategic cruelty while keeping the scenario politically grounded.',
        drafter: 'Favor authoritarian, censorial, and morally dark options, but keep them plausible state actions rather than cartoon villainy. Make the costs explicit in liberty, equality, democracy, foreign relations, unrest, and approval.',
    },
};
const SCOPE_PROMPT_OVERLAYS = {
    universal: {
        architect: 'Optimize for transferability. Avoid country-unique constitutional assumptions, preserve tokenized institutions, and prefer mechanisms that can plausibly occur across many states. CRITICAL: use only domestic, legislature, cabinet, or judiciary for actorPattern — never ally, adversary, border_rival, or mixed. Relationship tokens ({the_ally}, {the_adversary}, {the_border_rival}, etc.) resolve against country-specific geopolitical profiles and are prohibited in universal scenarios. Do not generate concepts that involve foreign countries, neighboring states, rival nations, or bilateral disputes — not even as generic phrases like "a neighboring country". Universal scenarios must be entirely domestic: internal governance crises, institutional disputes, economic policy dilemmas, domestic security decisions, public health emergencies, civil unrest. If a concept cannot exist without a foreign counterpart, it is not universal.',
        drafter: 'Write broadly reusable governance dilemmas grounded in domestic institutions. Reject disguised single-country assumptions, hardcoded constitutional structures, and narrow historical framing. CRITICAL: do not use any relationship tokens ({the_ally}, {the_adversary}, {the_border_rival}, {the_neighbor}, {the_rival}, {the_trade_partner}, {the_regional_rival}, {the_partner}, {the_neutral}) — these tokens depend on country-specific geopolitical data and will fail for most countries. Use domestic political actors, cabinet roles, legislature, or judiciary instead.',
    },
    regional: {
        architect: 'Optimize for regional realism. Use geography, regional alliances, migration routes, weather systems, and cross-border knock-on effects that make causal sense within the target region. Prefer plain-language news wording over think-tank jargon.',
        drafter: 'Inject region-relevant causal chains and pressure sources without hardcoding country names. Favor regional trade, border, climate, and alliance dynamics that still transfer within the same region.',
    },
    cluster: {
        architect: 'Optimize for shared-structure realism. The concept should fit multiple countries in the same cluster and be stronger than a universal prompt without becoming country-exclusive.',
        drafter: 'Use the cluster brief to produce scenarios that feel institutionally specific yet still portable across the cluster. Reject single-country assumptions unless they are justified by the cluster itself.',
    },
    exclusive: {
        architect: 'Optimize for controlled uniqueness. The concept must justify why it cannot be generalized beyond the narrow target set and must remain tokenized.',
        drafter: 'Use exclusivity sparingly. The scenario must honor the exclusivity reason, fit only the intended countries, and fail if the same idea could be expressed at cluster scope.',
    },
};
// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------
let firestoreInstance = null;
function getFirestore() {
    if (!firestoreInstance) {
        const admin = require('firebase-admin');
        if (!admin.apps.length) {
            admin.initializeApp();
        }
        firestoreInstance = admin.firestore();
    }
    return firestoreInstance;
}
// ---------------------------------------------------------------------------
// Active prompt resolution
// ---------------------------------------------------------------------------
const _templateCache = new Map();
const TEMPLATE_CACHE_TTL_MS = 0;
// ---------------------------------------------------------------------------
// Local file fallback
// ---------------------------------------------------------------------------
const LOCAL_PROMPT_MAP = {
    drafter_details: 'drafter.prompt.md',
    architect_drafter: 'architect.prompt.md',
    reflection: 'reflection.prompt.md',
};
function getLocalFallbackPrompt(templateName) {
    const fileName = LOCAL_PROMPT_MAP[templateName];
    if (!fileName)
        return null;
    // __dirname = functions/src/lib in compiled output; prompts/ is a sibling directory
    const filePath = path.join(__dirname, '..', 'prompts', fileName);
    try {
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8');
        }
    }
    catch (err) {
        console.warn(`[PromptTemplates] Could not read local fallback at ${filePath}:`, err);
    }
    return null;
}
// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
async function getPromptTemplate(name) {
    const now = Date.now();
    const cached = _templateCache.get(name);
    if (cached && (now - cached.fetchedAt) < TEMPLATE_CACHE_TTL_MS) {
        return cached.data;
    }
    try {
        const db = getFirestore();
        const snapshot = await db.collection('prompt_templates')
            .where('name', '==', name)
            .where('active', '==', true)
            .orderBy('updatedAt', 'desc')
            .limit(1)
            .get();
        if (snapshot.empty)
            return null;
        const data = snapshot.docs[0].data();
        _templateCache.set(name, { data, fetchedAt: now });
        return data;
    }
    catch (error) {
        console.error('Failed to fetch prompt template:', error);
        return null;
    }
}
async function getPromptTemplateByVersion(name, version) {
    try {
        const db = getFirestore();
        const doc = await db.collection('prompt_templates').doc(`${name}_${version}`).get();
        if (!doc.exists)
            return null;
        return doc.data();
    }
    catch (error) {
        console.error('Failed to fetch prompt template by version:', error);
        return null;
    }
}
async function savePromptTemplate(template) {
    try {
        const db = getFirestore();
        await db.collection('prompt_templates').doc(`${template.name}_${template.version}`).set(Object.assign(Object.assign({}, template), { updatedAt: firestore_1.Timestamp.now() }));
        _templateCache.delete(template.name);
    }
    catch (error) {
        console.error('Failed to save prompt template:', error);
        throw error;
    }
}
async function listPromptVersions(name) {
    try {
        const db = getFirestore();
        const snapshot = await db.collection('prompt_templates')
            .where('name', '==', name)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => doc.data());
    }
    catch (error) {
        console.error('Failed to list prompt versions:', error);
        return [];
    }
}
async function activatePromptVersion(name, version) {
    try {
        const db = getFirestore();
        await db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(db.collection('prompt_templates').where('name', '==', name));
            snapshot.docs.forEach(doc => transaction.update(doc.ref, { active: false }));
            const targetDoc = db.collection('prompt_templates').doc(`${name}_${version}`);
            transaction.update(targetDoc, { active: true, updatedAt: firestore_1.Timestamp.now() });
        });
        _templateCache.delete(name);
    }
    catch (error) {
        console.error('Failed to activate prompt version:', error);
        throw error;
    }
}
async function getCurrentPromptVersions() {
    var _a, _b, _c;
    const architectTemplate = await getPromptTemplate('architect_drafter');
    const drafterTemplate = await getPromptTemplate('drafter_details');
    const reflectionTemplate = await getPromptTemplate('reflection');
    return {
        architect: (_a = architectTemplate === null || architectTemplate === void 0 ? void 0 : architectTemplate.version) !== null && _a !== void 0 ? _a : 'unknown',
        drafter: (_b = drafterTemplate === null || drafterTemplate === void 0 ? void 0 : drafterTemplate.version) !== null && _b !== void 0 ? _b : 'unknown',
        reflection: (_c = reflectionTemplate === null || reflectionTemplate === void 0 ? void 0 : reflectionTemplate.version) !== null && _c !== void 0 ? _c : 'unknown',
    };
}
// ---------------------------------------------------------------------------
// Required prompt loaders (throw on missing active template)
// ---------------------------------------------------------------------------
/**
 * Load the active drafter prompt base from Firestore, with local file fallback.
 */
async function getDrafterPromptBase() {
    const tokenSection = (0, token_registry_1.buildTokenWhitelistPromptSection)();
    const template = await getPromptTemplate('drafter_details');
    if (template)
        return template.sections.constraints.replace('{{TOKEN_SYSTEM}}', tokenSection);
    const local = getLocalFallbackPrompt('drafter_details');
    if (local) {
        console.warn('[PromptTemplates] Using local fallback for drafter_details — seed or activate a Firestore template for production.');
        return local.replace('{{TOKEN_SYSTEM}}', tokenSection);
    }
    throw new Error('[PromptTemplates] No active "drafter_details" prompt template found in Firestore and no local fallback available. ' +
        'Run the seed script or activate a version via activatePromptVersion().');
}
/**
 * Load the active reflection prompt from Firestore, with local file fallback.
 */
async function getReflectionPrompt() {
    const template = await getPromptTemplate('reflection');
    if (template)
        return template.sections.constraints;
    const local = getLocalFallbackPrompt('reflection');
    if (local) {
        console.warn('[PromptTemplates] Using local fallback for reflection — seed or activate a Firestore template for production.');
        return local;
    }
    throw new Error('[PromptTemplates] No active "reflection" prompt template found in Firestore and no local fallback available. ' +
        'Run the seed script or activate a version via activatePromptVersion().');
}
/**
 * Load the active architect prompt from Firestore, with local file fallback.
 */
async function getArchitectPromptBase() {
    const template = await getPromptTemplate('architect_drafter');
    if (template)
        return template.sections.constraints;
    const local = getLocalFallbackPrompt('architect_drafter');
    if (local) {
        console.warn('[PromptTemplates] Using local fallback for architect_drafter — seed or activate a Firestore template for production.');
        return local;
    }
    throw new Error('[PromptTemplates] No active "architect_drafter" prompt template found in Firestore and no local fallback available. ' +
        'Run the seed script or activate a version via activatePromptVersion().');
}
function getBundlePromptOverlay(bundle) {
    return BUNDLE_PROMPT_OVERLAYS[bundle];
}
function getScopePromptOverlay(scopeTier) {
    return SCOPE_PROMPT_OVERLAYS[scopeTier];
}
function getBundlesWithPromptOverlays() {
    return bundleIds_1.ALL_BUNDLE_IDS.filter((bundleId) => Boolean(BUNDLE_PROMPT_OVERLAYS[bundleId]));
}
// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------
/**
 * Assemble the final drafter prompt with optional few-shot examples and reflection.
 */
function buildDrafterPrompt(basePrompt, fewShotExamples, reflectionPrompt, options) {
    let prompt = basePrompt;
    if (options === null || options === void 0 ? void 0 : options.lowLatencyMode) {
        prompt += '\n\n# LOW-LATENCY MODE\nReturn the smallest valid JSON that still satisfies every schema and audit requirement. Do not add extra explanation or decorative prose beyond what the fields require.\n';
        return prompt;
    }
    if (fewShotExamples && fewShotExamples.length > 0) {
        prompt += '\n\n# PERFECT EXAMPLES\n\nStudy these examples of PERFECT scenarios that meet all requirements:\n\n';
        fewShotExamples.forEach((example, idx) => {
            prompt += `## Example ${idx + 1}: ${example.title}\n\`\`\`json\n${JSON.stringify(example, null, 2)}\n\`\`\`\n\n`;
        });
        prompt += 'Your output must match this quality level and structure.\n';
    }
    if (reflectionPrompt) {
        prompt += '\n\n' + reflectionPrompt;
    }
    return prompt;
}
function buildArchitectPrompt(basePrompt, options) {
    if (!(options === null || options === void 0 ? void 0 : options.lowLatencyMode)) {
        return basePrompt;
    }
    return `# LOW-LATENCY MODE
You are The Architect for The Administration.

Return valid JSON only.

Rules:
- Write plain-language, human-readable governance dilemmas.
- Use approved tokens only for countries, leaders, institutions, alliances, and money.
- Never use literal country names, capitals, party names, or real alliance names.
- Keep each concept realistic, politically grounded, and appropriate for the requested bundle and scope.
- Make the dilemma clear, with real tradeoffs and no obvious best answer.
- Use only canonical metric IDs in primaryMetrics and secondaryMetrics.
- Keep each concept concise: 2 short sentences are enough.
- Prefer domestic actors unless scope clearly justifies foreign actors.
- Do not add explanation outside the requested JSON shape.`;
}
//# sourceMappingURL=prompt-templates.js.map