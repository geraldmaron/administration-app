import { STATE_ECONOMY_AXES, type CohortId, type IdeologyVector, type StateEconomyAxis } from "@admin/world";
import { OPINION_DRIVERS, type OpinionDriver } from "./opinion-drivers.js";

// The balance table that gives each cohort its politics. Split out of demos.ts so
// that file keeps to logic: this one is a table, and grows with the cohorts.

export type CohortMotivation = {
  /**
   * Multiplicative tilt on OPINION_WEIGHTS. Authored, not the lens itself:
   * a tilt says "this cohort weighs services harder than the country does",
   * which is the sentence a designer can defend, and the lens is derived by
   * normalizing so a lens can never fail to sum to one.
   * Every entry in [LENS_TILT_FLOOR, LENS_TILT_CAP]. Law 3.
   */
  readonly tilt: Readonly<Record<OpinionDriver, number>>;
  /**
   * Where this cohort's politics sit, on the same three axes as
   * Person.ideology and Party.beliefs. Religiosity is the
   * authLibertarian coordinate; there is no fourth axis for it.
   */
  readonly beliefs: IdeologyVector;
  /**
   * How far the cohort is spread around that center. Floored at
   * COHORT_MIN_SPREAD, and alignment is scaled by (1 - spread), which is the
   * arithmetic that makes a reliable bloc impossible. Law 3.
   */
  readonly spread: number;
  /** Which of the six state economy axes employ it. Sums to 1. The routing target. */
  readonly exposure: Readonly<Record<StateEconomyAxis, number>>;
  /** How much of the household's income arrives through public programs. */
  readonly programReliance: number;
  /** How much an act has to be about this cohort before it registers. Multiplies strain, never support. */
  readonly attention: number;
  /**
   * The share that turns out when nothing has happened to them. Authored from
   * published participation rates: 65-plus and under-35 do not vote at the
   * same rate and never have.
   */
  readonly baseTurnout: number;
  /** What this cohort is called on a screen. Never a demographic label used as a slur or a shorthand. */
  readonly name: string;
};

function tilt(partial: Partial<Record<OpinionDriver, number>>): Readonly<Record<OpinionDriver, number>> {
  const out = {} as Record<OpinionDriver, number>;
  for (const driver of OPINION_DRIVERS) {
    out[driver] = partial[driver] ?? 1;
  }
  return out;
}

function exposure(partial: Partial<Record<StateEconomyAxis, number>>): Readonly<Record<StateEconomyAxis, number>> {
  const out = {} as Record<StateEconomyAxis, number>;
  for (const axis of STATE_ECONOMY_AXES) {
    out[axis] = partial[axis] ?? 0;
  }
  return out;
}

function beliefs(
  economicLeftRight: number,
  authLibertarian: number,
  nationalistGlobalist: number,
): IdeologyVector {
  return { economicLeftRight, authLibertarian, nationalistGlobalist };
}

/** The country's rough sector mix: where a cell with no stated skew is employed. Sums to 1. */
const BASELINE_EXPOSURE: Readonly<Partial<Record<StateEconomyAxis, number>>> = {
  services: 0.36,
  industrial: 0.17,
  tech: 0.2,
  energy: 0.09,
  agricultural: 0.08,
  defense: 0.1,
};

/**
 * Twenty-nine entries. Tilts are material-channel weights (Law 1), not dispositions;
 * within each axis they are written to cancel under national share weighting so
 * the share-weighted mean lens stays within LENS_CENTERING_TOLERANCE of
 * OPINION_WEIGHTS (boundary law 3 / cohort-lens-centered).
 */
export const COHORT_MOTIVATION: Readonly<Record<CohortId, CohortMotivation>> = {
  "age-under-35": {
    name: "Under 35",
    tilt: tilt({ prosperity: 1.18, services: 1.12, security: 0.9, integrity: 0.95, competence: 0.98 }),
    beliefs: beliefs(-0.1, -0.15, -0.1),
    spread: 0.45,
    exposure: exposure({ services: 0.35, tech: 0.25, industrial: 0.15, defense: 0.1, energy: 0.05, agricultural: 0.1 }),
    programReliance: 0.28,
    attention: 0.55,
    baseTurnout: 0.48,
  },
  "age-35-64": {
    name: "Ages 35 to 64",
    tilt: tilt({ prosperity: 1.05, competence: 1.08, services: 0.98, unity: 0.95 }),
    beliefs: beliefs(0, 0, 0),
    spread: 0.4,
    exposure: exposure({ services: 0.3, industrial: 0.2, tech: 0.2, energy: 0.1, agricultural: 0.1, defense: 0.1 }),
    programReliance: 0.22,
    attention: 0.5,
    baseTurnout: 0.62,
  },
  "age-65-plus": {
    name: "65 and older",
    tilt: tilt({ services: 1.3, security: 1.12, prosperity: 0.92, competence: 0.98, integrity: 1.05 }),
    beliefs: beliefs(0.05, 0.2, 0.1),
    spread: 0.38,
    exposure: exposure({ services: 0.45, defense: 0.1, agricultural: 0.1, industrial: 0.1, energy: 0.1, tech: 0.15 }),
    programReliance: 0.55,
    attention: 0.6,
    baseTurnout: 0.72,
  },
  "income-struggling": {
    name: "Struggling households",
    tilt: tilt({ prosperity: 1.3, services: 1.22, security: 0.95, integrity: 0.9, competence: 0.95, unity: 0.98 }),
    beliefs: beliefs(-0.35, -0.05, 0.05),
    spread: 0.42,
    exposure: exposure({ services: 0.4, industrial: 0.2, agricultural: 0.15, energy: 0.1, defense: 0.05, tech: 0.1 }),
    programReliance: 0.48,
    attention: 0.65,
    baseTurnout: 0.5,
  },
  "income-comfortable": {
    name: "Comfortable households",
    tilt: tilt({ prosperity: 1.05, competence: 1.05, services: 1.0, integrity: 1.0 }),
    beliefs: beliefs(0, 0, 0),
    spread: 0.4,
    exposure: exposure({ services: 0.35, tech: 0.2, industrial: 0.15, energy: 0.1, agricultural: 0.1, defense: 0.1 }),
    programReliance: 0.2,
    attention: 0.5,
    baseTurnout: 0.6,
  },
  "income-affluent": {
    name: "Affluent households",
    tilt: tilt({ prosperity: 0.88, integrity: 1.18, competence: 1.2, services: 0.82, security: 1.05, unity: 0.98 }),
    beliefs: beliefs(0.3, 0.05, -0.1),
    spread: 0.42,
    exposure: exposure({ tech: 0.3, services: 0.3, energy: 0.15, industrial: 0.1, defense: 0.1, agricultural: 0.05 }),
    programReliance: 0.08,
    attention: 0.45,
    baseTurnout: 0.68,
  },
  "no-degree": {
    name: "Without a degree",
    tilt: tilt({ prosperity: 1.2, services: 1.18, competence: 0.9, integrity: 0.95, security: 1.02 }),
    beliefs: beliefs(-0.15, 0.1, 0.15),
    spread: 0.42,
    exposure: exposure({ industrial: 0.28, agricultural: 0.18, services: 0.25, energy: 0.12, defense: 0.07, tech: 0.1 }),
    programReliance: 0.32,
    attention: 0.55,
    baseTurnout: 0.52,
  },
  degree: {
    name: "Degree holders",
    tilt: tilt({ competence: 1.2, integrity: 1.15, prosperity: 0.9, services: 0.9, security: 0.98 }),
    beliefs: beliefs(0.1, -0.1, -0.15),
    spread: 0.4,
    exposure: exposure({ tech: 0.35, services: 0.3, defense: 0.1, industrial: 0.1, energy: 0.1, agricultural: 0.05 }),
    programReliance: 0.15,
    attention: 0.5,
    baseTurnout: 0.68,
  },
  urban: {
    name: "Urban",
    tilt: tilt({ services: 1.18, security: 1.12, prosperity: 1.02, unity: 0.95, competence: 1.0 }),
    beliefs: beliefs(-0.1, -0.1, -0.2),
    spread: 0.42,
    exposure: exposure({ services: 0.4, tech: 0.25, industrial: 0.15, defense: 0.1, energy: 0.05, agricultural: 0.05 }),
    programReliance: 0.28,
    attention: 0.55,
    baseTurnout: 0.55,
  },
  suburban: {
    name: "Suburban",
    tilt: tilt({ prosperity: 1.15, competence: 1.1, services: 0.95, security: 1.0, unity: 0.95 }),
    beliefs: beliefs(0.05, 0, 0),
    spread: 0.4,
    exposure: exposure({ services: 0.35, tech: 0.2, industrial: 0.15, defense: 0.1, energy: 0.1, agricultural: 0.1 }),
    programReliance: 0.18,
    attention: 0.5,
    baseTurnout: 0.62,
  },
  rural: {
    name: "Rural",
    tilt: tilt({ services: 1.12, prosperity: 1.05, security: 0.98, competence: 0.98, integrity: 1.02, unity: 1.02 }),
    beliefs: beliefs(0.05, 0.15, 0.25),
    spread: 0.42,
    exposure: exposure({ agricultural: 0.35, energy: 0.2, industrial: 0.15, services: 0.15, defense: 0.1, tech: 0.05 }),
    programReliance: 0.3,
    attention: 0.55,
    baseTurnout: 0.58,
  },
  "goods-producing": {
    name: "Goods-producing workers",
    tilt: tilt({ prosperity: 1.22, competence: 1.05, services: 0.95, integrity: 0.98, security: 1.05 }),
    beliefs: beliefs(-0.1, 0.05, 0.15),
    spread: 0.4,
    exposure: exposure({ industrial: 0.45, energy: 0.2, agricultural: 0.2, services: 0.1, tech: 0.03, defense: 0.02 }),
    programReliance: 0.2,
    attention: 0.6,
    baseTurnout: 0.58,
  },
  "frontline-services": {
    name: "Frontline service workers",
    tilt: tilt({ prosperity: 1.12, services: 1.12, security: 1.02, competence: 0.98, integrity: 0.98 }),
    beliefs: beliefs(-0.15, -0.05, 0),
    spread: 0.42,
    exposure: exposure({ services: 0.55, industrial: 0.15, agricultural: 0.1, energy: 0.08, tech: 0.07, defense: 0.05 }),
    programReliance: 0.3,
    attention: 0.6,
    baseTurnout: 0.52,
  },
  "professional-technical": {
    name: "Professional and technical",
    tilt: tilt({ competence: 1.22, prosperity: 1.05, integrity: 1.08, services: 0.9, security: 0.98 }),
    beliefs: beliefs(0.1, -0.1, -0.15),
    spread: 0.4,
    exposure: exposure({ tech: 0.45, services: 0.3, industrial: 0.1, energy: 0.05, defense: 0.08, agricultural: 0.02 }),
    programReliance: 0.12,
    attention: 0.5,
    baseTurnout: 0.64,
  },
  "public-and-uniformed": {
    name: "Public and uniformed",
    tilt: tilt({ security: 1.35, services: 1.1, competence: 1.12, prosperity: 0.9, integrity: 1.05, unity: 0.98 }),
    beliefs: beliefs(0, 0.15, 0.05),
    spread: 0.38,
    exposure: exposure({ defense: 0.4, services: 0.35, industrial: 0.1, tech: 0.08, energy: 0.05, agricultural: 0.02 }),
    programReliance: 0.35,
    attention: 0.7,
    baseTurnout: 0.7,
  },
  "not-in-the-workforce": {
    name: "Outside the workforce",
    tilt: tilt({ services: 1.22, prosperity: 0.98, security: 1.02, competence: 0.95, integrity: 0.98, unity: 1.0 }),
    beliefs: beliefs(-0.1, 0.1, 0.05),
    spread: 0.45,
    exposure: exposure({ services: 0.5, agricultural: 0.15, industrial: 0.1, defense: 0.1, energy: 0.08, tech: 0.07 }),
    programReliance: 0.62,
    attention: 0.55,
    baseTurnout: 0.5,
  },
  // The race, sex, nativity, disability and veteran cells (DECISIONS 5.8). Their
  // politics are material channels only: beliefs stay at the center and the
  // spread is wide, so no belief is inferred from who a person is. Tilts are
  // neutral except where a program is the channel (disability and veterans'
  // benefits), and those are written to cancel across their axis.
  "race-hispanic": {
    name: "Hispanic or Latino residents",
    tilt: tilt({}),
    beliefs: beliefs(0, 0, 0),
    spread: 0.45,
    exposure: exposure(BASELINE_EXPOSURE),
    programReliance: 0.34,
    attention: 0.5,
    baseTurnout: 0.46,
  },
  "race-black": {
    name: "Black residents",
    tilt: tilt({}),
    beliefs: beliefs(0, 0, 0),
    spread: 0.45,
    exposure: exposure(BASELINE_EXPOSURE),
    programReliance: 0.36,
    attention: 0.5,
    baseTurnout: 0.58,
  },
  "race-asian": {
    name: "Asian residents",
    tilt: tilt({}),
    beliefs: beliefs(0, 0, 0),
    spread: 0.45,
    exposure: exposure({ ...BASELINE_EXPOSURE, tech: 0.28, services: 0.34, industrial: 0.15, agricultural: 0.04, defense: 0.08, energy: 0.11 }),
    programReliance: 0.22,
    attention: 0.5,
    baseTurnout: 0.5,
  },
  "race-white": {
    name: "White (non-Hispanic) residents",
    tilt: tilt({}),
    beliefs: beliefs(0, 0, 0),
    spread: 0.45,
    exposure: exposure(BASELINE_EXPOSURE),
    programReliance: 0.28,
    attention: 0.5,
    baseTurnout: 0.64,
  },
  "race-other": {
    name: "Other and multiracial residents",
    tilt: tilt({}),
    beliefs: beliefs(0, 0, 0),
    spread: 0.45,
    exposure: exposure(BASELINE_EXPOSURE),
    programReliance: 0.38,
    attention: 0.5,
    baseTurnout: 0.52,
  },
  "sex-female": {
    name: "Women",
    tilt: tilt({}),
    beliefs: beliefs(0, 0, 0),
    spread: 0.45,
    exposure: exposure({ services: 0.5, tech: 0.22, industrial: 0.08, energy: 0.04, agricultural: 0.05, defense: 0.11 }),
    programReliance: 0.32,
    attention: 0.5,
    baseTurnout: 0.64,
  },
  "sex-male": {
    name: "Men",
    tilt: tilt({}),
    beliefs: beliefs(0, 0, 0),
    spread: 0.45,
    exposure: exposure({ services: 0.24, tech: 0.2, industrial: 0.28, energy: 0.14, agricultural: 0.06, defense: 0.08 }),
    programReliance: 0.26,
    attention: 0.5,
    baseTurnout: 0.6,
  },
  "foreign-born": {
    name: "Foreign-born residents",
    tilt: tilt({}),
    beliefs: beliefs(0, 0, 0),
    spread: 0.45,
    exposure: exposure({ services: 0.4, industrial: 0.2, agricultural: 0.15, tech: 0.15, energy: 0.05, defense: 0.05 }),
    programReliance: 0.26,
    attention: 0.55,
    baseTurnout: 0.45,
  },
  "us-born": {
    name: "U.S.-born residents",
    tilt: tilt({}),
    beliefs: beliefs(0, 0, 0),
    spread: 0.45,
    exposure: exposure({ ...BASELINE_EXPOSURE, services: 0.35, agricultural: 0.07, tech: 0.2, defense: 0.1, energy: 0.11 }),
    programReliance: 0.3,
    attention: 0.5,
    baseTurnout: 0.62,
  },
  "with-disability": {
    name: "People with a disability",
    tilt: tilt({ services: 1.15, prosperity: 0.97 }),
    beliefs: beliefs(0, 0, 0),
    spread: 0.45,
    exposure: exposure({ services: 0.5, industrial: 0.12, agricultural: 0.1, energy: 0.08, defense: 0.08, tech: 0.12 }),
    programReliance: 0.62,
    attention: 0.6,
    baseTurnout: 0.56,
  },
  "no-disability": {
    name: "People without a disability",
    tilt: tilt({ services: 0.976, prosperity: 1.005 }),
    beliefs: beliefs(0, 0, 0),
    spread: 0.45,
    exposure: exposure(BASELINE_EXPOSURE),
    programReliance: 0.27,
    attention: 0.5,
    baseTurnout: 0.61,
  },
  veteran: {
    name: "Veterans",
    tilt: tilt({ security: 1.2, services: 1.1 }),
    beliefs: beliefs(0, 0, 0),
    spread: 0.45,
    exposure: exposure({ defense: 0.25, industrial: 0.2, services: 0.3, energy: 0.1, tech: 0.1, agricultural: 0.05 }),
    programReliance: 0.38,
    attention: 0.65,
    baseTurnout: 0.74,
  },
  "non-veteran": {
    name: "Non-veterans",
    tilt: tilt({ security: 0.988, services: 0.994 }),
    beliefs: beliefs(0, 0, 0),
    spread: 0.45,
    exposure: exposure(BASELINE_EXPOSURE),
    programReliance: 0.29,
    attention: 0.5,
    baseTurnout: 0.59,
  },
};
