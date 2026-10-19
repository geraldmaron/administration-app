import { conflictsAsParty, selectConditionsFor, selectRelationship, selectRemoval, type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import type { WeightBoost } from "./scenario.js";
import { flagSetFlag } from "./scenario-deed-flags.js";
import { institutionStrainValue } from "./scenario-oversight.js";
import type { ScenarioSelectorLike } from "./scenario-cast.js";

// How much a live scenario weighs in the draw: the authored weight, times every
// boost the board currently earns it.
//
// Beside the caster rather than inside it because scenario-cast.ts holds three
// other jobs — binding a counterpart, judging liveness, rendering a reply — and
// it sits at the size line the project refuses to cross. `worstConditionSeverity`
// moves here with the boosts because the `conditionSeverity` boost is its main
// reader; the liveness half imports it back. The import of `ScenarioSelectorLike`
// is type-only and erased, so the two files close no runtime cycle.

/**
 * How bad the worst matching condition at home is, or zero if there is none.
 * Zero rather than undefined so an unbounded `conditionActive` still means
 * "there is one", via the `atLeast` an authored gate always carries.
 */
export function worstConditionSeverity(campaign: Campaign, kind?: string): number {
  const live = selectConditionsFor(campaign, campaign.founding.nation).filter(
    (condition) => kind === undefined || condition.kind === kind,
  );
  return live.reduce((worst, condition) => Math.max(worst, condition.severity), 0);
}


/**
 * How long a gating flag has to stand before age stops adding weight. A deed
 * a year cold is as ripe as a deed two years cold: past this the callback is
 * already at the front of the queue, and letting the multiplier keep climbing
 * would let one ancient follow-up crowd out everything the board is doing now.
 */
export const FLAG_AGE_SATURATION = 12;

/**
 * How ripe this scenario's gating flag is, from zero the turn it was stamped
 * to one once it has stood `FLAG_AGE_SATURATION` turns. Only the saturation
 * window is scanned — a marker inside it dates the deed, and a flag whose
 * marker is older than the window (or that predates markers entirely) is fully
 * ripe by construction — so the walk stays bounded however long a campaign
 * runs, the same discipline `flagAgedAtLeast` holds itself to.
 *
 * The first `is: true` flag condition is the gate: a scenario waiting on two
 * deeds ripens on the one it names first, which is the one an author put the
 * follow-up's weight behind.
 */
function flagAgeValue(campaign: Campaign, def: ScenarioSelectorLike): number {
  const gate = def.conditions.find((condition) => condition.kind === "flag" && condition.is);
  if (gate === undefined || gate.kind !== "flag") return 0;
  if ((campaign.player.flags[gate.flag] ?? false) !== true) return 0;
  for (let back = 0; back < FLAG_AGE_SATURATION; back += 1) {
    const turn = campaign.turn - back;
    if (turn < 0) break;
    if (campaign.player.flags[flagSetFlag(gate.flag, turn)] === true) return back / FLAG_AGE_SATURATION;
  }
  return 1;
}

function boostValue(campaign: Campaign, counterpart: NationId, boost: WeightBoost, def: ScenarioSelectorLike): number {
  const edge = selectRelationship(campaign, campaign.founding.nation, counterpart);
  switch (boost.source) {
    case "tension":
      return edge?.tension ?? 0;
    case "distrust":
      return edge ? (1 - edge.trust) / 2 : 0;
    case "instability":
      return 1 - campaign.player.metrics.stability;
    case "removalPressure":
      return selectRemoval(campaign).pressure;
    case "conditionSeverity":
      return worstConditionSeverity(campaign, boost.kind);
    case "warIntensity":
      // The hottest war the player is in, joined or their own, not the hottest
      // in the world: what makes war content urgent is the front this
      // government is answering for.
      return conflictsAsParty(campaign).reduce((hottest, conflict) => Math.max(hottest, conflict.intensity), 0);
    case "flagAge":
      return flagAgeValue(campaign, def);
    case "institutionStrain":
      return institutionStrainValue(campaign, def.conditions);
  }
}

export function effectiveWeight(campaign: Campaign, def: ScenarioSelectorLike, counterpart: NationId): number {
  const boosted = (def.boosts ?? []).reduce(
    (weight, boost) => weight * (1 + boost.factor * boostValue(campaign, counterpart, boost, def)),
    def.weight,
  );
  return Math.max(0, boosted);
}
