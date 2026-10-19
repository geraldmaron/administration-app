// A shared way for the resolution-sequence gates to find whatever step
// sequences are actually shipped, without any of them hardcoding the bank's
// export name.
//
// The bank lands as a plain export off packages/content's built index,
// mirroring how the consequence packs already ship (packs/core-consequences.ts,
// bundled at build time rather than drawn from a JSONL corpus). Scanning every
// export for something that parses as a sequence, instead of importing one
// name, means a gate written before the bank exists still finds it the day it
// lands, and the reference fixtures alone keep every gate meaningful today.
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const contentDistIndex = path.join(root, "packages/content/dist/index.js");

/** The content package's built surface, imported once by every caller. */
export async function loadContentModule() {
  return import(contentDistIndex);
}

/**
 * Every `ResolutionSequenceDef` reachable from the module's exports, de-duped
 * by id. Reads a plain array of sequences, a `ResolutionSequencePack`, or both
 * at once — whichever shape the bank ends up exported as.
 */
export function sequencesFromModule(mod) {
  const { ResolutionSequenceDef, ResolutionSequencePack } = mod;
  const found = [];
  for (const value of Object.values(mod)) {
    if (Array.isArray(value) && value.length > 0 && value.every((item) => ResolutionSequenceDef.safeParse(item).success)) {
      found.push(...value);
      continue;
    }
    const asPack = ResolutionSequencePack.safeParse(value);
    if (asPack.success) found.push(...asPack.data.sequences);
  }
  const byId = new Map(found.map((def) => [def.id, def]));
  return [...byId.values()];
}
