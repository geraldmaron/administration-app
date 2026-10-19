import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { ACT_ADVOCATE, advocateTerms, lobbyAdvocate } from "./lobbying-advocate.js";
import { resolveDueLobbying } from "./lobbying-due.js";
import { issueLobbying, projectLobbying } from "./lobbying.js";
import { selectHillMember } from "./hill.js";
import { LEGISLATIVE_ACTS, legislativeAct } from "./legislative-acts.js";
import { projectPassage } from "./bill-stages.js";
import { axisLean } from "./person-disposition.js";
import { QUESTION_TERMS } from "./willingness.js";
// The Secretary who carries a bill to the Hill, weighed by the member being
// asked: a persuasive one makes a private ask easier, a weak one harder, a
// Secretary of the other party counts for less, and an empty chair counts a
// little against.
const founded = foundedForBalance("ws-d-advocate").campaign;
const DEFENSE = "role-defense-minister";
const SPEAKER = "post-house-speaker";
const DEFENSE_BILL = "act-defense-authorization";
function withBill(campaign, actId) {
    const act = legislativeAct(actId);
    const id = `bill:${act.id}:${campaign.turn}`;
    const bill = {
        id,
        act: act.id,
        title: act.title,
        sponsor: act.sponsor,
        introducedTurn: campaign.turn,
        status: "in-progress",
        passage: projectPassage(campaign, act),
        stage: "referral",
        setbacks: 0,
        momentum: 0,
        beats: [],
    };
    return { campaign: { ...campaign, bills: { ...campaign.bills, [id]: bill } }, billId: id };
}
function withSecretary(campaign, role, changes) {
    const id = campaign.player.cabinet[role];
    const runtime = campaign.people[id];
    return { ...campaign, people: { ...campaign.people, [id]: { ...runtime, base: { ...runtime.base, ...changes } } } };
}
/** The Speaker leans neither way, so a move in the chance is never lost to its clamp. */
function workable(campaign) {
    return {
        ...campaign,
        congress: { ...campaign.congress, leadership: campaign.congress.leadership.map((figure) => (figure.post === SPEAKER ? { ...figure, disposition: 0.5 } : figure)) },
    };
}
const staged = withBill(workable(founded), DEFENSE_BILL);
const speaker = selectHillMember(staged.campaign, SPEAKER);
describe("who carries a bill", () => {
    it("names a cabinet chair for every committee a bill in the catalogue is referred to", () => {
        const seats = new Set(CHARTER_USA_CONSTITUTION.cabinetRoles);
        for (const act of LEGISLATIVE_ACTS) {
            if (act.committee === undefined)
                continue;
            expect(ACT_ADVOCATE[act.committee]).toBeDefined();
        }
        for (const role of Object.values(ACT_ADVOCATE))
            expect(seats.has(role)).toBe(true);
    });
    it("is the Secretary of Defense on the defense authorization, weighed by their craft", () => {
        const advocate = lobbyAdvocate(staged.campaign, speaker, "call", staged.billId);
        const secretary = staged.campaign.people[staged.campaign.player.cabinet[DEFENSE]].base;
        expect(advocate.role).toBe(DEFENSE);
        expect(advocate.person?.id).toBe(secretary.id);
        const factor = advocate.sameParty ? 1 : 0.6;
        expect(advocate.value).toBeCloseTo(0.12 * axisLean(secretary, "craft") * factor, 4);
    });
    it("is nobody on a public appeal, or where no bill is on the floor", () => {
        expect(lobbyAdvocate(staged.campaign, speaker, "public", staged.billId)).toBeUndefined();
        expect(advocateTerms(staged.campaign, speaker, "call", undefined)).toEqual([]);
    });
});
describe("what the advocate does to the ask", () => {
    const strong = withSecretary(staged.campaign, DEFENSE, { charisma: 0.95, competence: 0.95, integrity: 0.9, traits: ["charismatic"] });
    const weak = withSecretary(staged.campaign, DEFENSE, { charisma: 0.2, competence: 0.3, integrity: 0.4, traits: ["reclusive"] });
    const chance = (campaign) => projectLobbying(campaign, SPEAKER, "call").successChance;
    const value = (campaign) => lobbyAdvocate(campaign, selectHillMember(campaign, SPEAKER), "call", staged.billId).value;
    it("raises the chance for a persuasive Secretary and lowers it for a weak one, point for point with the term", () => {
        expect(value(strong)).toBeGreaterThan(0);
        expect(value(weak)).toBeLessThan(0);
        expect(chance(strong)).toBeGreaterThan(chance(weak));
        expect(chance(strong) - chance(weak)).toBeCloseTo(value(strong) - value(weak), 2);
    });
    it("counts for less from across the aisle", () => {
        const party = speaker.person.party;
        const other = party === "party-usa-democrat" ? "party-usa-republican" : "party-usa-democrat";
        const own = withSecretary(strong, DEFENSE, { party });
        const across = withSecretary(strong, DEFENSE, { party: other });
        expect(value(across)).toBeCloseTo(value(own) * 0.6, 4);
    });
    it("counts a little against with nobody in the chair", () => {
        const { [DEFENSE]: _gone, ...rest } = staged.campaign.player.cabinet;
        const empty = { ...staged.campaign, actings: {}, player: { ...staged.campaign.player, cabinet: rest } };
        const advocate = lobbyAdvocate(empty, speaker, "call", staged.billId);
        expect(advocate.person).toBeUndefined();
        expect(advocate.value).toBe(-0.02);
    });
    it("is on the record of the member's answer, with every key one the question may weigh", () => {
        const issued = issueLobbying(strong, SPEAKER, "call");
        if (!issued.ok)
            throw new Error(issued.reason);
        const pending = { ...strong, issuedActs: { ...(strong.issuedActs ?? {}), [issued.act.id]: issued.act } };
        const resolved = resolveDueLobbying({ ...pending, calendar: issued.act.dueDate });
        const decision = resolved.packets[0].provenance.decision;
        expect(decision.terms.map((term) => term.key)).toContain("advocate");
        for (const term of decision.terms)
            expect(QUESTION_TERMS["lobbied-member"]).toContain(term.key);
    });
});
