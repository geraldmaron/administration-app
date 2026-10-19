import {
  isStanding,
  type Campaign,
  type DeclaredEmergency,
  type ExecutiveOrderRecord,
  type GrievanceMark,
  type NationCondition,
  type PendingClaim,
} from "@admin/engine";
import { placeAt, STATE_IDS, type NationId, type Place, type StateId } from "@admin/world";

// Every running thing the map can pin, and the one function that says where.
//
// A condition names its own city or state. A grievance mark or a pending claim
// is held by a state, so it has the state's point. A declared emergency reaches
// one state or the whole country. A state or foreign order names its subject's
// place; a construction order does not name a place. These resolve through the dataset's
// `placeAt`, the same resolver a scenario bound to a condition is placed by,
// so a wildfire, the emergency declared over it and the week about it land on
// one point.

export type PinnableItem =
  | { readonly kind: "condition"; readonly record: NationCondition }
  | { readonly kind: "emergency"; readonly nation: NationId; readonly record: DeclaredEmergency }
  | { readonly kind: "mark"; readonly nation: NationId; readonly state: StateId; readonly record: GrievanceMark }
  | { readonly kind: "claim"; readonly nation: NationId; readonly state: StateId; readonly record: PendingClaim }
  | { readonly kind: "order"; readonly nation: NationId; readonly record: ExecutiveOrderRecord };

export type PinnableKind = PinnableItem["kind"];

/** Every kind `placeOf` answers for; `verify-incident-places` holds it to the engine's records. */
export const PINNABLE_KINDS: readonly PinnableKind[] = ["claim", "condition", "emergency", "mark", "order"];

export type { Place, PlaceLevel } from "@admin/world";

/** City, then the state's largest city or its capitol, then the nation. */
export function placeOf(item: PinnableItem): Place | undefined {
  switch (item.kind) {
    case "condition":
      return placeAt({
        nation: item.record.nation,
        ...(item.record.state ? { state: item.record.state } : {}),
        ...(item.record.city ? { city: item.record.city } : {}),
      });
    case "emergency":
      return placeAt({
        nation: item.nation,
        ...(item.record.scope.kind === "state" ? { state: item.record.scope.state } : {}),
      });
    case "mark":
    case "claim":
      return placeAt({ nation: item.nation, state: item.state });
    case "order":
      if (item.record.subject?.kind === "state") return placeAt({ nation: item.nation, state: item.record.subject.state });
      if (item.record.subject?.kind === "foreign") return placeAt({ nation: item.record.subject.nation });
      return undefined;
  }
}

/**
 * Every live pinnable record in a campaign, in a declared order: conditions and
 * emergencies by id, located orders by id, then each state's marks and claims in `STATE_IDS` order.
 * Resolved conditions and ended emergencies are history, not pins.
 */
export function pinnableItems(campaign: Campaign): readonly PinnableItem[] {
  const home = campaign.founding.nation;
  const conditions = Object.keys(campaign.conditions)
    .sort()
    .map((id) => campaign.conditions[id]!)
    .filter((record) => record.status === "active")
    .map((record): PinnableItem => ({ kind: "condition", record }));
  const emergencies = Object.keys(campaign.emergencies)
    .sort()
    .map((id) => campaign.emergencies[id]!)
    .filter(isStanding)
    .map((record): PinnableItem => ({ kind: "emergency", nation: home, record }));
  const orders = [...campaign.orders]
    .filter((record) => record.subject?.kind === "state" || record.subject?.kind === "foreign")
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((record): PinnableItem => ({ kind: "order", nation: home, record }));
  const held = STATE_IDS.flatMap((state): PinnableItem[] => {
    const runtime = campaign.states[state];
    if (!runtime) return [];
    return [
      ...runtime.marks.map((record): PinnableItem => ({ kind: "mark", nation: home, state, record })),
      ...runtime.claims.map((record): PinnableItem => ({ kind: "claim", nation: home, state, record })),
    ];
  });
  return [...conditions, ...emergencies, ...orders, ...held];
}
