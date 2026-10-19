#!/usr/bin/env node
// A paid rule's description has to stay true after the systems it crosses are
// rewritten. This gate is what makes that checkable.
//
// The failure it exists to prevent: a rule says "votes on the administration's
// measures carry", a later wave adds a ninth place a vote is counted, nobody
// routes it through the rule's seam, and the sentence a player paid for is now
// false at one call site nobody will find by reading. So every site in each
// family a rule can cross is classified once, by declaration, in
// scripts/rule-seam-census.json — and a site that is not in that file fails.
//
// Five clauses:
//
//   1. ONE SEAM PER RULE. Every rule in the registry names one declaration as
//      its seam. `ruleValue` is called only from a seam or from a declaration
//      the rule lists as a reader, and a seam helper declared in rules.ts is
//      called only from that rule's declared readers.
//   2. NO FLAG READS. No behavior code reads `isGodMode`, `campaignStatus`,
//      `GodModeState` or `Campaign.rules`. The allowed files are rules.ts,
//      rules-effects.ts, save.ts (the legacy normalization), god-effects.ts (the
//      one writer of the Sandbox marker) and the two state modules that declare
//      the shapes; `campaignStatus` additionally has one allowed behavior
//      reader, state-selectors.ts#isRankable.
//   3. ONE VOTE PATH. Inactive until VOTE-1 lands `voteOn`: see VOTE_1_ACTIVE
//      below. Once active, a call of the counters outside the counter module
//      fails outright rather than merely needing a census line.
//   4. THE CENSUS. Every site the scan finds, in every seam class, is
//      classified in rule-seam-census.json by `path#declaration` — never by
//      line, so moving a function does not reopen a decided site.
//   5. ONE KEY, ONE STOREFRONT. The contracts package declares exactly one
//      entitlement key and one storefront, every paid rule names that key, and
//      every paid rule says what a build without it shows instead.
//
// The scan reads packages/engine/src/**/*.ts as text, tests, fixtures and dist
// excluded, and attributes each hit to its enclosing top-level declaration the
// way verify-foreign-truth.mjs attributes a print to its top-level block.
// Anything else is a line-number census, which goes stale on the first edit.
//
//   node scripts/verify-rule-seams.mjs                 the gate
//   node scripts/verify-rule-seams.mjs --expect <file>  a workstream's own run:
//        `class path#declaration` lines it knows it is adding are reported
//        rather than failing, and any other unclassified site still fails
//   node scripts/verify-rule-seams.mjs <fixture-dir>   the proof's trees:
//        engine/, census.json, contracts.ts
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const expectAt = argv.indexOf("--expect");
const expectFile = expectAt >= 0 ? argv[expectAt + 1] : undefined;
const fixture = argv.find((arg, at) => !arg.startsWith("--") && !(expectAt >= 0 && at === expectAt + 1));
const base = fixture ? path.resolve(fixture) : root;

const ENGINE = fixture ? path.join(base, "engine") : path.join(root, "packages/engine/src");
const CENSUS = fixture ? path.join(base, "census.json") : path.join(root, "scripts/rule-seam-census.json");
const CONTRACTS = fixture ? path.join(base, "contracts.ts") : path.join(root, "packages/contracts/src/entitlements.ts");

/**
 * Clause 3 is active: `voteOn` exists and every chamber decision point routes
 * through it, so there is one vote path to hold. It waited for that — until the
 * counter had one entry point, a call of the old counters outside the counter
 * module was the normal state of the tree rather than a defect.
 *
 * RULE_SEAMS_VOTE_1 is still read so the proof can force the clause on inside a
 * fixture tree whose engine predates the routing.
 */
const VOTE_1_ACTIVE = process.env.RULE_SEAMS_VOTE_1 !== "0";

const COUNTER_MODULES = new Set(["congress.ts", "congress-votes.ts"]);
const COUNTERS = ["countVote", "countVoteAgainst", "countVoteAgainstByCaucus"];
const CONGRESS_GATES = [...COUNTERS, "projectConfirmation", "committeeWouldReport", "clotureWouldSucceed", "floorThreshold"];

// --- Reading the tree --------------------------------------------------------

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", "dist", "__fixtures__"].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, "")).replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Every top-level declaration, in order, with the span it owns. */
function declarationsOf(text) {
  const pattern = /^(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:async\s+)?(function\*?|class|const|let|var|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm;
  const found = [...text.matchAll(pattern)].map((match) => ({
    keyword: match[1].startsWith("function") ? "function" : match[1],
    name: match[2],
    at: match.index,
  }));
  return found.map((decl, index) => ({ ...decl, end: found[index + 1]?.at ?? text.length }));
}

function declarationAt(decls, index) {
  let held;
  for (const decl of decls) {
    if (decl.at > index) break;
    held = decl;
  }
  return held ?? { keyword: "module", name: "(module)", at: 0, end: 0 };
}

/** Every call to `name(`, with its argument list balanced on parentheses. */
function callsTo(text, name) {
  const calls = [];
  for (const match of text.matchAll(new RegExp(`\\b${name}\\(`, "g"))) {
    calls.push({ index: match.index, args: argsAt(text, match.index + match[0].length) });
  }
  return calls;
}

function argsAt(text, from) {
  let depth = 1;
  let end = from;
  while (end < text.length && depth > 0) {
    if (text[end] === "(") depth += 1;
    else if (text[end] === ")") depth -= 1;
    end += 1;
  }
  return text.slice(from, end - 1);
}

/**
 * The object literal an index sits inside, as text. Walks back to the nearest
 * unclosed brace and forward to its partner, so a multi-line effect literal is
 * judged whole rather than by the line its `kind` happens to be on.
 */
function literalAt(text, index) {
  let depth = 0;
  let open = -1;
  for (let at = index; at >= 0; at -= 1) {
    if (text[at] === "}") depth += 1;
    else if (text[at] === "{") {
      if (depth === 0) {
        open = at;
        break;
      }
      depth -= 1;
    }
  }
  if (open < 0) return "";
  let close = open + 1;
  let nesting = 1;
  while (close < text.length && nesting > 0) {
    if (text[close] === "{") nesting += 1;
    else if (text[close] === "}") nesting -= 1;
    close += 1;
  }
  return text.slice(open, close);
}

/** A type member (`readonly kind: "books"`) is a declaration, not a writer. */
function isTypeMember(text, index) {
  const lineStart = text.lastIndexOf("\n", index) + 1;
  return /\breadonly\s*$/.test(text.slice(lineStart, index));
}

function kindLiterals(text, kind) {
  const hits = [];
  for (const match of text.matchAll(new RegExp(`kind:\\s*"${kind}"`, "g"))) {
    if (isTypeMember(text, match.index)) continue;
    hits.push({ index: match.index, literal: literalAt(text, match.index) });
  }
  return hits;
}

const declaredIn = (decls, names) => decls.filter((decl) => names.includes(decl.name));

// --- The seam classes --------------------------------------------------------
//
// One scanner per class. Each returns `{ decl, what }` for every site it finds
// in one file; the caller attaches the class and the file.

const CLASS_SCANS = {
  "congressional-decision": (file, text, decls) => {
    if (COUNTER_MODULES.has(file)) return [];
    const names = [...CONGRESS_GATES, ...(VOTE_1_ACTIVE ? ["voteOn"] : [])];
    return names.flatMap((name) =>
      callsTo(text, name).map((call) => {
        const decl = declarationAt(decls, call.index).name;
        // The gates that are declared outside the counter module are sites in
        // their own right: a rule that fixes a vote has to reach them too.
        return { decl, what: decl === name ? `declares ${name}` : `${name}()` };
      }),
    );
  },

  "us-debt-writer": (file, text, decls) => {
    const sites = [];
    for (const hit of kindLiterals(text, "nationStat")) {
      if (!/setStats[\s\S]*\bdebt\b/.test(hit.literal)) continue;
      sites.push({ decl: declarationAt(decls, hit.index).name, what: 'nationStat literal setting economy.debt' });
    }
    for (const kind of ["books", "debtLimit"]) {
      for (const hit of kindLiterals(text, kind)) {
        sites.push({ decl: declarationAt(decls, hit.index).name, what: `${kind} literal` });
      }
    }
    for (const call of callsTo(text, "bookUsDebt")) {
      sites.push({ decl: declarationAt(decls, call.index).name, what: "bookUsDebt()" });
    }
    return sites;
  },

  "election-settler": (file, text, decls) => {
    const sites = [];
    for (const match of text.matchAll(/\)\s*:\s*(ElectionResult|GovernorRaceResult)\s*\{/g)) {
      sites.push({ decl: declarationAt(decls, match.index).name, what: `constructs ${match[1]}` });
    }
    for (const hit of kindLiterals(text, "termClock")) {
      sites.push({ decl: declarationAt(decls, hit.index).name, what: "termClock literal" });
    }
    for (const hit of kindLiterals(text, "congress")) {
      if (!/\b(?:house|senate)\b/.test(hit.literal)) continue;
      sites.push({ decl: declarationAt(decls, hit.index).name, what: "congress literal seating a chamber" });
    }
    for (const match of text.matchAll(/\b(?:stopReason|reason)\s*:\s*"election"/g)) {
      sites.push({ decl: declarationAt(decls, match.index).name, what: 'produces the "election" stop' });
    }
    return sites;
  },

  "npc-military-path": (file, text, decls) => {
    const sites = [];
    for (const hit of kindLiterals(text, "conflict")) {
      // A conflict *effect* carries the conflict it sets; a feed item merely
      // wears the same word as its kind.
      if (!/\bset\s*:/.test(hit.literal)) continue;
      sites.push({ decl: declarationAt(decls, hit.index).name, what: "conflict effect literal" });
    }
    if (file === "npc-agent.ts" || file === "npc-turn.ts") {
      for (const match of text.matchAll(/\bRUNG_LEVELS\b/g)) {
        const decl = declarationAt(decls, match.index);
        if (decl.keyword !== "function") continue;
        sites.push({ decl: decl.name, what: "enumerates every rung as an NPC candidate" });
      }
    }
    return sites;
  },

  "war-outcome-draw": (file, text, decls) =>
    [...text.matchAll(/\bstream\(\s*"(conflict|conflict-join|war[\w-]*)"/g)].map((match) => ({
      decl: declarationAt(decls, match.index).name,
      what: `stream("${match[1]}", …)`,
    })),

  "cabinet-exit": (file, text, decls) => {
    const sites = [];
    for (const hit of kindLiterals(text, "cabinet")) {
      if (/\bperson\b/.test(hit.literal)) continue;
      sites.push({ decl: declarationAt(decls, hit.index).name, what: "cabinet literal with no person" });
    }
    for (const hit of kindLiterals(text, "person")) {
      if (!/\bchanges\b/.test(hit.literal) || !/\b(?:currentRole|alive)\b/.test(hit.literal)) continue;
      sites.push({ decl: declarationAt(decls, hit.index).name, what: "person literal changing the seat held" });
    }
    for (const name of ["vacates", "appointActing"]) {
      for (const call of callsTo(text, name)) {
        sites.push({ decl: declarationAt(decls, call.index).name, what: `${name}()` });
      }
    }
    return sites;
  },

  "act-price": (file, text, decls) => {
    const names = ["projectCost", "resolveAction", "actCost"];
    const sites = declaredIn(decls, names).map((decl) => ({ decl: decl.name, what: `declares ${decl.name}` }));
    for (const name of names) {
      for (const call of callsTo(text, name)) {
        const decl = declarationAt(decls, call.index).name;
        if (decl === name) continue;
        sites.push({ decl, what: `${name}()` });
      }
    }
    return sites;
  },

  "founding-edge": (file, text, decls) => {
    const names = ["buildInitialRelationships", "applyFoundingDyads"];
    const sites = declaredIn(decls, names).map((decl) => ({ decl: decl.name, what: `declares ${decl.name}` }));
    for (const name of names) {
      for (const call of callsTo(text, name)) {
        const decl = declarationAt(decls, call.index).name;
        if (decl === name) continue;
        sites.push({ decl, what: `${name}()` });
      }
    }
    if (/^founding.*\.ts$/.test(file) || file === "relationship-graph.ts") {
      for (const hit of kindLiterals(text, "relationship")) {
        sites.push({ decl: declarationAt(decls, hit.index).name, what: "relationship effect literal" });
      }
    }
    return sites;
  },

  "npc-actor-slot": (file, text, decls) => {
    const sites = declaredIn(decls, ["npcActorsThisTurn"]).map((decl) => ({ decl: decl.name, what: "declares the slot draw" }));
    for (const call of callsTo(text, "npcActorsThisTurn")) {
      const decl = declarationAt(decls, call.index).name;
      if (decl === "npcActorsThisTurn") continue;
      sites.push({ decl, what: "npcActorsThisTurn()" });
    }
    for (const match of text.matchAll(/\bweek\s*:\s*\{[^}]*\bactors\b/g)) {
      sites.push({ decl: declarationAt(decls, match.index).name, what: "writes the week's actor slots" });
    }
    return sites;
  },

  projection: (file, text, decls) => {
    const named = ["selectDebtTrajectory", "projectFiscalCost", "projectVote", "projectPassage", "projectConfirmation"];
    const sites = declaredIn(decls, named).map((decl) => ({ decl: decl.name, what: `declares ${decl.name}` }));
    for (const call of callsTo(text, "projectWillingness")) {
      const decl = declarationAt(decls, call.index).name;
      if (decl === "projectWillingness") continue;
      sites.push({ decl, what: "projectWillingness()" });
    }
    return sites;
  },
};

// --- Clause 2: the flag readers ---------------------------------------------

const FLAG_ALLOWED_FILES = new Set([
  "rules.ts",
  "rules-effects.ts",
  "save.ts",
  "god-effects.ts",
  "state-feed.ts",
  "state-campaign.ts",
  "state-selectors.ts",
]);
const STATUS_ALLOWED_DECLS = new Set(["rules.ts#campaignStatus", "state-selectors.ts#isRankable"]);
const RULES_RECEIVERS = /\b(?:campaign|state|next|previous|before|after|base|working|c)\.rules\b/g;

function flagReads(file, text, decls) {
  const found = [];
  const note = (index, what, byDeclaration = false) =>
    found.push({ site: `${file}#${declarationAt(decls, index).name}`, what, byDeclaration });
  for (const call of callsTo(text, "isGodMode")) note(call.index, "isGodMode()");
  // `campaignStatus` is held by declaration rather than by file: it has exactly
  // one behavior reader, and allowing the whole of state-selectors.ts would let a
  // second one in beside it.
  for (const call of callsTo(text, "campaignStatus")) note(call.index, "campaignStatus()", true);
  for (const match of text.matchAll(/\bGodModeState\b/g)) {
    const lineStart = text.lastIndexOf("\n", match.index) + 1;
    if (/^import\s+type\b/.test(text.slice(lineStart, match.index))) continue;
    note(match.index, "GodModeState");
  }
  for (const match of text.matchAll(RULES_RECEIVERS)) note(match.index, "Campaign.rules");
  return found.filter((hit) =>
    hit.byDeclaration ? !STATUS_ALLOWED_DECLS.has(hit.site) : !FLAG_ALLOWED_FILES.has(file),
  );
}

// --- The registry, read out of rules.ts as text ------------------------------

function readRegistry(text) {
  const start = text.indexOf("export const RULES");
  if (start < 0) return [];
  const opens = text.indexOf("= {", start);
  if (opens < 0) return [];
  const body = literalAt(text, opens + 3);
  const entries = [];
  for (const match of body.matchAll(/^ {2}"([\w.]+)":\s*\{/gm)) {
    const entry = literalAt(body, match.index + match[0].length);
    const field = (name) => entry.match(new RegExp(`\\b${name}:\\s*"([^"]*)"`))?.[1];
    const readers = entry.match(/\breaders:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
    entries.push({
      id: match[1],
      tier: field("tier"),
      seam: field("seam"),
      entitlement: field("entitlement"),
      locked: entry.match(/\blocked:\s*"([^"]*)"/)?.[1],
      readers: [...readers.matchAll(/"([^"]+)"/g)].map((reader) => reader[1]),
    });
  }
  return entries;
}

/** A seam that is a helper in rules.ts, so its own callers can be held too. */
function seamHelpers(rules) {
  return rules.filter((rule) => rule.seam?.startsWith("rules.ts#")).map((rule) => ({ rule, name: rule.seam.split("#")[1] }));
}

// --- Run ---------------------------------------------------------------------

const files = walk(ENGINE).filter((file) => /\.ts$/.test(file) && !/\.test\.ts$/.test(file));
const scanned = files.map((file) => {
  const text = stripComments(readFileSync(file, "utf8"));
  return { file: path.relative(ENGINE, file), text, decls: declarationsOf(text) };
});

const failures = [];
const notes = [];

if (scanned.length === 0) failures.push(`no engine source at ${path.relative(base, ENGINE)}; the scan root moved`);

// Clause 4 (and 3): every site in every class.
const sites = [];
for (const { file, text, decls } of scanned) {
  for (const [className, scan] of Object.entries(CLASS_SCANS)) {
    for (const hit of scan(file, text, decls)) {
      sites.push({ class: className, site: `${file}#${hit.decl}`, what: hit.what });
    }
  }
}

const census = existsSync(CENSUS) ? JSON.parse(readFileSync(CENSUS, "utf8")) : { sites: [] };
const classified = new Map((census.sites ?? []).map((entry) => [`${entry.class} ${entry.site}`, entry]));
const expected = new Set(
  expectFile && existsSync(path.resolve(expectFile))
    ? readFileSync(path.resolve(expectFile), "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"))
    : [],
);
if (expectFile && !existsSync(path.resolve(expectFile))) failures.push(`--expect ${expectFile}: no such file`);

const seen = new Set();
const unclassified = [];
const announced = [];
for (const site of sites) {
  const key = `${site.class} ${site.site}`;
  if (seen.has(key)) continue;
  seen.add(key);
  if (classified.has(key)) continue;
  (expected.has(key) ? announced : unclassified).push({ ...site, key });
}

for (const site of unclassified) {
  failures.push(`unclassified ${site.class} site: ${site.site} (${site.what}) — classify it in ${path.basename(CENSUS)}`);
}
for (const key of classified.keys()) {
  if (!seen.has(key)) notes.push(`classified site no longer found: ${key} — remove it once its wave has landed`);
}

// Clause 3: one vote path, once VOTE-1 has landed it.
if (VOTE_1_ACTIVE) {
  for (const { file, text, decls } of scanned) {
    if (COUNTER_MODULES.has(file)) continue;
    for (const name of COUNTERS) {
      for (const call of callsTo(text, name)) {
        failures.push(`${file}#${declarationAt(decls, call.index).name} counts a vote itself: go through voteOn`);
      }
    }
  }
}

// Clause 2.
for (const { file, text, decls } of scanned) {
  for (const hit of flagReads(file, text, decls)) {
    failures.push(`${hit.site} reads ${hit.what} directly; ask the rule through its seam`);
  }
}

// Clause 1.
const rulesFile = scanned.find((entry) => entry.file === "rules.ts");
const rules = rulesFile ? readRegistry(rulesFile.text) : [];
if (rules.length === 0) failures.push("the rule registry is empty or unreadable: rules.ts#RULES");
const seams = new Set(rules.map((rule) => rule.seam));
for (const rule of rules) {
  if (!rule.seam) failures.push(`rule "${rule.id}" names no seam`);
  if (rules.filter((other) => other.seam === rule.seam).length > 1) {
    failures.push(`rule "${rule.id}" shares its seam ${rule.seam} with another rule; one seam per rule`);
  }
}
const ruleValueAllowed = new Set([...seams, ...rules.flatMap((rule) => rule.readers), "rules.ts#ruleValue"]);
for (const { file, text, decls } of scanned) {
  for (const call of callsTo(text, "ruleValue")) {
    const site = `${file}#${declarationAt(decls, call.index).name}`;
    if (ruleValueAllowed.has(site)) continue;
    failures.push(`${site} calls ruleValue, and no rule declares it a seam or a reader`);
  }
}
for (const { rule, name } of seamHelpers(rules)) {
  const allowed = new Set([...rule.readers, rule.seam, "rules.ts#ruleValue"]);
  for (const { file, text, decls } of scanned) {
    for (const call of callsTo(text, name)) {
      const site = `${file}#${declarationAt(decls, call.index).name}`;
      if (allowed.has(site) || file === "rules.ts") continue;
      failures.push(`${site} reaches the seam ${name}() for "${rule.id}", which does not declare it a reader`);
    }
  }
}

// Clause 5.
const contracts = existsSync(CONTRACTS) ? readFileSync(CONTRACTS, "utf8") : "";
if (contracts === "") failures.push(`no entitlement contract at ${path.relative(base, CONTRACTS)}`);
const members = (name) => {
  const declared = contracts.match(new RegExp(`export type ${name}\\s*=([^;]*);`))?.[1];
  return declared === undefined ? undefined : [...declared.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
};
const keys = members("EntitlementKey");
const platforms = members("StorePlatform");
if (!keys || keys.length !== 1) failures.push(`EntitlementKey must declare exactly one key (found ${keys?.length ?? "none"})`);
if (!platforms || platforms.length !== 1) {
  failures.push(`StorePlatform must declare exactly one storefront (found ${platforms?.length ?? "none"})`);
}
for (const rule of rules.filter((rule) => rule.tier === "paid")) {
  if (keys && rule.entitlement !== keys[0]) {
    failures.push(`paid rule "${rule.id}" names the key ${JSON.stringify(rule.entitlement)}, not ${JSON.stringify(keys[0])}`);
  }
  if (!rule.locked) failures.push(`paid rule "${rule.id}" has no copy.locked, so a locked control has nothing to say`);
}

// --- Verdict ----------------------------------------------------------------

for (const note of notes) console.log(`verify-rule-seams: NOTE — ${note}`);
for (const site of announced) console.log(`verify-rule-seams: EXPECTED — unclassified ${site.class} site ${site.site} (${site.what})`);

if (failures.length > 0) {
  console.error("verify-rule-seams: FAIL");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
const byClass = Object.keys(CLASS_SCANS)
  .map((name) => `${name} ${[...seen].filter((key) => key.startsWith(`${name} `)).length}`)
  .join(", ");
console.log(
  `verify-rule-seams: OK — ${rules.length} rule(s) on ${seams.size} seam(s); ${seen.size} classified site(s) across ` +
    `${scanned.length} module(s) (${byClass}); one entitlement key, one storefront` +
    `${VOTE_1_ACTIVE ? "" : "; clause 3 (one vote path) is inactive until voteOn lands"}.`,
);
