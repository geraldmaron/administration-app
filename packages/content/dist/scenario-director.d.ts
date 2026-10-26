import { type Campaign, type GameDate } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type ScenarioClass, type ScenarioDef } from "./scenario.js";
import { type CastScenario, type LiveSelector, type ScenarioSelectorLike } from "./scenario-cast.js";
/**
 * Turns a class must wait before it may be staged again. Long enough that a
 * player noticing "another one of these" is noticing something real, short
 * enough that a class is not effectively retired by one appearance.
 */
export declare const CLASS_COOLDOWN = 6;
/**
 * How long after the cooldown a class is still damped. Without the taper a
 * class is banned for six weeks and then exactly as likely as one nobody has
 * seen all campaign, which is a cliff the player can feel.
 */
export declare const SUPPRESSION_WINDOW = 14;
/** Most decisions a single week may put on the desk, however loaded it is. */
export declare const MAX_DESK_CAPACITY = 3;
/**
 * The shares of the presidency's own reading. Approval leads because it is the
 * figure every ending is decided by; the chamber follows because it is the
 * branch that actually removes a president; direction of travel is worth least
 * of the three because a single week's movement is the noisiest of them.
 */
export declare const PRESIDENCY_WEIGHTS: {
    readonly approval: 0.45;
    readonly congress: 0.3;
    readonly escalation: 0.25;
};
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
export declare const PRESIDENCY_LIFT = 0.27;
/**
 * Turns after a critical week during which another critical is damped. Shorter
 * than the class cooldown on purpose: severity pacing is about volume, not
 * repertoire, and a month of ordinary governing is what makes the next
 * building-shaking week land as one.
 */
export declare const CRITICAL_COOLDOWN = 4;
/**
 * Turns since this class last reached the desk, or `undefined` if it never has.
 * Only the suppression window is looked back over: a class last seen forty
 * turns ago and one never seen are the same fact for pacing purposes, and
 * walking the whole history to distinguish them would grow with the campaign.
 */
export declare function turnsSinceStaged(campaign: Campaign, scenarioClass: ScenarioClass): number | undefined;
/**
 * The recency multiplier: zero inside the cooldown, then climbing back to one
 * across the rest of the window. A class the player has not seen is never
 * *boosted* for novelty — novelty is the thing this system is deliberately not
 * optimizing for, because a game that always shows you the least recent thing
 * is as predictable as one that always shows you the same thing.
 */
export declare function recencyFactor(campaign: Campaign, scenarioClass: ScenarioClass): number;
/**
 * How much of the board this class's *subject* currently occupies, 0..1.
 *
 * This is the escalation-over-novelty term: a running war outranks a fresh
 * minor incident, because the war is what the government is actually living
 * through and a scenario about it is a continuation rather than an interruption.
 * A class with no board state behind it reads zero and competes on its own
 * authored weight, exactly as it did before the director existed.
 */
export declare function subjectPressure(campaign: Campaign, scenarioClass: ScenarioClass): number;
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
export declare function presidencyPressure(campaign: Campaign): number;
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
export declare function boardPressure(campaign: Campaign, scenarioClass: ScenarioClass): number;
/**
 * How many decisions this week's board has earned. One ordinarily; more when
 * several separate subjects are each genuinely loaded, which is what a cascade
 * week is — not a week where one thing is very bad, but a week where the
 * government is being asked about more than one thing at once.
 */
export declare function deskCapacity(campaign: Campaign): number;
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
export declare const STAGING_FLOOR = 0.1;
/**
 * Whether a staged decision has earned the right to stop the presidency.
 *
 * Read off the class the decision is about rather than its own weight, because
 * weight is what an author gave a scenario and pressure is what the board is
 * actually carrying. A scenario source classifies a pick below the floor as
 * ambient: it still reaches the desk, and the folio is still where it is
 * answered — what it stops doing is halting the world to say so.
 */
export declare function stagingWarranted(campaign: Campaign, scenarioClass: ScenarioClass): boolean;
/**
 * Turns since a critical scenario last reached the desk, or `undefined` if
 * none has inside the cooldown. Bounded the same way `turnsSinceStaged` is,
 * and for the same reason: a critical answered longer ago than the cooldown is
 * the same fact as no critical at all.
 */
export declare function turnsSinceCriticalStaged(campaign: Campaign): number | undefined;
/**
 * The severity multiplier: one for everything except a critical arriving too
 * soon after the last one, which is damped rather than banned — and damped
 * less the more of the board its own subject is actually occupying, so a war
 * that is genuinely burning is never told to wait its turn.
 */
export declare function severityFactor(campaign: Campaign, candidate: ScenarioSelectorLike, pressure: number): number;
export type StagedCandidate<T extends ScenarioSelectorLike = ScenarioSelectorLike> = {
    readonly candidate: LiveSelector<T>;
    readonly score: number;
    readonly recency: number;
    readonly pressure: number;
    /** The severity damping applied, kept readable so the pacing probe can see it. */
    readonly severity: number;
};
/**
 * Calendar days recurring business rests: thirteen weeks, a quarter. Counted in
 * days from the later of the last raise and the last answer or explicit
 * decline, so a President who answers everything is never asked the same
 * routine question twice inside ninety days, however late the answer came. A
 * deferral does not restart the rest (deferring would then buy quiet), and
 * expiry or withdrawal leaves it keyed to the raise. Counted in dates, not
 * turns, because a turn index groups dates into weeks and thirteen of them can
 * span as few as eighty-five days.
 */
export declare const RECURRING_REST_DAYS: number;
export type RecurrenceKind = "unique" | "arc" | "episode" | "recurring";
export declare function recurrenceKind(selector: ScenarioSelectorLike): RecurrenceKind;
/**
 * Whether a template last raised on turn `prior` may be raised again this week.
 * `rested` is the date its rest runs from; without it the rest runs from the
 * raise week, which is all a case with no dated answer can offer.
 */
export declare function recurrenceAllows(campaign: Campaign, selector: ScenarioSelectorLike, counterpart: NationId, prior: number | undefined, rested?: GameDate): boolean;
/**
 * Every live candidate, priced by the director, best first.
 *
 * Exposed whole rather than only its winners for the same reason the NPC agent
 * exposes its ranked list: a pacing decision that cannot be inspected cannot be
 * tuned, and the anti-repetition probe needs to read the scores rather than
 * infer them from what happened to be drawn.
 */
export declare function rankCandidates<T extends ScenarioSelectorLike>(campaign: Campaign, selectors: readonly T[]): readonly StagedCandidate<T>[];
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
export declare function directorPicks<T extends ScenarioSelectorLike>(campaign: Campaign, selectors: readonly T[]): readonly LiveSelector<T>[];
/** The same week, rendered — for a caller holding whole defs rather than a pool. */
export declare function stageScenarios(campaign: Campaign, defs: readonly ScenarioDef[]): readonly CastScenario[];
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
/**
 * Every reckoning this campaign is currently owed, soonest first.
 *
 * A fuse is live while the deed is stamped and the scenario that answers it has
 * not yet been answered. Ordering is total and deterministic — remaining turns,
 * then the deed, then the reader — so two builds of the same campaign lead with
 * the same fuse.
 */
export declare function announcedFuses<T extends ScenarioSelectorLike>(campaign: Campaign, selectors: readonly T[]): readonly AnnouncedFuse[];
/**
 * The fuse a return leads with: the one closest to answering itself.
 */
export declare function leadingFuse<T extends ScenarioSelectorLike>(campaign: Campaign, selectors: readonly T[]): AnnouncedFuse | undefined;
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
export declare function digestLead<T extends ScenarioSelectorLike>(campaign: Campaign, selectors: readonly T[], summary: string): readonly string[];
/** The flags a staged week stamps, so the next week knows what it just showed. */
export declare function stagedClassFlags(staged: readonly CastScenario[], turn: number): readonly string[];
