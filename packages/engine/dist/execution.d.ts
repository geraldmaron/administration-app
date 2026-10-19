import type { Person, RoleId } from "@admin/world";
import type { Campaign, PersonRuntime } from "./state.js";
import type { ExecutiveOrder } from "./orders.js";
import type { ResolutionRequest } from "./resolution.js";
import { type InstitutionDef } from "./institutions.js";
import { type DecisionStamp, type Term, type Willingness } from "./willingness.js";
export type CarryOut = {
    readonly chair: PersonRuntime;
    readonly role: RoleId;
    readonly willingness: Willingness;
    /**
     * The share of the act's own preparation time the chair adds: up to all of
     * it when they drag it, down to a quarter less for a military operation a
     * bold Secretary moves faster. Zero is the book.
     */
    readonly delayShare: number;
    readonly decision: DecisionStamp;
};
/** A directive left this far behind is one the department is not moving on at all. */
export declare const SLOW_WALK_SHARE = 0.5;
/** What kind of act the chair is handed, which decides whether fit and boldness are part of it. */
export type ActShape = {
    /** 0..1, how far the act is one the chair believes in; absent where the act has no policy to believe in. */
    readonly fit?: number;
    readonly military: boolean;
};
/** The chair's terms, signed toward carrying the act out at pace. */
export declare function carryOutTerms(campaign: Campaign, role: RoleId, person: Person, act: ActShape): readonly Term[];
/**
 * The delay share a decision is worth. Under the bar it is graded on the
 * margin, so a chair just under drags a little rather than all the way. Over
 * the bar, a military operation is taken faster by the chair's boldness alone,
 * read on the drag's own span: a Secretary who merely defers carries an
 * operation at the book's pace, and only a bold one beats it.
 */
export declare function delayShareOf(willingness: Pick<Willingness, "margin" | "terms">, military: boolean): number;
/** How far an order sits from what this person believes, as fit: 1 is their own view, 0 the far side of every axis. */
export declare function orderFit(person: Person, order: ExecutiveOrder): number;
/** A rule's carry-out, with the weeks it adds to a proceeding of `baseWeeks`. */
export type OrderExecution = CarryOut & {
    readonly addedWeeks: number;
};
/** The chair writing an order's rule, deciding how fast. A decree has nobody to drag it. */
export declare function carryOutOrder(campaign: Campaign, order: ExecutiveOrder, role: RoleId | undefined, baseWeeks: number): OrderExecution | undefined;
/**
 * The chair preparing one of the President's own operations. Another
 * government's moves are never priced by this cabinet, and an act issued the
 * moment it is ordered has no preparation to drag. `fitOf` is how far the
 * chair believes in this much force, 0..1, read by the caller that owns the
 * instrument's scale.
 */
export declare function carryOutInstrument(campaign: Campaign, request: ResolutionRequest, baseDays: number, fitOf: (person: Person) => number): CarryOut | undefined;
/**
 * The Secretary over a body the President has instructed. A directive carries
 * no policy of its own to believe in, so only the person and their week decide
 * how fast it moves.
 */
export declare function carryOutDirective(campaign: Campaign, def: InstitutionDef, subject: string): CarryOut | undefined;
/**
 * Days added to an operation's preparation, negative when a bold Secretary of
 * Defense takes them off. The simulation counts whole days, and the drag and
 * the speedup are converted the same way: any shift costs or saves at least a
 * day, up to half the operation's own time, so a one-day act has no room to
 * move either way. Rounding the speedup to the nearest day while the drag
 * rounded up erased every bold Secretary on the five- and six-day operations a
 * nearby base makes common, while a cautious one still added a day.
 */
export declare function delayedDays(carry: CarryOut | undefined, baseDays: number): number;
/** Weeks added to a rule's proceeding: a drag only, never a shortcut through notice and comment. */
export declare function delayedWeeks(carry: CarryOut | undefined, baseWeeks: number): number;
