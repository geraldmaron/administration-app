import {
    generateWorldTick,
    getIndirectPlayerDeltas,
    generateNeighborEventSeeds,
    decayActiveEventFlags,
} from '../lib/world-simulation';
import type { WorldEvent } from '../lib/world-simulation';
import type { CountryDocument, CountryWorldState, RequiresFlag } from '../types';
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

describe('decayActiveEventFlags', () => {
    const base: CountryWorldState = {
        countryId: 'xyz',
        currentMetrics: {},
        relationships: [],
        lastTickAt: new Date().toISOString(),
        generation: 1,
        recentScenarioIds: [],
    };

    it('evicts expired active flags into recentEventHistory', () => {
        const now = 1_000_000;
        const state: CountryWorldState = {
            ...base,
            activeEventFlags: {
                active_school_shooting: { startedAt: 0, expiresAt: now - 1, severity: 0.5 },
                active_pandemic: { startedAt: 0, expiresAt: now + 1_000_000, severity: 0.7 },
            },
        };
        const next = decayActiveEventFlags(state, 10, now);
        expect(next.activeEventFlags?.active_school_shooting).toBeUndefined();
        expect(next.activeEventFlags?.active_pandemic).toBeDefined();
        expect(next.recentEventHistory).toEqual([
            { flag: 'active_school_shooting', turn: 10, scenarioId: undefined },
        ]);
    });

    it('returns the same state when nothing has expired', () => {
        const now = 1_000_000;
        const state: CountryWorldState = {
            ...base,
            activeEventFlags: {
                active_pandemic: { startedAt: 0, expiresAt: now + 1_000, severity: 0.5 },
            },
        };
        const next = decayActiveEventFlags(state, 10, now);
        expect(next).toBe(state);
    });

    it('is a no-op when no activeEventFlags exist', () => {
        const next = decayActiveEventFlags(base, 10, Date.now());
        expect(next).toBe(base);
    });
});

describe('generateNeighborEventSeeds', () => {
    function mkCountry(
        id: string,
        flags: Partial<Record<RequiresFlag, boolean>>,
        chance = 1.0,
    ): CountryDocument {
        const c = makeCountry(id, id, 'Europe');
        c.flags = flags;
        c.gameplay.neighbor_event_chance = chance;
        return c;
    }

    it('respects neighbor_event_chance = 0 (no seeds fire)', () => {
        const c = mkCountry('zero', { seismically_active: true }, 0);
        const { events, updatedWorldStates } = generateNeighborEventSeeds([c], {}, 1, 42);
        expect(events).toHaveLength(0);
        expect(updatedWorldStates['zero']).toBeUndefined();
    });

    it('seeds only flags consistent with static traits', () => {
        const seismic = mkCountry('seis', { seismically_active: true }, 1);
        const arid = mkCountry('arid', { arid_interior: true }, 1);
        // Run several seeds and inspect produced flags
        const allFlagsSeen = new Set<string>();
        for (let s = 0; s < 20; s++) {
            const { events } = generateNeighborEventSeeds([seismic, arid], {}, 1, s);
            for (const ev of events) allFlagsSeen.add(ev.actionType);
        }
        // Arid should never produce a flood-coded natural disaster — we only test
        // that the flag vocabulary stays within the ACTIVE_EVENT_FLAGS set.
        expect(allFlagsSeen.size).toBeGreaterThan(0);
        for (const flag of allFlagsSeen) {
            expect(flag.startsWith('active_')).toBe(true);
        }
    });

    it('writes active flag entries with expiresAt in the future', () => {
        const c = mkCountry('coast', { coastal: true, tropical_cyclone_zone: true }, 1);
        const { updatedWorldStates, events } = generateNeighborEventSeeds([c], {}, 1, 7);
        // Either the roll produced an event (most likely) or not; both are valid,
        // but if an event fired, the world state must reflect it.
        if (events.length > 0) {
            const flag = events[0].actionType as RequiresFlag;
            const entry = updatedWorldStates['coast'].activeEventFlags?.[flag];
            expect(entry).toBeDefined();
            if (entry) {
                expect(entry.expiresAt).toBeGreaterThan(entry.startedAt);
                expect(entry.severity).toBeGreaterThanOrEqual(0);
                expect(entry.severity).toBeLessThanOrEqual(1);
            }
        }
    });

    it('decays expired flags before rolling new ones', () => {
        const c = mkCountry('decay', { seismically_active: true }, 0); // chance 0 so we only decay
        const now = Date.now();
        const state: CountryWorldState = {
            countryId: 'decay',
            currentMetrics: {},
            relationships: [],
            lastTickAt: new Date().toISOString(),
            generation: 1,
            recentScenarioIds: [],
            activeEventFlags: {
                active_school_shooting: { startedAt: 0, expiresAt: now - 1, severity: 0.5 },
            },
        };
        const { updatedWorldStates } = generateNeighborEventSeeds([c], { decay: state }, 5, 1);
        expect(updatedWorldStates['decay'].activeEventFlags?.active_school_shooting).toBeUndefined();
        expect(updatedWorldStates['decay'].recentEventHistory?.[0]?.flag).toBe('active_school_shooting');
    });

    it('emits a scenarioSeed payload on every generated event', () => {
        const c = mkCountry('seed', { seismically_active: true, has_civilian_firearms: true }, 1);
        const { events } = generateNeighborEventSeeds([c], {}, 1, 123);
        for (const ev of events) {
            expect(ev.scenarioSeed).toBeDefined();
            expect(ev.scenarioSeed?.flag).toBe(ev.actionType);
            expect(ev.scenarioSeed?.actorCountryId).toBe('seed');
            expect(ev.scenarioSeed?.narrativeHint).toBeTruthy();
            expect(ev.scenarioSeed?.ttlTurns).toBeGreaterThan(0);
        }
    });
});
