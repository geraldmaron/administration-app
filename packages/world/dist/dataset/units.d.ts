/** How a figure is counted. `share` is 0..1; `index` is 0..1 with no natural unit. */
export type UnitKind = "currency" | "count" | "share" | "index" | "rate" | "years" | "energy" | "text";
export type UnitSpec = {
    readonly kind: UnitKind;
    /**
     * The multiplier the authored number carries, as a power of ten. Authored
     * currency is USD millions, so `scale: 6` — a stored 2_100_000 is
     * $2.1 trillion, and the formatter is what decides to say "trillion".
     */
    readonly scale?: number;
    /** The unit as a player reads it, where a bare number would be ambiguous. */
    readonly suffix?: string;
    /** What the figure is counting, for the reading a screen puts beside it. */
    readonly noun?: string;
};
export declare const STAT_UNITS: Readonly<Record<string, UnitSpec>>;
/** Every NationStats leaf the schema defines, for the completeness check. */
export declare function statUnitPaths(): readonly string[];
export declare function unitFor(path: string): UnitSpec | undefined;
/**
 * A figure as a player reads it, with its unit attached.
 *
 * The one place a scale word is chosen. A screen that formats a stat itself is
 * a screen that can disagree with the next one about what the same number
 * means, which is the failure this exists to make impossible.
 */
/**
 * Where an index sits, in the words a briefing would use.
 *
 * An index has no denominator to take a percentage of — that much the unit
 * split has always had right. But the conclusion drawn from it was that the
 * figure should print on the scale it is recorded on, and the scale it is
 * recorded on is a machine's: twenty-seven readings the player most wants an
 * opinion about — legitimacy, press freedom, factionalism, doctrine quality,
 * a rival service's counter-intelligence — all reached the screen as "0.50".
 * That is not a reading anybody can act on; it is the storage format leaking.
 *
 * These are magnitude words, not quality words, and deliberately so. Roughly
 * half of the indexed fields are ones where more is worse — corruption, crime,
 * insurgency pressure, protest pressure, factionalism — and a ladder that ran
 * from "poor" to "excellent" would invert on every one of them. "Exceptional
 * corruption" and "exceptional intelligence capability" both say the same true
 * thing about the size of the number, and let the surface around them say
 * whether that is good news.
 *
 * The word is the whole reading, with no figure beside it. A player comparing
 * two governments inside one grade is served by the track under the reading —
 * which takes the raw value and is the app's shape for exactly that — not by
 * reprinting the float the word exists to replace.
 */
export declare function gradeOf(value: number): string;
export declare function formatFigure(value: number, spec: UnitSpec): string;
/** The figure and the words that say what it is, for a label beside a reading. */
export declare function describeFigure(value: number, spec: UnitSpec): string;
