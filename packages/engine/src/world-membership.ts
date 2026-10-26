import { organizations, type NationId, type Organization, type OrgId } from "@admin/world";
import { selectNation, selectRelationship, type ActionRecord, type Campaign } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { RngStreams } from "./rng.js";
import { grudgeWeight } from "./relationships.js";
import { liveTemperament } from "./temperament.js";
import { liveMemberships } from "./instrument-gates.js";
import { stampOf, type Willingness } from "./willingness.js";
import { decideVote, eventPacket, filing, liveMembers, marker } from "./world-events-filing.js";
import { nameOf } from "./war-entry.js";
import { admissionVoteTerms, templateOf, withdrawalVoteTerms, type WithdrawalReading } from "./world-event-templates.js";
import { actsInWindow, actWeight } from "./npc-response.js";

// A body changing its roster at its summit: an outsider admitted, a member
// leaving. Leaving is a procedure, not a vote: a member gives notice under the
// body's own exit clause, the notice runs, and at a later summit the member
// either goes or takes the notice back. Without one, every member whose trust
// toward the others sat at the line could walk out at any quarter, and a body
// whose members read each other near zero lost a seat a summit: OPEC+ fourteen
// members in four years.

/** Bodies meet about quarterly; an application or a notice is heard at a meeting, not any week. */
export const SUMMIT_EVERY_WEEKS = 13;
/** How warm an outsider must read toward the members before it applies at all. Planning value. */
const APPLICANT_TRUST = 0.4;
/**
 * How cold a member must have grown toward the others before leaving is on its
 * agenda. A precondition, not the decision: the weighing below reads what the
 * member would give up as well as what it resents. Raising it admits more
 * leavers, since a member is eligible at or below it.
 */
const LEAVER_TRUST = -0.05;

/**
 * Each body's exit clause as it was read when this table was written, from the
 * founding texts as commonly cited; the texts were not opened in this change,
 * so each figure is a planning value until they are. `null` is a body with no
 * exit clause, which a member leaves only by repudiating it.
 *   EU: Article 50 TEU, two years from notification unless extended.
 *   CSTO: six months' notice.  AU: Constitutive Act Article 31, one year.
 *   Mercosur: Treaty of Asuncion, sixty days.  CPTPP: six months.
 *   OPEC+: a member announces and is out at the turn of the year.
 *   SCO: Charter Article 13, notice at least twelve months ahead.
 *   ASEAN, the GCC and BRICS: no withdrawal clause.
 */
const NOTICE_WEEKS: Readonly<Record<string, number | null>> = {
  "ORG-EU": 104,
  "ORG-CSTO": 26,
  "ORG-AU": 52,
  "ORG-MERCOSUR": 9,
  "ORG-CPTPP": 26,
  "ORG-OPEC-PLUS": 4,
  "ORG-SCO": 52,
  "ORG-ASEAN": null,
  "ORG-GCC": null,
  "ORG-BRICS": null,
};

/** Bodies whose roster the world changes on its own. One the United States sits in admits nobody without the President, which is not modeled here. */
function openBodies(campaign: Campaign): readonly Organization[] {
  return organizations.filter((org) => !liveMembers(campaign, org.id).includes(campaign.founding.nation) && org.members.length > 2);
}

function meanTrustFrom(campaign: Campaign, from: NationId, to: readonly NationId[]): number {
  const edges = to.flatMap((id) => selectRelationship(campaign, from, id) ?? []);
  return edges.length < 2 ? -1 : edges.reduce((sum, edge) => sum + edge.trust, 0) / edges.length;
}

/** The share of members that must agree to admit: the same supermajority a bloc's sanctions need. */
const ADMISSION_MAJORITY = 0.85;

const passes = (votes: readonly { readonly will: Willingness }[]) =>
  votes.length > 0 && votes.filter((vote) => vote.will.acts).length / votes.length >= ADMISSION_MAJORITY;

function applicant(campaign: Campaign, org: Organization, members: readonly NationId[]): NationId | undefined {
  const inside = new Set(members as readonly string[]);
  const conflicting = new Set(org.conflictsWith as readonly string[]);
  const near = new Set(members.flatMap((m) => selectNation(campaign, m)?.base.geo.neighbors ?? []).map((id) => id as string));
  const outsiders = [...near]
    .filter((id) => !inside.has(id) && id !== (campaign.founding.nation as string) && campaign.nations[id as NationId])
    .filter((id) => !liveMemberships(campaign, id as NationId).some((body) => conflicting.has(body as string)))
    .map((id) => ({ id: id as NationId, trust: meanTrustFrom(campaign, id as NationId, members) }))
    .filter((entry) => entry.trust >= APPLICANT_TRUST)
    .sort((a, b) => b.trust - a.trust || (a.id as string).localeCompare(b.id as string));
  return outsiders[0]?.id;
}

function admission(campaign: Campaign, org: Organization, streams: RngStreams): readonly EffectPacket[] {
  const members = liveMembers(campaign, org.id);
  const candidate = applicant(campaign, org, members);
  if (!candidate) return [];
  const { threshold } = templateOf("accession");
  const votes = members.flatMap((member) => {
    const edge = selectRelationship(campaign, member, candidate);
    const temper = liveTemperament(campaign, member);
    if (!edge || !temper) return [];
    return [{ member, will: decideVote(streams, admissionVoteTerms(temper, edge), threshold, [member, org.id, candidate, "admit"]) }];
  });
  if (!passes(votes)) return [];
  const names = { actor: org.name, subject: nameOf(campaign, candidate) };
  const item = filing(campaign, "accession", names, { subject: candidate }, "public", campaign.turn % 2 === 0 ? 0 : 1);
  const lead = votes[0]!;
  const effects: readonly Effect[] = [
    { kind: "membership", nation: candidate, org: org.id, change: "accede" },
    marker(campaign, "accession", candidate, lead.member, item.headline),
    { kind: "feed", items: [item] },
  ];
  // Each member's vote is its own decision of record, filed before the admission it made.
  const record = votes.map((vote) =>
    eventPacket(
      campaign,
      `${nameOf(campaign, vote.member)} voted ${vote.will.acts ? "to admit" : "against admitting"} ${names.subject} to the ${org.name}.`,
      [],
      stampOf(vote.will, vote.member as string, candidate as string, "public"),
      [vote.member, candidate],
    ),
  );
  return [...record, eventPacket(campaign, item.headline, effects, stampOf(lead.will, lead.member as string, candidate as string, "public"), [candidate, org.id])];
}

// --- Leaving: notice, then a decision at a later summit ---

const NOTICE_SYSTEM = "withdrawal-notice";
const REVOKED_SYSTEM = "withdrawal-notice-revoked";
const DEPARTED_SYSTEM = "withdrawal-completed";

/** The notice a member has standing to leave a body, read off the ledger: the turn it was given, unless it was since taken back or spent by the departure it announced. */
export function standingNotice(campaign: Campaign, member: NationId, org: OrgId): number | undefined {
  const about = (entry: ActionRecord) => {
    const entities = entry.causal?.entities ?? [];
    return entities[0] === (member as string) && entities[1] === (org as string);
  };
  for (let i = campaign.ledger.length - 1; i >= 0; i -= 1) {
    const entry = campaign.ledger[i]!;
    const systems = entry.causal?.systems ?? [];
    if (!about(entry)) continue;
    if (systems.includes(REVOKED_SYSTEM) || systems.includes(DEPARTED_SYSTEM)) return undefined;
    if (systems.includes(NOTICE_SYSTEM)) return entry.turn;
  }
  return undefined;
}

/**
 * What a member would give up and what it holds against the others: its trade
 * with them, the guarantee a defense body gives it against whoever threatens it
 * from outside, the grudges it carries and the coercion fellow members have
 * aimed at it lately, and what the body's own exit costs.
 */
function withdrawalReading(campaign: Campaign, org: Organization, member: NationId, others: readonly NationId[]): WithdrawalReading | undefined {
  const meanTrust = meanTrustFrom(campaign, member, others);
  if (meanTrust === -1) return undefined;
  const edges = others.flatMap((id) => selectRelationship(campaign, member, id) ?? []);
  const inside = new Set(others as readonly string[]);
  const outsideThreat = Object.values(campaign.relationships)
    .filter((edge) => edge.to === member && !inside.has(edge.from as string) && edge.from !== member)
    .reduce((max, edge) => Math.max(max, edge.militaryThreat), 0);
  const coerced = actsInWindow(campaign)
    .filter((act) => act.target === member && inside.has(act.actor as string))
    .reduce((sum, act) => sum + actWeight(act), 0);
  const notice = NOTICE_WEEKS[org.id as string] ?? null;
  return {
    meanTrust,
    trade: edges.reduce((sum, edge) => sum + edge.tradeDependence, 0) / Math.max(1, edges.length),
    protection: org.kind === "defense" ? outsideThreat : 0,
    grievance: Math.min(1, edges.reduce((sum, edge) => sum + grudgeWeight(edge), 0) + coerced),
    exitCost: org.tradeCompetence === "customs-union" ? 0.2 : org.kind === "political" ? 0.05 : 0.1,
    repudiation: notice === null,
  };
}

function weighLeaving(campaign: Campaign, org: Organization, member: NationId, streams: RngStreams, round: string): Willingness | undefined {
  const members = liveMembers(campaign, org.id);
  const others = members.filter((id) => id !== member);
  const temper = liveTemperament(campaign, member);
  const reading = withdrawalReading(campaign, org, member, others);
  if (!temper || !reading) return undefined;
  const { threshold } = templateOf("accession");
  return decideVote(streams, withdrawalVoteTerms(temper, reading), threshold, [member, org.id, "withdraw", round]);
}

function noticePacket(campaign: Campaign, org: Organization, member: NationId, will: Willingness, revoked: boolean): EffectPacket {
  const name = nameOf(campaign, member);
  const line = revoked ? `${name} withdraws its notice to leave the ${org.name}.` : `${name} gives notice that it will leave the ${org.name}.`;
  const item = { turn: campaign.turn + 1, kind: "bloc" as const, visibility: "public" as const, headline: line, target: member };
  const packet = eventPacket(campaign, line, [{ kind: "feed", items: [item] }], stampOf(will, member as string, org.id, "public"), [member, org.id]);
  return { ...packet, provenance: { ...packet.provenance!, systems: ["world-events", revoked ? REVOKED_SYSTEM : NOTICE_SYSTEM] } };
}

function departurePacket(campaign: Campaign, org: Organization, member: NationId, will: Willingness): EffectPacket {
  const item = filing(campaign, "accession", { actor: org.name, subject: nameOf(campaign, member) }, { subject: member }, "public", 2);
  const effects: readonly Effect[] = [{ kind: "membership", nation: member, org: org.id, change: "withdraw" }, { kind: "feed", items: [item] }];
  const packet = eventPacket(campaign, item.headline, effects, stampOf(will, member as string, org.id, "public"), [member, org.id]);
  return { ...packet, provenance: { ...packet.provenance!, systems: ["world-events", DEPARTED_SYSTEM] } };
}

/**
 * A notice that has run its course is decided again: the member goes if it
 * still wants to, and takes the notice back if it no longer does. A body with
 * no exit clause has no course to run, so its notice is decided at the next
 * summit, against the extra cost of repudiating a treaty that says nothing.
 */
function settleNotice(campaign: Campaign, org: Organization, member: NationId, given: number, streams: RngStreams): EffectPacket | undefined {
  // A body this table does not know is read as having no clause.
  const weeks = NOTICE_WEEKS[org.id as string] ?? SUMMIT_EVERY_WEEKS;
  if (campaign.turn - given < weeks) return undefined;
  const will = weighLeaving(campaign, org, member, streams, `settle-${given}`);
  if (!will) return undefined;
  return will.acts ? departurePacket(campaign, org, member, will) : noticePacket(campaign, org, member, will, true);
}

function withdrawal(campaign: Campaign, org: Organization, streams: RngStreams): readonly EffectPacket[] {
  const members = liveMembers(campaign, org.id);
  for (const member of members) {
    const given = standingNotice(campaign, member, org.id);
    if (given !== undefined) {
      const settled = settleNotice(campaign, org, member, given, streams);
      if (settled) return [settled];
      continue;
    }
    if (meanTrustFrom(campaign, member, members.filter((id) => id !== member)) > LEAVER_TRUST) continue;
    // Keyed by the summit, so a member that held at one meeting weighs it
    // afresh at the next rather than carrying the same draw for a campaign.
    const will = weighLeaving(campaign, org, member, streams, `summit-${campaign.turn}`);
    if (will?.acts) return [noticePacket(campaign, org, member, will, false)];
  }
  return [];
}

export function rosterPackets(campaign: Campaign, streams: RngStreams): readonly EffectPacket[] {
  if (campaign.turn % SUMMIT_EVERY_WEEKS !== 0) return [];
  return openBodies(campaign).flatMap((org) => [...admission(campaign, org, streams), ...withdrawal(campaign, org, streams)]);
}
