import { describe, expect, it, vi } from "vitest";
// A pass-through spy, so a test can prove a projection never reaches the one draw.
vi.mock("./willingness.js", async (original) => {
    const actual = await original();
    return { ...actual, willDraw: vi.fn(actual.willDraw) };
});
import { QUESTION_TERMS, willDraw } from "./willingness.js";
import { foundedForBalance } from "./balance-harness.js";
import { decideInitiative, initiativeFor, initiativeStamp, initiativeSummary, initiativeTerms, attorneyGeneralObjects, ordersByChair, overreachCeiling, projectInitiative, receiveChance, ROLE_DEFENSE, ROLE_STATE, } from "./cabinet-initiative.js";
import { axisLean } from "./person-disposition.js";
import { orderFit } from "./execution.js";
import { EXECUTIVE_ORDERS } from "./orders.js";
import { projectReceive } from "./engagement.js";
import { commandEngagement } from "./combatant-commands.js";
const founded = foundedForBalance("ws-d-initiative").campaign;
const NEUTRAL = { economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 };
function holder(campaign, role) {
    return campaign.people[campaign.player.cabinet[role]].base;
}
function withPerson(campaign, role, changes) {
    const id = campaign.player.cabinet[role];
    const runtime = campaign.people[id];
    return { ...campaign, people: { ...campaign.people, [id]: { ...runtime, base: { ...runtime.base, ...changes } } } };
}
function withPosture(campaign, command, posture) {
    const commands = campaign.security.unifiedCommand.commands;
    const runtime = commands[command];
    return {
        ...campaign,
        security: { ...campaign.security, unifiedCommand: { ...campaign.security.unifiedCommand, commands: { ...commands, [command]: { ...runtime, posture } } } },
    };
}
function candidateOf(campaign, role) {
    return initiativeFor(campaign, role, holder(campaign, role), ordersByChair(campaign));
}
describe("a Secretary of Defense's own act", () => {
    it("is a hawk's ask to raise the most tense theater one notch, and fits better the more of a hawk", () => {
        const hawk = withPerson(founded, ROLE_DEFENSE, { traits: ["hawkish"], ideology: NEUTRAL });
        const candidate = candidateOf(hawk, ROLE_DEFENSE);
        expect(candidate.act).toMatchObject({ kind: "posture", posture: "heightened" });
        const fiercer = withPerson(founded, ROLE_DEFENSE, { traits: ["hawkish"], ideology: { ...NEUTRAL, authLibertarian: 0.6 } });
        const fiercest = candidateOf(fiercer, ROLE_DEFENSE);
        expect(axisLean(holder(fiercer, ROLE_DEFENSE), "forceAppetite")).toBeGreaterThan(axisLean(holder(hawk, ROLE_DEFENSE), "forceAppetite"));
        expect(fiercest.act.kind).toBe("posture");
        expect(fiercest.fit).toBeGreaterThanOrEqual(candidate.fit);
    });
    it("is a dove's ask to stand down a theater the President raised where nobody is fighting, and nothing while every theater stands at routine", () => {
        const dove = withPerson(founded, ROLE_DEFENSE, { traits: ["dovish"], ideology: NEUTRAL });
        const quiet = candidateOf(dove, ROLE_DEFENSE);
        expect(quiet?.act.kind).not.toBe("posture");
        const raised = withPosture(dove, "CCMD-EUCOM", "heightened");
        expect(commandEngagement(raised, "CCMD-EUCOM")).toBeUndefined();
        const candidate = candidateOf(raised, ROLE_DEFENSE);
        expect(candidate.act).toEqual({ kind: "posture", command: "CCMD-EUCOM", posture: "routine" });
    });
    it("brings no posture argument from a Secretary at the cabinet's own middle on force", () => {
        const middling = withPerson(founded, ROLE_DEFENSE, { traits: [], ideology: NEUTRAL });
        expect(axisLean(holder(middling, ROLE_DEFENSE), "forceAppetite")).toBe(0);
        expect(candidateOf(middling, ROLE_DEFENSE)?.act.kind).not.toBe("posture");
    });
});
describe("a Secretary of State's own act", () => {
    it("is a summit or visit the other government is not expected to refuse", () => {
        const candidate = candidateOf(founded, ROLE_STATE);
        expect(candidate.act.kind).toBe("engagement");
        if (candidate.act.kind !== "engagement")
            throw new Error("expected an engagement");
        expect(["summit", "visit"]).toContain(candidate.act.engagement);
        const projection = projectReceive(founded, { actor: founded.founding.nation, target: candidate.act.target, kind: candidate.act.engagement });
        expect(projection.forecast).not.toBe("unlikely");
        expect(receiveChance(projection)).toBeGreaterThan(0);
    });
    it("leans toward a summit the less a Secretary trusts force", () => {
        const hawk = candidateOf(withPerson(founded, ROLE_STATE, { traits: ["hawkish"], ideology: NEUTRAL }), ROLE_STATE);
        const dove = candidateOf(withPerson(founded, ROLE_STATE, { traits: ["dovish"], ideology: NEUTRAL }), ROLE_STATE);
        const kind = (candidate) => (candidate.act.kind === "engagement" ? candidate.act.engagement : undefined);
        expect(kind(dove)).toBe("summit");
        expect(kind(hawk)).toBe("visit");
    });
});
describe("an order a chair brings", () => {
    it("is one their department carries, fits their politics, and reaches no further than they would", () => {
        const owned = ordersByChair(founded);
        expect(owned.size).toBeGreaterThan(0);
        let brought = 0;
        for (const [role, orders] of owned) {
            const seated = founded.player.cabinet[role];
            if (!seated)
                continue;
            const person = founded.people[seated].base;
            const candidate = initiativeFor(founded, role, person, owned);
            if (candidate?.act.kind !== "order")
                continue;
            brought += 1;
            const order = orders.find((entry) => entry.id === candidate.act.order);
            expect(order.overreach).toBeLessThanOrEqual(overreachCeiling(person));
            expect(orderFit(person, order)).toBeGreaterThanOrEqual(0.6);
        }
        expect(brought).toBeGreaterThan(0);
    });
    it("tells the President the Attorney General will object, where the order's own review says so", () => {
        const [role] = [...ordersByChair(founded).entries()].find(([seat]) => founded.player.cabinet[seat] !== undefined);
        const proposing = (id) => ({ role, person: holder(founded, role), act: { kind: "order", order: id }, fit: 0.9, key: `order:${id}`, motive: "believes in it" });
        const objected = EXECUTIVE_ORDERS.find((order) => attorneyGeneralObjects(founded, order));
        const cleared = EXECUTIVE_ORDERS.find((order) => !attorneyGeneralObjects(founded, order));
        expect(objected).toBeDefined();
        expect(initiativeSummary(founded, proposing(objected.id))).toContain("The Attorney General will object in writing");
        expect(initiativeSummary(founded, proposing(cleared.id))).not.toContain("Attorney General");
    });
    it("reaches further the bolder the Secretary, and less far the more principled", () => {
        const base = holder(founded, "role-treasury-minister");
        const meek = { ...base, ambition: 0.2, traits: ["cautious"] };
        const bold = { ...base, ambition: 0.9, traits: ["ambitious"] };
        expect(overreachCeiling(bold)).toBeGreaterThan(overreachCeiling(meek));
        const lax = { ...base, integrity: 0.4, traits: [] };
        const strict = { ...base, integrity: 0.95, traits: ["principled"] };
        expect(overreachCeiling(strict)).toBeLessThan(overreachCeiling(lax));
    });
});
describe("the decision to bring it", () => {
    const candidate = candidateOf(founded, ROLE_STATE);
    const eager = { ...candidate, person: { ...candidate.person, loyalty: 0.95, ambition: 0.9 } };
    const reluctant = { ...candidate, person: { ...candidate.person, loyalty: 0.2, ambition: 0.1 } };
    it("goes both ways: a loyal, ambitious Secretary brings it and a disaffected one does not", () => {
        expect(decideInitiative(founded, eager).acts).toBe(true);
        expect(decideInitiative(founded, reluctant).acts).toBe(false);
    });
    it("weighs a better fit and a more loyal Secretary toward bringing it", () => {
        const score = (c) => projectInitiative(founded, c).score;
        expect(score({ ...candidate, fit: 0.9 })).toBeGreaterThan(score({ ...candidate, fit: 0.6 }));
        expect(score(eager)).toBeGreaterThan(score(candidate));
        expect(score(reluctant)).toBeLessThan(score(candidate));
    });
    it("is the same twice and on a clone, and the projection draws nothing", () => {
        expect(decideInitiative(founded, eager)).toEqual(decideInitiative(structuredClone(founded), eager));
        vi.mocked(willDraw).mockClear();
        projectInitiative(founded, eager);
        initiativeTerms(founded, eager);
        initiativeSummary(founded, eager);
        expect(vi.mocked(willDraw)).not.toHaveBeenCalled();
        decideInitiative(founded, eager);
        expect(vi.mocked(willDraw)).toHaveBeenCalledTimes(1);
    });
    it("stamps a public decision whose every key is one the question may weigh", () => {
        const decision = decideInitiative(founded, eager);
        const stamp = initiativeStamp(decision, eager.person.id, eager.role);
        expect(stamp).toMatchObject({ question: "minister-initiative", actor: eager.person.id, subject: ROLE_STATE, visibility: "public", acts: true });
        for (const term of stamp.terms)
            expect(QUESTION_TERMS["minister-initiative"]).toContain(term.key);
    });
    it("reads in plain words: who proposes what, why, and what taking it does", () => {
        const summary = initiativeSummary(founded, eager);
        expect(summary).toContain(`The Secretary of State, ${eager.person.name}, proposes`);
        expect(summary).toContain(eager.motive);
        expect(summary).toContain("Taking it");
    });
});
