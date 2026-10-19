import { type ActionProjection, type Campaign, type ForcePackage, type InstrumentId, type Likelihood, type ResolutionRequest, type RungLevel, type TariffIncidence, type TradeEdge, type TreatyKind, type WillingnessForecast } from "@admin/engine";
import type { NationId } from "@admin/world";
import type { TariffStatute } from "@admin/engine";
import { type TariffLawRow } from "./tariff-law";
import { type ForcePackageChoice } from "../world/nation-forces";
import { type ActConfig, type ActOption } from "./catalogue";
export type OptionState = "open" | "held" | "underway" | "done";
export type OddsStance = "favorable" | "caution" | "adverse";
export type OptionPreview = {
    readonly state: OptionState;
    /** Why it cannot be taken now, or what is already under way, in a sentence. */
    readonly reason?: string;
    /** The odds in words, with the engine's own chance (0..1) where it computes one rather than forecasting a band. */
    readonly odds?: {
        readonly label: string;
        readonly word: string;
        readonly stance: OddsStance;
        readonly chance?: number;
    };
    /** The money, said the way a player weighs it. */
    readonly cost: string;
    /** The same money as figures, so options can be drawn on one scale. */
    readonly money?: ActMoney;
    /** What a force act's money was priced on, and what it bills each week after. */
    readonly basis?: string;
    readonly timing: string;
    /** The same two, short enough for a column in a list of options. */
    readonly short: {
        readonly cost: string;
        readonly timing: string;
    };
    /** Days until it lands, where the engine knows them, so options can be ordered by how soon. */
    readonly days?: number;
    /** How hard the act pushes, where the engine has a scale for it. */
    readonly scale?: {
        readonly label: string;
        readonly level: number;
        readonly of: number;
    };
    /** What stands in for a scale where the act has none. */
    readonly note?: string;
    /** The single gravest thing it starts: a war. */
    readonly warning?: string;
};
/**
 * What an act does to the Treasury, in USD millions: what it spends the
 * moment it is ordered, what it bills each week a force stays out, and what
 * it brings in a year. Drawn together so an act that bills every week never
 * reads cheaper than one paid once.
 */
export type ActMoney = {
    readonly now: number;
    readonly weekly: number;
    readonly perYearIn?: number;
};
export declare const LIKELIHOOD_STANCE: Readonly<Record<Likelihood, OddsStance>>;
export declare const RETALIATION_STANCE: Readonly<Record<Likelihood, OddsStance>>;
/** The one request an instrument option is priced and ordered on, with the force the President chose for a military rung. */
export type InstrumentDraft = {
    readonly request: ResolutionRequest;
    readonly choice?: ForcePackageChoice;
    readonly force?: ForcePackage;
};
export declare function instrumentDraft(campaign: Campaign, nation: NationId, instrument: InstrumentId, rung: RungLevel, count?: number, config?: ActConfig): InstrumentDraft;
export declare function instrumentProjection(campaign: Campaign, draft: InstrumentDraft): import("@admin/engine").ProjectionResult;
/** The money an act moves now: a spend is negative on the engine's books. */
export declare function moneyWords(treasury: number): string;
/** The money in a list column: a spend bare, money coming in signed. */
export declare function moneyShort(treasury: number): string;
export declare function timingWords(projection: ActionProjection): string;
export declare const WILLINGNESS_WORDS: Readonly<Record<WillingnessForecast, string>>;
/** The signature, read first, and the Senate's whip count on what it would send up. */
export declare function treatyReading(campaign: Campaign, nation: NationId, kind: TreatyKind): {
    result: import("@admin/engine").TreatyResult;
    senate: import("@admin/engine").RatificationProjection | undefined;
};
/** The goods we buy from them that a tariff can land on, the largest first. */
export declare function tariffableSectors(campaign: Campaign, nation: NationId): readonly TradeEdge[];
/** A rate a new tariff opens at, before the President sets one. */
export declare const DEFAULT_TARIFF_RATE = 10;
export type TariffDraft = {
    readonly sector: TradeEdge;
    /** Whole percent. */
    readonly rate: number;
    /** Whole percent already in force on this sector, and how much room is left before the 100% rate limit. */
    readonly standing: number;
    readonly room: number;
    readonly incidence?: TariffIncidence;
    /** The trade law the tariff would rest on, and whether pressing orders the tariff or the law's investigation. */
    readonly law: TariffLawRow;
};
export declare function tariffDraft(campaign: Campaign, nation: NationId, sector?: string, rate?: number, statute?: TariffStatute): TariffDraft | undefined;
/**
 * Every listed option's card, priced against the campaign as it stands. The
 * engagement reading is read once for the whole set because each kind's
 * forecast comes out of the same reading.
 */
export declare function previewOptions(campaign: Campaign, nation: NationId, options: readonly ActOption[], config?: ActConfig): ReadonlyMap<string, OptionPreview>;
