import { selectOutlets, type Campaign, type OutletStanding } from "@admin/engine";
import { STANCE_TONE, STANCE_WORD } from "@admin/player-core";
import { stateById } from "@admin/world";
import { noData, solid, type MapLens } from "./contract";
import type { MapPalette } from "./palette";

// The press office's reach on the map: every state colored by where the
// regional paper its readers take stands with the administration. The
// national desks reach everywhere and are read in the panel; the map shows
// the one part of the corps that has a geography.

export function pressReachLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  const byRegion = new Map<string, OutletStanding>(
    campaign ? selectOutlets(campaign).flatMap((row) => (row.outlet.region ? [[row.outlet.region, row] as const] : [])) : [],
  );
  const color = { favorable: palette.favorable, neutral: palette.steady, caution: palette.caution, adverse: palette.adverse } as const;
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
      if (region.layer !== "states") return null;
      if (!campaign) return noData(palette, "No administration in office");
      const home = stateById.get(region.id)?.region;
      const row = home ? byRegion.get(home) : undefined;
      if (!row) return noData(palette, "No regional desk");
      return solid(`${row.outlet.name}: ${STANCE_WORD[row.stance]}`, row.disposition, color[STANCE_TONE[row.stance]]);
    },
  };
}
