import type { Nation, NationFidelity } from "../schemas/nation.js";
import type { NationId } from "../schemas/ids.js";

// Who trades with whom is derived, not typed into each nation record — for the
// same reason bands are. Fifty nations is 2,450 ordered pairs; hand-authoring
// them would be fabricated precision that drifts the first time a GDP moves.
//
// The model is the standard gravity form used in trade economics: flow between
// two economies rises with their size and falls with the distance between
// them, adjusted for the things that make a border cheap to cross — a shared
// land border, a shared region, a shared bloc. It reproduces the real headline
// pairings (Canada and Mexico on the United States, China on North Korea,
// Russia on Belarus, Germany on Poland) without anyone asserting them.
//
// What comes out is a ranking and a rough magnitude, not a statistic: these
// are plausible weights for a simulation, not customs data.

const NEIGHBOR_MULTIPLIER = 3;
const SAME_REGION_MULTIPLIER = 1.5;
const SHARED_BLOC_MULTIPLIER = 0.25; // per shared organization, capped below
const MAX_SHARED_BLOCS = 2;
// Distance decay. 1.2 sits inside the range trade-gravity estimates land in;
// below 1 geography stops mattering, above 1.5 nothing trades intercontinentally.
const DISTANCE_DECAY = 1.2;
const MIN_DISTANCE_KM = 400;
// Sized for a $27T economy, not a small one. A giant economy's trade is spread
// thin across dozens of real partners, each a small share of a huge total, so
// a tight partner cap or a coarse share floor reads "diffuse" as "noise" and
// leaves the United States with four partners — Canada, Mexico, China and
// Germany. That would gate the economic instrument ladder off against every
// rival but China, because a rung needs a live trade edge to act on and
// Russia, India, Turkey and Brazil each have a genuine but slim bilateral lane.
//
// That is the played nation's case, and at a roster of every government it is
// the only one that needs every lane: a partner missing from the President's
// list is a country the economic ladder cannot be aimed at, so the played
// nation keeps every partner that clears MIN_SHARE. An NPC keeps fewer the
// thinner its record, because each partner is a relationship edge carried in
// every save and a microstate's fortieth lane is one nobody reads.
const PARTNER_CAP: Readonly<Record<NationFidelity, number>> = { full: 40, standard: 25, thin: 12 };

function partnerCap(from: TradeInput): number {
  return from.playable ? Number.POSITIVE_INFINITY : PARTNER_CAP[from.fidelity ?? "full"];
}
// Scaled to the partner cap above so a real-but-slim lane (Russia, Vietnam,
// Kazakhstan) still rounds to a nonzero share rather than disappearing.
const MIN_SHARE = 0.0003;
const MIN_DEPENDENCE = 0.0001;

// Bilateral trade a government has embargoed does not show up as a smaller
// number in customs data — it shows up as almost nothing, because the formal
// channel is the thing sanctioned. Gravity (size and distance) cannot know
// that Iran, North Korea and Cuba sit under a standing US trade embargo; left
// alone the model would rank them alongside similarly-sized economies it
// never sanctioned (Nigeria, Vietnam) and hand economic coercion a lever
// against a country there is nothing left to embargo. Scoped to the US side
// of these three pairs only — Iran's trade with China or Russia is real and
// unaffected. Venezuela is deliberately absent: US sanctions there target the
// state oil company, not the trade lane itself, and a reduced-but-real edge
// is the accurate read.
const SANCTIONED_AGAINST_USA = new Set(["IRN", "PRK", "CUB"]);
const SANCTIONS_DAMPENER = 0.04;

function sanctionsDampener(from: TradeInput, to: TradeInput): number {
  const fromId = from.id as string;
  const toId = to.id as string;
  const involvesUsa = fromId === "USA" || toId === "USA";
  const involvesSanctioned = SANCTIONED_AGAINST_USA.has(fromId) || SANCTIONED_AGAINST_USA.has(toId);
  return involvesUsa && involvesSanctioned ? SANCTIONS_DAMPENER : 1;
}

export type TradeInput = Pick<Nation, "id" | "geo" | "stats"> & {
  readonly memberships?: readonly string[];
  readonly playable?: boolean;
  readonly fidelity?: NationFidelity;
};

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

export function greatCircleKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const sharedBlocs = (a: TradeInput, b: TradeInput): number => {
  const theirs = new Set(b.memberships ?? []);
  return (a.memberships ?? []).filter((org) => theirs.has(org)).length;
};

// The pull one economy exerts on another's trade. Asymmetric only through the
// partner's size: a small state feels a giant neighbor far more than the
// giant feels it, which falls out of normalizing per nation below.
export function gravityPull(from: TradeInput, to: TradeInput): number {
  const distance = Math.max(MIN_DISTANCE_KM, greatCircleKm(from.geo, to.geo));
  const mass = Math.max(1, to.stats.economy.gdp);
  let pull = mass / (distance / 1000) ** DISTANCE_DECAY;
  if (from.geo.neighbors.includes(to.id as NationId)) pull *= NEIGHBOR_MULTIPLIER;
  else if (from.geo.region === to.geo.region) pull *= SAME_REGION_MULTIPLIER;
  pull *= 1 + Math.min(MAX_SHARED_BLOCS, sharedBlocs(from, to)) * SHARED_BLOC_MULTIPLIER;
  pull *= sanctionsDampener(from, to);
  return pull;
}

// How exposed a nation is to trade at all, before asking to whom. A state
// whose trade is a fifth of its economy cannot be anybody's client no matter
// how concentrated that fifth is; one trading more than it produces is.
export function tradeExposure(stats: Nation["stats"]): number {
  const intensity = (stats.trade.exports + stats.trade.imports) / Math.max(1, stats.economy.gdp);
  return Math.min(0.95, intensity / 1.1);
}

// Four decimal places, not two: a great power's real bilateral lane with a
// mid-size rival is a fraction of a percent of its own economy, and rounding
// that to two decimals floors every one of them to zero before MIN_DEPENDENCE
// even runs.
const round4 = (n: number): number => Math.round(n * 10000) / 10000;

export type PartnerShare = { partner: NationId; share: number };

export function partnerShares(from: TradeInput, all: readonly TradeInput[]): PartnerShare[] {
  const pulls = all
    .filter((other) => other.id !== from.id)
    .map((other) => ({ partner: other.id as NationId, pull: gravityPull(from, other) }));
  const total = pulls.reduce((sum, p) => sum + p.pull, 0);
  if (total <= 0) return [];
  const ranked = pulls
    .map((p) => ({ partner: p.partner, share: p.pull / total }))
    .filter((p) => p.share >= MIN_SHARE)
    // Ties broken by id so the dataset is byte-identical between runs.
    .sort((a, b) => b.share - a.share || a.partner.localeCompare(b.partner));
  const kept = ranked.slice(0, partnerCap(from));
  // Whatever its cap, a government keeps a real lane with the President: its
  // moves against the played nation are the game, and an economic move needs
  // the lane. At a roster of every government a thin, sanctioned or distant
  // lane to Washington would otherwise be crowded out by neighbors, and Iran
  // would lose the channel it answers a strike through.
  const player = ranked.find((p) => all.find((n) => n.id === p.partner)?.playable);
  return player && !kept.includes(player) ? [...kept, player] : kept;
}

export function deriveTrade(
  from: TradeInput,
  all: readonly TradeInput[],
): { topPartners: NationId[]; tradeDependence: Record<string, number> } {
  const exposure = tradeExposure(from.stats);
  const shares = partnerShares(from, all);
  const topPartners: NationId[] = [];
  const tradeDependence: Record<string, number> = {};
  for (const { partner, share } of shares) {
    topPartners.push(partner);
    const dependence = round4(share * exposure);
    if (dependence >= MIN_DEPENDENCE) tradeDependence[partner as string] = dependence;
  }
  return { topPartners, tradeDependence };
}

// Applied at assembly, after geography and memberships (both are inputs) and
// before bands, which read tradeDependence to decide client-state and
// isolationist.
export function applyTrade<T extends TradeInput>(nations: readonly T[]): T[] {
  return nations.map((nation) => {
    const { topPartners, tradeDependence } = deriveTrade(nation, nations);
    return {
      ...nation,
      stats: {
        ...nation.stats,
        trade: { ...nation.stats.trade, topPartners, tradeDependence },
      },
    };
  });
}
