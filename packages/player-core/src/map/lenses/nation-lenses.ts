import type { Campaign } from "@admin/engine";
import { boardStance, standingToward } from "../../world/standing.js";
import { forcesByHost } from "../../world/us-presence.js";
import { trustWord } from "../../format/figures.js";
import { worldNations, type NationId } from "@admin/world";
import { noData, solid, type MapLens } from "../contract.js";
import { rampStep, type MapPalette } from "../palette.js";

// The nation-level lenses: standing toward the United States, where US forces
// stand, and population as the plain magnitude lens.

const NO_ADMINISTRATION = "No game in progress";
const OWN = "The United States";

/** The radius multiplier a magnitude lens gives a share of its maximum: 0.6× to 1.6×, area tracking value. */
export function magnitudeScale(value: number, max: number): number {
  const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return 0.6 + Math.sqrt(share);
}

export function relationsLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  const colors = { favorable: palette.favorable, neutral: palette.steady, caution: palette.caution, adverse: palette.adverse, unread: palette.unread } as const;
  const rank = { favorable: 4, neutral: 3, caution: 2, adverse: 1, unread: 0 } as const;
  return {
    id: "relations",
    name: "Standing toward the US",
    level: "nation",
    scale: "categorical",
    encoding: "color",
    legend: [
      { label: trustWord("favorable"), color: palette.favorable },
      { label: trustWord("neutral"), color: palette.steady },
      { label: trustWord("caution"), color: palette.caution },
      { label: trustWord("adverse"), color: palette.adverse },
      { label: "Unread", color: palette.unread },
    ],
    read: (region) => {
      if (region.layer !== "world") return null;
      if (!campaign) return noData(palette, NO_ADMINISTRATION);
      if (region.id === campaign.founding.nation) return { ...solid(OWN, 5, palette.own), salience: 0 };
      const stance = boardStance(standingToward(campaign, region.id as NationId));
      if (!stance) return null;
      // Unread sorts last without being an extreme: the services simply have no read, so it wins no room on the map.
      if (stance === "unread") return { ...solid("Their view is unknown", rank.unread, colors.unread), salience: 0 };
      return solid(trustWord(stance), rank[stance], colors[stance]);
    },
  };
}

/** Personnel is a sizing weight, never a figure a player reads, so the list says it in words. */
function presenceWord(share: number): string {
  if (share >= 0.25) return "A large US presence";
  if (share >= 0.05) return "A sizable US presence";
  return "A small US presence";
}

export function forcesLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  const totals = campaign ? forcesByHost(campaign) : new Map<string, number>();
  const max = Math.max(0, ...totals.values());
  return {
    id: "forces",
    name: "US forces abroad",
    level: "nation",
    scale: "sequential",
    encoding: "color-radius",
    legend: [
      { label: "Small", color: palette.seq[1] ?? palette.neutral },
      { label: "Large", color: palette.seq[6] ?? palette.neutral },
    ],
    read: (region) => {
      if (region.layer !== "world") return null;
      if (!campaign) return noData(palette, NO_ADMINISTRATION);
      if (region.id === campaign.founding.nation) return solid(OWN, Number.POSITIVE_INFINITY, palette.own);
      const personnel = totals.get(region.id) ?? 0;
      if (personnel <= 0) return null;
      const share = Math.sqrt(personnel / max);
      return solid(presenceWord(personnel / max), personnel, rampStep(palette.seq, 0.15 + share * 0.85), magnitudeScale(personnel, max));
    },
  };
}

const POPULATION = new Map(worldNations.map((nation) => [nation.id as string, nation.stats.demography.population]));

function populationText(people: number): string {
  if (people >= 1e9) return `${(people / 1e9).toFixed(2)} billion people`;
  if (people >= 1e6) return `${(people / 1e6).toFixed(1)} million people`;
  return `${Math.round(people / 1000)} thousand people`;
}

/** The plain magnitude lens: color on a log scale, radius by area. It reads the dataset, so it needs no campaign. */
export function populationLens(palette: MapPalette): MapLens {
  const max = Math.max(...POPULATION.values());
  return {
    id: "population",
    name: "Population",
    level: "nation",
    scale: "sequential",
    encoding: "color-radius",
    legend: [
      { label: "Fewer", color: palette.seq[0] ?? palette.neutral },
      { label: "More", color: palette.seq[6] ?? palette.neutral },
    ],
    read: (region) => {
      if (region.layer !== "world") return null;
      const people = POPULATION.get(region.id);
      if (people === undefined) return null;
      if (people <= 0) return noData(palette);
      return solid(populationText(people), people, rampStep(palette.seq, (Math.log10(people) - 4.5) / 4.7), magnitudeScale(people, max));
    },
  };
}
