import { describe, expect, it } from "vitest";
import { apply } from "./effects.js";
import { buildCampaign as fixtureCampaign } from "./__fixtures__/campaign.js";
import { causalIdFor, findOrphanedCauses, decisionCauses, marksOfPacket, selectCausesOf, selectConsequencesOf, selectDecisionLegacy, selectExchangeBetween, selectMarkOrigin, selectMarkOrigins, withCausalMarks, selectInstitutionCauses, selectLocaleCauses, selectRootCausesOf, selectSystemCauses, selectWhyMetricMoved, } from "./causality.js";
function packet(summary, extra = {}) {
    return {
        source: "action",
        actor: "player",
        turn: 1,
        narration: { summary },
        effects: [],
        ...extra,
    };
}
function ledgerOf(campaign) {
    return campaign.ledger;
}
describe("stamping", () => {
    it("stamps every packet, even one that names no cause", () => {
        const after = apply(fixtureCampaign(), packet("The president signs the tariff."));
        const entry = after.ledger.at(-1);
        expect(entry.causal).toBeDefined();
        expect(entry.causal.eventId).toBeTruthy();
        expect(entry.causal.createdDate).toEqual(fixtureCampaign().calendar);
    });
    it("classifies an unmigrated call site honestly rather than with a placeholder", () => {
        const base = fixtureCampaign();
        expect(apply(base, packet("x")).ledger.at(-1).causal.origin).toBe("decision");
        expect(apply(base, packet("x", { source: "simulate" })).ledger.at(-1).causal.origin).toBe("world");
        expect(apply(base, packet("x", { source: "operator" })).ledger.at(-1).causal.origin).toBe("world");
        expect(apply(base, packet("x", { source: "conversation" })).ledger.at(-1).causal.origin).toBe("decision");
    });
    it("lets a caller's own origin win over the one derived from source", () => {
        const after = apply(fixtureCampaign(), packet("x", { provenance: { origin: "scenario" } }));
        expect(after.ledger.at(-1).causal.origin).toBe("scenario");
    });
    it("gives every event a distinct id, deterministically", () => {
        let campaign = fixtureCampaign();
        for (let i = 0; i < 20; i++)
            campaign = apply(campaign, packet(`act ${i}`));
        const ids = campaign.ledger.map((e) => e.causal?.eventId).filter(Boolean);
        expect(new Set(ids).size).toBe(ids.length);
        let replay = fixtureCampaign();
        for (let i = 0; i < 20; i++)
            replay = apply(replay, packet(`act ${i}`));
        expect(replay.ledger.map((e) => e.causal?.eventId)).toEqual(campaign.ledger.map((e) => e.causal?.eventId));
    });
    it("derives the id from the ledger's own length", () => {
        const base = fixtureCampaign();
        const after = apply(base, packet("x"));
        expect(after.ledger.at(-1).causal.eventId).toBe(causalIdFor(1, base.ledger.length));
    });
});
describe("walking the graph", () => {
    // A tariff, the steel price it moved, the Michigan employment that followed,
    // and the governor who reacted — the mission's own worked example.
    function chain() {
        let c = fixtureCampaign();
        c = apply(c, packet("Tariff signed on imported steel.", {
            provenance: { origin: "decision", systems: ["trade"], entities: ["ORG-USTR"] },
        }));
        const tariff = c.ledger.at(-1).causal.eventId;
        c = apply(c, packet("Domestic steel prices rise.", {
            source: "simulate",
            provenance: { origin: "world", causeIds: [tariff], systems: ["trade", "macro"] },
        }));
        const steel = c.ledger.at(-1).causal.eventId;
        c = apply(c, packet("Auto production costs climb.", {
            source: "simulate",
            provenance: { origin: "world", causeIds: [steel], systems: ["macro"] },
        }));
        const autos = c.ledger.at(-1).causal.eventId;
        c = apply(c, packet("Michigan employment slips.", {
            source: "simulate",
            provenance: { origin: "world", causeIds: [autos], locales: ["US-MI"], systems: ["macro"] },
        }));
        const michigan = c.ledger.at(-1).causal.eventId;
        c = apply(c, packet("The governor of Michigan breaks with the administration.", {
            source: "simulate",
            provenance: { origin: "institution", causeIds: [michigan], locales: ["US-MI"], entities: ["ORG-NGA"] },
        }));
        return c;
    }
    it("names the direct cause of a downstream event", () => {
        const c = chain();
        const michigan = c.ledger.at(-2).causal.eventId;
        const causes = selectCausesOf(ledgerOf(c), michigan);
        expect(causes.map((r) => r.description)).toEqual(["Auto production costs climb."]);
    });
    it("walks all the way back to the decision that started it", () => {
        const c = chain();
        const governor = c.ledger.at(-1).causal.eventId;
        const roots = selectRootCausesOf(ledgerOf(c), governor);
        expect(roots.map((r) => r.description)).toEqual(["Tariff signed on imported steel."]);
    });
    it("finds the whole downstream cone of one decision", () => {
        const c = chain();
        const tariff = c.ledger.find((e) => e.description.startsWith("Tariff")).causal.eventId;
        const legacy = selectDecisionLegacy(ledgerOf(c), tariff);
        expect(legacy.map((r) => r.description)).toEqual([
            "Domestic steel prices rise.",
            "Auto production costs climb.",
            "Michigan employment slips.",
            "The governor of Michigan breaks with the administration.",
        ]);
    });
    it("finds the immediate consequences of one event", () => {
        const c = chain();
        const tariff = c.ledger.find((e) => e.description.startsWith("Tariff")).causal.eventId;
        expect(selectConsequencesOf(ledgerOf(c), tariff).map((r) => r.description)).toEqual([
            "Domestic steel prices rise.",
        ]);
    });
    it("answers by place, by institution and by system", () => {
        const c = chain();
        expect(selectLocaleCauses(ledgerOf(c), "US-MI").length).toBe(2);
        expect(selectInstitutionCauses(ledgerOf(c), "ORG-USTR").length).toBe(1);
        expect(selectSystemCauses(ledgerOf(c), "trade").length).toBe(2);
    });
    it("terminates on a cycle rather than hanging", () => {
        // Cannot be produced by apply(), which only ever points backwards — but a
        // corrupted save must not lock the Record.
        const cyclic = [
            { causal: { eventId: "a", origin: "world", causeIds: ["b"], createdDate: { year: 2029, month: 1, day: 1 } }, turn: 1, description: "a" },
            { causal: { eventId: "b", origin: "world", causeIds: ["a"], createdDate: { year: 2029, month: 1, day: 1 } }, turn: 1, description: "b" },
        ];
        expect(selectRootCausesOf(cyclic, "a")).toEqual([]);
        expect(selectDecisionLegacy(cyclic, "a").length).toBe(1);
    });
});
describe("why a metric moved", () => {
    it("reads the movement apply() already charged, not a re-derivation", () => {
        let c = fixtureCampaign();
        c = apply(c, {
            ...packet("A costly week."),
            effects: [{ kind: "metric", deltas: { treasury: -120 } }],
            provenance: { origin: "decision", systems: ["budget"] },
        });
        const why = selectWhyMetricMoved(c.ledger, "treasury", { from: { year: 2029, month: 1, day: 1 }, to: { year: 2029, month: 12, day: 31 } });
        expect(why.length).toBe(1);
        expect(why[0].delta).toBeCloseTo(-120);
        expect(why[0].description).toBe("A costly week.");
    });
    it("files an effect under the date it bit, not the date it was signed", () => {
        let c = fixtureCampaign();
        c = apply(c, {
            ...packet("Signed in January, lands in July."),
            effects: [{ kind: "metric", deltas: { treasury: -50 } }],
            provenance: { origin: "decision", effectiveDate: { year: 2029, month: 7, day: 1 } },
        });
        const january = selectWhyMetricMoved(c.ledger, "treasury", {
            from: { year: 2029, month: 1, day: 1 }, to: { year: 2029, month: 1, day: 31 },
        });
        const july = selectWhyMetricMoved(c.ledger, "treasury", {
            from: { year: 2029, month: 7, day: 1 }, to: { year: 2029, month: 7, day: 31 },
        });
        expect(january.length).toBe(0);
        expect(july.length).toBe(1);
    });
});
describe("the epistemic axes", () => {
    it("carries confidence and visibility from the caller onto the ledger", () => {
        let c = fixtureCampaign();
        c = apply(c, packet("assessed", {
            provenance: { origin: "world", confidence: "assessed", visibility: "intelligence" },
        }));
        const stamp = c.ledger.at(-1).causal;
        expect(stamp.confidence).toBe("assessed");
        expect(stamp.visibility).toBe("intelligence");
    });
    it("leaves both unset rather than defaulting a packet that classified neither", () => {
        let c = fixtureCampaign();
        c = apply(c, packet("plain"));
        const stamp = c.ledger.at(-1).causal;
        expect(stamp.confidence).toBeUndefined();
        expect(stamp.visibility).toBeUndefined();
    });
});
describe("the closure rule", () => {
    it("finds no orphan in a graph apply() built", () => {
        let c = fixtureCampaign();
        c = apply(c, packet("root"));
        const root = c.ledger.at(-1).causal.eventId;
        c = apply(c, packet("child", { provenance: { origin: "world", causeIds: [root] } }));
        expect(findOrphanedCauses(ledgerOf(c))).toEqual([]);
    });
    it("names an event whose cause is not on the ledger", () => {
        let c = fixtureCampaign();
        c = apply(c, packet("child", { provenance: { origin: "world", causeIds: ["ev-999-999"] } }));
        const orphans = findOrphanedCauses(ledgerOf(c));
        expect(orphans.length).toBe(1);
        expect(orphans[0].missing).toBe("ev-999-999");
    });
});
// A presidential decision creates no record with a `causedBy` on it, so the
// flags it sets are the only thing a situation dealt months later can be gated
// on. These are the two reads that turn that into an edge.
describe("what a decision left behind", () => {
    const stamp = (marks, entities, origin = "decision") => ({
        causal: { origin, eventId: `ev-${marks.join("")}${entities.join("")}`, createdDate: { year: 2029, month: 1, day: 1 }, marks, entities },
        turn: 1,
        description: marks.join(", "),
    });
    it("marks the flags a packet sets, and not the turn-stamps beside them", () => {
        // `markedFlags` writes each flag twice: the fact, and the week it happened.
        // Only the first of the pair is a thing anything is ever gated on.
        expect(marksOfPacket(4, [{ kind: "flag", set: ["crossing-agreed", "flagset:crossing-agreed:4"] }])).toEqual(["crossing-agreed"]);
    });
    it("leaves a packet with no provenance alone rather than inventing one", () => {
        // What kind of event it is is not a thing this can work out, and apply()
        // already derives an honest origin from the source.
        const bare = packet("x", { effects: [{ kind: "flag", set: ["done"] }] });
        expect(withCausalMarks(bare)).toBe(bare);
    });
    it("reads back the most recent event that left a marker", () => {
        const ledger = [stamp(["deal"], ["USA", "CAN"]), stamp(["deal", "row"], ["USA", "CAN"])];
        // A flag is a keyed fact rather than a tally: what the board is standing on
        // is the last time it was written.
        expect(selectMarkOrigin(ledger, "deal").causal.eventId).toBe(ledger[1].causal.eventId);
        expect(selectMarkOrigin(ledger, "never-set")).toBeUndefined();
        expect(selectMarkOrigins(ledger, ["deal", "row", "never-set"])).toEqual([ledger[1].causal.eventId]);
    });
    it("finds the last act between two governments, and only between those two", () => {
        const ledger = [
            stamp(["a"], ["USA", "CAN"]),
            stamp(["b"], ["USA", "MEX"]),
            stamp(["c"], ["CAN", "MEX"]),
        ];
        expect(selectExchangeBetween(ledger, "USA", "CAN").causal.eventId).toBe(ledger[0].causal.eventId);
        expect(selectExchangeBetween(ledger, "CAN", "USA").causal.eventId).toBe(ledger[0].causal.eventId);
        expect(selectExchangeBetween(ledger, "USA", "USA"), "a government has no thread with itself").toBeUndefined();
        expect(selectExchangeBetween(ledger, "USA", "BRA")).toBeUndefined();
    });
    it("does not read weather in one of the two countries as something the other said back", () => {
        const drought = stamp(["x"], ["USA", "CAN"], "world");
        expect(selectExchangeBetween([drought], "USA", "CAN")).toBeUndefined();
    });
    it("names the gate, and refuses to name the thread between two capitals", () => {
        const ledger = [stamp(["deal"], ["USA", "CAN"]), stamp(["row"], ["USA", "MEX"])];
        // The gate is a fact the situation states about itself: it reached the desk
        // because that flag was standing, so whoever set it is upstream.
        expect(decisionCauses(ledger, { gatedOn: ["deal"], between: ["USA", "MEX"] })).toEqual([
            ledger[0].causal.eventId,
        ]);
        // And the thread is NOT a cause, which is the whole of this assertion. It
        // used to be — "a president replying to Mexico is replying to whatever
        // passed between them last" — and it carried most of the graph's reach,
        // which is why it went: that is a link asserted from two governments being
        // adjacent rather than from anything either act said. A player cannot
        // check it, so the record must not claim it.
        expect(decisionCauses(ledger, { between: ["USA", "MEX"] })).toEqual([]);
        expect(decisionCauses(ledger, {}), "a first move answers to nothing").toEqual([]);
        expect(decisionCauses(ledger, { gatedOn: ["set-before-the-oath"] })).toEqual([]);
    });
});
