# Adversarial review of the map-first plan (2026-10-10)

Three independent passes challenged the approved plan before any code moved:

- **Engineering:** engine, data, gates and demolition, verified against source at `d65de3896`.
- **Product and UX:** read against the plan only.
- **Dependency scan:** what the planned deletions break.

Each finding below is recorded with what was done about it. **Accepted** means [PROGRAM.md](PROGRAM.md) or [DESIGN.md](../../DESIGN.md) now says what the finding asked. **Adjusted** means the finding's intent is met another way. **Declined** gives the reason.

## Engineering

| # | Finding | Severity | Disposition |
|---|---|---|---|
| E-B1 | W0 cannot finish green. `verify-engine-reachability` starts from `apps/web/src` and its ratchet refuses growth. `verify-file-size` fails on deleted allowlist names. The plan both parked 70 failing tests and required green tests. | Blocker | **Accepted.** Due-by-wave capability ledger; reachability rewritten to read call sites; allowlist edited; inherited failures pinned with due waves. |
| E-B2 | `docs/audits` holds source data: the leader tables read by `verify-leader-fidelity` and `vendor-nation-leaders`, and the provenance cited by `us-basing.tsv`, `dyads.tsv` and the election calendar. | Blocker | **Accepted.** W0a moves them to `packages/world/sources/` before any deletion. |
| E-M1 | Kept modules import deleted ones: 14 desk and summons files use `shell/rooms`; `summons/compose.ts` uses `guidance/room-read`. `guidance/library` is the only glossary. `party-color.ts` imports `@admin/design`. ui-web holds generated flags and icons. | Major | **Accepted.** W0a: new `navigation/places.ts` and re-keying; glossary kept as data; tokens kept until W3; bakes re-targeted. |
| E-M2 | E5 duplicated `resolveLocus`, which already places all 322 scenarios. 260 of them land on or near DC, including random offsets into Virginia, Maryland or the Atlantic. | Major | **Accepted.** E5 reuses the locus, fixes the offset fallback, and backfills authored states through the content workflow, with a ratchet on DC-by-fallback. |
| E-M3 | Fixed dots erase small places: 104 of 436 districts on the desktop US view, 211 on a phone, 98 of 241 countries on the world view. | Major | **Accepted**, together with the owner's direction that dots be dynamic in size: zoom- and viewport-driven pitch, sub-grids in small regions, a guaranteed centroid dot with a ring, hex-cartogram House. |
| E-M4 | E1 calibration was unsound. A constant shift plus clamp breaks the mean at low headlines. The cited precedent was the wrong one. It would disagree with `callMap` and include honeymoon. Marks were counted twice. `cohortSkew` is authored on 0 districts. | Major | **Accepted.** Logit offset solved by bisection; the same alignment term as `callMap`; honeymoon excluded; marks only through lean; no district approval; the electoral call shown beside the figure. |
| E-M5 | Geometry far over budget (states 1.6MB, districts 2.8MB, world 50m 0.76MB). Blended projections have no `invert`. Screen-space tiles shimmer. The fallback changes the camera contract. | Major | **Accepted.** Bake-time levels of detail; lazy loading; cached-bitmap flights; id-buffer picking; lattice anchored to the map plane; fallback declared as a degraded contract. |
| E-M6 | The riskiest choice was measured after the engine wave, and E3 research sat on the critical path. | Major | **Accepted.** The map spike runs first in W1; E3 moves to just before W6. |
| E-M7 | Function-level reachability hides lost variants (`issueAction` covers every instrument and rung). | Major | **Accepted.** Ledger keyed by function plus its discriminating parameter. |
| E-M8 | Functional commands have no area. Player and joiner deployments have no location and can target a conflict. Command assignment changes in play. Composite basing rows. Coastal points fail strict point-in-polygon. | Major | **Accepted.** Functional commands shown as cards; location written at commit; areas computed live; composite rows split or zone-level; coastal tolerance. |
| E-m | Off-by-one history sampling; uneven history starts; pin ledger needs a reset, not an advance; denylist false positives (a real surname, a deliberate legacy-save test, `admin-app`); `role-short.ts` has no such mention; two points per state; refusing old theater strings breaks save convention; `design/` dependencies; empty Playwright suite; CSP fine | Minor | **Accepted** as written in PROGRAM.md. The CSP check needs no change. |

## Product and UX

| # | Finding | Severity | Disposition |
|---|---|---|---|
| U-B1 | Small regions get no dots; parity split becomes mud; disputed borders don't match the 196 governments. | Blocker | **Accepted.** Dynamic dots, proportional dither, and an authored feature-to-government mapping. |
| U-B2 | 435 districts at country zoom alias. | Blocker | **Accepted.** Effective level is the lower of requested and what the zoom supports; hex House. |
| U-B3 | Heavy non-geographic work sits on animated texture. | Blocker | **Accepted.** Spatial, Hybrid and Workspace classes; Workspace pauses the map and shows a locator; panels opaque. |
| U-B4 | A camera stack conflicts with URL history and deep links. | Blocker | **Accepted.** Camera derived from the route plus ephemeral offset; no camera history; recenter control; per-mode last route; declared parents. |
| U-B5 | Phone vertical budget unspecified; no landscape. | Blocker | **Accepted.** Budget table at 390×844 and 320×568; lens control in the sheet header; half detent dropped under 600px height; landscape side panel. |
| U-M1 | Gesture conflicts between sheet and map. | Major | **Accepted.** Gesture rules in DESIGN.md. |
| U-M2 | A flight on every navigation. | Major | **Accepted.** Fly only when out of frame; interruptible; Quick default; camera setting. |
| U-M3 | A DC-metro camera adds little. | Major | **Adjusted.** Washington is list-first, but selecting an office still zooms to its HQ, because the owner asked for exactly that. The move is short and rings the pin. |
| U-M4 | 50 or more pins overwhelm keyboard and screen readers. | Major | **Accepted.** Clustering, cap, roving tabindex, list twins. |
| U-M5 | Party blue on navy; small-dot color vision. | Major | **Accepted.** Lightness-first ramps, 3:1, color-vision simulation, lighter party blue, high-contrast option. |
| U-M6 | Too many lenses. | Major | **Accepted.** One default plus at most 4 per screen, the rest grouped, persisted per mode. |
| U-M7 | A canvas `role="img"` is not access. | Major | **Accepted.** The ranked list is the table; arrow keys walk the sorted list; forced-colors list fallback. |
| U-M8 | Record held authorize verbs. | Major | **Accepted.** Scandal and metric move to Brief; press actions move to a White House press office; Record is read-only. |
| U-M9 | Compare-then-authorize missing for many acts. | Major | **Accepted.** One CompareAuthorize pattern with a wait baseline, a gate, and shortlist matrices for appointments and nominations. |
| U-M10 | Onboarding deleted, not replaced. | Major | **Accepted.** First-run walkthrough in W4; glossary in search and inline terms. |
| U-m | Brief and state dossier overloaded; district, judge and courts thin; acts the engine lacks; Congress filing; fallback loses animation; Continue and pulses; deep-link back | Minor | **Accepted.** Sectioned dossiers; district and judge as sub-views; Congress exception stated. The engine has no travel, pardon or summit acts (checked), so they are parked. |
| U-feel | Risk of a GIS dashboard. | Major | **Accepted.** Story first; delta lens on receipts and digest; tension marks persist; title globe and electoral finale kept. |

## Dependency scan

The breakage inventory it produced (scripts, tests, imports, live docs and the desktop host's needs) is folded into W0a and W0b in PROGRAM.md. The desktop host needs `apps/web/dist/index.html` at the root, no inline scripts, and a web build before packaging. W0 keeps all three.
