import { RISK_IDS, eligibleConsequences } from "@admin/engine";
import { describe, expect, it } from "vitest";
import { auditConsequence, auditConsequences, consequenceAuditPasses } from "./consequence-audit.js";
import { compileConsequences } from "./consequence-compile.js";
import { ConsequenceDef } from "./consequence.js";
import { sealedCampaign } from "./__fixtures__/campaign.js";
const BEAT = "The room hears of it before the wire desk does, and the answer comes back within the hour, coldly and in writing.";
// Three wholly unlike lines, so a pool built from them collides with nothing
// and the overlap rule has to be provoked deliberately to fire.
const BEATS = [
    BEAT,
    "Their ambassador leaves without waiting for the car, and by evening every capital that matters has been told exactly why.",
    "Nothing is announced. A working group quietly stops meeting, and six ministries discover they no longer return each other's calls.",
];
function card(overrides = {}) {
    return {
        id: "cq-base",
        instrument: "diplomatic",
        rungBands: ["low"],
        valence: "failure",
        weight: 1,
        beats: [BEAT],
        effects: [{ kind: "metric", deltas: { standing: -0.02 } }],
        ...overrides,
    };
}
const kinds = (findings) => findings.map((finding) => finding.kind);
const REVEAL_BEAT = "The claim it rested on came from one desk with a reason to make it, and the second look that would have caught it was a look nobody asked for.";
/**
 * Every cell of the matrix filled with a guaranteed card, so coverage rules are
 * quiet unless a test breaks one. A complete pool includes a reveal in every
 * cell as well as a floor: a cell that can tell an act but cannot tell the
 * briefing behind it is a cell the reveal coverage rule refuses.
 */
function fullPool() {
    const defs = [];
    for (const instrument of ["diplomatic", "economic", "covert", "military", "assistance"]) {
        for (const valence of ["success", "partial", "failure"]) {
            defs.push(card({
                id: `cq-${instrument}-${valence}-reveal`,
                instrument,
                valence,
                rungBands: ["low", "mid", "high"],
                conditions: { intelFalse: true },
                beats: [REVEAL_BEAT],
                effects: [{ kind: "metric", deltas: { standing: -0.02 } }],
            }));
            for (let copy = 0; copy < 3; copy += 1) {
                defs.push(card({
                    id: `cq-${instrument}-${valence}-${copy}`,
                    instrument,
                    valence,
                    rungBands: ["low", "mid", "high"],
                    beats: [BEATS[copy]],
                    effects: valence === "success" ? [{ kind: "metric", deltas: { standing: 0.02 } }] : [{ kind: "metric", deltas: { standing: -0.02 } }],
                    // A success card is only allowed to be pure gain if it hands the
                    // next scene something, so the pool's own successes carry a flag.
                    ...(valence === "success" ? { sets: [`${instrument}-went-well`] } : {}),
                }));
            }
        }
    }
    return defs;
}
describe("the consequence document", () => {
    it("parses a well-formed card and refuses a stub", () => {
        expect(ConsequenceDef.safeParse(card()).success).toBe(true);
        expect(ConsequenceDef.safeParse(card({ beats: ["."] })).success).toBe(false);
    });
    it("refuses a rung the engine has no band for and an approval figure the simulation derives", () => {
        expect(ConsequenceDef.safeParse(card({ rungBands: ["highest"] })).success).toBe(false);
        expect(ConsequenceDef.safeParse(card({ effects: [{ kind: "metric", deltas: { approval: -0.1 } }] })).success).toBe(false);
    });
    it("compiles to a card the engine will actually draw", () => {
        const campaign = sealedCampaign();
        const pool = compileConsequences([card({ instrument: "diplomatic", rungBands: ["low"], valence: "failure" })]);
        const eligible = eligibleConsequences(campaign, pool, {
            actor: campaign.founding.nation,
            target: campaign.founding.nation,
            instrument: "diplomatic",
            rung: 1,
            valence: "failure",
        });
        expect(eligible.map((entry) => entry.id)).toEqual(["cq-base"]);
    });
});
describe("the per-card rules", () => {
    it("holds card prose to the same register scenarios are held to", () => {
        const findings = auditConsequence(
        // "defence" is British on purpose: this is the input the spelling gate
        // exists to refuse, so it is one of the few strings in the repo that must
        // stay spelled that way.
        card({ beats: ["The rung they climbed was a defence of nothing, and the Washington Post said so within the hour of it."] }));
        expect(kinds(findings)).toEqual(expect.arrayContaining(["mechanics-language", "british-spelling", "press-organization"]));
    });
    it("refuses a placeholder the binder does not fill", () => {
        const findings = auditConsequence(card({ beats: [`${BEAT} {{counterpart}}`] }));
        expect(kinds(findings)).toContain("consequence-unknown-placeholder");
    });
    it("refuses a risk id the instrument has no branch for", () => {
        expect(kinds(auditConsequence(card({ riskAffinity: ["not-a-risk"] })))).toContain("unknown-risk-id");
        expect(kinds(auditConsequence(card({ riskAffinity: [RISK_IDS.diplomatic[0]] })))).not.toContain("unknown-risk-id");
    });
    it("refuses a risk affinity on an outcome that never failed", () => {
        const findings = auditConsequence(card({ valence: "success", riskAffinity: [RISK_IDS.diplomatic[0]], effects: [{ kind: "metric", deltas: { standing: 0.02 } }] }));
        expect(kinds(findings)).toContain("risk-affinity-off-failure");
    });
    it("refuses an aftermath that leaves no mark", () => {
        expect(kinds(auditConsequence(card({ effects: [] })))).toContain("inert-consequence");
        expect(kinds(auditConsequence(card({ effects: [], sets: ["consequence-seen"] })))).not.toContain("inert-consequence");
    });
    it("refuses a pure-gain card with no forward hook, and takes any of the three ways out", () => {
        const gain = card({ valence: "success", effects: [{ kind: "metric", deltas: { standing: 0.03 } }] });
        expect(kinds(auditConsequence(gain))).toContain("costless-upside");
        const priced = card({
            valence: "success",
            effects: [{ kind: "metric", deltas: { standing: 0.03 } }, { kind: "relationship", direction: "actor-to-target", deltas: { tension: 0.02 } }],
        });
        expect(kinds(auditConsequence(priced))).not.toContain("costless-upside");
        expect(kinds(auditConsequence({ ...gain, sets: ["took-the-easy-win"] }))).not.toContain("costless-upside");
        expect(kinds(auditConsequence({ ...gain, remembered: BEATS[1] }))).not.toContain("costless-upside");
        expect(kinds(auditConsequence({ ...gain, valence: "partial" }))).toContain("costless-upside");
        expect(kinds(auditConsequence({ ...gain, valence: "failure" }))).not.toContain("costless-upside");
    });
    it("refuses a success card that punishes like a failure", () => {
        const punishing = card({ valence: "success", effects: [{ kind: "metric", deltas: { standing: -0.09 } }] });
        expect(kinds(auditConsequence(punishing))).toContain("valence-magnitude-inversion");
        const gentle = card({ valence: "success", effects: [{ kind: "metric", deltas: { standing: -0.01 } }] });
        expect(kinds(auditConsequence(gentle))).not.toContain("valence-magnitude-inversion");
    });
    it("measures treasury on the scale the metric layer scores it against", () => {
        const findings = auditConsequence(card({ valence: "success", effects: [{ kind: "metric", deltas: { treasury: -600 } }] }));
        expect(kinds(findings)).not.toContain("valence-magnitude-inversion");
    });
});
describe("the corpus rules", () => {
    it("passes a pool that fills every cell", () => {
        const findings = auditConsequences(fullPool());
        expect(consequenceAuditPasses(findings)).toBe(true);
        expect(kinds(findings)).not.toContain("coverage-cell-thin");
    });
    it("refuses a cell that can tell the act but not the briefing behind it", () => {
        const pool = fullPool().filter((def) => def.id !== "cq-military-success-reveal");
        const bare = auditConsequences(pool).filter((finding) => finding.kind === "reveal-cell-uncovered");
        expect(bare.map((finding) => finding.consequence)).toEqual(["military/low/success", "military/mid/success", "military/high/success"]);
    });
    it("does not let a briefing card talk a thin cell out of saying it is thin", () => {
        // The reveal is drawn only in the rare week the claim's truth is at stake,
        // so it does nothing about the repetition the depth target measures.
        const pool = fullPool().filter((def) => def.id !== "cq-covert-partial-2");
        const thin = auditConsequences(pool).filter((finding) => finding.kind === "coverage-cell-thin");
        expect(thin.map((finding) => finding.consequence)).toContain("covert/low/partial");
    });
    it("refuses an empty cell and warns about a thin one", () => {
        const pool = fullPool().filter((def) => !(def.instrument === "covert" && def.valence === "partial"));
        const empty = auditConsequences(pool).filter((finding) => finding.kind === "coverage-cell-empty");
        expect(empty).toHaveLength(3);
        expect(empty[0].consequence).toBe("covert/low/partial");
        const thinned = fullPool().filter((def) => def.id !== "cq-covert-partial-2");
        expect(kinds(auditConsequences(thinned))).toContain("coverage-cell-thin");
    });
    it("refuses a cell whose every card is conditioned, once-only, or risk-specific", () => {
        const pool = fullPool().map((def) => def.instrument === "military" && def.valence === "failure" ? { ...def, conditions: { minTension: 0.5 } } : def);
        const gated = auditConsequences(pool).filter((finding) => finding.kind === "coverage-cell-gated");
        expect(gated).toHaveLength(3);
        expect(gated.every((finding) => finding.consequence.startsWith("military/"))).toBe(true);
    });
    it("refuses a card waiting on a flag nothing in either corpus writes", () => {
        const pool = fullPool().map((def) => (def.id === "cq-economic-failure-0" ? { ...def, conditions: { flagsSet: ["ledger-leaked"] } } : def));
        expect(kinds(auditConsequences(pool))).toContain("consequence-flag-never-set");
        expect(kinds(auditConsequences(pool, ["ledger-leaked"]))).not.toContain("consequence-flag-never-set");
    });
    it("accepts a flag another card in the pool writes", () => {
        const pool = fullPool().map((def) => def.id === "cq-economic-failure-0"
            ? { ...def, conditions: { flagsSet: ["ledger-leaked"] } }
            : def.id === "cq-economic-failure-1"
                ? { ...def, sets: ["ledger-leaked"] }
                : def);
        expect(kinds(auditConsequences(pool))).not.toContain("consequence-flag-never-set");
    });
    it("refuses a duplicated id", () => {
        const twins = fullPool().map((def) => (def.id === "cq-covert-failure-1" ? { ...def, id: "cq-covert-failure-0" } : def));
        expect(kinds(auditConsequences(twins))).toContain("duplicate-consequence-id");
    });
    it("warns on two cards wearing one template", () => {
        const restated = fullPool().map((def) => (def.id === "cq-covert-failure-1" ? { ...def, beats: [BEATS[0]] } : def));
        expect(kinds(auditConsequences(restated))).toContain("template-overlap");
    });
});
