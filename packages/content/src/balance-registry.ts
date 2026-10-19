// A catalog of every tunable constant that decides how the game feels, at
// every layer a rebalance actually happens on — not a duplicate of any value,
// only a name, a layer, and a reason to find it by.
//
// The methodology this exists to enable: a constant moved in isolation makes
// the game worse even when the move is right on its own terms, because the
// forty others around it (POLICY_STANCES' per-stance magnitudes,
// OPINION_WEIGHTS, the removal ceiling) were calibrated against its previous
// behavior. No single file shows that. This registry is where the whole view
// exists, so a rebalance can start from it.
//
// One level owns a fact: every `value` below is read from the real export,
// never retyped, so this file cannot state a number the source disagrees with
// — the paired test in balance-registry.test.ts fails the moment it could.

import {
  OPINION_WEIGHTS,
  TREASURY_REFERENCE,
} from "@admin/engine";
import {
  REVERSION_RATE,
  MACRO_JITTER,
} from "@admin/engine";
import {
  STANDING_PERSIST_SCALE,
  STANDING_FLOOR_SHARE,
  MAX_NEW_CONDITIONS_PER_TURN,
  MAX_NEW_HOME_CONDITIONS_PER_TURN,
} from "@admin/engine";
import { STATE_ROUTE_CAP, STATE_ROUTE_TURN_CAP, BASE_MARK_DECAY, MAGNITUDE_STEP } from "@admin/engine";
import { COHORT_STRAIN_SCALE, COHORT_STRAIN_FLOOR } from "@admin/engine";
import {
  LENS_TILT_FLOOR,
  LENS_TILT_CAP,
  COHORT_MIN_SPREAD,
  TURNOUT_FLOOR,
  TURNOUT_CEILING,
  OMISSION_DECAY,
  COHORT_DISPERSION_POLARIZE,
  MAX_COHORT_STRAINS,
  STRAIN_SCALE,
} from "@admin/engine";
import { POLICY_TURN_SHARE, POLICY_STANCES } from "@admin/engine";
import { IMPACTS } from "@admin/engine";
import { PRESSURE_WEIGHTS } from "@admin/engine";
import { DOUBTED_BRIEFING_EVIDENCE } from "@admin/engine";
import { TERM_TURNS, TERM_LIMIT } from "@admin/engine";
import {
  CLASS_COOLDOWN,
  SUPPRESSION_WINDOW,
  MAX_DESK_CAPACITY,
  PRESIDENCY_WEIGHTS,
  PRESIDENCY_LIFT,
  CRITICAL_COOLDOWN,
} from "./scenario-director.js";

/**
 * The layer a rebalance actually happens at, coarsest first. This is the
 * taxonomy the methodology is built on: a designer decides which layer a
 * problem lives at BEFORE touching a number, because the same symptom
 * ("the game feels too easy") has a different fix at each one, and the
 * `balance.test.ts` regression this registry was built to prevent is exactly
 * what happens when a fix at one layer is shipped without checking what it
 * does to the others.
 *
 * - `global`     — one number that reweights the whole score (OPINION_WEIGHTS,
 *                   PRESSURE_WEIGHTS). Touching this moves every campaign.
 * - `mechanic`    — one system's own internal constant (macro drift's
 *                   REVERSION_RATE, a condition's STANDING_PERSIST_SCALE, the
 *                   director's CLASS_COOLDOWN). Touching this moves one
 *                   system's behavior, felt everywhere that system fires.
 * - `catalogue`   — a per-row figure inside an authored table (a single
 *                   POLICY_STANCES entry's perTurn magnitude, a single
 *                   condition's IMPACTS row). Touching this moves one entry.
 * - `derivation`  — not itself a constant, but the formula that turns a raw
 *                   figure into a score (treasuryHealth's reference point).
 *                   Recorded because it behaves like a mechanic-layer knob
 *                   even though it is a function, not a number.
 */
export type BalanceLayer = "global" | "mechanic" | "catalogue" | "derivation";

export type BalanceEntry = {
  readonly id: string;
  readonly layer: BalanceLayer;
  /** What moves when this changes — the felt consequence, not the mechanism. */
  readonly governs: string;
  readonly file: string;
  readonly value: unknown;
};

/**
 * The methodology, in the order a rebalance should actually be run:
 *
 * 1. Name the symptom in harness terms (`formatBalanceReport`'s own columns —
 *    approval, range, stability, treasury×, success, removal — not a feeling).
 * 2. Find every entry below whose `governs` plausibly touches that column.
 *    Read them together before changing any one of them — this is the step
 *    the movementToDeltas fix skipped, and it is the step that would have
 *    caught the reckless.removalRate regression before it shipped.
 * 3. Change the NARROWEST layer that could produce the symptom.
 *    `catalogue` before `mechanic` before `global` — a global reweight fixes
 *    everything and breaks everything, a catalogue-row edit fixes one thing.
 * 4. Re-run `runBalanceHarness` (balance-harness.ts) and read the FULL report,
 *    not only the assertion that motivated the change — every `bySkill`
 *    figure, because a fix that repairs `prudent` and silently breaks
 *    `reckless` is not a fix, it is a transfer.
 * 5. Commit the constant AND the reasoning in its doc comment, same as every
 *    entry in this registry's source files already does. A number changed
 *    without a stated reason is a number the next rebalance cannot reason
 *    about either.
 */
export const BALANCE_REGISTRY: readonly BalanceEntry[] = [
  // --- global: reweights the whole score --------------------------------
  { id: "OPINION_WEIGHTS", layer: "global", governs: "how the six public judgments compose into the headline approval score", file: "engine/opinion.ts", value: OPINION_WEIGHTS },
  { id: "PRESSURE_WEIGHTS", layer: "global", governs: "how removal pressure composes across metrics/alignment/history/congress/floors", file: "engine/removal.ts", value: PRESSURE_WEIGHTS },
  { id: "TREASURY_REFERENCE", layer: "derivation", governs: "the treasury figure that reads as approval-neutral (0.5 health)", file: "engine/metrics.ts", value: TREASURY_REFERENCE },

  // --- mechanic: one system's internal constant --------------------------
  { id: "POLICY_TURN_SHARE", layer: "mechanic", governs: "how much of a PolicyMovement's annual figure one turn charges", file: "engine/policy.ts", value: POLICY_TURN_SHARE },
  { id: "REVERSION_RATE", layer: "mechanic", governs: "how fast growth/inflation/unemployment close the gap to baseline each turn", file: "engine/macro.ts", value: REVERSION_RATE },
  { id: "MACRO_JITTER", layer: "mechanic", governs: "the seeded variance share on macro drift — weather vs. a spreadsheet", file: "engine/macro.ts", value: MACRO_JITTER },
  { id: "STANDING_PERSIST_SCALE", layer: "mechanic", governs: "what a standing condition costs on a week it is merely still true", file: "engine/conditions.ts", value: STANDING_PERSIST_SCALE },
  { id: "STANDING_FLOOR_SHARE", layer: "mechanic", governs: "how much of a standing condition's own pressure floors its severity", file: "engine/conditions.ts", value: STANDING_FLOOR_SHARE },
  { id: "MAX_NEW_CONDITIONS_PER_TURN", layer: "mechanic", governs: "how many conditions may open abroad in one week", file: "engine/conditions.ts", value: MAX_NEW_CONDITIONS_PER_TURN },
  { id: "MAX_NEW_HOME_CONDITIONS_PER_TURN", layer: "mechanic", governs: "how many conditions may open at home in one week", file: "engine/conditions.ts", value: MAX_NEW_HOME_CONDITIONS_PER_TURN },
  { id: "STATE_ROUTE_CAP", layer: "mechanic", governs: "the hard ceiling on one act's lean movement in one state", file: "engine/domestic-signature.ts", value: STATE_ROUTE_CAP },
  { id: "STATE_ROUTE_TURN_CAP", layer: "mechanic", governs: "the hard ceiling on total routed lean movement in one state in one turn", file: "engine/domestic-signature.ts", value: STATE_ROUTE_TURN_CAP },
  { id: "BASE_MARK_DECAY", layer: "mechanic", governs: "how fast a routed grievance mark fades", file: "engine/domestic-signature.ts", value: BASE_MARK_DECAY },
  { id: "MAGNITUDE_STEP", layer: "mechanic", governs: "the light/moderate/heavy scale every DomesticSignature magnitude reads", file: "engine/domestic-signature.ts", value: MAGNITUDE_STEP },
  { id: "COHORT_STRAIN_SCALE", layer: "mechanic", governs: "how hard a routed act's magnitude converts into cohort strain weight", file: "engine/route-cohorts.ts", value: COHORT_STRAIN_SCALE },
  { id: "COHORT_STRAIN_FLOOR", layer: "mechanic", governs: "the minimum strain weight worth emitting at all", file: "engine/route-cohorts.ts", value: COHORT_STRAIN_FLOOR },
  { id: "LENS_TILT_FLOOR", layer: "mechanic", governs: "the floor on a cohort's opinion-driver tilt", file: "engine/demos.ts", value: LENS_TILT_FLOOR },
  { id: "LENS_TILT_CAP", layer: "mechanic", governs: "the ceiling on a cohort's opinion-driver tilt", file: "engine/demos.ts", value: LENS_TILT_CAP },
  { id: "COHORT_MIN_SPREAD", layer: "mechanic", governs: "how far a cohort's beliefs may spread around its center", file: "engine/demos.ts", value: COHORT_MIN_SPREAD },
  { id: "TURNOUT_FLOOR", layer: "mechanic", governs: "the floor on authored cohort turnout", file: "engine/demos.ts", value: TURNOUT_FLOOR },
  { id: "TURNOUT_CEILING", layer: "mechanic", governs: "the ceiling on authored cohort turnout", file: "engine/demos.ts", value: TURNOUT_CEILING },
  { id: "OMISSION_DECAY", layer: "mechanic", governs: "how fast an omission-caused cohort strain fades relative to a caused one", file: "engine/demos.ts", value: OMISSION_DECAY },
  { id: "COHORT_DISPERSION_POLARIZE", layer: "mechanic", governs: "the polarization term one week's dispersed cohort reaction contributes", file: "engine/demos.ts", value: COHORT_DISPERSION_POLARIZE },
  { id: "MAX_COHORT_STRAINS", layer: "mechanic", governs: "how many strain records one cohort carries before the oldest is dropped", file: "engine/demos.ts", value: MAX_COHORT_STRAINS },
  { id: "STRAIN_SCALE", layer: "mechanic", governs: "how hard accumulated cohort strain reads into the opinion driver it targets", file: "engine/demos.ts", value: STRAIN_SCALE },
  { id: "TERM_TURNS", layer: "mechanic", governs: "how many whole weeks run from one Inauguration Day to the next (the election dates themselves come from the calendar)", file: "engine/elections.ts", value: TERM_TURNS },
  { id: "TERM_LIMIT", layer: "mechanic", governs: "how many terms a president may serve", file: "engine/elections.ts", value: TERM_LIMIT },
  { id: "CLASS_COOLDOWN", layer: "mechanic", governs: "turns a scenario class waits before it may stage again", file: "content/scenario-director.ts", value: CLASS_COOLDOWN },
  { id: "SUPPRESSION_WINDOW", layer: "mechanic", governs: "how long the cooldown's taper runs after it lifts", file: "content/scenario-director.ts", value: SUPPRESSION_WINDOW },
  { id: "MAX_DESK_CAPACITY", layer: "mechanic", governs: "most decisions a single week may stage, however loaded the board", file: "content/scenario-director.ts", value: MAX_DESK_CAPACITY },
  { id: "PRESIDENCY_WEIGHTS", layer: "mechanic", governs: "how approval/congress/escalation compose into the presidency's own board-pressure reading", file: "content/scenario-director.ts", value: PRESIDENCY_WEIGHTS },
  { id: "PRESIDENCY_LIFT", layer: "mechanic", governs: "the most a failing presidency alone may lift a quiet class's draw weight", file: "content/scenario-director.ts", value: PRESIDENCY_LIFT },
  { id: "CRITICAL_COOLDOWN", layer: "mechanic", governs: "turns after a critical week during which another critical is damped", file: "content/scenario-director.ts", value: CRITICAL_COOLDOWN },
  { id: "DOUBTED_BRIEFING_EVIDENCE", layer: "mechanic", governs: "how much confidence a doubted briefing takes off a spoken answer's assessment of what it will do", file: "engine/position-assessment.ts", value: DOUBTED_BRIEFING_EVIDENCE },

  // --- catalogue: one row inside an authored table -----------------------
  // Representative, not exhaustive — every POLICY_STANCES entry and every
  // IMPACTS row is its own catalogue-layer knob; these two are cited so the
  // methodology's fourth layer is a real, live-read example rather than a
  // claim with nothing under it. Extracted from the live tables, never
  // retyped, on the same Law-1 discipline the whole registry follows.
  {
    id: "POLICY_STANCES[recession].perTurn",
    layer: "catalogue",
    governs: "one stance's own weekly cost/return — the layer the movementToDeltas fix landed on and stalled at",
    file: "engine/policy.ts",
    value: POLICY_STANCES.find((stance) => stance.id.includes("recession"))?.perTurn ?? POLICY_STANCES[0]?.perTurn,
  },
  {
    id: "IMPACTS.recession",
    layer: "catalogue",
    governs: "what the recession standing condition costs a country per week, by channel",
    file: "engine/condition-impacts.ts",
    value: IMPACTS.recession,
  },
] as const;
