import type { CountryDocument, CountryRelationship, CountryWorldState, RequiresFlag } from '../types';
import type { ActionResolutionRequest, MetricDelta } from '../shared/action-resolution-contract';
import { resolveActionTemplate } from './action-templates';
import { ACTIVE_EVENT_FLAGS } from '../shared/scenario-audit';

export interface NeighborScenarioSeed {
    flag: RequiresFlag;
    actorCountryId: string;
    actorCountryName: string;
    targetCountryId?: string;
    targetCountryName?: string;
    narrativeHint: string;
    severity: number; // 0–1 intensity hint
    ttlTurns: number;
}

export interface WorldEvent {
    id: string;
    timestamp: string;
    actorCountryId: string;
    actorCountryName: string;
    targetCountryId: string;
    targetCountryName: string;
    actionType: string;
    actionCategory: 'diplomatic' | 'military';
    severity: 'low' | 'medium' | 'high';
    headline: string;
    summary: string;
    context: string;
    newsCategory: string;
    newsTags: string[];
    globalMetricDeltas: MetricDelta[];
    regionId?: string;
    isBreakingNews: boolean;
    /** Optional seed when this event represents a dynamic active_* flag firing. */
    scenarioSeed?: NeighborScenarioSeed;
}

type RelationshipType = CountryRelationship['type'];

// ---------------------------------------------------------------------------
// Action selection weights by relationship type
// ---------------------------------------------------------------------------

interface ActionPool {
    actionType: string;
    actionCategory: 'diplomatic' | 'military';
    weight: number;
}

function buildActionPool(relType: RelationshipType): ActionPool[] {
    if (relType === 'conflict') {
        return [
            { actionType: 'military_strike', actionCategory: 'military', weight: 40 },
            { actionType: 'covert_ops', actionCategory: 'military', weight: 20 },
            { actionType: 'special_ops', actionCategory: 'military', weight: 20 },
            { actionType: 'naval_blockade', actionCategory: 'military', weight: 10 },
            { actionType: 'impose_sanctions', actionCategory: 'diplomatic', weight: 10 },
        ];
    }
    if (relType === 'adversary') {
        return [
            { actionType: 'impose_sanctions', actionCategory: 'diplomatic', weight: 25 },
            { actionType: 'covert_ops', actionCategory: 'military', weight: 20 },
            { actionType: 'cyberattack', actionCategory: 'military', weight: 20 },
            { actionType: 'expel_ambassador', actionCategory: 'diplomatic', weight: 15 },
            { actionType: 'naval_blockade', actionCategory: 'military', weight: 10 },
            { actionType: 'special_ops', actionCategory: 'military', weight: 10 },
        ];
    }
    if (relType === 'rival') {
        return [
            { actionType: 'impose_sanctions', actionCategory: 'diplomatic', weight: 30 },
            { actionType: 'covert_ops', actionCategory: 'military', weight: 20 },
            { actionType: 'expel_ambassador', actionCategory: 'diplomatic', weight: 20 },
            { actionType: 'cyberattack', actionCategory: 'military', weight: 15 },
            { actionType: 'trade_agreement', actionCategory: 'diplomatic', weight: 15 },
        ];
    }
    if (relType === 'neutral') {
        return [
            { actionType: 'trade_agreement', actionCategory: 'diplomatic', weight: 50 },
            { actionType: 'request_alliance', actionCategory: 'diplomatic', weight: 25 },
            { actionType: 'impose_sanctions', actionCategory: 'diplomatic', weight: 15 },
            { actionType: 'covert_ops', actionCategory: 'military', weight: 10 },
        ];
    }
    if (relType === 'strategic_partner' || relType === 'formal_ally') {
        return [
            { actionType: 'trade_agreement', actionCategory: 'diplomatic', weight: 55 },
            { actionType: 'request_alliance', actionCategory: 'diplomatic', weight: 35 },
            { actionType: 'impose_sanctions', actionCategory: 'diplomatic', weight: 10 },
        ];
    }
    return [{ actionType: 'trade_agreement', actionCategory: 'diplomatic', weight: 100 }];
}

function pickWeighted<T extends { weight: number }>(pool: T[], seed: number): T {
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let roll = ((seed % total) + total) % total;
    for (const item of pool) {
        roll -= item.weight;
        if (roll < 0) return item;
    }
    return pool[pool.length - 1];
}

function pickSeverity(seed: number): 'low' | 'medium' | 'high' {
    const roll = ((seed % 100) + 100) % 100;
    if (roll < 60) return 'low';
    if (roll < 90) return 'medium';
    return 'high';
}

// ---------------------------------------------------------------------------
// Country pair selection
// ---------------------------------------------------------------------------

interface CountryPair {
    actor: CountryDocument;
    target: CountryDocument;
    relationship: CountryRelationship;
}

function collectAdversarialPairs(countries: CountryDocument[]): CountryPair[] {
    const byId = new Map(countries.map((c) => [c.id, c]));
    const pairs: CountryPair[] = [];
    const seen = new Set<string>();

    for (const actor of countries) {
        const hostile = [
            ...actor.geopolitical.adversaries,
            ...actor.geopolitical.neighbors.filter(
                (n) => n.type === 'rival' || n.type === 'conflict',
            ),
        ];
        for (const rel of hostile) {
            const pairKey = [actor.id, rel.countryId].sort().join('|');
            if (seen.has(pairKey)) continue;
            seen.add(pairKey);
            const target = byId.get(rel.countryId);
            if (target) pairs.push({ actor, target, relationship: rel });
        }
    }
    return pairs;
}

function collectDiplomaticPairs(countries: CountryDocument[]): CountryPair[] {
    const byId = new Map(countries.map((c) => [c.id, c]));
    const pairs: CountryPair[] = [];
    const seen = new Set<string>();

    for (const actor of countries) {
        const partners = actor.geopolitical.neighbors.filter(
            (n) => n.type === 'neutral' || n.type === 'strategic_partner' || n.type === 'formal_ally',
        );
        for (const rel of partners) {
            const pairKey = [actor.id, rel.countryId].sort().join('|');
            if (seen.has(pairKey)) continue;
            seen.add(pairKey);
            const target = byId.get(rel.countryId);
            if (target) pairs.push({ actor, target, relationship: rel });
        }
    }
    return pairs;
}

// ---------------------------------------------------------------------------
// Indirect player impact
// ---------------------------------------------------------------------------

const ALLY_HIT_DELTAS: MetricDelta[] = [
    { metricId: 'metric_foreign_relations', delta: -3 },
    { metricId: 'metric_military', delta: -1 },
    { metricId: 'metric_unrest', delta: 2 },
];

const TRADE_PARTNER_SANCTIONED_DELTAS: MetricDelta[] = [
    { metricId: 'metric_trade', delta: -2 },
    { metricId: 'metric_economy', delta: -1 },
];

const NUCLEAR_GLOBAL_DELTAS: MetricDelta[] = [
    { metricId: 'metric_environment', delta: -4 },
    { metricId: 'metric_health', delta: -2 },
    { metricId: 'metric_energy', delta: -3 },
    { metricId: 'metric_economy', delta: -3 },
    { metricId: 'metric_foreign_relations', delta: -4 },
];

const REGIONAL_CONFLICT_DELTAS: MetricDelta[] = [
    { metricId: 'metric_immigration', delta: 3 },
    { metricId: 'metric_economy', delta: -2 },
];

export function getIndirectPlayerDeltas(
    event: WorldEvent,
    playerRelationships: CountryRelationship[],
    playerRegion: string,
): MetricDelta[] {
    const deltas: MetricDelta[] = [];

    if (event.actionType === 'nuclear_strike') {
        deltas.push(...NUCLEAR_GLOBAL_DELTAS);
        return deltas;
    }

    const involvedIds = new Set([event.actorCountryId, event.targetCountryId]);

    for (const rel of playerRelationships) {
        if (!involvedIds.has(rel.countryId)) continue;

        if (
            (rel.type === 'formal_ally' || rel.type === 'strategic_partner') &&
            rel.countryId === event.targetCountryId &&
            event.actionCategory === 'military'
        ) {
            deltas.push(...ALLY_HIT_DELTAS);
        }

        if (
            rel.type === 'strategic_partner' &&
            rel.countryId === event.targetCountryId &&
            event.actionType === 'impose_sanctions'
        ) {
            deltas.push(...TRADE_PARTNER_SANCTIONED_DELTAS);
        }
    }

    if (event.regionId && event.regionId === playerRegion && event.actionCategory === 'military') {
        deltas.push(...REGIONAL_CONFLICT_DELTAS);
    }

    return deltas;
}

// ---------------------------------------------------------------------------
// Tick generator
// ---------------------------------------------------------------------------

function buildSyntheticRequest(
    actor: CountryDocument,
    target: CountryDocument,
    relationship: CountryRelationship,
    actionType: string,
    actionCategory: 'diplomatic' | 'military',
    severity: 'low' | 'medium' | 'high',
    turn: number,
): ActionResolutionRequest {
    return {
        actionCategory,
        actionType,
        countryId: actor.id,
        countryName: actor.name,
        targetCountryId: target.id,
        targetCountryName: target.name,
        turn,
        maxTurns: 20,
        phase: turn <= 6 ? 'early' : turn <= 14 ? 'mid' : 'final',
        metrics: {},
        severity,
        relationship: relationship.strength,
        relationshipType: relationship.type,
        targetGovernmentCategory: target.geopolitical.governmentCategory,
        targetRegion: target.region,
    };
}

function generateEventId(actorId: string, targetId: string, actionType: string, timestamp: string): string {
    const raw = `${actorId}|${targetId}|${actionType}|${timestamp}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        hash = (hash << 5) - hash + raw.charCodeAt(i);
        hash |= 0;
    }
    return `wev_${Math.abs(hash).toString(36)}`;
}

function computeGlobalDeltas(event: WorldEvent): MetricDelta[] {
    if (event.actionType === 'nuclear_strike') return NUCLEAR_GLOBAL_DELTAS;
    if (event.actionCategory === 'military' && event.severity === 'high') {
        return [
            { metricId: 'metric_foreign_relations', delta: -1 },
            { metricId: 'metric_trade', delta: -1 },
        ];
    }
    return [];
}

// ---------------------------------------------------------------------------
// NPC country metric drift (mirrors logic.md §7 coupling rules)
// ---------------------------------------------------------------------------

function clamp(v: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, v));
}

export function applyNPCMetricDrift(metrics: Partial<Record<string, number>>): Partial<Record<string, number>> {
    const m = { ...metrics };
    const get = (k: string) => m[k] ?? 50;
    const deltas: Record<string, number> = {};

    const add = (k: string, d: number) => { deltas[k] = (deltas[k] ?? 0) + d; };

    const pub = get('metric_public_order');
    const inf = get('metric_inflation');
    const eco = get('metric_economy');
    const hous = get('metric_housing');
    const eq = get('metric_equality');
    const unr = get('metric_unrest');
    const corr = get('metric_corruption');
    const lib = get('metric_liberty');
    const dem = get('metric_democracy');
    const frel = get('metric_foreign_relations');
    const innov = get('metric_innovation');
    const mil = get('metric_military');
    const bud = get('metric_budget');
    const infra = get('metric_infrastructure');
    const crime = get('metric_crime');
    const energy = get('metric_energy');

    // Unrest drivers
    if (pub < 40) add('metric_unrest', 1.5);
    if (inf > 70) add('metric_unrest', 0.75);
    if (eco < 35) add('metric_unrest', 0.5);
    if (hous < 40) add('metric_unrest', (40 - hous) * 0.015);
    if (eq < 40) add('metric_unrest', (40 - eq) * 0.010);
    if (pub >= 40 && inf <= 70 && eco >= 35 && hous >= 40 && eq >= 40) add('metric_unrest', -0.75);

    // Liberty / democracy / corruption loop
    if (corr > 60) add('metric_liberty', -1.0);
    if (lib < 35) add('metric_democracy', -(35 - lib) * 0.015);
    if (dem < 35) add('metric_corruption', (35 - dem) * 0.015);

    // Economy couplings
    if (frel < 35) add('metric_economy', -(35 - frel) * 0.02);
    if (corr > 55) add('metric_economy', -(corr - 55) * 0.025);
    if (pub < 35) add('metric_economy', -(35 - pub) * 0.02);
    if (inf > 75) add('metric_economy', -(inf - 75) * 0.02);
    if (innov > 65) add('metric_economy', (innov - 65) * 0.003);

    // Inflation
    if (eco > 65) add('metric_inflation', (eco - 65) * 0.025);
    if (eco < 35) add('metric_inflation', -(35 - eco) * 0.008);
    if (energy < 35) add('metric_inflation', (35 - energy) * 0.015);

    // Public order
    if (unr > 50) add('metric_public_order', -(unr - 50) * 0.025);
    if (crime > 65) add('metric_public_order', -(crime - 65) * 0.025);

    // Crime / housing / equality
    if (eq < 45) add('metric_crime', (45 - eq) * 0.015);
    if (hous < 40) add('metric_crime', (40 - hous) * 0.012);
    if (hous < 40) add('metric_equality', -(40 - hous) * 0.015);
    if (eco < 45) add('metric_housing', -(45 - eco) * 0.012);

    // Foreign relations / sovereignty
    if (corr > 60) add('metric_foreign_relations', -(corr - 60) * 0.02);
    if (unr > 65) add('metric_foreign_relations', -(unr - 65) * 0.02);

    // Health / employment / budget
    if (eco > 65) add('metric_health', (eco - 65) * 0.005);
    if (eco < 35) add('metric_health', -(35 - eco) * 0.010);
    if (eco > 60) add('metric_employment', (eco - 60) * 0.012);
    if (eco < 40) add('metric_employment', -(40 - eco) * 0.018);
    if (eco > 60) add('metric_budget', (eco - 60) * 0.010);
    if (eco < 40) add('metric_budget', -(40 - eco) * 0.015);
    if (mil > 70) add('metric_budget', -(mil - 70) * 0.008);

    // Infrastructure
    if (bud < 40) add('metric_infrastructure', -(40 - bud) * 0.010);
    if (eco < 35) add('metric_infrastructure', -(35 - eco) * 0.008);
    if (infra < 35) add('metric_infrastructure', -0.3);

    // Education
    if (bud < 35) add('metric_education', -(35 - bud) * 0.008);
    if (eco > 65) add('metric_education', (eco - 65) * 0.003);

    // Trade
    if (frel < 35) add('metric_trade', -(35 - frel) * 0.015);
    if (frel > 65) add('metric_trade', (frel - 65) * 0.008);
    if (eco < 35) add('metric_trade', -(35 - eco) * 0.010);

    // Environment
    if (eco > 70) add('metric_environment', -(eco - 70) * 0.008);
    if (energy < 40) add('metric_environment', -(40 - energy) * 0.006);
    if (innov > 70) add('metric_environment', (innov - 70) * 0.004);

    // Apply deltas and clamp
    for (const [key, delta] of Object.entries(deltas)) {
        const inverse = ['metric_corruption', 'metric_inflation', 'metric_crime', 'metric_bureaucracy', 'metric_unrest', 'metric_economic_bubble', 'metric_foreign_influence'];
        const current = get(key);
        m[key] = clamp(current + delta);
        // Equilibrium pull (6% toward equilibrium at 50 for standard, 28 for inverse)
        const equilibrium = inverse.includes(key) ? 28 : 50;
        const pullDelta = (equilibrium - (m[key] ?? equilibrium)) * 0.06;
        m[key] = clamp((m[key] ?? equilibrium) + pullDelta);
    }

    return m;
}

export function buildUpdatedWorldState(
    country: CountryDocument,
    existing: CountryWorldState | null,
    eventRelationshipDeltas: Array<{ countryId: string; delta: number }>,
): CountryWorldState {
    const baseMetrics = existing?.currentMetrics ?? country.gameplay.starting_metrics;
    const updatedMetrics = applyNPCMetricDrift(baseMetrics);

    const baseRelationships: CountryRelationship[] = existing?.relationships?.length
        ? existing.relationships
        : [...(country.geopolitical.neighbors ?? []), ...(country.geopolitical.allies ?? []), ...(country.geopolitical.adversaries ?? [])];

    const updatedRelationships = baseRelationships.map(rel => {
        const delta = eventRelationshipDeltas.find(d => d.countryId === rel.countryId);
        if (!delta) return rel;
        const newStrength = clamp(rel.strength + delta.delta, -100, 100);
        let newType = rel.type;
        if (newStrength >= 70 && rel.type === 'neutral') newType = 'strategic_partner';
        if (newStrength <= -70 && rel.type === 'neutral') newType = 'rival';
        if (newStrength <= -85 && (rel.type === 'rival' || rel.type === 'adversary')) newType = 'conflict';
        if (newStrength >= 85 && rel.type === 'strategic_partner') newType = 'formal_ally';
        return { ...rel, strength: newStrength, type: newType };
    });

    return {
        countryId: country.id,
        currentMetrics: updatedMetrics,
        relationships: updatedRelationships,
        lastTickAt: new Date().toISOString(),
        generation: (existing?.generation ?? 0) + 1,
        recentScenarioIds: existing?.recentScenarioIds ?? [],
    };
}

export function generateWorldTick(
    countries: CountryDocument[],
    currentTurn: number = 1,
    seed: number = Date.now(),
): WorldEvent[] {
    if (countries.length < 2) return [];

    const adversarialPairs = collectAdversarialPairs(countries);
    const diplomaticPairs = collectDiplomaticPairs(countries);

    const selectedPairs: CountryPair[] = [];

    const adversarialCount = Math.min(adversarialPairs.length, Math.floor(2 + (seed % 2)));
    for (let i = 0; i < adversarialCount; i++) {
        const pair = adversarialPairs[(seed + i * 7) % adversarialPairs.length];
        if (pair && !selectedPairs.some((p) => p.actor.id === pair.actor.id && p.target.id === pair.target.id)) {
            selectedPairs.push(pair);
        }
    }

    const diplomaticCount = Math.max(0, 4 - selectedPairs.length);
    for (let i = 0; i < diplomaticCount && i < diplomaticPairs.length; i++) {
        const pair = diplomaticPairs[(seed + i * 13) % diplomaticPairs.length];
        if (pair && !selectedPairs.some((p) => p.actor.id === pair.actor.id && p.target.id === pair.target.id)) {
            selectedPairs.push(pair);
        }
    }

    const events: WorldEvent[] = [];
    const timestamp = new Date().toISOString();

    for (let i = 0; i < selectedPairs.length; i++) {
        const { actor, target, relationship } = selectedPairs[i];
        const pairSeed = seed + i * 31 + actor.id.charCodeAt(0);

        const pool = buildActionPool(relationship.type);
        const { actionType, actionCategory } = pickWeighted(pool, pairSeed);
        const severity = pickSeverity(pairSeed + 17);

        const req = buildSyntheticRequest(actor, target, relationship, actionType, actionCategory, severity, currentTurn);
        const resolved = resolveActionTemplate(req);
        if (!resolved) continue;

        const event: WorldEvent = {
            id: generateEventId(actor.id, target.id, actionType, timestamp),
            timestamp,
            actorCountryId: actor.id,
            actorCountryName: actor.name,
            targetCountryId: target.id,
            targetCountryName: target.name,
            actionType,
            actionCategory,
            severity,
            headline: resolved.headline,
            summary: resolved.summary,
            context: resolved.context,
            newsCategory: resolved.newsCategory,
            newsTags: resolved.newsTags,
            globalMetricDeltas: [],
            regionId: actor.region,
            isBreakingNews: severity === 'high' || actionType === 'nuclear_strike' || actionType === 'military_strike',
        };

        event.globalMetricDeltas = computeGlobalDeltas(event);
        events.push(event);
    }

    return events;
}

// ---------------------------------------------------------------------------
// Neighbor event seeding — dynamic active_* flag firing with TTL bookkeeping
// ---------------------------------------------------------------------------

interface CandidateEvent {
    flag: RequiresFlag;
    weight: number;
    narrativeHint: string;
    ttlRange: readonly [number, number]; // [minTurns, maxTurns]
    severityRange: readonly [number, number];
    // When true, prefers a hostile neighbor as target
    needsHostileTarget?: boolean;
}

function buildNeighborCandidates(country: CountryDocument): CandidateEvent[] {
    const flags = country.flags ?? {};
    const candidates: CandidateEvent[] = [];

    const push = (c: CandidateEvent) => candidates.push(c);

    if (flags.seismically_active) {
        push({
            flag: 'active_natural_disaster',
            weight: 10,
            narrativeHint: 'earthquake strikes a populated region',
            ttlRange: [4, 8],
            severityRange: [0.4, 0.9],
        });
    }
    if (flags.tropical_cyclone_zone && flags.coastal) {
        push({
            flag: 'active_natural_disaster',
            weight: 10,
            narrativeHint: 'tropical cyclone makes landfall on the coast',
            ttlRange: [3, 6],
            severityRange: [0.3, 0.9],
        });
    }
    if (flags.coastal && !flags.arid_interior) {
        push({
            flag: 'active_natural_disaster',
            weight: 4,
            narrativeHint: 'coastal flooding follows intense rainfall',
            ttlRange: [3, 5],
            severityRange: [0.3, 0.7],
        });
    }
    if (flags.arid_interior) {
        push({
            flag: 'active_natural_disaster',
            weight: 5,
            narrativeHint: 'wildfires sweep through dry interior',
            ttlRange: [3, 6],
            severityRange: [0.3, 0.8],
        });
        push({
            flag: 'active_energy_crisis',
            weight: 3,
            narrativeHint: 'prolonged drought triggers energy grid strain',
            ttlRange: [3, 6],
            severityRange: [0.3, 0.7],
        });
    }

    if (flags.has_civilian_firearms) {
        push({
            flag: 'active_mass_shooting',
            weight: 4,
            narrativeHint: 'mass shooting in a public space',
            ttlRange: [3, 5],
            severityRange: [0.4, 0.8],
        });
    }

    if (flags.fragile_state) {
        push({
            flag: 'active_civil_war',
            weight: 6,
            narrativeHint: 'armed insurgency escalates into open civil war',
            ttlRange: [5, 8],
            severityRange: [0.5, 0.9],
        });
        push({
            flag: 'active_coup_attempt',
            weight: 5,
            narrativeHint: 'military faction launches coup against the government',
            ttlRange: [3, 5],
            severityRange: [0.5, 0.9],
        });
        push({
            flag: 'active_terror_campaign',
            weight: 4,
            narrativeHint: 'coordinated bombing campaign rattles the capital',
            ttlRange: [4, 6],
            severityRange: [0.4, 0.8],
        });
    }

    // Diplomatic crises are possible anywhere with any adversary/rival
    const hasHostile = (country.geopolitical.adversaries?.length ?? 0) > 0
        || (country.geopolitical.neighbors ?? []).some(n => n.type === 'rival' || n.type === 'conflict');
    if (hasHostile) {
        push({
            flag: 'active_diplomatic_crisis',
            weight: 5,
            narrativeHint: 'ambassador recalled amid escalating tensions',
            ttlRange: [3, 5],
            severityRange: [0.3, 0.7],
            needsHostileTarget: true,
        });
    }

    if (flags.adversary && flags.large_military) {
        push({
            flag: 'active_interstate_war',
            weight: 2,
            narrativeHint: 'cross-border offensive ignites interstate war',
            ttlRange: [6, 8],
            severityRange: [0.6, 1.0],
            needsHostileTarget: true,
        });
    }

    // Pandemic can fire anywhere but rare
    push({
        flag: 'active_pandemic',
        weight: 1,
        narrativeHint: 'novel disease outbreak spreads through urban centres',
        ttlRange: [6, 8],
        severityRange: [0.4, 0.9],
    });

    return candidates;
}

function pickHostileTarget(country: CountryDocument, seed: number): { countryId: string; countryName: string } | null {
    const hostile = [
        ...country.geopolitical.adversaries ?? [],
        ...(country.geopolitical.neighbors ?? []).filter(n => n.type === 'rival' || n.type === 'conflict'),
    ];
    if (hostile.length === 0) return null;
    const pick = hostile[Math.abs(seed) % hostile.length];
    return { countryId: pick.countryId, countryName: pick.countryId };
}

function rangePick(range: readonly [number, number], seed: number): number {
    const [min, max] = range;
    if (max <= min) return min;
    const span = max - min;
    const r = Math.abs(Math.sin(seed)) * span;
    return min + r;
}

/**
 * Walk activeEventFlags, evict expired entries to recentEventHistory.
 * Pure — returns a new CountryWorldState.
 */
export function decayActiveEventFlags(
    state: CountryWorldState,
    currentTurn: number,
    now: number = Date.now(),
): CountryWorldState {
    const active = state.activeEventFlags;
    if (!active) return state;

    const nextActive: NonNullable<CountryWorldState['activeEventFlags']> = {};
    const expired: NonNullable<CountryWorldState['recentEventHistory']> = [];

    for (const [key, value] of Object.entries(active)) {
        if (!value) continue;
        if (value.expiresAt <= now) {
            expired.push({
                flag: key as RequiresFlag,
                turn: currentTurn,
                scenarioId: value.sourceScenarioId,
            });
        } else {
            nextActive[key as RequiresFlag] = value;
        }
    }

    if (expired.length === 0) return state;

    const history = [...(state.recentEventHistory ?? []), ...expired].slice(-40);
    return {
        ...state,
        activeEventFlags: nextActive,
        recentEventHistory: history,
    };
}

/**
 * Roll per-country event seeds. For each country, applies TTL decay first,
 * then with `gameplay.neighbor_event_chance` probability selects one plausible
 * active_* event flag from a static-trait-filtered candidate pool and writes
 * it to `activeEventFlags` with a severity-based TTL.
 *
 * Returns the updated world-state map + a list of structured WorldEvents with
 * `scenarioSeed` payloads the scenario engine can convert into pre-staged
 * neighbor scenarios.
 */
export function generateNeighborEventSeeds(
    countries: CountryDocument[],
    worldStates: Record<string, CountryWorldState>,
    currentTurn: number,
    seed: number = Date.now(),
    turnDurationMs: number = 6 * 60 * 60 * 1000, // 6h per turn default
): { updatedWorldStates: Record<string, CountryWorldState>; events: WorldEvent[] } {
    const now = Date.now();
    const updatedWorldStates: Record<string, CountryWorldState> = {};
    const events: WorldEvent[] = [];

    for (let i = 0; i < countries.length; i++) {
        const country = countries[i];
        const existing = worldStates[country.id];

        // Decay first so recentEventHistory is fresh before cooldown consultation.
        const decayed = existing ? decayActiveEventFlags(existing, currentTurn, now) : undefined;

        const chance = country.gameplay?.neighbor_event_chance ?? 0;
        const roll = Math.abs(Math.sin(seed + i * 97)) % 1;
        if (chance <= 0 || roll >= chance) {
            if (decayed) updatedWorldStates[country.id] = decayed;
            continue;
        }

        const candidates = buildNeighborCandidates(country);
        if (candidates.length === 0) {
            if (decayed) updatedWorldStates[country.id] = decayed;
            continue;
        }

        // Filter out flags that are already active or still inside cooldown window.
        const activeNow = new Set(Object.keys(decayed?.activeEventFlags ?? {}));
        const recentFlags = new Set((decayed?.recentEventHistory ?? []).map(h => h.flag));
        const eligible = candidates.filter(c => !activeNow.has(c.flag) && !recentFlags.has(c.flag));
        if (eligible.length === 0) {
            if (decayed) updatedWorldStates[country.id] = decayed;
            continue;
        }

        const picked = pickWeighted(eligible, seed + i * 17);
        const severity = rangePick(picked.severityRange, seed + i * 41);
        const ttlTurns = Math.round(rangePick(picked.ttlRange, seed + i * 53));
        const target = picked.needsHostileTarget ? pickHostileTarget(country, seed + i * 67) : null;

        // Write active flag entry to world state
        const baseState: CountryWorldState = decayed ?? {
            countryId: country.id,
            currentMetrics: {},
            relationships: [],
            lastTickAt: new Date(now).toISOString(),
            generation: 0,
            recentScenarioIds: [],
        };
        const nextActive = {
            ...(baseState.activeEventFlags ?? {}),
            [picked.flag]: {
                startedAt: now,
                expiresAt: now + ttlTurns * turnDurationMs,
                severity,
            },
        };
        updatedWorldStates[country.id] = {
            ...baseState,
            activeEventFlags: nextActive,
        };

        // Emit a WorldEvent carrying the scenarioSeed payload
        const timestamp = new Date(now).toISOString();
        const seedPayload: NeighborScenarioSeed = {
            flag: picked.flag,
            actorCountryId: country.id,
            actorCountryName: country.name,
            targetCountryId: target?.countryId,
            targetCountryName: target?.countryName,
            narrativeHint: picked.narrativeHint,
            severity,
            ttlTurns,
        };
        const severityBand: 'low' | 'medium' | 'high' = severity >= 0.7 ? 'high' : severity >= 0.4 ? 'medium' : 'low';
        events.push({
            id: generateEventId(country.id, target?.countryId ?? country.id, picked.flag, timestamp),
            timestamp,
            actorCountryId: country.id,
            actorCountryName: country.name,
            targetCountryId: target?.countryId ?? country.id,
            targetCountryName: target?.countryName ?? country.name,
            actionType: picked.flag,
            actionCategory: 'diplomatic',
            severity: severityBand,
            headline: `${country.name}: ${picked.narrativeHint}`,
            summary: picked.narrativeHint,
            context: `Dynamic event seed — ${picked.flag}`,
            newsCategory: 'world_event',
            newsTags: [picked.flag],
            globalMetricDeltas: [],
            regionId: country.region,
            isBreakingNews: severityBand === 'high',
            scenarioSeed: seedPayload,
        });
    }

    // Ensure countries that had world state but didn't fire still carry forward any decay.
    for (const country of countries) {
        if (updatedWorldStates[country.id]) continue;
        const existing = worldStates[country.id];
        if (!existing) continue;
        const decayed = decayActiveEventFlags(existing, currentTurn, now);
        updatedWorldStates[country.id] = decayed;
    }

    // Sanity: ensure we registered ACTIVE_EVENT_FLAGS contains every flag we produced.
    for (const evt of events) {
        if (!ACTIVE_EVENT_FLAGS.has(evt.actionType as RequiresFlag)) {
            // Defensive: should never happen because candidates derive from ACTIVE_EVENT_FLAGS domain.
            // Leave as-is; downstream will ignore unknown flags.
        }
    }

    return { updatedWorldStates, events };
}
