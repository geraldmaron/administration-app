import { FORCE_ASSETS, US_HULLS, forceAssetPersonnel, type ForceAssetId, type NationId } from "@admin/world";
import type { Effect } from "./effect-types.js";
import { answersWithForce } from "./force-failure.js";
import type { RngStreams } from "./rng.js";
import { selectNation, type Campaign, type CasualtiesBySide, type Commitment, type Conflict, type ConflictSide } from "./state.js";
import { sideOf } from "./conflicts.js";

// The President's hulls lost in a war, by name and class. A hull is lost to
// the fleet when it is sunk or put out of the war; it leaves the order of
// battle and the deployment that sent it, its dead go through the war's
// casualty count like any other American killed, and the crew is never named.
//
// Only the President's government loses hulls by name: the register of names
// is the Naval Vessel Register's, and no other navy in the dataset is listed
// hull by hull.

/**
 * Chance a week that one exposed hull is lost, at full intensity, against an
 * enemy that can fire on ships. From the Navy's account of Desert Storm: two
 * warships (Tripoli and Princeton) put out of action by mines inside about six
 * weeks with about 115 US warships in theater, 2 / (6 × 115) ≈ 0.003 (Navy
 * report "USN in Desert Shield, Desert Storm", gulflink.health.mil/histories/
 * db/navy/usnavy_053.html and usnavy_056.html, opened 2026-10-13). Earnest
 * Will reads lower, one hit in about 61 weeks with 12 to 30 ships, which fits a
 * cooler war. The hottest war in the series is read as full intensity.
 */
export const HULL_LOSS_PER_WEEK = 0.003;

/**
 * Planning value: the share of a lost hull's crew killed. The surface
 * combatants sunk in 1982 lost 7 to 12 percent of their crews (Sheffield 20
 * of 281, Coventry 19 of 287, Ardent 22 of 177; secondary counts, opened
 * 2026-10-13), and Stark, hit and saved in 1987, lost 37 (Navy report,
 * usnavy_018.html). A crew of the catalog's size times this share.
 */
export const LOST_CREW_KILLED = 0.1;

export type HullLoss = {
  readonly id: string;
  readonly nation: NationId;
  readonly unitType: ForceAssetId;
  /** The hull number and name, where the register still has an unlost name in the class. */
  readonly hull?: string;
  readonly name?: string;
  readonly conflictId: string;
  readonly turn: number;
  readonly killed: number;
};

export type HullLossEffect = { readonly kind: "hullLoss"; readonly set: HullLoss };

export function applyHullLoss(campaign: Campaign, effect: HullLossEffect): Campaign {
  return { ...campaign, hullLosses: [...(campaign.hullLosses ?? []), effect.set] };
}

/** Every hull lost so far, oldest first; absent on older saves, which read as none. */
export function selectHullLosses(campaign: Campaign): readonly HullLoss[] {
  return campaign.hullLosses ?? [];
}

/** A register name as a sentence reads it: "JOHN S MCCAIN" is "John S. McCain". */
export function hullDisplayName(name: string): string {
  return name
    .split(" ")
    .map((word) => {
      if (word.length === 1) return `${word}.`;
      if (word === "JR" || word === "ST") return `${word[0]}${word.slice(1).toLowerCase()}.`;
      if (word.startsWith("MC") && word.length > 2) return `Mc${word[2]}${word.slice(3).toLowerCase()}`;
      return `${word[0]}${word.slice(1).toLowerCase()}`;
    })
    .join(" ");
}

/** The President's naval formations in this war: deployments of hulls toward the enemy or the war itself. */
function exposedCommitments(campaign: Campaign, conflict: Conflict, enemy: NationId): readonly Commitment[] {
  const us = campaign.founding.nation;
  return Object.values(campaign.commitments)
    .filter((commitment) => commitment.actor === us && commitment.status === "active")
    .filter((commitment) => commitment.target.id === (enemy as string) || commitment.target.id === conflict.id)
    .filter((commitment) => commitment.source.kind === "orderOfBattle" && commitment.source.branch === "navy" && commitment.source.count > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function hullsIn(commitment: Commitment): number {
  return commitment.source.kind === "orderOfBattle" ? commitment.source.count : 0;
}

/** The commitment the lost hull came from, weighted by how many hulls each holds. */
function pickCommitment(commitments: readonly Commitment[], draw: number): Commitment {
  const total = commitments.reduce((sum, commitment) => sum + hullsIn(commitment), 0);
  let mark = draw * total;
  for (const commitment of commitments) {
    mark -= hullsIn(commitment);
    if (mark < 0) return commitment;
  }
  return commitments[commitments.length - 1]!;
}

/** The register's next name for the class, drawn among the hulls of the class not yet lost. */
function pickHull(campaign: Campaign, unitType: string, draw: number): { readonly hull: string; readonly name: string } | undefined {
  const lost = new Set(selectHullLosses(campaign).map((loss) => loss.hull));
  const left = US_HULLS.filter((row) => row.unitType === unitType && !lost.has(row.hull));
  const row = left[Math.min(left.length - 1, Math.floor(draw * left.length))];
  return row ? { hull: row.hull, name: row.name } : undefined;
}

/** The order of battle with one hull of the class gone. */
function fleetLess(campaign: Campaign, nation: NationId, unitType: ForceAssetId): Effect | undefined {
  const navy = selectNation(campaign, nation)?.stats.military.orderOfBattle?.navy;
  if (!navy?.units) return undefined;
  const units = navy.units.map((unit) => (unit.type === unitType ? { ...unit, count: Math.max(0, unit.count - 1) } : unit));
  return { kind: "nationStat", nation, setStats: { military: { orderOfBattle: { navy: { units } } } } };
}

/** The deployment one hull lighter, wound down if it was the last. */
function deploymentLess(campaign: Campaign, commitment: Commitment): Effect {
  if (commitment.source.kind !== "orderOfBattle") return { kind: "commitment", set: commitment };
  const count = commitment.source.count - 1;
  const source = { ...commitment.source, count };
  return {
    kind: "commitment",
    set: count > 0 ? { ...commitment, source } : { ...commitment, source, status: "wound-down", endedTurn: campaign.turn },
  };
}

export type HullWeek = { readonly effects: readonly Effect[]; readonly side?: ConflictSide; readonly killed: number };

const NONE: HullWeek = { effects: [], killed: 0 };

/** What the register's hull prefix calls the ship, from its classification titles. */
const HULL_KIND: Readonly<Record<string, string>> = {
  CVN: "aircraft carrier",
  CG: "guided missile cruiser",
  DDG: "guided missile destroyer",
  LHA: "amphibious assault ship",
  LHD: "amphibious assault ship",
  LPD: "amphibious transport dock",
  LSD: "dock landing ship",
  SSN: "attack submarine",
};

function lossHeadline(campaign: Campaign, loss: HullLoss, enemy: NationId): string {
  const kind = (loss.hull && HULL_KIND[loss.hull.split(" ")[0]!]) ?? FORCE_ASSETS[loss.unitType].singular.replace(/^an? /, "");
  const ship = loss.name && loss.hull ? `the ${kind} USS ${hullDisplayName(loss.name)} (${loss.hull})` : `a US ${kind}`;
  const enemyName = selectNation(campaign, enemy)?.base.identity.name ?? (enemy as string);
  return `${ship.charAt(0).toUpperCase()}${ship.slice(1)} is lost in the war with ${enemyName}; ${loss.killed} of the crew are killed.`;
}

/**
 * Whether the war costs the President a hull this week, and what the loss
 * writes. At most one hull a war a week, decided on a stream of its own so no
 * draw the war's week already makes moves.
 */
export function hullLossThisWeek(campaign: Campaign, conflict: Conflict, streams: RngStreams): HullWeek {
  const us = campaign.founding.nation;
  const side = sideOf(conflict, us);
  if (!side) return NONE;
  const enemy = side === "aggressor" ? conflict.defender : conflict.aggressor;
  if (!answersWithForce(campaign, enemy)) return NONE;
  const commitments = exposedCommitments(campaign, conflict, enemy);
  const exposed = commitments.reduce((sum, commitment) => sum + hullsIn(commitment), 0);
  if (exposed === 0) return NONE;
  const stream = streams.stream("hull-loss", conflict.id, campaign.turn);
  const chance = 1 - (1 - HULL_LOSS_PER_WEEK * conflict.intensity) ** exposed;
  if (stream.next() >= chance) return NONE;
  const from = pickCommitment(commitments, stream.next());
  const unitType = (from.source.kind === "orderOfBattle" ? from.source.unitType : "navy.surface-combatant") as ForceAssetId;
  const named = pickHull(campaign, unitType, stream.next());
  const killed = Math.round(forceAssetPersonnel(unitType, 1) * LOST_CREW_KILLED);
  const loss: HullLoss = { id: `hull-loss:${conflict.id}:${campaign.turn}`, nation: us, unitType, ...named, conflictId: conflict.id, turn: campaign.turn, killed };
  const fleet = fleetLess(campaign, us, unitType);
  const effects: Effect[] = [
    { kind: "hullLoss", set: loss },
    deploymentLess(campaign, from),
    ...(fleet ? [fleet] : []),
    ...(killed > 0 ? [{ kind: "populationToll" as const, nation: us, deaths: killed }] : []),
    { kind: "feed", items: [{ turn: campaign.turn + 1, kind: "conflict", visibility: "public", headline: lossHeadline(campaign, loss, enemy), actor: conflict.aggressor, target: conflict.defender }] },
  ];
  return { effects, side, killed };
}

/** The war's loss bands with a lost crew's dead added to the President's side, counted as its own are. */
export function withHullDeaths(casualties: CasualtiesBySide, week: HullWeek): CasualtiesBySide {
  if (!week.side || week.killed <= 0) return casualties;
  const band = casualties[week.side];
  if (!band) return casualties;
  const killed = { low: band.killed.low + week.killed, high: band.killed.high + week.killed };
  return { ...casualties, [week.side]: { ...band, killed } };
}
