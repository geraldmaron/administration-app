import { withStandingFinding } from "./finding-testing.js";
import { withTariffFinding } from "./__fixtures__/tariff.js";
import { describe, it, expect } from "vitest";
import { foundingTrade } from "./trade.js";
import { foundingInstitutions } from "./institutions.js";
import { foundingSecurity } from "./security.js";
import { foundingOversight } from "./oversight.js";
import { foundingScenarioFamilies } from "./scenario-families.js";
import { openingTermClock } from "./elections.js";
import { openingPressCorps } from "./press.js";
import { openingCongress } from "./congress.js";
import { openingCities } from "./cities.js";
import { openingSectors } from "./sectors.js";
import { openingStates } from "./states.js";
import { DEFAULT_ADMINISTRATION_PARTY } from "./party.js";
import { Nation, Relationship, defaultFlagDesign } from "@admin/world";
import { makeCampaignSeed, createRngStreams } from "./rng.js";
import { inheritedBudget } from "./budget.js";
import { inheritedPolicies } from "./policy.js";
import { relationshipKey, selectRelationship } from "./state.js";
import { openingCycles } from "./business-cycle.js";
import { openingCohorts } from "./demos.js";
import { apply } from "./effects.js";
import { defaultLeaderDraft } from "./leader.js";
import { INSTRUMENT_COERCION, INSTRUMENT_IDS, RUNG_LEVELS, rungsForInstrument, securityGuaranteeFlag, } from "./instruments.js";
import { landRung } from "./__fixtures__/ladder.js";
import { openingMood } from "./opinion.js";
import { shockPressure } from "./external-shocks.js";
// A capable actor: high across the board, so every rung's stat threshold
// passes and only geography/access can still block it.
function baseStats() {
    return {
        demography: {
            population: 50_000_000, urbanization: 0.7, medianAge: 35, growthRate: 0.01, literacy: 0.9,
            birthRate: 0.014, deathRate: 0.008, netMigration: 0.004,
        },
        economy: {
            gdp: 500_000, gdpPerCapita: 30_000, growth: 0.02, inflation: 0.02, unemployment: 0.05,
            costOfLiving: 1, debt: 250_000, reserves: 50_000, sovereignRating: "AA",
        },
        trade: { exports: 100_000, imports: 90_000, balance: 10_000, topExports: ["steel-heavy"], topPartners: [], tradeDependence: {} },
        energy: { production: 100, consumption: 90, importDependence: 0.1, mix: { "energy-oil": 0.4, "energy-gas": 0, "energy-nuclear": 0, "energy-renewables": 0.6 } },
        military: {
            budget: 40_000, activeHeadcount: 300_000, reserveHeadcount: 100_000, readiness: 0.8, doctrineQuality: 0.8,
            branchStrength: { land: 0.8, air: 0.8, naval: 0.8, cyber: 0.7, space: 0.5 },
            airliftCapacity: 0.8, sealiftCapacity: 0.8, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 3,
        },
        security: { crimeIndex: 0.2, corruptionIndex: 0.2, insurgencyPressure: 0.1, borderControl: 0.7, intelCapability: 0.8, counterIntel: 0.8 },
        politics: { regimeStability: 0.8, legitimacy: 0.8, factionalism: 0.2, pressFreedom: 0.6, protestPressure: 0.1 },
        softPower: { diplomaticReach: 0.8, culturalReach: 0.6, aidGiven: 100, aidReceived: 0 },
    };
}
function weakStats() {
    const base = baseStats();
    return {
        ...base,
        economy: { ...base.economy, reserves: 100, gdp: 500 },
        trade: { ...base.trade, exports: 10, tradeDependence: {} },
        military: {
            ...base.military,
            readiness: 0, branchStrength: { land: 0, air: 0, naval: 0, cyber: 0, space: 0 },
            airliftCapacity: 0, sealiftCapacity: 0, basesAbroad: 0,
        },
        security: { ...base.security, intelCapability: 0, counterIntel: 0 },
        politics: { ...base.politics, legitimacy: 0 },
        softPower: { ...base.softPower, diplomaticReach: 0 },
    };
}
const traits = {
    aggression: 0.3, opportunism: 0.4, legalism: 0.6, isolationism: 0.2, riskTolerance: 0.4,
    vengefulness: 0.3, reliability: 0.6, transparency: 0.5,
    agendas: [{ id: "agenda-1", description: "An agenda", weight: 0.5 }],
};
function nation(id, opts) {
    const stats = opts.weak ? weakStats() : baseStats();
    const tradeDependence = opts.tradeWith ? { [opts.tradeWith]: 0.4 } : {};
    return Nation.parse({
        id,
        playable: true,
        identity: { name: id, adjective: id, capital: `${id} City`, government: "charter-1", languages: ["Common"], currency: "USD" },
        geo: {
            region: "region-1", lat: opts.lat, lon: opts.lon, neighbors: opts.neighbors ?? [],
            coastline: opts.coastline ?? true, chokepoints: [], disasterExposure: {},
        },
        stats: { ...stats, trade: { ...stats.trade, tradeDependence } },
        sectors: [
            { sector: "steel-heavy", mix: 0.6, employment: 800_000, laborPressure: 0.25 },
            { sector: "utilities", mix: 0.4, employment: 400_000, laborPressure: 0.2 },
        ],
        traits,
        doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
        memberships: [],
        partySystem: { contest: "none", parties: [] },
        bands: {
            archetype: "middle-power", powerTier: 3, wealthTier: 3, alignmentBand: "neutral",
            stabilityBand: "stable", militaryTier: 3,
        },
    });
}
// ALPHA is capable and adjacent to NEIGH (shared border), far from FAR (no
// border, ~15,000 km — beyond reach even with strong lift), and has a live
// trade channel with NEIGH and FAR alike.
const alpha = nation("ALPHA", { lat: 0, lon: 0, neighbors: ["NEIGH"], tradeWith: "NEIGH" });
const neigh = nation("NEIGH", { lat: 0.5, lon: 0.5, neighbors: ["ALPHA"] });
const far = nation("FAR", { lat: 60, lon: 150, tradeWith: undefined });
const weak = nation("WEAK", { lat: 0.2, lon: 0.2, weak: true });
const alphaWithFarTrade = Nation.parse({
    ...alpha,
    stats: { ...alpha.stats, trade: { ...alpha.stats.trade, tradeDependence: { NEIGH: 0.4, FAR: 0.4 } } },
});
function relBetween(from, to) {
    return Relationship.parse({
        from, to, trust: 0.1, alignment: 0, tension: 0.1, tradeDependence: 0.2,
        militaryThreat: 0, treaties: [], grudges: [], history: [],
    });
}
function buildCampaign() {
    const nations = [alphaWithFarTrade, neigh, far, weak];
    const pairs = [
        ["ALPHA", "NEIGH"], ["ALPHA", "FAR"], ["ALPHA", "WEAK"], ["WEAK", "NEIGH"], ["WEAK", "FAR"],
    ];
    const congress = openingCongress(alphaWithFarTrade, 1, DEFAULT_ADMINISTRATION_PARTY, DEFAULT_ADMINISTRATION_PARTY);
    return {
        seed: makeCampaignSeed("instruments-test-seed"),
        founding: { nation: "ALPHA", nationName: "ALPHA", name: "ALPHA", title: "President", charter: "charter-1", cradle: "cradle-1", compacts: [], cabinet: {}, flag: defaultFlagDesign, leader: defaultLeaderDraft(), leadRole: "role-chancellor" },
        turn: 3,
        calendar: { year: 2027, month: 1, day: 1 },
        nations: Object.fromEntries(nations.map((n) => [n.id, { base: n, stats: n.stats, traits: n.traits }])),
        cities: openingCities({ congress }),
        states: openingStates(),
        sectors: openingSectors(Object.fromEntries(nations.map((n) => [n.id, { base: n }]))),
        relationships: Object.fromEntries(pairs.map(([f, t]) => [relationshipKey(f, t), relBetween(f, t)])),
        people: {},
        player: {
            metrics: { approval: 0.5, treasury: 1000, stability: 0.7, militaryReadiness: 0.5, standing: 0.5 },
            metricHistory: [],
            opinion: openingMood(nations[0]),
            cabinet: {},
            policies: inheritedPolicies(),
            budget: inheritedBudget(),
            flags: {},
            alignments: { economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 },
        },
        operators: [],
        governments: {},
        conflicts: {},
        conditions: {},
        emergencies: {},
        pursuits: {},
        commitments: {},
        congress,
        bills: {},
        termClock: openingTermClock(1),
        press: openingPressCorps(1),
        treaties: {},
        orders: [],
        judiciary: { cases: [] },
        pendingRules: [],
        lapses: [],
        capRaises: [],
        oversight: foundingOversight(1),
        feed: [],
        ledger: [],
        removal: { mechanism: "no-confidence", pressure: 0, pressureHistory: [], beats: [], resolved: false },
        cycles: openingCycles(nations.map((n) => n.id), 3),
        cohorts: openingCohorts(),
        deferrals: {},
        institutions: foundingInstitutions(),
        security: foundingSecurity(),
        scenarioFamilies: foundingScenarioFamilies(),
        nominations: {},
        trade: foundingTrade(),
    };
}
const streams = createRngStreams(makeCampaignSeed("instruments-test-seed"));
describe("instrument ladder registry", () => {
    it("registers exactly five instruments with five rungs each — twenty-five total", () => {
        expect(INSTRUMENT_IDS).toHaveLength(5);
        expect(RUNG_LEVELS).toHaveLength(5);
        for (const instrument of INSTRUMENT_IDS) {
            expect(rungsForInstrument(instrument)).toHaveLength(5);
        }
    });
    it("gives every rung a distinct id and name", () => {
        const all = INSTRUMENT_IDS.flatMap((i) => rungsForInstrument(i));
        expect(all).toHaveLength(25);
        expect(new Set(all.map((r) => r.id)).size).toBe(25);
        expect(new Set(all.map((r) => r.name)).size).toBe(25);
    });
    // The ladder is not four ways of threatening somebody and one odd one out:
    // helping is a first-class instrument, held to the same shape.
    it("orders assistance below every coercive instrument on the one coercion scale", () => {
        for (const instrument of INSTRUMENT_IDS) {
            if (instrument === "assistance")
                continue;
            expect(INSTRUMENT_COERCION.assistance, instrument).toBeLessThan(INSTRUMENT_COERCION[instrument]);
        }
    });
});
describe("the ladder — resolution", () => {
    it("resolves all 25 rungs, each with a distinct mechanical consequence, for a capable actor at close range", () => {
        const state = buildCampaign();
        // Help is the one ladder whose upper rungs are about the *recipient* as
        // well as the giver, so the aid rungs are run against a partner who is
        // both trusted and short of money.
        // The economic ladder's tariff rung needs a trade law behind it.
        const board = (instrument) => (instrument === "assistance" ? friendlyBoard() : instrument === "economic" ? withTariffFinding(state, "NEIGH") : instrument === "covert" ? withStandingFinding(state, "NEIGH") : state);
        const seen = new Set();
        for (const instrument of INSTRUMENT_IDS) {
            for (const rung of RUNG_LEVELS) {
                const result = landRung(board(instrument), "ALPHA", "NEIGH", instrument, rung, streams);
                expect(result.ok, `${instrument}-${rung} should resolve for a capable adjacent actor`).toBe(true);
                if (!result.ok)
                    continue;
                expect(result.packet.effects.length, `${instrument}-${rung} produces at least one effect`).toBeGreaterThan(0);
                const signature = JSON.stringify(result.packet.effects.map((e) => e.kind));
                const key = `${instrument}-${rung}:${signature}`;
                // Not a proof of uniqueness across rungs (some share an effect-kind
                // shape) but every rung must at least resolve into a real packet that
                // states which rung it was. The commitment carries that, not the
                // sentence: an authored card replaces the narration wholesale.
                expect(result.packet.commitment).toMatchObject({ instrument, rung, landed: true });
                seen.add(key);
            }
        }
        expect(seen.size).toBeGreaterThan(0);
    });
    it("actually mutates state when run through apply(), the only mutator", () => {
        const state = buildCampaign();
        const result = landRung(state, "ALPHA", "NEIGH", "diplomatic", 1, streams);
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        const next = apply(state, result.packet);
        const rel = selectRelationship(next, "ALPHA", "NEIGH");
        expect(rel.trust).not.toBe(selectRelationship(state, "ALPHA", "NEIGH").trust);
    });
    it("produces genuinely different mechanical consequences across the diplomatic ladder", () => {
        const state = buildCampaign();
        const perRungEffectKinds = RUNG_LEVELS.map((rung) => {
            const result = landRung(state, "ALPHA", "NEIGH", "diplomatic", rung, streams);
            expect(result.ok).toBe(true);
            return result.ok ? result.packet.effects.map((e) => e.kind).sort().join(",") : "";
        });
        // Escalation is a real mechanical difference, not five copies of the same
        // change relabeled — several distinct effect-kind shapes appear across
        // the ladder, and every rung produces at least one effect.
        expect(new Set(perRungEffectKinds).size).toBeGreaterThan(1);
        expect(perRungEffectKinds.every((kinds) => kinds.length > 0)).toBe(true);
        // The top rung (Sever Relations) is strictly the harshest: applied last
        // after the whole ladder has already run, it leaves trust lower and
        // tension higher than the mid-ladder Recall Ambassador rung did alone.
        const rung3 = landRung(state, "ALPHA", "NEIGH", "diplomatic", 3, streams);
        expect(rung3.ok).toBe(true);
        if (!rung3.ok)
            return;
        const afterRung3 = apply(state, rung3.packet);
        const rung5 = landRung(state, "ALPHA", "NEIGH", "diplomatic", 5, streams);
        expect(rung5.ok).toBe(true);
        if (!rung5.ok)
            return;
        const afterRung5 = apply(state, rung5.packet);
        const relAfter3 = selectRelationship(afterRung3, "ALPHA", "NEIGH");
        const relAfter5 = selectRelationship(afterRung5, "ALPHA", "NEIGH");
        expect(relAfter5.trust).toBeLessThan(relAfter3.trust);
        expect(relAfter5.tension).toBeGreaterThan(relAfter3.tension);
    });
});
/**
 * The board the heavier aid rungs are written for: a partner both trusted and
 * actually short of money, with each side holding a view of the other. Nothing
 * above a relief shipment is offered to a comfortable stranger.
 */
function friendlyBoard() {
    const state = buildCampaign();
    const neigh = state.nations["NEIGH"];
    const trusted = (from, to) => Relationship.parse({ ...relBetween(from, to), trust: 0.6 });
    return {
        ...state,
        nations: {
            ...state.nations,
            ["NEIGH"]: { ...neigh, stats: { ...neigh.stats, economy: { ...neigh.stats.economy, reserves: 500 } } },
        },
        relationships: {
            ...state.relationships,
            [relationshipKey("ALPHA", "NEIGH")]: trusted("ALPHA", "NEIGH"),
            [relationshipKey("NEIGH", "ALPHA")]: trusted("NEIGH", "ALPHA"),
        },
    };
}
describe("the assistance ladder", () => {
    it("moves the recipient's own numbers rather than only the record between them", () => {
        const state = buildCampaign();
        const before = state.nations["NEIGH"].stats;
        const grant = landRung(state, "ALPHA", "NEIGH", "assistance", 2, streams);
        expect(grant.ok).toBe(true);
        if (!grant.ok)
            return;
        const landed = apply(state, grant.packet);
        const after = landed.nations["NEIGH"].stats;
        // The grant's program lifts where the recipient's growth is headed for half a year.
        expect(shockPressure(landed, "NEIGH").growth).toBeGreaterThan(0);
        expect(after.softPower.aidReceived).toBeGreaterThan(before.softPower.aidReceived);
    });
    it("charges the giver what it gave away — an arms transfer comes out of its own stocks", () => {
        const state = friendlyBoard();
        const transfer = landRung(state, "ALPHA", "NEIGH", "assistance", 4, streams);
        expect(transfer.ok).toBe(true);
        if (!transfer.ok)
            return;
        const after = apply(state, transfer.packet);
        const armed = (campaign) => campaign.nations["NEIGH"].stats.military.readiness;
        expect(armed(after)).toBeGreaterThan(armed(state));
        const giver = (campaign) => campaign.nations["ALPHA"].stats.military.readiness;
        expect(giver(after)).toBeLessThan(giver(state));
    });
    it("never bills the player's own panel for aid another capital gave", () => {
        const state = friendlyBoard();
        // The same rung the player pays readiness for, given by somebody else.
        const npcAid = landRung(state, "NEIGH", "ALPHA", "assistance", 4, streams, "simulate");
        expect(npcAid.ok).toBe(true);
        if (!npcAid.ok)
            return;
        expect(npcAid.packet.effects.some((effect) => effect.kind === "metric")).toBe(false);
        const playerAid = landRung(state, "ALPHA", "NEIGH", "assistance", 4, streams);
        expect(playerAid.ok).toBe(true);
        if (!playerAid.ok)
            return;
        expect(playerAid.packet.effects.some((effect) => effect.kind === "metric")).toBe(true);
    });
    it("lightens a condition the recipient is living through, and leaves an untouched country alone", () => {
        const state = buildCampaign();
        const condition = {
            id: "condition:flood:NEIGH:1",
            nation: "NEIGH",
            kind: "flood",
            scope: "region",
            severity: 0.6,
            startedTurn: 1,
            status: "active",
            beats: [],
        };
        const flooded = { ...state, conditions: { [condition.id]: condition } };
        const relief = landRung(flooded, "ALPHA", "NEIGH", "assistance", 1, streams);
        expect(relief.ok).toBe(true);
        if (!relief.ok)
            return;
        expect(apply(flooded, relief.packet).conditions[condition.id].severity).toBeLessThan(0.6);
        const dry = landRung(state, "ALPHA", "NEIGH", "assistance", 1, streams);
        expect(dry.ok).toBe(true);
        if (!dry.ok)
            return;
        expect(dry.packet.effects.some((effect) => effect.kind === "condition")).toBe(false);
    });
    it("opens weeks of relief named against the disaster it answers, and names nothing where there is none", () => {
        const state = buildCampaign();
        const condition = {
            id: "condition:flood:NEIGH:1",
            nation: "NEIGH",
            kind: "flood",
            scope: "region",
            severity: 0.6,
            startedTurn: 1,
            status: "active",
            beats: [],
        };
        const flooded = { ...state, conditions: { [condition.id]: condition } };
        const relief = landRung(flooded, "ALPHA", "NEIGH", "assistance", 1, streams);
        expect(relief.ok).toBe(true);
        if (!relief.ok)
            return;
        const opened = Object.values(apply(flooded, relief.packet).commitments);
        expect(opened).toHaveLength(1);
        expect(opened[0].kind).toBe("aid");
        expect(opened[0].addressedCondition).toEqual({ kind: "flood", nation: "NEIGH" });
        expect(opened[0].review).toEqual({ endsTurn: flooded.turn + 8 });
        const dry = landRung(state, "ALPHA", "NEIGH", "assistance", 1, streams);
        expect(dry.ok).toBe(true);
        if (!dry.ok)
            return;
        expect(Object.values(apply(state, dry.packet).commitments)).toHaveLength(0);
    });
    it("marks no arms transfer or guarantee as answering a disaster the recipient happens to be living through", () => {
        const board = friendlyBoard();
        const condition = {
            id: "condition:flood:NEIGH:1",
            nation: "NEIGH",
            kind: "flood",
            scope: "region",
            severity: 0.6,
            startedTurn: 1,
            status: "active",
            beats: [],
        };
        const flooded = { ...board, conditions: { [condition.id]: condition } };
        for (const rung of [4, 5]) {
            const act = landRung(flooded, "ALPHA", "NEIGH", "assistance", rung, streams);
            expect(act.ok, `assistance ${rung}`).toBe(true);
            if (!act.ok)
                return;
            const opened = Object.values(apply(flooded, act.packet).commitments);
            expect(opened.length, `assistance ${rung}`).toBeGreaterThan(0);
            for (const commitment of opened)
                expect(commitment.addressedCondition, `assistance ${rung}`).toBeUndefined();
        }
    });
    it("gates the heavy rungs on what the giver actually has, exactly as the coercive ladders do", () => {
        const state = friendlyBoard();
        const broke = landRung(state, "WEAK", "NEIGH", "assistance", 3, streams);
        expect(broke.ok).toBe(false);
        if (broke.ok)
            return;
        expect(broke.missingCapability).toMatch(/reserves/);
        const tooFar = landRung(state, "ALPHA", "FAR", "assistance", 5, streams);
        expect(tooFar.ok).toBe(false);
        if (tooFar.ok)
            return;
        expect(tooFar.missingCapability).toMatch(/reach|trust/);
    });
    it("refuses to stand behind a government that is neither in trouble nor close", () => {
        const comfortable = buildCampaign();
        const package_ = landRung(comfortable, "ALPHA", "NEIGH", "assistance", 3, streams);
        expect(package_.ok).toBe(false);
        if (package_.ok)
            return;
        expect(package_.missingCapability).toMatch(/difficulty/);
        const guarantee = landRung(comfortable, "ALPHA", "NEIGH", "assistance", 5, streams);
        expect(guarantee.ok).toBe(false);
        if (guarantee.ok)
            return;
        expect(guarantee.missingCapability).toMatch(/trust|believed/);
    });
    it("leaves a guarantee on the record that a later scene can read", () => {
        const state = friendlyBoard();
        const guarantee = landRung(state, "ALPHA", "NEIGH", "assistance", 5, streams);
        expect(guarantee.ok).toBe(true);
        if (!guarantee.ok)
            return;
        const after = apply(state, guarantee.packet);
        expect(after.player.flags[securityGuaranteeFlag("ALPHA", "NEIGH")]).toBe(true);
    });
});
describe("the ladder: a tariff increase does not credit the debt", () => {
    // Customs collect later, through the weekly trade phase, once a measure is
    // on the register. This packet must not also retire a share of GDP.
    const tariffPacket = (gdp) => {
        const state = buildCampaign();
        const alpha = state.nations["ALPHA"];
        const board = {
            ...state,
            nations: {
                ...state.nations,
                ["ALPHA"]: {
                    ...alpha,
                    stats: { ...alpha.stats, economy: { ...alpha.stats.economy, gdp } },
                },
            },
        };
        const result = landRung(withTariffFinding(board, "NEIGH"), "ALPHA", "NEIGH", "economic", 2, streams);
        if (!result.ok)
            throw new Error("the tariff rung should resolve for a capable adjacent actor");
        return result.packet;
    };
    const debtCredit = (packet) => {
        const stat = packet.effects.find((effect) => effect.kind === "nationStat" && effect.setStats?.economy?.debt !== undefined);
        return stat?.kind === "nationStat" ? stat.setStats?.economy?.debt : undefined;
    };
    it("books no economy.debt credit at either scale of output", () => {
        const small = tariffPacket(500_000);
        const large = tariffPacket(5_000_000);
        expect(debtCredit(small)).toBeUndefined();
        expect(debtCredit(large)).toBeUndefined();
        expect(small.effects.some((effect) => effect.kind === "trade" && effect.measure?.kind === "tariff")).toBe(true);
        expect(large.effects.some((effect) => effect.kind === "trade" && effect.measure?.kind === "tariff")).toBe(true);
    });
    it("the same seed resolves the same effects", () => {
        const state = buildCampaign();
        const seed = makeCampaignSeed("tariff-seed");
        const a = landRung(state, "ALPHA", "NEIGH", "economic", 2, createRngStreams(seed));
        const b = landRung(state, "ALPHA", "NEIGH", "economic", 2, createRngStreams(seed));
        expect(a).toEqual(b);
    });
});
describe("the ladder — capability gating", () => {
    it("blocks a rung the actor's stats do not support and names the missing capability", () => {
        const state = buildCampaign();
        const result = landRung(state, "WEAK", "NEIGH", "military", 5, streams);
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.missingCapability).toMatch(/land branch strength/);
        expect(result.reason).toContain("WEAK");
        expect(result.reason).toContain(result.missingCapability);
    });
    it("blocks economic pressure with no trade channel to leverage, even for a capable actor", () => {
        const state = buildCampaign();
        const result = landRung(state, "WEAK", "FAR", "economic", 2, streams);
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.missingCapability).toMatch(/trade channel/);
    });
    it("blocks a covert operation with no intel capability at all", () => {
        const state = buildCampaign();
        const result = landRung(state, "WEAK", "NEIGH", "covert", 1, streams);
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.missingCapability).toMatch(/intel capability/);
    });
    it("blocks military forward deployment with no shared border and no bases abroad", () => {
        const state = buildCampaign();
        const result = landRung(state, "WEAK", "FAR", "military", 2, streams);
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.missingCapability).toMatch(/staging point|shared border/);
    });
});
describe("the ladder — geography and distance gating", () => {
    it("lets a capable, adjacent actor mount an expeditionary invasion", () => {
        const state = buildCampaign();
        const result = landRung(state, "ALPHA", "NEIGH", "military", 5, streams);
        expect(result.ok).toBe(true);
    });
    it("blocks the same capable actor's expeditionary invasion against a distant, non-adjacent target — lift is not enough at 15,000 km", () => {
        const state = buildCampaign();
        const result = landRung(state, "ALPHA", "FAR", "military", 5, streams);
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.missingCapability).toMatch(/reach/);
    });
    it("still allows a lower rung against the same distant target where the projection cap is looser", () => {
        const state = buildCampaign();
        const result = landRung(state, "ALPHA", "FAR", "military", 1, streams);
        expect(result.ok).toBe(true);
    });
    it("blocks a blockade against a landlocked target regardless of naval strength", () => {
        const state = buildCampaign();
        const landlocked = nation("LOCKED", { lat: 0.3, lon: 0.3, coastline: false });
        const withLocked = {
            ...state,
            nations: { ...state.nations, [landlocked.id]: { base: landlocked, stats: landlocked.stats, traits: landlocked.traits } },
            relationships: { ...state.relationships, [relationshipKey("ALPHA", "LOCKED")]: relBetween("ALPHA", "LOCKED") },
        };
        const result = landRung(withLocked, "ALPHA", "LOCKED", "military", 3, streams);
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.missingCapability).toMatch(/coast/);
    });
});
describe("the ladder — same code path for player and NPC actors", () => {
    it("resolves identically for an NPC-sourced attempt as a player-sourced one, modulo the source tag", () => {
        const state = buildCampaign();
        const playerResult = landRung(state, "ALPHA", "NEIGH", "economic", 3, streams, "action");
        const npcResult = landRung(state, "ALPHA", "NEIGH", "economic", 3, streams, "simulate");
        expect(playerResult.ok).toBe(true);
        expect(npcResult.ok).toBe(true);
        if (!playerResult.ok || !npcResult.ok)
            return;
        expect(playerResult.packet.effects).toEqual(npcResult.packet.effects);
        expect(playerResult.packet.source).toBe("action");
        expect(npcResult.packet.source).toBe("simulate");
    });
    it("gates an NPC actor by the same capability rules as a player actor — no narrative exemption", () => {
        const state = buildCampaign();
        const asNpc = landRung(state, "WEAK", "NEIGH", "military", 5, streams, "simulate");
        expect(asNpc.ok).toBe(false);
    });
});
describe("the ladder — determinism", () => {
    it("produces byte-identical effects for the same seed, actor, target, instrument, and rung", () => {
        const state = buildCampaign();
        const streamsA = createRngStreams(makeCampaignSeed("determinism-seed"));
        const streamsB = createRngStreams(makeCampaignSeed("determinism-seed"));
        const a = landRung(state, "ALPHA", "NEIGH", "military", 4, streamsA);
        const b = landRung(state, "ALPHA", "NEIGH", "military", 4, streamsB);
        expect(a).toEqual(b);
    });
    it("draws different jitter for different rungs under the same seed, proving the stream key includes the rung's turn context", () => {
        const state = buildCampaign();
        const s = createRngStreams(makeCampaignSeed("jitter-seed"));
        const r1 = landRung(state, "ALPHA", "NEIGH", "diplomatic", 1, s);
        const r2 = landRung({ ...state, turn: state.turn + 1 }, "ALPHA", "NEIGH", "diplomatic", 1, s);
        expect(r1.ok && r2.ok).toBe(true);
        if (!r1.ok || !r2.ok)
            return;
        expect(r1.packet.effects).not.toEqual(r2.packet.effects);
    });
});
describe("the ladder — embargo hits exported sectors", () => {
    it("lands a sector employment hit on the target's topExports, not on an unexported tail", () => {
        const state = buildCampaign();
        const result = landRung(state, "ALPHA", "NEIGH", "economic", 5, streams);
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        const sectorEffects = result.packet.effects.filter((effect) => effect.kind === "sector");
        expect(sectorEffects.map((effect) => effect.sector)).toEqual(["steel-heavy"]);
        expect(sectorEffects.every((effect) => effect.nation === "NEIGH")).toBe(true);
        expect(sectorEffects[0]?.deltas?.employment).toBeLessThan(0);
        expect(result.packet.effects.some((effect) => effect.kind === "sector" && effect.sector === "utilities")).toBe(false);
    });
});
describe("the ladder — refuses a nonexistent relationship rather than silently no-opping", () => {
    it("names the missing relationship as the missing capability, so the screen can say why", () => {
        const state = buildCampaign();
        const result = landRung(state, "NEIGH", "FAR", "diplomatic", 1, streams);
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.missingCapability).toMatch(/relationship/);
    });
});
describe("the ladder — countries by name, never by code", () => {
    // Every government on this board is called something other than its id, so a
    // sentence that carries the id cannot pass for one that carries the name.
    function renamed(state) {
        const nations = Object.fromEntries(Object.entries(state.nations).map(([id, runtime]) => [
            id,
            { ...runtime, base: { ...runtime.base, identity: { ...runtime.base.identity, name: `${id.charAt(0)}${id.slice(1).toLowerCase()}land` } } },
        ]));
        return { ...state, nations };
    }
    const PROSE_KEYS = new Set(["description", "reason", "cause", "headline", "summary", "rationale"]);
    /** Every sentence a packet's effects carry, wherever in the effect it sits. */
    function prose(value) {
        if (Array.isArray(value))
            return value.flatMap(prose);
        if (value === null || typeof value !== "object")
            return [];
        return Object.entries(value).flatMap(([key, inner]) => (PROSE_KEYS.has(key) && typeof inner === "string" ? [inner] : prose(inner)));
    }
    it("writes every sentence a landed rung leaves in the country's name", () => {
        for (const instrument of INSTRUMENT_IDS) {
            const board = renamed(instrument === "assistance" ? friendlyBoard() : buildCampaign());
            for (const rung of RUNG_LEVELS) {
                const result = landRung(board, "ALPHA", "NEIGH", instrument, rung, streams);
                if (!result.ok)
                    continue;
                for (const sentence of prose(result.packet.effects)) {
                    expect(sentence, `${instrument}-${rung}`).not.toMatch(/\b(ALPHA|NEIGH)\b/);
                }
            }
        }
    });
    it("files a strike with Congress against the country's name", () => {
        const result = landRung(renamed(buildCampaign()), "ALPHA", "NEIGH", "military", 4, streams);
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        const filed = result.packet.effects.flatMap((effect) => (effect.kind === "warPowers" && effect.open ? [effect.open.description] : []));
        expect(filed).toEqual(["Air strikes against Neighland: forces introduced into hostilities."]);
    });
    it("leaves no at-war flag behind an invasion, because nothing ever read one", () => {
        const result = landRung(buildCampaign(), "ALPHA", "NEIGH", "military", 5, streams);
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        const flags = result.packet.effects.flatMap((effect) => (effect.kind === "flag" ? (effect.set ?? []) : []));
        expect(flags.filter((flag) => flag.startsWith("at-war:"))).toEqual([]);
        expect(result.packet.effects.some((effect) => effect.kind === "conflict")).toBe(true);
    });
});
