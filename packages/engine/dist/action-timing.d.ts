import type { Person, PersonId, RoleId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { ResolutionRequest } from "./resolution.js";
import type { DecisionStamp } from "./willingness.js";
import { type InstrumentId } from "./instrument-ids.js";
/**
 * How the chair preparing the President's operation changes its clock, and why.
 * `days` is signed: positive is time the chair adds, negative time a bold
 * Secretary of Defense takes off.
 */
export type ActionPace = {
    readonly days: number;
    readonly role: RoleId;
    readonly person: PersonId;
    readonly decision: DecisionStamp;
};
export type ActionTiming = {
    readonly days: number;
    readonly label: string;
    readonly basis: string;
    readonly pace?: ActionPace;
};
/** The room's own reading of whether this person wants this much force, put on a 0..1 fit scale. */
export declare function instrumentFit(person: Person, instrument: InstrumentId): number;
/**
 * Planning assumptions at the simulation's day resolution, not a tactical
 * timetable. The chair's pace is part of the estimate rather than a surprise at
 * execution, so the clock the President reads before ordering is the one the
 * operation runs on.
 */
export declare function actionTiming(campaign: Campaign, request: ResolutionRequest): ActionTiming;
