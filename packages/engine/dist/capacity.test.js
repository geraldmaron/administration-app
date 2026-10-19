import { describe, expect, it } from "vitest";
import { apply } from "./effects.js";
import { landRung } from "./__fixtures__/ladder.js";
import { createRngStreams } from "./rng.js";
import { MILITARY_READINESS_GATES, READINESS_RECOVERY_PER_TURN, availableUnits, capacityPhase, availableUnitsOfType, readinessAnchor, readinessCeiling, selectForceBench, } from "./capacity.js";
import { foundedForBalance } from "./balance-harness.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
const TARGET = "ALP";
/**
 * A force that clears every gate on the invasion rung except the one under
 * test, so a refusal names the depleting figure rather than the fixture's lift.
 */
function withReadiness(campaign, value) {
    const runtime = campaign.nations[campaign.founding.nation];
    return {
        ...campaign,
        nations: {
            ...campaign.nations,
            [campaign.founding.nation]: {
                ...runtime,
                stats: {
                    ...runtime.stats,
                    military: {
                        ...runtime.stats.military,
                        readiness: value,
                        airliftCapacity: 0.9,
                        sealiftCapacity: 0.9,
                        branchStrength: { ...runtime.stats.military.branchStrength, land: 0.8, air: 0.8, naval: 0.8 },
                    },
                },
            },
        },
    };
}
function runWeeks(campaign, turns) {
    let state = campaign;
    for (let i = 0; i < turns; i += 1) {
        state = capacityPhase(state).reduce((acc, packet) => apply(acc, packet), state);
        state = { ...state, turn: state.turn + 1 };
    }
    return state;
}
/** Readiness moved and nothing else, so the establishment is the one the campaign opened with. */
function spentOnly(campaign, value) {
    const runtime = campaign.nations[campaign.founding.nation];
    return {
        ...campaign,
        nations: {
            ...campaign.nations,
            [campaign.founding.nation]: { ...runtime, stats: { ...runtime.stats, military: { ...runtime.stats.military, readiness: value } } },
        },
    };
}
/** The establishment an appropriation builds, scaled as a whole: doctrine, every service, lift. */
function withEstablishment(campaign, factor) {
    const runtime = campaign.nations[campaign.founding.nation];
    const military = runtime.stats.military;
    const scaled = (value) => Math.min(1, value * factor);
    const branches = Object.fromEntries(Object.entries(military.branchStrength).map(([key, value]) => [key, scaled(value)]));
    return {
        ...campaign,
        nations: {
            ...campaign.nations,
            [campaign.founding.nation]: {
                ...runtime,
                stats: {
                    ...runtime.stats,
                    military: {
                        ...military,
                        doctrineQuality: scaled(military.doctrineQuality),
                        branchStrength: branches,
                        airliftCapacity: scaled(military.airliftCapacity),
                        sealiftCapacity: scaled(military.sealiftCapacity),
                    },
                },
            },
        },
    };
}
describe("what the services have available", () => {
    it("refuses the top rung to a force that has been spent, whatever it is on paper", () => {
        const base = buildCampaign();
        const streams = createRngStreams(base.seed);
        // Branch strength, lift and doctrine are all untouched — only the
        // depleting figure moves, which is exactly the case a ladder gated on
        // authored strength alone cannot tell apart from a force at full readiness.
        const spent = withReadiness(base, MILITARY_READINESS_GATES[5] - 0.01);
        const attempt = landRung(spent, base.founding.nation, TARGET, "military", 5, streams);
        expect(attempt.ok).toBe(false);
        if (!attempt.ok)
            expect(attempt.missingCapability).toContain("readiness");
    });
    it("closes the gate when a declared force cost is charged, the way content charges it", () => {
        const base = withReadiness(buildCampaign(), 0.62);
        const streams = createRngStreams(base.seed);
        expect(landRung(base, base.founding.nation, TARGET, "military", 5, streams).ok).toBe(true);
        // The shape every authored impact and every ladder cost table uses for a
        // force spend. If it reaches only the panel, the player is billed for a
        // force they still have.
        const spent = apply(base, {
            source: "action",
            actor: "player",
            turn: base.turn,
            narration: { summary: "Forces committed." },
            effects: [{ kind: "metric", deltas: { militaryReadiness: -0.05 } }],
        });
        const attempt = landRung(spent, base.founding.nation, TARGET, "military", 5, streams);
        expect(attempt.ok).toBe(false);
        if (!attempt.ok)
            expect(attempt.missingCapability).toContain("readiness");
    });
    it("moves the panel figure by whatever the force moved, in both directions", () => {
        const base = withReadiness(buildCampaign(), 0.62);
        const panelBefore = base.player.metrics.militaryReadiness;
        const charged = apply(base, {
            source: "action",
            actor: "player",
            turn: base.turn,
            narration: { summary: "Forces committed." },
            effects: [{ kind: "metric", deltas: { militaryReadiness: -0.05 } }],
        });
        expect(charged.player.metrics.militaryReadiness).toBeCloseTo(panelBefore - 0.05, 6);
        // And the other way: the ladder bills the nation stat directly, so a rung
        // taken through `spendsReadiness` has to reach the panel too.
        const rested = apply(charged, {
            source: "simulate",
            actor: "world",
            turn: charged.turn,
            narration: { summary: "The force rests." },
            effects: [
                { kind: "nationStat", nation: charged.founding.nation, setStats: { military: { readiness: 0.62 } } },
            ],
        });
        expect(rested.player.metrics.militaryReadiness).toBeCloseTo(panelBefore, 6);
    });
    it("charges the force that took the rung, so the next one is harder", () => {
        const base = withReadiness(buildCampaign(), 0.9);
        const streams = createRngStreams(base.seed);
        const attempt = landRung(base, base.founding.nation, TARGET, "military", 5, streams);
        expect(attempt.ok).toBe(true);
        if (!attempt.ok)
            return;
        const after = apply(base, attempt.packet);
        expect(after.nations[base.founding.nation].stats.military.readiness).toBeLessThan(0.9);
    });
    it("brings a spent force back toward the establishment it was handed, and no further", () => {
        const base = buildCampaign();
        const anchor = base.nations[base.founding.nation].base.stats.military.readiness;
        const rested = runWeeks(spentOnly(base, 0.1), 200);
        expect(rested.nations[base.founding.nation].stats.military.readiness).toBeCloseTo(anchor, 2);
    });
    it("holds readiness bought with an establishment the budget has grown, and never past full", () => {
        const base = buildCampaign();
        const handed = base.nations[base.founding.nation].base.stats.military;
        const grown = withEstablishment(spentOnly(base, 0.1), 1.2);
        const rested = runWeeks(grown, 200).nations[base.founding.nation];
        expect(readinessAnchor(rested)).toBeCloseTo(Math.min(1, handed.readiness * 1.2), 6);
        expect(rested.stats.military.readiness).toBeCloseTo(readinessAnchor(rested), 2);
        expect(readinessAnchor(runWeeks(withEstablishment(base, 3), 1).nations[base.founding.nation])).toBe(1);
    });
    it("never lowers the anchor below what the campaign opened with when the establishment shrinks", () => {
        const base = buildCampaign();
        const shrunk = withEstablishment(base, 0.5).nations[base.founding.nation];
        expect(readinessAnchor(shrunk)).toBe(shrunk.base.stats.military.readiness);
    });
    it("recovers at a rate a term can count rather than instantly", () => {
        const base = buildCampaign();
        const anchor = base.nations[base.founding.nation].base.stats.military.readiness;
        const oneWeek = runWeeks(withReadiness(base, anchor - 0.5), 1);
        expect(oneWeek.nations[base.founding.nation].stats.military.readiness).toBeCloseTo(anchor - 0.5 + READINESS_RECOVERY_PER_TURN, 3);
    });
    it("emits nothing at all for a world already sitting at its own ceiling", () => {
        const settled = runWeeks(buildCampaign(), 200);
        expect(capacityPhase(settled)).toEqual([]);
    });
    it("marks its weekly packet background, so the Record never lists it as an act", () => {
        const [emitted] = capacityPhase(withReadiness(buildCampaign(), 0.1));
        expect(emitted?.background).toBe(true);
    });
    it("reads no order of battle as unknown rather than as an empty bench", () => {
        // Most nations author none, and a gate that read the absence as zero would
        // refuse them rungs they have always been able to take.
        expect(availableUnits(buildCampaign(), TARGET, "army")).toBeUndefined();
    });
    it("holds the ceiling down while forces are committed elsewhere", () => {
        const base = buildCampaign();
        const runtime = base.nations[base.founding.nation];
        const withUnits = {
            ...base,
            nations: {
                ...base.nations,
                [base.founding.nation]: {
                    ...runtime,
                    stats: {
                        ...runtime.stats,
                        military: {
                            ...runtime.stats.military,
                            orderOfBattle: {
                                army: { headcount: 20_000, units: [{ type: "army.brigade-combat-team", count: 10, readiness: 0.8 }] },
                                navy: { headcount: 0 },
                                air: { headcount: 0 },
                                marines: { headcount: 0 },
                                space: { headcount: 0 },
                                cyber: { headcount: 0 },
                            },
                        },
                    },
                },
            },
        };
        expect(availableUnits(withUnits, base.founding.nation, "army")).toBe(10);
        const deployed = {
            ...withUnits,
            commitments: {
                "commitment:deployment:test": {
                    id: "commitment:deployment:test",
                    kind: "deployment",
                    actor: base.founding.nation,
                    target: { kind: "nation", id: TARGET },
                    resource: { spec: { kind: "count", noun: "brigades" }, amountPerTurn: 6 },
                    source: { kind: "orderOfBattle", branch: "army", unitType: "army.brigade-combat-team", count: 6 },
                    startedTurn: 1,
                    review: "standing",
                    status: "active",
                    rationale: "A theater the administration chose to be in.",
                },
            },
        };
        expect(availableUnits(deployed, base.founding.nation, "army")).toBe(4);
        expect(readinessCeiling(deployed, base.founding.nation)).toBeLessThan(readinessCeiling(withUnits, base.founding.nation));
    });
});
describe("what an appropriation buys, counted in units", () => {
    const { campaign } = foundedForBalance("capacity-bench");
    const us = campaign.founding.nation;
    function withMilitary(state, change) {
        const runtime = state.nations[us];
        return { ...state, nations: { ...state.nations, [us]: { ...runtime, stats: { ...runtime.stats, military: change(runtime.stats.military) } } } };
    }
    it("opens every holding at the establishment the dataset authored", () => {
        const bench = selectForceBench(campaign, us, "air", "air.fighter");
        expect(bench.establishment).toBeGreaterThan(0);
        expect(bench.fielded).toBe(bench.establishment);
        expect(bench.available).toBe(bench.establishment - bench.committed);
    });
    it("counts air strength an appropriation has built as airframes on the roster", () => {
        const grown = withMilitary(campaign, (military) => ({ ...military, branchStrength: { ...military.branchStrength, air: military.branchStrength.air * 1.1 } }));
        const bench = selectForceBench(grown, us, "air", "air.fighter");
        expect(bench.fielded).toBe(Math.floor(bench.establishment * 1.1 + 1e-9));
        expect(bench.fielded).toBeGreaterThan(bench.establishment);
    });
    it("fields a spent force in proportion to what is spent, not all or nothing", () => {
        const anchor = readinessAnchor(campaign.nations[us]);
        const carriers = selectForceBench(campaign, us, "navy", "navy.aircraft-carrier").establishment;
        const halfSpent = withMilitary(campaign, (military) => ({ ...military, readiness: anchor / 2 }));
        expect(availableUnitsOfType(halfSpent, us, "navy", "navy.aircraft-carrier")).toBe(Math.floor(carriers / 2 + 1e-9));
    });
    it("prints no count for a government whose holdings the dataset does not carry", () => {
        const withoutOrder = Object.keys(campaign.nations).find((id) => !campaign.nations[id].stats.military.orderOfBattle);
        expect(selectForceBench(campaign, withoutOrder, "air", "air.fighter")).toBeUndefined();
    });
});
