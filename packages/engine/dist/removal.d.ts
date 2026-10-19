import type { Charter } from "@admin/world";
import { type FragilityReading } from "./fragility.js";
import { type RemovalVote } from "./removal-votes.js";
import type { Campaign, RemovalArc } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
export * from "./removal-votes.js";
/**
 * What removal pressure is made of.
 *
 * `congress` is the branch that actually removes a president, and it was
 * missing: the arc read the player's own metrics, their alignment and their
 * recent decisions, and never once read the chamber that brings the articles.
 * A government that has gone around Congress repeatedly is in a different kind
 * of trouble from one that is merely unpopular, and until this term existed the
 * model could not tell those two apart.
 *
 * The other three are scaled down rather than left alone, because the weights
 * are shares of one pressure and a fourth term added on top would silently
 * raise every campaign's reading by the amount of the new one.
 *
 * `floors` is the fifth, and the only one that reads a breach rather than a
 * level. Every other term ultimately runs through a composite that the opinion
 * layer deliberately damps, so a government could be insolvent for two years
 * out of four, hold its own country's stability on the floor and answer nobody
 * abroad, and the arc would read that as a somewhat unpopular administration.
 * Being unable to pay is not a low score; it is a fact the country can see, and
 * it belongs in the reading on its own terms. Sharing the same fifth as
 * Congress because they are the same order of fact: something visible from
 * outside the building that an unpopular-but-functioning government does not
 * have against it.
 *
 * The other four are scaled down again for the reason above. `alignment` gives
 * up the most: it was the term that opened a beat before the first decision was
 * taken, purely off the founding program, and a share that large made the
 * opening legislative slate a louder statement about the administration than a
 * term of governing.
 */
/**
 * `faction` is the sixth weighted term, and the only one that reads the
 * President's own government rather than the country or the Congress.
 *
 * The cabinet phase can already produce the most dramatic person-outcome in the
 * game — a Secretary who "has stopped waiting to be given the job and started
 * assembling the votes for it" — and nothing followed it. The badge moved one
 * pairwise tie score by four tenths and put a word on a dossier. The rival
 * never mounted the challenge the headline said they were building, because no
 * institution in the model could see them: this list had no faction term, so a
 * president governing with half their cabinet in open revolt read exactly as
 * safe as one governing with none.
 *
 * The other five are scaled down rather than left alone, the same arithmetic
 * the `floors` term was added under: the weights are shares of one pressure,
 * and a sixth added on top would silently raise every campaign's reading by the
 * amount of the new one.
 */
export declare const PRESSURE_WEIGHTS: {
    readonly unpopularity: 0.331;
    readonly alignment: 0.184;
    readonly decisionHistory: 0.129;
    readonly congress: 0.129;
    readonly floors: 0.147;
    readonly faction: 0.08;
};
export declare const REMOVAL_METRIC_FLOOR = 0.05;
/**
 * The pressure each beat of the arc opens at. The last one is removal itself.
 *
 * These are set against what the pressure function actually reaches, not
 * against a tidy-looking spread — and, this time, against a desk that is
 * played. Every previous tuning of these numbers was measured on a harness
 * that founds a campaign, enacts a program and then ends turns: it never
 * stages a scenario and never answers one, so it was reading the drift of a
 * country nobody was governing. The three ladders that came out of it are not
 * superseded distributions, they are the wrong measurement, and the numbers
 * they quoted are not repeated here for that reason. Playing the desk lifts the
 * whole reading: a government that does nothing measured 0.194–0.279 on the
 * empty harness and 0.389–0.525 once it is handed decisions, so a first beat
 * pitched at 0.37 fired in every archetype the game has, which is the exact
 * defect — "a no-confidence murmur was the game's greeting rather than a
 * warning" — that these thresholds have now been re-tuned to fix twice.
 *
 * Measured over 30 campaigns, five ways of playing, two in-game years each, on
 * the full corpus, with the ladder set out of reach so that no campaign ended
 * early and the distribution describes the pressure function rather than itself.
 * Peak pressure by way of playing: 0.307–0.427 for a president who answers
 * whatever most repairs their worst reading, 0.321–0.410 for one who plays the
 * odds, 0.389–0.525 for one who takes the mildest answer every week and never
 * spends, 0.525–0.578 for one who ignores their own country, and 0.651–0.706
 * for one who reaches for the heaviest instrument available.
 *
 * 0.45 is the reading of a government that is failing at the job rather than
 * merely finding it hard. It sits above every campaign that was actually being
 * governed — carefully or opportunistically, both top out below 0.43 — and
 * below the median of one that has stopped governing, so the first murmur is
 * something a president earns rather than something they are greeted with.
 *
 * 0.52 is the reading at which a president who has abandoned their own country
 * is the ordinary case: every neglectful campaign measured at or above it. A
 * formal motion should be the normal consequence of that and an unusual one for
 * anybody else, and no careful campaign comes within a fifth of it.
 *
 * 0.60 is above what any way of playing short of the most destructive one
 * reaches on conditions alone, and below every reckless campaign. So a
 * president is removed outright only for governing destructively — and a
 * neglectful one is removed only by leaving a filed motion unanswered long
 * enough for it to carry itself the rest of the way, which is the clock that
 * `standingBeatPressure` exists to be. That distinction is the point of the
 * ladder: one presidency is ended by what it did, the other by what it never
 * got around to doing about it.
 *
 * The rungs are 0.07 and 0.08 apart, neither wider than `STANDING_BEAT_SWING`,
 * so a proceeding that keeps its justification for a full political season can
 * reach the next beat unaided. A wider gap would make that clock decorative.
 *
 * Chosen by what they produce as much as by where they sit, which is the test
 * the last tuning got right and the only one that catches a ladder that reads
 * plausibly and plays badly. Over two in-game years: a destructive presidency
 * is removed every time, at a median of turn 20, first warned around turn 8
 * rather than on turn 1 before it had answered anything; a neglectful one is
 * removed in five campaigns of eight, at a median of turn 82, with the best
 * part of a year between the first murmur and the end; a coasting one opens the
 * arc in five of eight and is never removed inside one term. Neither way of
 * actually governing is ever removed, and the one that plays the odds never
 * hears the first murmur at all. Over two full terms both the coaster and the
 * neglectful president are removed in five campaigns of six, which is the case
 * that matters most: without a working ladder every one of them ends on the
 * same fixed election date four in-game years out, whatever they have done.
 *
 * Note when re-measuring, because this is easy to get wrong: peak pressure is
 * not independent of these numbers. A campaign
 * that ends in removal stops accumulating, so lowering the final beat lowers
 * the observed maximum, and an open beat now feeds back into the reading as
 * well. Re-measure with the ladder out of reach, on the harness that plays the
 * desk, and re-measure at all of it whenever anything approval is made of moves.
 *
 * Every turn quoted above is a week of the fiction, which is what a turn is
 * today. Nothing in this file is calibrated in turns — every clock it owns is
 * written in days and the ladder is a level — so if a turn ever stops being a
 * week these figures are the ones to restate, not the constants under them.
 */
export declare const BEAT_THRESHOLDS: readonly [0.45, 0.52, 0.6];
export type PressureTermKey = keyof typeof PRESSURE_WEIGHTS;
export declare function computeRemovalPressure(state: Campaign, charter: Charter): number;
export type PressureComponent = {
    readonly term: PressureTermKey;
    readonly weight: number;
    /** The raw 0..1 reading for this term, before its weight is applied. */
    readonly reading: number;
    /** `reading * weight` — this term's actual share of the conditions figure. */
    readonly contribution: number;
};
export type PressureComposition = {
    /** The six weighted terms, in `PRESSURE_WEIGHTS` order. */
    readonly components: readonly PressureComponent[];
    /**
     * What an already-open beat adds or subtracts on top of the five terms
     * above — `standingBeatPressure`. Zero with no beat open. Not one of the
     * weighted components: it is not a share of a fixed whole, it is the
     * addend `computeRemovalPressure` layers on afterward, which is exactly
     * why a screen that only lists the weights never adds up to the
     * figure shown above it once a beat has stood for a while.
     */
    readonly standingBeatContribution: number;
    /**
     * What endogenous fragility added on top of the weighted terms.
     *
     * The weighted components price what this government has *done*; fragility
     * prices what it has *become*, and it multiplies rather than adds, so it
     * cannot be expressed as another share of a fixed whole. It is reported
     * here as its own accounted line for one reason: a player who is told their
     * pressure is higher than the terms add up to must be able to see why, by
     * name. An amplification a screen cannot account for is the hidden
     * difficulty multiplier the design forbids.
     */
    readonly fragilityContribution: number;
    /** The multiple applied, and which readings are carrying it. */
    readonly fragility: FragilityReading;
};
/**
 * The live breakdown behind `computeRemovalPressure`, for a screen that has
 * to show its work rather than repeat the constant weights. A screen printing
 * `PRESSURE_WEIGHTS` beside the figure was showing what each term is *worth*,
 * never what it is *doing this week* — two governments at the same weight can
 * be reading very differently on the term itself, and only this selector
 * exposes that.
 */
export declare function selectPressureComposition(state: Campaign, charter: Charter): PressureComposition;
/**
 * What a composition's own rows add to — the six terms, fragility's
 * multiple, and the open proceeding, combined by the same formula
 * `computeRemovalPressure` applies to the same readings.
 *
 * Deliberately not `RemovalArc.pressure`. That figure is carried from the
 * last weekly tick's removal phase and holds until the next one; a
 * composition is read live, off whatever state the screen passed in. A
 * mid-week act moves a reading the composition sees immediately and the
 * arc's stored pressure does not, so a screen that labeled its breakdown's
 * total "Removal pressure" — implying the arc's figure — could show a
 * breakdown that does not add up to the number printed above it. This is
 * the number the breakdown actually adds up to, for whatever state it was
 * read against.
 */
export declare function pressureCompositionTotal(composition: PressureComposition): number;
/**
 * What the arc can see that the polls cannot show it.
 *
 * Deliberately a share of a window rather than a count of weeks: what this
 * reports is "most of this administration has been spent unable to pay", a
 * sentence that stays true however long a week is, rather than a tally that
 * would double if the campaign's pace ever halved.
 */
/** How many inherited rows are still in the bounded history. The rest have scrolled out. */
export declare function inheritedRowsStillHeld(turn: number): number;
export declare function floorBreachPressure(state: Campaign): number;
/**
 * The two counts as they stand this week, for a screen that has to show a whip
 * count rather than a verdict. Empty for a charter that removes by any means
 * other than impeachment.
 */
export declare function selectRemovalVotes(state: Campaign, charter: Charter): readonly RemovalVote[];
/**
 * How much trouble the administration is actually in, for a surface that has to
 * color the reading.
 *
 * It is derived from the beats the arc has genuinely opened, never from a
 * threshold a screen picked. A screen calling pressure adverse at its own 0.45,
 * a figure matching nothing in this file, stays calm through the first beat
 * opening at 0.3 and then alarms at a level the arc still considers beat one.
 */
export declare function removalSeverity(arc: RemovalArc): "neutral" | "caution" | "adverse";
export declare function advanceRemovalArc(state: Campaign, charter: Charter): RemovalArc;
export declare function removalPhase(charter: Charter): TurnPhase;
