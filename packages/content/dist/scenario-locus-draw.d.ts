import { type AcuteCondition, type Campaign } from "@admin/engine";
import { type City, type State, type StateEconomyAxis, type StateId } from "@admin/world";
import type { ScenarioDef } from "./scenario.js";
/** What a scenario's own fields say about the kind of state it belongs in. */
export type StateFit = {
    /** Economy axes whose share in a state makes it likelier. */
    readonly axes: readonly StateEconomyAxis[];
    /** Weigh by how many kinds of disaster a state is exposed to. */
    readonly hazard: boolean;
    /** Disasters the scenario is gated on: a state none of them can strike is out. */
    readonly acute: readonly AcuteCondition[];
};
export declare function stateFit(def: Pick<ScenarioDef, "class" | "topics" | "conditions" | "locus">): StateFit;
export declare function stateWeight(state: State, fit: StateFit): number;
/**
 * The state a home scenario that names none is about, from the campaign seed
 * and the scenario id, over the states with a city of the site's kind,
 * weighted by fit. Keyed on the scenario and not the turn, on its own stream,
 * so the same scenario in the same campaign is always about the same state and
 * this draw moves no other. Reads the dataset's authored states rather than the
 * campaign's runtime ones for the same reason: a weight that drifted week to
 * week would move a scenario between states mid-campaign.
 */
export declare function seededState(campaign: Campaign, def: ScenarioDef, fits: (city: City) => boolean, availableStates?: ReadonlySet<StateId>): StateId | undefined;
