import {
  BOARD_DEPLOYMENTS,
  COMBATANT_COMMANDS,
  commandFor,
  deploymentLocation,
  hashIndex,
  nationsInAor,
  selectNation,
  type Campaign,
  type CombatantCommandId,
  type Commitment,
} from "@admin/engine";
import {
  BASING_COUNTRY_TOTAL,
  MARITIME_ZONES,
  US_BASING,
  forceAssetFor,
  maritimeZone,
  nationOfZone,
  type LonLat,
  type NationId,
  type UsBasingRow,
  type ZoneId,
} from "@admin/world";
import { zoneSlots } from "./zone-slots.js";

// Where the forces on the board stand, derived every time it is read and
// never stored. Three tiers: a combatant command's area (the countries the
// Unified Command Plan gives it today, amendments included, and the seas most
// of whose coast it holds); a zone (a government's territory or a sea); and an
// anchor (a sourced installation point).
//
// The honesty rule: only a sourced anchor draws as an exact installation.
// Anything else (a rotation, a deployment, a joiner's forces) takes a seeded
// slot in its zone and is labeled with the zone, never with a site.

export type CommandArea = {
  readonly command: CombatantCommandId;
  readonly nations: readonly NationId[];
  readonly seas: readonly ZoneId[];
};

/**
 * The command that holds a sea: the one holding most of its littoral on this
 * campaign's map, the principal littoral breaking a tie. Undefined when no
 * littoral government is on the roster.
 */
export function seaCommand(campaign: Campaign, sea: ZoneId | string): CombatantCommandId | undefined {
  const zone = maritimeZone(sea);
  if (!zone) return undefined;
  const commands = zone.littoral
    .filter((nation) => campaign.nations[nation] !== undefined)
    .map((nation) => commandFor(campaign, nation))
    .filter((command): command is CombatantCommandId => command !== undefined);
  const counts = commands.reduce((tally, command) => tally.set(command, (tally.get(command) ?? 0) + 1), new Map<CombatantCommandId, number>());
  const most = Math.max(0, ...counts.values());
  return commands.find((command) => counts.get(command) === most);
}

/** The command whose area a zone falls in, read live. */
export function zoneCommand(campaign: Campaign, zone: ZoneId | string): CombatantCommandId | undefined {
  const nation = nationOfZone(zone);
  return nation ? commandFor(campaign, nation) : seaCommand(campaign, zone);
}

/**
 * Every command that has an area, in the catalog's order. A functional command
 * (strategic, special operations, transportation, cyber) never has one, and a
 * geographic command nothing on the map is assigned to (space) has none
 * either: those are cards, never regions.
 */
export function commandAreas(campaign: Campaign): readonly CommandArea[] {
  return COMBATANT_COMMANDS.filter((def) => def.type === "geographic").flatMap((def) => {
    const nations = nationsInAor(campaign, def.id);
    const seas = MARITIME_ZONES.filter((zone) => seaCommand(campaign, zone.id) === def.id).map((zone) => zone.id);
    return nations.length + seas.length > 0 ? [{ command: def.id, nations, seas }] : [];
  });
}

export type ForcePrecision = "installation" | "zone";

export type ForcePlacement = {
  /** The commitment the forces are, so a marker opens the same record the ledger does. */
  readonly id: string;
  readonly actor: NationId;
  readonly kind: "basing" | "deployment";
  readonly zone: ZoneId;
  readonly zoneName: string;
  readonly command?: CombatantCommandId;
  readonly precision: ForcePrecision;
  readonly point: LonLat;
  /** The installation's name where the anchor is sourced; the zone's otherwise. */
  readonly label: string;
  readonly service?: string;
  readonly personnelBand?: string;
  /** A rough head count for sizing a marker, never shown as a figure. Zero where nothing gives one. */
  readonly personnel: number;
  /** Where the point came from: the opened record behind an anchor, or how the zone was drawn. */
  readonly source: string;
};

type Resolved = {
  readonly zone: ZoneId;
  readonly row?: UsBasingRow;
  readonly band?: string;
  readonly service?: string;
};

function basingRow(commitment: Commitment): UsBasingRow | undefined {
  const base = commitment.location?.base;
  if (!base) return undefined;
  return US_BASING.find((row) => row.country === commitment.target.id && row.base === base && row.base !== BASING_COUNTRY_TOTAL);
}

/**
 * Where a commitment stands: its basing row, else its stored zone, else the
 * zone the engine would write for it today. A base whose label is not on the
 * table stands in its host.
 */
function resolveZone(campaign: Campaign, commitment: Commitment): Resolved | undefined {
  const row = basingRow(commitment);
  if (row) return { zone: row.country as ZoneId, row, band: row.personnelBand, service: row.service };
  const theater = commitment.location?.theater ?? deploymentLocation(campaign, commitment.kind, commitment.actor, commitment.target)?.theater;
  if (theater) {
    const posture = BOARD_DEPLOYMENTS.find((entry) => entry.country === commitment.target.id && entry.theater === theater);
    return { zone: theater, ...(posture ? { band: posture.personnelBand, service: posture.service } : {}) };
  }
  const host = commitment.kind === "basing" ? nationOfZone(commitment.target.id) : undefined;
  return host && campaign.nations[host] ? { zone: commitment.target.id as ZoneId } : undefined;
}

function zoneName(campaign: Campaign, zone: ZoneId): string {
  const nation = nationOfZone(zone);
  return maritimeZone(zone)?.name ?? (nation ? selectNation(campaign, nation)?.base.identity.name : undefined) ?? (zone as string);
}

function zoneSource(zone: ZoneId): string {
  const sea = maritimeZone(zone);
  return sea ? `${sea.name}: ${sea.provenance}` : "a made-up spot inside the host country, not a real place";
}

/** A band's rough midpoint, for sizing only: "A to B" gives the middle, "under N" half of N, anything else nothing. */
export function bandMidpoint(band: string | undefined): number | undefined {
  if (!band) return undefined;
  const range = /([\d,]+)\s+to\s+([\d,]+)/.exec(band);
  if (range) return (Number(range[1]!.replace(/,/g, "")) + Number(range[2]!.replace(/,/g, ""))) / 2;
  const under = /under\s+([\d,]+)/.exec(band);
  return under ? Number(under[1]!.replace(/,/g, "")) / 2 : undefined;
}

function sourcePersonnel(commitment: Commitment): number {
  const source = commitment.source;
  return source.kind === "orderOfBattle" ? source.count * forceAssetFor(source.unitType).nominalPersonnel : 0;
}

const forceCommitments = (campaign: Campaign): readonly Commitment[] =>
  Object.values(campaign.commitments)
    .filter((commitment) => commitment.status === "active" && (commitment.kind === "basing" || commitment.kind === "deployment"))
    .sort((a, b) => a.id.localeCompare(b.id));

/**
 * The personnel a placement sizes by. An installation whose band is "in the
 * country total" takes an even share of its host's total, so the host's
 * markers add up to the total rather than to nothing.
 */
function sharedPersonnel(placed: readonly { readonly commitment: Commitment; readonly resolved: Resolved }[]): (entry: (typeof placed)[number]) => number {
  const inTotal = new Map<string, number>();
  for (const { resolved } of placed) {
    if (resolved.row?.personnelBand === "in the country total") inTotal.set(resolved.row.country, (inTotal.get(resolved.row.country) ?? 0) + 1);
  }
  return ({ commitment, resolved }) => {
    const host = resolved.row?.country;
    if (host && resolved.band === "in the country total") {
      const total = bandMidpoint(US_BASING.find((row) => row.country === host && row.base === BASING_COUNTRY_TOTAL)?.personnelBand) ?? 0;
      return total / (inTotal.get(host) ?? 1);
    }
    return bandMidpoint(resolved.band) ?? sourcePersonnel(commitment);
  };
}

function anchorPoint(row: UsBasingRow | undefined): LonLat | undefined {
  return row?.anchor === "sourced" && row.lat !== undefined && row.lon !== undefined ? [row.lon, row.lat] : undefined;
}

/**
 * Every force on the board with a place to stand: installations at their
 * sourced points, everything else on a seeded slot in its zone. A slot is the
 * hash of the campaign seed and the commitment id, stepped past slots an
 * earlier unit in the same zone already holds, so two units share a spot only
 * when the zone has run out of them.
 */
export function placeForces(campaign: Campaign): readonly ForcePlacement[] {
  const placed = forceCommitments(campaign).flatMap((commitment) => {
    const resolved = resolveZone(campaign, commitment);
    return resolved ? [{ commitment, resolved }] : [];
  });
  const personnelOf = sharedPersonnel(placed);
  const taken = new Map<string, Set<number>>();
  return placed.flatMap((entry): ForcePlacement[] => {
    const { commitment, resolved } = entry;
    const anchor = anchorPoint(resolved.row);
    const point = anchor ?? slotFor(campaign, commitment, resolved.zone, taken);
    if (!point) return [];
    const name = zoneName(campaign, resolved.zone);
    const command = zoneCommand(campaign, resolved.zone);
    return [
      {
        id: commitment.id,
        actor: commitment.actor,
        kind: commitment.kind as ForcePlacement["kind"],
        zone: resolved.zone,
        zoneName: name,
        ...(command ? { command } : {}),
        precision: anchor ? "installation" : "zone",
        point,
        label: anchor ? resolved.row!.base : name,
        ...(resolved.service ? { service: resolved.service } : {}),
        ...(resolved.band ? { personnelBand: resolved.band } : {}),
        personnel: personnelOf(entry),
        source: anchor ? `${resolved.row!.anchorSource}, opened ${resolved.row!.anchorOpened}` : zoneSource(resolved.zone),
      },
    ];
  });
}

function slotFor(campaign: Campaign, commitment: Commitment, zone: ZoneId, taken: Map<string, Set<number>>): LonLat | undefined {
  const nation = nationOfZone(zone);
  const geo = nation ? selectNation(campaign, nation)?.base.geo : undefined;
  const slots = zoneSlots(zone, geo ? [geo.lon, geo.lat] : undefined);
  if (slots.length === 0) return undefined;
  const used = taken.get(zone) ?? new Set<number>();
  const start = hashIndex(`${campaign.seed}:${commitment.id}`, slots.length);
  const free = Array.from({ length: slots.length }, (_, step) => (start + step) % slots.length).find((index) => !used.has(index));
  const index = free ?? start;
  taken.set(zone, new Set([...used, index]));
  return slots[index];
}
