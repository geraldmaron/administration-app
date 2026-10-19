import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { selectCabinetExposure, selectFormerService } from "./cabinet.js";
import { awaitsSuccessor, departingFlag, isDeparting } from "./cabinet-departing.js";
import { revoltPacket } from "./cabinet-revolt.js";
import { selectDepartureTransitions, TRANSITION_WEEKS, transitionPackets } from "./cabinet-transition.js";
import { countedPhases } from "./cast-breaks.js";
import { apply } from "./effects.js";
import { advanceTurn } from "./turn-loop.js";
import { institutionForRole, seatOfficer } from "./institutions.js";
import { openNomination, selectNominableFor } from "./nomination.js";
import { createRngStreams } from "./rng.js";
const ENERGY = "role-energy-secretary";
const founded = foundedForBalance("cabinet-transition").campaign;
const department = institutionForRole(ENERGY);
const office = department.offices[0].id;
const secretary = founded.player.cabinet[ENERGY];
/** The Energy Secretary announces an ordinary departure in the week after `turn`. */
function announced(turn = founded.turn) {
    const at = { ...founded, turn };
    const person = at.people[secretary].base;
    return apply(at, revoltPacket(at, "ordinary", turn + 1, ENERGY, person, createRngStreams(at.seed).stream("t", 1)));
}
/** The transition's endings as they would be written `weeks` after the week the announcement was stamped. */
function weeksOn(campaign, weeks) {
    const turn = founded.turn + 1 + weeks;
    return transitionPackets({ ...campaign, turn: turn - 1 }, turn).reduce(apply, campaign);
}
function withSuccessorSentUp(campaign) {
    const nominee = selectNominableFor(campaign, office)[0].base.id;
    const sent = openNomination(campaign, office, nominee);
    if (!sent.ok)
        throw new Error(sent.reason);
    return apply(campaign, sent.packet);
}
describe("an announced departure", () => {
    it("keeps the Secretary in the chair, with no vacancy, and draws no more breaks against them", () => {
        const campaign = announced();
        expect(isDeparting(campaign, ENERGY, secretary)).toBe(true);
        expect(campaign.player.cabinet[ENERGY]).toBe(secretary);
        expect(campaign.institutions[department.id].vacancy).toBe(false);
        expect(selectCabinetExposure(campaign, ENERGY)).toBeUndefined();
        const [transition] = selectDepartureTransitions(campaign);
        expect(transition).toMatchObject({ role: ENERGY, person: secretary, leavesTurn: founded.turn + 1 + TRANSITION_WEEKS, successorPending: false });
    });
    it("opens the chair to a successor's nomination while the Secretary serves, and only then", () => {
        const nominee = selectNominableFor(founded, office)[0].base.id;
        expect(openNomination(founded, office, nominee).ok).toBe(false);
        expect(awaitsSuccessor(announced(), ENERGY)).toBe(true);
        expect(openNomination(announced(), office, nominee).ok).toBe(true);
    });
    it("leaves after the transition with nobody sent up, through vacates, the deputy acting", () => {
        const campaign = announced();
        expect(weeksOn(campaign, TRANSITION_WEEKS - 1).player.cabinet[ENERGY]).toBe(secretary);
        const gone = weeksOn(campaign, TRANSITION_WEEKS);
        expect(gone.player.cabinet[ENERGY]).toBeUndefined();
        expect(gone.institutions[department.id].actingLeader).toBeDefined();
        expect(isDeparting(gone, ENERGY, secretary)).toBe(false);
        expect(selectFormerService(gone, secretary)).toEqual({ person: secretary, role: ENERGY, departure: "resigned" });
    });
    it("serves on past the transition while a successor is before the Senate", () => {
        const pending = withSuccessorSentUp(announced());
        expect(selectDepartureTransitions(pending)[0].successorPending).toBe(true);
        const later = weeksOn(pending, TRANSITION_WEEKS * 3);
        expect(later.player.cabinet[ENERGY]).toBe(secretary);
        expect(later.institutions[department.id].vacancy).toBe(false);
    });
    // The balance harness counts a departure the week it is announced; the week
    // it ends is the same departure. Every other chair is emptied so the only
    // packet the sweep can write that week is the transition's ending.
    it("is not counted a second time by the harness the week the transition ends", () => {
        const { charter } = foundedForBalance("cabinet-transition");
        const lead = founded.founding.leadRole;
        const alone = announced();
        const only = {
            ...alone,
            turn: founded.turn + TRANSITION_WEEKS,
            player: { ...alone.player, cabinet: { [lead]: alone.player.cabinet[lead], [ENERGY]: secretary } },
        };
        const tally = { leak: 0, challenge: 0, resignation: 0 };
        const after = advanceTurn(only, countedPhases(charter, tally));
        expect(after.player.cabinet[ENERGY]).toBeUndefined();
        expect(tally).toEqual({ leak: 0, challenge: 0, resignation: 0 });
    });
    it("hands the department to the confirmed successor and records the Secretary as having resigned", () => {
        const pending = withSuccessorSentUp(announced());
        const successor = Object.values(pending.nominations)[0].nominee;
        const confirmed = seatOfficer(pending, department.id, successor);
        expect(confirmed.player.cabinet[ENERGY]).toBe(successor);
        const handed = weeksOn(confirmed, 1);
        expect(handed.player.flags[departingFlag(ENERGY, secretary)]).toBe(false);
        expect(selectFormerService(handed, secretary)).toEqual({ person: secretary, role: ENERGY, departure: "resigned" });
        expect(handed.institutions[department.id].actingLeader).toBeUndefined();
        expect(selectDepartureTransitions(handed)).toEqual([]);
    });
});
