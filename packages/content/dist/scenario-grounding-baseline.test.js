import { describe, expect, it } from "vitest";
import { CORE_SCENARIOS } from "./packs/core.js";
import { PILOT_SCENARIOS } from "./packs/pilot.js";
import { bakedScenarios } from "./__fixtures__/baked-corpus.js";
import { auditDecapitatedOpening } from "./scenario-grounding.js";
import { auditInertGates } from "./scenario-audit-inert-gate.js";
// The two patterns the BL-252 review caught by hand, held across what the
// player is dealt: a first beat with its determiner stripped, and a gate no
// preview board fails. Each list below is debt the corpus shipped with before
// the rule could see it. Fixing an entry and deleting it is the same change,
// and a new entry is a regression.
const DECAPITATED_DEBT = [];
const INERT_GATE_DEBT = [];
function surfaces() {
    return [
        ["corpus", bakedScenarios()],
        ["core", CORE_SCENARIOS],
        ["pilot", PILOT_SCENARIOS],
    ];
}
function decapitated([label, defs]) {
    return defs.flatMap((def) => {
        const findings = [];
        auditDecapitatedOpening(def, findings);
        return findings.length > 0 ? [`${label}|${def.id}`] : [];
    });
}
function inert([label, defs]) {
    return auditInertGates(defs).map((finding) => `${label}|${finding.scenario}|${JSON.stringify(finding.condition)}`);
}
function expectRatchet(found, debt, what) {
    const fresh = found.filter((entry) => !debt.includes(entry));
    expect(fresh, `${what}:\n${fresh.join("\n")}`).toEqual([]);
    expect(debt.filter((entry) => !found.includes(entry)), "paid debt still listed").toEqual([]);
}
describe("grounding debt across what the player is dealt", () => {
    const all = surfaces();
    it("reads the shipped corpus, so an empty read cannot pass as a clean one", () => {
        expect(all[0][1].length).toBeGreaterThan(100);
    });
    it("opens no week on a stripped determiner beyond the debt it shipped with", () => {
        expectRatchet(all.flatMap(decapitated).sort(), DECAPITATED_DEBT, "decapitated openings");
    });
    // Sealing the corpus's board spread is the slow part: every supplement board
    // the corpus's own conditions demand, on real founding seals.
    it("carries no inert gate beyond the debt it shipped with", { timeout: 180_000 }, () => {
        expectRatchet(all.flatMap(inert).sort(), INERT_GATE_DEBT, "inert gates");
    });
});
