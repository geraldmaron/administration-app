import { type Campaign, type PressOutlet } from "@admin/engine";
import type { ScenarioCast } from "./scenario-conditions.js";
type OutletCast = Extract<ScenarioCast, {
    pick: "outlet";
}>;
/**
 * The masthead an outlet cast binds. A named outlet binds only if it is on the
 * roster, so a retired or mistyped id leaves the scenario unbound rather than
 * dealt about nobody. Unnamed, it binds the national desk coldest to this
 * administration this week, because the paper a President ends up across the
 * table from is the one that is already writing against them; ties break by id.
 */
export declare function bindOutlet(campaign: Campaign, cast: OutletCast): PressOutlet | undefined;
/** The bound masthead's name, for the `{{outlet}}` token, or nothing when the scenario is not an outlet week. */
export declare function boundOutletName(campaign: Campaign, cast: ScenarioCast): string | undefined;
export {};
