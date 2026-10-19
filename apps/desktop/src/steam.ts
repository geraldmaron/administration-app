import { createRequire } from "node:module";
import type { PlatformCapabilities, SteamUser } from "@admin/player-core";

export type SteamAdapter = {
  readonly capabilities: PlatformCapabilities;
  readonly user: SteamUser | null;
  readonly setRichPresence: (key: string, value: string) => void;
  readonly clearRichPresence: () => void;
  readonly unlockAchievement: (id: string) => boolean;
};

const UNAVAILABLE: SteamAdapter = {
  capabilities: {
    kind: "desktop",
    localFiles: true,
    steamAvailable: false,
    overlayAvailable: false,
    offlinePlayable: true,
  },
  user: null,
  setRichPresence() {},
  clearRichPresence() {},
  unlockAchievement() {
    return false;
  },
};

type SteamworksModule = {
  init?: (appId?: number) => {
    localplayer?: { getSteamId?: () => { steamId64?: string }; getName?: () => string };
  };
};

export function createSteamAdapter(): SteamAdapter {
  try {
    const require = createRequire(import.meta.url);
    const loaded = require("steamworks.js") as SteamworksModule;
    const client = loaded.init?.();
    if (!client) return UNAVAILABLE;
    const id = client.localplayer?.getSteamId?.()?.steamId64;
    const name = client.localplayer?.getName?.();
    return {
      capabilities: {
        kind: "desktop",
        localFiles: true,
        steamAvailable: true,
        overlayAvailable: true,
        offlinePlayable: true,
      },
      user: id && name ? { id: String(id), name } : null,
      setRichPresence() {},
      clearRichPresence() {},
      unlockAchievement() {
        return false;
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}
