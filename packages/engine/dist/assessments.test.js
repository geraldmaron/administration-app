import { describe, expect, it } from "vitest";
import { LIKELIHOOD_LADDER, assessBehavior, commissionAssessment, draftAssessment, pressAssessment, selectAlteredAssessments, selectAssessments, } from "./assessments.js";
import { closeTasking, icElement, intelligencePhase, selectCollectionProducts, taskCollection, } from "./intelligence.js";
import { apply } from "./effects.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { makeCampaignSeed } from "./rng.js";
const CONFIDENCE_ORDER = ["low", "moderate", "high"];
/** The four elements an intent judgment is actually written out of. */
const INTENT_COMMUNITY = ["IC-CIA", "IC-NSA", "IC-INR", "IC-DIA"];
describe("what an assessment carries", () => {
    it("holds likelihood and confidence as separate answers", () => {
        const draft = draftAssessment(buildCampaign(), "intent", "ALP");
        expect(LIKELIHOOD_LADDER).toContain(draft.likelihood);
        expect(["low", "moderate", "high"]).toContain(draft.confidence);
        expect(draft.confidenceBasis.length).toBeGreaterThan(0);
    });
    it("characterizes its sources, names an alternative, and says what it is missing when it is unsure", () => {
        const campaign = buildCampaign();
        const draft = draftAssessment(campaign, "intent", "ALP");
        expect(draft.sources.length).toBeGreaterThan(0);
        expect(draft.alternative).toContain("alternative reading");
        if (draft.confidence !== "high")
            expect(draft.gaps.length).toBeGreaterThan(0);
    });
    it("reads the same world the player is in rather than a private oracle", () => {
        const campaign = buildCampaign();
        const calm = draftAssessment(campaign, "stability", "ALP");
        const runtime = campaign.nations["ALP"];
        const strained = {
            ...campaign,
            nations: {
                ...campaign.nations,
                ["ALP"]: {
                    ...runtime,
                    stats: {
                        ...runtime.stats,
                        politics: { ...runtime.stats.politics, protestPressure: 0.9, factionalism: 0.9, regimeStability: 0.1 },
                    },
                },
            },
        };
        const shaken = draftAssessment(strained, "stability", "ALP");
        expect(LIKELIHOOD_LADDER.indexOf(shaken.likelihood)).toBeGreaterThan(LIKELIHOOD_LADDER.indexOf(calm.likelihood));
    });
    it("attributes dissent to an element rather than filing it away", () => {
        const campaign = buildCampaign();
        const hollowed = {
            ...campaign,
            institutions: {
                ...campaign.institutions,
                "INST-INR": { ...campaign.institutions["INST-INR"], implementationQuality: 0.1 },
            },
        };
        const draft = draftAssessment(hollowed, "intent", "ALP");
        expect(draft.dissents.some((entry) => entry.element === "IC-INR")).toBe(true);
    });
});
describe("leaning on the community", () => {
    it("moves the wording, leaves the confidence alone, and says on the paper that it moved", () => {
        const campaign = buildCampaign();
        const commissioned = commissionAssessment(campaign, "intent", "ALP");
        if (!commissioned.ok)
            throw new Error("expected an assessment");
        const issued = apply(campaign, commissioned.packet);
        const before = selectAssessments(issued)[0];
        const pressed = pressAssessment(issued, before.id, "harden", "The President wants this stated plainly.");
        expect(pressed.ok).toBe(true);
        if (!pressed.ok)
            return;
        const after = apply(issued, pressed.packet);
        const rewritten = selectAssessments(after)[0];
        expect(LIKELIHOOD_LADDER.indexOf(rewritten.likelihood)).toBe(LIKELIHOOD_LADDER.indexOf(before.likelihood) + 1);
        expect(rewritten.confidence).toBe(before.confidence);
        expect(rewritten.changes).toHaveLength(1);
        expect(rewritten.dissents.length).toBeGreaterThan(before.dissents.length);
        expect(selectAlteredAssessments(after)).toHaveLength(1);
    });
    it("costs the agency that wrote it, and the cost is still there next time", () => {
        const campaign = buildCampaign();
        const commissioned = commissionAssessment(campaign, "intent", "ALP");
        if (!commissioned.ok)
            throw new Error("expected an assessment");
        const issued = apply(campaign, commissioned.packet);
        const before = issued.institutions["INST-CIA"];
        const pressed = pressAssessment(issued, selectAssessments(issued)[0].id, "harden", "Say it plainly.");
        if (!pressed.ok)
            throw new Error("expected the pressure to land");
        const after = apply(issued, pressed.packet);
        const agency = after.institutions["INST-CIA"];
        expect(agency.politicization).toBeGreaterThan(before.politicization);
        expect(agency.morale).toBeLessThan(before.morale);
        expect(agency.integrity).toBeLessThan(before.integrity);
        // The product itself is worse afterward, which is the whole trade.
        expect(agency.implementationQuality).toBeLessThan(before.implementationQuality);
    });
    it("cannot push a judgment off the end of the ladder", () => {
        const campaign = buildCampaign();
        const commissioned = commissionAssessment(campaign, "intent", "ALP");
        if (!commissioned.ok)
            throw new Error("expected an assessment");
        let state = apply(campaign, commissioned.packet);
        const id = selectAssessments(state)[0].id;
        for (let attempt = 0; attempt < 6; attempt += 1) {
            const pressed = pressAssessment(state, id, "soften", "Tone it down.");
            if (!pressed.ok) {
                expect(pressed.reason).toContain("end of the ladder");
                return;
            }
            state = apply(state, pressed.packet);
        }
        throw new Error("the ladder had no end");
    });
});
describe("the behavior question", () => {
    const ALP = "ALP";
    it("words every trait as a judgment and never as the coefficient", () => {
        const behavior = assessBehavior(buildCampaign(), ALP);
        expect(behavior.traits).toHaveLength(8);
        for (const trait of behavior.traits) {
            expect(LIKELIHOOD_LADDER).toContain(trait.likelihood);
            expect(["slight", "moderate", "major"]).toContain(trait.reading.band);
            expect(Object.values(trait.reading)).not.toContain(buildCampaign().nations[ALP].traits[trait.key]);
        }
    });
    it("calls a foreign reading an intelligence assessment and its own government directly observed", () => {
        const campaign = buildCampaign();
        const theirs = assessBehavior(campaign, ALP);
        const ours = assessBehavior(campaign, campaign.founding.nation);
        expect(theirs.traits[0].reading.source).toBe("intelligence-assessment");
        expect(ours.traits[0].reading.source).toBe("directly-observable");
    });
    it("knows its own government at full confidence with nothing missing", () => {
        const campaign = buildCampaign();
        const ours = assessBehavior(campaign, campaign.founding.nation);
        expect(ours.confidence).toBe("high");
        expect(ours.gaps).toEqual([]);
        for (const trait of ours.traits)
            expect(trait.reading.gaps).toBeUndefined();
    });
    it("writes a thin-collection judgment toward the middle rather than confidently wrong", () => {
        const campaign = buildCampaign();
        const hollowed = {
            ...campaign,
            institutions: Object.fromEntries(Object.entries(campaign.institutions).map(([id, runtime]) => [
                id,
                { ...runtime, implementationQuality: 0.05, morale: 0.05, integrity: 0.05 },
            ])),
        };
        const full = assessBehavior(campaign, ALP);
        const thin = assessBehavior(hollowed, ALP);
        const distance = (ladder) => ladder.traits.reduce((sum, trait) => sum + Math.abs(LIKELIHOOD_LADDER.indexOf(trait.likelihood) - 2), 0);
        expect(distance(thin)).toBeLessThanOrEqual(distance(full));
        expect(thin.gaps.length).toBeGreaterThan(0);
        for (const trait of thin.traits)
            expect(trait.reading.gaps).toEqual(thin.gaps);
    });
    it("returns nothing for a country the campaign does not hold", () => {
        expect(assessBehavior(buildCampaign(), "NOWHERE")).toBeUndefined();
    });
});
// The successful branch of a tasking used to write one row and return: no
// product, no follow-up clock, nothing the analysis side ever read. The only
// way to make the community *do* something was to ask it for something
// unlawful, because the refusal branch was the only one that produced anything.
describe("what standing collection is worth to a judgment", () => {
    const TARGET = "ALP";
    function withPursuit(campaign) {
        const pursuit = { id: "pursuit:ALP:USA:assessment", actor: TARGET, target: campaign.founding.nation,
            aim: "security", openedTurn: campaign.turn, commitment: 0.4, progress: 0,
            rungReached: 1, overt: true, lastActedTurn: campaign.turn, status: "active", beats: [] };
        return { ...campaign, pursuits: { ...campaign.pursuits, [pursuit.id]: pursuit } };
    }
    /** Point one or more elements at the target, each in a discipline it runs. */
    function tasked(campaign, elements) {
        let working = withPursuit(campaign);
        for (const element of elements) {
            const discipline = icElement(element).disciplines[0];
            const result = taskCollection(working, {
                element,
                discipline,
                targetKind: "foreign-nation",
                target: TARGET,
                question: "What would it take for them to move on us?",
            });
            expect(result.ok, `${element} refused a lawful foreign tasking`).toBe(true);
            if (result.ok)
                working = apply(working, result.packet);
        }
        // These assertions exercise the successful branch. Find a replay seed that
        // actually yields findings; collection can also file no usable result.
        for (let index = 0; index < 1000; index++) {
            const candidate = { ...working, seed: makeCampaignSeed(`assessment-collection-${index}`) };
            const issued = intelligencePhase(candidate).reduce((state, packet) => apply(state, packet), candidate);
            if (selectCollectionProducts(issued).length === elements.length && selectCollectionProducts(issued).every((product) => product.status === "findings"))
                return candidate;
        }
        throw new Error("No seed yielded the requested collection findings");
    }
    /**
     * A community running at the ordinary national capability rather than the
     * fixture's slightly-below-average one, so the band the collection moves is
     * the band an average administration is actually sitting in.
     */
    function ordinaryCommunity() {
        const campaign = buildCampaign();
        const player = campaign.founding.nation;
        const runtime = campaign.nations[player];
        return {
            ...campaign,
            nations: {
                ...campaign.nations,
                [player]: {
                    ...runtime,
                    stats: { ...runtime.stats, security: { ...runtime.stats.security, intelCapability: 0.5 } },
                },
            },
        };
    }
    function filed(campaign) {
        let working = campaign;
        for (const packet of intelligencePhase(working))
            working = apply(working, packet);
        return working;
    }
    it("files a dated product against a standing requirement", () => {
        const working = filed(tasked(buildCampaign(), ["IC-CIA"]));
        const products = selectCollectionProducts(working);
        expect(products.length).toBe(1);
        expect(products[0].target).toBe(TARGET);
        expect(products[0].summary.length).toBeGreaterThan(0);
        expect(products[0].weight).toBeGreaterThan(0);
    });
    it("raises the confidence of the judgment the collection is against", () => {
        const bare = withPursuit(ordinaryCommunity());
        const collecting = filed(tasked(bare, INTENT_COMMUNITY));
        const without = draftAssessment({ ...bare, seed: collecting.seed }, "intent", TARGET);
        const withCollection = draftAssessment(collecting, "intent", TARGET);
        // Collection is about the evidence, never about the world: the likelihood
        // does not move an inch, which is the whole separation the product exists
        // to keep.
        expect(withCollection.likelihood).toBe(without.likelihood);
        expect(CONFIDENCE_ORDER.indexOf(withCollection.confidence)).toBeGreaterThan(CONFIDENCE_ORDER.indexOf(without.confidence));
        expect(withCollection.gaps.length).toBeLessThan(without.gaps.length);
    });
    it("says on the paper that the judgment is leaning on standing collection", () => {
        const collecting = filed(tasked(buildCampaign(), ["IC-CIA"]));
        expect(draftAssessment(collecting, "intent", TARGET).confidenceBasis).toContain("Standing collection");
        expect(draftAssessment(buildCampaign(), "intent", TARGET).confidenceBasis).not.toContain("Standing collection");
    });
    it("does not credit a force report to an intent judgment", () => {
        const campaign = withPursuit(buildCampaign());
        const request = taskCollection(campaign, { element: "IC-NSA", discipline: "sigint", targetKind: "foreign-nation",
            target: TARGET, question: "", focus: "force-posture" });
        if (!request.ok)
            throw new Error(request.reason);
        const taskedCampaign = apply(campaign, request.packet);
        const seed = Array.from({ length: 1000 }, (_, index) => makeCampaignSeed(`force-only-${index}`))
            .find((candidateSeed) => selectCollectionProducts(filed({ ...taskedCampaign, seed: candidateSeed }))[0]?.status === "findings");
        if (!seed)
            throw new Error("No force-posture seed yielded findings");
        const issued = filed({ ...taskedCampaign, seed });
        expect(selectCollectionProducts(issued)[0]?.findings?.every((finding) => finding.topic === "military-readiness")).toBe(true);
        expect(draftAssessment(issued, "intent", TARGET).confidenceBasis).not.toContain("Standing collection");
        expect(draftAssessment(issued, "capability", TARGET).confidenceBasis).toContain("Standing collection");
    });
    it("credits collection only against the question it was pointed at", () => {
        const collecting = filed(tasked(buildCampaign(), INTENT_COMMUNITY));
        // Order of battle is DIA, NGA, NRO and NSA. Two of those were never
        // tasked, and the capability judgment is not entitled to the human-source
        // reporting written about a different question.
        expect(draftAssessment(collecting, "capability", TARGET).confidenceBasis).toContain("Standing collection");
        const elsewhere = filed(tasked(buildCampaign(), ["IC-CIA"]));
        expect(draftAssessment(elsewhere, "capability", TARGET).confidenceBasis).not.toContain("Standing collection");
    });
    it("stops crediting collection once the element is taken off the question", () => {
        const collecting = filed(tasked(buildCampaign(), ["IC-CIA"]));
        const tasking = Object.values(collecting.security.intelligence.taskings)[0];
        const closed = closeTasking(collecting, tasking.id);
        expect(closed.ok).toBe(true);
        if (!closed.ok)
            return;
        const afterClose = apply(collecting, closed.packet);
        expect(selectCollectionProducts(afterClose)).toHaveLength(1);
        expect(Object.keys(afterClose.security.intelligence.products)).toHaveLength(0);
    });
    it("names an alternative off the country's own numbers rather than one sentence for everybody", () => {
        const campaign = buildCampaign();
        const runtime = campaign.nations[TARGET];
        const restive = {
            ...campaign,
            nations: {
                ...campaign.nations,
                [TARGET]: {
                    ...runtime,
                    stats: { ...runtime.stats, politics: { ...runtime.stats.politics, protestPressure: 0.8, factionalism: 0.8 } },
                },
            },
        };
        expect(draftAssessment(restive, "intent", TARGET).alternative).not.toBe(draftAssessment(campaign, "intent", TARGET).alternative);
    });
});
