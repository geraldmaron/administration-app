import type { CaseDefault, CaseDisposition, CaseKind, CaseRaise, CaseSubject } from "./case-types.js";
import type { GameDate } from "./state-campaign.js";
export type FamilyClock = "none" | "statutory" | "operational" | "deteriorating" | "opportunity";
export type FamilyContract = {
    readonly kind: CaseKind;
    readonly urgency: "hard" | "soft";
    readonly responseRequirement: "president" | "delegable" | "optional";
    readonly allowed: readonly CaseDisposition["kind"][];
    readonly clock: FamilyClock;
    readonly defaultKind: CaseDefault["kind"];
};
export declare const CASE_FAMILIES: readonly FamilyContract[];
export declare function familyContract(kind: CaseKind): FamilyContract;
export declare function familyCanEnd(contract: FamilyContract): boolean;
/** A raise that already satisfies the family's contract. */
export declare function raiseForFamily(input: {
    readonly kind: CaseKind;
    readonly id: string;
    readonly title: string;
    readonly subject: CaseSubject;
    readonly dueAt?: GameDate;
}): CaseRaise;
