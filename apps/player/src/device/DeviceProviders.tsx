import { useCallback, useState, type ReactNode } from "react";
import type { CampaignStore, DraftStore } from "@admin/player-core";
import { createDeviceStorage } from "../host/storage";
import { CampaignContext, DraftsContext, EntitlementContext, PreferencesContext } from "./contexts";
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
  const [stores, setStores] = useState<{ readonly campaigns: CampaignStore; readonly drafts: DraftStore } | null>(null);
  const onReady = useCallback((campaigns: CampaignStore, drafts: DraftStore) => setStores({ campaigns, drafts }), []);
  return (
    <>
      <DeviceStores storage={storage} preferences={preferences.preferences} onReady={onReady} />
      <PreferencesContext.Provider value={preferences}>
        <EntitlementContext.Provider value={entitlement}>
          <CampaignContext.Provider value={stores?.campaigns ?? null}>
            <DraftsContext.Provider value={stores?.drafts ?? null}>{children}</DraftsContext.Provider>
          </CampaignContext.Provider>
        </EntitlementContext.Provider>
      </PreferencesContext.Provider>
    </>
  );
}
