# Map-first program

This program rebuilds the player around one context-aware dotted map. It covers the engine and data changes the map needs, the removal of the previous player and its history, the waves, and how each wave is proven. What the player sees and does is in [DESIGN.md](../../DESIGN.md). The week view lives in `docs/PLAN.md`, and the items in `docs/BACKLOG.md` under "Map-first program". The [capability ledger](capability-ledger.md), the [adversarial review](adversarial-review.md) and the gate records (`gates/`) sit next to this file.

**Branch:** `feat/map-first`, cut from `d65de3896`. **Safety ref:** `refs/safety/pre-map-first`. No push, PR or deploy until the program closes.

## Owner decisions this program builds on (2026-10-10)

- Every screen sets the camera and the dot lens. Offices and entities zoom to their real location, using sourced HQ points in the DC metro.
- A clicked state detaches: the other dots fade, its outline turns solid, and its context appears. Dots recolor with context at nation, state and district level.
- Dots are responsive and dynamic in size.
- Phone and desktop have task parity.
- No precedent is kept. The previous player, its design records and the game's history (the earlier playable nation and the pivots) are deleted, not archived.
- Keep the logo and navy, red, white, blue and gold as anchors. Rebuild everything else.
- State approval goes in the engine. Forces are placed by zone, with coordinates inside the zone. No map landmarks.

**Visual re-cut (owner, 2026-10-10, after playing W0–W8).** The dots were overbearing, marks did not follow the map, the panels sat beside the map instead of working with it, and bar-only readings felt dated. Decided: the ground is filled with the lens colors and dots are kept for the selection, mixed values and tiny regions; existing components and layouts are not precedent; a visual wave (W9) runs before parity (now W10); W7 and W8 close on functional proof without regenerating their screenshots.

## Engine and data changes

### E1: State approval

**The rule:** a state's approval must never disagree with the headline or with the electoral map the player sees.

- **New module:** `packages/engine/src/regional-opinion.ts`. It exposes `stateApproval(campaign, id)`, a pure read.
- **Calculation:**
  - Start from the same alignment term the electoral map uses (`mapAlignment`, `packages/engine/src/states.ts:116`, through `administrationShare`, `:104`).
  - Add the state's `vitalAnchor` economic deltas, scaled by the national change since opening.
  - Do **not** add marks again. They already move lean through `grievanceLean` (`states.ts:196`).
  - Combine in logit space with a single offset `k`, found by bisection, so that the population-weighted mean equals the headline approval with the honeymoon bonus removed. Coalitions exclude honeymoon on purpose (`opinion.ts:402-410`).
  - Clamp only after solving, so the mean holds across the whole range, including the removal-pressure range where opposed states would otherwise clip at 0.
- **Electoral call.** The dossier always shows approval beside the call from `callMap`, with one plain line when they diverge (for example, "approves at 51% and is still called against you: partisan lean outweighs approval here").
- **Districts.** No district approval. `cohortSkew` is authored on 0 of 436 districts, so any district figure would be invented. Districts show lean, holding party, claims and marks.
- **History:**
  - A persisted weekly `stateApprovalHistory`. The save goes from v54 to v55, an optional field, starting empty, following the convention in `packages/engine/src/save.ts:47`.
  - It is sampled from `WeekOpening` inputs, so it lines up with the national rows (`turn-loop.ts:122`).
  - The national history has inherited rows; the state history starts at founding, and the dossier says so.
- **Display only in v1.** Nothing reads it to decide outcomes, so the doctrine gate and the balance harness don't move. The harness is still run as proof.
- **Tests:**
  - The weighted mean equals the headline (minus honeymoon) within rounding, across a sweep of headlines from 0.05 to 0.95 and polarization from 0 to max.
  - Determinism: iteration in `STATE_IDS` order.
  - Agreement in sign with `callMap` where approval and share sit far apart.
  - The v54 to v55 migration.
- **Doc sync:** `docs/SCHEMA.md`, `docs/ARCHITECTURE.md`, and §2 of `docs/CONTENT_DOCTRINE.md` if any named constant moves.

### E2: Force placement

- **World data:**
  - A `ZoneId` schema, and about 12 `maritime-zones` (lon/lat polygons).
  - Sourced `lat`/`lon` per installation in `us-basing.tsv`. Composite rows are split into separate installations, or marked `zone-level`.
  - Validator checks: each anchor falls inside its host polygon or zone, with a coastal tolerance.
- **Engine:**
  - `CommitmentLocation.theater` becomes `ZoneId`. Its only writer is `basing.ts:110` and its only reader is `basing.ts:148`.
  - The two engine-written strings (`basing.ts:57`, `:65`) map to their zones in the save migration. That widens the readable window rather than refusing old saves.
  - Player and joiner deployments get a location when committed: the target's zone, or the belligerents' zones for a conflict target (`commitments.ts:655`).
- **player-core:** `geo/force-placement.ts`.
  - Command areas are computed live from assignments, including `aorOverrides` (`combatant-commands.ts:140`).
  - Functional commands have no area.
  - Seeded slots inside zones; clusters by zoom.

### E3: Federal sites and state capitols

- **Federal sites:** a sourced HQ point for every engine institution that has one. An institution without one records `location: none` with the reason; a location is never inherited.
- **State capitols:** 50 plus DC.
- **Validation:** each point falls inside its state, and every cabinet department has a site.
- **Timing:** this is research-heavy and only needed by Washington, so it lands just before W6.

### E4: Incident places

Every condition, claim, mark and emergency resolves through one `placeOf(item)`. Its precedence is city, then the state's largest city (keeping the existing `placeCondition` behavior, so one state never has two points), then nation. A gate fails anything pinnable that has no place.

### E5: Decision places, reusing the existing locus

- **The existing resolver.** `packages/content/src/scenario-locus.ts` (`resolveLocus`) already gives every scenario a place, and `player-core/src/conversation/scenario-cases.ts:76` stores it. There is no new resolver.
- **The defect.** 260 of the 322 scenarios resolve to DC or to a random offset from it. That includes "interior" sites that land in Virginia, Maryland or the Atlantic.
- **The fix, in two parts:**
  1. In code: US-area sites resolve to a seeded state (or a city in it) instead of an offset from DC.
  2. In content: backfill an authored state wherever the story names or implies one, done in the content workflow (`content-lead` → `scenario-writer` → review).
- **Gates:** the content gate counts scenarios whose place is DC only because of a fallback, and that count ratchets down.

### E6: Missing player-core selectors

Each is built in the wave that first needs it:

- Bill whip count, from delegation dispositions.
- Floor schedule.
- Covert, collection and assessment readings.
- Impact reports.
- The six-judgment opinion breakdown.
- Bilateral trade partners.
- Policy portfolio by domain.
- Order pipeline.
- Appointment candidate shortlist.

A judge's vote record is shown only if the engine models one.

### E7: Presentation copy

The label maps in player-core are reviewed per wave: vocabulary a new screen uses stays, and unused copy is deleted. The glossary content under `guidance/library/` is **kept as data**. It moves to `player-core/src/glossary/` and feeds search and inline term links.

## W0: relocate first, then delete

Deletion only happens after everything that kept code or data depends on has moved. Each step is its own commit.

**W0a: relocate**

1. **Source data out of `docs/audits`.**
   - Move the leader tables (`docs/audits/2026-09-23-leader-table/`) and every provenance file the world seeds cite (`forces-sources.md`, `dyads-sources.md`, the election-calendar source) to `packages/world/sources/`.
   - Re-point `verify-leader-fidelity(-proof)`, `vendor-nation-leaders` and every seed citation.
2. **Navigation.**
   - Add `player-core/src/navigation/places.ts`, the new route tree's typed destinations.
   - Re-key the 14 desk and summons modules that build hrefs from `shell/rooms` (`desk/attention*.ts`, `family-*.ts`, `condition-route.ts`, `summons/compose.ts`, `rows.ts`, `types.ts`), plus `shell/subject.ts` and `obligation-doors.ts`.
   - Update the barrel `player-core/src/index.ts`.
3. **Glossary.** Move `guidance/library` to `glossary/`. Drop its room-keyed fields.
4. **Generated assets.** Move flags and the icon set to their new home in the rebuilt ui-web, and re-target `bake-nation-flags`, `bake-state-flags`, `vendor-nation-flags` and `verify-world-coverage`.
5. **Tokens.** `@admin/design` keeps exporting `color` (used by `player-core/src/format/party-color.ts:2`) until W3 replaces the tokens.
6. **Capability ledger becomes due-by-wave.**
   - Each row carries the wave it must be reached in, keyed by function plus its discriminating parameter (instrument and rung for `issueAction`, kind for `engagementPacket`, and so on).
   - `verify-engine-reachability` is rewritten to read call sites (not import names) and to fail only on rows past their due wave. This follows the model of `pin-ledger.json`.

**W0b: delete**

1. **Player code:** `apps/web/src` (replaced by an empty shell: `main.tsx`, router, frame; `vite.config.ts` no longer imports `src/build`), `apps/web/e2e` and its artifacts, the style-diff config, the old `packages/ui-web/src` components and CSS.
2. **player-core:** `shell/rooms.ts`, `route-table.ts`, `route-manifest.ts`, `return-path.ts`, the rest of `guidance/`, and their tests.
3. **Gates and scripts:**
   - Delete the Grail sync, derive lib and gate pair; the journeys sync, lib and gate pair; `verify-decision-legacy`; `verify-no-legacy-runtime` and its proof twin; `verify-screen-truth`; `verify-image-provenance`; `bake-os-icons`; `scripts/dev/shoot-rooms.mjs`.
   - Edit `verify-file-size` (drop the deleted allowlist names), `verify-css-architecture`, `verify-icon-registry` and `verify-unused-primitives` (re-pointed to the new system; their baselines reset in the same commit, with the reason recorded), `verify-american-spelling` and `verify-no-silent-skip` (new default target).
   - `make-fixture-saves` writes to the new e2e fixture path.
   - The Playwright run uses `--pass-with-no-tests` until W3.
   - The root `play` script and `rebuild-ci.yml` are updated.
4. **Docs and history:**
   - **Delete:** `docs/_archive/`, every folder under `docs/audits/` except this program's, `docs/grail/`, `docs/PATTERNS.md`, `docs/specs/`, `docs/PRDs/`, and `design/` except `brand-kit/logos` and `brand-kit/icons`.
   - **Consolidate:** first move the still-valid rules from `docs/ADRs/` and `docs/RFCs/` into a fresh `docs/DECISIONS.md`, written as current rules. Then delete both folders. The W0 gate record maps every deleted record to where its rule went, or says "obsolete".
   - **Rewrite:** `NORTH_STAR.md`, `ARCHITECTURE.md`, `SCHEMA.md`, `STRATEGY.md`, `ABOUT_THE_GAME.md`, `DOC_SYNC_MAP.md`, `CONTENT_DOCTRINE.md` and `IMAGE_GENERATION_SPEC.md` references, `README.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `CLAUDE.md`, `.claude/agents*.md`, and the skills that cite deleted paths (`player-tips`, `dispatch-editorial`, `game-art-direction`).
   - `scripts/run.sh` and `scripts/README.md` cite `DECISIONS.md`.
5. **History references in code.**
   - Remove mentions of the earlier playable nation and the pivots from source comments and data comments.
   - Add `scripts/verify-no-history-references.mjs`. It holds a word-boundary denylist over code and live docs.
   - It exempts the name banks (real surnames such as "Marong"), and the save store's deliberate refusal of pre-rebuild saves (`save-store.test.ts:313`).
   - Its bead-id pattern must not match `admin-app` or content set ids such as `admin-2026w34`.
6. **Backlog, plan, pins, memory.**
   - `docs/PLAN.md` drops the previous program's wave table entirely in the same commit. `verify-wave-closeout` matches gate folders by wave name, and the previous program also used W0–W4. With both tables present, it would read this program's folder as the old register and report the old waves' records missing.
   - Checked 2026-10-10: the gate passes today against the old table.
   - Close the superseded UI items (BL-57, BL-59, BL-4, BL-56 and the room-specific items), each with its reason.
   - Reset `pin-ledger.json` to this program's waves W0–W9.
   - Write `docs/PLAN.md`'s wave table.
   - Prune history memory notes, keeping only the working rules.
7. **Tests.** The 70 root test failures inherited at the start are each pinned with a due wave, or fixed. W0 adds no new failure.

**W0 proof:** build, typecheck, lint, tests (pinned failures only), and every verify gate. A gate whose subject no longer exists is listed with its due wave, never deleted silently. `dist/` is rebuilt and committed. The gate record is written.

## Waves

| Wave | Scope | Proof |
|---|---|---|
| W0 | Relocate, then delete; history purge; empty green shell | As above |
| W1 | **Map spike** (runs first): bake levels of detail, projection blend, cached-bitmap flights, id-buffer picking, dynamic dots (pitch by zoom and viewport, sub-grid, centroid guarantee, octave crossfade), proportional dither, on a `/dev/map` harness. **In parallel, engine:** E1, E2, E4, and the E5 code half. | Spike: frame times on a 4×-throttled phone profile and desktop, against the budget; go or fallback decided and recorded. Engine: unit tests, migration, balance harness, doc sync. |
| W2 | Map engine productized: camera (route-derived, motion rules, insets, Alaska and Hawaii insets), lenses (effective level, hex House, palettes), detachment, marks (clustering, roving focus), force placement, accessible lens list | Unit tests for the resolver, framing and dither; live checks at every size |
| W3 | Design system and shell: tokens, type study, primitives (AppFrame, TopBar, ModeNav, WorkSurface with detents, Stat, Series, CompareAuthorize, Gauge, PartyBar, Hemicycle, Portrait, Flag, Icon, Button, Field, Receipt), search with glossary; title, founding, administrations, settings, recovery | A campaign starts at every size |
| W4 | Brief and the decision loop (first playable): Continue, digest, decision, scandal, metric; first-run walkthrough; delta lens | The full loop from Brief through authorize, receipt and Record on phone and desktop |
| W5 | Nation: state detachment, lenses, economy, budget, policy and orders, emergency (E6 portfolio, pipeline) | State and district detachment; lens levels |
| W6 | E3 data, then Washington: executive tree, office, person, press office, Congress, courts, oversight (E6 whip, floor, shortlist) | Office HQ zoom; Senate and House lenses |
| W7 | World and security (E6 trade, covert, collection, assessments), force clusters | Organization, war and command set detachment |
| W8 | Record, ending, legacy; the E5 content backfill | Event pulses and delta lens; finale electoral lens |
| W9 | **Visual pass:** filled ground with dots on focus; marks and cards ride the camera in flight; seam-split targets crossfade; map cards (`MapCard`) with a phone rail; readings by kind (Trend, Ring, Strip, slim meters) replacing bar lists; Spatial panels that leave the map room | Renderer and placement unit tests; primitives tests; live checks at 390×844 and 1440×900 with before and after screenshots; flight frames sampled to show pins moving every frame; 4×-throttle frame times on `/dev/map` and `/world` |
| W10 | Parity and acceptance | Capability ledger: every row reached or explicitly dropped. Full task suite at every size. axe. Reduced motion and transparency. Forced colors. Final `DESIGN.md`. Merge `staging` in, then `--no-ff` into `staging`. |

Each wave closes out under CLAUDE.md:

1. Write `gates/<wave>.md`.
2. Advance `currentWave` in the pin ledger.
3. Record one status in `PLAN.md`.
4. Reconcile `BACKLOG.md`.
5. Merge `staging` into the branch.

## Load-bearing choices, challenged

| Choice | Strongest failure | Best alternative | Verdict |
|---|---|---|---|
| Delete first on one long branch | Capabilities vanish; the game is unplayable for several waves | Build beside the old app and cut over | **Accepted with controls:** relocate before delete; due-by-wave capability ledger keyed by variant; playable by W4; no merge to `staging` before W9 |
| Runtime-projected canvas | Phone jank; vertex cost during flights | Pre-baked plate with an affine camera | **Needs validation:** W1 spike first, before the design system builds on it; the fallback is a declared degraded camera contract |
| Derived state approval | Disagreeing with the headline or the electoral map; reading as a fake poll | A full per-state opinion simulation | **Accepted with controls:** logit offset solved by bisection; the same alignment term as `callMap`; call shown beside it; no district figure; display-only |
| Seeded force slots | Markers mistaken for real positions | Authored points for everything | **Accepted with controls:** only sourced anchors draw as exact; slotted units are zone markers |
| Delete every ADR and RFC | A valid rule is lost | Keep them archived | **Accepted with controls:** `DECISIONS.md` first; a deletion map in the W0 gate; git keeps the originals |
| Map behind all work | Decoration and noise behind numbers | Map only on geographic screens | **Accepted with controls:** screen classes; Workspace pauses the map; panels are opaque |
| Filled ground instead of a dot lattice (W9) | It reads as a generic choropleth and loses the dotted identity | A sparser, dimmer lattice | **Accepted with controls:** dots kept for the selection's lift, mixed values and tiny regions; the title globe stays dotted; sea-colored seams |
| Cards laid on the map (W9) | Clutter that covers the place it points at; nothing room for on a phone | Panel only | **Accepted with controls:** three at most, kept off pins and each other, clamped to the visible map, a rail on phones, a panel twin for every card |
| Skip W7/W8 screenshot regeneration | The gate records lose their visual proof | Regenerate now | **Accepted:** W9 replaces those visuals and records its own before and after |

## Verification

```bash
find . -name tsconfig.tsbuildinfo -not -path '*/node_modules/*' -delete
pnpm run build && pnpm run typecheck && pnpm run lint && pnpm -r --no-bail run test
for g in scripts/verify-*.mjs; do node "$g" || echo "FAILED: $g"; done
pnpm --filter @admin/engine run test:balance
pnpm --filter @admin/web run test:e2e
```

- **Live checks:** run against a real campaign at 320, 390×844, 768, 1280×800, 1440×900 and 1920×1080:
  - Framing inside the visible area.
  - Dot size responding to zoom, viewport and region size.
  - Small regions visible and pickable.
  - Lens recolor at each level, with dither and the hex House.
  - Detachment.
  - Office HQ zoom.
  - Set detachment.
  - Force clusters.
  - Back behavior.
  - Sheet detents never hiding the verb.
  - Workspace map pause.
  - The full decision loop.
- **Performance:** traces at 4× CPU throttle.
- **Proof:** screenshots in each gate record.

## Parking lot

- **Members of Congress as named people.** The House is aggregate per state and senators are party-and-disposition seats today. This is its own engine program.
- **Live regional economy.** States use their authored anchors against the national economy.
- **Acts the engine doesn't model:** travel, addresses, pardons, summits. Each would be a future engine feature.
- **The latent chokepoint `connects` token mismatch** (`packages/world/src/dataset/geography.ts:19`), which nothing reads.
