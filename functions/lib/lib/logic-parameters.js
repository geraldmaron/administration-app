"use strict";
/**
 * Logic Parameters from logic.md
 *
 * These constraints MUST be provided to LLMs when generating scenarios
 * to ensure generated content respects the auditable game parameters.
 *
 * Metric definitions are imported from the canonical source in src/data/schemas/metricIds.ts
 * Bundle definitions are imported from the canonical source in src/data/schemas/bundleIds.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NARRATIVE_TO_METRIC_ALIGNMENT = exports.LOGIC_PARAMETERS = exports.CONCEPT_TO_TOKEN_MAP = exports.ARTICLE_FORM_TOKEN_NAMES = exports.ALL_TOKENS = exports.TEMPLATE_TOKENS = exports.ALL_METRIC_IDS = exports.VALID_METRICS = exports.isValidBundleId = exports.ALL_BUNDLE_IDS = exports.BUNDLE_IDS = exports.METRIC_IDS = void 0;
exports.getLogicParametersPrompt = getLogicParametersPrompt;
exports.isValidMetric = isValidMetric;
exports.isInverseMetric = isInverseMetric;
exports.isValidToken = isValidToken;
const metricIds_1 = require("../data/schemas/metricIds");
var metricIds_2 = require("../data/schemas/metricIds");
Object.defineProperty(exports, "METRIC_IDS", { enumerable: true, get: function () { return metricIds_2.METRIC_IDS; } });
var bundleIds_1 = require("../data/schemas/bundleIds");
Object.defineProperty(exports, "BUNDLE_IDS", { enumerable: true, get: function () { return bundleIds_1.BUNDLE_IDS; } });
Object.defineProperty(exports, "ALL_BUNDLE_IDS", { enumerable: true, get: function () { return bundleIds_1.ALL_BUNDLE_IDS; } });
Object.defineProperty(exports, "isValidBundleId", { enumerable: true, get: function () { return bundleIds_1.isValidBundleId; } });
/**
 * Valid Metric IDs grouped by category (derived from canonical source)
 */
exports.VALID_METRICS = {
    core: metricIds_1.CORE_METRIC_IDS.concat(metricIds_1.METRIC_IDS.APPROVAL),
    inverse: metricIds_1.INVERSE_METRIC_IDS,
    fiscal: metricIds_1.FISCAL_METRIC_IDS,
    hidden: metricIds_1.HIDDEN_METRIC_IDS,
};
/**
 * All valid metric IDs as a flat set (derived from canonical source)
 */
exports.ALL_METRIC_IDS = new Set(metricIds_1.ALL_METRIC_IDS);
/**
 * Template Tokens (Section 4.1, 4.4)
 * Placeholders that resolve to country-specific values at runtime
 *
 * All scenarios should use these tokens rather than hardcoded role names.
 * For example, use {finance_role} instead of "Secretary of the Treasury"
 * so scenarios work correctly for any country.
 */
exports.TEMPLATE_TOKENS = {
    // Executive Branch
    executive: [
        'leader_title', // President, Prime Minister, Chancellor
        'vice_leader', // Vice President, Deputy PM
        'head_of_state_title', // Head of State title (may differ from {leader_title} in parliamentary systems)
    ],
    // Legislative Branch
    legislative: [
        'legislature', // Congress, Parliament, National Diet
        'upper_house', // Senate, House of Lords
        'lower_house', // House of Representatives, House of Commons
        'ruling_party', // The party in power
        'opposition_party', // Main opposition party / bloc in parliament
        'legislature_speaker', // Speaker of the house / presiding officer
        'upper_house_leader', // President of the Senate, Lord Speaker
        'opposition_leader', // Leader of the opposition
    ],
    // Judicial Branch (use role-based tokens only)
    judicial: [
        'judicial_role', // Supreme Court, Constitutional Court (role-based)
        'chief_justice_role', // Chief Justice (role-based)
        'prosecutor_role', // Prosecutor General (role-based)
    ],
    // Cabinet Ministers (functional roles)
    ministers: [
        'finance_role', // Secretary of Treasury, Chancellor of Exchequer
        'defense_role', // Secretary of Defense, Defence Secretary
        'interior_role', // Secretary of Homeland Security, Home Secretary
        'foreign_affairs_role', // Secretary of State, Foreign Secretary
        'justice_role', // Attorney General, Justice Minister
        'health_role', // Secretary of HHS, Health Secretary
        'education_role', // Secretary of Education, Education Secretary
        'commerce_role', // Secretary of Commerce, Business Secretary
        'labor_role', // Secretary of Labor, Work Secretary
        'energy_role', // Secretary of Energy, Energy Secretary
        'environment_role', // EPA Administrator, Environment Secretary
        'transport_role', // Secretary of Transportation, Transport Secretary
        'agriculture_role', // Secretary of Agriculture, DEFRA Secretary
    ],
    // Intelligence & Security
    security: [
        'intelligence_agency', // CIA, MI6, Mossad, FSB
        'domestic_intelligence', // FBI, MI5, BfV
        'security_council', // NSC, COBRA
        'police_force', // National Police / police service
    ],
    // Military
    military: [
        'military_general', // General, Field Marshal
        'military_branch', // Armed Forces, Defense Forces
        'special_forces', // Special Operations, SAS
        'naval_commander', // Admiral
        'air_commander', // Air Marshal
        'military_capability', // Standard military power token
        'army_name', // Name of the national army (e.g., "United States Army")
        'naval_fleet', // Name of the naval fleet (e.g., "Royal Navy")
        'air_wing', // Name of the air force wing (e.g., "Royal Air Force")
        'cyber_agency', // Name of the cyber/signals intelligence agency
        'nuclear_command', // Name of the nuclear command authority
        'coalition_name', // Name of a military coalition or alliance
        'armed_forces_name', // Full formal name of all armed forces
        'military_chief_title', // Title of the top military commander (e.g., "Chief of Defence Staff")
        'army_branch', // Localised name for the ground forces branch
        'navy_branch', // Localised name for the maritime branch
        'air_branch', // Localised name for the air force branch
        'marine_branch', // Localised name for the marines branch
        'space_branch', // Localised name for the space force branch
        'paramilitary_branch', // Localised name for the paramilitary / internal security force
    ],
    // Economic Institutions
    economic: [
        'central_bank', // Federal Reserve, Bank of England
        'currency', // dollar, pound, euro
        'stock_exchange', // NYSE, LSE
        'sovereign_fund', // Sovereign Wealth Fund
        'state_enterprise', // State-owned enterprise
        'commodity_name', // Primary export
        'main_export', // Primary export
        'main_import', // Primary import
        'major_industry', // Dominant economic sector (oil, tourism, manufacturing, tech)
    ],
    // Local Government
    local: [
        'capital_mayor', // Mayor, Lord Mayor
        'regional_governor', // Governor, Premier
        'provincial_leader', // Governor, Minister-President
        'capital_city' // Name of the capital
    ],
    // Civil Service
    civil: [
        'cabinet_secretary', // Chief of Staff, Cabinet Secretary
        'senior_official', // Permanent Secretary, Director General
    ],
    // Media & Communications
    media: [
        'state_media', // Public Broadcaster, National News
        'press_secretary', // Press Secretary, Spokesperson
    ],
    // Relationship tokens (dynamic at runtime)
    relationships: [
        'player_country', // The player's selected country
        'nation', // Generic term for the player's country
        'adversary', // A globally hostile nation (cyber, trade, sanctions, diplomacy)
        'border_rival', // A hostile nation sharing a physical border (frontier/border scenarios)
        'regional_rival', // A hostile nation in the same geographic region (proxy wars, arms races)
        'ally', // A friendly or aligned nation
        'neutral', // A neutral third party nation
        'rival', // A competing power (economic or political)
        'partner', // A collaborative nation
        'trade_partner', // A trading partner nation
        'neighbor', // An adjacent country
        'regional_bloc', // Regional organization (EU, ASEAN, African Union, ECOWAS, etc.)
    ],
    // Miscellaneous Context
    context: [
        'short_distance',
        'medium_distance',
        'long_distance',
        'locale_name', // Name of the relevant city or locale
        'region_type', // Type: city, region, area
        'terrain', // Terrain or geographic area
        'crisis_type', // Category of the crisis
        'scenario_theme', // Primary theme of the scenario
        'economic_scale', // "small island economy" | "the world's largest economy" etc.
        'gdp_description', // "a 25 trillion dollars economy" — ENTIRE national GDP as noun phrase. NEVER use as stolen/siphoned amount.
        'population_scale', // "a nation of nearly 3 million" | "a nation of over 330 million"
        'geography_type', // "island nation" | "continental power" | "coastal nation" | "landlocked nation"
        'climate_risk', // "hurricane-prone Caribbean island" | "diverse continental territory"
        'military_capability', // "world-class military superpower" | "limited defense capacity"
        'fiscal_condition', // "strong fiscal reserves" | "manageable debt levels" | "persistent deficits"
        'opposition_leader', // Name/title of the leading opposition figure
        // Scaled monetary tokens — auto-proportional to country GDP (Firebase-seeded)
        'graft_amount', // 0.5-3% of GDP — use for corruption, embezzlement, misappropriation
        'infrastructure_cost', // 1-5% of GDP — use for infrastructure projects, construction costs
        'aid_amount', // 0.1-1% of GDP — use for foreign aid, humanitarian packages
        'trade_value', // 5-15% of GDP — use for trade deals, trade disruption impacts
        'military_budget_amount', // 1.5-4% of GDP — use for defense spending, military procurement
        'disaster_cost', // 1-8% of GDP — use for natural disasters, emergency recovery
        'sanctions_amount', // 2-10% of GDP — use for economic sanctions, trade embargoes
        'city_name', // Name of a specific city referenced in the scenario
        'state_name', // Name of a state / province / region
        'locale_type', // Type label for the locale ("state", "province", "territory", etc.)
    ],
    // Article forms — use these when a token appears as a subject or after a preposition
    // e.g. "{the_adversary}" → "the United States" or "Russia" (adds "the" only for article-requiring countries)
    // e.g. "{the_foreign_affairs_role} announced" → "the Secretary of State announced"
    article_forms: [
        // Country/relationship article forms
        'the_adversary',
        'the_border_rival',
        'the_regional_rival',
        'the_ally',
        'the_trade_partner',
        'the_neutral',
        'the_rival',
        'the_partner',
        'the_neighbor',
        'the_player_country',
        'the_nation',
        // Executive/ministry article forms
        'the_leader_title',
        'the_vice_leader',
        'the_finance_role',
        'the_defense_role',
        'the_interior_role',
        'the_foreign_affairs_role',
        'the_justice_role',
        'the_health_role',
        'the_education_role',
        'the_commerce_role',
        'the_labor_role',
        'the_energy_role',
        'the_environment_role',
        'the_transport_role',
        'the_agriculture_role',
        // Judicial/legislative article forms
        'the_ruling_party',
        'the_prosecutor_role',
        // Institutional article forms
        'the_intelligence_agency',
        'the_domestic_intelligence',
        'the_security_council',
        'the_police_force',
        'the_central_bank',
        'the_legislature',
        'the_upper_house',
        'the_lower_house',
        'the_judicial_role',
        'the_state_media',
        'the_press_secretary',
        'the_military_branch',
        'the_military_general',
        'the_cabinet_secretary',
        'the_senior_official',
        'the_capital_mayor',
        'the_regional_governor',
        // New V2 tokens
        'the_opposition_party',
        'the_major_industry',
        'the_regional_bloc',
        // Military institution article forms
        'the_army_name',
        'the_naval_fleet',
        'the_air_wing',
        'the_cyber_agency',
        'the_nuclear_command',
        'the_coalition_name',
    ],
    // Political parties
    party: [
        'ruling_party_leader', // Current leader of the ruling party (by name)
        'opposition_party_leader', // Current leader of the main opposition party
        'ruling_party_ideology', // Brief ideological descriptor of the ruling party
    ]
};
exports.ALL_TOKENS = [
    ...exports.TEMPLATE_TOKENS.executive,
    ...exports.TEMPLATE_TOKENS.legislative,
    ...exports.TEMPLATE_TOKENS.judicial,
    ...exports.TEMPLATE_TOKENS.ministers,
    ...exports.TEMPLATE_TOKENS.security,
    ...exports.TEMPLATE_TOKENS.military,
    ...exports.TEMPLATE_TOKENS.economic,
    ...exports.TEMPLATE_TOKENS.local,
    ...exports.TEMPLATE_TOKENS.civil,
    ...exports.TEMPLATE_TOKENS.media,
    ...exports.TEMPLATE_TOKENS.relationships,
    ...exports.TEMPLATE_TOKENS.context,
    ...exports.TEMPLATE_TOKENS.party,
    ...exports.TEMPLATE_TOKENS.article_forms
];
// Set of bare token names (without the_ prefix) that have a corresponding
// article-form token (the_{name}). Used by audit-rules.ts to fix "the {token}"
// → "{the_token}" article-doubling without locally duplicating this list.
exports.ARTICLE_FORM_TOKEN_NAMES = new Set(exports.TEMPLATE_TOKENS.article_forms
    .filter((t) => t.startsWith('the_'))
    .map((t) => t.slice(4)) // strip "the_" prefix
);
/**
 * Concept → Token Map
 * Positive framing: maps English concepts to the correct token, preventing hardcoded
 * government-structure terms (e.g. "ruling coalition", "parliamentary majority").
 * Used in getLogicParametersPrompt() and llmRepairScenario() prompt construction.
 */
exports.CONCEPT_TO_TOKEN_MAP = [
    // Government / executive
    { concept: 'president / prime minister / chancellor / head of government / head of state', token: '{leader_title}' },
    { concept: 'vice president / deputy prime minister / deputy leader', token: '{vice_leader}' },
    // Legislature — NEVER use "parliament" or "congress" directly; always tokenize
    { concept: 'parliament / congress / national diet / senate / legislature / national assembly / riksdag', token: '{legislature}' },
    { concept: 'upper house / senate / house of lords', token: '{upper_house}' },
    { concept: 'lower house / house of representatives / house of commons', token: '{lower_house}' },
    // Ruling party / coalition — NEVER hardcode
    { concept: 'ruling party / governing party / party in power / coalition in power / the administration (as political entity)', token: '{ruling_party}' },
    { concept: 'ruling coalition / governing coalition / coalition government / coalition allies / parliamentary majority / legislative majority', token: '{ruling_party} (use with {legislature} for majority framing)' },
    // Cabinet
    { concept: 'finance minister / treasury secretary / chancellor of the exchequer / minister of finance', token: '{finance_role}' },
    { concept: 'defence minister / secretary of defense / defence secretary', token: '{defense_role}' },
    { concept: 'interior minister / home secretary / secretary of homeland security', token: '{interior_role}' },
    { concept: 'foreign minister / secretary of state / foreign secretary / MFA head', token: '{foreign_affairs_role}' },
    { concept: 'attorney general / minister of justice / justice minister', token: '{justice_role}' },
    { concept: 'health minister / secretary of health / health secretary', token: '{health_role}' },
    { concept: 'education minister / secretary of education', token: '{education_role}' },
    { concept: 'trade/commerce minister / secretary of commerce / business secretary', token: '{commerce_role}' },
    { concept: 'labour/labor minister / work secretary', token: '{labor_role}' },
    { concept: 'energy minister / secretary of energy', token: '{energy_role}' },
    { concept: 'environment minister / EPA administrator / secretary of environment', token: '{environment_role}' },
    // Judicial
    { concept: 'supreme court / constitutional court / high court', token: '{judicial_role}' },
    { concept: 'chief justice / president of the court', token: '{chief_justice_role}' },
    { concept: 'prosecutor general / attorney general (prosecutorial role)', token: '{prosecutor_role}' },
    // Intelligence / security
    { concept: 'intelligence agency / CIA / MI6 / Mossad / FSB / spy agency', token: '{intelligence_agency}' },
    { concept: 'domestic intelligence / FBI / MI5 / BfV / security service', token: '{domestic_intelligence}' },
    { concept: 'national security council / COBRA / NSC', token: '{security_council}' },
    // Economic institutions
    { concept: 'central bank / federal reserve / bank of england / monetary authority / reserve bank', token: '{central_bank}' },
    { concept: 'national currency / dollar / euro / pound / yen / currency unit', token: '{currency}' },
    { concept: 'stock exchange / financial market / bourse', token: '{stock_exchange}' },
    // Media
    { concept: 'state media / public broadcaster / national broadcaster / state television', token: '{state_media}' },
    // Military
    { concept: 'armed forces / military / defence forces / national army', token: '{military_branch}' },
    // Local
    { concept: 'capital city / seat of government / capital', token: '{capital_city}' },
    // Relationships
    { concept: 'hostile nation / adversary country / enemy state (not sharing a border)', token: '{the_adversary}' },
    { concept: 'hostile neighbour / border rival / border threat', token: '{the_border_rival}' },
    { concept: 'allied nation / friendly country / key ally', token: '{the_ally}' },
    { concept: 'trading partner / major trade partner', token: '{the_trade_partner}' },
    // Opposition / political bloc
    { concept: 'opposition party / opposition bloc / main opposition / political opposition / opposition leader\'s party', token: '{opposition_party}' },
    // Regional bloc / multilateral organization
    { concept: 'regional bloc / regional organization / ASEAN / African Union / EU / ECOWAS / CARICOM / GCC / regional body', token: '{the_regional_bloc}' },
    // Major industry / economic sector
    { concept: 'major industry / main industry / primary sector / key economic sector / dominant sector', token: '{major_industry}' },
];
exports.LOGIC_PARAMETERS = {
    effectRanges: {
        minor: { min: 0.3, max: 1.1 },
        moderate: { min: 1.2, max: 2.6 },
        major: { min: 2.7, max: 4.2 }
    },
    duration: {
        min: 1,
        max: 20,
        typical: { min: 7, max: 20 },
    },
    probability: {
        required: 1,
    },
    delay: {
        min: 0,
        max: 10,
        typical: { min: 0, max: 4 },
    },
    scenarioMetadata: {
        optionCount: { required: 3 },
    },
    optionRequirements: {
        minEffects: 1,
        typicalEffects: { min: 2, max: 4 },
        requiredFields: [
            "id", "text", "label", "effects",
            "outcomeHeadline", "outcomeSummary", "outcomeContext"
        ]
    },
    consequenceDelays: {
        typical: { min: 2, max: 4 },
    },
};
/**
 * Narrative concept → game metric alignment.
 * Every consequential outcome described in scenario text MUST be reflected by an effect on the correct metric.
 * Used in getLogicParametersPrompt() and available for audit/grounded-effects reuse.
 */
exports.NARRATIVE_TO_METRIC_ALIGNMENT = [
    { concepts: 'GDP, recession, growth, fiscal health, trade flows', metricIds: 'metric_economy' },
    { concepts: 'Unemployment, jobs, layoffs, hiring', metricIds: 'metric_employment' },
    { concepts: 'Inflation, prices, currency weakness', metricIds: 'metric_inflation', note: 'inverse: positive = worse' },
    { concepts: 'Budget, deficit, austerity, spending cuts', metricIds: 'metric_budget' },
    { concepts: 'Crime, law and order', metricIds: 'metric_crime (inverse), metric_public_order' },
    { concepts: 'Corruption, graft', metricIds: 'metric_corruption', note: 'inverse' },
    { concepts: 'Diplomacy, allies, treaties, international standing', metricIds: 'metric_foreign_relations' },
    { concepts: 'Military, defense, readiness', metricIds: 'metric_military' },
    { concepts: 'Civil liberties, free speech', metricIds: 'metric_liberty' },
    { concepts: 'Democracy, elections, rule of law', metricIds: 'metric_democracy' },
    { concepts: 'Sovereignty, foreign oversight, independence', metricIds: 'metric_sovereignty' },
    { concepts: 'Protests, unrest, stability', metricIds: 'metric_public_order, metric_unrest (hidden)' },
    { concepts: 'Approval, polling, public trust', metricIds: 'metric_approval' },
    { concepts: 'Health, healthcare, disease', metricIds: 'metric_health' },
    { concepts: 'Education, schools', metricIds: 'metric_education' },
    { concepts: 'Environment, climate, sustainability', metricIds: 'metric_environment' },
    { concepts: 'Energy, fuel, power', metricIds: 'metric_energy' },
    { concepts: 'Trade, exports, imports', metricIds: 'metric_trade' },
    { concepts: 'Infrastructure, roads, utilities', metricIds: 'metric_infrastructure' },
    { concepts: 'Housing, affordability', metricIds: 'metric_housing' },
    { concepts: 'Equality, inequality, fairness', metricIds: 'metric_equality' },
    { concepts: 'Immigration, integration', metricIds: 'metric_immigration' },
    { concepts: 'Innovation, R&D, technology', metricIds: 'metric_innovation' },
    { concepts: 'Bureaucracy, red tape, efficiency', metricIds: 'metric_bureaucracy', note: 'inverse' },
    { concepts: 'Foreign influence, interference', metricIds: 'metric_foreign_influence', note: 'hidden, inverse' },
    { concepts: 'Economic bubble, financial instability', metricIds: 'metric_economic_bubble', note: 'hidden, inverse' },
];
/**
 * Generate a prompt-ready string with logic parameters
 * to be injected into AI generation prompts
 */
function getLogicParametersPrompt(severity = 'medium') {
    // Determine appropriate effect magnitude
    let magnitudeGuidance;
    switch (severity) {
        case 'low':
            magnitudeGuidance = `minor effects (values between ${exports.LOGIC_PARAMETERS.effectRanges.minor.min} and ${exports.LOGIC_PARAMETERS.effectRanges.minor.max})`;
            break;
        case 'medium':
            magnitudeGuidance = `moderate effects (values between ${exports.LOGIC_PARAMETERS.effectRanges.moderate.min} and ${exports.LOGIC_PARAMETERS.effectRanges.moderate.max})`;
            break;
        case 'high':
        case 'extreme':
            magnitudeGuidance = `major effects (values between ${exports.LOGIC_PARAMETERS.effectRanges.major.min} and ${exports.LOGIC_PARAMETERS.effectRanges.major.max})`;
            break;
        case 'critical':
            magnitudeGuidance = `major effects at the high end (values between ${exports.LOGIC_PARAMETERS.effectRanges.major.min + 1} and ${exports.LOGIC_PARAMETERS.effectRanges.major.max})`;
            break;
    }
    return `
**GAME LOGIC CONSTRAINTS** (MUST FOLLOW):

1. **Valid Metrics**: ONLY use these metric IDs in effects:
   - Core (higher is better): ${exports.VALID_METRICS.core.join(', ')}
   - Inverse (lower is better): ${exports.VALID_METRICS.inverse.join(', ')}
   - Fiscal: ${exports.VALID_METRICS.fiscal.join(', ')}
   - Hidden: ${exports.VALID_METRICS.hidden.join(', ')}

2. **Template Tokens**: Use these placeholders in descriptions/outcomes:
   - Executive: {${exports.TEMPLATE_TOKENS.executive.join('}, {')}}
   - Legislative: {${exports.TEMPLATE_TOKENS.legislative.join('}, {')}}
   - Judicial: {${exports.TEMPLATE_TOKENS.judicial.join('}, {')}}
   - Ministers: {${exports.TEMPLATE_TOKENS.ministers.join('}, {')}}
   - Security: {${exports.TEMPLATE_TOKENS.security.join('}, {')}}
   - Military: {${exports.TEMPLATE_TOKENS.military.join('}, {')}}
   - Economic: {${exports.TEMPLATE_TOKENS.economic.join('}, {')}}
   - Local: {${exports.TEMPLATE_TOKENS.local.join('}, {')}}
   - Civil: {${exports.TEMPLATE_TOKENS.civil.join('}, {')}}
   - Media: {${exports.TEMPLATE_TOKENS.media.join('}, {')}}
   - Country/relationship — subject, object, or prepositional position → ALWAYS use the {the_*} article form (auto-adds "the" where required, e.g. "the United States" but not "Germany"):
     {${exports.TEMPLATE_TOKENS.article_forms.filter(t => ['the_adversary', 'the_border_rival', 'the_regional_rival', 'the_ally', 'the_neutral', 'the_rival', 'the_partner', 'the_trade_partner', 'the_neighbor', 'the_player_country', 'the_nation', 'the_regional_bloc'].includes(t)).join('}, {')}}
   - Possessive constructions only → bare form immediately followed by 's is valid: {${exports.TEMPLATE_TOKENS.relationships.join('}, {')}}
     ✅ "{player_country}'s economy collapsed" / "{adversary}'s claims were dismissed"
     ❌ "{player_country} faces..." → ✅ "{the_player_country} faces..."
   - Article forms ({the_*}) for roles and institutions — use when a role title is a sentence subject or follows a preposition:
     {${exports.TEMPLATE_TOKENS.article_forms.join('}, {')}}
     e.g. "{the_legislature} passed a bill" / "sanctions imposed by {the_adversary}"
   - Example: "{the_player_country} faces pressure from {the_legislature} over {central_bank} policy"

   **CONCEPT → TOKEN** (never hardcode — always use the right token for the concept):
${exports.CONCEPT_TO_TOKEN_MAP.map(({ concept, token }) => `   - ${concept} → ${token}`).join('\n')}

3. **Effect Values**: ${magnitudeGuidance}
   - Minor: ${exports.LOGIC_PARAMETERS.effectRanges.minor.min}–${exports.LOGIC_PARAMETERS.effectRanges.minor.max} (e.g. 0.4, 0.6, 0.9)
   - Moderate: ${exports.LOGIC_PARAMETERS.effectRanges.moderate.min}–${exports.LOGIC_PARAMETERS.effectRanges.moderate.max} (e.g. 1.3, 1.8, 2.2)
   - Major: ${exports.LOGIC_PARAMETERS.effectRanges.major.min}–${exports.LOGIC_PARAMETERS.effectRanges.major.max} (e.g. 2.9, 3.4, 3.8)
   Use specific decimal values. Whole numbers like 1, 2, or 3 are invalid output.

4. **Effect Probability**: MUST be ${exports.LOGIC_PARAMETERS.probability.required} (deterministic)

5. **Effect Duration**: Between ${exports.LOGIC_PARAMETERS.duration.min} and ${exports.LOGIC_PARAMETERS.duration.typical.max} turns (typical: ${exports.LOGIC_PARAMETERS.duration.typical.min}-${exports.LOGIC_PARAMETERS.duration.typical.max})

6. **Effect Delay**: Between ${exports.LOGIC_PARAMETERS.delay.min} and ${exports.LOGIC_PARAMETERS.delay.typical.max} turns (typical: immediate to ${exports.LOGIC_PARAMETERS.delay.typical.max})

7. **Metric Ranges**:
   - Core metrics (higher is better): 0-100, baseline 50, critical below 20
   - Inverse metrics (lower is better): 0-100, critical above 80
   - Budget: -100 to 100, baseline 0
   - Approval: 0-100, catastrophic below 15

8. **Options per Scenario**: EXACTLY ${exports.LOGIC_PARAMETERS.scenarioMetadata.optionCount.required} options required

9. **Effects per Option**: At least ${exports.LOGIC_PARAMETERS.optionRequirements.minEffects}, typically ${exports.LOGIC_PARAMETERS.optionRequirements.typicalEffects.min}-${exports.LOGIC_PARAMETERS.optionRequirements.typicalEffects.max}

10. **Required Option Fields**: ${exports.LOGIC_PARAMETERS.optionRequirements.requiredFields.join(', ')}

11. **Consequence Delays**: Follow-up scenarios trigger in ${exports.LOGIC_PARAMETERS.consequenceDelays.typical.min}-${exports.LOGIC_PARAMETERS.consequenceDelays.typical.max} turns

12. **Sign Convention** (CRITICAL):
    - Core metrics: POSITIVE values improve the metric (good outcomes)
    - Inverse metrics (${exports.VALID_METRICS.inverse.join(', ')}): POSITIVE values WORSEN the metric (bad outcomes)
    - Use NEGATIVE values on inverse metrics to improve them
    - Example: 2.0 on metric_corruption means corruption INCREASES (bad)
    - Example: -2.0 on metric_corruption means corruption DECREASES (good)

13. **Narrative–Effect Alignment** (CRITICAL):
    Every consequential outcome you describe in the scenario (description, option text, outcomeSummary) MUST be reflected by at least one effect on the correct metric below. The game updates only these metrics; using the wrong ID or omitting an effect means the player's dashboard will not match the narrative.
    Narrative concept → use this metric ID:
${exports.NARRATIVE_TO_METRIC_ALIGNMENT.map(({ concepts, metricIds, note }) => `    - ${concepts} → ${metricIds}${note ? ` (${note})` : ''}`).join('\n')}

14. **Relationship Token Semantics** (CRITICAL — prevents ally/adversary role confusion):
    HOSTILE tokens ({the_adversary}, {the_border_rival}, {the_regional_rival}, {the_rival}):
    - ONLY use when the foreign actor is threatening, attacking, sanctioning, conducting espionage,
      violating borders, escalating militarily, or acting in bad faith.
    - NEVER use with: aid offers, joint exercises, trade agreements, diplomatic cooperation,
      or any framing where the foreign actor is acting in good faith.
    COOPERATIVE tokens ({the_ally}, {the_partner}, {the_trade_partner}):
    - ONLY use when the foreign actor is supporting, coordinating, providing aid, or acting
      as a willing partner.
    - NEVER use with: sanctions, military threats, territorial claims, espionage, or hostile acts.
    NEUTRAL tokens ({the_neutral}, {the_neighbor}, {the_nation}, {the_player_country}):
    - Use for third-party observers, mediators, or uninvolved parties.
    Generating {the_ally} imposing sanctions or {the_adversary} offering unconditional cooperation
    is semantically invalid output and will be rejected.

15. **Context Token Semantics** (CRITICAL — prevents unrealistic monetary references):
    DESCRIPTIVE tokens (describe the country, never use as line-item amounts):
    - {gdp_description} → Resolves to the ENTIRE national GDP (e.g., "a 25 trillion dollars economy").
      NEVER use as a stolen, siphoned, lost, or misappropriated amount. It is the TOTAL economic output.
    - {economic_scale} → Qualitative descriptor ("the world's largest economy", "small island economy").
    - {population_scale} → "a nation of over 330 million" etc.
    - {geography_type}, {climate_risk} → Geographic/environmental descriptors.

    ADDITIONAL DESCRIPTORS (country context):
    - {military_capability} → Military standing descriptor ("world-class military superpower", "limited defense capacity").
    - {fiscal_condition} → Fiscal health descriptor ("strong fiscal reserves", "manageable debt levels", "persistent deficits").
    - {opposition_leader} → Name or title of the leading opposition figure.

    SCALED MONETARY tokens (auto-proportional to the player's GDP — USE THESE for specific amounts):
    - {graft_amount} → 0.5–3% of GDP. Use for corruption, embezzlement, fraud, misappropriation, graft.
    - {infrastructure_cost} → 1–5% of GDP. Use for construction, disaster damage, development projects.
    - {trade_value} → 5–15% of GDP. Use for trade deal values, trade disruption impacts.
    - {military_budget_amount} → 1.5–4% of GDP. Use for defense spending, military procurement.
    - {aid_amount} → 0.1–1% of GDP. Use for foreign aid packages, humanitarian assistance.
    - {disaster_cost} → 1–8% of GDP. Use for natural disaster recovery, emergency response costs.
    - {sanctions_amount} → 2–10% of GDP. Use for economic sanctions, trade embargo impacts.

    ✅ DO: "officials siphoned {graft_amount}" / "threatens {gdp_description}"
    ❌ NEVER: "siphoned {gdp_description}" / "stole a portion of {gdp_description}"
    ❌ NEVER: invent hard-coded dollar amounts like "$500 million" — always use scaled tokens.
`.trim();
}
/**
 * Validate a metric ID (delegates to canonical source)
 */
function isValidMetric(metricId) {
    return (0, metricIds_1.isValidMetricId)(metricId);
}
/**
 * Check if a metric is an inverse metric (delegates to canonical source)
 */
function isInverseMetric(metricId) {
    return (0, metricIds_1.isInverseMetric)(metricId);
}
function isValidToken(token) {
    return exports.ALL_TOKENS.includes(token.toLowerCase());
}
//# sourceMappingURL=logic-parameters.js.map