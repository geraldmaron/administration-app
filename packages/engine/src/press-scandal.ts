import type { Campaign, FeedItem, FlagId } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
import type { EffectPacket } from "./effect-types.js";
import { NATIONAL_OUTLETS, outletDisposition, type PressOutlet } from "./press-outlets.js";
import { outletActReading, recentActPull } from "./press-beliefs.js";
import { markedFlags } from "./marked-flags.js";
import { scandalAnswer } from "./scandal-response.js";
import {
  datedScandalIdentities,
  flagIdentity,
  scandalFlags,
  SCANDAL_GRAVITY,
  SCANDAL_LIVE_FLAG,
  type ScandalCharge,
  type ScandalIdentity,
  type ScandalImplicated,
  type ScandalOrigin,
} from "./scandal-origins.js";

// A scandal breaking, and what happens to it after.
//
// A story is opened by a fact the campaign already holds (scandal-origins.ts):
// a leak that came back with the administration's own name on it, a decision
// on the President's record that carries a charge, an officer's leak, an
// inspector general's published report, or an authored `scandal:` flag. None
// of them stores anything new; the story is the fact, read as a story.
//
// Its life is read from the corps rather than from a hostility number invented
// for this file. `outletDisposition` is the same standing the coalitions and
// the six judgments already read, and `outletActReading` is the same
// act-against-worldview fold `outletTarget` is built from: a masthead whose
// beliefs run against what the administration has actually been signing is the
// masthead that keeps asking about a story, and a corps where none will is a
// corps that lets it die. Read fresh every week rather than walked forward from
// a stored figure, for the reason `pressDrivers` is.
//
// Two stored facts bend that life, both turn-stamped flags keyed by the story's
// derived id: the President's answer (scandal-response.ts), which puts the story
// on its way down when it fits the file and gives it new legs when it does not,
// and the closing flag, which keeps a finished story finished.

export type { OwnActCharge, ScandalCharge, ScandalImplicated, ScandalOrigin } from "./scandal-origins.js";
export { CABINET_LEAK_STORY_SHARE, SCANDAL_GRAVITY, SCANDAL_LIVE_FLAG } from "./scandal-origins.js";

export type ScandalStage = "breaking" | "developing" | "fading" | "resolved";

export type Scandal = {
  readonly id: string;
  /** What it is, in the words a front page would use. */
  readonly subject: string;
  readonly origin: ScandalOrigin;
  /** What the story charges, whatever opened it; decides its gravity and which answer fits. */
  readonly charge: ScandalCharge;
  /** The week it broke; `-1` for a flagged scandal with no date of its own. */
  readonly brokeTurn: number;
  readonly stage: ScandalStage;
  /**
   * The act or the answer this story is about, in the government's own words:
   * what a board needs to say which week the player is being asked about, when
   * the charge alone is true of more than one of them.
   */
  readonly context?: string;
  /** The officer the story names, where the facts name one. */
  readonly implicated?: ScandalImplicated;
  /** How grave the charge is, 0..1 (`SCANDAL_GRAVITY`). */
  readonly gravity: number;
  /**
   * 0..1, zero once `resolved`: how hot the story runs this week times how
   * grave its charge is, so a thin story at its height weighs less than a
   * grave one. Recomputed from the current campaign on every read.
   */
  readonly intensity: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clamp11 = (value: number) => Math.max(-1, Math.min(1, value));
const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;

/** Where a freshly broken story starts: enough to be real, not yet a verdict. */
export const SCANDAL_BREAK_INTENSITY = 0.5;

/** How far one week of real legs carries a story that has them. */
export const SCANDAL_LEGS_STEP = 0.09;

/**
 * How many weeks a story can gain legs before it crests on its own. Six: even
 * a corps that never lets up is covering next week's news by midsummer.
 */
export const SCANDAL_DEVELOP_TURNS = 6;

/**
 * The weeks of new legs an answer that does not fit the file gives a story. A
 * denial the papers can disprove, or a confession to more than they had, is a
 * second story on top of the first.
 */
export const SCANDAL_WRONG_ANSWER_LEGS = 4;

/** How far one week of decline carries a story that has crested. */
export const SCANDAL_FADE_STEP = 0.18;

/**
 * What a story has to clear to run past the week it broke: its charge's gravity
 * times the press climate. Most stories fizzle. A grave charge before a corps
 * that is broadly against the administration runs; a thin one needs the whole
 * room against the President, and one partisan desk calling for it is not that.
 */
export const SCANDAL_LEGS_BAR = 0.25;

/**
 * What one story at full intensity is worth against the integrity target. A
 * story of the gravest charge at full heat costs what a live scandal always
 * cost; gravity and heat can only make it cost less.
 */
export const SCANDAL_INTEGRITY_WEIGHT = 0.25;

/**
 * How hostile one masthead's current position is, signed so a friendly desk
 * counts against a story rather than merely not for it: where the desk stands
 * with this administration now, and what its worldview makes of what the
 * administration has signed.
 */
function outletHostility(campaign: Campaign, outlet: PressOutlet): number {
  const disposition = outletDisposition(campaign.press, outlet);
  const reading = outletActReading(outlet.beliefs, recentActPull(campaign).pull);
  return clamp11((0.5 - disposition) * 1.2 - reading * 0.4);
}

/**
 * The most hostile desk on the roster, and how hostile it is: the one desk a
 * story needs to stay alive. It takes one masthead willing to keep calling for
 * a story to give it legs, the same way it takes every one of them backing off
 * for it to die. Every scandal read goes through this one function, so the
 * roster it walks can change without any story reading a second one.
 */
// A regional paper files only what happens in its region, so it never carries
// a national story's legs.
function leadingDesk(campaign: Campaign): { readonly outlet: PressOutlet; readonly hostility: number } {
  return NATIONAL_OUTLETS.map((outlet) => ({ outlet, hostility: outletHostility(campaign, outlet) })).reduce(
    (worst, entry) => (entry.hostility > worst.hostility ? entry : worst),
  );
}

/**
 * How the corps as a whole is running against the administration this week, 0..1:
 * the most hostile national desk, which a story needs to keep calling, and the
 * room behind it, which decides whether anybody else follows. Half each: the
 * leading desk alone gave every story legs, because some desk is always
 * against a President.
 */
export function pressClimate(campaign: Campaign): number {
  const hostilities = NATIONAL_OUTLETS.map((outlet) => outletHostility(campaign, outlet));
  const leading = Math.max(0, ...hostilities);
  const room = hostilities.reduce((sum, hostility) => sum + Math.max(0, hostility), 0) / Math.max(1, hostilities.length);
  return round3((leading + room) / 2);
}

/**
 * The flag that records a story as having got its legs, the week after it
 * broke. The climate decides whether a story runs, not whether a running story
 * keeps running: once a second desk has its own reporting, a friendlier week
 * does not un-report it.
 */
export function scandalLegsFlag(id: string): FlagId {
  return `scandal-legs:${id}`;
}

/** Whether a story of this charge has legs: it got them already, or this week's press gives them. */
function hasLegs(campaign: Campaign, identity: ScandalIdentity): boolean {
  if (campaign.player.flags[scandalLegsFlag(identity.id)] === true) return true;
  return SCANDAL_GRAVITY[identity.charge] * pressClimate(campaign) > SCANDAL_LEGS_BAR;
}

/**
 * The flag that records a story as finished, so that it stays finished. The
 * stage is derived from the corps as it reads this week, which on its own would
 * re-judge a story that died under a friendly corps as live the moment the
 * corps turned, with no new fact behind it.
 */
export function scandalClosedFlag(id: string): FlagId {
  return `scandal-closed:${id}`;
}

function scandalIsClosed(campaign: Campaign, id: string): boolean {
  return campaign.player.flags[scandalClosedFlag(id)] === true;
}

/**
 * The age at which the story stops gaining legs. An answer that fits the file
 * crests it the week it is given; one that does not adds weeks of legs past
 * wherever it would otherwise have crested. An answer dated after the week
 * being read has not been given yet.
 */
function crestAge(campaign: Campaign, identity: ScandalIdentity): number {
  const answer = scandalAnswer(campaign, identity.id, identity.charge);
  if (!answer || answer.turn > campaign.turn) return SCANDAL_DEVELOP_TURNS;
  const answeredAge = Math.max(0, answer.turn - identity.brokeTurn);
  if (answer.price === "fading") return Math.min(SCANDAL_DEVELOP_TURNS, answeredAge);
  if (answer.price === "heavy") return Math.max(SCANDAL_DEVELOP_TURNS, answeredAge) + SCANDAL_WRONG_ANSWER_LEGS;
  return SCANDAL_DEVELOP_TURNS;
}

/** How hot a story runs this week before its gravity is applied, with its stage. */
function heat(campaign: Campaign, identity: ScandalIdentity): { readonly stage: ScandalStage; readonly heat: number } {
  if (scandalIsClosed(campaign, identity.id)) return { stage: "resolved", heat: 0 };
  const age = campaign.turn - identity.brokeTurn;
  if (age <= 0) return { stage: "breaking", heat: SCANDAL_BREAK_INTENSITY };
  // A story without legs costs exactly one week: the week it broke, and the
  // week nobody followed up.
  if (!hasLegs(campaign, identity)) return { stage: "resolved", heat: 0 };
  const crest = crestAge(campaign, identity);
  const peak = clamp01(SCANDAL_BREAK_INTENSITY + Math.min(age, crest) * SCANDAL_LEGS_STEP);
  const fadingTurns = Math.max(0, age - crest);
  const value = clamp01(peak - fadingTurns * SCANDAL_FADE_STEP);
  const stage: ScandalStage = value <= 0 ? "resolved" : fadingTurns > 0 ? "fading" : "developing";
  return { stage, heat: value };
}

function withoutUndefined(identity: ScandalIdentity) {
  const { id, subject, origin, charge, brokeTurn, context, implicated } = identity;
  return {
    id,
    subject,
    origin,
    charge,
    brokeTurn,
    ...(context === undefined ? {} : { context }),
    ...(implicated === undefined ? {} : { implicated }),
  };
}

function scandalAt(identity: ScandalIdentity, campaign: Campaign): Scandal {
  const gravity = SCANDAL_GRAVITY[identity.charge];
  const reading = heat(campaign, identity);
  return { ...withoutUndefined(identity), gravity, stage: reading.stage, intensity: round3(reading.heat * gravity) };
}

/**
 * A flag-authored scandal with no date on it, standing at full weight for as
 * long as its flag does: the reading this channel has always had, kept for
 * every flag set by something that does not stamp a marker.
 */
function undatedFlagScandal(flag: string): Scandal {
  return { ...withoutUndefined(flagIdentity(flag, -1)), gravity: SCANDAL_GRAVITY.flagged, stage: "developing", intensity: 1 };
}

/** Every scandal this campaign carries, broken or long since dead. */
export function selectScandals(campaign: Campaign): readonly Scandal[] {
  const dated = datedScandalIdentities(campaign).map((identity) => scandalAt(identity, campaign));
  const flagged = scandalFlags(campaign).map(({ flag, setTurn }) =>
    setTurn === undefined ? undatedFlagScandal(flag) : scandalAt(flagIdentity(flag, setTurn), campaign),
  );
  return [...dated, ...flagged];
}

/** The scandals still standing this week: what a board draws from. */
export function selectLiveScandals(campaign: Campaign): readonly Scandal[] {
  return selectScandals(campaign).filter((scandal) => scandal.stage !== "resolved");
}

/** What the live board is worth against the integrity target: each story's intensity at the one weight. */
export function selectScandalIntegrityCharge(campaign: Campaign): number {
  const total = selectLiveScandals(campaign).reduce((sum, scandal) => sum + scandal.intensity, 0);
  return round3(total * SCANDAL_INTEGRITY_WEIGHT);
}

/**
 * The live scandal most worth a committee's attention this week, if any. Read
 * by `committee-inquiry.ts`'s `nextCause`, which opens an oversight matter keyed
 * `scandal:<scandal.id>` on it when the Hill has turned on the administration.
 */
export function selectScandalForInquiry(campaign: Campaign): Scandal | undefined {
  return [...selectLiveScandals(campaign)].sort(
    (a, b) => b.intensity - a.intensity || a.id.localeCompare(b.id),
  )[0];
}

/** One live story as a board draws it: what it is, how long it has run, which desk keeps it alive and what it costs. */
export type ScandalReading = {
  readonly scandal: Scandal;
  /** Weeks since it broke, zero on the week itself; absent for a story with no date. */
  readonly weeksRunning?: number;
  /** The most adversarial desk in the room: the one desk a story needs to stay alive. */
  readonly keptAliveBy: { readonly id: string; readonly name: string; readonly hostility: number };
  /** What this one story is charging the country's reading of the government's honesty. */
  readonly integrityCharge: number;
};

/**
 * The live board, heaviest story first. The corps reading is the room's, not
 * the story's, so every live story is kept alive by the same desk; repeated per
 * row because a row that cannot say who is asking will not say why it runs.
 */
export function selectScandalBoard(campaign: Campaign): readonly ScandalReading[] {
  const desk = leadingDesk(campaign);
  return [...selectLiveScandals(campaign)]
    .sort((a, b) => b.intensity - a.intensity || a.id.localeCompare(b.id))
    .map((scandal) => ({
      scandal,
      ...(scandal.brokeTurn < 0 ? {} : { weeksRunning: Math.max(0, campaign.turn - scandal.brokeTurn) }),
      keptAliveBy: { id: desk.outlet.id, name: desk.outlet.name, hostility: round3(desk.hostility) },
      integrityCharge: round3(scandal.intensity * SCANDAL_INTEGRITY_WEIGHT),
    }));
}

// --- The week's headline, if any --------------------------------------------

/**
 * How a story breaks, in the words its own origin earns. A leak that came back
 * is a different front page from a decision the papers got the file on, and
 * one line covering both would tell the player their covert operation came
 * apart because of a leak they never placed.
 */
function breakingHeadline(scandal: Scandal): string {
  const { origin, subject } = scandal;
  if (origin.kind === "leak-backfire") {
    return `A leak the White House placed with the press is traced back to the building. At issue: ${subject}.`;
  }
  if (origin.kind === "own-act") return `A newsroom has the file, and the first story runs tonight. At issue: ${subject}.`;
  if (origin.kind === "cabinet-leak") return `A member of the President's own cabinet is the source. At issue: ${subject}.`;
  if (origin.kind === "inspector-general") return `An inspector general's report reaches print. At issue: ${subject}.`;
  return `A story the administration has no answer for reaches print. At issue: ${subject}.`;
}

/**
 * The line a stage is worth. Fires once, on the week the stage changes, because
 * the caller only files a line when it does.
 */
function stageHeadline(scandal: Scandal): string {
  const { subject, stage } = scandal;
  if (stage === "breaking") return breakingHeadline(scandal);
  if (stage === "developing") {
    return `The story about ${subject} has legs. A second desk has its own reporting, and the questions are daily now.`;
  }
  if (stage === "fading") return `The story about ${subject} has stopped moving. The press is already onto something else.`;
  return `Nobody is still asking about ${subject}. The week's papers have moved on.`;
}

/**
 * The board as it stood on a given week: every story that had already broken
 * by then, read against that week's corps. A story dated later than the week
 * being asked about is not on that week's board.
 */
function scandalsAsOf(campaign: Campaign, turn: number): readonly Scandal[] {
  return selectScandals({ ...campaign, turn }).filter((scandal) => scandal.brokeTurn <= turn);
}

/**
 * The scandal items worth a line in the feed this week: every story, whatever
 * opened it, and only the week its stage actually changes, compared against
 * last week's derived reading.
 */
export function scandalFeedItems(campaign: Campaign, turn: number): readonly FeedItem[] {
  const before = new Map(scandalsAsOf(campaign, turn - 1).map((scandal) => [scandal.id, scandal.stage]));
  return scandalsAsOf(campaign, turn).flatMap((scandal) => {
    if (before.get(scandal.id) === scandal.stage) return [];
    return [
      {
        turn,
        kind: "press" as const,
        visibility: "public" as const,
        headline: stageHeadline(scandal),
        target: campaign.founding.nation,
        facts: { stake: scandal.subject },
      },
    ];
  });
}

function closingPacket(campaign: Campaign, closing: readonly Scandal[]): EffectPacket {
  return {
    turn: campaign.turn,
    actor: "world",
    source: "simulate",
    // Assessed, not observed. Nothing measures that a country has finished
    // with a story; the stage derivation reads a fading news cycle and
    // concludes it, and the Record has to say which of those two it is.
    provenance: { origin: "world", confidence: "assessed", visibility: "public", systems: ["press"] },
    narration: {
      summary: closing.length === 1 ? "The story stops being asked about." : `${closing.length} stories stop being asked about.`,
    },
    effects: [{ kind: "flag" as const, set: closing.map((scandal) => scandalClosedFlag(scandal.id)) }],
  };
}

/**
 * `scandal:live` raised the week the first story is standing and lowered the
 * week the last one is not. Dated on the way up, so a scenario can wait on a
 * story having run a while; bookkeeping, so it stays off the Record.
 */
function livePacket(campaign: Campaign, live: boolean): EffectPacket | undefined {
  const standing = campaign.player.flags[SCANDAL_LIVE_FLAG] === true;
  if (live === standing) return undefined;
  return {
    turn: campaign.turn,
    actor: "world",
    source: "simulate",
    background: true,
    provenance: { origin: "world", confidence: "observed", visibility: "public", systems: ["press"] },
    narration: { summary: live ? "A story about the administration is running." : "No story about the administration is running." },
    effects: [
      live
        ? { kind: "flag" as const, set: markedFlags([SCANDAL_LIVE_FLAG], campaign.turn) }
        : { kind: "flag" as const, clear: [SCANDAL_LIVE_FLAG] },
    ],
  };
}

/**
 * Close, for good, every story that reads as finished this week, and keep the
 * live flag true to the board. Runs after the press has moved the corps, so a
 * story is judged against the room it actually died in.
 */
export const scandalPhase: TurnPhase = (campaign) => {
  const stories = selectScandals(campaign);
  const closing = stories.filter((scandal) => scandal.stage === "resolved" && !scandalIsClosed(campaign, scandal.id));
  const running = stories.filter((scandal) => scandal.stage === "developing" && campaign.player.flags[scandalLegsFlag(scandal.id)] !== true);
  const live = livePacket(campaign, stories.some((scandal) => scandal.stage !== "resolved"));
  return [
    ...(closing.length > 0 ? [closingPacket(campaign, closing)] : []),
    ...(running.length > 0 ? [legsPacket(campaign, running)] : []),
    ...(live ? [live] : []),
  ];
};

/** The stories that got their legs this week, kept, so the climate no longer decides them. Bookkeeping, off the Record. */
function legsPacket(campaign: Campaign, running: readonly Scandal[]): EffectPacket {
  return {
    turn: campaign.turn,
    actor: "world",
    source: "simulate",
    background: true,
    provenance: { origin: "world", confidence: "observed", visibility: "public", systems: ["press"] },
    narration: { summary: running.length === 1 ? "A story has legs." : `${running.length} stories have legs.` },
    effects: [{ kind: "flag" as const, set: markedFlags(running.map((scandal) => scandalLegsFlag(scandal.id)), campaign.turn) }],
  };
}

export type {
  ScandalAnswer,
  ScandalFileRead,
  ScandalPriceWord,
  ScandalResponseProjection,
  ScandalResponseResult,
  ScandalResponseTarget,
  ScandalResponseVerb,
} from "./scandal-response.js";
