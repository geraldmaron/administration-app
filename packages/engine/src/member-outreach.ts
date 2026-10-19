import { stampOf } from "./willingness.js";
import type { PersonId } from "@admin/world";
import type { Bill, Campaign, IssuedMemberLobbyAct, LobbyRecord } from "./state.js";
import { addDays, compareDates } from "./clock.js";
import { actOf } from "./legislative-acts.js";
import type { Effect, EffectPacket } from "./effects.js";
import { answersIssue, issueCooperationDecision, availableIssueBrokers, issuePreference, propagateIssue, type InfluenceResponse } from "./person-network-influence.js";
import { LOBBY_PLAYS } from "./lobbying.js";

import { outreachAttentionSpent, OUTREACH_DAILY_LIMIT } from "./lobbying-person.js";
export const MEMBER_OUTREACH_DAILY_LIMIT = OUTREACH_DAILY_LIMIT;
const pending = (status: string) => ["issued", "in-progress", "awaiting-response"].includes(status);
export function outstandingMemberOutreach(campaign: Campaign): readonly IssuedMemberLobbyAct[] {
  return Object.values(campaign.issuedActs ?? {}).filter((act): act is IssuedMemberLobbyAct => act.kind === "member-lobby" && pending(act.status));
}

/** Every member request costs the existing call's standing and a slot of presidential attention. */
export function issueMemberOutreach(campaign: Campaign, member: PersonId, billId: string, broker?: PersonId) {
  const bill = campaign.bills[billId];
  const target = campaign.people[member];
  if (!target?.alive || !campaign.congress.members?.some((entry) => entry.person === member)) return { ok: false as const, reason: "That person does not hold a living voting seat." };
  if (!bill || bill.status !== "in-progress") return { ok: false as const, reason: "Choose a bill still before Congress." };
  if (broker && (broker === member || !availableIssueBrokers(campaign, bill).includes(broker))) return { ok: false as const, reason: "That broker does not hold an available office for this issue." };
  const slots = broker ? 2 : 1;
  const spent = outreachAttentionSpent(campaign);
  if (spent + slots > MEMBER_OUTREACH_DAILY_LIMIT) return { ok: false as const, reason: "Today's presidential outreach time is already allocated." };
  if (outstandingMemberOutreach(campaign).some((act) => act.member === member)) return { ok: false as const, reason: "A request to this member is already awaiting an answer." };
  const id = `member-lobby:${member}:${billId}:${campaign.calendar.year}-${campaign.calendar.month}-${campaign.calendar.day}`;
  if (campaign.issuedActs?.[id]) return { ok: false as const, reason: "This request has already been authorized today." };
  const act: IssuedMemberLobbyAct = { id, kind: "member-lobby", member, billId, coalition: !!broker, ...(broker ? { broker } : {}), status: "awaiting-response", issuedTurn: campaign.turn, issuedDate: campaign.calendar, dueDate: addDays(campaign.calendar, broker ? 3 : 1), chance: 0,
    forecast: { likelihood: "unknown", confidence: "low", confidenceBasis: "No recorded commitment establishes how the member will answer.", supporting: "The member's published constituency and party context can inform the request.", uncertainty: "The member and any contacts retain independent preferences. A conversation does not promise a vote.", source: "Presidential outreach authorization", asOf: campaign.calendar } };
  const packet: EffectPacket = { source: "action", actor: "player", turn: campaign.turn, narration: { summary: `${target.base.name} is asked to discuss ${bill.title}${broker ? ` through ${campaign.people[broker]?.base.name}` : " directly"}.` }, effects: [{ kind: "issuedAct", set: act }, { kind: "metric", deltas: { standing: (LOBBY_PLAYS.call.cost.standing ?? 0) * slots } }], provenance: { origin: "decision", entities: [member, billId, ...(broker ? [broker] : [])], systems: ["congress"] } };
  return { ok: true as const, packet, act };
}

function pressureEffects(campaign: Campaign, bill: Bill, source: string, responses: readonly InfluenceResponse[]): readonly Effect[] {
  const actId = actOf(bill)?.id;
  if (!actId) return [];
  return responses.filter((response) => response.accepted && response.delta !== 0 && campaign.people[response.to]).map((response): Effect => {
    const runtime = campaign.people[response.to]!;
    return { kind: "person", person: response.to, changes: { issuePressure: [...(runtime.issuePressure ?? []).filter((entry) => entry.source !== source && compareDates(entry.through, campaign.calendar) >= 0), { actId, source, delta: response.delta, through: addDays(campaign.calendar, 21), account: response.account }] } };
  });
}

function answered(campaign: Campaign, act: IssuedMemberLobbyAct, bill: Bill): readonly InfluenceResponse[] {
  const actId = actOf(bill)?.id ?? bill.act;
  const source = act.broker ?? act.member;
  const broker = campaign.people[source];
  const fit = issuePreference(campaign, source, bill);
  // Ambition yields constructive brokerage or organized policy opposition in the actor's own network.
  const direction: 1 | -1 = act.broker && fit < -0.3 && (broker?.base.ambition ?? 0) >= 0.7 ? -1 : 1;
  if (act.broker && !answersIssue(campaign, source, bill, direction, act.id, 0)) return [];
  const decision = issueCooperationDecision(campaign, act.member, bill, direction, act.id, act.broker ? 0.25 : 0);
  const accepts = decision?.acts ?? false;
  const primary: InfluenceResponse = { from: source, to: act.member, actId, date: campaign.calendar, accepted: accepts, depth: 0, delta: accepts ? 0.08 * direction : 0,
    ...(decision ? { decision: stampOf(decision, act.member, actId, "intelligence") } : {}),
    account: accepts ? direction === 1 ? "Accepted a policy conversation in support; no vote was promised." : "Joined the broker's argument against this policy; no vote was promised." : "Declined the policy argument." };
  return [primary, ...(act.coalition ? propagateIssue(campaign, source, bill, act.id, direction, [act.member]) : [])];
}

/** Resolution rechecks identity/office/issue eligibility and persists observable dialogue, not private motives. */
export function resolveMemberOutreach(campaign: Campaign, id: string) {
  const act = campaign.issuedActs?.[id];
  if (act?.kind !== "member-lobby" || !pending(act.status)) return { ok: false as const, reason: "No pending member request exists." };
  if (compareDates(campaign.calendar, act.dueDate) < 0) return { ok: false as const, reason: "The member's response is not due yet." };
  const bill = campaign.bills[act.billId];
  const eligible = bill?.status === "in-progress" && campaign.people[act.member]?.alive && campaign.congress.members?.some((entry) => entry.person === act.member) && (!act.broker || availableIssueBrokers(campaign, bill).includes(act.broker));
  const responses = eligible && bill ? answered(campaign, act, bill) : [];
  const landed = responses.some((response) => response.accepted);
  const account = !eligible ? "The request lapsed because its member, broker or live bill is no longer available." : responses.length === 0 ? "The broker declined to organize this policy effort." : `${responses.some((response) => response.delta < 0) ? "The broker organized policy opposition. " : ""}${responses.filter((response) => response.accepted).length} participants accepted issue-specific dialogue; ${responses.filter((response) => !response.accepted).length} declined. No votes were promised.`;
  const record: LobbyRecord = { id: act.id, member: act.member, billId: act.billId, approach: "call", turn: campaign.turn, landed, account, cooperation: responses.filter((response) => response.from !== response.to).map(({ delta: _delta, depth: _depth, decision: _decision, ...edge }) => edge) };
  const packet: EffectPacket = { source: "action", actor: "player", turn: campaign.turn, narration: { summary: account }, effects: [{ kind: "congress", set: { ...campaign.congress, lobbying: [...campaign.congress.lobbying, record] } }, ...(bill ? pressureEffects(campaign, bill, act.id, responses) : []), { kind: "issuedAct", set: { ...act, status: eligible ? "resolved" : "expired", outcome: { landed, account } } }], provenance: { origin: "scheduled", causeIds: [act.id], entities: [act.member, act.billId], systems: ["congress"], effectiveDate: campaign.calendar, ...(responses[0]?.decision ? { decision: responses[0].decision } : {}) } };
  return { ok: true as const, packet, record };
}
