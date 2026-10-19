import { commandDef, selectNation, type Campaign } from "@admin/engine";
import type { LonLat, NationId } from "@admin/world";
import type { ForcePlacement, ForcePrecision } from "./force-placement.js";

// The forces on the board at three distances. Far out, the administration's
// forces are one marker per combatant command and a foreign government's are
// one marker for the government; at the scale of a region, one per zone; up
// close, one per placement. A cluster is framed by clicking it, so it carries
// the members it would open on.

export type ForceZoom = "world" | "region" | "close";

export type ForceCluster = {
  readonly key: string;
  readonly zoom: ForceZoom;
  readonly label: string;
  readonly point: LonLat;
  /** The commitments inside, in id order. */
  readonly members: readonly string[];
  readonly personnel: number;
  /** Exact only for a single sourced installation seen up close. */
  readonly precision: ForcePrecision;
  readonly actor: NationId;
};

function groupKey(campaign: Campaign, placement: ForcePlacement, zoom: ForceZoom): string {
  if (zoom === "close") return `close:${placement.id}`;
  if (zoom === "region") return `region:${placement.actor}:${placement.zone}`;
  const ours = placement.actor === campaign.founding.nation;
  return ours && placement.command ? `world:command:${placement.command}` : `world:${placement.actor}:${ours ? placement.zone : "abroad"}`;
}

function groupLabel(campaign: Campaign, members: readonly ForcePlacement[], zoom: ForceZoom): string {
  const first = members[0]!;
  if (zoom === "close") return first.label;
  if (zoom === "region") return first.zoneName;
  const ours = first.actor === campaign.founding.nation;
  if (ours && first.command) return commandDef(first.command)?.abbr ?? first.command;
  return ours ? first.zoneName : (selectNation(campaign, first.actor)?.base.identity.name ?? (first.actor as string));
}

/** Weighted by personnel where the members carry any, so a marker sits over the bulk of the force rather than the middle of its map. */
function centroid(members: readonly ForcePlacement[]): LonLat {
  const total = members.reduce((sum, member) => sum + member.personnel, 0);
  const weight = (member: ForcePlacement) => (total > 0 ? member.personnel / total : 1 / members.length);
  const lon = members.reduce((sum, member) => sum + member.point[0] * weight(member), 0);
  const lat = members.reduce((sum, member) => sum + member.point[1] * weight(member), 0);
  return [Math.round(lon * 10_000) / 10_000, Math.round(lat * 10_000) / 10_000];
}

export function clusterForces(campaign: Campaign, placements: readonly ForcePlacement[], zoom: ForceZoom): readonly ForceCluster[] {
  const groups = placements.reduce((map, placement) => {
    const key = groupKey(campaign, placement, zoom);
    return map.set(key, [...(map.get(key) ?? []), placement]);
  }, new Map<string, readonly ForcePlacement[]>());
  return [...groups.entries()]
    .map(([key, members]) => ({
      key,
      zoom,
      label: groupLabel(campaign, members, zoom),
      point: centroid(members),
      members: members.map((member) => member.id).sort(),
      personnel: Math.round(members.reduce((sum, member) => sum + member.personnel, 0)),
      precision: zoom === "close" ? members[0]!.precision : ("zone" as const),
      actor: members[0]!.actor,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}
