import { describe, expect, it, vi } from "vitest";
import { CHARTER_USA_CONSTITUTION } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { actionTiming, instrumentFit } from "./action-timing.js";
import { issueDirective } from "./directives.js";
import { apply } from "./effects.js";
import { carryOutInstrument, carryOutTerms, delayShareOf, delayedDays, delayedWeeks, SLOW_WALK_SHARE } from "./execution.js";
import { issueAction } from "./instrument-issued.js";
import { executiveOrder, projectOrder, RULEMAKING_TURNS, signOrder } from "./orders.js";
import { addDays } from "./clock.js";
import { createRngStreams } from "./rng.js";
import { QUESTION_TERMS, willDraw } from "./willingness.js";
// A pass-through spy, so a test can prove the pace is read without the one draw.
vi.mock("./willingness.js", async (original) => {
    const actual = await original();
    return { ...actual, willDraw: vi.fn(actual.willDraw) };
});
const TREASURY = "role-treasury-minister";
const DEFENSE = "role-defense-minister";
const HOMELAND = "role-homeland-secretary";
const founded = foundedForBalance("execution").campaign;
const US = founded.founding.nation;
const RIVAL = "RUS";
function withChair(campaign, role, base) {
    const id = campaign.player.cabinet[role];
    const runtime = campaign.people[id];
    return { ...campaign, people: { ...campaign.people, [id]: { ...runtime, base: { ...runtime.base, ...base } } } };
}
function withQuality(campaign, institution, implementationQuality) {
    const runtime = campaign.institutions[institution];
    return { ...campaign, institutions: { ...campaign.institutions, [institution]: { ...runtime, implementationQuality } } };
}
/** A week in which the President overruled this chair, so the record carries a grievance. */
function overruled(campaign, role, times) {
    const person = campaign.player.cabinet[role];
    const packet = {
        source: "action",
        actor: "player",
        turn: campaign.turn,
        narration: { summary: "The President goes ahead over the Secretary's objection." },
        effects: [],
        counsel: { role, person, stance: "against" },
    };
    return Array.from({ length: times }).reduce((state) => apply(state, packet), campaign);
}
const eager = (campaign, role) => withChair(campaign, role, { loyalty: 0.95, traits: ["loyal", "pragmatic"] });
const sullen = (campaign, role) => overruled(withChair(campaign, role, { loyalty: 0.15, traits: [] }), role, 5);
function expectStamp(stamp) {
    expect(stamp?.question).toBe("carry-out");
    expect(stamp?.visibility).toBe("public");
    for (const term of stamp.terms)
        expect(QUESTION_TERMS["carry-out"]).toContain(term.key);
}
describe("an operation the President orders", () => {
    const sanctions = { actor: US, target: RIVAL, instrument: "economic", rung: 4 };
    it("is prepared at pace by a deferent Secretary and dragged by one who has stopped being listened to", () => {
        const fast = actionTiming(eager(founded, TREASURY), sanctions);
        const slow = actionTiming(sullen(founded, TREASURY), sanctions);
        expect(fast.pace?.days).toBe(0);
        expect(slow.pace?.days).toBeGreaterThan(0);
        expect(slow.days).toBe(fast.days + slow.pace.days);
        expect(slow.label).toContain(`${slow.days} days`);
    });
    it("moves faster under a bold Secretary of Defense and slower under a cautious one", () => {
        const strike = { actor: US, target: RIVAL, instrument: "military", rung: 5 };
        const bold = actionTiming(withChair(founded, DEFENSE, { ambition: 0.95, loyalty: 0.9, traits: ["ambitious", "hawkish"] }), strike);
        const cautious = actionTiming(withChair(founded, DEFENSE, { ambition: 0.15, loyalty: 0.3, traits: ["cautious", "dovish"] }), strike);
        expect(bold.pace.days).toBeLessThan(0);
        expect(cautious.pace.days).toBeGreaterThan(0);
        expect(bold.pace.decision.terms.map((term) => term.key)).toContain("boldness");
    });
    it("is never priced by this cabinet when another government acts, nor when the act is issued at once", () => {
        expect(actionTiming(founded, { actor: RIVAL, target: US, instrument: "economic", rung: 4 }).pace).toBeUndefined();
        expect(actionTiming(founded, { actor: US, target: RIVAL, instrument: "diplomatic", rung: 1 }).pace).toBeUndefined();
    });
    it("is due on the day the projection quoted, with the chair's decision stamped on the order", () => {
        const campaign = sullen(founded, TREASURY);
        const timing = actionTiming(campaign, sanctions);
        const issued = issueAction(campaign, sanctions, createRngStreams(campaign.seed));
        if (!issued.ok)
            throw new Error(issued.missingCapability);
        expect(issued.projection.timing?.days).toBe(timing.days);
        const act = Object.values(apply(campaign, issued.packet).issuedActs ?? {}).find((entry) => entry.kind === "instrument");
        expect(act?.dueDate).toEqual(addDays(campaign.calendar, timing.days));
        expectStamp(issued.packet.provenance?.decision);
        expect(issued.packet.provenance?.decision?.acts).toBe(false);
    });
});
describe("a rule the President signs", () => {
    const border = executiveOrder("order-border-controls");
    it("is written on time by a deferent Secretary and weeks late by a sullen one, and only a rule can be", () => {
        const fast = projectOrder(eager(founded, HOMELAND), CHARTER_USA_CONSTITUTION, border).execution;
        const slow = projectOrder(sullen(founded, HOMELAND), CHARTER_USA_CONSTITUTION, border).execution;
        expect(fast.addedWeeks).toBe(0);
        expect(slow.addedWeeks).toBeGreaterThan(0);
        expect(slow.role).toBe(HOMELAND);
        expect(projectOrder(founded, CHARTER_USA_CONSTITUTION, executiveOrder("order-entry-suspension")).execution).toBeUndefined();
    });
    it("binds on the week the projection said, with the pace stamped on the signature", () => {
        const campaign = sullen(founded, HOMELAND);
        const projection = projectOrder(campaign, CHARTER_USA_CONSTITUTION, border);
        const result = signOrder(campaign, CHARTER_USA_CONSTITUTION, border.id, createRngStreams(campaign.seed));
        if (!result.ok)
            throw new Error(result.reason);
        const rule = apply(campaign, result.packet).pendingRules.at(-1);
        expect(rule.effectiveTurn).toBe(campaign.turn + RULEMAKING_TURNS + projection.execution.addedWeeks);
        expectStamp(result.packet.provenance?.decision);
    });
});
describe("a directive the President gives", () => {
    const posture = { institution: "INST-DHS", kind: "enforcement-posture", subject: "the southern border" };
    const capable = withQuality(founded, "INST-DHS", 0.8);
    it("is carried by a deferent Secretary and slow-walked by one who has stopped being listened to", () => {
        const carried = issueDirective(eager(capable, HOMELAND), posture);
        const walked = issueDirective(sullen(capable, HOMELAND), posture);
        if (!carried.ok || !walked.ok)
            throw new Error("expected both directives to be issued");
        const status = (packet) => packet.effects.flatMap((effect) => (effect.kind === "institution" ? (effect.directives ?? []) : []))[0]?.status;
        expect(status(carried.packet)).toBe("carried");
        expect(status(walked.packet)).toBe("slow-walked");
        expectStamp(walked.packet.provenance?.decision);
        expect(walked.packet.provenance?.decision?.terms.map((term) => term.key)).not.toContain("policy-fit");
    });
    it("is still refused by statute whoever holds the chair", () => {
        const barred = issueDirective(eager(capable, "role-attorney-general"), { institution: "INST-FBI", kind: "investigation", subject: "a rival" });
        if (!barred.ok)
            throw new Error(barred.reason);
        expect(barred.packet.provenance?.decision).toBeUndefined();
    });
});
describe("the pace is a projection", () => {
    const sanctions = { actor: US, target: RIVAL, instrument: "economic", rung: 4 };
    const fit = (person) => instrumentFit(person, "economic");
    it("gives the same answer twice and on a cloned campaign, and draws nothing", () => {
        const campaign = sullen(founded, TREASURY);
        vi.mocked(willDraw).mockClear();
        const once = carryOutInstrument(campaign, sanctions, 5, fit);
        expect(carryOutInstrument(campaign, sanctions, 5, fit)).toEqual(once);
        expect(carryOutInstrument(structuredClone(campaign), sanctions, 5, fit)).toEqual(once);
        expect(vi.mocked(willDraw)).not.toHaveBeenCalled();
    });
    it("moves one way along each axis it reads", () => {
        const person = founded.people[founded.player.cabinet[DEFENSE]].base;
        const score = (over) => carryOutTerms(founded, DEFENSE, { ...person, traits: [], ...over }, { fit: 0.5, military: true }).reduce((sum, term) => sum + term.value, 0);
        expect(score({ loyalty: 0.9 })).toBeGreaterThan(score({ loyalty: 0.5 }));
        expect(score({ ambition: 0.9 })).toBeGreaterThan(score({ ambition: 0.5 }));
    });
    it("grades the delay and bounds it", () => {
        const bold = [{ key: "boldness", source: "trait", value: 0.06 }];
        expect(delayShareOf({ margin: 0.5, terms: bold }, false)).toBe(0);
        expect(delayShareOf({ margin: 0.5, terms: bold }, true)).toBe(-0.2);
        expect(delayShareOf({ margin: 0.5, terms: [{ ...bold[0], value: 0.3 }] }, true)).toBe(-0.25);
        expect(delayShareOf({ margin: 0.5, terms: [] }, true)).toBe(0);
        expect(delayShareOf({ margin: -1, terms: bold }, false)).toBe(1);
        expect(delayShareOf({ margin: -0.15, terms: [] }, false)).toBe(SLOW_WALK_SHARE);
        const dragging = carryOutInstrument(sullen(founded, TREASURY), sanctions, 5, fit);
        expect(delayedDays(dragging, 1)).toBe(0);
        expect(delayedDays(dragging, 10)).toBeLessThanOrEqual(5);
        expect(delayedWeeks(dragging, RULEMAKING_TURNS)).toBeLessThanOrEqual(RULEMAKING_TURNS);
    });
    it("converts a drag and a speedup to whole days the same way", () => {
        const carry = carryOutInstrument(sullen(founded, TREASURY), sanctions, 5, fit);
        const at = (delayShare, baseDays) => delayedDays({ ...carry, delayShare }, baseDays);
        // A Secretary a seventh of the way to the most a bold one may take off
        // shifts a five-day operation by a third of a day: a whole day either way.
        expect(at(-0.1435, 5)).toBe(-1);
        expect(at(0.1435, 5)).toBe(1);
        expect(at(-0.25, 15)).toBe(-2);
        expect(at(0.25, 15)).toBe(2);
        // Half the operation is the most either way, and a one-day act has no room.
        expect(at(1, 10)).toBe(5);
        expect(at(-1, 10)).toBe(-5);
        expect(at(-0.25, 1)).toBe(0);
        expect(at(1, 1)).toBe(0);
        expect(at(0, 7)).toBe(0);
        for (let baseDays = 1; baseDays <= 30; baseDays++) {
            for (const share of [0.01, 0.05, 0.1, 0.1435, 0.2, 0.25, 0.5, 1]) {
                expect(at(-share, baseDays), `${share} on ${baseDays} days`).toBe(-at(share, baseDays) + 0);
            }
        }
    });
});
