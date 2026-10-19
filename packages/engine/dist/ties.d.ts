import type { PersonId } from "@admin/world";
import type { Campaign, HillFigure, PersonRuntime } from "./state.js";
import type { Favor, FavorStatus, Tie, TieGrudge } from "./state-ties.js";
/** Neither warm nor cold. What a person nobody has dealt with reads as. */
export declare const NEUTRAL_RAPPORT = 0.5;
/** Neither proven nor broken. */
export declare const NEUTRAL_TRUST = 0.5;
/** The tie someone holds before anything the President did has reached them. */
export declare const EMPTY_TIE: Tie;
export type FavorSettlement = {
    readonly id: string;
    readonly status: Exclude<FavorStatus, "open">;
    readonly turn: number;
};
/**
 * One change to one person's tie. Every part is optional and they apply in the
 * order listed, so a play that moves a member and records what they were
 * promised is one effect with one cause.
 */
export type TieEffect = {
    readonly kind: "tie";
    readonly person: PersonId;
    /** Why it moved, in the words the record would use. Required and never empty. */
    readonly cause: string;
    readonly rapport?: {
        readonly set: number;
    } | {
        readonly delta: number;
    };
    readonly trust?: {
        readonly delta: number;
    };
    readonly openFavor?: Favor;
    readonly settleFavor?: FavorSettlement;
    readonly grudge?: TieGrudge;
};
type People = Readonly<Record<string, PersonRuntime>>;
export declare function tieOf(people: People, person: PersonId | string): Tie | undefined;
export declare function rapportOf(people: People, person: PersonId | string): number;
/** How warm the member holding a Hill post is toward the administration. */
export declare function figureRapport(people: People, figure: HillFigure): number;
/** The same people, with one person's rapport read as something else: for a projection, never a write. */
export declare function withRapportRead(people: People, person: PersonId | string, rapport: number): People;
export type HeldFavor = Favor & {
    readonly holder: PersonId;
};
/**
 * Every favor the President still owes, oldest first.
 *
 * Ordered by when it was given and then by id, which is the order the ledger
 * recorded them in, so a sum over them adds in the same order every time.
 */
export declare function openFavorsOwedByPresident(campaign: Pick<Campaign, "people">): readonly HeldFavor[];
/** One tie effect folded into a people table. The handler `apply` runs, and the one founding seats the Hill with. */
export declare function withTie(people: People, effect: TieEffect): People;
export declare function applyTie(state: Campaign, effect: TieEffect): Campaign;
/**
 * Settle every open favor the President owes on a bill: repaid when it became
 * law, defaulted when it died. Part of writing the bill, so no law or death can
 * leave a claim on it open.
 */
export declare function settleFavorsOnBill(state: Campaign, billId: string, status: "repaid" | "defaulted", turn: number): Campaign;
export {};
