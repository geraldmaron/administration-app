import { type Campaign, type ConflictSide, type EffectPacket, type ReportObligation, type WillingnessForecast } from "@admin/engine";
import type { NationId, OrgId } from "@admin/world";
import { type ActComparison } from "../congress/act-comparison";
/** A refusal is thrown in the engine's own words, which the screen shows where the press happened. */
export declare function mustPacket(result: {
    readonly ok: boolean;
    readonly packet?: EffectPacket;
    readonly reason?: string;
    readonly missingCapability?: string;
}): EffectPacket;
/** The packet a join commits: the engine's own, so a refusal reads in its words. */
export declare function joinPacket(campaign: Campaign, conflictId: string, side: ConflictSide): EffectPacket;
/** Joining either side of a war the United States is outside of */
export declare function joinComparison(campaign: Campaign, conflictId: string): ActComparison | undefined;
/** The packet that sends the authorization to Congress. */
export declare function authorizationPacket(campaign: Campaign, target: NationId): EffectPacket;
/** Asking Congress to authorize force against a government; without a vote, the waiting line says what force rests on. */
export declare function authorizationComparison(campaign: Campaign, target: NationId): ActComparison;
/** The packet an ending commits, built at press time on the campaign the matrix priced. */
export declare function endPacket(campaign: Campaign, conflictId: string, option: string): EffectPacket;
/** How the President's own war can end or cool; until then it runs, which is the waiting line. */
export declare function endComparison(campaign: Campaign, conflictId: string, role: "principal" | "joined", answer: WillingnessForecast | undefined): ActComparison;
export declare const REPORT_AUTHORITIES: readonly [{
    readonly value: "Article II, as Commander in Chief";
    readonly label: "Your own power as Commander in Chief (Article II)";
}, {
    readonly value: "the authorization for the use of military force in effect";
    readonly label: "The war authorization Congress passed";
}, {
    readonly value: "the collective self-defense of an ally";
    readonly label: "Defending an ally under attack";
}];
export declare const REPORT_WEEKS: readonly [4, 8, 12, 26];
export type ReportTerms = {
    readonly authority: string;
    readonly weeks: number;
};
/** The report as filed: the authority claimed, the scope the introduction described, and the estimate. */
export declare function reportPacket(campaign: Campaign, obligation: ReportObligation, terms: ReportTerms): EffectPacket;
/** Filing the report Congress is owed; until it is filed, the law counts the days. */
export declare function reportComparison(campaign: Campaign, obligation: ReportObligation, terms: ReportTerms): ActComparison;
/** The packet that brings the force out. */
export declare function terminatePacket(campaign: Campaign, obligation: ReportObligation): EffectPacket;
/** Bringing the force out; until then, the sixty days count down. */
export declare function terminateComparison(campaign: Campaign, obligation: ReportObligation): ActComparison;
export type CompactAnswers = readonly {
    readonly name: string;
    readonly forecast: WillingnessForecast;
}[];
/** The packet that calls the body to answer. */
export declare function callPacket(campaign: Campaign, org: OrgId, conflictId: string): EffectPacket;
/** Calling the allies to answer. */
export declare function callComparison(campaign: Campaign, conflictId: string, org: OrgId, orgName: string, answers: CompactAnswers): ActComparison;
