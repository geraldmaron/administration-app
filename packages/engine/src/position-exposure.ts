import { READINESS_RECOVERY_PER_TURN } from "./capacity.js";
import { COHORT_MOTIVATION } from "./demos.js";
import { nationName } from "./naming.js";
import { selectNation, selectRelationship, type Campaign } from "./state.js";
import { selectState } from "./states.js";
import type { ConversationScript, ReplyCommitment } from "./conversations.js";

// What a spoken answer exposes the administration to.
//
// An instrument reply is rolled for, so what could go wrong is a named failure
// branch with a share of the failure mass behind it. A position is not rolled
// for — it is true the moment it is said — and for that reason nine replies in
// ten reached the player with a price, a cabinet stance and nothing at all
// about what the answer would cost them afterwards.
//
// This is the honest half of that gap. It is deliberately **not** a risk model:
// there is no draw here, no chance, no branch, because inventing one would put
// a probability on a card that nothing in the simulation ever rolls against.
// Every entry below names a consequence the commit genuinely applies — the war
// it moves, the force it spends, the counterpart that keeps the sentence, the
// states whose lean it shifts, the cohorts that carry the strain — so the line
// read before the choice and the movement measured after it are one fact stated
// twice.
//
// Ordered heaviest first, because the surface with the least room shows one.

export type PositionExposure = {
  /** Stable per branch, so a surface or a check can name one without matching prose. */
  readonly id: string;
  readonly description: string;
};

type Position = Extract<ReplyCommitment, { kind: "position" }>;

// The same floor the cost marks draw at: a movement the glyph renders as flat
// must not be spoken as a consequence beside it.
const MARK_FLOOR = 0.005;

/** How many places or people a line names before it stops being a sentence and starts being a table. */
const NAMED_LIMIT = 3;

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function frontExposure(commitment: Position): PositionExposure | undefined {
  switch (commitment.conflictMove) {
    case undefined:
      return undefined;
    case "offerTerms":
      return {
        id: "front-offered",
        description: "Terms offered are terms on the record. Refused, you asked in public and were turned down in public.",
      };
    case "acceptTerms":
      return {
        id: "front-accepted",
        description: "These are the terms the war is settled on, and the terms are what it is remembered by.",
      };
    case "deescalate":
      return {
        id: "front-cooled",
        description: "Standing down is read as standing down, by the people counting on you as well as by the people across from you.",
      };
  }
}

function briefingExposure(script: ConversationScript): PositionExposure | undefined {
  if (script.briefingDoubted !== true) return undefined;
  return {
    id: "briefing-unconfirmed",
    description: "The claim underneath this has not been confirmed, and the answer is built on it.",
  };
}

/**
 * Money the country ends up owing, as opposed to money the administration
 * obligates.
 *
 * The price line quotes the reply's own `cost.treasury`, which is budget
 * authority the President spends. A scenario's declared financial impact is a
 * different book entirely: it is borrowed, it lands on the national debt, and
 * it is still there at the end of the term. Nothing on the decision surface
 * said so, so a player reading a small figure under "It costs you" had no way
 * to tell a decision that spends a hundred million of their own apportionment
 * from one that puts a supplemental on the country's account.
 */
function borrowedExposure(commitment: Position): PositionExposure | undefined {
  const owed = (commitment.resolved ?? []).some((effect) => effect.kind === "choiceBorrowing" && effect.amount > 0);
  if (!owed) return undefined;
  return {
    id: "debt-borrowed",
    description: "The money behind this is borrowed rather than appropriated: it lands on the national debt and is still there when you leave.",
  };
}

/**
 * What the answer takes out of the force, and for how long.
 *
 * The clock is the part the price line cannot say: "readiness falls noticeably"
 * is a magnitude, and what actually constrains the next month is that the
 * military rungs are gated on the reading the whole time it is rebuilding.
 */
function forceExposure(commitment: Position): PositionExposure | undefined {
  const spent = commitment.cost.militaryReadiness;
  if (spent === undefined || spent >= -MARK_FLOOR) return undefined;
  const weeks = Math.ceil(-spent / READINESS_RECOVERY_PER_TURN);
  return {
    id: "force-short",
    description: `The force is short of what this spends for about ${weeks === 1 ? "a week" : `${weeks} weeks`}, and the military rungs are gated on readiness the whole time.`,
  };
}

/** The counterpart's own reading of the sentence, which is what they act on later rather than the sentence itself. */
function counterpartExposure(campaign: Campaign, script: ConversationScript, commitment: Position): PositionExposure | undefined {
  if (script.counterpart === campaign.founding.nation) return undefined;
  if (!selectRelationship(campaign, script.counterpart, campaign.founding.nation)) return undefined;
  const identity = selectNation(campaign, script.counterpart)?.base.identity;
  const who = identity ? nationName(identity) : (script.counterpart as string);
  const moved = commitment.relationship ?? {};
  if ((moved.tension ?? 0) > 0 || (moved.militaryThreat ?? 0) > 0) {
    return { id: "counterpart-hardens", description: `${who} reads this as a threat, and the reading is what they act on afterwards.` };
  }
  if ((moved.trust ?? 0) < 0) {
    return { id: "counterpart-trust", description: `${who} trusts you less for it, and trust is what the next thing you ask them for is priced against.` };
  }
  return { id: "counterpart-remembers", description: `${who} keeps this sentence in its record of you and reads it back the next time you need something.` };
}

/** Which people carry it. Read off the strain the commit actually writes, never off the band the impact row already draws. */
function cohortExposure(commitment: Position): PositionExposure | undefined {
  const strained = (commitment.resolved ?? []).flatMap((effect) =>
    effect.kind === "cohort" && (effect.addStrain !== undefined || (effect.replaceStrains ?? []).length > 0)
      ? [COHORT_MOTIVATION[effect.cohort]?.name ?? (effect.cohort as string)]
      : [],
  );
  const named = [...new Set(strained)].slice(0, NAMED_LIMIT);
  if (named.length === 0) return undefined;
  return {
    id: "cohorts-strained",
    description: `${joinNames(named)} carry this one, and a group that carries something remembers it through the next election.`,
  };
}

/**
 * Which places carry it. Lean is the only thing a state's own reading is
 * counted in, and nothing on the decision surface said a word about it.
 *
 * A national signature moves every state that clears the floor, and the
 * effects arrive in the order the states are declared — which is alphabetical,
 * so a flood on the Mississippi used to name Alabama, Alaska and Arizona. The
 * line names the states that move most, weighted by what their answer is
 * worth in electoral votes, and says how many more there are.
 */
function stateExposure(campaign: Campaign, commitment: Position): PositionExposure | undefined {
  const weights = new Map<string, { readonly name: string; readonly weight: number }>();
  for (const effect of commitment.resolved ?? []) {
    if (effect.kind !== "state" || (effect.deltas?.lean ?? 0) === 0) continue;
    const state = selectState(campaign, effect.state);
    const weight = Math.abs(effect.deltas?.lean ?? 0) * (state?.base.electoralVotes ?? 1);
    const known = weights.get(effect.state as string);
    if (!known || known.weight < weight) {
      weights.set(effect.state as string, { name: state?.base.name ?? (effect.state as string), weight });
    }
  }
  const ranked = [...weights.values()].sort((a, b) => b.weight - a.weight).map((entry) => entry.name);
  if (ranked.length === 0) return undefined;
  const named = joinNames(ranked.slice(0, NAMED_LIMIT));
  return {
    id: "states-moved",
    description:
      ranked.length <= NAMED_LIMIT
        ? `${named} move on this, and a state's answer is counted in electoral votes.`
        : `${ranked.length} states move on this, led by ${named}, and a state's answer is counted in electoral votes.`,
  };
}

function alignmentExposure(commitment: Position): PositionExposure | undefined {
  if (!commitment.pull) return undefined;
  return {
    id: "alignment-staked",
    description: "This stakes the administration on where it stands, and the half of the country that reads it the other way is not persuaded by it.",
  };
}

/**
 * Everything this answer exposes, heaviest first.
 *
 * The order is a judgment about what a president needs to meet first when the
 * surface has room for one line: a war before a briefing, a briefing before a
 * debt the country carries past the term, the debt before the force, the force
 * before a foreign capital's memory, a capital's memory before the people and
 * places at home, and the argument about where you stand last — it is the one
 * the player already knows they are having.
 */
export function projectPositionExposure(
  campaign: Campaign,
  script: ConversationScript,
  commitment: Position,
): readonly PositionExposure[] {
  return [
    frontExposure(commitment),
    briefingExposure(script),
    borrowedExposure(commitment),
    forceExposure(commitment),
    counterpartExposure(campaign, script, commitment),
    cohortExposure(commitment),
    stateExposure(campaign, commitment),
    alignmentExposure(commitment),
  ].filter((entry): entry is PositionExposure => entry !== undefined);
}
