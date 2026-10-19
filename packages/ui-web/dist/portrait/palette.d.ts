import type { EyeColor, FaceGenome, HairColor } from "./types";
export declare const TONES: readonly [{
    readonly h: 22;
    readonly s: 0.58;
    readonly l: 0.84;
}, {
    readonly h: 25;
    readonly s: 0.52;
    readonly l: 0.75;
}, {
    readonly h: 27;
    readonly s: 0.46;
    readonly l: 0.645;
}, {
    readonly h: 26;
    readonly s: 0.43;
    readonly l: 0.53;
}, {
    readonly h: 23;
    readonly s: 0.42;
    readonly l: 0.405;
}, {
    readonly h: 20;
    readonly s: 0.4;
    readonly l: 0.29;
}];
export type SkinPalette = {
    readonly base: string;
    readonly shadow: string;
    readonly deep: string;
    readonly light: string;
    readonly blush: string;
    readonly lip: string;
    readonly lipLight: string;
    readonly line: string;
    /** Where lit skin turns into shadow, light scatters red beneath the surface. */
    readonly warm: string;
};
export declare function skinPalette(g: FaceGenome, years: number): SkinPalette;
export declare const HAIR: Readonly<Record<HairColor, string>>;
export type HairPalette = {
    readonly base: string;
    readonly shadow: string;
    readonly light: string;
    readonly brow: string;
    /** The sides and temples, which gray first. */
    readonly temple: string;
    readonly gray: number;
};
/**
 * How gray a head is at this age: nothing before the onset, then most of the
 * way over about twenty-five years. A gene rather than a table, because two
 * people of the same age differ here more than almost anywhere else.
 */
export declare function grayAt(onset: number, age: number): number;
export declare function hairPalette(g: FaceGenome, age: number): HairPalette;
export declare const EYES: Readonly<Record<EyeColor, string>>;
export declare function eyeColor(c: EyeColor): string;
