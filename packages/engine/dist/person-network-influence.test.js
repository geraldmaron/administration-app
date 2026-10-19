import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { actOf } from "./legislative-acts.js";
import { signatureStance } from "./party-beliefs.js";
import { addDays } from "./clock.js";
import { apply } from "./effects.js";
import { issueReach, knownPersonContacts, propagateIssue } from "./person-network-influence.js";
import { issueMemberOutreach, resolveMemberOutreach } from "./member-outreach.js";
import { issueLobbying } from "./lobbying.js";
import { resolveDueLobbying } from "./lobbying-due.js";
import { voteOn } from "./congress-votes.js";
import { createSave, loadSave } from "./save.js";
const founded = foundedForBalance("observed-issue-coalition").campaign;
const bill = { id: "bill:outreach-test", act: "act-equal-protection", title: "Equal Protection Enforcement Act", status: "in-progress", sponsor: "administration", introducedTurn: 0, stage: "floor", passage: [] };
const act = actOf(bill);
const stance = signatureStance(act.domestic);
const ideology = { economicLeftRight: Math.sign(stance.economicLeftRight), authLibertarian: Math.sign(stance.authLibertarian), nationalistGlobalist: Math.sign(stance.nationalistGlobalist) };
const campaign = { ...founded, bills: { ...founded.bills, [bill.id]: bill }, people: Object.fromEntries(Object.entries(founded.people).map(([id, runtime]) => [id, { ...runtime, base: { ...runtime.base, ideology, ambition: 0.9, integrity: 0.9 } }])) };
const source = campaign.congress.leadership[0].person;
const members = campaign.congress.members.filter((member) => member.person !== source && !campaign.congress.leadership.some((figure) => figure.person === member.person)).slice(0, 12).map((member) => member.person);
const [a, b, c, d, e] = members;
function withContacts(edges, base = campaign) {
    const cooperation = edges.map(([from, to]) => ({ from, to, actId: act.id, date: base.calendar, accepted: true, account: "Both participated in a recorded issue conversation." }));
    return { ...base, congress: { ...base.congress, lobbying: [{ id: "observed-history", approach: "call", turn: 0, landed: true, account: "Recorded issue conversations", cooperation }] } };
}
function issue(base, target = a, broker) {
    const result = issueMemberOutreach(base, target, bill.id, broker);
    if (!result.ok)
        throw new Error(result.reason);
    return { result, pending: apply(base, result.packet) };
}
function answer(base, target = a, broker) {
    const { result, pending } = issue(base, target, broker);
    const due = { ...pending, calendar: result.act.dueDate };
    const resolved = resolveMemberOutreach(due, result.act.id);
    if (!resolved.ok)
        throw new Error(resolved.reason);
    return { issued: result, due, resolved, next: apply(due, resolved.packet) };
}
describe("observed issue influence", () => {
    it("shares daily attention in both directions with existing leader outreach", () => {
        const coalition = issue(campaign, a, source);
        const leader = issueLobbying(coalition.pending, campaign.congress.leadership[1].post, "call");
        expect(leader.ok).toBe(false);
        if (!leader.ok)
            expect(leader.reason).toContain("outreach time");
        const first = issueLobbying(campaign, campaign.congress.leadership[1].post, "call");
        expect(first.ok).toBe(true);
        if (!first.ok)
            throw new Error(first.reason);
        const second = issueMemberOutreach(apply(campaign, first.packet), a, bill.id, source);
        expect(second.ok).toBe(false);
    });
    it("resolves due member requests through the production scheduler and replays identically", () => {
        const { result, pending } = issue(campaign);
        expect(resolveDueLobbying(pending).packets).toEqual([]);
        const due = { ...pending, calendar: result.act.dueDate };
        const resolved = resolveDueLobbying(due);
        expect(resolved.packets).toHaveLength(1);
        const decision = resolved.packets[0]?.provenance?.decision;
        expect(decision?.question).toBe("issue-cooperation");
        expect(decision?.actor).toBe(a);
        expect(decision?.subject).toBe(act.id);
        expect(decision?.acts).toBe(resolved.campaign.congress.lobbying.at(-1)?.landed);
        expect(decision?.terms.map((term) => term.key)).toEqual(["policy-fit", "bond", "rapport", "ambition"]);
        expect(decision?.visibility).toBe("intelligence");
        expect(resolved.campaign.issuedActs?.[result.act.id]?.status).toBe("resolved");
        expect(resolved.campaign.congress.lobbying.at(-1)?.member).toBe(a);
        expect(resolveDueLobbying(due)).toEqual(resolved);
        expect(resolveDueLobbying(resolved.campaign).packets).toEqual([]);
        const deceased = { ...due, people: { ...due.people, [a]: { ...due.people[a], alive: false } } };
        const expired = resolveDueLobbying(deceased);
        expect(expired.campaign.issuedActs?.[result.act.id]?.status).toBe("expired");
        expect(expired.campaign.people[a]?.issuePressure).toEqual(deceased.people[a]?.issuePressure);
    });
    it("uses directed recorded issue links, bounds cycles and duplicate paths, and stops at two hops", () => {
        const base = withContacts([[source, a], [source, b], [a, b], [a, c], [b, c], [c, d], [d, e]]);
        const result = propagateIssue(base, source, bill, "one-effort", 1);
        expect(result.every((response) => response.accepted)).toBe(true);
        expect(result.map((response) => response.to)).toEqual([a, b, c]);
        expect(new Set(result.map((response) => response.to)).size).toBe(result.length);
        expect(result.every((response) => response.depth <= 2)).toBe(true);
        expect(propagateIssue(base, e, bill, "reverse", 1)).toEqual([]);
        const unrelated = { ...base, congress: { ...base.congress, lobbying: base.congress.lobbying.map((record) => ({ ...record, cooperation: record.cooperation.map((edge) => ({ ...edge, actId: "another-act" })) })) } };
        expect(propagateIssue(unrelated, source, bill, "wrong-issue", 1)).toEqual([]);
    });
    it("preserves independent principled refusal and does not spread through a refusal", () => {
        const base = withContacts([[source, a], [a, b]]);
        const against = { ...base, people: { ...base.people, [a]: { ...base.people[a], base: { ...base.people[a].base, ideology: { economicLeftRight: -ideology.economicLeftRight, authLibertarian: -ideology.authLibertarian, nationalistGlobalist: -ideology.nationalistGlobalist } } } } };
        const result = propagateIssue(against, source, bill, "principled-opposition", 1);
        expect(result).toHaveLength(1);
        expect(result[0]?.accepted).toBe(false);
        expect(result[0]?.delta).toBe(0);
        const refused = answer(against, a);
        expect(refused.resolved.packet.provenance?.decision?.question).toBe("issue-cooperation");
        expect(refused.resolved.packet.provenance?.decision?.acts).toBe(false);
        expect(refused.resolved.record.landed).toBe(false);
    });
    it("separates formal reach from biography display caps, charisma and retained personal contacts", () => {
        const edges = members.slice(0, 10).map((target) => [source, target]);
        const base = withContacts(edges);
        expect(propagateIssue(base, source, bill, "leader", 1)).toHaveLength(8);
        const junior = withContacts(members.slice(1, 10).map((target) => [a, target]));
        expect(propagateIssue(junior, a, bill, "junior", 1)).toHaveLength(2);
        const former = { ...base, congress: { ...base.congress, leadership: base.congress.leadership.filter((figure) => figure.person !== source), members: base.congress.members.filter((member) => member.person !== source) } };
        expect(issueReach(former, source, bill)).toBe(1);
        expect(knownPersonContacts(former)).toHaveLength(10);
        const deceased = { ...former, people: { ...former.people, [source]: { ...former.people[source], alive: false } } };
        expect(issueReach(deceased, source, bill)).toBe(0);
        const charismatic = { ...base, people: { ...base.people, [source]: { ...base.people[source], base: { ...base.people[source].base, traits: ["charismatic"] } } } };
        expect(propagateIssue(charismatic, source, bill, "leader", 1)).toEqual(propagateIssue(base, source, bill, "leader", 1));
    });
    it("charges equivalent outreach budgets, rejects repeats, and waits for actual response dates", () => {
        const first = issue(campaign);
        expect(resolveMemberOutreach(first.pending, first.result.act.id).ok).toBe(false);
        expect(issueMemberOutreach(first.pending, a, bill.id).ok).toBe(false);
        const second = issue(first.pending, b);
        expect(issueMemberOutreach(second.pending, c, bill.id).ok).toBe(false);
        const coalition = issue(campaign, a, source);
        expect(issueMemberOutreach(coalition.pending, b, bill.id).ok).toBe(false);
        expect(campaign.player.metrics.standing - second.pending.player.metrics.standing).toBeCloseTo(campaign.player.metrics.standing - coalition.pending.player.metrics.standing);
    });
    it("makes direct and brokered outreach comparable at equal cost, with different recorded reach", () => {
        const base = withContacts([[source, b], [source, c]]);
        const firstDirect = answer(base, a);
        const secondDirect = answer(firstDirect.next, b);
        const brokered = answer(base, a, source);
        expect(base.player.metrics.standing - secondDirect.due.player.metrics.standing)
            .toBeCloseTo(base.player.metrics.standing - brokered.due.player.metrics.standing);
        expect(secondDirect.next.people[c]?.issuePressure ?? []).toHaveLength(0);
        expect(brokered.next.people[c]?.issuePressure?.[0]?.delta).toBeGreaterThan(0);
        expect(secondDirect.next.people[b]?.issuePressure?.[0]?.delta).toBeGreaterThan(0);
        expect(brokered.next.people[b]?.issuePressure?.[0]?.delta).toBeGreaterThan(0);
        expect(secondDirect.next.people[a]?.issuePressure?.[0]?.delta).toBeGreaterThan(0);
        expect(brokered.next.people[a]?.issuePressure?.[0]?.delta).toBeGreaterThan(0);
    });
    it("persists issue evidence and influences only that act until the dated pressure expires", () => {
        const result = answer(campaign);
        expect(result.next.people[a]?.issuePressure).toHaveLength(1);
        const question = { chamber: "house", appeal: 0, required: 218, stance: "neutral", actId: act.id };
        const support = (base) => voteOn(base, question).rollCall.find((row) => row.person === a).support;
        expect(support(result.next)).toBeGreaterThan(support(result.due));
        expect(voteOn(result.next, { ...question, actId: "another-act" }).rollCall.find((row) => row.person === a).support).toBe(voteOn(result.due, { ...question, actId: "another-act" }).rollCall.find((row) => row.person === a).support);
        expect(support({ ...result.next, calendar: addDays(result.next.calendar, 22) })).toBe(support(result.due));
        const loaded = loadSave(createSave(result.next));
        expect(loaded.people[a]?.issuePressure).toEqual(result.next.people[a]?.issuePressure);
        expect(resolveMemberOutreach(result.next, result.issued.act.id).ok).toBe(false);
    });
    it("ambition produces constructive brokerage or issue opposition according to preferences and actual reach", () => {
        const constructive = answer(withContacts([[source, b]]), a, source);
        expect(constructive.next.people[b]?.issuePressure?.[0]?.delta).toBeGreaterThan(0);
        const opposed = Object.fromEntries(Object.entries(campaign.people).map(([id, runtime]) => [id, { ...runtime, base: { ...runtime.base, ideology: { economicLeftRight: -ideology.economicLeftRight, authLibertarian: -ideology.authLibertarian, nationalistGlobalist: -ideology.nationalistGlobalist } } }]));
        const opposition = answer(withContacts([[source, b]], { ...campaign, people: opposed }), a, source);
        expect(opposition.next.people[b]?.issuePressure?.[0]?.delta).toBeLessThan(0);
        expect(opposition.resolved.record.cooperation?.[0]?.account).toContain("against");
        expect(opposition.next.player.metrics.stability).toBe(campaign.player.metrics.stability);
    });
});
