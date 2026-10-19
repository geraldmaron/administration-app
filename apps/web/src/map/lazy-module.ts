import { useEffect, useState } from "react";

/**
 * A module imported the first time it is `needed`, and kept after: what the
 * title screen's first paint does not draw (the stores, the map's campaign
 * lenses and pins, all of which bring the engine) loads once something asks
 * for it. A chunk that fails to arrive is thrown from render, so the router's
 * error screen says so rather than the game waiting forever.
 */
export function useLazyModule<T>(load: () => Promise<T>, needed: boolean): T | null {
  const [module, setModule] = useState<{ readonly value: T } | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const wanted = needed && module === null;
  useEffect(() => {
    if (!wanted) return;
    let canceled = false;
    load().then(
      (value) => !canceled && setModule({ value }),
      (cause: unknown) => !canceled && setFailure(cause),
    );
    return () => {
      canceled = true;
    };
  }, [wanted, load]);
  if (failure) throw failure instanceof Error ? failure : new Error(`A part of the game could not be loaded: ${String(failure)}`);
  return module?.value ?? null;
}
