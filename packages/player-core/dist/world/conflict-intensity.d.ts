export type IntensityWord = "Held" | "Simmering" | "Hot" | "Intense";
/** The one ladder every screen reads a war's intensity by, highest cut first. */
export declare const INTENSITY_BANDS: readonly {
    readonly word: IntensityWord;
    readonly from: number;
}[];
export declare function intensityWord(value: number): IntensityWord;
