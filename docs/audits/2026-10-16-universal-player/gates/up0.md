# UP0 gate record — 2026-10-16

**Status: landed.** Base `2960f2b01` (the branch fast-forwarded to it; the previous head is pinned at `refs/safety/pre-universal-player-2026-10-16`).

## What landed

- **Decisions.** DECISIONS §8.1, §8.2, §8.5 and §8.8 were rewritten for the universal player, and §8.10–§8.12 added (authored emblems, classification markings, cited law). NORTH_STAR, CLAUDE.md, ARCHITECTURE, DOC_SYNC_MAP and the agent specs were updated to match.
- **Gates.** `scripts/verify-renderer-boundary.mjs` and its proof twin replace `verify-web-boundary.mjs`, which had no proof. `eslint.config.mjs` gained blocks for `packages/ui` and `apps/player`: restricted imports, and no raw hex outside the theme.
- **Stack.** Expo SDK 58.0.11, React 19.3.0 (one copy, through root `pnpm.overrides`), React Native 0.88.0, Tamagui 3.0.17.
- **Install workaround.** `@electron/node-gyp` is pinned to the npm release `10.2.0-electron.2`, because the lockfile's GitHub tarball (codeload.github.com) is refused by the cloud network policy.
- **`packages/design`.** Added the classification banner set, the situation-room set and dimmed paper (`tokens/classified.ts`, with contrast tests). The product mark geometry moved here from `ui-web` so both players share it.
- **`packages/ui`.**
  - Theme adapter from `packages/design`, plus a platform-split animation driver.
  - Primitives, the icon registry ported to phosphor-react-native, BrandMark, AppShell (tab bar, rail, labeled navigation), Page and Sheet.
  - The first UP2 components: Stat, Sparkline, Meter, BenchmarkChart, CompareMatrix, Document, ClassificationBanner and PortionMark, LegalCitation, HelpButton, EntityLink and RelatedRail.
- **`apps/player`.** Expo Router app containing:
  - device storage (expo-sqlite kv-store on native; IndexedDB or the desktop bridge on the web);
  - the preference and campaign providers, ported from the legacy `app/` folder;
  - theme resolution (System, Light or Dark, plus high contrast);
  - the title screen, the game frame and a placeholder Brief;
  - `/catalog`.

## What was run

| Check | Result |
|---|---|
| `pnpm install` (after the node-gyp pin) | ok; `node_modules/react` is 19.3.0, one copy |
| Clean build: deleted every `tsconfig.tsbuildinfo`, then `pnpm run build` | exit 0 |
| `tsc --noEmit` for `packages/ui` and `apps/player` | clean |
| `eslint` for `packages/ui`, `apps/player` and `apps/web/src` | clean |
| `vitest` for `packages/ui` (rank, ordinal, scale) | 14 passed |
| `vitest` for `packages/design`: `classified.test.ts` | 3 passed |
| `node scripts/verify-renderer-boundary-proof.mjs` | 7 planted leaks refused, the allowed set passes, and the real tree passes |
| Every `scripts/verify-*.mjs`, run before commit | 87 of 89 passed. `verify-dist-freshness` and `verify-no-history-references` failed only because the new dist/ and audit folder were not yet committed; both are rerun after the commit below. |
| `expo export --platform web` | 3,029 modules bundled |
| Playwright on the served export, at 390×844, 1440×900 and tall captures | title, frame and catalog render with no console errors; captures are in the build log artifact |

**Not run, and why.**

- `pnpm run test` across the workspace and the balance harness were not run: there was no engine change, and the owner's cadence puts bulk sweeps at integration checkpoints (UP3).
- The iOS and Android bundles and a device run were not done. Bundling starts at UP3, and no simulator exists in this container.
- The legacy `apps/web` Playwright suite was not run; the only web change is the React version and the BrandGlyph import, and `apps/web` built cleanly under 19.3.

## Found

- **Tamagui v3 dialect:** bare token and theme names, conditional states as objects, and `focus-visible` as a state key. Recorded in PROGRAM.md and CLAUDE.md.
- **Expo Router.** It treats `src/app` as the routes root, so app code lives in `src/device`.
- **Map lenses.** They are coupled to the legacy GL dot renderer (paint, lattice, dither), so they move with the map in UP7 rather than in UP1.
