import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Campaign } from "@admin/engine";

/**
 * What the map's lenses and marks read. Null before an administration is in
 * office: the title screen, founding and the slots draw the map with the
 * dataset's own figures and no campaign lenses.
 */
export interface MapData {
  readonly campaign: Campaign | null;
  /**
   * The campaign as it stood before the last act or advance of this sitting,
   * which the delta lens recolors from. Null when nothing has changed yet.
   */
  readonly baseline: Campaign | null;
}

const MapDataContext = createContext<MapData>({ campaign: null, baseline: null });

/** The shell passes the store's current campaign; the map re-reads its lenses when it changes. */
export function MapDataProvider({ campaign, baseline = null, children }: { readonly campaign: Campaign | null; readonly baseline?: Campaign | null; readonly children: ReactNode }) {
  const value = useMemo(() => ({ campaign, baseline }), [campaign, baseline]);
  return <MapDataContext.Provider value={value}>{children}</MapDataContext.Provider>;
}

export function useMapData(): MapData {
  return useContext(MapDataContext);
}
