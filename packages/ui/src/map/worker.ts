// MapLibre GL draws its tiles in a module worker loaded from a URL beside the
// page. The app serves the worker and its shared chunk from its own origin
// (`/maplibre/`), copied from the installed maplibre-gl, so the map never
// reaches another host; an app served under another path sets its own URL.

let workerUrl = "/maplibre/maplibre-gl-worker.mjs";

export function configureMapWorker(url: string): void {
  workerUrl = url;
}

export function mapWorkerUrl(): string {
  const base = globalThis.location?.href;
  return base ? new URL(workerUrl, base).href : workerUrl;
}
