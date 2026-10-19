import type { CaseDisposition, CaseRaise, CaseStatus, PresidentialCase } from "./case-types.js";
import type { EffectActor, GameDate } from "./state-campaign.js";
import type { Campaign } from "./state.js";
export declare function isOpenCase(status: CaseStatus): boolean;
/** Inserts a new case. The same id cannot be raised twice. */
export declare function withRaisedCase(campaign: Campaign, raise: CaseRaise, actor: EffectActor, causeId: string | undefined): Campaign;
/** Appends one transition. A closed case, a forbidden disposition, and a deferral past a deadline all fail. */
export declare function withCaseTransition(campaign: Campaign, id: string, disposition: CaseDisposition, narration: string, actor: EffectActor, causeId: string | undefined): Campaign;
export declare function openCases(campaign: Campaign): readonly PresidentialCase[];
export declare function deferredCases(campaign: Campaign): readonly PresidentialCase[];
export declare function blockingCases(campaign: Campaign, on: GameDate): readonly PresidentialCase[];
export declare function dueCases(campaign: Campaign, on: GameDate): readonly PresidentialCase[];
