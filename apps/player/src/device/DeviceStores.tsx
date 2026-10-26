import { useEffect, useRef, useState } from "react";
import type { Campaign, MatterSource } from "@admin/engine";
import { createCampaignStore, createDraftStore, createSaveStore, deskMatterSource, scenarioMatterSource, type AttentionPolicySettings, type CampaignStore, type DraftStore, type Preferences, type StoragePort } from "@admin/player-core";

/** Stores whose restore has started, so StrictMode's double effect reads the vault once. */
const RESTORING = new WeakSet<CampaignStore>();

/**
 * The desk's own source reads the player's attention settings live, through a
 * ref, because the store is built once and a later change in settings must
 * still reach it.
 */
function useMatterSources(preferences: Preferences): readonly MatterSource<Campaign>[] {
  const settings = useRef<AttentionPolicySettings | undefined>(preferences.attentionByKind);
  settings.current = preferences.attentionByKind;
  const [sources] = useState<readonly MatterSource<Campaign>[]>(() => [
    (campaign, date) => deskMatterSource(campaign, date, settings.current),
    scenarioMatterSource,
  ]);
  return sources;
}

export type DeviceStoresProps = {
  readonly storage: StoragePort;
  readonly preferences: Preferences;
  readonly onReady: (store: CampaignStore, drafts: DraftStore) => void;
};

/**
 * One campaign store over the device's vault, restored once. It draws
 * nothing: it is loaded after the map's first paint, because the store brings
 * the engine, the dataset and the corpus with it, and it hands the store up
 * to DeviceProviders with the drafts kept over it.
 */
export default function DeviceStores({ storage, preferences, onReady }: DeviceStoresProps) {
  const matterSources = useMatterSources(preferences);
  const [store] = useState(() => createCampaignStore({ saves: createSaveStore(storage), matterSources }));
  const [drafts] = useState(() => createDraftStore({ campaigns: store }));
  useEffect(() => {
    if (RESTORING.has(store)) return;
    RESTORING.add(store);
    void store.restore();
  }, [store]);
  useEffect(() => onReady(store, drafts), [onReady, store, drafts]);
  return null;
}
