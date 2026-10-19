// The deepest scenario pool a harness can reach without a network.
//
// The offline player mounts the core pack plus every baked shard. The corpus
// mode overlays published disk shards with the same precedence as delivery:
// core, delivered, baked. Both paths use the player's strict shard parser.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "../register-player-core.mjs";
import { CORE_SCENARIOS, memoryPool } from "../../packages/content/dist/index.js";
import type { ScenarioPool } from "../../packages/content/dist/index.js";
const { BUNDLED_SHARDS } = await import("../../packages/player-core/dist/content/bundled-corpus.generated.js");
const { parseShardBody } = await import("../../packages/player-core/dist/content/shard-parser.js");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SHARD_DIR = path.join(ROOT, "content/corpus/shards");

export type PoolName = "corpus" | "bundled";

export type LoadedPool = {
  readonly name: PoolName;
  readonly pool: ScenarioPool;
  readonly size: number;
  /** Lines the strict schema refused — the app drops these silently at runtime. */
  readonly unparseable: number;
};

function readShards(bodies: readonly string[]): { defs: (typeof CORE_SCENARIOS)[number][]; unparseable: number } {
  const defs: (typeof CORE_SCENARIOS)[number][] = [];
  let unparseable = 0;
  for (const body of bodies) {
    const parsed = parseShardBody(body);
    defs.push(...parsed.scenarios);
    unparseable += parsed.drops.length;
  }
  return { defs, unparseable };
}

export function loadPool(name: PoolName): LoadedPool {
  const baked = readShards(BUNDLED_SHARDS.map((shard) => shard.jsonl));
  const delivered = name === "corpus" ? readShards(readdirSync(SHARD_DIR)
    .filter((file) => file.endsWith(".jsonl")).sort()
    .map((file) => readFileSync(path.join(SHARD_DIR, file), "utf8"))) : { defs: [], unparseable: 0 };
  // Core wins over delivery, which wins over the baked version of an id.
  const combined = new Map([...baked.defs, ...delivered.defs, ...CORE_SCENARIOS].map((def) => [def.id, def]));
  const pool = memoryPool([...combined.values()]);
  return { name, pool, size: pool.selectors.length, unparseable: baked.unparseable + delivered.unparseable };
}
