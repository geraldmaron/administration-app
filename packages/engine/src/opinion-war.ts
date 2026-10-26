import type { NationId } from "@admin/world";
import { sideOf } from "./conflicts.js";
import { casualtyBand } from "./war-attrition.js";
import { conflictsAsParty } from "./war-party.js";
import type { Campaign, Conflict, WarLossBand } from "./state.js";

// What a war the country fights does to whether people feel safe: a rally at
// the start that fades, the unease of a hot front, and the dead, read from the
// war record's casualty band and weighed on a log scale because the thousandth
// loss is felt less than the first hundred. It replaces the flat charge a war
// used to take off security whatever it cost and however long it had run.

/**
 * A war's rally, in valence units: added to the record every bloc reads, so
 * each bloc moves by its own slope, the identifiers least, and a more polarized
 * public rallies less. Not a security term: a rally is the country closing
 * ranks behind its government, which is approval of the government, and
 * billing it through a judgment as well would charge it twice.
 *
 * A war this government opened rallies the way Iraq did in 2003: Gallup 58 on
 * March 14 to 71 on March 22 and 59 by July, which fits an impulse of 1.86 with
 * a seven-week half-life at that era's division (owner, 2026-10-13: a damped,
 * Iraq-fitted rally for a self-started war). A war the country is drawn into
 * takes the design's "war with a stated cause" class, 2.2 halving over twenty
 * weeks, a judgment between the Iraq and Gulf War fits (Gulf War: 2.36, twenty
 * weeks).
 */
export const RALLY = {
  launched: { valence: 1.86, halfLifeWeeks: 7 },
  drawnIn: { valence: 2.2, halfLifeWeeks: 20 },
} as const;

/**
 * Planning values, not fitted: how much a public that has already rallied
 * rallies again. Each earlier rally still in memory divides the next one by
 * `1 + perPriorRally`, and a rally stays in memory with a half-life of 52
 * weeks. The only anchor is ordering (the 2003 Iraq rally ran well below the
 * 2001 Afghanistan one, with the stock of 9/11 already spent); Gallup's two
 * series fix no coefficient.
 */
export const RALLY_FATIGUE = { perPriorRally: 1, halfLifeWeeks: 52 } as const;

/** Planning value: the unease a front at full intensity costs the security judgment. */
export const WAR_UNEASE = 0.1;

/** Planning value: security lost per tenfold of the country's own dead. */
export const CASUALTY_WEIGHT = 0.08;

/** Planning value: the most the dead of one war can take off the judgment. */
export const CASUALTY_CAP = 0.25;

export function rallyFor(conflict: Conflict, turn: number, nation: NationId): number {
  const launched = launchedWar(conflict, nation);
  // A war opened by closing a coast, or by force the other side answered, is
  // cheap to start, so a rally on it would make every blockade an approval
  // purchase; the country rallies to a war it opened only by invading.
  if (launched && conflict.opening !== undefined) return 0;
  const weeks = Math.max(0, turn - conflict.startedTurn);
  const rally = launched ? RALLY.launched : RALLY.drawnIn;
  return rally.valence * 0.5 ** (weeks / rally.halfLifeWeeks);
}

/**
 * How much of a fresh rally this war still earns after the rallies before it:
 * the public carries one stock of fatigue, so a war opened while an earlier
 * rally is still remembered gets a smaller lift, whichever war it is. Derived
 * from the conflict ledger, ended wars included, so there is nothing to store
 * or migrate.
 */
export function rallyFatigueFactor(campaign: Campaign, conflict: Conflict, nation: NationId): number {
  const remembered = Object.values(campaign.conflicts)
    .filter((prior) => prior.id !== conflict.id && sideOf(prior, nation) !== undefined && isEarlier(prior, conflict))
    .filter((prior) => rallyFor(prior, prior.startedTurn, nation) > 0)
    .reduce((sum, prior) => sum + 0.5 ** ((conflict.startedTurn - prior.startedTurn) / RALLY_FATIGUE.halfLifeWeeks), 0);
  return 1 / (1 + RALLY_FATIGUE.perPriorRally * remembered);
}

function isEarlier(prior: Conflict, conflict: Conflict): boolean {
  return prior.startedTurn < conflict.startedTurn || (prior.startedTurn === conflict.startedTurn && prior.id < conflict.id);
}

/**
 * Whether this government opened the war: the rally it gets is the smaller,
 * shorter one a contested case earns, and none at all for a war opened by a
 * blockade or by force the other side answered. Only the principal who started
 * it; a government that joined someone else's war, or was attacked, is drawn in.
 */
export function launchedWar(conflict: Conflict, nation: NationId): boolean {
  return conflict.aggressor === nation;
}

/** The judgment the dead cost, from the midpoint of the killed band; nothing where no week has been counted. The wounded are not read here. */
export function casualtyCost(band: WarLossBand | undefined): number {
  if (!band) return 0;
  const dead = Math.max(0, (band.killed.low + band.killed.high) / 2);
  return Math.min(CASUALTY_CAP, CASUALTY_WEIGHT * Math.log10(1 + dead / 100));
}

export type WarOpinionTerms = {
  readonly rally: number;
  readonly unease: number;
  readonly casualties: number;
  readonly wars: number;
};

/**
 * Every war the country is party to, summed: the strongest rally (a public
 * rallies once, and later wars rally it less: `rallyFatigueFactor`), the unease of each front, and each war's
 * dead on its own scale.
 */
export function warOpinionTerms(campaign: Campaign): WarOpinionTerms {
  const nation = campaign.founding.nation;
  const wars = conflictsAsParty(campaign, nation);
  return wars.reduce<WarOpinionTerms>(
    (terms, conflict) => {
      const side = sideOf(conflict, nation);
      return {
        rally: Math.max(terms.rally, rallyFor(conflict, campaign.turn, nation) * rallyFatigueFactor(campaign, conflict, nation)),
        unease: terms.unease + WAR_UNEASE * conflict.intensity,
        casualties: terms.casualties + (side ? casualtyCost(casualtyBand(campaign, conflict, side)) : 0),
        wars: terms.wars + 1,
      };
    },
    { rally: 0, unease: 0, casualties: 0, wars: 0 },
  );
}

/** The war's net push on the security judgment. */
export function warSecurityContribution(terms: WarOpinionTerms): number {
  return 0 - terms.unease - terms.casualties;
}

const points = (value: number) => `${Math.round(value * 100)} points`;

/** The sentence the security judgment prints for the war. */
export function warSecurityDetail(terms: WarOpinionTerms): string {
  if (terms.wars === 0) return "The country is not at war.";
  const parts = [
    terms.unease >= 0.005 ? `the fighting unsettles it (${points(terms.unease)})` : undefined,
    terms.casualties >= 0.005 ? `its dead weigh on it (${points(terms.casualties)})` : undefined,
  ].filter((part): part is string => part !== undefined);
  return parts.length > 0 ? `The country is at war: ${parts.join("; ")}.` : "The country is at war, and the fighting has not yet cost it its sense of safety.";
}
