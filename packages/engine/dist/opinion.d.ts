import type { Nation } from "@admin/world";
import { type OpinionDriver } from "./opinion-drivers.js";
import type { Campaign, PublicMood } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
import { type OpinionCause } from "./opinion-causes.js";
import { type Bloc, type PartyShares } from "./electorate.js";
import type { UsMajorParty } from "./state-legislature.js";
export { MAX_TURN_POLARIZE, polarize, revertPolarization } from "./polarization.js";
/**
 * The six standing judgments. Each is 0..1 and each is a claim about the
 * government rather than about the country: `prosperity` is not GDP, it is
 * whether people believe this administration has made them better off.
 */
export { OPINION_DRIVERS, type OpinionDriver } from "./opinion-drivers.js";
/**
 * What each driver is, in the terms the public holds it in. Written as the
 * complaint rather than the virtue, because that is the form an opinion
 * actually arrives in and the form a surface has to render.
 */
export declare const OPINION_DRIVER_MEANINGS: Readonly<Record<OpinionDriver, string>>;
/**
 * The base weights: what a public weighs when nothing in particular is
 * happening. Exported and named because "why is my approval falling" has to be
 * inspectable rather than opaque, and because they are now the primary balance
 * lever for the whole domestic half of the game — the headline's only weight
 * table, where there used to be two stacked on each other.
 *
 * Prosperity leads because it leads everywhere, in every democracy anyone has
 * measured. Unity is last not because it matters least but because it moves
 * slowest: it is the driver that decides whether a *recoverable* administration
 * is recoverable, and it does that through `polarization` below rather than
 * through its own share.
 */
export declare const OPINION_WEIGHTS: Readonly<Record<OpinionDriver, number>>;
/**
 * How much louder a driver gets when the week is about it.
 *
 * This is the mechanism that makes the model political rather than arithmetic.
 * A public does not weigh six things evenly and permanently; it weighs whatever
 * is on the front page. A war makes security the whole election, a flood makes
 * services it, and a government that was surviving on a strong economy
 * discovers that the economy has stopped counting.
 *
 * Multipliers rather than replacement weights, applied to the base above and
 * then renormalized, so the base ordering survives and salience shifts it
 * instead of overwriting it.
 */
/**
 * What the week did, in the words the surface prints beside a driver that has
 * been made louder.
 *
 * Keyed on `SALIENCE_MULTIPLIERS` itself, so a new way for a week to make a
 * judgment matter more fails the typecheck unless it also says what it is. The
 * whole point of the multipliers is that a public weighs whatever is on the
 * front page, and a driver marked "louder this week" with no front page named
 * is the mechanism's own claim withheld from the person it is about.
 */
export declare const SALIENCE_REASONS: {
    readonly atWar: "the country is at war";
    readonly conditionActive: "a disaster is live at home";
    readonly economicPain: "prices or joblessness are biting";
    readonly disorder: "the country is carrying unrest";
    readonly scandalLive: "a scandal is running";
    readonly pumpShock: "gasoline prices are climbing";
};
export type SalienceKey = keyof typeof SALIENCE_MULTIPLIERS;
export declare const SALIENCE_MULTIPLIERS: {
    /** The player is in a war, at any intensity. */
    readonly atWar: {
        readonly security: 1.7;
    };
    /** An emergency, not an economy, is live on the player's own ground (`reliefConditions`). */
    readonly conditionActive: {
        readonly services: 1.7;
        readonly competence: 1.25;
    };
    /** Prices or joblessness are biting: running past where the term began (`ECONOMIC_PAIN`). */
    readonly economicPain: {
        readonly prosperity: 1.45;
    };
    /** The country is carrying unrest or an insurgency. */
    readonly disorder: {
        readonly security: 1.4;
        readonly competence: 1.2;
    };
    /** A story about the administration is running, whatever opened it. */
    readonly scandalLive: {
        readonly integrity: 1.6;
    };
    /** The pump price has climbed sharply over the last several weeks (`pumpShock`). */
    readonly pumpShock: {
        readonly prosperity: 1.25;
    };
};
/**
 * How far past where the term began prices or joblessness have to run before a
 * week is about the economy.
 *
 * Against the term start, not an absolute line and not the country's resting
 * point. An absolute line cannot tell a country that has always lived with ten
 * percent unemployment from one that just arrived there, and the resting point
 * moves with order, so a country coming apart would read its own rising prices
 * as normal exactly when they were not. What a public remembers is where things
 * stood when this government took over. Three points of inflation and two of
 * joblessness: in the United States that is prices rising near 6% a year or
 * unemployment near 6%, the levels at which both have led the news before.
 */
export declare const ECONOMIC_PAIN: {
    readonly inflation: 0.03;
    readonly unemployment: 0.02;
};
/**
 * The six judgments as an administration inherits them, plus how divided the
 * country already is.
 *
 * Seeded from the dataset the nation actually carries, so a president wakes up
 * to a public rather than to a blank one — and every reading is pulled toward
 * the middle, because what a country thinks of a government on its first day
 * is mostly what it thought of the last one.
 *
 * `competence` alone opens flat at the midpoint. It is the only driver that is
 * purely a judgment of *this* administration, and on turn one there is nothing
 * to judge.
 */
export declare function openingMood(nation: Nation): PublicMood;
/**
 * What is on the front page this week, by name.
 *
 * The list `salientWeights` walks, lifted out of it so the reason a judgment
 * got louder can be read as well as applied. Before this the multipliers fired
 * and were discarded, and the surface drew "Louder this week" with nothing
 * attached to it — the mechanism's own claim, withheld from the person it is a
 * claim about.
 */
export declare function salienceLevels(campaign: Campaign): Readonly<Partial<Record<SalienceKey, number>>>;
/**
 * How long a story stays on the front page once it breaks, in weeks.
 *
 * A public re-reads what is new. A war, a disaster or a scandal makes its
 * judgment louder when it breaks and when it gets worse, and after two months
 * of the same news the country has priced it in: the level still bills its
 * judgment through the targets, but it no longer outweighs everything else.
 */
export declare const SALIENCE_HOLD_WEEKS = 8;
/** How much worse a story has to get to break again: a quarter worse, and at least a twentieth of its scale. */
export declare const SALIENCE_ESCALATION: {
    readonly ratio: 1.25;
    readonly floor: 0.05;
};
export type SalienceMemory = Readonly<Partial<Record<SalienceKey, {
    readonly since: number;
    readonly level: number;
}>>>;
/** The memory the week leaves: a story that ended is forgotten, one that broke or got worse is stamped now. */
export declare function nextSalienceMemory(campaign: Campaign): SalienceMemory;
export declare function selectSalience(campaign: Campaign): readonly SalienceKey[];
/**
 * Whether prices or joblessness have run far enough past where the term began
 * to be what the week is about. The term start is the economy the founding
 * opened on, which is the authored one.
 */
export declare function economyHurts(now: Nation["stats"]["economy"], termStart: Nation["stats"]["economy"]): boolean;
/**
 * The weights this week, after the board has had its say. Renormalized to sum
 * to 1 so approval stays a 0..1 reading whatever is happening.
 */
export declare function salientWeights(campaign: Campaign): Readonly<Record<OpinionDriver, number>>;
/**
 * Approval, before polarization has its say. Separated so a surface can show
 * the raw judgment and the compressed reading as two different facts — the
 * first is what the country thinks, the second is what it will admit to.
 */
export declare function rawApproval(mood: PublicMood, weights: Readonly<Record<OpinionDriver, number>>): number;
/**
 * The country read through its five blocs this week: the valence every bloc
 * reads, the stock that sets how far apart they start, the erosion of the
 * President's own side, each bloc's approval and the headline they add up to.
 *
 * The one computation of approval. The headline is the share-weighted sum of
 * the blocs, so polarization acts once, inside the bloc formula, and nothing
 * compresses or damps the figure after it.
 */
export type ElectorateReading = {
    readonly raw: number;
    /** The rally the country's wars are adding to the record, in valence units. */
    readonly rally: number;
    readonly valence: number;
    readonly polarization: number;
    readonly erosion: number;
    readonly shares: Readonly<Record<Bloc, number>>;
    readonly partisanship: Readonly<Record<Bloc, number>>;
    readonly issue: Readonly<Record<Bloc, number>>;
    readonly approvals: Readonly<Record<Bloc, number>>;
    readonly headline: number;
};
/** The most every issue term together may move one bloc, in logits. */
export declare const ISSUE_BLOC_CAP = 0.3;
export declare function selectElectorate(campaign: Campaign, mood?: PublicMood): ElectorateReading;
/** How far the President's own identifiers still approve: what the caucus reads. */
export declare function ownIdentifierApproval(campaign: Campaign): number;
/**
 * Approval for a mood read against this campaign's week — the campaign's own
 * mood by default, or a proposed one.
 *
 * The computation. Callers who want the campaign's settled headline read
 * `selectApproval` instead; this is what settles it.
 */
export declare function approvalFor(campaign: Campaign, mood?: PublicMood): number;
/**
 * The campaign's approval rating: the headline, as stored.
 *
 * Reads the settled figure rather than recomputing, so every surface, the
 * removal arc and the ledger's own diff are quoting one number. `apply()` is
 * what puts it there.
 */
export declare function selectApproval(campaign: Campaign): number;
/**
 * Settle the stored headline against the campaign as it now stands.
 *
 * The one writer of `metrics.approval`, called at the end of every `apply()`
 * and wherever the turn loop moves the public outside a packet. Per packet
 * rather than per effect because approval reads more than the mood: the
 * week's salience, the scandals, the force record and the party shares.
 */
export declare function recomputeApproval(campaign: Campaign): Campaign;
/** Who the opening is read for: the party shares the campaign drew and the President's side of the aisle. */
export type OpeningElectorate = {
    readonly shares: PartyShares;
    readonly anchor: UsMajorParty;
    readonly independent?: boolean;
};
/**
 * The opening reading, for a nation nobody is governing yet: at the oath, with
 * nobody's honesty in question and nothing on the record, read on the party
 * shares the campaign drew. Founding then runs `recomputeApproval` against the
 * real board, which lands on the same figure while the opening week is about
 * nothing in particular.
 */
export declare function openingApproval(nation: Nation, electorate?: OpeningElectorate): number;
export type OpinionContribution = {
    readonly driver: OpinionDriver;
    readonly value: number;
    readonly weight: number;
    /** What this driver is currently contributing to approval, 0..1 of the total. */
    readonly share: number;
    /** Whether the week has made this driver louder than its resting weight. */
    readonly salient: boolean;
};
/**
 * Approval broken into what is producing it — the reading a player needs to
 * answer "why". Never the arithmetic itself: a surface renders these as
 * language, in the same register every other cost is quoted in.
 */
export declare function selectOpinionReading(campaign: Campaign): readonly OpinionContribution[];
/**
 * Move the public's judgment.
 *
 * The one writer of mood. Deltas arrive from the impact model (what a decision
 * did to people and to money) and from the turn phases (what the world did);
 * nothing sets a driver absolutely, because a government does not get to
 * declare what the country thinks of it. Nothing damps them either:
 * polarization acts once, inside the blocs, on how far the record moves each
 * of them.
 */
export declare function applyMoodDeltas(mood: PublicMood, deltas: Partial<Record<OpinionDriver, number>>): PublicMood;
/**
 * How much polarization the live turn has already added, net of anything it
 * has already given back.
 *
 * Read off the ledger rather than kept as a field of its own: every packet
 * that moves the mood already leaves its diff on the ledger entry that records
 * it, tagged with the turn it belongs to. Walked from the tail, because the
 * ledger is append-only and turn-ordered. This is what lets a joint ceiling see
 * a scenario decision, which commits through `apply()` mid-week, entirely
 * outside `advanceTurn`.
 */
export declare function polarizationRiseThisTurn(campaign: Campaign): number;
/**
 * How fast a judgment moves toward what the country can actually see.
 *
 * Slow, and slow is the point. A public does not re-rate a government weekly
 * from first principles — it carries an impression and revises it. At this rate
 * a driver closes roughly half the distance to its target in eleven turns,
 * which makes a sustained condition worth far more than a dramatic week and is
 * the correct relationship between the two.
 */
export declare const OPINION_DRIFT = 0.06;
/**
 * How fast a judgment moves while the week is about it: a story on the front
 * page is re-read, not carried. This is where steep moves come from — a
 * disaster or a scandal sends its judgment most of the way to where the
 * country can see it in a couple of months — without any writer having to set
 * a judgment directly.
 */
export declare const SALIENT_OPINION_DRIFT = 0.2;
/** The judgments some story on the front page is making louder this week. */
export declare function salientDrivers(campaign: Campaign): ReadonlySet<OpinionDriver>;
/**
 * How many weeks `OPINION_DRIFT` needs to close half the gap between where a
 * judgment is and where the country's own board says it is heading.
 *
 * Derived rather than stated, so it cannot go stale against the rate. It is a
 * property of the rate alone and not of the size of the gap, which is the
 * honest thing to tell a president: a judgment twenty points off target and one
 * two points off both close half of it in the same eleven weeks.
 */
export declare const OPINION_HALF_LIFE_TURNS: number;
/**
 * One judgment, opened: where it is, where it is heading, what is taking it
 * there, and what made the week about it.
 */
export type OpinionDriverCauses = {
    readonly driver: OpinionDriver;
    /** What the country currently believes. */
    readonly level: number;
    /** What it would believe if it judged only on what it can see. */
    readonly target: number;
    /** Signed: positive means the judgment is still climbing toward its target. */
    readonly distance: number;
    /** The named terms behind the target, heaviest first. */
    readonly causes: readonly OpinionCause[];
    /** What put this judgment on the front page this week, if anything did. */
    readonly salience: readonly SalienceKey[];
};
/**
 * Why each of the six judgments is where it is.
 *
 * The reading `selectOpinionReading` could never give: that one says how much a
 * driver counts and what share of the week's approval it is, and says nothing
 * at all about why the level is the level. A president watching Security fall
 * from strong to zero over a term was given a definition and a percentage and
 * never a cause — while the actual cause, a cabinet quietly defecting and
 * taking `standing` to the floor, sat in `opinionTargets` unread by any screen.
 *
 * Causes are ordered by how much they are moving the judgment rather than by
 * the order the arithmetic reads them, because the question this answers is
 * "what is doing this to me" and the answer to that is a ranking.
 */
export declare function selectOpinionCauses(campaign: Campaign): readonly OpinionDriverCauses[];
/**
 * How much a term has to take off a judgment before it is the one weighing on
 * it: two and a half points of the judgment. Smaller drags are real and are
 * listed, but naming one as the reason would send a player after a rounding
 * error.
 */
export declare const MATERIAL_DRAG = 0.025;
/**
 * The heaviest term behind a judgment, which is the one sentence it is owed:
 * what pulls it down hardest, or, when nothing pulls it down by much, what
 * holds it up most.
 *
 * Never the resting base or the bounding line. The base is where every
 * judgment starts and the bound is arithmetic, so naming either as the reason
 * a judgment is where it is would answer a question nobody asked; a judgment
 * nothing moves is owed no sentence at all.
 */
export declare function heaviestCause(reading: OpinionDriverCauses): OpinionCause | undefined;
/**
 * The week's drift toward what the country can see.
 *
 * Emitted as an effect like everything else rather than mutating state, so the
 * one path into `player.opinion` stays `apply()` and a week's movement in
 * public opinion is as replayable and diffable as every other change.
 */
export declare function driftOpinion(campaign: Campaign): PublicMood;
/** What the weekly revision packet says, so a reader of the ledger can tell it from everything else. */
export declare const OPINION_WEEK_SUMMARY = "The country revises its reading of the administration.";
/**
 * The week the public has, expressed as a packet.
 *
 * Runs late in the turn — after the world has acted, the wars and conditions
 * have taken their week, the cabinet has answered and the press has hardened
 * around it — because what the country is judging is the week that just
 * happened rather than the one before it. Before removal, so the arc reads an
 * approval rating that already includes the public's revision of it.
 */
export declare const opinionPhase: TurnPhase;
