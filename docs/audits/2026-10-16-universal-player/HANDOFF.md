# Universal player: handoff to local work

## Local continuation, 2026-10-16 (read this first)

Branch `codex/reconcile-worktrees-2026-10-14`, everything committed, nothing pushed. Gate record: `gates/local-continuation.md`. The plan: `docs/PLAN.md` (top two sections). The next program: `docs/audits/2026-10-16-control-plane/PROGRAM.md` (BL-171 to BL-211).

**Run it.**

```bash
pnpm install
pnpm --filter @admin/player web      # copies the MapLibre worker, then expo start --web; open http://localhost:8081/dev/seed
node scripts/make-fixture-saves.mjs --out <dir>   # far-along saves for screens the seed leaves empty (slow; import them with the app's Import control)
```

`/dev/seed` replaces its own previous preview, so repeated visits do not fill the five save slots. A direct URL load of a deep route can redirect, so after the seed lands, navigate by clicking, or run `history.pushState({}, '', '/nation'); window.dispatchEvent(new PopStateEvent('popstate'))` in the page.

**How to verify UI work.** The cloud session only checked a served production export, which hid dev-server defects. Check on the dev server, with a private-profile headless Playwright run (copy the script into `apps/web/` so `playwright` resolves, then delete it) that loads `/dev/seed`, visits the routes and prints console errors (React warns once per message, so reload before counting). The overlap detector and the width set (390, 768, 1066, 1440) are in the sweep brief pattern: bleed, text overflow, intersecting siblings, plus a screenshot you actually look at. Launch Chromium with `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` when a page needs WebGL.

**Gotchas that cost time.**
- Metro does not re-resolve a module that gains a `.web` variant next to an existing file until the dev server restarts (restart with `preview_stop` and `preview_start`).
- Tamagui 3 rejects `true` as a token key in development. An engine re-export inside an import cycle crashes React Refresh. React Native accessibility and responder props reach the DOM unless the component has a web file that avoids them; `react-native-svg`'s web build overwrites a shape's `onClick`.
- The Hill snapshot (`hill-ledger-golden`) passes on Node 22 and differs on Node 24. Use `/opt/homebrew/opt/node@22/bin` for that test.
- Delete every `tsconfig.tsbuildinfo` before a build you intend to commit; never run `typecheck` before `build` when committing `dist/`. A killed `git commit` can leave a zero-byte `.git/index.lock`; check no git process runs before deleting it.
- Several agents share one tree: one writer per file, no builds from agents, the lead gates once and commits by path with `git commit -o`.

**What changed since the handoff below.**

| Area | State | Where |
|---|---|---|
| Nation | rebuilt: map stage, docked state panel, states managed in place and several at once, section nav | `apps/player/src/nation/home/`, `src/batch/`, `src/map/`, `packages/ui/src/layout/` |
| Person dossier | rebuilt as one identity header with readings, actions and tabs | `apps/player/src/dossier/` |
| Whole-card targets | `CardLink`, `PressRow`; about 100 conversions; `rowPress` on `SortTable` and `DataTable` but no caller yet (BL-213) | `packages/ui/src/primitives/`, every screen directory |
| Full-slots chooser | oath, import and the title screen never dead-end | `apps/player/src/saves/`, `player-core/persistence/slot-replacement.ts` |
| Classification | banner and strip on every screen; one screen sets a level (BL-212) | `apps/player/src/shell/classification.tsx`, `packages/ui/src/shell/` |
| States management | relationship, needs you, acts, filters | `player-core/world/state-relationship.ts`, `nation/home/` |
| Plain language | screens, shared UI, composed messages rewritten; glossary and registry only mechanical so far (BL-214) | `docs/CONTENT_DOCTRINE.md` 10.2, `skills/player-tips/SKILL.md`, `scripts/verify-player-prose.mjs --plain` |
| BL-161 | engine cases and Attorney General referral committed; the control is still to be rebuilt in `apps/player` | `packages/engine/src/intel-authority.ts` |
| Map | live MapLibre on `/nation` and the state page; other screens still show lists | `packages/ui/src/map/`, BL-181 to BL-190 |

**Next steps, in order.**
1. Run the Not run list in `gates/local-continuation.md` (BL-220) and pin the test runtime to Node 22.
2. Wire classification into decisions and intelligence (BL-212) and pass `rowPress` from the six tables (BL-213).
3. Plain-language pass over the glossary, the Handbook and the registry, then place haiku (BL-214), then the wording leftovers (BL-215, BL-216).
4. Start the control plane: CP1 in PROGRAM.md (one review path BL-171, the Plan model BL-172, tariffs on several goods and forces to several countries). Decide the owner questions in section 9 as each wave needs them.
5. Break the require cycles (BL-219) and clear the layout leftovers (BL-218, BL-217).

---

## Original handoff from the cloud session (2026-10-16, before the local work above)

Written 2026-10-16 when the cloud session stopped at the owner's request. Branch `codex/reconcile-worktrees-2026-10-14`; everything is committed and pushed. Local and remote were identical when this was written, with one worktree, no stashes and no other branches.

## Start here

```bash
git fetch && git checkout codex/reconcile-worktrees-2026-10-14 && git pull --ff-only
pnpm install                      # see "Install" below
pnpm --filter @admin/player web   # the Expo web app; /dev/seed seals a sample campaign and opens the Brief
# (the stray apps/player/src/map/.verify folder has been deleted)
```

The plan is `PROGRAM.md` in this folder (wave ledger UP0-UP11). The rules are DECISIONS §8.1-§8.12. The legacy player (`apps/web`, `packages/ui-web`) is frozen until `apps/player` reaches route parity.

## Install

The lockfile pins `@electron/node-gyp` to a GitHub tarball that the cloud network refused. The root `package.json` therefore carries `pnpm.overrides` for it (`10.2.0-electron.2` from the npm registry), plus one React for the whole workspace (19.3.0, what Expo SDK 58 pins). Locally you can keep both; drop the node-gyp override only if you can reach codeload.github.com, and then regenerate the lockfile.

## What is where

| Area | State | Verified how |
|---|---|---|
| Decisions, boundary gate, theme, shell, title (UP0) | landed, `gates/up0.md` | build, typecheck, lint, 87 of 89 gates, browser captures |
| Brief, Continue, decisions, presidential review, scandal, clock screens (UP3) | landed | answered the lead decision and the scandal it raised; Continue then moved the date 5 days (browser, 390 and 1440) |
| Founding, Settings, Administrations (UP3) | landed | founding to Brief and a reload restored the save (browser) |
| Calendar, inbox (UP4) | models and screens landed; device reminders not wired | unit tests; inbox and calendar opened in the browser |
| Authority registry, "The law" chapter, citation sheet (UP5) | landed | `verify-authority-citations` plus its proof; 65 records |
| Handbook, Executive, offices, person dossiers (UP5) | landed | dismissing a Secretary through review to receipt (browser) |
| Congress, courts, oversight (UP5) | landed | transmitting a bill through review to receipt (browser). Sign/veto, case screens and roll calls not exercised |
| Emblems (UP6) | landed, 129 bodies, 18 mastheads | `verify-seal-coverage` plus its proof; contact sheet |
| Comparison model (UP8) | landed (`player-core/compare`, 21 tests) | unit tests |
| News, press desk, Record, ending, legacy, recovery, More (UP9, UP10) | landed from the agent's report; the last follow-ups (title link to recovery, `/more` inside the game frame) are applied | agent ran the press flow end to end in the browser; I did not re-run it |
| Nation, Compare workspace, World, security (UP8) | **work in progress, not reviewed** (agents stopped mid-work) | typechecks and lints; no review, no browser pass by me |
| The map: MapLibre web and native, lenses (UP7) | **work in progress, not reviewed** | typechecks; native only ever bundled, never run |

Not built: UP1's moves into player-core (several pure helpers sit in `apps/player/src` and are listed in the agents' reports as candidates), maps wired into any screen (each screen has a `MapPanelSlot` or a list in its place), the Compare route in the navigation, a `Portrait` and `Flag` primitive in `@admin/ui` (screens use monograms and icons), device reminders, UP11 cut-over (Electron still loads `apps/web/dist`).

## Check status

Run on the committed tree: `verify-renderer-boundary` (+ proof), `verify-file-size`, `verify-american-spelling`, `verify-adhoc-color-lint`, `verify-player-prose`, `verify-seal-coverage`, `verify-authority-citations`, `verify-icon-registry`, `verify-unused-primitives`, `verify-css-architecture` and `verify-dist-freshness` pass. `verify-no-history-references` passes (a stray compiled folder, `apps/player/src/map/.verify/`, was deleted). `pnpm run typecheck` and `pnpm run lint` passed for the whole workspace before the last wave; `apps/player` typechecks and lints clean now.

**Never completed:** the workspace test aggregate and the full proof-gate sweep after the second wave (the background run hit its 30-minute limit; the tree was also changing under it). Run the checkpoint from CLAUDE.md before trusting the branch: delete every `tsconfig.tsbuildinfo`, `pnpm run build`, typecheck, lint, test, every `scripts/verify-*.mjs`, then commit `dist/` and rerun `verify-dist-freshness`. The balance harness was not run and need not be: no engine numbers changed except the display landmarks in `benchmarks.ts` (BL-164, closed).

## No device has run this

The cloud container had no simulator. iOS and Android are checked by typecheck only so far; `expo export --platform ios --platform android` has not been run. MapLibre native needs an Expo development build (not Expo Go). The SQLite vault, notifications and gestures are untested on a device. Do that first locally.

## Live previews (private to the owner's account)

Two artifacts were published: the interactive build (title, sample administration, calendar, catalog) and a gallery of captures. They are snapshots; they do not update from git.

## Next steps, in order

1. Run the checkpoint above and fix what it finds.
2. Review the unreviewed work (Nation, Compare, World, map) the way the other waves were: typecheck, lint, tests, then drive each screen at 390 and 1440. `/dev/seed` gives a campaign; `scripts/make-fixture-saves.mjs` makes richer ones (an empty feed needs it).
3. Build the shared `MapView` into screens, replacing each `MapPanelSlot`; mount `PresidentialReviewProvider` once in `app/(game)/_layout.tsx` and replace the Congress review seam (`src/congress/review-seat.tsx`) and the executive and news review sheets with `@admin/ui/review`.
4. UP1 moves, a shared `Portrait` and `Flag`, the Compare route in the navigation, device reminders.
5. `expo export` for iOS and Android, then a dev-client run on a phone and a tablet; then UP11.

## Open findings

BL-165 (engine citation wording), BL-166 (verify the registry's source links by hand; the cloud could not fetch them), BL-167 (Russia's baked outline is split across the antimeridian), BL-168 (choice projection runs on the main thread: about 110 s for four weeks in a browser), BL-169 (decision follow-ups). All in `docs/BACKLOG.md`.
