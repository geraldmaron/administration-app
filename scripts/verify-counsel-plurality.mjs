#!/usr/bin/env node
// The room the President argues with has to be able to say no.
//
// What this refuses is a measured silence. Cabinet disagreement used to be one
// scalar comparison: the opinion model read exactly three facts about a
// minister — the hawkish/dovish trait, the authoritarian lean, and the cautious
// trait — and exactly two about the decision, its coercion and its odds. It
// read nothing about the minister's department, the subject of the week, or
// what the answer cost. Because only four of roughly thirty role profiles in
// the dataset carry a hawkish or dovish trait, every other minister in the
// government scored an identical, unmovable opinion of every answer the
// President could give.
//
// Measured against the shipped corpus over twenty-five founded campaigns before
// this gate existed:
//
//   conciliatory  for  7%  wary 86%  against  8%
//   evasive       for 42%  wary 51%  against  8%
//   principled    for 93%  wary  3%  against  5%
//   firm          for 96%  wary  4%  against  0%
//   coercive      for 98%  wary  2%  against  0%
//
// Two seats — Defense and Homeland Security — accounted for every `against` in
// the run. Thirteen of sixteen chairs never opposed anything, in any campaign,
// on any register. And on `firm`, the most common register in the corpus, no
// minister of any kind could reach opposition at all: the fantasy beat
// "conflicting advice" did not occur.
//
// None of that is visible to a regex. A rule about what a scoring model
// PRODUCES can only be checked by running it, so this gate founds real
// campaigns from the built engine, walks every reply in the shipped corpus, and
// asserts over the opinions that come back. That is why it needs a build
// first: it reads packages/engine/dist and packages/world/dist, not their
// sources.
//
// Four rules:
//
//   1. EVERY REGISTER DRAWS OPPOSITION. Each of the five tones a scenario may be
//      answered in produces at least one `against` somewhere in the run. This is
//      the rule that would have caught `firm` — 232 of 914 shipped replies, and
//      a cabinet that had never once objected to one.
//   2. HALF THE CABINET CAN OBJECT. At least half the seated chairs are capable
//      of reaching `against` on some reply in the pool. Capability, not seating:
//      the room a player is shown is four voices selected out of the whole
//      cabinet, so a Secretary who would have opposed the course but was never
//      called on is a different fact from a Secretary who cannot oppose
//      anything.
//   3. THE DEPARTMENT IS READ. Opinions carry all three stakes — the chair that
//      would carry the course out, a chair with standing in the week, and a
//      department outside it — and at least one opinion in the run is driven by
//      a departmental reason rather than by temperament or odds. A model that
//      reads only who a person is cannot produce these.
//   4. SOMETHING WAS ACTUALLY CHECKED. A run that founded no campaign, read no
//      corpus or scored no opinion fails rather than reporting green.
//
// What this gate does NOT own. It does not own which minister is right, or
// whether the room's advice is good — that is balance, and the balance harness
// holds it. It does not own the sentence a player reads; the engine emits
// structure and the surface phrases it, and counsel-lines has its own tests. It
// does not own how many voices the room seats, only that the cabinet behind it
// is capable of dissent.
//
// Set COUNSEL_PLURALITY_FIXTURE_PATH to a JSON file of `{ seats, views }` to
// judge that census instead of founding campaigns — that is how the paired
// proof puts a deliberately mute cabinet to the same rules in isolation.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SHARD_DIR = join(ROOT, "content/corpus/shards");
// The authored shards are gitignored, so a fresh checkout (CI) has none. The
// bake is tracked and is what a player is actually dealt, so the census reads
// it when the shards are absent rather than dying before it has checked
// anything.
const BAKE = join(ROOT, "packages/player-core/src/content/bundled-corpus.generated.ts");

/** How many administrations the census is taken over. Enough casts that one unlucky draw cannot decide a rule. */
const CAMPAIGNS = 25;

/** The registers a scenario reply may be written in. Stated here rather than imported: a gate that imports the list it checks proves only that the file parses. */
const REGISTERS = ["conciliatory", "evasive", "principled", "firm", "coercive"];

/** Whose business a course is, as the opinion model names it. */
const STAKES = ["owns", "standing", "outside"];

/** The reasons that come from the department rather than from the person. */
const DEPARTMENT_REASONS = ["department-stake", "crowded-out"];

/** Below this share of seated chairs able to object, the cabinet is decorative. */
const OBJECTING_SEAT_FLOOR = 0.5;

const failures = [];

function fail(rule, message) {
  failures.push({ rule, message });
}

/**
 * Every shipped scenario line: the authored shards when they are on disk,
 * otherwise the shard bodies lifted out of the bake. The bake's emitter writes
 * each body as one `JSON.stringify` literal per line, the same shape
 * verify-shipped-content-parses reads it by.
 */
function shippedScenarioLines() {
  if (existsSync(SHARD_DIR)) {
    console.log("counsel plurality: reading the authored shards under content/corpus/shards");
    return readdirSync(SHARD_DIR)
      .filter((name) => name.endsWith(".jsonl"))
      .flatMap((file) => readFileSync(join(SHARD_DIR, file), "utf8").split("\n"));
  }
  console.log("counsel plurality: content/corpus is absent (it is gitignored); reading the tracked bake instead");
  const source = readFileSync(BAKE, "utf8");
  return [...source.matchAll(/^ {4}jsonl: (".*"),$/gm)].flatMap((match) => JSON.parse(match[1]).split("\n"));
}

function shippedReplies() {
  const rows = [];
  for (const line of shippedScenarioLines()) {
    if (!line.trim()) continue;
    const scenario = JSON.parse(line);
    for (const reply of scenario.replies ?? []) {
      const commitment = reply.commitment ?? {};
      rows.push({
        scenarioClass: scenario.class,
        subject: scenario.subject ?? "",
        tone: reply.tone,
        projection: {
          option: { id: reply.id, tone: reply.tone, text: reply.text ?? "", commitment },
          available: true,
          cost: commitment.cost ?? {},
          risks: [],
          ripples: [],
          rippleVisibility: "always",
        },
      });
    }
  }
  return rows;
}

async function censusFromEngine() {
  const { cabinetViewsOnReply } = await import("../packages/engine/dist/counsel.js");
  const { draftCabinetCandidates, generateFoundingPool, sealFounding } = await import(
    "../packages/engine/dist/founding.js"
  );
  const { defaultLeaderDraft } = await import("../packages/engine/dist/leader.js");
  const { makeCampaignSeed } = await import("../packages/engine/dist/rng.js");
  const { defaultFlagDesign, worldDataset } = await import("../packages/world/dist/index.js");

  const replies = shippedReplies();
  const nation = worldDataset.nations.find((entry) => entry.playable);
  const charter = worldDataset.charters[0];
  const cradle = worldDataset.cradles.find((entry) => entry.startingNeighbors.length > 0);

  const seats = new Set();
  const views = [];
  for (let index = 0; index < CAMPAIGNS; index += 1) {
    const seed = makeCampaignSeed(`counsel-plurality-${index}`);
    const pool = generateFoundingPool(seed, worldDataset);
    const cabinet = Object.fromEntries(
      Object.entries(draftCabinetCandidates(charter, nation.id, pool)).map(([role, people]) => [role, people[0].id]),
    );
    const campaign = sealFounding(seed, worldDataset, {
      nationId: nation.id,
      nationName: nation.identity.name,
      name: "Test President",
      title: "President",
      charterId: charter.id,
      cradleId: cradle.id,
      flag: defaultFlagDesign,
      compactIds: [],
      cabinet,
      leader: { ...defaultLeaderDraft(), name: "Test President" },
    });
    for (const role of Object.keys(campaign.player.cabinet)) {
      if (role !== campaign.founding.leadRole) seats.add(role);
    }
    for (const row of replies) {
      const script = {
        id: `plurality-${index}`,
        counterpart: campaign.founding.nation,
        subject: row.subject,
        opening: [],
        options: [],
        scenarioClass: row.scenarioClass,
      };
      for (const view of cabinetViewsOnReply(campaign, script, row.projection)) {
        if (view.kind !== "counsel") continue;
        views.push({ tone: row.tone, role: view.role, stance: view.stance, stake: view.stake, reason: view.reason });
      }
    }
  }
  return { seats: [...seats], views, replies: replies.length, campaigns: CAMPAIGNS };
}

async function loadCensus() {
  const fixture = process.env.COUNSEL_PLURALITY_FIXTURE_PATH;
  if (fixture === undefined) return censusFromEngine();
  const parsed = JSON.parse(readFileSync(fixture, "utf8"));
  return {
    seats: parsed.seats ?? [],
    views: parsed.views ?? [],
    replies: parsed.replies ?? (parsed.views ?? []).length,
    campaigns: parsed.campaigns ?? 1,
  };
}

const { seats, views, replies, campaigns } = await loadCensus();

// Rule 4 first: everything below is vacuous on an empty census, and a check
// that measured nothing must refuse rather than report green.
if (campaigns < 1) fail("something was checked", "no campaign was founded");
if (replies < 1) fail("something was checked", "no shipped reply was read");
if (seats.length < 1) fail("something was checked", "no seated chair was found in any cabinet");
if (views.length < 1) fail("something was checked", "no opinion was scored");

const opposedByRegister = new Map(REGISTERS.map((tone) => [tone, 0]));
const stanceByRegister = new Map(REGISTERS.map((tone) => [tone, { for: 0, wary: 0, against: 0 }]));
const objectingSeats = new Set();
const stakesSeen = new Set();
const departmentDriven = new Set();

for (const view of views) {
  const tally = stanceByRegister.get(view.tone);
  if (tally) tally[view.stance] = (tally[view.stance] ?? 0) + 1;
  stakesSeen.add(view.stake);
  if (DEPARTMENT_REASONS.includes(view.reason)) departmentDriven.add(view.reason);
  if (view.stance !== "against") continue;
  objectingSeats.add(view.role);
  if (opposedByRegister.has(view.tone)) opposedByRegister.set(view.tone, opposedByRegister.get(view.tone) + 1);
}

for (const tone of REGISTERS) {
  const scored = Object.values(stanceByRegister.get(tone) ?? {}).reduce((sum, count) => sum + count, 0);
  if (scored === 0) {
    fail("every register draws opposition", `no reply written in the ${tone} register was scored at all`);
    continue;
  }
  if (opposedByRegister.get(tone) === 0) {
    fail(
      "every register draws opposition",
      `${scored.toLocaleString("en-US")} opinion(s) on ${tone} replies and not one of them is against`,
    );
  }
}

const objectingShare = seats.length === 0 ? 0 : objectingSeats.size / seats.length;
if (objectingShare < OBJECTING_SEAT_FLOOR) {
  const mute = seats.filter((role) => !objectingSeats.has(role));
  fail(
    "half the cabinet can object",
    `${objectingSeats.size} of ${seats.length} seated chair(s) can reach against; ${mute.length} cannot oppose any ` +
      `reply in the pool: ${mute.slice(0, 12).join(", ")}${mute.length > 12 ? ", …" : ""}`,
  );
}

const missingStakes = STAKES.filter((stake) => !stakesSeen.has(stake));
if (missingStakes.length > 0) {
  fail(
    "the department is read",
    `no opinion in the run carried the ${missingStakes.join(" or ")} stake — the model is not reading which ` +
      "department the decision belongs to",
  );
}
if (departmentDriven.size === 0) {
  fail(
    "the department is read",
    "not one opinion in the run was driven by a departmental reason; every stance came from temperament or odds",
  );
}

if (failures.length > 0) {
  const byRule = new Map();
  for (const { rule, message } of failures) {
    byRule.set(rule, [...(byRule.get(rule) ?? []), message]);
  }
  console.error(`FAIL: the cabinet cannot argue (${failures.length} finding(s))\n`);
  for (const [rule, messages] of byRule) {
    console.error(`  ${rule}:`);
    for (const message of messages) console.error(`    - ${message}`);
  }
  console.error(
    "\nA minister's objection is usually not 'I disagree', it is 'not out of my account'. An opinion model that reads " +
      "only a person's temperament gives every chair without a hawkish or dovish trait the same unmovable view of " +
      "every answer the President can give. Fix the scoring in packages/engine/src/counsel.ts, rebuild, and run this " +
      "again.",
  );
  process.exit(1);
}

const registerCensus = REGISTERS.map((tone) => {
  const tally = stanceByRegister.get(tone);
  const scored = Object.values(tally).reduce((sum, count) => sum + count, 0);
  return `${tone} ${Math.round((100 * tally.against) / scored)}% against`;
}).join(" · ");

console.log(
  `OK: ${views.length.toLocaleString("en-US")} opinion(s) over ${campaigns} founded campaign(s) and ` +
    `${replies.toLocaleString("en-US")} shipped replies — every register draws opposition (${registerCensus}); ` +
    `${objectingSeats.size} of ${seats.length} seated chairs can reach against; all ${STAKES.length} stakes carried ` +
    `and ${departmentDriven.size} of ${DEPARTMENT_REASONS.length} departmental reasons reached.`,
);
