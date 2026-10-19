import { type Campaign, type EffectPacket, type MetricCost, type RiskBranch } from "@admin/engine";
export type MarketLeverKey = "fed-ease" | "fed-tighten" | "reserve" | "fuel-waiver";
export type MarketLever = {
    readonly key: MarketLeverKey;
    readonly label: string;
    readonly kind: "refused";
    readonly refusal: string;
} | {
    readonly key: MarketLeverKey;
    readonly label: string;
    readonly kind: "available";
    readonly cost: MetricCost;
    readonly risks: readonly RiskBranch[];
    /** What the act does, in one sentence with its date. */
    readonly effect: string;
};
export type MarketLeverAct = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** Every market lever the President holds, priced or refused. */
export declare function marketLevers(campaign: Campaign): readonly MarketLever[];
/** The act a lever commits, through the ordinary commit path. */
export declare function marketLeverAct(campaign: Campaign, key: MarketLeverKey): MarketLeverAct;
