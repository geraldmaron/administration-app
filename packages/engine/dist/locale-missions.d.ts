import { type StateId } from "@admin/world";
import { type Campaign, type ExecutiveOrderRecord, type GovernorStanding, type NationCondition } from "./state.js";
import { type ProspectiveOrderAuthority } from "./order-authority.js";
import type { LocaleActId } from "./locale-acts.js";
import type { OrderSubject } from "./order-subjects.js";
/**
 * Whether the governor will go along with an act that needs them.
 *
 * Read off `GovernorStanding`. A governor disposed against the administration
 * refuses, and the refusal is what leaves only the statutes that do not ask.
 */
export declare const GOVERNOR_ASSENT_FLOOR = 0.45;
export declare function governorAssents(governor: GovernorStanding | undefined): boolean;
/** Live unrest at home that reaches this state: placed in it, or national. The placed one wins. */
export declare function unrestReaching(campaign: Campaign, state: StateId): NationCondition | undefined;
/**
 * How bad unrest has to be before each Insurrection Act occasion can be read
 * into it. Planning values: the Act names no threshold, and these order the
 * three occasions by how far each reaches past the state's own authority.
 */
export declare const INSURRECTION_SEVERITY: {
    readonly request: 0.4;
    readonly obstruction: 0.5;
    readonly rights: 0.6;
};
/** §252 is read once the state has let a federal court's injunction stand defied for this long. */
export declare const OBSTRUCTION_WEEKS = 1;
/**
 * Unrest at or above this is still a disorder the state has left to the court order. Lower than the bar for suing, because the mission that made the suit
 * possible is also what eases the unrest while the court decides, and a state that has stood on a granted order is obstructing it however the crowds fare.
 */
export declare const OBSTRUCTION_STILL = 0.3;
/** A §254 proclamation must precede the order by at least a week, and stays in force this long. */
export declare const PROCLAMATION_VALID_TURNS = 4;
/** Above this, insurgency reads as rebellion for §12406(2). The United States rests near 0.05. */
export declare const REBELLION_INSURGENCY_FLOOR = 0.2;
/** How long Insurrection Act troops must have been on a mission here before §12406(3) reads them as unable to carry it out. */
export declare const REGULAR_FORCES_WEEKS = 2;
export type InsurrectionGround = "251" | "252" | "253";
/** The order each mission act signs; the troop order splits by the Act's own sections. */
export declare function missionOrderId(act: LocaleActId, ground?: InsurrectionGround): string | undefined;
export declare function isMissionOrder(orderId: string): boolean;
/**
 * How long each mission runs once ordered, apart from what it is worth to the
 * unrest: an immigration operation runs its weeks whether or not it eases
 * anything, and a court reads those weeks as the federal law it enforces.
 * Planning values.
 */
export declare const MISSION_WEEKS: Readonly<Partial<Record<LocaleActId, number>>>;
/** What each mission is worth to the unrest it answers, and for how long. Planning values. */
export declare const MISSION_ATTENTION: Readonly<Partial<Record<LocaleActId, {
    readonly attention: number;
    readonly weeks: number;
}>>>;
/** Each Insurrection Act occasion, read off this week's record for this state. */
export declare function insurrectionGrounds(campaign: Campaign, state: StateId): Readonly<Record<InsurrectionGround, boolean>>;
/** The occasion a proclamation would rest on this week, the one that asks least of federal power first. */
export declare function insurrectionGround(campaign: Campaign, state: StateId): InsurrectionGround | undefined;
/** A §254 proclamation for this state, issued an earlier week inside its window, still in force. */
export declare function liveProclamation(campaign: Campaign, state: StateId): ExecutiveOrderRecord | undefined;
export type FederalServiceGround = "invasion" | "rebellion" | "regular-forces";
/** §12406's occasions, as Trump v. Illinois (2025) reads them: never a declaration or a protest. */
export declare function federalServiceGround(campaign: Campaign, state: StateId): FederalServiceGround | undefined;
/** The text after "This needs " for each refused force act, citing the law that closes it. */
export declare const LOCALE_REFUSALS: {
    readonly federalize: "an invasion, a rebellion, or an Insurrection Act mission here that the regular forces have not been able to carry out: 10 U.S.C. §12406(3), which Trump v. Illinois (2025) reads as reaching only where the military could legally execute the laws and could not do it. A declaration or a protest is none of them";
    readonly proclaim: "one of the Insurrection Act's occasions: the governor's request (§251), obstruction of a federal court's order that the state has let stand (§252), or violence denying rights the state will not protect (§253)";
    readonly troops: "a proclamation ordering the insurgents to disperse, issued an earlier week and still in force (10 U.S.C. §254). Without it, the Posse Comitatus Act (18 U.S.C. §1385) bars the armed forces from executing the laws";
    readonly surveil: "a FISA or Title III court order, the exclusive means for electronic surveillance (50 U.S.C. §1812), and the Attorney General's procedures for collection on U.S. persons (Executive Order 12333 §2.3). No presidential order supplies either; set an investigative priority instead";
    readonly "surveil-under-order": "a FISA or Title III order granted for this state and still in force (50 U.S.C. §1812). Seek one from the court first";
    readonly disorder: "unrest in the state: federal force and collection answer disorder, not a disaster";
    readonly stacked: "no mission already in force here: one federalized Guard and one troop mission to a state, never both ordered the same week";
};
/** The signing gate a mission order holds for itself, so a direct signature cannot skip the act's predicate. */
export declare function missionOrderRefusal(campaign: Campaign, orderId: string, subject?: OrderSubject): string | undefined;
/** The flag a carried investigative priority leaves on a state; mission attention reads its turn-stamped marker. */
export declare function investigativePriorityFlag(state: StateId): string;
export type LiveLocaleMission = {
    readonly act: LocaleActId;
    readonly recordId?: string;
    readonly sinceTurn: number;
    readonly status: ProspectiveOrderAuthority;
};
/** Every federal mission in this state still inside its window, with whether its order still operates. */
export declare function liveLocaleMissions(campaign: Campaign, state: StateId): readonly LiveLocaleMission[];
/**
 * What federal missions are worth to one unrest condition at home, 0..1.
 *
 * A placed condition takes the heaviest mission in its state. National unrest
 * is answered only as far as the missions reach the people living through it,
 * so each state's mission counts by its share of the population.
 */
export declare function missionAttention(campaign: Campaign, condition: NationCondition): number;
