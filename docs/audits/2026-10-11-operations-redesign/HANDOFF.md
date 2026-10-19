# Handoff: operations redesign, written 2026-10-11

> **Current takeover rule — 2026-10-12:** This is historical evidence, not current visual acceptance. The owner requires application-wide visual-first layers, consistent help, target-only expansion, selectable themes and presidential review/processing. The current contract is `docs/audits/2026-10-11-simulation-depth/PROGRAM.md`, “Application-wide visual layers and presidential interaction,” and its handoff/BL-136/137. Light-only styling, previous polish claims, mandatory tool/agent assignments and bulk-first validation instructions here do not override that contract. Build with short local checks and batch expensive final validation; keep all work local with no additional cost. Historical counts/screenshots must be rechecked before use as current evidence.


For a fresh session picking up the redesign on `feat/map-first`. Read this, then `README.md` (decisions D1–D9 and wave status), `CONTRACT.md` (the binding visual and interaction rules, including the owner's "Quick-read cues"), `findings.md` and `BRIEF.txt` (the owner's brief, verbatim).

## Where things stand

- **Branch** `feat/map-first`, HEAD `896234467`. **Nothing from this redesign is committed.** About 350 files differ from HEAD (plus tracked `dist/`). The pre-redesign working tree (the MapLibre rebuild, BL-98) is pinned as `refs/safety/pre-ops-redesign-2026-10-11`; diff against it to see only this redesign's changes: `git diff refs/safety/pre-ops-redesign-2026-10-11 -- apps packages scripts docs`.
- **Owner decisions this session:**
  - Shell = the brief's version (map only where geography helps). Recorded as DECISIONS §8.8 and README D1.
  - "Skip these gates and continue with the UI/UX changes": gates were deliberately not run after the first integration.
- **Last verified state:**
  - A clean build passed after the screen agents integrated: `pnpm run build`, then the web build after one case-collision fix.
  - `pnpm run typecheck` passed at the same point.
  - `pnpm run lint` last passed before the screen restructures.
  - The unit suite and verify gates were started and stopped at the owner's request, so their result is unknown.
  - Changes made after that typecheck (polish agents, lead fixes) have not been typechecked.
- **Dev server:** `player-web` launch config, port 5173. `apps/web` reads `packages/player-core` from `dist/`; rebuild it (`pnpm --filter @admin/player-core run build`) after any player-core edit or the browser shows stale behavior.

## What was built (by area)

- **Tokens** (`packages/design`):
  - Light canvas and white surfaces, with a navy chrome scope (`data-surface="chrome"`) and a dark map scope (`data-surface="dark"`).
  - Status ink/fill pairs, a 3px focus ring, and 4px/8px radii.
  - Source Sans 3 (400/600/700) and Source Serif 4 (400/600). Geist and Archivo are removed.
  - `color.test.ts` and `parity.test.ts` were rewritten and pass (19 tests).
- **Shell** (`packages/ui-web` `SideNav`, `AppFrame`, `WorkSurface`; `apps/web/src/shell`):
  - Grouped navigation in four forms: 224px full list at 1440 and up, 88px labeled rail at 1024, drawer at 768, phone bar with More.
  - The map is shown only on `spatial` screens; `hybrid` is retired.
  - Phone spatial screens get a Details/Map switch. The masthead keeps the short date and the reason time is held down to 320px.
  - Chrome insets are measured relative to the map box (`chrome-insets.ts`).
- **Shared parts:**
  - `Tabs` (a WAI tablist; the screen keeps its view in `?view=`).
  - `Collection` (a visible "N of M" count with Show all).
  - `Document` (a paper instrument with numbered sections).
  - `cues.css`: good/watch/bad valence tones and `data-valence` utilities.
  - Whole-row targets: `ui-card-door`/`ui-card-door__link` and `ui-row-target`/`ui-row-link`, one rule in `doors.css`.
  - `apps/web/src/shell/valence.ts` (`toneOf`/`valenceOf` from `MetricStance`).
  - Tag tone `good`.
  - Domain glyphs (`assets/icons/custom/`, `apps/web/src/shell/glyphs.ts`, gallery at `/dev/icons`).
- **Authorize:** `apps/web/src/app/use-authorize.ts` (single flight; stale by time vs by another act; applied-but-unsaved; never navigates) replaces nine copies, with 7 tests.
- **Screens:** every family was restructured to brief §12; what each agent did is summarized in `README.md` R3/R4.
  - Restored from the unmerged `w8a-record` commit `dfb54f58d` by file copy, not merge: `/record/press`, dispatch, `/ending`, `/legacy`, and their player-core selectors. Do **not** merge `w8a-record` now; it would conflict with these copies.
- **Owner feedback round (polish):** the owner reported:
  - sloppy areas;
  - headings-only click targets;
  - too few good/bad cues;
  - overlaps and misaligned tables.

  Five polish agents applied `CONTRACT.md` "Quick-read cues" with visual checks. See "In flight" for which finished.
- **Tool:** `scripts/dev/shoot-screens.mjs --out <dir> --fixture <name> --sizes 1440x900,390x844 <routes>`. It imports a fixture save into a fresh browser, writes PNGs (multi-part for long pages) and reports page overflow, surface overflow and section spills. Use it for every visual check.

## In flight when this was written

All five polish agents finished. None of their edits has been typechecked. Before anything else:

1. Run `pnpm run typecheck` (after a build). Fix what their edits broke.
2. Shoot their screens with the tool above (fixtures: `washington-chairs`, `senate-50-50`, `court-challenge`, `week-30`, `domestic-flood`, `failing-cr`) and finish anything half done.

Finished polish: Desk/decisions/Record/entry, World/security, Congress/courts (40 tests), domestic (22 tests) and executive/oversight/press (61 tests, `src/washington` + `src/shell`). Their PNGs were in the session scratchpad and are not kept.

## Next, in order

1. **Integration fixes the World agent flagged:**
   - `.nation-room` (in `nation/economy/economy.css`) needs `grid-template-columns: minmax(0, 1fr)` globally, so wide content can't widen a screen.
   - The dossier vitals grid leaves an empty cell for odd counts (`shell/dossier/dossier.css`).
   - Consider a compact `Tabs` variant (the World agent overrode padding locally).
   - Move `moveValence`/`MoveText` from `brief/matter-words.tsx` into `shell/valence.ts`.
   - `Tabs` strips are wider than the surface at 390: make the strip scroll cleanly with a visible edge, or wrap.
   - `Collection as="tbody"` renders its foot as a tall empty bordered row (state delegations table); give it a table-aware foot.
   - `.ui-gauge` wraps label and value to 2–3 lines in narrow cells; stack it under about 20rem.
   - Promote the Congress agent's stacked-table rule (`grid-template-columns: 7.5rem 1fr` with multi-child cells in column 2, in `washington/congress/tables.css`) into `packages/ui-web` as the shared phone table rule.
   - `Stat`'s delta arrow is hard-coded blue up / red down (economy overrides it in CSS); give it a tone or `better` prop. `Series` has no tone prop.
   - The map logs "Invalid value for edge-insets" on state routes (likely `chrome-insets.ts` producing a negative or NaN inset now that insets are map-relative); check `apps/web/src/map/gl/use-gl-sync.ts` fitCamera inputs.
   - Not yet seen in the browser: a declared emergency card, the selected-incident response panel, a signed order with `ActDone`, `LocaleActDesk`, `LocaleReceipt`, `EmergencyActs`.
   - `Radar` has no good/watch/bad tone, and its axis labels collide with corner markers ("Ambition" clipped on the person page).
   - `BandDial`/`ShareDial`/`LeanDial` (`washington/card/PersonCard.tsx`) accept only `reading | risk`; give them the valence tones and update their callers in Congress, courts and cabinet to pass a stance instead of an `adverse` boolean.
   - A `<button>` cannot be a `ui-row-link` (the shared rule lifts buttons above the stretched link); Oversight's priority rows use an `li` click handler instead, which needs a keyboard check.
   - Two screens had their own `.pipeline` class colliding with Congress's global one (renamed `order-board` and `inquiry-pipeline`); grep for other unscoped room classes shared across screens.
   - Agenda proposal vote lines have no color because player-core's act comparison gives `cells.count` no stance.
2. **Lead walk:** every route at 1440 and 390 with the tool, against `CONTRACT.md`.
3. **e2e specs:** several are stale because agents renamed headings, removed lenses and moved content into tabs. The affected specs are `washington.spec.ts`, `washington-press.spec.ts`, `washington-congress.spec.ts`, `washington-courts.spec.ts`, `legislative-agenda.spec.ts` ("Show N more" is now "Show all N"), `nation-policy.spec.ts`, `nation-economy.spec.ts`, `world*.spec.ts`, `record.spec.ts` (rewritten, never run) and `founding.spec.ts` (nav is now named "Main"). Delete the scratch `apps/web/tests/baseline-capture.spec.ts`.
4. **Gates, in CLAUDE.md order:**
   1. Delete every `tsconfig.tsbuildinfo`.
   2. `pnpm run build`.
   3. `pnpm run typecheck`.
   4. `pnpm run lint`.
   5. `pnpm -r --no-bail run test`, serially.
   6. The `scripts/verify-*.mjs` loop. `verify-american-spelling` already fails on "programme" at `docs/BACKLOG.md:194`; that failure predates this work.
   7. e2e at six widths, in the background.
   8. Commit regenerated `dist/`.
5. **Docs:**
   - Rewrite `docs/DESIGN.md`. It still describes the persistent dotted/MapLibre map, the navy canvas, Geist/Archivo and the 640px panel. Use README D1–D9 and `CONTRACT.md` as the source.
   - Update `docs/ARCHITECTURE.md`'s player section for the new shell and `use-authorize`.
   - Close findings in `findings.md` with evidence.
   - Capture `after/` screenshots for every route.
6. **Commit:** commit with explicit paths (`git commit -o <paths>`, never `git add -A`, never stash). Commit unsigned and with no AI trailers. No push unless the owner asks.

## Known open items

- **F15:** drafts are still component state and are lost on reload.
- **F11:** the Alaska and Hawaii insets drew land on the US home after the inset fix. That was seen once and is not re-verified.
- **Map overlays:** mover cards overlap map labels on the World view (`apps/web/src/map/**`, not touched by the redesign).
- **Fixture data oddities, not layout:**
  - Legacy shows "4718%".
  - nato-call shows NATO members "At war".
- **Unverified:**
  - the founding Short/Long cards are not whole-card clickable;
  - the courts multi-seat nomination batch has not been browser-tested;
  - "Official notice" is the Record agent's own genre rule, so confirm it with the owner.
- **BL-98** (MapLibre steps 3–6) is still open, under the map-first program.
