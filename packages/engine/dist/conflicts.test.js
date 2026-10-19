import { describe, expect, it } from "vitest";
import { Nation, Relationship } from "@admin/world";
import { buildCampaign, nationA, nationB, person, relationship } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { assessDeterrence, escalate, openConflict, openOrEscalate, projectConflictConsequence, selectConflictBetween, sideOf, } from "./conflicts.js";
import { commandQuality, conflictPhase } from "./war-tick.js";
import { joinConflict, selectJoinableConflicts } from "./war-entry.js";
import { projectAction, resolveAction } from "./resolution.js";
import { createRngStreams } from "./rng.js";
import { activeCommitments } from "./commitments.js";
import { relationshipKey } from "./state.js";
const USA = nationA.id;
const ALP = nationB.id;
const militaryMetrics = {
    forceIndex: 0.6,
    mobilizationCap: 0.5,
    sustainability: { warDuration: 0.5, industrialMobilization: 0.5 },
    downtime: 0.4,
};
function withMilitaryMetrics(campaign) {
    const nations = Object.fromEntries(Object.entries(campaign.nations).map(([id, runtime]) => [
        id,
        { ...runtime, base: Nation.parse({ ...runtime.base, bands: { ...runtime.base.bands, militaryMetrics } }) },
    ]));
    return { ...campaign, nations };
}
// The fixture nation cannot lift an army over a border; the invasion rung's
// own gate says so. These tests are about what happens once it can.
function ableToInvade(campaign) {
    const runtime = campaign.nations[USA];
    return {
        ...campaign,
        nations: {
            ...campaign.nations,
            [USA]: {
                ...runtime,
                stats: {
                    ...runtime.stats,
                    military: {
                        ...runtime.stats.military,
                        airliftCapacity: 0.6,
                        sealiftCapacity: 0.6,
                        branchStrength: { ...runtime.stats.military.branchStrength, land: 0.6, air: 0.5 },
                    },
                },
            },
        },
    };
}
function atWar(cause = "USA invades ALP") {
    const campaign = withMilitaryMetrics(buildCampaign());
    const conflict = openConflict(USA, ALP, campaign.turn, cause);
    return { ...campaign, conflicts: { [conflict.id]: conflict } };
}
function runPhase(state) {
    return conflictPhase(state).reduce((acc, packet) => apply(acc, packet), state);
}
function advance(state, turns) {
    let working = state;
    for (let i = 0; i < turns; i++) {
        working = { ...runPhase(working), turn: working.turn + 1 };
    }
    return working;
}
function onlyConflict(state) {
    const conflicts = Object.values(state.conflicts);
    expect(conflicts).toHaveLength(1);
    return conflicts[0];
}
describe("opening a war", () => {
    it("opens one when the two are not already fighting", () => {
        const campaign = buildCampaign();
        const conflict = openOrEscalate(campaign, USA, ALP, "USA invades ALP");
        expect(conflict.status).toBe("active");
        expect(conflict.aggressor).toBe(USA);
        expect(conflict.startedTurn).toBe(campaign.turn);
        expect(conflict.beats).toHaveLength(1);
    });
    it("makes the running war hotter instead of opening a second one", () => {
        const campaign = atWar();
        const existing = onlyConflict(campaign);
        const escalated = openOrEscalate(campaign, USA, ALP, "a second landing");
        expect(escalated.id).toBe(existing.id);
        expect(escalated.intensity).toBeGreaterThan(existing.intensity);
        expect(escalated.beats).toHaveLength(2);
    });
    it("treats a counter-invasion as the same war, whichever way round it is", () => {
        const campaign = atWar();
        expect(openOrEscalate(campaign, ALP, USA, "ALP counter-attacks").id).toBe(onlyConflict(campaign).id);
    });
    it("is the effect the invasion rung actually produces", () => {
        const campaign = ableToInvade(withMilitaryMetrics(buildCampaign()));
        const streams = createRngStreams(campaign.seed);
        const result = resolveAction(campaign, { actor: USA, target: ALP, instrument: "military", rung: 5 }, streams);
        expect(result.ok).toBe(true);
        if (!result.ok || !result.success)
            return; // a repulsed invasion opens no war, which is the point of the rung
        const next = apply(campaign, result.packet);
        expect(selectConflictBetween(next, USA, ALP)).toBeDefined();
    });
});
describe("the weekly tick", () => {
    it("wears both sides down and journals the week", () => {
        const before = atWar();
        const after = runPhase(before);
        const conflict = onlyConflict(after);
        expect(conflict.exhaustion.aggressor).toBeGreaterThan(0);
        expect(conflict.exhaustion.defender).toBeGreaterThan(0);
        expect(conflict.warSupport.aggressor).toBeLessThan(before.conflicts[conflict.id].warSupport.aggressor);
        expect(after.nations[USA].stats.military.readiness).toBeLessThan(before.nations[USA].stats.military.readiness);
        expect(after.nations[ALP].stats.military.readiness).toBeLessThan(before.nations[ALP].stats.military.readiness);
        expect(after.feed.some((item) => item.kind === "conflict")).toBe(true);
        expect(after.ledger.length).toBeGreaterThan(before.ledger.length);
    });
    it("costs the player's own readiness when it is their war, and leaves the money to the deployment that pays for it", () => {
        const before = atWar();
        const after = runPhase(before);
        expect(after.player.metrics.militaryReadiness).toBeLessThan(before.player.metrics.militaryReadiness);
        expect(after.player.metrics.treasury).toBe(before.player.metrics.treasury);
    });
    // A war no longer has to end to stop being fought: a stalemate between two
    // tired armies freezes into a held front, which can run for years. What it
    // may not do is grind at full heat forever.
    it("ends or freezes within a bounded number of weeks rather than grinding hot forever", () => {
        const settled = advance(atWar(), 40);
        const conflict = onlyConflict(settled);
        const frozen = conflict.status === "active" && conflict.intensity < 0.2;
        expect(conflict.status !== "active" || frozen).toBe(true);
        if (conflict.status !== "active")
            expect(conflict.endedTurn).toBeDefined();
        expect(conflict.beats.at(-1).description).toMatch(/\w/);
    });
    it("is a pure function of the seed", () => {
        const start = atWar();
        expect(advance(start, 12)).toEqual(advance(start, 12));
    });
    it("costs the aggressor standing with every third party that has a reading of them", () => {
        const before = atWar();
        const after = runPhase(before);
        expect(after.player.metrics.standing).toBeLessThan(before.player.metrics.standing);
    });
});
describe("the defense ministry as a wartime variable", () => {
    const defenseRole = "role-defense";
    function withDefenseMinister(campaign, competence) {
        const minister = { ...person, id: "PER-DEF", competence, loyalty: 0.8 };
        return {
            ...campaign,
            people: { ...campaign.people, [minister.id]: { base: minister, alive: true, currentRole: defenseRole } },
            player: { ...campaign.player, cabinet: { ...campaign.player.cabinet, [defenseRole]: minister.id } },
        };
    }
    it("reads a vacant chair as worse than any seated minister", () => {
        const vacant = commandQuality(atWar(), USA);
        const seated = commandQuality(withDefenseMinister(atWar(), 0.4), USA);
        expect(vacant).toBeLessThan(seated);
    });
    it("never prices another nation's war by the player's cabinet", () => {
        const campaign = atWar();
        const doctrine = campaign.nations[ALP].stats.military.doctrineQuality;
        expect(commandQuality(withDefenseMinister(campaign, 0.9), ALP)).toBe(doctrine);
        expect(commandQuality(withDefenseMinister(campaign, 0.1), ALP)).toBe(doctrine);
    });
    it("turns competence into less attrition for the same week of fighting", () => {
        const readinessAfter = (competence) => runPhase(withDefenseMinister(atWar(), competence)).nations[USA].stats.military.readiness;
        expect(readinessAfter(0.9)).toBeGreaterThan(readinessAfter(0.1));
    });
});
describe("deterrence", () => {
    function nuclear(campaign, nation, warheads, triad) {
        const runtime = campaign.nations[nation];
        return {
            ...campaign,
            nations: {
                ...campaign.nations,
                [nation]: {
                    ...runtime,
                    stats: {
                        ...runtime.stats,
                        military: { ...runtime.stats.military, arsenal: { warheads, deliveryTriad: triad } },
                    },
                },
            },
        };
    }
    it("reads a defender's arsenal, and a mutual one as mutual", () => {
        const base = ableToInvade(withMilitaryMetrics(buildCampaign()));
        expect(assessDeterrence(base, USA, ALP).defenderNuclear).toBe(false);
        const armed = nuclear(base, ALP, 300, true);
        const assessment = assessDeterrence(armed, USA, ALP);
        expect(assessment.defenderNuclear).toBe(true);
        expect(assessment.mutual).toBe(false);
        expect(assessment.retaliationSeverity).toBeGreaterThan(0.8);
        expect(assessDeterrence(nuclear(armed, USA, 100, false), USA, ALP).mutual).toBe(true);
    });
    // Below the line a declared arsenal with delivery draws, a nuclear defender
    // is information rather than a wall: these read a state without a triad.
    it("is stated in the projection at the rungs where it is the question, and nowhere else", () => {
        const campaign = nuclear(ableToInvade(withMilitaryMetrics(buildCampaign())), ALP, 300, false);
        const streams = createRngStreams(campaign.seed);
        const at = (rung) => projectAction(campaign, { actor: USA, target: ALP, instrument: "military", rung }, streams);
        const invasion = at(5);
        expect(invasion.ok && invasion.projection.deterrence?.defenderNuclear).toBe(true);
        expect(invasion.ok && invasion.projection.deterrence?.summary).toMatch(/nuclear|retaliation/i);
        const gesture = at(1);
        expect(gesture.ok && gesture.projection.deterrence).toBeUndefined();
    });
    it("refuses every act of force against a declared arsenal it can deliver, blockade included", () => {
        const campaign = nuclear(ableToInvade(withMilitaryMetrics(buildCampaign())), ALP, 300, true);
        for (const rung of [3, 4, 5]) {
            const projected = projectAction(campaign, { actor: USA, target: ALP, instrument: "military", rung }, createRngStreams(campaign.seed));
            expect(projected.ok, `rung ${rung}`).toBe(false);
            if (!projected.ok)
                expect(projected.missingCapability).toMatch(/declared nuclear arsenal/);
        }
        const undeclared = { ...campaign, nations: { ...campaign.nations, [ALP]: { ...campaign.nations[ALP], stats: { ...campaign.nations[ALP].stats, military: { ...campaign.nations[ALP].stats.military, arsenal: { warheads: 300, deliveryTriad: true, declared: false } } } } } };
        expect(projectAction(undeclared, { actor: USA, target: ALP, instrument: "military", rung: 5 }, createRngStreams(campaign.seed)).ok).toBe(true);
    });
    it("weighs a blockade of a nuclear defender as it weighs a strike", () => {
        const campaign = nuclear(ableToInvade(withMilitaryMetrics(buildCampaign())), ALP, 300, false);
        const blockade = projectAction(campaign, { actor: USA, target: ALP, instrument: "military", rung: 3 }, createRngStreams(campaign.seed));
        if (blockade.ok)
            expect(blockade.projection.deterrence?.defenderNuclear).toBe(true);
    });
    it("makes the gamble worse without making it unavailable", () => {
        const plain = ableToInvade(withMilitaryMetrics(buildCampaign()));
        const armed = nuclear(plain, ALP, 300, false);
        const request = { actor: USA, target: ALP, instrument: "military", rung: 5 };
        const chance = (campaign) => {
            const projected = projectAction(campaign, request, createRngStreams(campaign.seed));
            if (!projected.ok)
                throw new Error(projected.reason);
            return projected.projection.successChance;
        };
        expect(chance(armed)).toBeLessThan(chance(plain));
        expect(chance(armed)).toBeGreaterThan(0);
    });
    it("keeps the projection the resolver used identical to the one the player read", () => {
        const campaign = nuclear(ableToInvade(withMilitaryMetrics(buildCampaign())), ALP, 300, false);
        const request = { actor: USA, target: ALP, instrument: "military", rung: 5 };
        const projected = projectAction(campaign, request, createRngStreams(campaign.seed));
        const resolved = resolveAction(campaign, request, createRngStreams(campaign.seed));
        expect(projected.ok && resolved.ok).toBe(true);
        if (!projected.ok || !resolved.ok)
            return;
        expect(resolved.projection).toEqual(projected.projection);
    });
});
describe("escalation of a running war", () => {
    it("appends a beat rather than replacing the war's record", () => {
        const conflict = openConflict(USA, ALP, 3, "opened");
        const hotter = escalate(conflict, 5, "a strike on the capital");
        expect(hotter.beats.map((beat) => beat.description)).toEqual(["opened", "a strike on the capital"]);
        expect(hotter.startedTurn).toBe(3);
    });
});
// The projection told the player what a strike costs and how likely it is to
// land, and said nothing about the fact that the heaviest rung starts a war the
// board then carries for the rest of the campaign — the largest consequence any
// single act in the game has.
describe("what the projection says about the war ledger", () => {
    it("says nothing where the question does not arise", () => {
        const campaign = ableToInvade(withMilitaryMetrics(buildCampaign()));
        expect(projectConflictConsequence(campaign, USA, ALP, "economic", 5)).toBeUndefined();
        expect(projectConflictConsequence(campaign, USA, ALP, "military", 2)).toBeUndefined();
    });
    // A blockade of a state's ports is an act of aggression (GA Res. 3314,
    // Art. 3(c)), so it opens a war the first time rather than the second.
    it("names a first blockade as starting a war", () => {
        const campaign = ableToInvade(withMilitaryMetrics(buildCampaign()));
        const consequence = projectConflictConsequence(campaign, USA, ALP, "military", 3);
        expect(consequence?.effect).toBe("starts");
        expect(consequence?.summary).toContain("act of war");
    });
    it("names starting a war as starting a war", () => {
        const campaign = ableToInvade(withMilitaryMetrics(buildCampaign()));
        const consequence = projectConflictConsequence(campaign, USA, ALP, "military", 5);
        expect(consequence?.opens).toBe(true);
        expect(consequence?.effect).toBe("starts");
        expect(consequence?.headline).toBe("This starts a war");
        expect(consequence?.summary).toContain("starts a war");
    });
    // The defect this replaces: a rung-4 strike against a country there was no
    // war with came back present-but-neither, and every surface reading it keyed
    // its headline off `opens` alone — so the act was announced as "This widens
    // the war" over a sentence saying there was no war to widen.
    it("says nothing about the war ledger for a strike that neither opens nor widens one", () => {
        const campaign = ableToInvade(withMilitaryMetrics(buildCampaign()));
        expect(selectConflictBetween(campaign, USA, ALP)).toBeUndefined();
        expect(projectConflictConsequence(campaign, USA, ALP, "military", 4)).toBeUndefined();
        const streams = createRngStreams(campaign.seed);
        const projected = projectAction(campaign, { actor: USA, target: ALP, instrument: "military", rung: 4 }, streams);
        expect(projected.ok).toBe(true);
        if (!projected.ok)
            return;
        expect(projected.projection.conflict).toBeUndefined();
    });
    it("reads a strike into a running war as widening it, not starting a second", () => {
        const base = ableToInvade(withMilitaryMetrics(buildCampaign()));
        const war = openConflict(USA, ALP, base.turn, "Invaded.");
        const campaign = { ...base, conflicts: { [war.id]: war } };
        for (const rung of [4, 5]) {
            const consequence = projectConflictConsequence(campaign, USA, ALP, "military", rung);
            expect(consequence?.opens, `rung ${rung}`).toBe(false);
            expect(consequence?.escalates, `rung ${rung}`).toBe(true);
            expect(consequence?.effect, `rung ${rung}`).toBe("widens");
            expect(consequence?.headline, `rung ${rung}`).toBe("This widens the war");
        }
    });
    it("rides the same projection the resolver uses, so it cannot disagree with it", () => {
        const campaign = ableToInvade(withMilitaryMetrics(buildCampaign()));
        const streams = createRngStreams(campaign.seed);
        const projected = projectAction(campaign, { actor: USA, target: ALP, instrument: "military", rung: 5 }, streams);
        expect(projected.ok).toBe(true);
        if (!projected.ok)
            return;
        expect(projected.projection.conflict?.opens).toBe(true);
    });
});
// --- Intervention -----------------------------------------------------------
//
// Until this existed the only thing a government could do about a war it was
// not in was start a second one against the same attacker. Defending somebody
// is a different act, and the board has to be able to tell the two apart.
const CAS = "CAS";
const nationC = Nation.parse({ ...nationA, id: "CAS", identity: { ...nationA.identity, name: "Castrel" } });
/** ALP is invading CAS, and the player's own nation is a friend of the victim. */
function somebodyElsesWar() {
    const base = withMilitaryMetrics(buildCampaign());
    const withThird = {
        ...base,
        nations: {
            ...base.nations,
            [CAS]: {
                base: Nation.parse({ ...nationC, bands: { ...nationC.bands, militaryMetrics } }),
                stats: nationC.stats,
                traits: nationC.traits,
            },
        },
        relationships: {
            ...base.relationships,
            [relationshipKey(USA, CAS)]: Relationship.parse({ ...relationship, from: "USA", to: "CAS", trust: 0.6 }),
            [relationshipKey(ALP, USA)]: Relationship.parse({ ...relationship, from: "ALP", to: "USA" }),
        },
    };
    const conflict = openConflict(ALP, CAS, withThird.turn, "Alpland invades Castrel.");
    return { campaign: { ...withThird, conflicts: { [conflict.id]: conflict } }, conflict };
}
describe("joining a war somebody else started", () => {
    it("puts the joiner on the side it chose, and only that side", () => {
        const { campaign, conflict } = somebodyElsesWar();
        const result = joinConflict(campaign, USA, conflict.id, "defender");
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        const after = apply(campaign, result.packet);
        const war = after.conflicts[conflict.id];
        expect(war.joined.defender).toContain(USA);
        expect(war.joined.aggressor).not.toContain(USA);
        expect(sideOf(war, USA)).toBe("defender");
    });
    it("prices it on the player's own panel, and reads defending differently from piling on", () => {
        const { campaign, conflict } = somebodyElsesWar();
        const defending = joinConflict(campaign, USA, conflict.id, "defender");
        const piling = joinConflict(campaign, USA, conflict.id, "aggressor");
        expect(defending.ok && piling.ok).toBe(true);
        if (!defending.ok || !piling.ok)
            return;
        const asDefender = apply(campaign, defending.packet).player.metrics;
        const asAggressor = apply(campaign, piling.packet).player.metrics;
        expect(asDefender.standing).toBeGreaterThan(campaign.player.metrics.standing);
        expect(asAggressor.standing).toBeLessThan(campaign.player.metrics.standing);
        // Either way it is a war: readiness is spent whichever side was taken.
        expect(asDefender.militaryReadiness).toBeLessThan(campaign.player.metrics.militaryReadiness);
        expect(asAggressor.militaryReadiness).toBeLessThan(campaign.player.metrics.militaryReadiness);
    });
    it("turns the other principal against the joiner in both directions the graph holds", () => {
        const { campaign, conflict } = somebodyElsesWar();
        const result = joinConflict(campaign, USA, conflict.id, "defender");
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        const after = apply(campaign, result.packet);
        expect(after.relationships[relationshipKey(USA, ALP)].tension).toBeGreaterThan(campaign.relationships[relationshipKey(USA, ALP)].tension);
        expect(after.relationships[relationshipKey(ALP, USA)].trust).toBeLessThan(campaign.relationships[relationshipKey(ALP, USA)].trust);
        expect(after.relationships[relationshipKey(USA, CAS)].trust).toBeGreaterThan(campaign.relationships[relationshipKey(USA, CAS)].trust);
    });
    it("refuses a nation that is already a party, on either side", () => {
        const { campaign, conflict } = somebodyElsesWar();
        for (const side of ["defender", "aggressor"]) {
            const result = joinConflict(campaign, ALP, conflict.id, side);
            expect(result.ok, side).toBe(false);
            if (result.ok)
                continue;
            expect(result.reason).toMatch(/already a party/);
        }
    });
    it("refuses a nation that could not put anything in the theater", () => {
        const { campaign, conflict } = somebodyElsesWar();
        // Strength is read off the live force, so the government that cannot reach
        // a war is one with nothing left in its services, whatever it was handed.
        const runtime = campaign.nations[USA];
        const spent = {
            ...runtime.stats.military,
            budget: 0,
            activeHeadcount: 0,
            reserveHeadcount: 0,
            readiness: 0,
            doctrineQuality: 0,
            branchStrength: { land: 0, air: 0, naval: 0, cyber: 0, space: 0 },
            airliftCapacity: 0,
            sealiftCapacity: 0,
            arsenal: { warheads: 0, deliveryTriad: false },
            basesAbroad: 0,
        };
        const unable = {
            ...campaign,
            nations: { ...campaign.nations, [USA]: { ...runtime, stats: { ...runtime.stats, military: spent } } },
        };
        const result = joinConflict(unable, USA, conflict.id, "defender");
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.missingCapability).toMatch(/take the field|reach/);
    });
    it("refuses a war that is already over", () => {
        const { campaign, conflict } = somebodyElsesWar();
        const settled = {
            ...campaign,
            conflicts: { [conflict.id]: { ...conflict, status: "settled", endedTurn: campaign.turn } },
        };
        const result = joinConflict(settled, USA, conflict.id, "defender");
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.reason).toMatch(/over/);
    });
    it("offers exactly the wars it would accept — one list, one rule", () => {
        const { campaign, conflict } = somebodyElsesWar();
        const options = selectJoinableConflicts(campaign, USA);
        expect(options.map((option) => option.side).sort()).toEqual(["aggressor", "defender"]);
        for (const option of options) {
            expect(option.conflict.id).toBe(conflict.id);
            expect(joinConflict(campaign, USA, option.conflict.id, option.side).ok, option.side).toBe(true);
        }
        // A party to the war is offered nothing, which is what makes the list safe
        // for a screen to render blind.
        expect(selectJoinableConflicts(campaign, ALP)).toHaveLength(0);
    });
    it("makes the war heavier for the side that was joined", () => {
        const { campaign, conflict } = somebodyElsesWar();
        const result = joinConflict(campaign, USA, conflict.id, "defender");
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        const joined = apply(campaign, result.packet);
        const alone = advance(campaign, 3).conflicts[conflict.id];
        const together = advance(joined, 3).conflicts[conflict.id];
        // Three joined weeks of a defense with a second army in it wear the
        // aggressor down faster than the same three weeks without one.
        expect(together.exhaustion.aggressor).toBeGreaterThan(alone.exhaustion.aggressor);
    });
});
// The same defect settling at a table had, on the other path: a war the weekly
// tick decides — won, lost or fought to an armistice — left the promises made
// to fight it standing, so the front went on billing a theater nobody was in.
describe("what a war stops costing when the tick ends it", () => {
    it("winds down the deployment behind a war that has been fought to a finish", () => {
        const base = withMilitaryMetrics(buildCampaign());
        const spent = {
            ...openConflict(USA, ALP, base.turn, "Invaded."),
            exhaustion: { aggressor: 0.99, defender: 0.99 },
            warSupport: { aggressor: 0.01, defender: 0.01 },
        };
        const commitment = {
            id: "commitment:deployment:USA:ALP:1",
            kind: "deployment",
            actor: USA,
            target: { kind: "nation", id: ALP },
            resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn: 1_100 },
            source: { kind: "orderOfBattle", branch: "air", unitType: "air.fighter", count: 200 },
            startedTurn: base.turn,
            review: "standing",
            status: "active",
            rationale: "A strike package is on the line until it is recovered.",
        };
        const campaign = {
            ...base,
            conflicts: { [spent.id]: spent },
            commitments: { [commitment.id]: commitment },
        };
        expect(activeCommitments(campaign, USA)).toHaveLength(1);
        const after = conflictPhase(campaign).reduce(apply, campaign);
        expect(after.conflicts[spent.id].status).not.toBe("active");
        expect(activeCommitments(after, USA)).toHaveLength(0);
    });
});
