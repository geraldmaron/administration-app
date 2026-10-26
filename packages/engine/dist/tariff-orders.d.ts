import type { NationId } from "@admin/world";
import type { EffectPacket } from "./effects.js";
import type { Campaign } from "./state.js";
import { type InvestigatedStatute, type TariffFinding, type TariffStatute } from "./tariff-statutes.js";
import { type TradeResult } from "./trade.js";
import { type TradeSectorId } from "./trade-sectors.js";
import type { TurnPhase } from "./turn-loop.js";
export type TariffStatuteStanding = {
    readonly statute: TariffStatute;
    readonly available: boolean;
    /** Why it is or isn't available, in plain words. */
    readonly reason: string;
    /** The investigation this statute rests on, where it needs one. */
    readonly finding?: TariffFinding;
    readonly investigation: "not-needed" | "none" | "under-way" | "affirmative" | "negative";
    /** How much more this statute still allows on these goods from this country, as a fraction. */
    readonly room: number;
};
/** The latest investigation under a statute about this partner or these goods. */
export declare function latestFinding(campaign: Campaign, statute: InvestigatedStatute, partner: NationId, sector: TradeSectorId): TariffFinding | undefined;
/** Whether a partner has a measure of its own in force against American goods. */
export declare function partnerDiscriminates(campaign: Campaign, partner: NationId): boolean;
/** Whether a statute can carry a tariff on these goods from this country right now, and why. */
export declare function tariffStatuteStanding(campaign: Campaign, statute: TariffStatute, partner: NationId, sector: TradeSectorId): TariffStatuteStanding;
/**
 * Impose a tariff under a named statute.
 *
 * Refuses, in the statute's own terms, a statute whose finding doesn't hold, a
 * rate over its cap, or goods that aren't tariffed at all. A safeguard lands
 * on every country that sells the goods, as the law requires.
 */
export declare function imposeTariff(campaign: Campaign, statute: TariffStatute, target: NationId, sectorId: TradeSectorId, rate: number): TradeResult;
/** The first statute that can carry this tariff now, answering a partner's own measure first. */
export declare function fittingTariffStatute(campaign: Campaign, target: NationId, sector: TradeSectorId, rate: number): TariffStatute | undefined;
export type InvestigationResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
    readonly finding: TariffFinding;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** Order the investigation a statute's finding comes from. */
export declare function openTariffInvestigation(campaign: Campaign, statute: InvestigatedStatute, partner: NationId, sectorId: TradeSectorId): InvestigationResult;
/** Rule on every investigation whose finding is due. */
export declare const tariffFindingPhase: TurnPhase;
export declare const tariffAuthorityPhase: TurnPhase;
