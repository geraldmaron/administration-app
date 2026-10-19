import { color } from "./color.js";
import { materials } from "./materials.js";
/**
 * The security-print set, one print per kind of room: guilloché for the
 * ceremony, commissions and the President's own file, contour for place files,
 * blueprint for plans and operations, grain for paper. The tiles themselves are
 * CSS (patterns.css); this is what the stylesheet is checked against and what a
 * component may name.
 */
export const PATTERN_KINDS = ["guilloche", "contour", "blueprint", "grain"];
export const pattern = {
    ink: {
        gold: { cssVar: "--color-mark-gold", hex: color.mark.gold, alpha: 0.1 },
        cool: { cssVar: "--color-text-secondary", hex: color.text.secondary, alpha: 0.06 },
        // Lighter than the gold on the dark ground: the muted paper ink is the
        // tightest text pairing on paper, and a heavier print pulls it under AA.
        paper: { cssVar: "--color-mark-gold", hex: color.mark.gold, alpha: 0.07 },
    },
    tileSize: { guilloche: 240, contour: 320, blueprint: 64, grain: 180 },
    /**
     * The dark steps a pattern may be laid on. The overlay step is left out:
     * it is chrome over the room, and tertiary text on it clears AA with no
     * margin once a gold print is laid under it.
     */
    darkGrounds: {
        abyss: color.ground.abyss,
        sunken: color.ground.sunken,
        base: color.ground.base,
        raised: color.ground.raised,
    },
    paperGround: materials.paper.background,
};
