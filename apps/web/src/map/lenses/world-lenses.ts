import type { Campaign } from "@admin/engine";
import { READING_LEGENDS, readingCell, worldGovernments, type ReadingTone, type WorldReadingId } from "@admin/player-core";
import { noData, solid, type MapLens } from "./contract";
import type { MapPalette } from "./palette";

// The World readings that have no lens of their own. Each shape takes the tone
// and word the governments table prints for the same government, so the map and
// the table are one reading. Standing, forces and trade reuse their existing lenses.

const NAMES = { trend: "Direction of travel", alignment: "Alignment with the US" } as const;

function toneColor(tone: ReadingTone, palette: MapPalette): string {
  switch (tone) {
    case "favorable": return palette.favorable;
    case "lean-favorable": return palette.div[2] ?? palette.favorable;
    case "neutral": return palette.steady;
    case "caution": return palette.caution;
    case "adverse": return palette.adverse;
    case "unread": return palette.unread;
    default: return palette.nodata;
  }
}

export function worldReadingLens(reading: Extract<WorldReadingId, "trend" | "alignment">, campaign: Campaign | null, palette: MapPalette): MapLens {
  const rows = campaign ? new Map(worldGovernments(campaign).map((government) => [government.nation as string, government])) : new Map();
  const legend = READING_LEGENDS[reading];
  return {
    id: `world-${reading}`,
    name: NAMES[reading],
    level: "nation",
    scale: "categorical",
    encoding: "color",
    legend: legend.map((step) => ({ label: step.word, color: toneColor(step.tone, palette) })),
    read: (region) => {
      if (region.layer !== "world") return null;
      if (!campaign) return noData(palette, "No administration in office");
      if (region.id === campaign.founding.nation) return { ...solid("The United States", legend.length + 1, palette.own), salience: 0 };
      const government = rows.get(region.id);
      if (!government) return null;
      const cell = readingCell(government, reading);
      const drawn = solid(cell.word, legend.length - legend.findIndex((step) => step.tone === cell.tone), toneColor(cell.tone, palette));
      // An unread government sorts to an end of the ranking without being an extreme, so it wins no room for its name.
      return cell.tone === "unread" ? { ...drawn, salience: 0 } : drawn;
    },
  };
}
