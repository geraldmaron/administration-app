export type Stance = "favorable" | "neutral" | "caution" | "adverse";
export type ReadingFamily = "standing" | "posture" | "pressure" | "counted";

export type ReadingBand = {
  readonly word: string;
  readonly stance: Stance;
};

export const STANCE_THRESHOLDS = [0.25, 0.45, 0.65] as const;

const STANDING_WORDS = ["Failing", "Weak", "Fair", "Strong"] as const;
const POSTURE_CUTS = [-0.5, -0.15, 0.15, 0.5] as const;
const POSTURE_WORDS = ["Hostile", "Wary", "Neutral", "Warm", "Close"] as const;
const PRESSURE_WORDS = ["Quiet", "Rising", "Serious", "Critical"] as const;
const STANDING_STANCES: readonly Stance[] = ["adverse", "caution", "neutral", "favorable"];
const PRESSURE_STANCES: readonly Stance[] = ["favorable", "neutral", "caution", "adverse"];
const POSTURE_STANCES: readonly Stance[] = ["adverse", "caution", "neutral", "neutral", "favorable"];

export function readingBand(family: ReadingFamily, value: number): ReadingBand | undefined {
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

export type ProjectedEffect = {
  readonly label: string;
  readonly value: string;
  readonly stance: Stance;
};
