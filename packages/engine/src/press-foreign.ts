import type { NationId } from "@admin/world";
import { alignmentAffinity } from "./alignment.js";
import type { Effect } from "./effects.js";
import { governingPartyOf } from "./foreign-leader.js";
import { partyTicketId } from "./party.js";
import { governmentCharacter } from "./governance.js";
import { selectProgramAlignment } from "./policy.js";
import { selectNation, selectRelationship, type AlignmentVector, type Campaign, type NationRuntime } from "./state.js";

// The foreign press: the wire agencies, the national papers, and state media
// where the press is not free. Every outlet is a fictional analogue of a
// format and a stance, never a renamed real masthead.
//
// A country's press covers the President two ways at once: through its
// government's standing with Washington, which state media simply repeat, and
// through how close the President's politics sit to the party that governs it,
// which a free press weighs for itself. That coverage then feeds back, within
// a small cap, into how the government reads the President.

export type ForeignOutletKind = "wire" | "national" | "state-media";

export type ForeignOutlet = {
  readonly id: string;
  readonly name: string;
  readonly nation: NationId;
  readonly kind: ForeignOutletKind;
  /** What it is for, in the words a media page would use. */
  readonly beat: string;
  /** The outlet's own sign-off: the one line of its voice no other masthead shares. */
  readonly signature: string;
};

/**
 * Below this, a country's press prints what its government says. Read off
 * the dataset's own scale, whose low end is "state media only"; the lowest
 * fifth of it is where no paper can file against the government it covers.
 */
export const STATE_PRESS_CEILING = 0.2;

/** The foreign outlets the desk reads. */
export const FOREIGN_OUTLETS: readonly ForeignOutlet[] = [
  {
    id: "meridian-wire",
    name: "Meridian Wire",
    nation: "GBR" as NationId,
    kind: "wire",
    beat: "A London agency that files the first account of anything a government does, to every desk that pays for it.",
    signature: "Filed for subscribers; reproduction with attribution only.",
  },
  {
    id: "continental-dispatch",
    name: "Continental Dispatch Agency",
    nation: "FRA" as NationId,
    kind: "wire",
    beat: "A Paris agency with bureaus across Africa and the Middle East, read wherever French is.",
    signature: "Continued in the agency's regional files.",
  },
  {
    id: "frankfurt-ledger",
    name: "The Frankfurt Ledger",
    nation: "DEU" as NationId,
    kind: "national",
    beat: "A business daily that reads Washington through tariffs, interest rates and the alliance's bill.",
    signature: "The Ledger prints the figures; its readers are left to add them up.",
  },
  {
    id: "kanto-daily-record",
    name: "Kanto Daily Record",
    nation: "JPN" as NationId,
    kind: "national",
    beat: "A Tokyo paper of record, careful and slow, that measures every American move against the treaty.",
    signature: "The Record will return to this when the government has answered.",
  },
  {
    id: "subcontinent-review",
    name: "The Subcontinent Review",
    nation: "IND" as NationId,
    kind: "national",
    beat: "A Delhi paper that covers Washington as one capital among several that India can choose between.",
    signature: "The Review's correspondents in Washington and Beijing filed for this page.",
  },
  {
    id: "cerrado-gazette",
    name: "The Cerrado Gazette",
    nation: "BRA" as NationId,
    kind: "national",
    beat: "A Brasília daily that reads American policy through commodity prices and the hemisphere.",
    signature: "The Gazette's market desk contributed the prices in this report.",
  },
  {
    id: "harmony-bulletin",
    name: "The Harmony Bulletin",
    nation: "CHN" as NationId,
    kind: "state-media",
    beat: "The state's own paper. It prints the government's line on the United States and nothing beside it.",
    signature: "Published under the authority of the state.",
  },
  {
    id: "ostrog-international",
    name: "Ostrog International Service",
    nation: "RUS" as NationId,
    kind: "state-media",
    beat: "The state broadcaster's overseas service. It carries what the government wants said about Washington.",
    signature: "Broadcast in eleven languages by the state's overseas service.",
  },
];

/** The outlet a nation's coverage is read through, where the roster carries one. */
export function outletOf(nation: NationId): ForeignOutlet | undefined {
  return FOREIGN_OUTLETS.find((outlet) => outlet.nation === nation);
}

/** Whether a country's press is its government's voice. */
export function isStatePress(runtime: NationRuntime): boolean {
  return runtime.stats.politics.pressFreedom < STATE_PRESS_CEILING;
}

export type CoverageBand = "hostile" | "cool" | "neutral" | "warm";

/** How a nation's press is covering the President, as a band a screen may print. */
export type ForeignCoverage = {
  readonly nation: NationId;
  readonly band: CoverageBand;
  /** Its press prints the government's line rather than its own. */
  readonly echo: boolean;
  readonly outlet?: ForeignOutlet;
};

// Where a coverage score turns from one band into the next. Symmetric, so a
// press no warmer than it is cold reads as neutral either side of zero.
const WARM_FLOOR = 0.12;
const HOSTILE_CEILING = -0.4;

export function coverageBand(score: number): CoverageBand {
  if (score >= WARM_FLOOR) return "warm";
  if (score > -WARM_FLOOR) return "neutral";
  return score > HOSTILE_CEILING ? "cool" : "hostile";
}

const clampSigned = (value: number): number => Math.max(-1, Math.min(1, value));
const round4 = (value: number): number => Math.round(value * 10_000) / 10_000 + 0;

/** Where the party that governs a nation sits, or the government's own character where no party governs it. */
function rulingPosition(runtime: NationRuntime, campaign: Campaign, nation: NationId): AlignmentVector {
  const party = governingPartyOf(campaign, nation);
  const ruling = party === undefined ? undefined : runtime.base.partySystem.parties.find((entry) => entry.id === party);
  return ruling ? ruling.beliefs : governmentCharacter(runtime, party);
}

// How much of the President's politics, as a press abroad reads them, is the
// ticket they ran on and how much the program they hold. A ticket is what a
// foreign paper knows on the first day; the program is what it learns after.
const TICKET_WEIGHT = 0.5;

/**
 * Where the President's politics sit, as the press abroad reads them: half the
 * platform of the ticket they ran on, half the program they actually hold.
 * The program alone where the ticket carries no platform the slate records.
 */
export function presidentPosition(campaign: Campaign): AlignmentVector {
  const program = selectProgramAlignment(campaign);
  const ticket = partyTicketId(campaign.congress.administrationParty);
  const own = selectNation(campaign, campaign.founding.nation)?.base.partySystem.parties.find((party) => (party.id as string) === ticket);
  if (!own) return program;
  const blend = (axis: keyof AlignmentVector) => own.beliefs[axis] * TICKET_WEIGHT + program[axis] * (1 - TICKET_WEIGHT);
  return { economicLeftRight: blend("economicLeftRight"), authLibertarian: blend("authLibertarian"), nationalistGlobalist: blend("nationalistGlobalist") };
}

/**
 * How close the President's politics sit to the party governing a nation,
 * -1 opposite to 1 alike, on the same affinity every other stance is read
 * against.
 */
export function politicalCloseness(campaign: Campaign, nation: NationId, president = presidentPosition(campaign)): number {
  const runtime = selectNation(campaign, nation);
  if (!runtime) return 0;
  return round4(alignmentAffinity(president, rulingPosition(runtime, campaign, nation)));
}

/**
 * The coverage a nation's press gives the President, -1 to 1. State media
 * repeat their government's standing with Washington; a free press weighs the
 * President's politics for itself, by as much as it is free to.
 */
export function coverageScore(campaign: Campaign, nation: NationId, president = presidentPosition(campaign)): number | undefined {
  const runtime = selectNation(campaign, nation);
  if (!runtime || nation === campaign.founding.nation) return undefined;
  const stance = selectRelationship(campaign, nation, campaign.founding.nation)?.trust ?? 0;
  if (isStatePress(runtime)) return round4(stance);
  const freedom = runtime.stats.politics.pressFreedom;
  return round4(stance * (1 - freedom / 2) + politicalCloseness(campaign, nation, president) * (freedom / 2));
}

/**
 * A nation's coverage of the President. Undefined for the President's own
 * country, and until the week's press abroad has first been read: a campaign
 * sealed at the oath has not been written about yet.
 */
export function foreignCoverage(campaign: Campaign, nation: NationId): ForeignCoverage | undefined {
  if (!campaign.foreignCoverage?.[nation]) return undefined;
  const runtime = selectNation(campaign, nation);
  const score = coverageScore(campaign, nation);
  if (!runtime || score === undefined) return undefined;
  const outlet = outletOf(nation);
  return { nation, band: coverageBand(score), echo: isStatePress(runtime), ...(outlet ? { outlet } : {}) };
}

// --- How coverage reaches a government's trust in the President ------------

/**
 * The most the press abroad can move a government's trust in the President,
 * either way, over a whole term. A planning value: small enough that no
 * government's standing with Washington is decided by its newspapers, large
 * enough that a term of warm coverage is a reason and not a rounding error.
 */
export const AFFINITY_CAP = 0.05;

/** The most one week's coverage moves that trust. At this pace the cap takes twenty weeks to reach. */
export const AFFINITY_STEP = 0.0025;

/**
 * Where a government's trust in the President is being pulled by its press
 * and by how close the President's politics sit to the party in power, within
 * the cap. Zero for the President's own country.
 */
export function pressTrustAffinity(campaign: Campaign, nation: NationId, president = presidentPosition(campaign)): number {
  const score = coverageScore(campaign, nation, president);
  if (score === undefined) return 0;
  return round4(AFFINITY_CAP * clampSigned(0.5 * score + 0.5 * politicalCloseness(campaign, nation, president)));
}

/**
 * One week of the press abroad: each government's trust moved one step toward
 * where its coverage pulls it, and the running total that keeps the move
 * inside the cap. The total is what is stored, so a term's worth of warm
 * coverage cannot push past the cap however long it runs.
 */
export function coverageWeek(campaign: Campaign): readonly Effect[] {
  const us = campaign.founding.nation;
  const president = presidentPosition(campaign);
  const effects: Effect[] = [];
  const nations = (Object.keys(campaign.nations) as NationId[]).filter((id) => id !== us).sort();
  for (const nation of nations) {
    const held = campaign.foreignCoverage?.[nation]?.affinity ?? 0;
    // A government with no standing tie to Washington has no trust to move,
    // so its total stays where it is rather than counting a move never made.
    const tied = selectRelationship(campaign, nation, us) !== undefined;
    const target = tied ? pressTrustAffinity(campaign, nation, president) : held;
    const step = round4(Math.max(-AFFINITY_STEP, Math.min(AFFINITY_STEP, target - held)));
    const affinity = round4(held + step);
    if (step !== 0) effects.push({ kind: "relationship", from: nation, to: us, deltas: { trust: step } });
    if (step !== 0 || campaign.foreignCoverage?.[nation] === undefined) {
      effects.push({ kind: "leadership", nation, coverage: { affinity } });
    }
  }
  return effects;
}
