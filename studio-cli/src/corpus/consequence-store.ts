import { appendFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  ConsequenceDef,
  ConsequenceInstrument,
  ConsequenceRungBand,
  ConsequenceValence,
  consequenceShingles,
  decodeSignature,
  encodeSignature,
  NearDuplicateIndex,
  type ConsequenceCorpusContext,
} from "@admin/content";
import { corpusPathsFor, FlagEntry, readFlagEntries, type CorpusPaths } from "./shard-store.js";

// The consequence corpus: the scenario corpus's layout, one directory over.
// Shards are keyed by instrument rather than class, and the index carries the
// three fields the coverage matrix reads, but nothing else differs — the paths
// come from the same corpusPathsFor, so the two stores stay the same shape by
// construction rather than by anyone remembering to keep them so.
//
// Where this store does differ from its sibling is the pool it hands the
// audit. Coverage is a property of the whole pool, and a cell is only covered
// if a card in it is unconditioned — neither question can be answered from an
// index, so the context reads bodies. That is affordable here in a way it is
// not for scenarios: the matrix is thirty-six cells deep, not five figures.

const SHARD_LIMIT = 500;

export const ConsequenceSelector = z.object({
  id: z.string().min(1),
  instrument: ConsequenceInstrument,
  rungBands: z.array(ConsequenceRungBand).min(1),
  valence: ConsequenceValence,
  shard: z.string().min(1).optional(),
});
export type ConsequenceSelector = z.infer<typeof ConsequenceSelector>;

const OverlapEntry = z.object({ id: z.string().min(1), bucket: z.string().min(1), sig: z.string().min(1) });

export const ConsequenceCorpusStats = z.object({ consequences: z.number(), shards: z.number() });
export type ConsequenceCorpusStats = z.infer<typeof ConsequenceCorpusStats>;

/** The consequence corpus lives beside the scenario one, under the same root convention. */
export function consequencePathsFor(corpusRoot: string): CorpusPaths {
  return corpusPathsFor(path.join(corpusRoot, "consequences"));
}

async function readJsonl<T>(filePath: string, schema: z.ZodType<T>): Promise<T[]> {
  if (!existsSync(filePath)) return [];
  const out: T[] = [];
  for (const line of (await readFile(filePath, "utf8")).split("\n")) {
    if (line.trim()) out.push(schema.parse(JSON.parse(line)));
  }
  return out;
}

export async function readConsequenceIndex(paths: CorpusPaths): Promise<ConsequenceSelector[]> {
  return readJsonl(paths.indexPath, ConsequenceSelector);
}

/** Every card the corpus holds, read from the shards. */
export async function readConsequenceBodies(paths: CorpusPaths): Promise<ConsequenceDef[]> {
  if (!existsSync(paths.shardsDir)) return [];
  const defs: ConsequenceDef[] = [];
  for (const name of (await readdir(paths.shardsDir)).filter((file) => file.endsWith(".jsonl")).sort()) {
    for (const line of (await readFile(path.join(paths.shardsDir, name), "utf8")).split("\n")) {
      if (line.trim()) defs.push(ConsequenceDef.parse(JSON.parse(line)));
    }
  }
  return defs;
}

export async function readConsequenceOverlapIndex(paths: CorpusPaths): Promise<NearDuplicateIndex> {
  const index = new NearDuplicateIndex();
  for (const entry of await readJsonl(paths.overlapPath, OverlapEntry)) {
    index.addSignature(entry.id, entry.bucket, decodeSignature(entry.sig));
  }
  return index;
}

/** Everything the consequence audit needs to judge a batch against the pool it is joining. */
export async function consequenceCorpusContext(paths: CorpusPaths): Promise<ConsequenceCorpusContext> {
  const [installed, overlapIndex] = await Promise.all([readConsequenceBodies(paths), readConsequenceOverlapIndex(paths)]);
  return { installed, installedIds: installed.map((def) => def.id), overlapIndex };
}

/** Every flag the shipped cards stamp — the scenario gate's half of chain closure. */
export async function consequenceCorpusFlags(paths: CorpusPaths): Promise<readonly string[]> {
  if (existsSync(paths.flagsPath)) return (await readFlagEntries(paths)).flatMap((entry) => entry.sets);
  const bodies = await readConsequenceBodies(paths);
  if (bodies.length === 0) return [];
  await writeConsequenceFlags(paths, bodies);
  return bodies.flatMap((def) => def.sets ?? []);
}

async function writeConsequenceFlags(paths: CorpusPaths, defs: readonly ConsequenceDef[]): Promise<void> {
  await mkdir(paths.root, { recursive: true });
  const lines = defs.map((def) => `${JSON.stringify(FlagEntry.parse({ id: def.id, sets: def.sets ?? [] }))}\n`);
  await writeFile(paths.flagsPath, lines.join(""), "utf8");
}

/** Which shard a new card belongs in: the newest one for its instrument with room. */
async function shardFor(paths: CorpusPaths, instrument: string): Promise<string> {
  await mkdir(paths.shardsDir, { recursive: true });
  const existing = (await readdir(paths.shardsDir)).filter((name) => name.startsWith(`${instrument}-`) && name.endsWith(".jsonl")).sort();
  const newest = existing[existing.length - 1];
  if (!newest) return `${instrument}-000.jsonl`;
  const lines = (await readFile(path.join(paths.shardsDir, newest), "utf8")).split("\n").filter((line) => line.trim()).length;
  if (lines < SHARD_LIMIT) return newest;
  const nextIndex = Number(newest.slice(instrument.length + 1, -".jsonl".length)) + 1;
  return `${instrument}-${String(nextIndex).padStart(3, "0")}.jsonl`;
}

export type ConsequencePublishOutcome = {
  readonly added: readonly string[];
  readonly skipped: readonly string[];
  readonly stats: ConsequenceCorpusStats;
};

/**
 * Append cards to the corpus, updating the index, the sketches and the flag
 * sidecar in the same pass. Ids already present are skipped rather than
 * duplicated, so re-publishing a batch is safe.
 */
export async function publishConsequences(paths: CorpusPaths, defs: readonly ConsequenceDef[]): Promise<ConsequencePublishOutcome> {
  await mkdir(paths.root, { recursive: true });
  const existing = new Set((await readConsequenceIndex(paths)).map((selector) => selector.id));
  const index = new NearDuplicateIndex();

  const added: string[] = [];
  const skipped: string[] = [];
  for (const def of defs) {
    if (existing.has(def.id)) {
      skipped.push(def.id);
      continue;
    }
    const shard = await shardFor(paths, def.instrument);
    const selector: ConsequenceSelector = {
      id: def.id,
      instrument: def.instrument,
      rungBands: def.rungBands,
      valence: def.valence,
      shard,
    };
    await appendFile(path.join(paths.shardsDir, shard), `${JSON.stringify(def)}\n`, "utf8");
    await appendFile(paths.indexPath, `${JSON.stringify(selector)}\n`, "utf8");
    await appendFile(
      paths.overlapPath,
      `${JSON.stringify({
        id: def.id,
        bucket: `${def.instrument}:${def.valence}`,
        sig: encodeSignature(index.signature(consequenceShingles(def))),
      })}\n`,
      "utf8",
    );
    await appendFile(paths.flagsPath, `${JSON.stringify({ id: def.id, sets: def.sets ?? [] })}\n`, "utf8");
    existing.add(def.id);
    added.push(def.id);
  }
  return { added, skipped, stats: await consequenceCorpusStats(paths) };
}

export async function consequenceCorpusStats(paths: CorpusPaths): Promise<ConsequenceCorpusStats> {
  const selectors = await readConsequenceIndex(paths);
  const shards = existsSync(paths.shardsDir) ? (await readdir(paths.shardsDir)).filter((name) => name.endsWith(".jsonl")).length : 0;
  return { consequences: selectors.length, shards };
}

export async function writeConsequenceManifest(paths: CorpusPaths): Promise<void> {
  const stats = await consequenceCorpusStats(paths);
  await writeFile(path.join(paths.root, "manifest.json"), `${JSON.stringify(stats, null, 2)}\n`, "utf8");
}
