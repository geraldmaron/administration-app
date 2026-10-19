import { type FaceGenome } from "@admin/world";
import type { FaceRegion } from "./crop";
export type GenePath = readonly [string] | readonly [string, string];
export type FaceControl = {
    readonly kind: "choice";
    readonly label: string;
    readonly path: GenePath;
    readonly options: readonly string[];
    /** Where the choice shows, when it is not where the rest of its section does: a beard on the lower face. */
    readonly region?: FaceRegion;
} | {
    readonly kind: "swatch";
    readonly label: string;
    readonly path: GenePath;
    readonly options: readonly string[];
    readonly colors: Readonly<Record<string, string>>;
    /** The gene is a number the swatches name as text: skin tone. */
    readonly numeric?: boolean;
} | {
    readonly kind: "slider";
    readonly label: string;
    readonly path: GenePath;
    readonly low: string;
    readonly high: string;
} | {
    readonly kind: "toggle";
    readonly label: string;
    readonly path: GenePath;
};
/** One tab of the builder, and the part of the face its pictures are cropped to. */
export type FaceSection = {
    readonly id: string;
    readonly label: string;
    readonly region: FaceRegion;
    readonly controls: readonly FaceControl[];
};
export declare const FACE_SECTIONS: readonly FaceSection[];
/** A registry id as the builder shows it. */
export declare function optionLabel(id: string): string;
export declare function readGene(genome: FaceGenome, path: GenePath): unknown;
/** A new genome with one gene changed; the old one is untouched. */
export declare function writeGene(genome: FaceGenome, path: GenePath, value: unknown): FaceGenome;
/** The genes one section edits, copied from another face: redrawing a section and nothing else. */
export declare function withSection(genome: FaceGenome, from: FaceGenome, section: FaceSection): FaceGenome;
