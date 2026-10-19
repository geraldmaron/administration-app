import { markedFlags, type Campaign, type Effect, type EffectPacket, type OpinionDriver, type ScenarioPlace } from "@admin/engine";
import type { CastScenario } from "./scenario-cast.js";
import { scenarioOccurrenceKey } from "./scenario-occurrence.js";
import { storyPlace } from "./scenario-locus.js";
import {
  scenarioAnsweredFlag,
  scenarioFiredFlag,
  type ScenarioClass,
  type ScenarioDef,
  type ScenarioSeverity,
} from "./scenario.js";
import { flagSetFlag } from "./scenario-deed-flags.js";

// What the campaign remembers about a decision it was offered: what was
// decided the last time this document was on the desk, and what it cost to
// leave one undecided. Both are memory rather than casting, which is why they
// are here rather than in `scenario-cast.ts` — that file binds a scenario to
// the board, and neither of these reads the board at all.

/**
 * What the president decided the last time this document was on the desk.
 *
 * `once` is the only thing that stops a scenario returning, and it is set on a
 * minority of the pool, so a term re-offers decisions the president has already
 * taken. A repeat is not in itself wrong — a question can come back — but a
 * repeat that opens as if the week never happened is, and the campaign already
 * holds everything needed to say otherwise: the fired flag, its turn marker,
 * and the door that was taken.
 *
 * Nothing is invented when the record is incomplete. A campaign whose answer
 * predates this stamping carries the fired flag and neither the marker nor the
 * reply, and "you decided this, at some point, somehow" is worse than silence.
 */
export type PriorAnswer = {
  /** The turn the decision was taken. */
  readonly turn: number;
  readonly replyId: string;
  /** The course taken, in the reply's own words. */
  readonly course: string;
};

export function priorAnswer(campaign: Campaign, def: ScenarioDef): PriorAnswer | undefined {
  if (campaign.player.flags[scenarioFiredFlag(def.id)] !== true) return undefined;
  const taken = def.replies.filter(
    (reply) => campaign.player.flags[scenarioAnsweredFlag(def.id, reply.id)] === true,
  );
  if (taken.length === 0) return undefined;
  // Newest first: a scenario answered twice is reported at the most recent
  // week, which is the one a player would be reminded of.
  for (let turn = campaign.turn; turn >= 0; turn -= 1) {
    for (const reply of taken) {
      if (campaign.player.flags[flagSetFlag(scenarioAnsweredFlag(def.id, reply.id), turn)] !== true) continue;
      return { turn, replyId: reply.id, course: reply.text };
    }
  }
  return undefined;
}

/**
 * The record that a week was allowed to pass on this document.
 *
 * Durable and marked, so a later scenario can be written against the thing
 * nobody decided the same way it is written against a decision.
 */
export function scenarioUnansweredFlag(id: string): string {
  return `scenario-unanswered:${id}`;
}

/**
 * What not deciding costs, by how loud the week was.
 *
 * A government is read on whether it governs, so every severity moves
 * `competence` and only `competence` is universal — the second driver is what
 * the particular week was about. The figures sit in the same range as the
 * impact model's own opinion movements, which is the calibration that matters:
 * an unanswered critical week has to read as heavier than an answered routine
 * one, or a president learns to let the loud weeks pass.
 */
export const INACTION_COMPETENCE: Readonly<Record<ScenarioSeverity, number>> = {
  routine: -0.022,
  serious: -0.06,
  critical: -0.13,
};

/** The record that a week ended with a document still on the desk. */
export function deskDriftFlag(turn: number): string {
  return `desk-unanswered:${turn}`;
}

/** How many weeks back the public reads a pattern rather than a lapse. */
const DRIFT_WINDOW = 12;

/**
 * How much a full window of unanswered weeks multiplies the reading, above the
 * first one.
 *
 * A public forgives a missed week and does not forgive a government that never
 * decides, and without this the two cost the same. Flat, the penalty had to be
 * set high enough to punish a whole term of silence, which made one accidental
 * miss read as a catastrophe; compounding lets an isolated lapse stay a lapse
 * and still leaves a term of drift measurably worse than any way of governing.
 */
const DRIFT_COMPOUND = 1.5;

function driftMultiplier(campaign: Campaign): number {
  let drifted = 0;
  for (let back = 1; back <= DRIFT_WINDOW; back += 1) {
    const turn = campaign.turn - back;
    if (turn < 0) break;
    if (campaign.player.flags[deskDriftFlag(turn)] === true) drifted += 1;
  }
  return 1 + (drifted / DRIFT_WINDOW) * DRIFT_COMPOUND;
}

/**
 * How far the week's own subject moves when nobody answers it, as a share of
 * the competence reading. A collapsed hospital system and a summit gone wrong
 * are not the same silence.
 */
const INACTION_SUBJECT: Readonly<Record<ScenarioClass, OpinionDriver>> = {
  tragedy: "services",
  terror: "security",
  unrest: "unity",
  disaster: "services",
  "public-health": "services",
  migration: "security",
  "foreign-crisis": "security",
  war: "security",
  espionage: "security",
  hostage: "security",
  technology: "security",
  economy: "prosperity",
  scandal: "integrity",
  justice: "integrity",
  institution: "integrity",
  culture: "unity",
  death: "unity",
  triumph: "unity",
};

/** The subject driver moves alongside competence at this share of it. */
const SUBJECT_SHARE = 0.6;

/**
 * What a week of drift takes off the country's own footing, per severity.
 *
 * Stability rather than treasury: not deciding is free in money, and that is
 * the whole reason abstention had to be priced somewhere else.
 */
const INACTION_STABILITY: Readonly<Record<ScenarioSeverity, number>> = {
  routine: -0.004,
  serious: -0.011,
  critical: -0.024,
};

/** A serious week nobody answered is reported; a routine one is not. */
const REPORTED_SEVERITIES: ReadonlySet<ScenarioSeverity> = new Set<ScenarioSeverity>(["serious", "critical"]);

function inactionOpinion(def: ScenarioDef, scale: number): Partial<Record<OpinionDriver, number>> {
  const competence = INACTION_COMPETENCE[def.severity] * scale;
  const deltas: { -readonly [K in OpinionDriver]?: number } = { competence };
  const subject = INACTION_SUBJECT[def.class];
  deltas[subject] = (deltas[subject] ?? 0) + competence * SUBJECT_SHARE;
  return deltas;
}

/**
 * What the week is remembered as. The authored sentence where there is one —
 * every shipped shard carries it, and the schema does not require it — and the
 * document itself where there is not, because a scenario that authored no
 * price for silence still has to be charged one.
 */
function inactionNarration(cast: CastScenario): string {
  const authored = cast.def.context?.inaction?.trim();
  return authored && authored.length > 0
    ? authored
    : `The week ended with ${cast.script.subject.toLowerCase()} still on the desk, and nobody took a decision on it.`;
}

/**
 * The wire's own record of the week. `drift` is the kind the feed already has
 * for time passing without a decision, and until now nothing produced one —
 * the article bank has written for it since it was added.
 */
function inactionFeed(cast: CastScenario, turn: number): readonly Effect[] {
  if (cast.report || (cast.matter && !cast.matter.public)) return [];
  if (!REPORTED_SEVERITIES.has(cast.def.severity)) return [];
  return [
    {
      kind: "feed",
      items: [
        {
          turn,
          kind: "drift",
          visibility: "public",
          headline: `${cast.script.subject} — the week ended with no decision`,
          facts: { subject: cast.script.subject, stake: inactionNarration(cast) },
        },
      ],
    },
  ];
}

function inactionEffects(campaign: Campaign, cast: CastScenario): readonly Effect[] {
  const turn = campaign.turn;
  const scale = driftMultiplier(campaign);
  return [
    { kind: "opinion", deltas: inactionOpinion(cast.def, scale) },
    { kind: "metric", deltas: { stability: INACTION_STABILITY[cast.def.severity] * scale } },
    // The scenario's own record is a dated deed a later callback can wait on;
    // the week's is its own timestamp, and is what the next drifting week
    // counts back over.
    { kind: "flag", set: [...markedFlags([...new Set([scenarioUnansweredFlag(cast.def.id), scenarioUnansweredFlag(scenarioOccurrenceKey(cast))])], turn), deskDriftFlag(turn)] },
    ...inactionFeed(cast, turn),
    ...unansweredClose(cast, turn),
  ];
}

// A close left on the desk still ends the arc: the story was put in front of
// the President and it finished without an answer, which is what a lapse is.
function unansweredClose(cast: CastScenario, turn: number): readonly Effect[] {
  const family = cast.def.family;
  if (family?.role !== "close") return [];
  return [{ kind: "scenarioFamily", close: { family: family.id, turn, disposition: "lapsed" } }];
}

/**
 * The week ending with the document still on the desk, as a packet.
 *
 * Every scenario authors `context.inaction` — "the honest price of not
 * deciding" — and until this existed the screen printed that sentence and the
 * simulation charged nothing for it, which made never answering the strongest
 * way to play. The prose is the narration, because the author already wrote
 * what happens; the figures are derived from severity and class, because no
 * scenario authors them and asking three hundred of them to would be a corpus
 * migration rather than a mechanism.
 *
 * Costs nothing in treasury by construction. Silence is genuinely free in
 * money — it is the country's reading of its government that pays — and a
 * treasury debit here would make the packet a second decision rather than the
 * absence of one.
 */
export function inactionPacket(campaign: Campaign, cast: CastScenario): EffectPacket {
  const visibility = cast.report ? "intelligence" : cast.matter && !cast.matter.public ? "internal" : "public";
  return {
    source: "simulate",
    // The world acted, not the president: nobody gave an order. The trail has
    // to be able to say that a week's movement had no decision behind it,
    // which is exactly the thing an abstaining term needs to be readable as.
    actor: "world",
    turn: campaign.turn,
    // `scenario` rather than `decision`, which is the honest reading: the week
    // came out of the scenario layer and nobody decided it. Everything else a
    // committed reply carries is carried here too, so the trail can answer
    // "why did competence fall in week 40" with the document nobody opened.
    provenance: {
      origin: "scenario",
      confidence: "observed",
      visibility,
      entities: [cast.counterpart as string],
      ...(cast.script.locales && cast.script.locales.length > 0 ? { locales: cast.script.locales } : {}),
      systems: ["conversation"],
      marks: [...new Set([scenarioUnansweredFlag(cast.def.id), scenarioUnansweredFlag(scenarioOccurrenceKey(cast))])],
    },
    narration: { summary: inactionNarration(cast) },
    effects: inactionEffects(campaign, cast),
  };
}

/**
 * The thread an opener starts the week it is raised, before anyone answers: the
 * counterpart and the place it was datelined in are pinned now, so the story
 * has one place whether it is answered, put off or left to expire. Nothing for
 * a scenario that opens no family.
 */
export function familyRaiseEffects(campaign: Campaign, cast: CastScenario): readonly Effect[] {
  const family = cast.def.family;
  if (family?.role !== "opener") return [];
  const place = storyPlace(cast.locus, campaign.founding.nation);
  return [
    {
      kind: "scenarioFamily",
      open: {
        family: family.id,
        counterpart: cast.counterpart,
        scenario: cast.def.id,
        turn: campaign.turn,
        title: cast.script.subject,
        unanswered: true,
        ...(place ? { place } : {}),
      },
    },
  ];
}

/**
 * What a committed reply does to the family it belongs to: opens it and pins
 * the country, adds a beat to one already running, or closes it out the way
 * the chosen reply says it ended. The opener's rendered subject rides along so
 * the Record can name the arc when it ends, and so does where it happened at
 * home, so the arc's later scenes come back to it.
 */
export function familyEffects(cast: CastScenario, turn: number, replyId: string, place?: ScenarioPlace): readonly Effect[] {
  const family = cast.def.family;
  if (!family) return [];
  if (family.role === "opener") {
    return [
      {
        kind: "scenarioFamily",
        open: {
          family: family.id,
          counterpart: cast.counterpart,
          scenario: cast.def.id,
          turn,
          title: cast.script.subject,
          ...(place ? { place } : {}),
        },
      },
    ];
  }
  const beat: Effect = { kind: "scenarioFamily", beat: { family: family.id, scenario: cast.def.id, turn } };
  if (family.role !== "close") return [beat];
  const resolves = cast.def.replies.find((reply) => reply.id === replyId)?.resolves;
  // The schema refuses a close whose replies do not each say how it ended, so
  // a missing one here is a body that skipped the parser, and it says so.
  if (!resolves) throw new Error(`reply "${replyId}" closes family "${family.id}" in "${cast.def.id}" without saying how it ended`);
  return [beat, { kind: "scenarioFamily", close: { family: family.id, turn, disposition: resolves } }];
}
