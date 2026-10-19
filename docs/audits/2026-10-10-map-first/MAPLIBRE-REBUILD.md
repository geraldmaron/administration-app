# Rebuild the map on MapLibre GL

Owner decision, 2026-10-10: the hand-built Canvas 2D map is replaced by MapLibre GL JS. This is the plan a fresh session executes. It is tracked as BL-98 in `docs/BACKLOG.md`.

## Why

The owner played the build and found the map broken in ways that trace to its design, not to individual bugs:

| What the player sees | Cause in `apps/web/src/map/` |
|---|---|
| Zoom is not smooth; the land can vanish | `renderer-input.ts` `onWheel` jumps the camera per event, with no easing, no zoom bounds and no trackpad (`ctrlKey`, `deltaMode`) handling |
| A mid-gesture stall | `renderer.ts` `moveCamera` re-renders the id buffer and the lattice synchronously when the view leaves the sampled area |
| Coarse, spiky coasts up close | `levels.ts` `planLevels` picks detail from the target's extent, once per screen, not from the current zoom |
| The map "refreshes" after every move; the terrain blinks | `recenter.ts` rebuilds the projection 350ms after the camera stops and crossfades to it; the terrain belongs to one projection (softened, not removed: `ReliefLayer.settled`) |
| Pins in the wrong place (Oklahoma City over Mexico) | marks and labels are DOM projected on a separate path (`MapMarks.tsx`, `labels/`) from the canvas; any frame where the two disagree draws them apart |
| Blurred terrain at city zoom | one 50m plate re-warped per view (`relief.worker.ts`), no finer level |
| No plus, minus or reset | there are none |
| Approval colored as if it were a party | fixed in this session: `--map-standing-*`, a slate-to-gold ramp |

Modern web maps solve these structurally: a GPU renderer, geometry tiled by zoom, eased inertial camera, symbols and markers placed in the same frame as the land, built-in navigation controls.

## What MapLibre gives, and what it costs

- `maplibre-gl` **6.11.2** (2026-09-24; 6.13.0 is days old). About 250KB gzipped. Lazy-load it with the map so the shell's first paint does not wait on it.
- GeoJSON sources tiled on the client (geojson-vt): our baked borders need no tile server, so the web build and Electron stay offline.
- `promoteId` and `setFeatureState` color a lens without re-uploading geometry; a lens swap is a paint-property change.
- `fitBounds` with padding frames a subject inside the uncovered map (the rail, the panel, the sheet); `flyTo` and `easeTo` replace `flight.ts`.
- `NavigationControl` (plus, minus, compass), a custom "re-frame" control for the route's framing, `GlobeControl`.
- Globe projection at world zoom, Mercator closer in (MapLibre's globe hands over to Mercator as it zooms). This replaces the Natural Earth / azimuthal blend.
- `queryRenderedFeatures` replaces the id-color picking buffer.
- Symbol layers with collision replace `labels/place-labels.ts`; markers or symbol layers replace the DOM marks, so pins can no longer drift.
- Lost or approximated: the "lifted block" selection (shadow and edge wall) becomes an outline glow plus a raised `fill-extrusion` or a line-blur halo; the proportional hatch becomes a `fill-pattern` per split ratio bucket; the dotted title globe becomes a globe with a dot `fill-pattern` or a custom layer.

## Requirements carried over (do not lose these)

1. **Context-aware camera.** The camera is a pure function of the route, as now (`camera-keys.ts`, `target.ts`, the player-core resolver). A state's panel frames that state; a decision frames its place; a nation's file frames that nation; an office frames its headquarters; a war frames its belligerents. Hovering a row in a panel list (the state strip) highlights that region without moving the camera; opening it frames it.
2. **Controls.** Plus, minus, re-frame to the route, and on world screens a globe toggle. Keyboard: `+`, `-`, `0` to re-frame, arrows step the ranked list (existing rule). Respect reduced motion (jump, never fly).
3. **Lenses** from `map/lenses/` keep their `read()` contract; only the paint changes. Approval uses `palette.standing`; party colors only for party readings.
4. **Selection** lifts its region: brighter fill, glowing outline, the rest faded (`othersAlpha`).
5. **Provinces and places** (BL-96): a selected foreign government's inner lines and province names from `data/provinces/*.json`; its capital and cities from `nationPlaceMarks`; a state's capitol and metros from `placeMarks`.
6. **US home view**: Alaska and Hawaii insets, or a framing that includes them; selecting either flies there.
7. **Accessibility**: the canvas description, the ranked list as the data table, forced colors showing the list (DESIGN.md "Accessibility").
8. **Sea**: the swell and shelf from `sea.ts` move to a background `fill-pattern` and a coast line-blur layer; the graticule as a line layer.
9. **Terrain**: hillshade from a bundled `raster-dem` pyramid, zoom 0 to 6, generated once from a public-domain DEM and committed under the web app's public assets. No live tile host (the game runs offline). Above zoom 6 the hillshade simply stops sharpening.
10. **Cards** (`MapCards.tsx`) keep their placement rules but read positions from `map.project()` on the `move` event, the same frame the map draws.
11. **Performance**: 60fps desktop, 45fps under 4× throttle on a phone profile, first paint under 1s (DESIGN.md), measured on `/nation`, `/world/nation/CAN` and `/brief`.

## Order of work

1. **Spike in place (one session).** Add `maplibre-gl@6.11.2`. A new `map/gl/` module renders the US states and world nations from the existing baked topologies (converted to GeoJSON at load, `promoteId: "id"`), one lens by feature state, `fitBounds` from the existing camera keys, navigation controls, symbols for state names. Run it behind a dev flag beside the old renderer on `/dev/map`. Measure frame time and check pins against land at 390×844 and 1440×900. Gate: smooth wheel and pinch zoom, no drift, under budget.
2. **Swap the layer.** `MapLayer.tsx` mounts the GL map. Port lenses, selection, marks, labels, arcs (`MapArcs.tsx` to a line layer), cards, provinces, places, the US insets. Keep `MapDataList.tsx` and the directive contract (`directive.tsx`) unchanged, so no screen changes.
3. **Delete the old renderer**: `renderer.ts`, `renderer-input.ts`, `scene.ts`, `frame-draw.ts`, `paint.ts`, `lattice.ts`, `dither.ts`, `pitch.ts`, `picking.ts`, `id-color.ts`, `flight.ts`, `recenter.ts`, `relief*.ts`, `hatch.ts`, `levels.ts`, `projection.ts` and their tests, once nothing imports them. The title globe moves to the GL globe.
4. **Terrain**: bake the DEM pyramid and add the hillshade layer.
5. **Docs**: rewrite DESIGN.md "Renderer", "Ground" and "Motion rules" for the GL map; record the engine choice in DECISIONS.md with its reason; update ARCHITECTURE.md's player section.
6. **Proof**: `map.spec.ts` and every screen spec at six widths; the frame-time budget; screenshots of Iran, Canada and a state at phone and desktop sizes.

## Left open in the session that wrote this

- `ui-web` `dist/` not rebuilt or committed; nothing from this session is committed.
- `washington.spec.ts` failed on `.exec-node__holder a`; the wrapper was restored in `ExecutiveTree.tsx` but the spec was not re-run (the owner stopped testing). `map.spec.ts` "a lens swap settles on the lens's own colors" failed at 320 only, not investigated; the GL rebuild replaces what it tests.
- `scripts/verify-file-size.mjs` fails on `studio-cli/src/scenarios/brief.ts` (1417 lines over a 1412 ceiling), unchanged by this session.
- Help tips: `HelpTip` (ui-web) and `GlossaryTip` (apps/web/src/shell) exist and are used on the Nation screen only. Owner asked for a short visible description per area plus a tip where needed; roll out to Brief, Washington, World and Record.
