import type { PlankId, StateId } from "@admin/world";
import { type AlignmentVector, type Bill, type BillSponsor, type LawRevisionKind, type Campaign } from "./state.js";
import type { LegislativeTrack } from "./congress.js";
import { type PolicyStatPath } from "./policy.js";
import { type BudgetAccount } from "./budget.js";
import type { DomesticSignature } from "./domestic-signature.js";
import type { MetricDeltas } from "./effect-types.js";
export { CONTINUING_RESOLUTION_TURNS } from "./legislative-acts-fiscal.js";
/** What an act does to the presidency once it is in force, either way. */
export type LawConstraint = {
    /** Executive orders this act puts out of the president's reach entirely. */
    readonly blocksOrders?: readonly string[];
    /**
     * Executive orders this act puts the legislature's own authority behind.
     *
     * The counterpart to `blocksOrders`, and the reason the field is here rather
     * than a second catalogue: a president acting on a statutory hook is at the
     * height of their power, one acting in the silence of Congress is in the
     * zone of twilight, and one acting against an expressed will is at the
     * lowest ebb. Without this the model had only the silence and the
     * prohibition, so winning a statute bought a president nothing at the bench
     * — which removed the reason to spend floor time on one.
     */
    readonly authorizesOrders?: readonly string[];
    /**
     * Whether it strips the latitude the office has to introduce forces first and
     * report afterward. Congress can do this, and has.
     */
    readonly barsUnilateralForce?: boolean;
    /**
     * Whether it limits what the executive branch's own officers may do where no
     * order names the power it takes away: a shield law narrows what a federal
     * subpoena can compel from a reporter, and binds the President's Justice
     * Department as surely as a blocked order would.
     */
    readonly bindsTheExecutive?: boolean;
};
/**
 * Which of the three grounds an order stands on, in the order they run from
 * strongest to weakest.
 *
 * Named here beside `LawConstraint` because it is entirely a fact about the
 * statute book: `authorizesOrders` produces the first, an absence produces the
 * second, and `blocksOrders` (or a resolution of disapproval) produces the
 * third.
 */
export type ConstitutionalGround = "authorized" | "silent" | "forbidden";
/**
 * Whether the country is in one of the two cases the Suspension Clause names.
 *
 * Article I, Section 9 permits the writ to be suspended in cases of rebellion
 * or invasion and in no others, so a declared emergency over a storm is not a
 * case for it however grave the storm is. Rebellion is read off the cause the
 * declaration was actually made over; invasion is a war the country is
 * defending on its own soil, which is the one the clause is written for — a
 * war it is prosecuting abroad is not.
 *
 * It sits with the statute book because the clause is Congress's: the order
 * catalogue carries no detention power for it to open, and a President has no
 * authority of their own to hold anyone without charge (18 U.S.C. §4001(a)).
 */
export declare function underRebellionOrInvasion(campaign: Campaign): boolean;
export type LegislativeAct = {
    readonly id: string;
    /** The name a player remembers it by, and the name the record keeps. */
    readonly title: string;
    readonly summary: string;
    /** Player-facing subject and competing interest; never eligibility rules. */
    readonly topic?: string;
    readonly tradeoff?: string;
    readonly sponsor: BillSponsor;
    /** A normal bill changing one existing statute; its predecessor is recorded when introduced. */
    readonly revises?: {
        readonly family: "housing-supply";
        readonly kind: LawRevisionKind;
    };
    /**
     * What the act is worth on the floor in its own right, on top of what the
     * Hill thinks of the administration. An act the country is demanding passes
     * over a president nobody likes.
     */
    readonly appeal: number;
    /**
     * Which Senate arithmetic it answers to. Ordinary unless stated, because
     * ordinary is what almost everything is: the budget track is open only to
     * measures whose substance is spending, revenue or the debt limit.
     */
    readonly track?: LegislativeTrack;
    /**
     * The plank of a platform this act enacts, where it enacts one.
     *
     * What makes an administration bill *this* administration's to send up. A
     * president transmits the program they ran on; a bill that enacts a plank
     * nobody sealed is a bill this White House has no mandate to have written,
     * whatever the chamber thinks of it. Congress may still originate it — the
     * other side's agenda is not gated on the President's platform.
     *
     * Absent on every act whose subject is the government working at all rather
     * than a promise: a stopgap, a ceiling, an authorization, a constraint on the
     * office.
     */
    readonly plank?: PlankId;
    /**
     * The Senate committee that marks it up, where the subject has an obvious
     * one. Optional and it must stay optional: the money bills answer to
     * Appropriations and the Budget Committee, which confirm nobody and therefore
     * have no id in the institution catalog, and a measure routed to the nearest
     * panel instead would be a guess doing arithmetic. An act with no committee
     * is marked up against the room, exactly as every act was before.
     */
    readonly committee?: string;
    /**
     * What it costs in the 0..1 metrics, which are already relative and need no
     * denominator. The money is not here — see `treasuryOfGdp`.
     */
    readonly cost: MetricDeltas;
    /**
     * What it appropriates (negative) or saves (positive) as a share of the
     * country's annual output.
     *
     * Held as a share for the same reason an executive order's is: a flat −900
     * against a federal treasury of roughly 2,470,000 is a third of a percent,
     * which is not what a decade of infrastructure money costs anyone. Only the
     * acts that actually move money carry this; an authorization raises a ceiling
     * and appropriates nothing, so it carries neither this nor a cost line.
     */
    readonly treasuryOfGdp?: number;
    /** Named military construction projects this law actually appropriates, each as a GDP share. */
    readonly militaryConstruction?: readonly {
        readonly id: string;
        readonly name: string;
        readonly hostState: StateId;
        readonly shareOfGdp: number;
    }[];
    /**
     * How far this act lifts the statutory ceiling on federal borrowing, as a
     * share of output.
     *
     * A debt-limit bill appropriates nothing. It permits the Treasury to borrow
     * to pay obligations Congress has already authorized, which is why it is the
     * one bill in the catalogue nobody gains a seat voting for — and why it used
     * to be the largest single credit to the President's own account in the game,
     * which it is not and never was.
     */
    readonly borrowingCeilingOfGdp?: number;
    /**
     * What this act permits the appropriators to commit that they could not
     * before, and for how long.
     *
     * An authorization is not an appropriation. It raises a ceiling; the money
     * still has to be voted separately, and the capability still has to be
     * bought week by week out of the account. Without this the defense
     * authorization delivered readiness by itself, which taught the exact
     * inversion the Antideficiency Act exists to prevent.
     */
    readonly raisesCap?: {
        readonly account: BudgetAccount;
        readonly share: number;
        readonly turns: number;
    };
    /**
     * How much more government this act pays for, at whatever numbers are
     * already in force: a count of weeks, or the rest of the fiscal year.
     *
     * The stopgap's whole content. It is not `treasuryOfGdp` and not
     * `raisesCap`: a continuing resolution appropriates nothing new and raises
     * no ceiling, it only moves the date the money runs out — which is why it
     * ends a lapse without ending the year of governing on last year's numbers.
     * A full-year resolution runs to September 30, as the year it concedes does,
     * rather than to a date a year from whenever it happened to pass.
     */
    readonly funds?: {
        readonly turns: number;
    } | {
        readonly throughFiscalYear: true;
    };
    readonly nationEffects: Partial<Record<PolicyStatPath, number>>;
    readonly alignment: Partial<AlignmentVector>;
    readonly constrains?: LawConstraint;
    /**
     * Who this act hits at home once it is law. Declared on the catalogue
     * entry; `enactmentEffects` splices `routeDomestic` (and belief-split
     * polarization) into every path that enacts — signed, lapsed, or overridden —
     * so a statute and a decree leave the same kind of state mark.
     */
    readonly domestic?: DomesticSignature;
    /**
     * How many turns after this act became law it may be written again.
     *
     * Most legislation is once and for all — a law that limits emergency powers
     * is not passed a second time. A few are calendars rather than measures: the
     * defense authorization is described in its own summary as "the one bill that
     * passes every year", and the fiscal cap it is paired with runs two. Without
     * this the whole catalogue was one-shot, so the agenda emptied inside the
     * first year and a full term produced at most six bills.
     */
    readonly recurs?: number;
    /**
     * Whether Congress takes this up the week it becomes eligible rather than at
     * the next ordinary session.
     *
     * The origination cadence is what stops the signing ceremony being a weekly
     * chore, and it is exactly wrong for a stopgap: a Congress that waited eleven
     * weeks to move a continuing resolution would be a Congress that could not
     * end a shutdown before the country had already lived a season of one. A real
     * one moves in the days before the money runs out. Only a measure whose whole
     * subject is the deadline may claim this.
     */
    readonly urgent?: boolean;
    /**
     * What has to be true of the country for Congress to take it up at all.
     *
     * Bills arise from conditions rather than from a rotation, so an act about
     * war powers reaches the desk of a president who has been making war and
     * never reaches the desk of one who has not.
     */
    readonly arises: (campaign: Campaign) => boolean;
    /**
     * The executive order this act is written against, chosen the week Congress
     * takes it up. Only a resolution of disapproval has one; an act that names
     * no order is about the country rather than about a particular thing the
     * President did.
     *
     * An act declaring this is off the agenda whenever it resolves to nothing,
     * whatever `arises` says — there is no such thing as a disapproval of no
     * rule in particular.
     */
    readonly targetsOrder?: (campaign: Campaign) => string | undefined;
    /**
     * Whether enacting it strikes the order it names.
     *
     * The undoing itself is not done here. `rulemakingPhase` performs it, for
     * the same reason the court's does: the order catalogue is what knows what
     * an order did to the country, and this file must not read it.
     */
    readonly disapproves?: boolean;
};
/**
 * How long after a rule takes effect Congress may still disapprove it.
 *
 * The Congressional Review Act's window is sixty days of continuous session,
 * counted in the weeks this game runs on. It is what makes the resolution a
 * real instrument rather than a permanent veto over the whole statute book:
 * miss it, and the rule stands.
 */
export declare const DISAPPROVAL_WINDOW_TURNS = 9;
export declare const LEGISLATIVE_ACTS: readonly LegislativeAct[];
export declare function legislativeAct(id: string): LegislativeAct | undefined;
/** A narrower authored provision exists only for these named measures. */
export declare function amendableAct(id: string): boolean;
export declare function actForText(id: string, text: "base" | "targeted"): LegislativeAct | undefined;
/** Compatibility reader for the established housing proceedings. */
export declare function housingActForText(text: "base" | "targeted"): LegislativeAct;
/** The act a bill on the record is an instance of. */
export declare function actOf(bill: Bill): LegislativeAct | undefined;
/**
 * What an act costs the country it passes in, money included.
 *
 * The catalogue states the money as a share of output, so the sum only exists
 * once there is a country to appropriate it from. Exported because every
 * surface that quotes a bill's price has to quote this one: reading `cost` off
 * the catalogue entry now yields the metric lines and no money at all.
 */
export declare function actCost(campaign: Campaign, act: LegislativeAct): MetricDeltas;
