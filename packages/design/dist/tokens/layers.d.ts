/**
 * Named surface ranks. Callers compose with these names so GROUND / SURFACE /
 * RAISED / INSET / DOCUMENT stay distinct — not six muddy near-grays picked ad
 * hoc from `color.ground`.
 *
 * Distinction is value step **plus** border/material (see SceneSurface), not
 * decoration gradients.
 */
export declare const layers: {
    /** Page well under the room. */
    readonly ground: "#0B1430";
    /** Plate / card / module on the page. */
    readonly surface: "#17264D";
    /** Chrome floating over the room: sheet pin, overlay well. */
    readonly raised: "#24386D";
    /** Recessed well cut into a plate. */
    readonly inset: "#081022";
    /** Executive document folio — paper register only. */
    readonly document: "#F5F8FE";
    /** Under the page: abyss behind scrims. */
    readonly abyss: "#050915";
};
export type LayerRole = keyof typeof layers;
export type LayersToken = typeof layers;
