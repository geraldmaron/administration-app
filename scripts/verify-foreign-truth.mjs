#!/usr/bin/env node
// The fog has to engage, and no screen may print what it hides.
//
// Two findings meet here, and neither can be checked without the other. The
// United States founds with the strongest collection in the dataset, so for a
// long time every government was legible from turn one: the paid read promised
// to show "what your services cannot reach" when there was nothing they could
// not reach. Meanwhile the surfaces printed the engine's own 0..1 composites to
// the percent. The phone app's gate held both halves; the web port dropped it,
// and the country file went back to printing trust, tension and military
// threat as percentages for every government, read or not.
//
// So this gate checks both, in one run:
//
//   1. THE FOG ENGAGES. Found the opening campaign from the built engine. Some
//      foreign governments are unread, some third-party ties are fogged, and
//      the covert contest does not print the target's counter-intelligence,
//      the stat whose whole job is to hide things.
//
//      Membership alone must not open private deliberations. The census checks
//      the same governments with every membership removed, keeping capability
//      and all issued reports fixed. The outside-body ratchet remains: at least
//      a third stay unread, and CHN, RUS, PRK and IRN stay hidden at founding.
//   2. NO SCREEN PRINTS A FOREIGN SCALAR. In apps/web/src and
//      packages/player-core/src, formatRatio / formatPercent / Math.round /
//      toFixed over a relationship's trust, alignment, tension, military
//      threat or trade dependence, a government's collection or
//      counter-intelligence, or one of its eight decision traits, counts as a
//      print, directly or through a local read from one. A print inside a
//      top-level block that consults hasIntelOnNation or hasIntelOnRelationship
//      is gated and does not count. Today's prints are forgiven per file; the
//      ratchet may only shrink (scripts/baselines/ratchet.mjs).
//
//   node scripts/verify-foreign-truth.mjs                    the gate
//   node scripts/verify-foreign-truth.mjs --update-baseline  shrink the baseline
//   node scripts/verify-foreign-truth.mjs <fixture-dir>      the proof's trees:
//        web/, player-core/, census.json (in place of founding), baseline.json
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { holdRatchet } from "./baselines/ratchet.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const base = fixture ? path.resolve(fixture) : root;
const SCAN_ROOTS = fixture ? ["web", "player-core"] : ["apps/web/src", "packages/player-core/src"];
const BASELINE = fixture ? path.join(base, "baseline.json") : path.join(root, "scripts/baselines/foreign-truth.json");
const READ_KEY = "engine:governments-read-at-founding";
const UNREAD_TARGET = 1 / 3;
// The four governments the fog exists for. Named rather than derived from a
// posture field, because which governments the United States cannot simply read
// is a fact about this game's premise, not a fact the dataset computes.
const ADVERSARIES = ["CHN", "RUS", "PRK", "IRN"];
// A government whose trust in the United States reaches this is a friend for
// the report's purposes: the line the country file already reads as trusting.
const FRIEND_TRUST = 0.2;

const SCALARS = [
  "trust", "alignment", "tension", "militaryThreat", "tradeDependence",
  "counterIntel", "intelCapability",
  "aggression", "opportunism", "legalism", "isolationism", "riskTolerance", "vengefulness", "reliability", "transparency",
];
const MEMBER = new RegExp(`\\.(?:${SCALARS.join("|")})\\b`);
const FIGURE_CALLS = ["formatRatio", "formatPercent", "Math.round"];
const FOG_CHECK = /\bhasIntelOn(?:Nation|Relationship)\b/;

// --- 1. The fog engages ------------------------------------------------------

/** The opening campaign's fog, founded the way the founding screen's quick oath founds it. */
async function censusFromEngine() {
  const engine = await import(pathToFileURL(path.join(root, "packages/engine/dist/index.js")).href);
  const { worldDataset } = await import(pathToFileURL(path.join(root, "packages/world/dist/index.js")).href);
  const seed = engine.makeCampaignSeed("foreign-truth-gate");
  const leader = { ...engine.defaultLeaderDraft(), name: "Test President" };
  // The playable nation and the constitution it names: what the seal resolves
  // when the founding leaves both out, which is what the quick oath does.
  const nation = worldDataset.nations.find((entry) => entry.playable);
  const charter = worldDataset.charters.find((entry) => entry.id === nation?.identity.government);
  if (!nation || !charter) return { foreign: 0, read: 0, ties: 0, fogged: 0, collectionFigure: null };
  const pool = engine.generateFoundingPool(seed, worldDataset);
  const slate = engine.draftCabinetCandidates(charter, nation.id, pool);
  const cabinet = Object.fromEntries(Object.entries(slate).map(([role, people]) => [role, people[0].id]));
  const campaign = engine.sealFounding(seed, worldDataset, { cabinet, leader });
  const home = campaign.founding.nation;
  const foreign = Object.keys(campaign.nations).filter((id) => id !== home);
  const unread = foreign.filter((id) => !engine.hasIntelOnNation(campaign, id));
  const ties = Object.values(campaign.relationships).filter((edge) => edge.from !== home && edge.to !== home);
  const collection = unread[0] === undefined
    ? undefined
    : engine.contestBetween(campaign, home, unread[0], "covert")?.layers.find((layer) => layer.id === "collection");
  // Membership categorizes the existing census; it grants no private read.
  const withoutMemberships = {
    ...campaign,
    nations: Object.fromEntries(Object.entries(campaign.nations).map(([id, nation]) =>
      [id, { ...nation, base: { ...nation.base, memberships: [] } }],
    )),
  };
  const compact = foreign.filter((id) => engine.sharesCompact(campaign, id));
  const outside = foreign.filter((id) => !engine.sharesCompact(campaign, id));
  return {
    foreign: foreign.length,
    read: foreign.length - unread.length,
    ties: ties.length,
    fogged: ties.filter((edge) => !engine.hasIntelOnRelationship(campaign, edge)).length,
    collectionFigure: collection?.theirs?.figure ?? null,
    // Kept on the census so the proof can plant a case and so a failure names
    // governments rather than a number that fell.
    compact,
    membershipReads: foreign.filter((id) =>
      engine.hasIntelOnNation(campaign, id) !== engine.hasIntelOnNation(withoutMemberships, id)),
    outside,
    unread,
    readOutside: outside.filter((id) => engine.hasIntelOnNation(campaign, id)),
    adversariesRead: ADVERSARIES.filter((id) => campaign.nations[id] !== undefined && engine.hasIntelOnNation(campaign, id)),
    // The friends the margin leaves dark, by the game's own measure of a friend:
    // the government's trust in the United States in the founding graph. Listed
    // on every run so whoever reads the gate sees who the fog costs.
    friendsDark: unread
      .map((id) => ({ id, trust: engine.selectRelationship(campaign, id, home)?.trust ?? 0 }))
      .filter((friend) => friend.trust >= FRIEND_TRUST)
      .sort((a, b) => b.trust - a.trust || a.id.localeCompare(b.id)),
  };
}

function fogFailures(census) {
  const failures = [];
  if (census.foreign === 0) failures.push("the founded campaign holds no foreign government; a run that checked nothing is not a pass");
  if (census.foreign > 0 && census.read === census.foreign) failures.push("every foreign government is read at founding, so collection buys nothing");
  if (census.ties === 0) failures.push("the founded campaign holds no third-party relationship to gate");
  else if (census.fogged === 0) failures.push(`all ${census.ties} third-party relationships are legible at founding`);
  if ((census.outside ?? []).length === 0) failures.push("every foreign government shares a standing body with the United States; the floor would count nothing");
  if ((census.adversariesRead ?? []).length > 0) {
    failures.push(
      `read at founding: ${census.adversariesRead.join(", ")} — the fog exists for these governments, and a roster that reads them has none`,
    );
  }
  if (!Array.isArray(census.membershipReads)) {
    failures.push("the census has no membership-only access comparison");
  } else if (census.membershipReads.length > 0) {
    failures.push(`membership alone changes private access: ${census.membershipReads.join(", ")}`);
  }
  const outside = (census.outside ?? []).length;
  const unreadOutside = outside - (census.readOutside ?? []).length;
  if (outside > 0 && unreadOutside / outside < UNREAD_TARGET) {
    failures.push(
      `only ${unreadOutside} of ${outside} governments outside a standing body are unread at founding, under the one third ` +
        `the paid read is sold against; ${Math.ceil(outside * UNREAD_TARGET) - unreadOutside} more would have to hide`,
    );
  }
  if (census.collectionFigure === null) failures.push("the covert contest has no collection layer for this gate to read");
  else if (/\d/.test(census.collectionFigure)) {
    failures.push(`the covert contest prints the target's counter-intelligence as "${census.collectionFigure}"`);
  }
  return failures;
}

// --- 2. No screen prints a foreign scalar -------------------------------------

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

/** Every call to `name(`, with its argument list balanced on parentheses. */
function callsTo(text, name) {
  const calls = [];
  for (const match of text.matchAll(new RegExp(`\\b${name.replace(".", "\\.")}\\(`, "g"))) {
    let depth = 1;
    let end = match.index + match[0].length;
    while (end < text.length && depth > 0) {
      if (text[end] === "(") depth += 1;
      else if (text[end] === ")") depth -= 1;
      end += 1;
    }
    calls.push({ index: match.index, args: text.slice(match.index + match[0].length, end - 1) });
  }
  return calls;
}

/** The top-level block (function, component or const) an index falls in, as a text span. */
function enclosingBlock(text, index) {
  const starts = [0, ...[...text.matchAll(/^(?:export\s+)?(?:async\s+)?(?:function\b|const\s+\w+\s*=)/gm)].map((m) => m.index)];
  const start = Math.max(...starts.filter((at) => at <= index));
  const next = starts.find((at) => at > index) ?? text.length;
  return text.slice(start, next);
}

function printsIn(text) {
  const locals = new Set(
    [...text.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+)/g)].filter((m) => MEMBER.test(m[2])).map((m) => m[1]),
  );
  const readsScalar = (args) => MEMBER.test(args) || [...locals].some((name) => new RegExp(`(^|[^.\\w$])${name}\\b`).test(args));
  const hits = [];
  const consider = (index, what) => {
    if (!FOG_CHECK.test(enclosingBlock(text, index))) hits.push({ line: text.slice(0, index).split("\n").length, what });
  };
  for (const name of FIGURE_CALLS) {
    for (const call of callsTo(text, name)) if (readsScalar(call.args)) consider(call.index, `${name}(${call.args.trim()})`);
  }
  for (const match of text.matchAll(new RegExp(`\\.(?:${SCALARS.join("|")})\\s*\\.toFixed\\(`, "g"))) consider(match.index, match[0]);
  return hits;
}

function surfacePrints() {
  const current = {};
  const detail = new Map();
  let corpus = 0;
  const files = SCAN_ROOTS.flatMap((dir) => walk(path.join(base, dir))).filter((file) => /\.(ts|tsx)$/.test(file) && !/\.test\.tsx?$/.test(file));
  for (const file of files) {
    const text = stripComments(readFileSync(file, "utf8"));
    if (MEMBER.test(text)) corpus += 1;
    const hits = printsIn(text);
    if (hits.length === 0) continue;
    const rel = path.relative(base, file);
    current[rel] = hits.length;
    detail.set(rel, hits);
  }
  return { current, detail, corpus };
}

// --- Wire it together --------------------------------------------------------

const censusFile = path.join(base, "census.json");
const census = fixture ? (existsSync(censusFile) ? JSON.parse(readFileSync(censusFile, "utf8")) : null) : await censusFromEngine();
const failures = census ? fogFailures(census) : ["no census to judge: the fixture has no census.json"];
const surface = surfacePrints();
if (surface.corpus === 0) failures.push("no scanned file reads a foreign scalar at all; the scan roots or the scalar names moved");

// The ratchet counts the governments read OUTSIDE a standing body, not every
// government read. The key keeps its name because ratchet.mjs reads a key the
// baseline lacks as allowed 0, so a rename would report as RAISED.
const readOutside = census ? (census.readOutside ?? []).length : 0;
const current = { ...surface.current, ...(census && readOutside > 0 ? { [READ_KEY]: readOutside } : {}) };
const held = holdRatchet({
  label: "verify-foreign-truth",
  repoRoot: root,
  file: BASELINE,
  comment:
    `"${READ_KEY}" is how many governments outside any standing body with the United States the opening campaign ` +
    "reads at founding (it may fall, not rise); reading a compact partner does not move it. " +
    "Every other key is a file that prints a foreign scalar outside a fog check, with how many prints it is forgiven. " +
    "Written by `node scripts/verify-foreign-truth.mjs --update-baseline`; it may only shrink.",
  current,
  update: process.argv.includes("--update-baseline"),
  describe: (key) => `${key}${surface.detail.has(key) ? `  ${surface.detail.get(key).map((hit) => `:${hit.line} ${hit.what}`).join("; ")}` : ""}`,
});

if (failures.length > 0 || !held) {
  console.error("verify-foreign-truth: FAIL");
  for (const failure of failures) console.error(`  - ${failure}`);
  if (!held) console.error("  - see the ratchet lines above: gate the figure behind hasIntelOnNation, or print the word instead.");
  process.exit(1);
}
const outsideCount = census.outside.length;
const unreadOutside = outsideCount - readOutside;
const share = unreadOutside / outsideCount;
console.log(
  `verify-foreign-truth: OK — ${unreadOutside} of ${outsideCount} governments outside a standing body ` +
    `(${(share * 100).toFixed(1)}%) and ${census.fogged} of ${census.ties} third-party ties are unread at founding; ` +
    `all four adversaries are hidden; membership alone grants no private access; the covert board prints no ` +
    `counter-intelligence; ${Object.keys(surface.current).length} file(s) print foreign scalars, none beyond the baseline.`,
);
const friends = census.friendsDark ?? [];
if (friends.length > 0) {
  console.log(
    `verify-foreign-truth: REPORT — ${friends.length} unread government(s) trust the United States at ${FRIEND_TRUST} or more at founding: ` +
      `${friends.map((friend) => `${friend.id} ${friend.trust.toFixed(2)}`).join(", ")}.`,
  );
}
