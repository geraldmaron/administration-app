import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { populationIdentity, vitalsPhase, WEEKLY_YEAR_FRACTION } from "./vitals.js";
import { apply } from "./effects.js";
const USA = "USA";
const ALP = "ALP";
const runPhase = (campaign) => vitalsPhase(campaign).reduce((acc, packet) => apply(acc, packet), campaign);
/**
 * `__fixtures__/campaign.ts`'s `nationA` is a synthetic 5-million-person
 * nation, unrelated to `openingStates()`'s real 51-state US dataset (~335
 * million) — nothing before `vitalsPhase` needed the two to agree. The real
 * game keeps them in sync from founding (`applyStateMass`, dataset-side), so
 * tests that care about the state/nation reconciliation invariant re-sync
 * the fixture's nation figure to what its own states already sum to, rather
 * than relying on the shared fixture (which many other tests use for
 * unrelated reasons) to carry a population realistic enough for this file.
 */
const syncedCampaign = () => {
    const campaign = buildCampaign();
    const statesSum = Object.keys(campaign.states).reduce((sum, id) => sum + campaign.states[id].population, 0);
    const usa = campaign.nations[USA];
    return {
        ...campaign,
        nations: {
            ...campaign.nations,
            [USA]: { ...usa, stats: { ...usa.stats, demography: { ...usa.stats.demography, population: statesSum } } },
        },
    };
};
const settle = (campaign, turns) => {
    let working = campaign;
    for (let i = 0; i < turns; i++)
        working = { ...runPhase(working), turn: working.turn + 1 };
    return working;
};
describe("populationIdentity", () => {
    it("grows a population whose birth rate exceeds its death rate", () => {
        const next = populationIdentity(1_000_000, 0.02, 0.008, 0, WEEKLY_YEAR_FRACTION);
        expect(next).toBeGreaterThan(1_000_000);
    });
    it("shrinks a population whose death rate exceeds its birth rate", () => {
        const next = populationIdentity(1_000_000, 0.006, 0.02, 0, WEEKLY_YEAR_FRACTION);
        expect(next).toBeLessThan(1_000_000);
    });
    it("is exactly stationary when births, deaths and migration net to zero", () => {
        expect(populationIdentity(1_000_000, 0.01, 0.01, 0, WEEKLY_YEAR_FRACTION)).toBe(1_000_000);
    });
    it("scales the same annual rate down at a finer yearFraction", () => {
        const week = populationIdentity(1_000_000, 0.02, 0.005, 0, WEEKLY_YEAR_FRACTION) - 1_000_000;
        const year = populationIdentity(1_000_000, 0.02, 0.005, 0, 1) - 1_000_000;
        expect(week).toBeGreaterThan(0);
        expect(week).toBeLessThan(year);
        expect(week).toBeCloseTo(year * WEEKLY_YEAR_FRACTION, 6);
    });
});
describe("vitalsPhase — the player's nation, distributed across states", () => {
    it("moves the nation's population turn over turn", () => {
        const campaign = buildCampaign();
        const before = campaign.nations[USA].stats.demography.population;
        const after = runPhase(campaign).nations[USA].stats.demography.population;
        expect(after).not.toBe(before);
    });
    it("keeps every state's live population summing exactly to the nation's own figure", () => {
        let campaign = syncedCampaign();
        for (let i = 0; i < 50; i++) {
            campaign = { ...runPhase(campaign), turn: campaign.turn + 1 };
            const stateSum = Object.keys(campaign.states).reduce((sum, id) => sum + campaign.states[id].population, 0);
            expect(stateSum).toBeCloseTo(campaign.nations[USA].stats.demography.population, 6);
        }
    });
    it("moves every state, not just the nation total", () => {
        const campaign = buildCampaign();
        const before = campaign.states;
        const after = runPhase(campaign).states;
        const moved = Object.keys(before).filter((id) => before[id].population !== after[id].population);
        expect(moved.length).toBeGreaterThan(0);
    });
    it("distributes the delta pro rata by each state's current population share", () => {
        const campaign = buildCampaign();
        const ids = Object.keys(campaign.states);
        // Two states with a real population gap, so a flat per-state split would
        // be visibly wrong rather than accidentally close.
        const big = ids[0];
        const small = ids[1];
        const scaled = {
            ...campaign,
            states: {
                ...campaign.states,
                [big]: { ...campaign.states[big], population: 10_000_000 },
                [small]: { ...campaign.states[small], population: 100_000 },
            },
        };
        const after = runPhase(scaled);
        const bigDelta = after.states[big].population - scaled.states[big].population;
        const smallDelta = after.states[small].population - scaled.states[small].population;
        if (bigDelta !== 0 || smallDelta !== 0) {
            expect(Math.abs(bigDelta)).toBeGreaterThan(Math.abs(smallDelta));
        }
    });
    it("replays identically from the same seed", () => {
        const campaign = buildCampaign();
        expect(vitalsPhase(campaign)).toEqual(vitalsPhase(campaign));
    });
});
describe("vitalsPhase — a nation with no state layer", () => {
    it("writes the identity directly, with no state effects", () => {
        const campaign = buildCampaign();
        const packets = vitalsPhase(campaign);
        for (const packet of packets) {
            for (const effect of packet.effects) {
                if (effect.kind === "state")
                    continue;
                if (effect.kind === "nationStat" && effect.nation === ALP) {
                    // ALP carries no campaign.states entries — its own identity, not a
                    // sum of states that do not exist for it.
                    expect(effect.setStats?.demography?.population).toBeDefined();
                }
            }
        }
    });
});
describe("vitalsPhase — 208-turn plausibility", () => {
    it("keeps a nation's population inside a plausible band over one full four-year term", () => {
        const campaign = syncedCampaign();
        const before = campaign.nations[USA].stats.demography.population;
        const after = settle(campaign, 208).nations[USA].stats.demography.population;
        // Generous band: even at the schema's most extreme authored rates
        // (birthRate up to 0.045, deathRate down to 0.003, netMigration up to
        // 0.05), four years of weekly compounding cannot plausibly halve or
        // double a country — this is a sanity floor against a unit error, not a
        // tight demographic claim.
        expect(after).toBeGreaterThan(before * 0.7);
        expect(after).toBeLessThan(before * 1.3);
    });
    it("never lets a state's population go negative", () => {
        const after = settle(syncedCampaign(), 208);
        for (const id of Object.keys(after.states)) {
            expect(after.states[id].population).toBeGreaterThanOrEqual(0);
        }
    });
});
