import { describe, expect, it } from "vitest";
import type { PersonId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { actOf } from "./legislative-acts.js";
import { signatureStance } from "./party-beliefs.js";
import { addDays } from "./clock.js";
import { apply } from "./effects.js";
import type { Bill, Campaign, PersonCooperation } from "./state.js";
import { issueReach, knownPersonContacts, propagateIssue } from "./person-network-influence.js";
import { issueMemberOutreach, resolveMemberOutreach } from "./member-outreach.js";
import { issueLobbying } from "./lobbying.js";
import { resolveDueLobbying } from "./lobbying-due.js";
import { voteOn } from "./congress-votes.js";
import { createSave, loadSave } from "./save.js";
import { advanceUntilAttention } from "./advance.js";
import { campaignTurnPhases } from "./turn-phases.js";

const { campaign: founded, charter } = foundedForBalance("observed-issue-coalition");
const bill: Bill = { id: "bill:outreach-test", act: "act-equal-protection", title: "Equal Protection Enforcement Act", status: "in-progress", sponsor: "administration", introducedTurn: 0, stage: "floor", passage: [] };
const act = actOf(bill)!;
const stance = signatureStance(act.domestic!);
const ideology = { economicLeftRight: Math.sign(stance.economicLeftRight), authLibertarian: Math.sign(stance.authLibertarian), nationalistGlobalist: Math.sign(stance.nationalistGlobalist) };
const campaign: Campaign = { ...founded, bills: { ...founded.bills, [bill.id]: bill }, people: Object.fromEntries(Object.entries(founded.people).map(([id, runtime]) => [id, { ...runtime, base: { ...runtime.base, ideology, ambition: 0.9, integrity: 0.9 } }])) };
const source = campaign.congress.leadership[0]!.person;
const members = campaign.congress.members!.filter((member) => member.person !== source && !campaign.congress.leadership.some((figure) => figure.person === member.person)).slice(0, 12).map((member) => member.person);
const [a, b, c, d, e] = members as [PersonId, PersonId, PersonId, PersonId, PersonId];
function withContacts(edges: readonly (readonly [PersonId, PersonId])[], base = campaign): Campaign {
  const cooperation: PersonCooperation[] = edges.map(([from, to]) => ({ from, to, actId: act.id, date: base.calendar, accepted: true, account: "Both participated in a recorded issue conversation." }));
  return { ...base, congress: { ...base.congress, lobbying: [{ id: "observed-history", approach: "call", turn: 0, landed: true, account: "Recorded issue conversations", cooperation }] } };
}
function issue(base: Campaign, target = a, broker?: PersonId) {
  const result = issueMemberOutreach(base, target, bill.id, broker);
  if (!result.ok) throw new Error(result.reason);
  return { result, pending: apply(base, result.packet) };
}
function answer(base: Campaign, target = a, broker?: PersonId) {
  const { result, pending } = issue(base, target, broker);
  const due = { ...pending, calendar: result.act.dueDate };
  const resolved = resolveMemberOutreach(due, result.act.id);
  if (!resolved.ok) throw new Error(resolved.reason);
  return { issued: result, due, resolved, next: apply(due, resolved.packet) };
}

describe("observed issue influence", () => {
  it("shares daily attention in both directions with existing leader outreach", () => {
    const coalition = issue(campaign, a, source);
    const leader = issueLobbying(coalition.pending, campaign.congress.leadership[1]!.post, "call");
    expect(leader.ok).toBe(false);
    if (!leader.ok) expect(leader.reason).toContain("outreach time");
    const first = issueLobbying(campaign, campaign.congress.leadership[1]!.post, "call");
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error(first.reason);
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
    const deceased: Campaign = { ...due, people: { ...due.people, [a]: { ...due.people[a]!, alive: false } } };
    const expired = resolveDueLobbying(deceased);
    expect(expired.campaign.issuedActs?.[result.act.id]?.status).toBe("expired");
    expect(expired.campaign.people[a]?.issuePressure).toEqual(deceased.people[a]?.issuePressure);
  });

  it("uses directed recorded issue links, bounds cycles and duplicate paths, and stops at two hops", () => {
    const base = withContacts([[source, a], [source, b], [a, b], [a, c], [b, c], [c, d], [d, e]], { ...campaign, congress: { ...campaign.congress, members: [] } });
    const result = propagateIssue(base, source, bill, "one-effort", 1);
    expect(result.every((response) => response.accepted)).toBe(true);
    expect(result.map((response) => response.to)).toEqual([a, b, c]);
    expect(new Set(result.map((response) => response.to)).size).toBe(result.length);
    expect(result.every((response) => response.depth <= 2)).toBe(true);
    expect(result.find((response) => response.to === a)?.depth).toBe(1);
    expect(result.find((response) => response.to === c)?.depth).toBe(2);
    expect(result.find((response) => response.to === c)?.delta).toBeLessThan(result.find((response) => response.to === a)!.delta);
    expect(propagateIssue(base, e, bill, "reverse", 1)).toEqual([]);
    const unrelated = { ...base, congress: { ...base.congress, lobbying: base.congress.lobbying.map((record) => ({ ...record, cooperation: record.cooperation!.map((edge) => ({ ...edge, actId: "another-act" })) })) } };
    expect(propagateIssue(unrelated, source, bill, "wrong-issue", 1)).toEqual([]);
  });

  it("preserves independent principled refusal and does not spread through a refusal", () => {
    const base = withContacts([[source, a], [a, b]], { ...campaign, congress: { ...campaign.congress, members: [] } });
    const against: Campaign = { ...base, people: { ...base.people, [a]: { ...base.people[a]!, base: { ...base.people[a]!.base, ideology: { economicLeftRight: -ideology.economicLeftRight, authLibertarian: -ideology.authLibertarian, nationalistGlobalist: -ideology.nationalistGlobalist } } } } };
    const result = propagateIssue(against, source, bill, "principled-opposition", 1);
    expect(result).toHaveLength(1);
    expect(result[0]?.accepted).toBe(false);
    expect(result[0]?.delta).toBe(0);
    const refused = answer({ ...against, congress: { ...against.congress, members: campaign.congress.members } }, a);
    expect(refused.resolved.packet.provenance?.decision?.question).toBe("issue-cooperation");
    expect(refused.resolved.packet.provenance?.decision?.acts).toBe(false);
    expect(refused.resolved.record.landed).toBe(false);
  });

  it("bounds connected reach independently of biography caps and charisma, and retains contacts after office", () => {
    const edges = members.slice(0, 10).map((target) => [source, target] as const);
    const base = withContacts(edges);
    expect(propagateIssue(base, source, bill, "leader", 1)).toHaveLength(8);
    const junior = withContacts(members.slice(1, 10).map((target) => [a, target] as const));
    expect(propagateIssue(junior, a, bill, "junior", 1)).toHaveLength(issueReach(junior, a, bill));
    expect(issueReach(junior, a, bill)).toBeGreaterThan(2);
    const former: Campaign = { ...base, congress: { ...base.congress, leadership: base.congress.leadership.filter((figure) => figure.person !== source), members: base.congress.members!.filter((member) => member.person !== source) } };
    expect(issueReach(former, source, bill)).toBeGreaterThan(0);
    expect(issueReach(former, source, bill)).toBeLessThan(issueReach(base, source, bill));
    expect(knownPersonContacts(former)).toHaveLength(10);
    const deceased = { ...former, people: { ...former.people, [source]: { ...former.people[source]!, alive: false } } };
    expect(issueReach(deceased, source, bill)).toBe(0);
    const charismatic = { ...base, people: { ...base.people, [source]: { ...base.people[source]!, base: { ...base.people[source]!.base, traits: ["charismatic" as const] } } } };
    expect(propagateIssue(charismatic, source, bill, "leader", 1)).toEqual(propagateIssue(base, source, bill, "leader", 1));
  });

  it("reaches more colleagues with more standing ties under equal willingness", () => {
    const seats = campaign.congress.members!.filter((member) => members.includes(member.person));
    const home = seats[0]!.state;
    const away = campaign.congress.members!.find((member) => member.state !== home)!.state;
    const network = (sharedState: boolean): Campaign => ({ ...campaign, congress: { ...campaign.congress,
      members: seats.map((member) => ({ ...member, party: "democrat", chamber: "house", state: sharedState || member.person === a ? home : away })), lobbying: [],
    } });
    const sparse = network(false);
    const connected = network(true);
    const low = propagateIssue(sparse, a, bill, "matched-willingness", 1);
    const high = propagateIssue(connected, a, bill, "matched-willingness", 1);
    expect(high.every((response) => response.accepted)).toBe(true);
    expect(low.every((response) => response.accepted)).toBe(true);
    expect(high.length).toBeGreaterThan(low.length);
    expect(knownPersonContacts(connected)).toEqual([]);
    console.log(`[hill-connectivity] sparse=${low.length}; connected=${high.length}; recorded=0`);
    const reordered = { ...connected, congress: { ...connected.congress, members: [...connected.congress.members!].reverse() } };
    expect(propagateIssue(reordered, a, bill, "matched-willingness", 1)).toEqual(high);
  });

  it("merges standing and recorded links once and excludes deceased recipients", () => {
    const base = withContacts([[source, a], [source, b], [source, a]]);
    const deceased = { ...base, people: { ...base.people, [b]: { ...base.people[b]!, alive: false } } };
    const responses = propagateIssue(deceased, source, bill, "deduplicated", 1, [c]);
    expect(responses.filter((response) => response.to === a)).toHaveLength(1);
    expect(responses.some((response) => response.to === b || response.to === c)).toBe(false);
    expect(new Set(responses.map((response) => response.to)).size).toBe(responses.length);
  });

  it("lets every standing recipient refuse without transmitting pressure", () => {
    const opposed = { ...campaign, people: Object.fromEntries(Object.entries(campaign.people).map(([id, runtime]) => [id, {
      ...runtime, base: { ...runtime.base, ideology: { economicLeftRight: -ideology.economicLeftRight, authLibertarian: -ideology.authLibertarian, nationalistGlobalist: -ideology.nationalistGlobalist } },
    }])) };
    const responses = propagateIssue(opposed, source, bill, "standing-refusal", 1);
    expect(responses.length).toBeGreaterThan(0);
    expect(responses.every((response) => !response.accepted && response.delta === 0 && response.depth === 1)).toBe(true);
  });

  it("brokers founding ties through the production day scheduler with identical save continuation", () => {
    const { pending } = issue(campaign, a, source);
    expect(knownPersonContacts(pending)).toEqual([]);
    const options = { phases: campaignTurnPhases(charter, true), horizonDays: 3, matterSources: [] };
    const advanced = advanceUntilAttention(pending, options);
    const restored = advanceUntilAttention(loadSave(createSave(pending)), options);
    expect(restored.campaign).toEqual(advanced.campaign);
    const touched = Object.values(advanced.campaign.people).filter((person) => (person.issuePressure?.length ?? 0) > 0);
    const direct = advanceUntilAttention(issue(campaign).pending, options);
    const directlyTouched = Object.values(direct.campaign.people).filter((person) => (person.issuePressure?.length ?? 0) > 0);
    expect(touched.length).toBeGreaterThan(directlyTouched.length);
    const recipients = advanced.campaign.congress.lobbying.at(-1)!.cooperation!.map((edge) => edge.to);
    expect(new Set(recipients).size).toBe(recipients.length);
    console.log(`[hill-scheduler] direct=${directlyTouched.length}; founding brokerage=${touched.length}; save continuation identical`);
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
    const question = { chamber: "house" as const, appeal: 0, required: 218, stance: "neutral" as const, actId: act.id };
    const support = (base: Campaign) => voteOn(base, question).rollCall!.find((row) => row.person === a)!.support;
    expect(support(result.next)).toBeGreaterThan(support(result.due));
    expect(voteOn(result.next, { ...question, actId: "another-act" }).rollCall!.find((row) => row.person === a)!.support).toBe(voteOn(result.due, { ...question, actId: "another-act" }).rollCall!.find((row) => row.person === a)!.support);
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
