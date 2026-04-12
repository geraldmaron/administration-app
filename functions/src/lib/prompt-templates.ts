/**
 * Prompt Templates — Firestore-only versioning system.
 *
 * Prompt content lives in the `prompt_templates` Firestore collection.
 * Firestore is the single source of truth — there are no local fallback files.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { BundleScenario } from './audit-rules';
import { ALL_BUNDLE_IDS, type BundleId } from '../data/schemas/bundleIds';
import { ALL_METRIC_IDS } from '../data/schemas/metricIds';
import type { ScenarioScopeTier, TokenStrategy } from '../types';

const BUNDLE_PRIMARY_METRICS: Record<string, string[]> = {
  economy:     ['metric_economy', 'metric_trade', 'metric_budget', 'metric_inflation', 'metric_employment', 'metric_innovation'],
  military:    ['metric_military', 'metric_sovereignty', 'metric_foreign_relations', 'metric_public_order', 'metric_budget'],
  politics:    ['metric_democracy', 'metric_approval', 'metric_liberty', 'metric_public_order', 'metric_equality'],
  diplomacy:   ['metric_foreign_relations', 'metric_trade', 'metric_sovereignty', 'metric_foreign_influence'],
  health:      ['metric_health', 'metric_budget', 'metric_approval', 'metric_equality', 'metric_infrastructure'],
  environment: ['metric_environment', 'metric_energy', 'metric_economy', 'metric_infrastructure', 'metric_innovation'],
  justice:     ['metric_liberty', 'metric_public_order', 'metric_crime', 'metric_democracy', 'metric_corruption'],
  social:      ['metric_equality', 'metric_education', 'metric_housing', 'metric_approval', 'metric_immigration'],
  corruption:  ['metric_corruption', 'metric_bureaucracy', 'metric_budget', 'metric_approval', 'metric_public_order'],
};

export function buildMetricHintsForSkeleton(bundle: string): string {
  const primary = BUNDLE_PRIMARY_METRICS[bundle.toLowerCase()];
  const allList = ALL_METRIC_IDS.join(', ');
  if (!primary) {
    return `METRICS: Write option text that maps to specific metrics. All valid: ${allList}`;
  }
  return `METRICS THIS SCENARIO SHOULD AFFECT:
Primary (${bundle}): ${primary.join(', ')}
All valid: ${allList}
Write option text with concrete mechanisms that map to specific metrics — not vague outcomes.`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromptTemplate {
  version: string;
  name: string;
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  active: boolean;
  sections: {
    role?: string;
    context?: string;
    constraints: string;
    examples?: string;
    outputFormat: string;
    reflection?: string;
  };
  metadata: {
    createdBy: string;
    successRate?: number;
    avgAuditScore?: number;
    totalAttempts?: number;
  };
}

export interface PromptVersion {
  architect: string;
  drafter: string;
  reflection: string;
}

export interface BundlePromptOverlay {
  architect: string;
  drafter: string;
}

export interface ScopePromptOverlay {
  architect: string;
  drafter: string;
}

export interface BuildDrafterPromptOptions {
  lowLatencyMode?: boolean;
  omitExamples?: boolean;
  omitReflection?: boolean;
}

interface DrafterPromptSection {
  title?: string;
  body: string;
}

const BUNDLE_PROMPT_OVERLAYS: Record<BundleId, BundlePromptOverlay> = {
  economy: {
    architect: 'Center the blueprint on fiscal tradeoffs, inflation pressure, jobs, market confidence, and knock-on budget consequences. Include sovereign debt stress, IMF conditionality negotiations, debt restructuring, and structural adjustment tradeoffs as valid arc types — especially scenarios where austerity measures trigger social unrest or where defaulting on obligations forces hard political choices. When a concept involves the IMF, World Bank, or international creditors, frame them as plain-language actors in the concept description — do not create token placeholders for them. UNIVERSAL SCOPE EXCEPTION: if scopeTier is universal, keep the premise fully domestic and transferable. Do not anchor the concept to Congress, the Treasury, the Federal Reserve, the IMF, foreign bondholders, or any single country\'s named institutions. Use reusable domestic pressures like a budget vote, inflation spike, subsidy rollback, central-bank warning, debt-service squeeze, or layoffs. CONDITIONS: Aim for at least 40% of economy scenarios to have no conditions or loose conditions (metric_economy max 55 or no gate at all). Transport cost surges, subsidy debates, central-bank warnings, and labor market shifts occur in healthy economies — omit conditions for these. Reserve strict crisis conditions (metric_economy max 42, metric_budget max 35) only for scenarios where a deep recession or fiscal collapse is an explicit narrative prerequisite.',
    drafter: 'Favor concrete economic levers such as taxes, subsidies, debt issuance, price controls, labor support, trade exposure, and central-bank tension. Also include sovereign default risk, IMF loan conditions, debt restructuring negotiations, and the tradeoffs of structural adjustment programs. Make option tradeoffs legible for budget, employment, inflation, and approval. When an option raises or lowers taxes, changes spending allocations, or shifts trade policy, include policyImplications targeting the relevant fiscal/policy settings (e.g. fiscal.taxIncome, fiscal.spendingSocial, policy.tradeOpenness). CRITICAL — international financial bodies have NO token equivalents: write "the IMF", "international creditors", "foreign bondholders", "bond markets", "a credit rating agency" as plain language. NEVER use {international_lender}, {international_investor}, {international_monitor}, {imf}, {world_bank}, {bond_market}, or any invented international-body token. UNIVERSAL SCOPE EXCEPTION: if the scenario is universal, keep it fully domestic and regime-agnostic. Do not write Congress, the Treasury, the Federal Reserve, named currencies, or any real country\'s institution names. Do not use absolute money figures like "$200 billion" or "€5 billion". At universal scope do NOT use {central_bank}, {currency}, {stock_exchange}, {legislature}, or phrases like "central bank", "monetary policy", "interest rate", "financial markets" — these all gate on country traits. Frame fiscal pressure via the {finance_role}, budget votes inside cabinet, tax changes, subsidy rollbacks, debt issuance, labor support programs, and layoffs. Use relative phrasing such as "a large stimulus package", "major spending cuts", or "a costly subsidy program".',
  },
  politics: {
    architect: 'Frame the arc around legitimacy, coalition pressure, scandals, constitutional stress, electoral fallout, and elite factional conflict. Include disinformation campaigns, foreign election interference, and state-sponsored media manipulation as valid arc types — situations where the information environment itself becomes a governance threat requiring a policy response. UNIVERSAL SCOPE EXCEPTION: at universal scope do NOT frame around legislatures, parliaments, governing parties, opposition parties, or elections (these gate on country traits). Instead frame around cabinet splits, scandal leaks, civic protest, {judicial_role} investigations, media narrative battles, and loyalty tests inside the executive branch. CONDITIONS: Political events — leaks, judicial disputes, media manipulation, regional autonomy demands, and electoral pressure — can happen at any approval level. Aim for 50%+ of politics scenarios to have no conditions or loose conditions (metric_approval max 45). Reserve deep-crisis conditions (metric_approval max 30, metric_public_order max 45) only for scenarios that require a ruling coalition on the brink of collapse or an explicit state of political emergency.',
    drafter: 'Favor political maneuvering, legitimacy management, party discipline, institutional brinkmanship, and public narrative control. Also include disinformation crises, foreign interference in electoral processes, and state media capture. Options should create visible tradeoffs between stability, democracy, liberty, and approval. UNIVERSAL SCOPE: do NOT write "legislature", "parliament", "election", "opposition party", "governing party" or use the matching tokens — they gate on country-trait requires flags. Reframe around cabinet factions, scandal leaks, the {judicial_role}, civic protest, the {interior_role}, and loyalty tests inside the executive.',
  },
  military: {
    architect: 'Frame the conflict around escalation risk, deterrence credibility, readiness, civilian costs, alliance signaling, and strategic uncertainty. CONDITIONS: Military procurement debates, readiness reviews, and force posture decisions happen in peacetime. Aim for 40%+ of military scenarios to have no conditions or loose conditions (metric_military max 55). Reserve strict weakness conditions (metric_military max 40) for scenarios where critical capability failure is an explicit plot premise.',
    drafter: 'Favor mobilization, procurement, border security, intelligence, force posture, veterans, and wartime tradeoffs. Keep consequences grounded in military readiness, public order, budget, foreign relations, and approval. When an option increases or decreases military spending or shifts defense posture, include policyImplications targeting fiscal.spendingMilitary and/or policy.defenseSpending.',
  },
  tech: {
    architect: 'Center the arc on cyber risk, AI governance, digital dependence, innovation upside, privacy costs, and infrastructure fragility. Include AI-generated propaganda, deepfakes used in political manipulation, platform-enabled information operations, and state actor interference via digital means as valid arc types. When generating AI governance scenarios, anchor to a concrete institutional trigger: a leaked capability assessment, a parliamentary inquiry, an industry lobbying campaign, an incident involving autonomous decision-making in a public service, or a foreign country\'s regulatory move creating competitive or sovereignty pressure. Avoid vague "AI is advancing" framings — the dilemma must name who is doing what and why it landed on the leader\'s desk. CONDITIONS: Cybersecurity incidents, AI regulation debates, and surveillance policy decisions arise in stable governments. Most tech scenarios should have no conditions or only mild gates (metric_approval max 48). Avoid requiring low approval as a prerequisite — technology governance is a standing responsibility, not a crisis response. UNIVERSAL SCOPE EXCEPTION: if scopeTier is universal, state actor interference scenarios must NOT use {adversary} or name a specific foreign country. Frame the arc around "a foreign state actor" or "unknown actors suspected of state sponsorship" without any relationship token; do NOT set requires.adversary. Platform-name prohibition at all scopes: do NOT name specific platforms (WeChat, TikTok, X, Meta, Telegram) — write "a major social media platform", "a foreign-owned messaging service", or "a domestic tech platform". At regional scope, if the scenario requires an adversary (e.g. state-sponsored cyberattack), set requires.adversary = true.',
    drafter: 'Favor cybersecurity, platform regulation, AI deployment, digital sovereignty, surveillance, semiconductor dependence, and broadband or grid resilience. Also include AI-generated disinformation, deepfake crises, state-sponsored information operations, and platform manipulation by foreign actors. Make the tradeoffs explicit between innovation, liberty, security, and employment. UNIVERSAL SCOPE: if the scenario is universal, do NOT use {adversary}, {ally}, {trade_partner}, {border_rival}, {legislature}, {governing_party}, or {opposition_party}. Write state-actor interference as "a foreign state actor" or "state-linked operators" in plain language. Do NOT name specific technology companies or platforms — use generic descriptors like "a major social media platform". REGIONAL SCOPE: if a state-actor scenario requires an adversary relationship, write "your adversary" in prose and include applicability.requires.adversary = true.',
  },
  environment: {
    architect: 'Frame the arc around climate shocks, adaptation costs, environmental regulation, resource stress, infrastructure resilience, and public backlash. CONDITIONS: Environmental pressure — wildfire seasons, emissions regulation debates, pollution enforcement, and adaptation funding — is a permanent governance reality. Most environment scenarios should have no conditions. Reserve environmental crisis conditions (metric_environment max 40) only for scenarios where ecological collapse or a declared environmental emergency is an explicit narrative requirement. UNIVERSAL SCOPE NOTE: use only domestic pressure at universal scope — wildfire seasons, pollution enforcement, emissions regulation, and adaptation funding are all safe. Do NOT frame around bilateral climate agreements with named neighbors, international treaty compliance obligations, or cross-border environmental disputes — these involve foreign actors and relationship tokens.',
    drafter: 'Favor natural disasters, pollution, emissions controls, land use, resilience spending, relocation, and ecological restoration. Options should force tradeoffs between environment, economy, health, infrastructure, and social stability. When an option tightens or relaxes environmental regulation, include policyImplications targeting policy.environmentalPolicy and/or policy.environmentalProtection.',
  },
  social: {
    architect: 'Center the arc on inequality, education strain, labor unrest, demographic pressure, service delivery, and social cohesion. Include refugee and migration crises as valid arc types: mass displacement events, asylum seeker integration strain, internal displacement from conflict or climate, and the political pressure of hosting large refugee populations. CONDITIONS: Housing pressures, education access gaps, labor disputes, and integration challenges occur at any point in a government\'s tenure. Aim for 40%+ of social scenarios to have no conditions. Reserve high-unrest conditions (metric_unrest min 40 or metric_public_order max 45) only for scenarios where societal fracture is an explicit prerequisite. UNIVERSAL SCOPE EXCEPTION: if scopeTier is universal, do NOT generate cross-border refugee scenarios (asylum seekers arriving from another country, burden-sharing with foreign governments, international refugee conventions). These involve foreign actors and fail the universal-relationship-token audit rule. Redirect to: domestic internal displacement (climate migrants relocating between regions, disaster-driven internal population movement), labor unrest from automation or wage stagnation, housing affordability crises from urban migration, welfare reform backlash from demographic aging, and integration challenges for internal ethnic or regional minority communities. Cross-border refugee and migration diplomacy scenarios belong in the diplomacy bundle at regional scope.',
    drafter: 'Favor strikes, welfare reforms, education access, housing stress, migration integration, and inequality-driven backlash. Also include mass displacement crises, asylum seeker processing backlogs, refugee camp conditions, host community tension, and internal displacement from conflict or disaster. Make the consequences visible across equality, employment, housing, liberty, and approval. When an option changes social spending, healthcare access, education funding, housing support, or immigration policy, include policyImplications targeting only supported settings (e.g. fiscal.spendingSocial, policy.healthcareAccess, policy.educationFunding, policy.immigration). Housing has no policy.housing setting; use fiscal.spendingSocial for housing subsidies or public housing support. UNIVERSAL SCOPE EXCEPTION: if the scenario is universal, do NOT write asylum seekers arriving from abroad, international refugee camps, bilateral burden-sharing agreements, or any foreign government refugee negotiation. Frame around internal displacement, domestic labor migration, housing pressure from rural-to-urban shifts, or welfare reform. Do not use {trade_partner}, {ally}, {adversary}, {border_rival}, {legislature}, {governing_party}, or {opposition_party}.',
  },
  health: {
    architect: 'Frame the arc around public-health capacity, outbreak control, medical scarcity, trust in institutions, and unequal access to care. CONDITIONS: Public health governance — outbreak preparedness, hospital funding, vaccination policy, and medicine shortages — is ongoing. Most health scenarios should have no conditions or only loose gates (metric_health max 55). Reserve health crisis conditions (metric_health max 42) only for scenarios where system collapse or an active declared emergency is a narrative requirement. UNIVERSAL SCOPE NOTE: keep health scenarios fully domestic. Do not frame around cross-border disease treaty enforcement, WHO or international-body compliance obligations, or bilateral health agreements with named neighbors — these involve foreign actors. Domestic outbreak response, hospital funding, medicine shortages, and vaccination policy are all safe universal framings.',
    drafter: 'Favor outbreaks, hospital overload, medicine shortages, vaccine politics, mental health strain, and emergency public-health measures. Keep tradeoffs clear between health, liberty, budget, public order, and approval.',
  },
  diplomacy: {
    architect: 'Center the blueprint on alliances, sanctions, trade leverage, crisis signaling, regional credibility, and diplomatic blowback. Include cross-border refugee flows and migration diplomacy as valid arc types: burden-sharing negotiations with neighbors, bilateral agreements over displaced populations, and situations where refugee flows become a coercive diplomatic instrument. UNIVERSAL SCOPE EXCEPTION: when scopeTier is universal, foreign-counterpart interactions are forbidden AND legislative/opposition-party framings are forbidden — center instead on the domestic political economy of foreign policy through cabinet factions splitting over a sanctions decision, foreign-aid appropriation battles inside cabinet, treaty-withdrawal debates driven by the {foreign_affairs_role}, asylum system redesign led by the {interior_role}, and tariff adjustments driven by the {finance_role}. Do not write "legislature", "parliament", "ratification", "opposition party", or "governing party". The scenario must be entirely domestic and regime-agnostic even though the subject matter is foreign policy. Vocabulary: at universal scope you MAY use terms like "adversarial tariffs", "bilateral sanctions package", or "coercive economic statecraft" as long as no foreign country is named and no foreign head-of-state meeting is the premise — those are cabinet-level tradeoffs, not bilateral summits with a named neighbor. CONDITIONS: Diplomatic friction — trade negotiations, refugee burden-sharing, alliance maintenance, and foreign aid debates — occurs in stable governments. Most diplomacy scenarios should have no conditions. Avoid requiring metric_public_order or metric_approval conditions; foreign policy decisions are made regardless of domestic poll numbers.',
    drafter: 'Favor sanctions, summit diplomacy, hostage crises, treaty leverage, recognition disputes, tariffs, aid, and alliance bargaining. Also include refugee burden-sharing negotiations, migration diplomacy with origin and transit countries, and scenarios where a neighbor uses refugee flows as political leverage. Make every option expose tradeoffs in foreign relations, trade, sovereignty, military posture, and approval. UNIVERSAL SCOPE: if the scenario is universal, use ONLY domestic cabinet-level actors — the {foreign_affairs_role}, the {finance_role}, the {defense_role}, the {interior_role}, the {leader_title}, and the {judicial_role}. Do NOT write "legislature", "parliament", "ratification vote", "opposition party", or "governing party" — these gate on country-trait requires flags. Frame dilemmas as cabinet splits over a sanctions decision, a foreign-aid appropriation fight inside cabinet, a treaty-withdrawal debate, or an asylum-system overhaul. Do not introduce foreign counterparts or relationship tokens.',
  },
  justice: {
    architect: 'Frame the arc around judicial legitimacy, policing strain, civil liberties, sentencing choices, and the state\’s response to disorder. CONDITIONS: Most justice scenarios — court reform debates, prosecutorial policy changes, sentencing reviews, civil-liberties bills — should have no conditions or only loose gates (metric_crime max 60 or metric_public_order max 55). Reserve strict crime or order conditions (metric_crime min 60, metric_public_order max 40) only for scenarios whose narrative premise explicitly requires a crime wave or breakdown of public order already underway. UNIVERSAL SCOPE NOTE: justice scenarios are generally safe at universal scope. Do NOT use {legislature} in justice reform scenarios — frame legislative accountability around "lawmakers" or cabinet-level executive action. Do not use {governing_party} or {opposition_party} in court-packing or sentencing scenarios.',
    drafter: 'Favor court reform, prosecutorial discretion, prison policy, crime waves, emergency powers, and judicial independence. Make the tradeoffs visible between public order, liberty, equality, democracy, and corruption.',
  },
  corruption: {
    architect: 'Center the arc on graft networks, procurement abuse, elite impunity, anti-corruption drives, and the political cost of enforcement. CONDITIONS: Corruption exists at every level of governance — procurement debates, audit findings, and whistleblower reports surface even in relatively clean states. Aim for at least 50% of corruption scenarios to have no conditions or loose conditions (metric_corruption max 55). Reserve strict crisis conditions (metric_corruption min 55, metric_bureaucracy min 60) only for scenarios whose premise explicitly requires systemic, pervasive graft already entrenched in government operations.',
    drafter: 'Favor bribery scandals, procurement fraud, shell companies, whistleblowers, watchdog bodies, and integrity crackdowns. Make the tradeoffs explicit between corruption, bureaucracy, economy, democracy, and approval.',
  },
  culture: {
    architect: 'Frame the arc around identity conflict, media narratives, censorship pressure, education symbolism, and social polarization. Include religious and sectarian conflict as valid arc types: faith-based governance tensions, sectarian violence between communities, religious law versus secular state disputes, and the political pressure of managing competing religious authorities. REALISM ANCHOR: Every culture scenario must be grounded in a specific institutional conflict or event — a court ruling, a curriculum board decision, a broadcasting license dispute, a heritage site designation controversy, a religious exemption claim, a media ownership change. Avoid abstract "values are in tension" framings. The scenario must name who is doing what to whom, what institutional body has been triggered, and why this escalated to the leader\'s desk rather than resolving itself. CONDITIONS: Cultural and identity conflicts erupt in healthy, stable societies — curriculum battles, media policy disputes, heritage controversies, and religious tension do not require any metric preconditions. Aim for at least 60% of culture scenarios to have no conditions at all. Only add order or approval conditions when the scenario premise explicitly depicts ongoing civil unrest or a collapsing approval baseline.',
    drafter: 'Favor cultural heritage disputes, broadcasting rules, censorship fights, language policy, artistic backlash, and symbolic national controversies. Also include religious/sectarian conflict, faith-based governance tensions, disputes over religious law in secular states, and sectarian violence requiring a government response. Keep the tradeoffs clear between liberty, equality, public order, and approval.',
  },
  infrastructure: {
    architect: 'Center the arc on service reliability, maintenance backlogs, disaster resilience, logistics bottlenecks, and capital-investment tradeoffs. CONDITIONS: Infrastructure pressure — aging grid debates, deferred rail maintenance, water-system funding, port congestion — is a routine governance problem that occurs in any state. Aim for at least 50% of infrastructure scenarios to have no conditions. Reserve strict budget or economy gates (metric_budget max 35, metric_economy max 42) only for scenarios where the premise explicitly requires a fiscal crisis that has already blocked capital spending.',
    drafter: 'Favor transit breakdowns, grid failures, water systems, ports, rail, telecoms, and public works. Make option tradeoffs explicit for infrastructure, economy, housing, environment, and budget.',
  },
  resources: {
    architect: 'Frame the arc around extraction, scarcity, energy security, water stress, export leverage, and local backlash from resource decisions. Include Dutch disease and resource curse dynamics as valid arc types: a commodity windfall crowding out manufacturing and creating long-term deindustrialization, a resource boom fueling corruption and widening inequality, a sudden price collapse exposing dangerous fiscal overreliance on a single export, or a sovereignty dispute over extraction rights with a foreign operator. These are among the most consequential and historically realistic governance challenges for resource-dependent states. CONDITIONS: Resource policy — mining permits, water-allocation disputes, energy mix debates, commodity export controls — applies in all economic conditions. Aim for at least 50% of resources scenarios to have no conditions. Reserve energy or environment crisis conditions (metric_energy max 42, metric_environment max 40) only for scenarios whose premise explicitly requires an active shortage or ecological collapse as the narrative trigger.',
    drafter: 'Favor mining, drilling, water allocation, food or fuel scarcity, export controls, and commodity dependence. Make the tradeoffs legible across energy, trade, environment, sovereignty, and public order.',
  },
  authoritarian: {
    architect: 'Frame the arc around coercion, repression, fear-based control, moral compromise, and strategic cruelty while keeping the scenario politically grounded. In this bundle, the Direct Action option should default to an authoritarian framing — power consolidation, bypassing institutional checks, coercive enforcement. The Institutional/Coalition option may involve co-opting institutions rather than delegating to them. The Strategic Patience option may involve surveillance, infiltration, or quiet consolidation rather than open deferral. CONDITIONS: Authoritarian temptation surfaces regardless of state health — emergency-power grabs, media crackdowns, and patronage extraction happen in stable and crisis states alike. Aim for at least 40% of authoritarian scenarios to have no conditions. Add approval or order conditions (metric_approval max 45, metric_public_order max 50) only when the premise explicitly requires a leader under political pressure or facing unrest that motivates the repressive action.',
    drafter: 'In this bundle, all three governance modes take on an authoritarian character. Direct Action: overt coercion, decree, crackdown. Institutional/Coalition: co-opting courts, stacking commissions, manufacturing legislative consent. Strategic Patience: surveillance, infiltration, quiet purges, building a loyalty network before acting. Keep them plausible state actions rather than cartoon villainy. Make the costs explicit in liberty, equality, democracy, foreign relations, unrest, and approval. ESCALATION REALISM: Authoritarian moves rarely announce themselves as authoritarian. Frame Direct Action options as emergency powers, security imperatives, or anti-corruption drives that incidentally consolidate power. Frame Institutional/Coalition options as reform commissions, loyalty vetting, or regulatory "streamlining" that happens to eliminate oversight. Frame Strategic Patience options as prudent monitoring, intelligence-gathering, or coalition-building that happens to neutralize opponents. The player must feel the moral weight through the realistic framing — not through a cartoon villain label.',
  },
};

const SCOPE_PROMPT_OVERLAYS: Record<ScenarioScopeTier, ScopePromptOverlay> = {
  universal: {
    architect: 'Optimize for transferability. Avoid country-unique constitutional assumptions. Use only domestic, cabinet, or judiciary for actorPattern — never legislature, ally, adversary, border_rival, or mixed. Universal scenarios must be entirely domestic and regime-agnostic. Do not generate concepts involving foreign countries or bilateral disputes. Do not set applicability.requires — universal scenarios must apply to every country without gating. Do not anchor concepts to real institution names or absolute money figures. FORBIDDEN INSTITUTIONAL ASSUMPTIONS (these gate on country traits and are incompatible with universal scope): do not build concepts around a legislature/parliament, opposition parties, governing parties, elections, a central bank, monetary policy, interest rates, stock exchanges or financial markets, a monarchy, a supreme/constitutional court, or nuclear weapons. Frame fiscal dilemmas around the {finance_role}, taxes, subsidies, and spending choices — not around monetary policy. Frame political dilemmas around cabinet factions, bureaucracy, {judicial_role}, and public protest — not legislative votes or opposition parties.',
    drafter: 'Write broadly reusable governance dilemmas grounded in domestic institutions. Use only regime-agnostic domestic role tokens: {finance_role}, {defense_role}, {foreign_affairs_role}, {interior_role}, {justice_role}, {health_role}, {education_role}, {environment_role}, {energy_role}, {leader_title}, {judicial_role}, {prosecutor_role}, {police_force}, {armed_forces_name}, {intelligence_agency}. Write "the {finance_role}" or "your {defense_role}" naturally — no special article form syntax. **HARD FORBIDDEN at universal scope — do NOT use in any form (token OR plain text), because each gates on a country-trait requires flag that universal scope cannot set**: {legislature}, {upper_house}, {lower_house}, {governing_party}*, {opposition_party}*, {central_bank}, {stock_exchange}, {monarch}, {ally}, {adversary}, {border_rival}, {trade_partner}. Also forbidden as plain text: "legislature", "parliament", "parliamentary", "election", "vote in/on", "opposition party", "governing party", "central bank", "monetary policy", "interest rate", "base rate", "money supply", "stock exchange", "stock market", "financial markets", "equity market", "monarch", "kingdom", "royal decree", "neighboring rival", "allied government", "trade partner", "border rival", "nuclear arsenal", "nuclear deterrent". Do not reference foreign actors, neighbors, allies, or adversaries in any form. Omit applicability.requires and relationshipEffects entirely. Do not write real institution names, named currencies, or absolute money figures. The three governance modes apply: Institutional/Coalition options should use domestic institutions ({judicial_role}, advisory commissions, expert panels, regulatory agencies, the {finance_role} working with cabinet). Strategic Patience options should use domestic pilot programs, monitoring, and phased rollouts.',
  },
  regional: {
    architect: 'Optimize for regional realism. Use geography, regional alliances, migration routes, weather systems, and cross-border knock-on effects that make causal sense within the target region. Use applicability.requires tags for geographic and geopolitical eligibility (e.g., coastal, land_border_adversary, trade_partner). When referencing foreign actors, use generalized language: "neighboring states", "regional trade partners", "a border rival". Set appropriate requires flags.',
    drafter: 'Inject region-relevant causal chains and pressure sources. Use role tokens ({finance_role}, {defense_role}, etc.) for government officials. For foreign actors, use generalized language and set applicability.requires accordingly: requires.formal_ally for ally scenarios, requires.adversary for adversary scenarios, requires.land_border_adversary for border disputes, requires.trade_partner for trade scenarios. Write "your {finance_role}" naturally. Favor regional trade, border, climate, and alliance dynamics that transfer within the same region.',
  },
  cluster: {
    architect: 'Optimize for shared-structure realism. The concept should fit multiple countries in the same cluster and be stronger than a universal prompt without becoming country-exclusive.',
    drafter: 'Use the cluster brief to produce scenarios that feel institutionally specific yet still portable across the cluster. Use role tokens for government officials. Reject single-country assumptions unless justified by the cluster itself.',
  },
  exclusive: {
    architect: 'Write for the specific target country provided in the country profile. Use real institution names, real leader titles, real currency — NO token placeholders. The concept must justify why it cannot be generalized. Set applicability.requires to declare any geopolitical preconditions. If the scenario involves a foreign relationship actor, write them as natural language and add relationshipEffects.',
    drafter: 'This scenario targets a specific country — use real institution names, real titles, and real currency from the country profile. Do NOT use any {token} placeholders. Write foreign relationship actors as natural language ("a neighboring rival", "the allied government"). Set applicability.requires for any geopolitical preconditions and add relationshipEffects on options whose outcomes would realistically change a relationship score.',
  },
};

// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------

let firestoreInstance: FirebaseFirestore.Firestore | null = null;

function getFirestore(): FirebaseFirestore.Firestore {
  if (!firestoreInstance) {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    firestoreInstance = admin.firestore();
  }
  return firestoreInstance!;
}

// ---------------------------------------------------------------------------
// Active prompt resolution
// ---------------------------------------------------------------------------

const _templateCache = new Map<string, { data: PromptTemplate; fetchedAt: number }>();
const TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

export async function getPromptTemplate(name: string): Promise<PromptTemplate | null> {
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

    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data() as PromptTemplate;
    _templateCache.set(name, { data, fetchedAt: now });
    return data;
  } catch (error) {
    console.error('Failed to fetch prompt template:', error);
    return null;
  }
}

export async function getCurrentPromptVersions(): Promise<PromptVersion> {
  const architectTemplate = await getPromptTemplate('architect_drafter');
  const drafterTemplate = await getPromptTemplate('drafter_details');
  const reflectionTemplate = await getPromptTemplate('reflection');

  return {
    architect: architectTemplate?.version ?? 'unknown',
    drafter: drafterTemplate?.version ?? 'unknown',
    reflection: reflectionTemplate?.version ?? 'unknown',
  };
}

// ---------------------------------------------------------------------------
// Required prompt loaders (throw on missing active template)
// ---------------------------------------------------------------------------

/**
 * Load the active drafter prompt base from Firestore.
 * Token placeholders ({{TOKEN_SYSTEM}}, {{TOKEN_CONTEXT}}) are resolved in
 * scenario-engine.ts after country data is available — do not replace them here.
 */
export async function getDrafterPromptBase(): Promise<string> {
  const template = await getPromptTemplate('drafter_details');
  if (template) {
    return template.sections.constraints.replace('{{BANNED_PHRASE_GUIDANCE}}', '');
  }
  console.warn('[PromptTemplates] No active "drafter_details" template in Firestore — falling back to compact drafter.');
  return getCompactDrafterPromptBase();
}

export function getCompactDrafterPromptBase(tokenStrategy?: TokenStrategy): string {
  const tokenRules = tokenStrategy === 'none'
    ? `- Use real institution names, real titles, real currency from the country profile. NO {token} placeholders.`
    : `- Use only tokens from the Token Context provided. If unsure a token exists, rewrite without it.
- Write "the {finance_role}" or "your {defense_role}" naturally — no special {the_*} prefix tokens.
- Never invent tokens not in the approved list.
- Write foreign actors and international bodies as natural language, never as tokens.`;

  return `## Role
You are The Drafter for The Administration.

Write valid JSON only.

## Voice
- description, options[].text, advisorFeedback[].feedback: second person.
- outcomeHeadline, outcomeSummary, outcomeContext: third-person news style.
- Never use "you" or "your" in outcome fields.

## Hard Rules
${tokenRules}
- Metric IDs are for effects/conditions only — never in prose.
- Title: 4-8 words, concrete headline style, no tokens.
- Title must contain a verb and named institutional actor. Forbidden endings: Crisis, Debate, Decision, Dilemma, Challenge, Conflict, Response, "Response Options" (two-word phrase), Dispute, Standoff, Transition, Management, Options, Measures, Planning, Situation, Issue, Problem.
- Description: 2-3 sentences, 60-140 words.
- Count words before returning. If description is under 60 words, expand it with trigger, actors, and concrete stakes.
- Exactly 3 options.
- Each option text: 2-3 sentences, 50-80 words.
- Count words before returning. If any option text is under 50 words, expand it with mechanism, trade-off, and affected constituency.
- Each option label: max 3 words, plain text, no tokens.
- Each option: exactly 3 effects preferred, never more than 4.
- If concept context provides optionDomains, each option MUST include at least one effect targeting its assigned primary metric and each option must keep at least one unique effect metric not shared by all options.
- **INVERSE METRICS — SIGN RULE (VIOLATION = REJECTED)**:
  corruption, inflation, crime, bureaucracy are INVERSE metrics (lower = better for player).
  ALL effect values on inverse metrics MUST be NEGATIVE.
  Example: { "targetMetricId": "metric_corruption", "value": -1.8 } ← CORRECT (corruption gets worse)
  WRONG: { "targetMetricId": "metric_corruption", "value": 1.8 } ← REJECTED (positive on inverse)
- **SEVERITY → MAGNITUDE RULE**: effect |value| MUST match the scenario's severity in metadata.
  low → 1.5–2.5 | medium → 2.0–3.5 | high → 2.5–4.5 | extreme → 3.5–7.0 | critical → ≥5.0
- **EFFECT-NARRATIVE COHERENCE**: Every effect MUST trace to a mechanism named in the option text.
  If the text describes cutting a budget → metric_budget or metric_economy must reflect it.
  If the text describes a crackdown → metric_liberty goes down, metric_public_order may go up short-term.
  If the text describes a public announcement or reform promise → an approval effect is warranted.
  If no mechanism in the text explains why an effect occurs, remove that effect.
  Phantom effects (approval swings or metric jumps with no described cause) make the game feel gamey.
- **policyImplications** (optional array, include ONLY when a bundle overlay instructs it):
  Each entry: { "settingId": "...", "delta": number (-100 to +100) }.
  Valid settingId examples: fiscal.taxIncome, fiscal.spendingSocial, fiscal.spendingMilitary, policy.tradeOpenness, policy.defenseSpending, policy.environmentalPolicy, policy.immigration, policy.healthcareAccess, policy.educationFunding.
- outcomeHeadline: 3-15 words.
- outcomeSummary: 2-3 sentences, at least 200 characters.
- outcomeContext: 4-6 sentences, 70-100 words, at least 350 characters. MUST name at least 2 specific institutional actors beyond {leader_title} (use role tokens or named bodies like "the {finance_role}", "the {judicial_role}", "international creditors"). MUST include at least 1 second-order consequence — a consequence triggered by the first consequence, not directly by the decision itself. Each option's outcomeContext must be unique to that option: if swapping two contexts wouldn't change the scenario, rewrite them.
- Outcome fields must stay grounded in the listed effects.
- Every option must include 5-9 advisorFeedback entries. Always include role_executive + 2-3 domain-relevant roles + at least 1 opposing voice.
- ADVISOR QUALITY (REJECTION RISK): Each advisor must argue from their specific portfolio — not generic phrases. The role_economy must cite fiscal, trade, or employment impact. The role_defense must cite security or readiness. The role_labor must name workers, wages, or unions. ALL of these phrases trigger audit rejection and will cause the scenario to be regenerated: "This aligns well with our [X] priorities", "Our department supports this course of action", "This could undermine our [X] objectives", "This has limited direct impact on [X] operations", "We see both risks and potential benefits for [X]", "This warrants careful monitoring from our department", "The risks outweigh the benefits", "This is a measured approach", "We must monitor the situation", "This warrants careful consideration". The opposing voice must name a specific institutional concern, constituency, or second-order risk — not just register opposition.
- Never invent advisor role IDs. "role_legislature" is invalid; use "role_executive" for parliamentary strategy/political management and "role_justice" for courts/constitutional oversight.
- If the scenario references a legislature, opposition party, elections, or a central bank: set applicability.requires with the exact institution flags needed, not just democratic_regime.
- Use active voice and plain language.

## Canonical advisor roles (include 5-9 per option)
role_executive, role_diplomacy, role_defense, role_economy, role_justice, role_health, role_commerce, role_labor, role_interior, role_energy, role_environment, role_transport, role_education

## Conditions
Optional array of { metricId, min?, max? } gating when the scenario appears. Use a condition only when the premise is implausible if that metric is in the wrong state.

**Direction rule — this is the most common mistake:**
- Scenario describes a metric as DEGRADED, declining, in crisis, or underfunded → use MAX (player must have a LOW value to see it)
- Scenario describes a metric as STRONG, elevated, or an opportunity enabled by capability → use MIN (player must have a HIGH value to see it)

A player with military=85 must NOT see a scenario about declining military readiness. A player with economy=10 must NOT see a boom-time spending scenario.

**Canonical conditions:**
- Military underfunded / readiness declining → { "metricId": "metric_military", "max": 45 }
- Military crisis / capability collapse → { "metricId": "metric_military", "max": 30 }
- Strong military (enables offensive/expansionary premise) → { "metricId": "metric_military", "min": 65 }
- Economic collapse → { "metricId": "metric_economy", "max": 38 }
- Economic boom (enables major spending or expansion) → { "metricId": "metric_economy", "min": 62 }
- Budget crisis → { "metricId": "metric_budget", "max": 40 }
- Unemployment crisis → { "metricId": "metric_employment", "max": 42 }
- Inflation crisis → { "metricId": "metric_inflation", "min": 58 } (inverse: higher = worse)
- Civil unrest → { "metricId": "metric_public_order", "max": 40 }
- Crime wave → { "metricId": "metric_crime", "min": 60 } (inverse)
- Corruption scandal → { "metricId": "metric_corruption", "min": 55 } (inverse)
- Diplomatic crisis → { "metricId": "metric_foreign_relations", "max": 40 }
- Health crisis → { "metricId": "metric_health", "max": 38 }
- Energy crisis → { "metricId": "metric_energy", "max": 38 }

Maximum 2 conditions. Output "conditions": [] for neutral governance scenarios.

## Output contract
Return only the requested scenario JSON object matching the schema. No prose outside JSON.`;
}

function buildLowLatencyDrafterSection(): DrafterPromptSection {
  return {
    title: 'LOW-LATENCY MODE',
    body: 'Return the smallest valid JSON that still satisfies every schema and audit requirement. Do not add extra explanation or decorative prose beyond what the fields require.',
  };
}

function buildFewShotExamplesSection(fewShotExamples: BundleScenario[]): DrafterPromptSection {
  const examplesBody = fewShotExamples
    .map((example, idx) => `## Example ${idx + 1}: ${example.title}\n\
\
\`\`\`json\n${JSON.stringify(example, null, 2)}\n\`\`\`\n`)
    .join('\n');

  return {
    title: 'PERFECT EXAMPLES',
    body: `Study these examples of PERFECT scenarios that meet all requirements:\n\n${examplesBody}\nYour output must match this quality level and structure.`,
  };
}

function buildReflectionSection(reflectionPrompt: string): DrafterPromptSection {
  return {
    body: reflectionPrompt,
  };
}

function assemblePromptSections(sections: readonly DrafterPromptSection[]): string {
  return sections
    .map((section) => section.title ? `# ${section.title}\n${section.body}` : section.body)
    .join('\n\n');
}

/**
 * Ollama sub-phase prompt: Skeleton (Phase A)
 * Focused prompt for generating title, description, and 3 option texts only.
 * Designed to stay under 3000 input tokens for local models.
 */
export function getOllamaSkeletonPrompt(params: {
  concept: string;
  bundle: string;
  scopeTier: string;
  scopeNote: string;
  countryNote: string;
  countryContextBlock: string;
  bundleGuidance: string;
  scopeGuidance: string;
  tokenContext: string;
  retryFeedback?: string;
}): string {
  const isUniversal = params.scopeTier === 'universal';
  const retryBlock = params.retryFeedback
    ? `\nPREVIOUS ATTEMPT FAILED — AVOID THESE ISSUES:\n${params.retryFeedback}\n`
    : '';
  return `Generate a governance scenario for a political simulation game called The Administration. Output valid JSON only.

CONCEPT: "${params.concept}"
BUNDLE: ${params.bundle}
${params.scopeNote}
${params.countryNote}

${params.tokenContext}
${retryBlock}
VOICE RULES:
- description and option text: use "you" / "your" (second person, addressing the player leader).
- NEVER use "the government", "the administration", or third-person framing ("the president decided") — say "you" or "your cabinet".
- NEVER open with "As {leader_title} of {player_country}, you face..." — drop the framing clause and open directly with the situation. ✅ "A drought has idled 40% of grain output." ❌ "As {leader_title} of {player_country}, you face a drought."
- BANNED phrases in option text: "aims to", "but risks", "but may", "could lead to", "at the cost of", "balances X with Y", "prioritizes X over Y", "risks provoking", "threatens to"

TOKEN RULES:
- Use only tokens from the Token Context above. If unsure a token exists, write it in plain English.
- Write "the {finance_role}" or "your {defense_role}" naturally — no special {the_*} prefix tokens.
- Never invent tokens not in the approved list.
- Never write absolute money figures or named currencies in prose. Use relative language like "a major subsidy" or "a costly bailout".
- {country_name} resolves to a name that includes "the" (e.g. "the United States"). NEVER use it as an adjective or mid-noun-phrase: ❌ "critical {country_name} infrastructure" → ✅ "domestic infrastructure" or "the country's infrastructure".
- NEVER hardcode institution names — use tokens: ❌ CIA, FBI, NSA, Supreme Court, Central Bank → ✅ {intelligence_agency}, {judicial_role}, {central_bank}.
${isUniversal ? '- UNIVERSAL SCOPE: keep entirely domestic. No foreign nation actors, neighbors, allies, or adversaries.' : ''}
${isUniversal ? '- UNIVERSAL SCOPE: favor reusable domestic actors like cabinet officials, regulators, judges, auditors, and central-bank officials.' : ''}

STRUCTURE:
- title: 4-8 words, headline style, contains a past-tense or present-tense verb and an institutional actor. No tokens in title.
  TITLE RULES — titles MUST read like a news headline:
  ✅ "Generals Threaten Mass Resignation", "Regulators Freeze Currency Reserves", "State Auditors Uncover Budget Fraud"
  ❌ NEVER start with: "Navigate", "Navigating", "Resolve", "Manage", "Managing", "Balance", "Balancing", "Handle", "Handling", "Decide on", "Address"
  ❌ NEVER end with: "Crisis", "Challenge", "Conflict", "Dilemma", "Debate", "Decision", "Response", "Response Options", "Dispute", "Standoff", "Transition", "Management", "Options", "Measures", "Planning", "Situation", "Issue", "Problem"
  ❌ NEVER use institution names that have token equivalents (Central Bank, Supreme Court, National Guard). Use generic actors: "Regulators", "Auditors", "Generals", "Prosecutors", "Officials".
- description: 2-4 sentences, 30-200 words. Include the trigger event, key actors, and concrete stakes. Open directly — do not start with "As {leader_title}..."
- Exactly 3 options, each with:
  - id: "opt_a", "opt_b", "opt_c"
  - text: 2-3 sentences, 40-90 words. Describe the action, mechanism, and trade-off.
  - label: 1-3 words, plain text, no tokens.

EXAMPLE (correct format):
\`\`\`json
{
  "title": "Prosecutors Raid State Energy Firm",
  "description": "A whistleblower has leaked documents showing systematic overbilling by the state energy company, siphoning {graft_amount} over three years. The {finance_role} has confirmed the irregularities and your cabinet demands a response before the story dominates the news cycle.",
  "options": [
    { "id": "opt_a", "text": "You authorize the {justice_role} to launch a full criminal investigation with subpoena powers, targeting senior executives and their political connections. The probe will take months but signals zero tolerance.", "label": "Full Investigation" },
    { "id": "opt_b", "text": "You instruct the {finance_role} to quietly recover the funds through an internal audit and negotiate executive resignations. This avoids a public spectacle but lets the architects escape prosecution.", "label": "Quiet Recovery" },
    { "id": "opt_c", "text": "You dissolve the current board and appoint a reform commission with public oversight hearings. The restructuring disrupts energy operations for weeks but rebuilds institutional credibility.", "label": "Public Restructuring" }
  ]
}
\`\`\`

QUALITY RULES:
- Description: 2-4 sentences, 30-200 words.
- Option text: 2-4 sentences, 20-150 words. Describe the concrete action and mechanism.

${buildMetricHintsForSkeleton(params.bundle)}

${params.bundleGuidance}
${params.scopeGuidance}

Return ONLY the JSON object matching the schema. No prose outside JSON.`;
}

/**
 * Ollama sub-phase prompt: Effects & Outcomes (Phase B)
 * Focused prompt for generating effects, outcomes, and classifications.
 * Receives the skeleton from Phase A as context.
 */
export function getOllamaEffectsPrompt(params: {
  skeleton: { title: string; description: string; options: Array<{ id: string; text: string; label: string }> };
  bundle: string;
  validMetricIds: string[];
  inverseMetrics: string[];
  scopeTier: string;
  optionDomains?: Array<{ label: string; primaryMetric: string }>;
  retryFeedback?: string;
}): string {
  const optionsSummary = params.skeleton.options
    .map(o => `- ${o.id} (${o.label}): ${o.text}`)
    .join('\n');
  const metricList = params.validMetricIds.join(', ');
  const optionDomainRules = Array.isArray(params.optionDomains) && params.optionDomains.length === 3
    ? `\nOPTION DOMAIN REQUIREMENTS:\n${params.optionDomains.map((domain, index) => `- Option ${index + 1} (${domain.label}): MUST include at least one effect with targetMetricId=${domain.primaryMetric}`).join('\n')}`
    : '';
  const retryBlock = params.retryFeedback
    ? `\nPREVIOUS ATTEMPT FAILED — AVOID THESE ISSUES:\n${params.retryFeedback}\n`
    : '';

  return `Generate effects, outcomes, and classifications for each option in this scenario.

SCENARIO: "${params.skeleton.title}"
${params.skeleton.description}

OPTIONS:
${optionsSummary}

BUNDLE: ${params.bundle}
${optionDomainRules}
${retryBlock}
For EACH of the 3 options, generate:

EFFECTS (2-4 per option):
- targetMetricId: MUST be one of: ${metricList}
- value: number between -4.0 and +4.0 (magnitude of impact)
- type: "delta"
- duration: 1-20 (turns the effect lasts)
- probability: 1.0
- At least 1 effect MUST target a metric in the ${params.bundle} domain.
- Each option MUST affect at least one metric the other two options do not target. Do not give all three options the same metric set.

INVERSE METRIC SIGN RULE — ALL values for these metrics MUST be NEGATIVE:
  metric_corruption: -1.5 means less corruption (good), +1.5 means more corruption (bad)
  metric_crime: -1.5 means less crime (good), +1.5 means more crime (bad)
  metric_inflation: -1.5 means prices stabilizing (good), +1.5 means inflation rising (bad)
  metric_bureaucracy: -1.5 means streamlined (good), +1.5 means more red tape (bad)
If your option IMPROVES any of these, the value MUST be negative. No exceptions.
All other metrics: positive = improvement, negative = worsening.
SELF-CHECK before returning: for each effect where targetMetricId is one of the four inverse metrics above, verify the sign matches the intended outcome direction. Flip it if wrong.

EFFECT-NARRATIVE COHERENCE — every effect MUST trace to a mechanism in the option text:
- If the option text says "cut spending" → metric_budget or metric_economy must reflect it.
- If the option text says "crackdown" or "arrest" → metric_liberty must go down.
- If the option text says "public announcement" or "reform promise" → an approval effect is warranted.
- If no mechanism in the option text explains why an effect occurs, remove that effect.
- Do NOT assign approval effects unless the option describes a visible public signal.
- Phantom effects (metric swings with no textual cause) make the game feel gamey, not real.

OUTCOMES — third-person news report style:
- NEVER use "you" or "your" in outcome fields.
- NEVER use "the government", "the administration", "the president", or "the executive" — these are audit failures.
- USE INSTEAD: "the {leader_title}", "{leader_title}'s government", or "the {leader_title}'s administration".
- ✅ "The {leader_title}'s government announced austerity measures"
- ✅ "The {leader_title} signed the emergency decree"
- ❌ "The government announced austerity measures"
- ❌ "Your administration increased spending"
- Use only tokens from the scenario's Token Context. Write "the {token}" naturally — no special {the_*} prefix syntax.
- Write international bodies as plain language. Never invent tokens.
- NEVER hardcode country names, capitals, party names, institution names, or currency names.
- NEVER use absolute money figures in prose. Use relative language.
- outcomeHeadline: 3-15 words, newspaper headline
- outcomeSummary: 2-3 sentences, at least 200 characters, journalistic lede covering what happened and immediate consequence
- outcomeContext: 4-6 sentences, at least 350 characters. Describe institutional reactions, second-order consequences, and political fallout. Each outcome must be unique to its option.

EXAMPLE (one option, correct format):
\`\`\`json
{
  "id": "opt_a",
  "effects": [
    { "targetMetricId": "metric_corruption", "value": -2.1, "type": "delta", "duration": 8, "probability": 1.0 },
    { "targetMetricId": "metric_economy", "value": -0.8, "type": "delta", "duration": 4, "probability": 1.0 }
  ],
  "outcomeHeadline": "Anti-Corruption Raids Shake Energy Sector",
  "outcomeSummary": "The {leader_title}'s government launched a sweeping investigation into the state energy firm. Prosecutors arrested twelve senior executives and froze assets worth a significant share of the annual energy budget.",
  "outcomeContext": "The {leader_title} appeared on state television to announce the arrests, calling the scheme an unprecedented betrayal of public trust. The {finance_role} confirmed that recovered funds would be redirected to infrastructure repairs. Opposition leaders praised the crackdown but questioned why oversight had failed for years. International credit agencies placed the country on review, citing short-term fiscal uncertainty. Energy sector unions warned that operational disruptions could last months.",
  "is_authoritarian": false,
  "moral_weight": 0.6,
  "classification": { "riskLevel": "moderate", "ideology": "center", "approach": "administrative" }
}
\`\`\`

CLASSIFICATION:
- is_authoritarian: boolean (true if this option curtails rights, concentrates power, or bypasses institutions)
- moral_weight: -1.0 to 1.0
- classification.riskLevel: safe | moderate | risky | dangerous
- classification.ideology: left | center | right
- classification.approach: diplomatic | economic | military | humanitarian | administrative

Return JSON with { options: [{ id, effects, outcomeHeadline, outcomeSummary, outcomeContext, is_authoritarian, moral_weight, classification }] }`;
}

/**
 * Load the active reflection prompt from Firestore.
 */
export async function getReflectionPrompt(): Promise<string> {
  const template = await getPromptTemplate('reflection');
  if (template) return template.sections.constraints;
  throw new Error('[PromptTemplates] No active "reflection" prompt template found in Firestore.');
}

/**
 * Load the active architect prompt from Firestore.
 */
export async function getArchitectPromptBase(): Promise<string> {
  const template = await getPromptTemplate('architect_drafter');
  if (template) return template.sections.constraints;
  throw new Error('[PromptTemplates] No active "architect_drafter" prompt template found in Firestore.');
}

export function getBundlePromptOverlay(bundle: BundleId): BundlePromptOverlay {
  return BUNDLE_PROMPT_OVERLAYS[bundle];
}

export function getScopePromptOverlay(scopeTier: ScenarioScopeTier): ScopePromptOverlay {
  return SCOPE_PROMPT_OVERLAYS[scopeTier];
}

export function getBundlesWithPromptOverlays(): readonly BundleId[] {
  return ALL_BUNDLE_IDS.filter((bundleId) => Boolean(BUNDLE_PROMPT_OVERLAYS[bundleId]));
}

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

/**
 * Assemble the final drafter prompt with optional few-shot examples and reflection.
 */
export function buildDrafterPrompt(
  basePrompt: string,
  fewShotExamples?: BundleScenario[],
  reflectionPrompt?: string,
  options?: BuildDrafterPromptOptions
): string {
  const sections: DrafterPromptSection[] = [{ body: basePrompt }];

  const isLowLatency = Boolean(options?.lowLatencyMode);

  if (isLowLatency) {
    sections.push(buildLowLatencyDrafterSection());
  }

  if (!(options?.omitExamples || isLowLatency) && fewShotExamples && fewShotExamples.length > 0) {
    sections.push(buildFewShotExamplesSection(fewShotExamples));
  }

  if (!(options?.omitReflection || isLowLatency) && reflectionPrompt) {
    sections.push(buildReflectionSection(reflectionPrompt));
  }

  return assemblePromptSections(sections);
}

export function buildArchitectPrompt(
  basePrompt: string,
  options?: { lowLatencyMode?: boolean }
): string {
  if (!options?.lowLatencyMode) {
    return basePrompt;
  }

  return `# LOW-LATENCY MODE
You are The Architect for The Administration.

Return valid JSON only.

Rules:
- Write plain-language, human-readable governance dilemmas.
- Use only approved tokens from the Token System section. Write "the {finance_role}" naturally — no special article form syntax.
- For exclusive scope: use real names from the country profile, no tokens.
- Keep each concept realistic, politically grounded, and appropriate for the requested bundle and scope.
- Make the dilemma clear, with real tradeoffs and no obvious best answer.
- Use only canonical metric IDs in primaryMetrics and secondaryMetrics.
- Keep each concept concise: 2 short sentences are enough.
- Prefer domestic actors unless scope clearly justifies foreign actors.
- Do not add explanation outside the requested JSON shape.`;
}
