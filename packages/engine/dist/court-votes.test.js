import { describe, expect, it } from "vitest";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { atCampaignTurn, buildCampaign, person } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { openNomination } from "./nomination.js";
import { JUDICIARY_SEAT_INSTITUTIONS } from "./judiciary.js";
import { EXECUTIVE_ORDERS } from "./orders.js";
import { benchForVotes, decideCase, majorityStrikeChance } from "./court-votes.js";
import { justiceStrikePropensity } from "./strike-odds.js";
const charter = CHARTER_PRESIDENTIAL_REPUBLIC;
const order = EXECUTIVE_ORDERS[0];
function bench(size) {
    return Array.from({ length: size }, (_, index) => ({
        person: `PER-J${index}`, seat: index + 1, senior: index === 0,
        member: { ideology: { economicLeftRight: -0.8 + index * 0.18, authLibertarian: 0, nationalistGlobalist: 0 },
            integrity: 0.4 + (index % 3) * 0.15, competence: 0.5 + (index % 2) * 0.2 },
    }));
}
describe("judicial votes", () => {
    it("never rules without six participating justices", () => {
        expect(decideCase(charter, order, bench(5), "silent", 0, "five")).toMatchObject({ disposition: "no-quorum", votes: [] });
        const recused = bench(6).map((justice, index) => index === 0 ? { ...justice, recused: true } : justice);
        expect(decideCase(charter, order, recused, "silent", 0, "recusal").disposition).toBe("no-quorum");
    });
    it("recuses a government legal adviser only on the challenged order they reviewed", () => {
        const candidateId = "PER-RECUSAL";
        const institution = JUDICIARY_SEAT_INSTITUTIONS[0];
        const initial = atCampaignTurn(buildCampaign(), 2);
        const vacant = { ...initial, people: { ...initial.people, [candidateId]: { base: { ...person, id: candidateId }, alive: true } },
            institutions: { ...initial.institutions, [institution]: { ...initial.institutions[institution], leader: undefined, vacancy: true } } };
        const opened = openNomination(vacant, "OFF-SCOTUS-SEAT-1", candidateId);
        if (!opened.ok)
            throw new Error(opened.reason);
        const nominated = apply(vacant, opened.packet);
        const nomination = Object.values(nominated.nominations).find((entry) => entry.nominee === candidateId);
        const seated = { ...nominated, nominations: { ...nominated.nominations,
                [nomination.id]: { ...nomination, stage: "confirmed" } },
            institutions: { ...nominated.institutions, [institution]: { ...nominated.institutions[institution], leader: candidateId, vacancy: false } } };
        const ownCase = { id: "order:reviewed", order: "order-border-controls", turn: 1,
            contested: true, challengeChance: 0.5, legalReviewer: { person: candidateId,
                reviewedDay: nomination.openedDay + 1 } };
        const otherCase = { ...ownCase, id: "order:other", legalReviewer: undefined };
        expect(benchForVotes(seated, ownCase).find((justice) => justice.person === candidateId)?.recused).toBe(true);
        expect(benchForVotes(seated, otherCase).find((justice) => justice.person === candidateId)?.recused).toBeUndefined();
        expect(benchForVotes({ ...seated, nominations: {} }, ownCase)
            .find((justice) => justice.person === candidateId)?.recused).toBe(true);
        expect(decideCase(charter, order, benchForVotes(seated, ownCase), "silent", 0, "case:reviewed").votes)
            .not.toContainEqual(expect.objectContaining({ justice: candidateId }));
    });
    it("derives each counted vote from that justice's legal threshold and the common case draw", () => {
        const seated = bench(9);
        for (let index = 0; index < 100; index += 1) {
            const draw = (index + 0.5) / 100;
            const decision = decideCase(charter, order, seated, "silent", draw, `case:${index}`);
            for (const vote of decision.votes) {
                const justice = seated.find((entry) => entry.person === vote.justice);
                expect(vote.vote).toBe(draw < justiceStrikePropensity(charter, order, justice.member, "silent") ? "strike" : "uphold");
            }
            const strikes = decision.votes.filter((vote) => vote.vote === "strike").length;
            expect(decision.holding).toBe(strikes >= 5 ? "struck-down" : "upheld");
        }
    });
    it("records an equal division without declaring a Supreme Court merits holding", () => {
        const seated = bench(8);
        const thresholds = seated.map((justice) => justiceStrikePropensity(charter, order, justice.member, "silent")).sort((a, b) => a - b);
        const draw = (thresholds[3] + thresholds[4]) / 2;
        const decision = decideCase(charter, order, seated, "silent", draw, "tie");
        expect(decision.disposition).toBe("equal-division");
        expect(decision.holding).toBeUndefined();
        expect(decision.votes.filter((vote) => vote.vote === "strike")).toHaveLength(4);
    });
    it("prices the exact majority rule, including a tie's dependence on the lower judgment", () => {
        const seated = bench(8);
        for (const lower of ["struck-down", "upheld"]) {
            const chance = majorityStrikeChance(charter, order, seated, "silent", lower);
            let finalStrikes = 0;
            for (let index = 0; index < 1000; index += 1) {
                const decision = decideCase(charter, order, seated, "silent", (index + 0.5) / 1000, `case:${index}`);
                if ((decision.holding ?? lower) === "struck-down")
                    finalStrikes += 1;
            }
            expect(Math.abs(finalStrikes / 1000 - chance)).toBeLessThan(0.002);
        }
        expect(majorityStrikeChance(charter, order, bench(5), "silent", "upheld")).toBeUndefined();
    });
});
