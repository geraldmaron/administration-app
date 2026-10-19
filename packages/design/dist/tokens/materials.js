import { color } from "./color.js";
/**
 * Document and classification surfaces — the paper register inside the
 * executive OS. These are the only off-ground fills a folio or banner may use;
 * components import from here rather than restating hex.
 */
export const materials = {
    paper: {
        background: "#F5F8FE",
        rule: "#C8D5E8",
        margin: "#E8E2D8",
    },
    classification: {
        /**
         * TOP SECRET handling strip — burnt ochre, not institutional crimson.
         * Identity (`semantic.identity` / accent.primary) commits an act; this
         * marking only says how much damage disclosure does.
         */
        topSecret: "#8A3A14",
        text: color.text.primary,
        unclassified: "#3A4A38",
        confidential: "#2A3A52",
        secret: "#5A4020",
    },
    folio: {
        background: "#F5F8FE",
        rule: "#C8D5E8",
        margin: "#C8C2B6",
        ink: "#1A1A18",
    },
};
