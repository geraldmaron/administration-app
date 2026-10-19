import type { Campaign } from "@admin/engine";
import type { MapCamera, MapViewProps } from "@admin/ui/map";
import { MAP_RELIEF } from "./relief";
import { useRegions } from "./regions";
import { useLens } from "./use-lens";

export type MapPropsOptions = {
  /** The frame; a nation lens defaults to the world, the rest to the United States. */
  readonly camera?: MapCamera;
  /** The campaign before the last change, for the delta lens. */
  readonly baseline?: Campaign | null;
};

/** Everything MapView draws for a lens but its title and what a choice does: geometry, rows, paint, key, frame and relief. */
export type LensMapProps = Pick<MapViewProps, "regions" | "rows" | "paint" | "legend" | "camera" | "rowNoun" | "relief"> & { readonly error?: string };

/** One call for a screen's map: the lens read over the campaign and the geometry it draws on. */
export function useMapProps(campaign: Campaign | null, lensId: string, options: MapPropsOptions = {}): LensMapProps {
  const lens = useLens(campaign, lensId, options.baseline ?? null);
  const level = lens.status === "ready" ? lens.lens.level : "nation";
  const camera = options.camera ?? (level === "nation" ? "world" : "us");
  const regions = useRegions(level, camera);
  const ready = lens.status === "ready" ? lens.lens : null;
  const error = lens.status === "failed" ? lens.error : regions.status === "failed" ? regions.error : undefined;
  return {
    regions: regions.status === "ready" && ready ? regions.regions : null,
    rows: ready?.rows ?? [],
    paint: ready?.paint ?? [],
    legend: ready?.legend ?? { title: "Map key", entries: [] },
    camera,
    rowNoun: ready?.rowNoun ?? "region",
    relief: MAP_RELIEF,
    ...(error ? { error } : {}),
  };
}
