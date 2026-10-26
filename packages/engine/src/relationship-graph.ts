import { FOUNDING_DYADS, organizations, type Nation, type NationId, type OrgId, type Relationship, type TreatyId } from "@admin/world";
import { relationshipKey, type NationRuntime, type RelationshipGraph } from "./state.js";
import { applyFoundingDyads } from "./founding-dyads.js";

// The graph a campaign opens with. Nothing here is authored: a nation's
// reading of another is derived from the stats and bands already beside it,
// the same way targeting bands are, so adding a nation to the dataset gives
// it a place in the world without anyone writing 50 relationships by hand.
//
// The graph is deliberately sparse. Two states with no border, no shared
// compact and no trade between them have no working relationship to act
// through, and giving them one would say the world is smaller than it is.
// The player's own nation is the exception: a government can open a channel
// to any capital, so it starts with a reading of everyone.
//
// Every reading here is built from *continuous* facts. The first version of
// this file derived the whole edge from three bucketed inputs — a five-value
// alignment band, a shared-membership count and a neighbor boolean — so the
// forty-nine governments reading the player produced six distinct tension
// values between them, and seven countries that differ in every way a
// president would act on rendered identically on the board. The inputs that
// separate them were in the dataset all along and unread: how far apart the
// two capitals actually are, what share of each economy runs through the
// other, how much defense spending stands behind the posture, whether there
// are warheads behind it, whether the compact they share is a guarantee to
// fight or an agreement to trade. Bands are a targeting vocabulary for
// content; they are the wrong resolution for a relationship.

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const clamp01 = (v: number) => clamp(v, 0, 1);
// `|| 0` collapses negative zero, which is not cosmetic here: a reading that
// rounds to -0 survives in memory and comes back from JSON as 0, so a campaign
// saved and reloaded would not equal itself.
const round3 = (v: number) => Math.round(v * 1000) / 1000 || 0;
/** A 0..1 reading recentered to -1..1, so "average" reads as neither good nor bad. */
const centered = (v: number) => clamp(v * 2 - 1, -1, 1);

const ALIGNMENT_BY_BAND: Record<Nation["bands"]["alignmentBand"], number> = {
  aligned: 0.8,
  "leaning-aligned": 0.4,
  neutral: 0,
  "leaning-opposed": -0.4,
  opposed: -0.8,
};

const POSTURE_PRESSURE: Record<Nation["doctrine"]["posture"], number> = {
  defensive: 0.1,
  balanced: 0.25,
  assertive: 0.5,
  expansionist: 0.8,
};

/** What one shared body is worth on each channel, by what it actually binds. */
const ORG_WEIGHT: Record<"defense" | "economic" | "political", { align: number; damp: number; trade: number }> = {
  defense: { align: 0.42, damp: 0.55, trade: 0.05 },
  economic: { align: 0.14, damp: 0.15, trade: 0.25 },
  political: { align: 0.08, damp: 0.1, trade: 0.06 },
};

const orgById = new Map(organizations.map((org) => [org.id as string, org]));

function orgKind(id: OrgId): "defense" | "economic" | "political" {
  // A body outside the registry binds nothing anyone can name, so it is read
  // as the weakest kind rather than assumed to be an alliance.
  return orgById.get(id as string)?.kind ?? "political";
}

function sharedOrgs(from: Nation, to: Nation): OrgId[] {
  const theirs = new Set(to.memberships.map((m) => m as string));
  return from.memberships.filter((m) => theirs.has(m as string));
}

/**
 * Bloc rivalry, read off the registry's own exclusivity rules rather than a
 * second hand-typed enemies list: if A sits in a body that cannot coexist with
 * one B sits in, the two are on opposite sides of something.
 */
function blocRivalry(from: Nation, to: Nation): number {
  const theirs = new Set(to.memberships.map((m) => m as string));
  let weight = 0;
  for (const mine of from.memberships) {
    const org = orgById.get(mine as string);
    if (!org) continue;
    for (const other of org.conflictsWith) {
      if (!theirs.has(other as string)) continue;
      // Two mutual-defense pacts that exclude each other are a standing
      // confrontation. A club whose premise is sitting outside somebody else's
      // order is a disagreement about the world, and reading it as the same
      // thing made every BRICS member read like an adversary of the West.
      const bothArmed = org.kind === "defense" && orgKind(other) === "defense";
      weight += bothArmed ? 1 : 0.3;
    }
  }
  return clamp01(weight / 2);
}

function isNeighbor(from: Nation, to: Nation): boolean {
  return from.geo.neighbors.some((n) => (n as string) === (to.id as string));
}

// A lane in the reader's own books is a working relationship; one that rounds
// to nothing there is not, whoever's short list it once made. Reading the
// counterpart's books as well was tried: it opened about 2,400 edges between
// small economies and the distant governments they sell to, and nearly
// doubled the hostile pairs a founding board opens with.
function tradesWith(from: Nation, to: Nation): boolean {
  return (from.stats.trade.tradeDependence[to.id] ?? 0) > 0;
}

const sourcedPairs: ReadonlySet<string> = new Set(FOUNDING_DYADS.map((row) => `${row.pair[0]}:${row.pair[1]}`));

/** A pair the sourced table names. Two governments at war with each other have a relationship whether or not they trade. */
function sourcedPair(from: Nation, to: Nation): boolean {
  const [a, b] = [from.id as string, to.id as string].sort();
  return sourcedPairs.has(`${a}:${b}`);
}

// Two nations have something to read each other through if they share a
// border, a compact, a trade lane, or a relationship the sourced table records.
export function hasStandingLink(from: Nation, to: Nation): boolean {
  return isNeighbor(from, to) || sharedOrgs(from, to).length > 0 || tradesWith(from, to) || sourcedPair(from, to);
}

const EARTH_RADIUS_KM = 6371;
const toRadians = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two capitals, in kilometers. */
export function capitalDistanceKm(from: Pick<Nation, "geo">, to: Pick<Nation, "geo">): number {
  const dLat = toRadians(to.geo.lat - from.geo.lat);
  const dLon = toRadians(to.geo.lon - from.geo.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.geo.lat)) * Math.cos(toRadians(to.geo.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * How close the two are in the sense that matters to a general staff: 1 on a
 * shared border, decaying smoothly with distance rather than falling off a
 * cliff at the edge of the map. The 5,000 km scale is roughly the width of a
 * theater — beyond it, force has to be projected rather than merely moved.
 */
function proximity(from: Nation, to: Nation): number {
  if (isNeighbor(from, to)) return 1;
  return clamp01(Math.exp(-capitalDistanceKm(from, to) / 5000));
}

/** Warheads as a continuous edge rather than a boolean club membership. */
function nuclearWeight(nation: Nation): number {
  const { warheads, deliveryTriad } = nation.stats.military.arsenal;
  if (warheads === 0) return 0;
  return clamp01(Math.log10(warheads + 1) / 4) * (deliveryTriad ? 1 : 0.75);
}

/**
 * B's military weight as A has to read it: relative, because no capital reads
 * capability in the abstract — it reads capability against its own — and
 * quality-adjusted, because a budget nobody can maintain buys less than the
 * figure says.
 */
function militaryBalance(from: Nation, to: Nation): number {
  const quality = (n: Nation) => 0.5 + 0.5 * n.stats.military.readiness * n.stats.military.doctrineQuality;
  const weight = (n: Nation) => (n.stats.military.budget + 1) * quality(n);
  const theirs = weight(to);
  return clamp01(theirs / (theirs + weight(from)));
}

/** How much of B's force can actually arrive: adjacency, or lift. */
function reach(from: Nation, to: Nation): number {
  const near = proximity(from, to);
  const lift = (to.stats.military.airliftCapacity + to.stats.military.sealiftCapacity) / 2;
  return clamp01(near + (1 - near) * lift);
}

/** Trade exposure in both directions; a lane is a relationship, not a one-way fact. */
/**
 * How much of a pair's trade one side reads as its own business: its own
 * dependence on the lane, and a smaller part of the counterpart's.
 */
export function laneMagnitude(ours: number, theirs: number): number {
  return 0.65 * clamp01(ours) + 0.35 * clamp01(theirs);
}

/**
 * Planning values: a lane is a relationship before it is a large one, so the
 * tie carries a part that saturates early, up to `LANE_PRESENCE`, as well as
 * the part that grows with the flow. `LANE_SCALE` is the lane magnitude at
 * which that early part is about two-thirds built: half a percent of the
 * economy, the size of an ordinary named partner in this dataset.
 */
const LANE_PRESENCE = 0.12;
const LANE_SCALE = 0.005;

function tradeTie(from: Nation, to: Nation): number {
  const lane = laneMagnitude(from.stats.trade.tradeDependence[to.id] ?? 0, to.stats.trade.tradeDependence[from.id] ?? 0);
  return clamp01(lane + LANE_PRESENCE * (1 - Math.exp(-lane / LANE_SCALE)));
}

/**
 * The instruments the pair already hold, inherited rather than signed.
 *
 * A president takes office inside compacts the country entered decades before
 * the election, and the graph opened with none of them: `treaties` was the one
 * field on the edge that was hardcoded empty, so no government on earth had an
 * ally, the rule that stops a reliable state casually turning on somebody it
 * has signed with was identically zero, and the record's reading of whether
 * this administration stood by its friends was computed against a friend list
 * nobody had signed.
 *
 * Only the defense kind, because only that kind's obligation is a guarantee
 * both governments hold. A customs union binds trade policy and a summit club
 * binds a communiqué; both are real and both are already priced by the compact
 * weighting above, and writing them here would put a mutual-defense promise and
 * a tariff schedule back into one number.
 */
function inheritedTreaties(from: Nation, to: Nation): TreatyId[] {
  return sharedOrgs(from, to)
    .filter((id) => orgKind(id) === "defense")
    .map(compactTreaty);
}

// The treaty module's compact id grammar, restated rather than imported: the
// relationship memory phase reads this module, and a value import of the
// treaty module would run back through the effects fold into that phase. The
// graph tests compare these ids with `compactTreatyId`, so the two cannot drift.
const compactTreaty = (org: OrgId): TreatyId => `compact:${org}` as TreatyId;

/** What the shared compacts are worth, by kind and with diminishing returns. */
function compactPull(from: Nation, to: Nation): { align: number; damp: number; trade: number } {
  const shared = sharedOrgs(from, to);
  let align = 0;
  let damp = 0;
  let trade = 0;
  shared.forEach((id, index) => {
    const decay = 1 / (index + 1);
    const w = ORG_WEIGHT[orgKind(id)];
    align += w.align * decay;
    damp += w.damp * decay;
    trade += w.trade * decay;
  });
  return { align: clamp01(align), damp: clamp01(damp), trade: clamp01(trade) };
}

/**
 * How A reads B.
 *
 * Alignment is where the two governments' interests actually sit relative to
 * one another — bloc position, the compacts they share, whether either points
 * at the other as somewhere to pull toward, how alike the political systems
 * are, and how entangled the two economies have become. Trust follows
 * alignment but is a judgment about *conduct*, so it turns on B's own record
 * of keeping its word and on how legible its government is. Tension is what
 * remains: opposed interests, force pointed this way, and proximity to a
 * capital that leans forward — less whatever the two would lose by falling
 * out.
 */
export function deriveRelationship(from: Nation, to: Nation): Relationship {
  const blocGap = Math.abs(ALIGNMENT_BY_BAND[from.bands.alignmentBand] - ALIGNMENT_BY_BAND[to.bands.alignmentBand]);
  const compact = compactPull(from, to);
  const rivalry = blocRivalry(from, to);
  const trade = tradeTie(from, to);
  const near = proximity(from, to);

  // Pointing at somebody is a doctrine statement; being pointed at is a fact
  // about them, so the two directions are not worth the same.
  const pull =
    (from.doctrine.alignmentPull.some((n) => (n as string) === (to.id as string)) ? 0.22 : 0) +
    (to.doctrine.alignmentPull.some((n) => (n as string) === (from.id as string)) ? 0.12 : 0);
  // Two governments of the same form, run with the same openness, understand
  // each other's constraints; the gap is continuous, so no two pairs land in
  // the same bucket for the same reason.
  const systemGap =
    0.6 * Math.abs(from.stats.politics.pressFreedom - to.stats.politics.pressFreedom) +
    0.4 * Math.abs(from.stats.security.corruptionIndex - to.stats.security.corruptionIndex);
  const sameCharter = from.identity.government === to.identity.government ? 0.06 : 0;

  const alignment = clamp(
    (0.5 * (0.5 - blocGap) +
      0.7 * compact.align +
      pull +
      sameCharter +
      0.3 * trade -
      0.5 * rivalry -
      0.15 * systemGap) *
      (1 - 0.35 * from.traits.isolationism),
    -1,
    1,
  );

  // Conduct, not interests: a government can be aligned with one it does not
  // believe, and allied to one it watches.
  const conduct = 0.6 * centered(to.traits.reliability) + 0.4 * centered(to.traits.transparency);
  const trust = clamp(
    0.5 * alignment + 0.3 * conduct + 0.15 * compact.damp - 0.2 * centered(to.traits.opportunism) * near,
    -1,
    1,
  );

  // Threat is capability pointed this way, not capability in the abstract: a
  // distant great power reads as far less dangerous than an adjacent one, and
  // a guarantee both sides have signed takes the edge off both.
  const projection =
    0.5 * militaryBalance(from, to) +
    0.22 * clamp01(nuclearWeight(to) - nuclearWeight(from) * 0.6) +
    0.16 * to.traits.aggression +
    0.12 * to.traits.riskTolerance;
  // Capability is half a threat assessment; the other half is intent. Reading
  // it as capability alone made every government on earth read the strongest
  // army on earth as its own worst danger, allies included — which is not what
  // a Canadian or a British staff writes down about the United States.
  const intent = 0.35 + 0.65 * (1 - clamp01(alignment));
  const militaryThreat = clamp01(
    projection *
      (0.3 + 0.7 * reach(from, to)) *
      (0.55 + POSTURE_PRESSURE[to.doctrine.posture]) *
      (1 - 0.6 * compact.damp) *
      intent,
  );

  const tension = clamp01(
    0.34 * clamp01(-alignment) +
      0.26 * militaryThreat +
      0.16 * rivalry +
      0.12 * near * POSTURE_PRESSURE[to.doctrine.posture] +
      0.08 * to.traits.aggression +
      0.08 * from.traits.vengefulness * blocGap -
      0.18 * trade -
      0.12 * compact.damp,
  );

  return {
    from: from.id,
    to: to.id,
    trust: round3(trust),
    alignment: round3(alignment),
    tension: round3(tension),
    tradeDependence: round3(clamp01(from.stats.trade.tradeDependence[to.id] ?? 0)),
    militaryThreat: round3(militaryThreat),
    treaties: inheritedTreaties(from, to),
    grudges: [],
    history: [],
  };
}

// The campaign-start pass. Directed and asymmetric by construction: each
// direction is derived from the reader's own stats, so a small state's read
// of its large neighbor is not the mirror of the reverse.
export function buildInitialRelationships(nations: readonly Nation[], player: NationId): RelationshipGraph {
  const graph: Record<string, Relationship> = {};
  for (const from of nations) {
    for (const to of nations) {
      if (from.id === to.id) continue;
      const involvesPlayer = from.id === player || to.id === player;
      if (!involvesPlayer && !hasStandingLink(from, to)) continue;
      graph[relationshipKey(from.id, to.id)] = deriveRelationship(from, to);
    }
  }
  // The sourced pairs go on last, so a derived edge is a default rather than a
  // fact, and anything appended after this call reads the pair as sourced.
  return applyFoundingDyads(graph, player);
}

/** The part of a reading that relationship memory settles back toward. */
export type StructuralReading = { readonly trust: number; readonly tension: number };

/** The standing reading with the threat assessment the same records give, which standing pressures press against. */
export type StandingReading = StructuralReading & { readonly militaryThreat: number };

const structuralCache = new WeakMap<Nation, WeakMap<Nation, StandingReading>>();

function deriveStructural(from: Nation, to: Nation, player: NationId): StandingReading {
  const edge = deriveRelationship(from, to);
  const overlaid = applyFoundingDyads({ [relationshipKey(from.id, to.id)]: edge }, player)[relationshipKey(from.id, to.id)] ?? edge;
  return { trust: overlaid.trust, tension: overlaid.tension, militaryThreat: overlaid.militaryThreat };
}

/**
 * Where `from`'s reading of `to` sits on its standing facts alone: the same
 * derivation and sourced overlay the founding graph is built from, read off
 * each nation's unmutated record and its live compact memberships. A favor, a
 * slight or a week of war moves the live reading away from this; joining or
 * leaving a compact moves this itself, which is why a withdrawal is never
 * undone by time.
 *
 * Cached per pair of records, because the records never change inside a
 * campaign and the memory phase reads every edge every week. A nation that has
 * joined or left a body since founding is derived fresh.
 */
export function structuralReading(from: NationRuntime, to: NationRuntime, player: NationId): StandingReading {
  if (from.memberships || to.memberships) {
    const live = (n: NationRuntime): Nation => (n.memberships ? { ...n.base, memberships: [...n.memberships] } : n.base);
    return deriveStructural(live(from), live(to), player);
  }
  const byTarget = structuralCache.get(from.base) ?? new WeakMap<Nation, StandingReading>();
  const cached = byTarget.get(to.base);
  if (cached) return cached;
  const reading = deriveStructural(from.base, to.base, player);
  byTarget.set(to.base, reading);
  structuralCache.set(from.base, byTarget);
  return reading;
}
