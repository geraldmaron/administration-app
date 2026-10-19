import type { Nation, NationId } from "@admin/world";
import {
  actorForNation,
  relationshipKey,
  selectActiveConflicts,
  selectNation,
  type Campaign,
  type Conflict,
  type ConflictSide,
  type NationRuntime,
} from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import { forceProjectionCost } from "./geography.js";
import { stagingPoints } from "./staging.js";
import { forceProjectionProfile } from "./warfighting.js";
import { assessDeterrence, sideOf, type DeterrenceAssessment } from "./conflicts.js";
import { UNILATERAL_FORCE_COST, recordUnilateralForce, warPowersStanding, type WarPowersStanding } from "./congress.js";
import { recordForceIntroduction } from "./war-powers-report.js";
import { warPowersCheck } from "./instrument-gates.js";
import type { RungLevel } from "./instrument-ids.js";
import { nationName, sentenceCase } from "./naming.js";
import { munitionsShortfall } from "./munitions.js";

// --- Intervention: entering somebody else's war on purpose ---
//
// `joined` was written by exactly one thing — the weekly draw in
// allyJoinEffects, which decides whether a treaty partner turns up. So the
// board could carry a war a friendly nation was losing and the only verb the
// player had toward it was to open a second, separate war against the
// aggressor. Stepping in beside somebody is a different act with different
// consequences, and this is it.
//
// `openOrEscalate` is deliberately left alone: a state that wants its own war
// with the aggressor, on its own terms and for its own reasons, may still
// declare one. Joining is what defense of others is, and it is the cheaper and
// more legible of the two precisely because it is the honest one.

/** Which nation's ground a war is fought on, and therefore what a joiner has to reach. */
function theaterOf(conflict: Conflict): NationId {
  return conflict.defender;
}

// The far edge of what a nation can support a war at, on the same projection
// scale the military ladder gates on. Set at the blockade cap rather than the
// invasion cap: joining a war is a sustained commitment, but it is fought
// beside somebody who is already there.
const JOIN_PROJECTION_CAP = 2;

// What a joiner has to be able to bring, on the force-projection profile the
// weekly tick already scores sides with. Below this a nation is not entering a
// war, it is issuing a press release with a flag on it.
const JOIN_FORCE_FLOOR = 0.12;

export type JoinOption = {
  readonly conflict: Conflict;
  readonly side: ConflictSide;
  /** The principal being joined. */
  readonly alongside: NationId;
  /** The principal on the other side, who will read this as an act of war. */
  readonly against: NationId;
};

export type JoinConflictResult =
  | { readonly ok: true; readonly packet: EffectPacket }
  | { readonly ok: false; readonly reason: string; readonly missingCapability?: string };

function sharesBorder(a: Nation, b: Nation): boolean {
  return a.geo.neighbors.some((n) => (n as string) === (b.id as string));
}

/**
 * Whether this nation could bring anything to this side of this war. Reach is
 * read exactly the way the weekly tick reads it, so a nation that would
 * contribute nothing to `sideStrength` cannot join and then contribute nothing.
 */
export function joinCapability(campaign: Campaign, joiner: NationId, conflict: Conflict): JoinCheck {
  const runtime = selectNation(campaign, joiner);
  const theater = selectNation(campaign, theaterOf(conflict));
  if (!runtime || !theater) return { ok: false, missingCapability: "a nation on the board to send" };
  const nation = liveNation(runtime);
  const profile = forceProjectionProfile(nation);
  const adjacent = sharesBorder(nation, liveNation(theater));
  if (!adjacent && forceProjectionCost(nation, liveNation(theater), stagingPoints(campaign, joiner, theater.base.id)).multiplier > JOIN_PROJECTION_CAP) {
    return { ok: false, missingCapability: "reach to fight in that theater at all (no shared border, and the distance is beyond what this force can supply)" };
  }
  const usable = adjacent ? profile.adjacentConflict : Math.max(profile.expeditionary, profile.regionalProjection * 0.7);
  if (usable < JOIN_FORCE_FLOOR) {
    return { ok: false, missingCapability: "a force that could actually take the field there" };
  }
  return { ok: true };
}

type JoinCheck = { readonly ok: boolean; readonly missingCapability?: string };

function joinRefusal(campaign: Campaign, joiner: NationId, conflict: Conflict, side: ConflictSide): JoinConflictResult | undefined {
  if (conflict.status !== "active") return { ok: false, reason: `That war is over; there is nothing left to join.` };
  if (sideOf(conflict, joiner) !== undefined) {
    return { ok: false, reason: `${sentenceCase(nameOf(campaign, joiner))} is already a party to that war.` };
  }
  // The rule the world's own governments are held to: a government that has
  // gone home from a war is not weighed for it again, so walking out and back
  // in cannot be a way to reset what leaving cost.
  if ((conflict.left ?? []).includes(joiner)) {
    return { ok: false, reason: `${sentenceCase(nameOf(campaign, joiner))} has already left that war and cannot re-enter it.` };
  }
  const principal = side === "aggressor" ? conflict.aggressor : conflict.defender;
  // A nation cannot take sides in a war between two governments it has no
  // dealings with: there is no relationship to move, so nothing would happen.
  if (!campaign.relationships[relationshipKey(joiner, principal)]) {
    return { ok: false, reason: `${sentenceCase(nameOf(campaign, joiner))} has no relationship with ${nameOf(campaign, principal)} to fight beside.` };
  }
  const capable = joinCapability(campaign, joiner, conflict);
  if (!capable.ok) {
    return {
      ok: false,
      reason: `${sentenceCase(nameOf(campaign, joiner))} cannot enter that war: missing ${capable.missingCapability}`,
      missingCapability: capable.missingCapability!,
    };
  }
  return undefined;
}

/**
 * Every war this nation could enter, and on which side. The surface reads this
 * rather than filtering conflicts itself, so what a screen offers and what
 * `joinConflict` accepts are the same rule and cannot drift. The one refusal
 * left out is the statute's: a war the office's own authority does not reach
 * is still offered, and `projectJoin` names the missing vote before the
 * button, because hiding the war would hide the reason.
 */
export function selectJoinableConflicts(campaign: Campaign, joiner: NationId): readonly JoinOption[] {
  const options: JoinOption[] = [];
  for (const conflict of selectActiveConflicts(campaign)) {
    for (const side of ["defender", "aggressor"] as const) {
      if (joinRefusal(campaign, joiner, conflict, side)) continue;
      options.push({
        conflict,
        side,
        alongside: side === "aggressor" ? conflict.aggressor : conflict.defender,
        against: side === "aggressor" ? conflict.defender : conflict.aggressor,
      });
    }
  }
  return options;
}

// What entering a war costs the government that chose to. Standing rises for
// defending somebody under attack and falls for joining the attacker: the world
// prices the two differently, and this is the same asymmetry worldOpinionEffects
// applies to the principals.
const JOIN_STANDING: Readonly<Record<ConflictSide, number>> = { defender: 0.04, aggressor: -0.05 };
const JOIN_READINESS_COST = 0.06;
const JOIN_STABILITY_COST = 0.02;

// A join introduces forces into hostilities, which is what the War Powers
// Resolution counts, on whichever side of somebody else's war they go in. It is
// held and filed at the limited-strike rung, the lowest the statute reaches:
// going in beside an ally is not an invasion, and filing it as one would read
// every clock against an act the President did not order.
const JOIN_FORCE_RUNG: RungLevel = 4;

export type JoinCost = { readonly standing: number; readonly militaryReadiness: number; readonly stability: number };

/** The principal a joiner on this side ends up fighting. */
function againstOf(conflict: Conflict, side: ConflictSide): NationId {
  return side === "aggressor" ? conflict.defender : conflict.aggressor;
}

/** Whether going in rests on the President's own authority rather than on a vote. */
function joinsUnilaterally(campaign: Campaign, against: NationId): boolean {
  return warPowersStanding(campaign, against, JOIN_FORCE_RUNG).kind === "unilateral";
}

// How much of the force a join spends, against the base price, scales with
// the enemy and the ground: an enemy as strong in the theater as what the
// joiner can put there doubles nothing on its own, a far stronger one costs
// up to two and a half times as much, a distant theater costs more the less
// lift the joiner has, and an enemy with an arsenal adds half again. A war
// against a small state costs as little as half the base.
const JOIN_SCALE_FLOOR = 0.5;
const JOIN_SCALE_CEILING = 2.5;
const JOIN_NUCLEAR_PREMIUM = 0.5;

/** The multiple of the base price a join into this war costs this joiner. */
export function joinPriceScale(campaign: Campaign, joiner: NationId, conflict: Conflict, side: ConflictSide): number {
  const enemy = selectNation(campaign, againstOf(conflict, side));
  const own = selectNation(campaign, joiner);
  const theater = selectNation(campaign, theaterOf(conflict));
  if (!enemy || !own || !theater) return 1;
  const joining = liveNation(own);
  const adjacent = sharesBorder(joining, liveNation(theater));
  const profile = forceProjectionProfile(joining);
  const usable = adjacent ? profile.adjacentConflict : Math.max(profile.expeditionary, profile.regionalProjection * 0.7);
  const enemyForce = forceProjectionProfile(liveNation(enemy)).adjacentConflict;
  const distance = adjacent ? 1 : forceProjectionCost(joining, liveNation(theater), stagingPoints(campaign, joiner, theater.base.id)).multiplier;
  const nuclear = enemy.stats.military.arsenal.warheads > 0 ? JOIN_NUCLEAR_PREMIUM : 0;
  const raw = (0.5 + 0.5 * (enemyForce / (usable + 0.05))) * distance + nuclear;
  return Math.round(Math.max(JOIN_SCALE_FLOOR, Math.min(JOIN_SCALE_CEILING, raw)) * 1000) / 1000;
}

/** What going in costs the joiner's own panel, before any unilateral-force price: the price the join effects charge. */
function ownJoinCost(campaign: Campaign, joiner: NationId, conflict: Conflict, side: ConflictSide): JoinCost {
  const scale = joinPriceScale(campaign, joiner, conflict, side);
  return { standing: JOIN_STANDING[side], militaryReadiness: -JOIN_READINESS_COST * scale, stability: -JOIN_STABILITY_COST * scale };
}

/**
 * What entering costs the President, stated before it is entered. Derived from
 * the same function `joinConflict` spends through, and from the same
 * unilateral-force price the ladder's strike pays where no authorization
 * covers the war, so a screen cannot promise a price the commitment then does
 * not charge.
 */
export function joinCost(campaign: Campaign, conflict: Conflict, side: ConflictSide): JoinCost {
  const own = ownJoinCost(campaign, campaign.founding.nation, conflict, side);
  const unilateral = joinsUnilaterally(campaign, againstOf(conflict, side));
  return {
    standing: own.standing + (unilateral ? UNILATERAL_FORCE_COST.standing : 0),
    militaryReadiness: own.militaryReadiness,
    stability: own.stability + (unilateral ? UNILATERAL_FORCE_COST.stability : 0),
  };
}

export type JoinProjection = {
  readonly cost: JoinCost;
  readonly warPowers: WarPowersStanding;
  /** What the office is missing to go in, where its own authority does not reach this war. */
  readonly refusal?: string;
  readonly deterrence: DeterrenceAssessment;
};

/**
 * Everything a join would start, read before it is taken: the price, where it
 * stands under the War Powers Resolution, and what the other side's arsenal
 * puts at stake. Only the President's own government is projected, because
 * only it answers to this Congress.
 */
export function projectJoin(campaign: Campaign, conflictId: string, side: ConflictSide): JoinProjection | undefined {
  const conflict = campaign.conflicts[conflictId];
  if (!conflict) return undefined;
  const player = campaign.founding.nation;
  const against = againstOf(conflict, side);
  const statute = warPowersCheck(campaign, player, against, JOIN_FORCE_RUNG);
  return {
    cost: joinCost(campaign, conflict, side),
    warPowers: warPowersStanding(campaign, against, JOIN_FORCE_RUNG),
    ...(statute.ok ? {} : { refusal: statute.missingCapability ?? "a congressional authorization for the use of military force" }),
    deterrence: assessDeterrence(campaign, player, against),
  };
}

/** A join spends the strike rung's munitions, so a class spent to zero refuses it until a restock arrives. */
function munitionsRefusal(campaign: Campaign, joiner: NationId): JoinConflictResult | undefined {
  const missing = munitionsShortfall(campaign, joiner, 4);
  return missing ? { ok: false, reason: `${sentenceCase(nameOf(campaign, joiner))} cannot enter that war without ${missing}.`, missingCapability: missing } : undefined;
}

/** The statute's refusal, held to the same check the ladder's heaviest rungs are. */
function statuteRefusal(campaign: Campaign, joiner: NationId, conflict: Conflict, side: ConflictSide): JoinConflictResult | undefined {
  const statute = warPowersCheck(campaign, joiner, againstOf(conflict, side), JOIN_FORCE_RUNG);
  if (statute.ok) return undefined;
  const missing = statute.missingCapability ?? "a congressional authorization for the use of military force";
  return { ok: false, reason: `${sentenceCase(nameOf(campaign, joiner))} cannot enter that war without ${missing}`, missingCapability: missing };
}

/**
 * The War Powers record a join leaves, written by the same two functions the
 * ladder's strike and invasion call: the report Congress is owed within
 * forty-eight hours of any introduction into hostilities, and the record of
 * having acted without a vote where nothing authorizes the war. One clock,
 * whichever door the President came through.
 */
function joinWarPowersRecord(campaign: Campaign, joiner: NationId, against: NationId): readonly Effect[] {
  if (joiner !== campaign.founding.nation) return [];
  const name = nameOf(campaign, against);
  return [
    ...(joinsUnilaterally(campaign, against)
      ? recordUnilateralForce(campaign, against, JOIN_FORCE_RUNG, `Forces sent into the war against ${name}, ordered without a vote.`)
      : []),
    ...recordForceIntroduction(campaign, joiner, against, JOIN_FORCE_RUNG, `Forces sent into the war against ${name}: forces introduced into hostilities.`),
  ];
}

/**
 * How the three governments read each other afterward. Every direction is
 * written only where the graph has one: the graph is directed and sparse on
 * purpose, and writing an edge nobody authored throws the moment a war forms
 * between a pair with no view of each other.
 */
function joinRelationshipEffects(campaign: Campaign, joiner: NationId, alongside: NationId, against: NationId, summary: string): readonly Effect[] {
  const has = (from: NationId, to: NationId) => campaign.relationships[relationshipKey(from, to)] !== undefined;
  return [
    ...(has(joiner, alongside)
      ? [{ kind: "relationship", from: joiner, to: alongside, deltas: { trust: 0.2, alignment: 0.15 }, addHistory: { turn: campaign.turn, kind: "intervention", description: summary } } as const]
      : []),
    // A government that has just sent forces against you is not a neutral party.
    ...(has(joiner, against) ? [{ kind: "relationship", from: joiner, to: against, deltas: { trust: -0.3, tension: 0.35, militaryThreat: 0.3 } } as const] : []),
    ...(has(against, joiner) ? [{ kind: "relationship", from: against, to: joiner, deltas: { trust: -0.35, tension: 0.4, militaryThreat: 0.35 } } as const] : []),
  ];
}

/** What going in costs the President's own government, the War Powers record included. */
function joinerOwnEffects(campaign: Campaign, joiner: NationId, conflict: Conflict, side: ConflictSide, against: NationId): readonly Effect[] {
  if (joiner !== campaign.founding.nation) return [];
  const own = ownJoinCost(campaign, joiner, conflict, side);
  return [
    { kind: "metric", deltas: { standing: own.standing, militaryReadiness: own.militaryReadiness, stability: own.stability } },
    // Fighting somebody else's war is the globalist choice on the axis the
    // game already tracks, and taking the attacker's side is not a smaller
    // version of the same thing: it is the same commitment made cynically.
    { kind: "alignment", pull: { nationalistGlobalist: side === "defender" ? 0.06 : 0.03 } },
    ...joinWarPowersRecord(campaign, joiner, against),
  ];
}

/**
 * Enter an existing war on one side of it. Pure: it reads the board and returns
 * a packet, and the caller runs it through apply() like every other change.
 * Both doors into a war, the Operations room and a scenario reply, come here.
 */
export function joinConflict(
  campaign: Campaign,
  joiner: NationId,
  conflictId: string,
  side: ConflictSide,
): JoinConflictResult {
  const conflict = campaign.conflicts[conflictId];
  if (!conflict) return { ok: false, reason: `No such war is on the board.` };
  const refusal = joinRefusal(campaign, joiner, conflict, side) ?? statuteRefusal(campaign, joiner, conflict, side) ?? munitionsRefusal(campaign, joiner);
  if (refusal) return refusal;

  const alongside = side === "aggressor" ? conflict.aggressor : conflict.defender;
  const against = againstOf(conflict, side);
  const summary = `${sentenceCase(nameOf(campaign, joiner))} enters the war beside ${nameOf(campaign, alongside)}, against ${nameOf(campaign, against)}.`;
  const joined: Conflict = {
    ...conflict,
    joined: { ...conflict.joined, [side]: [...conflict.joined[side], joiner] },
    beats: [...conflict.beats, { turn: campaign.turn, description: summary }],
  };
  return {
    ok: true,
    packet: {
      source: joiner === campaign.founding.nation ? "action" : "simulate",
      actor: actorForNation(campaign, joiner),
      turn: campaign.turn,
      narration: { summary },
      effects: [
        { kind: "conflict", set: joined },
        ...joinRelationshipEffects(campaign, joiner, alongside, against, summary),
        ...joinerOwnEffects(campaign, joiner, conflict, side, against),
        { kind: "feed", items: [{ turn: campaign.turn, kind: "conflict", visibility: "public", headline: summary, actor: joiner, target: against }] },
      ],
    },
  };
}

export function liveNation(runtime: NationRuntime): Nation {
  return { ...runtime.base, stats: runtime.stats, traits: runtime.traits };
}

/** A government as a sentence carries it: "the United States", "Iran". */
export function nameOf(campaign: Campaign, nation: NationId): string {
  const identity = selectNation(campaign, nation)?.base.identity;
  return identity ? nationName(identity) : (nation as string);
}
