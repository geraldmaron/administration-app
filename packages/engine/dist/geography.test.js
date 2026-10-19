import { describe, it, expect } from "vitest";
import { chokepoints, cradles, geographyByNation, organizations, worldDataset } from "@admin/world";
import { chokepointExposure, cradleThreatMix, distanceKm, eligibleOrgs, forceProjectionCost, globalClosureSeverity, orgEligibility, projectionOdds, tradeVulnerability, } from "./geography.js";
const nation = (id) => worldDataset.nations.find((n) => n.id === id);
const cradle = (id) => cradles.find((c) => c.id === id);
const geo = (id) => geographyByNation.get(id);
describe("distance and force projection", () => {
    it("measures real distances, not placeholders", () => {
        // London to Paris is roughly 340 km; New York to Tokyo roughly 10,800.
        expect(distanceKm({ lat: 51.5, lon: -0.13 }, { lat: 48.86, lon: 2.35 })).toBeGreaterThan(300);
        expect(distanceKm({ lat: 51.5, lon: -0.13 }, { lat: 48.86, lon: 2.35 })).toBeLessThan(380);
        expect(distanceKm({ lat: 40.7, lon: -74 }, { lat: 35.7, lon: 139.7 })).toBeGreaterThan(10_000);
        expect(distanceKm({ lat: 0, lon: 0 }, { lat: 0, lon: 0 })).toBe(0);
    });
    it("costs a distant intervention measurably more than a near one", () => {
        const near = forceProjectionCost(nation("USA"), nation("MEX"));
        const far = forceProjectionCost(nation("USA"), nation("VNM"));
        expect(far.distanceKm).toBeGreaterThan(near.distanceKm);
        expect(far.multiplier).toBeGreaterThan(near.multiplier);
    });
    it("charges a shared border nothing extra — the force is already there", () => {
        expect(forceProjectionCost(nation("USA"), nation("CAN")).multiplier).toBe(1);
        expect(forceProjectionCost(nation("RUS"), nation("BLR")).multiplier).toBe(1);
    });
    it("makes lift capacity the thing that separates reach from bluster", () => {
        // Same target, comparable distance, very different airlift/sealift.
        const withLift = forceProjectionCost(nation("USA"), nation("ETH"));
        const withoutLift = forceProjectionCost(nation("VEN"), nation("ETH"));
        expect(withoutLift.multiplier).toBeGreaterThan(withLift.multiplier);
    });
    it("measures from the nearest staging point, charging the trip to an ally's soil at the share lift cannot carry", () => {
        const iraq = nation("IRQ");
        const beside = { lat: iraq.geo.lat + 1, lon: iraq.geo.lon, leadInKm: 0 };
        const allyFar = { ...beside, leadInKm: 10_000 };
        const home = forceProjectionCost(nation("USA"), iraq);
        const based = forceProjectionCost(nation("USA"), iraq, [beside]);
        expect(based.stagedKm).toBeLessThan(200);
        expect(based.multiplier).toBeLessThan(home.multiplier);
        expect(based.distanceKm).toBe(home.distanceKm);
        expect(forceProjectionCost(nation("USA"), iraq, [allyFar]).multiplier).toBeGreaterThan(based.multiplier);
        expect(forceProjectionCost(nation("VEN"), iraq, [allyFar]).stagedKm).toBeGreaterThan(forceProjectionCost(nation("USA"), iraq, [allyFar]).stagedKm);
    });
    it("lowers odds with distance but never to zero", () => {
        const near = projectionOdds(nation("USA"), nation("MEX"), 0.6);
        const far = projectionOdds(nation("USA"), nation("PRK"), 0.6);
        expect(far).toBeLessThan(near);
        expect(far).toBeGreaterThan(0);
    });
});
describe("chokepoint dependence", () => {
    it("hurts a dependent nation far more than an indifferent one", () => {
        const closure = ["CP-HORMUZ"];
        expect(tradeVulnerability(geo("SAU"), closure)).toBeGreaterThan(0.5);
        expect(tradeVulnerability(geo("CHE"), closure)).toBe(0);
    });
    it("returns zero when nothing a nation uses is closed", () => {
        expect(tradeVulnerability(geo("JPN"), ["CP-PANAMA"])).toBe(0);
    });
    it("compounds multiple closures without ever exceeding total ruin", () => {
        const all = chokepoints.map((c) => c.id);
        for (const g of geographyByNation.values()) {
            const v = tradeVulnerability(g, all);
            expect(v, `${g.nation} vulnerability`).toBeGreaterThanOrEqual(0);
            expect(v, `${g.nation} vulnerability`).toBeLessThanOrEqual(1);
        }
        const one = tradeVulnerability(geo("JPN"), ["CP-MALACCA"]);
        const two = tradeVulnerability(geo("JPN"), ["CP-MALACCA", "CP-SUNDA"]);
        expect(two).toBeGreaterThan(one);
    });
    it("scores a global closure by traffic share, separately from who it hurts", () => {
        expect(globalClosureSeverity(chokepoints, ["CP-MALACCA"])).toBeGreaterThan(globalClosureSeverity(chokepoints, ["CP-SUNDA"]));
        expect(globalClosureSeverity(chokepoints, [])).toBe(0);
    });
    it("gives every chokepoint someone who cares, or closing it is a no-op", () => {
        for (const c of chokepoints) {
            const dependants = [...geographyByNation.values()].filter((g) => g.chokepointDependence.some((d) => d.chokepoint === c.id));
            expect(dependants.length, `${c.id} has at least one dependent nation`).toBeGreaterThan(0);
        }
    });
    it("keeps land borders symmetric — pressure cannot flow one way only", () => {
        for (const g of geographyByNation.values()) {
            for (const neighbor of g.neighbors) {
                const other = geographyByNation.get(neighbor);
                expect(other, `${neighbor} exists`).toBeDefined();
                expect(other.neighbors.some((n) => n === g.nation), `${neighbor} lists ${g.nation} back`).toBe(true);
            }
        }
    });
});
describe("the homeland cradle", () => {
    it("wakes the player up among their real neighbors", () => {
        const home = cradle("CRADLE-POTOMAC");
        // The assembled borders, not the authored row: the land-border table adds
        // the ones nobody typed (Cuba, by Guantanamo Bay).
        const real = new Set(worldDataset.nations.find((n) => n.id === "USA").geo.neighbors.map((n) => n));
        expect(new Set(home.startingNeighbors.map((n) => n))).toEqual(real);
        expect(cradleThreatMix(home, worldDataset.nations).neighbors).toBeGreaterThan(0);
    });
    it("is not a dead end: compacts remain open from home", () => {
        const open = eligibleOrgs(organizations, cradle("CRADLE-POTOMAC")).map((o) => o.id);
        expect(open.length).toBeGreaterThan(0);
        expect(open).toContain("ORG-NATO");
        expect(open).toContain("ORG-CPTPP");
    });
    it("gates an invitation-only compact behind a cradle no founding reaches", () => {
        const gccFromHome = orgEligibility(organizations, cradle("CRADLE-POTOMAC"), []).find((e) => e.org.id === "ORG-GCC");
        expect(gccFromHome.eligible).toBe(false);
        expect(gccFromHome.reason).toMatch(/cradle/);
        const natoFromHome = orgEligibility(organizations, cradle("CRADLE-POTOMAC"), []).find((e) => e.org.id === "ORG-NATO");
        expect(natoFromHome.eligible).toBe(true);
    });
});
describe("organization conflicts at founding", () => {
    it("rules out a conflicting compact once one side has been joined", () => {
        const home = cradle("CRADLE-POTOMAC");
        expect(eligibleOrgs(organizations, home, []).map((o) => o.id)).toContain("ORG-BRICS");
        const afterPact = eligibleOrgs(organizations, home, ["ORG-NATO"]).map((o) => o.id);
        expect(afterPact).toContain("ORG-NATO");
        expect(afterPact).not.toContain("ORG-BRICS");
    });
    it("enforces the conflict in both directions", () => {
        const home = cradle("CRADLE-POTOMAC");
        const afterTreaty = eligibleOrgs(organizations, home, ["ORG-BRICS"]).map((o) => o.id);
        expect(afterTreaty).not.toContain("ORG-NATO");
    });
    it("declares every conflict mutually, so the registry cannot lie by omission", () => {
        const byId = new Map(organizations.map((o) => [o.id, o]));
        for (const org of organizations) {
            for (const other of org.conflictsWith) {
                const target = byId.get(other);
                expect(target, `${other} exists`).toBeDefined();
                expect(target.conflictsWith.some((c) => c === org.id), `${other} declares its conflict with ${org.id}`).toBe(true);
            }
        }
    });
    it("never seats one nation in two compacts that exclude each other", () => {
        for (const org of organizations) {
            for (const other of org.conflictsWith) {
                const target = organizations.find((o) => o.id === other);
                const overlap = org.members.filter((m) => target.members.some((t) => t === m));
                expect(overlap, `${org.id} and ${target.id} share members`).toEqual([]);
            }
        }
    });
    it("leaves one compact reachable from every cradle so no placement is unplayable", () => {
        for (const c of cradles) {
            expect(eligibleOrgs(organizations, c).map((o) => o.id)).toContain("ORG-OPEC-PLUS");
        }
    });
});
// Twelve straits and sixty dependence lists were authored in detail and read
// by an inspection view in the studio and by no rule at all, while the stat
// registry pinned both fields to a `geography.chokepointExposure` that did not
// exist anywhere in the repo.
describe("what a strait somebody can shut is worth", () => {
    it("reads zero for a country whose trade depends on no closable strait", () => {
        expect(chokepointExposure(nation("CHE"))).toBe(0);
    });
    it("separates the countries whose imports have to pass somebody", () => {
        // Japan's trade runs through Malacca; Brazil's does not run through
        // anything a single government can close.
        expect(chokepointExposure(nation("JPN"))).toBeGreaterThan(chokepointExposure(nation("BRA")));
    });
    it("never runs past a total closure however many straits are counted", () => {
        for (const n of worldDataset.nations) {
            const exposure = chokepointExposure(n);
            expect(exposure).toBeGreaterThanOrEqual(0);
            expect(exposure).toBeLessThanOrEqual(1);
        }
    });
    // The weights were authored for sixty nations and derived for the rest, and
    // assembly kept only the list of straits: Iran, which leans on Hormuz at 0.9,
    // read 0.2, the strait's share of world tonnage.
    it("reads the dependence weight, not the strait's share of world traffic", () => {
        expect(chokepointExposure(nation("IRN"))).toBeCloseTo(0.9, 3);
    });
    it("carries the derived weights of a nation nobody authored a lane for", () => {
        expect(geographyByNation.has("OMN")).toBe(false);
        expect(nation("OMN").geo.chokepointDependence).toEqual([{ chokepoint: "CP-HORMUZ", weight: 0.4 }]);
        expect(chokepointExposure(nation("OMN"))).toBeCloseTo(0.4, 3);
    });
    it("ignores a strait nobody can shut", () => {
        const detour = chokepoints.filter((c) => !c.closableByOneState);
        expect(detour.length).toBeGreaterThan(0);
        expect(chokepointExposure(nation("JPN"), detour)).toBe(0);
    });
});
