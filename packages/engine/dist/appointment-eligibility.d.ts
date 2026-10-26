import type { Person } from "@admin/world";
import type { Campaign } from "./state.js";
import { type OfficeId } from "./institutions.js";
/** What kind of seat an office is, which decides the rules and the weights a pool reads it by. */
export type SeatKind = "cabinet" | "deputy" | "agency" | "regulator" | "service-secretary" | "joint-chiefs" | "justice" | "circuit";
/**
 * The kind of seat an office is, or nothing for an office the Senate does not
 * confirm: a seat the President fills alone has no nomination to send.
 */
export declare function seatKindOf(office: OfficeId): SeatKind | undefined;
/** Whether this seat is held for life, which is what makes a nominee's age a reading. */
export declare function isLifeSeat(kind: SeatKind): boolean;
/**
 * A legal career: read law, or practiced it or sat as a judge. The generator
 * draws a field of study and a career separately, so a lawyer of twenty years
 * may carry a degree in public administration; the practice is the career.
 */
export declare function hasLegalCareer(person: Pick<Person, "career" | "education">): boolean;
/**
 * Serving: the generator runs a person's last post to their present age, so a
 * last post in command is a career still in uniform.
 */
export declare function isServingOfficer(person: Pick<Person, "career">): boolean;
/** Years in command across a career. */
export declare function commandYears(person: Pick<Person, "career">): number;
/** Years since the last post in uniform ended, or nothing for somebody who never served. */
export declare function yearsOutOfUniform(person: Pick<Person, "career" | "age">): number | undefined;
/**
 * Why this person may not be sent up for this seat at all, or nothing.
 *
 * Nationality and the cabinet's eligible-role bench are not here: the first is
 * the nomination's own structural check, and the second is the pool's gate,
 * because a cabinet chair the agenda or a report proposes a name for has
 * always taken that name on the President's word.
 */
export declare function seatRuleRefusal(campaign: Campaign, office: OfficeId, person: Person): string | undefined;
