import { type NationId } from "@admin/world";
import { type StandingCondition } from "./condition-kinds.js";
import { type Campaign, type ConditionKind, type NationCondition, type NationRuntime } from "./state.js";
import type { RngStreams } from "./rng.js";
import { type DecisionStamp } from "./willingness.js";
/** The flag authored content gates on: `condition:<kind>:<nation>`. */
export declare function conditionFlag(kind: ConditionKind, nation: NationId): string;
/**
 * The flag for one city or state: `condition:<kind>:<nation>:<placeId>`.
 *
 * Set beside the nation flag. Ending that place clears this one only.
 */
export declare function conditionPlaceFlag(kind: ConditionKind, nation: NationId, placeId: string): string;
/** City when the draw names one, otherwise the state. A nation-wide condition has none. */
export declare function conditionPlaceId(place: {
    readonly city?: NationCondition["city"];
    readonly state?: NationCondition["state"];
}): string | undefined;
/** Nation flag, plus the place flag when the condition landed in a city or a state. */
export declare function conditionFlagsToSet(condition: Pick<NationCondition, "kind" | "nation" | "city" | "state">): readonly string[];
/**
 * Place flag always. The nation flag only when no other condition of this
 * kind is still active, so one fire ending does not release a second place.
 */
export declare function conditionFlagsToClear(campaign: Campaign, condition: NationCondition): readonly string[];
/**
 * The stored id. With a place in it, two of one kind can be open in one country
 * in the same week; without one it is exactly the id every save already carries,
 * so nothing written before places existed is re-keyed.
 */
export declare function conditionId(kind: ConditionKind, nation: NationId, turn: number, place?: string): string;
/**
 * The same reading, at the rate the country the player governs is actually
 * struck at.
 *
 * The world's rate is a rate for news: fifty capitals share two slots a week and
 * a foreign disaster is a line in the feed. Home is the subject of the game, and
 * at the world's rate the United States opened about one significant condition
 * every two years — a presidency in which the weather never happened. The
 * federal declaration record is about one major disaster declaration a week;
 * a condition is a far higher bar than a declaration, and this rate is set so
 * the country lives through four to eight of them a year.
 *
 * It scales the home queue only, so raising what a president has to govern
 * through cannot move what the other fifty countries are living through.
 */
export declare const HOME_DISASTER_ONSET_RATE = 0.06;
export declare const MAX_NEW_CONDITIONS_PER_TURN = 2;
export declare const MAX_NEW_HOME_CONDITIONS_PER_TURN = 1;
/**
 * Who is angry and what this administration did that angered them, as the
 * reason of record on an unrest onset at home.
 *
 * Two terms and no more, because two are what the country can actually answer
 * for: the group this administration has hurt most relative to the rest of its
 * axis, and the heaviest harm it remembers. Both are read off the cohort layer,
 * which is the same reading the electorate screen prints, so the sentence a
 * player reads here names people the screen was already showing them.
 *
 * Public: a street is not an intelligence read.
 */
export declare function unrestOnsetReason(campaign: Campaign): DecisionStamp | undefined;
/** Clamped linear 0..1. Below `lo` reads nothing; at or above `hi` reads full. */
export declare function ramp(value: number, lo: number, hi: number): number;
/**
 * The three standing conditions a rate opens, each read as how far the rate
 * has come from the country's own rest: where the ramp starts reading, and
 * where it reads full.
 *
 * Measured from the country's rest rather than from zero because the rest is
 * now the country's published economy. Argentina rests at the 200% the model
 * reads and South Africa at a third of its workforce out of work; an absolute
 * threshold would hold both in a permanent crisis for being themselves, which
 * is the defect the rule below exists to forbid.
 *
 * The start of each ramp is also where a new condition opens and not where a
 * running one closes (`standingHold`), and the gap between the two is the
 * hysteresis: a price shock opens five points above normal and holds until the
 * country is back at its own normal, so a rate wobbling around the opening
 * line cannot open and close the same crisis week after week. In the United
 * States the openings sit where they always did: a recession half a point of
 * growth under trend, a price shock near 8% inflation, a jobs shock near 8%
 * unemployment.
 */
export declare const RATE_CONDITIONS: {
    readonly recession: {
        readonly excess: (n: NationRuntime) => number;
        readonly opens: 0.005;
        readonly full: 0.05;
    };
    readonly "inflation-shock": {
        readonly excess: (n: NationRuntime) => number;
        readonly opens: 0.05;
        readonly full: 0.2;
    };
    readonly "unemployment-shock": {
        readonly excess: (n: NationRuntime) => number;
        readonly opens: 0.04;
        readonly full: 0.15;
    };
};
/**
 * How badly a country is set up for each standing condition, on 0..1.
 *
 * The rule these express, and the reason they are a table of readings rather
 * than a die roll with a country-flavored name: a condition's likelihood is a
 * reading of the country. A healthy economy essentially never opens a
 * recession; one already well under its trend opens one often.
 * `unrestChance` was always written this way — this is that shape generalized
 * to the other six.
 *
 * **Every row has to read zero for a country at rest.** The three rate rows
 * read the distance from the country's own resting economy (`RATE_CONDITIONS`),
 * and housing reads its inflation the same way: a country that rests at high
 * prices is not in a housing crunch for being itself.
 *
 * **Law 8 lives here.** Whatever figure a row reads is a figure that kind's
 * `IMPACTS` row may not write, or the condition becomes a function of itself
 * and can never close. `standingOnsetReads` below states each row's reading in
 * data so a test can enforce the pairing rather than a reviewer remembering it.
 */
export declare const STANDING_PRESSURE: Readonly<Record<Exclude<StandingCondition, "unrest">, (runtime: NationRuntime) => number>>;
/**
 * The stat path each standing row reads, as data.
 *
 * Only here so Law 8 can be enforced by a test instead of by a review habit:
 * the pairing between "what opens this" and "what it may not move" is the one
 * invariant in this file that is invisible at the call site and fatal when
 * broken. See `conditions.test.ts`.
 */
export declare const STANDING_ONSET_READS: Readonly<Record<StandingCondition, readonly string[]>>;
export declare function standingPressure(runtime: NationRuntime, kind: StandingCondition, atWar: boolean, campaign?: Campaign): number;
/**
 * How far this country is from its own resting state, on the axis this kind
 * reads — and therefore how much of the condition its own cause still holds up.
 *
 * The distinction between this and `standingPressure` is the difference between
 * how PRONE a country is and whether it is currently IN it, and collapsing the
 * two is what made a standing condition permanent. The floor `severityNext`
 * applies is `pressure × 0.7` against a resolution threshold of 0.08, so any
 * reading that sits at or above 0.114 in the ordinary course of things holds
 * its condition open forever. The median country reads 0.35 on the unrest axis
 * while it is doing nothing at all, so unrest closed for nobody: measured over
 * six disjoint blocks of eight seeds, 0 of 49 spells ever ended, and unrest ran
 * in three quarters of all nation-weeks. That is the weather with a crisis
 * label on it.
 *
 * Measuring the gap instead says the true thing in both directions. A country
 * whose streets are always warm is not in unrest for being itself, and it does
 * not have to become calm to recover — it has to come back to its own normal.
 * A chronically restive state is still likelier to open one, because that is
 * what `standingPressure` is for.
 *
 * A rate condition holds from the country's rest rather than from where it
 * opened (`RATE_CONDITIONS`): it is open until the economy is back to normal.
 */
export declare function standingHold(runtime: NationRuntime, kind: StandingCondition, atWar: boolean, campaign?: Campaign): number;
/**
 * The full reading, books and all. The balance that would hold the ratio is
 * taken at the rate the government was paying when its books opened and at its
 * trend growth, so neither a crisis premium nor the crisis's own slump can hold
 * the crisis open. The hold (`standingHold`) leaves out the stress history,
 * which only raises the odds of a new one, and reads only what the structural
 * gap adds over the letter's own fragility, so a government back at a balance
 * that holds its ratio can come out of the crisis whatever its letter.
 */
export declare function fiscalCrisisPressure(campaign: Campaign, runtime: NationRuntime, withStress: boolean): number;
export type OnsetCandidate = {
    readonly nation: NationId;
    readonly kind: ConditionKind;
    readonly chance: number;
};
/**
 * Which of the week's fired candidates take its open slots, in the order they
 * open.
 *
 * A candidate fires when its roll falls under its chance. Once it has, its roll
 * over its chance is an even draw on 0..1 whatever that chance was, so taking
 * the lowest of those shares the slots out evenly among everything that fired.
 * A country prone to a condition still opens more of it, because it fires more
 * often; its place in the list buys it nothing. Walking the list in nation
 * order and stopping at the budget gave the slots to the start of the alphabet:
 * with a hundred and ninety-five governments firing against two slots a week,
 * debt crises opened in Andorra, Denmark and Switzerland and never in Lebanon
 * or Venezuela, and the last quarter of the roster was struck by almost
 * nothing at all. Ties are settled by `tiebreak`, which is its own seeded draw
 * keyed on the turn: list order gave every one of them to whichever kind sorts
 * first in the alphabet, which is how a newly added kind can lose a tie it never
 * once wins. A caller that supplies no tie-break keeps list order.
 */
export declare function claimOnsetSlots<T extends OnsetCandidate>(rolled: readonly {
    readonly candidate: T;
    readonly roll: number;
}[], budget: number, tiebreak?: (candidate: T) => number): readonly T[];
export declare function onsetCandidates(campaign: Campaign): readonly OnsetCandidate[];
export declare function openCondition(campaign: Campaign, candidate: OnsetCandidate, stream: ReturnType<RngStreams["stream"]>): NationCondition;
