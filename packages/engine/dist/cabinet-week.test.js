import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { cabinetAgendaPackets, initiativeFlag, requestLapsedFlag, triageBar } from "./cabinet-week.js";
import { ROLE_STATE } from "./cabinet-initiative.js";
import { apply } from "./effects.js";
import { QUESTION_TERMS } from "./willingness.js";
// The cabinet's week with a Secretary's own act in it: it competes for the one
// Desk slot a department's request does, read by the same Chief of Staff, and a
// Secretary who brought one does not bring another for half a year.
const founded = foundedForBalance("ws-d-week").campaign;
function withPerson(campaign, role, changes) {
    const id = campaign.player.cabinet[role];
    const runtime = campaign.people[id];
    return { ...campaign, people: { ...campaign.people, [id]: { ...runtime, base: { ...runtime.base, ...changes } } } };
}
function withQuality(campaign, institution, implementationQuality) {
    const runtime = campaign.institutions[institution];
    return { ...campaign, institutions: { ...campaign.institutions, [institution]: { ...runtime, implementationQuality } } };
}
/** Every department delivering, so the only thing that can reach the Desk is a Secretary's own act. */
const quiet = Object.keys(founded.institutions).reduce((campaign, id) => withQuality(campaign, id, Math.max(0.75, campaign.institutions[id].implementationQuality)), founded);
/** A Secretary of State eager to bring something, so the week reliably has an initiative in it. */
const eager = withPerson(quiet, ROLE_STATE, { loyalty: 0.95, ambition: 0.9 });
const isInitiative = (packet) => packet.provenance?.decision?.question === "minister-initiative";
function weekLater(campaign, weeks) {
    return { ...campaign, turn: campaign.turn + weeks };
}
describe("a Secretary's own act on the cabinet's agenda", () => {
    it("is stamped, stored with the act it would take, and says who, what, why and what taking it does", () => {
        const packets = cabinetAgendaPackets(eager);
        const brought = packets.filter(isInitiative);
        expect(brought).toHaveLength(1);
        const stamp = brought[0].provenance.decision;
        expect(stamp.visibility).toBe("public");
        expect(stamp.acts).toBe(true);
        for (const term of stamp.terms)
            expect(QUESTION_TERMS["minister-initiative"]).toContain(term.key);
        const after = packets.reduce(apply, eager);
        const proposal = after.cabinetAgenda.proposals[0];
        expect(proposal.act?.kind).toBe("engagement");
        expect(proposal.role).toBe(ROLE_STATE);
        expect(proposal.summary).toMatch(/^The Secretary of State, .+, proposes .+\. .+\. Taking it .+/);
        expect(after.cabinetAgenda.lastProposalTurn).toBe(eager.turn);
    });
    it("is the same week to week on the same state and on a clone", () => {
        expect(cabinetAgendaPackets(eager)).toEqual(cabinetAgendaPackets(structuredClone(eager)));
    });
    it("does not come back from the same Secretary for half a year, and its lapse does not silence their department", () => {
        const first = cabinetAgendaPackets(eager).reduce(apply, eager);
        const person = first.cabinetAgenda.proposals[0].person;
        expect(first.player.flags[initiativeFlag(person)]).toBe(true);
        const lapsed = cabinetAgendaPackets(weekLater(first, 1)).reduce(apply, weekLater(first, 1));
        expect(lapsed.cabinetAgenda.proposals.some((proposal) => proposal.act !== undefined && proposal.person === person)).toBe(false);
        expect(lapsed.player.flags[requestLapsedFlag(ROLE_STATE)]).toBeUndefined();
        const soon = weekLater(lapsed, 10);
        expect(cabinetAgendaPackets(soon).filter(isInitiative).some((packet) => packet.provenance?.decision?.actor === person)).toBe(false);
        const later = weekLater(lapsed, 30);
        expect(cabinetAgendaPackets(later).filter(isInitiative).some((packet) => packet.provenance?.decision?.actor === person)).toBe(true);
    });
    it("gives way to a department that cannot do its work, which the Chief of Staff reads first", () => {
        const failing = withQuality(eager, "INST-TREASURY", 0.3);
        const packets = cabinetAgendaPackets(failing);
        expect(packets.some(isInitiative)).toBe(false);
        expect(packets.find((packet) => packet.provenance?.decision?.question === "minister-proposal")?.provenance?.decision?.subject).toBe("role-treasury-minister");
    });
    it("never reaches the Desk under a chief whose bar it cannot clear", () => {
        const chief = founded.institutions["INST-PRESIDENCY"].leader;
        const runtime = eager.people[chief];
        const sharp = { ...eager, people: { ...eager.people, [chief]: { ...runtime, base: { ...runtime.base, competence: 1, loyalty: 1, integrity: 1 } } } };
        expect(triageBar(sharp)).toBeGreaterThan(0.5);
        expect(cabinetAgendaPackets(sharp).some(isInitiative)).toBe(false);
    });
});
