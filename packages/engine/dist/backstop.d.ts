import type { NationId } from "@admin/world";
import type { Campaign } from "./state.js";
/** How long a stabilization package stands behind the currency. */
export declare const BACKSTOP_WEEKS = 52;
/**
 * What a standing backstop takes off the crisis premium, in rate points.
 *
 * Half the deepest premium the crisis model charges a government whose lenders
 * can leave (four points at full severity), so a backstop never prices a crisis
 * as over, and the reserve-currency premium, which tops out at a point and a
 * half, is taken off whole. A modeling choice, not a measured figure.
 */
export declare const BACKSTOP_PREMIUM_RELIEF = 0.02;
/**
 * What a standing backstop takes off accumulated fiscal stress each week: half
 * the point a year an open crisis adds, so stress still builds while the
 * crisis is open, at half the speed.
 */
export declare const BACKSTOP_STRESS_RELIEF: number;
/** The flag a stabilization package leaves: who stands behind whose currency. */
export declare function currencyBackstopFlag(actor: NationId, target: NationId): string;
/**
 * The latest week anyone put a backstop behind this government, read off the
 * turn-stamped markers the flag carries (`flagset:<flag>:<turn>`).
 */
export declare function latestBackstop(campaign: Campaign, nation: NationId): number | undefined;
/**
 * What the backstops in place take off this government's crisis premium and its
 * accumulated fiscal stress. Zero where nothing stands behind it, or where the
 * last package has run its year.
 */
export declare function backstopRelief(campaign: Campaign, nation: NationId): {
    readonly premium: number;
    readonly stress: number;
};
