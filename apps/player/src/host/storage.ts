import Storage from "expo-sqlite/kv-store";
import type { StoragePort } from "@admin/player-core";

/**
 * The phone's vault: SQLite through Expo's key-value store, which has no
 * small fixed ceiling the way AsyncStorage does, so a long campaign's save
 * fits. A failed write throws through to the save store, which reports it;
 * nothing here pretends a write landed.
 */
export function createDeviceStorage(): StoragePort {
  return {
    getItem: (key) => Storage.getItem(key),
    setItem: (key, value) => Storage.setItem(key, value),
    async removeItem(key) {
      await Storage.removeItem(key);
    },
  };
}
