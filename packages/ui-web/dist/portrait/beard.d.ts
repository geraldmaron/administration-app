import type { FaceGenome } from "./types";
import type { Layout } from "./layout";
import type { HairPalette } from "./palette";
/** Everything below the nose that is hair, split so the lips can sit between. */
export declare function facialHair(L: Layout, g: FaceGenome, hair: HairPalette): {
    readonly beard: string;
    readonly mustache: string;
};
