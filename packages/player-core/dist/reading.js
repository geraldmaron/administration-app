export const STANCE_THRESHOLDS = [0.25, 0.45, 0.65];
const STANDING_WORDS = ["Failing", "Weak", "Fair", "Strong"];
const POSTURE_CUTS = [-0.5, -0.15, 0.15, 0.5];
const POSTURE_WORDS = ["Hostile", "Wary", "Neutral", "Warm", "Close"];
const PRESSURE_WORDS = ["Quiet", "Rising", "Serious", "Critical"];
const STANDING_STANCES = ["adverse", "caution", "neutral", "favorable"];
const PRESSURE_STANCES = ["favorable", "neutral", "caution", "adverse"];
const POSTURE_STANCES = ["adverse", "caution", "neutral", "neutral", "favorable"];
export function readingBand(family, value) {
    if (family === "standing") {
        const index = STANCE_THRESHOLDS.filter((cut) => value >= cut).length;
        return { word: STANDING_WORDS[index] ?? STANDING_WORDS[0], stance: STANDING_STANCES[index] ?? "adverse" };
    }
    if (family === "pressure") {
        const index = STANCE_THRESHOLDS.filter((cut) => value >= cut).length;
        return { word: PRESSURE_WORDS[index] ?? PRESSURE_WORDS[0], stance: PRESSURE_STANCES[index] ?? "favorable" };
    }
    if (family === "posture") {
        const index = POSTURE_CUTS.filter((cut) => value >= cut).length;
        return { word: POSTURE_WORDS[index] ?? POSTURE_WORDS[0], stance: POSTURE_STANCES[index] ?? "adverse" };
    }
    return undefined;
}
