import { color } from "./color.js";
import { materials } from "./materials.js";
/**
 * Named surface ranks. Callers compose with these names so GROUND / SURFACE /
 * RAISED / INSET / DOCUMENT stay distinct — not six muddy near-grays picked ad
 * hoc from `color.ground`.
 *
 * Distinction is value step **plus** border/material (see SceneSurface), not
 * decoration gradients.
 */
export const layers = {
    /** Page well under the room. */
    ground: color.ground.base,
    /** Plate / card / module on the page. */
    surface: color.ground.raised,
    /** Chrome floating over the room: sheet pin, overlay well. */
    raised: color.ground.overlay,
    /** Recessed well cut into a plate. */
    inset: color.ground.sunken,
    /** Executive document folio — paper register only. */
    document: materials.paper.background,
    /** Under the page: abyss behind scrims. */
    abyss: color.ground.abyss,
};
