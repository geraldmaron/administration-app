import type { LayerName, Region, RegionTable } from "../data";
import type { MapLens } from "../lenses/contract";
import type { LensFill } from "../paint";

/** One region's paint under a lens: its table index (the feature id) and a color, or null for plain land. */
export interface RegionPaint {
  readonly id: number;
  readonly fill: string | null;
}

/**
 * The color a fill draws as a flat GL polygon. A proportional mix (a split
 * delegation) draws its largest share until the hatch pattern lands; the
 * magnitude radius a dot lens carried has no meaning on a filled shape and is
 * dropped.
 */
export function flatColor(fill: LensFill): string | null {
  if (fill.kind === "solid") return fill.color;
  if (fill.kind === "none") return null;
  let best = -1;
  let color: string | null = null;
  fill.colors.forEach((candidate, i) => {
    const weight = fill.weights[i] ?? 0;
    if (weight > best) {
      best = weight;
      color = candidate;
    }
  });
  return color;
}

/** Every region of one layer, painted by the lens at its own level. */
export function paintLayer(table: RegionTable, layer: LayerName, lens: MapLens): readonly RegionPaint[] {
  return table.regions
    .filter((region: Region) => region.layer === layer)
    .map((region) => {
      const reading = lens.read(region, lens.level);
      return { id: region.index, fill: reading ? flatColor(reading.fill) : null };
    });
}

/** The layer a lens's own level is painted on; a nation lens hides the states' fill so the United States reads as one government. */
export function lensPaintsStates(lens: MapLens): boolean {
  return lens.level !== "nation";
}
