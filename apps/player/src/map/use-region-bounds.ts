import { useEffect, useState } from "react";
import type { MapBounds } from "@admin/ui/map";
import { collectionOf } from "./geometry";
import { regionBounds } from "./pins";
import { loadLayer } from "./regions";

export type BoundsState = { readonly status: "loading" } | { readonly status: "ready"; readonly bounds: MapBounds } | { readonly status: "failed"; readonly error: string };

/** The camera box for one state, from its real shape (never the moved inset), loaded with the states layer the map draws anyway. */
export function useRegionBounds(key: string): BoundsState {
  const [state, setState] = useState<BoundsState>({ status: "loading" });
  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    loadLayer("states")
      .then((features) => {
        if (!live) return;
        const bounds = regionBounds(collectionOf(features), key);
        setState(bounds ? { status: "ready", bounds } : { status: "failed", error: `The map has no shape for ${key}.` });
      })
      .catch((error: unknown) => {
        if (live) setState({ status: "failed", error: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      live = false;
    };
  }, [key]);
  return state;
}
