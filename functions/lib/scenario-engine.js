"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGenerationConfig = getGenerationConfig;
exports.getSessionCosts = getSessionCosts;
exports.resetSessionCosts = resetSessionCosts;
exports.generateScenarios = generateScenarios;
exports.callModel = callModel;
const logic_parameters_1 = require("./lib/logic-parameters");
const regions_1 = require("./data/schemas/regions");
const audit_rules_1 = require("./lib/audit-rules");
const bundleIds_1 = require("./data/schemas/bundleIds");
const prompt_performance_1 = require("./lib/prompt-performance");
const prompt_templates_1 = require("./lib/prompt-templates");
const firestore_1 = require("firebase-admin/firestore");
const model_providers_1 = require("./lib/model-providers");
const content_quality_1 = require("./lib/content-quality");
const narrative_review_1 = require("./lib/narrative-review");
const semantic_dedup_1 = require("./lib/semantic-dedup");
const grounded_effects_1 = require("./lib/grounded-effects");
// ------------------------------------------------------------------
// Model Configuration - OpenAI-only
// 
// Strategy:
//   - Architect (concepts/blueprints): GPT-4o-mini
//   - Drafter (scenarios): GPT-4o-mini
//   - Deduplication: text-embedding-3-small
// ------------------------------------------------------------------
const ARCHITECT_MODEL = process.env.ARCHITECT_MODEL || 'gpt-4o-mini';
const DRAFTER_MODEL = process.env.DRAFTER_MODEL || 'gpt-4o-mini';
// Model configurations for generation phases
// Token limits increased from 8K to accommodate complex scenarios with detailed outcomes
const ARCHITECT_CONFIG = { maxTokens: 4096, temperature: 0.6 };
// Drafter uses ~14K input + 3K output tokens; under Tier 1 rate limits concurrent
// calls regularly take 60-120s and can exceed 120s when throttled. 300s keeps the
// call alive while staying well within the Cloud Function's 540s budget.
const DRAFTER_CONFIG = { maxTokens: 10240, temperature: 0.4, timeoutMs: 300000 };
const REPAIR_MODEL = process.env.REPAIR_MODEL || 'gpt-4o-mini';
const REPAIR_CONFIG = { maxTokens: 4096, temperature: 0.3 };
let _generationConfigCache = null;
let _generationConfigFetchedAt = 0;
const GENERATION_CONFIG_TTL_MS = 5 * 60 * 1000; // 5-minute in-memory cache
async function getGenerationConfig() {
    var _a, _b, _c, _d, _e;
    const now = Date.now();
    if (_generationConfigCache && (now - _generationConfigFetchedAt) < GENERATION_CONFIG_TTL_MS) {
        return _generationConfigCache;
    }
    const admin = require('firebase-admin');
    if (!admin.apps.length)
        admin.initializeApp();
    const snap = await admin.firestore().doc('world_state/generation_config').get();
    if (!snap.exists) {
        throw new Error('[ScenarioEngine] world_state/generation_config not found in Firestore. Run the seed script.');
    }
    const raw = snap.data();
    _generationConfigCache = Object.assign(Object.assign({}, raw), { llm_repair_enabled: (_a = raw.llm_repair_enabled) !== null && _a !== void 0 ? _a : true, content_quality_gate_enabled: (_b = raw.content_quality_gate_enabled) !== null && _b !== void 0 ? _b : false, narrative_review_enabled: (_c = raw.narrative_review_enabled) !== null && _c !== void 0 ? _c : false, max_llm_repair_attempts: (_d = raw.max_llm_repair_attempts) !== null && _d !== void 0 ? _d : 3, max_active_scenarios_per_bundle: (_e = raw.max_active_scenarios_per_bundle) !== null && _e !== void 0 ? _e : 500 });
    _generationConfigFetchedAt = now;
    return _generationConfigCache;
}
let sessionCosts = {
    openai: { input_tokens: 0, output_tokens: 0, cost_usd: 0 },
    total_usd: 0
};
function getSessionCosts() {
    return Object.assign({}, sessionCosts);
}
function resetSessionCosts() {
    sessionCosts = {
        openai: { input_tokens: 0, output_tokens: 0, cost_usd: 0 },
        total_usd: 0
    };
}
// ------------------------------------------------------------------
// Countries data cache — shared across context helpers
// ------------------------------------------------------------------
let _countriesDataCache = null;
let _countriesDataFetchedAt = 0;
const COUNTRIES_DATA_TTL_MS = 5 * 60 * 1000;
async function loadCountriesData() {
    const now = Date.now();
    if (_countriesDataCache && (now - _countriesDataFetchedAt) < COUNTRIES_DATA_TTL_MS) {
        return _countriesDataCache;
    }
    const admin = require('firebase-admin');
    if (!admin.apps.length)
        admin.initializeApp();
    const db = admin.firestore();
    const snap = await db.collection('countries').get();
    if (!snap.empty) {
        const result = {};
        snap.forEach((doc) => { result[doc.id] = doc.data(); });
        _countriesDataCache = result;
    }
    else {
        console.error('[scenario-engine] countries/ collection is empty — aborting');
        throw new Error('[scenario-engine] countries/ collection is empty');
    }
    _countriesDataFetchedAt = now;
    return _countriesDataCache;
}
// ------------------------------------------------------------------
// Country context for prompt enrichment (economic scale, geography, proportionality)
// ------------------------------------------------------------------
async function getCountryContextBlock(applicableCountryIds) {
    var _a, _b, _c, _d, _e;
    if (!(applicableCountryIds === null || applicableCountryIds === void 0 ? void 0 : applicableCountryIds.length)) {
        return `
UNIVERSAL SCENARIO: This scenario must work for countries of ANY size, from micro island states to major powers. Use relative terms ("a significant portion of GDP", "thousands of workers", "major fiscal impact") rather than hard-coded dollar amounts. Use the tokens {economic_scale}, {gdp_description}, {population_scale}, {geography_type}, {climate_risk} so the narrative adapts at runtime, and avoid treating {gdp_description} itself as a specific budget line item.`;
    }
    const data = await loadCountriesData();
    const normalizeGdpToMillions = (rawGdp) => {
        if (!Number.isFinite(rawGdp) || rawGdp <= 0)
            return 0;
        if (rawGdp >= 1000000000)
            return rawGdp / 1000000;
        return rawGdp;
    };
    const formatBillions = (gdpMillions) => {
        const billions = gdpMillions / 1000;
        if (!Number.isFinite(billions) || billions <= 0)
            return '0';
        const rounded = billions >= 10 ? Math.round(billions) : Math.round(billions * 10) / 10;
        return rounded.toLocaleString('en-US', { maximumFractionDigits: 1 });
    };
    let minGdpMillions = Infinity;
    let maxGdpMillions = 0;
    const allVuln = new Set();
    const allStrengths = new Set();
    const governmentCategories = new Set();
    const geoTags = new Set();
    const geographies = [];
    const regions = [];
    const govSystems = new Set();
    const unknownIds = [];
    for (const id of applicableCountryIds) {
        const c = data[id];
        if (!c) {
            unknownIds.push(id);
            continue;
        }
        if (c.region)
            regions.push(c.region);
        const gdpRaw = (_c = (_a = c.gdp) !== null && _a !== void 0 ? _a : (_b = c.economy) === null || _b === void 0 ? void 0 : _b.gdp) !== null && _c !== void 0 ? _c : 0;
        if (typeof gdpRaw === 'number') {
            const gdpMillions = normalizeGdpToMillions(gdpRaw);
            if (gdpMillions > 0) {
                minGdpMillions = Math.min(minGdpMillions, gdpMillions);
                maxGdpMillions = Math.max(maxGdpMillions, gdpMillions);
            }
        }
        const profile = c.profile;
        if (profile) {
            (profile.vulnerabilities || []).forEach((v) => allVuln.add(v));
            (profile.strengths || []).forEach((s) => allStrengths.add(s));
            if (profile.geography)
                geographies.push(profile.geography);
        }
        if (c.geopoliticalProfile) {
            const gp = c.geopoliticalProfile;
            if (gp.governmentCategory) {
                governmentCategories.add(gp.governmentCategory);
            }
            (gp.tags || []).forEach((t) => geoTags.add(t));
        }
        const leaderTitle = (_d = c.tokens) === null || _d === void 0 ? void 0 : _d.leader_title;
        const legislature = (_e = c.tokens) === null || _e === void 0 ? void 0 : _e.legislature;
        if (leaderTitle || legislature) {
            govSystems.add([leaderTitle, legislature].filter(Boolean).join(' + '));
        }
    }
    if (unknownIds.length > 0) {
        console.warn(`[ScenarioEngine] getCountryContextBlock: unrecognized country IDs [${unknownIds.join(', ')}] not found in countries collection. They will be excluded from context.`);
    }
    const uniqueRegions = [...new Set(regions)];
    const uniqueGeographies = [...new Set(geographies)];
    const regionLine = uniqueRegions.length ? `Region(s): ${uniqueRegions.join(', ')}.` : '';
    const geographyLine = uniqueGeographies.length ? `Geography: ${uniqueGeographies.join(', ')}.` : '';
    const govCategoryLine = governmentCategories.size
        ? `Government categories present: ${[...governmentCategories].join(', ')}.`
        : '';
    const geoTagsLine = geoTags.size
        ? `Geopolitical tags present across these countries: ${[...geoTags].slice(0, 16).join(', ')}.`
        : '';
    const scaleLine = minGdpMillions < Infinity
        ? `Economic scale: GDP range approximately ${formatBillions(minGdpMillions)}–${formatBillions(maxGdpMillions)} in national currency (billions).`
        : '';
    const govLine = govSystems.size ? `Government systems: ${[...govSystems].slice(0, 4).join(' / ')}.` : '';
    const vulnLine = allVuln.size ? `Key vulnerabilities: ${[...allVuln].slice(0, 8).join(', ')}.` : '';
    const strengthsLine = allStrengths.size ? `Key strengths: ${[...allStrengths].slice(0, 8).join(', ')}.` : '';
    const proportionalGuidance = (() => {
        if (maxGdpMillions <= 0)
            return '';
        const gdpBillions = maxGdpMillions / 1000;
        if (maxGdpMillions >= 5000000) {
            // Major economies ($5T+ GDP) — US, China, Japan, Germany, etc.
            return `
CRITICAL - ECONOMIC PROPORTIONALITY (MAJOR ECONOMY, GDP ~${Math.round(gdpBillions).toLocaleString()}B):
Even for the world's largest economies, corruption scandals involve millions to low billions — NOT trillions.
A scandal siphoning the entire GDP is physically impossible. Realistic corruption amounts: 0.5–3% of GDP.
For a ~$${Math.round(gdpBillions).toLocaleString()}B economy, a major scandal might involve $${Math.round(gdpBillions * 0.005).toLocaleString()}B–$${Math.round(gdpBillions * 0.03).toLocaleString()}B.
USE the token {graft_amount} for corruption/theft amounts — it auto-scales to the country's GDP.
USE the token {infrastructure_cost} for infrastructure projects or construction costs.
USE the token {disaster_cost} for natural disaster recovery or emergency response costs.
USE the token {sanctions_amount} for economic sanctions or trade embargo impacts.
USE the token {trade_value} for trade disruption amounts.
USE the token {military_budget_amount} for defense spending.
USE the token {gdp_description} ONLY to describe the overall economy (e.g., "draining resources from {gdp_description}").
NEVER treat {gdp_description} as the specific amount stolen, lost, or transferred — it resolves to the ENTIRE national GDP.`;
        }
        if (maxGdpMillions >= 500000) {
            // Large economies ($500B–$5T)
            return `
CRITICAL - ECONOMIC PROPORTIONALITY (LARGE ECONOMY, GDP ~${Math.round(gdpBillions).toLocaleString()}B):
Corruption scandals: hundreds of millions to single-digit billions. NOT tens or hundreds of billions.
For a ~$${Math.round(gdpBillions).toLocaleString()}B economy, a scandal might involve $${Math.round(gdpBillions * 0.005).toLocaleString()}B–$${Math.round(gdpBillions * 0.03).toLocaleString()}B.
USE tokens {graft_amount}, {infrastructure_cost}, {disaster_cost}, {sanctions_amount}, {trade_value}, {military_budget_amount} for specific monetary amounts.
NEVER treat {gdp_description} as a stolen/siphoned amount — it resolves to the ENTIRE national GDP.`;
        }
        if (maxGdpMillions >= 50000) {
            // Medium economies ($50B–$500B)
            return `
CRITICAL - ECONOMIC PROPORTIONALITY (MEDIUM ECONOMY, GDP ~${Math.round(gdpBillions).toLocaleString()}B):
Financial scandal amounts: tens of millions to low hundreds of millions. NOT billions.
USE tokens {graft_amount}, {infrastructure_cost}, {disaster_cost}, {trade_value} for proportional monetary references.
NEVER treat {gdp_description} as a stolen/siphoned amount — it resolves to the ENTIRE national GDP.`;
        }
        // Small/micro economies (<$50B)
        return `
CRITICAL - ECONOMIC PROPORTIONALITY (SMALL/MICRO ECONOMY, GDP ~${gdpBillions < 1 ? Math.round(maxGdpMillions).toLocaleString() + 'M' : Math.round(gdpBillions).toLocaleString() + 'B'}):
These scenarios target small or micro economies. All financial references MUST be proportional.
A "major economic shock" is on the order of millions, not billions. Do NOT reference impacts in the billions.
USE tokens {graft_amount}, {infrastructure_cost}, {disaster_cost}, {aid_amount} for proportional monetary references.
NEVER treat {gdp_description} as a stolen/siphoned amount — it resolves to the ENTIRE national GDP.`;
    })();
    return `
COUNTRY & GEOPOLITICAL CONTEXT (these scenarios target specific countries):
Target set size: ${applicableCountryIds.length} countries.
${regionLine}
${geographyLine}
${scaleLine}
${govLine}
${govCategoryLine}
${geoTagsLine}
${vulnLine}
${strengthsLine}
${proportionalGuidance}

CRITICAL GEOPOLITICAL RULES:
- Use only tokens for country/leader/institution names (e.g. {the_player_country}, {the_adversary}, {leader_title}, {legislature}, {ruling_party}).
- If any target country has an authoritarian or totalitarian governmentCategory, do NOT generate standard democratic election or coalition-politics scenarios for them.
- If any target country has tags like 'oil_exporter' or 'resources', preferentially include energy/resources-related stakes and effects.
- If any target country has tags like 'nuclear_state', use nuclear deterrence/escalation themes sparingly and realistically — no instant apocalypse.
- If any target country has tags like 'conflict_zone' or 'post_conflict', border tension, refugee flows, and security dilemmas are appropriate.

Use the tokens {economic_scale}, {gdp_description}, {population_scale}, {geography_type}, {climate_risk} so the narrative adapts to the player's country at runtime. Do NOT use actual country names in scenario text — they are substituted by tokens at runtime.`;
}
// Builds a specific, actionable country note for drafter/architect prompts.
// More informative than a generic "keep themes appropriate" sentence.
async function buildCountryNote(applicableCountryIds) {
    var _a, _b;
    if (!(applicableCountryIds === null || applicableCountryIds === void 0 ? void 0 : applicableCountryIds.length))
        return '';
    const data = await loadCountriesData();
    const found = [];
    for (const id of applicableCountryIds) {
        const c = data[id];
        if (!c)
            continue;
        found.push({
            region: c.region || '',
            geography: ((_a = c.profile) === null || _a === void 0 ? void 0 : _a.geography) || '',
            vulnerabilities: (((_b = c.profile) === null || _b === void 0 ? void 0 : _b.vulnerabilities) || []).slice(0, 3),
        });
    }
    if (!found.length)
        return '';
    const uniqueRegions = [...new Set(found.map(f => f.region).filter(Boolean))];
    const uniqueGeographies = [...new Set(found.map(f => f.geography).filter(Boolean))];
    const topVulns = [...new Set(found.flatMap(f => f.vulnerabilities))].slice(0, 4);
    const parts = [`These scenarios target ${found.length} specific countr${found.length === 1 ? 'y' : 'ies'}`];
    if (uniqueRegions.length)
        parts.push(`in ${uniqueRegions.join(' and ')}`);
    if (uniqueGeographies.length)
        parts.push(`(${uniqueGeographies.join('/')} nations)`);
    if (topVulns.length)
        parts.push(`with ${topVulns.join(', ')} as key risk factors`);
    parts.push('— ensure themes, stakes, and scale are appropriate for these nations.');
    parts.push('Never include literal country names, capitals, or abbreviations in output text; use tokens only.');
    return ' ' + parts.join(' ');
}
// ------------------------------------------------------------------
// Schemas
// ------------------------------------------------------------------
const CONCEPT_SCHEMA = {
    type: 'object',
    properties: {
        concepts: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    concept: { type: 'string' },
                    theme: { type: 'string' },
                    severity: { type: 'string', enum: ['low', 'medium', 'high', 'extreme', 'critical'] },
                    difficulty: { type: 'integer', minimum: 1, maximum: 5 }
                },
                required: ['concept', 'theme', 'severity', 'difficulty']
            }
        }
    },
    required: ['concepts']
};
const BLUEPRINT_SCHEMA = {
    type: 'object',
    properties: {
        acts: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    actIndex: { type: 'number' },
                    title: { type: 'string' },
                    summary: { type: 'string' },
                    suggestedMetrics: { type: 'array', items: { type: 'string' } }
                },
                required: ['actIndex', 'title', 'summary']
            }
        }
    },
    required: ['acts']
};
const SCENARIO_DETAILS_SCHEMA = {
    type: 'object',
    properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        options: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    text: { type: 'string' },
                    label: { type: 'string' },
                    effects: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                targetMetricId: { type: 'string' },
                                value: { type: 'number' },
                                type: { type: 'string', enum: ['delta', 'absolute'] },
                                duration: { type: 'number' },
                                probability: { type: 'number' }
                            },
                            required: ['targetMetricId', 'value', 'type', 'duration']
                        }
                    },
                    outcomeHeadline: { type: 'string' },
                    outcomeSummary: { type: 'string' },
                    outcomeContext: { type: 'string' },
                    advisorFeedback: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                roleId: {
                                    type: 'string',
                                    enum: ['role_executive', 'role_diplomacy', 'role_defense', 'role_economy', 'role_justice', 'role_health', 'role_commerce', 'role_labor', 'role_interior', 'role_energy', 'role_environment', 'role_transport', 'role_education']
                                },
                                stance: { type: 'string', enum: ['support', 'neutral', 'concerned', 'oppose'] },
                                feedback: { type: 'string' }
                            },
                            required: ['roleId', 'stance', 'feedback']
                        }
                    },
                    is_authoritarian: { type: 'boolean' },
                    moral_weight: { type: 'number', minimum: -1, maximum: 1 },
                    classification: {
                        type: 'object',
                        properties: {
                            riskLevel: { type: 'string', enum: ['safe', 'moderate', 'risky', 'dangerous'] },
                            ideology: { type: 'string', enum: ['left', 'center', 'right'] },
                            approach: { type: 'string', enum: ['diplomatic', 'economic', 'military', 'humanitarian', 'administrative'] }
                        }
                    }
                },
                required: ['id', 'text', 'label', 'effects', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext', 'advisorFeedback', 'is_authoritarian', 'moral_weight']
            }
        },
        metadata: {
            type: 'object',
            properties: {
                severity: { type: 'string', enum: ['low', 'medium', 'high', 'extreme', 'critical'] },
                urgency: { type: 'string', enum: ['low', 'medium', 'high', 'immediate'] },
                difficulty: { type: 'integer', minimum: 1, maximum: 5 },
                tags: { type: 'array', items: { type: 'string' } }
            },
            required: ['severity', 'urgency', 'difficulty']
        }
    },
    required: ['title', 'description', 'options', 'metadata']
};
async function generateScenarios(request) {
    var _a, _b, _c, _d, _e, _f;
    // Validate bundle at entry point
    if (!(0, audit_rules_1.isValidBundleId)(request.bundle)) {
        throw new Error(`Invalid bundle: ${request.bundle}. Valid bundles: ${bundleIds_1.ALL_BUNDLE_IDS.join(', ')}`);
    }
    const admin = require('firebase-admin');
    if (!admin.apps.length)
        admin.initializeApp();
    await (0, audit_rules_1.initializeAuditConfig)(admin.firestore());
    const genConfig = await getGenerationConfig();
    // Concept-level concurrency: how many concepts to expand in parallel per bundle
    // Combined with max_bundle_concurrency in background-jobs.ts:
    // Total concurrent API calls = max_bundle_concurrency × concept_concurrency
    const isLMStudio = ((_b = (_a = request.modelConfig) === null || _a === void 0 ? void 0 : _a.architectModel) === null || _b === void 0 ? void 0 : _b.startsWith('lmstudio:')) ||
        ((_d = (_c = request.modelConfig) === null || _c === void 0 ? void 0 : _c.drafterModel) === null || _d === void 0 ? void 0 : _d.startsWith('lmstudio:'));
    const CONCURRENCY = isLMStudio ? 1 : ((_e = request.concurrency) !== null && _e !== void 0 ? _e : genConfig.concept_concurrency);
    console.log(`[ScenarioEngine] Generation: Bundle=${request.bundle}, Mode=${request.mode}, Concurrency=${CONCURRENCY}${isLMStudio ? ' (LM Studio — sequential)' : ''}`);
    // Region-country consistency check: reject if applicable_countries don't match requested region
    if (request.region && ((_f = request.applicable_countries) === null || _f === void 0 ? void 0 : _f.length)) {
        const countriesData = await loadCountriesData();
        const mismatched = [];
        for (const id of request.applicable_countries) {
            const c = countriesData[id];
            if ((c === null || c === void 0 ? void 0 : c.region) && c.region !== request.region) {
                mismatched.push(`${c.name || id} (belongs to region "${c.region}", not "${request.region}")`);
            }
        }
        if (mismatched.length > 0) {
            throw new Error(`[ScenarioEngine] Region-country mismatch: requested region="${request.region}" but ` +
                `some countries belong to different regions: ${mismatched.join(', ')}. ` +
                `Either omit the region filter or use countries that match it.`);
        }
    }
    // 1. PHASE 1: Concept Seeding
    const rawConcepts = await generateConceptSeeds(request);
    const loopPlan = buildLoopLengthPlan(rawConcepts.length, request.distributionConfig);
    const concepts = rawConcepts.map((c, i) => (Object.assign(Object.assign({}, c), { desiredActs: loopPlan[i] || 3 })));
    const allProduced = [];
    let completedCount = 0;
    // 2. PHASE 2 & 3: Parallel Loop Expansion (batches of CONCURRENCY)
    const expandConcept = async (concept, idx) => {
        console.log(`[ScenarioEngine] Expanding concept ${idx + 1}/${concepts.length}: ${concept.concept}`);
        const runAttempt = async () => {
            const loop = await expandConceptToLoop(concept, request.bundle, request.mode, request);
            normalizeLoopStructure(loop);
            const validatedLoop = [];
            for (const act of loop) {
                const result = await auditAndRepair(act, request.bundle, request.mode);
                if (result.scenario)
                    validatedLoop.push(result.scenario);
            }
            // If the LLM generated more acts than requested, trim to desired length
            // (e.g. asked for 1-act but LLM returned 5 — take the first act as standalone)
            if (validatedLoop.length > concept.desiredActs) {
                console.warn(`[ScenarioEngine] Trimming loop from ${validatedLoop.length} to ${concept.desiredActs} acts`);
                validatedLoop.splice(concept.desiredActs);
                // Clear dangling consequence chains on the new last act
                const lastAct = validatedLoop[validatedLoop.length - 1];
                lastAct.consequenceScenarioIds = [];
                lastAct.phase = validatedLoop.length === 1 ? 'root' : 'final';
            }
            // Validate loop completion
            const validation = validateLoopComplete(validatedLoop, concept.desiredActs);
            if (!validation.valid) {
                console.warn(`[ScenarioEngine] Loop validation failed: ${validation.reason}`);
                return [];
            }
            console.log(`[ScenarioEngine] Loop validated successfully: ${validatedLoop.length} acts, chainId: ${validatedLoop[0].chainId}`);
            return validatedLoop;
        };
        try {
            const first = await runAttempt();
            if (first.length > 0)
                return first;
            console.warn(`[ScenarioEngine] Concept ${idx + 1} yielded no scenarios on attempt 1, retrying...`);
            return await runAttempt();
        }
        catch (err) {
            console.warn(`[ScenarioEngine] Concept ${idx + 1} attempt 1 threw, retrying:`, err);
            try {
                return await runAttempt();
            }
            catch (retryErr) {
                console.error(`[ScenarioEngine] Critical failure on concept ${idx} after retry:`, retryErr);
                return [];
            }
        }
        finally {
            completedCount++;
            if (request.onProgress) {
                await request.onProgress({ current: completedCount, total: concepts.length, stage: 'generating' });
            }
        }
    };
    // Process in parallel batches
    for (let batchStart = 0; batchStart < concepts.length; batchStart += CONCURRENCY) {
        const batch = concepts.slice(batchStart, batchStart + CONCURRENCY);
        console.log(`[ScenarioEngine] Processing batch ${Math.floor(batchStart / CONCURRENCY) + 1}/${Math.ceil(concepts.length / CONCURRENCY)} (${batch.length} concepts in parallel)`);
        const batchResults = await Promise.all(batch.map((concept, i) => expandConcept(concept, batchStart + i)));
        for (const results of batchResults) {
            allProduced.push(...results);
        }
    }
    // Derive region_tags from explicit regions or from applicable_countries
    const derivedRegionTags = (() => {
        var _a, _b;
        if ((_a = request.regions) === null || _a === void 0 ? void 0 : _a.length)
            return request.regions;
        if ((_b = request.applicable_countries) === null || _b === void 0 ? void 0 : _b.length) {
            const uniqueRegions = [...new Set(request.applicable_countries
                    .map(id => (0, regions_1.getRegionForCountry)(id))
                    .filter((r) => r !== undefined))];
            return uniqueRegions;
        }
        return [];
    })();
    // Enrich metadata on all produced scenarios before returning
    return allProduced.map(scenario => {
        var _a, _b;
        return (Object.assign(Object.assign({}, scenario), { metadata: Object.assign(Object.assign(Object.assign(Object.assign({}, scenario.metadata), { bundle: request.bundle, source: request.mode, difficulty: ((_a = scenario.metadata) === null || _a === void 0 ? void 0 : _a.difficulty) || 3 }), (((_b = request.applicable_countries) === null || _b === void 0 ? void 0 : _b.length) ? { applicable_countries: request.applicable_countries } : {})), (derivedRegionTags.length ? { region_tags: derivedRegionTags } : {})) }));
    });
}
// ------------------------------------------------------------------
// LLM Repair
// ------------------------------------------------------------------
// Rules that an LLM can reliably fix with a surgical partial-JSON patch.
// Non-fixable rules (structural defects like wrong option count, invalid metrics)
// are intentionally excluded and must trigger a full re-generation.
const LLM_FIXABLE_RULES = new Set([
    'hardcoded-gov-structure',
    'advisor-boilerplate',
    'hardcoded-the-before-token',
    'informal-tone',
    'double-space',
    'orphaned-punctuation',
    'description-length',
    'description-word-count',
    'option-text-length',
    'option-text-word-count',
    'label-quality',
    'jargon-use',
    'complex-sentence',
    'high-clause-density',
    'high-passive-voice',
    'label-complexity',
    'outcome-second-person',
    'third-person-framing',
    'short-summary',
    'invalid-role-id',
    'adjacency-token-mismatch',
    'banned-phrase',
    'hardcoded-institution-phrase',
    'hard-coded-currency',
    'short-article',
    'gdp-as-amount',
    'label-has-token',
    'title-too-short',
]);
/**
 * Attempt a surgical LLM repair of a scenario using the cheapest available model.
 * Only invoked when ALL remaining issues are within LLM_FIXABLE_RULES and
 * llm_repair_enabled is true in generation config.
 * Returns the patched scenario, or null if the repair made things worse or failed.
 */
async function llmRepairScenario(scenario, issues, bundle, isNews, baselineScore) {
    const fixableIssues = issues.filter(i => LLM_FIXABLE_RULES.has(i.rule));
    if (fixableIssues.length === 0)
        return null;
    const conceptTokenTable = logic_parameters_1.CONCEPT_TO_TOKEN_MAP
        .map(({ concept, token }) => `  - ${concept} → ${token}`)
        .join('\n');
    const issueList = fixableIssues
        .map(i => `[${i.severity}] ${i.rule}: ${i.message}`)
        .join('\n');
    // Extract only the text fields likely to need repair
    const repairTarget = {
        title: scenario.title,
        description: scenario.description,
        options: scenario.options.map(o => ({
            id: o.id,
            text: o.text,
            label: o.label,
            outcomeHeadline: o.outcomeHeadline,
            outcomeSummary: o.outcomeSummary,
            outcomeContext: o.outcomeContext,
            advisorFeedback: o.advisorFeedback,
        })),
    };
    const repairPrompt = `You are a surgical scenario text editor. Fix ONLY the specific audit issues listed below.

STRICT RULES:
1. Fix ONLY the fields mentioned in the ISSUES list.
2. Do NOT rewrite, restructure, or alter any field NOT explicitly cited.
3. Preserve ALL tokens exactly (e.g. {leader_title}, {the_adversary}, {the_player_country}).
4. Do NOT change effects, metric IDs, durations, probabilities, or any numeric data.
5. Return ONLY a partial JSON patch with the changed fields — same structure as input.
6. Do NOT wrap in markdown.

QUICK FIX REFERENCE:
- third-person-framing: "the administration" → "{leader_title}"; "the government" → "your government" (in second-person fields) or "{leader_title}'s government" (in outcome fields)
- hardcoded-the-before-token: "the {X}" → "{the_X}" (e.g. "the {adversary}" → "{the_adversary}")
- high-passive-voice: rewrite passive as active ("was directed to" → "you directed"; "was announced by" → "{leader_title} announced")
- option-text-word-count / description-length: expand to minimum — add mechanism, trade-off, and affected group
- short-summary: expand outcomeSummary/outcomeContext — add institutional reaction, market impact, or downstream effect
- title-too-short: add 1–2 specific words to reach 4 words minimum (no tokens allowed in title)
- hardcoded-institution-phrase: replace ministry name with role token (e.g. "Interior Ministry" → "{interior_role}")
- label-has-token: remove the token from the label, replace with plain text (e.g. "Blame {the_neighbor}" → "Blame the Neighbor")
- advisor-boilerplate: rewrite with concrete mechanism, affected constituency, and causal chain

CONCEPT → TOKEN MAP (government structure):
${conceptTokenTable}

ISSUES TO FIX:
${issueList}

SCENARIO (text fields only):
${JSON.stringify(repairTarget, null, 2)}

Return ONLY the changed JSON fields as a partial patch.`;
    try {
        const repairResult = await (0, model_providers_1.callModelProvider)(REPAIR_CONFIG, repairPrompt, {}, REPAIR_MODEL);
        if (!repairResult.data) {
            console.warn(`[ScenarioEngine] LLM repair returned null for ${scenario.id}`);
            return null;
        }
        const patch = repairResult.data;
        // Merge the patch back onto the scenario
        const patched = Object.assign({}, scenario);
        if (patch.title !== undefined)
            patched.title = patch.title;
        if (patch.description !== undefined)
            patched.description = patch.description;
        if (patch.options && Array.isArray(patch.options)) {
            patched.options = scenario.options.map(orig => {
                const patchedOpt = patch.options.find((p) => p.id === orig.id);
                if (!patchedOpt)
                    return orig;
                return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, orig), (patchedOpt.text !== undefined ? { text: patchedOpt.text } : {})), (patchedOpt.label !== undefined ? { label: patchedOpt.label } : {})), (patchedOpt.outcomeHeadline !== undefined ? { outcomeHeadline: patchedOpt.outcomeHeadline } : {})), (patchedOpt.outcomeSummary !== undefined ? { outcomeSummary: patchedOpt.outcomeSummary } : {})), (patchedOpt.outcomeContext !== undefined ? { outcomeContext: patchedOpt.outcomeContext } : {})), (patchedOpt.advisorFeedback !== undefined ? {
                    advisorFeedback: (() => {
                        var _a;
                        const patchedAdvisors = patchedOpt.advisorFeedback;
                        return ((_a = orig.advisorFeedback) !== null && _a !== void 0 ? _a : []).map((origAdvisor) => {
                            const replacement = patchedAdvisors.find((a) => a.roleId === origAdvisor.roleId);
                            return replacement !== null && replacement !== void 0 ? replacement : origAdvisor;
                        });
                    })(),
                } : {}));
            });
        }
        // Verify the repair improved things.
        // Compare against the full pre-repair score (not just fixable issues) so the
        // baseline matches the full re-audit score and we don't discard valid repairs.
        const reauditIssues = (0, audit_rules_1.auditScenario)(patched, bundle, isNews);
        const reauditScore = (0, audit_rules_1.scoreScenario)(reauditIssues);
        const originalScore = baselineScore !== null && baselineScore !== void 0 ? baselineScore : (0, audit_rules_1.scoreScenario)(issues);
        if (reauditScore <= originalScore) {
            console.warn(`[ScenarioEngine] LLM repair did not improve ${scenario.id} (${originalScore} → ${reauditScore}). Discarding patch.`);
            return null;
        }
        console.log(`[ScenarioEngine] LLM repair improved ${scenario.id}: score ${originalScore} → ${reauditScore} (issues: ${issues.length} → ${reauditIssues.length})`);
        return patched;
    }
    catch (err) {
        console.warn(`[ScenarioEngine] LLM repair failed for ${scenario.id}:`, err.message);
        return null;
    }
}
// ------------------------------------------------------------------
// Helpers: Generation Logic
// ------------------------------------------------------------------
async function auditAndRepair(scenario, bundle, mode) {
    const isNews = mode === 'news';
    // Substitute known hallucinated role tokens with valid equivalents before the hard gate.
    // Keys are bare token names (without braces); values are their valid replacements.
    const INVENTED_ROLE_TOKEN_MAP = {
        'culture_role': 'interior_role',
        'media_role': 'interior_role',
        'communications_role': 'interior_role',
        'security_role': 'interior_role',
        'immigration_role': 'interior_role',
        'police_role': 'interior_role',
        'intelligence_role': 'interior_role',
        'housing_role': 'labor_role',
        'welfare_role': 'labor_role',
        'social_role': 'labor_role',
        'public_health_role': 'health_role',
        'technology_role': 'commerce_role',
        'innovation_role': 'commerce_role',
        'science_role': 'commerce_role',
        'research_role': 'commerce_role',
        'budget_role': 'finance_role',
        'infrastructure_role': 'transport_role',
        'military_role': 'defense_role',
        'cyber_role': 'defense_role',
        'foreign_role': 'foreign_affairs_role',
    };
    const normalizeScenarioTokens = (target) => {
        var _a, _b, _c, _d, _e;
        const substituteText = (text) => {
            if (!text)
                return text;
            let result = text;
            for (const [bad, good] of Object.entries(INVENTED_ROLE_TOKEN_MAP)) {
                result = result.replace(new RegExp(`\\{the_${bad}\\}`, 'gi'), `{the_${good}}`);
                result = result.replace(new RegExp(`\\{${bad}\\}`, 'gi'), `{${good}}`);
            }
            return result;
        };
        target.title = (_a = substituteText(target.title)) !== null && _a !== void 0 ? _a : target.title;
        target.description = (_b = substituteText(target.description)) !== null && _b !== void 0 ? _b : target.description;
        for (const opt of target.options) {
            opt.text = (_c = substituteText(opt.text)) !== null && _c !== void 0 ? _c : opt.text;
            opt.label = (_d = substituteText(opt.label)) !== null && _d !== void 0 ? _d : opt.label;
            opt.outcomeHeadline = substituteText(opt.outcomeHeadline);
            opt.outcomeSummary = substituteText(opt.outcomeSummary);
            opt.outcomeContext = substituteText(opt.outcomeContext);
            for (const fb of ((_e = opt.advisorFeedback) !== null && _e !== void 0 ? _e : [])) {
                if (fb.feedback)
                    fb.feedback = substituteText(fb.feedback);
            }
        }
    };
    normalizeScenarioTokens(scenario);
    let issues = (0, audit_rules_1.auditScenario)(scenario, bundle, isNews);
    // 1. Initial Quality Check & Token Enforcement
    const fieldsToCheck = [scenario.description, ...scenario.options.map(o => o.text), ...scenario.options.map(o => o.outcomeSummary)];
    const hasTokens = fieldsToCheck.some(text => text && text.includes('{') && text.includes('}'));
    if (!hasTokens) {
        console.warn(`[ScenarioEngine] Scenario ${scenario.id} failed: No tokens found in content.`);
        return { scenario: null, score: 0, issues: [{ severity: 'error', rule: 'no-tokens', target: scenario.id, message: 'No tokens found in content', autoFixable: false }] };
    }
    // Token whitelist hard gate — reject invented tokens before any further processing
    const allTextContent = [
        scenario.title,
        scenario.description,
        ...scenario.options.flatMap(o => [o.text, o.label, o.outcomeHeadline, o.outcomeSummary, o.outcomeContext]),
        ...scenario.options.flatMap(o => (o.advisorFeedback || []).map((f) => f.feedback))
    ].filter(Boolean).join(' ');
    const foundTokens = [...allTextContent.matchAll(/\{([a-z_]+)\}/g)].map(m => m[1]);
    const inventedTokens = foundTokens.filter(t => !(0, logic_parameters_1.isValidToken)(t));
    if (inventedTokens.length > 0) {
        console.warn(`[ScenarioEngine] Scenario ${scenario.id} REJECTED: invented tokens [${inventedTokens.join(', ')}]`);
        return {
            scenario: null, score: 0,
            issues: inventedTokens.map(t => ({
                severity: 'error',
                rule: 'invalid-token',
                target: scenario.id,
                message: `Invented token: {${t}} is not in the approved whitelist`,
                autoFixable: false
            }))
        };
    }
    // 1.5 Grounded Effects Validation
    try {
        // Validate each option's effects against its narrative
        for (const option of scenario.options) {
            const narrativeText = [
                option.outcomeHeadline,
                option.outcomeSummary,
                option.outcomeContext
            ].filter(Boolean).join(' ');
            const groundingIssues = (0, grounded_effects_1.validateGroundedEffects)(narrativeText, option.effects || []);
            if (groundingIssues.length > 0) {
                console.warn(`[ScenarioEngine] Option ${option.id} has grounded effects mismatches:`, groundingIssues);
                // Add as warnings, not errors (non-blocking for now)
                issues.push(...groundingIssues.map(r => ({
                    severity: 'warn',
                    rule: 'grounded-effects',
                    target: `${scenario.id}/${option.id}`,
                    message: r.message,
                    autoFixable: false
                })));
            }
        }
    }
    catch (error) {
        console.warn(`[ScenarioEngine] Grounded effects validation failed (non-fatal):`, error.message);
    }
    // Always run boilerplate scrub and structural repairs regardless of audit result
    (0, audit_rules_1.heuristicFix)(scenario, [], bundle);
    if (issues.length === 0)
        return { scenario, score: 100, issues: [] };
    // 3. Apply Deterministic Fixes (Phase normalization, metric mapping, etc.)
    if (scenario.metadata) {
        if (scenario.metadata.severity)
            scenario.metadata.severity = scenario.metadata.severity.toLowerCase();
        if (scenario.metadata.urgency)
            scenario.metadata.urgency = scenario.metadata.urgency.toLowerCase();
    }
    const detResult = (0, audit_rules_1.deterministicFix)(scenario);
    if (detResult.fixed) {
        issues = (0, audit_rules_1.auditScenario)(scenario, bundle, isNews);
    }
    // 3. Apply Heuristic Fixes
    if (issues.length > 0) {
        const heurResult = (0, audit_rules_1.heuristicFix)(scenario, issues, bundle);
        if (heurResult.fixed) {
            issues = (0, audit_rules_1.auditScenario)(scenario, bundle, isNews);
        }
    }
    // 4. Grounded Effects Repair (heuristic)
    try {
        let fixedAny = false;
        for (const option of scenario.options) {
            const narrativeText = [
                option.outcomeHeadline,
                option.outcomeSummary,
                option.outcomeContext
            ].filter(Boolean).join(' ');
            const originalEffects = JSON.stringify(option.effects || []);
            option.effects = (0, grounded_effects_1.suggestEffectCorrections)(narrativeText, option.effects || []);
            if (JSON.stringify(option.effects) !== originalEffects) {
                console.log(`[ScenarioEngine] Auto-corrected grounded effects for option ${option.id}`);
                fixedAny = true;
            }
        }
        if (fixedAny) {
            issues = (0, audit_rules_1.auditScenario)(scenario, bundle, isNews);
            // Re-apply heuristic fixes since new effects may require new advisor roles
            if (issues.length > 0) {
                const heurResult2 = (0, audit_rules_1.heuristicFix)(scenario, issues, bundle);
                if (heurResult2.fixed) {
                    console.log(`[ScenarioEngine] Applied post-effects heuristic fixes: ${heurResult2.fixes.join(', ')}`);
                    issues = (0, audit_rules_1.auditScenario)(scenario, bundle, isNews);
                }
            }
        }
    }
    catch (error) {
        console.warn(`[ScenarioEngine] Grounded effects repair failed:`, error.message);
    }
    // LLM Repair — attempt a surgical patch when only LLM-fixable issues remain.
    // Skip if the scenario already meets the pass threshold — repair has shown it
    // can degrade passing scenarios, and there's nothing to gain by running it.
    const { llm_repair_enabled, audit_pass_threshold: repairThreshold } = await getGenerationConfig();
    const preRepairCurrentScore = (0, audit_rules_1.scoreScenario)(issues);
    if (llm_repair_enabled && issues.length > 0 && preRepairCurrentScore < repairThreshold) {
        const fixableIssues = issues.filter(i => LLM_FIXABLE_RULES.has(i.rule));
        if (fixableIssues.length > 0) {
            const repaired = await llmRepairScenario(scenario, fixableIssues, bundle, isNews, preRepairCurrentScore);
            if (repaired) {
                // Adopt the repaired scenario and re-audit with fresh issues
                scenario.title = repaired.title;
                scenario.description = repaired.description;
                scenario.options = repaired.options;
                issues = (0, audit_rules_1.auditScenario)(scenario, bundle, isNews);
            }
        }
    }
    const score = (0, audit_rules_1.scoreScenario)(issues);
    // Only structural defects that break gameplay or the data model block unconditionally.
    // Quality errors (voice, sentence count, currency phrasing) are already penalised by
    // the score threshold — they should not add a second hard veto on top.
    const STRUCTURAL_ERROR_RULES = new Set([
        'missing-id', 'missing-title', 'missing-desc',
        'option-count', 'no-effects', 'missing-metric-id',
        'invalid-metric-id', 'non-finite-value', 'empty-text',
        'invalid-duration', 'invalid-severity', 'invalid-urgency',
        'invalid-phase', 'invalid-countries',
    ]);
    const hasStructuralErrors = issues.some(i => i.severity === 'error' && STRUCTURAL_ERROR_RULES.has(i.rule));
    const { audit_pass_threshold, content_quality_gate_enabled } = await getGenerationConfig();
    if (score >= audit_pass_threshold && !hasStructuralErrors) {
        // Optional LLM content quality gate — enabled via world_state/generation_config.content_quality_gate_enabled
        if (content_quality_gate_enabled) {
            try {
                const qualityResult = await (0, content_quality_1.evaluateContentQuality)(scenario);
                console.log(`[ScenarioEngine] Quality gate ${scenario.id}: overall=${qualityResult.overallScore.toFixed(2)} ` +
                    `grammar=${qualityResult.grammar.score} tone=${qualityResult.tone.score} ` +
                    `coherence=${qualityResult.coherence.score} readability=${qualityResult.readability.score} pass=${qualityResult.pass}`);
                // Attach quality scores to audit metadata for monitoring
                if (scenario.metadata) {
                    scenario.metadata.contentQuality = {
                        overallScore: qualityResult.overallScore,
                        grammar: qualityResult.grammar.score,
                        tone: qualityResult.tone.score,
                        coherence: qualityResult.coherence.score,
                        readability: qualityResult.readability.score,
                        optionConsistency: qualityResult.optionConsistency.score,
                        advisorQuality: qualityResult.advisorQuality.score,
                        pass: qualityResult.pass,
                    };
                }
                // Hard fail only if overall quality is critically low (< 2.0) — avoids over-blocking on API edge cases
                if (!qualityResult.pass && qualityResult.overallScore < 2.0) {
                    console.warn(`[ScenarioEngine] Scenario ${scenario.id} rejected by content quality gate (overallScore=${qualityResult.overallScore.toFixed(2)})`);
                    return { scenario: null, score, issues: [...issues, {
                                severity: 'error',
                                rule: 'content-quality-violation',
                                target: scenario.id,
                                message: `Content quality gate failed: overall=${qualityResult.overallScore.toFixed(2)}. Issues: ${[...qualityResult.grammar.issues, ...qualityResult.tone.issues, ...qualityResult.coherence.issues, ...qualityResult.readability.issues].slice(0, 3).join('; ')}`,
                                autoFixable: false,
                            }] };
                }
            }
            catch (qErr) {
                console.warn(`[ScenarioEngine] Content quality gate error (non-fatal): ${qErr.message}`);
            }
        }
        // Narrative review gate — enabled via world_state/generation_config.narrative_review_enabled
        const { narrative_review_enabled } = await getGenerationConfig();
        if (narrative_review_enabled) {
            try {
                const narrativeResult = await (0, narrative_review_1.evaluateNarrativeQuality)(scenario);
                console.log(`[ScenarioEngine] Narrative review ${scenario.id}: overall=${narrativeResult.overallScore.toFixed(2)} ` +
                    `engagement=${narrativeResult.engagement.score} strategic=${narrativeResult.strategicDepth.score} ` +
                    `differentiation=${narrativeResult.optionDifferentiation.score} consequence=${narrativeResult.consequenceQuality.score} ` +
                    `replay=${narrativeResult.replayValue.score} pass=${narrativeResult.pass}`);
                if (scenario.metadata) {
                    scenario.metadata.narrativeReview = {
                        overallScore: narrativeResult.overallScore,
                        engagement: narrativeResult.engagement.score,
                        strategicDepth: narrativeResult.strategicDepth.score,
                        optionDifferentiation: narrativeResult.optionDifferentiation.score,
                        consequenceQuality: narrativeResult.consequenceQuality.score,
                        replayValue: narrativeResult.replayValue.score,
                        pass: narrativeResult.pass,
                        editorialNotes: narrativeResult.editorialNotes,
                    };
                }
                if (!narrativeResult.pass && narrativeResult.overallScore < 2.0) {
                    console.warn(`[ScenarioEngine] Scenario ${scenario.id} rejected by narrative review (overallScore=${narrativeResult.overallScore.toFixed(2)})`);
                    return { scenario: null, score, issues: [...issues, {
                                severity: 'error',
                                rule: 'narrative-quality-violation',
                                target: scenario.id,
                                message: `Narrative review failed: overall=${narrativeResult.overallScore.toFixed(2)}. Notes: ${narrativeResult.editorialNotes.slice(0, 2).join('; ')}`,
                                autoFixable: false,
                            }] };
                }
            }
            catch (nErr) {
                console.warn(`[ScenarioEngine] Narrative review error (non-fatal): ${nErr.message}`);
            }
        }
        return { scenario, score, issues };
    }
    console.warn(`[ScenarioEngine] Scenario ${scenario.id} failed audit (score: ${score}, hasStructuralErrors: ${hasStructuralErrors}). REJECTING. Issues:`, issues.map(i => `[${i.severity}] ${i.message}`).join(', '));
    return { scenario: null, score, issues };
}
async function generateConceptSeeds(request) {
    var _a, _b;
    let headlines = '';
    if (request.mode === 'news' && request.newsContext) {
        headlines = request.newsContext.slice(0, 30).map(n => `- ${n.title}`).join('\n');
    }
    const [architectPromptBase, countryContextBlock, countryNote] = await Promise.all([
        (0, prompt_templates_1.getArchitectPromptBase)(),
        getCountryContextBlock(request.applicable_countries),
        buildCountryNote(request.applicable_countries),
    ]);
    const prompt = `
    You are 'The Architect'. Generate ${request.count} unique scenario concepts for the '${request.bundle}' bundle.

    DIFFICULTY RATING (1-5):
    - 1 = Routine decision, low stakes, clear best option
    - 2 = Moderate complexity, some trade-offs
    - 3 = Significant dilemma, meaningful consequences either way
    - 4 = High-stakes crisis, all options have serious downsides
    - 5 = Existential threat, no good options, catastrophic potential
    Aim for a spread across difficulty levels. At least one concept should be difficulty 4-5.

    ${headlines ? `News Context (Seed Material):\n${headlines}\n\nINTEGRATION: Transform these news items into country-agnostic, tokenized concepts.` : `Theme: Focus on geopolitical strategies for '${request.bundle}'.`}
    ${request.region ? `\nTARGET REGION: ${request.region}. Generate concepts that feel relevant to this region (e.g. small island states, regional dynamics, local stakes).` : ''}
    ${countryNote}

    ${countryContextBlock}

    ${architectPromptBase}

    Return exactly ${request.count} concepts in JSON with fields: concept, theme, severity, difficulty.
  `;
    const result = await callModel(ARCHITECT_CONFIG, prompt, CONCEPT_SCHEMA, ((_a = request.modelConfig) === null || _a === void 0 ? void 0 : _a.architectModel) || ARCHITECT_MODEL);
    const concepts = (_b = result === null || result === void 0 ? void 0 : result.data) === null || _b === void 0 ? void 0 : _b.concepts;
    if (!Array.isArray(concepts) || concepts.length === 0) {
        const providerError = result === null || result === void 0 ? void 0 : result.error;
        throw new Error(`[ScenarioEngine] Architect returned no concepts for bundle=${request.bundle}. ` +
            `Provider error: ${providerError || 'empty or invalid concept payload'}`);
    }
    return concepts;
}
async function expandConceptToLoop(concept, bundle, mode, request) {
    var _a;
    // Load Firebase-managed prompts and supporting data
    const [promptVersions, goldenExamples, drafterPromptBase, reflectionPrompt, architectPromptBase, countryContextBlock, countryNote] = await Promise.all([
        (0, prompt_templates_1.getCurrentPromptVersions)(),
        getGoldenExamples(bundle, 2),
        (0, prompt_templates_1.getDrafterPromptBase)(),
        (0, prompt_templates_1.getReflectionPrompt)(),
        (0, prompt_templates_1.getArchitectPromptBase)(),
        getCountryContextBlock(request === null || request === void 0 ? void 0 : request.applicable_countries),
        buildCountryNote(request === null || request === void 0 ? void 0 : request.applicable_countries),
    ]);
    const regionNote = (request === null || request === void 0 ? void 0 : request.region) ? ` Target region: ${request.region}.` : '';
    // 1. Generate Narrative Blueprint (Architect)
    const blueprintPrompt = `
    Create a ${concept.desiredActs || 3}-act narrative blueprint for this concept: "${concept.concept}" (Severity: ${concept.severity}).
    Bundle: ${bundle}.${regionNote}${countryNote}

    ${countryContextBlock}

    CRITICAL: You must generate EXACTLY ${concept.desiredActs || 3} acts. Do not generate more or less.

    Return a sequence of acts with actIndex, title, and 1-sentence summaries.

    ${architectPromptBase}
  `;
    const blueprintAttemptId = (0, prompt_performance_1.generateAttemptId)(bundle, 'blueprint');
    const blueprintResult = await callModel(ARCHITECT_CONFIG, blueprintPrompt, BLUEPRINT_SCHEMA, ((_a = request === null || request === void 0 ? void 0 : request.modelConfig) === null || _a === void 0 ? void 0 : _a.architectModel) || ARCHITECT_MODEL);
    if (!(blueprintResult === null || blueprintResult === void 0 ? void 0 : blueprintResult.data) || !blueprintResult.data.acts) {
        await (0, prompt_performance_1.logGenerationAttempt)({
            attemptId: blueprintAttemptId,
            timestamp: firestore_1.Timestamp.now(),
            bundle,
            severity: concept.severity,
            desiredActs: concept.desiredActs || 3,
            promptVersion: promptVersions.architect,
            modelUsed: ARCHITECT_MODEL,
            phase: 'blueprint',
            success: false,
            retryCount: 0,
            failureReasons: ['Blueprint generation failed'],
        });
        throw new Error("Failed to generate blueprint");
    }
    const blueprint = blueprintResult.data;
    await (0, prompt_performance_1.logGenerationAttempt)({
        attemptId: blueprintAttemptId,
        timestamp: firestore_1.Timestamp.now(),
        bundle,
        severity: concept.severity,
        desiredActs: concept.desiredActs || 3,
        promptVersion: promptVersions.architect,
        modelUsed: ARCHITECT_MODEL,
        phase: 'blueprint',
        success: true,
        retryCount: 0,
    });
    const baseId = `gen_${bundle}_${Date.now().toString(36)}`;
    const blueprintSummary = blueprint.acts.map((a) => `Act ${a.actIndex}: ${a.title}`).join(' -> ');
    const MAX_RETRIES = Math.max(1, (await getGenerationConfig()).max_llm_repair_attempts);
    const allExpectedIds = blueprint.acts.map((a) => `${baseId}_act${a.actIndex}`);
    // 2. Draft All Acts in Parallel (Drafter)
    // allSettled so a single failing act doesn't discard in-flight sibling API calls
    const actSettled = await Promise.allSettled(blueprint.acts.map(async (actPlan) => {
        var _a, _b;
        let actScenario = null;
        let lastAuditResult = null;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const attemptId = (0, prompt_performance_1.generateAttemptId)(bundle, `act${actPlan.actIndex}`);
            // Build prompt with guard rails first (prevention before writing — reduce token waste)
            let drafterPrompt = `
      **OUTPUT GUARD RAILS (comply first)**:
      description = 2–3 sentences. Each option text = 2–3 sentences. Each option: 2, 3, or 4 effects only — not 5 or more. title = 4–8 words, no tokens in title.

      Act ${actPlan.actIndex}/${blueprint.acts.length}: "${actPlan.title}"
      Concept: "${concept.concept}"
      Full Loop Arc: ${blueprintSummary}
      Act Summary: ${actPlan.summary}
      Difficulty: ${concept.difficulty || 3}/5 (1=routine, 5=existential crisis)
      ${regionNote}${countryNote}

      ${countryContextBlock}

      ${(0, logic_parameters_1.getLogicParametersPrompt)(concept.severity)}
      ${(0, audit_rules_1.getAuditRulesPrompt)()}

      METADATA REQUIREMENTS:
      - severity: must be one of 'low', 'medium', 'high', 'extreme', 'critical'
      - urgency: must be one of 'low', 'medium', 'high', 'immediate'
      - difficulty: integer 1-5 matching concept difficulty (${concept.difficulty || 3})
      - tags: 2-4 relevant tags for this scenario

      ${drafterPromptBase}
      
      # ⚠️ CRITICAL FINAL REMINDER ⚠️

      **SENTENCE COUNT**: description = 2–3 sentences. Each option text = 2–3 sentences. Count . ? ! — fewer than 2 or more than 3 = REJECTED.

      **EFFECT COUNT**: Each option = 2–4 effects only. Five or more on any option = REJECTED.

      **VOICE (WRONG VOICE = REJECTED)**:
      - description, option text, advisorFeedback → SECOND PERSON: "You face...", "Your administration..."
      - outcomeHeadline, outcomeSummary, outcomeContext → THIRD PERSON (newspaper): "The administration...", "Officials announced..."
      - NEVER "you"/"your" in any outcome field. NEVER "the administration"/"the government" in description or option text.

      **DESCRIPTION**: End with stakes/urgency. NEVER preview the options or write "You must choose/decide between...".
      `;
            // Add failure-specific guidance on retry
            if (attempt > 0 && lastAuditResult) {
                const failureCategory = (0, prompt_performance_1.categorizeFailure)(lastAuditResult.issues);
                drafterPrompt += `\n\n# CRITICAL: PREVIOUS ATTEMPT FAILED (Score: ${lastAuditResult.score})\n`;
                if (failureCategory === 'token-violation') {
                    const hasNoTokens = lastAuditResult.issues.some((i) => i.rule === 'no-tokens');
                    if (hasNoTokens) {
                        drafterPrompt += `\n**CRITICAL: YOUR SCENARIO HAD NO TOKENS AT ALL**. Every scenario MUST reference government/country tokens. Replace hardcoded names and roles with approved token placeholders:\n  - Country name → {the_player_country} or {the_adversary}\n  - Leader → {leader_title}\n  - Minister → {finance_role}, {defense_role}, {foreign_affairs_role}, etc.\n  - Institutions → {legislature}, {ruling_party}, {judiciary_body}\nAt minimum, every description and every option text MUST contain at least one {token}.\n`;
                    }
                    else {
                        drafterPrompt += `\n**TOKEN VIOLATION**: You used incorrect tokens or casing. Use only allowed tokens and ensure they are ALL LOWERCASE (e.g., {finance_role}).\n`;
                    }
                }
                else if (failureCategory === 'readability-violation') {
                    drafterPrompt += `\n**READABILITY FAILURE**: Rewrite for non-expert players.
- Replace policy jargon with simple words.
- Keep every sentence at 25 words or fewer.
- Keep each sentence to at most 3 conjunction clauses.
- Prefer active voice over passive voice.
- Make labels short direct actions (no "if", "unless", colons, or parentheses).\n`;
                }
                else if (failureCategory === 'adjacency-token-violation') {
                    drafterPrompt += `\n**ADJACENCY TOKEN ERROR**: You used border/neighbor language ("bordering", "neighboring", "border closure", "shared border") with a non-adjacent-country token like {the_adversary} or {the_rival}. These tokens do NOT imply geographic proximity.\n- For a neighboring country: use {the_neighbor} or {the_border_rival}\n- For a non-adjacent rival or adversary: use {the_adversary} or {the_rival}\n- ONLY use border/neighboring/bordering language when combined with {the_neighbor} or {the_border_rival}\nRewrite any sentence mentioning borders or shared frontiers to use the correct token.\n`;
                }
                else if (failureCategory === 'banned-phrase-violation') {
                    drafterPrompt += `\n**BANNED PHRASE ERROR**: Your description or options contained prohibited terms like real country names (e.g. United States) or directional borders. Use only tokens ({the_player_country}, {the_adversary}) and generic terms.\n`;
                }
                else if (failureCategory === 'tonal-violation') {
                    drafterPrompt += `\n**UNPROFESSIONAL TONE**: Your writing style was too casual or blog-like. Use formal, measured, authoritative PRESIDENTIAL BRIEFING style. Avoid: "really bad", "freaking out", "kind of".\n`;
                }
                else if (failureCategory === 'option-preview-violation') {
                    drafterPrompt += `\n**DESCRIPTION ERROR**: You revealed the options too early in the description. The description should establish the crisis/stakes and end with urgency, but NEVER say "You must choose..." or "Your options are...".\n`;
                }
                else if (failureCategory === 'sentence-length-violation') {
                    drafterPrompt += `\n**SENTENCE COUNT ERROR**: DESCRIPTION must be 2–3 sentences (count . ! ?). Each OPTION text must be 2–3 sentences. Do NOT write 1 sentence or more than 3 sentences for description or option text.\n`;
                }
                else if (failureCategory === 'effect-count-violation') {
                    drafterPrompt += `\n**EFFECT COUNT ERROR**: Each option must have 2–4 effects. You used more than 4 on at least one option. Remove or merge effects so every option has exactly 2, 3, or 4 effects.\n`;
                }
                else if (failureCategory === 'shallow-content') {
                    drafterPrompt += `\n**CONTENT TOO SHALLOW**: Add more depth and detail to outcome summaries and context. Keep description and option text to exactly 2 sentences each.\n`;
                }
                else if (failureCategory === 'inverse-metric-confusion') {
                    drafterPrompt += `\n**YOU MISHANDLED INVERSE METRICS**. Remember: POSITIVE values WORSEN corruption/inflation/crime/bureaucracy.\n`;
                }
                else if (failureCategory === 'missing-advisor-feedback') {
                    const missingRoles = [...new Set(lastAuditResult.issues
                            .filter((i) => i.rule === 'missing-role-feedback')
                            .map((i) => {
                            var _a;
                            const m = (_a = i.message) === null || _a === void 0 ? void 0 : _a.match(/Missing feedback for (\S+)/);
                            return m === null || m === void 0 ? void 0 : m[1];
                        })
                            .filter(Boolean))];
                    const rolesList = missingRoles.length > 0
                        ? `These exact roles are REQUIRED and were missing: ${missingRoles.join(', ')}. Add advisorFeedback entries with those roleIds.`
                        : 'Include role_executive + all roles affected by the option\'s effects.';
                    drafterPrompt += `\n**YOU FORGOT ADVISOR FEEDBACK**. ${rolesList} Each feedback must name the specific policy from this scenario.\n`;
                }
                else if (failureCategory === 'advisor-boilerplate') {
                    drafterPrompt += `\n**ADVISOR FEEDBACK WAS REJECTED AS BOILERPLATE**. Your feedback was generic template text, not specific to this scenario. EVERY feedback sentence must:
1. Name the SPECIFIC policy action from this option (e.g., "the proposed grain reserve release")
2. Identify the affected constituency (e.g., "smallholder farmers", "border communities")
3. State the causal mechanism (e.g., "reduces export revenue by ~8% but stabilizes domestic supply")

DO NOT USE: "aligns with our priorities", "supports this course of action", "warrants careful monitoring", "our department", "no strong position", "limited direct impact".

Write as if you are a real cabinet minister briefing the head of government on THIS specific decision.\n`;
                }
                else if (failureCategory === 'hardcoded-gov-structure') {
                    drafterPrompt += `\n**HARDCODED GOVERNMENT STRUCTURE DETECTED**: You used parliamentary or government-structure terms that are not valid for all countries. Use tokens instead:\n`;
                    drafterPrompt += logic_parameters_1.CONCEPT_TO_TOKEN_MAP
                        .slice(0, 8)
                        .map(({ concept, token }) => `  - ${concept} → ${token}`)
                        .join('\n');
                    drafterPrompt += `\n\nNEVER write: "ruling coalition", "governing coalition", "coalition government", "parliamentary majority/minority/support". Use {ruling_party} and {legislature} tokens instead.\n`;
                    drafterPrompt += `\nALSO: Never write hardcoded institution names. Use role tokens:\n- "Finance Ministry" / "Treasury Department" → {finance_role}\n- "Justice Ministry" / "Dept of Justice" → {justice_role}\n- "Foreign Ministry" / "State Department" → {foreign_affairs_role}\n- "Defense Ministry" / "Dept of Defense" → {defense_role}\n- "Interior Ministry" / "Home Office" → {interior_role}\n- "Health Ministry" / "Dept of Health" → {health_role}\n- "Education Ministry" / "Dept of Education" → {education_role}\n`;
                }
                else if (failureCategory === 'token-article-form-violation') {
                    drafterPrompt += `\n**TOKEN ARTICLE FORM ERROR**: You wrote "the {token}" which produces broken output like "the a hostile power" at runtime. RULES:
1. NEVER write "the {something}" — use the pre-built article-form token {the_something} instead.
   ❌ "the {adversary}" → ✅ "{the_adversary}"
   ❌ "the {neighbor}" → ✅ "{the_neighbor}"
   ❌ "the {ally}" → ✅ "{the_ally}"
   Valid the_{x} tokens: {the_adversary}, {the_neighbor}, {the_ally}, {the_rival}, {the_neutral}, {the_partner}, {the_trade_partner}, {the_border_rival}, {the_regional_rival}, {the_nation}, {the_player_country}
   If no the_{x} form exists, rewrite the sentence without a definite article before the token.
2. Option LABELS must be plain text — NO tokens. "Blame {the_neighbor}" → "Blame the Neighbor"\n`;
                }
                else if (failureCategory === 'gdp-as-amount-violation') {
                    drafterPrompt += `\n**GDP DESCRIPTION MISUSE**: You used {gdp_description} as if it were a specific stolen or siphoned amount. {gdp_description} resolves to the ENTIRE national GDP — it is a scale descriptor, not a stealable sum. Replace any reference to stealing/siphoning/diverting {gdp_description} with the token {graft_amount}, which auto-scales to a realistic corruption amount for this country's economy.\n`;
                }
                else if (failureCategory === 'outcome-voice-violation' || failureCategory === 'framing-violation') {
                    // Both voice violations can co-occur — inject guidance for each one present
                    const issueRules = new Set(lastAuditResult.issues.map((i) => i.rule));
                    if (issueRules.has('outcome-second-person') || failureCategory === 'outcome-voice-violation') {
                        drafterPrompt += `\n**OUTCOME FIELD VOICE ERROR**: Your outcomeHeadline, outcomeSummary, or outcomeContext contained "you" or "your". These three fields are displayed as NEWSPAPER ARTICLES — they must be written in THIRD PERSON, past tense, as a wire reporter covering the decision.
- ❌ "Your administration increased fossil fuel production..." → ✅ "The administration increased fossil fuel production..."
- ❌ "You opted to raise tariffs..." → ✅ "The executive branch opted to raise tariffs..."
- ❌ "Your decision has raised alarms..." → ✅ "The decision has raised alarms..."
Never use "you" or "your" in outcomeHeadline, outcomeSummary, or outcomeContext. Rewrite every sentence from a reporter's perspective.\n`;
                    }
                    if (issueRules.has('third-person-framing') || failureCategory === 'framing-violation') {
                        drafterPrompt += `\n**FRAMING VIOLATION**: Your description or option text used "the government", "the administration", "the president", or "the executive" — these must be rewritten using second-person ("you", "your administration", "your government"). The player IS the government. Refer to them directly with "you"/"your" in description and option text fields.\n`;
                    }
                }
                drafterPrompt += `\nFix these issues in this attempt.\n`;
            }
            // Add few-shot examples and reflection
            drafterPrompt = (0, prompt_templates_1.buildDrafterPrompt)(drafterPrompt, goldenExamples, reflectionPrompt);
            try {
                const actResult = await callModel(DRAFTER_CONFIG, drafterPrompt, SCENARIO_DETAILS_SCHEMA, ((_a = request === null || request === void 0 ? void 0 : request.modelConfig) === null || _a === void 0 ? void 0 : _a.drafterModel) || DRAFTER_MODEL);
                const actDetails = actResult === null || actResult === void 0 ? void 0 : actResult.data;
                if (!actDetails) {
                    await (0, prompt_performance_1.logGenerationAttempt)({
                        attemptId,
                        timestamp: firestore_1.Timestamp.now(),
                        bundle,
                        severity: concept.severity,
                        desiredActs: blueprint.acts.length,
                        promptVersion: promptVersions.drafter,
                        modelUsed: DRAFTER_MODEL,
                        phase: 'details',
                        success: false,
                        retryCount: attempt,
                        failureReasons: ['Model returned null'],
                    });
                    continue;
                }
                const act = Object.assign(Object.assign({}, actDetails), { id: `${baseId}_act${actPlan.actIndex}`, phase: 'mid', actIndex: actPlan.actIndex, metadata: Object.assign(Object.assign({}, actDetails.metadata), { source: mode }) });
                // Audit the generated act
                lastAuditResult = await auditAndRepair(act, bundle, mode);
                if (lastAuditResult.scenario) {
                    // Success! Attach audit metadata so it persists to Firestore and the client
                    const wasAutoFixed = lastAuditResult.issues.length > 0;
                    actScenario = Object.assign(Object.assign({}, lastAuditResult.scenario), { metadata: Object.assign(Object.assign({}, lastAuditResult.scenario.metadata), { auditMetadata: {
                                lastAudited: new Date().toISOString(),
                                score: lastAuditResult.score,
                                issues: lastAuditResult.issues.map((i) => i.rule),
                                autoFixed: wasAutoFixed,
                            } }) });
                    await (0, prompt_performance_1.logGenerationAttempt)({
                        attemptId,
                        timestamp: firestore_1.Timestamp.now(),
                        bundle,
                        severity: concept.severity,
                        desiredActs: blueprint.acts.length,
                        promptVersion: promptVersions.drafter,
                        modelUsed: DRAFTER_MODEL,
                        phase: 'details',
                        success: true,
                        auditScore: lastAuditResult.score,
                        retryCount: attempt,
                    });
                    await (0, prompt_performance_1.updateDailySummary)(new Date().toISOString().split('T')[0], {
                        attemptId,
                        timestamp: firestore_1.Timestamp.now(),
                        bundle,
                        severity: concept.severity,
                        desiredActs: blueprint.acts.length,
                        promptVersion: promptVersions.drafter,
                        modelUsed: DRAFTER_MODEL,
                        phase: 'details',
                        success: true,
                        auditScore: lastAuditResult.score,
                        retryCount: attempt,
                    });
                    break; // Success, exit retry loop
                }
                else {
                    // Audit failed, log and retry
                    const failureCategory = (0, prompt_performance_1.categorizeFailure)(lastAuditResult.issues);
                    await (0, prompt_performance_1.logGenerationAttempt)({
                        attemptId,
                        timestamp: firestore_1.Timestamp.now(),
                        bundle,
                        severity: concept.severity,
                        desiredActs: blueprint.acts.length,
                        promptVersion: promptVersions.drafter,
                        modelUsed: DRAFTER_MODEL,
                        phase: 'details',
                        success: false,
                        auditScore: lastAuditResult.score,
                        failureReasons: lastAuditResult.issues.map(i => i.rule),
                        retryCount: attempt,
                    });
                    await (0, prompt_performance_1.logFailure)({
                        failureId: attemptId,
                        timestamp: firestore_1.Timestamp.now(),
                        bundle,
                        severity: concept.severity,
                        promptVersion: promptVersions.drafter,
                        failureCategory,
                        auditScore: lastAuditResult.score,
                        auditIssues: lastAuditResult.issues.map(i => ({
                            type: i.severity,
                            code: i.rule,
                            message: i.message,
                            impact: i.severity === 'error' ? -12 : -4,
                        })),
                        rawScenario: act,
                        attemptNumber: attempt + 1,
                    });
                    await (0, prompt_performance_1.updateDailySummary)(new Date().toISOString().split('T')[0], {
                        attemptId,
                        timestamp: firestore_1.Timestamp.now(),
                        bundle,
                        severity: concept.severity,
                        desiredActs: blueprint.acts.length,
                        promptVersion: promptVersions.drafter,
                        modelUsed: DRAFTER_MODEL,
                        phase: 'details',
                        success: false,
                        auditScore: lastAuditResult.score,
                        failureReasons: lastAuditResult.issues.map(i => i.rule),
                        retryCount: attempt,
                    });
                    console.warn(`[ScenarioEngine] Act ${actPlan.actIndex} attempt ${attempt + 1}/${MAX_RETRIES} failed (score: ${lastAuditResult.score}). Issues:`, JSON.stringify(lastAuditResult.issues, null, 2));
                    (_b = request === null || request === void 0 ? void 0 : request.onAttemptFailed) === null || _b === void 0 ? void 0 : _b.call(request, {
                        bundle,
                        attempt: attempt + 1,
                        maxAttempts: MAX_RETRIES,
                        score: lastAuditResult.score,
                        topIssues: lastAuditResult.issues.slice(0, 5).map((i) => `[${i.severity}] ${i.message}`),
                    });
                }
            }
            catch (error) {
                console.error(`[ScenarioEngine] Error generating Act ${actPlan.actIndex} attempt ${attempt + 1}:`, error);
                await (0, prompt_performance_1.logGenerationAttempt)({
                    attemptId,
                    timestamp: firestore_1.Timestamp.now(),
                    bundle,
                    severity: concept.severity,
                    desiredActs: blueprint.acts.length,
                    promptVersion: promptVersions.drafter,
                    modelUsed: DRAFTER_MODEL,
                    phase: 'details',
                    success: false,
                    retryCount: attempt,
                    failureReasons: ['Exception: ' + error.message],
                });
            }
        }
        if (!actScenario) {
            throw new Error(`Failed to generate Act ${actPlan.actIndex} after ${MAX_RETRIES} attempts`);
        }
        // Semantic deduplication check (if enabled)
        if ((0, semantic_dedup_1.isSemanticDedupEnabled)()) {
            let duplicateOf = null;
            try {
                const embeddingText = (0, semantic_dedup_1.getEmbeddingText)(actScenario);
                const embedding = await (0, semantic_dedup_1.generateEmbedding)(embeddingText);
                const similar = await (0, semantic_dedup_1.findSimilarByEmbedding)(embedding, bundle, allExpectedIds);
                if (similar) {
                    duplicateOf = similar.id;
                    console.warn(`[ScenarioEngine] Act ${actPlan.actIndex} rejected: Too similar to existing scenario ${similar.id} (similarity: ${similar.similarity.toFixed(3)})`);
                }
                else {
                    actScenario._embedding = embedding;
                    console.log(`[ScenarioEngine] Act ${actPlan.actIndex} passed semantic uniqueness check`);
                }
            }
            catch (error) {
                console.warn(`[ScenarioEngine] Semantic dedup check failed (non-fatal):`, error.message);
            }
            if (duplicateOf !== null) {
                throw new Error(`Act too similar to existing scenario (ID: ${duplicateOf})`);
            }
        }
        return actScenario;
    }));
    const loop = [];
    for (const result of actSettled) {
        if (result.status === 'fulfilled' && result.value !== null) {
            loop.push(result.value);
        }
        else if (result.status === 'rejected') {
            console.error(`[ScenarioEngine] Act failed in parallel batch:`, result.reason);
        }
    }
    return loop;
}
// ------------------------------------------------------------------
// Utility Functions
// ------------------------------------------------------------------
/**
 * Fetch golden examples for few-shot learning
 */
async function getGoldenExamples(bundle, limit = 2) {
    try {
        const admin = require('firebase-admin');
        if (!admin.apps.length) {
            admin.initializeApp();
        }
        const db = admin.firestore();
        const snapshot = await db.collection('training_scenarios')
            .where('bundle', '==', bundle)
            .where('isGolden', '==', true)
            .orderBy('auditScore', 'desc')
            .limit(limit)
            .get();
        if (snapshot.empty) {
            console.log(`[ScenarioEngine] No golden examples found for bundle: ${bundle}`);
            return [];
        }
        return snapshot.docs.map((doc) => doc.data());
    }
    catch (error) {
        console.error('[ScenarioEngine] Error fetching golden examples:', error);
        return [];
    }
}
/**
 * Legacy callModel export for backward compatibility
 * Routes through model-providers.ts OpenAI-only system
 */
async function callModel(config, prompt, schema, modelOverride) {
    // Return the full CallResult object to maintain compatibility
    // Calling code expects result.data or result.data.field patterns
    return await (0, model_providers_1.callModelProvider)(config, prompt, schema, modelOverride);
}
/**
 * Validate loop completion and structure
 * Ensures loops are complete narratives before saving
 */
function validateLoopComplete(loop, expectedLength) {
    if (loop.length === 0) {
        return { valid: false, reason: 'Empty loop' };
    }
    if (loop.length !== expectedLength) {
        return { valid: false, reason: `Incomplete loop: expected ${expectedLength} acts, got ${loop.length}` };
    }
    // Check phases
    if (loop[0].phase !== 'root') {
        return { valid: false, reason: 'First act must be phase: root' };
    }
    // Final act check (only applies if length > 1, or if we want standalone to be final)
    // Decision: 1-act loops are 'root' and pass. Longer loops must end in 'final'.
    if (loop.length > 1 && loop[loop.length - 1].phase !== 'final') {
        return { valid: false, reason: 'Last act must be phase: final' };
    }
    // Check chaining
    for (let i = 0; i < loop.length - 1; i++) {
        const act = loop[i];
        if (!act.chainsTo || act.chainsTo.length === 0) {
            return { valid: false, reason: `Act ${i + 1} missing chainsTo field` };
        }
        if (act.chainsTo[0] !== loop[i + 1].id) {
            return { valid: false, reason: `Act ${i + 1} chains to wrong scenario` };
        }
    }
    // Check consequence chains at option level
    for (let i = 0; i < loop.length - 1; i++) {
        const act = loop[i];
        for (const option of act.options) {
            if (!option.consequenceScenarioIds || option.consequenceScenarioIds.length === 0) {
                return { valid: false, reason: `Act ${i + 1} option ${option.id} missing consequenceScenarioIds` };
            }
        }
    }
    return { valid: true };
}
function normalizeLoopStructure(loop) {
    var _a, _b;
    if (loop.length === 0)
        return;
    loop.sort((a, b) => (a.actIndex || 0) - (b.actIndex || 0));
    // Generate chainId for this loop
    const chainId = ((_b = (_a = loop[0]) === null || _a === void 0 ? void 0 : _a.id) === null || _b === void 0 ? void 0 : _b.split('_act')[0]) || `chain_${Date.now().toString(36)}`;
    loop.forEach((act, idx) => {
        // Force phases
        if (idx === 0)
            act.phase = 'root';
        else if (idx === loop.length - 1)
            act.phase = 'final';
        else
            act.phase = 'mid';
        // Force actIndex consistency
        act.actIndex = idx + 1;
        // Add chainId for loop grouping
        act.chainId = chainId;
        // Force chaining at scenario level
        if (idx < loop.length - 1) {
            act.chainsTo = [loop[idx + 1].id];
        }
        else {
            act.chainsTo = [];
        }
        // Add consequence chains at option level (links options to next act)
        if (idx < loop.length - 1) {
            const nextActId = loop[idx + 1].id;
            const consequenceDelay = 2; // Default: consequence triggers 2 turns later
            act.options = act.options.map(option => (Object.assign(Object.assign({}, option), { consequenceScenarioIds: [nextActId], consequenceDelay })));
            console.log(`[LoopStructure] Act ${act.actIndex}: Wired consequence chains → ${nextActId} (delay: ${consequenceDelay})`);
        }
    });
    console.log(`[LoopStructure] Normalized ${loop.length}-act loop with chainId: ${chainId}`);
}
function buildLoopLengthPlan(count, config) {
    var _a;
    // Fixed mode: all scenarios share one act count (capped at 3)
    if ((config === null || config === void 0 ? void 0 : config.mode) === 'fixed' && (config === null || config === void 0 ? void 0 : config.loopLength)) {
        return Array(count).fill(Math.min(3, config.loopLength));
    }
    // Custom mode: weighted by explicit percentages (only 1–3 act keys used)
    if ((config === null || config === void 0 ? void 0 : config.mode) === 'custom' && (config === null || config === void 0 ? void 0 : config.customDistribution)) {
        const dist = config.customDistribution;
        const plan = [];
        const keys = ['1-act', '2-act', '3-act'];
        keys.forEach(key => {
            const percentage = dist[key] || 0;
            const amount = Math.round((percentage / 100) * count);
            const acts = parseInt(key.split('-')[0]);
            for (let i = 0; i < amount; i++)
                plan.push(acts);
        });
        while (plan.length < count)
            plan.push(1);
        return plan.slice(0, count).sort(() => Math.random() - 0.5);
    }
    // Auto mode: weighted by gameLength hint (mirrors UI presets, max 3 acts each)
    // short  = 60% 1-act, 30% 2-act, 10% 3-act
    // medium = 40% 1-act, 30% 2-act, 30% 3-act  (default)
    // long   = 20% 1-act, 20% 2-act, 60% 3-act
    const GAME_LENGTH_WEIGHTS = {
        short: [1, 1, 1, 1, 1, 1, 2, 2, 2, 3],
        medium: [1, 1, 1, 1, 2, 2, 2, 3, 3, 3],
        long: [1, 1, 2, 2, 3, 3, 3, 3, 3, 3],
    };
    const gameLength = (config === null || config === void 0 ? void 0 : config.gameLength) || 'medium';
    const weightedOptions = (_a = GAME_LENGTH_WEIGHTS[gameLength]) !== null && _a !== void 0 ? _a : GAME_LENGTH_WEIGHTS.medium;
    return Array.from({ length: count }, () => weightedOptions[Math.floor(Math.random() * weightedOptions.length)]);
}
//# sourceMappingURL=scenario-engine.js.map