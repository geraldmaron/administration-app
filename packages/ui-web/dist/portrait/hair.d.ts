import type { FaceGenome, HairCut } from "./types";
import { type Layout } from "./layout";
import type { HairPalette } from "./palette";
export declare const coversEars: (cut: HairCut) => boolean;
export declare function hairBack(id: string, L: Layout, g: FaceGenome, hair: HairPalette, seed: number): string;
export declare function hairFront(id: string, L: Layout, g: FaceGenome, hair: HairPalette, seed: number): string;
