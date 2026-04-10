import type { CountryDocument, CountryRelationship, CountryWorldState } from '../types';
import type { ActionResolutionRequest, MetricDelta } from '../shared/action-resolution-contract';
import { resolveActionTemplate } from './action-templates';

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
