import { describe, expect, it } from "vitest";
import { balanceSeeds, foundedForBalance, playCampaign } from "./balance-harness.js";
import { HILL_POSTS, selectHillMember } from "./hill.js";
import { LEGISLATIVE_ACTS } from "./legislative-acts.js";
import { projectPassage } from "./bill-stages.js";
import { ACT_ADVOCATE, lobbyAdvocate } from "./lobbying-advocate.js";
// The two cabinet behaviors the balance harness cannot see by playing: it never
// takes a proposal and never lobbies. So each is measured where it shows.
//
// Initiative: how many acts of their own the cabinet brings a President in a
// term, counted off the agenda the passive proxy leaves unanswered, which is
// the most a cabinet will ever bring (a taken proposal is no faster to come
// back than an ignored one).
//
// Lobbying: how far the Secretary who carries a bill moves a private ask,
// across the Secretaries the founding actually draws, read as the term the
// member weighs, which is the chance's own shift point for point.
const TERM_WEEKS = 208;
const INITIATIVE_SEEDS = balanceSeeds(3);
const SPREAD_SEEDS = balanceSeeds(12);
const PARTIES = ["democrat", "republican", "independent"];
function initiativesInATerm(seed, party) {
    const seen = new Map();
    const observeWeek = (state) => {
        for (const proposal of state.cabinetAgenda?.proposals ?? []) {
            if (proposal.act)
                seen.set(proposal.id, proposal.act.kind);
        }
    };
    playCampaign(seed, "passive", TERM_WEEKS, party, undefined, { observeWeek });
    const kinds = {};
    for (const kind of seen.values())
        kinds[kind] = (kinds[kind] ?? 0) + 1;
    return { count: seen.size, kinds };
}
function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
function percentile(values, p) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))];
}
function withBill(campaign, actId) {
    const act = LEGISLATIVE_ACTS.find((entry) => entry.id === actId);
    const id = `bill:${act.id}:${campaign.turn}`;
    const bill = {
        id,
        act: act.id,
        title: act.title,
        sponsor: act.sponsor,
        introducedTurn: campaign.turn,
        status: "in-progress",
        passage: projectPassage(campaign, act),
        stage: "referral",
        setbacks: 0,
        momentum: 0,
        beats: [],
    };
    return { campaign: { ...campaign, bills: { ...campaign.bills, [id]: bill } }, billId: id };
}
/** Every advocate's shift, in points of the chance, over every leadership member and every bill a Secretary carries. */
function advocateShifts(campaign) {
    const carried = LEGISLATIVE_ACTS.filter((act) => act.committee !== undefined && ACT_ADVOCATE[act.committee] !== undefined);
    return carried.flatMap((act) => {
        const staged = withBill(campaign, act.id);
        return HILL_POSTS.flatMap((post) => {
            const member = selectHillMember(staged.campaign, post.id);
            const advocate = member ? lobbyAdvocate(staged.campaign, member, "call", staged.billId) : undefined;
            return advocate ? [{ points: advocate.value * 100, sameParty: advocate.sameParty }] : [];
        });
    });
}
describe("a cabinet's own initiative over a term", () => {
    it("brings the President between 8 and 30 acts of its own a term", () => {
        const runs = INITIATIVE_SEEDS.map((seed) => ({ seed, ...initiativesInATerm(seed, "democrat") }));
        console.info(runs.map((run) => `[initiative] ${run.seed}: ${run.count} a term ${JSON.stringify(run.kinds)}`).join("\n"));
        const typical = median(runs.map((run) => run.count));
        expect(typical).toBeGreaterThanOrEqual(8);
        expect(typical).toBeLessThanOrEqual(30);
    });
});
describe("the Secretary who carries a bill to the Hill", () => {
    it("moves a private ask between 1 and 6 points from the weakest advocate of the member's own party to the strongest, and never more than 6", () => {
        const shifts = SPREAD_SEEDS.flatMap((seed) => PARTIES.flatMap((party) => advocateShifts(foundedForBalance(seed, party).campaign)));
        const line = (label, points) => `[advocate] ${label} n=${points.length} p10 ${percentile(points, 0.1).toFixed(2)} median ${median(points).toFixed(2)} p90 ${percentile(points, 0.9).toFixed(2)} points; spread ${(percentile(points, 0.9) - percentile(points, 0.1)).toFixed(2)}`;
        const all = shifts.map((shift) => shift.points);
        const own = shifts.filter((shift) => shift.sameParty).map((shift) => shift.points);
        console.info([line("pooled", all), line("same party", own)].join("\n"));
        const spread = percentile(own, 0.9) - percentile(own, 0.1);
        expect(spread).toBeGreaterThanOrEqual(1);
        expect(spread).toBeLessThanOrEqual(6);
        expect(Math.max(...all.map(Math.abs))).toBeLessThanOrEqual(6);
    });
});
