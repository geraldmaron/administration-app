import type { Nation, NationFidelity } from "../schemas/nation.js";
import type { NationId } from "../schemas/ids.js";
export type TradeInput = Pick<Nation, "id" | "geo" | "stats"> & {
    readonly memberships?: readonly string[];
    readonly playable?: boolean;
    readonly fidelity?: NationFidelity;
};
export declare function greatCircleKm(a: {
    lat: number;
    lon: number;
}, b: {
    lat: number;
    lon: number;
}): number;
export declare function gravityPull(from: TradeInput, to: TradeInput): number;
export declare function tradeExposure(stats: Nation["stats"]): number;
export type PartnerShare = {
    partner: NationId;
    share: number;
};
export declare function partnerShares(from: TradeInput, all: readonly TradeInput[]): PartnerShare[];
export declare function deriveTrade(from: TradeInput, all: readonly TradeInput[]): {
    topPartners: NationId[];
    tradeDependence: Record<string, number>;
};
export declare function applyTrade<T extends TradeInput>(nations: readonly T[]): T[];
