/** Ordinals by value, for "in the third week": the interval run is one fewer unit than the ordinal names. */
export declare const ORDINAL_VALUES: Readonly<Record<string, number>>;
/** How many, when a count is given. Vague counts ("a few", "several") are here and read as three. */
export declare const TIME_COUNT = "(?:\\d+|a couple of|couple of|a few|a dozen|half a|several|some|many|few|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|dozen)(?:[\\s-]+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|dozen))*|an?)";
/** Days in one of each unit. A season is a quarter of a year for this purpose. */
export declare const DAYS_PER_UNIT: Readonly<Record<string, number>>;
/** Any interval longer than this is out of reach of one Continue, and is an error when anchored. */
export declare const COMMIT_WINDOW_DAYS = 7;
/** An interval this short is still the night of the decision: "the next morning", "the following day". */
export declare const SAME_NIGHT_DAYS = 1;
/**
 * A shape, the groups its interval is read from, and which tier it belongs to.
 * `count` and `unit` name capture groups; a shape without a unit group names a
 * point a season or more away and is read as one.
 */
export type TimeShape = {
    readonly name: string;
    readonly pattern: RegExp;
    readonly anchored: boolean;
    /**
     * Whether a sentence that ends its interval at the decision ("had been sealed
     * for eight months") clears it. Every soft shape defers; so do the anchored
     * shapes whose words also tell backstory ("closed after thirty years").
     */
    readonly excusedUpToNow: boolean;
};
export declare const TIME_SHAPES: readonly TimeShape[];
/**
 * A forecast: the line says what could, will or is expected to happen, not
 * what did. "It could take months" is a minister's judgment and is true the
 * moment it is said. The verbs count only with the "to" or "that" that makes
 * them a forecast, because "the promise it had made" and "the risk" as nouns
 * forecast nothing. Month names are taken out of a sentence before this is
 * tested (`MONTH_NAME`), so "by May" is not read as the modal.
 */
export declare const FORECAST_MARKERS: RegExp;
/**
 * A precedent: the line is about some earlier case, so the interval it names
 * ran out before this decision was made. "The last time this happened, it
 * took years."
 */
export declare const PRECEDENT_MARKERS: RegExp;
/**
 * An interval that ends at or before the decision rather than after it: the
 * perfect tenses ("has kept that registry for nineteen years", "a border that
 * had been sealed for eight months"), "so far", "for the past year". Only the
 * soft shapes defer to it, since an anchored "later" cannot end at the present.
 */
export declare const UP_TO_NOW_MARKERS: RegExp;
/** Month names removed before the forecast test, so "by May" is not read as the modal. */
export declare const MONTH_NAME: RegExp;
