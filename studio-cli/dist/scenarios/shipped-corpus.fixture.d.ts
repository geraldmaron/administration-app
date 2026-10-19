import type { HarnessCorpus } from "../corpus/harness-corpus.js";
/**
 * The shipped corpus as a review fixture sees it: the arcs the committed bake
 * opens and closes. Core-pack scenarios open arcs whose closes shipped in the
 * corpus, so a review judged without this reads them as arcs that can only lapse.
 */
export declare function shippedCorpus(): HarnessCorpus;
