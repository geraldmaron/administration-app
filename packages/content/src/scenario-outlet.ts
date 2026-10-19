// A masthead on the other side of the table.
//
// Every cast named a country: a foreign one, or the player's own. But a real
// President deals with mastheads directly — an interview request with strings
// attached, a leak an editor is deciding whether to run, a publisher asking for
// a correction — and until this existed that week could only be written with
// the paper as scenery and nobody across from the President. The outlet cast
// binds one of the game's fictional mastheads (a paper, a network, a show) as
// the counterpart the week is about, while the country slot stays home: the
// outlet is an American one, and nothing the reply does reaches a foreign
// government. An unnamed cast can bind any format, so the prose has to fit any.
import { NATIONAL_OUTLETS, PRESS_OUTLETS, outletDisposition, type Campaign, type PressOutlet } from "@admin/engine";
import type { ScenarioCast } from "./scenario-conditions.js";

type OutletCast = Extract<ScenarioCast, { pick: "outlet" }>;

/**
 * The masthead an outlet cast binds. A named outlet binds only if it is on the
 * roster, so a retired or mistyped id leaves the scenario unbound rather than
 * dealt about nobody. Unnamed, it binds the national desk coldest to this
 * administration this week, because the paper a President ends up across the
 * table from is the one that is already writing against them; ties break by id.
 */
export function bindOutlet(campaign: Campaign, cast: OutletCast): PressOutlet | undefined {
  if (cast.outlet !== undefined) return PRESS_OUTLETS.find((outlet) => outlet.id === cast.outlet);
  return [...NATIONAL_OUTLETS].sort(
    (a, b) => outletDisposition(campaign.press, a) - outletDisposition(campaign.press, b) || a.id.localeCompare(b.id),
  )[0];
}

/** The bound masthead's name, for the `{{outlet}}` token, or nothing when the scenario is not an outlet week. */
export function boundOutletName(campaign: Campaign, cast: ScenarioCast): string | undefined {
  return cast.pick === "outlet" ? bindOutlet(campaign, cast)?.name : undefined;
}
