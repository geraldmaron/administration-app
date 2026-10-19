import { describe, expect, it } from "vitest";
import { buildCampaign, withWeeksElapsed } from "./__fixtures__/campaign.js";
import { openingAppropriation, projectAppropriation, requestAppropriation } from "./appropriation.js";
import { FIRST_INAUGURATION, selectDateOfTurn, selectFiscalYearEndTurn } from "./clock.js";
import { TURNS_PER_YEAR } from "./pace.js";
import { congressPhase } from "./congress.js";
import { apply } from "./effects.js";
import { projectBudgetDraft } from "./budget-draft.js";
import { selectBudget } from "./budget.js";
import { inShutdown } from "./funding.js";
const withCongress = (campaign, changes) => ({
    ...campaign,
    congress: { ...campaign.congress, ...changes },
});
const draftOf = (campaign, input) => {
    const drafted = projectBudgetDraft(campaign, input);
    if (!drafted.ok)
        throw new Error(drafted.reason);
    return drafted.candidate;
};
describe("the appropriation", () => {
    it("is disposition and nothing else", () => {
        const generous = projectAppropriation(withCongress(buildCampaign(), { disposition: 0.95 }));
        const hostile = projectAppropriation(withCongress(buildCampaign(), { disposition: 0.05 }));
        expect(generous.wouldPass).toBe(true);
        expect(hostile.wouldPass).toBe(false);
    });
    it("writes the allocation only where the votes were there", () => {
        const carried = withCongress(buildCampaign(), { disposition: 0.95 });
        const draft = draftOf(carried, { military: 0.03 });
        const passed = requestAppropriation(carried, draft);
        expect(passed.ok).toBe(true);
        if (!passed.ok)
            return;
        const after = apply(carried, passed.packet);
        expect(after.player.budget.military).toBe(draft.allocation.military);
        expect(after.congress.appropriation.onPriorYear).toBe(false);
        const refused = withCongress(buildCampaign(), { disposition: 0.02 });
        const failed = requestAppropriation(refused, draftOf(refused, { military: 0.03 }));
        expect(failed.ok).toBe(true);
        if (!failed.ok)
            return;
        const stalled = apply(refused, failed.packet);
        expect(stalled.player.budget).toEqual(refused.player.budget);
        expect(stalled.congress.appropriation.onPriorYear).toBe(true);
    });
    it("leaves a president who cannot get one governing on the prior year", () => {
        const campaign = buildCampaign();
        const lapsed = withCongress(campaign, {
            appropriation: { enactedTurn: 1, throughTurn: campaign.turn, onPriorYear: false, priorYear: [] },
        });
        const after = apply(lapsed, congressPhase(lapsed)[0]);
        expect(after.congress.appropriation.onPriorYear).toBe(true);
        // And it is not free: nothing the state does can be planned past this week.
        expect(after.player.metrics.stability).toBeLessThan(lapsed.player.metrics.stability);
    });
    it("votes only the accounts the request actually changes", () => {
        const campaign = withCongress(buildCampaign(), { disposition: 0.7 });
        const projection = projectAppropriation(campaign, draftOf(campaign, { military: 0.03 }));
        expect(projection.accounts.map((entry) => entry.account)).toEqual(["military"]);
        // A book with nothing in it is not a book the floor can strike lines out of.
        expect(projectAppropriation(campaign, draftOf(campaign, {})).accounts).toHaveLength(0);
    });
    it("needs sixty in the Senate and a majority in the House", () => {
        const campaign = buildCampaign();
        const { votes } = projectAppropriation(campaign);
        for (const vote of votes) {
            const seats = campaign.congress.chambers[vote.chamber].seats;
            const required = Math.floor(seats / 2) + 1;
            if (vote.chamber === "senate")
                expect(vote.cloture?.required).toBe(Math.ceil(seats * 0.6));
            expect(vote.required).toBe(required);
        }
    });
    it("prices each line separately, so a defense raise is not the same ask as a sovereign fund one", () => {
        // Same size of raise on two accounts the Hill regards differently. The
        // count is what changes, not the arithmetic that produces it.
        const campaign = withCongress(buildCampaign(), { disposition: 0.5 });
        const standing = selectBudget(campaign);
        const military = projectAppropriation(campaign, draftOf(campaign, { military: standing.military + 0.01 }));
        const economic = projectAppropriation(campaign, draftOf(campaign, { economic: standing.economic + 0.01 }));
        const yeas = (projection) => projection.accounts[0].votes[0].yeas;
        expect(yeas(military)).toBeGreaterThan(yeas(economic));
    });
    it("costs votes to ask for a raise, and nothing to ask for a cut", () => {
        const campaign = withCongress(buildCampaign(), { disposition: 0.5 });
        const standing = selectBudget(campaign);
        const held = projectAppropriation(campaign, draftOf(campaign, { domestic: standing.domestic + 0.0001 }));
        const raised = projectAppropriation(campaign, draftOf(campaign, { domestic: standing.domestic + 0.01 }));
        const cut = projectAppropriation(campaign, draftOf(campaign, { domestic: standing.domestic - 0.01 }));
        const yeas = (projection) => projection.accounts[0].votes[0].yeas;
        expect(yeas(raised)).toBeLessThan(yeas(held));
        expect(yeas(cut)).toBe(yeas(held));
    });
    describe("a book that passes with lines struck out", () => {
        /**
         * The disposition where the floor funds one line and refuses the other.
         * Searched rather than hardcoded: what is being asserted is that such a
         * band exists and composes correctly, not the particular number it sits at.
         */
        function partial() {
            for (let disposition = 0.99; disposition > 0; disposition -= 0.005) {
                const campaign = withCongress(buildCampaign(), { disposition: Math.round(disposition * 1000) / 1000 });
                const standing = selectBudget(campaign);
                const draft = draftOf(campaign, {
                    military: standing.military + 0.005,
                    economic: standing.economic + 0.005,
                });
                const projection = projectAppropriation(campaign, draft);
                if (projection.wouldEnact && projection.refused.length > 0)
                    return { campaign, draft };
            }
            throw new Error("no disposition funds one line and refuses another");
        }
        it("funds the lines that carried and freezes the ones that did not", () => {
            const { campaign, draft } = partial();
            const projection = projectAppropriation(campaign, draft);
            const voted = requestAppropriation(campaign, draft);
            expect(voted.ok).toBe(true);
            if (!voted.ok)
                return;
            const after = apply(campaign, voted.packet);
            for (const account of projection.refused) {
                // Not the drafted share: the rate the account was already running at.
                expect(after.player.budget[account]).toBe(campaign.player.budget[account]);
            }
            for (const entry of projection.accounts.filter((line) => line.carried)) {
                expect(after.player.budget[entry.account]).toBe(draft.allocation[entry.account]);
            }
            expect(after.congress.appropriation.priorYear).toEqual(projection.refused);
        });
        it("is a book that passed, so the clock resets and the government stays funded", () => {
            const { campaign, draft } = partial();
            const voted = requestAppropriation(campaign, draft);
            if (!voted.ok)
                throw new Error(voted.reason);
            const after = apply(campaign, voted.packet);
            // A struck-out line is not a funding lapse. Both facts about the book
            // move; only the lines inside it were refused.
            expect(after.congress.appropriation.onPriorYear).toBe(false);
            expect(after.congress.appropriation.throughTurn).toBeGreaterThan(campaign.turn);
            expect(inShutdown(after)).toBe(false);
        });
        it("says which lines were struck, in the packet and in the week after", () => {
            const { campaign, draft } = partial();
            const voted = requestAppropriation(campaign, draft);
            if (!voted.ok)
                throw new Error(voted.reason);
            expect(voted.packet.narration.summary).toContain("struck out");
            const after = apply(campaign, voted.packet);
            expect(congressPhase(after)[0].narration.summary).toContain("last Congress set");
        });
    });
    it("keeps priorYear empty when there is no book for a line to be missing from", () => {
        const refused = withCongress(buildCampaign(), { disposition: 0.02 });
        const voted = requestAppropriation(refused, draftOf(refused, { military: 0.03 }));
        if (!voted.ok)
            throw new Error(voted.reason);
        const after = apply(refused, voted.packet);
        expect(after.congress.appropriation.onPriorYear).toBe(true);
        expect(after.congress.appropriation.priorYear).toEqual([]);
        // And the clock did not move, which is what leaves the shutdown reachable.
        expect(after.congress.appropriation.throughTurn).toBe(refused.congress.appropriation.throughTurn);
    });
});
describe("the fiscal year the money runs on", () => {
    it("inherits a book that lapses on the September 30 after the oath", () => {
        const opening = openingAppropriation(FIRST_INAUGURATION, 1);
        const campaign = buildCampaign();
        expect(opening).toEqual(campaign.congress.appropriation);
        expect(opening.throughTurn).toBe(selectFiscalYearEndTurn(campaign, 2029));
        expect(opening.throughTurn).not.toBe(1 + TURNS_PER_YEAR);
    });
    it("funds an enacted book through its fiscal year, not for a year from the week it passed", () => {
        const campaign = withWeeksElapsed(withCongress(buildCampaign(), { disposition: 0.95 }), 8);
        const voted = requestAppropriation(campaign, draftOf(campaign, { military: 0.03 }));
        if (!voted.ok)
            throw new Error(voted.reason);
        const through = apply(campaign, voted.packet).congress.appropriation.throughTurn;
        // Enacted in March 2029, it is FY2030's book.
        expect(through).toBe(selectFiscalYearEndTurn(campaign, 2030));
        expect(selectDateOfTurn(campaign, through).year).toBe(2030);
        expect(through).not.toBe(campaign.turn + TURNS_PER_YEAR);
    });
});
