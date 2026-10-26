import { useContext, useSyncExternalStore } from "react";
import type { CampaignLibrarySaveState, CampaignState, CampaignStore, DraftState, DraftStore } from "@admin/player-core";
import { CampaignContext, DraftsContext, EntitlementContext, PreferencesContext, type EntitlementHandle, type PreferencesHandle } from "./contexts";

const LOADING: CampaignState = { status: "loading" };
const getLoading = (): CampaignState => LOADING;
const subscribeToNothing = (): (() => void) => () => undefined;

/** The campaign store, or null until the device's stores have loaded; screens wait for them, the frame, the map and the title do not. */
export function useStoresIfReady(): CampaignStore | null {
  return useContext(CampaignContext);
}

export function useCampaignStore(): CampaignStore {
  const store = useContext(CampaignContext);
  if (!store) throw new Error("The campaign store is read before the device's stores have loaded.");
  return store;
}

/** The campaign's state; "loading" until the stores have loaded. */
export function useCampaignState(): CampaignState {
  const store = useContext(CampaignContext);
  return useSyncExternalStore(store?.subscribe ?? subscribeToNothing, store?.getState ?? getLoading, store?.getState ?? getLoading);
}

/** Whether the device kept the last write, read from the save store itself. */
export function useSaveState(): CampaignLibrarySaveState {
  const { saves } = useCampaignStore();
  return useSyncExternalStore(saves.subscribe, saves.getSaveState, saves.getSaveState);
}

export function usePreferences(): PreferencesHandle {
  const handle = useContext(PreferencesContext);
  if (!handle) throw new Error("Preferences are read outside DeviceProviders.");
  return handle;
}

export function useEntitlement(): EntitlementHandle {
  const handle = useContext(EntitlementContext);
  if (!handle) throw new Error("The entitlement is read outside DeviceProviders.");
  return handle;
}

export function useDraftStore(): DraftStore {
  const drafts = useContext(DraftsContext);
  if (!drafts) throw new Error("The drafts are read before the device's stores have loaded.");
  return drafts;
}

const NO_DRAFTS: DraftState = { drafts: [] };
const getNoDrafts = (): DraftState => NO_DRAFTS;

/** The President's drafts; none until the stores have loaded. */
export function useDraftState(): DraftState {
  const drafts = useContext(DraftsContext);
  return useSyncExternalStore(drafts?.subscribe ?? subscribeToNothing, drafts?.getState ?? getNoDrafts, drafts?.getState ?? getNoDrafts);
}
