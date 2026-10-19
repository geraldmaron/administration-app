import { describe, expect, it, vi } from "vitest";
import { Charter, Relationship, worldDataset } from "@admin/world";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { relationshipKey, selectRelationship } from "./state.js";
import { signTreaty } from "./treaties.js";
import { ACCEPT_TREATY_THRESHOLDS, counterpartDecision, counterpartPreview, counterpartRefusal, counterpartWillingness, envoyLean, presidentRapport, STATE_BENCH_HALF_SPREAD, STATE_BENCH_MEDIAN, treatyForecast, } from "./treaty-counterpart.js";
import { balanceSeeds, foundedForBalance } from "./balance-harness.js";
import { generateFoundingPool } from "./founding.js";
import { candidatesForRole } from "./people.js";
import { makeCampaignSeed } from "./rng.js";
import { dispositionOf } from "./person-disposition.js";
import { foreignLeaderFor } from "./foreign-leader.js";
import { QUESTION_TERMS, willDraw } from "./willingness.js";
// A pass-through spy, so a test can prove a forecast never reaches the one draw.
vi.mock("./willingness.js", async (original) => {
    const actual = await original();
    return { ...actual, willDraw: vi.fn(actual.willDraw) };
});
// The other government decides whether to sign, from its own trust in the
// United States and its live temperament, and a refusal carries its reasons.
const USA = nationA.id;
const ALP = nationB.id;
const charter = Charter.parse({
    id: "charter-1",
    name: "The Constitution",
    removalMechanism: "impeachment",
    cabinetRoles: ["role-chancellor"],
    institutions: [{ name: "Congress", role: "Advises and consents.", kind: "assembly" }],
    decisionConstraint: "Treaties require the Senate.",
    successionRule: "The Vice President serves out the term.",
    roleTitles: { "role-chancellor": "President" },
});
/** Our trust in them stays warm so the administration's own floor never decides; theirs in us is the variable. */
function withTheirTrust(trust) {
    const base = buildCampaign();
    const back = Relationship.parse({
        from: ALP,
        to: USA,
        trust,
        alignment: 0.1,
        tension: 0.2,
        tradeDependence: 0.3,
        militaryThreat: 0.1,
        treaties: [],
        grudges: [],
        history: [],
    });
    const ours = { ...base.relationships[relationshipKey(USA, ALP)], trust: 0.6 };
    return { ...base, relationships: { [relationshipKey(USA, ALP)]: ours, [relationshipKey(ALP, USA)]: back } };
}
function seated(campaign, offset) {
    return {
        ...campaign,
        foreignPolitics: { seats: { [ALP]: { since: campaign.calendar, offset, provenance: "played" } }, recent: [] },
    };
}
describe("a treaty counterpart's decision", () => {
    it("forecasts a signature from a government that trusts the United States and a refusal from one that does not", () => {
        expect(counterpartWillingness(withTheirTrust(0.8), ALP, "trade")?.forecast).toBe("likely");
        expect(counterpartWillingness(withTheirTrust(-0.8), ALP, "alliance")?.forecast).toBe("unlikely");
    });
    it("refuses at the signature gate with its own stamp, and says why without a figure", () => {
        const campaign = withTheirTrust(-0.8);
        const result = signTreaty(campaign, charter, "alliance", ALP);
        expect(result.ok).toBe(false);
        const refusal = counterpartRefusal(campaign, ALP, "alliance");
        expect(refusal.decision.question).toBe("accept-treaty");
        expect(refusal.decision.actor).toBe(ALP);
        expect(refusal.decision.acts).toBe(false);
        expect(refusal.reason).not.toMatch(/\d/);
        expect(!result.ok && result.reason).toBe(refusal.reason);
    });
    it("signs where the counterpart is willing, leaving the administration's own trust floor in place", () => {
        const willing = withTheirTrust(0.8);
        expect(counterpartDecision(willing, ALP, "trade")?.acts).toBe(true);
        expect(signTreaty(willing, charter, "trade", ALP).ok).toBe(true);
        const ourDistrust = { ...willing, relationships: { ...willing.relationships, [relationshipKey(USA, ALP)]: { ...willing.relationships[relationshipKey(USA, ALP)], trust: -0.9 } } };
        const refused = signTreaty(ourDistrust, charter, "alliance", ALP);
        expect(!refused.ok && refused.reason).toMatch(/We do not trust/);
    });
    it("takes its threshold as a named input, so a rule can lower it in one place", () => {
        const campaign = withTheirTrust(0);
        const standard = counterpartWillingness(campaign, ALP, "alliance");
        const lowered = counterpartWillingness(campaign, ALP, "alliance", ACCEPT_TREATY_THRESHOLDS.alliance - 0.2);
        expect(lowered.threshold).toBe(standard.threshold - 0.2);
        expect(lowered.margin).toBeGreaterThan(standard.margin);
    });
    it("reads the live temperament, so a successor who keeps to itself signs less readily", () => {
        const campaign = withTheirTrust(0.3);
        const before = counterpartWillingness(campaign, ALP, "alliance");
        const after = counterpartWillingness(seated(campaign, { isolationism: 0.5 }), ALP, "alliance");
        expect(after.score).toBeLessThan(before.score);
    });
    it("gives the treaty bundle a forecast and at most two leading reasons", () => {
        const forecast = treatyForecast(withTheirTrust(0.8), ALP, "trade");
        expect(["likely", "unlikely", "close"]).toContain(forecast.forecast);
        expect(forecast.reasons.length).toBeGreaterThan(0);
        expect(forecast.reasons.length).toBeLessThanOrEqual(2);
        expect(forecast.reasons[0]).toBe("its trust in the United States");
    });
    it("weighs nothing where the two hold no relationship, which leaves the gate as it read", () => {
        const campaign = buildCampaign();
        expect(counterpartWillingness(campaign, ALP, "trade")).toBeUndefined();
        expect(counterpartRefusal(campaign, ALP, "trade")).toBeUndefined();
    });
});
// --- The President's people at the signing ---
const STATE = "role-foreign-minister";
const GBR = "GBR";
const founded = foundedForBalance("ws-b-treaty");
const world = founded.campaign;
const US = world.founding.nation;
function withPerson(campaign, id, base) {
    const runtime = campaign.people[id];
    return { ...campaign, people: { ...campaign.people, [id]: { ...runtime, base: { ...runtime.base, ...base } } } };
}
const secretary = world.player.cabinet[STATE];
const skilled = withPerson(world, secretary, { charisma: 0.95, competence: 0.95, integrity: 0.9, traits: ["charismatic"] });
const clumsy = withPerson(world, secretary, { charisma: 0.15, competence: 0.3, integrity: 0.3, traits: ["reclusive"] });
const termOf = (campaign, kind, key) => counterpartPreview(campaign, GBR, kind).terms.find((term) => term.key === key);
describe("the Secretary of State and the two leaders at a signing", () => {
    it("weighs the Secretary's craft by how heavily the kind binds", () => {
        expect(termOf(skilled, "alliance", "envoy").value).toBeCloseTo(0.25 * envoyLean(skilled), 3);
        expect(termOf(skilled, "executive-agreement", "envoy").value).toBeCloseTo(0.25 * 0.3 * envoyLean(skilled), 3);
        expect(termOf(skilled, "alliance", "envoy").source).toBe("situation");
    });
    it("makes a counterpart readier to sign for a skilled Secretary and less ready for a clumsy one", () => {
        expect(counterpartWillingness(skilled, GBR, "alliance").score).toBeGreaterThan(counterpartWillingness(world, GBR, "alliance").score);
        expect(counterpartWillingness(clumsy, GBR, "alliance").score).toBeLessThan(counterpartWillingness(world, GBR, "alliance").score);
    });
    it("weighs the leaders' rapport as a trait, both ways", () => {
        const leader = foreignLeaderFor(world, GBR).person;
        const president = world.people[foreignLeaderFor(world, US).person].base;
        const kindred = withPerson(world, leader, { ideology: president.ideology, traits: [...president.traits] });
        const opposed = withPerson(world, leader, {
            ideology: { economicLeftRight: 1, authLibertarian: 1, nationalistGlobalist: 1 },
            traits: president.traits.includes("hawkish") ? ["dovish"] : ["hawkish"],
        });
        const warm = termOf(kindred, "trade", "rapport");
        expect(warm.source).toBe("trait");
        expect(warm.value).toBeCloseTo(0.1 * presidentRapport(kindred, GBR), 3);
        expect(warm.value).toBeGreaterThan(0);
        expect(termOf(opposed, "trade", "rapport").value).toBeLessThan(0);
    });
    it("forecasts and previews without the draw, and decides the same way twice and on a clone", () => {
        vi.mocked(willDraw).mockClear();
        counterpartWillingness(skilled, GBR, "alliance");
        counterpartPreview(skilled, GBR, "alliance");
        treatyForecast(skilled, GBR, "alliance");
        expect(vi.mocked(willDraw)).not.toHaveBeenCalled();
        expect(counterpartDecision(skilled, GBR, "alliance")).toEqual(counterpartDecision(structuredClone(skilled), GBR, "alliance"));
        expect(counterpartPreview(skilled, GBR, "alliance").score).toBe(counterpartDecision(skilled, GBR, "alliance").score);
    });
    it("stamps the counterpart's yes on the signature, every key one the question may weigh", () => {
        const back = selectRelationship(skilled, GBR, US);
        const ours = selectRelationship(skilled, US, GBR);
        const trusting = {
            ...skilled,
            relationships: {
                ...skilled.relationships,
                [relationshipKey(GBR, US)]: { ...back, trust: 0.9 },
                [relationshipKey(US, GBR)]: { ...ours, trust: 0.9 },
            },
        };
        const signed = signTreaty(trusting, founded.charter, "trade", GBR);
        if (!signed.ok)
            throw new Error(signed.reason);
        const decision = signed.packet.provenance?.decision;
        expect(decision?.question).toBe("accept-treaty");
        expect(decision?.acts).toBe(true);
        for (const term of decision?.terms ?? [])
            expect(QUESTION_TERMS["accept-treaty"]).toContain(term.key);
        expect(decision?.terms.map((term) => term.key)).toEqual(expect.arrayContaining(["envoy", "rapport"]));
    });
    it("never blames a refusal on a thin record's temperament", () => {
        const aloof = (fidelity) => {
            const campaign = withTheirTrust(0);
            const nation = campaign.nations[ALP];
            return {
                ...campaign,
                nations: { ...campaign.nations, [ALP]: { ...nation, base: { ...nation.base, fidelity }, traits: { ...nation.traits, isolationism: 1 } } },
            };
        };
        const full = counterpartRefusal(aloof("full"), ALP, "alliance");
        const thin = counterpartRefusal(aloof("thin"), ALP, "alliance");
        expect(full.reason).toMatch(/no part of a commitment abroad/);
        expect(thin.reason).not.toMatch(/no part of a commitment abroad/);
        expect(thin.decision).toEqual(full.decision);
    });
});
describe("the State Department's bench", () => {
    // The constants a Secretary is read against, measured again from the bench a
    // President chooses from: every State-eligible American in each balance
    // seed's founding pool. A change to the cast or the craft reading moves them,
    // and this is where that shows.
    it("is pinned at the median and half the 10th-90th percentile spread of its craft", () => {
        const crafts = balanceSeeds(12)
            .flatMap((seed) => candidatesForRole(generateFoundingPool(makeCampaignSeed(seed), worldDataset), "USA", "role-foreign-minister"))
            .map((person) => dispositionOf(person).craft)
            .sort((a, b) => a - b);
        const at = (q) => crafts[Math.round(q * (crafts.length - 1))];
        const round4 = (v) => Math.round(v * 10000) / 10000;
        expect(crafts.length).toBeGreaterThan(50);
        expect(round4(at(0.5))).toBe(STATE_BENCH_MEDIAN);
        expect(round4((at(0.9) - at(0.1)) / 2)).toBe(STATE_BENCH_HALF_SPREAD);
    });
});
