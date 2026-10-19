import type { Effect } from "./effects.js";
import {
  BENEFICIAL_DIRECTION,
  NO_RESTING_OFFSET,
  RESTING_POINT_PATHS,
  isRestingPointPath,
  outputScale,
  policyStatBounds,
  statAt,
  type PolicyStatPath,
  type ProgramRestingOffset,
  type RestingPointPath,
} from "./policy-stats.js";
import type { PolicyStance } from "./policy.js";
import { selectNation, type Campaign, type NationRuntime } from "./state.js";

// What a program does to the country carrying it, split out of the catalogue
// that authors it.
//
// Two reasons, and the second is the one that matters. `policy.ts` is at its
// size ceiling, and a stance's teeth are read by three callers that have no
// business loading six domains of authored prose to reach them: the player's
// own weekly phase, the world's, and the executive order that borrows the same
// sixteen paths for a single act.
//
// The split this file exists to hold is the one between a level and a resting
// point. Eleven of the sixteen paths have no rate law behind them, so a weekly
// delta on one is the delivery; the other five are reverted every week by
// `macro.ts`, and a weekly delta on those settles at the authored figure over
// the reversion rate rather than at the authored figure. The type of the path
// decides which way a delta leaves, so no caller has to remember.

type NationStatSetStats = Extract<Effect, { kind: "nationStat" }>["setStats"];

// `nationStat` effects are absolute, so every figure here is computed against
// live stats and held inside the schema's own range — a program running for
// eighty turns must not be able to write a campaign the validator would reject.
function statEffect(runtime: NationRuntime, path: PolicyStatPath, delta: number): Effect {
  const [min, max] = policyStatBounds(runtime.stats, path);
  const scale = outputScale(runtime.stats, path);
  const [group, field] = path.split(".") as [string, string];
  const next = Math.max(min, Math.min(max, statAt(runtime.stats, path) + delta * scale));
  return { kind: "nationStat", nation: runtime.base.id, setStats: { [group]: { [field]: next } } as NationStatSetStats,
    requestedDelta: { path, amount: delta * scale } };
}

/** One domain's standing stance and how well the government delivers it. */
export type ProgramLine = { readonly stance: PolicyStance; readonly quality: number };

// Summed per path before anything is built with it: two domains can push the
// same stat in the same week, and `nationStat` writes absolutes — emitting one
// effect each would silently let the last one win.
function programTotals(program: readonly ProgramLine[]): ReadonlyMap<PolicyStatPath, number> {
  const totals = new Map<PolicyStatPath, number>();
  for (const { stance, quality } of program) {
    for (const [path, delta] of Object.entries(stance.nationEffects) as [PolicyStatPath, number][]) {
      const beneficial = BENEFICIAL_DIRECTION[path] * Math.sign(delta) > 0;
      totals.set(path, (totals.get(path) ?? 0) + (beneficial ? delta * quality : delta));
    }
  }
  return totals;
}

/**
 * One turn of a program, as it lands on the nation running it.
 *
 * Takes the nation rather than reading the player's, because nothing here is
 * about the player: the same function is what gives an NPC's program its
 * consequences. Quality scales what a program *delivers* and
 * never what it costs, the same asymmetry `movementToDeltas` applies — so a
 * weak minister's surveillance state watches less and censors just as much.
 *
 * The eleven paths with no rate law behind them are the ones written here. The
 * five that `macro.ts` reverts are not: on those a weekly level write is a bid
 * against a restoring force rather than a delivery, and what it settles at is
 * the authored figure divided by the reversion rate. Those five leave through
 * `policyRestingOffset` instead, which moves the target the law reverts to.
 */
export function policyNationEffects(
  runtime: NationRuntime,
  program: readonly ProgramLine[],
): readonly Effect[] {
  return [...programTotals(program)]
    .filter(([path]) => !isRestingPointPath(path))
    .map(([path, delta]) => statEffect(runtime, path, delta));
}

/**
 * Where this program puts the five rates whose evolution law lives in
 * `macro.ts`, in each rate's own unit.
 *
 * Competence still scales what the program delivers, because a resting point a
 * government cannot actually hold the country at is not a resting point.
 */
export function policyRestingOffset(program: readonly ProgramLine[]): ProgramRestingOffset {
  const totals = programTotals(program);
  const offset: { -readonly [K in RestingPointPath]: number } = { ...NO_RESTING_OFFSET };
  for (const path of RESTING_POINT_PATHS) offset[path] = totals.get(path) ?? 0;
  return offset;
}

/**
 * A one-off movement of the same sixteen paths, landed on the player's own
 * nation. An executive order is a single act rather than a standing program, so
 * nothing here scales by competence — a decree is carried out by the state as
 * it is, and how well it was drafted has already been priced, in whether the
 * courts let it stand. What is shared with a program is the part that matters:
 * absolutes computed against live stats and held inside the schema's range, so
 * a government signing orders for eighty turns cannot write a campaign the
 * validator would reject.
 */
export function orderStatEffects(
  campaign: Campaign,
  movements: Partial<Record<PolicyStatPath, number>>,
  ownerId?: string,
): readonly Effect[] {
  const runtime = selectNation(campaign, campaign.founding.nation);
  if (!runtime) return [];
  return (Object.entries(movements) as [PolicyStatPath, number][]).map(([path, delta]) => ({
    ...statEffect(runtime, path, delta),
    requestedDelta: { path, amount: delta * outputScale(runtime.stats, path), ...(ownerId ? { ownerId } : {}) },
  }) as Effect);
}

