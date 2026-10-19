import { color } from "./color.js";
/**
 * Role-based color keeps interaction, identity and evaluation distinguishable.
 * These roles can color figures, graphics and surfaces. Context, shape and
 * labels disambiguate meanings; a hue is not globally reserved against use
 * in country flags, party identity, imagery or a chart category.
 */
export const semantic = {
    /** Committing act / brand fill — institutional crimson. Never selection. */
    identity: color.accent.primary,
    /**
     * Active nav, selected chip, focus filament — cool blue, never crimson.
     *
     * A clear azure a step short of saturated: on the near-black ground a
     * brighter blue glows, and a duller one reads as disabled. Red, white and
     * blue are structural here, so the blue has to look chosen.
     */
    interaction: "#6FA8FF",
    /** Primary controls: dark blue preserves light-label contrast. */
    action: "#204C8C",
    actionHover: "#193D73",
    actionPressed: "#143260",
    /** Informational series / non-stance highlight. */
    information: color.vis.series2,
    /** Success / favorable reading. */
    positive: color.stance.favorable,
    /** Warning / caution reading. */
    caution: color.stance.caution,
    /** Bad reading / removal pressure — not selection. */
    adverse: color.stance.adverse,
    /** Acute failure band above adverse. */
    critical: "#FF6B7A",
    /** Irreversible remove/delete act — stronger than adverse reading. */
    destructive: "#D6475A",
    /** In-flight / waiting. */
    pending: color.text.tertiary,
    /** Unavailable control or reading. */
    disabled: color.text.disabled,
};
