import { describe, expect, it } from "vitest";
import { Relationship, worldDataset, applyBands, applyMemberships, applyGeography, applyPartySystems, BRAZIL_ID, GERMANY_ID, IRELAND_ID, ORG_NATO, RUSSIA_ID, UK_ID, US_ID, VIETNAM_ID, worldNations, } from "@admin/world";
import { buildInitialRelationships, deriveRelationship, hasStandingLink } from "./relationship-graph.js";
import { compactTreatyId } from "./treaties.js";
import { foundedForBalance } from "./balance-harness.js";
import { relationshipKey, selectRelationship } from "./state.js";
const nations = applyBands(applyPartySystems(applyMemberships(applyGeography([...worldNations]))));
const player = US_ID;
const byId = new Map(nations.map((n) => [n.id, n]));
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
            if (nation.id === player)
                continue;
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
            if (relationship.from === player || relationship.to === player)
                continue;
            const from = byId.get(relationship.from);
            const to = byId.get(relationship.to);
            expect(hasStandingLink(from, to), `${key} should have a border, compact or trade lane behind it`).toBe(true);
        }
    });
    it("is directed: a small state's read of a large neighbor is not the mirror of the reverse", () => {
        const asymmetric = nations.some((from) => nations.some((to) => {
            if (from.id === to.id || !hasStandingLink(from, to))
                return false;
            const forward = deriveRelationship(from, to);
            const back = deriveRelationship(to, from);
            return forward.militaryThreat !== back.militaryThreat || forward.tension !== back.tension;
        }));
        expect(asymmetric).toBe(true);
    });
    it("reads an adjacent power as more dangerous than a distant one of the same size", () => {
        // Alliance dampening is real signal, not noise — so the pair under test
        // must not share a bloc, or the comparison measures the alliance rather
        // than the border (the US reading Canada is the case that caught this).
        const sharesBloc = (a, b) => a.memberships.some((m) => b.memberships.includes(m));
        for (const reader of nations) {
            for (const neighborId of reader.geo.neighbors) {
                const neighbor = byId.get(neighborId);
                if (sharesBloc(reader, neighbor))
                    continue;
                // "Of the same size" is the distant power whose force index is closest
                // to the neighbor's, not the first one in its tier: a tier is coarse
                // enough that its top and bottom differ by more than a border does
                // (Cuba and Nigeria share one).
                const force = (n) => n.bands.militaryMetrics?.forceIndex ?? 0;
                const distant = nations
                    .filter((n) => n.id !== reader.id &&
                    n.bands.militaryTier === neighbor.bands.militaryTier &&
                    !hasStandingLink(reader, n) &&
                    !sharesBloc(reader, n))
                    .sort((a, b) => Math.abs(force(a) - force(neighbor)) - Math.abs(force(b) - force(neighbor)))[0];
                if (!distant)
                    continue;
                expect(deriveRelationship(reader, neighbor).militaryThreat, `${reader.id} reads ${neighbor.id} vs distant ${distant.id}`).toBeGreaterThanOrEqual(deriveRelationship(reader, distant).militaryThreat);
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
        const edges = nations.filter((n) => n.id !== player).map((n) => deriveRelationship(n, byId.get(player)));
        const distinct = (pick) => new Set(edges.map(pick)).size;
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
        const us = byId.get(player);
        const close = nations.filter((n) => n.id !== player && deriveRelationship(n, us).alignment > 0.5);
        expect(close.length).toBeLessThan(nations.length / 6);
    });
    it("reads a treaty ally as closer than a rival bloc's member", () => {
        const us = byId.get(player);
        const ally = byId.get("GBR");
        const rival = byId.get("RUS");
        expect(deriveRelationship(ally, us).alignment).toBeGreaterThan(deriveRelationship(rival, us).alignment);
        expect(deriveRelationship(ally, us).tension).toBeLessThan(deriveRelationship(rival, us).tension);
    });
    it("reads distance rather than only the border flag, so two non-neighbors differ", () => {
        // Neither nation pulls toward, or is pulled toward by, the United States —
        // picked deliberately unaligned so proximity is the only thing this case
        // is exercising; a nation with an authored alignmentPull discounts its own
        // threat reading by design (see the `intent` term below), which would
        // confound a pair chosen for distance alone.
        const us = byId.get(player);
        const near = byId.get(BRAZIL_ID);
        const far = byId.get(VIETNAM_ID);
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
        expect(graph[relationshipKey(player, GERMANY_ID)].treaties).toEqual([nato]);
        expect(graph[relationshipKey(GERMANY_ID, player)].treaties).toEqual([nato]);
        // One instrument per compact, not one per pair: both members are party to
        // the same document, so both edges name the same id.
        expect(graph[relationshipKey(GERMANY_ID, UK_ID)].treaties).toEqual([nato]);
    });
    it("gives at least one pair a treaty partner to be restrained about at turn one", () => {
        // The term this feeds is `treatyScruple` in the NPC agent, which reads
        // `treaties.length > 0` on the edge and multiplies by the actor's own
        // reliability. Both halves have to be there for the rule to be worth
        // anything, so both are asserted here rather than the list alone.
        const graph = buildInitialRelationships(nations, player);
        const bound = Object.values(graph).filter((edge) => edge.treaties.length > 0);
        expect(bound.length).toBeGreaterThan(0);
        expect(bound.some((edge) => (byId.get(edge.from)?.traits.reliability ?? 0) > 0), "a treaty partnership held by a government with some reliability to spend").toBe(true);
    });
    it("writes nothing for a customs union or a summit club, which bind something else", () => {
        // Ireland and Germany share the single market and no guarantee to fight.
        // Reading the two kinds as one instrument is exactly what `Organization.kind`
        // exists to prevent, and the compact weighting already prices the union.
        const graph = buildInitialRelationships(nations, player);
        expect(graph[relationshipKey(GERMANY_ID, IRELAND_ID)]).toBeDefined();
        expect(graph[relationshipKey(GERMANY_ID, IRELAND_ID)].treaties).toEqual([]);
        expect(graph[relationshipKey(player, RUSSIA_ID)].treaties).toEqual([]);
    });
    it("carries those compacts into a campaign a president actually takes office in", () => {
        // The derivation is the rule; this is the rule reaching the board. A founded
        // campaign rolls its nations before the graph is built, and the audit's
        // measurement was made on a founded campaign rather than on this function.
        const { campaign } = foundedForBalance("opening-graph");
        const player = campaign.founding.nation;
        const bound = Object.values(campaign.relationships).filter((edge) => edge.treaties.length > 0);
        expect(bound.length).toBeGreaterThan(0);
        expect(selectRelationship(campaign, player, GERMANY_ID).treaties).toEqual([compactTreatyId(ORG_NATO)]);
    });
    it("derives from the dataset alone, so it is identical every time", () => {
        const first = buildInitialRelationships(worldDataset.nations, player);
        const second = buildInitialRelationships(worldDataset.nations, player);
        expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    });
});
