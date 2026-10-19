import { describe, expect, it, vi } from "vitest";
import { Nation, Relationship } from "@admin/world";
import { buildCampaign, nationB } from "./__fixtures__/campaign.js";
import { createRngStreams } from "./rng.js";
import { relationshipKey } from "./state.js";
import { AID_BAND, warAidPackets } from "./world-events-aid.js";
// A government that weighed joining a war and fell just short of the line
// arms a side instead; one that fell far short, or cleared the line, does not.
// The join's own weighing is the war-join workstream's; this reads it through
// joinCounterfactual, stubbed here to the margin under test.
const margin = { value: -0.1 };
vi.mock("./war-join.js", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        joinCounterfactual: vi.fn((_campaign, _id, nation) => ({ nation, side: "defender", margin: margin.value })),
    };
});
const ALP = nationB.id;
const CRU = "CRU";
const DON = "DON";
const place = (id, name, neighbors) => Nation.parse({ ...nationB, id, identity: { ...nationB.identity, name }, geo: { ...nationB.geo, neighbors } });
function edge(from, to, trust, tension) {
    return Relationship.parse({ from, to, trust, alignment: 0.1, tension, tradeDependence: 0.3, militaryThreat: 0.1, treaties: [], grudges: [], history: [] });
}
function warWithDonor() {
    const base = buildCampaign();
    const alp = place("ALP", "Alpland", ["CRU", "DON"]);
    const cru = place("CRU", "Crusia", ["ALP"]);
    const don = place("DON", "Donia", ["ALP"]);
    const war = {
        id: "war:CRU:ALP:1",
        aggressor: CRU,
        defender: ALP,
        joined: { aggressor: [], defender: [] },
        startedTurn: 1,
        cause: "an invasion",
        intensity: 0.7,
        warSupport: { aggressor: 0.6, defender: 0.3 },
        exhaustion: { aggressor: 0.2, defender: 0.8 },
        status: "active",
        beats: [],
    };
    const edges = [edge(DON, ALP, 0.8, 0.05), edge(ALP, DON, 0.7, 0.05), edge(CRU, DON, -0.2, 0.3), edge(DON, CRU, -0.3, 0.4)];
    return {
        ...base,
        nations: {
            ...base.nations,
            [ALP]: { base: alp, stats: alp.stats, traits: alp.traits },
            [CRU]: { base: cru, stats: cru.stats, traits: cru.traits },
            [DON]: { base: don, stats: don.stats, traits: don.traits },
        },
        relationships: Object.fromEntries(edges.map((e) => [relationshipKey(e.from, e.to), e])),
        conflicts: { [war.id]: war },
    };
}
describe("aid into a war a government stays out of", () => {
    it("comes from a government whose join fell short by less than the aid band, stamped as its decision to send aid", () => {
        margin.value = -0.1;
        const campaign = warWithDonor();
        const packets = warAidPackets(campaign, createRngStreams(campaign.seed));
        const decision = packets.find((packet) => packet.provenance?.decision?.actor === DON)?.provenance?.decision;
        expect(decision?.question).toBe("send-aid");
        expect(decision?.subject).toBe(ALP);
        expect(packets.every((packet) => packet.effects.every((effect) => effect.kind !== "conflict"))).toBe(true);
    });
    it("does not come from a government that fell far short, or one that cleared the line and would fight", () => {
        const campaign = warWithDonor();
        for (const value of [-(AID_BAND + 0.05), 0.05]) {
            margin.value = value;
            expect(warAidPackets(campaign, createRngStreams(campaign.seed)).filter((p) => p.provenance?.decision?.actor === DON)).toEqual([]);
        }
    });
});
