// MapLibre loads its worker and shared chunk by URL at runtime, so the web app
// has to serve them. They are copied from the installed package rather than
// checked in, so they always match the version in the lockfile.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(path.dirname(createRequire(import.meta.url).resolve("maplibre-gl/package.json")), "dist");
const out = path.join(here, "..", "public", "maplibre");
mkdirSync(out, { recursive: true });
for (const name of ["maplibre-gl-shared.mjs", "maplibre-gl-worker.mjs"]) copyFileSync(path.join(dist, name), path.join(out, name));
console.log(`copy-maplibre: wrote ${out}`);
