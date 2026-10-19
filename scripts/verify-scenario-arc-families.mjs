#!/usr/bin/env node
// A multi-part story about a foreign country is a family, or the follow-up
// arrives about a country the president never dealt with.
//
// A scenario binds its counterpart by a rule evaluated the week it is drawn:
// "the tensest nation", "a country in this band". That is right for an opener
// and wrong for everything after it, because the ranking moves every week. So
// when scenario A's reply sets a flag and scenario B waits on it, and *both*
// bind a foreign counterpart by a re-ranking rule, the flags say the story
// continued and the fiction is about somebody else. The median wait in the
// shipped corpus is six weeks; tension is re-ranked every one of them.
//
// `family: { id, role }` is the fix that already exists: the opener pins the
// country, and every later member binds to the pin instead of re-ranking.
//
// The rule is deliberately narrower than "either end re-ranks". A domestic
// setter (`pick: none`) claims no foreign country, so a foreign follow-up to it
// introduces one rather than contradicting one; and a domestic follow-up to a
// foreign setter is about home, so binding it to the foreign pin would be the
// error rather than the fix. Both of those are honest today and would be broken
// by a wider rule. What is never honest is two foreign counterparts, chosen by
// two rules, told as one story.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CORPUS_DIR = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, "content/corpus/shards");
const BAKE = path.join(root, "packages/player-core/src/content/bundled-corpus.generated.ts");

/** A cast rule that picks a foreign country by ranking the board this week. */
const RERANKING = new Set(["tensest", "closest", "band", "belligerent", "warCounterpart"]);

/**
 * Pairs an author still owes, each with why a family could not simply be
 * written on. Frozen in the shape of verify-file-size.mjs's LOGIC_DEBT: it can
 * shrink, it cannot grow, and an entry that no longer describes a live pair
 * fails rather than lingering. Keyed setter -> reader.
 */
const ARC_DEBT = {
  "the-tariff-that-answered-a-tariff -> the-ally-wants-advanced-systems": "same flag, second setter",
  "six-at-the-checkpoint -> the-access-we-were-told-was-once": "same flag, second reader",
};

function parseJsonl(body, out) {
  for (const line of body.split("\n")) {
    if (!line.trim()) continue;
    out.push(JSON.parse(line));
  }
}

/**
 * The corpus as it stands. `content/corpus/` is gitignored — it is publish
 * source, not code — so on a machine that has it, it is the record; anywhere
 * else the bake is, because that is the corpus the binary actually deals.
 * Whether those two agree is `verify-bundled-corpus-current`'s job, not this
 * one's, and asking both here would only make one gate fail for the other's
 * reason.
 */
function shardScenarios() {
  const out = [];
  if (existsSync(CORPUS_DIR)) {
    for (const file of readdirSync(CORPUS_DIR).filter((name) => name.endsWith(".jsonl"))) {
      parseJsonl(readFileSync(path.join(CORPUS_DIR, file), "utf8"), out);
    }
    return out;
  }
  if (!existsSync(BAKE)) return out;
  const source = readFileSync(BAKE, "utf8");
  for (const match of source.matchAll(/^ {4}jsonl: (".*"),$/gm)) parseJsonl(JSON.parse(match[1]), out);
  return out;
}

/**
 * The authored packs, which ship as TypeScript and reach a player through the
 * built package. Their absence is a hard failure rather than an empty list: a
 * check that can only see one of the two corpora would report the pack-crossing
 * arcs as settled, which is the opposite of true.
 */
async function packScenarios() {
  const dist = path.join(root, "packages/content/dist/index.js");
  if (!existsSync(dist)) {
    console.error(
      "FAIL: verify-scenario-arc-families cannot read packages/content/dist — build the workspace first. " +
        "Half the corpus is authored TypeScript, and a run that skipped it would call a cross-pack arc settled.",
    );
    process.exit(1);
  }
  const mod = await import(dist);
  return [...(mod.CORE_SCENARIOS ?? []), ...(mod.PILOT_SCENARIOS ?? [])];
}

const defs = [...shardScenarios(), ...(await packScenarios())];

// A run that read nothing proves nothing. The corpus lives outside this
// repository's build, so an empty read is a wrong path rather than a clean tree.
if (defs.length === 0) {
  console.error("FAIL: verify-scenario-arc-families read no scenarios at all — the corpus path is wrong.");
  process.exit(1);
}

const byId = new Map(defs.map((def) => [def.id, def]));
const setters = new Map();
for (const def of defs) {
  for (const reply of def.replies ?? []) {
    for (const flag of reply.sets ?? []) {
      if (!setters.has(flag)) setters.set(flag, new Set());
      setters.get(flag).add(def.id);
    }
  }
}

const foreignByRule = (def) => RERANKING.has(def?.cast?.pick);
const violations = [];
const spent = new Set();
let pairsSeen = 0;

for (const reader of defs) {
  for (const condition of reader.conditions ?? []) {
    if (condition.kind !== "flag" || condition.is !== true) continue;
    for (const setterId of setters.get(condition.flag) ?? []) {
      if (setterId === reader.id) continue;
      const setter = byId.get(setterId);
      if (!foreignByRule(setter) || !foreignByRule(reader)) continue;
      pairsSeen += 1;
      const opener = setter.family;
      const beat = reader.family;
      if (opener && beat && opener.id === beat.id && opener.role === "opener" && beat.role !== "opener") continue;
      const debtKey = `${setterId} -> ${reader.id}`;
      if (debtKey in ARC_DEBT) {
        spent.add(debtKey);
        continue;
      }
      violations.push(
        `"${setterId}" (cast.pick: ${setter.cast.pick}) sets "${condition.flag}", which "${reader.id}" ` +
          `(cast.pick: ${reader.cast.pick}) waits on` +
          (condition.agedAtLeast ? ` for ${condition.agedAtLeast} weeks` : "") +
          " — two countries chosen by two rules, told as one story. Put both in one family: the setter as " +
          "`opener`, the reader as `beat` or `close`.",
      );
    }
  }
}

// Debt that cannot be paid off is a permanent exemption with a deadline
// painted on it. An entry whose pair is now in a family, or no longer exists,
// fails here.
for (const key of Object.keys(ARC_DEBT)) {
  if (spent.has(key)) continue;
  violations.push(`ARC_DEBT forgives "${key}", which is no longer an unfamilied pair — remove the entry`);
}

// The pair shape is the whole subject. If none is found the scan has stopped
// reading whatever the corpus now writes, and a green result means nothing.
if (pairsSeen === 0) {
  console.error(
    "FAIL: verify-scenario-arc-families found no flag pair between two rule-cast foreign scenarios at all — " +
      "the corpus no longer has the shape this check reads, so it can no longer prove anything.",
  );
  process.exit(1);
}

if (violations.length > 0) {
  console.error(`FAIL: ${violations.length} multi-part foreign story/stories are held together by a flag alone:\n`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}

console.log(
  `OK: ${pairsSeen - spent.size} of ${pairsSeen} flag pair(s) between two rule-cast foreign scenarios are bound by a family; ` +
    `${spent.size} are recorded debt.`,
);
