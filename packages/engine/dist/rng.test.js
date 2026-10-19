import { describe, it, expect } from "vitest";
import { createRngStreams, makeCampaignSeed, replay } from "./rng.js";
describe("rng streams", () => {
    it("is deterministic for a given seed and stream key", () => {
        const seed = makeCampaignSeed("campaign-1");
        const a = createRngStreams(seed).stream("nation:usa", "economy", 3);
        const b = createRngStreams(seed).stream("nation:usa", "economy", 3);
        const drawsA = Array.from({ length: 10 }, () => a.next());
        const drawsB = Array.from({ length: 10 }, () => b.next());
        expect(drawsA).toEqual(drawsB);
    });
    it("gives different streams different sequences", () => {
        const seed = makeCampaignSeed("campaign-1");
        const streams = createRngStreams(seed);
        const econ = streams.stream("nation:usa", "economy", 3).next();
        const mil = streams.stream("nation:usa", "military", 3).next();
        expect(econ).not.toEqual(mil);
    });
    it("is insensitive to the order unrelated streams are drawn in", () => {
        const seed = makeCampaignSeed("campaign-1");
        const orderOne = createRngStreams(seed);
        const first = orderOne.stream("a").next();
        const second = orderOne.stream("b").next();
        const orderTwo = createRngStreams(seed);
        const secondAgain = orderTwo.stream("b").next();
        const firstAgain = orderTwo.stream("a").next();
        expect(first).toEqual(firstAgain);
        expect(second).toEqual(secondAgain);
    });
    it("nextInt stays within [min, max)", () => {
        const stream = createRngStreams(makeCampaignSeed("s")).stream("k");
        for (let i = 0; i < 200; i++) {
            const n = stream.nextInt(5, 10);
            expect(n).toBeGreaterThanOrEqual(5);
            expect(n).toBeLessThan(10);
        }
    });
    it("pick throws on an empty list", () => {
        const stream = createRngStreams(makeCampaignSeed("s")).stream("k");
        expect(() => stream.pick([])).toThrow();
    });
    it("replay produces byte-identical results for the same seed and program", () => {
        const seed = makeCampaignSeed("replay-seed");
        const program = (streams) => {
            const a = streams.stream("nation:a", "turn", 1);
            const b = streams.stream("nation:b", "turn", 1);
            return {
                a: Array.from({ length: 5 }, () => a.next()),
                b: Array.from({ length: 5 }, () => b.next()),
            };
        };
        const [first, second] = replay(seed, program);
        expect(first).toEqual(second);
    });
});
