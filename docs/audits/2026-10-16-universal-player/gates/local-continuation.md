# Local continuation gate record, 2026-10-16

**Status: partly closed.** The universal player runs on the dev server with the screens rebuilt, reworded in plain language, made component-first and checked in a browser. The full engine suite, the balance harness, any device run and several screens with rich data were not run. Commit at the time of writing: `39f200d0d`.

## Run

| Check | Result |
|---|---|
| `pnpm run build` (every tsbuildinfo deleted first) | exit 0, three times during the day |
| `pnpm run typecheck`, `pnpm run lint` (whole workspace) | exit 0 at the last full run, after the `/nation` rebuild and the whole-card sweep |
| `@admin/player-core` Vitest, full | 204 files, 1,612 tests passed (Node 24) |
| `@admin/player` Vitest, full | 31 files, 203 tests passed |
| `@admin/ui` Vitest, full | 6 files, 41 tests passed |
| `@admin/engine` Vitest, targeted | intelligence, intel-authority, save, war-party, locale-acts, emergency: passed. The full run had 2 failures at 22:45: `war-party` census (fixed, new player-core lens recorded) and `hill-ledger-golden`, which passes on Node 22 (`/opt/homebrew/opt/node@22/bin`) and differs on this machine's Node 24 |
| `@admin/content` Vitest | `intel-authority-sources.test.ts` passed |
| Proof gates: every `scripts/verify-*.mjs` | 94 scripts ran once; 5 failed (`american-spelling`, `metric-registry` and its proof, `one-day-counter`, `person-consequence-alignment-proof`) and were fixed; the five pass. The rest passed in the sweep. Not rerun as a whole since the fixes |
| `verify-dist-freshness`, `verify-no-history-references` (+ proof), `verify-wave-closeout`, `verify-player-prose` (+ proof), `verify-american-spelling`, `verify-one-day-counter`, `verify-file-size`, `verify-adhoc-color-lint`, `verify-renderer-boundary`, `verify-css-architecture`, `verify-unused-primitives`, `verify-icon-registry` | pass at the last commit |
| Clean headless console tour (Playwright, private profile, 20 routes incl. title, `/dev/seed`, Washington, Nation, World, Security, Record, Press, Calendar, Compare, Settings, Handbook, More, Administrations) | no console errors |
| Browser checks by agents at 390, 768, 1066 and 1440 wide with an overlap detector and screenshots, using fixture saves from `scripts/make-fixture-saves.mjs` | Congress, Courts, Oversight, Executive, Security, Decision, Brief, World, Nation sub-screens, Press, Record, Saves, Founding, Dossier, `/nation` |

## Not run

- The full `@admin/engine` suite after the last engine edits (wording in `locale-acts.ts`, the fiscal import cycle break) and the balance harness. No engine numbers changed.
- The whole proof-gate sweep after the five fixes.
- Any iOS or Android bundle (`expo export` for native) or device run. MapLibre native has never run.
- The legacy `apps/web` browser suite (frozen).
- Text zoom, 320 px and 1920 px widths.
- Screens that need data no fixture has: a ratified treaty, a closed covert finding, a declared emergency with renew and end buttons, a nominee's Withdraw, an officer's Remove.
- Committing an act end to end. Agents reached the presidential review but did not confirm one.
- Screen reader passes.

## Defects found by running, fixed this session

Tamagui 3 rejected `true` token keys (dev only); an engine import cycle broke React Refresh (dev only); React Native props leaked into DOM elements; the web Slider ignored the mouse; Congress seats could not be clicked on the web; the bill step tracker collapsed to zero height; the nav rail overlapped its pinned group; the vault limit dead-ended the oath and the seed route; a recovery screen crashed when opened directly; Metro did not re-resolve a module that gained a `.web` variant until it restarted.
