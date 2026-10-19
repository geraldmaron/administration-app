import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION } from "@admin/world";
import { enactPolicyDraft, projectPolicyDraft, projectPolicyStance, revenueStatuteRequired } from "./policy-draft.js";
import { programRestingOffset } from "./governance.js";
import { inheritedStance, resolveDomainChair, stancesForDomain } from "./policy.js";
import { PROGRAM_STANDUP_TURNS, domainAuthority } from "./policy-teeth.js";
import { buildCampaign, person } from "./__fixtures__/campaign.js";
// A stance projection used to price a program without naming what a program
// signed today is against, or how long it takes to bite. `stanceOpposition`
// and `domainAuthority` already answered both questions for the country the
// engine already models; this is the test that the pricing surface actually
// carries them rather than recomputing — or, worse, never asking.
describe("what a stance projection says about the politics of adopting it", () => {
    const CHARTER = CHARTER_USA_CONSTITUTION;
    function seatedFor(domain) {
        const campaign = buildCampaign();
        const chair = resolveDomainChair(CHARTER.cabinetRoles, domain);
        return {
            ...campaign,
            founding: { ...campaign.founding, cabinet: { [chair]: person.id } },
            player: { ...campaign.player, cabinet: { [chair]: person.id } },
            people: { ...campaign.people, [person.id]: { ...campaign.people[person.id], currentRole: chair } },
        };
    }
    it("names who a non-inherited stance is against", () => {
        const campaign = seatedFor("fiscal");
        const candidate = stancesForDomain("fiscal").find((stance) => !stance.inherited);
        const projection = projectPolicyStance(campaign, CHARTER, "fiscal", candidate.id);
        expect(projection.opposition).toBeDefined();
        expect(projection.opposition.strength).toBeGreaterThan(0);
        expect(projection.opposition.name.length).toBeGreaterThan(0);
    });
    it("carries no opposition for the inherited position — continuity is what everyone already lives with", () => {
        const campaign = seatedFor("fiscal");
        const projection = projectPolicyStance(campaign, CHARTER, "fiscal", inheritedStance("fiscal").id);
        expect(projection.opposition).toBeUndefined();
    });
    it("states the constitutional authority the domain rests on, independent of which stance is priced", () => {
        const campaign = seatedFor("fiscal");
        const candidate = stancesForDomain("fiscal").find((stance) => !stance.inherited);
        const projection = projectPolicyStance(campaign, CHARTER, "fiscal", candidate.id);
        expect(projection.authority).toBe(domainAuthority("fiscal"));
    });
    it("counts a freshly adopted program's stand-up as the full clock, and the inherited one as already standing", () => {
        const campaign = seatedFor("fiscal");
        const candidate = stancesForDomain("fiscal").find((stance) => !stance.inherited);
        const fresh = projectPolicyStance(campaign, CHARTER, "fiscal", candidate.id);
        expect(fresh.standUpTurns).toBe(PROGRAM_STANDUP_TURNS);
        const inherited = projectPolicyStance(campaign, CHARTER, "fiscal", inheritedStance("fiscal").id);
        expect(inherited.standUpTurns).toBe(0);
    });
    // The preview's resting-point move equals `programRestingOffset`
    // with this domain's line swapped, minus the same call with the held
    // stance — never `policyRestingOffset` of the draft alone, which has no
    // chair and so no quality.
    it("prices the resting-point move as programRestingOffset after the swap minus before it, for more than one domain", () => {
        for (const domain of ["fiscal", "trade", "security"]) {
            const campaign = seatedFor(domain);
            const candidate = stancesForDomain(domain).find((stance) => !stance.inherited);
            const projection = projectPolicyStance(campaign, CHARTER, domain, candidate.id);
            const before = programRestingOffset(campaign, campaign.founding.nation);
            const after = programRestingOffset(campaign, campaign.founding.nation, { [domain]: candidate.id });
            expect(projection.restingMove, domain).toEqual({
                growth: Math.round((after["economy.growth"] - before["economy.growth"]) * 1000) / 1000,
                inflation: Math.round((after["economy.inflation"] - before["economy.inflation"]) * 1000) / 1000,
                unemployment: Math.round((after["economy.unemployment"] - before["economy.unemployment"]) * 1000) / 1000,
            });
        }
    });
    it("carries no resting move where a program cannot be priced at all", () => {
        const campaign = buildCampaign();
        const empty = {
            ...campaign,
            founding: { ...campaign.founding, cabinet: {} },
            player: { ...campaign.player, cabinet: {} },
        };
        const candidate = stancesForDomain("fiscal").find((stance) => !stance.inherited);
        expect(projectPolicyStance(empty, CHARTER, "fiscal", candidate.id).restingMove).toBeUndefined();
    });
    it("still names authority and standUpTurns where a program cannot be adopted at all", () => {
        const campaign = buildCampaign();
        const empty = {
            ...campaign,
            founding: { ...campaign.founding, cabinet: {} },
            player: { ...campaign.player, cabinet: {} },
        };
        const candidate = stancesForDomain("fiscal").find((stance) => !stance.inherited);
        const projection = projectPolicyStance(empty, CHARTER, "fiscal", candidate.id);
        expect(projection.available).toBe(false);
        expect(projection.authority).toBe(domainAuthority("fiscal"));
        expect(projection.standUpTurns).toBe(PROGRAM_STANDUP_TURNS);
    });
});
// A revenue domain routes to one of two bills, split by which direction the
// stance itself pushes — a left-leaning position cannot be gated behind a
// statute whose own arises predicate only opens in a slump.
describe("which revenue statute a fiscal stance actually needs", () => {
    const CHARTER = CHARTER_USA_CONSTITUTION;
    const RIGHT_ACT = "act-tax-relief-and-growth";
    const LEFT_ACT = "act-tax-fairness-and-revenue";
    function lawOf(actId) {
        return {
            id: `bill:${actId}:0`,
            act: actId,
            title: actId,
            sponsor: "administration",
            introducedTurn: 0,
            status: "law",
            passage: [],
        };
    }
    function withLaws(campaign, ...actIds) {
        const laws = Object.fromEntries(actIds.map((actId) => [`bill:${actId}:0`, lawOf(actId)]));
        return { ...campaign, bills: { ...campaign.bills, ...laws } };
    }
    function seatedTreasury(campaign) {
        const chair = resolveDomainChair(CHARTER.cabinetRoles, "fiscal");
        return {
            ...campaign,
            founding: { ...campaign.founding, cabinet: { [chair]: person.id } },
            player: { ...campaign.player, cabinet: { [chair]: person.id } },
            people: { ...campaign.people, [person.id]: { ...campaign.people[person.id], currentRole: chair } },
        };
    }
    it("reads the right-leaning bill without naming a stance — the behavior every existing caller still gets", () => {
        const campaign = buildCampaign();
        expect(revenueStatuteRequired(campaign, "fiscal")?.actId).toBe(RIGHT_ACT);
    });
    it("routes a right-leaning stance to the right-leaning bill", () => {
        const campaign = buildCampaign();
        expect(revenueStatuteRequired(campaign, "fiscal", "fiscal-austerity")?.actId).toBe(RIGHT_ACT);
    });
    it("routes a left-leaning stance to the left-leaning bill, not the right-leaning one", () => {
        const campaign = buildCampaign();
        expect(revenueStatuteRequired(campaign, "fiscal", "fiscal-redistribution")?.actId).toBe(LEFT_ACT);
        expect(revenueStatuteRequired(campaign, "fiscal", "fiscal-investment")?.actId).toBe(LEFT_ACT);
    });
    it("clears only the bill that actually passed", () => {
        const onlyRight = withLaws(buildCampaign(), RIGHT_ACT);
        expect(revenueStatuteRequired(onlyRight, "fiscal", "fiscal-austerity")).toBeUndefined();
        expect(revenueStatuteRequired(onlyRight, "fiscal", "fiscal-redistribution")?.actId).toBe(LEFT_ACT);
        const onlyLeft = withLaws(buildCampaign(), LEFT_ACT);
        expect(revenueStatuteRequired(onlyLeft, "fiscal", "fiscal-redistribution")).toBeUndefined();
        expect(revenueStatuteRequired(onlyLeft, "fiscal", "fiscal-austerity")?.actId).toBe(RIGHT_ACT);
    });
    // A stance the President left and later returns to must clear its
    // own law again, not ride on a law that authorized it before the country's
    // take changed underneath it.
    it("asks for a fresh law on a stance whose own law is no longer the most recent change to the take", () => {
        const leftThenRight = {
            ...buildCampaign(),
            bills: {
                "bill:left:0": { id: "bill:left:0", act: LEFT_ACT, title: LEFT_ACT, sponsor: "administration", introducedTurn: 0, resolvedTurn: 2, status: "law", passage: [] },
                "bill:right:0": { id: "bill:right:0", act: RIGHT_ACT, title: RIGHT_ACT, sponsor: "administration", introducedTurn: 5, resolvedTurn: 9, status: "law", passage: [] },
            },
        };
        // The right-leaning bill passed after the left one, so the left stance's
        // old law no longer clears it — going back needs its own statute again.
        expect(revenueStatuteRequired(leftThenRight, "fiscal", "fiscal-redistribution")?.actId).toBe(LEFT_ACT);
        // The right-leaning stance is current: its own law is the most recent change.
        expect(revenueStatuteRequired(leftThenRight, "fiscal", "fiscal-austerity")).toBeUndefined();
    });
    it("refuses to enact a left-leaning stance on the right-leaning bill alone, and allows it once the left bill passes", () => {
        const seated = seatedTreasury(buildCampaign());
        const rightOnly = withLaws(seated, RIGHT_ACT);
        const drafted = projectPolicyDraft(rightOnly, { fiscal: "fiscal-redistribution" });
        if (!drafted.ok)
            throw new Error(drafted.reason);
        const refused = enactPolicyDraft(rightOnly, drafted.candidate);
        expect(refused.ok).toBe(false);
        if (!refused.ok)
            expect(refused.reason).toContain("Tax Fairness");
        const bothActs = withLaws(seated, RIGHT_ACT, LEFT_ACT);
        const committed = enactPolicyDraft(bothActs, drafted.candidate);
        expect(committed.ok).toBe(true);
    });
});
