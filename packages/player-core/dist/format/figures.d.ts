import { type GameDate, type InstrumentId, type MetricSet, type OpinionDriver } from "@admin/engine";
import { type MoneyFormatter } from "./money";
export { urgencyForDays } from "../summons/clock-math";
export declare function formatRatio(value: number): string;
export declare function formatDate(date: GameDate): string;
/** Drop spurious trailing zeros so `$43.0B` reads `$43B` while `$3.90T` stays `$3.9T`. */
export declare function polishCompactFigure(figure: string): string;
/**
 * Where a figure comes from and how often it is reread.
 *
 * The instrument bar asks every number to carry its provenance, and the honest
 * answer differs by figure. The administration's own five readings are
 * recomputed every week the term advances; a country's stats start from the
 * shipped reference and drift as the world moves. Neither is attributed to an
 * agency the simulation does not model — a fabricated source would be worse
 * than none, because a player would believe it.
 */
export declare const METRIC_PROVENANCE: Readonly<Record<keyof MetricSet, string>>;
export declare function roleTitle(roleId: string, titles?: Readonly<Record<string, string>>): string;
export declare function statPathLabel(path: string): string;
export type MetricStance = "favorable" | "neutral" | "caution" | "adverse";
/** Named view of STANCE_THRESHOLDS (reading.ts) for callers that judge a figure by stance. */
export declare const STANCE_CUTS: {
    readonly caution: 0.25;
    readonly neutral: 0.45;
    readonly favorable: 0.65;
};
export declare function stanceForRatio(value: number): MetricStance;
/** Same thresholds, for a -1..1 signed read (a person's disposition, alignment) rather than a 0..1 ratio. */
export declare function stanceForDisposition(value: number): MetricStance;
export declare const TRUST_STANCE_CUTS: {
    readonly favorable: 0.2;
    readonly neutral: -0.1;
    readonly caution: -0.3;
};
/** How a capital's trust in this administration reads, on the cuts measured for it. */
export declare function stanceForTrust(trust: number): MetricStance;
/** Removal pressure runs the other way: high pressure is bad news. */
export declare function stanceForPressure(value: number): MetricStance;
/**
 * A minister's delivery multiplier, centered on 1 rather than running 0..1: an
 * account fully staffed and competently run delivers exactly what it is
 * appropriated, above 1 outperforms it, and below is the department running
 * short of its own budget.
 */
export declare function stanceForQuality(value: number): MetricStance;
/** The short word for a capital's stance: a chip, a filter, the map legend. */
export declare function trustWord(stance: MetricStance): string;
export declare function dispositionLabel(trust: number): string;
export declare function attributeVerdict(value: number): string;
export declare function loyaltyWord(stance: MetricStance): string;
export declare function metricStanceWord(stance: MetricStance): string;
export declare function metricVerdict(fraction: number): string;
export type MetricTile = {
    readonly key: keyof MetricSet;
    readonly label: string;
    readonly value: string;
    readonly stance: MetricStance;
    /** Where the reading sits in its own range, 0..1 — what a dial draws. */
    readonly fraction: number;
};
export declare const METRIC_LABELS: Readonly<Record<keyof MetricSet, string>>;
/**
 * What each reading actually governs, in one line of plain language.
 *
 * The five figures were labeled and never explained: "Standing 32%" names a
 * number without saying what it is a number *of*, and a player has no way to
 * learn it from the dashboard. These are written as consequences — what a low
 * one costs you — because that is the only reason to look at the dial.
 */
export declare const METRIC_MEANINGS: Readonly<Record<keyof MetricSet, string>>;
/**
 * The six public-opinion drivers behind approval, in the short form a tile or
 * a row title needs. `OPINION_DRIVER_MEANINGS` (`@admin/engine`) carries
 * the full sentence; this is the word beside it, kept here so it sits next to
 * every other display-name registry rather than inventing a second place to
 * look for one.
 */
export declare const OPINION_DRIVER_LABELS: Readonly<Record<OpinionDriver, string>>;
/**
 * The five instruments, named for what a president actually reaches for.
 *
 * These were the enum values title-cased — Diplomatic, Economic, Covert,
 * Military, Assistance — which is the doctrine category the code sorts by and
 * not a word anybody in the building says. A tile that reads "Economic" is a
 * taxonomy; one that reads "Trade and money" is a thing to do. The acts under
 * each already have plain names (`RUNG_FACE` in ops-reading), and this is the
 * same move one level up.
 */
export declare const INSTRUMENT_LABELS: Readonly<Record<InstrumentId, string>>;
/**
 * A signed movement in a 0..1 metric, in points to one decimal — "+1.4", "−0.3".
 *
 * A turn's movement is small by design, because it compounds for the rest of the
 * campaign. Put through `formatRatio` it rounds to a whole percent, so the
 * ledger's five heaviest drivers all rendered as "−0%" — five different
 * consequences reported as no consequence at all.
 *
 * The sign is never dropped: "+2" and "2" are different statements and only one
 * of them is what the figure means.
 */
export declare function formatSignedPoints(delta: number): string;
export declare function metricTiles(metrics: MetricSet, money?: MoneyFormatter): readonly MetricTile[];
/**
 * Where a reading sits in its own range, 0..1 — what a dial needs and a figure
 * does not. Four of the five metrics are already ratios; treasury is money, and
 * is read against the same reference the engine reads treasury health from
 * (`TREASURY_REFERENCE`), so the dial and the score agree about what a healthy
 * treasury is.
 */
export declare function metricFraction(key: keyof MetricSet, raw: number): number;
