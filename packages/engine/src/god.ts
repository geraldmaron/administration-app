import type { CityId, NationId, PersonId, RoleId } from "@admin/world";
import type { Campaign, FlagId, NationRuntime } from "./state.js";
import type { CityEffect, EffectPacket, RelationshipScalars } from "./effects.js";
import { openConflict, settleByAgreement } from "./conflicts.js";
import { setRuleChanges } from "./rules-effects.js";
import type { MetricDeltas } from "./effect-types.js";

// God mode's whole implementation is this file, and this file builds packets.
//
// There is no second mutator here and there is deliberately nowhere to put one:
// every function below returns an ordinary `EffectPacket` that the caller hands
// to `apply()`, so a god edit is subject to the same clamps, the same schema
// ranges and the same ledger entry as a decision the player took in the
// fiction. That is what makes the paid tier safe to sell — it cannot express a
// campaign the engine could not have reached on its own, only reach one faster.
//
// Every packet is stamped `actor: "developer"`, which is what keeps the record
// readable: `selectPlayerLedger` stays the account of what the administration
// decided, and the god edits sit beside it in the full ledger, attributable and
// impossible to mistake for governing.

const ACTOR = "developer" as const;
const SOURCE = "godmode" as const;

function godPacket(campaign: Campaign, summary: string, effects: EffectPacket["effects"]): EffectPacket {
  return { source: SOURCE, actor: ACTOR, turn: campaign.turn, narration: { summary }, effects };
}

/**
 * Enter god mode. Irreversible by construction: the packet can only set the
 * flag, and `apply()` carries it forward past everything after it.
 *
 * Omniscience and removal immunity are their own rules now rather than two more
 * meanings folded into the flag, so entering by hand sets both in the same
 * packet. Without that, entering here would mark the campaign and grant neither,
 * which is not what anyone who opened the editor asked for.
 */
export function enableGodMode(campaign: Campaign): EffectPacket {
  const rules = setRuleChanges(campaign, { "information.omniscient": true, "removal.immune": true }).map(
    (change) => ({ kind: "rules", change }) as const,
  );
  return godPacket(campaign, "The record is opened for direct amendment. This administration is no longer only played.", [
    { kind: "godMode", enable: true },
    ...rules,
  ]);
}

/** Record that the timeline was rewound to, or branched from, a given turn. */
export function recordBranchPoint(campaign: Campaign, turn: number): EffectPacket {
  return godPacket(campaign, `The term is rewound to week ${turn}. What followed it is unwritten.`, [
    { kind: "godMode", branchPoint: turn },
  ]);
}

type DeepPartialOf<T> = T extends object ? { [K in keyof T]?: DeepPartialOf<T[K]> } : T;

// Partial all the way down, and every leaf clamped by the world schema's own
// ranges when `apply()` writes it — which is why an arbitrary edit is still a
// valid one, and why god mode needs no separate validation of its own.
export type NationEdit = {
  readonly setStats?: DeepPartialOf<NationRuntime["stats"]>;
  readonly setTraits?: DeepPartialOf<NationRuntime["traits"]>;
};

/** Write a nation's live stats or traits directly. Absolute values, not movement. */
export function editNationStat(campaign: Campaign, nation: NationId, edit: NationEdit): EffectPacket {
  if (!campaign.nations[nation]) throw new Error(`god mode cannot edit ${nation}: no such nation in this campaign`);
  return godPacket(campaign, `The record of ${nation} is amended by hand.`, [{ kind: "nationStat", nation, ...edit }]);
}

export type CityEdit = {
  readonly employment?: number;
  readonly adminLean?: number;
  readonly taxHolidayTurns?: number;
};

function cityEffectFromEdit(city: CityId, edit: CityEdit, reason: string): CityEffect {
  return {
    kind: "city",
    city,
    reason,
    deltas: { employment: edit.employment, adminLean: edit.adminLean },
    set: { taxHolidayTurns: edit.taxHolidayTurns },
  };
}

/** Write a city's live employment, lean, or remaining tax holiday. Clamped by apply(). */
export function editCity(campaign: Campaign, city: CityId, deltas: CityEdit): EffectPacket {
  const runtime = campaign.cities[city];
  if (!runtime) throw new Error(`god mode cannot edit ${city}: no such city in this campaign`);
  const reason = `The record of ${runtime.base.name} is amended by hand.`;
  return godPacket(campaign, reason, [cityEffectFromEdit(city, deltas, reason)]);
}

/** Write one directed relationship's scalars directly. */
export function editRelationship(
  campaign: Campaign,
  from: NationId,
  to: NationId,
  set: Partial<RelationshipScalars>,
): EffectPacket {
  return godPacket(campaign, `What ${from} holds of ${to} is rewritten.`, [{ kind: "relationship", from, to, set }]);
}

/** Open a war between any two nations, using the same constructor a real one uses. */
export function spawnConflict(campaign: Campaign, aggressor: NationId, defender: NationId, cause: string): EffectPacket {
  if (aggressor === defender) throw new Error("god mode cannot open a war between a nation and itself");
  const conflict = openConflict(aggressor, defender, campaign.turn, cause);
  return godPacket(campaign, `War is declared between ${aggressor} and ${defender}: ${cause}`, [
    { kind: "conflict", set: conflict },
  ]);
}

/**
 * End a war by decree, through the same terminal transition an agreed
 * settlement takes. God mode does not get its own way to stop a war: a conflict
 * that ended outside `settleByAgreement` would carry a status no consequence
 * rule knows how to read.
 */
export function settleConflict(campaign: Campaign, conflictId: string, summary: string): EffectPacket {
  const conflict = campaign.conflicts[conflictId];
  if (!conflict) throw new Error(`god mode cannot settle ${conflictId}: no such conflict in this campaign`);
  return godPacket(campaign, summary, [{ kind: "conflict", set: settleByAgreement(conflict, campaign.turn, summary) }]);
}

/** Move the player's metrics by hand. Signed deltas, clamped like any other. */
export function grantMetrics(campaign: Campaign, deltas: MetricDeltas): EffectPacket {
  return godPacket(campaign, "The standing of this administration is set by hand.", [{ kind: "metric", deltas }]);
}

/** Set or clear one campaign flag — the gate most authored content reads. */
export function setGodFlag(campaign: Campaign, flag: FlagId, held: boolean): EffectPacket {
  return godPacket(campaign, `The record now says ${flag} ${held ? "happened" : "did not happen"}.`, [
    { kind: "flag", ...(held ? { set: [flag] } : { clear: [flag] }) },
  ]);
}

/** Seat, or empty, any chair in the cabinet without an appointment. */
export function seatByDecree(campaign: Campaign, role: RoleId, person?: PersonId): EffectPacket {
  if (person !== undefined && !campaign.people[person]) {
    throw new Error(`god mode cannot seat ${person}: no such person in this campaign`);
  }
  const summary = person === undefined ? `The ${role} chair is emptied by decree.` : `${person} takes the ${role} chair by decree.`;
  return godPacket(campaign, summary, [{ kind: "cabinet", role, ...(person === undefined ? {} : { person }) }]);
}
