#!/usr/bin/env node
// A minister's past is not in the gift of last week's meeting.
//
// `composeDossier` is not stored. Every section is recomposed from the Person
// record on the way to the screen, which is the right discipline — a save
// carries five numbers rather than five paragraphs per head, and a history
// derived on read can never drift out of agreement with the person. It has one
// consequence nobody costed: any section selected by a reading a campaign can
// WRITE is a section the campaign rewrites.
//
// Exactly one of the five readings moves. `loyaltyShift` folds into the record
// at two hundredths per contested call, so overruling a Secretary is a debit
// against his loyalty. Measured on the shipped build before this gate existed,
// against Charlie Harris, Secretary of the Treasury, authored at 0.56:
//
//   loyalty 0.56  lede:    "Reports every problem upward the same day it appears…"
//   loyalty 0.48  lede:    "Neither backs the leader's big plays nor undercuts
//                           them, and has made a long, uneventful career out of
//                           that exact silence."
//   loyalty 0.30  episode: "Briefed against a principal to three separate
//                           journalists in the same week…"
//
// Four points of loyalty — two overrulings — replaced the career summary his
// file opened on. Twenty-six points replaced an event in his past, dated to
// before the administration existed. The file's authority collapses the first
// time a player notices, and it reads as a bug rather than as a government.
//
// A rule about what a composer PRODUCES under a sweep can only be checked by
// running it, so this gate founds a real cast from the built engine, sweeps
// every person's loyalty across its full range, and asserts over the prose that
// comes back. That is why it needs a build first: it reads packages/engine/dist
// and packages/world/dist, not their sources.
//
// Three rules:
//
//   1. THE PAST HOLDS STILL. Origins, The road here, On the record and
//      Temperament are identical at every loyalty a campaign can reach. These
//      are past-tense assertions about a life, and the only facts allowed to
//      select them are ones no effect can write: education, career, ideology,
//      traits, the person's own id, and the four immutable readings.
//   2. THE PRESENT STILL MOVES. Where they stand is not frozen with them. It is
//      the section loyalty is FOR — a minister overruled through a season really
//      does move from lieutenant to rival — and a gate that locked the whole
//      file would have "fixed" this by deleting the only place a player can see
//      an appointment souring.
//   3. THE STANDING LINE READS A CHAIR, NOT A CAREER. The file's lede is taken
//      from that section, so no line in it may claim a career, a span of years
//      or an event. A sentence that says what somebody HAS DONE, selected by a
//      number two meetings can move, is the same defect wearing a present-tense
//      heading.
//
// What this gate does NOT own. It does not own whether the prose is any good,
// or whether the four quadrants are the right four. It does not own
// `personAssessment`, which reads loyalty deliberately and says so in the
// present tense. And it does not own the card bio: that one is composed once at
// generation and frozen into `Person.bio`, so there is nothing there to drift.
//
// Set BIOGRAPHY_IMMUTABILITY_FIXTURE_PATH to a JSON file of `{ observations }`
// to judge that sweep instead of founding a cast — that is how the paired proof
// puts a deliberately drifting file to the same rules in isolation.
import { readFileSync } from "node:fs";

/** The loyalty a campaign can actually put a minister at, end to end. */
const LOYALTY_SWEEP = [0, 0.1, 0.25, 0.4, 0.5, 0.62, 0.75, 0.9, 1];

/** The sections that assert a life rather than a posting. */
const PAST_HEADINGS = ["Origins", "The road here", "On the record", "Temperament"];

/** The one section that reads the chair. */
const PRESENT_HEADING = "Where they stand";

/**
 * Phrases that make a line a claim about a career rather than about a chair.
 *
 * Written out rather than inferred: this is the exact prose that shipped, and a
 * gate that guessed at tense with a parser would be arguing about grammar
 * instead of about the four sentences that were wrong.
 */
const CAREER_CLAIMS = [
  "career",
  "for six years",
  "three reshuffles",
  "has served three",
  "switched patrons",
  "the better part of a term",
  "was offered the top job once",
  "has turned down two promotions",
  "has been photographed",
];

/** Enough of the cast to be a census rather than an anecdote. */
const SUBJECTS = 120;

const failures = [];

function fail(rule, message) {
  failures.push({ rule, message });
}

async function sweepRealCast() {
  const { composeDossier } = await import("../packages/engine/dist/dossier.js");
  const { draftCabinetCandidates, generateFoundingPool, sealFounding } = await import(
    "../packages/engine/dist/founding.js"
  );
  const { defaultLeaderDraft } = await import("../packages/engine/dist/leader.js");
  const { makeCampaignSeed } = await import("../packages/engine/dist/rng.js");
  const { defaultFlagDesign, worldDataset } = await import("../packages/world/dist/index.js");

  const seed = makeCampaignSeed("lede-drift");
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

  const seated = new Set(Object.values(campaign.player.cabinet));
  const people = Object.values(campaign.people)
    .map((runtime) => runtime.base)
    // The chairs first: a seated minister is the one a player overrules.
    .sort((a, b) => Number(seated.has(b.id)) - Number(seated.has(a.id)))
    .slice(0, SUBJECTS);

  const observations = [];
  for (const person of people) {
    const role = campaign.people[person.id]?.currentRole;
    for (const loyalty of LOYALTY_SWEEP) {
      const sections = composeDossier({ ...person, loyalty }, nation.identity.name, role);
      observations.push({
        person: person.id,
        loyalty,
        sections: Object.fromEntries(sections.map((section) => [section.heading, section.body])),
      });
    }
  }
  return { observations, people: people.length };
}

async function loadSweep() {
  const fixture = process.env.BIOGRAPHY_IMMUTABILITY_FIXTURE_PATH;
  if (fixture === undefined) return sweepRealCast();
  const parsed = JSON.parse(readFileSync(fixture, "utf8"));
  const observations = parsed.observations ?? [];
  return { observations, people: new Set(observations.map((entry) => entry.person)).size };
}

const { observations, people } = await loadSweep();

// Everything below is vacuous on an empty sweep, and a check that measured
// nothing must refuse rather than report green.
if (people < 1) fail("something was checked", "no person was composed");
if (observations.length < 2) fail("something was checked", "fewer than two readings: nothing was swept");

const byPerson = new Map();
for (const entry of observations) {
  byPerson.set(entry.person, [...(byPerson.get(entry.person) ?? []), entry]);
}

let movedPresent = 0;
for (const [person, entries] of byPerson) {
  for (const heading of PAST_HEADINGS) {
    const bodies = new Set(entries.map((entry) => entry.sections?.[heading]).filter((body) => body !== undefined));
    if (bodies.size > 1) {
      const [first, second] = [...bodies];
      fail(
        "the past holds still",
        `${person} / ${heading} is rewritten by loyalty alone — "${first.slice(0, 60)}…" becomes "${second.slice(0, 60)}…"`,
      );
    }
  }
  const standing = new Set(entries.map((entry) => entry.sections?.[PRESENT_HEADING]).filter((body) => body !== undefined));
  if (standing.size > 1) movedPresent += 1;
  for (const line of standing) {
    const claim = CAREER_CLAIMS.find((phrase) => line.toLowerCase().includes(phrase));
    if (claim !== undefined) {
      fail(
        "the standing line reads a chair, not a career",
        `${person} / ${PRESENT_HEADING} claims a career ("${claim}"): ${line}`,
      );
    }
  }
}

if (movedPresent === 0 && byPerson.size > 0) {
  fail(
    "the present still moves",
    `not one of ${byPerson.size} file(s) changed its ${PRESENT_HEADING} line anywhere across the loyalty range — ` +
      "the section loyalty exists to move has been frozen along with the past",
  );
}

const MAX_SHOWN_PER_RULE = 10;

if (failures.length > 0) {
  const byRule = new Map();
  for (const { rule, message } of failures) byRule.set(rule, [...(byRule.get(rule) ?? []), message]);
  console.error(`FAIL: the present is editing the past (${failures.length} finding(s))\n`);
  for (const [rule, messages] of byRule) {
    console.error(`  ${rule}:`);
    for (const message of messages.slice(0, MAX_SHOWN_PER_RULE)) console.error(`    - ${message}`);
    if (messages.length > MAX_SHOWN_PER_RULE) {
      console.error(`    ...and ${messages.length - MAX_SHOWN_PER_RULE} more`);
    }
  }
  console.error(
    "\nA dossier composed on read may only be selected by facts a campaign cannot write. Loyalty is the one reading " +
      "that moves, so it belongs to the present-tense standing line and to nothing else. Fix the selection in " +
      "packages/engine/src/dossier.ts, rebuild, and run this again.",
  );
  process.exit(1);
}

console.log(
  `OK: ${observations.length.toLocaleString("en-US")} composition(s) over ${people} people at ` +
    `${LOYALTY_SWEEP.length} loyalties each — every past-tense section identical end to end, ${movedPresent} file(s) ` +
    `moving their ${PRESENT_HEADING} line, and no standing line claiming a career.`,
);
