import { type FaceGenome } from "./types";
import type { Layout } from "./layout";
import type { SkinPalette } from "./palette";
export type Dress = {
    readonly back: string;
    readonly front: string;
};
export declare function dress(id: string, L: Layout, g: FaceGenome, skin: SkinPalette): Dress;
