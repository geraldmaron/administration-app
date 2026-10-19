import { describe, expect, it } from "vitest";
import { composeAttentionStop } from "@admin/engine";
import { ATTENTION_SOURCES, applyAttentionPolicy, defaultAttentionSetting, LAST_CALL_DAYS, logEligible } from "./attention-policy";
const founding = { year: 2029, month: 1, day: 20 }; // a Saturday
const today = { year: 2029, month: 6, day: 1 };
function matter(over) {
    return {
        source: "agency-request",
        urgency: "soft",
        title: over.id,
        reason: "because",
        subject: over.id,
        date: today,
        ...over,
    };
}
describe("applyAttentionPolicy: what it never touches", () => {
    it("never mutes a hard matter, whatever the setting", () => {
        const hard = matter({ id: "bill", urgency: "hard", source: "bill-signature" });
        const settings = { "bill-signature": "log" };
        expect(applyAttentionPolicy([hard], settings, today, founding)).toEqual([hard]);
    });
    it("never mutes an ambient matter", () => {
        const ambient = matter({ id: "press", urgency: "ambient", source: "market-threshold" });
        const settings = { "market-threshold": "log" };
        expect(applyAttentionPolicy([ambient], settings, today, founding)).toEqual([ambient]);
    });
    it("keeps a scenario matter no matter what a stored setting says", () => {
        const decision = matter({ id: "d", source: "scenario" });
        const settings = { scenario: "log" };
        expect(applyAttentionPolicy([decision], settings, today, founding)).toEqual([decision]);
    });
});
describe("applyAttentionPolicy: pause, wait, log", () => {
    it("pause changes nothing", () => {
        const m = matter({ id: "vacant", source: "agency-request" });
        expect(applyAttentionPolicy([m], { "agency-request": "pause" }, today, founding)).toEqual([m]);
    });
    it("log removes the matter from the running entirely", () => {
        const m = matter({ id: "vacant", source: "agency-request" });
        expect(applyAttentionPolicy([m], { "agency-request": "log" }, today, founding)).toEqual([]);
    });
    it("wait with no deadline never competes (the same answer log gives it)", () => {
        const m = matter({ id: "vacant", source: "agency-request" });
        expect(applyAttentionPolicy([m], { "agency-request": "wait" }, today, founding)).toEqual([]);
    });
    it("wait holds a dated matter back until its own last call", () => {
        const farOut = matter({ id: "far", source: "governor-request", dueDate: { year: 2029, month: 6, day: 10 } });
        expect(applyAttentionPolicy([farOut], { "governor-request": "wait" }, today, founding)).toEqual([]);
    });
    it("a wait-kind deadline stops Continue once, at its last call", () => {
        const dueDate = { year: 2029, month: 6, day: 1 + LAST_CALL_DAYS };
        const atLastCall = matter({ id: "close", source: "governor-request", dueDate });
        expect(applyAttentionPolicy([atLastCall], { "governor-request": "wait" }, today, founding)).toEqual([atLastCall]);
        const oneDayEarlier = matter({ id: "not-yet", source: "governor-request", dueDate: { ...dueDate, day: dueDate.day + 1 } });
        expect(applyAttentionPolicy([oneDayEarlier], { "governor-request": "wait" }, today, founding)).toEqual([]);
    });
    it("wait presents an overdue matter, but only on the founding weekday's cadence", () => {
        const overdue = matter({ id: "overdue", source: "governor-request", dueDate: { year: 2029, month: 5, day: 20 } });
        const onASaturday = { year: 2029, month: 6, day: 2 }; // June 2 2029 is a Saturday
        const notASaturday = { year: 2029, month: 6, day: 3 };
        expect(applyAttentionPolicy([overdue], { "governor-request": "wait" }, onASaturday, founding)).toEqual([overdue]);
        expect(applyAttentionPolicy([overdue], { "governor-request": "wait" }, notASaturday, founding)).toEqual([]);
    });
});
describe("the source table", () => {
    it("lists every source the settings screen can show a row for, deduplicated", () => {
        expect(new Set(ATTENTION_SOURCES).size).toBe(ATTENTION_SOURCES.length);
    });
    it("defaults hard-leaning kinds to pause and the rest to wait", () => {
        expect(defaultAttentionSetting("disaster")).toBe("pause");
        expect(defaultAttentionSetting("military-escalation")).toBe("pause");
        expect(defaultAttentionSetting("intelligence-warning")).toBe("pause");
        expect(defaultAttentionSetting("court-ruling")).toBe("wait");
        expect(defaultAttentionSetting("pledge")).toBe("wait");
    });
    it("offers log only for kinds with no deadline and no silence price", () => {
        expect(logEligible("market-threshold")).toBe(true);
        expect(logEligible("governor-request")).toBe(false);
        expect(logEligible("scenario")).toBe(false);
        expect(logEligible("bill-signature")).toBe(false);
    });
});
describe("determinism under two preference sets", () => {
    it("filters candidates without ever mutating a matter's own fields", () => {
        const m = matter({ id: "vacant", source: "agency-request" });
        const before = JSON.stringify(m);
        applyAttentionPolicy([m], { "agency-request": "log" }, today, founding);
        expect(JSON.stringify(m)).toBe(before);
    });
});
describe("the policy runs before composition, never after", () => {
    it("three wait-kind deadline matters plus one pause-kind matter stop on the pause-kind one", () => {
        const waitOnes = [0, 1, 2].map((i) => matter({ id: `w${i}`, source: "governor-request", dueDate: { year: 2029, month: 8, day: 1 } }));
        const pauseOne = matter({ id: "p", source: "disaster" });
        const stop = composeAttentionStop(applyAttentionPolicy([...waitOnes, pauseOne], undefined, today, founding));
        expect(stop.presented.map((m) => m.id)).toEqual(["p"]);
    });
    it("a pause-kind matter colliding with a wait-kind one from the same actor still stops", () => {
        // If the policy ran on `stop.presented` instead of on candidates, the
        // engine's own collision rule (one matter per actor) could have already
        // chosen the wait-kind matter for the slot before the policy ever saw it,
        // leaving nothing presented once the wait-kind one was filtered out.
        // Filtering the candidates first means the pause-kind matter never has to
        // win a collision against a rival that was never really in the running.
        const waitOne = matter({ id: "w", source: "governor-request", actor: "CHN" });
        const pauseOne = matter({ id: "p", source: "disaster", actor: "CHN" });
        const stop = composeAttentionStop(applyAttentionPolicy([waitOne, pauseOne], undefined, today, founding));
        expect(stop.presented.map((m) => m.id)).toEqual(["p"]);
    });
    it("would have shown nothing for the same case if filtered after composition instead", () => {
        // The proof that the ordering matters: composing first and filtering the
        // engine's own choice afterward loses the pause-kind matter to the
        // collision, which is exactly the defect the policy's placement avoids.
        const waitOne = matter({ id: "w", source: "governor-request", actor: "CHN" });
        const pauseOne = matter({ id: "p", source: "disaster", actor: "CHN" });
        const stopFirst = composeAttentionStop([waitOne, pauseOne]);
        const filteredAfter = applyAttentionPolicy(stopFirst.presented, undefined, today, founding);
        // The collision already picked the wait-kind matter for the one slot
        // "CHN" gets; filtering afterward drops it and nothing is left, though a
        // pause-kind matter was raised and should have stopped the world.
        expect(filteredAfter).toEqual([]);
    });
});
