import { type Campaign } from "./state.js";
import type { ExecutiveOrderRecord, PendingRule } from "./state-orders.js";
import type { CourtMatter } from "./state-judiciary.js";
import type { ConstitutionalGround } from "./legislative-acts.js";
import type { OrderExecution } from "./execution.js";
import type { Charter } from "@admin/world";
import type { BenchMember } from "./judiciary.js";
import type { ExecutiveOrder } from "./orders.js";
export declare function agencyRuleProcess(orderId: string, noticeWeeks: number, execution: OrderExecution | undefined): PendingRule["process"];
/** A filed matter is built from the signed rule and the state it actually threatens. */
export declare function specializedMatter(state: Campaign, record: ExecutiveOrderRecord, rule: PendingRule | undefined): CourtMatter | undefined;
/** Specific statutory and record facts constrain these cases before judicial preferences enter. */
export declare function specializedGround(matter: CourtMatter | undefined, rule: PendingRule | undefined, ordinaryGround: ConstitutionalGround, record?: ExecutiveOrderRecord, state?: Campaign): ConstitutionalGround;
export declare function specializedThreshold(matter: CourtMatter | undefined, rule: PendingRule | undefined): boolean | undefined;
/** A preliminary §2808 injunction needs an uncommitted balance and a merits showing. */
export declare function constructionInterimRelief(state: Campaign, record: ExecutiveOrderRecord, charter: Charter, order: ExecutiveOrder, ground: ConstitutionalGround, draw: number): boolean;
/** Each independently missing agency step changes the merits, beyond the legal ground's binary label. */
export declare function specializedMeritsChance(charter: Charter, order: ExecutiveOrder, matter: CourtMatter | undefined, rule: PendingRule | undefined, member?: BenchMember, ground?: ConstitutionalGround): number | undefined;
