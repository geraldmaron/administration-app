import { describe, expect, it } from "vitest";
import { FIXTURE_RESOLUTION_SEQUENCES } from "./__fixtures__/resolution-sequences.js";
import { ResolutionSequenceDef, ResolutionSequencePack, resolutionSequenceKey, sequenceKeysOf, } from "./resolution-beat.js";
import { SITUATION_KEYS, coversKey, uncoveredSituationKeys, unreachableSequences } from "./resolution-beat-reachability.js";
const [REPULSED, COURIER, COLUMN] = FIXTURE_RESOLUTION_SEQUENCES;
function sequence(overrides = {}) {
    return { ...REPULSED, ...overrides };
}
const message = (result) => result.success ? "" : (result.error?.issues.map((issue) => issue.message).join(" | ") ?? "");
describe("ResolutionSequenceDef", () => {
    it("parses every reference fixture", () => {
        for (const fixture of FIXTURE_RESOLUTION_SEQUENCES) {
            expect(ResolutionSequenceDef.safeParse(fixture).success).toBe(true);
        }
    });
    it("round-trips a strict parse through serialization", () => {
        const pack = { id: "fixture-pack", version: 1, sequences: FIXTURE_RESOLUTION_SEQUENCES };
        const parsed = ResolutionSequencePack.parse(JSON.parse(JSON.stringify(pack)));
        expect(parsed).toEqual(pack);
        expect(ResolutionSequencePack.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    });
    it("refuses an unknown key rather than dropping it", () => {
        const result = ResolutionSequenceDef.safeParse(sequence({ effects: [{ kind: "metric", deltas: { standing: -1 } }] }));
        expect(result.success).toBe(false);
    });
    it("refuses a step whose outcome its kind cannot have", () => {
        const steps = [REPULSED.steps[0], { ...REPULSED.steps[2], outcome: "gain" }];
        expect(message(ResolutionSequenceDef.safeParse(sequence({ steps })))).toContain("cannot turn out");
    });
    it("refuses an ending that contradicts the valence the key carries", () => {
        const steps = [COLUMN.steps[0], { ...COLUMN.steps[1], outcome: "cost" }];
        const result = ResolutionSequenceDef.safeParse(sequence({ ...COLUMN, steps }));
        expect(message(result)).toContain("has to end on");
    });
    it("refuses a failure branch named on a success", () => {
        expect(message(ResolutionSequenceDef.safeParse(sequence({ ...COLUMN, riskAffinity: ["rebuffed"] })))).toContain("names a failure branch");
    });
    it("refuses a rescue with nothing lost before it", () => {
        const steps = [COURIER.steps[0], COURIER.steps[2]];
        expect(message(ResolutionSequenceDef.safeParse(sequence({ ...COURIER, steps })))).toContain("never lost");
    });
    // The rescue that clears "some loss precedes" while recovering nothing the
    // player was shown losing — a technicality the shipped bank cleared twice.
    it("refuses a rescue that gets back something other than what was lost", () => {
        const steps = [
            COURIER.steps[0],
            COURIER.steps[1],
            { ...COURIER.steps[2], line: "A truck is recovered from a lot behind the market and driven back across the river before first light.", particulars: [] },
        ];
        expect(message(ResolutionSequenceDef.safeParse(sequence({ ...COURIER, steps })))).toContain("other than what the loss step lost");
    });
    it("refuses a unit affinity on a step that never names a unit", () => {
        const steps = [{ ...REPULSED.steps[0], unitAffinity: { branches: ["air"] } }, REPULSED.steps[1], REPULSED.steps[2]];
        expect(message(ResolutionSequenceDef.safeParse(sequence({ steps })))).toContain("never names one");
    });
    it("refuses a unit affinity no draw could ever satisfy", () => {
        const steps = [
            REPULSED.steps[0],
            { ...REPULSED.steps[1], unitAffinity: { branches: ["cyber"], echelon: "formation" } },
            REPULSED.steps[2],
        ];
        expect(message(ResolutionSequenceDef.safeParse(sequence({ steps })))).toContain("formation scale none of its branches has");
    });
    it("refuses two steps asking the one drawn formation to be two different things", () => {
        const steps = [
            REPULSED.steps[0],
            { ...REPULSED.steps[1], unitAffinity: { branches: ["air"] } },
            { ...REPULSED.steps[2], unitAffinity: { branches: ["army"] } },
        ];
        expect(message(ResolutionSequenceDef.safeParse(sequence({ steps })))).toContain("no single formation can satisfy");
    });
    it("refuses a stand-down the sequence continues past", () => {
        const steps = [{ ...REPULSED.steps[0], kind: "stand-down" }, REPULSED.steps[1], REPULSED.steps[2]];
        expect(message(ResolutionSequenceDef.safeParse(sequence({ steps })))).toContain("keeps going");
    });
    it("refuses a slot the line never uses and a token the step never declared", () => {
        const undeclared = [REPULSED.steps[0], { ...REPULSED.steps[2], particulars: [] }];
        expect(message(ResolutionSequenceDef.safeParse(sequence({ steps: undeclared })))).toContain("without declaring it");
        const unused = [{ ...REPULSED.steps[0], particulars: ["person"] }, REPULSED.steps[2]];
        expect(message(ResolutionSequenceDef.safeParse(sequence({ steps: unused })))).toContain("never uses it");
    });
    it("refuses a strike step that names no formation", () => {
        const steps = [
            REPULSED.steps[0],
            {
                kind: "named-unit-attack",
                line: "The attack goes in against the port before first light and the defenders are slower than expected.",
                outcome: "mixed",
                particulars: [],
            },
            REPULSED.steps[2],
        ];
        expect(message(ResolutionSequenceDef.safeParse(sequence({ steps })))).toContain("has to name");
    });
    it("refuses a real formation or ship in a line", () => {
        const steps = [
            REPULSED.steps[0],
            {
                ...REPULSED.steps[1],
                line: "The 82nd Airborne crosses the start line with the light behind it and the road ahead of it still uncut.",
                particulars: [],
            },
            REPULSED.steps[2],
        ];
        expect(message(ResolutionSequenceDef.safeParse(sequence({ steps })))).toContain("names a real unit");
    });
    it("refuses a one-step sequence and a repeated line", () => {
        expect(ResolutionSequenceDef.safeParse(sequence({ steps: [REPULSED.steps[0]] })).success).toBe(false);
        const repeated = [REPULSED.steps[0], REPULSED.steps[0], REPULSED.steps[2]];
        expect(message(ResolutionSequenceDef.safeParse(sequence({ steps: repeated })))).toContain("repeats a line");
    });
    it("refuses two sequences sharing an id", () => {
        const pack = { id: "fixture-pack", version: 1, sequences: [REPULSED, { ...COURIER, id: REPULSED.id }] };
        expect(message(ResolutionSequencePack.safeParse(pack))).toContain("share an id");
    });
});
describe("sequence keys", () => {
    it("expands rung bands crossed with branches", () => {
        expect(sequenceKeysOf(COURIER).map(resolutionSequenceKey)).toEqual(["covert:mid:partial:any", "covert:high:partial:any"]);
        expect(sequenceKeysOf(REPULSED).map(resolutionSequenceKey)).toEqual(["military:high:failure:repulsed"]);
    });
});
describe("reachability", () => {
    it("enumerates only keys a resolution can emit", () => {
        const keys = SITUATION_KEYS.map(resolutionSequenceKey);
        expect(keys).toContain("military:high:failure:repulsed");
        expect(keys).toContain("diplomatic:low:success:any");
        expect(keys).not.toContain("diplomatic:low:failure:repulsed");
        expect(new Set(keys).size).toBe(keys.length);
    });
    it("passes every reference fixture", () => {
        expect(unreachableSequences(FIXTURE_RESOLUTION_SEQUENCES)).toEqual([]);
    });
    it("catches a branch the instrument has no such thing as", () => {
        const orphan = ResolutionSequenceDef.parse({ ...REPULSED, id: "orphan", instrument: "diplomatic" });
        expect(unreachableSequences([orphan]).map((finding) => finding.id)).toEqual(["orphan"]);
    });
    it("reads coverage the other way, so an unfilled cell is visible", () => {
        expect(uncoveredSituationKeys(FIXTURE_RESOLUTION_SEQUENCES)).toContain("economic:low:success:any");
        expect(uncoveredSituationKeys(FIXTURE_RESOLUTION_SEQUENCES)).not.toContain("military:high:failure:repulsed");
        expect(SITUATION_KEYS.filter((key) => coversKey(COURIER, key)).map(resolutionSequenceKey)).toEqual([
            "covert:mid:partial:any",
            "covert:high:partial:any",
        ]);
    });
});
