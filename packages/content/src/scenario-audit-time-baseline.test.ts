import { describe, expect, it } from "vitest";
import { cardPassages } from "./consequence-audit.js";
import { CORE_CONSEQUENCES } from "./packs/core-consequences.js";
import { CORE_RESOLUTION_SEQUENCES } from "./packs/core-resolution-sequences.js";
import { CORE_SCENARIOS } from "./packs/core.js";
import { PILOT_SCENARIOS } from "./packs/pilot.js";
import type { Passage } from "./passage-audit.js";
import type { ScenarioDef } from "./scenario.js";
import { bakedScenarios } from "./__fixtures__/baked-corpus.js";
import { commitTimePassages, timeFindingsIn } from "./scenario-audit-time.js";

// Nothing the player is dealt may flash forward past the week it is in: copy on
// screen the instant a reply is committed names only what is true tonight.

function errorsIn(surface: string, id: string, commitTime: readonly Passage[]): readonly string[] {
  return timeFindingsIn(commitTime)
    .filter((finding) => finding.severity === "error")
    .map((finding) => `${surface}|${id}|${finding.label}|${finding.phrase}`);
}

const scenarioErrors = (surface: string, defs: readonly ScenarioDef[]) =>
  defs.flatMap((def) => errorsIn(surface, def.id, commitTimePassages(def)));

function observedErrors(corpus: readonly ScenarioDef[]): readonly string[] {
  return [
    ...scenarioErrors("corpus", corpus),
    ...scenarioErrors("core", CORE_SCENARIOS),
    ...scenarioErrors("pilot", PILOT_SCENARIOS),
    ...CORE_CONSEQUENCES.flatMap((def) => errorsIn("consequence", def.id, cardPassages(def))),
    ...CORE_RESOLUTION_SEQUENCES.flatMap((def) =>
      errorsIn("resolution", def.id, def.steps.map((step, index) => ({ label: `step[${index}]`, text: step.line }))),
    ),
  ].sort();
}

/**
 * Flash-forwards in shipped copy that a shape added after it shipped now
 * reads. Each is a rewrite owed to the corpus, not an exception: fixing the
 * line and deleting its entry here is the same change.
 */
const SHIPPED_DEBT: readonly string[] = [
];

describe("commit-time framing across what the player is dealt", () => {
  const corpus = bakedScenarios();

  it("reads the shipped corpus, so an empty read cannot pass as a clean one", () => {
    expect(corpus.length).toBeGreaterThan(100);
  });

  it("carries no commit-time flash-forward beyond the debt it shipped with", () => {
    const found = observedErrors(corpus);
    const fresh = found.filter((entry) => !SHIPPED_DEBT.includes(entry));
    expect(fresh, `commit-time flash-forwards:\n${fresh.join("\n")}`).toEqual([]);
  });

  it("names no debt that has been paid, so the list only shrinks", () => {
    const found = observedErrors(corpus);
    expect(SHIPPED_DEBT.filter((entry) => !found.includes(entry))).toEqual([]);
  });
});
