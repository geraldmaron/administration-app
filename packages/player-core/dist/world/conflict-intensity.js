/** The one ladder every screen reads a war's intensity by, highest cut first. */
export const INTENSITY_BANDS = [
    { word: "Intense", from: 0.7 },
    { word: "Hot", from: 0.4 },
    { word: "Simmering", from: 0.15 },
    { word: "Held", from: 0 },
];
export function intensityWord(value) {
    return (INTENSITY_BANDS.find((band) => value >= band.from) ?? INTENSITY_BANDS[INTENSITY_BANDS.length - 1]).word;
}
