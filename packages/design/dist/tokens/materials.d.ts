/**
 * Document and classification surfaces — the paper register inside the
 * executive OS. These are the only off-ground fills a folio or banner may use;
 * components import from here rather than restating hex.
 */
export declare const materials: {
    readonly paper: {
        readonly background: "#F5F8FE";
        readonly rule: "#C8D5E8";
        readonly margin: "#E8E2D8";
    };
    readonly classification: {
        /**
         * TOP SECRET handling strip — burnt ochre, not institutional crimson.
         * Identity (`semantic.identity` / accent.primary) commits an act; this
         * marking only says how much damage disclosure does.
         */
        readonly topSecret: "#8A3A14";
        readonly text: "#F4F6FC";
        readonly unclassified: "#3A4A38";
        readonly confidential: "#2A3A52";
        readonly secret: "#5A4020";
    };
    readonly folio: {
        readonly background: "#F5F8FE";
        readonly rule: "#C8D5E8";
        readonly margin: "#C8C2B6";
        readonly ink: "#1A1A18";
    };
};
export type MaterialsToken = typeof materials;
