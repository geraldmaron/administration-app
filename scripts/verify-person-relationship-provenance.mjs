#!/usr/bin/env node
// Every tie in the person graph is a claim about two people, and the two person
// records have to be able to support it.
//
// What this refuses is a measured history. The graph used to be seated by rules
// that tested for collisions rather than for shared history, and a census of one
// real 5,401-person cast found what that produced. One rule — two people naming
// the same school and ten years apart in age — took 14,318 of 16,203 edges, 88%
// of every tie in the game, all carrying the single sentence "They share an alma
// mater and the senior figure mentored the junior there." The sentence was false
// by construction: a degree spans about four years, so demanding a ten-year age
// gap guaranteed the two were never at that school together, and every one of
// those edges asserted a "there" the same rule had just ruled out. Nothing gated
// on nationality, so 228 ties joined people from different countries who had
// "staffed the same administration". Nothing gated on time, so 39 of 169 career
// ties joined two working lives that never overlapped in a single year. The
// degree histogram was {6: 5401} — a perfectly regular graph, because a floor
// pass kept seating edges until everybody hit the maximum, which made the cap a
// quota. And the retired enum carried a `protege` member no rule ever emitted,
// so the junior half of every mentorship read "Mentor" on their own file.
//
// None of that is visible to a regex. A rule about what a generator PRODUCES can
// only be checked by running it, so this gate builds a real founded cast from
// the built engine, calls `buildPersonNetwork`, and asserts over the graph that
// comes back. That is why it needs a build first: it reads packages/engine/dist
// and packages/world/dist, not their sources.
//
// Eight rules:
//
//   1. REAL ENDPOINTS. Every `from` and `to` names a person in the cast. An edge
//      to an id nobody holds is a dossier row that opens nothing.
//   2. ONE READING PER PAIR. No self-edge, and no unordered pair appears twice.
//      A pair has one shared history; selling it as two different ties is the
//      same fact counted twice on both files.
//   3. MENTOR CHRONOLOGY. `mentor` is the only directional kind — `from` is the
//      senior figure, `to` the junior — so the direction is load-bearing copy:
//      the surface reads "Mentor" at one end and "Protégé" at the other off this
//      one edge. The senior must be strictly older, and where the tie's
//      provenance is a working world, must have entered that world first. A
//      person is the `to` end of at most one mentor edge. This is the rule that
//      would have caught the defect this gate exists for.
//   4. PROVENANCE IS SUPPORTED BY THE DATA. The two people must actually hold
//      what the provenance claims. `education` needs the same `education.school`;
//      `party` needs the same `Person.party` or a shared run in party organizing;
//      every career provenance needs BOTH people to hold a `CareerPost` whose
//      archetype maps to it under `PROVENANCE_OF_ARCHETYPE`, with year spans that
//      genuinely overlap. Provenance is where a tie came from, and a "where" the
//      records cannot show is the alma-mater sentence coming back.
//   5. NATIONALITY. `prior-counterpart` is the only kind that may cross a border,
//      and the only one that must: a counterpart is by definition somebody else's
//      diplomat. Every other tie joins two people of one country.
//   6. BOUNDED. No person carries more ties than a reader can hold, and the bound
//      is asserted on the real cast. The engine's unit test asserts it on a
//      one-person fixture, where it is vacuous, and that vacuity is part of why
//      a perfectly regular graph shipped unnoticed.
//   7. NO DEAD KIND. Every member of `PersonTieKind` is produced on a real cast.
//      Under the retired model four of twelve kinds reached no player, forever,
//      and nothing noticed. A provenance that carries no tie is reported as a
//      census in this gate's own verdict rather than failed — a country whose
//      pools seat no physician deep into a career is a dataset fact, not a bug —
//      but it is counted every run so the silence cannot go quiet.
//   8. REASONS ARE NOT A TEMPLATE. Distinct reason strings as a share of edges.
//      Measured 14,115 distinct of 15,673 on the golden-alpha cast, 90%; the
//      floor is 50%, well under the measurement so ordinary drift does not fail
//      it and far over the nine-string graph this replaced, which scored 0.06%.
//
// What this gate does NOT own. It does not own the schema shape — zod owns that,
// and the generator parses every edge through `PersonConnection` before seating
// it. It does not own which word a surface prints at which end of a mentorship;
// that is the dossier's copy, and its own tests. It does not own whether a tie is
// INTERESTING, only whether it is honest: a rival who should have been read as a
// colleague is a taste question this cannot see. And it does not own determinism
// or cost; the engine's own suite holds those.
//
// Set PERSON_NETWORK_FIXTURE_PATH to a JSON file of `{ people, edges }` to judge
// that graph instead of building a cast — that is how the paired proof puts
// deliberately broken graphs to the same rules in isolation.
import { readFileSync } from "node:fs";
import { buildPersonNetwork } from "../packages/engine/dist/person-network.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding } from "../packages/engine/dist/founding.js";
import { defaultLeaderDraft } from "../packages/engine/dist/leader.js";
import { makeCampaignSeed } from "../packages/engine/dist/rng.js";
import {
  PROVENANCE_OF_ARCHETYPE,
  PersonTieKind,
  TieProvenance,
  defaultFlagDesign,
  worldDataset,
} from "../packages/world/dist/index.js";

/** The cast this gate judges. Fixed so the census in its verdict means the same thing every run. */
const SEED_TEXT = "golden-alpha";

/**
 * The tie ceiling, written here rather than imported.
 *
 * A gate that imports the constant it is checking proves only that the file
 * parses. This is the number a reader can hold on one dossier, stated
 * independently, so a widened cap in the engine has to be argued here too.
 */
const MAX_TIES_PER_PERSON = 6;

/** And a person has a mentor, not four. */
const MAX_MENTORS_PER_PERSON = 1;

/**
 * The share of edges that must carry a reason nobody else carries.
 *
 * Deliberately far below the 90% the real cast measures. A gate that fails on
 * normal drift is a gate somebody deletes, and what this exists to catch is not
 * drift — it is a return to a graph where one sentence speaks for most of the
 * ties in the game.
 */
const REASON_DISTINCTNESS_FLOOR = 0.5;

/**
 * Provenances that carry no tie on this cast, and why each one is a fact about
 * the dataset rather than a hole in the rules.
 *
 * Carried rather than merely counted so the silence has a stated reason, and
 * re-checked in the other direction: a member listed here that has since been
 * reached fails, because a census nobody maintains stops being a census.
 */
const CARRIES_NO_TIE = {
  medicine:
    "the founding pools seat physicians into political seats, not into decade-long shared practice, so no two of them hold overlapping medical posts",
};

/** Beyond this many failures of one rule the list stops teaching and starts scrolling. */
const MAX_SHOWN_PER_RULE = 12;

const failures = [];
let checked = 0;

function fail(rule, message) {
  failures.push({ rule, message });
}

/** A founded cast, the way the game founds one. One is enough; three cost seconds and say the same thing. */
function buildRealCast() {
  const seed = makeCampaignSeed(SEED_TEXT);
  const pool = generateFoundingPool(seed, worldDataset);
  const nation = worldDataset.nations.find((entry) => entry.playable);
  const charter = worldDataset.charters[0];
  const cradle = worldDataset.cradles.find((entry) => entry.startingNeighbors.length > 0);
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
  const people = Object.values(campaign.people)
    .filter((runtime) => runtime.alive !== false)
    .map((runtime) => runtime.base);
  return { people, edges: buildPersonNetwork(people, seed), generated: true };
}

function loadInput() {
  const fixture = process.env.PERSON_NETWORK_FIXTURE_PATH;
  if (fixture === undefined) return buildRealCast();
  const parsed = JSON.parse(readFileSync(fixture, "utf8"));
  return { people: parsed.people ?? [], edges: parsed.edges ?? [], generated: false };
}

const { people, edges, generated } = loadInput();
const byId = new Map(people.map((person) => [person.id, person]));

/**
 * A working life as dated intervals in years-before-now, for one provenance.
 *
 * The same arithmetic the generator's own derivation does, written out rather
 * than imported: a post ran from `age - startAge` years ago to `years` after
 * that, and the difference of two ages is the difference of two birth years, so
 * two lives can be compared without a calendar. Kept as separate intervals
 * because a career that left a world and came back has a gap in it, and one hull
 * would let two people claim years together that one of them spent elsewhere.
 */
function spansUnder(person, provenance) {
  const spans = [];
  for (const post of person.career ?? []) {
    if (PROVENANCE_OF_ARCHETYPE[post.archetype] !== provenance) continue;
    const from = person.age - post.startAge;
    spans.push({ from, to: from - post.years });
  }
  return spans;
}

/** Years two sets of postings actually share, counted across every pair of them. */
function overlapYears(left, right) {
  let total = 0;
  for (const a of left) {
    for (const b of right) total += Math.max(0, Math.min(a.from, b.from) - Math.max(a.to, b.to));
  }
  return total;
}

/** The year, counted backwards from now, that someone first entered a world. */
function enteredAt(spans) {
  return spans.reduce((earliest, span) => Math.max(earliest, span.from), -Infinity);
}

const nameOf = (person, id) => (person === undefined ? id : `${person.name} (${id})`);
const pairOf = (edge) => `${nameOf(byId.get(edge.from), edge.from)} → ${nameOf(byId.get(edge.to), edge.to)}`;

// ---- 1: both ends name somebody in the cast.
for (const edge of edges) {
  checked += 1;
  for (const [end, id] of [
    ["from", edge.from],
    ["to", edge.to],
  ]) {
    if (byId.has(id)) continue;
    fail(
      "real-endpoints",
      `a ${edge.kind} tie names "${id}" as its ${end}, and no such person is in the cast — the dossier would draw a row that opens nothing`,
    );
  }
}

// ---- 2: one reading per pair, and nobody is their own colleague.
const seenPairs = new Map();
for (const edge of edges) {
  checked += 1;
  if (edge.from === edge.to) {
    fail("one-reading-per-pair", `${nameOf(byId.get(edge.from), edge.from)} holds a ${edge.kind} tie to themselves`);
    continue;
  }
  const key = edge.from < edge.to ? `${edge.from}|${edge.to}` : `${edge.to}|${edge.from}`;
  const held = seenPairs.get(key);
  if (held === undefined) {
    seenPairs.set(key, edge);
    continue;
  }
  fail(
    "one-reading-per-pair",
    `${pairOf(edge)} are seated twice — once as ${held.kind} (${held.provenance}) and again as ${edge.kind} ` +
      `(${edge.provenance}) — one shared history sold as two different ties`,
  );
}

// ---- 3: a mentorship runs from the senior figure to the junior one.
const mentorsHeld = new Map();
for (const edge of edges) {
  if (edge.kind !== "mentor") continue;
  checked += 1;
  const senior = byId.get(edge.from);
  const junior = byId.get(edge.to);
  if (senior === undefined || junior === undefined) continue;

  mentorsHeld.set(edge.to, (mentorsHeld.get(edge.to) ?? 0) + 1);

  if (senior.age <= junior.age) {
    fail(
      "mentor-chronology",
      `${pairOf(edge)} runs senior→junior but the senior end is ${senior.age} and the junior end is ${junior.age} — ` +
        "the junior half of this mentorship would read as the mentor on their own file",
    );
  }

  // Schooling carries no dates at all: `Education` records a school and a field,
  // and the only temporal fact about it is the age the first career post began.
  // So a mentorship at a school is held to the age gap alone, and the entry
  // comparison below belongs to the working worlds that do carry spans.
  if (edge.provenance === "education") continue;
  const seniorSpans = spansUnder(senior, edge.provenance);
  const juniorSpans = spansUnder(junior, edge.provenance);
  // Rule 4 reports a provenance neither record can show. Repeating it here would
  // print the same defect twice under two names.
  if (seniorSpans.length === 0 || juniorSpans.length === 0) continue;
  if (enteredAt(seniorSpans) > enteredAt(juniorSpans)) continue;
  fail(
    "mentor-chronology",
    `${pairOf(edge)} claims the senior formed the junior in ${edge.provenance}, but the junior entered that world ` +
      `${enteredAt(juniorSpans)} years ago and the senior only ${enteredAt(seniorSpans)} — the direction is backwards`,
  );
}
for (const [id, count] of mentorsHeld) {
  checked += 1;
  if (count <= MAX_MENTORS_PER_PERSON) continue;
  fail(
    "mentor-chronology",
    `${nameOf(byId.get(id), id)} is the junior end of ${count} mentorships — a person has a mentor, not ${count}`,
  );
}

// ---- 4: the two records hold what the provenance claims.
for (const edge of edges) {
  const a = byId.get(edge.from);
  const b = byId.get(edge.to);
  if (a === undefined || b === undefined) continue;
  checked += 1;

  if (edge.provenance === "education") {
    const school = a.education?.school;
    if (school !== undefined && school === b.education?.school) continue;
    fail(
      "unsupported-provenance",
      `${pairOf(edge)} is a ${edge.kind} tie out of education, but they name ` +
        `"${a.education?.school ?? "no school"}" and "${b.education?.school ?? "no school"}"`,
    );
    continue;
  }

  // Party is the one provenance with two honest sources: a standing shared
  // ticket, which is a current arena rather than a period in the past, and a run
  // in party organizing, which is a working world like any other.
  if (edge.provenance === "party" && a.party !== undefined && a.party === b.party) continue;

  const left = spansUnder(a, edge.provenance);
  const right = spansUnder(b, edge.provenance);
  if (left.length === 0 || right.length === 0) {
    const who = left.length === 0 ? nameOf(a, edge.from) : nameOf(b, edge.to);
    fail(
      "unsupported-provenance",
      `${pairOf(edge)} is a ${edge.kind} tie out of ${edge.provenance}, and ${who} holds no posting there`,
    );
    continue;
  }
  if (overlapYears(left, right) > 0) continue;
  fail(
    "unsupported-provenance",
    `${pairOf(edge)} is a ${edge.kind} tie out of ${edge.provenance}, and their years there never overlapped — ` +
      "the tie asserts a shared time the records rule out",
  );
}

// ---- 5: only a counterpart crosses a border, and a counterpart always does.
for (const edge of edges) {
  const a = byId.get(edge.from);
  const b = byId.get(edge.to);
  if (a === undefined || b === undefined) continue;
  checked += 1;
  const sameCountry = a.nationality === b.nationality;
  if (edge.kind === "prior-counterpart") {
    if (!sameCountry) continue;
    fail(
      "nationality",
      `${pairOf(edge)} are prior counterparts and both hold ${a.nationality} — a counterpart is somebody else's diplomat`,
    );
    continue;
  }
  if (sameCountry) continue;
  fail(
    "nationality",
    `${pairOf(edge)} is a ${edge.kind} tie across ${a.nationality} and ${b.nationality} — only a prior counterpart crosses a border`,
  );
}

// ---- 6: nobody carries more ties than a reader can hold.
const degrees = new Map();
for (const edge of edges) {
  for (const end of [edge.from, edge.to]) degrees.set(end, (degrees.get(end) ?? 0) + 1);
}
for (const [id, degree] of degrees) {
  checked += 1;
  if (degree <= MAX_TIES_PER_PERSON) continue;
  fail(
    "bounded",
    `${nameOf(byId.get(id), id)} carries ${degree} ties, over the ${MAX_TIES_PER_PERSON} a dossier can hold`,
  );
}

// ---- 7: every kind reaches a player, and every silent provenance is accounted for.
const kindCounts = new Map(PersonTieKind.options.map((kind) => [kind, 0]));
const provenanceCounts = new Map(TieProvenance.options.map((provenance) => [provenance, 0]));
for (const edge of edges) {
  if (kindCounts.has(edge.kind)) kindCounts.set(edge.kind, kindCounts.get(edge.kind) + 1);
  if (provenanceCounts.has(edge.provenance)) provenanceCounts.set(edge.provenance, provenanceCounts.get(edge.provenance) + 1);
}
for (const [kind, count] of kindCounts) {
  checked += 1;
  if (count > 0) continue;
  fail(
    "dead-kind",
    `no edge on this graph is a "${kind}" — the kind is declared, the surface has a word for it, and no player will ever see one`,
  );
}
const silentProvenances = [...provenanceCounts].filter(([, count]) => count === 0).map(([provenance]) => provenance);
// Only against the real cast. A fixture is a dozen people, and a census over a
// dozen people is not a census — it would fail every fixture for a reason that
// has nothing to do with what the fixture is testing.
for (const provenance of generated ? Object.keys(CARRIES_NO_TIE) : []) {
  checked += 1;
  if (silentProvenances.includes(provenance)) continue;
  fail(
    "dead-kind",
    `this gate says "${provenance}" carries no tie, and it now carries ${provenanceCounts.get(provenance)} — ` +
      "remove it from CARRIES_NO_TIE in this gate",
  );
}

// ---- 8: the reasons are written per pair, not stamped from a template.
const distinctReasons = new Set(edges.map((edge) => edge.reason)).size;
const distinctShare = edges.length === 0 ? 0 : distinctReasons / edges.length;
if (edges.length > 0) {
  checked += 1;
  if (distinctShare < REASON_DISTINCTNESS_FLOOR) {
    fail(
      "templated-reasons",
      `${distinctReasons} distinct reason(s) across ${edges.length} ties is ${(distinctShare * 100).toFixed(1)}% ` +
        `of the graph, under the ${(REASON_DISTINCTNESS_FLOOR * 100).toFixed(0)}% floor — one sentence is speaking for ` +
        "most of the ties in the game",
    );
  }
}

const where = generated ? `a founded cast on seed "${SEED_TEXT}"` : `the fixture at ${process.env.PERSON_NETWORK_FIXTURE_PATH}`;

if (checked === 0 || people.length === 0 || edges.length === 0) {
  console.error(
    `FAIL: verify-person-relationship-provenance found ${people.length} people and ${edges.length} ties in ${where} ` +
      "— a gate that checked nothing is not a gate.",
  );
  process.exit(1);
}

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} person-relationship violation(s) in ${where}:\n`);
  const byRule = new Map();
  for (const failure of failures) {
    if (!byRule.has(failure.rule)) byRule.set(failure.rule, []);
    byRule.get(failure.rule).push(failure.message);
  }
  for (const [rule, messages] of byRule) {
    console.error(`  ${rule} (${messages.length}):`);
    for (const message of messages.slice(0, MAX_SHOWN_PER_RULE)) console.error(`    ${message}`);
    if (messages.length > MAX_SHOWN_PER_RULE) {
      console.error(`    ...and ${messages.length - MAX_SHOWN_PER_RULE} more`);
    }
  }
  console.error(
    "\nA tie is a claim two person records have to support. Where it came from is read off what both people actually " +
      "did — the same school, the same ticket, a working world whose years genuinely overlap — and a mentorship runs " +
      "from the senior figure to the junior one, because that one edge is what the surface reads 'Mentor' at one end " +
      "and 'Protégé' at the other from. Nothing here is authored: fix the rule in " +
      "packages/engine/src/person-network.ts that seated the tie, rebuild, and run this again.",
  );
  process.exit(1);
}

const kindCensus = [...kindCounts]
  .sort((a, b) => b[1] - a[1])
  .map(([kind, count]) => `${kind} ${count.toLocaleString("en-US")}`)
  .join(" · ");
const crossBorder = kindCounts.get("prior-counterpart");
const silence =
  silentProvenances.length === 0
    ? "every provenance carries at least one"
    : `${silentProvenances.length} of ${TieProvenance.options.length} provenance(s) carry no tie: ${silentProvenances.join(", ")}`;

console.log(
  `OK: ${edges.length.toLocaleString("en-US")} ties over ${people.length.toLocaleString("en-US")} people from ` +
    `${where} — ${kindCensus}; every kind reached, every mentorship running senior→junior with nobody holding two, ` +
    `every provenance carried by both records that name it, ${crossBorder} tie(s) crossing a border and every other ` +
    `tie at home, nobody over ${MAX_TIES_PER_PERSON} ties, ${distinctReasons.toLocaleString("en-US")} distinct reasons ` +
    `(${(distinctShare * 100).toFixed(1)}% of edges, floor ${(REASON_DISTINCTNESS_FLOOR * 100).toFixed(0)}%). ${silence}.`,
);
