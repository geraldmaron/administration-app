import { governorDispositionWord } from "../../world/state-dossier.js";
import { noData, solid, withFigure } from "../contract.js";
// The governors by how they feel about the President, read off the same
// disposition the states table and the state page print. The four bands run on
// the electoral call's for-and-against colors, so "with you" reads the same
// way on every Nation map.
const BAND_WORDS = ["Allied", "Cooperative", "Guarded", "Opposed"];
function bandColor(word, palette) {
    if (word === "Allied")
        return palette.forStrong;
    if (word === "Cooperative")
        return palette.forLean;
    if (word === "Guarded")
        return palette.againstLean;
    return palette.againstStrong;
}
export function governorLens(campaign, palette) {
    return {
        id: "governors",
        name: "Governors",
        level: "state",
        scale: "categorical",
        encoding: "color",
        legend: [...BAND_WORDS.map((word) => ({ label: word, color: bandColor(word, palette) })), { label: "No governor", color: palette.nodata }],
        read: (region) => {
            if (region.layer !== "states")
                return null;
            const standing = campaign?.states[region.id]?.governor;
            if (!standing)
                return noData(palette, "No governor");
            const word = governorDispositionWord(standing.disposition);
            return withFigure(solid(`Governor is ${word.toLowerCase()}`, standing.disposition, bandColor(word, palette)), word);
        },
    };
}
