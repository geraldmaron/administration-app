import { PRESS_HOSTILE_FLAG } from "@admin/engine";
import { describe, expect, it } from "vitest";
import { arcDeletionImpact, arcLedger, arcUpstream, deedsRemembered, engineOwnedFlag, formatDeeds, mergeDeeds } from "./scenario-deeds.js";
import { auditScenarios } from "./scenario-audit.js";
import { auditReachability } from "./scenario-reachability.js";
import { CORE_SCENARIOS } from "./packs/core.js";
import { deskClosedFlag } from "./desk-window.js";
import { ScenarioDef, scenarioFiredFlag } from "./scenario.js";
const scenario = (id, sets, reads) => ({
    id,
    class: "economy",
    severity: "routine",
    subject: "A test of the ledger",
    cast: { pick: "none" },
    conditions: reads.map((flag) => ({ kind: "flag", flag, is: true })),
    weight: 1,
    locus: { site: "capital", descriptor: "the branch on the square with the queue around it" },
    opening: [{ speaker: { kind: "narrator" }, text: "Something happened, and the room has to answer for it before the day is out." }],
    replies: [
        {
            id: "answer-it",
            tone: "firm",
            text: "Answer it plainly, today, and take whatever the answer costs.",
            sets: [...sets],
            commitment: { kind: "position", cost: { standing: -0.05 }, remembered: "It was answered plainly, and it cost what it cost." },
        },
    ],
});
describe("the deeds-remembered metric", () => {
    it("counts distinct flags set against distinct flags read", () => {
        const deeds = deedsRemembered([scenario("a", ["paid-the-wages", "held-the-line"], []), scenario("b", [], ["paid-the-wages"])]);
        expect(deeds.set).toEqual(["held-the-line", "paid-the-wages"]);
        expect(deeds.read).toEqual(["paid-the-wages"]);
        expect(deeds.ratio).toBeCloseTo(0.5);
    });
    it("counts a flag read but stamped elsewhere as answered", () => {
        const answering = deedsRemembered([scenario("b", [], ["set-by-an-earlier-batch"])]);
        expect(answering.answered).toEqual(["set-by-an-earlier-batch"]);
        // A flag the same batch stamps is remembered, but it is not a deed
        // answered from outside — the number that says a batch joined the corpus.
        expect(deedsRemembered([scenario("a", ["paid-the-wages"], ["paid-the-wages"])]).answered).toEqual([]);
    });
    it("ignores the flags the engine stamps rather than an author", () => {
        const deeds = deedsRemembered([scenario("a", ["paid-the-wages"], [deskClosedFlag(3), scenarioFiredFlag("a")])]);
        expect(deeds.read).toEqual([]);
    });
    it("reports zero rather than dividing by nothing when a batch stamps none", () => {
        expect(deedsRemembered([]).ratio).toBe(0);
        expect(formatDeeds(deedsRemembered([]))).toContain("0 distinct flag(s) read against 0 set (0%)");
    });
    it("merges across files, so one document's answer to another's deed is visible", () => {
        const writer = deedsRemembered([scenario("a", ["paid-the-wages"], [])]);
        const reader = deedsRemembered([scenario("b", [], ["paid-the-wages"])]);
        const merged = mergeDeeds([writer, reader]);
        expect(merged.set).toEqual(["paid-the-wages"]);
        expect(merged.read).toEqual(["paid-the-wages"]);
        expect(merged.answered).toEqual(["paid-the-wages"]);
        expect(merged.ratio).toBe(1);
    });
    it("reads the shipped pack without exploding on real content", () => {
        const deeds = deedsRemembered(CORE_SCENARIOS);
        expect(deeds.set.length).toBeGreaterThan(0);
        expect(deeds.read.every((flag) => deeds.set.includes(flag))).toBe(true);
    });
});
/** A setter with one door per flag list, so a test can say what each branch stamps. */
const arc = (id, doors, reads = []) => ({
    ...scenario(id, [], reads),
    replies: doors.map((sets, index) => ({
        id: `door-${index}`,
        tone: "firm",
        text: "Say the thing that closes this, and carry whatever it costs afterwards.",
        sets: [...sets],
        commitment: {
            kind: "position",
            cost: { standing: -0.05 },
            remembered: `Door ${index} was taken, and the room was told so in as many words.`,
            rejoinder: { speaker: { kind: "narrator" }, text: `The first bill for door ${index} arrives inside the week.` },
        },
    })),
});
describe("the arc ledger", () => {
    it("calls an arc lopsided when one door is answered and another is not", () => {
        const ledger = arcLedger([arc("setter", [["paid-the-wages"], ["froze-the-wages"]]), arc("reader", [[], []], ["paid-the-wages"])]);
        expect(ledger.lopsided.map((entry) => entry.scenario)).toEqual(["setter"]);
        expect(ledger.lopsided[0].dead.map((branch) => branch.reply)).toEqual(["door-1"]);
        expect(ledger.lopsided[0].answered.map((branch) => branch.reply)).toEqual(["door-0"]);
        expect(ledger.deadBranches).toBe(1);
    });
    it("separates the arc nothing answers from the arc answered in part", () => {
        const ledger = arcLedger([arc("nobody-came-back", [["paid-the-wages"], ["froze-the-wages"]])]);
        expect(ledger.silent.map((entry) => entry.scenario)).toEqual(["nobody-came-back"]);
        expect(ledger.lopsided).toEqual([]);
        // The whole point of reporting silence separately: answering one of these
        // doors moves the arc into `lopsided`, which is the audit warning going up
        // because a promise was kept.
        expect(ledger.deadBranches).toBe(0);
    });
    it("calls an arc whole once every door comes back", () => {
        const ledger = arcLedger([
            arc("setter", [["paid-the-wages"], ["froze-the-wages"]]),
            arc("reader", [[], []], ["paid-the-wages", "froze-the-wages"]),
        ]);
        expect(ledger.whole.map((entry) => entry.scenario)).toEqual(["setter"]);
        expect(ledger.lopsided).toEqual([]);
    });
    it("does not call a single stamping door an arc", () => {
        // One door that remembers and one that does not is a week that ends the
        // same way whichever is taken, so there is no unfairness to report.
        const ledger = arcLedger([arc("one-door", [["paid-the-wages"], []]), arc("reader", [[], []], ["paid-the-wages"])]);
        expect(ledger.lopsided).toEqual([]);
        expect(ledger.silent).toEqual([]);
        expect(ledger.whole).toEqual([]);
    });
    it("counts the pool a batch is joining as an answer", () => {
        const batch = [arc("setter", [["paid-the-wages"], ["froze-the-wages"]])];
        expect(arcLedger(batch).silent).toHaveLength(1);
        expect(arcLedger(batch, new Set(["paid-the-wages"])).lopsided).toHaveLength(1);
    });
    it("carries the aftermath a reader has to answer, not just the flag", () => {
        const [entry] = arcLedger([arc("setter", [["paid-the-wages"], ["froze-the-wages"]]), arc("reader", [[], []], ["paid-the-wages"])])
            .lopsided;
        const [dead] = entry.dead;
        expect(dead.flags).toEqual(["froze-the-wages"]);
        expect(dead.remembered).toContain("Door 1 was taken");
        expect(dead.rejoinder).toContain("The first bill for door 1");
    });
    it("does not make a branch out of the flags the engine stamps", () => {
        const ledger = arcLedger([arc("bookkeeping", [[deskClosedFlag(3)], [scenarioFiredFlag("bookkeeping")]])]);
        expect(ledger.silent).toEqual([]);
        expect(ledger.lopsided).toEqual([]);
    });
    it("agrees with the audit about the shipped pack", () => {
        const ledger = arcLedger(CORE_SCENARIOS);
        const warned = auditScenarios(CORE_SCENARIOS, [], {}).filter((finding) => finding.kind === "arc-branch-unread");
        expect(ledger.lopsided.map((entry) => entry.scenario).sort()).toEqual(warned.map((finding) => finding.scenario).sort());
    });
});
describe("arcUpstream — tracing a reader back to what set its doors", () => {
    it("names the setter one generation up from a scenario id", () => {
        const chain = arcUpstream([arc("setter", [["paid-the-wages"], ["froze-the-wages"]]), arc("reader", [[], []], ["paid-the-wages"])], "reader");
        expect(chain.generations).toHaveLength(1);
        expect(chain.generations[0].map((node) => ({ scenario: node.scenario, flag: node.flag }))).toEqual([
            { scenario: "setter", flag: "paid-the-wages" },
        ]);
        expect(chain.roots).toEqual([]);
    });
    it("traces a flag directly, without a scenario id in front of it", () => {
        const chain = arcUpstream([arc("setter", [["paid-the-wages"], []])], "paid-the-wages");
        expect(chain.generations[0].map((node) => node.scenario)).toEqual(["setter"]);
    });
    it("rolls up multiple generations, oldest cause last", () => {
        const pool = [
            arc("origin", [["opened-the-file"], []]),
            arc("middle", [["paid-the-wages"], []], ["opened-the-file"]),
            arc("reader", [[], []], ["paid-the-wages"]),
        ];
        const chain = arcUpstream(pool, "reader");
        expect(chain.generations).toHaveLength(2);
        expect(chain.generations[0].map((node) => node.scenario)).toEqual(["middle"]);
        expect(chain.generations[1].map((node) => node.scenario)).toEqual(["origin"]);
    });
    it("names a flag nothing in the pool sets as a root rather than looping forever", () => {
        const chain = arcUpstream([arc("reader", [[], []], ["never-authored"])], "reader");
        expect(chain.generations).toEqual([]);
        expect(chain.roots).toEqual(["never-authored"]);
    });
    it("stops at a scenario it has already visited rather than cycling", () => {
        // Two scenarios each reading a flag the other's reply sets: a real cycle,
        // which would loop forever without the visited guard.
        const a = { ...arc("a", [["b-said-yes"], []], ["a-said-yes"]) };
        const b = { ...arc("b", [["a-said-yes"], []], ["b-said-yes"]) };
        const chain = arcUpstream([a, b], "a");
        expect(chain.generations.length).toBeGreaterThan(0);
        // Every generation completes and the walk terminates — the assertion of
        // interest is that this call returns at all.
        expect(chain.generations.flat().every((node) => ["a", "b"].includes(node.scenario))).toBe(true);
    });
    it("ignores flags the engine stamps rather than an author when tracing upstream", () => {
        const chain = arcUpstream([arc("reader", [[], []], [deskClosedFlag(3), scenarioFiredFlag("reader")])], "reader");
        expect(chain.generations).toEqual([]);
        expect(chain.roots).toEqual([]);
    });
});
describe("arcDeletionImpact — the before/after a retire has to pass", () => {
    it("calls a scenario safe to retire when nothing reads what it sets", () => {
        const impact = arcDeletionImpact([arc("setter", [["paid-the-wages"], []])], "setter");
        expect(impact.safe).toBe(true);
        expect(impact.orphans).toEqual([]);
    });
    it("names the reader that would be orphaned", () => {
        const pool = [arc("setter", [["paid-the-wages"], []]), arc("reader", [[], []], ["paid-the-wages"])];
        const impact = arcDeletionImpact(pool, "setter");
        expect(impact.safe).toBe(false);
        expect(impact.orphans).toEqual(["reader"]);
    });
    it("does not count a retired reader as one the retire would strand", () => {
        const pool = [arc("setter", [["paid-the-wages"], []]), { ...arc("reader", [[], []], ["paid-the-wages"]), retired: true }];
        expect(arcDeletionImpact(pool, "setter").safe).toBe(true);
    });
    it("is safe when a flag the target sets is also set elsewhere in the pool", () => {
        const pool = [
            arc("setter-a", [["paid-the-wages"], []]),
            arc("setter-b", [["paid-the-wages"], []]),
            arc("reader", [[], []], ["paid-the-wages"]),
        ];
        expect(arcDeletionImpact(pool, "setter-a").safe).toBe(true);
    });
    it("treats a scenario already gone from the pool as trivially safe", () => {
        expect(arcDeletionImpact([], "never-shipped")).toEqual({ scenario: "never-shipped", safe: true, orphans: [] });
    });
});
// The engine recomputes a hostile press every week and stamps the flag while it
// lasts. A scenario summoned by that press has to be able to wait on it without
// the audit calling it a flag nothing sets.
describe("a hostile press as a gate", () => {
    const base = CORE_SCENARIOS.find((def) => def.id === "the-notice-on-the-lease");
    const summoned = ScenarioDef.parse({ ...base, id: "the-press-that-turned", conditions: [{ kind: "flag", flag: PRESS_HOSTILE_FLAG, is: true }] });
    it("is a flag the engine owns, not a deed a reply writes", () => {
        expect(PRESS_HOSTILE_FLAG).toBe("press:hostile");
        expect(engineOwnedFlag(PRESS_HOSTILE_FLAG, new Set())).toBe(true);
        expect(deedsRemembered([summoned]).read).toEqual([]);
    });
    it("clears the flag rules and reaches a board", () => {
        const kinds = auditScenarios([summoned]).map((finding) => finding.kind);
        expect(kinds).not.toContain("flag-condition-never-set");
        expect(kinds).not.toContain("callback-never-ripens");
        expect(auditReachability([summoned])).toEqual([]);
    });
});
