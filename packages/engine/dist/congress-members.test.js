import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { recompose } from "./election-seating.js";
import { seatCongressMembers } from "./congress-members.js";
import { voteOn } from "./congress-votes.js";
import { withRapportRead } from "./ties.js";
import { legislativeAct } from "./legislative-acts.js";
import { projectPassage, recordFloorVotes } from "./bill-stages.js";
import { carried } from "./congress.js";
import { createSave, loadSave } from "./save.js";
const campaign = foundedForBalance("individual-members").campaign;
describe("persistent congressional members", () => {
    it("seats exactly one living person per district or Senate class, including every officer", () => {
        const members = campaign.congress.members;
        expect(members).toHaveLength(535);
        expect(new Set(members.map((member) => member.person)).size).toBe(535);
        expect(new Set(members.map((member) => member.seat)).size).toBe(535);
        expect(members.filter((member) => member.chamber === "house")).toHaveLength(435);
        expect(members.filter((member) => member.chamber === "senate")).toHaveLength(100);
        for (const officer of [...campaign.congress.leadership.map((figure) => figure.person), ...Object.values(campaign.congress.committees).flatMap((panel) => [panel.chair, panel.ranking].filter(Boolean))]) {
            expect(members.some((member) => member.person === officer)).toBe(true);
        }
        expect(seatCongressMembers(campaign.congress, campaign.states, campaign.people).members).toEqual(members);
    });
    it("counts member decisions and personal persuasion causally, then sums the roll call", () => {
        const question = { chamber: "house", appeal: 0, required: 218, stance: "neutral" };
        const before = voteOn(campaign, question);
        expect(before.rollCall).toHaveLength(435);
        expect(before.rollCall.filter((member) => member.yea).length).toBe(before.yeas);
        const movable = campaign.congress.members.filter((member) => member.chamber === "house" && !campaign.congress.leadership.some((figure) => figure.person === member.person)).find((member) => {
            const cold = voteOn({ ...campaign, people: withRapportRead(campaign.people, member.person, 0) }, question);
            const warm = voteOn({ ...campaign, people: withRapportRead(campaign.people, member.person, 1) }, question);
            return cold.rollCall.find((entry) => entry.person === member.person).yea !== warm.rollCall.find((entry) => entry.person === member.person).yea;
        });
        expect(movable).toBeDefined();
        const cold = voteOn({ ...campaign, people: withRapportRead(campaign.people, movable.person, 0) }, question);
        const warm = voteOn({ ...campaign, people: withRapportRead(campaign.people, movable.person, 1) }, question);
        expect(warm.yeas - cold.yeas).toBe(1);
    });
    it("preserves all senator ballots and records the Vice President separately on a tied vote", () => {
        const withChair = { ...campaign, congress: { ...campaign.congress, presidingOfficer: { ...campaign.congress.presidingOfficer, liaison: 0 } } };
        const withoutChair = { ...campaign, congress: { ...campaign.congress, presidingOfficer: undefined } };
        let question = { chamber: "senate", appeal: -1, required: 51, stance: "neutral" };
        for (let step = 0; step <= 2000; step += 1) {
            question = { ...question, appeal: -1 + step / 1000 };
            if (voteOn(withoutChair, question).yeas === 50)
                break;
        }
        const tied = voteOn(withoutChair, question);
        expect(tied.yeas).toBe(50);
        expect(tied.nays).toBe(50);
        const vote = voteOn(withChair, question);
        expect(vote.rollCall).toEqual(tied.rollCall);
        expect(vote.byCaucus).toEqual(tied.byCaucus);
        expect(vote.castingVote).toEqual({ person: campaign.congress.presidingOfficer.person, yea: true });
        expect(vote.yeas).toBe(vote.rollCall.filter((row) => row.yea).length + Number(vote.castingVote.yea));
        expect(vote.nays).toBe(vote.rollCall.filter((row) => !row.yea).length + Number(!vote.castingVote.yea));
        expect(vote.passed).toBe(true);
        const recorded = { ...vote, recordedTurn: campaign.turn };
        const bill = { id: "bill:casting-proof", act: "act-housing-supply", title: "Casting vote proof", sponsor: "administration", introducedTurn: campaign.turn, status: "on-the-desk", passage: [recorded] };
        const saved = { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
        const restored = loadSave(JSON.parse(JSON.stringify(createSave(saved))));
        expect(restored.bills[bill.id]?.passage).toEqual([recorded]);
    });
    it("separates cloture and final passage and marks only actual proceedings", () => {
        const act = legislativeAct("act-housing-supply");
        const votes = projectPassage(campaign, act);
        const senate = votes.find((vote) => vote.chamber === "senate");
        expect(senate.required).toBe(51);
        expect(senate.cloture?.required).toBe(60);
        expect(senate.recordedTurn).toBeUndefined();
        expect(senate.cloture?.recordedTurn).toBeUndefined();
        const blocked = recordFloorVotes([{ ...senate, passed: true, cloture: { ...senate.cloture, passed: false } }], 4)[0];
        expect(blocked.recordedTurn).toBeUndefined();
        expect(blocked.cloture?.recordedTurn).toBe(4);
        expect(carried([blocked])).toBe(false);
    });
    it("preserves every uncontested Senate identity through an election", () => {
        const result = recompose(campaign.congress, { house: -3, senate: -1 }, campaign.people, campaign.founding.nation, campaign.turn + 2, campaign.states, 1);
        const next = new Map(result.congress.members.map((member) => [member.seat, member]));
        for (const member of campaign.congress.members.filter((entry) => entry.chamber === "senate" && entry.seatClass !== 1)) {
            expect(next.get(member.seat)?.person).toBe(member.person);
            expect(next.get(member.seat)?.party).toBe(member.party);
        }
        expect(result.congress.members).toHaveLength(535);
    });
    it("round-trips identities and migrates a legacy roster prospectively without inventing historical roll calls", () => {
        expect(loadSave(createSave(campaign)).congress.members).toEqual(campaign.congress.members);
        const { members: _old, ...congress } = campaign.congress;
        const oldVote = { chamber: "house", yeas: 221, nays: 214, required: 218, passed: true };
        const migrated = loadSave(createSave({ ...campaign, congress, bills: { old: { id: "old", act: "act-housing-supply", title: "Old law", sponsor: "administration", introducedTurn: 1, status: "law", passage: [oldVote] } } }));
        expect(migrated.congress.members).toHaveLength(535);
        expect(migrated.bills.old.passage).toEqual([oldVote]);
    });
});
