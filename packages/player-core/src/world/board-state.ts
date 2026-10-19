import {
  conflictsAsParty,
  hazardLabel,
  selectConditionsFor,
  selectNation,
  sideOf,
  type Campaign,
  type Conflict,
  type ConflictSide,
  type NationCondition,
} from "@admin/engine";
import { SECTOR_LABELS, stateById, type NationId, type SectorId, type StateId } from "@admin/world";
import { formatRatio, type MetricStance } from "../format/figures";

// What the country is currently living through, in the player's language.
//
// The board carried wars and conditions for weeks at a time and no screen said
// so. A player could be fighting on two fronts through a famine and read the
// situation room as a set of five metrics that had drifted for reasons nothing
// on screen explained — which is the exact failure the conditions and conflicts
// work was done to fix, surviving into the surface.
//
// Nothing here computes state. Every figure is read off the conflict or the
// condition the engine is already ticking; this file only decides how it reads.

export type BoardReading = {
  readonly key: string;
  readonly label: string;
  readonly fraction: number;
  readonly value: string;
  readonly stance: MetricStance;
  /** What the figure means, in the terms the player is deciding in. */
  readonly note: string;
};

export type WarReading = {
  readonly id: string;
  readonly headline: string;
  /** Weeks it has been running, which is the fact a player asks for first. */
  readonly standfirst: string;
  readonly readings: readonly BoardReading[];
  /**
   * The principal the country fights beside and the government it fights, set
   * when the country joined somebody else's war. Willingness and wear on that
   * side are the principal's figures, so a joined reading leaves them out
   * rather than print another government's as this one's.
   */
  readonly joined?: { readonly alongside: NationId; readonly against: NationId };
};

export type ConditionReading = {
  readonly id: string;
  /**
   * The kind, carried rather than folded into the headline.
   *
   * A surface routing this reading has to be able to ask whether it is a
   * condition an agency can be deployed against, and the engine answers that
   * off the kind. Composing the kind into a display name and throwing it away
   * left every caller unable to tell a hurricane from a debt crisis.
   */
  readonly kind: NationCondition["kind"];
  readonly headline: string;
  readonly standfirst: string;
  /**
   * That this was one afternoon rather than a file the government is carrying.
   *
   * Carried rather than derived a second time, because a surface that dates its
   * rows and decides how long they stay open has to be able to tell the two
   * apart, and the engine already marked the record at onset. Absent is the
   * ordinary case: a condition the country is inside for weeks.
   */
  readonly incident?: true;
  readonly severity: BoardReading;
  /**
   * The state this condition is running in, when it names one.
   *
   * Carried on the reading because the surface that prints "Detroit · Michigan"
   * is also the surface that has to be able to *go* there. Before this, the
   * place was composed into `standfirst` and thrown away, and every attention
   * row about a state opened the whole country.
   */
  readonly state?: StateId;
};

const SCOPE_NAMES: Readonly<Record<NationCondition["scope"], string>> = {
  city: "one city",
  region: "a whole region",
  nation: "the entire country",
};

// A rising figure is bad for three of these four and good for the fourth, so
// the stance cannot be derived from the number alone.
function risingIsBad(value: number): MetricStance {
  if (value >= 0.7) return "adverse";
  if (value >= 0.4) return "caution";
  return "neutral";
}

function risingIsGood(value: number): MetricStance {
  if (value >= 0.6) return "favorable";
  if (value >= 0.3) return "caution";
  return "adverse";
}

function nameOf(campaign: Campaign, id: string): string {
  return selectNation(campaign, id as never)?.base.identity.name ?? id;
}

function weeksRunning(conflict: Conflict, turn: number): number {
  return Math.max(1, turn - conflict.startedTurn + 1);
}

function intensityReading(conflict: Conflict): BoardReading {
  return {
    key: "intensity",
    label: "How heavy the fighting is",
    fraction: conflict.intensity,
    value: formatRatio(conflict.intensity),
    stance: risingIsBad(conflict.intensity),
    note: "How much this week of fighting costs both sides.",
  };
}

function standfirstOf(campaign: Campaign, conflict: Conflict): string {
  const weeks = weeksRunning(conflict, campaign.turn);
  return `${weeks} ${weeks === 1 ? "week" : "weeks"} in. ${conflict.cause}`;
}

function principalWarReading(campaign: Campaign, conflict: Conflict, side: ConflictSide): WarReading {
  const opponent = nameOf(campaign, side === "aggressor" ? conflict.defender : conflict.aggressor);
  return {
    id: conflict.id,
    headline: side === "aggressor" ? `Your war against ${opponent}` : `${opponent}'s war against you`,
    standfirst: standfirstOf(campaign, conflict),
    readings: [
      intensityReading(conflict),
      {
        key: "support",
        label: "Support at home",
        fraction: conflict.warSupport[side],
        value: formatRatio(conflict.warSupport[side]),
        stance: risingIsGood(conflict.warSupport[side]),
        // The thing that actually ends most of them, said plainly.
        note: "When people at home stop backing a war, it ends, even if it's going well on the map.",
      },
      {
        key: "exhaustion",
        label: "How worn out your side is",
        fraction: conflict.exhaustion[side],
        value: formatRatio(conflict.exhaustion[side]),
        stance: risingIsBad(conflict.exhaustion[side]),
        note: "This builds up the longer the war goes on.",
      },
    ],
  };
}

function joinedWarReading(campaign: Campaign, conflict: Conflict, side: ConflictSide): WarReading {
  const alongside = conflict[side];
  const against = side === "aggressor" ? conflict.defender : conflict.aggressor;
  return {
    id: conflict.id,
    headline: `Your war beside ${nameOf(campaign, alongside)}, against ${nameOf(campaign, against)}`,
    standfirst: standfirstOf(campaign, conflict),
    readings: [intensityReading(conflict)],
    joined: { alongside, against },
  };
}

/**
 * Every war the player is actually in, as a principal or beside one. A war
 * between two other nations is the world board's business, not the situation
 * room's — this screen answers "what is this government carrying", and
 * somebody else's war is not on it until this government joins it.
 */
export function warReadings(campaign: Campaign): readonly WarReading[] {
  const player = campaign.founding.nation;
  return conflictsAsParty(campaign).flatMap((conflict) => {
    const side = sideOf(conflict, player);
    if (!side) return [];
    const principal = conflict.aggressor === player || conflict.defender === player;
    return [principal ? principalWarReading(campaign, conflict, side) : joinedWarReading(campaign, conflict, side)];
  });
}

/** Every condition running at home, worst first. */
export function conditionReadings(campaign: Campaign): readonly ConditionReading[] {
  return [...selectConditionsFor(campaign, campaign.founding.nation)]
    .sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id))
    .map((condition) => {
      const weeks = Math.max(1, campaign.turn - condition.startedTurn + 1);
      const where = conditionPlace(campaign, condition);
      const incident = condition.lifetime === "incident";
      return {
        id: condition.id,
        kind: condition.kind,
        headline: hazardLabel(condition.kind),
        standfirst: incident
          ? `${where}. It happened once, and it isn't still going on.`
          : `${where}, ${weeks} ${weeks === 1 ? "week" : "weeks"} in.`,
        ...(incident ? { incident: true as const } : {}),
        ...(condition.state ? { state: condition.state } : {}),
        severity: {
          key: "severity",
          label: "Severity",
          fraction: condition.severity,
          value: formatRatio(condition.severity),
          stance: risingIsBad(condition.severity),
          note: incident
            ? "How much damage it did on the day it happened."
            : "How much damage it does each week it goes on.",
        },
      };
    });
}

function conditionPlace(campaign: Campaign, condition: NationCondition): string {
  const city = condition.city ? campaign.cities[condition.city]?.base.name : undefined;
  const state = condition.state ? stateById.get(condition.state)?.name : undefined;
  const sector = condition.sector ? SECTOR_LABELS[condition.sector as SectorId] : undefined;
  const named = [city, state, sector].filter((part): part is string => Boolean(part));
  if (named.length > 0) return named.join(" · ");
  return `Across ${SCOPE_NAMES[condition.scope]}`;
}

/**
 * The one-line answer to "what is this government carrying", or undefined on a
 * week where the answer is nothing. Undefined rather than "nothing is
 * happening" so the surface can leave the card out entirely: an empty card
 * every quiet week trains the player to stop looking at it.
 */
export function boardStateSummary(campaign: Campaign): string | undefined {
  const wars = warReadings(campaign);
  const conditions = conditionReadings(campaign);
  if (wars.length === 0 && conditions.length === 0) return undefined;
  const parts: string[] = [];
  if (wars.length > 0) parts.push(`${wars.length === 1 ? "a war" : `${wars.length} wars`}`);
  if (conditions.length > 0) {
    parts.push(conditions.length === 1 ? "an emergency at home" : `${conditions.length} emergencies at home`);
  }
  const list = parts.length === 1 ? parts[0]! : `${parts[0]} and ${parts[1]}`;
  return `You're dealing with ${list}.`;
}
