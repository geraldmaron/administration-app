import type { Campaign } from "@admin/engine";
import { congressSystem } from "@admin/player-core";
import { noData, solid, type MapLens } from "./contract";
import type { MapPalette } from "./palette";

// How each state's delegation regards the administration, in the stance
// colors the Hill screens use for the same reading elsewhere.

const RANK = { favorable: 3, neutral: 2, caution: 1, adverse: 0 } as const;

export function delegationWarmthLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  const delegations = new Map(campaign ? congressSystem(campaign).delegations.map((entry) => [entry.state as string, entry] as const) : []);
  const colors = { favorable: palette.favorable, neutral: palette.steady, caution: palette.caution, adverse: palette.adverse } as const;
  return {
    id: "delegation-warmth",
    name: "Delegations toward you",
    level: "state",
    scale: "categorical",
    encoding: "color",
    legend: [
      { label: "Warm", color: palette.favorable },
      { label: "Open", color: palette.steady },
      { label: "Cool", color: palette.caution },
      { label: "Hostile", color: palette.adverse },
    ],
    read: (region) => {
      if (region.layer !== "states") return null;
      if (!campaign) return noData(palette, "No administration in office");
      const delegation = delegations.get(region.id);
      const stance = delegation && delegation.standing.stance in RANK ? (delegation.standing.stance as keyof typeof RANK) : undefined;
      if (!delegation || !stance) return noData(palette);
      return solid(`${delegation.standing.word} toward you (${delegation.standing.percent})`, delegation.standing.value, colors[stance]);
    },
  };
}
