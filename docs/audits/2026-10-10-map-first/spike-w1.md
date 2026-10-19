# W1 map spike: runtime-projected canvas, measured

**Decision: go.** The runtime-projected canvas holds the frame budget in `docs/DESIGN.md` §1 on desktop and on the 4×-throttled phone profile, so the fallback (a pre-baked plate with an affine camera) is not adopted. The verdict on the load-bearing choice in `PROGRAM.md` moves from "needs validation" to **accepted with controls**. The controls are listed under "What would change the decision". The main one: no real phone GPU or Safari has been measured yet.

Measured 2026-10-10 on branch `w1-map-spike`. This file is the spike's evidence. `gates/W1.md` cites it when the wave closes.

## What was built

| Piece | Where |
|---|---|
| Level-of-detail bake | `scripts/bake-map-lod.mjs` writes to `apps/web/src/map/data/` |
| Runtime projection and the Natural Earth / azimuthal blend | `apps/web/src/map/projection.ts` |
| Plane-anchored lattice, sub-grid and centroid guarantee | `apps/web/src/map/lattice.ts` |
| Dot pitch by zoom, viewport and density; octave crossfade | `apps/web/src/map/pitch.ts` |
| Id-buffer picking (checksummed id colors) | `apps/web/src/map/id-color.ts`, `picking.ts`, `scene.ts` |
| Proportional dither | `apps/web/src/map/dither.ts`, `paint.ts` |
| Cached-bitmap flights (van Wijk path, two registered bitmaps) | `apps/web/src/map/camera.ts`, `flight.ts`, `renderer.ts` |
| Levels per lens and zoom (effective level) | `apps/web/src/map/levels.ts` |
| `/dev/map` harness with frame-time readout | `apps/web/src/routes/dev/map.tsx`, `apps/web/src/map/harness/` |
| Measurement instrument | `scripts/measure-map-spike.mjs` |

How the renderer works:

1. **At rest.** Each camera target gets one projection. A target wider than 120° stays Natural Earth, rotated to the focus longitude. A target of 40° or narrower is azimuthal equal-area on the focus. In between, the two raw projections are interpolated.
2. **Sampling.** Shapes are projected once into plane-space `Path2D`s. An offscreen id buffer, one pixel per half-pitch lattice cell plus a 25% margin, is filled with checksummed id colors. One read gives both the dots and the picking.
3. **Pan and zoom.** These only re-transform the plane-space dots. The buffer is resampled only when the view leaves the margin or crosses an octave.
4. **Flights.** A flight moves the last frame and a destination frame as two cached bitmaps along a van Wijk path. The two are registered on the target's rectangle, so the Natural Earth source and the azimuthal destination stay aligned. The destination is built in time-sliced chunks (6ms budget per frame) at the light level of detail while the source is already moving. On landing, the rest level re-projects in the background and swaps in.

## Method

| | |
|---|---|
| Machine | Apple M5 Pro, 18 cores, 48 GB, macOS 26.6.2 |
| Browser | Chromium 153.0.8010.12 (Playwright `chromium` channel, new headless, GPU via ANGLE Metal) |
| Build | Production `vite build`, served by `vite preview` |
| Desktop profile | 1440×900 at device pixel ratio 2, no throttle |
| Phone profile | 390×844 at device pixel ratio 3, touch, `Emulation.setCPUThrottlingRate` 4. A JS busy loop checked at 11.5ms unthrottled and 45.2ms throttled, so the throttle is in effect. |
| Script | `MAP_URL=http://127.0.0.1:4791 node scripts/measure-map-spike.mjs` |
| Host load | Load average 6–30 during the runs: parallel sessions share this machine |

**Per run:** 2 rounds of 8 flights each: US, Pennsylvania, NY-12, world, California, US, TX-07, world. After every world, US and state flight comes a mouse-drag pan. Each pan is 60 steps over about 1.3s, swinging ±30% of the viewport width, so desktop pans cross the resample margin. The House lens is not used here. Every flight is under the population lens, where the level of detail is set by zoom.

**Metrics:** these come from the renderer's own frame log (`FrameLog` in `stats.ts`), tagged by phase.

- **Interval:** rAF-to-rAF time. This is the frame time the player sees.
- **Work:** main-thread time inside the map's frame callback.
- **Phases:**
  - `flight`: bitmaps moving.
  - `pan`: frames during a drag.
  - `settle`: landing, then the background rest-detail rebuild.
- **Budget lines:**
  - Desktop: 60fps (16.7ms).
  - Phone: at least 45fps (22.2ms). The ">22.2ms" column counts frames that broke the phone budget.
- **First paint:** `performance.now()` at the first dotted frame, measured from navigation start.

## Results

Two clean runs at the budget profile (A and B), and one sensitivity run with the phone throttled 8×. All values are in ms.

| Run | Profile | Phase | Frames | Interval p50 | Interval p95 | Interval max | Work p50 | Work p95 | Work max | >22.2ms |
|---|---|---|---|---|---|---|---|---|---|---|
| A | Desktop | Flight | 758 | 16.7 | 16.7 | 16.8 | 0.1 | 0.4 | 5.2 | 0 |
| A | Desktop | Idle pan | 770 | 16.7 | 16.7 | 16.8 | 0.8 | 3.0 | 3.5 | 0 |
| A | Desktop | Settle | 34 | 16.7 | 16.8 | 16.8 | 6.8 | 9.9 | 10.2 | 0 |
| A | Phone, CPU 4× | Flight | 804 | 16.7 | 16.8 | 16.8 | 0.1 | 2.3 | 19.5 | 0 |
| A | Phone, CPU 4× | Idle pan | 811 | 16.7 | 16.8 | 16.8 | 1.7 | 2.8 | 3.6 | 0 |
| A | Phone, CPU 4× | Settle | 100 | 16.7 | 16.8 | 16.8 | 6.6 | 10.6 | 14.7 | 0 |
| B | Desktop | Flight | 757 | 16.7 | 16.7 | 16.8 | 0.1 | 0.3 | 5.0 | 0 |
| B | Desktop | Idle pan | 726 | 16.7 | 16.7 | 16.8 | 0.7 | 2.9 | 3.1 | 0 |
| B | Desktop | Settle | 29 | 16.7 | 16.8 | 16.8 | 7.0 | 9.0 | 9.2 | 0 |
| B | Phone, CPU 4× | Flight | 801 | 16.7 | 16.7 | 16.8 | 0.1 | 2.0 | 19.9 | 0 |
| B | Phone, CPU 4× | Idle pan | 767 | 16.7 | 16.7 | 16.8 | 1.7 | 2.8 | 3.4 | 0 |
| B | Phone, CPU 4× | Settle | 97 | 16.7 | 16.8 | 16.8 | 6.6 | 11.5 | 15.3 | 0 |
| Sensitivity | Phone, CPU 8× | Flight | 802 | 16.7 | 16.8 | 33.4 | 0.1 | 6.5 | 40.0 | 1 |
| Sensitivity | Phone, CPU 8× | Idle pan | 1191 | 16.7 | 16.8 | 33.4 | 0.8 | 5.5 | 6.8 | 13 |
| Sensitivity | Phone, CPU 8× | Settle | 158 | 16.7 | 16.8 | 16.8 | 7.4 | 14.4 | 23.6 | 0 |

**First paint:**

- Desktop: 166ms and 167ms.
- Phone at 4×: 480ms and 488ms.
- Phone at 8×: 945ms.

No long task (over 50ms) was observed after load in runs A or B.

### Against the budget

| Budget (`DESIGN.md` §1) | Result |
|---|---|
| 60fps desktop | **Met.** Flight and pan p95 is 16.7ms, and no frame went over 16.8ms. |
| ≥45fps on a 4×-throttled phone profile | **Met.** p95 is 16.8ms, and no frame went over 22.2ms in either run. |
| First paint under 1s | **Met.** 166ms on desktop and about 485ms on the throttled phone. |
| Up-front geometry about 1.5MB | **Met.** 129KB raw (44KB gzip) up front. |

The 8× run shows where the margin runs out. The phone pan drops 13 of 1191 frames to 30fps, and the flight drops 1. That is twice the budget profile's throttle.

### Found by measuring, fixed in the spike

1. **Mid-flight decode hitch.** The first run (A0, not tabled) had one 150ms desktop frame and a phone flight frame with 26ms of work.
   - **Cause:** a lazy level (50m world, states or districts) was fetched, parsed and converted to GeoJSON in one task while a flight was moving.
   - **Fix:** lazy levels now prefetch one at a time in `requestIdleCallback` after first paint. Each feature's geometry decodes on first use, inside the time-sliced projection job.
   - **Also:** id-buffer sampling and the destination bitmap were each split into their own frames.
2. **Host-contention outliers.** One later run (A1, not tabled) at load average about 30 showed 83ms intervals and a 33ms work frame on desktop.
   - **Diagnosis:** the same scenario under a `longtask` observer and per-step `performance.measure` showed no long task. Every step was in single-digit ms: id buffer 0.6–3.4, `getImageData` 0.1–1.6, decode 0.1–1.2, lattice 0.3–2.8, paint 0.4–1.4, dot draw 0.6–4.7.
   - **Conclusion:** the outliers were host contention, not the renderer. Runs A and B were taken once the load had dropped.

## Data sizes

`node scripts/bake-map-lod.mjs`. The output is deterministic: a re-bake is byte-identical.

| File | Source | Regions | Arcs | Points | Raw | Gzip | Loaded |
|---|---|---|---|---|---|---|---|
| `world-lo.json` | Natural Earth 110m, 0.2° | 169 | 585 | 4,523 | 53.4KB | 18.5KB | Up front |
| `states-lo.json` | Census 2023 500k, 0.06° | 51 | 306 | 3,077 | 28.6KB | 9.3KB | Up front |
| `regions.json` | Centroids, bounds, feature-to-government mapping | 686 | – | – | 43.9KB | 16.8KB | Up front |
| `world-hi.json` | Natural Earth 50m, 0.03° | 198 | 1,850 | 30,700 | 318.6KB | 113.6KB | Idle prefetch |
| `states-hi.json` | Census 2023 500k, 0.01° | 51 | 1,601 | 26,853 | 233.9KB | 71.0KB | Idle prefetch |
| `districts-lo.json` | Census 118th 500k, 0.03° | 436 | 3,351 | 16,020 | 181.3KB | 54.4KB | Idle prefetch |
| `districts-hi.json` | Census 118th 500k, 0.004° | 436 | 4,584 | 71,382 | 641.8KB | 194.3KB | Idle prefetch |

**Feature-to-government mapping** (authored in the bake and validated there; the bake fails on an unmapped feature):

- **Roster coverage:** every one of the 196 roster governments resolves to a 50m shape or a point. Only Tuvalu is point-only.
- **Centroid-only at world-lo:** 28 governments have no 110m shape and draw as a ringed centroid dot at world zoom. Examples are Singapore, Malta, the Caribbean and Pacific states, Andorra, San Marino, Liechtenstein, Monaco and Bahrain.
- **Shapes with no ISO code:**
  - Kosovo maps to XKX.
  - Northern Cyprus maps to CYP.
  - Somaliland maps to SOM.
- **Neutral ground:** Western Sahara, the Siachen Glacier and the Holy See are drawn neutral.
- **Dependencies:** territories are drawn in their administrator's reading. These are `TERRITORY_ADMINISTRATOR` plus the 50m dependencies it did not name.
- **Alaska and Hawaii:** both keep their real positions, and the harness flies to each. The inset viewports are W2 camera work.

**JS:** the `/dev/map` route chunk is 1.76MB (623KB gzip). Almost all of that is `@admin/world`, which the harness lenses read. The renderer itself is d3-geo, topojson-client and about 1,600 lines of map code.

## What would change the decision

These are the conditions under which the fallback (the declared degraded camera contract: a pre-baked plate with an affine camera, keeping lens recolor and detachment but losing azimuthal close-ups and rotation) comes back on the table. Each is a residual risk this spike did not close.

1. **Real phone GPU.** CPU throttling slows the main thread but not the GPU. Flights draw two full-screen bitmaps per frame at device pixel ratio 3, and that work ran on the M5 Pro's GPU.
   - **Trigger:** flight p95 over 22ms on a mid-range Android or an older iPhone.
   - **Measure:** on a device in W2 or W3, before W9 at the latest.
   - **Cheapest mitigation before the fallback:** render the bitmaps at device pixel ratio 2.
2. **Safari / WebKit is unmeasured.** The installed Playwright 1.63 has no matching WebKit build (`webkit-2359`). Safari has no `requestIdleCallback`; the renderer falls back to `setTimeout`. The web build is browser-first, so iPhone Safari matters.
3. **Dot volume at deep zoom.** At state zoom on desktop the lattice holds about 77k dots, margin included, and drawing them took about 4.3ms on this machine.
   - **Trigger:** a weak laptop at 4× that cost could leave 60fps pans.
   - **Mitigation:** move the dot layer as a cached bitmap during pans, the same technique flights use.
4. **Settle cost.** The background rest-detail rebuild runs at p95 10–15ms of work per frame and max 15ms at 4×. One projection chunk can overrun the 6ms slice when a single feature is large (Russia at 50m, a big district).
   - **Trigger:** if detachment (W2) has to animate during settle, this needs a finer slice or a worker.

## Left for W2 and later (not attempted here)

- Alaska and Hawaii inset viewports on the US home view (W2 camera).
- Recolor timing:
  - 200ms on a lens swap.
  - 400ms on a level change.
  - Instant under reduced motion.
- Detachment.
- Magnitude radius in drawing. `magnitudeRadius` is written and tested but no lens uses it yet.
- High contrast.
- Hex-cartogram House.
- Settling pitch quantization. Octave quantization lets the drawn pitch run from about 0.8× to 1.6× of the target, so Alaska drew at 11.3px against a 9px ceiling. W2 can narrow the band or cap the A grid.
- Crowded centroid rings on the phone world view (Europe, the Caribbean, the Pacific). The guarantee is honored, and W2 lens design should decide ring styling at that zoom.
- `/dev/map` ships in the production build so it can be measured there. W2 decides whether to keep it as a diagnostic or gate it behind `import.meta.env.DEV`.
- Loading the JSON levels through Electron's `administration://` scheme with `fetch` is untested.

## New dependencies

`d3-geo` ^3.1.1 and `topojson-client` ^3.1.0 are now `apps/web` dependencies, with `@types/d3-geo` and `@types/topojson-client` as dev dependencies. `DESIGN.md` §1 names both as the renderer's web dependencies. `d3-geo`, `topojson-client` and `@types/topojson-client` were already root dev dependencies used by the older bake scripts, at the same versions. The lockfile's one new package is `@types/d3-geo` 3.1.1, which is types only and ships nothing.

## W2: the productized engine, measured again

Measured 2026-10-10 on branch `w2-map-engine`, same machine, browser, profiles and script as above. The harness is now the real `MapLayer` (camera resolver, motion rules, lens contract, detachment, marks, accessible list) under the population lens with no campaign, so the flights and pans are the spike's own. It is built into a production bundle only with `VITE_MAP_HARNESS=1`; a plain production build drops `/dev/map`.

Host load was 12 to 17 during runs C and D (parallel sessions). Both are tabled.

| Run | Profile | Phase | Frames | Interval p50 | Interval p95 | Interval max | Work p50 | Work p95 | Work max | >22.2ms |
|---|---|---|---|---|---|---|---|---|---|---|
| C | Desktop | Flight | 744 | 16.7 | 16.7 | 16.8 | 0.1 | 0.3 | 3.7 | 0 |
| C | Desktop | Idle pan | 722 | 16.7 | 16.8 | 33.3 | 0.7 | 3.1 | 3.8 | 1 |
| C | Desktop | Settle | 30 | 16.7 | 16.7 | 16.8 | 6.7 | 8.8 | 9.3 | 0 |
| C | Phone, CPU 4× | Flight | 791 | 16.7 | 16.7 | 16.8 | 0.1 | 2.7 | 11.2 | 0 |
| C | Phone, CPU 4× | Idle pan | 941 | 16.7 | 16.8 | 16.8 | 1.1 | 3.1 | 3.7 | 0 |
| C | Phone, CPU 4× | Settle | 106 | 16.7 | 16.7 | 16.8 | 6.8 | 10.5 | 19.3 | 0 |
| D | Desktop | Flight | 743 | 16.7 | 16.8 | 16.8 | 0.1 | 0.4 | 3.8 | 0 |
| D | Desktop | Idle pan | 722 | 16.7 | 16.7 | 16.8 | 0.8 | 2.9 | 3.1 | 0 |
| D | Desktop | Settle | 31 | 16.7 | 16.7 | 16.8 | 6.8 | 9.1 | 9.4 | 0 |
| D | Phone, CPU 4× | Flight | 791 | 16.7 | 16.7 | 16.8 | 0.1 | 2.1 | 10.2 | 0 |
| D | Phone, CPU 4× | Idle pan | 769 | 16.7 | 16.7 | 16.8 | 1.7 | 2.8 | 3.2 | 0 |
| D | Phone, CPU 4× | Settle | 95 | 16.7 | 16.7 | 16.8 | 6.6 | 10.9 | 15.0 | 0 |

**Against the spike (runs A and B):**

- **Frame times: no regression.** Flight and pan p95 stay at 16.7–16.8ms on both profiles; phone flight work max fell from about 20ms to 10–11ms. The one desktop pan frame at 33ms in run C came with the load average at 17 and has no matching work (work max 3.8ms), which is the host-contention pattern described above.
- **No long tasks after load** in runs C and D. An intermediate run (not tabled) showed four 84–95ms tasks on the throttled phone: the Alaska and Hawaii insets built their views in one task on arrival at the US view. Inset renderers now build in frame-budget slices like a flight's destination.
- **First paint regressed but stays inside the 1s budget:** desktop 377ms and 387ms (spike 166ms), throttled phone 673ms and 708ms (spike about 485ms). The cause is bundle size, not the renderer: the harness chunk grew from 1.76MB to 5.08MB because the lenses and marks read `@admin/engine` and `@admin/player-core`, and player-core's index pulls in the bundled corpus. The shell will load those packages for the campaign store anyway, so W3 owns the chunking; the map's own first frame still waits only on `world-lo`, `states-lo` and `regions.json`.

### Closed from the "left for W2" list

| Item | Where it landed |
|---|---|
| Alaska and Hawaii insets | `insets.ts` lays them out in the lower left of the visible area; `UsInsets.tsx` draws each with its own sliced, non-interactive renderer. Choosing one flies to the real place. The contiguous states give up just over half the inset band (`framingArea`). |
| Recolor timing | 200ms swap, 400ms level change, instant under reduced motion, as a snapshot crossfade (`motion.ts`, `renderer.ts`). |
| Detachment | `detach.ts` and `frame-draw.ts`: others fade to 22% (35% high contrast), the selection lifts 6px at 1.03 scale with a tint, soft shadow and 1.5px outline. A selected state lifts with its districts, so their lines show inside it. |
| Magnitude radius | `forces` and `population` lenses scale radius 0.6–1.6×, held to tenths so a frame stays a few dozen fills. |
| High contrast | Dots at 0.3 × pitch, the 35% detach fade, and a high-contrast pointer set in `map.css`. |
| Hex-cartogram House | `house-hex` lens: `lenses/hex-layout.ts` grows each state as one compact block of equal hexes near its centroid, drawn as seven-dot hexes over the dimmed map (`HexHouse.tsx`). |
| Settling pitch quantization | `octaveFor` takes a ceiling and fades the half-pitch grid in early just far enough to hold the drawn pitch at it, continuously. A unit test sweeps zoom and holds the drawn pitch at or under 9px × density with no jump; Alaska drew at 11.3px in the spike. |
| Crowded centroid rings on a phone world view | On a lattice finer than 5px the ring tightens (1.9× radius, 2.5px floor), thins to 0.6px and drops to 55% alpha (`ringFor`). |
| `/dev/map` in production | Gated on `import.meta.env.DEV` or `VITE_MAP_HARNESS=1`; otherwise the import is dropped at build time and the route is not found. |

Still open: the Electron `administration://` fetch path, a real phone GPU and Safari (the residual risks above stand unchanged).

## W3 integration: the map in the shell, and the first paint split

Measured 2026-10-10 on branch `w23-integration` (W2 and W3 merged, then E3), same machine and browser as above, host load average about 5 for both runs.

**What the merged tree did first.** W2's `map.css` pointed at token names W3 had renamed (`--map-board-land-edge`, `--color-stance-*`, `--color-interaction`, `--color-accent*`, `--color-mark-gold`, `--space-xxxl`). `readPalette` threw on mount ("Map color --map-lens-nodata is not defined"), so the merged build drew no map on any screen; that is why the first W3 screenshots show an empty sea. The "before" column below is the merged tree with only that stylesheet fix and the `map:first-paint` user-timing mark added, so it can be measured at all.

**Method.** `MAP_URL=http://127.0.0.1:4791 node scripts/measure-map-spike.mjs --first-paint`: five cold loads of `/` per profile, each in a fresh browser context; first contentful paint from the paint timing entry, map first paint from the renderer's `map:first-paint` mark (the first dotted frame), both from navigation start. Script bytes are the encoded sizes of scripts fetched before the map's first frame (`vite preview` serves them gzipped).

### First paint against the 1s budget (`DESIGN.md` §1)

| Profile | | First contentful paint p50 | Map first paint p50 | Map first paint max | Script before the map paints |
|---|---|---|---|---|---|
| Desktop 1440×900 @2x | Before | 248ms | 263ms | 276ms | 1,785KB |
| Desktop 1440×900 @2x | After | 160ms | 171ms | 179ms | 988KB |
| Phone 390×844 @3x, CPU 4× | Before | 660ms | 729ms | 733ms | 1,785KB |
| Phone 390×844 @3x, CPU 4× | After | 440ms | 512ms | 520ms | 988KB |

**Met** on both profiles, with the phone at about half the budget. An earlier run of the before build under a host load average of 50 put the phone at 879ms, which is the margin this split buys back.

### Chunks (minified, then gzip)

| Chunk | Before | After | Loaded |
|---|---|---|---|
| Entry (`index`) | 5,961KB / 1,826KB: React, the router, the shell, the map, the engine, the whole dataset, the corpus, the glossary | 987KB / 244KB: React, the router, zod, the shell, the map engine, the nations and states tables (region names and camera keys), the federal sites | Up front |
| Corpus (`corpus`) | in the entry | 1,769KB / 463KB | With the campaign store |
| Engine and dataset (`effects`, named by Rollup for its first module) | in the entry | 1,912KB / 704KB | With the campaign store |
| Content packs and scenario logic (`scripts`) | in the entry | 252KB / 76KB | With the campaign store |
| Campaign store (`store`, `save-store`, `DeviceStores`) | in the entry | 269KB / 91KB | After the map's first frame |
| Force placement and the map's campaign lenses and pins (`force-placement`, `registry`, `sources`) | in the entry | 272KB / 97KB | When a screen asks for a non-neutral lens, or a campaign exists |
| Search with the glossary (`Search`) | in the entry | 235KB / 70KB | The first time search opens |
| In-term chrome (`TermChrome`: Continue, save status, mode navigation) | in the entry | 5KB / 2KB | Once a campaign is in play |
| `/dev/map` harness | not in the production build | not in the production build | Only with `VITE_MAP_HARNESS=1` |

**How.** The data packages (`@admin/world`, `@admin/engine`, `@admin/content`, `@admin/player-core`) are marked `"sideEffects": false` (none has a side-effect-only import), so a screen that takes one function no longer pulls the package. The campaign store loads through a dynamic import once the `map:first-paint` mark is observed (a 1.5s cap covers a map that never paints); the display settings and entitlement are small and load with the frame, so the title draws in the player's own camera, density, contrast and palette. `vite.config.ts` gives the baked corpus its own chunk; every other split is the import graph's.

**What is still in the entry.** The `worldNations` and `stateById` tables (with zod, which parses them at load) for region names, tooltips and the `state:` camera key. Before minification they weigh about as much as React DOM (about 560KB of source each, plus 185KB of zod). Moving them out means the map's names load beside the region table rather than with the script, which W4 can take if the phone margin shrinks.

### Verified on the running surface

- Playwright, all six widths (320, 390, 768, 1280, 1440, 1920): 60 passed, 0 failed, including `tests/map.spec.ts` (canvas drawn and non-blank behind the title and behind the Brief, the Brief under the approval lens, a color-vision palette reaching the map's `data-palette` and its resolved lens colors).
- Screens at 390×844 and 1440×900 in `w3-screens/`: the title over the world framed beside the panel or above the sheet; the founding with Pennsylvania lit in a framed United States (the phone sheet lowered to peek, which re-frames the map when the sheet settles); the oath; the Brief under the approval lens with the Alaska and Hawaii insets; settings with Protanopia chosen; the Brief again under Protanopia, where the low-approval states turn from red to orange; the slots.
