import { portrait } from "@admin/design";
import type { FaceGenome, FaceMood, FaceTreatment } from "@admin/world";

// The renderer's names for the genome's parts, all derived from the one schema
// in @admin/world so a registry added there reaches every drawing function.

export type { FaceGenome };
export type Mood = FaceMood;
export type Treatment = FaceTreatment;
export type FaceShape = FaceGenome["head"]["shape"];
export type HairCut = FaceGenome["hair"]["cut"];
export type HairColor = FaceGenome["hair"]["color"];
export type EyeColor = FaceGenome["eyes"]["color"];
export type Undertone = FaceGenome["skin"]["undertone"];
export type Headwear = FaceGenome["headwear"]["style"];
export type Fabric = FaceGenome["attire"]["primary"];

/** Cloth as it photographs under the portrait's light: the palette in @admin/design. */
export const FABRICS: Readonly<Record<Fabric, string>> = portrait.cloth;
