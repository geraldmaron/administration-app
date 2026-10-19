import type { Campaign } from "@admin/engine";
import { nationOfZone, type NationId } from "@admin/world";
import { placeForces, type ForcePlacement } from "../geo/force-placement";

// Where the President's own forces stand abroad, by the government that hosts
// them. Placement is derived and seeded, so none of this is stored.

/** US personnel by host government, sea zones left to the force marks. */
export function forcesByHost(campaign: Campaign): ReadonlyMap<string, number> {
  const home = campaign.founding.nation;
  return placeForces(campaign)
    .filter((placement) => placement.actor === home)
    .reduce((totals, placement) => {
      const host = nationOfZone(placement.zone);
      return host && host !== home ? totals.set(host, (totals.get(host) ?? 0) + placement.personnel) : totals;
    }, new Map<string, number>());
}

/** The US placements inside one host government, installations first. */
export function usForcesIn(campaign: Campaign, nation: NationId): readonly ForcePlacement[] {
  const home = campaign.founding.nation;
  return placeForces(campaign)
    .filter((placement) => placement.actor === home && nationOfZone(placement.zone) === nation)
    .sort((a, b) => (a.precision === b.precision ? b.personnel - a.personnel : a.precision === "installation" ? -1 : 1) || a.id.localeCompare(b.id));
}
