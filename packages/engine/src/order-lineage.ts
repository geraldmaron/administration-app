import type { NationStatEffect } from "./effect-types.js";
import { applyNationStat } from "./effects.js";
import { policyStatBounds, statAt, type PolicyStatPath } from "./policy-stats.js";
import type { Campaign, NationRuntime } from "./state.js";
import type { OrderStatLineage } from "./state-orders.js";

function replay(lineage: NonNullable<Campaign["orderStatLineage"]>[PolicyStatPath], stats: NationRuntime["stats"], path: PolicyStatPath): number | undefined {
  if (!lineage) return undefined;
  const [min, max] = policyStatBounds(stats, path);
  return lineage.events.reduce((value, event) =>
    Math.max(event.lower ?? min, Math.min(event.upper ?? max,
      value + event.delta * (event.ownerId ? lineage.weights[event.ownerId] ?? 1 : 1))), lineage.base);
}

function appendEvent(events: OrderStatLineage["events"],
  delta: number, ownerId: string | undefined, bounds: readonly [number, number]) {
  const previous = events.at(-1);
  if (ownerId || !previous || previous.ownerId) return [...events, { delta, ...(ownerId ? { ownerId } : {}) }];
  const [min, max] = bounds;
  const lower = Math.max(min, Math.min(max, (previous.lower ?? min) + delta));
  const upper = Math.max(min, Math.min(max, (previous.upper ?? max) + delta));
  return [...events.slice(0, -1), { delta: previous.delta + delta, lower, upper }];
}

/** An absolute set ends attribution for this path; a later owned move starts a new chain. */
export function recordStatLineage(state: Campaign, effect: NationStatEffect, before: NationRuntime, after: NationRuntime): Campaign {
  if (effect.skipLineage || effect.nation !== state.founding.nation || !effect.setStats) return state;
  const lineage = { ...state.orderStatLineage };
  let changed = false;
  for (const [group, fields] of Object.entries(effect.setStats)) {
    if (!fields || typeof fields !== "object") continue;
    for (const field of Object.keys(fields)) {
      const path = `${group}.${field}` as PolicyStatPath;
      if (path === "economy.debt" || !Object.prototype.hasOwnProperty.call(lineage, path) && !effect.requestedDelta?.ownerId) continue;
      const relative = effect.requestedDelta;
      if (!relative || relative.path !== path || !Number.isFinite(relative.amount)) {
        delete lineage[path]; changed = true; continue;
      }
      const prior = lineage[path];
      const beforeValue = statAt(before.stats, path);
      const recorded = replay(prior, before.stats, path);
      if (prior && (recorded === undefined || Math.abs(recorded - beforeValue) > 1e-8)) {
        delete lineage[path]; changed = true;
        if (!relative.ownerId) continue;
      }
      const base = lineage[path] ?? { base: beforeValue, events: [], weights: {} };
      const candidate = { ...base, events: appendEvent(base.events, relative.amount, relative.ownerId,
        policyStatBounds(before.stats, path)) };
      const expected = replay(candidate, before.stats, path);
      if (expected === undefined || Math.abs(expected - statAt(after.stats, path)) > 1e-8) {
        delete lineage[path]; changed = true; continue;
      }
      lineage[path] = candidate; changed = true;
    }
  }
  return changed ? { ...state, orderStatLineage: lineage } : state;
}

export function ownerWeight(state: Campaign, ownerId: string, weight: number): { readonly state: Campaign; readonly movement?: Partial<Record<PolicyStatPath, number>>; readonly unknown?: true } {
  let next = state;
  const movement: Partial<Record<PolicyStatPath, number>> = {};
  let unknown = false;
  for (const [path, old] of Object.entries(state.orderStatLineage ?? {}) as [PolicyStatPath, NonNullable<Campaign["orderStatLineage"]>[PolicyStatPath]][]) {
    if (!old?.events.some((event) => event.ownerId === ownerId)) continue;
    const nation = next.nations[next.founding.nation];
    if (!nation) break;
    const before = statAt(nation.stats, path);
    const currentReplay = replay(old, nation.stats, path);
    if (currentReplay === undefined || Math.abs(currentReplay - before) > 1e-8) {
      const preserved = { ...next.orderStatLineage };
      delete preserved[path];
      next = { ...next, orderStatLineage: preserved };
      unknown = true;
      continue;
    }
    const updated = { ...old, weights: { ...old.weights, [ownerId]: weight } };
    const after = replay(updated, nation.stats, path);
    if (after === undefined) continue;
    const [group, field] = path.split(".");
    const effect: NationStatEffect = { kind: "nationStat", nation: next.founding.nation,
      setStats: { [group!]: { [field!]: after } } as NationStatEffect["setStats"], skipLineage: true };
    // The replay writer is the same public stat writer; only attribution bookkeeping is bypassed.
    next = { ...next, orderStatLineage: { ...next.orderStatLineage, [path]: updated } };
    next = applyNationStat(next, effect);
    movement[path] = before - after;
  }
  return { state: next, ...(Object.keys(movement).length ? { movement } : {}), ...(unknown ? { unknown: true as const } : {}) };
}
