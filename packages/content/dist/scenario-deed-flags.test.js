import { describe, expect, it } from "vitest";
import { deedFlag, deedFromFlag, deedReceivedFlag, deedTowardFlag } from "@admin/engine";
import { ScenarioCondition, ScenarioReply } from "./scenario.js";
import { ConsequenceDef } from "./consequence.js";
import { DEED_FLAGS, isBoundDeedFlag, ReadableFlag, WritableFlag } from "./scenario-deed-flags.js";
const counterparty = "XYZ";
// The bound forms (`deed-toward:`, `deed-from:`) always name the counterparty
// nation — engine-only by doctrine, because a scenario that names a country in
// its own gate stops being reusable across every nation it could otherwise be
// cast onto. These are regression trip wires against that boundary quietly
// eroding: built with the engine's own builders rather than a literal, so a
// change to the prefix moves the fixture with it instead of leaving the test
// checking a string the engine does not write.
const boundFlag = deedTowardFlag(counterparty, "economic", "high", "landed");
const anotherBoundFlag = deedFromFlag(counterparty, "economic", "high", "landed");
const unboundSentFlag = deedFlag("economic", "high", "landed");
const unboundReceivedFlag = deedReceivedFlag("economic", "high", "landed");
describe("isBoundDeedFlag", () => {
    it("is true for both bound prefixes", () => {
        expect(isBoundDeedFlag(boundFlag)).toBe(true);
        expect(isBoundDeedFlag(anotherBoundFlag)).toBe(true);
    });
    it("is false for the two unbound prefixes and for an unrelated flag", () => {
        expect(isBoundDeedFlag(unboundSentFlag)).toBe(false);
        expect(isBoundDeedFlag(unboundReceivedFlag)).toBe(false);
        expect(isBoundDeedFlag("cleared-the-square")).toBe(false);
    });
});
describe("ReadableFlag (a scenario's `flag` condition, a consequence's flagsSet/flagsClear)", () => {
    it("refuses a bound deed flag", () => {
        expect(ReadableFlag.safeParse(boundFlag).success).toBe(false);
        expect(ReadableFlag.safeParse(anotherBoundFlag).success).toBe(false);
    });
    it("accepts an unbound deed flag actually in DEED_FLAGS", () => {
        expect(DEED_FLAGS).toContain(unboundSentFlag);
        expect(DEED_FLAGS).toContain(unboundReceivedFlag);
        expect(ReadableFlag.safeParse(unboundSentFlag).success).toBe(true);
        expect(ReadableFlag.safeParse(unboundReceivedFlag).success).toBe(true);
    });
    it("refuses a string shaped like the unbound grammar that DEED_FLAGS does not contain", () => {
        expect(ReadableFlag.safeParse("deed:not-a-real-family:high:landed").success).toBe(false);
        expect(ReadableFlag.safeParse("deed-received:pledge:high:landed").success).toBe(false); // pledge is sent-only
    });
    it("accepts an ordinary authored flag untouched by the deed grammar", () => {
        expect(ReadableFlag.safeParse("cleared-the-square").success).toBe(true);
    });
});
describe("WritableFlag (a scenario reply's or consequence card's `sets`)", () => {
    it("refuses any deed flag at all, bound or unbound — content never writes one", () => {
        expect(WritableFlag.safeParse(boundFlag).success).toBe(false);
        expect(WritableFlag.safeParse(unboundSentFlag).success).toBe(false);
        expect(WritableFlag.safeParse(unboundReceivedFlag).success).toBe(false);
    });
    it("accepts an ordinary authored flag", () => {
        expect(WritableFlag.safeParse("guaranteed-the-deposits").success).toBe(true);
    });
});
describe("the schema boundary itself: bound deed flags are unreachable from authored content", () => {
    it("ScenarioCondition's flag kind refuses a bound deed flag", () => {
        const parsed = ScenarioCondition.safeParse({ kind: "flag", flag: boundFlag, is: true });
        expect(parsed.success).toBe(false);
    });
    it("ScenarioCondition's flag kind accepts an unbound deed flag", () => {
        const parsed = ScenarioCondition.safeParse({ kind: "flag", flag: unboundSentFlag, is: true });
        expect(parsed.success).toBe(true);
    });
    it("ScenarioReply refuses to set a deed flag, bound or unbound, leaving every other field valid", () => {
        const base = { id: "test-reply", tone: "firm", text: "Hold the line exactly where it is, and say so plainly before the day is out." };
        expect(ScenarioReply.safeParse({ ...base, sets: [boundFlag] }).success).toBe(false);
        expect(ScenarioReply.safeParse({ ...base, sets: [unboundSentFlag] }).success).toBe(false);
    });
    it("ConsequenceDef refuses a bound deed flag in flagsSet/flagsClear and refuses any deed flag in sets", () => {
        const base = {
            id: "test-consequence",
            instrument: "economic",
            rungBands: ["high"],
            valence: "success",
            weight: 1,
            beats: ["The sanctions landed harder than the room expected, and the ministry has already asked for a revision."],
            effects: [],
        };
        expect(ConsequenceDef.safeParse({ ...base, conditions: { flagsSet: [boundFlag] } }).success).toBe(false);
        expect(ConsequenceDef.safeParse({ ...base, conditions: { flagsSet: [unboundSentFlag] } }).success).toBe(true);
        expect(ConsequenceDef.safeParse({ ...base, sets: [unboundSentFlag] }).success).toBe(false);
    });
});
