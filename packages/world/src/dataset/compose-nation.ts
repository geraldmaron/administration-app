import type { z } from "zod";
import { NationInput, type NationStats } from "../schemas/nation.js";
import { fillSectorMix } from "./sectors.js";

// A record is two layers. The figures are what a named source published about a
// country, baked from the pinned seed tables by scripts/bake-nations.mjs; the
// authored layer is what a person decided about it — its name as the game
// spells it, its charter, its region, its temperament and its red lines. A
// country added from the seed authors only the second layer and inherits the
// first, so a figure in the dataset is either one a source stated or one a
// stated prior filled, never a number somebody typed.
//
// The authored layer always wins. A record may state any figure itself, and the
// 61 records written before the bake existed state every one of them: composing
// such a record returns it unchanged, which is how the bake proves it moved no
// shipped number.

/** Where one country's baked figures came from. */
export type NationFigureProvenance = {
  /** The year most of this country's sourced figures describe. */
  readonly vintage: number;
  /** Sourced figures describing an earlier year than `vintage`, by stat path. */
  readonly older: Readonly<Record<string, number>>;
  /**
   * Sourced stat paths no source states for this country, each filled from a
   * prior the bake derived: a continental median of the same ratio, or a fit
   * of sourced figures against each other. The judgment readings every baked
   * row fits from the authored roster are listed once, in `JUDGED_READINGS`.
   */
  readonly priors: readonly string[];
  /** Stat paths whose sourced figure lay outside the range the game models, held at that range's edge. */
  readonly clamped: readonly string[];
};

export type NationFigures = {
  readonly stats: NationStats;
  readonly provenance: NationFigureProvenance;
};

type Overlay<T> = T extends readonly unknown[] ? T : T extends object ? { readonly [K in keyof T]?: Overlay<T[K]> } : T;

/**
 * A record as it is authored: everything a person decides, and any figure the
 * author chooses to state over the baked one. `sectors` is optional because it
 * follows from the figures; a record states it only to override the mix the
 * leading exports and the energy mix imply.
 */
export type NationDraft = Omit<z.input<typeof NationInput>, "stats" | "sectors"> & {
  readonly stats?: Overlay<NationStats>;
  readonly sectors?: z.input<typeof NationInput>["sectors"];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The authored value wherever one is stated; an array is a value, not a list to merge. */
function overlay(base: unknown, authored: unknown): unknown {
  if (authored === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(authored)) return authored;
  const keys = new Set([...Object.keys(base), ...Object.keys(authored)]);
  return Object.fromEntries([...keys].map((key) => [key, overlay(base[key], authored[key])]));
}

/**
 * One record from its authored layer and its baked figures.
 *
 * Throws when a record has no figures and does not state its own: that is a
 * country missing from the seed, and a record assembled without numbers would
 * otherwise fail far from the cause, as a schema error about a field nobody wrote.
 */
export function composeNation(draft: NationDraft, figures: NationFigures | undefined): NationInput {
  if (!figures && !draft.stats) {
    throw new Error(`no baked figures for "${draft.id}" and its record states none of its own — is it in the seed roster?`);
  }
  const stats = overlay(figures?.stats, draft.stats) as NationStats;
  const sectors =
    draft.sectors ??
    fillSectorMix(stats.trade.topExports, stats.energy.mix, stats.demography.population, stats.economy.unemployment);
  return NationInput.parse({ ...draft, stats, sectors });
}
