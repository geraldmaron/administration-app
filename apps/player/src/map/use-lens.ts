import { useEffect, useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { lensView, mapPalette, resolveLens, type LensLevel, type MapPalette, type RegionRef } from "@admin/player-core";
import type { MapLegend, MapPaint, MapRow } from "@admin/ui/map";
import { usePreferences } from "../device/hooks";
import { loadRegionIndex } from "./regions";

/** A lens as MapView takes it: the level it draws at, the ranked rows, the colors of the regions they leave out, and the key. */
interface LensMap {
  readonly id: string;
  readonly level: LensLevel;
  readonly rows: readonly MapRow[];
  readonly paint: readonly MapPaint[];
  readonly legend: MapLegend;
  readonly rowNoun: string;
}

const ROW_NOUN: Readonly<Record<LensLevel, string>> = { nation: "government", state: "state", district: "district" };

/** The palette the player's display settings choose: color vision and high contrast. */
export function useMapPalette(): MapPalette {
  const { preferences } = usePreferences();
  const colorVision = preferences.colorVision ?? "standard";
  const highContrast = preferences.highContrast === true;
  return useMemo(() => mapPalette({ colorVision, highContrast }), [colorVision, highContrast]);
}

type IndexState = { readonly status: "loading" } | { readonly status: "ready"; readonly regions: readonly RegionRef[] } | { readonly status: "failed"; readonly error: string };

/** Every region a lens can rank, loaded once. */
function useRegionIndex(): IndexState {
  const [state, setState] = useState<IndexState>({ status: "loading" });
  useEffect(() => {
    let live = true;
    loadRegionIndex()
      .then((regions) => {
        if (live) setState({ status: "ready", regions });
      })
      .catch((error: unknown) => {
        if (live) setState({ status: "failed", error: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      live = false;
    };
  }, []);
  return state;
}

/** Build a lens view over a region list; pure, so a test can read it without the device. */
function lensMap(lensId: string, campaign: Campaign | null, regions: readonly RegionRef[], palette: MapPalette, baseline: Campaign | null = null): LensMap {
  const lens = resolveLens(lensId, campaign, palette, baseline);
  const view = lensView(lens, regions, lens.level, palette);
  return { id: view.id, level: view.level, rows: view.rows, paint: view.paint, legend: { title: view.name, entries: view.legend }, rowNoun: ROW_NOUN[view.level] };
}

export type LensState = { readonly status: "loading" } | { readonly status: "ready"; readonly lens: LensMap } | { readonly status: "failed"; readonly error: string };

/** The lens a screen names, read over its campaign, as MapView's rows, paint and key. */
export function useLens(campaign: Campaign | null, lensId: string, baseline: Campaign | null = null): LensState {
  const palette = useMapPalette();
  const index = useRegionIndex();
  return useMemo((): LensState => (index.status === "ready" ? { status: "ready", lens: lensMap(lensId, campaign, index.regions, palette, baseline) } : index), [index, lensId, campaign, palette, baseline]);
}
