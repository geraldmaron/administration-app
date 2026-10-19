#!/usr/bin/env node
// A judgment drawn with a level and no cause.
//
// `opinionTargets` folds stability, the wars, prices, jobs, the live
// conditions, the scandal board, the papers and the empty chairs into six
// public judgments, and `selectOpinionCauses` hands every term back ranked,
// with a label a player can read. An approval screen that showed the
// President's own ledger and nothing of what the world did to the number
// taught a player that the world does nothing to it.
//
// Three rules:
//
//   1. EVERY CAUSE HAS WORDS. Each OpinionCauseKey has an OPINION_CAUSE_LABELS
//      entry and every label names a key, so a term cannot ship unnamed.
//   2. NO TERM OUTSIDE THE UNION. Every term the decomposition reports carries
//      a key the union has; the union is what forces a new term to be named.
//   3. A LEVEL IS DRAWN WITH ITS CAUSES. A web or player-core file that draws
//      a judgment's level (it reads selectOpinionReading, the driver tables,
//      the opinion weights or approval itself), and the two places a player
//      reads approval (the Brief's metric screen and its Now strip), must use
//      a cause reader: selectOpinionCauses, opinionCausesFor or heaviestCause,
//      directly or through a player-core export built on one, however many
//      player-core layers deep. Today's drawers without
//      causes are forgiven in scripts/baselines/opinion-causes.json, a ratchet
//      that may only shrink (scripts/baselines/ratchet.mjs).
//
// Whether the cause readers reach a screen at all is verify-engine-
// reachability's question; this gate asks whether a level ever stands alone.
//
//   node scripts/verify-opinion-causes.mjs                    the gate
//   node scripts/verify-opinion-causes.mjs --update-baseline  shrink the baseline
//   node scripts/verify-opinion-causes.mjs <fixture-dir>      the proof's trees:
//        engine/opinion-causes.ts, web/, player-core/, baseline.json
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { holdRatchet } from "./baselines/ratchet.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const base = fixture ? path.resolve(fixture) : root;
const at = (fixturePath, realPath) => path.join(base, fixture ? fixturePath : realPath);
const CAUSES_FILE = at("engine/opinion-causes.ts", "packages/engine/src/opinion-causes.ts");
const WEB = at("web", "apps/web/src");
const PLAYER_CORE = at("player-core", "packages/player-core/src");
const BASELINE = at("baseline.json", "scripts/baselines/opinion-causes.json");
/** Where a player reads approval: the Brief's metric screen, and the Brief's Now strip. Named, because they draw it by metric key. */
// Approval is drawn on the country screen; the metric page that once drew it redirects there.
const NAMED_DRAWERS = [path.join(WEB, "nation/electorate/Topline.tsx"), path.join(WEB, "brief/NowStrip.tsx")];

const LEVEL_READERS = /\b(?:selectOpinionReading|OPINION_DRIVERS|OPINION_DRIVER_MEANINGS|OPINION_WEIGHTS|salientWeights|approvalFor|selectApproval)\b|\bplayer\.opinion\b/;
const CAUSE_READERS = /\b(?:selectOpinionCauses|opinionCausesFor|heaviestCause)\b/;

const failures = [];

// --- 1 and 2: the engine's own vocabulary -------------------------------------

function block(source, label, open) {
  const start = source.indexOf(open);
  if (start === -1) {
    failures.push(`could not find ${label} in ${path.relative(base, CAUSES_FILE)}; this check's anchor needs updating, not skipping`);
    return "";
  }
  const end = source.indexOf(";", start);
  return source.slice(start, end === -1 ? undefined : end);
}

function checkVocabulary() {
  if (!existsSync(CAUSES_FILE)) {
    failures.push(`${path.relative(base, CAUSES_FILE)} is missing; the decomposition moved`);
    return { keys: [], reported: [] };
  }
  const causes = readFileSync(CAUSES_FILE, "utf8");
  const keys = [...block(causes, "the OpinionCauseKey union", "export type OpinionCauseKey =").matchAll(/"([a-zA-Z]+)"/g)].map((m) => m[1]);
  const named = [...block(causes, "OPINION_CAUSE_LABELS", "export const OPINION_CAUSE_LABELS").matchAll(/^\s{2}([a-zA-Z]+):\s*"/gm)].map((m) => m[1]);
  const reported = [...new Set([...causes.matchAll(/key:\s*"([a-zA-Z-]+)"(?:\s*as\s*const)?,/g)].map((m) => m[1]))];
  if (keys.length === 0) failures.push("read no cause keys; the union's shape changed and this gate is checking nothing");
  if (named.length === 0) failures.push("read no cause labels; OPINION_CAUSE_LABELS changed shape and this gate is checking nothing");
  if (reported.length === 0) failures.push("found no reported cause terms; the decomposition changed shape");
  for (const key of keys.filter((k) => !named.includes(k))) failures.push(`cause key "${key}" has no label: a movement the player is given no reason for`);
  for (const label of named.filter((k) => !keys.includes(k))) failures.push(`OPINION_CAUSE_LABELS names "${label}", which is not an OpinionCauseKey`);
  for (const key of reported.filter((k) => !keys.includes(k))) failures.push(`a term is reported under "${key}", which the OpinionCauseKey union does not carry`);
  return { keys, reported };
}

// --- 3: a level is drawn with its causes --------------------------------------

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", "dist", "__fixtures__"].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

/** Source with comments and import statements blanked: naming a reader in either uses nothing. */
function usedText(file) {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/^\s*import\s[^;]*?from\s*["'][^"']+["'];?/gm, " ")
    .replace(/^\s*export\s*(?:type\s*)?(?:\*|\{[^}]*\})\s*from\s*["'][^"']+["'];?/gm, " ");
}

/**
 * Player-core exports built on a cause reader, to a fixed point: a module that
 * uses a cause reader, or uses an export already known to carry one, carries
 * causes for every function it exports. A breakdown that composes the six
 * judgments from `approvalDrivers` draws their causes as surely as
 * `approvalDrivers` does.
 */
function causeCarriers(files) {
  const modules = files.filter((f) => f.startsWith(PLAYER_CORE + path.sep)).map((file) => ({ file, text: usedText(file) }));
  const names = new Set();
  const carrying = new Set();
  let grew = true;
  while (grew) {
    grew = false;
    const carrierUse = names.size === 0 ? null : new RegExp(`\\b(?:${[...names].join("|")})\\b`);
    for (const { file, text } of modules) {
      if (carrying.has(file) || !(CAUSE_READERS.test(text) || carrierUse?.test(text))) continue;
      carrying.add(file);
      grew = true;
      for (const match of text.matchAll(/^export\s+(?:async\s+)?(?:function|const)\s+([A-Za-z_$][\w$]*)/gm)) names.add(match[1]);
    }
  }
  return names;
}

function drawersWithoutCauses() {
  const files = [...walk(WEB), ...walk(PLAYER_CORE)].filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f));
  for (const named of NAMED_DRAWERS) {
    if (!existsSync(named)) failures.push(`${path.relative(base, named)} is gone; re-point this gate at where approval is drawn now`);
  }
  const carriers = causeCarriers(files);
  const carrierUse = carriers.size === 0 ? null : new RegExp(`\\b(?:${[...carriers].join("|")})\\b`);
  const drawers = files.filter((file) => NAMED_DRAWERS.includes(file) || LEVEL_READERS.test(usedText(file)));
  const current = {};
  for (const file of drawers) {
    const text = usedText(file);
    if (CAUSE_READERS.test(text) || carrierUse?.test(text)) continue;
    current[path.relative(base, file)] = 1;
  }
  return { current, drawers: drawers.length };
}

const { keys, reported } = checkVocabulary();
const { current, drawers } = drawersWithoutCauses();
const held = holdRatchet({
  label: "verify-opinion-causes",
  repoRoot: root,
  file: BASELINE,
  comment:
    "Files that draw a public judgment's level (or approval) without any of its causes. Written by " +
    "`node scripts/verify-opinion-causes.mjs --update-baseline`; it may only shrink.",
  current,
  update: process.argv.includes("--update-baseline"),
});

if (failures.length > 0 || !held) {
  console.error("verify-opinion-causes: FAIL");
  for (const failure of failures) console.error(`  - ${failure}`);
  if (!held) console.error("  - draw selectOpinionCauses (or heaviestCause) beside the level; see the ratchet lines above.");
  process.exit(1);
}
console.log(
  `verify-opinion-causes: OK — ${keys.length} cause keys all named, ${reported.length} reported by the model; ` +
    `${drawers} surface(s) draw a level, ${Object.keys(current).length} still without its causes (forgiven, and shrinking).`,
);
