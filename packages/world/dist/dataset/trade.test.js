import { describe, it, expect } from "vitest";
import { worldDataset } from "./index.js";
import { applyTrade, deriveTrade, greatCircleKm, tradeExposure } from "./trade.js";
const byId = new Map(worldDataset.nations.map((n) => [n.id, n]));
const nation = (id) => {
    const found = byId.get(id);
    if (!found)
        throw new Error(`test fixture expects nation ${id} in the dataset`);
    return found;
};
const partners = (id) => nation(id).stats.trade.topPartners;
const dependence = (id) => nation(id).stats.trade.tradeDependence;
describe("world.trade derivation", () => {
    it("gives every nation at least one partner, so nothing reads as trading with nobody", () => {
        for (const n of worldDataset.nations) {
            expect(n.stats.trade.topPartners.length, n.id).toBeGreaterThan(0);
            expect(Object.keys(n.stats.trade.tradeDependence).length, n.id).toBeGreaterThan(0);
        }
    });
    it("never lists a nation as its own partner and never references an unknown id", () => {
        for (const n of worldDataset.nations) {
            for (const partner of n.stats.trade.topPartners) {
                expect(partner).not.toEqual(n.id);
                expect(byId.has(partner), `${n.id} -> ${partner}`).toBe(true);
            }
            for (const key of Object.keys(n.stats.trade.tradeDependence)) {
                expect(byId.has(key)).toBe(true);
            }
        }
    });
    // The list names the largest flows, as WITS's "Top 5 Export and Import
    // partners" does; every lane's magnitude lives in tradeDependence.
    it("names at most five top partners, the largest lanes, in order", () => {
        for (const n of worldDataset.nations) {
            const listed = n.stats.trade.topPartners;
            const lanes = n.stats.trade.tradeDependence;
            expect(listed.length, n.id).toBeLessThanOrEqual(5);
            const smallestListed = Math.min(...listed.map((id) => lanes[id] ?? 0));
            const largestUnlisted = Math.max(0, ...Object.entries(lanes).filter(([id]) => !listed.includes(id)).map(([, value]) => value));
            expect(smallestListed, n.id).toBeGreaterThanOrEqual(largestUnlisted);
        }
    });
    it("pins Iran's top partners to its largest modeled lanes, the United States and Israel not among them", () => {
        // Turkey ahead of India: the Shanghai Cooperation Organization India and
        // Iran share binds no trade, so it adds no gravity pull.
        expect(partners("IRN")).toEqual(["CHN", "TUR", "IND", "IRQ", "SAU"]);
        expect(partners("IRN")).not.toContain("USA");
        expect(partners("IRN")).not.toContain("ISR");
        expect(dependence("IRN")["USA"]).toBeGreaterThan(0);
    });
    it("keeps total dependence inside the schema range and below total exposure", () => {
        for (const n of worldDataset.nations) {
            const values = Object.values(n.stats.trade.tradeDependence);
            for (const v of values) {
                expect(v).toBeGreaterThan(0);
                expect(v).toBeLessThanOrEqual(1);
            }
            const total = values.reduce((a, b) => a + b, 0);
            // Dependence is a share of the nation's own trade exposure, so it cannot
            // exceed it — a country cannot depend on partners more than it trades.
            expect(total, n.id).toBeLessThanOrEqual(tradeExposure(n.stats) + 0.05);
        }
    });
    it("reproduces the headline real-world pairings without them being authored", () => {
        expect(partners("CAN")[0]).toBe("USA");
        expect(partners("MEX")[0]).toBe("USA");
        expect(partners("USA").slice(0, 2).sort()).toEqual(["CAN", "MEX"]);
        expect(partners("BLR")[0]).toBe("RUS");
        expect(partners("PRK")[0]).toBe("CHN");
        expect(partners("TWN")[0]).toBe("CHN");
        expect(partners("KOR")[0]).toBe("CHN");
        expect(partners("POL")[0]).toBe("DEU");
        expect(partners("VNM")[0]).toBe("CHN");
    });
    it("is asymmetric in the direction size implies: the small partner depends more", () => {
        const dep = (from, to) => dependence(from)[to] ?? 0;
        expect(dep("CAN", "USA")).toBeGreaterThan(dep("USA", "CAN"));
        expect(dep("BLR", "RUS")).toBeGreaterThan(dep("RUS", "BLR"));
        expect(dep("MEX", "USA")).toBeGreaterThan(dep("USA", "MEX"));
    });
    it("prices exposure from trade intensity, not from partner count alone", () => {
        // Two economies can share a top partner and still differ in how much that
        // partner can hurt them; that difference is the exposure term.
        expect(tradeExposure(nation("CAN").stats)).toBeGreaterThan(tradeExposure(nation("USA").stats));
        expect(tradeExposure(nation("PRK").stats)).toBeLessThan(0.3);
    });
    it("is deterministic — the same input assembles to the same output", () => {
        const once = applyTrade(worldDataset.nations);
        const twice = applyTrade(worldDataset.nations);
        expect(once.map((n) => n.stats.trade)).toEqual(twice.map((n) => n.stats.trade));
    });
    it("re-deriving over an already-derived dataset changes nothing", () => {
        const again = applyTrade(worldDataset.nations);
        expect(again.map((n) => n.stats.trade)).toEqual(worldDataset.nations.map((n) => n.stats.trade));
    });
    it("measures distance as a great circle, not as raw coordinate difference", () => {
        // London to New York, ~5,570 km by great circle.
        const km = greatCircleKm({ lat: 51.5, lon: -0.13 }, { lat: 40.71, lon: -74.01 });
        expect(km).toBeGreaterThan(5_400);
        expect(km).toBeLessThan(5_700);
        expect(greatCircleKm({ lat: 0, lon: 0 }, { lat: 0, lon: 0 })).toBe(0);
    });
    it("gives a nation with no trade at all no dependence rather than a fabricated share", () => {
        const closed = {
            ...nation("PRK"),
            stats: {
                ...nation("PRK").stats,
                trade: { ...nation("PRK").stats.trade, exports: 0, imports: 0 },
            },
        };
        const derived = deriveTrade(closed, worldDataset.nations);
        expect(Object.keys(derived.tradeDependence)).toEqual([]);
        // The ranking still exists: who it *would* trade with is geography, not volume.
        expect(derived.topPartners.length).toBeGreaterThan(0);
    });
    it("gives the United States a live trade edge with real rivals, not just China and Mexico", () => {
        // The economic instrument ladder's rungs 2-5 gate on exactly this being
        // nonzero (instruments.ts's tradeAccess); before MAX_PARTNERS/MIN_SHARE
        // were widened, only Mexico and China cleared it among adversarial
        // candidates, so economic coercion against the rest was unreachable on
        // week 1.
        const usa = dependence("USA");
        for (const rival of ["RUS", "IND", "TUR", "SAU", "BRA", "VEN"]) {
            expect(usa[rival], rival).toBeGreaterThan(0);
        }
    });
    it("leaves Iran, North Korea and Cuba near-zero despite the wider floor — the sanctions read", () => {
        // Sanctions are a policy fact gravity (GDP + distance) cannot see; the
        // three governments under a standing US trade embargo are dampened
        // rather than left to rank on size and distance alone, where they would
        // land alongside unsanctioned economies of similar scale.
        const usa = dependence("USA");
        for (const sanctioned of ["IRN", "PRK", "CUB"]) {
            expect(usa[sanctioned] ?? 0, sanctioned).toBe(0);
        }
    });
    it("does not dampen a sanctioned nation's trade with anyone but the United States", () => {
        // Iran's real trade with China is unaffected by a US embargo; the
        // dampener is scoped to the US side of the pair, not to the nation.
        const iranToChina = dependence("IRN")["CHN"] ?? 0;
        expect(iranToChina).toBeGreaterThan(0);
    });
});
