export type MacroAnchorSource = "wdi" | "bea" | "bls";
export type MacroAnchorFigure = {
    readonly value: number;
    readonly year: number;
    readonly source: MacroAnchorSource;
};
export type MacroAnchor = {
    readonly growth?: MacroAnchorFigure;
    readonly inflation?: MacroAnchorFigure;
    readonly unemployment?: MacroAnchorFigure;
};
export declare const MACRO_ANCHORS_FETCHED = "2026-09-23";
export declare const MACRO_ANCHOR_SOURCES: Readonly<Record<MacroAnchorSource, string>>;
export declare const MACRO_ANCHORS: Readonly<Record<string, MacroAnchor>>;
