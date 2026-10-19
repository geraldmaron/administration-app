import type { Campaign } from "@admin/engine";
import { goodsTradeShare } from "../../world/standing.js";
import type { NationId } from "@admin/world";
import { noData, solid, withFigure, type MapLens } from "../contract.js";
import { magnitudeScale } from "./nation-lenses.js";
import { rampStep, type MapPalette } from "../palette.js";

function shareText(share: number): string {
  return share < 0.001 ? "Under 0.1% of US trade" : `${(share * 100).toFixed(1)}% of US trade`;
}

/** Each government's share of US goods trade: color on a square-root ramp, so the largest partners do not flatten everyone else, and radius by area. */
export function tradeShareLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  const byNation = new Map(campaign ? (Object.keys(campaign.nations) as NationId[]).map((id) => [id as string, goodsTradeShare(campaign, id) ?? 0] as const) : []);
  const max = Math.max(0.0001, ...byNation.values());
  return {
    id: "trade-share",
    name: "Share of US trade",
    level: "nation",
    scale: "sequential",
    encoding: "color-radius",
    legend: [
      { label: "Small", color: palette.seq[1] ?? palette.neutral },
      { label: "Large", color: palette.seq[6] ?? palette.neutral },
    ],
    read: (region) => {
      if (region.layer !== "world") return null;
      if (!campaign) return noData(palette, "No game in progress");
      if (region.id === campaign.founding.nation) return solid("The United States", Number.POSITIVE_INFINITY, palette.own);
      const share = byNation.get(region.id);
      if (share === undefined) return null;
      return withFigure(solid(shareText(share), share, rampStep(palette.seq, 0.1 + Math.sqrt(share / max) * 0.9), magnitudeScale(Math.sqrt(share), Math.sqrt(max))), share < 0.001 ? "<0.1%" : `${(share * 100).toFixed(1)}%`);
    },
  };
}
