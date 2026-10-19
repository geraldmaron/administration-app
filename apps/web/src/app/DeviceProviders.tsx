import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import type { CampaignStore } from "@admin/player-core";
import { useLazyModule } from "../map/lazy-module";
import { MAP_FIRST_PAINT_MARK } from "../map/view";
import { CampaignContext, EntitlementContext, PreferencesContext } from "./contexts";
import { createDeviceStorage } from "./device-storage";
import { useEntitlementHandle, usePreferencesHandle } from "./device-settings";

const loadStores = () => import("./DeviceStores");

/** How long the campaign store waits for the map's first frame before loading anyway, ms. */
const FIRST_PAINT_CAP_MS = 1500;

function mapHasPainted(): boolean {
  return typeof performance !== "undefined" && performance.getEntriesByName(MAP_FIRST_PAINT_MARK).length > 0;
}

/**
 * True once the map has drawn its first dotted frame, or once the cap has
 * passed: a map that failed to load must not hold the game back.
 */
function useAfterMapPaint(waitForMap: boolean): boolean {
  const [painted, setPainted] = useState(mapHasPainted);
  useEffect(() => {
    if (!waitForMap || painted) return;
    const done = () => setPainted(true);
    const timer = window.setTimeout(done, FIRST_PAINT_CAP_MS);
    const observer = typeof PerformanceObserver === "undefined" ? null : new PerformanceObserver((list) => list.getEntriesByName(MAP_FIRST_PAINT_MARK).length > 0 && done());
    observer?.observe({ type: "mark" });
    if (mapHasPainted()) done();
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [painted, waitForMap]);
  return !waitForMap || painted;
}

/**
 * One vault, one set of preferences, one entitlement answer and one campaign
 * store for the whole app. The settings and the entitlement load with the
 * frame. The campaign store (the engine, the dataset and the corpus come with
 * it) yields to the title map's first frame. Deep links load it immediately,
 * because their workspace has no title map to paint.
 */
export function DeviceProviders({ children }: { readonly children: ReactNode }) {
  const onTitle = useLocation({ select: (location) => location.pathname === "/" });
  const [storage] = useState(createDeviceStorage);
  const preferences = usePreferencesHandle(storage);
  const entitlement = useEntitlementHandle(storage);
  const DeviceStores = useLazyModule(loadStores, useAfterMapPaint(onTitle))?.default;
  const [store, setStore] = useState<CampaignStore | null>(null);
  return (
    <>
      {DeviceStores ? <DeviceStores storage={storage} preferences={preferences.preferences} onReady={setStore} /> : null}
      <PreferencesContext.Provider value={preferences}>
        <EntitlementContext.Provider value={entitlement}>
          <CampaignContext.Provider value={store}>{children}</CampaignContext.Provider>
        </EntitlementContext.Provider>
      </PreferencesContext.Provider>
    </>
  );
}
