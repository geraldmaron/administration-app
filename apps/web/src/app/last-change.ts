import { useSyncExternalStore } from "react";
import type { Campaign } from "@admin/engine";

// The sitting's last change to the country: an act authorized or time run
// forward. The delta lens recolors from `before` to the campaign now, and the
// receipt and the Brief read it to say what just happened. Never saved: the
// Record keeps the fact, and this keeps only the moment.

export type LastChange = {
  readonly kind: "act" | "advance";
  readonly before: Campaign;
  readonly after: Campaign;
  /** Where the change happened, as the map frames it. */
  readonly camera: string;
  readonly selection?: string;
  /** The ledger events it wrote, newest last, so the receipt can open the Record entry. */
  readonly eventIds: readonly string[];
};

let current: LastChange | undefined;
const listeners = new Set<() => void>();

export function recordChange(change: LastChange): void {
  current = change;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = (): LastChange | undefined => current;

export function useLastChange(): LastChange | undefined {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** The last change, only while the campaign in play is still the one it produced. */
export function freshChange(change: LastChange | undefined, campaign: Campaign): LastChange | undefined {
  return change && change.after === campaign ? change : undefined;
}
