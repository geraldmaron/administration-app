import { describe, expect, it } from "vitest";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { removeOfficer } from "./career-incumbents.js";
import { judicialReviewPhase } from "./judicial-review.js";
import { courtWeeks } from "./court-procedure.js";
import { executiveOrder } from "./orders.js";
import { makeCampaignSeed } from "./rng.js";
import { REMOVAL_REINSTATEMENT_CHANCE, removalProceedingId, removalSuit, selectLegalExposures } from "./legal-exposure.js";
import { justiceReinstatementVotes, removalMatterEffects, removalRemedy } from "./removal-court.js";
const phase = judicialReviewPhase(CHARTER_PRESIDENTIAL_REPUBLIC);
const SEC = "INST-SEC";
const FOUNDED = foundedForBalance("removal-court").campaign;
function removedFrom(institution, seed) {
    const campaign = { ...FOUNDED, seed: makeCampaignSeed(seed) };
    const result = removeOfficer(campaign, institution);
    if (!result.ok)
        throw new Error(result.reason);
    return apply(campaign, result.packet);
}
function step(state) {
    const after = phase(state).reduce(apply, state);
    const waits = (after.judiciary.proceedings ?? []).filter((entry) => entry.stage !== "final").map((entry) => entry.nextTurn);
    return { ...after, turn: Math.max(after.turn + 1, waits.length ? Math.min(...waits) : 0) };
}
/** A removal whose member sues, wound to the week the suit is filed and opened. */
function suing() {
    for (let i = 0; i < 40; i += 1) {
        const state = removedFrom(SEC, `removal-sues-${i}`);
        const removal = state.institutions[SEC].contestedRemovals[0];
        const suit = removalSuit(state, SEC, removal);
        if (suit.sues) {
            const due = { ...state, turn: suit.decidesTurn };
            return removalMatterEffects(due).reduce((s, effect) => apply(s, { source: "simulate", actor: "world", turn: s.turn, narration: { summary: "filed" }, effects: [effect] }), due);
        }
    }
    throw new Error("no seed sued");
}
const proceedingOf = (state) => state.judiciary.proceedings?.find((entry) => entry.subject.kind === "commission-removal");
describe("a contested commission removal reaches a court", () => {
    it("opens one proceeding in the District of Columbia once the member decides to sue, and never a second", () => {
        const filed = suing();
        const proceedings = (filed.judiciary.proceedings ?? []).filter((entry) => entry.subject.kind === "commission-removal");
        expect(proceedings).toHaveLength(1);
        expect(proceedings[0].lowerForum?.court).toMatch(/District of Columbia/);
        expect(proceedings[0].matter?.question).toMatch(/Trump v\. Slaughter/);
        const again = step(filed);
        expect((again.judiciary.proceedings ?? []).filter((entry) => entry.subject.kind === "commission-removal")).toHaveLength(1);
        const exposure = selectLegalExposures(again, executiveOrder).find((entry) => entry.origin.kind === "removal");
        expect(exposure.status).toBe("filed");
        expect(exposure.representations).toContain(proceedings[0].id);
    });
    it("opens nothing before the member decides, for a member who declines, or for an at-will commission", () => {
        const state = removedFrom(SEC, "removal-wait");
        const removal = state.institutions[SEC].contestedRemovals[0];
        expect(removalMatterEffects({ ...state, turn: removalSuit(state, SEC, removal).decidesTurn - 1 })).toEqual([]);
        const declined = Array.from({ length: 60 }, (_, i) => removedFrom(SEC, `removal-declines-${i}`))
            .find((s) => !removalSuit(s, SEC, s.institutions[SEC].contestedRemovals[0]).sues);
        expect(declined).toBeDefined();
        expect(removalMatterEffects({ ...declined, turn: declined.turn + 10 })).toEqual([]);
        const ftc = removedFrom("INST-FTC", "removal-ftc");
        expect(removalMatterEffects({ ...ftc, turn: ftc.turn + 10 })).toEqual([]);
    });
    it("runs on the shared court clocks: interim relief in weeks, merits months after filing", () => {
        let state = suing();
        const id = proceedingOf(state).id;
        const filedTurn = proceedingOf(state).filedTurn;
        state = step(state);
        expect(proceedingOf(state).stage).toBe("interim");
        expect(proceedingOf(state).nextTurn).toBe(Math.max(state.turn, filedTurn + courtWeeks(state.seed, id, "interim")));
        state = step(state);
        expect(proceedingOf(state).interim).toBe("denied");
        expect(proceedingOf(state).nextTurn).toBe(filedTurn + courtWeeks(state.seed, id, "lowerMerits"));
        expect(proceedingOf(state).nextTurn - filedTurn).toBeGreaterThanOrEqual(Math.ceil(60 / 7));
    });
    it("finishes as one case and prices the merits in the administration's favor across seeds", () => {
        const outcomes = Array.from({ length: 30 }, (_, i) => {
            let state = { ...suing(), seed: makeCampaignSeed(`removal-merits-${i}`) };
            for (let n = 0; n < 12 && !state.judiciary.cases.some((entry) => entry.subject?.kind === "commission-removal"); n += 1)
                state = step(state);
            return state.judiciary.cases.filter((entry) => entry.subject?.kind === "commission-removal");
        });
        expect(outcomes.every((cases) => cases.length === 1)).toBe(true);
        const reinstated = outcomes.filter((cases) => cases[0].holding === "struck-down").length / outcomes.length;
        expect(reinstated).toBeLessThan(0.5);
    });
});
describe("the remedy", () => {
    const removed = () => {
        const state = removedFrom(SEC, "removal-remedy");
        const removal = state.institutions[SEC].contestedRemovals[0];
        return { state, subject: { kind: "commission-removal", institution: SEC, person: removal.person, removalTurn: removal.turn } };
    };
    it("reinstates a living member to a seat nobody has been confirmed to", () => {
        const { state, subject } = removed();
        const remedy = removalRemedy(state, subject);
        const after = remedy.effects.reduce((s, effect) => apply(s, { source: "simulate", actor: "world", turn: s.turn, narration: { summary: "r" }, effects: [effect] }), state);
        expect(after.institutions[SEC].leader).toBe(subject.person);
        expect(after.institutions[SEC].vacancy).toBe(false);
        expect(after.people[subject.person].currentRole).toBeDefined();
        expect(remedy.words).toMatch(/reinstated.*back pay/);
    });
    it("awards back pay only when the seat has been filled", () => {
        const { state, subject } = removed();
        const other = Object.values(state.people).find((p) => p.alive && p.base.id !== subject.person).base.id;
        const filled = { ...state, institutions: { ...state.institutions, [SEC]: { ...state.institutions[SEC], leader: other, vacancy: false } } };
        const remedy = removalRemedy(filled, subject);
        expect(remedy.effects).toEqual([]);
        expect(remedy.words).toMatch(/back pay/);
    });
    it("applies the remedy when the final judgment goes for the member, and none when it goes for the President", () => {
        const base = suing();
        const open = proceedingOf(base);
        const staged = (holding, seed) => ({ ...base, seed: makeCampaignSeed(seed),
            judiciary: { ...base.judiciary, proceedings: [{ ...open, stage: "appeal", nextTurn: base.turn,
                        circuit: { court: "D.C.", ruledTurn: base.turn - 1, holding, votes: [] } }] } });
        const finalWith = (holding) => Array.from({ length: 60 }, (_, i) => staged(holding, `removal-final-${holding}-${i}`))
            .map((s) => phase(s).reduce(apply, s)).find((s) => s.judiciary.cases.some((entry) => entry.id === open.id));
        const won = finalWith("struck-down");
        expect(won.institutions[SEC].leader).toBe(open.subject.kind === "commission-removal" ? open.subject.person : undefined);
        expect(won.judiciary.cases.find((entry) => entry.id === open.id).opinion.majority).toMatch(/reinstated/);
        const lost = finalWith("upheld");
        expect(lost.institutions[SEC].leader).toBeUndefined();
        expect(lost.judiciary.cases.find((entry) => entry.id === removalProceedingId(SEC, base.institutions[SEC].contestedRemovals[0])).holding).toBe("upheld");
    });
});
describe("the Supreme Court reads its bench", () => {
    it("votes on Slaughter's terms: the bench as a whole near the priced chance, spread by each justice's position", () => {
        const draws = Array.from({ length: 200 }, (_, i) => (i + 0.5) / 200);
        const shares = draws.map((draw) => {
            const votes = justiceReinstatementVotes(FOUNDED, draw);
            return votes.filter((vote) => vote.vote === "strike").length / votes.length;
        });
        const mean = shares.reduce((a, b) => a + b, 0) / shares.length;
        expect(mean).toBeGreaterThan(REMOVAL_REINSTATEMENT_CHANCE * 0.7);
        expect(mean).toBeLessThan(REMOVAL_REINSTATEMENT_CHANCE * 1.3);
        expect(new Set(shares).size).toBeGreaterThan(2);
    });
});
