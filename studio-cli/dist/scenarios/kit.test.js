import { describe, expect, it } from "vitest";
import { ScenarioClass, ScenarioSeverity } from "@admin/content";
import { personaFor } from "../personas/index.js";
import { buildScenarioBrief, CLASS_SCOPE, doctrineSpread, exemplars } from "./brief.js";
import { KIT_CASTS } from "./kit-brief.js";
import { assembleKit, KIT_KIND, repoKitInputs, writerDoctrine } from "./kit.js";
const DOCTRINE = [
    "# Doctrine",
    "",
    "## 0. The one-paragraph version",
    "Write the week.",
    "## 10.1 Time and tense",
    "Tense rule.",
    "## 10.2 Player text",
    "Help copy.",
    "## 12. Any model, any harness",
    "Harness notes.",
    "## 11. The room",
    "Roles.",
    "",
].join("\n");
const inputs = (doctrine = DOCTRINE) => ({ doctrine, exemplars: exemplars() });
describe("the scenario kit", () => {
    it("is byte-identical for the same rules", () => {
        const first = assembleKit(inputs());
        const second = assembleKit(inputs());
        expect(second.version).toBe(first.version);
        expect(second.files).toEqual(first.files);
    });
    it("changes version when a rule a writer reads changes, and only then", () => {
        const base = assembleKit(inputs()).version;
        expect(assembleKit(inputs(DOCTRINE.replace("Tense rule.", "A new tense rule."))).version).not.toBe(base);
        expect(assembleKit({ doctrine: DOCTRINE, exemplars: exemplars().slice(1) }).version).not.toBe(base);
        expect(assembleKit(inputs(DOCTRINE.replace("Roles.", "New roles."))).version).toBe(base);
    });
    it("stamps its version into the instructions and the template and leaves no token behind", () => {
        const kit = assembleKit(inputs());
        expect(kit.files["INSTRUCTIONS.md"]).toContain(`kit ${kit.version}`);
        expect(JSON.parse(kit.files["TEMPLATE.json"])).toEqual({ kind: KIT_KIND, kitVersion: kit.version, author: "", scenarios: [] });
        for (const text of Object.values(kit.files))
            expect(text).not.toContain("{{KIT_VERSION}}");
    });
    it("ships a JSON Schema generated from ScenarioDef", () => {
        const schema = JSON.parse(assembleKit(inputs()).files["scenario.schema.json"]);
        expect(Object.keys(schema.properties)).toEqual(["kind", "kitVersion", "author", "scenarios"]);
        expect(schema.properties.scenarios?.items?.required).toEqual(expect.arrayContaining(["id", "class", "severity", "cast", "replies"]));
    });
    it("keeps the writer's doctrine and drops help copy, roles and harness notes", () => {
        const kept = writerDoctrine(DOCTRINE);
        expect(kept).toContain("Tense rule.");
        expect(kept).not.toMatch(/Help copy|Harness notes|Roles\./);
    });
    // The drift guard: every line a job brief prints, for any cell, is somewhere
    // in the kit. A section added to the job brief and not to the kit fails here.
    it("carries every line of every job brief", () => {
        const kit = Object.values(assembleKit(repoKitInputs()).files).join("\n");
        const known = new Set(kit.split("\n"));
        const specs = [
            ...KIT_CASTS.map((cast) => ({ class: "economy", severity: "serious", cast, count: 2 })),
            ...ScenarioClass.options.map((klass) => ({ class: klass, severity: "critical", cast: "none", count: 2 })),
            ...ScenarioSeverity.options.map((severity) => ({ class: "scandal", severity, cast: "tensest", count: 2 })),
        ];
        for (const spec of specs) {
            const cellLines = new Set([
                `What "${spec.class}" covers: ${CLASS_SCOPE[spec.class]}`,
                `SEVERITY — how loud this week is. Every scenario in this batch is severity "${spec.severity}", and the`,
                "batch is planned, counted and paced on that being true.",
                ...doctrineSpread(spec.severity, spec.count),
                "Return ONLY the JSON array. No commentary.",
            ]);
            const brief = buildScenarioBrief({ ...spec, persona: personaFor(spec) }).split("\n").slice(2);
            const missing = brief.filter((line) => line.trim().length > 0 && !cellLines.has(line) && !known.has(line));
            expect(missing, `${spec.class}:${spec.cast}:${spec.severity}`).toEqual([]);
        }
    });
});
