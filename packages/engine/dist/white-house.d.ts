import type { NationId, Person, WhiteHouseStaffRoleId } from "@admin/world";
import { type CandidateFit, type FitPresident } from "./cast-fit.js";
/** The seats each staff post is drawn from. */
export declare const STAFF_BENCH_ROLES: Readonly<Record<WhiteHouseStaffRoleId, readonly string[]>>;
export declare const STAFF_SHORTLIST = 5;
/** Whether this person is drawn from the right part of the cast for this post. */
export declare function onStaffBench(person: Person, nation: NationId, post: WhiteHouseStaffRoleId): boolean;
/** The shortlist for one post, best fit first, leaving out anyone the founding has already placed elsewhere. */
export declare function staffCandidates(pool: readonly Person[], nation: NationId, president: FitPresident, post: WhiteHouseStaffRoleId, placed?: ReadonlySet<string>): readonly CandidateFit[];
