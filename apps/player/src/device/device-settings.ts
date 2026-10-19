import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PREFERENCES,
  NO_ENTITLEMENTS,
  createEntitlementStore,
  createPreferencesStore,
  type EntitlementSnapshot,
  type Preferences,
  type StoragePort,
} from "@admin/player-core";
import type { EntitlementHandle, PreferencesHandle } from "./contexts";

// The device's display settings and entitlement answer. Both are small and
// read nothing of the engine, so they load with the frame: the title draws
// with the player's own camera, density, contrast and palette from the start.

export function usePreferencesHandle(storage: StoragePort): PreferencesHandle {
  const [store] = useState(() => createPreferencesStore(storage));
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const current = useRef<Preferences>(DEFAULT_PREFERENCES);
  // Settings changed before the stored ones arrive are newer than they are, and are laid over them.
  const early = useRef<Partial<Preferences> | null>(null);
  const loaded = useRef(false);
  const keep = useCallback(
    (next: Preferences) => {
      current.current = next;
      setPreferences(next);
      store.write(next).catch((cause: unknown) => console.warn("A display setting holds for this session only; the device refused to keep it.", cause));
    },
    [store],
  );
  useEffect(() => {
    let canceled = false;
    store.read().then(
      (stored) => {
        if (canceled) return;
        loaded.current = true;
        if (early.current) return keep({ ...stored, ...early.current });
        current.current = stored;
        setPreferences(stored);
      },
      (cause: unknown) => console.warn("Display settings could not be read; the defaults stand for this session.", cause),
    );
    return () => {
      canceled = true;
    };
  }, [store, keep]);
  const update = useCallback(
    (patch: Partial<Preferences>) => {
      if (!loaded.current) early.current = { ...early.current, ...patch };
      keep({ ...current.current, ...patch });
    },
    [keep],
  );
  return useMemo(() => ({ preferences, update }), [preferences, update]);
}

/**
 * The device's entitlement as the shell may act on it. A development grant is
 * honored only in a development build: a shipped build that read it would be
 * a self-asserted unlock.
 */
export function honoredEntitlement(snapshot: EntitlementSnapshot, developmentBuild: boolean): EntitlementSnapshot {
  if (snapshot.source === "dev-override" && !developmentBuild) return NO_ENTITLEMENTS;
  return snapshot;
}

export function useEntitlementHandle(storage: StoragePort): EntitlementHandle {
  const [store] = useState(() => createEntitlementStore(storage));
  const [handle, setHandle] = useState<EntitlementHandle>({ snapshot: NO_ENTITLEMENTS, known: false });
  useEffect(() => {
    let canceled = false;
    store.read().then(
      (snapshot) => !canceled && setHandle({ snapshot: honoredEntitlement(snapshot, __DEV__), known: true }),
      (cause: unknown) => {
        console.warn("The entitlement cache could not be read; nothing is granted.", cause);
        if (!canceled) setHandle({ snapshot: NO_ENTITLEMENTS, known: true });
      },
    );
    return () => {
      canceled = true;
    };
  }, [store]);
  return handle;
}
