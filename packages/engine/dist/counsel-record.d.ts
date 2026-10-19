import type { PersonId, RoleId } from "@admin/world";
import { type CounselStance } from "./counsel.js";
import type { InstrumentId, RungLevel } from "./instruments.js";
import { type Campaign } from "./state.js";
export type CounselCall = {
    readonly turn: number;
    readonly instrument: InstrumentId;
    readonly rung: RungLevel;
    readonly stance: CounselStance;
    readonly landed: boolean;
};
export type CounselTrackRecord = {
    readonly role: RoleId;
    readonly person: PersonId;
    readonly contested: number;
    readonly right: number;
    readonly overruled: number;
    readonly calls: readonly CounselCall[];
};
/**
 * What a seat's current holder has been right about. Composed on demand and
 * scoped to their own tenure: a chair's record is not inherited by whoever
 * walks into it.
 */
export declare function selectCounselRecord(campaign: Campaign, role: RoleId): CounselTrackRecord | undefined;
/**
 * The same record, asked for by person: the surface that has a minister in
 * front of it knows who, not which chair.
 */
export declare function selectCounselRecordFor(campaign: Campaign, person: PersonId): CounselTrackRecord | undefined;
