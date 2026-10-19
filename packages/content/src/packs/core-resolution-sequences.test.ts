import { describe, expect, it } from "vitest";
import { ResolutionSequenceDef, ResolutionSequencePack, resolutionSequenceKey } from "../resolution-beat.js";
import { SITUATION_KEYS, coversKey, unreachableSequences } from "../resolution-beat-reachability.js";
import { CORE_RESOLUTION_SEQUENCES, coreResolutionSequencePack } from "./core-resolution-sequences.js";

const AUTHORED_INSTRUMENTS = ["military", "covert"] as const;

describe("the bundled step sequences ship clean", () => {
  it("every sequence parses as the schema the pipeline validates", () => {
    for (const def of CORE_RESOLUTION_SEQUENCES) {
      expect(() => ResolutionSequenceDef.parse(def), def.id).not.toThrow();
    }
    expect(() => ResolutionSequencePack.parse(coreResolutionSequencePack)).not.toThrow();
  });

  // The repeated way authored content dies here is a document that clears every
  // static rule and answers a situation no campaign produces, so this is
  // measured against the engine's own key space rather than eyeballed.
  it("has no sequence a resolution can never reach", () => {
    expect(unreachableSequences(CORE_RESOLUTION_SEQUENCES)).toEqual([]);
  });

  it("fills every military and covert cell, twice where the draw is hottest", () => {
    const authored = SITUATION_KEYS.filter((key) => AUTHORED_INSTRUMENTS.includes(key.instrument as never));
    const empty = authored.filter((key) => !CORE_RESOLUTION_SEQUENCES.some((def) => coversKey(def, key)));
    expect(empty.map(resolutionSequenceKey)).toEqual([]);

    const hot = authored.filter((key) => key.valence !== "failure");
    for (const key of hot) {
      const count = CORE_RESOLUTION_SEQUENCES.filter((def) => coversKey(def, key)).length;
      expect(count, resolutionSequenceKey(key)).toBeGreaterThanOrEqual(2);
    }
  });

  // A shared graf is how a bank of thirty documents becomes one document told
  // thirty times. The uniqueness that matters is across the whole bank, not
  // inside a single sequence, which the schema already checks.
  it("never repeats a step line anywhere in the bank", () => {
    const lines = CORE_RESOLUTION_SEQUENCES.flatMap((def) => def.steps.map((step) => step.line));
    const seen = new Set<string>();
    const repeated = lines.filter((line) => (seen.has(line) ? true : (seen.add(line), false)));
    expect(repeated).toEqual([]);
  });

  it("leaves the unauthored instruments honestly empty rather than thinly filled", () => {
    const covered = new Set(CORE_RESOLUTION_SEQUENCES.map((def) => def.instrument));
    expect([...covered].sort()).toEqual(["covert", "military"]);
  });
});
