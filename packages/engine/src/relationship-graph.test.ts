import { describe, expect, it } from "vitest";
import {
  Relationship,
  worldDataset,
  applyBands,
  applyMemberships,
  applyGeography,
  applyPartySystems,
  BRAZIL_ID,
  GERMANY_ID,
  IRELAND_ID,
  ORG_NATO,
  RUSSIA_ID,
  UK_ID,
  US_ID,
  VIETNAM_ID,
  worldNations,
} from "@admin/world";
import { buildInitialRelationships, deriveRelationship, hasStandingLink, structuralReading } from "./relationship-graph.js";
import { compactTreatyId } from "./treaties.js";
import { foundedForBalance } from "./balance-harness.js";
import { relationshipKey, selectRelationship } from "./state.js";

const nations = applyBands(applyPartySystems(applyMemberships(applyGeography([...worldNations]))));
const player = US_ID;
const byId = new Map(nations.map((n) => [n.id as string, n]));

describe("the campaign's opening relationship graph", () => {
  it("gives every derived relationship a valid shape", () => {
    const graph = buildInitialRelationships(nations, player);
    expect(Object.keys(graph).length).toBeGreaterThan(0);
    for (const relationship of Object.values(graph)) {
      expect(() => Relationship.parse(relationship)).not.toThrow();
    }
  });

  it("lets the player reach every capital, and no nation reach itself", () => {
    const graph = buildInitialRelationships(nations, player);
    for (const nation of nations) {
      if (nation.id === player) continue;
      expect(graph[relationshipKey(player, nation.id)], `${player} -> ${nation.id}`).toBeDefined();
      expect(graph[relationshipKey(nation.id, player)], `${nation.id} -> ${player}`).toBeDefined();
    }
    expect(graph[relationshipKey(player, player)]).toBeUndefined();
  });

  it("stays sparse: two nations with nothing between them have nothing to act through", () => {
    const graph = buildInitialRelationships(nations, player);
    const possible = nations.length * (nations.length - 1);
    expect(Object.keys(graph).length).toBeLessThan(possible);

    for (const [key, relationship] of Object.entries(graph)) {
      if (relationship.from === player || relationship.to === player) continue;
      const from = byId.get(relationship.from as string)!;
      const to = byId.get(relationship.to as string)!;
      expect(hasStandingLink(from, to), `${key} should have a border, compact or trade lane behind it`).toBe(true);
    }
  });

  it("is directed: a small state's read of a large neighbor is not the mirror of the reverse", () => {
    const asymmetric = nations.some((from) =>
      nations.some((to) => {
        if (from.id === to.id || !hasStandingLink(from, to)) return false;
        const forward = deriveRelationship(from, to);
        const back = deriveRelationship(to, from);
        return forward.militaryThreat !== back.militaryThreat || forward.tension !== back.tension;
      }),
    );
    expect(asymmetric).toBe(true);
  });

  it("reads an adjacent power as more dangerous than a distant one of the same size", () => {
    // Alliance dampening is real signal, not noise — so the pair under test
    // must not share a bloc, or the comparison measures the alliance rather
    // than the border (the US reading Canada is the case that caught this).
    const sharesBloc = (a: (typeof nations)[number], b: (typeof nations)[number]) =>
      a.memberships.some((m) => b.memberships.includes(m));
    for (const reader of nations) {
      for (const neighborId of reader.geo.neighbors) {
        const neighbor = byId.get(neighborId as string)!;
        if (sharesBloc(reader, neighbor)) continue;
        // "Of the same size" is the distant power whose force index is closest
        // to the neighbor's, not the first one in its tier: a tier is coarse
        // enough that its top and bottom differ by more than a border does
        // (Cuba and Nigeria share one).
        const force = (n: (typeof nations)[number]) => n.bands.militaryMetrics?.forceIndex ?? 0;
        const distant = nations
          .filter(
            (n) =>
              n.id !== reader.id &&
              n.bands.militaryTier === neighbor.bands.militaryTier &&
              !hasStandingLink(reader, n) &&
              !sharesBloc(reader, n),
          )
          .sort((a, b) => Math.abs(force(a) - force(neighbor)) - Math.abs(force(b) - force(neighbor)))[0];
        if (!distant) continue;
        expect(
          deriveRelationship(reader, neighbor).militaryThreat,
          `${reader.id} reads ${neighbor.id} vs distant ${distant.id}`,
        ).toBeGreaterThanOrEqual(deriveRelationship(reader, distant).militaryThreat);
        return;
      }
    }
  });

  it("separates the world the player reads, rather than sorting it into a handful of buckets", () => {
    // The defect this guards: every figure on the edge came from a five-value
    // band, a membership count and a neighbor boolean, so the whole roster
    // produced six distinct tension values and the board looked
    // undifferentiated. The bar is well under one-per-nation — identical
    // countries should still read identically — and far above six.
    // The count is derived from the roster rather than written down, so
    // admitting a country cannot make this assertion stale.
    const edges = nations.filter((n) => n.id !== player).map((n) => deriveRelationship(n, byId.get(player as string)!));
    const distinct = (pick: (r: Relationship) => number) => new Set(edges.map(pick)).size;
    expect(edges.length).toBe(nations.length - 1);
    expect(distinct((r) => r.tension)).toBeGreaterThan(30);
    expect(distinct((r) => r.trust)).toBeGreaterThan(30);
    expect(distinct((r) => r.alignment)).toBeGreaterThan(30);
    expect(distinct((r) => r.militaryThreat)).toBeGreaterThan(20);
  });

  it("does not open the campaign with most of the world as allies", () => {
    // `1 - blocGap` peaked at 1 whenever two nations shared a band, so three
    // quarters of the roster opened reading the player as a close friend. The
    // bound is a share of the roster rather than a count: once the European
    // records were researched and pull toward Washington (2026-09-22), the
    // close set is the Atlantic alliance, 12 of 196 here and 23 with trade
    // assembled, which is the alliance being right, not the world.
    const us = byId.get(player as string)!;
    const close = nations.filter((n) => n.id !== player && deriveRelationship(n, us).alignment > 0.5);
    expect(close.length).toBeLessThan(nations.length / 6);
  });

  it("reads a treaty ally as closer than a rival bloc's member", () => {
    const us = byId.get(player as string)!;
    const ally = byId.get("GBR")!;
    const rival = byId.get("RUS")!;
    expect(deriveRelationship(ally, us).alignment).toBeGreaterThan(deriveRelationship(rival, us).alignment);
    expect(deriveRelationship(ally, us).tension).toBeLessThan(deriveRelationship(rival, us).tension);
  });

  it("reads distance rather than only the border flag, so two non-neighbors differ", () => {
    // Neither nation pulls toward, or is pulled toward by, the United States —
    // picked deliberately unaligned so proximity is the only thing this case
    // is exercising; a nation with an authored alignmentPull discounts its own
    // threat reading by design (see the `intent` term below), which would
    // confound a pair chosen for distance alone.
    const us = byId.get(player as string)!;
    const near = byId.get(BRAZIL_ID as string)!;
    const far = byId.get(VIETNAM_ID as string)!;
    expect(deriveRelationship(near, us).militaryThreat).toBeGreaterThan(deriveRelationship(far, us).militaryThreat);
  });

  it("opens with the defense compacts the two governments are already party to", () => {
    // The graph derived every other figure on the edge from the dataset and
    // hardcoded this one empty, so no government on earth had an ally: the
    // restraint that stops a reliable state casually turning on somebody it has
    // signed with was identically zero, and the record's reading of whether
    // this administration stood by its friends ran off a list nobody signed.
    const graph = buildInitialRelationships(nations, player);
    const nato = compactTreatyId(ORG_NATO);
    expect(graph[relationshipKey(player, GERMANY_ID)]!.treaties).toEqual([nato]);
    expect(graph[relationshipKey(GERMANY_ID, player)]!.treaties).toEqual([nato]);
    // One instrument per compact, not one per pair: both members are party to
    // the same document, so both edges name the same id.
    expect(graph[relationshipKey(GERMANY_ID, UK_ID)]!.treaties).toEqual([nato]);
  });

  it("gives at least one pair a treaty partner to be restrained about at turn one", () => {
    // The term this feeds is `treatyScruple` in the NPC agent, which reads
    // `treaties.length > 0` on the edge and multiplies by the actor's own
    // reliability. Both halves have to be there for the rule to be worth
    // anything, so both are asserted here rather than the list alone.
    const graph = buildInitialRelationships(nations, player);
    const bound = Object.values(graph).filter((edge) => edge.treaties.length > 0);
    expect(bound.length).toBeGreaterThan(0);
    expect(
      bound.some((edge) => (byId.get(edge.from as string)?.traits.reliability ?? 0) > 0),
      "a treaty partnership held by a government with some reliability to spend",
    ).toBe(true);
  });

  it("writes nothing for a customs union or a summit club, which bind something else", () => {
    // Ireland and Germany share the single market and no guarantee to fight.
    // Reading the two kinds as one instrument is exactly what `Organization.kind`
    // exists to prevent, and the compact weighting already prices the union.
    const graph = buildInitialRelationships(nations, player);
    expect(graph[relationshipKey(GERMANY_ID, IRELAND_ID)]).toBeDefined();
    expect(graph[relationshipKey(GERMANY_ID, IRELAND_ID)]!.treaties).toEqual([]);
    expect(graph[relationshipKey(player, RUSSIA_ID)]!.treaties).toEqual([]);
  });

  it("carries those compacts into a campaign a president actually takes office in", () => {
    // The derivation is the rule; this is the rule reaching the board. A founded
    // campaign rolls its nations before the graph is built, and the audit's
    // measurement was made on a founded campaign rather than on this function.
    const { campaign } = foundedForBalance("opening-graph");
    const player = campaign.founding.nation;
    const bound = Object.values(campaign.relationships).filter((edge) => edge.treaties.length > 0);
    expect(bound.length).toBeGreaterThan(0);
    expect(selectRelationship(campaign, player, GERMANY_ID)!.treaties).toEqual([compactTreatyId(ORG_NATO)]);
  });

  it("derives from the dataset alone, so it is identical every time", () => {
    const first = buildInitialRelationships(worldDataset.nations, player);
    const second = buildInitialRelationships(worldDataset.nations, player);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

describe("the standing reading memory settles toward", () => {
  const { campaign } = foundedForBalance("structural-reading");
  const player = campaign.founding.nation;

  it("is the founding reading itself while neither record has changed", () => {
    const edge = selectRelationship(campaign, GERMANY_ID, player)!;
    const reading = structuralReading(campaign.nations[GERMANY_ID]!, campaign.nations[player]!, player);
    expect(reading).toEqual({ trust: edge.trust, tension: edge.tension, militaryThreat: edge.militaryThreat });
  });

  it("moves when a government leaves the compacts it shared, so a withdrawal is never undone by time", () => {
    // A pair no sourced row names, so the derivation alone sets the reading.
    const ireland = campaign.nations[IRELAND_ID]!;
    const before = structuralReading(ireland, campaign.nations[GERMANY_ID]!, player);
    const after = structuralReading({ ...ireland, memberships: [] }, campaign.nations[GERMANY_ID]!, player);
    expect(after.trust).toBeLessThan(before.trust);
  });
});

describe("trade ties read the size of the lane", () => {
  const germany = byId.get(GERMANY_ID as string)!;
  const ireland = byId.get(IRELAND_ID as string)!;
  const withLane = (nation: typeof germany, partner: string, dependence: number, listed: boolean) => ({
    ...nation,
    stats: {
      ...nation.stats,
      trade: {
        ...nation.stats.trade,
        tradeDependence: { ...nation.stats.trade.tradeDependence, [partner]: dependence },
        topPartners: listed
          ? [...nation.stats.trade.topPartners.filter((p) => (p as string) !== partner), partner as typeof nation.stats.trade.topPartners[number]]
          : nation.stats.trade.topPartners.filter((p) => (p as string) !== partner),
      },
    },
  });

  it("ignores whether a partner made the short list", () => {
    const listed = deriveRelationship(withLane(ireland, GERMANY_ID, 0.02, true), germany);
    const unlisted = deriveRelationship(withLane(ireland, GERMANY_ID, 0.02, false), germany);
    expect(unlisted).toEqual(listed);
  });

  it("warms continuously with the lane, with no step anywhere along it", () => {
    const at = (d: number) => deriveRelationship(withLane(ireland, GERMANY_ID, d, false), germany).alignment;
    const steps = [0.001, 0.002, 0.004, 0.008, 0.016, 0.032].map(at);
    for (let i = 1; i < steps.length; i++) expect(steps[i]!).toBeGreaterThanOrEqual(steps[i - 1]!);
    expect(Math.abs(at(0.0051) - at(0.0049))).toBeLessThan(0.002);
  });

  it("opens a link only on a lane in the reader's own books", () => {
    const traded = withLane(ireland, VIETNAM_ID, 0.001, false);
    const untraded = { ...ireland, stats: { ...ireland.stats, trade: { ...ireland.stats.trade, tradeDependence: Object.fromEntries(Object.entries(ireland.stats.trade.tradeDependence).filter(([k]) => k !== (VIETNAM_ID as string))), topPartners: [VIETNAM_ID] } } };
    const vietnam = byId.get(VIETNAM_ID as string)!;
    expect(hasStandingLink(traded, vietnam)).toBe(true);
    // Listed but with no lane in its books: whatever link remains has another basis.
    expect(hasStandingLink(untraded, vietnam)).toBe(hasStandingLinkWithoutTrade(untraded, vietnam));
  });
});

function hasStandingLinkWithoutTrade(from: Parameters<typeof hasStandingLink>[0], to: Parameters<typeof hasStandingLink>[1]): boolean {
  const silent = { ...from, stats: { ...from.stats, trade: { ...from.stats.trade, tradeDependence: {}, topPartners: [] } } };
  return hasStandingLink(silent, to);
}
