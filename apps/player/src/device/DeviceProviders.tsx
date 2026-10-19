import { useState, type ReactNode } from "react";
import type { CampaignStore } from "@admin/player-core";
import { createDeviceStorage } from "../host/storage";
import { CampaignContext, EntitlementContext, PreferencesContext } from "./contexts";
import { useEntitlementHandle, usePreferencesHandle } from "./device-settings";
import DeviceStores from "./DeviceStores";

/**
 * One vault, one set of preferences, one entitlement answer and one campaign
 * store for the whole app. The store is restored once from the device's
 * vault; screens that need it wait for it, the frame and the title do not.
 */
export function DeviceProviders({ children }: { readonly children: ReactNode }) {
  const [storage] = useState(createDeviceStorage);
  const preferences = usePreferencesHandle(storage);
  const entitlement = useEntitlementHandle(storage);
  const [store, setStore] = useState<CampaignStore | null>(null);
  return (
    <>
      <DeviceStores storage={storage} preferences={preferences.preferences} onReady={setStore} />
      <PreferencesContext.Provider value={preferences}>
        <EntitlementContext.Provider value={entitlement}>
          <CampaignContext.Provider value={store}>{children}</CampaignContext.Provider>
        </EntitlementContext.Provider>
      </PreferencesContext.Provider>
    </>
  );
}
