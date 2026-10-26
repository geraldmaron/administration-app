import { ELECTION_CALENDAR, organizations, type NationId, type Organization, type Relationship } from "@admin/world";
import { hasIntelOnNation, selectActiveConflicts, selectNation, selectRelationship, type Campaign, type FeedItem, type GameDate } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
import { createRngStreams, type RngStreams } from "./rng.js";
import { createGrudge, retained } from "./relationships.js";
import { liveTemperament } from "./temperament.js";
import { liveMemberships } from "./instrument-gates.js";
import { defenseHolds } from "./compacts.js";
import { actsInWindow, type StatedAct } from "./npc-response.js";
import { selectConflictBetween } from "./conflicts.js";
import { daysBetween } from "./clock.js";
import { elapsedDays } from "./pace.js";
import { stampOf, type Willingness } from "./willingness.js";
import { decideHostileAct, decideVote, eventPacket, filing, liveMembers, marker, onEdge } from "./world-events-filing.js";
import { nameOf } from "./war-entry.js";
import {
  dyadKindOf,
  firedRecently,
  hostileActTerms,
  sanctionVoteTerms,
  sourcedRivals,
  templateOf,
} from "./world-event-templates.js";
import { aidPackets, warAidPackets } from "./world-events-aid.js";
import { rosterPackets } from "./world-membership.js";
import { borderIncidentAssessmentPackets, borderIncidentPackets, borderIncidentPairKey } from "./border-incidents.js";

// The world acting on itself: governments that are not the President's
// sanctioning as a bloc, deliberately clashing on a border, joining and leaving
// bodies, interfering in elections and sending help. Separate frontier hazards
// can reach the player's border without assigning either command the first shot.
// Government choices use willingness; hazards use their own seeded draw.

export { applyMembership, type MembershipEffect } from "./world-effects.js";

// --- Sanctions package: a customs union acting as one ---

/** The share of a union's voting members that must agree. A planning value standing in for unanimity with room to abstain. */
const UNION_SUPERMAJORITY = 0.85;

/**
 * Who a bloc would sanction: a government a member holds a sourced rivalry
 * with, or one waging a war against a member or a member's neighbor. The one
 * the members read worst goes first.
 */
function sanctionTarget(campaign: Campaign, members: readonly NationId[]): NationId | undefined {
  const inside = new Set(members as readonly string[]);
  const neighbors = new Set(members.flatMap((m) => selectNation(campaign, m)?.base.geo.neighbors ?? []).map((id) => id as string));
  const candidates = new Set<string>();
  for (const conflict of selectActiveConflicts(campaign)) {
    if (inside.has(conflict.defender as string) || neighbors.has(conflict.defender as string)) candidates.add(conflict.aggressor as string);
  }
  for (const member of members) {
    for (const rival of sourcedRivals(member)) candidates.add(rival as string);
  }
  const eligible = [...candidates].filter((id) => !inside.has(id) && id !== (campaign.founding.nation as string)).sort();
  const reading = (id: string) => meanTrust(campaign, members, id as NationId);
  return eligible.sort((a, b) => reading(a) - reading(b) || a.localeCompare(b))[0] as NationId | undefined;
}

function meanTrust(campaign: Campaign, from: readonly NationId[], to: NationId): number {
  const edges = from.flatMap((id) => selectRelationship(campaign, id, to) ?? []);
  return edges.length === 0 ? 0 : edges.reduce((sum, edge) => sum + edge.trust, 0) / edges.length;
}

type Vote = { readonly member: NationId; readonly will: Willingness };

function sanctionVotes(campaign: Campaign, org: Organization, members: readonly NationId[], subject: NationId, streams: RngStreams): readonly Vote[] {
  const { threshold } = templateOf("sanctions-package");
  return members.flatMap((member) => {
    const edge = selectRelationship(campaign, member, subject);
    const temper = liveTemperament(campaign, member);
    if (!edge || !temper) return [];
    const will = decideVote(streams, sanctionVoteTerms(temper, edge), threshold, [member, org.id, subject, "sanction"]);
    return [{ member, will }];
  });
}

const passes = (votes: readonly Vote[]) => votes.length > 0 && votes.filter((vote) => vote.will.acts).length / votes.length >= UNION_SUPERMAJORITY;

function memberSanction(campaign: Campaign, vote: Vote, subject: NationId, headline: FeedItem | undefined): EffectPacket {
  const line = `${nameOf(campaign, vote.member)} applied the bloc's sanctions to ${nameOf(campaign, subject)}.`;
  const effects: readonly Effect[] = [
    { ...marker(campaign, "sanctions-package", vote.member, subject, line), deltas: { trust: -0.03, tension: 0.04 } },
    ...onEdge(campaign, { kind: "relationship", from: subject, to: vote.member, deltas: { trust: -0.03, tension: 0.05 } }),
    ...(headline ? [{ kind: "feed" as const, items: [headline] }] : []),
  ];
  return eventPacket(campaign, line, effects, stampOf(vote.will, vote.member as string, subject as string, "public"), [vote.member, subject]);
}

function sanctionPackets(campaign: Campaign, streams: RngStreams): readonly EffectPacket[] {
  return organizations
    .filter((org) => org.tradeCompetence === "customs-union")
    .flatMap((org) => {
      const members = liveMembers(campaign, org.id);
      const subject = sanctionTarget(campaign, members);
      if (!subject || members.some((m) => firedRecently(selectRelationship(campaign, m, subject), "sanctions-package", campaign.turn))) return [];
      const votes = sanctionVotes(campaign, org, members, subject, streams);
      if (!passes(votes)) return [];
      const agreed = votes.filter((vote) => vote.will.acts);
      const headline = filing(campaign, "sanctions-package", { actor: org.name, subject: nameOf(campaign, subject) }, { subject }, "public");
      return agreed.map((vote, index) => memberSanction(campaign, vote, subject, index === 0 ? headline : undefined));
    });
}

// --- Border clash: two rivals' garrisons ---
//
// Whether a government is willing to clash with a rival is its own standing
// decision; when it does is a weekly hazard. Run as a gate on willingness
// alone, a willing pair clashed the week its cooldown lapsed and every clash
// raised the tension that kept it willing, so India and Pakistan clashed nine
// times in two years at one twelve-week gap. Clashes come in episodes instead:
// a low base hazard, raised for a season by what has just passed between the
// two, after a rest, and damped where the side that would be hit sits under a
// defense treaty the other side is outside of.

/** At most this many clashes a week, the likeliest first: a world where every rival border flares at once reads as noise. */
const MAX_CLASHES = 2;

/**
 * Planning values, for the owner to set against an armed-clash series once one
 * is opened: a willing pair's weekly hazard outside any episode (about one
 * clash in two years), how much each recent clash or show of force between the
 * two raises it, and how fast that episode fades. The gain times the
 * episode's length stays well below one clash per clash, so episodes end.
 */
const CLASH_BASE_RATE = 0.01;
const EPISODE_GAIN = 2.5;
const EPISODE_HALF_LIFE_DAYS = 56;
/** How long a clash still counts toward an episode. */
const EPISODE_WINDOW_WEEKS = 26;
/** A defense treaty the side that would be hit sits under, and the would-be attacker is outside of. */
const TREATY_DAMPING = 0.1;
/** A body that has consulted over this attacker in the past year deters it again. */
const CONSULTED_DAMPING = 0.5;
const CONSULTATION_MEMORY_WEEKS = 52;

const CLASH_KIND = "world-event:border-clash";
const CONSULTATION_KIND = "world-event:consultation";

type ClashSide = { readonly actor: NationId; readonly subject: NationId; readonly edge: Relationship };

function willingToClash(campaign: Campaign, actor: NationId, subject: NationId, blocked: ReadonlySet<string>): ClashSide | undefined {
  const edge = selectRelationship(campaign, actor, subject);
  if (!edge || subject === campaign.founding.nation || blocked.has(borderIncidentPairKey(actor, subject))) return undefined;
  const kind = dyadKindOf(actor, subject);
  const sourced = kind === "hostile" || kind === "rivalrous";
  if (!sourced && !(edge.tension >= 0.6 && edge.trust <= -0.3)) return undefined;
  if (selectConflictBetween(campaign, actor, subject)) return undefined;
  return { actor, subject, edge };
}

// Each neighboring pair once, with the sides that could fire: a clash is one
// event between two garrisons, and reading it from both sides drew it twice.
function clashPairs(campaign: Campaign, blocked: ReadonlySet<string>): readonly (readonly ClashSide[])[] {
  const player = campaign.founding.nation;
  return (Object.keys(campaign.nations) as NationId[])
    .filter((id) => id !== player)
    .sort()
    .flatMap((a) =>
      (selectNation(campaign, a)?.base.geo.neighbors ?? [])
        .filter((b) => (a as string) < (b as string) && b !== player && campaign.nations[b] !== undefined)
        .sort()
        .flatMap((b) => {
          const sides = [willingToClash(campaign, a, b, blocked), willingToClash(campaign, b, a, blocked)].flatMap((side) => (side ? [side] : []));
          return sides.length > 0 ? [sides] : [];
        }),
    );
}

/** The turns the pair has clashed on, newest first, read off both edges once each. */
function clashTurns(campaign: Campaign, a: NationId, b: NationId): readonly number[] {
  const edges = [selectRelationship(campaign, a, b), selectRelationship(campaign, b, a)];
  const turns = edges.flatMap((edge) => (edge?.history ?? []).filter((event) => event.kind === CLASH_KIND).map((event) => event.turn));
  return [...new Set(turns)].sort((x, y) => y - x);
}

const agedWeeks = (weeks: number) => retained(elapsedDays(weeks), EPISODE_HALF_LIFE_DAYS);

/** What has just passed between the two: recent clashes and shows of force either way, each fading. */
function episodeStock(campaign: Campaign, a: NationId, b: NationId, acts: readonly StatedAct[]): number {
  const clashes = clashTurns(campaign, a, b)
    .filter((turn) => campaign.turn - turn < EPISODE_WINDOW_WEEKS)
    .reduce((sum, turn) => sum + agedWeeks(campaign.turn - turn), 0);
  const force = acts
    .filter((act) => act.instrument === "military" && act.rung >= 2 && ((act.actor === a && act.target === b) || (act.actor === b && act.target === a)))
    .reduce((sum, act) => sum + agedWeeks(campaign.turn - act.turn), 0);
  return clashes + force;
}

/** The defense bodies whose promise covers `subject` and do not count `actor` among their members. */
function guarantorsOf(campaign: Campaign, subject: NationId, actor: NationId): readonly Organization[] {
  const region = selectNation(campaign, subject)?.base.geo.region as string | undefined;
  const actorBodies = new Set(liveMemberships(campaign, actor) as readonly string[]);
  return liveMemberships(campaign, subject).flatMap((org) => {
    const body = organizations.find((candidate) => candidate.id === org);
    if (!body || body.kind !== "defense" || actorBodies.has(org as string)) return [];
    return region !== undefined && defenseHolds(body.defenseScope, region) ? [body] : [];
  });
}

function consultedRecently(campaign: Campaign, members: readonly NationId[], actor: NationId): boolean {
  return members.some((member) =>
    (selectRelationship(campaign, member, actor)?.history ?? []).some(
      (event) => event.kind === CONSULTATION_KIND && campaign.turn - event.turn < CONSULTATION_MEMORY_WEEKS,
    ),
  );
}

/** The pair's weekly clash hazard: zero while it rests, the base raised by the episode, damped by a guarantee. */
export function clashHazard(campaign: Campaign, actor: NationId, subject: NationId, acts: readonly StatedAct[]): number {
  const last = clashTurns(campaign, actor, subject)[0];
  // Both garrisons pull back and are reinforced before anything else happens.
  if (last !== undefined && campaign.turn - last < templateOf("border-clash").cooldownWeeks) return 0;
  const guarantors = guarantorsOf(campaign, subject, actor);
  const members = guarantors.flatMap((body) => liveMembers(campaign, body.id));
  const damping = guarantors.length === 0 ? 1 : TREATY_DAMPING * (consultedRecently(campaign, members, actor) ? CONSULTED_DAMPING : 1);
  const rate = CLASH_BASE_RATE * (1 + EPISODE_GAIN * episodeStock(campaign, actor, subject, acts)) * damping;
  return 1 - Math.exp(-rate);
}

function clashEffects(campaign: Campaign, actor: NationId, subject: NationId, line: string): readonly Effect[] {
  const vengefulness = selectNation(campaign, subject)?.traits.vengefulness ?? 0.5;
  return [
    { ...marker(campaign, "border-clash", actor, subject, line), deltas: { tension: 0.08, militaryThreat: 0.05 } },
    ...onEdge(campaign, {
      kind: "relationship",
      from: subject,
      to: actor,
      deltas: { tension: 0.1, trust: -0.05, militaryThreat: 0.08 },
      addGrudge: createGrudge("a clash on the border", 0.2, campaign.turn, vengefulness),
    }),
  ];
}

/**
 * The guarantors consult when a clash lands on a party's border: one filed
 * consultation per body, its members' alarm toward the attacker, and the
 * record that deters that attacker against the body's members for a year.
 */
function consultationPackets(campaign: Campaign, actor: NationId, subject: NationId): readonly EffectPacket[] {
  return guarantorsOf(campaign, subject, actor).map((body) => {
    const members = liveMembers(campaign, body.id).filter((member) => member !== actor);
    const line = `${body.name} members consult after the clash on ${nameOf(campaign, subject)}'s border with ${nameOf(campaign, actor)}.`;
    const effects: readonly Effect[] = [
      ...members.flatMap((member) =>
        onEdge(campaign, {
          kind: "relationship",
          from: member,
          to: actor,
          deltas: { tension: 0.02 },
          addHistory: { turn: campaign.turn, kind: CONSULTATION_KIND, description: line },
        }),
      ),
      { kind: "feed", items: [{ turn: campaign.turn + 1, kind: "bloc", visibility: "public", headline: line, actor: subject, target: actor }] },
    ];
    return {
      source: "simulate" as const,
      actor: "world" as const,
      turn: campaign.turn,
      narration: { summary: line },
      effects,
      provenance: { origin: "world" as const, entities: [body.id as string, subject as string, actor as string], systems: ["world-events"] },
    };
  });
}

type Fired = { readonly actor: NationId; readonly subject: NationId; readonly will: Willingness; readonly hazard: number };

// The side more willing to fire is the one that does; the pair then draws its
// week once, keyed on the pair and the week, so the timing is the hazard's.
function willingPairs(campaign: Campaign, streams: RngStreams, blocked: ReadonlySet<string>): readonly Fired[] {
  const { threshold } = templateOf("border-clash");
  const acts = actsInWindow(campaign);
  return clashPairs(campaign, blocked).flatMap((sides) => {
    const willing = sides.flatMap(({ actor, subject, edge }) => {
      const temper = liveTemperament(campaign, actor);
      if (!temper) return [];
      const will = decideHostileAct(streams, hostileActTerms(temper, edge, dyadKindOf(actor, subject), true), threshold, [actor, subject, "border-clash"]);
      return will.acts ? [{ actor, subject, will }] : [];
    });
    const side = [...willing].sort((x, y) => y.will.margin - x.will.margin || (x.actor as string).localeCompare(y.actor as string))[0];
    if (!side) return [];
    const hazard = clashHazard(campaign, side.actor, side.subject, acts);
    const draw = streams.stream("border-clash-week", borderIncidentPairKey(side.actor, side.subject), campaign.turn).next();
    return draw < hazard ? [{ ...side, hazard }] : [];
  });
}

function clashPackets(campaign: Campaign, streams: RngStreams, blocked: ReadonlySet<string>): readonly EffectPacket[] {
  return [...willingPairs(campaign, streams, blocked)]
    .sort((a, b) => b.hazard - a.hazard || `${a.actor}:${a.subject}`.localeCompare(`${b.actor}:${b.subject}`))
    .slice(0, MAX_CLASHES)
    .flatMap(({ actor, subject, will }) => {
      const names = { actor: nameOf(campaign, actor), subject: nameOf(campaign, subject) };
      const item = filing(campaign, "border-clash", names, { actor, subject }, "public");
      const effects = [...clashEffects(campaign, actor, subject, item.headline), { kind: "feed" as const, items: [item] }];
      return [
        eventPacket(campaign, item.headline, effects, stampOf(will, actor as string, subject as string, "intelligence"), [actor, subject]),
        ...consultationPackets(campaign, actor, subject),
      ];
    });
}

// --- Election interference: a rival working a vote abroad ---

/** How far ahead of a vote a rival starts working it. */
const INTERFERENCE_WINDOW_DAYS = 56;

function nextVote(campaign: Campaign, nation: NationId): GameDate | undefined {
  const seated = campaign.foreignPolitics?.seats[nation]?.next;
  if (seated) return seated;
  const row = ELECTION_CALENDAR.find((entry) => entry.nationId === (nation as string));
  if (!row?.when || (row.precision !== "month" && row.precision !== "exact_date")) return undefined;
  return { year: row.when.year, month: row.when.month, day: row.when.day ?? 15 };
}

function votingSoon(campaign: Campaign): readonly NationId[] {
  return (Object.keys(campaign.nations) as NationId[]).filter((id) => {
    if (id === campaign.founding.nation) return false;
    const date = nextVote(campaign, id);
    if (!date) return false;
    const days = daysBetween(campaign.calendar, date);
    return days >= 0 && days <= INTERFERENCE_WINDOW_DAYS;
  });
}

function interferers(campaign: Campaign, target: NationId): readonly NationId[] {
  return sourcedRivals(target).filter((actor) => actor !== campaign.founding.nation && campaign.nations[actor] !== undefined);
}

function interferencePackets(campaign: Campaign, streams: RngStreams): readonly EffectPacket[] {
  const { threshold } = templateOf("election-interference");
  return votingSoon(campaign).flatMap((target) => {
    const acted = interferers(campaign, target).flatMap((actor) => {
      const edge = selectRelationship(campaign, actor, target);
      const temper = liveTemperament(campaign, actor);
      if (!edge || !temper || firedRecently(edge, "election-interference", campaign.turn)) return [];
      const neighbors = selectNation(campaign, actor)?.base.geo.neighbors.includes(target) ?? false;
      const will = decideHostileAct(streams, hostileActTerms(temper, edge, dyadKindOf(actor, target), neighbors), threshold, [actor, target, "interfere"]);
      return will.acts ? [{ actor, will }] : [];
    });
    const first = acted[0];
    if (!first) return [];
    const names = { actor: nameOf(campaign, first.actor), subject: nameOf(campaign, target) };
    const item = filing(campaign, "election-interference", names, { actor: first.actor, subject: target }, "intelligence");
    const seen = hasIntelOnNation(campaign, first.actor);
    const effects: readonly Effect[] = [
      marker(campaign, "election-interference", first.actor, target, item.headline),
      ...onEdge(campaign, { kind: "relationship", from: target, to: first.actor, deltas: { tension: 0.03 } }),
      ...(seen ? [{ kind: "feed" as const, items: [item] }] : []),
    ];
    return [eventPacket(campaign, item.headline, effects, stampOf(first.will, first.actor as string, target as string, "intelligence"), [first.actor, target])];
  });
}

/**
 * The week's world events, on day 3 after the wars have moved. Each family
 * finds its occasions on the state the week opened this day with; the packets
 * are applied in order after the phase returns.
 */
export const worldEventPhase: TurnPhase = (state) => {
  const streams = createRngStreams(state.seed);
  const incidents = borderIncidentPackets(state, streams);
  const blocked = new Set(incidents.flatMap((packet) => packet.effects.flatMap((effect) =>
    effect.kind === "borderIncident" ? [borderIncidentPairKey(...effect.incident.parties)] : [])));
  return [
    ...sanctionPackets(state, streams),
    ...incidents,
    ...clashPackets(state, streams, blocked),
    ...borderIncidentAssessmentPackets(state, streams),
    ...rosterPackets(state, streams),
    ...interferencePackets(state, streams),
    ...aidPackets(state, streams),
    ...warAidPackets(state, streams),
  ];
};
