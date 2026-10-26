import type { PersonId } from "@admin/world";
import type { Bill, Campaign, PersonCooperation } from "./state.js";
import { actOf } from "./legislative-acts.js";
import { ACT_ADVOCATE } from "./lobbying-advocate.js";
import { selectChairRunner } from "./appointments.js";
import { selectHill } from "./hill.js";
import { partyReading } from "./party-beliefs.js";
import { stateAffinity } from "./domestic-signature.js";
import { rapportOf } from "./ties.js";
import { noiseFrom, weigh, willDraw, type DecisionStamp } from "./willingness.js";
import { createRngStreams } from "./rng.js";
import type { CongressMember } from "./congress-members.js";

/** Actual recorded dialogue, distinct from the dossier's inferred biography contacts. */
export function knownPersonContacts(campaign: Campaign, actId?: string): readonly PersonCooperation[] {
  const latest = new Map<string, PersonCooperation>();
  for (const record of campaign.congress.lobbying) for (const edge of record.cooperation ?? []) {
    if (actId && edge.actId !== actId) continue;
    latest.set(`${edge.from}:${edge.to}:${edge.actId}`, edge);
  }
  return [...latest.values()].filter((edge) => edge.accepted).sort((a, b) => `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`));
}

type IssueLink = { readonly from: PersonId; readonly to: PersonId; readonly bond: number };

// Shared caucus membership is a weak connection; a delegation or a whip's
// working relationship carries more. These are planning weights, not obedience.
function standingBond(from: CongressMember, to: CongressMember, leaders: ReadonlySet<PersonId>): number {
  const caucus = from.chamber === to.chamber && from.party === to.party && from.party !== "independent";
  return Math.max(from.state === to.state ? 0.5 : 0, caucus ? (leaders.has(from.person) || leaders.has(to.person) ? 0.75 : 0.02) : 0);
}

function issueLinks(campaign: Campaign, person: PersonId, bill: Bill): readonly IssueLink[] {
  if (!campaign.people[person]?.alive) return [];
  const links = new Map<PersonId, IssueLink>();
  const members = campaign.congress.members ?? [];
  const source = members.find((member) => member.person === person);
  const leaders = new Set(selectHill(campaign).filter((member) => member.post.role === "role-congressional-leader").map((member) => member.figure.person));
  if (source) for (const target of members) {
    const bond = standingBond(source, target, leaders);
    if (bond > 0 && target.person !== person && campaign.people[target.person]?.alive) links.set(target.person, { from: person, to: target.person, bond });
  }
  for (const edge of knownPersonContacts(campaign, actOf(bill)?.id)) {
    if (edge.from === person && edge.to !== person && campaign.people[edge.to]?.alive) links.set(edge.to, { from: person, to: edge.to, bond: 1 });
  }
  return [...links.values()].sort((a, b) => b.bond - a.bond || a.to.localeCompare(b.to));
}

/** Weighted connectivity buys bounded reach, never a promise that anyone will agree. */
export function issueReach(campaign: Campaign, person: PersonId, bill: Bill): number {
  if (!campaign.people[person]?.alive) return 0;
  const act = actOf(bill);
  const advocate = act?.committee ? ACT_ADVOCATE[act.committee] : undefined;
  const leader = selectHill(campaign).some((member) => member.figure.person === person && member.post.role === "role-congressional-leader");
  if (leader || (advocate && selectChairRunner(campaign, advocate)?.base.id === person)) return 8;
  const chair = act?.committee && campaign.congress.committees[act.committee]?.chair === person;
  const member = campaign.congress.members?.some((entry) => entry.person === person);
  const weight = issueLinks(campaign, person, bill).reduce((sum, edge) => sum + edge.bond, 0);
  const office = chair ? 6 : member ? 2 : weight > 0 ? 1 : 0;
  return Math.min(8, office + Math.floor(weight / 2));
}

/** Public eligibility only. Private willingness is considered when the request arrives. */
export function availableIssueBrokers(campaign: Campaign, bill: Bill): readonly PersonId[] {
  const act = actOf(bill);
  const role = act?.committee ? ACT_ADVOCATE[act.committee] : undefined;
  const advocate = role ? selectChairRunner(campaign, role)?.base.id : undefined;
  return [...new Set([...knownPersonContacts(campaign, act?.id).map((edge) => edge.from).filter((id) => campaign.people[id]?.alive), ...(advocate ? [advocate] : []), ...selectHill(campaign).filter((member) => member.post.role === "role-congressional-leader" || campaign.congress.committees[act?.committee ?? ""]?.chair === member.figure.person).map((member) => member.figure.person)])];
}

/** A recipient retains personal convictions and constituency interests. */
export function issuePreference(campaign: Campaign, person: PersonId, bill: Bill): number {
  const runtime = campaign.people[person];
  const signature = actOf(bill)?.domestic;
  if (!runtime || !signature) return 0;
  const member = campaign.congress.members?.find((entry) => entry.person === person);
  const state = member ? campaign.states[member.state] : undefined;
  const local = state ? Math.max(-1, Math.min(1, stateAffinity(state.base.character, state.lean, signature))) : 0;
  return Math.max(-1, Math.min(1, 0.75 * partyReading(runtime.base.ideology, signature) + 0.25 * local));
}

export function issueCooperationDecision(campaign: Campaign, person: PersonId, bill: Bill, direction: 1 | -1, action: string, bond: number) {
  const runtime = campaign.people[person];
  if (!runtime?.alive) return undefined;
  const fit = issuePreference(campaign, person, bill) * direction;
  // Strong principled opposition cannot be bought with a friendly introduction.
  const principledRefusal = fit < -0.3 && runtime.base.integrity > 0.6;
  const decision = weigh("issue-cooperation", [
    { key: "policy-fit", source: "interest", value: 0.65 * fit },
    { key: "bond", source: "obligation", value: 0.12 * bond },
    { key: "rapport", source: "situation", value: 0.12 * (rapportOf(campaign.people, person) - 0.5) },
    { key: "ambition", source: "trait", value: 0.08 * runtime.base.ambition * Math.max(0, fit) },
  ], { threshold: principledRefusal ? 1 : -0.08, noiseBound: 0.05, noise: noiseFrom(willDraw(createRngStreams(campaign.seed), "issue-cooperation", action, person), 0.05) });
  return decision;
}

export function answersIssue(campaign: Campaign, person: PersonId, bill: Bill, direction: 1 | -1, action: string, bond: number): boolean {
  return issueCooperationDecision(campaign, person, bill, direction, action, bond)?.acts ?? false;
}

export type InfluenceResponse = PersonCooperation & { readonly delta: number; readonly depth: number; readonly decision?: DecisionStamp };

/** Directed breadth-first traversal: one actor once, two hops, bounded reach, and an independent answer at every step. */
export function propagateIssue(campaign: Campaign, source: PersonId, bill: Bill, action: string, direction: 1 | -1, exclude: readonly PersonId[] = []): readonly InfluenceResponse[] {
  const reach = issueReach(campaign, source, bill);
  const visited = new Set<PersonId>([source, ...exclude]);
  const queue = [{ person: source, depth: 0 }];
  const responses: InfluenceResponse[] = [];
  while (queue.length && responses.length < reach) {
    const current = queue.shift()!;
    if (current.depth >= 2) continue;
    for (const edge of issueLinks(campaign, current.person, bill)) {
      if (visited.has(edge.to) || responses.length >= reach) continue;
      visited.add(edge.to);
      const accepted = answersIssue(campaign, edge.to, bill, direction, action, edge.bond);
      const depth = current.depth + 1;
      responses.push({ from: edge.from, to: edge.to, actId: actOf(bill)?.id ?? bill.act, date: campaign.calendar, accepted, depth, delta: accepted ? direction * 0.06 / depth : 0,
        account: accepted ? "Accepted an issue-specific conversation; no vote was promised." : "Declined the issue-specific argument." });
      if (accepted) queue.push({ person: edge.to, depth });
    }
  }
  return responses;
}
