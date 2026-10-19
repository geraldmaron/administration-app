import { selectOutlets } from "@admin/engine";
import { STANCE_TONE, STANCE_WORD } from "../../press/desks.js";
import { stateById } from "@admin/world";
import { noData, solid } from "../contract.js";
// The press office's reach on the map: every state colored by where the
// regional paper its readers take stands with the administration. The
// national desks reach everywhere and are read in the panel; the map shows
// the one part of the corps that has a geography.
export function pressReachLens(campaign, palette) {
    const byRegion = new Map(campaign ? selectOutlets(campaign).flatMap((row) => (row.outlet.region ? [[row.outlet.region, row]] : [])) : []);
    const color = { favorable: palette.favorable, neutral: palette.steady, caution: palette.caution, adverse: palette.adverse };
    return {
        id: "press-reach",
        name: "Regional press",
        level: "state",
        scale: "categorical",
        encoding: "color",
        legend: [
            { label: "Friendly", color: palette.favorable },
            { label: "Even-handed", color: palette.steady },
            { label: "Skeptical", color: palette.caution },
            { label: "Hostile", color: palette.adverse },
        ],
        read: (region) => {
            if (region.layer !== "states")
                return null;
            if (!campaign)
                return noData(palette, "No game in progress");
            const home = stateById.get(region.id)?.region;
            const row = home ? byRegion.get(home) : undefined;
            if (!row)
                return noData(palette, "No regional desk");
            return solid(`${row.outlet.name}: ${STANCE_WORD[row.stance]}`, row.disposition, color[STANCE_TONE[row.stance]]);
        },
    };
}
