import type { PersonId } from "@admin/world";
import type { BudgetAccount } from "./budget.js";
import type { HillPostId } from "./state-legislature.js";
/** Which way a favor runs: the President owes it, or is owed it. */
export type FavorDirection = "owed-by-president" | "owed-to-president";
/** Open until called in; repaid when honored, defaulted when it can no longer be. */
export type FavorStatus = "open" | "called" | "repaid" | "defaulted";
export type Favor = {
    readonly id: string;
    readonly direction: FavorDirection;
    /** What was promised, in the words the record keeps. */
    readonly what: string;
    readonly openedTurn: number;
    readonly dueTurn?: number;
    readonly status: FavorStatus;
    readonly settledTurn?: number;
    /** The bill whose fate settles it, when it is a claim on live business. */
    readonly billId?: string;
    readonly actId?: string;
    /** The post the holder sat in when it was given: a seat carries one open claim at a time. */
    readonly post?: HillPostId;
    readonly lobbyId?: string;
    /**
     * Budget authority the claim would take if its bill is enacted. Checked when a
     * favor is offered so the President cannot promise more than is apportioned;
     * never charged here, because the enactment is the charge.
     */
    readonly reservedTreasury?: number;
    readonly account?: BudgetAccount;
};
/** A wrong they hold against the President. Stored with its cause so it can be answered for. */
export type TieGrudge = {
    readonly cause: string;
    readonly weight: number;
    readonly turn: number;
};
export type Tie = {
    /** Warmth toward the President, 0..1, with 0.5 neither warm nor cold. */
    readonly rapport: number;
    /** Whether the President's word has held with them, 0..1. */
    readonly trust: number;
    readonly favors: readonly Favor[];
    readonly grudges: readonly TieGrudge[];
};
/**
 * Credit for a bill the President handed to a member before it became law.
 * Filed on the bill, because the enactment is the one place the President's
 * credit for a law shows, and it has to read what was given away.
 */
export type SharedCredit = {
    readonly person: PersonId;
    readonly post: HillPostId;
    /** The share of the opinion the law would move for the President that goes to the member instead, 0..1. */
    readonly fraction: number;
    readonly turn: number;
};
