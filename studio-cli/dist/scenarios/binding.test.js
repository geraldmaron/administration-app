import { describe, expect, it } from "vitest";
import { ScenarioDef, auditReachability, auditScenario } from "@admin/content";
import { bindingErrors, bindingFindings } from "./binding.js";
import { buildScenarioBrief } from "./brief.js";
import { referenceExemplars, referenceScenarios } from "./reference.js";
import { gateResult } from "../jobs/gate.js";
// The four scenarios this pass added to the reference set. Named rather than
// discovered, because "the bound exemplars are all fine" is a claim about a
// specific four and a test that reads whatever is on disk would keep passing
// after somebody deleted them.
const BOUND = [
    "the-backlog-they-inherited-and-kept",
    "the-auditor-you-already-moved-against",
    "the-yards-and-the-money-that-runs-out",
    "the-berth-they-will-not-open",
];
function exemplar(id) {
    const found = referenceScenarios().find((scenario) => scenario.id === id);
    if (!found)
        throw new Error(`${id} is not in content/reference — the bound exemplars are gone`);
    return found;
}
describe("the bound exemplars", () => {
    it("are all present and parse under the strict schema", () => {
        for (const id of BOUND)
            expect(ScenarioDef.safeParse(exemplar(id)).success, id).toBe(true);
    });
    it("carry no audit finding at all, warnings included — an exemplar's defect propagates into every batch after it", () => {
        const failures = BOUND.flatMap((id) => auditScenario(exemplar(id)).map((finding) => `${id} [${finding.severity}/${finding.kind}] ${finding.message}`));
        expect(failures.join("\n")).toBe("");
    });
    // The reason the previous reference set could not teach binding: a gate that
    // no board ever satisfies parses clean, audits clean, and is dealt to nobody.
    it("are each reachable on a real board", () => {
        const defs = BOUND.map(exemplar);
        expect(auditReachability(defs).map((finding) => `${finding.scenario}: ${finding.message}`)).toEqual([]);
    });
    it("gate on the board rather than the calendar, and say what they are about", () => {
        for (const id of BOUND) {
            const def = exemplar(id);
            const board = def.conditions.filter((condition) => condition.kind !== "turn" && condition.kind !== "flag");
            expect(board.length, `${id} gates only on the clock`).toBeGreaterThan(0);
            expect(def.topics?.length ?? 0, `${id} carries no topics`).toBeGreaterThan(0);
        }
    });
    it("use the two condition kinds the shipped corpus never reached for", () => {
        const kinds = new Set(BOUND.flatMap((id) => exemplar(id).conditions.map((condition) => condition.kind)));
        expect(kinds.has("institutionState")).toBe(true);
        expect(kinds.has("oversightMatter")).toBe(true);
    });
    it("declare a pull on political replies and move the relationship a cast week just changed", () => {
        const pulls = BOUND.flatMap((id) => exemplar(id).replies.filter((reply) => reply.commitment.kind === "position" && reply.commitment.pull !== undefined));
        expect(pulls.length).toBeGreaterThan(0);
        const berth = exemplar("the-berth-they-will-not-open");
        const moved = berth.replies.filter((reply) => reply.commitment.kind === "position" && reply.commitment.relationship !== undefined);
        expect(moved.length).toBe(berth.replies.length);
        expect(berth.transmission).toBeDefined();
    });
    it("are what the brief now quotes, so the bar a generator copies is a bound one", () => {
        const quoted = referenceExemplars().map((scenario) => scenario.id);
        expect(quoted).toContain("the-berth-they-will-not-open");
        expect(quoted).toContain("the-yards-and-the-money-that-runs-out");
        const brief = buildScenarioBrief({ class: "economy", severity: "routine", cast: "none", count: 2 });
        expect(brief).toContain("the-yards-and-the-money-that-runs-out");
    });
});
// A minimal well-formed document, built from an exemplar and then broken one
// way at a time. Built from a real scenario rather than a hand-typed stub so a
// finding here is about the rule under test and not about the fixture.
function draft(overrides = {}) {
    return [{ ...JSON.parse(JSON.stringify(exemplar("the-backlog-they-inherited-and-kept"))), ...overrides }];
}
describe("the binding gate", () => {
    it("passes a fully bound draft", () => {
        expect(bindingFindings(draft())).toEqual([]);
    });
    it("refuses a week gated on nothing, and names it", () => {
        const findings = bindingFindings(draft({ conditions: [] }));
        expect(findings.map((finding) => finding.kind)).toContain("unbound-week");
    });
    it("refuses a week gated only on an early turn floor", () => {
        const findings = bindingFindings(draft({ conditions: [{ kind: "turn", atLeast: 3 }] }));
        expect(findings.map((finding) => finding.kind)).toContain("unbound-week");
    });
    it("accepts an unconditioned week that declares itself universal and says why", () => {
        const findings = bindingFindings(draft({
            conditions: [],
            premise: { kind: "universal", reason: "a culture week that should reach any president in any state of any campaign" },
        }));
        expect(findings).toEqual([]);
    });
    it("refuses the premise stated in the sidecar and points at the durable field", () => {
        const findings = bindingFindings(draft({ conditions: [], binding: { universal: "a culture week that should reach any president in any state of any campaign" } }));
        expect(findings.map((finding) => finding.kind)).toContain("premise-in-sidecar");
    });
    it("refuses a universal declaration on a week that is actually gated", () => {
        const findings = bindingFindings(draft({ premise: { kind: "universal", reason: "a culture week that should reach any president in any state of any campaign" } }));
        expect(findings.map((finding) => finding.kind)).toContain("undeclared-universal-week");
    });
    it("caps how much of one document may declare itself universal", () => {
        const universal = { kind: "universal", reason: "a culture week that should reach any president in any state of any campaign" };
        const document = [1, 2, 3, 4].map((n) => ({
            ...JSON.parse(JSON.stringify(exemplar("the-backlog-they-inherited-and-kept"))),
            id: `universal-week-${n}`,
            conditions: [],
            premise: universal,
        }));
        expect(bindingFindings(document).map((finding) => finding.kind)).toContain("universal-week-overused");
    });
    it("refuses a batch whose every condition is turn or flag, even where each week clears the per-week rule", () => {
        const document = [1, 2].map((n) => ({
            ...JSON.parse(JSON.stringify(exemplar("the-backlog-they-inherited-and-kept"))),
            id: `calendar-week-${n}`,
            conditions: [{ kind: "turn", atLeast: 12 }],
        }));
        expect(bindingFindings(document).map((finding) => finding.kind)).toContain("calendar-gated-batch");
    });
    it("refuses a scenario with no topics", () => {
        const findings = bindingFindings(draft({ topics: [] }));
        expect(findings.map((finding) => finding.kind)).toContain("topics-missing");
    });
    it("refuses a priced metric with no mechanism sentence, and names the reply and the metric", () => {
        const document = draft();
        const replies = document[0].replies;
        replies[0].commitment.cost = { standing: -0.05 };
        const findings = bindingFindings(document);
        expect(findings.map((finding) => finding.kind)).toContain("mechanism-missing");
        expect(findings.find((finding) => finding.kind === "mechanism-missing")?.message).toContain("standing");
    });
    it("accepts the same draft once the mechanism is stated in the sidecar", () => {
        const document = draft();
        const replies = document[0].replies;
        replies[0].commitment.cost = { standing: -0.05 };
        document[0].binding = {
            mechanisms: [
                {
                    reply: replies[0].id,
                    metric: "standing",
                    because: "the request is made to Congress in public and every member who has defended the department all year has to answer for it",
                },
            ],
        };
        expect(bindingFindings(document)).toEqual([]);
    });
    it("refuses a mechanism for a metric the reply does not price", () => {
        const document = draft();
        document[0].binding = {
            mechanisms: [
                {
                    reply: document[0].replies[0].id,
                    metric: "treasury",
                    because: "a sentence about money that this reply never actually spends anywhere in its own commitment",
                },
            ],
        };
        expect(bindingFindings(document).map((finding) => finding.kind)).toContain("mechanism-orphaned");
    });
    it("names a malformed sidecar rather than ignoring it", () => {
        const findings = bindingFindings(draft({ binding: { mechanisms: [{ reply: "x", metric: "approval", because: "short" }] } }));
        expect(findings.map((finding) => finding.kind)).toContain("binding-sidecar-malformed");
    });
    // The mechanism sentence is a working note, not player copy — the whole
    // design rests on the schema dropping it, so the drop is tested rather than
    // assumed.
    it("never lets the sidecar reach the corpus: the schema strips it on parse", () => {
        const document = draft({ binding: { universal: "a week that would be dealt to any president in any state of any campaign" } });
        const parsed = ScenarioDef.parse(document[0]);
        expect("binding" in parsed).toBe(false);
    });
    it("returns nothing for a document that does not parse, so shape errors stay the report", () => {
        expect(bindingErrors([{ id: "not-a-scenario" }])).toEqual([]);
        expect(bindingErrors("not a document at all")).toEqual([]);
    });
});
describe("where the binding contract binds", () => {
    const item = { id: "batch-0001", payload: {} };
    const done = (output) => ({ itemId: item.id, status: "done", spendUsd: 0, output });
    it("refuses an unbound scenario batch at the job gate", () => {
        const result = gateResult("scenario-batch", item, done(draft({ conditions: [] })));
        expect(result.status).toBe("failed");
        expect(result.error).toContain("unbound-week");
    });
    it("passes a bound one", () => {
        expect(gateResult("scenario-batch", item, done(draft())).status).toBe("done");
    });
    // An upgrade may not touch `conditions`, so holding one to the binding
    // contract would refuse every shipped scenario the upgrade pass exists to
    // repair — and a session shown a finding it is forbidden to fix has exactly
    // one move, which is the one the preservation contract prevents.
    it("does not hold an upgrade to it", () => {
        const original = exemplar("the-backlog-they-inherited-and-kept");
        const unbound = { ...JSON.parse(JSON.stringify(original)), conditions: [], topics: undefined };
        const result = gateResult("scenario-upgrade", { id: "upgrade-0001", payload: { original: unbound } }, done(unbound));
        expect(result.error ?? "").not.toContain("unbound-week");
        expect(result.error ?? "").not.toContain("topics-missing");
    });
});
