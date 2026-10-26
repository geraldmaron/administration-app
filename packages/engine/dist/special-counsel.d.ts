import type { RoleId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
import type { OversightMatter } from "./oversight.js";
/**
 * The cabinet seat that appoints and could remove one.
 *
 * Read off the catalog's own join rather than named here, so the seat this
 * file means is the seat the rest of the government means by the Department of
 * Justice — and a charter that seats no Attorney General simply has no counsel
 * to appoint, which is the honest outcome rather than a crash.
 */
export declare function attorneyGeneralRole(): RoleId | undefined;
export declare function isSpecialCounselMatter(matter: OversightMatter): boolean;
export declare function selectSpecialCounselMatters(campaign: Campaign): readonly OversightMatter[];
/** The counsels actually sitting, which is what any price depends on. */
export declare function selectOpenSpecialCounsel(campaign: Campaign): readonly OversightMatter[];
/**
 * The week the department stops handling something itself.
 *
 * One counsel at a time across the whole government, and the oldest ripe matter
 * first: a president with three reported obstructions should watch the second
 * appointment arrive after the first is finished, rather than open the board to
 * a standing panel of prosecutors.
 */
export declare const specialCounselPhase: TurnPhase;
/**
 * The oversight, chamber and press effects a dismissal of the Attorney General
 * carries while a counsel is sitting.
 *
 * Returned as effects rather than as a packet so the dismissal stays one act in
 * the record: a president who fires the Attorney General has done one thing,
 * and the record should not show them doing two on the same day.
 */
export declare function counselDismissalEffects(campaign: Campaign, role: RoleId, name: string): readonly Effect[];
/**
 * What the chair costs while a counsel is sitting, for the screen that offers
 * to empty it.
 *
 * Absent when there is nothing sitting, so a surface reading this has no way to
 * warn about a prosecutor who does not exist.
 */
export type CounselPrice = {
    readonly counsel: readonly OversightMatter[];
    readonly reasoning: string;
};
export declare function projectCounselObstruction(campaign: Campaign, role: RoleId): CounselPrice | undefined;
/** The causes 28 C.F.R. 600.7(d) lists for removing a special counsel. */
export type CounselRemovalGround = "misconduct" | "dereliction-of-duty" | "incapacity" | "conflict-of-interest" | "policy-violation";
export type CounselSupervision = {
    readonly kind: "countermand";
    readonly matterId: string;
} | {
    readonly kind: "remove";
    readonly matterId: string;
    readonly ground: CounselRemovalGround;
};
export type CounselSupervisionResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Ask the Attorney General to supervise a sitting special counsel.
 *
 * Under 28 C.F.R. 600.7(b) the Attorney General may conclude a step should not
 * be pursued, and under 600.7(d) alone may remove a counsel, for a listed
 * cause. The President has neither power. What the President can do is ask, and
 * the answer is the Attorney General's: the same legality weighing an order
 * gets, without a draw. A request the Attorney General declines is recorded on
 * the matter and costs nothing else, which is the protection's whole purpose.
 */
export declare function superviseSpecialCounsel(campaign: Campaign, request: CounselSupervision): CounselSupervisionResult;
