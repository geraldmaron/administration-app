# Reconciliation verification — draft

Outcome: the canonical checkout runs the combined simulation and player visual changes, while all source worktrees remain recoverable.

## Current browser evidence

`node /private/tmp/reconcile-browser.cjs` imported the older overhaul `security-desk` save, opened Security, then imported the current `washington-chairs` save and captured eight routes at 320, 845 and 1440 pixels in both themes. All 48 viewport/theme checks had zero document overflow and no page errors. Axe ran on every 845-pixel theme sample: zero WCAG A/AA violations. This is sampled integration evidence; it does not establish complete visual acceptance.

The browser contexts were disposable. The user’s browser storage was not edited by the verification scripts.

Inspected captures:

- [executive-1440-dark.png](evidence/executive-1440-dark.png): Office board, staffing and service comparison visible; redacted identity and selected office use the shared surfaces.
- [roster-320-light.png](evidence/roster-320-light.png): Compact headline readings reflow vertically; roster remains accessible through the shared tab strip.
- [congress-845-light.png](evidence/congress-845-light.png): Aligned disposition readings above equal chamber panels; seats and passage thresholds remain distinct.
- [oversight-320-dark.png](evidence/oversight-320-dark.png): Attention row, tabs and inquiry evidence fit the phone; empty inquiry wording is explicit.
- [policy-1440-light.png](evidence/policy-1440-light.png): Domain rail and equally sized proposal options remain readable; the selected trade domain is preserved.
- [emergency-845-dark.png](evidence/emergency-845-dark.png): Readings, map legend and accessible list alternative fit the intermediate surface.
- [electorate-320-light.png](evidence/electorate-320-light.png): Legacy electorate URL resolves to Nation; the newer division reading says against the 2020s.
- [office-1440-dark.png](evidence/office-1440-dark.png): State Department seal, watermark, redacted officer identity and office navigation are present.

The other 40 captures are retained with automated layout records in `evidence/browser.json`; they have not all been manually inspected. The first-view captures do not certify every lower-page state. Production browser matrices and corrected reruns are recorded below. A first attached dev-server run was stopped after its production-chunk recovery test exposed the setup mismatch (178 passed; the partial run is not an acceptance result). The final production preview uses a frozen bundle on 5192; the user dev server remains on 5188.

## Local checks

Check: clean integration build
Command: `pnpm run build`
Result: pass
Observed: recursive build completed, including the player production bundle. The existing chunk-size advisory remains.

Check: TypeScript
Command: `pnpm run typecheck`
Result: pass
Observed: every workspace typecheck completed.

Check: lint
Command: `pnpm run lint`
Result: pass
Observed: every workspace lint completed.

Check: workspace tests
Command: `pnpm run test`
Result: initial aggregate failed; affected files pass isolated reruns
Observed: 8680 passed and six failed initially. One hash capture was re-taken on the declared Node 22 runtime after a cross-runtime probe; no explicit Hill readings changed. Five timeouts passed reruns at unchanged limits. The web package was rerun after the focus fix: 447 passed. Details and exact commands are in `UNIT-RESULTS.json` and `DIAGNOSIS.md`.

Check: proof gates
Command: every `node scripts/verify-*.mjs` (89 files)
Result: 89 passed after the local checkpoint
Observed: initial and final per-gate dispositions are in `PROOF-GATES.json`. Live-audit registration and new Press accessible-label prose were corrected and their gates rerun successfully. Dist freshness requires a committed source/dist pair. The first dist-proof run could not restore its temporary contracts edit because the sandbox disallowed Git index writes; that exact edit was removed and contracts returned to clean. After `07d5292a6`, both checks passed with Git permissions; the proof restored its temporary source/dist changes, leaving contracts clean.

Check: signed local integration commit
Command: `git commit` with the configured signing agent
Result: fail
Observed: two attempts returned `1Password: agent returned an error`; no commit was created and staged work is preserved. This failure was superseded by the owner’s explicit instruction to remove signing: repository-local `commit.gpgsign=false` now applies to all ten worktrees; global settings are unchanged.

Check: serving canonical checkout
Command: `pnpm --filter @admin/web dev --host 127.0.0.1 --port 5188 --strictPort`
Result: pass
Observed: Vite reported ready; HTTP 200 on port 5188. The old listener’s cwd was verified as the overhaul worktree before that process alone was stopped.

## Additional production inspection

`node /private/tmp/reconcile-production-smoke.cjs` imported the current `week-30` campaign and inspected Public opinion at 390 and 1440 pixels in both themes. All four captures were opened and inspected: settled approval, sampled poll with its interval, recorded history and the bloc contribution reading remain distinct. Both document and work-surface overflow were zero. Files: `evidence/production-opinion-<width>-<theme>.png`, with exact observations in `evidence/production-smoke.json`. These scrolled captures include the tail of the preceding states table; they do not certify every lower-page state.

The older overhaul save used in the initial import proof is schema 65; the current security fixture is schema 66. Its successful import and Security arrival were observed in a disposable browser context.

Check: original worktree preservation
Command: `python3 /private/tmp/reconcile-preservation-check.py`
Result: pass
Observed: all ten heads and every original dirty-worktree blob matched their recorded safety snapshots; changed path sets were unchanged. Exact results: `PRESERVATION-CHECK.json`. The 13 safety refs were also listed and checked against the recorded heads/working snapshots.

Check: shared focus restoration
Command: `E2E_ATTACH=1 E2E_PORT=5190 pnpm --filter @admin/web run test:e2e tests/visual-workspace.spec.ts --project=mobile-320 --workers=1 --output=/private/tmp/reconcile-focus-e2e`
Result: pass
Observed: both light and dark journeys passed with their original exact-link focus assertions. Independent before/after browser traces reproduced the title-focus failure and then the exact supplier anchor receiving focus. The first complete production matrix passed 647/648 and exposed a second arrival/input race on Courts. Its deterministic probe, correction and final matrix are recorded in `DIAGNOSIS.md`; the matrix results and subsequent corrections are recorded below.

## Closing record — pending balance

- Project inspected: canonical primary, every registered worktree, shared source overlap, repository commands and existing integration checkpoint. Simulation runtime source is preserved; presentation interfaces and recorded-query navigation are extended. No engine or save-schema redesign.
- Reuse checked: existing shared Stat, Bar, Gauge, Series, icon/artwork registry, Door and return-context mechanism. No new dependency or parallel design system.
- Validation path run: build before typecheck, lint, full workspace tests, all 89 proof gates, fresh fixtures, balance and six-project production browser suite; pending results remain labeled above.
- Outcome observed: merged Executive, Congress, Oversight, Policy, Emergency, office and Nation surfaces; existing-save import; query-preserving exact-source return after the shared navigation correction. Canonical checkout serves the user's 5188 URL.
- Surface inspected: 12 explicitly named first-view/scrolled captures across dev and production, plus recorded automated layout/Axe samples. Uninspected captures and lower-page states remain unverified; full aesthetic acceptance stays on BL-136.
- Diff reviewed: incoming source split by shared/core, data, Nation, Washington, world/security, style and test families; only planning records needed manual three-way conflict resolution. Generated output rebuilt instead of overlaid. Temporary diagnostics removed from source.
- Residual risk: Browser execution details and corrected reruns are recorded below; balance is pending. Repository signing is disabled at the owner’s request; all 89 proof gates now pass. No push, deployment or source-worktree removal.

Final navigation correction checks (each completed):

- `pnpm run build`: pass; complete recursive build.
- `pnpm run typecheck`: pass; all packages.
- `pnpm run lint`: pass; all packages.
- `pnpm --filter @admin/web run test`: pass; 447 tests in 69 files.
- `node /private/tmp/reconcile-focus-intent.cjs`: before/after defect proof; the same queued-return/new-gesture probe changed from stealing case-link focus to preserving the player's Nominations focus.

Exact logs are retained under `logs/navigation-*` and `logs/focus-intent-*`.

## Final browser execution record

The first complete production run passed 647/648 and exposed the queued-return gesture race described in `DIAGNOSIS.md`. After its correction, the next full matrix passed 639/648. One failure exposed the real Start readiness race, now corrected. Eight late checks were invalidated when the production assets were rebuilt during that matrix; their contexts showed failed screen chunks. This was a verification execution error, not a passing aggregate. The final production bundle was frozen at `/private/tmp/reconcile-preview-final` and served on 5192 before reruns.

Check: invalidated production checks, unchanged assertions
Command: `E2E_ATTACH=1 E2E_PORT=5192 pnpm --filter @admin/web run test:e2e tests/world.spec.ts:132 tests/world-sets.spec.ts:146 --project=desktop-1440 --workers=2 --output=/private/tmp/reconcile-chunk-1440`
Result: pass
Observed: two passed.

Check: invalidated desktop checks, unchanged assertions
Command: `E2E_ATTACH=1 E2E_PORT=5192 pnpm --filter @admin/web run test:e2e tests/cabinet-graft.spec.ts:71 tests/browser-comments.spec.ts:5 tests/congress-members.spec.ts:6 tests/collection-journey.spec.ts:4 tests/collection-sharing.spec.ts:4 tests/consistency.spec.ts:24 --project=desktop-1920 --workers=4 --output=/private/tmp/reconcile-chunk-1920`
Result: pass
Observed: seven passed, including both browser-comment themes.

Check: final entry/founding/loop and library-readiness regression across six projects
Command: `E2E_ATTACH=1 E2E_PORT=5192 pnpm --filter @admin/web run test:e2e tests/founding.spec.ts tests/setup-profile.spec.ts tests/loop.spec.ts tests/shell.spec.ts --workers=8 --output=/private/tmp/reconcile-entry-e2e`
Result: pass
Observed: 102 passed. The current suite has 654 cases after adding six readiness combinations. Coverage is established across the full matrices and corrected focused reruns; no single final 654/654 run is claimed.

After the final readiness correction, `pnpm run build`, `pnpm run typecheck`, `pnpm run lint` and `pnpm --filter @admin/web run test` passed (447 web tests). Logs: `logs/start-*`. Before/after actual held-press probes are retained as `logs/start-readiness*.log`.

Check: unsigned reconciliation checkpoint
Command: `git commit` followed by `git show -s --format='%h %s%nSignature status: %G?' HEAD`
Result: pass
Observed: `07d5292a6`, signature status `N`. Repository-local `commit.gpgsign=false` was verified with `git -C <worktree> config --get commit.gpgsign` across all ten worktrees. No global signing setting changed.

Commit record
- Diff read: answered, see Closing record ("incoming source split by shared/core, data, Nation, Washington, world/security, style and test families"); latest four readiness/return-context diffs were read before staging.
- Scope single: answered, see README ("latest primary source as baseline"); one local integration checkpoint consolidates the preserved player work with fixes exposed by its integration verification.
- No secrets: answered, reviewed staged source/assets/evidence; no credentials or real user campaign data added. Fixtures and disposable campaign evidence are used.
- Branch correct: answered, `codex/reconcile-worktrees-2026-10-14` ("source reconciled locally" in PLAN).
- Message shaped: answered, `07d5292a6` ("Reconcile player visual work into the current simulation") includes reasons and verification limits.
- Pull request shaped: not applicable: no pull request opened.
- Push authorized: local checkpoint authorized by the all-worktree reconciliation request and explicit removal of signing; no push performed.
- implementation-verification: source integration and sampled user-visible outcome proven; complete aesthetic acceptance remains open, and balance is still running.

Check: committed output equals a forced rebuild
Command: `node scripts/verify-dist-freshness.mjs`
Result: pass
Observed: dist matches source in all nine tsc projects; forced rebuild produced no diff (`logs/dist-final.log`).

Check: stale-output rejection proof
Command: `node scripts/verify-dist-freshness-proof.mjs`
Result: pass
Observed: guard correctly rejected the deliberate source change whose committed dist had not been regenerated. Temporary contracts source/dist edits were restored, verified by `git status --short` (`logs/dist-proof-final.log`).
