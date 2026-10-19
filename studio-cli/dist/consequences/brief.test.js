import { describe, expect, it } from "vitest";
import { CONSEQUENCE_COVERAGE_TARGET, CONSEQUENCE_FAILURE_HARM_FLOOR, ConsequenceInstrument, LENGTH_CEILINGS, } from "@admin/content";
import { buildConsequenceBrief, consequenceJob, personaForInstrument } from "./brief.js";
import { PERSONAS, PersonaId } from "../personas/index.js";
// The anti-drift pass, in the same shape the scenario brief's has: the prose a
// generator is handed is the deliverable, so it is pinned as text, and the
// numbers in it are proven to be the validator's own rather than a copy that
// was true once.
describe("the consequence brief", () => {
    it("pins the brief with no director", () => {
        expect(buildConsequenceBrief({ instrument: "covert", band: "high", valence: "failure", steer: "a method seen twice", count: 3 })).toMatchSnapshot();
    });
    it("pins the brief under a director", () => {
        expect(buildConsequenceBrief({ instrument: "military", band: "mid", valence: "partial", persona: "the-embed", count: 2 })).toMatchSnapshot();
    });
    it("quotes the live audit constants rather than a remembered copy of them", () => {
        const brief = buildConsequenceBrief({ instrument: "diplomatic", band: "low", valence: "success", count: 1 });
        expect(brief).toContain(String(CONSEQUENCE_FAILURE_HARM_FLOOR.success));
        expect(brief).toContain(String(CONSEQUENCE_FAILURE_HARM_FLOOR.partial));
        expect(brief).toContain(String(CONSEQUENCE_COVERAGE_TARGET));
        expect(brief).toContain(String(LENGTH_CEILINGS.beat));
    });
    it("embeds two shipped cards in full as the bar", () => {
        const brief = buildConsequenceBrief({ instrument: "diplomatic", band: "low", valence: "success", count: 1 });
        expect(brief).toContain("cq-diplomatic-low-success-note-read-in-the-car");
        expect(brief).toContain("cq-military-high-failure-the-second-decision-of-the-night");
    });
    it("states the director once, above the gates, behind the frame", () => {
        for (const id of PersonaId.options) {
            const brief = buildConsequenceBrief({ instrument: "covert", band: "mid", valence: "failure", persona: id, count: 1 });
            const prompt = PERSONAS[id].prompt;
            expect(brief.split(prompt)).toHaveLength(2);
            expect(brief.indexOf(prompt)).toBeLessThan(brief.indexOf("Every consequence card must clear these gates"));
            expect(brief.indexOf("The gates that follow it are non-negotiable")).toBeLessThan(brief.indexOf(prompt));
            for (const other of PersonaId.options) {
                if (other !== id)
                    expect(brief).not.toContain(PERSONAS[other].prompt);
            }
        }
    });
    it("carries no director at all when none was resolved", () => {
        const brief = buildConsequenceBrief({ instrument: "economic", band: "low", valence: "partial", count: 1 });
        for (const id of PersonaId.options)
            expect(brief).not.toContain(PERSONAS[id].prompt);
    });
});
describe("the consequence job file", () => {
    it("emits the kind the gate is registered under", () => {
        expect(consequenceJob("cq-1", "mock", [{ instrument: "covert", band: "low", valence: "success", count: 1 }]).kind).toBe("consequence-batch");
    });
    it("routes every instrument to a director", () => {
        for (const instrument of ConsequenceInstrument.options) {
            expect(PERSONAS[personaForInstrument(instrument)]).toBeDefined();
        }
    });
    it("stamps the resolved director into the payload: cell over flag over instrument", () => {
        const job = consequenceJob("cq-2", "mock", [
            { instrument: "military", band: "low", valence: "success", count: 1 },
            { instrument: "military", band: "low", valence: "success", count: 1, persona: "the-room" },
        ], "the-architect-of-dread");
        expect(job.items[0].payload.persona).toBe("the-architect-of-dread");
        expect(job.items[1].payload.persona).toBe("the-room");
        const routed = consequenceJob("cq-3", "mock", [{ instrument: "military", band: "low", valence: "success", count: 1 }]);
        expect(routed.items[0].payload.persona).toBe("the-embed");
        expect(routed.items[0].payload.prompt).toContain(PERSONAS["the-embed"].prompt);
    });
});
