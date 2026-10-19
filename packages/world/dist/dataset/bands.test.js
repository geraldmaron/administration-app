import { describe, it, expect } from "vitest";
import { NationArchetype, NationBands } from "../schemas/nation.js";
import { validateDataset } from "../validate/dataset-validator.js";
import { worldDataset } from "./index.js";
import { applyBands, deriveBands, militaryScore, powerScore, stabilityScore, wealthTier } from "./bands.js";
import { applyGeography } from "./geography.js";
import { applyMemberships } from "./orgs-cradles.js";
const nation = (id) => worldDataset.nations.find((n) => n.id === id);
describe("band derivation", () => {
    it("produces a schema-valid band block for every nation", () => {
        for (const n of worldDataset.nations) {
            expect(() => NationBands.parse(n.bands), `${n.id}`).not.toThrow();
        }
    });
    it("is deterministic — the same stats always give the same bands", () => {
        for (const n of worldDataset.nations) {
            expect(deriveBands(n), `${n.id}`).toEqual(deriveBands(n));
        }
    });
    it("derives from stats alone, so editing a stat moves the band", () => {
        const base = nation("CHE");
        const collapsed = {
            ...base,
            stats: {
                ...base.stats,
                politics: { ...base.stats.politics, regimeStability: 0.05, legitimacy: 0.05, factionalism: 0.9, protestPressure: 0.9 },
                security: { ...base.stats.security, insurgencyPressure: 0.9 },
            },
        };
        expect(base.bands.stabilityBand).toBe("stable");
        expect(deriveBands(collapsed).stabilityBand).toBe("collapsing");
    });
    it("ranks the obvious cases in the obvious order", () => {
        expect(powerScore(nation("USA").stats)).toBeGreaterThan(powerScore(nation("IDN").stats));
        expect(militaryScore(nation("USA").stats)).toBeGreaterThan(militaryScore(nation("ISL").stats));
        expect(stabilityScore(nation("CHE").stats)).toBeGreaterThan(stabilityScore(nation("AFG").stats));
        expect(wealthTier(nation("CHE").stats)).toBeGreaterThan(wealthTier(nation("NGA").stats));
    });
    // The calibration itself, pinned to named cases.
    //
    // Nothing asserted what `stabilityBand` actually resolved to for any real
    // nation, so a formula that rated the United States, the United Kingdom and
    // France as `fragile` — and 28 of 50 nations volatile or worse — passed the
    // whole suite. Content targets these bands, and a hostage scenario cast on
    // `fragile` duly staged an armed group in the American interior. Ranking
    // tests cannot catch that: the ordering was fine, the cut was not.
    describe("stability calibration", () => {
        it("does not rate a functioning great power as a state losing control", () => {
            for (const id of ["USA", "GBR", "DEU", "JPN", "CHN"]) {
                expect(nation(id).bands.stabilityBand, id).toBe("stable");
            }
        });
        it("still rates a state that has lost its territory as collapsing", () => {
            for (const id of ["AFG", "SYR", "YEM", "NGA"]) {
                expect(nation(id).bands.stabilityBand, id).toBe("collapsing");
            }
        });
        // Loud politics is not state failure. France carries heavy factional and
        // protest pressure and governs its whole territory; it belongs under
        // strain, not among the contested.
        it("reads sustained political contention as strain rather than breakdown", () => {
            for (const id of ["FRA", "ITA", "ESP"]) {
                expect(nation(id).bands.stabilityBand, id).toBe("fragile");
            }
        });
        // A formula that clamps a dozen nations to exactly zero carries no
        // information about any of them: Brazil and Yemen would score the same.
        it("keeps resolution across the bottom of the distribution", () => {
            const floored = worldDataset.nations.filter((n) => stabilityScore(n.stats) === 0);
            expect(floored.length).toBeLessThanOrEqual(2);
            expect(stabilityScore(nation("BRA").stats)).toBeGreaterThan(stabilityScore(nation("YEM").stats));
        });
        // A world where most states are failing is a world where the bands carry
        // no signal — every scenario targeting instability matches almost anyone.
        it("leaves most of the world governable", () => {
            const contested = worldDataset.nations.filter((n) => ["volatile", "collapsing"].includes(n.bands.stabilityBand));
            expect(contested.length).toBeLessThan(worldDataset.nations.length / 2);
        });
    });
    it("separates aggregate power from per-capita wealth", () => {
        // China outweighs Switzerland and is poorer per head. A single tier could
        // not say both, which is why there are two.
        expect(nation("CHN").bands.powerTier).toBeGreaterThan(nation("CHE").bands.powerTier);
        expect(nation("CHN").bands.wealthTier).toBeLessThan(nation("CHE").bands.wealthTier);
    });
    it("spreads nations across every band rather than clustering them", () => {
        const spread = (pick) => new Set(worldDataset.nations.map(pick)).size;
        expect(spread((n) => n.bands.archetype)).toBe(NationArchetype.options.length);
        expect(spread((n) => n.bands.powerTier)).toBe(5);
        expect(spread((n) => n.bands.militaryTier)).toBe(5);
        expect(spread((n) => n.bands.wealthTier)).toBe(5);
        expect(spread((n) => n.bands.stabilityBand)).toBe(4);
        expect(spread((n) => n.bands.alignmentBand)).toBeGreaterThanOrEqual(4);
    });
    it("leaves no band so rare that content written for it would never fire", () => {
        for (const archetype of NationArchetype.options) {
            const count = worldDataset.nations.filter((n) => n.bands.archetype === archetype).length;
            expect(count, `${archetype} is populated`).toBeGreaterThan(0);
        }
    });
    it("reads alignment off the organization registry, not a second hand-typed list", () => {
        // Nations author no memberships of their own; assembly mirrors them from
        // the organizations, and alignment follows from that.
        expect(nation("DEU").memberships.length).toBeGreaterThan(0);
        expect(nation("DEU").bands.alignmentBand).toBe("aligned");
        expect(nation("RUS").bands.alignmentBand).toBe("opposed");
        expect(nation("CHE").bands.alignmentBand).toBe("neutral");
    });
    // How a nation stands toward the player is a fact about a pair, and the
    // dataset is built before a player exists — so a band on one nation claiming
    // to hold it could only ever be a seed nobody updates.
    it("derives no band that claims to know a player who does not exist yet", () => {
        for (const n of worldDataset.nations) {
            expect(Object.keys(n.bands), `${n.id}`).not.toContain("relationshipBand");
        }
    });
});
// The claim this file exists to defend: content targets bands, so the roster
// can grow without content growing with it.
describe("adding a nation", () => {
    const invented = {
        ...nation("POL"),
        id: "ZZZ",
        identity: { ...nation("POL").identity, name: "Novaria", adjective: "Novarian", capital: "Vel" },
        geo: { ...nation("POL").geo, neighbors: [], chokepoints: [] },
        // Its own tickets, not the ones it was cloned from. Two countries cannot
        // field the same party, and the validator says so — which is the whole
        // reason a party system is a fact about a country rather than its charter.
        partySystem: {
            contest: "multiparty",
            parties: [
                {
                    id: "party-zzz-national",
                    name: "Novarian National Union",
                    shortName: "National Union",
                    kind: "major",
                    beliefs: { economicLeftRight: 0.2, authLibertarian: 0.3, nationalistGlobalist: 0.5 },
                    cohesion: 0.7,
                },
                {
                    id: "party-zzz-labour",
                    name: "Novarian Labour Front",
                    shortName: "Labour Front",
                    kind: "major",
                    beliefs: { economicLeftRight: -0.4, authLibertarian: -0.1, nationalistGlobalist: -0.2 },
                    cohesion: 0.7,
                },
            ],
        },
    };
    it("needs no code change — derivation places it on its stats alone", () => {
        const placed = applyBands(applyMemberships(applyGeography([invented])))[0];
        expect(() => NationBands.parse(placed.bands)).not.toThrow();
        expect(NationArchetype.options).toContain(placed.bands.archetype);
    });
    it("lands in bands that already exist, so no content has to be written for it", () => {
        const placed = applyBands(applyMemberships(applyGeography([invented])))[0];
        const existing = {
            archetype: new Set(worldDataset.nations.map((n) => n.bands.archetype)),
            power: new Set(worldDataset.nations.map((n) => n.bands.powerTier)),
            military: new Set(worldDataset.nations.map((n) => n.bands.militaryTier)),
            stability: new Set(worldDataset.nations.map((n) => n.bands.stabilityBand)),
        };
        expect(existing.archetype.has(placed.bands.archetype)).toBe(true);
        expect(existing.power.has(placed.bands.powerTier)).toBe(true);
        expect(existing.military.has(placed.bands.militaryTier)).toBe(true);
        expect(existing.stability.has(placed.bands.stabilityBand)).toBe(true);
    });
    it("validates as part of the dataset with no exemption", () => {
        const placed = applyBands(applyMemberships(applyGeography([invented])))[0];
        const capital = {
            id: "CITY-ZZZ-vel",
            nation: placed.id,
            name: placed.identity.capital,
            kind: "capital",
            lat: placed.geo.lat,
            lon: placed.geo.lon,
            population: 500_000,
            employment: 250_000,
            taxBase: 4_000,
        };
        const grown = {
            ...worldDataset,
            nations: [...worldDataset.nations, placed],
            cities: [...worldDataset.cities, capital],
        };
        expect(validateDataset(grown)).toEqual([]);
    });
    it("does not disturb the nations already there", () => {
        const before = JSON.stringify(worldDataset.nations.map((n) => n.bands));
        applyBands(applyMemberships(applyGeography([invented])));
        expect(JSON.stringify(worldDataset.nations.map((n) => n.bands))).toBe(before);
    });
});
