import type { Campaign } from "@admin/engine";
import { formatRatio, stateConditions } from "@admin/player-core";
import { noData, solid, withFigure, type MapLens } from "../../map/lenses/contract";
import type { StateId } from "@admin/world";
import type { MapPalette } from "../../map/lenses/palette";

// The emergency screen's lens: each state by the worst condition running
// there, and whether a declaration reaches it. Red is the game's urgent risk,
// so it is kept for the worst; a state under a declaration reads in the
// institutional gold, which says the presidency has acted here.

const SEVERE = 0.6;

export function conditionsLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  const states = campaign ? stateConditions(campaign) : null;
  return {
    id: "conditions",
    name: "Conditions by state",
    level: "state",
    scale: "categorical",
    encoding: "color",
    legend: [
      { label: "Quiet", color: palette.neutral },
      { label: "Running", color: palette.caution },
      { label: "Severe", color: palette.adverse },
      { label: "Declared", color: palette.own },
    ],
    read: (region) => {
      if (region.layer !== "states") return null;
      if (!states) return noData(palette, "No administration in office");
      const reading = states.get(region.id as StateId);
      if (!reading) return noData(palette);
      // Quiet is the ground the trouble stands out from, so it takes the neutral land, not the first step of a ramp that reads as a reading.
      if (reading.labels.length === 0) return solid("Nothing running", 0, palette.neutral);
      const text = `${reading.labels.join(", ")}: severity ${formatRatio(reading.severity)}${reading.declared ? ", emergency declared" : ""}`;
      const color = reading.declared ? palette.own : reading.severity >= SEVERE ? palette.adverse : palette.caution;
      return withFigure(solid(text, reading.severity, color), formatRatio(reading.severity));
    },
  };
}
