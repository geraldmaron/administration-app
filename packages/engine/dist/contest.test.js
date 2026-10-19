import { describe, expect, it } from "vitest";
import { Nation } from "@admin/world";
import { buildCampaign, nationA } from "./__fixtures__/campaign.js";
import { nuclearReading } from "./forces.js";
import { CONTEST_DIALS, CONTEST_LAYERS } from "./contest-dials.js";
import { assessContest } from "./contest.js";
import { contestBetween, liveForceDomains, liveNuclearReading } from "./resolution.js";
import { selectNation } from "./state-selectors.js";
const USA = "USA";
const ALP = "ALP";
const INSTRUMENTS = ["military", "economic", "diplomatic", "covert", "assistance"];
function liveNation(campaign, id) {
    const runtime = selectNation(campaign, id);
    return { ...runtime.base, stats: runtime.stats, traits: runtime.traits };
}
describe("the dials", () => {
    it("weights every instrument's layers to exactly one, so an edge of 1 means every layer won", () => {
        for (const instrument of INSTRUMENTS) {
            const weights = CONTEST_DIALS.weights[instrument];
            const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
            expect(total).toBeCloseTo(1, 6);
        }
    });
    it("names a weight for every layer the instrument declares, and no others", () => {
        for (const instrument of INSTRUMENTS) {
            expect(Object.keys(CONTEST_DIALS.weights[instrument]).sort()).toEqual([...CONTEST_LAYERS[instrument]].sort());
        }
    });
});
describe("the contest", () => {
    const campaign = buildCampaign();
    it("draws the layers the instrument is declared to be decided on", () => {
        for (const instrument of INSTRUMENTS) {
            const contest = contestBetween(campaign, USA, ALP, instrument);
            expect(contest.layers.map((layer) => layer.id)).toEqual([...CONTEST_LAYERS[instrument]]);
        }
    });
    it("keeps the odds inside the floor and ceiling however lopsided the matchup", () => {
        for (const instrument of INSTRUMENTS) {
            const contest = contestBetween(campaign, USA, ALP, instrument);
            expect(contest.baseChance).toBeGreaterThanOrEqual(CONTEST_DIALS.floor);
            expect(contest.baseChance).toBeLessThanOrEqual(CONTEST_DIALS.ceiling);
        }
    });
    it("gives every layer both sides' evidence, not just a number", () => {
        const contest = contestBetween(campaign, USA, ALP, "military");
        for (const layer of contest.layers) {
            expect(layer.yours.figure.length).toBeGreaterThan(0);
            expect(layer.theirs.figure.length).toBeGreaterThan(0);
            expect(layer.question.length).toBeGreaterThan(0);
            expect(layer.edge).toBeCloseTo(layer.yours.score - layer.theirs.score, 6);
        }
    });
    // The fixture's two countries are the same country twice, which is the
    // cleanest test the model can be given: everything except being the one who
    // has to travel cancels out.
    it("reads two identical forces as even in every domain and the defender ahead on home ground", () => {
        const contest = contestBetween(campaign, USA, ALP, "military");
        const domains = contest.layers.filter((layer) => layer.id !== "reach" && layer.id !== "sustainment");
        for (const domain of domains)
            expect(domain.edge).toBeCloseTo(0, 6);
        expect(contest.layers.find((layer) => layer.id === "reach").edge).toBeLessThan(0);
        expect(contest.edge).toBeLessThan(0);
        expect(contest.baseChance).toBeLessThan(0.5);
    });
    it("gives the same reading whichever of two identical governments is the one attacking", () => {
        const forward = contestBetween(campaign, USA, ALP, "military");
        const back = contestBetween(campaign, ALP, USA, "military");
        expect(back.edge).toBeCloseTo(forward.edge, 6);
    });
    it("puts a real economy's grip on the layer that decides an economic act", () => {
        const contest = contestBetween(campaign, USA, ALP, "economic");
        const dependence = contest.layers.find((layer) => layer.id === "dependence");
        // Two countries with no trade between them are not evenly matched on
        // coercion: one has no lever and the other cannot feel one.
        expect(dependence.theirs.score).toBeGreaterThan(dependence.yours.score);
    });
    it("takes repetition off the edge rather than out of either side's forces", () => {
        const actor = liveNation(campaign, USA);
        const target = liveNation(campaign, ALP);
        const fresh = assessContest({ actor, target, instrument: "economic", tension: 0.2 });
        const worn = assessContest({ actor, target, instrument: "economic", tension: 0.2, habituation: 0.3 });
        expect(worn.edge).toBeCloseTo(fresh.edge - 0.3, 6);
        expect(worn.layers).toEqual(fresh.layers);
    });
    it("charges distance to the layer that pays it, so the player can see what reach cost them", () => {
        const actor = liveNation(campaign, USA);
        const target = liveNation(campaign, ALP);
        const near = assessContest({ actor, target, instrument: "military", tension: 0.2, distanceMultiplier: 1 });
        const far = assessContest({ actor, target, instrument: "military", tension: 0.2, distanceMultiplier: 3 });
        const reachOf = (contest) => contest.layers.find((layer) => layer.id === "reach").yours.score;
        expect(reachOf(far)).toBeLessThan(reachOf(near));
        expect(far.edge).toBeLessThan(near.edge);
    });
    it("moves with its dials, so balance is tuned in one file rather than hunted for", () => {
        const actor = liveNation(campaign, USA);
        const target = liveNation(campaign, ALP);
        const standard = assessContest({ actor, target, instrument: "military", tension: 0.2 });
        const flattened = assessContest({
            actor,
            target,
            instrument: "military",
            tension: 0.2,
            dials: { ...CONTEST_DIALS, contrast: 0.1 },
        });
        // A flatter contrast leaves the same matchup and moves the odds it implies
        // toward an even bet — the one dial that decides how much a lopsided
        // matchup is worth.
        expect(Math.abs(flattened.baseChance - 0.5)).toBeLessThan(Math.abs(standard.baseChance - 0.5));
        expect(flattened.edge).toBeCloseTo(standard.edge, 6);
    });
    it("has no contest with itself", () => {
        expect(contestBetween(campaign, USA, USA, "military")).toBeUndefined();
    });
});
describe("what a force is made of", () => {
    const campaign = buildCampaign();
    it("answers the same five domains for a country with an authored order of battle and one without", () => {
        const ours = liveForceDomains(campaign, USA);
        const theirs = liveForceDomains(campaign, ALP);
        expect(ours.map((domain) => domain.id)).toEqual(theirs.map((domain) => domain.id));
        for (const domain of theirs) {
            expect(domain.personnel).toBeGreaterThan(0);
            expect(domain.question.length).toBeGreaterThan(0);
        }
    });
    it("names formations only where the dataset counted them", () => {
        const inferred = liveForceDomains(campaign, ALP).filter((domain) => !domain.authored);
        for (const domain of inferred) {
            expect(domain.holdings).toEqual([]);
        }
    });
    it("reads no arsenal as no threat, and a large one as barely worse than a medium one", () => {
        expect(liveNuclearReading(campaign, USA).severity).toBe(0);
        const armed = (warheads, deliveryTriad) => nuclearReading(Nation.parse({
            ...nationA,
            stats: { ...nationA.stats, military: { ...nationA.stats.military, arsenal: { warheads, deliveryTriad } } },
        }));
        const modest = armed(200, true);
        const vast = armed(5_000, true);
        expect(modest.severity).toBeGreaterThan(0);
        expect(vast.severity).toBeGreaterThan(modest.severity);
        // The whole game is between zero and two hundred; the rest is arithmetic.
        expect(vast.severity - modest.severity).toBeLessThan(modest.severity);
        expect(armed(200, false).severity).toBeLessThan(modest.severity);
    });
});
describe("the covert board", () => {
    it("grades the target's cover in words rather than printing the stat that hides things", () => {
        const contest = contestBetween(buildCampaign(), USA, ALP, "covert");
        const collection = contest.layers.find((entry) => entry.id === "collection");
        expect(collection.theirs.caption).toBe("counter-intelligence");
        expect(collection.theirs.figure).not.toMatch(/\d/);
        expect(["Porous", "Ordinary", "Tight", "Sealed"]).toContain(collection.theirs.figure);
        // Our own collection reach is ours to know to the percent.
        expect(collection.yours.figure).toMatch(/%$/);
    });
});
// A blockade is decided at sea. The layer weights put ground above sea for an
// act with no arm named, and a naval act read through them priced a blockade
// on the size of the army ashore.
describe("a naval act", () => {
    const campaign = buildCampaign();
    const input = { actor: liveNation(campaign, USA), target: liveNation(campaign, ALP), instrument: "military", tension: 0.5 };
    const weightOf = (contest, id) => contest.layers.find((layer) => layer.id === id).weight;
    it("weighs the sea above the ground for a blockade, and leaves every other rung as it was", () => {
        const blockade = assessContest({ ...input, rung: 3 });
        const strike = assessContest({ ...input, rung: 4 });
        expect(weightOf(blockade, "sea")).toBeGreaterThan(weightOf(blockade, "ground"));
        expect(weightOf(strike, "ground")).toBe(CONTEST_DIALS.weights.military.ground);
        expect(weightOf(strike, "sea")).toBe(CONTEST_DIALS.weights.military.sea);
        expect(blockade.layers.reduce((sum, layer) => sum + layer.weight, 0)).toBeCloseTo(1, 9);
    });
});
