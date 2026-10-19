import {
  createRngStreams,
  conflictsAsParty,
  selectActivePursuits,
  selectConditionsFor,
  selectRemovalPressureDelta,
  selectTurnOfDate,
  type Campaign,
} from "@admin/engine";
import {
  classStagedFlag,
  scenarioFiredFlag,
  severityStagedFlag,
  type ScenarioClass,
  type ScenarioDef,
} from "./scenario.js";
import { flagSetFlag } from "./scenario-deed-flags.js";
import {
  castBound,
  liveSelectors,
  type CastScenario,
  type LiveSelector,
  type ScenarioSelectorLike,
} from "./scenario-cast.js";

// Mechanics propose; the director stages.
//
// The desk drew one live scenario a turn out of a weighted pool, and that was
// the whole of the pacing model. It produced two failures that no amount of
// authored content fixes. The first is repetition: the draw has no memory, so
// the same class can arrive three weeks running, and a player reads that as the
// game having about four things in it. The second is indifference to the board:
// weight came from tension, instability and removal pressure, so the week a
// country's second front opened and its third province flooded, the desk was as
// likely to raise a cultural dispute as either.
//
// The director sits between the two. It reads what the board is actually
// carrying, ranks the candidates the gates already made live, suppresses what
// has just been seen, and stages the most loaded one — or several, on a week
// where the board genuinely stacks.
//
// What the board is carrying is two things, not one. There is the week's
// subject — the war, the flood, the outbreak — and there is the state of the
// presidency itself, which for a long time this file could not see: an
// administration a week from articles of impeachment drew the same paced,
// mostly-routine desk as one governing comfortably, because the reading it
// ranked on never once looked at the approval, the chamber or the removal arc.
// Both halves feed `boardPressure` now. Nothing here decides what is *possible*;
// that is still the scenario's own conditions, and the director cannot stage
// something the board did not make live.

/**
 * Turns a class must wait before it may be staged again. Long enough that a
 * player noticing "another one of these" is noticing something real, short
 * enough that a class is not effectively retired by one appearance.
 */
export const CLASS_COOLDOWN = 6;

/**
 * How long after the cooldown a class is still damped. Without the taper a
 * class is banned for six weeks and then exactly as likely as one nobody has
 * seen all campaign, which is a cliff the player can feel.
 */
export const SUPPRESSION_WINDOW = 14;

/** Most decisions a single week may put on the desk, however loaded it is. */
export const MAX_DESK_CAPACITY = 3;

/**
 * How much of the board a subject has to be occupying before it justifies a
 * second decision in one week.
 */
const CASCADE_THRESHOLD = 0.5;

/** What matching the board is worth against a candidate's own weight. */
const ESCALATION_FACTOR = 2.5;

/**
 * The shares of the presidency's own reading. Approval leads because it is the
 * figure every ending is decided by; the chamber follows because it is the
 * branch that actually removes a president; direction of travel is worth least
 * of the three because a single week's movement is the noisiest of them.
 */
export const PRESIDENCY_WEIGHTS = { approval: 0.45, congress: 0.3, escalation: 0.25 } as const;

/**
 * The week-on-week rise in removal pressure that reads as a full escalation.
 * Set against the arc's own scale rather than picked: the beats of the removal
 * ladder sit about a tenth of the range apart, so half a beat gained inside one
 * week is a presidency moving as fast as the arc can be moved.
 */
const ESCALATION_SPAN = 0.05;

/**
 * The most of the board a failing presidency may claim from a class whose own
 * subject is quiet.
 *
 * Held below `CASCADE_THRESHOLD` on purpose, and provably so, since
 * `presidencyPressure` cannot exceed 1: the presidency alone never manufactures
 * a cascade week. A week is widened by the government being asked about more
 * than one thing at once, and a collapsing presidency with nothing else on the
 * board is one thing. What it does instead is let real subjects count as loaded
 * far sooner, and stop the severity dial holding a critical back from an
 * administration that is visibly failing.
 *
 * The ceiling is also what the escalation-over-novelty preference can survive,
 * and that is the binding constraint rather than the threshold. Because the
 * lift is the same for every class, it is a floor under all of them, and a
 * floor high enough narrows the gap between a burning war and a quiet cultural
 * dispute until the draw stops preferring the war at all. Measured on the
 * campaign probe below: at 0.45 a campaign spent at war stages no more war
 * content than a peaceful one, which is this file's original defect wearing the
 * new term's clothes.
 *
 * It came down from 0.30 when the executive branch's delivery started reaching
 * the public. Approval across every probe is lower than it was, so the same
 * constant buys a larger lift than it did when it was set, and the war's
 * advantage had narrowed to 1.26 against a floor of 1.3 — the exact failure
 * this comment predicted, arriving from the other direction. The band is
 * narrow and both walls are measured: at 0.24 a failing presidency no longer
 * makes a middling subject count as loaded, and at 0.30 the war lean closes.
 */
export const PRESIDENCY_LIFT = 0.27;

/**
 * Turns after a critical week during which another critical is damped. Shorter
 * than the class cooldown on purpose: severity pacing is about volume, not
 * repertoire, and a month of ordinary governing is what makes the next
 * building-shaking week land as one.
 */
export const CRITICAL_COOLDOWN = 4;

/**
 * The floor of the critical damping, deliberately above zero. A critical
 * inside the cooldown is unlikely, not impossible: a genuinely loaded board —
 * a hot war, a province underwater — still forces one through, which is why
 * the damping scales away as the candidate's own class pressure rises.
 */
const CRITICAL_DAMP_FLOOR = 0.15;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

// Recency is read out of the flag record rather than a campaign field of its
// own, because the class of a scenario is a *content* concept and the engine may
// not depend on content — the dependency-direction lint says so, and it is right
// to: a campaign carrying a list of content categories would be a save a build
// with a different content package could not load.

/**
 * Turns since this class last reached the desk, or `undefined` if it never has.
 * Only the suppression window is looked back over: a class last seen forty
 * turns ago and one never seen are the same fact for pacing purposes, and
 * walking the whole history to distinguish them would grow with the campaign.
 */
export function turnsSinceStaged(campaign: Campaign, scenarioClass: ScenarioClass): number | undefined {
  for (let back = 1; back <= SUPPRESSION_WINDOW; back += 1) {
    const turn = campaign.turn - back;
    if (turn < 0) break;
    if (campaign.player.flags[classStagedFlag(scenarioClass, turn)] === true) return back;
  }
  return undefined;
}

/**
 * The recency multiplier: zero inside the cooldown, then climbing back to one
 * across the rest of the window. A class the player has not seen is never
 * *boosted* for novelty — novelty is the thing this system is deliberately not
 * optimizing for, because a game that always shows you the least recent thing
 * is as predictable as one that always shows you the same thing.
 */
export function recencyFactor(campaign: Campaign, scenarioClass: ScenarioClass): number {
  const since = turnsSinceStaged(campaign, scenarioClass);
  if (since === undefined) return 1;
  if (since < CLASS_COOLDOWN) return 0;
  return clamp01((since - CLASS_COOLDOWN) / (SUPPRESSION_WINDOW - CLASS_COOLDOWN));
}

/**
 * How much of the board this class's *subject* currently occupies, 0..1.
 *
 * This is the escalation-over-novelty term: a running war outranks a fresh
 * minor incident, because the war is what the government is actually living
 * through and a scenario about it is a continuation rather than an interruption.
 * A class with no board state behind it reads zero and competes on its own
 * authored weight, exactly as it did before the director existed.
 */
export function subjectPressure(campaign: Campaign, scenarioClass: ScenarioClass): number {
  const player = campaign.founding.nation;
  const conditions = selectConditionsFor(campaign, player);
  const worst = (...kinds: readonly string[]) =>
    conditions.filter((c) => kinds.includes(c.kind)).reduce((peak, c) => Math.max(peak, c.severity), 0);
  switch (scenarioClass) {
    case "war":
      return conflictsAsParty(campaign).reduce((hottest, c) => Math.max(hottest, c.intensity), 0);
    case "disaster":
      return worst("earthquake", "flood", "drought", "cyclone", "wildfire");
    case "public-health":
      return worst("pandemic");
    case "unrest":
      return worst("unrest");
    case "foreign-crisis":
      // Somebody is running a campaign against this government, which is a
      // standing situation rather than a passing incident.
      return selectActivePursuits(campaign).some((p) => p.target === player) ? 0.6 : 0;
    default:
      return 0;
  }
}

/**
 * What the presidency itself is carrying this week, 0..1, independent of any
 * subject on the desk.
 *
 * The director read wars, floods and outbreaks and nothing else, so it could
 * not tell a collapsing presidency from a calm one: an administration a week
 * from articles of impeachment got the same paced, mostly-routine desk as one
 * governing comfortably, because none of the three facts that describe the
 * state of the presidency reached this file.
 *
 * The three terms are chosen so that no fact is billed twice, which is the
 * standing hazard here — the presidency's readings are composites of each
 * other, and summing them naively counts the same week three times:
 *
 * - `weakness` is the headline the whole game is decided on. Approval is read
 *   and its own constituents are not, because approval, stability, standing,
 *   readiness and treasury health are already inside it; reading approval
 *   beside approval would bill the public's mood at 30% of one term plus the
 *   whole of another.
 * - `hostility` is the other branch. Congressional disposition is independent
 *   of approval by construction: no congressional term enters the approval
 *   composite, and the Hill's regard for an administration and the country's
 *   are genuinely different readings — a president can be popular and still
 *   have lost the chamber.
 * - `escalation` is removal pressure's *direction*, and deliberately not its
 *   level. The level is 42% approval and 16% congressional disposition, so
 *   adding it as a fourth term would count both of the terms above a second
 *   time. What the arc's course says that neither level can is which way the
 *   week is moving: a approval of 0.4 that has been steady all term and one
 *   that arrived there from 0.7 in a month are the same level and not the same
 *   presidency. It also carries the arc's two other constituents — factional
 *   alignment and the run of recent damaging decisions — into the reading at
 *   the moment they move, which is the only moment they change the answer.
 */
export function presidencyPressure(campaign: Campaign): number {
  const weakness = 1 - campaign.player.metrics.approval;
  const hostility = 1 - campaign.congress.disposition;
  // No prior reading is not a reading of zero movement, but on the opening
  // turn there is no direction to report and any number would be invented.
  // Pressure easing floors at zero: a presidency clawing its way back is not
  // thereby a calm one, but it is not escalating either.
  const delta = selectRemovalPressureDelta(campaign) ?? 0;
  const escalation = clamp01(delta / ESCALATION_SPAN);
  return clamp01(
    weakness * PRESIDENCY_WEIGHTS.approval +
      hostility * PRESIDENCY_WEIGHTS.congress +
      escalation * PRESIDENCY_WEIGHTS.escalation,
  );
}

/**
 * How much of the board a class occupies once the state of the presidency is
 * read alongside its own subject.
 *
 * A collapsing presidency raises the floor under every class and lowers none:
 * a government in an impeachment spiral is not asked routine questions about
 * culture and justice, it is asked hard ones, and the desk should read that
 * way whether or not a province happens to be flooded the same week. The union
 * is taken over the room the subject leaves rather than added, so the reading
 * stays inside 0..1 and a war already burning at 0.9 cannot be made hotter
 * than a war can be.
 *
 * The ordering between classes survives — the lift is the same for all of
 * them, so a war still outranks a fresh cultural dispute — but the *gap*
 * narrows as the presidency fails, which is the intended reading rather than a
 * side effect: when the office itself is the crisis, what the week's decision
 * happens to be about matters less than that there is one.
 */
export function boardPressure(campaign: Campaign, scenarioClass: ScenarioClass): number {
  const subject = subjectPressure(campaign, scenarioClass);
  return clamp01(subject + (1 - subject) * PRESIDENCY_LIFT * presidencyPressure(campaign));
}

/**
 * How many decisions this week's board has earned. One ordinarily; more when
 * several separate subjects are each genuinely loaded, which is what a cascade
 * week is — not a week where one thing is very bad, but a week where the
 * government is being asked about more than one thing at once.
 */
export function deskCapacity(campaign: Campaign): number {
  const loaded = new Set<ScenarioClass>();
  for (const scenarioClass of ["war", "disaster", "public-health", "unrest", "foreign-crisis"] as ScenarioClass[]) {
    if (boardPressure(campaign, scenarioClass) >= CASCADE_THRESHOLD) loaded.add(scenarioClass);
  }
  return Math.max(1, Math.min(MAX_DESK_CAPACITY, loaded.size));
}

/**
 * How loaded the board must be before a staged decision is loud enough to stop
 * the presidency.
 *
 * The director has always said yes. `directorPicks` filters on `score > 0` and
 * stages up to `deskCapacity`, which floors at one, so as long as a single
 * selector is live the week has a decision — and with a corpus of a few hundred
 * something is live essentially every week. Wire that as a source of
 * presidential attention and `advanceUntilAttention` halts after exactly one
 * tick, every time: the weekly loop with a different button, and a ceremony
 * announcing a span it never spends.
 *
 * The floor is read on `boardPressure`, which is the subject and the state of
 * the presidency together, so it says two true things at once. A war, a flood
 * or a campaign being run against this government clears it on the subject
 * alone. A presidency far enough into its own collapse clears it with no
 * subject at all, which is this file's existing argument — when the office
 * itself is the crisis, what the week's decision happens to be about matters
 * less than that there is one.
 *
 * Measured on the probe in `attention-pacing.test.ts`, weeks staged out of a
 * fictional year on the US founding under its own charter, summed over three
 * boards: quiet, 18; the same boards held under strain every week, 156. The
 * wall above is what sets the floor. At 0.135 the boards held under strain
 * staged 17 weeks, no more than the quiet ones, which is the wrong direction
 * on the one reading this floor exists to respect: a failing office should be
 * asked more, not less.
 *
 * The cap is untouched. `MAX_DESK_CAPACITY` is held invariant because it
 * bounds what a player can read and decide in one sitting, which is exactly
 * why the floor is the thing that moves.
 */
export const STAGING_FLOOR = 0.1;

/**
 * Whether a staged decision has earned the right to stop the presidency.
 *
 * Read off the class the decision is about rather than its own weight, because
 * weight is what an author gave a scenario and pressure is what the board is
 * actually carrying. A scenario source classifies a pick below the floor as
 * ambient: it still reaches the desk, and the folio is still where it is
 * answered — what it stops doing is halting the world to say so.
 */
export function stagingWarranted(campaign: Campaign, scenarioClass: ScenarioClass): boolean {
  return boardPressure(campaign, scenarioClass) > STAGING_FLOOR;
}

/**
 * Turns since a critical scenario last reached the desk, or `undefined` if
 * none has inside the cooldown. Bounded the same way `turnsSinceStaged` is,
 * and for the same reason: a critical answered longer ago than the cooldown is
 * the same fact as no critical at all.
 */
export function turnsSinceCriticalStaged(campaign: Campaign): number | undefined {
  for (let back = 1; back <= CRITICAL_COOLDOWN; back += 1) {
    const turn = campaign.turn - back;
    if (turn < 0) break;
    if (campaign.player.flags[severityStagedFlag("critical", turn)] === true) return back;
  }
  return undefined;
}

/**
 * The severity multiplier: one for everything except a critical arriving too
 * soon after the last one, which is damped rather than banned — and damped
 * less the more of the board its own subject is actually occupying, so a war
 * that is genuinely burning is never told to wait its turn.
 */
export function severityFactor(campaign: Campaign, candidate: ScenarioSelectorLike, pressure: number): number {
  if (candidate.severity !== "critical") return 1;
  if (turnsSinceCriticalStaged(campaign) === undefined) return 1;
  return CRITICAL_DAMP_FLOOR + (1 - CRITICAL_DAMP_FLOOR) * clamp01(pressure);
}

export type StagedCandidate<T extends ScenarioSelectorLike = ScenarioSelectorLike> = {
  readonly candidate: LiveSelector<T>;
  readonly score: number;
  readonly recency: number;
  readonly pressure: number;
  /** The severity damping applied, kept readable so the pacing probe can see it. */
  readonly severity: number;
};

/**
 * Every live candidate, priced by the director, best first.
 *
 * Exposed whole rather than only its winners for the same reason the NPC agent
 * exposes its ranked list: a pacing decision that cannot be inspected cannot be
 * tuned, and the anti-repetition probe needs to read the scores rather than
 * infer them from what happened to be drawn.
 */
export function rankCandidates<T extends ScenarioSelectorLike>(
  campaign: Campaign,
  selectors: readonly T[],
): readonly StagedCandidate<T>[] {
  const latest = new Map<string, number>();
  for (const item of Object.values(campaign.cases ?? {})) {
    if (item.kind !== "authored-scenario" || !item.contentPin?.scenarioId) continue;
    const turn = selectTurnOfDate(campaign, item.raisedAt);
    latest.set(item.contentPin.scenarioId, Math.max(latest.get(item.contentPin.scenarioId) ?? -1, turn));
  }
  const scored = liveSelectors(campaign, selectors)
    .filter(({ selector }) => {
      if (selector.once || selector.family) return true;
      const prior = latest.get(selector.id);
      return prior === undefined || campaign.turn - prior >= CLASS_COOLDOWN;
    })
    .map((candidate) => {
    const recency = recencyFactor(campaign, candidate.selector.class);
    const pressure = boardPressure(campaign, candidate.selector.class);
    const severity = severityFactor(campaign, candidate.selector, pressure);
    return {
      candidate,
      recency,
      pressure,
      severity,
      score: candidate.weight * recency * severity * (1 + ESCALATION_FACTOR * pressure),
    };
  });
  // Ties break on scenario id, never on pool order, so re-ordering the corpus
  // cannot silently re-pace the game.
  return [...scored].sort((a, b) => b.score - a.score || a.candidate.selector.id.localeCompare(b.candidate.selector.id));
}

/**
 * What reaches the desk this week, as selectors.
 *
 * The draw stays weighted rather than becoming "highest score wins": a
 * deterministic best-candidate rule makes the whole campaign predictable from
 * the board, which is the same failure as repetition wearing a different hat.
 * What the director changes is the shape of the distribution, not the fact that
 * it is one. Selectors rather than bodies, so a five-figure pool is never
 * rendered to be discarded.
 */
export function directorPicks<T extends ScenarioSelectorLike>(
  campaign: Campaign,
  selectors: readonly T[],
): readonly LiveSelector<T>[] {
  const remaining = [...rankCandidates(campaign, selectors)].filter((entry) => entry.score > 0);
  const picks: LiveSelector<T>[] = [];
  const capacity = deskCapacity(campaign);
  const stream = createRngStreams(campaign.seed).stream("director", campaign.turn);

  for (let slot = 0; slot < capacity && remaining.length > 0; slot += 1) {
    const total = remaining.reduce((sum, entry) => sum + entry.score, 0);
    let roll = stream.next() * total;
    let index = remaining.length - 1;
    for (let i = 0; i < remaining.length; i += 1) {
      roll -= remaining[i]!.score;
      if (roll <= 0) {
        index = i;
        break;
      }
    }
    const [chosen] = remaining.splice(index, 1);
    picks.push(chosen!.candidate);
    // A second decision in one week must be about something else. Without this
    // a cascade week is two scenarios from the class that is loudest, which is
    // repetition inside a single turn rather than across turns.
    for (let i = remaining.length - 1; i >= 0; i -= 1) {
      if (remaining[i]!.candidate.selector.class === chosen!.candidate.selector.class) remaining.splice(i, 1);
    }
    // One building-shaking decision per week, maximum. A cascade week may stack
    // subjects; it may not stack severities — two criticals in one sitting is
    // the volume knob failure this whole dial exists to end.
    if (chosen!.candidate.selector.severity === "critical") {
      for (let i = remaining.length - 1; i >= 0; i -= 1) {
        if (remaining[i]!.candidate.selector.severity === "critical") remaining.splice(i, 1);
      }
    }
  }
  return picks;
}

/** The same week, rendered — for a caller holding whole defs rather than a pool. */
export function stageScenarios(campaign: Campaign, defs: readonly ScenarioDef[]): readonly CastScenario[] {
  return directorPicks(campaign, defs).map((pick) => castBound(campaign, pick.selector, pick.counterpart));
}

// --- Announced fuses: the reckoning the player was told was coming ---
//
// A delayed consequence the player has been warned about is the one return
// hook this game permits itself. It is honest because it burns in turns and in
// nothing else: no wall clock touches any of this, no absence makes it worse,
// and a player who never leaves reaches the same week as one who does. What
// creates the pull is the open question, not a timer running down while the app
// is shut.
//
// Mechanically a fuse is an authored construct that already existed: a reply
// stamps a deed flag, and some scenario in the pool waits on that flag with an
// `agedAtLeast` and ripens onto the desk with a `flagAge` boost. Both halves
// are required here. The aged wait is what makes the answer late rather than
// scripted, and the boost is what makes it arrive rather than merely be
// possible — a follow-up with neither is not a fuse, it is a door.

/**
 * Where a fuse has got to, in the only units it has.
 *
 * "lit" is the turn the deed was stamped; "burning" is every turn of the wait
 * after that; "due" is the wait served, when the reader may reach the desk any
 * week the draw gives it. There is deliberately no "landed": a fuse that landed
 * is a scenario the player answered on the desk, which the desk itself is the
 * record of — the digest leads with a fuse only while the answer is still
 * coming, and reporting a resolved one would be the game telling the player
 * about a week they already played.
 */
export type FuseStatus = "lit" | "burning" | "due";

export type AnnouncedFuse = {
  /** The deed the player did, as the flag that remembers it. Never player copy. */
  readonly flag: string;
  /** The scenario waiting on it — what the answer will arrive as. */
  readonly reader: string;
  /** Turns the wait has run, saturating at its own length rather than climbing forever. */
  readonly turnsBurning: number;
  /** Turns of the authored wait still to serve; zero once the fuse is due. */
  readonly turnsRemaining: number;
  readonly status: FuseStatus;
};

type FuseGate = { readonly flag: string; readonly agedAtLeast: number };

/**
 * The fuse a selector is the reader of, if it is one.
 *
 * A scenario may carry several flag conditions; the fuse is the aged one, and
 * the first aged one is taken rather than the longest, because a writer
 * listing two waits has authored a scenario that opens when both have run and
 * the earlier one is not the thing the player is waiting on.
 */
function fuseGate(selector: ScenarioSelectorLike): FuseGate | undefined {
  if (!(selector.boosts ?? []).some((boost) => boost.source === "flagAge")) return undefined;
  for (const condition of selector.conditions) {
    if (condition.kind !== "flag" || !condition.is || condition.agedAtLeast === undefined) continue;
    return { flag: condition.flag, agedAtLeast: condition.agedAtLeast };
  }
  return undefined;
}

/**
 * How long this flag has been standing, capped at the wait it is being measured
 * against. Only that window is scanned, for the reason `turnsSinceStaged`
 * scans a bounded one: a deed older than the wait and a deed twice as old are
 * the same fact to a fuse, and distinguishing them would cost more the longer
 * a campaign ran. A flag with no marker inside the window — including one
 * stamped before markers existed — has served its wait by construction.
 */
function turnsBurning(campaign: Campaign, flag: string, wait: number): number {
  for (let back = 0; back <= wait; back += 1) {
    const turn = campaign.turn - back;
    if (turn < 0) break;
    if (campaign.player.flags[flagSetFlag(flag, turn)] === true) return back;
  }
  return wait;
}

/**
 * Every reckoning this campaign is currently owed, soonest first.
 *
 * A fuse is live while the deed is stamped and the scenario that answers it has
 * not yet been answered. Ordering is total and deterministic — remaining turns,
 * then the deed, then the reader — so two builds of the same campaign lead with
 * the same fuse.
 */
export function announcedFuses<T extends ScenarioSelectorLike>(
  campaign: Campaign,
  selectors: readonly T[],
): readonly AnnouncedFuse[] {
  const fuses: AnnouncedFuse[] = [];
  for (const selector of selectors) {
    const gate = fuseGate(selector);
    if (!gate) continue;
    if (campaign.player.flags[gate.flag] !== true) continue;
    if (campaign.player.flags[scenarioFiredFlag(selector.id)] === true) continue;
    const burning = turnsBurning(campaign, gate.flag, gate.agedAtLeast);
    const remaining = gate.agedAtLeast - burning;
    fuses.push({
      flag: gate.flag,
      reader: selector.id,
      turnsBurning: burning,
      turnsRemaining: remaining,
      status: remaining === 0 ? "due" : burning === 0 ? "lit" : "burning",
    });
  }
  return [...fuses].sort(
    (a, b) => a.turnsRemaining - b.turnsRemaining || a.flag.localeCompare(b.flag) || a.reader.localeCompare(b.reader),
  );
}

/**
 * The fuse a return leads with: the one closest to answering itself.
 */
export function leadingFuse<T extends ScenarioSelectorLike>(
  campaign: Campaign,
  selectors: readonly T[],
): AnnouncedFuse | undefined {
  return announcedFuses(campaign, selectors)[0];
}

// What a burning fuse sounds like on the way back in. Deliberately says nothing
// about which deed or which week: the deed is a flag id and the week is the
// scenario's to open, and a lead that named either would spend the answer the
// player is waiting for. It says only that one is owed, which is the whole of
// what the player was promised.
const FUSE_LINES: Readonly<Record<FuseStatus, string>> = {
  lit: "Something this government decided is going to be answered, and it will not be answered this week.",
  burning: "The answer to what this government decided has still not come. It is not going to be forgotten.",
  due: "The answer to what this government decided is owed now, and it can arrive any week.",
};

/**
 * A return's opening lines: the burning fuse first, then the account of what
 * moved while the player was away.
 *
 * The rule is the lead, not the content — an absence that changed nothing still
 * opens on the reckoning, and an absence that changed a great deal does not get
 * to bury it. `summary` is whatever the caller's digest already says; this
 * function neither reads a clock nor writes one, so leading with a fuse can
 * never become a reason to open the app at a particular hour.
 */
export function digestLead<T extends ScenarioSelectorLike>(
  campaign: Campaign,
  selectors: readonly T[],
  summary: string,
): readonly string[] {
  const fuse = leadingFuse(campaign, selectors);
  return fuse ? [FUSE_LINES[fuse.status], summary] : [summary];
}

/** The flags a staged week stamps, so the next week knows what it just showed. */
export function stagedClassFlags(staged: readonly CastScenario[], turn: number): readonly string[] {
  return [
    ...new Set(staged.flatMap((cast) => [classStagedFlag(cast.def.class, turn), severityStagedFlag(cast.def.severity, turn)])),
  ];
}
