import type { Effect } from "./effect-types.js";
import type { Campaign, CasualtiesBySide, CasualtyBand, Conflict, ConflictSide, LossRange, WarLossBand } from "./state.js";
import { sideCombatants, sidePersonnel, sideQuality, type Combatant } from "./war-forces.js";

// What a week of fighting costs in people: the dead and the wounded, kept
// apart, each as a band with its confidence rather than a count nobody outside
// the war could verify.
//
// Derived, never drawn: the week's losses follow from how hot the front is,
// how many people each side has in the theater, how well the other side fights
// and which side the balance of strength is pressing. The draw that swings a
// week's fighting does not reach them, so two readers of the same war on the
// same week always see the same band.
//
// Sources: CRS RL32492 (2020-07-29), "American War and Military Operations
// Casualties", as quoted in docs/audits/2026-10-12-data-model/
// RESEARCH-SECURITY-CONFLICT.md section 4.2; troop levels from CRS RL33110.

/**
 * Killed and wounded by enemy action a week, per person in contact, at full
 * intensity, an even fight (half the week's weight) and an enemy that fights
 * as well as this side does.
 *
 * Fitted to one case: Iraq, March 2003 to December 2011 (Iraqi Freedom and New
 * Dawn), 3,519 hostile deaths and 32,292 wounded over 456 weeks, about 78 a
 * week, for an average force of about 120,000 (an assumption the research note
 * brackets with CRS's 124,000 to 165,000 troop counts) fighting at 0.3, a
 * front fought lightly but above the held-front line. Iraq passes its
 * calibration by construction; the Gulf War and the short invasions are the
 * held-out checks.
 */
const HOSTILE_RATE = 0.045;

/**
 * Deaths a week per person deployed that no enemy causes: accidents, illness,
 * the rest of what a force in the field loses. Iraq and New Dawn: 973
 * nonhostile deaths over 456 weeks at about 120,000 deployed. A force deployed
 * to a front that is quiet still loses these.
 */
const NONHOSTILE_RATE = 1.78e-5;

/**
 * Wounded for each soldier killed by enemy action, by how hot the fighting is.
 * Light fighting is the counterinsurgency record: Iraqi Freedom, 31,994
 * wounded to 3,481 hostile deaths (9.2). Heavy fighting is the high-intensity
 * conventional record: Desert Storm, 467 to 147 (3.2), and Vietnam, 153,303 to
 * 47,434 (3.2). The game is set now, with today's battlefield medicine, and the
 * Gulf War is the most recent high-intensity war in the series.
 */
const WOUNDED_PER_KILLED = { light: 9.2, heavy: 3.2 } as const;

/** The tempo at and below which fighting reads as light: the held-front line. */
const LIGHT_FIGHTING = 0.2;

/**
 * Killed by enemy action a week, per person in contact, on a held front in an
 * even fight against an equal enemy, whatever the front's drift beneath the
 * line. Fitted to the Korean static line: US Army divisions holding static
 * defensive lines, January 1951 to July 1953, lost 3,629 killed in action over
 * 3,494 division-days at a mean strength of 18,926 (Reister, "Battle
 * Casualties and Medical Statistics: U.S. Army Experience in the Korean War",
 * Table 26, https://thekwe.org/topics/casualties/surgeon_general/p_ch2.htm,
 * opened 2026-10-13): 3,629 / (3,494 × 18,926) × 7 ≈ 0.000384 a week. Killed
 * in action only, so a floor: died of wounds come on top. The fought-front
 * rate scaled down to the line read about twice this, which put a held line
 * between India and Pakistan at 230 to 610 killed a week.
 */
const HELD_KILLED_RATE = 0.000384;

/**
 * Wounded for each killed on a held front, same table: 17,549 wounded admitted
 * and 5,549 returned to duty the same day, over 3,629 killed. Counted the way
 * the Iraq figure is, every wound and not only the admitted ones.
 */
const HELD_WOUNDED_PER_KILLED = (17_549 + 5_549) / 3_629;

/**
 * Civilians killed in the defender's country for each of its soldiers killed.
 * Ukraine, two years in: the UN monitoring mission verified more than 10,000
 * civilians killed (https://ukraine.un.org/en/261245-two-year-update-protection-
 * civilians-impact-hostilities-civilians-24-february-2022, 2024-02-21) against
 * 31,000 Ukrainian soldiers by the government's count (Kyiv Independent,
 * 2024-02-25), 0.32; a year on, 12,654 against 43,000, 0.29 (OHCHR, 2025-02-21;
 * Ukrainska Pravda, 2024-12-08). Both opened 2026-10-13. A verified minimum
 * over a government count, so if anything low; the short war in Georgia in
 * 2008, fought through towns, ran nearer 1.2 (EU fact-finding mission, 2009).
 */
export const CIVILIANS_PER_SOLDIER_KILLED = 0.3;

/**
 * How wide the band is either side of the central estimate. A government's
 * own losses are counted; an adversary's are estimated, and the estimate
 * firms up once the war has run long enough to be counted by others.
 */
const SPREAD: Readonly<Record<CasualtyBand["confidence"], { readonly low: number; readonly high: number }>> = {
  high: { low: 0.9, high: 1.15 },
  medium: { low: 0.7, high: 1.4 },
  low: { low: 0.5, high: 2 },
};

/** Weeks of fighting before an outside estimate of a war's losses is worth more than a guess. */
const COUNTED_AFTER_WEEKS = 8;

/** Rounded to the nearest hundred, or ten below a thousand, so a band never reads as a count. */
function coarse(value: number): number {
  const step = value < 1000 ? 10 : 100;
  return Math.round(value / step) * step;
}

const coarseRange = (range: LossRange): LossRange => ({ low: coarse(range.low), high: coarse(range.high) });

/**
 * A side's cumulative losses so far, as a surface may print them: the stored
 * bands with their edges coarsened. Undefined until a week has been counted.
 */
export function casualtyBand(_campaign: Campaign, conflict: Conflict, side: ConflictSide): WarLossBand | undefined {
  const stored = conflict.casualties?.[side];
  return stored ? { killed: coarseRange(stored.killed), wounded: coarseRange(stored.wounded), confidence: stored.confidence } : undefined;
}

/** Wounded for each killed at this tempo: the held line's record below it, then between the light and the heavy record. */
export function woundedPerKilled(intensity: number): number {
  if (intensity < LIGHT_FIGHTING) return HELD_WOUNDED_PER_KILLED;
  const heat = Math.max(0, Math.min(1, (intensity - LIGHT_FIGHTING) / (1 - LIGHT_FIGHTING)));
  return WOUNDED_PER_KILLED.light + (WOUNDED_PER_KILLED.heavy - WOUNDED_PER_KILLED.light) * heat;
}

/** How hard the other side hits per person in contact, against an even match: 1 for equals, toward 2 against a far weaker force, toward 0 against a far stronger one. */
function lethality(own: number, enemy: number): number {
  return own + enemy > 0 ? (2 * enemy) / (own + enemy) : 0;
}

export type WeeklyLosses = { readonly killed: number; readonly wounded: number };

function lossesFor(conflict: Conflict, own: readonly Combatant[], enemy: readonly Combatant[], pressure: number): WeeklyLosses {
  const ownPeople = sidePersonnel(own);
  // Only as many people can be in contact as the smaller side brings: a corps
  // sent against a militia meets the militia, not a second corps.
  const contact = Math.min(ownPeople, sidePersonnel(enemy));
  const weight = contact * (0.5 + pressure) * lethality(sideQuality(own), sideQuality(enemy));
  if (conflict.intensity < LIGHT_FIGHTING) {
    const heldKilled = HELD_KILLED_RATE * weight;
    return { killed: heldKilled + ownPeople * NONHOSTILE_RATE, wounded: heldKilled * HELD_WOUNDED_PER_KILLED };
  }
  const hostile = HOSTILE_RATE * conflict.intensity * weight;
  const hostileKilled = hostile / (1 + woundedPerKilled(conflict.intensity));
  return { killed: hostileKilled + ownPeople * NONHOSTILE_RATE, wounded: hostile - hostileKilled };
}

/**
 * One side's central estimate for one week. `pressure` is the share of the
 * week's weight the side carries from the strength ratio alone, before the
 * week's swing, so the figure is derived rather than drawn.
 */
export function weeklyLosses(campaign: Campaign, conflict: Conflict, side: ConflictSide, pressure: number): WeeklyLosses {
  const other: ConflictSide = side === "aggressor" ? "defender" : "aggressor";
  return lossesFor(conflict, sideCombatants(campaign, conflict, side), sideCombatants(campaign, conflict, other), pressure);
}

function confidenceFor(campaign: Campaign, conflict: Conflict, side: ConflictSide): CasualtyBand["confidence"] {
  const principal = side === "aggressor" ? conflict.aggressor : conflict.defender;
  if (principal === campaign.founding.nation || conflict.joined[side].includes(campaign.founding.nation)) return "high";
  return campaign.turn - conflict.startedTurn >= COUNTED_AFTER_WEEKS ? "medium" : "low";
}

function widened(prior: LossRange | undefined, week: number, spread: { readonly low: number; readonly high: number }): LossRange {
  return { low: Math.round((prior?.low ?? 0) + week * spread.low), high: Math.round((prior?.high ?? 0) + week * spread.high) };
}

/**
 * The war's loss bands after this week, each side's running totals widened by
 * how sure anyone can be of them. Both edges accumulate whole people, so a
 * band that was wide while the war was young stays honest about the weeks it
 * was guessed; only the reading coarsens them.
 */
export function accumulateCasualties(campaign: Campaign, conflict: Conflict, pressure: Readonly<Record<ConflictSide, number>>): CasualtiesBySide {
  const next = (side: ConflictSide): WarLossBand => {
    const confidence = confidenceFor(campaign, conflict, side);
    const week = weeklyLosses(campaign, conflict, side, pressure[side]);
    const prior = conflict.casualties?.[side];
    const spread = SPREAD[confidence];
    return { killed: widened(prior?.killed, week.killed, spread), wounded: widened(prior?.wounded, week.wounded, spread), confidence };
  };
  return { aggressor: next("aggressor"), defender: next("defender") };
}

/**
 * The week's dead taken off each fighting government's population, split by
 * the people each has in the theater. The central estimate, not the band: the
 * band is what can be said about the dead, and the population loses the dead
 * themselves. The wounded come home.
 */
export function warDeathTolls(campaign: Campaign, conflict: Conflict, pressure: Readonly<Record<ConflictSide, number>>): readonly Effect[] {
  const sides = { aggressor: sideCombatants(campaign, conflict, "aggressor"), defender: sideCombatants(campaign, conflict, "defender") };
  const soldiers = (["aggressor", "defender"] as const).flatMap((side) => {
    const own = sides[side];
    const people = sidePersonnel(own);
    const { killed } = lossesFor(conflict, own, sides[side === "aggressor" ? "defender" : "aggressor"], pressure[side]);
    if (people <= 0) return [];
    return own.flatMap((combatant): Effect[] => {
      const deaths = Math.round((killed * combatant.personnel) / people);
      return deaths > 0 ? [{ kind: "populationToll", nation: combatant.nation, deaths }] : [];
    });
  });
  const civilians = civilianDeaths(campaign, conflict, pressure);
  return civilians > 0 ? [...soldiers, { kind: "populationToll", nation: conflict.defender, deaths: civilians }] : soldiers;
}

/**
 * The civilians a week of fighting kills in the defender's country, where the
 * war is fought: a share of the defending side's soldiers killed that week.
 */
export function civilianDeaths(campaign: Campaign, conflict: Conflict, pressure: Readonly<Record<ConflictSide, number>>): number {
  const { killed } = weeklyLosses(campaign, conflict, "defender", pressure.defender);
  return Math.round(killed * CIVILIANS_PER_SOLDIER_KILLED);
}

type LegacyBand = { readonly low: number; readonly high: number; readonly confidence: CasualtyBand["confidence"] };

function splitLegacy(band: WarLossBand | LegacyBand, intensity: number): WarLossBand {
  if ("killed" in band) return band;
  const share = 1 / (1 + woundedPerKilled(intensity));
  const killed = { low: Math.round(band.low * share), high: Math.round(band.high * share) };
  return { killed, wounded: { low: band.low - killed.low, high: band.high - killed.high }, confidence: band.confidence };
}

/**
 * A war saved before the dead and wounded were kept apart carries one band of
 * both. It is split at the ratio the war's tempo now reads, the only figure the
 * save offers; a war already split is left alone, so loading twice changes
 * nothing.
 */
export function withSplitCasualties(campaign: Campaign): Campaign {
  const legacy = Object.values(campaign.conflicts).some((conflict) =>
    Object.values(conflict.casualties ?? {}).some((band) => band !== undefined && !("killed" in band)),
  );
  if (!legacy) return campaign;
  const conflicts = Object.fromEntries(
    Object.entries(campaign.conflicts).map(([id, conflict]) => {
      const stored = conflict.casualties as Partial<Record<ConflictSide, WarLossBand | LegacyBand>> | undefined;
      if (!stored) return [id, conflict];
      const casualties = Object.fromEntries(
        Object.entries(stored).map(([side, band]) => [side, band ? splitLegacy(band, conflict.intensity) : band]),
      ) as CasualtiesBySide;
      return [id, { ...conflict, casualties }];
    }),
  );
  return { ...campaign, conflicts };
}
