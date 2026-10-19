import { CORE_FLAG_VOCABULARY } from "@admin/content";
import { corpusContext, corpusFlags, corpusPathsFor } from "./shard-store.js";
import { consequenceCorpusContext, consequenceCorpusFlags, consequencePathsFor } from "./consequence-store.js";
export async function harnessCorpus(corpusRoot) {
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
