import { formatRatio } from "../../format/figures.js";
import { stateConditions } from "../../emergency/emergency-board.js";
import { noData, solid, withFigure } from "../contract.js";
// The emergency screen's lens: each state by the worst condition running
// there, and whether a declaration reaches it. Red is the game's urgent risk,
// so it is kept for the worst; a state under a declaration reads in the
// institutional gold, which says the presidency has acted here.
// The screen beside the map calls 40% serious and 70% and over severe, and
// draws them in blue, amber and red, so the map turns at the same lines in the
// same inks.
const SERIOUS = 0.4;
const SEVERE = 0.7;
export function conditionsLens(campaign, palette) {
    const states = campaign ? stateConditions(campaign) : null;
    return {
        id: "conditions",
        name: "Conditions by state",
        level: "state",
        scale: "categorical",
        encoding: "color",
        legend: [
            { label: "Quiet: nothing running", color: palette.neutral },
            { label: "Minor: under 40% severity", color: palette.minor },
            { label: "Serious: 40% to 69%", color: palette.serious },
            { label: "Severe: 70% or more", color: palette.adverse },
            { label: "Declared", color: palette.own },
        ],
        read: (region) => {
            if (region.layer !== "states")
                return null;
            if (!states)
                return noData(palette, "No game in progress");
            const reading = states.get(region.id);
            if (!reading)
                return noData(palette);
            // Quiet is the ground the trouble stands out from, so it takes the neutral land, not the first step of a ramp that reads as a reading.
            if (reading.labels.length === 0)
                return solid("Nothing running", 0, palette.neutral);
            const text = `${reading.labels.join(", ")}: severity ${formatRatio(reading.severity)}${reading.declared ? ", emergency declared" : ""}`;
            const color = reading.declared ? palette.own : reading.severity >= SEVERE ? palette.adverse : reading.severity >= SERIOUS ? palette.serious : palette.minor;
            return withFigure(solid(text, reading.severity, color), formatRatio(reading.severity));
        },
    };
}
