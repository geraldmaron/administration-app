import { describe, it, expect } from "vitest";
import { TRAIT_KEYS, nationTraitProfiles, worldDataset } from "@admin/world";
import { createRngStreams, makeCampaignSeed, replay } from "./rng.js";
import { rollNationTraits, rollWorldTraits } from "./traits.js";
const seeds = Array.from({ length: 200 }, (_, i) => makeCampaignSeed(`jitter-seed-${i}`));
describe("per-campaign trait rolls", () => {
    it("is reproducible: the same seed rolls the identical world twice", () => {
        const [first, second] = replay(makeCampaignSeed("repeat"), (streams) => rollWorldTraits(worldDataset.nations, nationTraitProfiles, streams));
        expect(first).toEqual(second);
    });
    it("keeps every rolled value inside its authored range across many seeds", () => {
        for (const seed of seeds) {
            const streams = createRngStreams(seed);
            for (const profile of nationTraitProfiles) {
                const rolled = rollNationTraits(profile, streams);
                for (const key of TRAIT_KEYS) {
                    const { min, max } = profile.ranges[key];
                    const value = rolled[key];
                    expect(value, `${profile.nation}.${key} @ ${seed}`).toBeGreaterThanOrEqual(min);
                    expect(value, `${profile.nation}.${key} @ ${seed}`).toBeLessThanOrEqual(max);
                }
            }
        }
    });
    it("only ever selects agendas the nation was authored as a candidate for", () => {
        for (const seed of seeds.slice(0, 25)) {
            const streams = createRngStreams(seed);
            for (const profile of nationTraitProfiles) {
                const rolled = rollNationTraits(profile, streams);
                expect(rolled.agendas).toHaveLength(profile.agendaCount);
                const candidateIds = new Set(profile.candidateAgendas.map((a) => a.id));
                const rolledIds = new Set(rolled.agendas.map((a) => a.id));
                expect(rolledIds.size, `${profile.nation} agendas are distinct`).toBe(rolled.agendas.length);
                for (const id of rolledIds)
                    expect(candidateIds.has(id)).toBe(true);
            }
        }
    });
    it("draws different agendas for the same nation across seeds, not a fixed pair", () => {
        const profile = nationTraitProfiles.find((p) => p.candidateAgendas.length >= 4);
        const combinations = new Set(seeds.map((seed) => rollNationTraits(profile, createRngStreams(seed))
            .agendas.map((a) => a.id)
            .sort()
            .join("+")));
        expect(combinations.size).toBeGreaterThan(1);
    });
    it("adding a nation does not disturb another nation's roll for the same seed", () => {
        const streams = createRngStreams(makeCampaignSeed("stability"));
        const subject = nationTraitProfiles[3];
        const alone = rollNationTraits(subject, streams);
        const inCrowd = rollWorldTraits(worldDataset.nations, nationTraitProfiles, streams).find((n) => n.id === subject.nation);
        expect(inCrowd.traits).toEqual(alone);
    });
});
// A stand-in for the NPC agent that has not been built yet: a fixed decision
// script scored purely from a nation's rolled personality. If two campaigns
// rank the same options differently, the agent reading those same traits will
// choose differently too.
const OPTIONS = [
    { id: "escalate", score: (t) => t.aggression * 2 + t.riskTolerance - t.legalism },
    { id: "negotiate", score: (t) => t.reliability + t.transparency - t.vengefulness },
    { id: "withdraw", score: (t) => t.isolationism * 2 - t.opportunism },
    { id: "exploit", score: (t) => t.opportunism * 2 + t.riskTolerance - t.reliability },
];
function decisionScript(seed) {
    const streams = createRngStreams(makeCampaignSeed(seed));
    return rollWorldTraits(worldDataset.nations, nationTraitProfiles, streams).map((nation) => {
        const best = [...OPTIONS].sort((a, b) => b.score(nation.traits) - a.score(nation.traits))[0];
        return `${nation.id}:${best.id}`;
    });
}
describe("campaign divergence", () => {
    it("two seeds produce measurably different NPC behavior under an identical script", () => {
        const a = decisionScript("campaign-alpha");
        const b = decisionScript("campaign-beta");
        const changed = a.filter((choice, i) => choice !== b[i]).length;
        expect(changed).toBeGreaterThan(0);
    });
    it("but the same seed replays the identical script — divergence comes from the seed, not from noise", () => {
        expect(decisionScript("campaign-alpha")).toEqual(decisionScript("campaign-alpha"));
    });
});
