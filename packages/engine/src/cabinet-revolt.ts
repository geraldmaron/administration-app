import type { PersonId, RoleId } from "@admin/world";
import type { Campaign, FlagId, PersonRuntime } from "./state.js";
import { createRngStreams, type RngStream } from "./rng.js";
import type { Effect, EffectPacket } from "./effects.js";
import { chiefOfStaffDiscipline, departureFlag, personDepartureFlag, type CabinetOutcome } from "./cabinet.js";
import { departingFlag } from "./cabinet-departing.js";
import { markedFlags } from "./marked-flags.js";
import { cabinetAccess, cabinetBreakContacts, cabinetBreakSpread } from "./cabinet-reach.js";
import { factionEffects } from "./cabinet-faction.js";
import { vacates } from "./appointments.js";
import { decideMinister, ministerStamp } from "./minister-will.js";
import { elapsedDays } from "./pace.js";
import { axisLean } from "./person-disposition.js";
import { RIVAL_LEAK_SYSTEM, selectSecretaryTies, tieReading, type CabinetTie } from "./cabinet-alignment.js";
import {
  noiseFrom,
  projectWillingness,
  stampOf,
  weigh,
  willDraw,
  type DecisionStamp,
  type Term,
  type Willingness,
  type WillingnessProjection,
} from "./willingness.js";

// How a Secretary in revolt breaks with an American President.
//
// There is no confidence vote to lose and no leadership to challenge from the
// cabinet table, so a revolt goes where it goes in Washington: to the press, in
// a leak; to the party, as a camp that backs somebody else for the nomination;
// or out of the building, in a resignation that is either quiet or a public
// break. Which of the last two it is, the Secretary decides, through the same
// weighing every other actor's decision goes through, and the reason is
// stamped on the record.

/**
 * How a consequence is told, as a set rather than a sentence.
 *
 * One template string per consequence means a campaign in which three ministers
 * leak in the same week prints the same sentence three times with the same
 * number beside it, and the record reads as a loop rather than as a government
 * coming apart. The beat is the same; the telling is not.
 *
 * The variant is drawn from its own RNG stream, keyed separately from the risk
 * roll. That separation is load-bearing: streams in this engine are pure
 * functions of (seed, key), so a draw here cannot shift the draw that decides
 * *whether* a minister breaks, and a campaign's outcomes do not move with its
 * wording.
 */
type Voice = {
  readonly summary: (name: string) => string;
  readonly headline: (name: string) => string;
};

const LEAK_VOICES: readonly Voice[] = [
  {
    summary: (n) => `${n}'s loyalty frays: a memo reaches the press before it reaches you.`,
    headline: (n) => `${n} is traced as the source of a leak embarrassing to the government.`,
  },
  {
    summary: (n) => `${n} is briefing against the government, and no longer bothering to hide it.`,
    headline: (n) => `Reporters name ${n} as the origin of this week's embarrassing disclosure.`,
  },
  {
    summary: (n) => `Something said in confidence to ${n} is quoted back at you in print.`,
    headline: (n) => `A private discussion involving ${n} appears almost verbatim in the morning edition.`,
  },
  {
    summary: (n) => `${n} has decided the record matters more than the room.`,
    headline: (n) => `${n} is identified as the official behind a damaging account of the government's handling.`,
  },
];

const PRIMARY_VOICES: readonly Voice[] = [
  {
    summary: (n) => `${n} has started taking calls from the donors who want somebody else at the top of the ticket.`,
    headline: (n) => `Allies of ${n} are sounding out a primary challenge to the President.`,
  },
  {
    summary: (n) => `${n} no longer hides that they have a run of their own in mind.`,
    headline: (n) => `${n} is openly weighing a run for the nomination against the President.`,
  },
  {
    summary: (n) => `${n} now speaks for a camp in the party, and the camp is not yours.`,
    headline: (n) => `${n} draws a camp of the party's activists and donors around them.`,
  },
];

const QUIET_VOICES: readonly Voice[] = [
  {
    summary: (n) => `${n} resigns rather than carry on with no faith left in the government.`,
    headline: (n) => `${n} resigns, citing a loss of confidence in the government's direction.`,
  },
  {
    summary: (n) => `${n} clears the office rather than defend another decision they did not make.`,
    headline: (n) => `${n} steps down, declining to account for a policy they opposed in private.`,
  },
  {
    summary: (n) => `${n} leaves the government, and does not pretend the parting is friendly.`,
    headline: (n) => `${n} resigns without the customary letter of thanks.`,
  },
];

const BREAK_VOICES: readonly Voice[] = [
  {
    summary: (n) => `${n} resigns and goes public: the President, they say, has stopped listening.`,
    headline: (n) => `${n} resigns and denounces the President's direction on the way out.`,
  },
  {
    summary: (n) => `${n} walks out and takes the argument to the Sunday shows.`,
    headline: (n) => `${n} resigns and tells reporters the administration ignored its own people.`,
  },
  {
    summary: (n) => `${n} resigns with a letter written to be read aloud.`,
    headline: (n) => `${n}'s resignation letter, released in full, is a catalog of grievances.`,
  },
];

/** A break in public costs the President more than a quiet exit: it is an argument, not an absence. */
const QUIET_STANDING_COST = 0.02;
const BREAK_STANDING_COST = 0.04;
const BREAK_STABILITY_COST = 0.01;

type Person = PersonRuntime["base"];

const round4 = (value: number) => Math.round(value * 10000) / 10000 + 0;

function press(turn: number, headline: string, subject: string): Effect {
  return { kind: "feed", items: [{ turn, kind: "press", visibility: "public", headline, facts: { subject } }] };
}

// Leak: the mildest consequence, and the default for a minister who is
// merely disloyal rather than also ambitious enough to want the chair itself.
// Stamped as a cabinet leak, so a press room that opens a story off it can say
// where the story came from.
function leakPacket(state: Campaign, turn: number, person: Person, voice: Voice, contained: number): EffectPacket {
  const contacts = cabinetBreakContacts(state, person.id);
  const hit = round4(0.02 * cabinetAccess(state, person.id) * (1 + cabinetBreakSpread(contacts)) * contained);
  return {
    source: "simulate",
    actor: "world",
    turn,
    provenance: { origin: "world", entities: [person.id], systems: ["cabinet", "leak"], internalDecisions: contacts.map((contact) => contact.decision) },
    narration: { summary: voice.summary(person.name) },
    effects: [{ kind: "metric", deltas: { standing: -hit } }, press(turn, voice.headline(person.name), person.name)],
  };
}

/** The same telling, for a leak with two names in it: who talked, and who it was about. */
type AimedVoice = {
  readonly summary: (leaker: string, target: string) => string;
  readonly headline: (leaker: string, target: string) => string;
};

const AIMED_VOICES: readonly AimedVoice[] = [
  {
    summary: (n, t) => `${n} has taken a feud with ${t} to the press.`,
    headline: (n, t) => `A damaging account of how ${t} runs the department is traced to ${n}'s office.`,
  },
  {
    summary: (n, t) => `${n} is briefing reporters against ${t}, a fellow member of your Cabinet.`,
    headline: (n, t) => `Officials close to ${n} question ${t}'s judgment in this week's papers.`,
  },
  {
    summary: (n, t) => `A memo ${t} wrote reaches the press, and the building knows who sent it: ${n}.`,
    headline: (n, t) => `${t}'s private memo appears in print. Colleagues point to ${n}.`,
  },
  {
    summary: (n, t) => `${n} wants ${t} out of the Cabinet, and has started making the case in public.`,
    headline: (n, t) => `Allies of ${n} tell reporters that ${t} has lost the confidence of the Cabinet.`,
  },
];

/**
 * Whether a Secretary who is leaking anyway aims it at a colleague they are
 * feuding with rather than at the government as a whole.
 *
 * Only a tie already past "opposed" is worth settling in print, so the enmity
 * term starts there. Deference pulls toward aiming: a Secretary who still owes
 * the President something would rather the story be about a rival than about
 * the President. The draw is keyed by the pair and not the week, so the same
 * Secretary with the same feud aims the same way until the feud or the person
 * changes.
 */
const ENMITY_FLOOR = 0.35;
const ENMITY_WEIGHT = 0.6;
const AIM_DEFERENCE_WEIGHT = 0.5;
const AIM_SETTINGS = { threshold: 0.05, noiseBound: 0.05 } as const;
/**
 * A leak about a colleague is about the colleague first, so it costs the
 * President half of what a leak about the government does.
 */
const AIMED_COST_SHARE = 0.5;

/**
 * The colleague a leaker is most at odds with, if the tie is a feud they have
 * actually fought: opposed, and on the record the two have taken opposite sides
 * in the room more often than the same side over the last half year. A feud on
 * paper is a reason to dislike someone; a lost argument is a reason to leak
 * about them. Without the second condition a cabinet's leaks went at a
 * colleague almost every time anyone was opposed to anyone, whether or not the
 * two had ever crossed in a meeting.
 */
export function feudTarget(state: Campaign, person: PersonId): CabinetTie | undefined {
  // Ties come strongest feeling first and the sort is stable, so the first
  // fought feud is the deepest, and an exact tie keeps the cabinet's order.
  return selectSecretaryTies(state, person).find((tie) => tieReading(tie.standing) === "opposed" && tie.record.term < 0);
}

export function aimLeakTerms(leaker: Person, tie: CabinetTie): readonly Term[] {
  return [
    { key: "colleague-enmity", source: "interest", value: round4(ENMITY_WEIGHT * Math.max(0, -tie.standing - ENMITY_FLOOR)) },
    { key: "deference", source: "obligation", value: round4(AIM_DEFERENCE_WEIGHT * axisLean(leaker, "deference")) },
  ];
}

export function decideAimLeak(state: Campaign, leaker: Person, tie: CabinetTie): Willingness {
  const draw = willDraw(createRngStreams(state.seed), "aim-leak", leaker.id, tie.b);
  return weigh("aim-leak", aimLeakTerms(leaker, tie), { ...AIM_SETTINGS, noise: noiseFrom(draw, AIM_SETTINGS.noiseBound) });
}

/** Where a leak from this Secretary would point if it came this week, with no draw in it. */
export type AimLeakForecast = { readonly tie: CabinetTie; readonly projection: WillingnessProjection };

export function projectAimLeak(state: Campaign, leaker: Person): AimLeakForecast | undefined {
  const tie = feudTarget(state, leaker.id);
  return tie ? { tie, projection: projectWillingness("aim-leak", aimLeakTerms(leaker, tie), AIM_SETTINGS) } : undefined;
}

// A leak aimed at a colleague: still a leak, counted as one, and charged to the
// President at half the price, with both names on the record so a story can say
// who talked and who it was about.
function aimedLeakPacket(
  state: Campaign,
  turn: number,
  person: Person,
  target: Person,
  voice: AimedVoice,
  contained: number,
  decision: DecisionStamp,
): EffectPacket {
  const contacts = cabinetBreakContacts(state, person.id);
  const hit = round4(0.02 * cabinetAccess(state, person.id) * (1 + cabinetBreakSpread(contacts)) * contained * AIMED_COST_SHARE);
  return {
    source: "simulate",
    actor: "world",
    turn,
    provenance: { origin: "world", entities: [person.id, target.id], systems: ["cabinet", "leak", RIVAL_LEAK_SYSTEM], decision, internalDecisions: contacts.map((contact) => contact.decision) },
    narration: { summary: voice.summary(person.name, target.name) },
    effects: [{ kind: "metric", deltas: { standing: -hit } }, press(turn, voice.headline(person.name, target.name), person.name)],
  };
}

/**
 * A leak, aimed or not. Where the leaker has a feud the decision is weighed and
 * stamped either way, so a leak that stayed general still says what it was not.
 */
function leakFor(state: Campaign, turn: number, person: Person, voices: RngStream, contained: number): EffectPacket {
  const tie = feudTarget(state, person.id);
  const target = tie ? state.people[tie.b]?.base : undefined;
  if (!tie || !target) return leakPacket(state, turn, person, voices.pick(LEAK_VOICES), contained);
  const decision = decideAimLeak(state, person, tie);
  const stamp = stampOf(decision, person.id, target.id, "public");
  if (decision.acts) return aimedLeakPacket(state, turn, person, target, voices.pick(AIMED_VOICES), contained, stamp);
  const plain = leakPacket(state, turn, person, voices.pick(LEAK_VOICES), contained);
  return { ...plain, provenance: { ...plain.provenance!, decision: stamp } };
}

// Primary backing: an ambitious, disloyal Secretary stops waiting and starts
// building a camp in the party of their own, from inside the government they
// serve. They keep the chair — for now — but carry the camp's badge, and the
// government's own footing takes the real hit.
function primaryPacket(state: Campaign, turn: number, role: RoleId, person: Person, voice: Voice, contained: number): EffectPacket {
  const access = cabinetAccess(state, person.id);
  const contacts = cabinetBreakContacts(state, person.id);
  const hit = round4(0.04 * access * (1 + cabinetBreakSpread(contacts)) * contained);
  return {
    source: "simulate",
    actor: "world",
    turn,
    provenance: { origin: "world", entities: [person.id], systems: ["cabinet", "primary"], internalDecisions: contacts.map((contact) => contact.decision) },
    narration: { summary: voice.summary(person.name) },
    effects: [
      { kind: "metric", deltas: { stability: -hit } },
      ...(access === 1 ? factionEffects(turn, role, person.id) : []),
      press(turn, voice.headline(person.name), person.name),
    ],
  };
}

/**
 * A Secretary on their way out, deciding how to go.
 *
 * Either way the chair empties through `vacates`, the person walks out of the
 * building rather than out of the world, and the deputy acts from the same day.
 * What the decision changes is what it costs the President: a quiet exit is a
 * vacancy, a public break is an argument the country hears.
 */
function exitPacket(state: Campaign, turn: number, role: RoleId, person: Person, voices: RngStream, contained: number): EffectPacket {
  const decision = decideMinister(state, "minister-break", role, person);
  const loud = decision.acts;
  const voice = voices.pick(loud ? BREAK_VOICES : QUIET_VOICES);
  const cost = loud
    ? { standing: -round4(BREAK_STANDING_COST * contained), stability: -round4(BREAK_STABILITY_COST * contained) }
    : { standing: -round4(QUIET_STANDING_COST * contained) };
  return {
    source: "simulate",
    actor: "world",
    turn,
    provenance: {
      origin: "world",
      entities: [person.id],
      systems: ["cabinet", loud ? "break" : "resignation"],
      decision: ministerStamp(decision, person.id, role),
    },
    narration: { summary: voice.summary(person.name) },
    effects: [
      { kind: "metric", deltas: cost },
      // Dated from the week rather than the weekday the sweep happens to run
      // on, so a week stepped day by day and a week taken whole seat the same
      // acting with the same authority.
      ...vacates(state, role, "resigned", person.id, turn, elapsedDays(state.turn - 1)),
      press(turn, loud ? voice.headline(person.name) : `${person.name} resigns from cabinet.`, person.name),
    ],
  };
}

const ORDINARY_VOICES: readonly Voice[] = [
  {
    summary: (n) => `${n} tells you it is time to go home, and will stay until the department is handed on.`,
    headline: (n) => `${n} will step down, citing family, and serve until a successor is in place.`,
  },
  {
    summary: (n) => `${n} has taken an offer from the private sector, and gives you notice rather than a vacancy.`,
    headline: (n) => `${n} will leave the cabinet for the private sector once a successor is confirmed.`,
  },
  {
    summary: (n) => `${n}'s doctors have asked for a lighter load. They will see the department through a transition.`,
    headline: (n) => `${n} will resign on medical advice, staying on through the transition.`,
  },
  {
    summary: (n) => `${n} has run the department on four hours of sleep for years, and has told you it is time.`,
    headline: (n) => `${n} announces a departure after a long tenure, in a letter praising the President.`,
  },
];

/**
 * A Secretary who is leaving for the reasons loyal Secretaries leave:
 * exhaustion, a private-sector offer, health, family. They announce it and
 * stay on, so the chair is held and the department run while the President
 * finds a successor; the chair empties only when they go. Nobody is arguing:
 * there is no standing lost and no story to run.
 */
function announcedExitPacket(turn: number, role: RoleId, person: Person, voices: RngStream): EffectPacket {
  const voice = voices.pick(ORDINARY_VOICES);
  return {
    source: "simulate",
    actor: "world",
    turn,
    provenance: { origin: "world", entities: [person.id], systems: ["cabinet", "resignation", "ordinary"] },
    narration: { summary: voice.summary(person.name) },
    effects: [
      { kind: "flag", set: markedFlags([departingFlag(role, person.id)], turn) as FlagId[] },
      press(turn, voice.headline(person.name), person.name),
    ],
  };
}

/**
 * The end of an announced departure with no successor confirmed in time: the
 * Secretary goes when they said they would, through `vacates`, and the deputy
 * acts from that week.
 */
export function ordinaryExitPacket(state: Campaign, turn: number, role: RoleId, person: Person): EffectPacket {
  return {
    source: "simulate",
    actor: "world",
    turn,
    provenance: { origin: "world", entities: [person.id], systems: ["cabinet", "handover"] },
    narration: { summary: `${person.name} leaves as announced, with no successor confirmed, and the deputy takes the department.` },
    effects: [
      { kind: "flag", clear: [departingFlag(role, person.id)] },
      ...vacates(state, role, "resigned", person.id, turn, elapsedDays(state.turn - 1)),
      press(turn, `${person.name} leaves the cabinet. The deputy will act until a successor is confirmed.`, person.name),
    ],
  };
}

/**
 * The end of an announced departure once somebody else holds the chair: the
 * successor the Senate confirmed, or whoever it went to by another road. The
 * confirmation already seated them; what is left is the record that the one
 * who announced it has gone, unless the other road already wrote it.
 */
export function handoverPacket(state: Campaign, turn: number, role: RoleId, person: Person): EffectPacket {
  const recorded =
    state.people[person.id]?.alive !== true ||
    (["resigned", "dismissed"] as const).some((how) => state.player.flags[personDepartureFlag(how, role, person.id) as FlagId]);
  const successor = state.player.cabinet[role];
  const name = successor ? state.people[successor]?.base.name : undefined;
  const departed = recorded ? [] : [departureFlag("resigned", role), personDepartureFlag("resigned", role, person.id)];
  return {
    source: "simulate",
    actor: "world",
    turn,
    provenance: { origin: "world", entities: [person.id, ...(successor ? [successor] : [])], systems: ["cabinet", "handover"] },
    narration: { summary: name ? `${person.name} hands the department to ${name}.` : `${person.name}'s transition is over.` },
    effects: [{ kind: "flag", set: markedFlags(departed as FlagId[], turn) as FlagId[], clear: [departingFlag(role, person.id)] }],
  };
}

/** The packet a chair's break or ordinary exit writes, told in the voice drawn for it. */
export function revoltPacket(
  state: Campaign,
  outcome: CabinetOutcome | "ordinary",
  turn: number,
  role: RoleId,
  person: Person,
  voices: RngStream,
): EffectPacket {
  // A White House that runs a tight message contains the damage a break does,
  // and one that does not lets it spread: the same discipline that makes a
  // break less likely makes the one that comes cost less.
  const contained = 1 - chiefOfStaffDiscipline(state);
  switch (outcome) {
    case "challenge":
      return primaryPacket(state, turn, role, person, voices.pick(PRIMARY_VOICES), contained);
    case "resignation":
      return exitPacket(state, turn, role, person, voices, contained);
    case "leak":
      return leakFor(state, turn, person, voices, contained);
    case "ordinary":
      return announcedExitPacket(turn, role, person, voices);
  }
}
