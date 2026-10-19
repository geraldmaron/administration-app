import { describe, it, expect } from "vitest";
import { Relationship } from "@admin/world";
import { buildCampaign, nationA, nationB, person, relationship } from "./__fixtures__/campaign.js";
import { diffCampaign, hasFlag, hasIntelOnNation, hasIntelOnRelationship, relationshipKey, selectCabinetHolder, selectDiscoverableRelationshipsFrom, selectLedgerSince, selectMetrics, selectNation, selectPerson, selectRelationship, selectRelationshipsFrom, } from "./state.js";
describe("campaign state", () => {
    it("round-trips through JSON serialization with no loss", () => {
        const campaign = buildCampaign();
        const restored = JSON.parse(JSON.stringify(campaign));
        expect(restored).toEqual(campaign);
    });
    it("selectNation and selectPerson read what was written", () => {
        const campaign = buildCampaign();
        expect(selectNation(campaign, nationA.id)?.base.id).toBe(nationA.id);
        expect(selectPerson(campaign, person.id)?.base.id).toBe(person.id);
        expect(selectNation(campaign, "NOWHERE")).toBeUndefined();
    });
    it("nationB was written distinctly from nationA", () => {
        const campaign = buildCampaign();
        expect(selectNation(campaign, nationB.id)?.base.identity.name).toBe("Alpland");
    });
    it("selectRelationship and selectRelationshipsFrom find the directed edge", () => {
        const campaign = buildCampaign();
        expect(selectRelationship(campaign, relationship.from, relationship.to)).toEqual(relationship);
        expect(selectRelationshipsFrom(campaign, relationship.from)).toContainEqual(relationship);
    });
    it("selectMetrics, selectCabinetHolder, hasFlag, and selectLedgerSince read player state", () => {
        const campaign = buildCampaign();
        const roleId = person.eligibleRoles[0];
        expect(selectMetrics(campaign)).toEqual(campaign.player.metrics);
        expect(selectCabinetHolder(campaign, roleId)?.base.id).toBe(person.id);
        expect(hasFlag(campaign, "founding-complete")).toBe(true);
        expect(hasFlag(campaign, "nonexistent")).toBe(false);
        expect(selectLedgerSince(campaign, 1)).toHaveLength(1);
        expect(selectLedgerSince(campaign, 2)).toHaveLength(0);
    });
    it("computes a structural diff of two states", () => {
        const before = buildCampaign();
        const after = {
            ...before,
            turn: 2,
            player: { ...before.player, metrics: { ...before.player.metrics, treasury: 900 } },
        };
        const diff = diffCampaign(before, after);
        expect(diff).toContainEqual({ path: "turn", before: 1, after: 2 });
        expect(diff).toContainEqual({ path: "player.metrics.treasury", before: 1000, after: 900 });
        expect(diffCampaign(before, before)).toEqual([]);
    });
    it("exports only selectors, types, and the diff — no mutation helper", async () => {
        const mod = (await import("./state.js"));
        // `actorForNation` is a pure read of who a nation is to this campaign, in
        // the same family as the selectors — the rule this guards is that nothing
        // in state.ts can change a campaign, not that everything must be a select.
        // `is*` predicates (isGodMode, isRankable) answer a question about a
        // campaign and return a boolean, same family as `has*`. `sharesCompact`
        // is the same shape again: it reads two nations' memberships and answers
        // yes or no, and it lives here because the treaty floor cannot reach
        // blocs.ts without closing a cycle.
        const nonSelectorExports = Object.keys(mod).filter((name) => !/^select|^has|^is|^shares|^relationshipKey|^diffCampaign|^actorForNation|^SCENE_/.test(name));
        expect(nonSelectorExports).toEqual([]);
    });
    describe("intelligence-gated relationship visibility", () => {
        // USA (the player, intelCapability 0.4) always reads its own relationship
        // with ALP, regardless of ALP's counterIntel.
        it("the player's own relationship is always discoverable", () => {
            const campaign = buildCampaign();
            expect(relationship.from).toBe(campaign.founding.nation);
            expect(hasIntelOnRelationship(campaign, relationship)).toBe(true);
        });
        function withNpcPair(weakCounterIntel, fortifiedCounterIntel) {
            const campaign = buildCampaign();
            const weak = { ...nationB, id: "WEK", stats: { ...nationB.stats, security: { ...nationB.stats.security, counterIntel: weakCounterIntel } } };
            const fortified = { ...nationB, id: "FOR", stats: { ...nationB.stats, security: { ...nationB.stats.security, counterIntel: fortifiedCounterIntel } } };
            const npcRelationship = Relationship.parse({
                from: weak.id, to: fortified.id, trust: 0, alignment: 0, tension: 0, tradeDependence: 0,
                militaryThreat: 0, treaties: [], grudges: [], history: [],
            });
            return {
                ...campaign,
                nations: { ...campaign.nations, [weak.id]: { base: weak, stats: weak.stats, traits: nationB.traits }, [fortified.id]: { base: fortified, stats: fortified.stats, traits: nationB.traits } },
                relationships: { ...campaign.relationships, [relationshipKey(weak.id, fortified.id)]: npcRelationship },
            };
        }
        it("an NPC-to-NPC relationship is discoverable once the player's intel outreads the pair's average counterIntel", () => {
            const campaign = withNpcPair(0.1, 0.1); // player intelCapability 0.4 > avg 0.1
            const npcRelationship = selectRelationship(campaign, "WEK", "FOR");
            expect(hasIntelOnRelationship(campaign, npcRelationship)).toBe(true);
            expect(selectDiscoverableRelationshipsFrom(campaign, "WEK")).toContainEqual(npcRelationship);
        });
        it("an NPC-to-NPC relationship stays hidden while the player's intel does not outread the pair's average counterIntel", () => {
            const campaign = withNpcPair(0.9, 0.9); // player intelCapability 0.4 <= avg 0.9
            const npcRelationship = selectRelationship(campaign, "WEK", "FOR");
            expect(hasIntelOnRelationship(campaign, npcRelationship)).toBe(false);
            expect(selectDiscoverableRelationshipsFrom(campaign, "WEK")).not.toContainEqual(npcRelationship);
        });
        it("does not expose a private pair through a shared organization", () => {
            const base = withNpcPair(0.9, 0.9);
            const shared = "ORG-BRICS";
            const nations = Object.fromEntries(Object.entries(base.nations).map(([id, runtime]) => [id, {
                    ...runtime, base: { ...runtime.base, memberships: [...runtime.base.memberships, shared] },
                }]));
            const campaign = { ...base, nations };
            expect(hasIntelOnNation(campaign, "WEK")).toBe(false);
            expect(hasIntelOnNation(campaign, "FOR")).toBe(false);
            expect(selectDiscoverableRelationshipsFrom(campaign, "WEK")).toEqual([]);
        });
    });
    describe("the penetration margin", () => {
        function withCover(cover) {
            const campaign = buildCampaign();
            const covered = {
                ...nationB,
                stats: { ...nationB.stats, security: { ...nationB.stats.security, counterIntel: cover } },
            };
            return {
                ...campaign,
                nations: {
                    ...campaign.nations,
                    [nationB.id]: { base: covered, stats: covered.stats, traits: nationB.traits },
                },
            };
        }
        // The fixture player collects at 0.4, so the margin puts the last cover it
        // can get inside just under 0.2.
        it("refuses a government whose cover merely matches what the player collects", () => {
            expect(hasIntelOnNation(withCover(0.4), nationB.id)).toBe(false);
        });
        it("refuses a government a shade behind the player rather than treating a shade as access", () => {
            expect(hasIntelOnNation(withCover(0.35), nationB.id)).toBe(false);
        });
        // A government's own counsel costs a heavier margin than a tie between two
        // capitals, so collection that clears the lighter one reads the pair and not
        // the government.
        it("reads no government's own counsel on collection that only clears the lighter tie margin", () => {
            expect(hasIntelOnNation(withCover(0.19), nationB.id)).toBe(false);
        });
        it("reads a government the player's collection clears by the whole government margin", () => {
            const campaign = withCover(0.1);
            const home = campaign.nations[campaign.founding.nation];
            const sharper = { ...home, stats: { ...home.stats, security: { ...home.stats.security, intelCapability: 0.6 } } };
            expect(hasIntelOnNation({ ...campaign, nations: { ...campaign.nations, [campaign.founding.nation]: sharper } }, nationB.id)).toBe(true);
        });
        it.each(["ORG-NATO", "ORG-EU", "ORG-BRICS", "ORG-UNKNOWN"])("does not turn %s membership into private-government access", (sharedId) => {
            const campaign = withCover(0.95);
            const home = campaign.nations[campaign.founding.nation];
            const partner = campaign.nations[nationB.id];
            const shared = sharedId;
            const nations = {
                ...campaign.nations,
                [campaign.founding.nation]: { ...home, base: { ...home.base, memberships: [...home.base.memberships, shared] } },
                [nationB.id]: { ...partner, base: { ...partner.base, memberships: [...partner.base.memberships, shared] } },
            };
            expect(hasIntelOnNation({ ...campaign, nations }, nationB.id)).toBe(false);
        });
        it("holds the same margin against a pair's average cover", () => {
            const pair = Relationship.parse({
                from: nationB.id, to: "FOR", trust: 0, alignment: 0, tension: 0, tradeDependence: 0,
                militaryThreat: 0, treaties: [], grudges: [], history: [],
            });
            const campaign = withCover(0.35);
            const fortified = {
                ...nationB,
                id: "FOR",
                stats: { ...nationB.stats, security: { ...nationB.stats.security, counterIntel: 0.35 } },
            };
            const withPair = {
                ...campaign,
                nations: {
                    ...campaign.nations,
                    [fortified.id]: { base: fortified, stats: fortified.stats, traits: nationB.traits },
                },
                relationships: { ...campaign.relationships, [relationshipKey(nationB.id, fortified.id)]: pair },
            };
            expect(hasIntelOnRelationship(withPair, pair)).toBe(false);
        });
    });
});
