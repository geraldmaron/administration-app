import type { NationId, OrgId } from "@admin/world";
import type { Campaign } from "./state.js";
import {
  FOREIGN_POLITICS_RECENT_WINDOW,
  type ForeignCoverageState,
  type ForeignSeat,
  type LeadershipChange,
  type MarketsState,
  type MunitionsState,
  type Indictment,
  type RegimeOperation,
} from "./state-world.js";

// The effect kinds a moving world writes, as plain reducers in a leaf
// module. `effects.ts` imports every handler at load, so a handler that lived
// beside its phase dragged that phase's imports (markets and foreign politics
// reach governance, which reads the policy table at load) into the effect
// module's cycle and broke the engine's load. Their phases re-export them.

/** Full replacement of the markets record. `commodityPhase` is its weekly writer; the President's market acts write the parts they own. */
export type MarketsEffect = { readonly kind: "markets"; readonly set: MarketsState };

export function applyMarkets(state: Campaign, effect: MarketsEffect): Campaign {
  return { ...state, markets: effect.set };
}

/** Full replacement of the munitions record. `munitionsPhase` is its writer. */
export type MunitionsEffect = { readonly kind: "munitions"; readonly set: MunitionsState };

export function applyMunitions(state: Campaign, effect: MunitionsEffect): Campaign {
  return { ...state, munitions: effect.set };
}

/**
 * One seat changing hands, and the change filed for the feed; or one week of
 * the press abroad, as the running total its coverage has moved the
 * government's trust by. The seat's offset is what `liveTemperament` reads,
 * so this is the one way a leader's character reaches a government's decisions.
 */
export type LeadershipEffect = {
  readonly kind: "leadership";
  readonly nation: NationId;
  readonly seat?: ForeignSeat;
  readonly change?: LeadershipChange;
  readonly coverage?: { readonly affinity: number };
};

export function applyLeadership(state: Campaign, effect: LeadershipEffect): Campaign {
  const current = state.foreignPolitics ?? { seats: {}, recent: [] };
  const recent = effect.change ? [...current.recent, effect.change].slice(-FOREIGN_POLITICS_RECENT_WINDOW) : current.recent;
  const seated =
    effect.seat || effect.change
      ? { ...state, foreignPolitics: { seats: effect.seat ? { ...current.seats, [effect.nation]: effect.seat } : current.seats, recent } }
      : state;
  if (!effect.coverage) return seated;
  const coverage: ForeignCoverageState = { ...(state.foreignCoverage ?? {}), [effect.nation]: effect.coverage };
  return { ...seated, foreignCoverage: coverage };
}

/** One regime operation written whole: a new one appended, a known one replaced by its id. */
export type RegimeEffect = { readonly kind: "regime"; readonly upsert: RegimeOperation };

// An ended operation is kept for as long as anything still reads it: the
// tempo caps look back one term, and a successor's lean decays over four
// half-lives of two years each.
const REGIME_KEEP_TURNS = 416;

function lastTouched(operation: RegimeOperation): number {
  return Math.max(operation.startedTurn, operation.endedTurn ?? 0, operation.installed?.turn ?? 0);
}

export function applyRegime(state: Campaign, effect: RegimeEffect): Campaign {
  const current = state.regimeOperations?.operations ?? [];
  const known = current.some((operation) => operation.id === effect.upsert.id);
  const next = known ? current.map((operation) => (operation.id === effect.upsert.id ? effect.upsert : operation)) : [...current, effect.upsert];
  const kept = next.filter((operation) => operation.status === "running" || lastTouched(operation) >= state.turn - REGIME_KEEP_TURNS);
  return { ...state, regimeOperations: { ...state.regimeOperations, operations: kept } };
}

/** An indictment filed, or served: upserted by id. Indictments are kept for the whole campaign, since a served one is the record of why a leader is in custody. */
export type IndictmentEffect = { readonly kind: "indictment"; readonly upsert: Indictment };

export function applyIndictment(state: Campaign, effect: IndictmentEffect): Campaign {
  const operations = state.regimeOperations?.operations ?? [];
  const current = state.regimeOperations?.indictments ?? [];
  const known = current.some((entry) => entry.id === effect.upsert.id);
  const next = known ? current.map((entry) => (entry.id === effect.upsert.id ? effect.upsert : entry)) : [...current, effect.upsert];
  return { ...state, regimeOperations: { operations, indictments: next } };
}

/** A government accedes to a body or withdraws from it; the runtime override of its authored roster. */
export type MembershipEffect = {
  readonly kind: "membership";
  readonly nation: NationId;
  readonly org: OrgId;
  readonly change: "accede" | "withdraw";
};

export function applyMembership(state: Campaign, effect: MembershipEffect): Campaign {
  const runtime = state.nations[effect.nation];
  if (!runtime) throw new Error(`membership: no nation ${effect.nation as string}`);
  const current = runtime.memberships ?? runtime.base.memberships;
  const memberships =
    effect.change === "accede"
      ? current.includes(effect.org)
        ? current
        : [...current, effect.org]
      : current.filter((org) => org !== effect.org);
  return { ...state, nations: { ...state.nations, [effect.nation]: { ...runtime, memberships } } };
}
