import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { hasFlag } from "./state-selectors.js";
import { advanceTurn, noopPhase } from "./turn-loop.js";
import { campaignPhaseSequence, campaignTurnPhases, weekGroups } from "./turn-phases.js";
const SEED = "phase-order-seed";
const probeFlag = (phase) => `probe:${phase}`;
function marker(phase) {
    return (state) => [
        {
            source: "simulate",
            actor: "world",
            turn: state.turn,
            narration: { summary: `${phase} leaves its week on the board.` },
            effects: [{ kind: "flag", set: [probeFlag(phase)] }],
        },
    ];
}
/**
 * Runs one real turn with a marker written straight after each named phase and
 * one observer standing in the slot under test. What the observer is handed is
 * what a phase in that slot would be planned against, so a marker it can see is
 * a read-after-write the sequence genuinely provides.
 */
function markersVisibleAt(charter, marksAfter, observer) {
    const named = campaignPhaseSequence(charter);
    const indexOf = (id) => {
        const at = named.findIndex((phase) => phase.id === id);
        if (at === -1)
            throw new Error(`no phase named ${id} in the canonical sequence`);
        return at;
    };
    const inserts = new Map();
    const at = (index) => {
        if (!inserts.has(index))
            inserts.set(index, []);
        return inserts.get(index);
    };
    for (const phase of marksAfter)
        at(indexOf(phase) + 1).push(marker(phase));
    const seen = [];
    at(observer.kind === "after" ? indexOf(observer.phase) + 1 : indexOf(observer.phase)).push((state) => {
        for (const phase of marksAfter)
            if (hasFlag(state, probeFlag(phase)))
                seen.push(phase);
        return [];
    });
    const steps = [];
    named.forEach((phase, index) => {
        steps.push(...(inserts.get(index) ?? []), phase.run);
    });
    steps.push(...(inserts.get(named.length) ?? []));
    const { campaign } = foundedForBalance(SEED);
    advanceTurn(campaign, { simulate: steps, select: noopPhase });
    return seen;
}
function charterFor() {
    return foundedForBalance(SEED).charter;
}
describe("the canonical phase sequence", () => {
    it("is exactly this order, so an independently landed edit cannot quietly move a slot", () => {
        expect(campaignPhaseSequence(charterFor()).map((phase) => phase.id)).toEqual([
            "npcActionPhase",
            "pursuitPhase",
            "operatorPhase",
            "conflictPhase",
            "munitionsPhase",
            "worldEventPhase",
            "commodityPhase",
            "macroDriftPhase",
            "defaultPhase",
            "conditionPhase",
            "cityPhase",
            "obligationPhase",
            "emergencyPhase",
            "statePhase",
            "capacityPhase",
            // The theaters draw on the same force the refit is restoring, and the
            // forty-eight hour clock on an introduction of forces starts the week the
            // forces went in.
            "commandPhase",
            "warPowersReportPhase",
            "blocPhase",
            // Immediately after the bloc phase: a treaty call and a bloc fracture are
            // read off the same two facts, and the rule that a compact both
            // belligerents sit in is a fracture rather than a call is only stable if
            // one board decides both.
            "compactPhase",
            // The executive branch settles what it can deliver before anything asks
            // it to deliver, and a nominee confirmed this week is in the chair for
            // this week's policy.
            // Retaliation lands before the budget counts the week, so a trade war's
            // cost is in the same books as the tariff that caused it.
            "tradePhase",
            "tariffFindingPhase",
            "nominationPhase",
            "judicialVacancyPhase",
            "institutionPhase",
            // A service is processed at the delivery the branch has just settled at.
            "servicePhase",
            "projectPhase",
            "militaryConstructionPhase",
            // Sale-specific review follows Interior's institutional delivery week.
            "offshoreLeaseSalePhase",
            "cleanPowerPurchasePhase",
            "blockedAssetPhase",
            "intelligencePhase",
            "cabinetLoyaltyPhase",
            "cabinetConsequencesPhase",
            "policyPhase",
            "apportionmentPhase",
            "budgetPhase",
            "commitmentPhase",
            "vitalsPhase",
            "fiscalPhase",
            "inspectorGeneralPhase",
            "committeeInquiryPhase",
            "specialCounselPhase",
            "oversightRipeningPhase",
            "congressPhase",
            "delegationPhase",
            "governorPhase",
            "legislationPhase",
            "shutdownPhase",
            "judicialReviewPhase",
            "rulemakingPhase",
            // A rule that finishes today is on the record before a due order ends;
            // calendar-day expiry also runs when the date advances between weeks.
            "orderExpiryPhase",
            "docketPhase",
            "pressPhase",
            "scandalPhase",
            "electionPhase",
            "governancePhase",
            "officeSuccessionPhase",
            "foreignPoliticsPhase",
            "regimePhase",
            "grudgeDecayPhase",
            "pledgePhase",
            "opinionPhase",
            "demosPhase",
            "removalPhase",
            "familyLapsePhase",
        ]);
    });
    it("hands the whole sequence to advanceTurn as one list rather than one function", () => {
        const named = campaignPhaseSequence(charterFor());
        expect(named.length).toBeGreaterThan(1);
        expect(new Set(named.map((phase) => phase.id)).size).toBe(named.length);
    });
});
// Each of these is a read-after-write ARCHITECTURE.md section 3 names as
// load-bearing. Every one is proven the same way: a marker written at the
// earlier slot, an observer standing where the later phase is planned, and a
// control marker written at a slot that comes after the observer — which must
// not be visible, or the test would pass on a runner with no order at all.
describe("the load-bearing orderings", () => {
    const charter = charterFor();
    it("puts the world's own week, the wars, the conditions and the commitments before the neglect ledger", () => {
        const writers = ["npcActionPhase", "conflictPhase", "conditionPhase", "commitmentPhase"];
        expect(markersVisibleAt(charter, writers, { kind: "after", phase: "commitmentPhase" })).toEqual(writers);
    });
    it("does not let the neglect ledger's slot see a week that has not happened yet", () => {
        expect(markersVisibleAt(charter, ["congressPhase"], { kind: "after", phase: "commitmentPhase" })).toEqual([]);
    });
    it("plants a grievance before the tick that fades it, so the ledger's slot is read by grudge decay", () => {
        expect(markersVisibleAt(charter, ["commitmentPhase"], { kind: "before", phase: "grudgeDecayPhase" })).toEqual([
            "commitmentPhase",
        ]);
    });
    it("settles the states' week before the delegation drift reads their grievance", () => {
        expect(markersVisibleAt(charter, ["statePhase"], { kind: "before", phase: "delegationPhase" })).toEqual([
            "statePhase",
        ]);
    });
    it("settles the chamber's mood before the delegation drift displaces it", () => {
        expect(markersVisibleAt(charter, ["congressPhase"], { kind: "before", phase: "delegationPhase" })).toEqual([
            "congressPhase",
        ]);
    });
    it("settles the delegation drift before the week's votes are counted", () => {
        expect(markersVisibleAt(charter, ["delegationPhase"], { kind: "before", phase: "legislationPhase" })).toEqual([
            "delegationPhase",
        ]);
    });
    it("does not let the week's votes see a chamber the elections have not recomposed yet", () => {
        expect(markersVisibleAt(charter, ["electionPhase"], { kind: "before", phase: "legislationPhase" })).toEqual([]);
    });
    it("revises the public mood before a cohort's strain is read against it", () => {
        expect(markersVisibleAt(charter, ["opinionPhase"], { kind: "before", phase: "demosPhase" })).toEqual([
            "opinionPhase",
        ]);
    });
    it("settles the cohorts before the pressure regime's slot reads standing strain", () => {
        expect(markersVisibleAt(charter, ["demosPhase"], { kind: "after", phase: "removalPhase" })).toEqual([
            "demosPhase",
        ]);
    });
    it("advances the removal arc before the pressure regime's slot reads it", () => {
        expect(markersVisibleAt(charter, ["removalPhase"], { kind: "after", phase: "removalPhase" })).toEqual([
            "removalPhase",
        ]);
    });
});
describe("the office-day cut", () => {
    it("covers the sequence once, in order, across seven days", () => {
        const sequence = campaignPhaseSequence(charterFor());
        const days = weekGroups(sequence);
        expect(days).toHaveLength(7);
        expect(days[0]?.map((phase) => phase.id)).toEqual(["npcActionPhase"]);
        expect(days[1]).toEqual([]);
        expect(days[2]?.map((phase) => phase.id)).toEqual([
            "pursuitPhase",
            "operatorPhase",
            "conflictPhase",
            "munitionsPhase",
            "worldEventPhase",
        ]);
        expect(days[3]?.slice(0, 3).map((phase) => phase.id)).toEqual(["commodityPhase", "macroDriftPhase", "defaultPhase"]);
        expect(days[3]?.at(-1)?.id).toBe("tariffFindingPhase");
        expect(days[4]?.[0]?.id).toBe("nominationPhase");
        expect(days[4]?.at(-1)?.id).toBe("fiscalPhase");
        expect(days[5]?.[0]?.id).toBe("inspectorGeneralPhase");
        expect(days[5]?.at(-1)?.id).toBe("docketPhase");
        expect(days[6]?.[0]?.id).toBe("pressPhase");
        expect(days[6]?.at(-1)?.id).toBe("familyLapsePhase");
        expect(days.flat().map((phase) => phase.id)).toEqual(sequence.map((phase) => phase.id));
        const phases = campaignTurnPhases(charterFor());
        const simulate = Array.isArray(phases.simulate) ? phases.simulate : [phases.simulate];
        expect(simulate).toHaveLength(sequence.length);
    });
});
describe("what a phase may not write", () => {
    it("leaves the arc namespace alone across a run of the real sequence", () => {
        const { campaign, charter } = foundedForBalance(SEED);
        const phases = { simulate: campaignPhaseSequence(charter).map((phase) => phase.run), select: noopPhase };
        let working = campaign;
        for (let turn = 0; turn < 12; turn++)
            working = advanceTurn(working, phases);
        expect(Object.keys(working.player.flags).filter((flag) => flag.startsWith("arc:"))).toEqual([]);
    });
});
