export declare const US_GOODS_TRADE_YEAR = 2025;
export type UsGoodsTrade = {
    readonly imports: Readonly<Record<string, number>>;
    readonly exports: Readonly<Record<string, number>>;
};
export declare const US_GOODS_TRADE: Readonly<Record<string, UsGoodsTrade>>;
