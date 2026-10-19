import type { NationId } from "@admin/world";
import type { Campaign } from "./state.js";

// What a standing backstop takes off a government's borrowing.
//
// A central bank that will buy the paper, a swap line, a partner that has said
// it will stand behind the issue: none of these makes a country solvent, and all
// of them change what the market charges it while the panic runs. Without them
// the only thing that priced a crisis was how deep the crisis ran, so a
// government with every backstop in the world paid exactly what one with none
// paid.
//
// Its own module rather than a branch inside sovereign.ts because the relief is
// read off arrangements — compacts, facilities, standing commitments — that have
// nothing to do with the rating arithmetic, and sovereign.ts is the arithmetic.
//
// The arrangement on the board today is a stabilization package: one
// government putting its reserves behind another's currency, which the
// assistance ladder records as a dated flag. It stands for a year, the term of
// the swap lines and stabilization-fund loans it is modeled on, and a second
// package renews it rather than doubling it: the market prices whether somebody
// will stand behind the paper, not how many times they said so.

/** How long a stabilization package stands behind the currency. */
export const BACKSTOP_WEEKS = 52;

/**
 * What a standing backstop takes off the crisis premium, in rate points.
 *
 * Half the deepest premium the crisis model charges a government whose lenders
 * can leave (four points at full severity), so a backstop never prices a crisis
 * as over, and the reserve-currency premium, which tops out at a point and a
 * half, is taken off whole. A modeling choice, not a measured figure.
 */
export const BACKSTOP_PREMIUM_RELIEF = 0.02;

/**
 * What a standing backstop takes off accumulated fiscal stress each week: half
 * the point a year an open crisis adds, so stress still builds while the
 * crisis is open, at half the speed.
 */
export const BACKSTOP_STRESS_RELIEF = 0.5 / 52;

const NO_RELIEF = { premium: 0, stress: 0 } as const;

const PREFIX = "currency-backstop";

/** The flag a stabilization package leaves: who stands behind whose currency. */
export function currencyBackstopFlag(actor: NationId, target: NationId): string {
  return `${PREFIX}:${actor}:${target}`;
}

/**
 * The latest week anyone put a backstop behind this government, read off the
 * turn-stamped markers the flag carries (`flagset:<flag>:<turn>`).
 */
export function latestBackstop(campaign: Campaign, nation: NationId): number | undefined {
  return latestByTarget(campaign.player.flags).get(nation);
}

// The flags hold every marker the campaign has ever stamped, and the books ask
// this for every government every week, so the markers are read once per flag
// set rather than once per government.
const latestBySnapshot = new WeakMap<Campaign["player"]["flags"], ReadonlyMap<string, number>>();

function latestByTarget(flags: Campaign["player"]["flags"]): ReadonlyMap<string, number> {
  const known = latestBySnapshot.get(flags);
  if (known) return known;
  const latest = new Map<string, number>();
  for (const [flag, standing] of Object.entries(flags)) {
    if (!standing || !flag.startsWith(`flagset:${PREFIX}:`)) continue;
    const [, , , target, turn] = flag.split(":");
    const week = Number(turn);
    const prior = target === undefined ? undefined : latest.get(target);
    if (target !== undefined && Number.isFinite(week) && (prior === undefined || week > prior)) latest.set(target, week);
  }
  latestBySnapshot.set(flags, latest);
  return latest;
}

/**
 * What the backstops in place take off this government's crisis premium and its
 * accumulated fiscal stress. Zero where nothing stands behind it, or where the
 * last package has run its year.
 */
export function backstopRelief(campaign: Campaign, nation: NationId): { readonly premium: number; readonly stress: number } {
  const since = latestBackstop(campaign, nation);
  if (since === undefined || campaign.turn - since >= BACKSTOP_WEEKS) return NO_RELIEF;
  return { premium: BACKSTOP_PREMIUM_RELIEF, stress: BACKSTOP_STRESS_RELIEF };
}
