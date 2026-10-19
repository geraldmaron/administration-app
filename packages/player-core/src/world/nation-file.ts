import { commitmentsToward, selectActiveConflicts, selectRelationshipsFrom, sideOf, type Campaign, type Commitment } from "@admin/engine";
import { worldDataset, type NationId } from "@admin/world";
import { stanceForDisposition } from "../format/figures";
import { foreignCoverageReading, type ForeignCoverageView } from "../press/foreign-coverage";
import { recentMoves, type RecentMove } from "../reasons/recent-moves";
import type { Stance } from "../reading";
import { place } from "../navigation/places";
import { envoyReading, rapportLine, type EnvoyReading } from "./engagement";
import { figureProvenance } from "./figure-provenance";
import { inOfficeSince, nextSelectionWords, worldLeaderRows, type WorldLeaderRow } from "./leaders";
import { nationForces, type NationForcesReading } from "./nation-forces";
import { nationPosture, type NationPosture } from "./nation-posture";
import { nationPower, type NationPower } from "./nation-power";
import { nationProgram, type NationProgram } from "./nation-program";
import { nationVitals, type NationVital } from "./nation-vitals";
import { boardStance, standingToward, type Standing } from "./standing";
import { thirdPartyTieReadable } from "./third-party-standing";
import { bilateralTradePartners, type BilateralTrade } from "./trade-partners";
import { usForcesIn } from "./us-presence";

// One foreign government's file: everything the World's country screen reads,
// assembled from the readers that each own one fact, so the screen carries no
// logic of its own and two sections cannot disagree about the same fact.

export type CommitmentRow = {
  readonly id: string;
  readonly kind: Commitment["kind"];
  readonly rationale: string;
  readonly status: Commitment["status"];
};

export type PresenceRow = {
  readonly id: string;
  readonly label: string;
  readonly where: string;
  readonly precision: "installation" | "zone";
  readonly band?: string;
  readonly lon: number;
  readonly lat: number;
  readonly weight: number;
};

export type OrganizationRow = { readonly id: string; readonly name: string; readonly href: string };

export type TieRow = {
  readonly nation: NationId;
  readonly name: string;
  readonly href: string;
  readonly word: string;
  readonly kind: "ally" | "rival";
};

/** A line the map draws from the country to one of its ties. */
export type NationArc = { readonly to: NationId; readonly kind: "trade" | "ally" | "rival"; readonly weight: number };

export type NationFile = {
  readonly nation: NationId;
  readonly name: string;
  readonly leader: WorldLeaderRow;
  readonly inOfficeSince?: string;
  readonly nextSelection?: string;
  readonly posture: NationPosture;
  readonly standing: Standing;
  readonly boardStance: Stance | "unread" | undefined;
  readonly rapport?: string;
  readonly envoy: EnvoyReading;
  readonly atWarWith: readonly string[];
  readonly vitals: readonly NationVital[];
  /** Population, GDP and military spending, in the dataset's own units. */
  readonly power: NationPower;
  readonly trade: BilateralTrade;
  readonly forces: NationForcesReading;
  readonly presence: readonly PresenceRow[];
  readonly commitments: readonly CommitmentRow[];
  readonly program: NationProgram;
  readonly recent: readonly RecentMove[];
  readonly organizations: readonly OrganizationRow[];
  readonly coverage?: ForeignCoverageView;
  readonly ties: readonly TieRow[];
  readonly arcs: readonly NationArc[];
  readonly provenance?: string;
};

const TIE_ARCS_PER_SIDE = 3;
const TRADE_ARCS_SHOWN = 6;
const ARCS_SHOWN = 8;
const ALLY_WORD: Readonly<Record<Stance, string>> = { favorable: "Close partner", neutral: "Works with", caution: "Keeps its distance from", adverse: "Rival" };

/** The governments this one is closest to and furthest from, only where the services can read the tie. */
function tiesOf(campaign: Campaign, nation: NationId): readonly TieRow[] {
  const home = campaign.founding.nation;
  const readable = selectRelationshipsFrom(campaign, nation).filter((tie) => tie.to !== home && campaign.nations[tie.to] !== undefined && thirdPartyTieReadable(campaign, nation, tie.to));
  const row = (tie: (typeof readable)[number], kind: TieRow["kind"]): TieRow => ({
    nation: tie.to,
    name: campaign.nations[tie.to]!.base.identity.name,
    href: place.country(tie.to),
    word: ALLY_WORD[stanceForDisposition(tie.alignment)],
    kind,
  });
  const ranked = [...readable].sort((a, b) => b.alignment - a.alignment || a.to.localeCompare(b.to));
  const allies = ranked.filter((tie) => tie.alignment > 0.2).map((tie) => row(tie, "ally"));
  const rivals = ranked.filter((tie) => tie.alignment < -0.2).reverse().map((tie) => row(tie, "rival"));
  return [...allies, ...rivals];
}

function arcsOf(trade: BilateralTrade, ties: readonly TieRow[]): readonly NationArc[] {
  const trading = trade.partners.slice(0, TRADE_ARCS_SHOWN).map((partner): NationArc => ({ to: partner.nation, kind: "trade", weight: partner.share }));
  const nearest = (kind: TieRow["kind"]) => ties.filter((tie) => tie.kind === kind).slice(0, TIE_ARCS_PER_SIDE);
  const bonds = [...nearest("ally"), ...nearest("rival")].map((tie): NationArc => ({ to: tie.nation, kind: tie.kind, weight: 0.1 }));
  const seen = new Set<string>();
  return [...trading, ...bonds].filter((arc) => !seen.has(`${arc.kind}:${arc.to}`) && seen.add(`${arc.kind}:${arc.to}`)).slice(0, ARCS_SHOWN);
}

function organizationsOf(campaign: Campaign, nation: NationId): readonly OrganizationRow[] {
  const runtime = campaign.nations[nation];
  return (runtime?.memberships ?? runtime?.base.memberships ?? []).flatMap((id) => {
    const body = worldDataset.organizations.find((org) => org.id === id);
    return body ? [{ id: body.id as string, name: body.name, href: place.organization(body.id as string) }] : [];
  });
}

function warsWith(campaign: Campaign, nation: NationId): readonly string[] {
  const home = campaign.founding.nation;
  return selectActiveConflicts(campaign).flatMap((conflict) => {
    const ours = sideOf(conflict, home);
    const theirs = sideOf(conflict, nation);
    return ours !== undefined && theirs !== undefined && ours !== theirs ? [conflict.id] : [];
  });
}

/** A foreign government's whole file, or undefined for the President's own country and an id the board does not carry. */
export function nationFile(campaign: Campaign, nation: NationId): NationFile | undefined {
  const standing = standingToward(campaign, nation);
  const leader = worldLeaderRows(campaign).find((row) => row.nation === nation);
  const posture = nationPosture(campaign, nation);
  const trade = bilateralTradePartners(campaign, nation);
  const forces = nationForces(campaign, nation);
  const power = nationPower(campaign, nation);
  const program = nationProgram(campaign, nation);
  if (!standing || !leader || !posture || !trade || !forces || !power || !program) return undefined;
  const ties = tiesOf(campaign, nation);
  const since = inOfficeSince(campaign, nation);
  const next = nextSelectionWords(campaign, nation);
  const rapport = rapportLine(campaign, nation);
  const coverage = foreignCoverageReading(campaign, nation);
  const fidelity = campaign.nations[nation]?.base.fidelity ?? "full";
  const provenance = fidelity === "full" ? undefined : figureProvenance(nation as string, fidelity);
  return {
    nation,
    name: leader.nationName,
    leader,
    ...(since ? { inOfficeSince: since } : {}),
    ...(next ? { nextSelection: next } : {}),
    posture,
    standing,
    boardStance: boardStance(standing),
    ...(rapport ? { rapport } : {}),
    envoy: envoyReading(campaign),
    atWarWith: warsWith(campaign, nation),
    vitals: nationVitals(campaign, nation),
    power,
    trade,
    forces,
    presence: usForcesIn(campaign, nation).map((placement) => ({
      id: placement.id,
      label: placement.label,
      where: placement.precision === "installation" ? "Base" : `Somewhere in ${placement.zoneName}`,
      precision: placement.precision,
      ...(placement.personnelBand ? { band: placement.personnelBand } : {}),
      lon: placement.point[0],
      lat: placement.point[1],
      weight: placement.personnel,
    })),
    commitments: commitmentsToward(campaign, campaign.founding.nation, nation).map((commitment) => ({ id: commitment.id, kind: commitment.kind, rationale: commitment.rationale, status: commitment.status })),
    program,
    recent: recentMoves(campaign, nation, Number.POSITIVE_INFINITY),
    organizations: organizationsOf(campaign, nation),
    ...(coverage ? { coverage } : {}),
    ties,
    arcs: arcsOf(trade, ties),
    ...(provenance ? { provenance } : {}),
  };
}
