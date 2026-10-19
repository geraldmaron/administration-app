/**
 * Role-based color keeps interaction, identity and evaluation distinguishable.
 * These roles can color figures, graphics and surfaces. Context, shape and
 * labels disambiguate meanings; a hue is not globally reserved against use
 * in country flags, party identity, imagery or a chart category.
 */
export declare const semantic: {
    /** Committing act / brand fill — institutional crimson. Never selection. */
    readonly identity: "#BE303E";
    /**
     * Active nav, selected chip, focus filament — cool blue, never crimson.
     *
     * A clear azure a step short of saturated: on the near-black ground a
     * brighter blue glows, and a duller one reads as disabled. Red, white and
     * blue are structural here, so the blue has to look chosen.
     */
    readonly interaction: "#6FA8FF";
    /** Primary controls: dark blue preserves light-label contrast. */
    readonly action: "#204C8C";
    readonly actionHover: "#193D73";
    readonly actionPressed: "#143260";
    /** Informational series / non-stance highlight. */
    readonly information: "#6BA3E8";
    /** Success / favorable reading. */
    readonly positive: "#4FD39A";
    /** Warning / caution reading. */
    readonly caution: "#F0B44C";
    /** Bad reading / removal pressure — not selection. */
    readonly adverse: "#FF8A95";
    /** Acute failure band above adverse. */
    readonly critical: "#FF6B7A";
    /** Irreversible remove/delete act — stronger than adverse reading. */
    readonly destructive: "#D6475A";
    /** In-flight / waiting. */
    readonly pending: "#ABBBDA";
    /** Unavailable control or reading. */
    readonly disabled: "#5B6472";
};
export type SemanticRole = keyof typeof semantic;
export type SemanticToken = typeof semantic;
