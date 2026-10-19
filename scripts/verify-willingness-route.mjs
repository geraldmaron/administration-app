#!/usr/bin/env node
// Every decision an actor who is not the President takes goes through
// `weigh`, and no flat chance decides that an actor acts. This gate is what
// makes that a checked fact rather than a convention eight agents keep.
//
// The failure it exists to prevent: a new module decides that a government
// joins a war, signs a treaty or stages a coup with `stream(...).next() < p`,
// the decision has no terms, the player is shown no reason, and nothing in the
// tree says so. Or it borrows the `"will"` key, which is the one stream a
// weighed decision draws its noise from, and passes a reader who greps for it.
//
// Five clauses:
//
//   1. A BUILDER FOR EVERY QUESTION. Every member of `willingness.ts`'s
//      `Question` union is named by an engine module that imports `weigh` from
//      it, and by a test that asserts the packet's decision; or it sits in
//      scripts/baselines/willingness-pending.json with the key that owns it.
//   2. EVERY DRAW IN AN ACTOR MODULE IS A LISTED HAZARD. A `.stream("<key>"`
//      call in an actor decision module is listed in
//      scripts/baselines/hazard-draws.json by file and key, with its kind and
//      the terms that set its rate. The list may only shrink.
//   3. ONE HOME FOR THE "will" STREAM. Only willingness.ts draws from
//      `stream("will", …)`; the key anywhere else fails.
//   4. THE RETIRED JOIN KEY. `"conflict-join"` appears only while its entry in
//      hazard-draws.json is marked `retiring`.
//   5. TEMPERAMENT THROUGH ONE READER. No actor decision module reads
//      riskTolerance, aggression, isolationism, legalism or reliability off a
//      nation's traits; it asks `liveTemperament`. A module still doing so sits
//      in willingness-pending.json's `temperamentReads` with its owner.
//
// `--closing` (the wave's final gate) additionally requires the pending
// questions and temperament reads to be empty, and every `pending` or
// `retiring` hazard entry to be gone or made `live`.
//
//   node scripts/verify-willingness-route.mjs              the gate
//   node scripts/verify-willingness-route.mjs --closing    the final gate
//   node scripts/verify-willingness-route.mjs <fixture>    the proof's trees:
//        engine/, willingness-pending.json, hazard-draws.json
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const CLOSING = argv.includes("--closing");
const fixture = argv.find((arg) => !arg.startsWith("--"));
const base = fixture ? path.resolve(fixture) : root;

const ENGINE = fixture ? path.join(base, "engine") : path.join(root, "packages/engine/src");
const PENDING = fixture ? path.join(base, "willingness-pending.json") : path.join(root, "scripts/baselines/willingness-pending.json");
const HAZARDS = fixture ? path.join(base, "hazard-draws.json") : path.join(root, "scripts/baselines/hazard-draws.json");

/** The modules that decide whether a government, operator or minister acts. */
const ACTOR_MODULE =
  /^(npc-[\w-]+|war-join|peace|compacts|operators|cabinet[\w-]*|foreign-politics|engagement|world-events[\w-]*|treaty-counterpart|monetary|sovereign-default)\.ts$/;
const TEMPERAMENT_FIELDS = ["riskTolerance", "aggression", "isolationism", "legalism", "reliability"];
const HAZARD_STATUSES = new Set(["live", "pending", "retiring"]);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", "dist", "__fixtures__"].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : entry.name.endsWith(".ts") ? [full] : [];
  });
}

function readJson(file, what) {
  if (!existsSync(file)) {
    console.error(`verify-willingness-route: ${what} is missing (${path.relative(root, file)})`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

const files = walk(ENGINE).map((full) => ({
  rel: path.relative(ENGINE, full).split(path.sep).join("/"),
  name: path.basename(full),
  text: readFileSync(full, "utf8"),
}));
const sources = files.filter((file) => !file.name.endsWith(".test.ts"));
const tests = files.filter((file) => file.name.endsWith(".test.ts"));
const willingness = sources.find((file) => file.rel === "willingness.ts");
if (!willingness) {
  console.error("verify-willingness-route: no willingness.ts in the engine tree");
  process.exit(1);
}

const pending = readJson(PENDING, "the pending list");
const hazards = readJson(HAZARDS, "the hazard list");
const pendingQuestions = pending.questions ?? {};
const pendingReads = pending.temperamentReads ?? {};
const draws = hazards.draws ?? [];
const failures = [];
const notes = [];

// --- Clause 1: a builder and a test for every question -----------------------

function questions(text) {
  const union = text.match(/export type Question\s*=([\s\S]*?);/);
  if (!union) return [];
  return [...union[1].matchAll(/\|\s*"([^"]+)"/g)].map((match) => match[1]);
}

/** A module imports `weigh` (under any alias) from willingness.js. */
function importsWeigh(text) {
  return [...text.matchAll(/import\s*\{([^}]*)\}\s*from\s*"\.\/willingness\.js"/g)].some((match) =>
    match[1].split(",").some((name) => /^\s*weigh(\s+as\s+\w+)?\s*$/.test(name)),
  );
}

for (const question of questions(willingness.text)) {
  const literal = `"${question}"`;
  const builder = sources.some((file) => file !== willingness && file.text.includes(literal) && importsWeigh(file.text));
  const tested = tests.some((file) => file.text.includes(literal) && /\bdecision\b/.test(file.text));
  const owner = pendingQuestions[question];
  if (builder && tested) {
    if (owner) notes.push(`"${question}" has a builder and a test; ${owner} may take it off the pending list.`);
    continue;
  }
  if (owner) continue;
  const missing = [builder ? null : "builder that calls weigh", tested ? null : "test asserting its decision"].filter(Boolean);
  failures.push(`question "${question}" has no ${missing.join(" and no ")}, and is not on the pending list`);
}
for (const question of Object.keys(pendingQuestions)) {
  if (!questions(willingness.text).includes(question)) failures.push(`pending question "${question}" is not a member of Question`);
}

// --- Clauses 2 to 4: the draws ----------------------------------------------

const STREAM_CALL = /\.stream\(\s*"([^"]+)"/g;
const seen = new Set();
for (const file of sources) {
  for (const match of file.text.matchAll(STREAM_CALL)) {
    const key = match[1];
    if (key === "will" && file !== willingness) {
      failures.push(`${file.rel} draws from the "will" stream; only willingness.ts may (use willDraw)`);
      continue;
    }
    if (!ACTOR_MODULE.test(file.name)) continue;
    seen.add(`${file.rel}#${key}`);
    const entry = draws.find((draw) => draw.file === file.rel && draw.key === key);
    if (!entry) {
      failures.push(`${file.rel} draws stream("${key}") in an actor decision module and it is not listed in hazard-draws.json`);
    } else if (!entry.kind || !Array.isArray(entry.terms) || entry.terms.length === 0) {
      failures.push(`hazard-draws.json lists ${file.rel}#${key} without a kind and the terms that set its rate`);
    }
  }
  if (file.text.includes('"conflict-join"')) {
    const retiring = draws.some((draw) => draw.key === "conflict-join" && draw.file === file.rel && draw.status === "retiring");
    if (!retiring) failures.push(`${file.rel} still uses the retired key "conflict-join"`);
  }
}
for (const draw of draws) {
  if (!HAZARD_STATUSES.has(draw.status)) failures.push(`hazard-draws.json: ${draw.file}#${draw.key} has no status of live, pending or retiring`);
  const found = seen.has(`${draw.file}#${draw.key}`);
  if (draw.status === "live" && !found) failures.push(`hazard-draws.json lists ${draw.file}#${draw.key} as live and no such draw exists; remove it`);
  if (CLOSING && draw.status !== "live") failures.push(`closing: ${draw.file}#${draw.key} is still ${draw.status} (${draw.owner})`);
}

// --- Clause 5: temperament through liveTemperament ---------------------------

const FIELD_READ = new RegExp(`\\btraits\\??\\.(${TEMPERAMENT_FIELDS.join("|")})\\b`, "g");
const DESTRUCTURE = /\{([^{}]*)\}\s*=\s*[\w.?[\]]*\btraits\b/g;
for (const file of sources) {
  if (!ACTOR_MODULE.test(file.name)) continue;
  const direct = [...file.text.matchAll(FIELD_READ)].map((match) => match[1]);
  const unpacked = [...file.text.matchAll(DESTRUCTURE)].flatMap((match) =>
    TEMPERAMENT_FIELDS.filter((field) => new RegExp(`\\b${field}\\b`).test(match[1])),
  );
  const fields = [...new Set([...direct, ...unpacked])];
  if (fields.length === 0) {
    if (pendingReads[file.rel]) notes.push(`${file.rel} no longer reads temperament off traits; ${pendingReads[file.rel]} may take it off the pending list.`);
    continue;
  }
  if (!pendingReads[file.rel]) {
    failures.push(`${file.rel} reads ${fields.join(", ")} off a nation's traits; decide from liveTemperament`);
  }
}

if (CLOSING) {
  for (const [question, owner] of Object.entries(pendingQuestions)) failures.push(`closing: question "${question}" is still pending (${owner})`);
  for (const [file, owner] of Object.entries(pendingReads)) failures.push(`closing: ${file} still reads temperament off traits (${owner})`);
}

for (const note of notes) console.log(`NOTE ${note}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.error(`verify-willingness-route: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log(
  `verify-willingness-route: ok (${questions(willingness.text).length} questions, ${Object.keys(pendingQuestions).length} pending; ${draws.length} listed draws${CLOSING ? "; closing" : ""})`,
);
