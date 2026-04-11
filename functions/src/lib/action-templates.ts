import type { ActionResolutionRequest, ActionResolutionResponse } from '../shared/action-resolution-contract';
import { getSeverityMultiplier } from '../action-resolution';
import { formatCountryWithArticle } from './country-determiner';

type RelCtx = 'ally' | 'partner' | 'neutral' | 'rival' | 'adversary' | 'conflict' | 'all';
type PowCtx = 'striking_up' | 'peer_conflict' | 'striking_down' | 'all';
type SevCtx = 'low' | 'medium' | 'high' | 'all';

interface ActionTemplate {
    id: string;
    actionType: string;
    relationshipContext: RelCtx;
    powerContext: PowCtx;
    severityContext: SevCtx;
    headline: string;
    summary: string;
    context: string;
    baseMetricDeltas: Array<{ metricId: string; delta: number }>;
    baseRelationshipDelta: number;
    targetMilitaryStrengthDelta?: number;
    targetCyberCapabilityDelta?: number;
    newsCategory: 'diplomacy' | 'military' | 'crisis' | 'executive';
    newsTags: string[];
}

// ---------------------------------------------------------------------------
// DIPLOMATIC: trade_agreement
// ---------------------------------------------------------------------------
const TRADE_AGREEMENT_TEMPLATES: ActionTemplate[] = [
    {
        id: 'trade_ally_001',
        actionType: 'trade_agreement',
        relationshipContext: 'ally',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} and {targetCountryName} sign landmark trade expansion pact',
        summary: '{leaderTitle} and {targetCountryName} leaders finalized a comprehensive trade expansion agreement that removes tariff barriers across key industry sectors. The accord deepens economic integration between the two allies and is expected to boost bilateral trade volume significantly.',
        context: 'The agreement covers manufactured goods, agricultural exports, and technology transfers, building on decades of alliance cooperation. Analysts say the deal positions both economies to compete more effectively in regional markets. Critics in the domestic manufacturing sector warn of increased import competition, though government officials project net job gains within two years. The pact takes effect after legislative ratification in both countries.',
        baseMetricDeltas: [
            { metricId: 'metric_trade', delta: 4 },
            { metricId: 'metric_economy', delta: 2 },
            { metricId: 'metric_employment', delta: 1 },
            { metricId: 'metric_foreign_relations', delta: 2 },
        ],
        baseRelationshipDelta: 8,
        newsCategory: 'diplomacy',
        newsTags: ['trade', 'bilateral', 'ally', 'economy', 'pact'],
    },
    {
        id: 'trade_neutral_001',
        actionType: 'trade_agreement',
        relationshipContext: 'neutral',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} opens new trade corridor with {targetCountryName}',
        summary: '{leaderTitle} formalized a bilateral trade agreement with {targetCountryName}, marking a significant step in normalizing economic relations. The deal establishes preferential tariff schedules and mutual investment protections.',
        context: 'Negotiations concluded after months of technical talks between finance ministries. The accord grants {countryName} access to {targetCountryName}\'s consumer markets while opening domestic sectors to foreign capital. Business associations in both countries welcomed the deal as a foundation for deeper engagement. Some legislators raised concerns over intellectual property provisions, but leadership indicated these would be addressed through a supplemental annex within twelve months.',
        baseMetricDeltas: [
            { metricId: 'metric_trade', delta: 3 },
            { metricId: 'metric_economy', delta: 1 },
            { metricId: 'metric_foreign_relations', delta: 1 },
        ],
        baseRelationshipDelta: 12,
        newsCategory: 'diplomacy',
        newsTags: ['trade', 'bilateral', 'economy', 'pact'],
    },
    {
        id: 'trade_partner_001',
        actionType: 'trade_agreement',
        relationshipContext: 'partner',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} and {targetCountryName} expand strategic economic partnership',
        summary: 'Building on their existing strategic partnership, {countryName} and {targetCountryName} signed an enhanced trade framework that extends preferential access across energy, technology, and agriculture. {leaderTitle} called the agreement a cornerstone of bilateral cooperation.',
        context: 'The expanded framework replaces a narrower arrangement that had been in place for several years. New provisions accelerate customs clearance, harmonize product safety standards, and establish a joint investment review board. Economists project a moderate uplift in export revenues over the next fiscal year. Environmental groups noted the absence of climate provisions, calling on both governments to incorporate sustainability benchmarks in future review cycles.',
        baseMetricDeltas: [
            { metricId: 'metric_trade', delta: 3 },
            { metricId: 'metric_economy', delta: 2 },
            { metricId: 'metric_foreign_relations', delta: 2 },
        ],
        baseRelationshipDelta: 10,
        newsCategory: 'diplomacy',
        newsTags: ['trade', 'strategic_partnership', 'economy'],
    },
    {
        id: 'trade_rival_001',
        actionType: 'trade_agreement',
        relationshipContext: 'rival',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} and {targetCountryName} reach surprise trade normalization deal',
        summary: 'In an unexpected diplomatic development, {countryName} and {targetCountryName} concluded a trade normalization agreement despite longstanding political tensions. {leaderTitle} framed the deal as pragmatic economic statecraft that separates commercial interests from geopolitical disputes.',
        context: 'The agreement is limited in scope, covering raw materials and food commodities, with sensitive technology sectors explicitly excluded. Both sides accepted a mutual dispute resolution mechanism administered by a neutral arbitration body. Domestic opposition parties in {countryName} criticized the move as premature given unresolved territorial and political disagreements. Supporters argue the economic linkage creates new incentives for stability and reduces the risk of escalation.',
        baseMetricDeltas: [
            { metricId: 'metric_trade', delta: 2 },
            { metricId: 'metric_economy', delta: 1 },
            { metricId: 'metric_approval', delta: -2 },
            { metricId: 'metric_foreign_relations', delta: 1 },
        ],
        baseRelationshipDelta: 15,
        newsCategory: 'diplomacy',
        newsTags: ['trade', 'rival', 'normalization', 'diplomacy'],
    },
];

// ---------------------------------------------------------------------------
// DIPLOMATIC: impose_sanctions
// ---------------------------------------------------------------------------
const IMPOSE_SANCTIONS_TEMPLATES: ActionTemplate[] = [
    {
        id: 'sanctions_adversary_001',
        actionType: 'impose_sanctions',
        relationshipContext: 'adversary',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} imposes sweeping sanctions on {targetCountryName}',
        summary: '{leaderTitle} announced a comprehensive sanctions package targeting {targetCountryName}\'s financial institutions, key state enterprises, and senior officials. The measures freeze assets held in {countryName}\'s jurisdiction and ban new investment.',
        context: 'The sanctions follow a period of escalating tensions and are designed to pressure {targetCountryName}\'s government by restricting its access to hard currency and international banking. Secondary sanctions will penalize third-party entities that continue significant business with designated individuals and entities. {targetCountryName}\'s government condemned the measures as illegal economic warfare and pledged retaliatory steps. International partners offered mixed reactions, with some allies expressing support while others called for continued dialogue.',
        baseMetricDeltas: [
            { metricId: 'metric_trade', delta: -4 },
            { metricId: 'metric_foreign_relations', delta: -3 },
            { metricId: 'metric_economy', delta: -2 },
            { metricId: 'metric_approval', delta: 1 },
        ],
        baseRelationshipDelta: -20,
        newsCategory: 'diplomacy',
        newsTags: ['sanctions', 'adversary', 'economic_coercion', 'foreign_policy'],
    },
    {
        id: 'sanctions_rival_001',
        actionType: 'impose_sanctions',
        relationshipContext: 'rival',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} targets {targetCountryName} with targeted sanctions over disputed actions',
        summary: '{countryName} imposed targeted sanctions on {targetCountryName} following a dispute over specific policy actions that {leaderTitle} described as destabilizing. The measures focus on designated individuals and entities rather than a sector-wide approach.',
        context: 'Officials characterized the sanctions as a calibrated response rather than a declaration of economic war, leaving channels open for diplomatic resolution. The designated list includes government ministers, state-linked financiers, and entities tied to disputed activities. {targetCountryName} called the measures an overreach and threatened countermeasures affecting bilateral trade. Regional neighbors urged both parties to pursue dialogue through existing multilateral frameworks.',
        baseMetricDeltas: [
            { metricId: 'metric_trade', delta: -2 },
            { metricId: 'metric_foreign_relations', delta: -2 },
        ],
        baseRelationshipDelta: -12,
        newsCategory: 'diplomacy',
        newsTags: ['sanctions', 'rival', 'targeted', 'diplomacy'],
    },
    {
        id: 'sanctions_neutral_001',
        actionType: 'impose_sanctions',
        relationshipContext: 'neutral',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} sanctions {targetCountryName} citing rule-of-law concerns',
        summary: '{countryName} announced sanctions against {targetCountryName} citing documented human rights violations and rule-of-law failures. {leaderTitle} said the measures reflect a principled stand against impunity rather than geopolitical rivalry.',
        context: 'The sanctions target named officials linked to judicial abuses and security force misconduct. {countryName}\'s government stressed that the measures are consistent with its broader human rights framework applied without double standards. {targetCountryName} rejected the characterization and argued the sanctions constitute political interference. International rights organizations welcomed the move but pressed for broader multilateral coordination to increase impact.',
        baseMetricDeltas: [
            { metricId: 'metric_trade', delta: -2 },
            { metricId: 'metric_foreign_relations', delta: -2 },
            { metricId: 'metric_democracy', delta: 1 },
        ],
        baseRelationshipDelta: -10,
        newsCategory: 'diplomacy',
        newsTags: ['sanctions', 'human_rights', 'rule_of_law'],
    },
    {
        id: 'sanctions_ally_001',
        actionType: 'impose_sanctions',
        relationshipContext: 'ally',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} sanctions ally {targetCountryName} in unprecedented diplomatic rupture',
        summary: 'In a striking breach of alliance norms, {countryName} imposed sanctions on long-standing ally {targetCountryName} following a breakdown in negotiations over a contentious issue. {leaderTitle} acknowledged the gravity of the step but stated that principled action was necessary.',
        context: 'The decision sent shockwaves through alliance structures, with partner nations expressing alarm at the precedent. The sanctions are narrowly scoped to specific officials and entities implicated in the dispute, leaving broader alliance frameworks formally intact. {targetCountryName}\'s government condemned the action as a betrayal and recalled its ambassador for consultations. Analysts warn the rupture could fundamentally alter the alliance\'s cohesion and encourage rival powers to exploit the divisions.',
        baseMetricDeltas: [
            { metricId: 'metric_trade', delta: -3 },
            { metricId: 'metric_foreign_relations', delta: -5 },
            { metricId: 'metric_approval', delta: -3 },
            { metricId: 'metric_sovereignty', delta: -1 },
        ],
        baseRelationshipDelta: -25,
        newsCategory: 'crisis',
        newsTags: ['sanctions', 'ally', 'diplomatic_rupture', 'crisis'],
    },
];

// ---------------------------------------------------------------------------
// DIPLOMATIC: request_alliance
// ---------------------------------------------------------------------------
const REQUEST_ALLIANCE_TEMPLATES: ActionTemplate[] = [
    {
        id: 'alliance_neutral_001',
        actionType: 'request_alliance',
        relationshipContext: 'neutral',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} proposes strategic alliance with {targetCountryName}',
        summary: '{leaderTitle} formally proposed a strategic partnership framework to {targetCountryName}, citing shared regional security interests and complementary economic strengths. Preliminary talks are expected to begin within weeks.',
        context: 'The proposal outlines a mutual defense consultation clause, enhanced intelligence sharing, and coordinated positions in multilateral forums. {targetCountryName}\'s government acknowledged the overture and indicated willingness to explore terms. Domestic voices in {targetCountryName} expressed cautious support, noting potential economic benefits alongside concerns about sovereignty constraints. Regional observers say the proposed alliance would shift the balance of power if formalized.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: 3 },
            { metricId: 'metric_military', delta: 1 },
            { metricId: 'metric_sovereignty', delta: 1 },
        ],
        baseRelationshipDelta: 15,
        newsCategory: 'diplomacy',
        newsTags: ['alliance', 'partnership', 'security', 'diplomacy'],
    },
    {
        id: 'alliance_rival_001',
        actionType: 'request_alliance',
        relationshipContext: 'rival',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} makes bold alliance overture to rival {targetCountryName}',
        summary: '{leaderTitle} extended a formal alliance proposal to {targetCountryName} in a move that upended conventional diplomatic expectations. The overture aims to transform a competitive relationship into a framework of structured cooperation.',
        context: 'The proposal is framed around shared threats — economic instability, regional insecurity, and third-party interference — that both governments have identified as common interests. Skeptics in both capitals question whether underlying political disputes are sufficiently resolved to support a genuine alliance. {targetCountryName} received the proposal without immediate commitment, signaling that talks would be exploratory. If successful, the realignment would constitute one of the most significant geopolitical shifts in the region in decades.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: 2 },
            { metricId: 'metric_approval', delta: -1 },
        ],
        baseRelationshipDelta: 18,
        newsCategory: 'diplomacy',
        newsTags: ['alliance', 'rival', 'realignment', 'diplomacy'],
    },
    {
        id: 'alliance_adversary_001',
        actionType: 'request_alliance',
        relationshipContext: 'adversary',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} seeks détente with adversary {targetCountryName} through alliance framework',
        summary: 'In a dramatic diplomatic gambit, {leaderTitle} dispatched a formal alliance proposal to {targetCountryName}, offering a structured framework to de-escalate longstanding hostilities. The move represents the most significant bilateral outreach in years.',
        context: 'The proposal includes confidence-building measures such as a mutual military notification agreement, designated communication hotlines, and economic pilot projects. {targetCountryName}\'s initial response was cautious, with officials demanding resolution of core disputes as a precondition for formal talks. International observers are divided — some see a genuine opening for peace while others warn that {countryName} may be making concessions without corresponding gains. The domestic political cost of the overture could be significant if {targetCountryName} rejects or delays engagement.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: 2 },
            { metricId: 'metric_approval', delta: -2 },
            { metricId: 'metric_democracy', delta: 1 },
        ],
        baseRelationshipDelta: 20,
        newsCategory: 'diplomacy',
        newsTags: ['alliance', 'détente', 'adversary', 'diplomacy'],
    },
    {
        id: 'alliance_ally_001',
        actionType: 'request_alliance',
        relationshipContext: 'ally',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} and {targetCountryName} elevate partnership to full defense alliance',
        summary: '{leaderTitle} proposed upgrading the existing strategic partnership with {targetCountryName} into a formal mutual defense alliance with binding security guarantees. Both governments described the move as a natural evolution of their longstanding cooperation.',
        context: 'The proposed alliance would include an article on collective defense, joint military command structures, and shared basing arrangements. Legislative ratification is required in both countries, and parliamentary debates are expected to be vigorous. Defense establishments expressed broad support, citing interoperability benefits and deterrence value. Neighboring countries raised concerns about the enhanced alliance creating a security dilemma in the region, while {countryName}\'s security community welcomed the formalization of existing commitments.',
        baseMetricDeltas: [
            { metricId: 'metric_military', delta: 3 },
            { metricId: 'metric_foreign_relations', delta: 3 },
            { metricId: 'metric_sovereignty', delta: -1 },
        ],
        baseRelationshipDelta: 12,
        newsCategory: 'diplomacy',
        newsTags: ['alliance', 'defense', 'ally', 'collective_security'],
    },
];

// ---------------------------------------------------------------------------
// DIPLOMATIC: expel_ambassador
// ---------------------------------------------------------------------------
const EXPEL_AMBASSADOR_TEMPLATES: ActionTemplate[] = [
    {
        id: 'expel_adversary_001',
        actionType: 'expel_ambassador',
        relationshipContext: 'adversary',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} expels {targetCountryName} ambassador amid escalating tensions',
        summary: '{leaderTitle} ordered the expulsion of {targetCountryName}\'s ambassador and recalled {countryName}\'s diplomatic mission from the capital, citing unacceptable provocations and violations of diplomatic norms. Bilateral relations have been reduced to the lowest level in years.',
        context: 'The expulsion follows a series of incidents that {countryName}\'s government characterized as deliberate escalation by {targetCountryName}. The move leaves both embassies operating with reduced skeleton staffs and eliminates the primary diplomatic communication channel between the two governments. Regional partners urged restraint and offered to facilitate backchannel contacts. Analysts say the expulsion reflects a deliberate choice to sharpen the crisis rather than manage it through quiet diplomacy.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: -4 },
            { metricId: 'metric_trade', delta: -2 },
            { metricId: 'metric_approval', delta: 1 },
        ],
        baseRelationshipDelta: -20,
        newsCategory: 'crisis',
        newsTags: ['expulsion', 'diplomacy', 'escalation', 'crisis'],
    },
    {
        id: 'expel_rival_001',
        actionType: 'expel_ambassador',
        relationshipContext: 'rival',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} expels {targetCountryName} envoy over espionage allegations',
        summary: '{countryName} declared {targetCountryName}\'s ambassador persona non grata and ordered the expulsion of several diplomatic staff accused of intelligence activities incompatible with their status. {leaderTitle} called the decision a proportionate and necessary response.',
        context: 'Authorities in {countryName} alleged that {targetCountryName}\'s diplomatic mission had been used to recruit agents and gather intelligence on government activities. {targetCountryName} rejected the accusations as fabricated and announced a reciprocal expulsion of {countryName}\'s diplomatic personnel. The tit-for-tat measures reduce each country\'s diplomatic presence significantly. Trade and consular services are expected to face disruption in the short term, and economic ties could be affected if the situation is not stabilized.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: -3 },
            { metricId: 'metric_sovereignty', delta: 1 },
        ],
        baseRelationshipDelta: -15,
        newsCategory: 'diplomacy',
        newsTags: ['expulsion', 'espionage', 'rival', 'diplomacy'],
    },
    {
        id: 'expel_neutral_001',
        actionType: 'expel_ambassador',
        relationshipContext: 'neutral',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} recalls ambassador from {targetCountryName} in policy protest',
        summary: '{countryName} recalled its ambassador from {targetCountryName} in protest over a specific government decision, signaling serious displeasure while stopping short of a full diplomatic rupture. {leaderTitle} stated the recall was temporary pending satisfactory dialogue.',
        context: 'The move is calibrated to apply diplomatic pressure without permanently damaging a relationship that both sides describe as broadly functional. Chargés d\'affaires will manage ongoing business in both capitals. {targetCountryName} expressed regret at the escalation and called for consultations to address the underlying dispute. Trade and bilateral programs are unaffected in the immediate term. Diplomats from both sides characterized the situation as serious but manageable through existing conflict-prevention mechanisms.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: -2 },
        ],
        baseRelationshipDelta: -10,
        newsCategory: 'diplomacy',
        newsTags: ['recall', 'ambassador', 'protest', 'diplomacy'],
    },
    {
        id: 'expel_ally_001',
        actionType: 'expel_ambassador',
        relationshipContext: 'ally',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} expels {targetCountryName} diplomat in major alliance crisis',
        summary: '{countryName} expelled a senior diplomat from ally {targetCountryName} in an unprecedented breach that plunged the alliance into its deepest crisis in decades. {leaderTitle} characterized the step as unavoidable given what officials described as a sustained pattern of bad faith.',
        context: 'The expulsion of an allied nation\'s diplomat is extraordinarily rare and signals a fundamental breakdown of trust between the two governments. Alliance partners expressed alarm and immediately dispatched senior envoys to mediate. The incident has raised questions about the durability of security commitments and the future of joint operations. Both governments face domestic pressure to either escalate or find a rapid off-ramp. Analysts warn the crisis could embolden adversaries to test alliance resolve at a moment of institutional vulnerability.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: -6 },
            { metricId: 'metric_military', delta: -2 },
            { metricId: 'metric_approval', delta: -2 },
        ],
        baseRelationshipDelta: -25,
        newsCategory: 'crisis',
        newsTags: ['expulsion', 'ally', 'alliance_crisis', 'crisis'],
    },
];

// ---------------------------------------------------------------------------
// MILITARY: covert_ops
// ---------------------------------------------------------------------------
const COVERT_OPS_TEMPLATES: ActionTemplate[] = [
    {
        id: 'covert_adversary_low_001',
        actionType: 'covert_ops',
        relationshipContext: 'adversary',
        powerContext: 'all',
        severityContext: 'low',
        headline: 'Suspected {countryName} operatives linked to sabotage in {targetCountryName}',
        summary: 'Intelligence reports and circumstantial evidence suggest {countryName}-linked operatives conducted limited sabotage operations inside {targetCountryName}, targeting communications infrastructure and logistical nodes. Both governments deny direct involvement.',
        context: '{targetCountryName}\'s security services attribute the incidents to a state-sponsored cell and have arrested several suspects. {countryName}\'s government denied any connection, calling the allegations baseless and politically motivated. The operations appear calibrated to create disruption without triggering a formal military response threshold. Analysts note the pattern is consistent with deniable pressure tactics used when governments seek to impose costs without overt escalation.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: -2 },
            { metricId: 'metric_military', delta: 1 },
            { metricId: 'metric_sovereignty', delta: 1 },
        ],
        baseRelationshipDelta: -8,
        targetMilitaryStrengthDelta: -5,
        newsCategory: 'military',
        newsTags: ['covert_ops', 'sabotage', 'adversary', 'deniable'],
    },
    {
        id: 'covert_other_low_001',
        actionType: 'covert_ops',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'low',
        headline: '{countryName} intelligence agencies active in {targetCountryName}, officials say',
        summary: 'Officials in {targetCountryName} have accused {countryName} of running an intelligence collection operation targeting government networks and strategic facilities. The allegations have strained bilateral communications without producing a formal diplomatic protest.',
        context: 'The operation reportedly involved signals interception, recruitment of local sources, and physical surveillance of sensitive facilities. {countryName}\'s government declined to comment on intelligence matters while reaffirming respect for {targetCountryName}\'s sovereignty. The disclosure has prompted {targetCountryName} to review counterintelligence protocols. Diplomatic channels remain open, and neither side appears to be seeking escalation, though underlying suspicions will likely persist.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: -2 },
            { metricId: 'metric_sovereignty', delta: 1 },
        ],
        baseRelationshipDelta: -6,
        targetMilitaryStrengthDelta: -3,
        newsCategory: 'military',
        newsTags: ['covert_ops', 'intelligence', 'deniable'],
    },
    {
        id: 'covert_medium_001',
        actionType: 'covert_ops',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'medium',
        headline: '{countryName} covert operation disrupts {targetCountryName} military network',
        summary: 'A covert operation attributed to {countryName} successfully disrupted key nodes in {targetCountryName}\'s military logistics and command network, according to multiple intelligence assessments. The operation caused measurable degradation without triggering open hostilities.',
        context: 'The operation is believed to have combined human intelligence assets with technical intrusion capabilities. Targeted facilities included supply depots, radar installations, and encrypted communications hubs. {targetCountryName}\'s military has begun an internal damage assessment and reinforced security around remaining strategic assets. The incident has raised the operational tempo of covert competition between the two states and increases the risk of miscalculation if either side perceives a subsequent incident as crossing a red line.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: -3 },
            { metricId: 'metric_military', delta: 1 },
            { metricId: 'metric_sovereignty', delta: 2 },
        ],
        baseRelationshipDelta: -12,
        targetMilitaryStrengthDelta: -12,
        newsCategory: 'military',
        newsTags: ['covert_ops', 'disruption', 'military', 'intelligence'],
    },
    {
        id: 'covert_high_001',
        actionType: 'covert_ops',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'high',
        headline: '{countryName} blamed for major covert operation inside {targetCountryName}',
        summary: '{targetCountryName} accused {countryName} of orchestrating a major covert operation that resulted in the assassination of a senior security official and the destruction of critical defense infrastructure. {leaderTitle} denied involvement, but the evidence presented by {targetCountryName} is considered credible by independent analysts.',
        context: 'The scale and precision of the operation indicate a sustained planning effort involving multiple intelligence disciplines. {targetCountryName}\'s government declared the incident an act of aggression and threatened proportionate retaliation. International partners called for de-escalation while privately acknowledging the gravity of the provocation. The operation significantly degrades {targetCountryName}\'s near-term military capability and has put both countries on a potential path toward open conflict.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: -5 },
            { metricId: 'metric_military', delta: 2 },
            { metricId: 'metric_public_order', delta: -1 },
        ],
        baseRelationshipDelta: -22,
        targetMilitaryStrengthDelta: -25,
        newsCategory: 'crisis',
        newsTags: ['covert_ops', 'assassination', 'crisis', 'escalation'],
    },
    {
        id: 'covert_conflict_001',
        actionType: 'covert_ops',
        relationshipContext: 'conflict',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} special units strike deep inside {targetCountryName} territory',
        summary: 'Under wartime conditions, {countryName} covert units conducted deep-penetration operations inside {targetCountryName}, targeting command infrastructure and senior military figures. The operations are part of a broader effort to degrade {targetCountryName}\'s capacity to sustain hostilities.',
        context: 'The operations targeted air defense coordination nodes, fuel depots, and high-value military personnel. Confirmed results include the destruction of several strategic assets and the disruption of resupply chains. {targetCountryName}\'s military acknowledged the attacks but downplayed their significance. International observers warn that the intensity of operations risks triggering even more destructive retaliatory responses and could lock both sides into a cycle of escalating strikes.',
        baseMetricDeltas: [
            { metricId: 'metric_military', delta: 3 },
            { metricId: 'metric_public_order', delta: -2 },
            { metricId: 'metric_foreign_relations', delta: -5 },
        ],
        baseRelationshipDelta: -30,
        targetMilitaryStrengthDelta: -30,
        newsCategory: 'crisis',
        newsTags: ['covert_ops', 'conflict', 'wartime', 'deep_strike'],
    },
];

// ---------------------------------------------------------------------------
// MILITARY: special_ops
// ---------------------------------------------------------------------------
const SPECIAL_OPS_TEMPLATES: ActionTemplate[] = [
    {
        id: 'special_ops_low_001',
        actionType: 'special_ops',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'low',
        headline: '{countryName} special forces conduct limited operation in {targetCountryName}',
        summary: '{countryName} deployed a small special operations unit to conduct a discrete mission inside {targetCountryName}. Officials acknowledged the operation as a targeted counterterrorism and intelligence-gathering activity.',
        context: 'The mission was executed with minimal footprint and completed within a narrow time window. {countryName} provided advance notification to select partners, framing the operation as within agreed counterterrorism parameters. {targetCountryName}\'s government lodged a formal protest asserting a violation of sovereignty, though it did not escalate to broader military action. The incident has prompted both governments to revisit communication protocols for such operations.',
        baseMetricDeltas: [
            { metricId: 'metric_military', delta: 2 },
            { metricId: 'metric_foreign_relations', delta: -2 },
            { metricId: 'metric_sovereignty', delta: 1 },
        ],
        baseRelationshipDelta: -8,
        targetMilitaryStrengthDelta: -6,
        newsCategory: 'military',
        newsTags: ['special_ops', 'counterterrorism', 'sovereignty'],
    },
    {
        id: 'special_ops_medium_001',
        actionType: 'special_ops',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'medium',
        headline: '{countryName} special operations forces strike {targetCountryName} military targets',
        summary: '{countryName} confirmed a special operations raid against military assets in {targetCountryName}, describing the mission as a response to demonstrated threats. The operation resulted in confirmed enemy casualties and the destruction of designated facilities.',
        context: 'The raid was executed by elite units with air support on standby. Confirmed targets included a weapons cache, a training facility, and command coordination equipment. Casualties were reported on both sides, though official figures differed sharply. {targetCountryName} condemned the incursion as an act of war and placed its forces on heightened alert. Regional powers called for restraint as diplomatic and military postures hardened.',
        baseMetricDeltas: [
            { metricId: 'metric_military', delta: 3 },
            { metricId: 'metric_public_order', delta: -1 },
            { metricId: 'metric_foreign_relations', delta: -3 },
            { metricId: 'metric_health', delta: -1 },
        ],
        baseRelationshipDelta: -16,
        targetMilitaryStrengthDelta: -15,
        newsCategory: 'military',
        newsTags: ['special_ops', 'raid', 'military', 'casualties'],
    },
    {
        id: 'special_ops_high_001',
        actionType: 'special_ops',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'high',
        headline: '{countryName} launches major special operations campaign against {targetCountryName}',
        summary: '{countryName} conducted an extensive special operations campaign across multiple sites in {targetCountryName}, targeting senior military leadership, weapons systems, and strategic infrastructure. {leaderTitle} characterized the action as a necessary preemptive measure.',
        context: 'The sustained campaign involved dozens of simultaneous strikes coordinated across different regions, representing a significant escalation in the use of special operations forces. {targetCountryName} suffered substantial degradation of its command and control capacity. Civilian areas near targeted facilities reported casualties and structural damage. International condemnation was swift, with several allies calling the operation disproportionate. {targetCountryName} activated reserve forces and threatened a broad military response.',
        baseMetricDeltas: [
            { metricId: 'metric_military', delta: 4 },
            { metricId: 'metric_health', delta: -3 },
            { metricId: 'metric_housing', delta: -1 },
            { metricId: 'metric_public_order', delta: -2 },
            { metricId: 'metric_foreign_relations', delta: -5 },
            { metricId: 'metric_budget', delta: -2 },
        ],
        baseRelationshipDelta: -25,
        targetMilitaryStrengthDelta: -28,
        newsCategory: 'crisis',
        newsTags: ['special_ops', 'campaign', 'escalation', 'casualties'],
    },
    {
        id: 'special_ops_striking_up_001',
        actionType: 'special_ops',
        relationshipContext: 'all',
        powerContext: 'striking_up',
        severityContext: 'all',
        headline: '{countryName} risks major confrontation with special ops strike on superior power {targetCountryName}',
        summary: '{countryName} conducted a special operations strike against {targetCountryName}, a significantly more powerful state, accepting substantial risk in a bid to impose costs and signal resolve. Analysts describe the move as high-stakes brinkmanship.',
        context: 'The decision to strike a militarily superior adversary reflects {countryName}\'s calculation that deterrence through occasional costly actions outweighs the risk of an overwhelming response. {targetCountryName}\'s government has vowed a response "proportionate to the audacity" of the strike. Allies of {countryName} distanced themselves from the operation while privately counseling de-escalation. The regional security architecture faces significant strain as both sides calibrate their next moves under intense international scrutiny.',
        baseMetricDeltas: [
            { metricId: 'metric_military', delta: 2 },
            { metricId: 'metric_approval', delta: 2 },
            { metricId: 'metric_foreign_relations', delta: -4 },
            { metricId: 'metric_public_order', delta: -2 },
        ],
        baseRelationshipDelta: -20,
        targetMilitaryStrengthDelta: -10,
        newsCategory: 'crisis',
        newsTags: ['special_ops', 'striking_up', 'escalation', 'brinkmanship'],
    },
];

// ---------------------------------------------------------------------------
// MILITARY: military_strike
// ---------------------------------------------------------------------------
const MILITARY_STRIKE_TEMPLATES: ActionTemplate[] = [
    {
        id: 'strike_adversary_low_001',
        actionType: 'military_strike',
        relationshipContext: 'adversary',
        powerContext: 'all',
        severityContext: 'low',
        headline: '{countryName} conducts limited strike against {targetCountryName} military positions',
        summary: '{countryName} launched precision strikes against a designated set of {targetCountryName} military installations, describing the action as a targeted response to provocation. The strikes were completed within hours and forces returned to base.',
        context: 'The strikes targeted air defense batteries, radar stations, and forward operating bases. {countryName}\'s military reported achieving all operational objectives with minimal collateral damage. {targetCountryName} confirmed material losses and vowed retaliation while simultaneously signaling openness to mediation through third-party channels. International responses ranged from condemnation to guarded understanding depending on the interlocutor\'s view of {countryName}\'s underlying grievances.',
        baseMetricDeltas: [
            { metricId: 'metric_military', delta: 3 },
            { metricId: 'metric_health', delta: -2 },
            { metricId: 'metric_foreign_relations', delta: -3 },
            { metricId: 'metric_budget', delta: -1 },
        ],
        baseRelationshipDelta: -18,
        targetMilitaryStrengthDelta: -15,
        newsCategory: 'military',
        newsTags: ['military_strike', 'precision', 'adversary', 'limited'],
    },
    {
        id: 'strike_rival_low_001',
        actionType: 'military_strike',
        relationshipContext: 'rival',
        powerContext: 'all',
        severityContext: 'low',
        headline: '{countryName} strikes {targetCountryName} border positions in response to incursions',
        summary: '{countryName}\'s military struck {targetCountryName} border posts and forward units following a pattern of cross-border incursions that {leaderTitle} characterized as deliberate provocations. The strikes are described as defensive and proportionate.',
        context: 'The military action targeted positions from which the incursions had originated, destroying fortifications and equipment. Casualties on {targetCountryName}\'s side were confirmed; {countryName}\'s forces reported no losses. {targetCountryName} accused {countryName} of aggression and mobilized border reinforcements. Diplomatic shuttles by neighboring states began immediately to prevent further escalation. The incident underscores the fragility of the border management arrangements currently in place.',
        baseMetricDeltas: [
            { metricId: 'metric_military', delta: 2 },
            { metricId: 'metric_health', delta: -1 },
            { metricId: 'metric_foreign_relations', delta: -2 },
            { metricId: 'metric_sovereignty', delta: 2 },
        ],
        baseRelationshipDelta: -14,
        targetMilitaryStrengthDelta: -10,
        newsCategory: 'military',
        newsTags: ['military_strike', 'border', 'rival', 'proportionate'],
    },
    {
        id: 'strike_adversary_medium_001',
        actionType: 'military_strike',
        relationshipContext: 'adversary',
        powerContext: 'all',
        severityContext: 'medium',
        headline: '{countryName} launches sustained air and ground campaign against {targetCountryName}',
        summary: '{countryName} initiated a multi-day offensive campaign against {targetCountryName}, combining air strikes, artillery bombardment, and ground incursions. The operation aims to degrade {targetCountryName}\'s military capacity and alter its strategic calculus.',
        context: 'The campaign has targeted weapons storage depots, military airfields, and armor formations. Civilian displacement has begun in areas adjacent to active military operations, with thousands fleeing toward internal refuge zones. {targetCountryName} mounted a fierce defense and conducted retaliatory strikes against {countryName}\'s border regions. International calls for a ceasefire have been rejected by {countryName}\'s government, which insists the operation will continue until stated objectives are achieved.',
        baseMetricDeltas: [
            { metricId: 'metric_military', delta: 4 },
            { metricId: 'metric_health', delta: -5 },
            { metricId: 'metric_housing', delta: -3 },
            { metricId: 'metric_infrastructure', delta: -3 },
            { metricId: 'metric_economy', delta: -2 },
            { metricId: 'metric_public_order', delta: -2 },
            { metricId: 'metric_foreign_relations', delta: -5 },
            { metricId: 'metric_budget', delta: -3 },
        ],
        baseRelationshipDelta: -28,
        targetMilitaryStrengthDelta: -22,
        newsCategory: 'crisis',
        newsTags: ['military_strike', 'campaign', 'displacement', 'crisis'],
    },
    {
        id: 'strike_rival_medium_001',
        actionType: 'military_strike',
        relationshipContext: 'rival',
        powerContext: 'all',
        severityContext: 'medium',
        headline: '{countryName} mounts significant military offensive against rival {targetCountryName}',
        summary: 'Following months of escalating friction, {countryName} launched a significant military offensive against {targetCountryName} that has drawn international alarm. {leaderTitle} defended the action as a necessary response to sustained provocation and posed a list of conditions for de-escalation.',
        context: 'The offensive has struck military bases, border fortifications, and supply routes. Several civilian facilities near the front have been damaged. Refugee flows have begun to tax the capacity of bordering regions. {targetCountryName} is mobilizing its military reserves and has called on international partners for support. Regional organizations have convened emergency sessions, and major powers are pressing both sides to establish a humanitarian corridor and ceasefire framework.',
        baseMetricDeltas: [
            { metricId: 'metric_military', delta: 3 },
            { metricId: 'metric_health', delta: -4 },
            { metricId: 'metric_housing', delta: -2 },
            { metricId: 'metric_foreign_relations', delta: -4 },
            { metricId: 'metric_trade', delta: -2 },
            { metricId: 'metric_budget', delta: -3 },
        ],
        baseRelationshipDelta: -25,
        targetMilitaryStrengthDelta: -18,
        newsCategory: 'crisis',
        newsTags: ['military_strike', 'offensive', 'rival', 'humanitarian'],
    },
    {
        id: 'strike_high_001',
        actionType: 'military_strike',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'high',
        headline: '{countryName} launches devastating large-scale assault on {targetCountryName}',
        summary: '{countryName} unleashed a massive military assault on {targetCountryName} involving coordinated air, naval, and ground forces. The scale and intensity of the operation have prompted international emergency sessions and triggered a regional security crisis.',
        context: 'The assault has inflicted catastrophic damage on {targetCountryName}\'s military and civilian infrastructure. Hospitals, power grids, and water systems have been disrupted across multiple cities. Mass displacement is underway, with hundreds of thousands fleeing conflict zones. International humanitarian organizations are reporting an acute civilian emergency. Multiple nations have condemned the assault in the strongest terms, and financial markets have reacted sharply to the outbreak of large-scale hostilities.',
        baseMetricDeltas: [
            { metricId: 'metric_military', delta: 5 },
            { metricId: 'metric_health', delta: -8 },
            { metricId: 'metric_housing', delta: -6 },
            { metricId: 'metric_infrastructure', delta: -6 },
            { metricId: 'metric_economy', delta: -5 },
            { metricId: 'metric_public_order', delta: -4 },
            { metricId: 'metric_foreign_relations', delta: -8 },
            { metricId: 'metric_trade', delta: -4 },
            { metricId: 'metric_budget', delta: -5 },
            { metricId: 'metric_unrest', delta: 4 },
        ],
        baseRelationshipDelta: -40,
        targetMilitaryStrengthDelta: -40,
        newsCategory: 'crisis',
        newsTags: ['military_strike', 'large_scale', 'humanitarian_crisis', 'war'],
    },
    {
        id: 'strike_striking_up_001',
        actionType: 'military_strike',
        relationshipContext: 'all',
        powerContext: 'striking_up',
        severityContext: 'all',
        headline: '{countryName} strikes superior power {targetCountryName} in high-risk escalation',
        summary: '{countryName} launched military strikes against {targetCountryName}, a nation with substantially greater military capability, in a gamble that has alarmed regional security structures. {leaderTitle} argued that the asymmetric action was justified to deter future aggression.',
        context: 'The attack struck several forward-deployed assets of {targetCountryName} but could not prevent a rapid and overwhelming counter-response. {targetCountryName}\'s retaliatory strikes have caused significant damage to {countryName}\'s own military and civilian infrastructure. Major powers are scrambling to prevent a spiral that could draw in alliance partners. The episode demonstrates both the risks and occasional strategic logic of smaller states using force against superior adversaries when the alternative is perceived as submission.',
        baseMetricDeltas: [
            { metricId: 'metric_military', delta: 2 },
            { metricId: 'metric_health', delta: -5 },
            { metricId: 'metric_infrastructure', delta: -4 },
            { metricId: 'metric_housing', delta: -3 },
            { metricId: 'metric_economy', delta: -4 },
            { metricId: 'metric_approval', delta: 2 },
            { metricId: 'metric_foreign_relations', delta: -6 },
        ],
        baseRelationshipDelta: -30,
        targetMilitaryStrengthDelta: -8,
        newsCategory: 'crisis',
        newsTags: ['military_strike', 'striking_up', 'asymmetric', 'escalation'],
    },
];

// ---------------------------------------------------------------------------
// MILITARY: nuclear_strike
// ---------------------------------------------------------------------------
const NUCLEAR_STRIKE_TEMPLATES: ActionTemplate[] = [
    {
        id: 'nuclear_vs_nonnuclear_001',
        actionType: 'nuclear_strike',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} detonates nuclear weapon over {targetCountryName} in unprecedented escalation',
        summary: '{countryName} conducted a nuclear strike against {targetCountryName}, detonating a tactical nuclear device over a military target and triggering the first use of nuclear weapons in open conflict in decades. The global community responded with immediate shock and condemnation.',
        context: 'The strike has caused mass casualties in the target area and sent a shockwave through the international order. Nations worldwide have called emergency security sessions. Nuclear-armed states have placed their arsenals on elevated alert. Radiation monitoring across the region has detected atmospheric contamination spreading beyond the immediate strike zone. {targetCountryName}\'s government has vowed total retaliation by all available means. Economic markets have collapsed globally, and multiple international bodies have invoked emergency provisions not triggered since the Cold War.',
        baseMetricDeltas: [
            { metricId: 'metric_military', delta: 5 },
            { metricId: 'metric_health', delta: -10 },
            { metricId: 'metric_environment', delta: -8 },
            { metricId: 'metric_housing', delta: -8 },
            { metricId: 'metric_infrastructure', delta: -8 },
            { metricId: 'metric_economy', delta: -8 },
            { metricId: 'metric_trade', delta: -6 },
            { metricId: 'metric_energy', delta: -5 },
            { metricId: 'metric_foreign_relations', delta: -10 },
            { metricId: 'metric_approval', delta: -6 },
            { metricId: 'metric_public_order', delta: -6 },
            { metricId: 'metric_unrest', delta: 8 },
        ],
        baseRelationshipDelta: -50,
        targetMilitaryStrengthDelta: -50,
        newsCategory: 'crisis',
        newsTags: ['nuclear', 'mass_casualty', 'global_crisis', 'war_crime'],
    },
    {
        id: 'nuclear_vs_nuclear_001',
        actionType: 'nuclear_strike',
        relationshipContext: 'adversary',
        powerContext: 'peer_conflict',
        severityContext: 'all',
        headline: 'Nuclear exchange erupts between {countryName} and {targetCountryName}',
        summary: '{countryName}\'s nuclear strike against {targetCountryName} has triggered a retaliatory nuclear exchange, with multiple warheads detonated on both sides. The conflict represents a catastrophic breakdown of deterrence with consequences for the entire planet.',
        context: 'The exchange began with {countryName}\'s first strike and was followed within minutes by {targetCountryName}\'s retaliatory launch. Multiple population centers and military facilities on both sides have been destroyed or severely damaged. Global radiation monitoring systems have detected atmospheric contamination spreading across neighboring countries. International bodies are scrambling to prevent further launches. The human toll and environmental damage will be generational. The concept of nuclear deterrence has failed in the most catastrophic way imaginable.',
        baseMetricDeltas: [
            { metricId: 'metric_military', delta: 3 },
            { metricId: 'metric_health', delta: -10 },
            { metricId: 'metric_environment', delta: -10 },
            { metricId: 'metric_housing', delta: -10 },
            { metricId: 'metric_infrastructure', delta: -10 },
            { metricId: 'metric_economy', delta: -10 },
            { metricId: 'metric_trade', delta: -8 },
            { metricId: 'metric_energy', delta: -8 },
            { metricId: 'metric_foreign_relations', delta: -10 },
            { metricId: 'metric_approval', delta: -8 },
            { metricId: 'metric_public_order', delta: -10 },
            { metricId: 'metric_unrest', delta: 10 },
        ],
        baseRelationshipDelta: -50,
        targetMilitaryStrengthDelta: -50,
        targetCyberCapabilityDelta: -30,
        newsCategory: 'crisis',
        newsTags: ['nuclear', 'nuclear_exchange', 'global_catastrophe', 'deterrence_failure'],
    },
    {
        id: 'nuclear_demonstration_001',
        actionType: 'nuclear_strike',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'low',
        headline: '{countryName} conducts nuclear test detonation near {targetCountryName} as warning',
        summary: '{countryName} detonated a nuclear device in an uninhabited area near {targetCountryName} in a dramatic demonstration of resolve, stopping short of a direct strike but communicating an unambiguous nuclear threat. The action has triggered global alarm.',
        context: 'The demonstration detonation was accompanied by a direct communication to {targetCountryName}\'s government spelling out the conditions under which {countryName} would employ its nuclear arsenal. International partners of {targetCountryName} immediately pledged support and extended security guarantees. The United Nations Security Council convened an emergency session. Radiation was detected in the demonstration zone but has not yet spread to populated areas. The message from {countryName} is unambiguous: it is prepared to escalate to nuclear use if its terms are rejected.',
        baseMetricDeltas: [
            { metricId: 'metric_military', delta: 4 },
            { metricId: 'metric_foreign_relations', delta: -8 },
            { metricId: 'metric_approval', delta: -3 },
            { metricId: 'metric_environment', delta: -3 },
            { metricId: 'metric_trade', delta: -3 },
            { metricId: 'metric_unrest', delta: 3 },
        ],
        baseRelationshipDelta: -35,
        targetMilitaryStrengthDelta: -5,
        newsCategory: 'crisis',
        newsTags: ['nuclear', 'demonstration', 'coercion', 'crisis'],
    },
];

// ---------------------------------------------------------------------------
// MILITARY: cyberattack
// ---------------------------------------------------------------------------
const CYBERATTACK_TEMPLATES: ActionTemplate[] = [
    {
        id: 'cyber_low_capable_001',
        actionType: 'cyberattack',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'low',
        headline: '{countryName} hackers infiltrate {targetCountryName} government networks',
        summary: 'Cybersecurity analysts have attributed a sustained intrusion into {targetCountryName}\'s government networks to state-linked hackers operating out of {countryName}. The operation focused on intelligence collection and mapping of sensitive systems.',
        context: 'The intrusion penetrated classified government portals, ministerial communications, and defense procurement databases. Data exfiltration appears to have occurred over several months before detection. {targetCountryName}\'s cyber response teams have begun remediation and have shared indicators of compromise with allied nations. {countryName} denied responsibility. The incident highlights persistent vulnerabilities in {targetCountryName}\'s cyber defenses and will likely accelerate investment in hardening government digital infrastructure.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: -2 },
            { metricId: 'metric_sovereignty', delta: 1 },
            { metricId: 'metric_innovation', delta: 1 },
        ],
        baseRelationshipDelta: -7,
        targetCyberCapabilityDelta: -5,
        newsCategory: 'military',
        newsTags: ['cyberattack', 'espionage', 'intrusion', 'deniable'],
    },
    {
        id: 'cyber_low_other_001',
        actionType: 'cyberattack',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'low',
        headline: '{targetCountryName} reports cyber intrusion linked to {countryName}',
        summary: '{targetCountryName}\'s national cybersecurity agency identified an intrusion campaign linked with moderate confidence to entities operating under {countryName}\'s direction. The operation appears to have targeted diplomatic communications and energy sector monitoring systems.',
        context: 'Attribution was established through forensic analysis of malware signatures and command-and-control infrastructure previously associated with {countryName}. The intrusion was limited in scope, suggesting an early-stage reconnaissance operation rather than a destructive payload deployment. {countryName}\'s government dismissed the attribution as speculation. Cybersecurity partnerships among regional states have been activated to share defensive indicators and coordinate countermeasures.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: -1 },
            { metricId: 'metric_innovation', delta: 1 },
        ],
        baseRelationshipDelta: -5,
        targetCyberCapabilityDelta: -3,
        newsCategory: 'military',
        newsTags: ['cyberattack', 'intrusion', 'attribution'],
    },
    {
        id: 'cyber_medium_001',
        actionType: 'cyberattack',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'medium',
        headline: '{countryName} cyber operation disrupts {targetCountryName} critical infrastructure',
        summary: 'A sophisticated cyberattack attributed to {countryName} caused major disruptions to {targetCountryName}\'s power grid, banking systems, and transport networks. Authorities in {targetCountryName} described the attack as the most damaging cyber operation they have faced.',
        context: 'The attack used previously undisclosed exploits against industrial control systems, triggering cascading failures across interconnected infrastructure. Power outages affected millions of residents for up to 48 hours. Financial transactions were disrupted, and several hospitals reverted to manual operations. {targetCountryName} has declared a national cyber emergency and requested assistance from allied states. The attack demonstrates the potential of cyber warfare to inflict strategic damage comparable to conventional military operations.',
        baseMetricDeltas: [
            { metricId: 'metric_innovation', delta: 2 },
            { metricId: 'metric_foreign_relations', delta: -4 },
            { metricId: 'metric_infrastructure', delta: -3 },
            { metricId: 'metric_economy', delta: -2 },
            { metricId: 'metric_energy', delta: -3 },
            { metricId: 'metric_public_order', delta: -2 },
        ],
        baseRelationshipDelta: -16,
        targetCyberCapabilityDelta: -18,
        newsCategory: 'crisis',
        newsTags: ['cyberattack', 'critical_infrastructure', 'disruption', 'grid'],
    },
    {
        id: 'cyber_high_001',
        actionType: 'cyberattack',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'high',
        headline: '{countryName} unleashes devastating cyberattack across {targetCountryName}',
        summary: '{countryName} launched a comprehensive, multi-vector cyberattack against {targetCountryName} that has crippled government operations, the financial system, military communications, and essential public services. Officials described it as an act of digital warfare without precedent.',
        context: 'The attack appears to have been months in preparation, with pre-positioned malware simultaneously activated across hundreds of target systems. The financial sector has frozen operations after core banking networks were corrupted. Military command and control systems have experienced severe degradation. Emergency services are overwhelmed. {targetCountryName} has requested emergency assistance from allied nations and their cyber defense forces have been activated. The operation signals a new threshold in state-sponsored cyber conflict.',
        baseMetricDeltas: [
            { metricId: 'metric_innovation', delta: 3 },
            { metricId: 'metric_foreign_relations', delta: -6 },
            { metricId: 'metric_infrastructure', delta: -5 },
            { metricId: 'metric_economy', delta: -5 },
            { metricId: 'metric_energy', delta: -4 },
            { metricId: 'metric_public_order', delta: -4 },
            { metricId: 'metric_trade', delta: -3 },
            { metricId: 'metric_budget', delta: -2 },
        ],
        baseRelationshipDelta: -28,
        targetCyberCapabilityDelta: -35,
        newsCategory: 'crisis',
        newsTags: ['cyberattack', 'digital_warfare', 'critical_infrastructure', 'crisis'],
    },
    {
        id: 'cyber_adversary_001',
        actionType: 'cyberattack',
        relationshipContext: 'adversary',
        powerContext: 'all',
        severityContext: 'medium',
        headline: '{countryName} retaliates against {targetCountryName} with precision cyberattack',
        summary: 'In a response to earlier provocations, {countryName} conducted a precision cyberattack against {targetCountryName}\'s military intelligence network and arms procurement systems. The operation was publicly acknowledged as a calibrated countermeasure.',
        context: 'Unlike broader infrastructure attacks, this operation focused narrowly on degrading {targetCountryName}\'s military intelligence capacity and disrupting procurement channels for defense materiel. Technical analysis indicates the payload was designed to exfiltrate rather than destroy, maximizing intelligence value while avoiding civilian disruption. {targetCountryName} condemned the attack as an escalation and pledged a response at a time and place of its choosing. The exchange underscores the growing role of cyber operations as a substitute for kinetic force in adversarial competition.',
        baseMetricDeltas: [
            { metricId: 'metric_innovation', delta: 2 },
            { metricId: 'metric_military', delta: 2 },
            { metricId: 'metric_foreign_relations', delta: -3 },
            { metricId: 'metric_sovereignty', delta: 1 },
        ],
        baseRelationshipDelta: -15,
        targetCyberCapabilityDelta: -20,
        newsCategory: 'military',
        newsTags: ['cyberattack', 'adversary', 'retaliation', 'military_intelligence'],
    },
];

// ---------------------------------------------------------------------------
// MILITARY: naval_blockade
// ---------------------------------------------------------------------------
const NAVAL_BLOCKADE_TEMPLATES: ActionTemplate[] = [
    {
        id: 'blockade_low_001',
        actionType: 'naval_blockade',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'low',
        headline: '{countryName} imposes selective naval restrictions on {targetCountryName} shipping',
        summary: '{countryName} announced selective inspections of vessels entering and leaving {targetCountryName}\'s territorial waters, targeting shipments of dual-use materials. Officials characterized the measures as enforcement rather than a blockade.',
        context: 'The inspections have slowed commercial shipping and raised insurance costs for vessels transiting the affected zone. {targetCountryName} condemned the measures as illegal interference with freedom of navigation and filed protests with international maritime authorities. Several flag states with vessels affected by the inspections have demanded diplomatic resolution. The economic impact on {targetCountryName} is modest in the immediate term but could escalate if shipping companies begin rerouting to avoid the area.',
        baseMetricDeltas: [
            { metricId: 'metric_trade', delta: -2 },
            { metricId: 'metric_military', delta: 2 },
            { metricId: 'metric_foreign_relations', delta: -2 },
        ],
        baseRelationshipDelta: -10,
        targetMilitaryStrengthDelta: -5,
        newsCategory: 'military',
        newsTags: ['blockade', 'naval', 'trade_disruption', 'maritime'],
    },
    {
        id: 'blockade_medium_001',
        actionType: 'naval_blockade',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'medium',
        headline: '{countryName} naval blockade chokes {targetCountryName} seaborne commerce',
        summary: '{countryName} established a naval blockade around {targetCountryName}\'s principal port approaches, halting the majority of seaborne imports and exports. The blockade has already caused shortages of fuel and consumer goods within {targetCountryName}.',
        context: 'Warships from {countryName}\'s fleet are enforcing a declared exclusion zone and turning away vessels regardless of cargo type. {targetCountryName}\'s economy is heavily dependent on maritime trade, making the blockade acutely painful. Food and medicine supplies are reported to be depleting. The United Nations has called for humanitarian exceptions. Several major trading partners have demanded {countryName} lift the blockade or risk further diplomatic and economic consequences.',
        baseMetricDeltas: [
            { metricId: 'metric_trade', delta: -5 },
            { metricId: 'metric_economy', delta: -3 },
            { metricId: 'metric_military', delta: 3 },
            { metricId: 'metric_foreign_relations', delta: -4 },
            { metricId: 'metric_employment', delta: -1 },
        ],
        baseRelationshipDelta: -20,
        targetMilitaryStrengthDelta: -10,
        newsCategory: 'crisis',
        newsTags: ['blockade', 'naval', 'economic_siege', 'trade_disruption'],
    },
    {
        id: 'blockade_high_001',
        actionType: 'naval_blockade',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'high',
        headline: '{countryName} enforces total naval blockade on {targetCountryName}',
        summary: '{countryName} declared a total naval blockade of {targetCountryName}, preventing all maritime traffic from reaching its ports. The comprehensive blockade has triggered a humanitarian emergency as medical supplies, food, and fuel run critically low.',
        context: 'The blockade includes enforcement against even neutral humanitarian vessels, provoking condemnation from international aid organizations and legal challenges at international tribunals. {targetCountryName} has mobilized its remaining naval assets in an attempt to break the blockade, creating a risk of direct naval confrontation. Multiple allied nations have deployed warships to contest the blockade\'s legality and create humanitarian corridors. The crisis has drawn in major powers and threatens to become the most dangerous maritime confrontation in recent memory.',
        baseMetricDeltas: [
            { metricId: 'metric_trade', delta: -8 },
            { metricId: 'metric_economy', delta: -6 },
            { metricId: 'metric_military', delta: 4 },
            { metricId: 'metric_health', delta: -5 },
            { metricId: 'metric_foreign_relations', delta: -7 },
            { metricId: 'metric_employment', delta: -3 },
            { metricId: 'metric_energy', delta: -3 },
        ],
        baseRelationshipDelta: -35,
        targetMilitaryStrengthDelta: -20,
        newsCategory: 'crisis',
        newsTags: ['blockade', 'naval', 'total_blockade', 'humanitarian_crisis'],
    },
    {
        id: 'blockade_island_001',
        actionType: 'naval_blockade',
        relationshipContext: 'all',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} imposes naval siege on island nation {targetCountryName}',
        summary: '{countryName}\'s navy encircled {targetCountryName}, an island state entirely dependent on maritime supply lines, cutting off access to fuel, food, and raw materials. The island\'s government declared a state of emergency within 72 hours.',
        context: 'As an island nation with no land borders, {targetCountryName} is uniquely vulnerable to naval interdiction. Reserve stocks of food and fuel are estimated at two to four weeks. The government has rationed essential goods and appealed urgently to the international community. {countryName} offered to lift the blockade in exchange for specific political concessions. International maritime law experts have condemned the action as a violation of multiple conventions. A naval rescue fleet from allied nations is reportedly being assembled.',
        baseMetricDeltas: [
            { metricId: 'metric_trade', delta: -8 },
            { metricId: 'metric_economy', delta: -7 },
            { metricId: 'metric_military', delta: 4 },
            { metricId: 'metric_health', delta: -4 },
            { metricId: 'metric_foreign_relations', delta: -6 },
            { metricId: 'metric_energy', delta: -4 },
            { metricId: 'metric_housing', delta: -2 },
        ],
        baseRelationshipDelta: -30,
        targetMilitaryStrengthDelta: -15,
        newsCategory: 'crisis',
        newsTags: ['blockade', 'naval', 'island', 'siege', 'humanitarian'],
    },
];

// ---------------------------------------------------------------------------
// DIPLOMATIC: treaty_proposal
// ---------------------------------------------------------------------------
const TREATY_PROPOSAL_TEMPLATES: ActionTemplate[] = [
    {
        id: 'treaty_neutral_001',
        actionType: 'treaty_proposal',
        relationshipContext: 'neutral',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} tables formal treaty framework with {targetCountryName}',
        summary: '{leaderTitle} formally submitted a treaty proposal to {targetCountryName} covering security cooperation, border management, and economic access rights. Both governments agreed to establish a joint negotiation commission to review the draft within sixty days.',
        context: 'The proposal represents a significant step toward structured bilateral engagement after years of informal contact. Legal teams from both foreign ministries will examine key provisions, particularly those governing third-party arbitration and exit clauses. Analysts note that treaty ratification will require legislative approval in both countries, introducing a timeline of several months even if initial negotiations succeed. Regional observers welcomed the initiative as a stabilizing signal in an otherwise tense geopolitical environment.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: 3 },
            { metricId: 'metric_approval', delta: 1 },
        ],
        baseRelationshipDelta: 12,
        newsCategory: 'diplomacy',
        newsTags: ['treaty', 'diplomacy', 'bilateral', 'negotiation'],
    },
    {
        id: 'treaty_ally_001',
        actionType: 'treaty_proposal',
        relationshipContext: 'ally',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} and {targetCountryName} advance comprehensive alliance treaty',
        summary: '{leaderTitle} proposed a sweeping alliance treaty with {targetCountryName} that would formalize mutual defense obligations, intelligence sharing, and joint crisis response procedures. The proposal builds on years of close cooperation and is expected to deepen strategic integration.',
        context: 'The treaty would obligate both parties to consult within forty-eight hours of any security threat and to provide material assistance in the event of armed conflict against either signatory. Defense analysts called the proposal one of the most consequential bilateral agreements in recent years. Critics in both parliaments raised questions about fiscal commitments and the risk of entanglement in regional conflicts. {leaderTitle} called the treaty a generational investment in collective security.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: 4 },
            { metricId: 'metric_military', delta: 2 },
            { metricId: 'metric_approval', delta: 1 },
        ],
        baseRelationshipDelta: 15,
        newsCategory: 'diplomacy',
        newsTags: ['treaty', 'alliance', 'mutual_defense', 'security'],
    },
    {
        id: 'treaty_rival_001',
        actionType: 'treaty_proposal',
        relationshipContext: 'rival',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} extends conditional treaty offer to {targetCountryName}',
        summary: '{leaderTitle} made a conditional treaty offer to {targetCountryName}, proposing a limited framework governing military de-escalation zones and communication channels. The proposal was described as a confidence-building measure rather than a normalization of relations.',
        context: 'The offer was presented through a third-party intermediary, reflecting the absence of direct diplomatic channels. Provisions include a mutual notification system for military exercises near shared borders and a crisis hotline to reduce miscalculation risk. {targetCountryName}\'s government acknowledged receipt but offered no immediate public response. Some domestic officials criticized the move as a concession to a hostile state, while foreign policy analysts praised the pragmatic approach to managing escalation risk.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: 2 },
            { metricId: 'metric_approval', delta: -1 },
        ],
        baseRelationshipDelta: 8,
        newsCategory: 'diplomacy',
        newsTags: ['treaty', 'de-escalation', 'rival', 'confidence_building'],
    },
];

// ---------------------------------------------------------------------------
// DIPLOMATIC: trade_war_escalation
// ---------------------------------------------------------------------------
const TRADE_WAR_ESCALATION_TEMPLATES: ActionTemplate[] = [
    {
        id: 'trade_war_rival_001',
        actionType: 'trade_war_escalation',
        relationshipContext: 'rival',
        powerContext: 'all',
        severityContext: 'low',
        headline: '{countryName} imposes targeted tariffs on {targetCountryName} exports',
        summary: '{leaderTitle} announced a new round of targeted tariffs on key {targetCountryName} export categories, escalating an ongoing trade dispute. The measures affect steel, electronics, and agricultural goods and are expected to take effect within thirty days.',
        context: 'The tariffs represent a calibrated escalation following {targetCountryName}\'s failure to comply with previous trade dispute rulings. Industry groups in {countryName} expressed mixed reactions: manufacturing sectors welcomed protection from lower-priced imports, while export-oriented industries warned of retaliatory measures. Economists projected modest inflation pressure in consumer goods over the following quarter. {targetCountryName} condemned the action as protectionism and indicated a retaliatory response was under review.',
        baseMetricDeltas: [
            { metricId: 'metric_trade', delta: -2 },
            { metricId: 'metric_economy', delta: -1 },
            { metricId: 'metric_approval', delta: 1 },
        ],
        baseRelationshipDelta: -10,
        newsCategory: 'diplomacy',
        newsTags: ['trade_war', 'tariffs', 'trade', 'economic_coercion'],
    },
    {
        id: 'trade_war_rival_002',
        actionType: 'trade_war_escalation',
        relationshipContext: 'rival',
        powerContext: 'all',
        severityContext: 'high',
        headline: '{countryName} launches broad economic offensive against {targetCountryName}',
        summary: '{leaderTitle} declared a comprehensive trade offensive against {targetCountryName}, imposing broad tariffs across nearly all import categories, restricting financial services access, and freezing joint infrastructure projects. The measures signal a significant escalation in bilateral economic confrontation.',
        context: 'The sweeping package goes beyond previous targeted tariffs and is designed to exert systemic pressure on {targetCountryName}\'s export economy. Economists warned of significant supply chain disruption for industries dependent on bilateral trade flows. Third-country governments with economic exposure to both nations expressed alarm and called for dialogue. {targetCountryName} announced retaliatory tariffs within hours and suspended ongoing negotiations on three separate trade frameworks. Markets reacted with volatility in currency and commodity futures.',
        baseMetricDeltas: [
            { metricId: 'metric_trade', delta: -5 },
            { metricId: 'metric_economy', delta: -3 },
            { metricId: 'metric_foreign_relations', delta: -4 },
            { metricId: 'metric_approval', delta: 2 },
        ],
        baseRelationshipDelta: -25,
        newsCategory: 'crisis',
        newsTags: ['trade_war', 'economic_warfare', 'tariffs', 'escalation'],
    },
    {
        id: 'trade_war_adversary_001',
        actionType: 'trade_war_escalation',
        relationshipContext: 'adversary',
        powerContext: 'all',
        severityContext: 'all',
        headline: '{countryName} weaponizes trade access against {targetCountryName}',
        summary: '{leaderTitle} announced a comprehensive set of economic measures against {targetCountryName} including full import bans on strategic goods, restrictions on financial transfers, and suspension of all bilateral trade agreements. The government described the package as economic defense against a hostile state.',
        context: 'The measures constitute one of the most aggressive economic actions taken against {targetCountryName} in recent years. Analysts said the package was designed to deny {targetCountryName} revenue from key export sectors while imposing costs on its financial system. Collateral impact on domestic consumers was acknowledged by officials, who argued short-term price increases were a necessary cost of geopolitical security. Allied governments were briefed in advance and expressed varying degrees of support. {targetCountryName}\'s government condemned the measures as economic warfare and pledged retaliatory action on multiple fronts.',
        baseMetricDeltas: [
            { metricId: 'metric_trade', delta: -6 },
            { metricId: 'metric_economy', delta: -3 },
            { metricId: 'metric_foreign_relations', delta: -3 },
            { metricId: 'metric_approval', delta: 2 },
        ],
        baseRelationshipDelta: -30,
        newsCategory: 'crisis',
        newsTags: ['trade_war', 'sanctions', 'economic_warfare', 'adversary'],
    },
];

// ---------------------------------------------------------------------------
// HUMANITARIAN: humanitarian_intervention
// ---------------------------------------------------------------------------
const HUMANITARIAN_INTERVENTION_TEMPLATES: ActionTemplate[] = [
    {
        id: 'humanitarian_neutral_001',
        actionType: 'humanitarian_intervention',
        relationshipContext: 'neutral',
        powerContext: 'all',
        severityContext: 'low',
        headline: '{countryName} deploys humanitarian mission to crisis zone in {targetCountryName}',
        summary: '{leaderTitle} authorized a humanitarian assistance mission to {targetCountryName}, dispatching medical teams, emergency supplies, and logistical support to regions affected by ongoing instability. The mission operates under civilian mandate and excludes combat forces.',
        context: 'The deployment is coordinated with international humanitarian organizations and is expected to operate for an initial period of ninety days. Government officials emphasized the mission\'s civilian character and its alignment with international law. Aid groups welcomed the commitment but called for expanded access to conflict-affected areas. Neighboring states expressed cautious support, while some domestic critics questioned the cost and risk to deployed personnel. {targetCountryName}\'s government officially requested international assistance, providing legal cover for the operation.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: 4 },
            { metricId: 'metric_approval', delta: 2 },
            { metricId: 'metric_economy', delta: -1 },
        ],
        baseRelationshipDelta: 10,
        newsCategory: 'diplomacy',
        newsTags: ['humanitarian', 'aid', 'intervention', 'civilian_mission'],
    },
    {
        id: 'humanitarian_conflict_001',
        actionType: 'humanitarian_intervention',
        relationshipContext: 'conflict',
        powerContext: 'striking_down',
        severityContext: 'high',
        headline: '{countryName} launches protective intervention in {targetCountryName} amid civilian crisis',
        summary: '{leaderTitle} ordered a protective military intervention in {targetCountryName} following reports of mass atrocities and civilian displacement. The operation is framed as a humanitarian mission under international mandate, with forces authorized to establish protected corridors and safe zones.',
        context: 'The intervention was triggered by documented reports of large-scale violence against civilian populations and the collapse of local protective capacity. {countryName} secured a partial international mandate but faced objections from regional powers who called the action interference in internal affairs. Military planners described the operation as limited in scope and duration, focused on establishing humanitarian corridors rather than achieving territorial objectives. Human rights organizations called the intervention overdue while cautioning against mission creep. Exit conditions and handover arrangements to international peacekeeping forces were not publicly specified.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: 3 },
            { metricId: 'metric_military', delta: -2 },
            { metricId: 'metric_economy', delta: -3 },
            { metricId: 'metric_approval', delta: 1 },
        ],
        baseRelationshipDelta: -5,
        targetMilitaryStrengthDelta: -10,
        newsCategory: 'military',
        newsTags: ['humanitarian', 'intervention', 'atrocity_response', 'civilian_protection'],
    },
    {
        id: 'humanitarian_adversary_001',
        actionType: 'humanitarian_intervention',
        relationshipContext: 'adversary',
        powerContext: 'all',
        severityContext: 'medium',
        headline: '{countryName} offers conditional humanitarian access to {targetCountryName} crisis',
        summary: '{leaderTitle} extended a conditional offer of humanitarian assistance to {targetCountryName}, proposing to provide medical supplies and food aid through neutral third-party channels despite ongoing political tensions. The offer was accompanied by calls for an immediate ceasefire and humanitarian access.',
        context: 'The gesture was framed as separating civilian welfare from political disputes, a position {leaderTitle} has articulated in previous humanitarian contexts. {targetCountryName}\'s government responded with skepticism, questioning the motives behind the offer. International aid agencies offered to serve as intermediaries to ensure supplies reach affected populations without political conditions. Domestic audiences in {countryName} were divided, with some praising the humanitarian impulse and others questioning assistance to an adversarial government. The offer was seen by regional analysts as a calibrated signal aimed at improving {countryName}\'s international standing.',
        baseMetricDeltas: [
            { metricId: 'metric_foreign_relations', delta: 5 },
            { metricId: 'metric_approval', delta: 2 },
        ],
        baseRelationshipDelta: 5,
        newsCategory: 'diplomacy',
        newsTags: ['humanitarian', 'adversary', 'conditional_aid', 'diplomacy'],
    },
];

// ---------------------------------------------------------------------------
// Full registry
// ---------------------------------------------------------------------------
const ALL_TEMPLATES: ActionTemplate[] = [
    ...TRADE_AGREEMENT_TEMPLATES,
    ...IMPOSE_SANCTIONS_TEMPLATES,
    ...REQUEST_ALLIANCE_TEMPLATES,
    ...EXPEL_AMBASSADOR_TEMPLATES,
    ...COVERT_OPS_TEMPLATES,
    ...SPECIAL_OPS_TEMPLATES,
    ...MILITARY_STRIKE_TEMPLATES,
    ...NUCLEAR_STRIKE_TEMPLATES,
    ...CYBERATTACK_TEMPLATES,
    ...NAVAL_BLOCKADE_TEMPLATES,
    ...TREATY_PROPOSAL_TEMPLATES,
    ...TRADE_WAR_ESCALATION_TEMPLATES,
    ...HUMANITARIAN_INTERVENTION_TEMPLATES,
];

// ---------------------------------------------------------------------------
// Template resolver
// ---------------------------------------------------------------------------

function normalizeRelationship(req: ActionResolutionRequest): RelCtx {
    const t = req.relationshipType;
    if (t === 'formal_ally') return 'ally';
    if (t === 'strategic_partner') return 'partner';
    if (t === 'rival') return 'rival';
    if (t === 'adversary') return 'adversary';
    if (t === 'conflict') return 'conflict';
    return 'neutral';
}

function scoreTemplate(t: ActionTemplate, req: ActionResolutionRequest): number {
    if (t.actionType !== req.actionType) return -1;

    const rel = normalizeRelationship(req);
    const pow = req.comparativePower ?? 'peer_conflict';
    const sev = req.severity ?? 'medium';

    let score = 0;

    if (t.relationshipContext === rel) score += 2;
    else if (t.relationshipContext === 'all') score += 1;
    else return -1;

    if (t.powerContext === pow) score += 2;
    else if (t.powerContext === 'all') score += 1;
    else return -1;

    if (t.severityContext === sev) score += 2;
    else if (t.severityContext === 'all') score += 1;
    else return -1;

    return score;
}

function replacePlaceholderWithArticle(text: string, placeholder: string, name: string): string {
    const pattern = new RegExp(`(^|[.!?]\\s+)\\{${placeholder}\\}`, 'g');
    const sentenceInitialResult = text.replace(
        pattern,
        (_, prefix: string) => `${prefix}${formatCountryWithArticle(name, true)}`,
    );
    return sentenceInitialResult.replace(
        new RegExp(`\\{${placeholder}\\}`, 'g'),
        formatCountryWithArticle(name, false),
    );
}

function interpolate(text: string, req: ActionResolutionRequest): string {
    const withCountry = replacePlaceholderWithArticle(text, 'countryName', req.countryName);
    const targetName = req.targetCountryName ?? req.targetCountryId ?? 'the target country';
    const withTarget = replacePlaceholderWithArticle(withCountry, 'targetCountryName', targetName);
    return withTarget.replace(/\{leaderTitle\}/g, req.leaderTitle ?? 'The head of state');
}

export function resolveActionTemplate(req: ActionResolutionRequest): ActionResolutionResponse | null {
    if (req.actionCategory === 'trust_your_gut') return null;

    const scored = ALL_TEMPLATES
        .map((t) => ({ t, score: scoreTemplate(t, req) }))
        .filter(({ score }) => score >= 0);

    if (scored.length === 0) return null;

    const maxScore = Math.max(...scored.map(({ score }) => score));
    const candidates = scored.filter(({ score }) => score === maxScore).map(({ t }) => t);

    const idx = (req.turn + req.countryId.charCodeAt(0)) % candidates.length;
    const template = candidates[idx];

    const multiplier = getSeverityMultiplier(req.severity);

    const metricDeltas = template.baseMetricDeltas.map((d) => ({
        metricId: d.metricId,
        delta: d.delta * multiplier,
    }));

    const relationshipDelta = template.baseRelationshipDelta * multiplier;

    return {
        headline: interpolate(template.headline, req),
        summary: interpolate(template.summary, req),
        context: interpolate(template.context, req),
        metricDeltas,
        relationshipDelta,
        targetMilitaryStrengthDelta: template.targetMilitaryStrengthDelta !== undefined
            ? template.targetMilitaryStrengthDelta * multiplier
            : 0,
        targetCyberCapabilityDelta: template.targetCyberCapabilityDelta !== undefined
            ? template.targetCyberCapabilityDelta * multiplier
            : 0,
        newsCategory: template.newsCategory,
        newsTags: template.newsTags,
    };
}
