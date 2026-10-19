// Topic and era-assumption vocabulary, split out of scenario.ts to keep that
// file under its file-size ceiling. Re-exported from scenario.ts so every
// existing import site keeps resolving the same names from the same place.
import { z } from "zod";
import type { ScenarioDef } from "./scenario.js";

/**
 * What a scenario is about, independent of `class` (which desk the week
 * arrives at) and `dilemmaShape` (which argument the room is having). A topic
 * is the subject a retrieval or lifecycle pass filters on — "find every
 * trade scenario" spans several classes (economy, foreign-crisis, scandal)
 * and several shapes, and neither existing axis answers that question alone.
 *
 * Closed for the same reason `class` is: a filter is only useful while every
 * scenario that could carry a value does, in a value some other scenario
 * also carries, so a writer's one-off word is worse than no tag. Chosen by
 * reading the shipped corpus's class distribution and the classes that most
 * often needed splitting by subject (economy alone covers trade, fiscal and
 * labor weeks that a filter would otherwise conflate).
 *
 * Optional, and the corpus is not retagged by this change: an untagged
 * scenario is one nobody has classified yet, not one the field excludes.
 */
export const TOPIC_TAGS = [
  "trade",
  "war",
  "intelligence",
  "judiciary",
  "disaster",
  "labor",
  "health",
  "immigration",
  "energy",
  "tech",
  "scandal",
  "fiscal",
  "diplomacy",
  "security",
  "environment",
  "culture",
  "civil-rights",
  "public-safety",
] as const;
export const ScenarioTopicTag = z.enum(TOPIC_TAGS);
export type ScenarioTopicTag = z.infer<typeof ScenarioTopicTag>;

/**
 * Whether a scenario's briefing can be dealt at any point the game is played,
 * or whether its premise is anchored to a moment that will pass.
 *
 * "evergreen" is the default and needs nothing else: the situation could
 * recur next month or next decade and the writing does not date itself.
 * "dated" is the admission that a scenario leans on a fact with a shelf
 * life — a leader's term, a live negotiation, a technology's current state —
 * and it must carry `staleAfter` so a lifecycle pass has something to check
 * it against; the schema refuses a dated scenario that omits the date, and
 * refuses `staleAfter` on anything still evergreen, because a shelf life on
 * content that does not have one is a claim nobody can act on.
 */
export const ScenarioEraAssumption = z.enum(["evergreen", "dated"]);
export type ScenarioEraAssumption = z.infer<typeof ScenarioEraAssumption>;

// The read side of the optional-with-a-default field above: every scenario
// authored before `eraAssumption` existed reads as evergreen, the same value
// a writer would type explicitly for content with no shelf life.
export function scenarioEra(def: Pick<ScenarioDef, "eraAssumption">): ScenarioEraAssumption {
  return def.eraAssumption ?? "evergreen";
}

// Shape carried by zod's RefinementCtx, narrowed to the one method this
// module calls — importing the real type would pull scenario.ts's whole
// z.object() chain into this module's inference, which is what the split
// exists to avoid.
type EraAssumptionRefinementCtx = {
  addIssue(issue: { code: "custom"; path: (string | number)[]; message: string }): void;
};

/**
 * The two-way coherence check between `eraAssumption` and `staleAfter`,
 * called from `ScenarioDef`'s `superRefine`. Split out with the rest of the
 * era-assumption vocabulary rather than left inline so the two stay next to
 * each other.
 */
export function checkEraAssumptionCoherence(
  def: Pick<ScenarioDef, "eraAssumption" | "staleAfter">,
  ctx: EraAssumptionRefinementCtx,
): void {
  // A shelf life only means something on content that admits it has one.
  // Evergreen content carrying `staleAfter` would be a lifecycle pass acting
  // on a date the writer never actually anchored the scenario to.
  if (def.staleAfter !== undefined && def.eraAssumption !== "dated") {
    ctx.addIssue({
      code: "custom",
      path: ["staleAfter"],
      message: `staleAfter is set but eraAssumption is "${def.eraAssumption}": only dated content may carry a shelf life`,
    });
  }
  // The inverse gap: a scenario that admits it is dated but gives the
  // lifecycle pass no date to check it against is a claim with nothing behind
  // it — the same reason `dilemmaShape` went from optional to required.
  if (def.eraAssumption === "dated" && def.staleAfter === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["staleAfter"],
      message: 'eraAssumption is "dated" but staleAfter is unset — dated content must say when it goes stale',
    });
  }
}

// Same finding-sink shape scenario-audit-cohorts.ts uses: enough for
// auditTopicTags to push a finding without importing scenario-audit.ts's
// concrete ScenarioFinding type, which would create a cycle back to the
// module this rule is run from.
type FindingSink = {
  push(finding: { readonly kind: string; readonly severity: "error" | "warning"; readonly scenario: string; readonly message: string }): void;
};

const KNOWN_TOPIC_TAGS = new Set<string>(TOPIC_TAGS);

export function auditTopicTags(def: Pick<ScenarioDef, "id" | "topics">, sink: FindingSink): void {
  for (const topic of def.topics ?? []) {
    if (KNOWN_TOPIC_TAGS.has(topic)) continue;
    sink.push({
      kind: "topic-tag-unknown",
      severity: "error",
      scenario: def.id,
      message: `topics includes "${topic}", which is not in the closed topic vocabulary (${TOPIC_TAGS.join(", ")})`,
    });
  }
}
