import { useCallback, useSyncExternalStore } from "react";
import type { SeenLedger } from "./marks";

// What the player has already seen is a convenience of this device, not part
// of the presidency: it never changes what the simulation does, so it lives in
// browser storage beside the preferences, one ledger per campaign seed, rather
// than in the save. Lost storage only means a badge reads as new once more.

const PREFIX = "administration.attention-seen.v1:";
const EMPTY: SeenLedger = {};
const cache = new Map<string, SeenLedger>();
const listeners = new Set<() => void>();

function read(seed: string): SeenLedger {
  const cached = cache.get(seed);
  if (cached) return cached;
  let ledger: SeenLedger = EMPTY;
  try {
    const raw = window.localStorage.getItem(PREFIX + seed);
    const parsed: unknown = raw ? JSON.parse(raw) : undefined;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      ledger = Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
    }
  } catch (error) {
    // Blocked or corrupt storage: start from nothing seen rather than fail the shell.
    console.warn("Seen notifications could not be read; every badge reads as new.", error);
  }
  cache.set(seed, ledger);
  return ledger;
}

function write(seed: string, ledger: SeenLedger): void {
  cache.set(seed, ledger);
  try {
    window.localStorage.setItem(PREFIX + seed, JSON.stringify(ledger));
  } catch (error) {
    console.warn("Seen notifications could not be saved on this device; they will read as new after a reload.", error);
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The seen ledger for one campaign, and a way to replace it; every reader on the page updates together. */
export function useSeenLedger(seed: string): readonly [SeenLedger, (next: SeenLedger) => void] {
  const ledger = useSyncExternalStore(subscribe, () => read(seed), () => EMPTY);
  const update = useCallback((next: SeenLedger) => write(seed, next), [seed]);
  return [ledger, update] as const;
}
