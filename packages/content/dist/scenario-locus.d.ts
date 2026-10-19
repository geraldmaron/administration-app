import { type Campaign, type ScenarioPlace } from "@admin/engine";
import { type SettlementId, type CityId, type NationId, type StateId } from "@admin/world";
import type { ScenarioDef } from "./scenario.js";
export type LocusPrecision = "exact" | "area";
export type ResolvedLocus = {
    /** Whose ground the event is on. */
    readonly nation: NationId;
    readonly lat: number;
    readonly lon: number;
    /** The dateline: real names composed at cast time, never authored. */
    readonly placeName: string;
    /**
     * The authored close-up, world-neutral by audit and interpolated here.
     *
     * The Desk prints it beside the dateline, so it is player copy and takes the
     * same rendering pass as every other authored string. It used to be copied
     * through verbatim, which showed the player the literal `{{city}}` the audit
     * requires a city-bound scenario to write.
     */
    readonly descriptor: string;
    /**
     * "exact" is a point the fiction can stand on (a capital, a named strait);
     * "area" is a locality the dataset cannot pin closer than a district, drawn
     * as a ring rather than a lie of false precision.
     */
    readonly precision: LocusPrecision;
    /**
     * The dataset city the event stands in, wherever the resolver chose one:
     * authored, the bound condition's, inherited from the story's earlier scene,
     * or the city of the site's kind it drew. `placeName` stays the real name.
     */
    readonly city?: CityId;
    readonly settlement?: SettlementId;
    /**
     * The US state the event is in: authored on the locus, taken from the running
     * condition a bound scenario is about, inherited from the earlier scene of
     * the same story, or, for a home site that names none of those, drawn from
     * the seed by fit. The map, the reply's state-scoped effects and the
     * decision's Record entry read it. Gates and prose tokens still read the
     * authored `locus.state`, so a drawn state never decides whether a scenario
     * is live or what its text says.
     */
    readonly state?: StateId;
    /**
     * The running condition record this locus was bound to, for a scenario whose
     * locus says `bind: "condition"`.
     *
     * Carried on the resolved locus rather than recomputed, because the whole
     * point of the bind is that it is decided once: the case freezes this id, and
     * the liveness recheck at display and at commit asks the board about this
     * record rather than running the pick again against a board that has moved.
     */
    readonly condition?: string;
};
export declare function resolveLocus(campaign: Campaign, def: ScenarioDef, counterpart: NationId): ResolvedLocus | undefined;
/** The resolved place as causal-stamp locale ids: the state, then the city. Abroad there is no state, so the city alone. */
export declare function locusLocales(locus: ResolvedLocus | undefined): readonly string[];
/**
 * What a story's next scene inherits from this one: the state and city, when
 * the scene happened at home below the capital. Washington is not kept: a
 * meeting in the Oval Office says nothing about which town the next scene is in.
 */
export declare function storyPlace(locus: ResolvedLocus | undefined, home: NationId): ScenarioPlace | undefined;
