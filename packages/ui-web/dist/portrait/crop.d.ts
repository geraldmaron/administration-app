import type { FaceGenome } from "./types";
export type FaceRegion = "portrait" | "head" | "hair" | "eyes" | "features" | "lower" | "dress";
export type RegionBox = {
    readonly x: number;
    readonly y: number;
    readonly size: number;
};
/** The square of the 200-unit portrait that shows one region of this face at this age. */
export declare function regionBox(genome: FaceGenome, age: number, region: FaceRegion): RegionBox;
/** The SVG with its frame narrowed to one region. */
export declare function framed(svg: string, box: RegionBox): string;
