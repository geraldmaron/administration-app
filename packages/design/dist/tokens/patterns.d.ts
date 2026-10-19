/**
 * The security-print set, one print per kind of room: guilloché for the
 * ceremony, commissions and the President's own file, contour for place files,
 * blueprint for plans and operations, grain for paper. The tiles themselves are
 * CSS (patterns.css); this is what the stylesheet is checked against and what a
 * component may name.
 */
export declare const PATTERN_KINDS: readonly ["guilloche", "contour", "blueprint", "grain"];
export type PatternKind = (typeof PATTERN_KINDS)[number];
export type PatternInkName = "gold" | "cool" | "paper";
export interface PatternInk {
    /** The token the ink is mixed from, by its CSS name, so the stylesheet can be held to it. */
    readonly cssVar: string;
    readonly hex: string;
    /** How much of the token reaches the ground where a stroke is fully drawn. */
    readonly alpha: number;
}
export declare const pattern: {
    readonly ink: {
        readonly gold: {
            readonly cssVar: "--color-mark-gold";
            readonly hex: "#E2B866";
            readonly alpha: 0.1;
        };
        readonly cool: {
            readonly cssVar: "--color-text-secondary";
            readonly hex: "#C4CFE6";
            readonly alpha: 0.06;
        };
        readonly paper: {
            readonly cssVar: "--color-mark-gold";
            readonly hex: "#E2B866";
            readonly alpha: 0.07;
        };
    };
    readonly tileSize: {
        readonly guilloche: 240;
        readonly contour: 320;
        readonly blueprint: 64;
        readonly grain: 180;
    };
    /**
     * The dark steps a pattern may be laid on. The overlay step is left out:
     * it is chrome over the room, and tertiary text on it clears AA with no
     * margin once a gold print is laid under it.
     */
    readonly darkGrounds: {
        readonly abyss: "#050915";
        readonly sunken: "#081022";
        readonly base: "#0B1430";
        readonly raised: "#17264D";
    };
    readonly paperGround: "#F5F8FE";
};
export type PatternToken = typeof pattern;
