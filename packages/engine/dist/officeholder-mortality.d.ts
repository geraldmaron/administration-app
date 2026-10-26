import type { NationId, PersonId, RoleId, StateId } from "@admin/world";
import type { Campaign, GameDate } from "./state.js";
import { type RngStreams } from "./rng.js";
import { type InstitutionId } from "./institutions.js";
/** The chance of dying within the year at this age. The table's open "100 and older" row is not an annual rate, so 99 stands for it. */
export declare function lifeTableQx(age: number): number;
/**
 * Office-holders die at about a third of the general population's rate at the
 * same age. Measured: 16 members of Congress died in office from January 2021
 * to October 2026 (Wikipedia, "List of members of the United States Congress
 * who died in office (2000–present)"), 2.75 a year, against 7.76 a year the
 * table above predicts for the 539 sitting members' ages (current House and
 * Senate rosters with birth dates, opened 2026-10-25): 0.35. Applied to every
 * modeled office. A check rather than a fit for foreign leaders: at 0.35 the
 * cast's 195 heads of government lose about 1.2 a year, under the 1.8 a year
 * heads of state and of government together died in office of natural causes
 * since 2000 (Wikipedia, "List of heads of state and government who died in
 * office": 49 natural of 64).
 */
export declare const OFFICEHOLDER_MORTALITY_RATIO = 0.35;
export declare function officeholderDeathChance(age: number): number;
export type Office = {
    readonly kind: "congress";
    readonly seat: string;
} | {
    readonly kind: "governor";
    readonly state: Exclude<StateId, "DC">;
} | {
    readonly kind: "cabinet";
    readonly role: RoleId;
} | {
    readonly kind: "foreign-leader";
    readonly nation: NationId;
} | {
    readonly kind: "agency";
    readonly institution: InstitutionId;
} | {
    readonly kind: "vice-president";
};
export type Officeholder = {
    readonly person: PersonId;
    readonly office: Office;
};
/** Every living person in a modeled office the mortality draw covers, once each, in id order. */
export declare function occupiedOffices(campaign: Campaign): readonly Officeholder[];
/**
 * The day this person dies in `year`, or none: one keyed draw for whether, one
 * for the day. Whether they are still in office that day is asked then, so a
 * person who leaves office first simply does not die in it.
 */
export declare function deathDateIn(streams: RngStreams, person: PersonId, age: number, year: number): GameDate | undefined;
/** A person's age in `year`: `base.age` is the age at founding, so it advances with the calendar. */
export declare function ageInYear(campaign: Campaign, foundingAge: number, year: number): number;
export type OfficeDeath = {
    readonly holder: Officeholder;
    readonly date: GameDate;
};
/** The office-holders whose drawn day falls in the week now open, in id order. */
export declare function deathsThisWeek(campaign: Campaign): readonly OfficeDeath[];
