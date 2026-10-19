import { describe, expect, it, vi } from "vitest";
import { apply, createRngStreams, makeCampaignSeed, resolveAction, selectForceBench } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { chosenForce, forcePackageFor, holdingCount, nationForces, serviceHoldings } from "./nation-forces";
import { militaryReadinessCourse } from "./service-dossier";
// The inheritance predicate stands in for record/inheritance.ts's rule: it marks rows by
// a pattern no position rule would produce, so the count below can only come
// from asking it.
vi.mock("../record/inheritance", () => ({ isInheritedRow: (_campaign, index) => index % 3 === 0 }));
const RUS = "RUS";
const IRN = "IRN";
const opening = openingCampaign({ seedText: "nation-forces" });
function withNavyGrown(campaign, factor) {
    const us = campaign.founding.nation;
    const runtime = campaign.nations[us];
    const strength = runtime.stats.military.branchStrength;
    const military = { ...runtime.stats.military, branchStrength: { ...strength, naval: strength.naval * factor } };
    return { ...campaign, nations: { ...campaign.nations, [us]: { ...runtime, stats: { ...runtime.stats, military } } } };
}
function godMode(campaign) {
    return { ...campaign, godMode: { enabled: true, enabledTurn: campaign.turn, actions: 0, branchPoints: [] } };
}
/** Every resolution roll lands, so the test reads what a landed order commits. */
function landing(label) {
    const inner = createRngStreams(makeCampaignSeed(label));
    return {
        stream(...keyParts) {
            const stream = inner.stream(...keyParts);
            return keyParts[0] === "resolution" ? { ...stream, next: () => 0 } : stream;
        },
    };
}
describe("the President's own forces, counted off the bench the budget grows", () => {
    it("reads eleven carriers at the oath, all of them free", () => {
        const carriers = serviceHoldings(opening, "INST-NAVY").find((holding) => holding.unitType === "navy.aircraft-carrier");
        expect(carriers).toMatchObject({ total: 11, committed: 0, available: 11, belowReadiness: 0, service: "INST-NAVY" });
        expect(holdingCount("navy.aircraft-carrier", carriers.total)).toBe("11 aircraft carriers");
    });
    it("prints the count the budget changed, not the roster it was handed", () => {
        const grown = withNavyGrown(opening, 1.2);
        const us = grown.founding.nation;
        const carriers = nationForces(grown, us)?.counted.find((holding) => holding.unitType === "navy.aircraft-carrier");
        expect(carriers?.total).toBe(selectForceBench(grown, us, "navy", "navy.aircraft-carrier")?.fielded);
        expect(carriers?.total).toBe(13);
    });
    it("keeps each department's holdings on its own page: the Marine Corps with the Navy, the Space Force with the Air Force", () => {
        const navy = serviceHoldings(opening, "INST-NAVY").map((holding) => holding.branch);
        const air = serviceHoldings(opening, "INST-AIRFORCE").map((holding) => holding.branch);
        expect(new Set(navy)).toEqual(new Set(["navy", "marines"]));
        expect(new Set(air)).toEqual(new Set(["air", "space"]));
        expect(serviceHoldings(opening, "INST-STATE")).toEqual([]);
    });
    it("leaves ten carriers free and one committed after a limited carrier presence is ordered", () => {
        const choice = forcePackageFor(opening, 2);
        const limited = choice.levels.find((entry) => entry.level === "limited");
        const force = chosenForce(choice, limited.count);
        expect(force.count).toBe(1);
        const us = opening.founding.nation;
        const result = resolveAction(opening, { actor: us, target: IRN, instrument: "military", rung: 2, force }, landing("carrier-presence"));
        expect(result.ok, result.ok ? "" : result.missingCapability).toBe(true);
        if (!result.ok)
            return;
        const carriers = serviceHoldings(apply(opening, result.packet), "INST-NAVY").find((holding) => holding.unitType === "navy.aircraft-carrier");
        expect(carriers).toMatchObject({ total: 11, committed: 1, available: 10 });
    });
});
describe("a foreign government's forces, honestly fogged", () => {
    it("prints no count for a government the services do not read, and says so", () => {
        const forces = nationForces(opening, RUS);
        expect(forces.read).toBe(false);
        expect(forces.counted).toEqual([]);
        expect(forces.inferred.map((domain) => domain.reason)).toEqual(["unread", "unread", "unread", "unread", "unread"]);
        expect(forces.strip.every((domain) => !domain.counted)).toBe(true);
        expect(forces.nuclear?.band).toMatch(/^Has nuclear weapons/);
        expect(forces.nuclear?.warheads).toBeUndefined();
    });
    it("prints no count for a domain the dataset only infers, even for a government the services read", () => {
        const forces = nationForces(godMode(opening), IRN);
        expect(forces.read).toBe(true);
        expect(forces.counted).toEqual([]);
        expect(forces.inferred.map((domain) => domain.reason)).toEqual(["inferred", "inferred", "inferred", "inferred", "inferred"]);
    });
    it("counts a read government's order of battle, and gives it no door into the President's departments", () => {
        const forces = nationForces(godMode(opening), RUS);
        expect(forces.counted.length).toBeGreaterThan(0);
        expect(forces.counted.every((holding) => holding.service === undefined)).toBe(true);
        expect(forces.nuclear?.warheads).toBeGreaterThan(0);
    });
    it("withholds an undeclared arsenal's count even from a government the services fully read (review F14)", () => {
        const withUndeclared = godMode(opening);
        const runtime = withUndeclared.nations[RUS];
        const undeclared = {
            ...withUndeclared,
            nations: {
                ...withUndeclared.nations,
                [RUS]: { ...runtime, stats: { ...runtime.stats, military: { ...runtime.stats.military, arsenal: { ...runtime.stats.military.arsenal, declared: false } } } },
            },
        };
        const forces = nationForces(undeclared, RUS);
        expect(forces.read).toBe(true);
        // The qualitative band still stands — a fully-read government's nuclear
        // status is a fact the services hold — but the figure behind it is not.
        expect(forces.nuclear?.band).toMatch(/^Has nuclear weapons/);
        expect(forces.nuclear?.warheads).toBeUndefined();
    });
    it("names the class of force a government fights in, read or not", () => {
        expect(nationForces(opening, IRN)?.warfighting?.label).toMatch(/Superpower Projection|Major Expeditionary|Regional Power|Limited Defense|Minimal Capability/);
        expect(nationForces(opening, opening.founding.nation)?.warfighting?.sustains).toMatch(/months/);
    });
    it("draws every domain as a band, for a government read or not", () => {
        for (const nation of [RUS, IRN, opening.founding.nation]) {
            const strip = nationForces(opening, nation).strip;
            expect(strip.map((domain) => domain.domain)).toEqual(["ground", "air", "sea", "cyber", "space"]);
            expect(strip.every((domain) => domain.band.length > 0)).toBe(true);
        }
    });
});
describe("the package a military rung sends", () => {
    it("reads each commitment level inside the bounds the bench and the bill share", () => {
        for (const rung of [2, 3, 4, 5]) {
            const choice = forcePackageFor(opening, rung);
            expect(choice.brief.specId).toBe(choice.composed.spec.id);
            for (const { count } of choice.levels) {
                expect(chosenForce(choice, count)?.count).toBe(count);
            }
        }
        expect(forcePackageFor(opening, 1)).toBeUndefined();
    });
});
const MUST_BE_CALLED = ["liveForceDomains", "composeForcePackages", "packageForce", "resolvePackageCount", "packageBrief"];
/** The names in the list that no source outside the engine calls. */
function uncalled(sources, names) {
    return names.filter((name) => !sources.some((text) => new RegExp(`\\b${name}\\(`).test(text)));
}
describe("every force reading the gate cannot see has a caller outside the engine", () => {
    it("finds a name nobody calls, and does not count an import or a mention as a call", () => {
        const planted = ['import { packageForce } from "@admin/engine";', "// composeForcePackages is where packages come from", "liveForceDomains(campaign, id);"];
        expect(uncalled(planted, ["liveForceDomains", "composeForcePackages", "packageForce"])).toEqual(["composeForcePackages", "packageForce"]);
    });
    it("finds each of the five called from player-core or the web app", () => {
        const sources = Object.values(import.meta.glob(["../**/*.ts", "../../../../apps/web/src/**/*.{ts,tsx}", "!**/*.test.ts", "!**/*.test.tsx"], { query: "?raw", import: "default", eager: true }));
        expect(sources.length).toBeGreaterThan(100);
        expect(uncalled(sources, MUST_BE_CALLED)).toEqual([]);
    });
});
describe("the readiness course on the security room", () => {
    it("counts the predecessor's weeks by asking the shared inheritance predicate, row by row", () => {
        const course = militaryReadinessCourse(opening);
        const rows = opening.player.metricHistory.length;
        expect(course.values).toHaveLength(rows + 1);
        expect(course.values.at(-1)).toBe(opening.player.metrics.militaryReadiness);
        expect(course.inherited).toBe(Math.ceil(rows / 3));
    });
});
