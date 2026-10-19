import type { NationId } from "@admin/world";
import type { Campaign } from "./state.js";

// The shocks one government does to another's economy, or a building does to
// a country's jobs, kept with the week they landed.
//
// A development grant, a sabotage and a round of hiring or layoffs used to be
// written straight onto the rate, which `macro.ts` then pulled back inside a
// season as if nothing had happened, and which no reading could date. Kept
// here, each is a target shift for a stated span: the drift phase moves where
// growth and joblessness are headed while the shock stands, and a reader can
// say which grant or which sabotage was behind the move and since when.

export type ExternalShockKind = "grant" | "sabotage" | "jobs" | "default";

export type ExternalShock = {
  readonly nation: NationId;
  readonly kind: ExternalShockKind;
  /** Annual shift in the growth target, as a fraction. */
  readonly growth: number;
  /** Shift in the unemployment target, as a fraction of the labor force. */
  readonly unemployment: number;
  readonly fromTurn: number;
  readonly weeks: number;
};

/** Half a year: how long a grant's program, a sabotaged plant or a hiring round shapes the year's direction. */
export const EXTERNAL_SHOCK_WEEKS = 26;

/**
 * The most shocks the campaign keeps. Shocks landing on the same country, of
 * the same kind, in the same week are one entry, so this is room for every
 * country a busy half-year touches, and the oldest go first past it.
 */
export const EXTERNAL_SHOCK_RING = 128;

/** The most a grant can add to a growth target: a development program, not a boom. */
export const GRANT_GROWTH_CAP = 0.02;

export type ExternalShockEffect = { readonly kind: "externalShock"; readonly shock: ExternalShock };

function live(shock: ExternalShock, turn: number): boolean {
  return turn >= shock.fromTurn && turn - shock.fromTurn < shock.weeks;
}

const sameEntry = (a: ExternalShock, b: ExternalShock) => a.nation === b.nation && a.kind === b.kind && a.fromTurn === b.fromTurn;

/** The ring with one more shock in it: merged into its week's entry, expired ones dropped, the oldest past the bound gone. */
export function withShock(shocks: readonly ExternalShock[], shock: ExternalShock, turn: number): readonly ExternalShock[] {
  const kept = shocks.filter((entry) => live(entry, turn));
  const same = kept.find((entry) => sameEntry(entry, shock));
  const merged = same
    ? kept.map((entry) =>
        entry === same ? { ...entry, growth: entry.growth + shock.growth, unemployment: entry.unemployment + shock.unemployment } : entry,
      )
    : [...kept, shock];
  return merged.slice(Math.max(0, merged.length - EXTERNAL_SHOCK_RING));
}

export function applyExternalShock(state: Campaign, effect: ExternalShockEffect): Campaign {
  return { ...state, externalShocks: withShock(state.externalShocks ?? [], effect.shock, state.turn) };
}

/** A shock dated this week, as the effect that records it. */
export function shockEffect(
  campaign: Campaign,
  nation: NationId,
  kind: ExternalShockKind,
  shift: { readonly growth?: number; readonly unemployment?: number },
): ExternalShockEffect {
  return {
    kind: "externalShock",
    shock: { nation, kind, growth: shift.growth ?? 0, unemployment: shift.unemployment ?? 0, fromTurn: campaign.turn, weeks: EXTERNAL_SHOCK_WEEKS },
  };
}

/** What the shocks still standing do to one country's targets this week. */
export function shockPressure(campaign: Campaign, nation: NationId): { readonly growth: number; readonly unemployment: number } {
  let growth = 0;
  let unemployment = 0;
  for (const shock of campaign.externalShocks ?? []) {
    if (shock.nation !== nation || !live(shock, campaign.turn)) continue;
    growth += shock.growth;
    unemployment += shock.unemployment;
  }
  return { growth, unemployment };
}
