// The four dataset checks the vitals lattice owes.
//
// Split out of `dataset-validator.ts` rather than added to it because that file
// was already within a hundred lines of the 800-line budget; the checks that
// hold the rate lattice together read as one subject and keep their own file.
import type { WorldDataset as WorldDatasetT } from "../schemas/index.js";
import { RETIRED_DEBT_TO_GDP, debtToGdp } from "../dataset/fiscal-identities.js";
import type { ValidationError } from "./validation-error.js";

/**
 * The growth rate is the net of the three vital rates, so it cannot be a
 * fourth independent number. `applyVitalRates` writes it at assembly; this is
 * what proves the pass ran, and it catches a hand-built dataset (a studio
 * overlay, a fixture) that edited one of the four without the others.
 */
const GROWTH_IDENTITY_TOLERANCE = 0.0005;

export function checkVitalRates(dataset: WorldDatasetT): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const nation of dataset.nations) {
    const d = nation.stats.demography;
    const net = d.birthRate - d.deathRate + d.netMigration;
    if (Math.abs(d.growthRate - net) > GROWTH_IDENTITY_TOLERANCE) {
      errors.push({
        kind: "unit-mismatch",
        path: `nations.${nation.id}.stats.demography.growthRate`,
        message:
          `growthRate is ${d.growthRate}, but births minus deaths plus net migration is ` +
          `${net.toFixed(5)} — one of the four was edited without the others`,
      });
    }
  }
  return errors;
}

/**
 * `costOfLiving` is an index measured against this dataset's own snapshot, so
 * the snapshot itself is 1.000 by definition. A nation authored anywhere else
 * is claiming prices moved before the campaign opened, which nothing in the
 * fiction can mean.
 */
const COST_OF_LIVING_TOLERANCE = 0.001;

export function checkCostOfLivingOpening(dataset: WorldDatasetT): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const nation of dataset.nations) {
    const cost = nation.stats.economy.costOfLiving;
    if (Math.abs(cost - 1) > COST_OF_LIVING_TOLERANCE) {
      errors.push({
        kind: "unit-mismatch",
        path: `nations.${nation.id}.stats.economy.costOfLiving`,
        message: `costOfLiving is ${cost}, but the index is 1.000 at the dataset snapshot by definition`,
      });
    }
  }
  return errors;
}

/**
 * The one-shot check on the conversion from a stored ratio to a stored stock.
 * The stock is what the dataset ships now; this proves the derived ratio still
 * lands on the figure the retired field held, so the migration can be checked
 * rather than asserted.
 */
const DEBT_RATIO_TOLERANCE = 0.001;

export function checkDebtReproducesRatio(dataset: WorldDatasetT): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const nation of dataset.nations) {
    const retired = RETIRED_DEBT_TO_GDP[nation.id as string];
    if (retired === undefined) continue;
    const derived = debtToGdp(nation.stats);
    if (Math.abs(derived - retired) > DEBT_RATIO_TOLERANCE) {
      errors.push({
        kind: "unit-mismatch",
        path: `nations.${nation.id}.stats.economy.debt`,
        message:
          `debt of ${nation.stats.economy.debt} USD millions derives a debt-to-GDP of ` +
          `${derived.toFixed(4)}, but the retired authored ratio was ${retired}`,
      });
    }
  }
  return errors;
}

/**
 * Every vital anchor is a deviation from the national figure, so the country
 * as a whole has to deviate from itself by nothing. Without this, 153
 * hand-authored numbers can silently re-baseline the whole country: a table
 * where every state sits half a point above the nation says the nation's own
 * figure is wrong, and nothing else would notice.
 *
 * Weighted by population rather than by row, because that is the sense in
 * which the state readings aggregate to the national one.
 */
const ANCHOR_CENTER_TOLERANCE = 0.005;
const ANCHOR_FIELDS = ["unemployment", "crimeIndex", "costOfLiving"] as const;

export function checkStateVitalAnchors(dataset: WorldDatasetT): ValidationError[] {
  const errors: ValidationError[] = [];
  const total = dataset.states.reduce((sum, state) => sum + state.population, 0);
  if (total === 0) return errors;
  for (const field of ANCHOR_FIELDS) {
    const mean =
      dataset.states.reduce((sum, state) => sum + state.character.vitalAnchor[field] * state.population, 0) / total;
    if (Math.abs(mean) > ANCHOR_CENTER_TOLERANCE) {
      errors.push({
        kind: "plausibility",
        path: `states.character.vitalAnchor.${field}`,
        message:
          `the population-weighted mean of the ${field} anchor is ${mean.toFixed(5)}, not 0 — ` +
          `the anchors are deviations from the national figure and cannot re-baseline it`,
      });
    }
  }
  return errors;
}

