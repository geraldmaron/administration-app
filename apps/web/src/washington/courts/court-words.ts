import type { CourtCircuit, CourtLane } from "@admin/player-core";

/** Each step a case can stand at, as the courts view names it. */
export const LANE_WORDS: Readonly<Record<CourtLane, string>> = {
  filed: "District court",
  injunction: "Interim relief",
  circuit: "Circuit appeal",
  emergency: "Stay application",
  review: "Supreme Court",
  decision: "Decided",
};

export const LANES: readonly CourtLane[] = ["filed", "injunction", "circuit", "emergency", "review", "decision"];

/** "Ninth Circuit", "D.C. Circuit". */
export function circuitWords(name: string): string {
  return `${name === "District of Columbia" ? "D.C." : name} Circuit`;
}

/**
 * The diverging step a bench margin is drawn at, from -3 (all Republican
 * appointees) to 3 (all Democratic). "none" where no seat is filled, so an
 * empty bench never draws as an even one.
 */
export function marginStep(margin: number | undefined): string {
  if (margin === undefined) return "none";
  const step = Math.round(margin * 3);
  return step === 0 ? "0" : step < 0 ? `p${-step}` : `n${step}`;
}

export function marginWords(circuit: Pick<CourtCircuit, "democratic" | "republican" | "vacant">): string {
  const open = circuit.vacant > 0 ? `, ${circuit.vacant} open` : "";
  return `${circuit.democratic} Democratic and ${circuit.republican} Republican appointees${open}. Appointing party is a rough proxy, not a forecast of rulings.`;
}

/** "in 3 weeks", "this week", "next week". */
export function weeksWords(weeks: number): string {
  if (weeks <= 0) return "this week";
  if (weeks === 1) return "next week";
  return `in ${weeks} weeks`;
}

/** A justice's or judge's lean on the economy axis, on the same diverging steps as a bench; left draws on the blue side. */
export function leanStep(lean: number | undefined): string {
  return lean === undefined ? "none" : marginStep(-lean);
}
