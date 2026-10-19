import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { CORE_SCENARIOS } from "@admin/content";

// One index over every scenario that exists anywhere in this checkout —
// bundled into the app, published to the corpus, or still sitting in a
// generation run — reduced to the handful of facts a management surface
// actually filters, sorts and ranks on.
//
// Why an index at all, when the corpus already ships a selector index: the
// selector is what the *game* needs to decide whether a scenario can appear,
// so it deliberately carries no prose. That makes it useless for the question
// an operator asks first — "which scenario is the one about the ferry" — and
// silent on the question they ask second, "what does answering it actually
// do". So the shards are streamed once, reduced to a row each, and held
// against their own mtimes: a five-figure corpus costs one pass per change to
// disk rather than one pass per page view, and no body stays resident.

const CORPUS_DIR = path.join("content", "corpus");
const SHARDS_DIR = path.join(CORPUS_DIR, "shards");

export const TONES = ["conciliatory", "firm", "principled", "evasive", "coercive"];

/**
 * What a reply costs, in the two currencies it is actually denominated in.
 *
 * Treasury is money and runs to three figures; stability, standing and
 * readiness are 0–1 readings and move by hundredths. Adding them produces a
 * number treasury entirely dominates — the first cut of this index printed
 * "±220.12" and ranked every expensive scenario above every consequential one,
 * which is the opposite of what an impact column is for. So they are kept
 * apart: money in money, and the readings summed as points out of a hundred.
 */
function positionStake(commitment) {
  const cost = commitment.cost ?? {};
  const readings = ["stability", "standing", "readiness"].reduce(
    (sum, metric) => sum + Math.abs(cost[metric] ?? 0),
    0,
  );
  return { treasury: Math.abs(cost.treasury ?? 0), points: Math.round(readings * 100) };
}

/**
 * The reduction every source funnels through.
 *
 * `stake` is the loudest branch rather than the average: what makes a scenario
 * consequential is that one of its answers costs something, and averaging that
 * against three cheap ones hides exactly the scenarios worth auditing.
 */
export function rowOf(def, source, origin) {
  const toneMix = Object.fromEntries(TONES.map((tone) => [tone, 0]));
  let stake = 0;
  let treasury = 0;
  let maxRung = 0;
  const flags = new Set();
  for (const reply of def.replies) {
    toneMix[reply.tone] = (toneMix[reply.tone] ?? 0) + 1;
    for (const flag of reply.sets ?? []) flags.add(flag);
    if (reply.commitment.kind === "instrument") {
      maxRung = Math.max(maxRung, reply.commitment.rung);
      continue;
    }
    const cost = positionStake(reply.commitment);
    stake = Math.max(stake, cost.points);
    treasury = Math.max(treasury, cost.treasury);
  }
  const prose = [...def.opening.map((beat) => beat.text), ...def.replies.map((reply) => reply.text)].join(" ");
  return {
    id: def.id,
    subject: def.subject,
    class: def.class,
    cast: def.cast.pick,
    weight: def.weight,
    once: Boolean(def.once),
    conditions: def.conditions.length,
    conditionKinds: [...new Set(def.conditions.map((condition) => condition.kind))],
    beats: def.opening.length,
    branches: def.replies.length,
    words: prose.split(/\s+/).filter(Boolean).length,
    toneMix,
    stake,
    treasury,
    maxRung,
    flags: [...flags],
    boosts: (def.boosts ?? []).length,
    setPiece: Boolean(def.setPiece),
    source,
    origin,
    href: hrefFor(source, origin, def.id),
  };
}

function hrefFor(source, origin, id) {
  if (source === "draft") return `/scenarios/${encodeURIComponent(origin)}/scenario/${encodeURIComponent(id)}`;
  return `/library/${encodeURIComponent(id)}`;
}

async function mtime(filePath) {
  try {
    return `${(await stat(filePath)).mtimeMs}`;
  } catch {
    return "-";
  }
}

async function shardStamp() {
  if (!existsSync(SHARDS_DIR)) return "none";
  const names = (await readdir(SHARDS_DIR)).filter((name) => name.endsWith(".jsonl")).sort();
  const times = await Promise.all(names.map((name) => mtime(path.join(SHARDS_DIR, name))));
  return names.map((name, i) => `${name}:${times[i]}`).join("|");
}

/**
 * Every published body, reduced. Shards are read one at a time and dropped as
 * soon as their rows exist, so peak memory is one shard rather than the corpus.
 */
async function readCorpusRows() {
  if (!existsSync(SHARDS_DIR)) return [];
  const names = (await readdir(SHARDS_DIR)).filter((name) => name.endsWith(".jsonl")).sort();
  const rows = [];
  for (const name of names) {
    const text = await readFile(path.join(SHARDS_DIR, name), "utf8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      // A shard is written by the publisher from already-validated defs, so a
      // line that will not parse is a corrupted artifact worth surfacing as a
      // row rather than an exception that blanks the whole console.
      try {
        rows.push(rowOf(JSON.parse(line), "corpus", name));
      } catch (cause) {
        rows.push(brokenRow(name, cause));
      }
    }
  }
  return rows;
}

function brokenRow(shard, cause) {
  return {
    id: `unparseable in ${shard}`,
    subject: `Unreadable corpus line — ${cause instanceof Error ? cause.message : String(cause)}`,
    class: "—", cast: "—", weight: 0, once: false, conditions: 0, conditionKinds: [],
    beats: 0, branches: 0, words: 0, toneMix: {}, stake: 0, treasury: 0, maxRung: 0, flags: [],
    boosts: 0, setPiece: false, source: "corpus", origin: shard, href: "", broken: true,
  };
}

let cached;

/**
 * The whole index, rebuilt only when the artifacts it was derived from change.
 *
 * Draft rows are supplied by the caller rather than read here: the run views
 * already own job loading, its review protocol and its per-kind parsing, and a
 * second implementation of that in the index is precisely the drift this
 * console has been bitten by before.
 */
export async function scenarioIndex(draftRows = []) {
  const stamp = await shardStamp();
  if (!cached || cached.stamp !== stamp) {
    const bundled = CORE_SCENARIOS.map((def) => rowOf(def, "bundled", "@admin/content"));
    cached = { stamp, rows: [...bundled, ...(await readCorpusRows())] };
  }
  return [...cached.rows, ...draftRows];
}

/** Facet counts for a set of rows, so a filter can say how much it would leave. */
export function tally(rows, pick) {
  const counts = new Map();
  for (const row of rows) {
    const key = pick(row);
    if (key === undefined) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

const MATCHERS = {
  class: (row, value) => row.class === value,
  cast: (row, value) => row.cast === value,
  source: (row, value) => row.source === value,
  gate: (row, value) => (value === "open" ? row.conditions === 0 : row.conditions > 0),
  once: (row, value) => row.once === (value === "yes"),
  condition: (row, value) => row.conditionKinds.includes(value),
};

/** Free text reaches the id and the subject — the two things anyone actually remembers. */
function matchesText(row, needle) {
  return row.id.toLowerCase().includes(needle) || row.subject.toLowerCase().includes(needle);
}

export function filterRows(rows, query) {
  const needle = (query.get("q") ?? "").trim().toLowerCase();
  const active = Object.entries(MATCHERS)
    .map(([param, match]) => [query.get(param) ?? "", match])
    .filter(([value]) => value !== "");
  return rows.filter(
    (row) => (!needle || matchesText(row, needle)) && active.every(([value, match]) => match(row, value)),
  );
}

const SORTS = {
  subject: (a, b) => a.subject.localeCompare(b.subject),
  id: (a, b) => a.id.localeCompare(b.id),
  class: (a, b) => a.class.localeCompare(b.class) || a.subject.localeCompare(b.subject),
  weight: (a, b) => b.weight - a.weight,
  stake: (a, b) => b.stake - a.stake || b.maxRung - a.maxRung,
  treasury: (a, b) => b.treasury - a.treasury,
  reach: (a, b) => b.maxRung - a.maxRung || b.stake - a.stake,
  gate: (a, b) => b.conditions - a.conditions,
  branches: (a, b) => b.branches - a.branches,
  words: (a, b) => b.words - a.words,
};

export const SORT_KEYS = Object.keys(SORTS);

export function sortRows(rows, key) {
  const compare = SORTS[key] ?? SORTS.subject;
  return [...rows].sort(compare);
}
