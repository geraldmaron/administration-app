import type { Campaign } from "@admin/engine";
import { neutralLens, type MapLens } from "./contract";
import { delegationWarmthLens } from "./congress-lens";
import { circuitsLens } from "./court-lenses";
import { deltaLens, weekLens } from "./delta-lens";
import { homesLens } from "./home-lens";
import { dependenceLens, jobsLens, outputLens, pricesLens } from "./economy-lenses";
import { houseHexLens, houseLens, senateLens, whipLens } from "./house";
import { forcesLens, populationLens, relationsLens } from "./nation-lenses";
import type { MapPalette } from "./palette";
import { pressReachLens } from "./press-lens";
import { setLens } from "./set-lenses";
import { approvalLens, callLens, leanLens, statePopulationLens } from "./state-lenses";
import { tradeShareLens } from "./trade-share-lens";
import { worldReadingLens } from "./world-lenses";
import { conditionsLens } from "../../nation/emergency/conditions-lens";
import { shareDomainOf, shareLens } from "../../nation/policy/share-lens";

/** Every lens id a directive may name. Anything else is the neutral lens. */
export const LENS_IDS = ["neutral", "approval", "delta", "lean", "call", "relations", "forces", "house", "house-hex", "senate", "press-reach", "population", "jobs", "prices", "output", "federal-dependence", "conditions", "state-population", "trade-share", "world-trend", "world-alignment"] as const;

export type LensId = (typeof LENS_IDS)[number];

export function isLensId(id: string | undefined): id is LensId {
  return id !== undefined && (LENS_IDS as readonly string[]).includes(id);
}

/**
 * The lens a directive names, built over the campaign (or none, on the title
 * screen). The delta lens also reads the campaign before the sitting's last
 * change. A bill's whip count is the one lens whose id names its subject
 * (`whip:<chamber>:<bill id>`), because the bill is what it counts; a set's lens does the same (`sides:`, `body:`, `parties:`). An unknown
 * id is neutral, never an error.
 */
export function resolveLens(id: string | undefined, campaign: Campaign | null, palette: MapPalette, baseline: Campaign | null = null): MapLens {
  // A policy domain's share lens is one lens per domain, named `share-<domain>`.
  const shareDomain = id ? shareDomainOf(id) : undefined;
  if (shareDomain) return shareLens(shareDomain, palette);
  const whip = id === undefined ? undefined : whipLens(id, campaign, palette);
  if (whip) return whip;
  const set = id === undefined ? undefined : setLens(id, campaign, palette);
  if (set) return set;
  const homes = id === undefined ? undefined : homesLens(id, palette);
  if (homes) return homes;
  const week = id === undefined ? undefined : weekLens(id, campaign, palette);
  if (week) return week;
  // Lenses a page chooses for its own map; they are not layers of the screen-wide chooser, so they stay out of LENS_IDS.
  if (id === "circuits") return circuitsLens(campaign, palette);
  if (id === "delegation-warmth") return delegationWarmthLens(campaign, palette);
  if (!isLensId(id)) return neutralLens();
  switch (id) {
    case "neutral":
      return neutralLens();
    case "approval":
      return approvalLens(campaign, palette);
    case "delta":
      return deltaLens(baseline, campaign, palette);
    case "lean":
      return leanLens(campaign, palette);
    case "call":
      return callLens(campaign, palette);
    case "relations":
      return relationsLens(campaign, palette);
    case "forces":
      return forcesLens(campaign, palette);
    case "house":
      return houseLens(campaign, palette);
    case "house-hex":
      return houseHexLens(campaign, palette);
    case "senate":
      return senateLens(campaign, palette);
    case "press-reach":
      return pressReachLens(campaign, palette);
    case "population":
      return populationLens(palette);
    case "jobs":
      return jobsLens(campaign, palette);
    case "prices":
      return pricesLens(campaign, palette);
    case "output":
      return outputLens(campaign, palette);
    case "federal-dependence":
      return dependenceLens(campaign, palette);
    case "conditions":
      return conditionsLens(campaign, palette);
    case "state-population":
      return statePopulationLens(campaign, palette);
    case "trade-share":
      return tradeShareLens(campaign, palette);
    case "world-trend":
      return worldReadingLens("trend", campaign, palette);
    case "world-alignment":
      return worldReadingLens("alignment", campaign, palette);
  }
}
