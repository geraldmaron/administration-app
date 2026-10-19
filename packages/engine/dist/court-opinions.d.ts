import type { ConstitutionalGround } from "./legislative-acts.js";
import type { ExecutiveOrder } from "./orders.js";
import type { CourtHolding } from "./state-judiciary.js";
/** The question a case puts to the bench, in one sentence. */
export declare function caseQuestion(order: ExecutiveOrder, ground: ConstitutionalGround): string;
export type OpinionText = {
    readonly majority: string;
    readonly dissent?: string;
};
/** The majority's paragraph, and the dissent's where there was one. */
export declare function composeOpinion(order: ExecutiveOrder, ground: ConstitutionalGround, holding: CourtHolding, majority: number, minority: number): OpinionText;
