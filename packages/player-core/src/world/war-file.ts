import {
  casualtyBand,
  declaredWarheads,
  hasIntelOnNation,
  joinCounterfactual,
  projectLikelyJoiners,
  selectBases,
  selectMunitions,
  settlementEffects,
  type Base,
  type Campaign,
  type WarLossBand,
  type Conflict,
  type ConflictSide,
  type DecisionStamp,
  type Effect,
  type JoinCounterfactual,
  type LikelyJoiner,
  type MunitionsReading,
} from "@admin/engine";
import type { NationId } from "@admin/world";
import { reasonLines, type ReasonLine } from "../reasons/reason-lines";

// A war's own file: who joined and why, what it has cost in bands, the stocks
// it has drawn, and how it can end. Every figure is read off the engine's own
// selectors; nothing here decides a war, and no reason is composed twice —
// `reasonLines` is the one phrase table, and it is the one place the fog is
// enforced, so a joiner this file cannot explain prints "Joined" alone rather
// than a guess.

const NOTABLE_NON_JOINERS_SHOWN = 3;

export type WarJoiner = {
  readonly nation: NationId;
  readonly side: ConflictSide;
  /** Empty where law 8's fog holds or no decision was stamped: the surface then prints "Joined" alone. */
  readonly reasons: readonly ReasonLine[];
};

/**
 * Whether a stamp answers the question of going into a war. A government
 * deciding on its own asks "join-war"; one the President's call reached asks
 * "answer-call" instead, and both are a decision about the same war.
 */
function isJoinStamp(stamp: DecisionStamp | undefined): stamp is DecisionStamp {
  return stamp?.question === "join-war" || stamp?.question === "answer-call";
}

/**
 * The stamp a nation's join into this conflict was resolved with, if the join
 * kept one: its own decision to go in, or its answer to the President's call.
 */
function joinStampFor(campaign: Campaign, nation: NationId, conflictId: string): DecisionStamp | undefined {
  for (let index = campaign.ledger.length - 1; index >= 0; index -= 1) {
    const entry = campaign.ledger[index]!;
    const stamp = entry.causal?.decision;
    if (isJoinStamp(stamp) && stamp.actor === nation && (stamp.subject === undefined || stamp.subject === conflictId)) return stamp;
  }
  return undefined;
}

function joinersOf(campaign: Campaign, conflict: Conflict): readonly WarJoiner[] {
  const sides: ConflictSide[] = ["aggressor", "defender"];
  return sides.flatMap((side) =>
    conflict.joined[side].map((nation) => {
      const stamp = joinStampFor(campaign, nation, conflict.id);
      return { nation, side, reasons: stamp ? reasonLines(stamp, campaign) : [] };
    }),
  );
}

/**
 * Up to three governments the engine named for staying out of this war, the
 * surface's "did not send forces" line: the refusals it stamped when it
 * decided them, oldest first, whether a government stayed out on its own or
 * turned down the President's call. A government the President's services
 * cannot read is not named, because who declined is itself an intelligence
 * read; one that fought and has gone home is in the war's record of leavers,
 * not here; and one that has since come in is a joiner.
 */
function notableNonJoiners(campaign: Campaign, conflict: Conflict): readonly NationId[] {
  const excluded = new Set<string>([conflict.aggressor, conflict.defender, ...conflict.joined.aggressor, ...conflict.joined.defender, ...(conflict.left ?? []), campaign.founding.nation]);
  const named = campaign.ledger.flatMap((entry) => {
    const stamp = entry.causal?.decision;
    if (!isJoinStamp(stamp) || stamp.acts || stamp.subject !== conflict.id) return [];
    return excluded.has(stamp.actor) ? [] : [stamp.actor as NationId];
  });
  return [...new Set(named)].filter((nation) => hasIntelOnNation(campaign, nation)).slice(0, NOTABLE_NON_JOINERS_SHOWN);
}

export type WarFileReading = {
  readonly conflictId: string;
  readonly conflict: Conflict;
  readonly joiners: readonly WarJoiner[];
  readonly notableNonJoiners: readonly NationId[];
  /** Fogged: who the join projection expects on each side, without a draw. */
  readonly likelyJoiners: Readonly<Record<ConflictSide, readonly LikelyJoiner[]>>;
  readonly casualties: Readonly<Record<ConflictSide, WarLossBand | undefined>>;
  /** Declared arsenal, per belligerent still in the fight; undefined where fogged or never declared. */
  readonly arsenals: ReadonlyMap<NationId, number | undefined>;
  readonly munitions: MunitionsReading | undefined;
  readonly bases: readonly Base[];
  /** What signing a settlement would do, previewed before it is taken. */
  readonly settlement: readonly Effect[];
  readonly counterfactuals: (nation: NationId) => JoinCounterfactual | undefined;
};

/** One war's file. Undefined for a conflict not on the board. */
export function warFileReading(campaign: Campaign, conflictId: string): WarFileReading | undefined {
  const conflict = campaign.conflicts[conflictId];
  if (!conflict) return undefined;
  const belligerents = [conflict.aggressor, conflict.defender, ...conflict.joined.aggressor, ...conflict.joined.defender];
  return {
    conflictId,
    conflict,
    joiners: joinersOf(campaign, conflict),
    notableNonJoiners: notableNonJoiners(campaign, conflict),
    likelyJoiners: {
      aggressor: projectLikelyJoiners(campaign, conflictId, "aggressor"),
      defender: projectLikelyJoiners(campaign, conflictId, "defender"),
    },
    casualties: {
      aggressor: casualtyBand(campaign, conflict, "aggressor"),
      defender: casualtyBand(campaign, conflict, "defender"),
    },
    arsenals: new Map(belligerents.map((nation) => [nation, declaredWarheads(campaign, nation)] as const)),
    munitions: selectMunitions(campaign),
    // Installations in a belligerent's own territory, read as context for the front — not a claim that the base itself is committed to this war.
    bases: selectBases(campaign).filter((base) => belligerents.includes(base.country)),
    settlement: settlementEffects(campaign, conflict),
    counterfactuals: (nation: NationId) => joinCounterfactual(campaign, conflictId, nation),
  };
}
