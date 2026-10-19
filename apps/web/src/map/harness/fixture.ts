import { makeCampaignSeed, sealFounding, type Campaign, type DeclaredEmergency, type GrievanceMark, type NationCondition } from "@admin/engine";
import { foundingOptions, openingChoices } from "@admin/player-core";
import { worldDataset, type NationId, type StateId } from "@admin/world";

/** A sealed opening campaign: the founding screen's own path on the real dataset. */
export function openingHarnessCampaign(seedText = "map-harness"): Campaign {
  const seed = makeCampaignSeed(seedText);
  const choices = openingChoices(foundingOptions(seed));
  return sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Harness President" } });
}

function condition(id: string, kind: NationCondition["kind"], state: StateId, severity: number): NationCondition {
  return { id, nation: "USA" as NationId, kind, scope: "region", severity, startedTurn: 0, status: "active", beats: [], state };
}

function emergency(id: string, state: StateId): DeclaredEmergency {
  return { id, scope: { kind: "state", state }, cause: "flood", declaredTurn: 0, renewedTurn: 0, reason: "Staged in the harness" };
}

const MARK: GrievanceMark = { turn: 0, signature: "aid-withheld", weight: 0.5, valence: -1, decayRate: 0.05, reason: "Disaster aid was withheld." };

/**
 * The opening campaign with staged incidents, so the pins have something to
 * cluster: a run of Northeast states close enough to merge at country zoom,
 * and a few spread across the map. An opening campaign has no running
 * incidents of its own; the staging is labeled in the harness controls.
 */
export function stagedHarnessCampaign(): Campaign {
  const base = openingHarnessCampaign();
  const northeast: readonly StateId[] = ["NY", "NJ", "PA", "CT", "MA", "RI"];
  const spread: readonly [StateId, NationCondition["kind"]][] = [["CA", "wildfire"], ["TX", "drought"], ["FL", "cyclone"], ["MO", "tornado"], ["WA", "earthquake"]];
  const conditions = Object.fromEntries([
    ...northeast.map((state, i) => [`staged-ne-${state}`, condition(`staged-ne-${state}`, "flood", state, 0.3 + i * 0.1)] as const),
    ...spread.map(([state, kind]) => [`staged-${state}`, condition(`staged-${state}`, kind, state, 0.6)] as const),
  ]);
  const states = { ...base.states, OH: { ...base.states.OH!, marks: [MARK] } };
  return { ...base, conditions: { ...base.conditions, ...conditions }, emergencies: { ...base.emergencies, "staged-em-LA": emergency("staged-em-LA", "LA") }, states };
}
