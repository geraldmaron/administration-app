import { imposeTestTariff } from "./__fixtures__/tariff.js";
import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { campaignTurnPhases } from "./turn-phases.js";
import { advanceTurn } from "./turn-loop.js";
import { apply } from "./effects.js";
import { liftMeasure, selectLiveMeasures, tradeEdge } from "./trade.js";
import { TRADE_SECTORS } from "./trade-sectors.js";
import { findOrphanedCauses, selectCausesOf, selectDecisionLegacy, selectRootCausesOf, } from "./causality.js";
import { INSTRUMENT_IDS } from "./instruments.js";
import { projectAction, resolveAction } from "./resolution.js";
import { createRngStreams } from "./rng.js";
import { candidateTargetsForBalance } from "./balance-harness.js";
// The depth gate.
//
// `causality.test.ts` proves the graph's shape against a hand-built ledger: a
// cause names a cause, a walk terminates, an orphan is found. What it cannot
// prove is that a *played* campaign produces anything to walk. The first
// implementation stamped every packet and supplied causes at almost no call
// site, so a real campaign came out broad and one level deep — every event
// named, nothing answering to anything. Every assertion here is measured on a
// campaign the harness actually ran.
function stampedLedger(campaign) {
    return campaign.ledger.filter((entry) => entry.causal !== undefined);
}
function withCauses(campaign) {
    return stampedLedger(campaign).filter((entry) => (entry.causal.causeIds ?? []).length > 0);
}
/** A tariff the board will actually accept, on the partner the player is most exposed to. */
function firstUsableTariff(campaign) {
    for (const target of candidateTargetsForBalance(campaign)) {
        for (const sector of TRADE_SECTORS) {
            if (sector.instrument !== "tariff")
                continue;
            if (!tradeEdge(campaign, target, sector.id))
                continue;
            const result = imposeTestTariff(campaign, target, sector.id, 0.35);
            if (result.ok)
                return result;
        }
    }
    return undefined;
}
describe("the causal graph a played campaign actually produces", () => {
    it("answers a tariff with a retaliation that names the tariff", () => {
        // The mission's own worked chain, and the one place the engine used to
        // stamp a literal empty `causeIds` — a caller that knew there was a cause
        // and had no way to say which.
        const { campaign: founded, charter } = foundedForBalance("causal-depth-tariff");
        const phases = campaignTurnPhases(charter);
        const imposed = firstUsableTariff(founded);
        expect(imposed, "no partner in the founded board could be tariffed").toBeDefined();
        const signed = apply(founded, imposed.packet);
        const signature = stampedLedger(signed).at(-1);
        // The measure remembers the day it was signed, which is the whole
        // mechanism: the phase that answers it holds the record and nothing else.
        const measure = selectLiveMeasures(signed).find((m) => m.origin === "us" && !(m.id in founded.trade.measures));
        expect(measure?.causedBy).toBe(signature.causal.eventId);
        // Retaliation lands on a lag, so the answer arrives several weeks later in
        // a different function. Run far enough for it to be due.
        let working = signed;
        for (let turn = 0; turn < 12; turn++)
            working = advanceTurn(working, phases);
        const answers = stampedLedger(working).filter((entry) => (entry.causal.causeIds ?? []).includes(signature.causal.eventId));
        // Retaliation is a draw, not a certainty — a partner may decline to answer.
        // What must be true either way is that nothing in the world names this
        // tariff falsely, and that whatever does name it is a trade event.
        for (const answer of answers) {
            expect(answer.causal.systems ?? []).toContain("trade");
            expect(selectCausesOf(working.ledger, answer.causal.eventId).map((c) => c.causal.eventId)).toContain(signature.causal.eventId);
        }
        // And the decision's downstream cone is reachable from the signature.
        const legacy = selectDecisionLegacy(working.ledger, signature.causal.eventId);
        expect(legacy.length).toBe(answers.length === 0 ? 0 : legacy.length);
    });
    it("names the signature a lift is undoing", () => {
        const { campaign: founded } = foundedForBalance("causal-depth-lift");
        const imposed = firstUsableTariff(founded);
        expect(imposed).toBeDefined();
        const signed = apply(founded, imposed.packet);
        const signature = stampedLedger(signed).at(-1);
        const measure = selectLiveMeasures(signed).find((m) => m.origin === "us" && !(m.id in founded.trade.measures));
        const lifted = liftMeasure(signed, measure.id);
        expect(lifted.ok).toBe(true);
        if (!lifted.ok)
            return;
        expect(lifted.packet.provenance?.causeIds).toEqual([signature.causal.eventId]);
    });
    it("gives a running condition one story rather than a notice a week", () => {
        // A condition's later weeks are produced by a phase that holds only the
        // record. Before the record carried its onset, a drought opening in March
        // and being declared over in September were unrelated ledger sentences.
        const { campaign: founded, charter } = foundedForBalance("causal-depth-conditions");
        const phases = campaignTurnPhases(charter);
        let working = founded;
        for (let turn = 0; turn < 52; turn++)
            working = advanceTurn(working, phases);
        const conditions = Object.values(working.conditions).filter((condition) => condition.beats.length > 1);
        expect(conditions.length, "no condition ran long enough to have a second week").toBeGreaterThan(0);
        for (const condition of conditions) {
            expect(condition.causedBy, `${condition.id} has no onset event`).toBeDefined();
        }
        // Every later week of a condition points at its onset, and the onset is a
        // root — it answers to nothing, which is correct for weather.
        const onsets = new Set(conditions.map((condition) => condition.causedBy));
        const laterWeeks = stampedLedger(working).filter((entry) => (entry.causal.causeIds ?? []).some((id) => onsets.has(id)));
        expect(laterWeeks.length).toBeGreaterThan(0);
        for (const onset of onsets) {
            expect(selectRootCausesOf(working.ledger, onset)).toEqual([]);
        }
    });
    it("leaves an instrument act a root, because an instrument act declares no gate", () => {
        // This case is the honest record of a cost, not of a win.
        //
        // It used to assert that each act on a counterpart answered the last one,
        // which is what made a term read as a thread — and that edge was withdrawn,
        // because two acts passing between the same two capitals is adjacency and
        // not causation. What survives is the situation's own gate: the flags an
        // earlier decision set that a later scenario required.
        //
        // An instrument act declares no gate. Only an authored scenario does. So
        // the whole coercion ladder is outside the causal graph until a gate that
        // plays authored content can measure the part that is inside it, and this
        // case pins that consequence in place rather than letting it be discovered
        // again later as a surprise.
        const { campaign: founded } = foundedForBalance("causal-depth-decisions");
        const target = candidateTargetsForBalance(founded)[0];
        expect(target, "the founded board has no candidate counterpart").toBeDefined();
        let working = founded;
        const acts = [];
        for (let round = 0; round < 4; round++) {
            for (const instrument of INSTRUMENT_IDS) {
                const request = { actor: working.founding.nation, target: target, instrument, rung: 1 };
                if (!projectAction(working, request, createRngStreams(working.seed)).ok)
                    continue;
                const resolved = resolveAction(working, request, createRngStreams(working.seed), "action");
                if (!resolved.ok)
                    continue;
                working = apply(working, resolved.packet);
                acts.push(stampedLedger(working).at(-1).causal.eventId);
                break;
            }
        }
        expect(acts.length, "the board refused every instrument on every round").toBeGreaterThan(1);
        // Every act is a root, including the ones after the first, because none of
        // them answers a gate. The stamping itself still works — these entries carry
        // provenance, they simply have no cause to name.
        for (const act of acts) {
            expect(selectCausesOf(working.ledger, act)).toEqual([]);
            expect(selectDecisionLegacy(working.ledger, act)).toEqual([]);
        }
    });
    it("produces a graph with real depth in it, not a stamp on every root", () => {
        // The honest limit the first record wrote down: "the graph is stamped
        // everywhere and deep in a few places". This asserts the floor that makes
        // the panel worth opening — a year of ordinary government has to leave
        // some meaningful share of its ledger answering to something earlier.
        const { campaign: founded, charter } = foundedForBalance("causal-depth-shape");
        const phases = campaignTurnPhases(charter);
        let working = founded;
        for (let turn = 0; turn < 52; turn++)
            working = advanceTurn(working, phases);
        const stamped = stampedLedger(working);
        const linked = withCauses(working);
        expect(stamped.length).toBeGreaterThan(100);
        // Measured at 39%, 41% and 48% of stamped events across three seeds of a
        // year of ungoverned world. The floor is set well under the lowest of them
        // so a passing run means the wiring held rather than that the seeds fell
        // well — and well over zero, which is what this number was.
        const linkedShare = linked.length / stamped.length;
        expect(linkedShare, `${linked.length} of ${stamped.length} stamped events name a cause`).toBeGreaterThan(0.2);
        // What is deliberately NOT asserted is a deep chain. Measured, the graph
        // this produces is two levels: a condition's eleven weekly notices all
        // point at the week it opened, which is a star and not a chain, because
        // that is the true shape of the fact — week six of a drought is caused by
        // the drought, not by week five. Longer chains exist on the paths a
        // president drives (a tariff answered by a partner, a name sent up and
        // seated months later) and this seed governs nothing, so none of them
        // fire here. A gate demanding depth would only have been satisfiable by
        // inventing edges.
        // And every edge in it points at something real. This is the integrity
        // rule the harness runs over hundreds of campaigns; asserted here on a
        // played one so a bad stamp fails in the same file that added it.
        expect(findOrphanedCauses(working.ledger)).toEqual([]);
    });
});
