// What a nation's military actually consists of, domain by domain.
//
// The aggregate stats say a country is 0.85 at sea. That is a verdict with no
// evidence under it, and a player deciding whether to send a carrier cannot act
// on a verdict. This turns the authored figures into five domain readings that
// each carry the same four facts — how much weight the doctrine puts here, how
// many people are in it, how much of it could move this month, and what it is
// made of — so a dossier can show a domain rather than a number, and so the
// contest can be decided one domain at a time.
//
// Only three governments carry an authored order of battle. The other
// forty-seven answer the same four questions from the aggregates they do carry;
// `authored` is how a surface knows whether the formations it is printing were
// counted or inferred, and never a reason to show nothing.
import type { ForceAssetId, MilitaryBranch, Nation, NationId, OrderOfBattle } from "@admin/world";
import type { Campaign } from "./state.js";
import { forceAssetFor } from "@admin/world";
import { CONTEST_DIALS, type ContestDials } from "./contest-dials.js";

export type ForceDomainId = "ground" | "air" | "sea" | "cyber" | "space";

/**
 * A named thing the domain can send, with how much of it is ready.
 *
 * `type` is the roster label a screen prints, resolved from the catalog (or
 * the service's own name for it, where the record carries one); `id` is the
 * catalog id a rule matches on. `personnel` is the count at the catalog's
 * establishment, so a bench of hulls and a bench of brigades read on one scale.
 */
export type ForceHolding = {
  readonly id: ForceAssetId;
  readonly type: string;
  readonly count: number;
  readonly readiness: number;
  readonly personnel: number;
};

/** What a domain is made of, as the catalog names it: a formation and how many of them. */
export type ForceFormation = {
  readonly id: ForceAssetId;
  readonly name: string;
  readonly count: number;
  readonly personnel: number;
};

export type ForceDomain = {
  readonly id: ForceDomainId;
  readonly label: string;
  /** What this domain decides, in the sentence a player reads beside it. */
  readonly question: string;
  /** 0..1 — doctrine weight in this domain, as the dataset authors it. */
  readonly weight: number;
  /** People. Off the order of battle where one exists, off the national total where not. */
  readonly personnel: number;
  /** 0..1 — what could move this month. Unit-weighted where formations are on file. */
  readonly readiness: number;
  /**
   * 0..1 — the domain as one figure: doctrine weight, what shape it is in, and
   * how well it is organized to be used. This is what the contest compares.
   */
  readonly strength: number;
  /** Named formations, where the dataset carries them. */
  readonly formations: readonly ForceFormation[];
  /** Countable holdings, where the dataset carries them. */
  readonly holdings: readonly ForceHolding[];
  /** False where the composition was inferred from aggregates rather than counted. */
  readonly authored: boolean;
};

export type NuclearReading = {
  readonly warheads: number;
  readonly triad: boolean;
  /** 0..1 — what the arsenal is worth as a threat, saturating rather than scaling with the count. */
  readonly severity: number;
};

const DOMAIN_LABEL: Readonly<Record<ForceDomainId, string>> = {
  ground: "Ground",
  air: "Air",
  sea: "Sea",
  cyber: "Cyber",
  space: "Space",
};

const DOMAIN_QUESTION: Readonly<Record<ForceDomainId, string>> = {
  ground: "Who holds the ground once the shooting stops.",
  air: "Whether anything can fly over it, and whose.",
  sea: "Whether the sea lanes stay open, and for whom.",
  cyber: "What can be turned off before a shot is fired.",
  space: "Who can see the whole board, and who is guessing.",
};

/** Which services feed each domain. A marine is a ground soldier who arrives by sea. */
const DOMAIN_BRANCHES: Readonly<Record<ForceDomainId, readonly MilitaryBranch[]>> = {
  ground: ["army", "marines"],
  air: ["air"],
  sea: ["navy"],
  cyber: ["cyber"],
  space: ["space"],
};

/** Which authored aggregate states the doctrine's weight in each domain. */
const DOMAIN_STRENGTH: Readonly<Record<ForceDomainId, "land" | "air" | "naval" | "cyber" | "space">> = {
  ground: "land",
  air: "air",
  sea: "naval",
  cyber: "cyber",
  space: "space",
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export const FORCE_DOMAINS: readonly ForceDomainId[] = ["ground", "air", "sea", "cyber", "space"];

function branchesOf(oob: OrderOfBattle | undefined, domain: ForceDomainId) {
  if (!oob) return [];
  return DOMAIN_BRANCHES[domain].map((branch) => oob[branch]);
}

/**
 * How the national headcount divides between the domains when nothing was
 * authored.
 *
 * Normalized across the five, so the parts sum to the whole. Tilted shares that
 * were not normalized put more people in the domains than the country has, and
 * a dossier that adds up to more than the establishment it is describing is
 * making a claim the dataset does not.
 */
function inferredShares(nation: Nation, dials: ContestDials): Readonly<Record<ForceDomainId, number>> {
  const strengths = nation.stats.military.branchStrength;
  const mean = (strengths.land + strengths.air + strengths.naval + strengths.cyber + strengths.space) / 5;
  const raw = FORCE_DOMAINS.map((domain) => {
    const mine = strengths[DOMAIN_STRENGTH[domain]];
    const tilt = clamp01(0.5 + (mine - mean)) * 2;
    return [domain, dials.defaultBranchShare[domain] * tilt] as const;
  });
  const total = raw.reduce((sum, [, weight]) => sum + weight, 0);
  return Object.fromEntries(
    raw.map(([domain, weight]) => [domain, total > 0 ? weight / total : dials.defaultBranchShare[domain]]),
  ) as Record<ForceDomainId, number>;
}

/**
 * How many people this domain holds.
 *
 * The authored decomposition wins. Where there is none, the national active
 * headcount is split on the conventional shape of a force, tilted by how much
 * doctrine weight this country actually puts in the domain relative to its
 * others — a navy-heavy state gets a bigger fleet out of the same total.
 */
function personnelIn(nation: Nation, domain: ForceDomainId, dials: ContestDials): number {
  const oob = nation.stats.military.orderOfBattle;
  const authored = branchesOf(oob, domain);
  if (authored.length > 0) return authored.reduce((sum, branch) => sum + branch.headcount, 0);
  return Math.round(nation.stats.military.activeHeadcount * inferredShares(nation, dials)[domain]);
}

/** Readiness weighted by how much of the domain each formation is, so a mothballed fleet drags. */
function readinessIn(nation: Nation, domain: ForceDomainId): number {
  const units = branchesOf(nation.stats.military.orderOfBattle, domain).flatMap((branch) => branch.units ?? []);
  const total = units.reduce((sum, unit) => sum + unit.count, 0);
  if (total === 0) return nation.stats.military.readiness;
  return units.reduce((sum, unit) => sum + unit.readiness * unit.count, 0) / total;
}

export function forceDomain(nation: Nation, domain: ForceDomainId, dials: ContestDials = CONTEST_DIALS): ForceDomain {
  const military = nation.stats.military;
  const branches = branchesOf(military.orderOfBattle, domain);
  const weight = military.branchStrength[DOMAIN_STRENGTH[domain]];
  const readiness = readinessIn(nation, domain);
  return {
    id: domain,
    label: DOMAIN_LABEL[domain],
    question: DOMAIN_QUESTION[domain],
    weight,
    personnel: personnelIn(nation, domain, dials),
    readiness,
    // A domain is what it can field, not what it owns: weight says how much of
    // the force is here, readiness says how much of that could move, and
    // doctrine says whether it would be used well.
    strength: clamp01(weight * (0.55 + 0.3 * readiness + 0.15 * military.doctrineQuality)),
    formations: branches.flatMap((branch) =>
      (branch.capabilities ?? []).map((capability) => ({
        id: capability.name,
        name: capability.label ?? forceAssetFor(capability.name).label,
        count: capability.count,
        personnel: capability.count * forceAssetFor(capability.name).nominalPersonnel,
      })),
    ),
    holdings: branches.flatMap((branch) =>
      (branch.units ?? []).map((unit) => ({
        id: unit.type,
        type: unit.label ?? forceAssetFor(unit.type).label,
        count: unit.count,
        readiness: unit.readiness,
        personnel: unit.count * forceAssetFor(unit.type).nominalPersonnel,
      })),
    ),
    authored: branches.length > 0 && branches.some((branch) => (branch.units?.length ?? 0) > 0),
  };
}

export function forceDomains(nation: Nation, dials: ContestDials = CONTEST_DIALS): readonly ForceDomain[] {
  return FORCE_DOMAINS.map((domain) => forceDomain(nation, domain, dials));
}

/**
 * What the arsenal is worth as a threat.
 *
 * Saturating rather than linear: the difference between zero warheads and two
 * hundred is the whole game, and the difference between two thousand and five
 * thousand is arithmetic. The triad is a separate fact from the count — a
 * stockpile nobody can deliver by three routes is a stockpile that can be
 * disarmed in one strike.
 */
export function nuclearReading(nation: Nation): NuclearReading {
  const arsenal = nation.stats.military.arsenal;
  const mass = arsenal.warheads <= 0 ? 0 : Math.min(1, Math.log10(arsenal.warheads + 1) / 3);
  return {
    warheads: arsenal.warheads,
    triad: arsenal.deliveryTriad,
    severity: clamp01(mass * (arsenal.deliveryTriad ? 1 : 0.7)),
  };
}

/**
 * The warhead count a government admits to, or undefined where it admits
 * nothing. A state that has never declared its arsenal is not credited with a
 * figure on any surface, however well the count is estimated abroad; every
 * reader that prints a count reads it through here.
 */
export function declaredWarheads(campaign: Campaign, nation: NationId): number | undefined {
  const arsenal = campaign.nations[nation]?.stats.military.arsenal;
  if (!arsenal || arsenal.declared === false) return undefined;
  return arsenal.warheads;
}

/**
 * A holding as a phrase: "11 aircraft carriers", "1 aircraft carrier".
 *
 * The dataset names a unit type in the plural, because that is what a type is.
 * A count of one then reads "1 aircraft carriers", which is the kind of seam
 * that makes a screen look generated rather than written. The rule is naive on
 * purpose — every unit type in the dataset is a regular plural — and it says so
 * rather than pretending to be a morphology engine.
 */
export function holdingPhrase(count: number, type: string): string {
  const noun = type.toLowerCase();
  const singular = count === 1 && noun.endsWith("s") && !noun.endsWith("ss") ? noun.slice(0, -1) : noun;
  return `${Math.round(count).toLocaleString("en-US")} ${singular}`;
}

/** How much of the pair's combined mass one side holds — meaningful at every scale, unlike a fixed reference. */
export function share(mine: number, theirs: number): number {
  const combined = mine + theirs;
  return combined > 0 ? mine / combined : 0.5;
}
