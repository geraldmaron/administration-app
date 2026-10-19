import { Suspense, lazy } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";

// The map engine harness is a diagnostic, not a screen. It is in a dev server,
// and in a production build only when built with VITE_MAP_HARNESS=1 for the
// frame-time measurement; anywhere else the condition is false at build time,
// the import is dropped and the route is not found.
const HARNESS_ENABLED = import.meta.env.DEV || import.meta.env.VITE_MAP_HARNESS === "1";

const MapHarness = HARNESS_ENABLED ? lazy(async () => ({ default: (await import("../../map/harness/MapHarness")).MapHarness })) : null;

function DevMap() {
  if (!MapHarness) return null;
  return (
    <Suspense fallback={<p>Loading the map harness…</p>}>
      <MapHarness />
    </Suspense>
  );
}

export const Route = createFileRoute("/dev/map")({
  beforeLoad: () => {
    if (!HARNESS_ENABLED) throw notFound();
  },
  component: DevMap,
});
