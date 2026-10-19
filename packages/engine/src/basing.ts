import { BASING_COUNTRY_TOTAL, US_BASING, US_ID, maritimeZone, type NationId, type UsBasingRow, type ZoneId } from "@admin/world";
import type { Campaign, Commitment, NationRuntime } from "./state.js";

// Where American forces are stationed abroad, installation by installation.
// Personnel stay a band: the published figures mix service members, civilians
// and families, and a count would claim a precision no source gives.
//
// An installation is a standing commitment the administration inherits,
// positioned at its base. It costs nothing on top of the budget it was
// inherited inside, and it draws no formation from the order of battle,
// because the forces stationed there are the establishment the readiness
// arithmetic already counts; what it adds is where they stand.

export type BaseProvenance = "sourced" | "planning value";

export type Base = {
  readonly country: NationId;
  /** A neutral label for the installation, never a real unit's designation. */
  readonly installation: string;
  readonly service: string;
  readonly personnelBand: string;
  /** The host's stationed total as a band, where the table has one. */
  readonly countryTotal?: string;
  readonly kind: "basing" | "deployment";
  /** A deployment the board sized itself is a planning value, and says so. */
  readonly provenance: BaseProvenance;
  readonly source: string;
  /** The sea or country a positioned deployment stands in, by name. */
  readonly theater?: string;
};

type Posture = {
  readonly country: string;
  readonly installation: string;
  readonly service: string;
  readonly personnelBand: string;
  readonly theater: ZoneId;
  readonly source: string;
};

const CARRIED_SOURCE = "carried-conflicts.tsv";

/**
 * The two deployments the board sizes itself, both planning values. The Gulf
 * posture's direction is sourced (the largest buildup since 2003, three
 * carriers at its peak, still elevated with no stated drawdown in the week of
 * the table), and the table says the stationed totals undercount rotations;
 * no row gives a number, so the band here is the game's, set as an elevated
 * baseline well below the peak.
 */
export const BOARD_DEPLOYMENTS: readonly Posture[] = [
  {
    country: "BHR",
    installation: "Gulf posture above the stationed totals",
    service: "Navy and Air Force",
    personnelBand: "about 10,000 to 20,000 above the stationed totals",
    theater: "SEA-persian-gulf" as ZoneId,
    source: `${CARRIED_SOURCE}, the CENTCOM posture row`,
  },
  {
    country: "DJI",
    installation: "Red Sea and Gulf of Aden naval operations",
    service: "Navy",
    personnelBand: "a naval task group",
    theater: "SEA-red-sea" as ZoneId,
    source: `${CARRIED_SOURCE}, the Red Sea row`,
  },
];

const CURRENCY = { kind: "currency", scale: 6, suffix: "USD" } as const;

function slug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function baseCommitmentId(kind: "basing" | "deployment", country: string, label: string): string {
  return `commitment:${kind}:${US_ID}:${country}:${slug(label)}`;
}

function inherited(kind: "basing" | "deployment", country: string, label: string, rationale: string, location: Commitment["location"]): Commitment {
  return {
    id: baseCommitmentId(kind, country, label),
    kind,
    actor: US_ID,
    target: { kind: "nation", id: country },
    resource: { spec: CURRENCY, amountPerTurn: 0 },
    source: { kind: "budgetLine", line: "defense" },
    startedTurn: 0,
    review: "standing",
    status: "active",
    rationale,
    ...(location ? { location } : {}),
  };
}

/**
 * The commitments the board opens at the oath: every installation on the
 * basing table whose host is on the roster, and, where the board carries the
 * Gulf front, the two deployments sized as planning values.
 */
export function openingBaseCommitments(nations: Readonly<Record<string, NationRuntime>>, gulfFront: boolean): readonly Commitment[] {
  const bases = US_BASING.filter((row) => row.base !== BASING_COUNTRY_TOTAL && nations[row.country] !== undefined).map((row) =>
    inherited("basing", row.country, row.base, BASING_LINES.stationed(row.base), { base: row.base }),
  );
  const deployments = gulfFront
    ? BOARD_DEPLOYMENTS.filter((posture) => nations[posture.country] !== undefined).map((posture) =>
        inherited("deployment", posture.country, posture.installation, BASING_LINES.deployed(posture.installation), { theater: posture.theater }),
      )
    : [];
  return [...bases, ...deployments];
}

function countryTotal(country: string): string | undefined {
  return US_BASING.find((row) => row.country === country && row.base === BASING_COUNTRY_TOTAL)?.personnelBand;
}

function fromRow(row: UsBasingRow): Base {
  const total = countryTotal(row.country);
  return {
    country: row.country as NationId,
    installation: row.base,
    service: row.service,
    personnelBand: row.personnelBand,
    ...(total ? { countryTotal: total } : {}),
    kind: "basing",
    provenance: "sourced",
    source: `${row.source}, opened ${row.opened}`,
  };
}

function fromPosture(posture: Posture): Base {
  return {
    country: posture.country as NationId,
    installation: posture.installation,
    service: posture.service,
    personnelBand: posture.personnelBand,
    kind: "deployment",
    provenance: "planning value",
    source: posture.source,
    theater: maritimeZone(posture.theater)?.name ?? (posture.theater as string),
  };
}

function baseFor(commitment: Commitment): Base | undefined {
  const { base, theater } = commitment.location ?? {};
  if (base) {
    const row = US_BASING.find((entry) => entry.country === commitment.target.id && entry.base === base);
    return row ? fromRow(row) : undefined;
  }
  const posture = BOARD_DEPLOYMENTS.find((entry) => entry.country === commitment.target.id && entry.theater === theater);
  return posture ? fromPosture(posture) : undefined;
}

/**
 * The installations and positioned deployments US forces hold abroad, read
 * from the commitments still active, so a base the administration closes
 * leaves the reading the week it closes. Each carries its band and where the
 * band came from.
 */
export function selectBases(campaign: Campaign): readonly Base[] {
  return Object.values(campaign.commitments)
    .filter((commitment) => commitment.actor === campaign.founding.nation && commitment.status === "active" && commitment.location !== undefined)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(baseFor)
    .filter((base): base is Base => base !== undefined);
}

export const BASING_LINES = {
  stationed: (base: string) => `Forces stationed at ${base}, inherited at the oath.`,
  deployed: (label: string) => `${label}, inherited at the oath. The size is the game's planning estimate; the direction is reported.`,
} as const;
