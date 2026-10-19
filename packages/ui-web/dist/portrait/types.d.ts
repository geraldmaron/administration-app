import type { FaceGenome, FaceMood, FaceTreatment } from "@admin/world";
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
export declare const FABRICS: Readonly<Record<Fabric, string>>;
