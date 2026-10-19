import {
  COMBATANT_COMMANDS,
  commandChain,
  commandDef,
  assignedFormations,
  commandEngagement,
  describeCommitment,
  effectivePosture,
  selectNation,
  type Campaign,
  type CombatantCommandId,
  type CommandPosture,
} from "@admin/engine";
import type { ForceAssetId, MilitaryBranch, NationId } from "@admin/world";
import { commandAreas, placeForces, type ForcePlacement, type ForcePrecision } from "../geo/force-placement.js";
import { formatDate } from "../format/figures.js";
import { place } from "../navigation/places.js";

// The eleven combatant commands as the President reads them: a card each on
// the security board, and a file each for the command screen. A geographic
// command has an area derived live from the Unified Command Plan, amendments
// included; a functional command has none and is only ever a card. No force
// position here is stored: every one comes from `placeForces`.

export type CommandCommander = { readonly name: string; readonly service: string; readonly acting: boolean };

export type CommandCard = {
  readonly id: CombatantCommandId;
  readonly abbr: string;
  readonly name: string;
  /** The command holds a map: countries or seas assigned to it. A functional command, and a geographic one nothing is assigned to, is a card only. */
  readonly hasArea: boolean;
  readonly mission: string;
  readonly commander?: CommandCommander;
  readonly ordered: CommandPosture;
  /** What the theater stands at: never below heightened while it is engaged. */
  readonly effective: CommandPosture;
  readonly engaged: boolean;
  /** Places the command holds forces: installations and zones. */
  readonly places: number;
  /** The command's forces abroad against the largest command's, 0..1, never a head count. */
  readonly weight: number;
  /** How well an order would carry out through this command's chain, 0..1. */
  readonly chain: number;
  /** Each service's share of its formations assigned here, 0..1, services with none left out. */
  readonly assignment: readonly CommandBranchShare[];
  /** Formations assigned across the services (the national bench times each share, rounded down). */
  readonly formations: number;
  /** How many governments the theater is engaged against or has forces committed toward. */
  readonly engagedWith: { readonly against: number; readonly toward: number };
  readonly href: string;
};

const SERVICE_NAMES: Readonly<Record<MilitaryBranch, string>> = {
  army: "Army",
  navy: "Navy",
  air: "Air Force",
  marines: "Marine Corps",
  space: "Space Force",
  cyber: "Cyber",
};

export const BRANCH_ORDER: readonly MilitaryBranch[] = ["army", "navy", "air", "marines", "space", "cyber"];

export const branchName = (branch: MilitaryBranch): string => SERVICE_NAMES[branch];

export const POSTURE_WORDS: Readonly<Record<CommandPosture, string>> = { routine: "Routine", heightened: "Heightened", surge: "Surge" };

function personnelBy(placements: readonly ForcePlacement[]): ReadonlyMap<CombatantCommandId, number> {
  return placements.reduce((tally, placement) => (placement.command ? tally.set(placement.command, (tally.get(placement.command) ?? 0) + placement.personnel) : tally), new Map<CombatantCommandId, number>());
}

const assignmentOf = (shares: Readonly<Record<MilitaryBranch, number>>): readonly CommandBranchShare[] =>
  BRANCH_ORDER.map((branch) => ({ branch, label: SERVICE_NAMES[branch], share: shares[branch] })).filter((row) => row.share > 0);

function cardFor(campaign: Campaign, id: CombatantCommandId, areas: ReadonlySet<CombatantCommandId>, placements: readonly ForcePlacement[], heaviest: number, personnel: number): CommandCard | undefined {
  const def = commandDef(id);
  const runtime = campaign.security.unifiedCommand.commands[id];
  if (!def || !runtime) return undefined;
  const commander = runtime.commander;
  const engagement = commandEngagement(campaign, id);
  return {
    id,
    abbr: def.abbr,
    name: def.name,
    hasArea: areas.has(id),
    mission: def.mission,
    ...(commander ? { commander: { name: commander.name, service: SERVICE_NAMES[commander.service], acting: commander.acting === true } } : {}),
    ordered: runtime.posture,
    effective: effectivePosture(campaign, id),
    engaged: engagement !== undefined,
    places: placements.filter((placement) => placement.command === id).length,
    weight: heaviest > 0 ? personnel / heaviest : 0,
    chain: commandChain(campaign, id).execution,
    assignment: assignmentOf(runtime.assignment),
    formations: BRANCH_ORDER.reduce((sum, branch) => sum + (assignedFormations(campaign, id, branch) ?? 0), 0),
    engagedWith: { against: engagement?.against.length ?? 0, toward: engagement?.toward.length ?? 0 },
    href: place.command(id),
  };
}

/** Every combatant command in the catalog's order, geographic first. */
export function commandCards(campaign: Campaign): readonly CommandCard[] {
  const placements = placeForces(campaign);
  const personnel = personnelBy(placements);
  const heaviest = Math.max(0, ...personnel.values());
  const areas = new Set(commandAreas(campaign).map((area) => area.command));
  return COMBATANT_COMMANDS.flatMap((def) => {
    const card = cardFor(campaign, def.id, areas, placements, heaviest, personnel.get(def.id) ?? 0);
    return card ? [card] : [];
  });
}

/** The countries a geographic command holds today and the seas most of whose coast it holds. */
function areaOf(campaign: Campaign, id: CombatantCommandId): { readonly nations: readonly NationId[]; readonly seas: readonly string[] } {
  const area = commandAreas(campaign).find((entry) => entry.command === id);
  return { nations: area?.nations ?? [], seas: area?.seas ?? [] };
}

/** The map key that frames a command's area: its countries and seas as one set. A functional command has none, so the world. */
export function commandCamera(campaign: Campaign, id: CombatantCommandId): string {
  const { nations, seas } = areaOf(campaign, id);
  const members = [...nations.map((nation) => `nation:${nation as string}`), ...seas.map((sea) => `zone:${sea}`)];
  return members.length > 0 ? `set:${members.join("|")}` : "world";
}

/** The countries a command's area lights on the map, as a selection; a sea is not a region the map selects. */
export function commandSelection(campaign: Campaign, id: CombatantCommandId): string | undefined {
  const { nations } = areaOf(campaign, id);
  return nations.length > 0 ? nations.map((nation) => `nation:${nation as string}`).join("|") : undefined;
}

export type CommandForceRow = {
  readonly id: string;
  /** The installation's name where its anchor is sourced; otherwise the zone. */
  readonly label: string;
  readonly precision: ForcePrecision;
  readonly what: string;
  /** The force the row holds where it is a commitment of a counted asset. */
  readonly asset?: { readonly unitType: ForceAssetId; readonly count: number };
  readonly service?: string;
  readonly band?: string;
};

export type CommandZoneForces = { readonly zone: string; readonly name: string; readonly rows: readonly CommandForceRow[] };

export type CommandBranchShare = { readonly branch: MilitaryBranch; readonly label: string; readonly share: number };

export type CommandAmendmentRow = { readonly nation: string; readonly from: string; readonly to: string; readonly date: string; readonly rationale: string };

export type CommandFile = {
  readonly card: CommandCard;
  readonly headquarters: string;
  readonly missions: readonly string[];
  readonly reliefs: number;
  /** Where the chain of command bends on the way to this theater, in words. */
  readonly chainBreaks: readonly string[];
  /** The governments the theater is engaged against or has forces committed toward. */
  readonly engagedAgainst: readonly string[];
  readonly engagedToward: readonly string[];
  readonly assignment: readonly CommandBranchShare[];
  readonly zones: readonly CommandZoneForces[];
  readonly nations: readonly { readonly id: NationId; readonly name: string }[];
  readonly amendments: readonly CommandAmendmentRow[];
  readonly camera: string;
  readonly selection?: string;
};

const nameOf = (campaign: Campaign, id: NationId): string => selectNation(campaign, id)?.base.identity.name ?? (id as string);

function zonesOf(campaign: Campaign, id: CombatantCommandId): readonly CommandZoneForces[] {
  const mine = placeForces(campaign).filter((placement) => placement.command === id);
  const zones = mine.reduce((map, placement) => map.set(placement.zone as string, [...(map.get(placement.zone as string) ?? []), placement]), new Map<string, readonly ForcePlacement[]>());
  return [...zones.entries()]
    .map(([zone, members]) => ({
      zone,
      name: members[0]!.zoneName,
      rows: members.map((member): CommandForceRow => {
        const commitment = campaign.commitments[member.id];
        return {
          id: member.id,
          label: member.label,
          precision: member.precision,
          what: commitment ? describeCommitment(commitment, campaign) : member.label,
          ...(commitment?.source.kind === "orderOfBattle" ? { asset: { unitType: commitment.source.unitType, count: commitment.source.count } } : {}),
          ...(member.service ? { service: member.service } : {}),
          ...(member.personnelBand ? { band: member.personnelBand === "in the country total" ? "counted in the host country's total" : member.personnelBand } : {}),
        };
      }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function amendmentsOf(campaign: Campaign, id: CombatantCommandId): readonly CommandAmendmentRow[] {
  const abbr = (command: CombatantCommandId) => commandDef(command)?.abbr ?? command;
  return campaign.security.unifiedCommand.amendments
    .filter((amendment) => amendment.from === id || amendment.to === id)
    .map((amendment) => ({
      nation: nameOf(campaign, amendment.nation),
      from: abbr(amendment.from),
      to: abbr(amendment.to),
      date: formatDate(amendment.date),
      rationale: amendment.rationale,
    }));
}

/** One command's file, or undefined for an id the catalog does not list. */
export function commandFile(campaign: Campaign, id: string): CommandFile | undefined {
  const card = commandCards(campaign).find((entry) => entry.id === id);
  const def = card ? commandDef(card.id) : undefined;
  const runtime = card ? campaign.security.unifiedCommand.commands[card.id] : undefined;
  if (!card || !def || !runtime) return undefined;
  const engagement = commandEngagement(campaign, card.id);
  const selection = commandSelection(campaign, card.id);
  return {
    card,
    headquarters: def.headquarters,
    missions: runtime.missions,
    reliefs: runtime.reliefs,
    chainBreaks: commandChain(campaign, card.id).breaks.map((link) => link.reason),
    engagedAgainst: (engagement?.against ?? []).map((nation) => nameOf(campaign, nation)),
    engagedToward: (engagement?.toward ?? []).map((nation) => nameOf(campaign, nation)),
    assignment: card.assignment,
    zones: zonesOf(campaign, card.id),
    nations: areaOf(campaign, card.id).nations.map((nation) => ({ id: nation, name: nameOf(campaign, nation) })).sort((a, b) => a.name.localeCompare(b.name)),
    amendments: amendmentsOf(campaign, card.id),
    camera: commandCamera(campaign, card.id),
    ...(selection ? { selection } : {}),
  };
}
