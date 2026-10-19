import { useSyncExternalStore } from "react";

// The last sentence a time control said in this sitting: shared between the
// Continue in the bar and the Brief that reports it. Never saved.

let said = "";
const listeners = new Set<() => void>();

export function say(sentence: string): void {
  said = sentence;
  for (const listener of listeners) listener();
}

export function useSaid(): string {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => said,
    () => said,
  );
}
