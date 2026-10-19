import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { QUESTION_TERMS, noiseFrom, projectWillingness, stampOf, weigh, } from "./willingness.js";
const THRESHOLD = 0.5;
const BOUND = 0.05;
/**
 * A term set built out of a campaign, so "the same answer on a cloned campaign"
 * is a claim about the arithmetic reading real state rather than about two
 * copies of one literal.
 */
function governorTerms(campaign) {
    const polarization = campaign.player.opinion.polarization;
    return [
        { key: "party-match", source: "interest", value: 0.3 },
        { key: "state-lean", source: "situation", value: 0.18 },
        { key: "disaster-size", source: "situation", value: 0.12 },
        { key: "character", source: "trait", value: 0.1 - polarization / 10 },
    ];
}
/** Counts every stream a subject touches, so "draws nothing" is measured, not asserted. */
function spyStreams() {
    const real = createRngStreams(makeCampaignSeed("willingness-spy"));
    let count = 0;
    return {
        streams: {
            stream(...keyParts) {
                count += 1;
                return real.stream(...keyParts);
            },
        },
        draws: () => count,
    };
}
describe("weigh is the one place a willingness decision is settled", () => {
    it("sums the weighted terms and clears or misses the question's threshold", () => {
        const terms = governorTerms(buildCampaign());
        const willing = weigh("governor-consent", terms, { threshold: THRESHOLD, noiseBound: BOUND, noise: 0 });
        expect(willing.score).toBeCloseTo(terms.reduce((total, term) => total + term.value, 0), 6);
        expect(willing.margin).toBeCloseTo(willing.score - THRESHOLD, 6);
        expect(willing.acts).toBe(willing.margin >= 0);
        const refused = weigh("governor-consent", terms, { threshold: 0.9, noiseBound: BOUND, noise: 0 });
        expect(refused.acts).toBe(false);
        // A refusal still says how near it came; that is what the record is for.
        expect(refused.margin).toBeLessThan(0);
    });
    it("gives the same answer twice, and on a cloned campaign", () => {
        const campaign = buildCampaign();
        const clone = JSON.parse(JSON.stringify(campaign));
        const options = { threshold: THRESHOLD, noiseBound: BOUND, noise: noiseFrom(0.73, BOUND) };
        const first = weigh("governor-consent", governorTerms(campaign), options);
        const second = weigh("governor-consent", governorTerms(campaign), options);
        const onClone = weigh("governor-consent", governorTerms(clone), options);
        expect(second).toEqual(first);
        expect(onClone).toEqual(first);
    });
    it("refuses noise it did not bound, and a term the question cannot weigh", () => {
        const terms = governorTerms(buildCampaign());
        expect(() => weigh("governor-consent", terms, { threshold: THRESHOLD, noiseBound: BOUND, noise: 0.2 })).toThrow(/outside ±0.05/);
        expect(() => weigh("governor-consent", [{ key: "loyalty", source: "trait", value: 0.4 }], {
            threshold: THRESHOLD,
            noiseBound: BOUND,
            noise: 0,
        })).toThrow(/cannot weigh the term "loyalty"/);
    });
    it("maps a stream draw into the band and nowhere outside it", () => {
        for (const draw of [0, 0.25, 0.5, 0.999999]) {
            expect(Math.abs(noiseFrom(draw, BOUND))).toBeLessThanOrEqual(BOUND);
        }
        expect(noiseFrom(0.5, BOUND)).toBe(0);
        expect(() => noiseFrom(1, BOUND)).toThrow(/\[0, 1\)/);
    });
    it("every question declares at least one term, and every declared term is weighable", () => {
        for (const [question, keys] of Object.entries(QUESTION_TERMS)) {
            expect(keys.length, question).toBeGreaterThan(0);
            const terms = keys.map((key) => ({ key, source: "situation", value: 0.01 }));
            expect(() => weigh(question, terms, { threshold: 0, noiseBound: BOUND, noise: 0 })).not.toThrow();
        }
    });
});
describe("the projection is the decision without the draw", () => {
    it("equals weigh with zero noise", () => {
        const terms = governorTerms(buildCampaign());
        const projected = projectWillingness("governor-consent", terms, { threshold: THRESHOLD, noiseBound: BOUND });
        const weighed = weigh("governor-consent", terms, { threshold: THRESHOLD, noiseBound: BOUND, noise: 0 });
        expect(projected.score).toBe(weighed.score);
        expect(projected.margin).toBe(weighed.margin);
        expect(projected.forecast === "unlikely").toBe(!weighed.acts);
    });
    it("consumes no stream, while the decision it projects draws exactly once", () => {
        const terms = governorTerms(buildCampaign());
        const spy = spyStreams();
        projectWillingness("governor-consent", terms, { threshold: THRESHOLD, noiseBound: BOUND });
        expect(spy.draws()).toBe(0);
        const draw = spy.streams.stream("will", "governor-consent", "USA", "CO").next();
        weigh("governor-consent", terms, { threshold: THRESHOLD, noiseBound: BOUND, noise: noiseFrom(draw, BOUND) });
        expect(spy.draws()).toBe(1);
    });
    it("says a close call rather than naming an outcome the noise could reverse", () => {
        const terms = [{ key: "party-match", source: "interest", value: 0.52 }];
        expect(projectWillingness("governor-consent", terms, { threshold: 0.5, noiseBound: BOUND }).forecast).toBe("close");
        expect(projectWillingness("governor-consent", terms, { threshold: 0.4, noiseBound: BOUND }).forecast).toBe("likely");
        expect(projectWillingness("governor-consent", terms, { threshold: 0.7, noiseBound: BOUND }).forecast).toBe("unlikely");
    });
    it("names the terms that moved it, largest pull first, and never a term worth nothing", () => {
        const terms = [
            { key: "party-match", source: "interest", value: 0.1 },
            { key: "state-lean", source: "situation", value: -0.4 },
            { key: "disaster-size", source: "situation", value: 0.25 },
            { key: "character", source: "trait", value: 0 },
        ];
        expect(projectWillingness("governor-consent", terms, { threshold: 0, noiseBound: BOUND }).leading).toEqual([
            "state-lean",
            "disaster-size",
            "party-match",
        ]);
    });
    it("is seed-independent: two campaigns seeded differently project the same terms alike", () => {
        const terms = governorTerms(buildCampaign());
        const options = { threshold: THRESHOLD, noiseBound: BOUND };
        expect(projectWillingness("governor-consent", terms, options)).toEqual(projectWillingness("governor-consent", terms, options));
    });
});
describe("the stamp is the reason of record", () => {
    it("carries the terms, the arithmetic and whether the noise decided it", () => {
        const terms = governorTerms(buildCampaign());
        const willing = weigh("governor-consent", terms, { threshold: THRESHOLD, noiseBound: BOUND, noise: 0.01 });
        const stamp = stampOf(willing, "USA", "CO", "public");
        expect(stamp.question).toBe("governor-consent");
        expect(stamp.actor).toBe("USA");
        expect(stamp.subject).toBe("CO");
        expect(stamp.terms).toEqual(willing.terms);
        expect(stamp.score).toBe(willing.score);
        expect(stamp.threshold).toBe(THRESHOLD);
        expect(stamp.acts).toBe(willing.acts);
        expect(stamp.visibility).toBe("public");
        expect(stamp.close).toBe(Math.abs(willing.margin) < BOUND);
    });
    it("leaves the subject key off rather than storing an empty one", () => {
        const willing = weigh("unrest-onset", [{ key: "driving-act", source: "situation", value: 0.9 }], {
            threshold: 0.5,
            noiseBound: BOUND,
            noise: 0,
        });
        const stamp = stampOf(willing, "USA", undefined, "intelligence");
        expect("subject" in stamp).toBe(false);
        expect(stamp.acts).toBe(true);
    });
    it("survives a structured clone unchanged, which is what a save round-trip is", () => {
        const willing = weigh("minister-offer", [{ key: "loyalty", source: "trait", value: -0.6 }], {
            threshold: -0.5,
            noiseBound: BOUND,
            noise: noiseFrom(0.2, BOUND),
        });
        const stamp = stampOf(willing, "PER-1", "role-state", "public");
        expect(JSON.parse(JSON.stringify(stamp))).toEqual(stamp);
    });
});
