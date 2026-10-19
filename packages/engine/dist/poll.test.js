import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { SAMPLE_MARGIN, trackingPoll } from "./poll.js";
import { selectApproval } from "./opinion.js";
import { createRngStreams } from "./rng.js";
describe("the weekly tracking poll", () => {
    it("stays inside its band and reads the same number twice", () => {
        const campaign = buildCampaign();
        const first = trackingPoll(campaign);
        const again = trackingPoll(campaign);
        expect(again).toEqual(first);
        expect(first.low).toBeLessThanOrEqual(first.reading);
        expect(first.reading).toBeLessThanOrEqual(first.high);
        expect(first.high - first.low).toBeLessThanOrEqual(0.06 + 1e-9);
    });
    it("is not the true approval, and moves week to week when nothing else has", () => {
        const campaign = buildCampaign();
        const weeks = [1, 2, 3, 4, 5].map((turn) => trackingPoll({ ...campaign, turn }).reading);
        expect(new Set(weeks).size).toBe(weeks.length);
        expect(weeks.some((reading) => reading !== selectApproval(campaign))).toBe(true);
        for (const reading of weeks)
            expect(Math.abs(reading - selectApproval(campaign))).toBeLessThanOrEqual(SAMPLE_MARGIN + 1e-9);
    });
    it("draws no stream, so the error cannot reshuffle anything seeded after it", () => {
        // The error is a hash of the seed and the week rather than a draw off a
        // stream with a position in it: reading the poll a hundred times leaves
        // every other draw in the campaign where it was.
        const campaign = buildCampaign();
        const streams = createRngStreams(campaign.seed);
        const before = streams.stream("anything", 1).next();
        for (let i = 0; i < 100; i += 1)
            trackingPoll(campaign);
        expect(createRngStreams(campaign.seed).stream("anything", 1).next()).toBe(before);
    });
});
