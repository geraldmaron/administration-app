# Publication verification — 2026-10-14

Status: publication verified with controls and pushed as `c601bef81`; remote pruning complete. See `CLOSEOUT.md` and `POSTCOMMIT-VERIFICATION.json`. No deployment.

The owner explicitly authorized “Publish content and push the integration branch; no deployment.” The final bake has 327 corpus scenarios (322 before): 20 revised and five added, with 302 unchanged. The content set is `admin-2026w34`, revision 23. `BUNDLE-COMPARISON.json` lists every changed id and canonical body hash. Each changed body exactly matches its independently approved artifact. No authored craft changes were made in this publication pass.

## Selection and recovery

An independent context read the latest October 12 approvals, retained prior approval provenance, and rejected all five pending civic repairs. The four earlier accountability drafts also remain rejected. `PUBLICATION-REVIEW.json` records eligibility, supersession, overlap and dependency holds. Initial publication commands and the initial 328-body preflight are historical evidence, not replay instructions; the current manifest explicitly marks them unsafe to replay.

Final location gates rejected the bridge callback and wildfire addition. The existing corpus store rebuilt a scratch corpus with exactly five bridge bodies restored from the prepublication HEAD bake and only the unshipped wildfire addition omitted. Every other body matched exactly, and the original corpus directory remains in ignored recovery storage. `RECOVERY-PREFLIGHT.json` independently confirms this operation. BL-160 records the remaining work; neither location baseline nor validator was relaxed. One repaired seeded-state exemption and one repaired foreign-story exemption were removed from the shrinking debt lists.

The final whole-corpus audit has 62 existing errors, compared with 86 before publication; no novel error is introduced relative to that baseline. This does not certify the legacy writing, monetary pricing, or corpus balance. BL-159 remains open: actual court actions execute, but Record labels a completed filing as in effect while the underlying appeal/stay remains pending and omits direct native case/order links.

## Verification observed

- `node studio-cli/dist/cli.js corpus build --content-set admin-2026w34`: final revision 23, 18 shards, 327 baked scenarios; kit regenerated.
- `pnpm run build`: passed before `pnpm run typecheck`; `pnpm run lint`: passed. After the rollback bake, removed player-core build metadata and ran `pnpm --filter @admin/player-core run build`, then its `run typecheck`: passed. Vite reports its existing large-chunk warning.
- `pnpm --filter @admin/content run test`: 64 files passed, one skipped; 1,046 tests passed. No aggregate workspace-green claim.
- `pnpm --filter @admin/studio-cli exec vitest run src/corpus/player-bundle.test.ts src/corpus/shard-store.test.ts src/corpus/content-manifest.test.ts src/scenarios/review.test.ts`: four files, 43 tests passed.
- `pnpm --filter @admin/player-core exec vitest run src/content/bundled-corpus.test.ts`: four tests passed; every baked line parses and digests match.
- The 14 exact commands in `PUBLICATION-GATES.json`: all exited zero. They include bundle/kit freshness, shipped parse, deed reachability, foreign family continuity, family closure, location ratchet plus both changed-gate proofs, disposition/flag readers, publish refusal, doctrine alignment and wave closeout.
- `E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web run test:e2e tests/court-response-pilot.probe.spec.ts --project=mobile-390 --project=desktop-1440 --workers=2 --output=/private/tmp/published-court-browser`: four journeys passed, light/dark at phone/desktop. Imported a disposable campaign, selected stay, authorized, opened Record, reloaded. Opened and inspected the retained desktop dark decision and phone light Record screenshots. Visible pending narration and the known incorrect lifecycle badge are both recorded, not concealed. This is behavior verification, not new visual-design acceptance. Temporary spec removed; reproduction copy remains in `content/reviews/court-response-pilot-2026-10-14/probes/`.

Earlier broad integration checks and unfinished balance limitations remain in `../2026-10-12-grounded-casting/READINESS-2026-10-14.md`. This content-only checkpoint did not restart that balance run, rerun the costly full navigation matrix, merge main/staging, or deploy. Postcommit dist freshness is recorded separately after the content commit.

## Decision and rollback

Strongest failure: replaying stale approvals could replace newer writing, break a callback, or misplace a state's relief decision. Best alternative: publish only the court pilot, leaving all older approved repairs out. Accepted with controls: independent portfolio selection, exact-body comparison, ordered union audit, actual gates, rollback of location failures, recoverable original bodies, and an integration-branch push without deployment. The broader corpus rewrite remains separate work.

## Commit record

- Diff read: generated bodies compared completely against approval artifacts and unchanged HEAD bodies (`BUNDLE-COMPARISON.json`: “Every changed decoded generated body equals its independently approved shipped body”); generated kit and shrinking exemptions inspected.
- Scope single: publication of eligible approved corpus, its generated kit, and its verification/holds.
- No secrets: staged paths and added text checked; no credentials, secret configuration or actual player saves included. Test campaign captures contain fictional fixture identities.
- Branch correct: `codex/reconcile-worktrees-2026-10-14`; no default-branch merge.
- Message shaped: imperative summary and reason; unsigned, no attribution trailer.
- Pull request shaped: not applicable: no pull request requested or opened.
- Push authorized: owner explicitly said “Publish content and push the integration branch; no deployment.”
