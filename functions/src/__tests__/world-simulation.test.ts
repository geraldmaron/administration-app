import { generateWorldTick, getIndirectPlayerDeltas } from '../lib/world-simulation';
import type { WorldEvent } from '../lib/world-simulation';
import type { CountryDocument } from '../types';
import type { CountryRelationship } from '../types';

function makeCountry(
    id: string,
    name: string,
    region: string,
    adversaries: Partial<CountryRelationship>[] = [],
    neighbors: Partial<CountryRelationship>[] = [],
    allies: Partial<CountryRelationship>[] = [],
): CountryDocument {
    return {
        id,
        name,
        code: id.toUpperCase().slice(0, 2),
        region: region as CountryDocument['region'],
        facts: {} as CountryDocument['facts'],
        military: {} as CountryDocument['military'],
        geopolitical: {
            neighbors: neighbors.map((n) => ({
                countryId: n.countryId ?? 'unknown',
                type: n.type ?? 'neutral',
                strength: n.strength ?? 0,
                sharedBorder: n.sharedBorder ?? false,
            })),
            allies: allies.map((a) => ({
                countryId: a.countryId ?? 'unknown',
                type: a.type ?? 'formal_ally',
                strength: a.strength ?? 70,
                sharedBorder: false,
            })),
            adversaries: adversaries.map((a) => ({
                countryId: a.countryId ?? 'unknown',
                type: a.type ?? 'adversary',
                strength: a.strength ?? -60,
                sharedBorder: a.sharedBorder ?? false,
            })),
            tags: [],
            governmentCategory: 'liberal_democracy',
            regimeStability: 70,
        },
        legislature: {} as CountryDocument['legislature'],
        legislature_initial_state: {} as CountryDocument['legislature_initial_state'],
        tokens: {},
        gameplay: {
            starting_metrics: {},
            metric_equilibria: {},
            bundle_weight_overrides: {},
            priority_tags: [],
            suppressed_tags: [],
            neighbor_event_chance: 0.3,
            term_turn_fraction: 1.0,
            difficulty: 'medium',
        },
        traits: [],
    };
}

const ALPHA = makeCountry('alpha', 'Alpha', 'Europe', [{ countryId: 'beta', type: 'adversary', strength: -70 }]);
const BETA = makeCountry('beta', 'Beta', 'Europe', [{ countryId: 'alpha', type: 'adversary', strength: -70 }]);
const GAMMA = makeCountry('gamma', 'Gamma', 'Europe', [], [{ countryId: 'delta', type: 'neutral', strength: 10 }]);
const DELTA = makeCountry('delta', 'Delta', 'Asia', [], [{ countryId: 'gamma', type: 'strategic_partner', strength: 40 }]);

describe('generateWorldTick', () => {
    it('returns an empty array when fewer than 2 countries', () => {
        expect(generateWorldTick([], 1, 42)).toHaveLength(0);
        expect(generateWorldTick([ALPHA], 1, 42)).toHaveLength(0);
    });

    it('generates at least 1 event for two adversarial countries', () => {
        const events = generateWorldTick([ALPHA, BETA], 1, 42);
        expect(events.length).toBeGreaterThan(0);
    });

    it('generates between 1 and 4 events for a full roster', () => {
        const events = generateWorldTick([ALPHA, BETA, GAMMA, DELTA], 1, 42);
        expect(events.length).toBeGreaterThanOrEqual(1);
        expect(events.length).toBeLessThanOrEqual(4);
    });

    it('produces events with required fields', () => {
        const events = generateWorldTick([ALPHA, BETA], 1, 42);
        for (const event of events) {
            expect(event.id).toBeTruthy();
            expect(event.timestamp).toBeTruthy();
            expect(event.actorCountryId).toBeTruthy();
            expect(event.targetCountryId).toBeTruthy();
            expect(event.headline).toBeTruthy();
            expect(event.summary).toBeTruthy();
            expect(event.newsCategory).toBeTruthy();
            expect(Array.isArray(event.newsTags)).toBe(true);
            expect(Array.isArray(event.globalMetricDeltas)).toBe(true);
            expect(typeof event.isBreakingNews).toBe('boolean');
        }
    });

    it('marks high-severity military events as breaking news', () => {
        let found = false;
        for (let seed = 0; seed < 500; seed++) {
            const events = generateWorldTick([ALPHA, BETA], 1, seed);
            if (events.some((e) => e.isBreakingNews && e.actionCategory === 'military')) {
                found = true;
                break;
            }
        }
        expect(found).toBe(true);
    });

    it('generates unique event IDs', () => {
        const events = generateWorldTick([ALPHA, BETA, GAMMA, DELTA], 1, 42);
        const ids = events.map((e) => e.id);
        const unique = new Set(ids);
        expect(unique.size).toBe(ids.length);
    });

    it('is deterministic for the same seed', () => {
        const a = generateWorldTick([ALPHA, BETA], 1, 99);
        const b = generateWorldTick([ALPHA, BETA], 1, 99);
        expect(a.map((e) => e.headline)).toEqual(b.map((e) => e.headline));
    });
});

describe('getIndirectPlayerDeltas', () => {
    const playerRelationships: CountryRelationship[] = [
        { countryId: 'beta', type: 'formal_ally', strength: 80, sharedBorder: false },
        { countryId: 'gamma', type: 'strategic_partner', strength: 40, sharedBorder: true },
    ];

    function makeEvent(overrides: Partial<WorldEvent>): WorldEvent {
        return {
            id: 'test_event',
            timestamp: new Date().toISOString(),
            actorCountryId: 'alpha',
            actorCountryName: 'Alpha',
            targetCountryId: 'beta',
            targetCountryName: 'Beta',
            actionType: 'military_strike',
            actionCategory: 'military',
            severity: 'high',
            headline: 'Alpha strikes Beta',
            summary: 'Summary',
            context: 'Context',
            newsCategory: 'crisis',
            newsTags: ['war'],
            globalMetricDeltas: [],
            regionId: 'Europe',
            isBreakingNews: true,
            ...overrides,
        };
    }

    it('returns ally-hit deltas when player ally is targeted militarily', () => {
        const event = makeEvent({ targetCountryId: 'beta', actionCategory: 'military' });
        const deltas = getIndirectPlayerDeltas(event, playerRelationships, 'Asia');
        const metricIds = deltas.map((d) => d.metricId);
        expect(metricIds).toContain('metric_foreign_relations');
        expect(metricIds).toContain('metric_military');
        expect(metricIds).toContain('metric_unrest');
    });

    it('returns trade-partner deltas when strategic partner is sanctioned', () => {
        const event = makeEvent({
            targetCountryId: 'gamma',
            actionType: 'impose_sanctions',
            actionCategory: 'diplomatic',
        });
        const deltas = getIndirectPlayerDeltas(event, playerRelationships, 'Asia');
        const metricIds = deltas.map((d) => d.metricId);
        expect(metricIds).toContain('metric_trade');
        expect(metricIds).toContain('metric_economy');
    });

    it('returns global nuclear deltas regardless of player relationships', () => {
        const event = makeEvent({ actionType: 'nuclear_strike', targetCountryId: 'unrelated' });
        const deltas = getIndirectPlayerDeltas(event, [], 'South_America');
        const metricIds = deltas.map((d) => d.metricId);
        expect(metricIds).toContain('metric_environment');
        expect(metricIds).toContain('metric_health');
        expect(metricIds).toContain('metric_energy');
    });

    it('returns regional conflict deltas when event is in same region', () => {
        const event = makeEvent({ regionId: 'Europe', actionCategory: 'military' });
        const deltas = getIndirectPlayerDeltas(event, [], 'Europe');
        const metricIds = deltas.map((d) => d.metricId);
        expect(metricIds).toContain('metric_immigration');
        expect(metricIds).toContain('metric_economy');
    });

    it('returns no deltas when player has no connection to the event', () => {
        const event = makeEvent({
            actorCountryId: 'epsilon',
            targetCountryId: 'zeta',
            actionCategory: 'diplomatic',
            actionType: 'trade_agreement',
            regionId: 'Asia',
        });
        const deltas = getIndirectPlayerDeltas(event, playerRelationships, 'Europe');
        expect(deltas).toHaveLength(0);
    });

    it('serializes correctly as plain JSON', () => {
        const event = makeEvent();
        const serialized = JSON.parse(JSON.stringify(event));
        expect(serialized.id).toBe(event.id);
        expect(serialized.globalMetricDeltas).toEqual([]);
    });
});
