import { CORE_FLAG_VOCABULARY, type ConsequenceCorpusContext, type CorpusContext } from "@admin/content";
import { corpusContext, corpusFlags, corpusPathsFor } from "./shard-store.js";
import { consequenceCorpusContext, consequenceCorpusFlags, consequencePathsFor } from "./consequence-store.js";

// What a run is judged against: both corpora, and — the part that matters —
// each one's flag vocabulary handed to the other's gate.
//
// A chain closes across the two content types, not within one. A scenario
// reply stamps a flag that a consequence card waits on; a card stamps one that
// a later scenario waits on. Each gate asked only about its own corpus would
// refuse both of those as unreachable, and the two rules that would fire —
// flag-condition-never-set and consequence-flag-never-set — are errors, so the
// false rejection is a batch that cannot ship rather than a warning someone
// weighs. Plumbing the vocabularies both ways is what makes cross-corpus
// chains something the harness enforces rather than something it merely
// permits on paper.

export type HarnessCorpus = {
  readonly scenarios: CorpusContext;
  /** Bundled vocabulary plus every flag the consequence corpus stamps. */
  readonly scenarioFlags: readonly string[];
  readonly consequences: ConsequenceCorpusContext;
  /** Bundled vocabulary plus every flag the scenario corpus's replies stamp. */
  readonly consequenceFlags: readonly string[];
};

export async function harnessCorpus(corpusRoot: string): Promise<HarnessCorpus> {
  const scenarioPaths = corpusPathsFor(corpusRoot);
  const consequencePaths = consequencePathsFor(corpusRoot);
  const [scenarios, consequences, writtenByScenarios, writtenByConsequences] = await Promise.all([
    corpusContext(scenarioPaths),
    consequenceCorpusContext(consequencePaths),
    corpusFlags(scenarioPaths),
    consequenceCorpusFlags(consequencePaths),
  ]);
  // Each side reads its own corpus's vocabulary as well as the other's. The
  // cross plumbing above was there from the start; the same-corpus half was
  // not, and only the scenario side suffered for it — consequences already saw
  // `writtenByScenarios`. The effect was that a scenario could never wait on a
  // flag an earlier *scenario* stamped: `flag-condition-never-set` is an error,
  // so the batch was refused outright. That is the whole delayed-callback idea
  // the severity work built `agedAtLeast` for, and it was unreachable across
  // batches. It shows up in the corpus as 165 flags written and 7 read — not
  // writers neglecting memory, but the harness refusing to let them spend it.
  return {
    scenarios,
    scenarioFlags: [...CORE_FLAG_VOCABULARY, ...writtenByConsequences, ...writtenByScenarios],
    consequences,
    consequenceFlags: [...CORE_FLAG_VOCABULARY, ...writtenByScenarios, ...writtenByConsequences],
  };
}
