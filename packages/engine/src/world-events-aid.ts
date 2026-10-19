import type { NationId } from "@admin/world";
import { selectActiveConditions, selectActiveConflicts, selectNation, selectRelationship, type Campaign, type Conflict, type NationCondition } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { RngStreams } from "./rng.js";
import type { ConflictSide } from "./state-conflict.js";
import { conditionFamily } from "./condition-kinds.js";
import { capitalDistanceKm } from "./relationship-graph.js";
import { liveMemberships } from "./instrument-gates.js";
import { liveTemperament } from "./temperament.js";
import { joinCounterfactual } from "./war-join.js";
import { stampOf, type Willingness } from "./willingness.js";
import { aidTerms, firedRecently, templateOf } from "./world-event-templates.js";
import { decideAid, eventPacket, filing, liveMembers, marker, onEdge } from "./world-events-filing.js";
import { nameOf } from "./war-entry.js";

// Help sent by a government that is not a party: relief after a disaster, and
// aid into a war it will not fight in. Both are the donor's own decision,
// weighed on the same question, from how badly the other side needs it,
// whether the donor can get it there, and what the donor owes and feels.

/** A disaster below this has no call on anyone else's help. */
const AID_SEVERITY = 0.35;
/** How many weeks after onset donors are still deciding. */
const AID_WINDOW_WEEKS = 2;
/** The most donors one disaster draws in a week, the most willing first. */
const MAX_DONORS = 3;
/** How many would-be donors are weighed for one disaster: its neighbors and fellow members, nearest ties first. */
const DONOR_POOL = 12;

function proximity(campaign: Campaign, from: NationId, to: NationId): number {
  const a = selectNation(campaign, from)?.base;
  const b = selectNation(campaign, to)?.base;
  if (!a || !b) return 0;
  if (a.geo.neighbors.includes(to)) return 1;
  return Math.max(0, Math.min(1, Math.exp(-capitalDistanceKm(a, b) / 5000)));
}

function sharesBody(campaign: Campaign, a: NationId, b: NationId): boolean {
  const theirs = new Set(liveMemberships(campaign, b) as readonly string[]);
  return liveMemberships(campaign, a).some((org) => theirs.has(org as string));
}

/** Who might help: the stricken government's neighbors and fellow members, never the President's own country, which acts only on an order. */
function donorPool(campaign: Campaign, stricken: NationId): readonly NationId[] {
  const home = campaign.founding.nation;
  const neighbors = selectNation(campaign, stricken)?.base.geo.neighbors ?? [];
  const fellows = liveMemberships(campaign, stricken).flatMap((org) => liveMembers(campaign, org));
  return [...new Set([...neighbors, ...fellows] as readonly string[])]
    .map((id) => id as NationId)
    .filter((id) => id !== stricken && id !== home && campaign.nations[id] !== undefined)
    .map((id) => ({ id, trust: selectRelationship(campaign, id, stricken)?.trust ?? -1 }))
    .sort((a, b) => b.trust - a.trust || (a.id as string).localeCompare(b.id as string))
    .slice(0, DONOR_POOL)
    .map((entry) => entry.id);
}

type Donor = { readonly donor: NationId; readonly will: Willingness };

function weighDonors(campaign: Campaign, condition: NationCondition, streams: RngStreams): readonly Donor[] {
  const { threshold } = templateOf("disaster-aid");
  return donorPool(campaign, condition.nation).flatMap((donor) => {
    const edge = selectRelationship(campaign, donor, condition.nation);
    const temper = liveTemperament(campaign, donor);
    if (!edge || !temper || firedRecently(edge, "disaster-aid", campaign.turn)) return [];
    const terms = aidTerms(temper, edge, condition.severity, proximity(campaign, donor, condition.nation), sharesBody(campaign, donor, condition.nation));
    const will = decideAid(streams, terms, threshold, [donor, condition.id, "relief"]);
    return will.acts ? [{ donor, will }] : [];
  });
}

function reliefPacket(campaign: Campaign, stricken: NationId, { donor, will }: Donor): EffectPacket {
  const names = { actor: nameOf(campaign, donor), subject: nameOf(campaign, stricken) };
  const item = filing(campaign, "disaster-aid", names, { actor: donor, subject: stricken }, "public");
  const effects: readonly Effect[] = [
    marker(campaign, "disaster-aid", donor, stricken, item.headline),
    ...onEdge(campaign, { kind: "relationship", from: stricken, to: donor, deltas: { trust: 0.04, alignment: 0.02 } }),
    { kind: "feed", items: [item] },
  ];
  return eventPacket(campaign, item.headline, effects, stampOf(will, donor as string, stricken as string, "public"), [donor, stricken]);
}

/** Relief after a disaster abroad: the week or two after onset, from the governments closest to the stricken one. */
export function aidPackets(campaign: Campaign, streams: RngStreams): readonly EffectPacket[] {
  return selectActiveConditions(campaign)
    .filter((condition) => condition.nation !== campaign.founding.nation && conditionFamily(condition.kind) === "acute")
    .filter((condition) => condition.severity >= AID_SEVERITY && campaign.turn - condition.startedTurn <= AID_WINDOW_WEEKS)
    .flatMap((condition) =>
      [...weighDonors(campaign, condition, streams)]
        .sort((a, b) => b.will.margin - a.will.margin || (a.donor as string).localeCompare(b.donor as string))
        .slice(0, MAX_DONORS)
        .map((donor) => reliefPacket(campaign, condition.nation, donor)),
    );
}

// --- Aid into a war a government stays out of ---

/**
 * How far below the line it would take to fight a government can sit and still
 * send aid. A government whose weighing clears the line joins the war; one that
 * falls short by less than this is committed enough to arm a side and not
 * enough to fight beside it. Planning value.
 */
export const AID_BAND = 0.35;

/** The record a donor's war aid leaves on its edge toward the side it armed, which is also how often it can send more. */
export const WAR_AID_KIND = "war-aid";
const WAR_AID_EVERY_WEEKS = 12;

function armedRecently(campaign: Campaign, donor: NationId, recipient: NationId): boolean {
  const edge = selectRelationship(campaign, donor, recipient);
  return edge?.history.some((event) => event.kind === WAR_AID_KIND && campaign.turn - event.turn < WAR_AID_EVERY_WEEKS) ?? false;
}

function belligerents(conflict: Conflict): ReadonlySet<string> {
  return new Set([conflict.aggressor, conflict.defender, ...conflict.joined.aggressor, ...conflict.joined.defender] as readonly string[]);
}

/** A side's need, read off how the war is going for it: worn down and short of support at home. */
function sideNeed(conflict: Conflict, side: ConflictSide): number {
  return Math.max(0, Math.min(1, 0.6 * conflict.exhaustion[side] + 0.4 * (1 - conflict.warSupport[side])));
}

function warDonors(campaign: Campaign, conflict: Conflict): readonly NationId[] {
  const fighting = belligerents(conflict);
  return [...new Set([...donorPool(campaign, conflict.defender), ...donorPool(campaign, conflict.aggressor)] as readonly string[])]
    .filter((id) => !fighting.has(id))
    .map((id) => id as NationId);
}

function warAidFor(campaign: Campaign, conflict: Conflict, donor: NationId, streams: RngStreams): EffectPacket | undefined {
  const weighed = joinCounterfactual(campaign, conflict.id, donor);
  if (!weighed || weighed.margin >= 0 || weighed.margin < -AID_BAND) return undefined;
  const recipient = weighed.side === "defender" ? conflict.defender : conflict.aggressor;
  const opponent = weighed.side === "defender" ? conflict.aggressor : conflict.defender;
  const edge = selectRelationship(campaign, donor, recipient);
  const temper = liveTemperament(campaign, donor);
  if (!edge || !temper || armedRecently(campaign, donor, recipient)) return undefined;
  const terms = aidTerms(temper, edge, sideNeed(conflict, weighed.side), proximity(campaign, donor, recipient), sharesBody(campaign, donor, recipient));
  const will = decideAid(streams, terms, templateOf("disaster-aid").threshold, [donor, conflict.id, weighed.side, "war-aid"]);
  if (!will.acts) return undefined;
  const line = `${nameOf(campaign, donor)} sends arms and money to ${nameOf(campaign, recipient)}, and no troops.`;
  const effects: readonly Effect[] = [
    { kind: "relationship", from: donor, to: recipient, addHistory: { turn: campaign.turn, kind: WAR_AID_KIND, description: line } },
    ...onEdge(campaign, { kind: "relationship", from: recipient, to: donor, deltas: { trust: 0.04 } }),
    ...onEdge(campaign, { kind: "relationship", from: opponent, to: donor, deltas: { tension: 0.05, trust: -0.03 } }),
    { kind: "feed", items: [{ turn: campaign.turn + 1, kind: "conflict", visibility: "public", headline: line, actor: donor, target: recipient }] },
  ];
  return eventPacket(campaign, line, effects, stampOf(will, donor as string, recipient as string, "public"), [donor, recipient, conflict.id]);
}

/** Aid into the week's wars from the governments that weighed joining and fell just short. */
export function warAidPackets(campaign: Campaign, streams: RngStreams): readonly EffectPacket[] {
  return selectActiveConflicts(campaign).flatMap((conflict) =>
    warDonors(campaign, conflict).flatMap((donor) => {
      const packet = warAidFor(campaign, conflict, donor, streams);
      return packet ? [packet] : [];
    }),
  );
}
