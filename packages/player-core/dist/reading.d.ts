export type Stance = "favorable" | "neutral" | "caution" | "adverse";
export type ReadingFamily = "standing" | "posture" | "pressure" | "counted";
export type ReadingBand = {
    readonly word: string;
    readonly stance: Stance;
};
export declare const STANCE_THRESHOLDS: readonly [0.25, 0.45, 0.65];
export declare function readingBand(family: ReadingFamily, value: number): ReadingBand | undefined;
export type ProjectedEffect = {
    readonly label: string;
    readonly value: string;
    readonly stance: Stance;
};
