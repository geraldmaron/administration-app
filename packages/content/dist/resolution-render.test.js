import { describe, expect, it } from "vitest";
import { FIXTURE_RESOLUTION_SEQUENCES } from "./__fixtures__/resolution-sequences.js";
import { CORE_RESOLUTION_SEQUENCES } from "./packs/core-resolution-sequences.js";
import { renderResolutionSequence } from "./resolution-render.js";
// The bank shipped unrendered. Every other property of it was proven — strict
// parse, reachability, per-cell coverage, line uniqueness — and none of those
// reads a filled line, so nothing caught that an aviation verb drew an undersea
// squadron five times in six, or that "the United States" plus an apostrophe-s
// is not a word. This is the read the gates could not perform: fill every slot
// in every sequence with real generator output, across enough seeds that every
// branch the draw can reach is reached, and check the sentence that comes out.
const CASTS = [
    // The player's own government is the possessive that breaks, and the roster
    // carries the article, so it is tested exactly as the roster hands it over.
    { actor: "the United States", target: "the Netherlands", person: "Marta Reyes" },
    { actor: "the United States", target: "France", person: "Ana Oyelaran" },
    { actor: "the United States", target: "the Philippines", person: "Tomas Brandt" },
];
const SEED_COUNT = 80;
// Verbs that only an air unit can carry out. A line that uses one of these and
// names {{unit}} without an air affinity is the defect this file exists to
// catch, not a style note.
const AVIATION = /\b(wheels up|airborne|aircraft|sortie|sorties|tanker|flies|flying|flight|runway|airfield)\b/i;
// Acts only a ground formation carries out.
const GROUND = /\b(battalions|bridgehead|platoon|blocks|dismounts)\b/i;
// Formations that own battalions. A unit-scale designation cannot command one.
const SUBORDINATE_FORMATIONS = /\b(battalions|brigades|regiments|divisions)\b/i;
const REAL_DESIGNATIONS = [
    /\b\d+(?:st|nd|rd|th)\s+(?:Airborne|Armored|Cavalry|Infantry|Marine|Ranger|Fleet|Division|Brigade|Battalion|Squadron|Regiment|Wing)\b/,
    /\b(?:USS|HMS|USNS|RFA)\s+[A-Z]/,
    /\b(?:Delta Force|SEAL Team|Task Force\s+\d+|Spetsnaz|Wagner Group)\b/i,
];
const ALL = [...CORE_RESOLUTION_SEQUENCES, ...FIXTURE_RESOLUTION_SEQUENCES];
function everyRender(def) {
    return CASTS.flatMap((cast) => Array.from({ length: SEED_COUNT }, (_, seed) => renderResolutionSequence(def, cast, "campaign", seed)));
}
describe("a filled resolution sequence is a sentence a player can read", () => {
    it("covers the whole authored bank and its fixtures", () => {
        expect(ALL.length).toBe(45);
        expect(ALL.filter((def) => def.steps.some((step) => step.particulars.includes("unit"))).length).toBeGreaterThan(10);
    });
    it("leaves no slot unfilled and no seam behind", () => {
        for (const def of ALL) {
            for (const rendered of everyRender(def)) {
                for (const step of rendered.steps) {
                    expect(step.line, `${def.id}: ${step.line}`).not.toMatch(/\{\{|\}\}/);
                    expect(step.line, `${def.id}: ${step.line}`).not.toMatch(/ {2}/);
                    // A designation is a legal sentence opener: "607th ISR Squadron is wheels up".
                    expect(step.line, `${def.id}: ${step.line}`).toMatch(/^([A-Z]|\d+(?:st|nd|rd|th)\s)/);
                    expect(step.line, `${def.id}: ${step.line}`).toMatch(/[.!?]$/);
                }
            }
        }
    });
    // "the United States's own airwaves" was in the bank and no test could see it,
    // because no test ever put a nation name next to an apostrophe.
    it("writes a possessive an American desk would write", () => {
        const possessives = ALL.flatMap((def) => everyRender(def).flatMap((rendered) => rendered.steps.map((step) => step.line))).filter((line) => line.includes("'"));
        expect(possessives.length).toBeGreaterThan(0);
        for (const line of possessives) {
            expect(line, line).not.toMatch(/s's\b/);
            expect(line, line).not.toMatch(/s'\s*s\b/);
        }
        const airwaves = renderResolutionSequence(CORE_RESOLUTION_SEQUENCES.find((def) => def.id === "rs-covert-low-failure-blowback-it-comes-home"), CASTS[0], "campaign", 1);
        expect(airwaves.steps.at(-1).line).toContain("the United States' own airwaves");
    });
    it("never renders a real formation or ship into a line", () => {
        for (const def of ALL) {
            for (const rendered of everyRender(def)) {
                for (const step of rendered.steps) {
                    for (const pattern of REAL_DESIGNATIONS) {
                        expect(pattern.test(step.line), `${def.id}: ${step.line}`).toBe(false);
                    }
                }
            }
        }
    });
    // The finding that sent this batch back: the prose assumed a branch and the
    // generator drew uniformly across six.
    it("never contradicts its own verbs on branch", () => {
        let checked = 0;
        for (const def of ALL) {
            for (const rendered of everyRender(def)) {
                if (!rendered.unit)
                    continue;
                def.steps.forEach((step, index) => {
                    if (!step.particulars.includes("unit"))
                        return;
                    const line = rendered.steps[index].line;
                    if (AVIATION.test(step.line)) {
                        checked += 1;
                        expect(rendered.unit.branch, `${def.id}: ${line}`).toBe("air");
                    }
                    if (GROUND.test(step.line)) {
                        checked += 1;
                        expect(["army", "marines"], `${def.id}: ${line}`).toContain(rendered.unit.branch);
                    }
                });
            }
        }
        expect(checked).toBeGreaterThan(0);
    });
    it("never puts a formation under a unit too small to own one", () => {
        let checked = 0;
        for (const def of ALL) {
            for (const rendered of everyRender(def)) {
                if (!rendered.unit)
                    continue;
                def.steps.forEach((step, index) => {
                    if (!step.particulars.includes("unit"))
                        return;
                    if (!SUBORDINATE_FORMATIONS.test(step.line))
                        return;
                    checked += 1;
                    expect(rendered.unit.echelon, `${def.id}: ${rendered.steps[index].line}`).toBe("formation");
                });
            }
        }
        expect(checked).toBeGreaterThan(0);
    });
    it("exercises every branch the unconstrained draw can produce", () => {
        const unconstrained = ALL.find((def) => def.steps.some((step) => step.particulars.includes("unit")) && !def.steps.some((step) => step.unitAffinity));
        expect(unconstrained, "no unconstrained {{unit}} sequence left to prove the draw is wide").toBeDefined();
        const branches = new Set(everyRender(unconstrained).map((rendered) => rendered.unit.branch));
        expect(branches.size).toBe(6);
    });
    it("names the same formation in every step of one sequence", () => {
        for (const def of ALL) {
            for (const rendered of everyRender(def)) {
                if (!rendered.unit)
                    continue;
                const naming = rendered.steps.filter((_, index) => def.steps[index].particulars.includes("unit"));
                for (const step of naming) {
                    expect(step.line, `${def.id}: ${step.line}`).toContain(rendered.unit.designation);
                }
            }
        }
    });
    it("is deterministic on the seed it was given", () => {
        for (const def of ALL) {
            const first = renderResolutionSequence(def, CASTS[0], "campaign", 7);
            const second = renderResolutionSequence(def, CASTS[0], "campaign", 7);
            expect(second).toEqual(first);
        }
    });
});
