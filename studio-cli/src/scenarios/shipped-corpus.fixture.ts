import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE_FLAG_VOCABULARY } from "@admin/content";
import { bakedFamilyIndex } from "../corpus/player-bundle.js";
import type { HarnessCorpus } from "../corpus/harness-corpus.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * The shipped corpus as a review fixture sees it: the arcs the committed bake
 * opens and closes. Core-pack scenarios open arcs whose closes shipped in the
 * corpus, so a review judged without this reads them as arcs that can only lapse.
 */
export function shippedCorpus(): HarnessCorpus {
  return {
    scenarios: bakedFamilyIndex(REPO_ROOT),
    scenarioFlags: CORE_FLAG_VOCABULARY,
    consequences: {},
    consequenceFlags: CORE_FLAG_VOCABULARY,
  };
}
