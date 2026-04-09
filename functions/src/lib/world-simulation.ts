import type { CountryDocument, CountryRelationship } from '../types';
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
