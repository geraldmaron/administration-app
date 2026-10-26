# Gate: desk design system gaps (BL-273, BL-274)

Branch `feat/desk-gaps`, cut from `feat/desk-tokens` at `926039b67` on October 24, 2026. Local only; nothing pushed.

## What landed

| piece | commits |
|---|---|
| Merge of `feat/desk-brand` (the Nib) | `7474c6ce7` |
| Enter and Space on every button-role control (BL-274) | `c20c5444a` |
| Amber primary action in the situation zone; `dangerInk` for red fills | `65b0c14d9` |
| Portraits in `packages/ui`; one `PersonFace` with party rings | `aed85e6e9` (merged `a3df27de3`), `16b912878` |
| Instruction-voice copy pass | `bbc807a73`, `95fe5ee99` |
| `MatterCard`, `Deadline`, `Wire`, `SortTable` stacking, search verbs | `b28f6b063` (merged `c9fc8bb6a`), `95fe5ee99` |
| Merge of `claude/desk-drafts-3eb83c` (drafts, tray, SignOff); one conflict in `CountDot` kept both the gold tone and the `onDanger` label | `9db51d85d` |
| Fixes from the Codex review | `03892a3dd` |
| Gate close-out: local components renamed so they no longer shadow the new shared ones, rebuilt `dist/`, backlog, handoff, this record | the commit that carries this file |

## Review

Codex `gpt-6.1-sol`, read-only, over the whole diff. Six findings, each checked against the code and each confirmed: a Space latch kept across blur, the military-action search verb opening Security, three verbs opening default views, a narrow table with one sortable column losing its sort control, `feTurbulence` and `feFunc*` that react-native-svg does not draw, and front-page lists labeled newest-first while ranked by reach. All six fixed in `03892a3dd`. A second Codex pass over the fix found one more problem: the search fix had not reached `packages/player-core/dist`. The gate's clean build regenerated it, and it is committed with this record.

## Gate, in the repository's order, on the final source

1. Deleted every `tsconfig.tsbuildinfo` (outside node_modules and nested worktrees).
2. `pnpm run build`: exit 0.
3. `pnpm run typecheck`: exit 0.
4. `pnpm run lint`: exit 0.
5. `pnpm run test`: exit 1 on the first run, from one test: `packages/content` `scenario-premise-binding.test.ts` read `content/corpus/shards`, which is gitignored and was copied into this worktree into the wrong folder. With the shards in place, `packages/content` passed 1121 of 1121 (69 files, 1 skipped). Every other package passed on the first run.
6. Every `scripts/verify-*.mjs` (88): three failed on the first run. `verify-no-history-references` because BACKLOG cited this record before it existed; `verify-shared-components` and its proof twin because two app-local `MatterCard`s and the decision screens' `Deadline` now shadowed the new shared components. Renamed `InquiryCard`, `LocaleMatterCard` and `ClockReading` (the decision's framed clock keeps its three-step key, which the Brief's deadline list shares). The new audit folder was added to `verify-no-history-references`' list of live records. Rerun after the fixes: 88 of 88 pass, `verify-no-history-references-proof` included.
7. `dist/` from the clean build of step 2 is committed. After the commit, `git status --short -- '*/dist/*'` prints nothing.

Not run: the balance harness (no engine change).

## Journeys and devices

- Keyboard (real key input through Playwright, not synthetic events), Expo web on a worktree Metro: Brief ("Briefing history" by Enter and by Space), a decision (answers picked by Space and Enter), the budget (Enter opens a line's editor).
- Mixed draft journey at 1920×1080 and 320×700, Night and Day: a budget line drafted by keyboard and a tariff order on China added to drafts, both in the tray ("Drafts: 2 waiting to be signed"), each signed on its own by Enter on "Sign the order" and then "Send to Congress"; the budget turns Out of date after the tariff signs and is repriced before it is sent; the tray ends empty; no sideways scroll and no page errors in any of the four.
- Accessibility tree (Playwright aria snapshots) of the Brief, the decision `the-request-to-freeze-their-assets`, the budget and a dossier: one h1 each, no skipped heading level, no unnamed control or image. VoiceOver was not driven.
- iOS Simulator (iPhone 17 Pro, iOS 26.5), debug build from `expo prebuild` and `pod install`, loaded from this worktree's Metro: title screen, Brief, a SECRET decision and the budget render and navigate. Android was not built or run.
- Screens at 1440 and 320 in Night and Day: Brief, budget, Washington, Security and a dossier. Every route fits; the tab strips that scroll inside themselves leave the document at 320px.
- The design system artifact: version 7 published with corrected title sizes, the amber action, and Adoption.
