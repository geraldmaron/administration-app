# Integration publication and cleanup — 2026-10-14

Status: verified content commit `c601bef81` published to GitHub on the integration branch; all 169 temporary upload tags and both redundant remote feature branches deleted and verified absent. Local cleanup is complete. This documentation closeout is pushed separately. No deployment.

## Delivered

Content commit `c601bef81` bundles 20 approved revisions and five additions, for 327 corpus scenarios. `PUBLICATION.md`, `BUNDLE-COMPARISON.json` and `PUBLICATION-GATES.json` record exact selection and validation. Rejected drafts remain rejected; location-gate failures were rolled back, not exempted. BL-159 and BL-160 remain open, and the 62 legacy corpus findings are not a clean-corpus claim.

All ten original worktrees were reconciled. Nine extra checkouts were removed or archived, leaving the canonical checkout. Fourteen redundant local branches were deleted after ancestry and recovery verification. `BRANCH-SAFETY.json` pins 22 original ref heads; `PRUNING.json` records each checkout and branch. Before pruning, 2,899 ignored nondependency files were archived with per-file hash verification. Recovery archives remain local under `content/reviews/worktree-recovery-2026-10-14/` (93 MB); `node_modules` was excluded. Git safety refs retain original heads and dirty snapshots. These local recovery assets are not claimed to be uploaded.

The two previously unreconciled remote styling commits were merged as `f49f99197` with the ours strategy: source inspection established that their obsolete stylesheets/tokens had been superseded by the current design. They remain reachable in history without reverting the modern source tree. Keep main and staging; do not merge or deploy them in this pass.

## Checks and limits

Postcommit compiled-output freshness and its rejection proof pass; see `POSTCOMMIT-VERIFICATION.json`. The proof's first cleanup was sandbox-blocked, so its exact three-file test perturbation was inspected, restored, and the proof rerun with the required Git permissions. No perturbation remains.

Full Git object verification passes after rebuilding a backed-up stale split commit-graph cache. A freshly generated 223,269,296-byte self-contained pack also passed strict local indexing. The original graph is preserved in ignored recovery storage. Dangling preserved objects are expected and are not pruned.

The earlier broad balance process has now completed: 16 files passed, 138 tests passed, four skipped. It loaded source at its earlier start; its completion does not establish balance for the later content publication. The prior full-workspace timing failures and scoped reruns remain recorded; no aggregate-green claim is made.

The canonical development server responded HTTP 200 at `http://127.0.0.1:5188/`. Commit signing stays disabled in repository-local configuration; global credentials/settings were not changed. Completed wholly published authoring workspaces were finished through the CLI; mixed, rejected and held workspaces/review artifacts were retained.

## Upload investigation (draft diagnosis)

Reproduction: normal `git push -u origin codex/reconcile-worktrees-2026-10-14` failed with `LibreSSL SSL_read ... sslv3 alert bad record mac`; HTTP/1.1 and a larger request buffer did not resolve large uploads. Existing SSH authorization could read refs, but larger pushes were rejected by remote index-pack with varying inflate errors or connection resets. Local object validation and strict fresh-pack indexing passed.

Hypothesis: HTTPS alone causes the failure. Refuted by SSH's larger-upload failures. Hypothesis: corrupt local objects cause it. Refuted by object fsck with the stale graph disabled and strict regenerated-pack indexing. The stale graph was a separate derived-cache defect; normal fsck passes after rebuilding it.

Smaller ancestry-preserving uploads succeed. Per-command controls disable SSH multiplexing/compression and Git delta packing, compression, pack reuse and bitmap traversal; no credential or persistent transport settings changed. Upload advances the same integration branch using fast-forwards only. Larger batches are retried or reduced; no force update of branch history. Exact attempt records are retained locally under `/private/tmp/integration-incremental-push.json` and `/private/tmp/integration-adaptive-push.json`. Smaller uploads reached `cc7610417`, but the single large visual import still failed. Automatic approval review rejected temporary upload tags as outside the original branch-only authorization. The owner then explicitly authorized 169 temporary upload tags. These transfer only the same already-authorized repository objects, retain exact commit history, and are deleted after final integration verification; no branch/tag force update is used. Tag refs and object hashes are recorded for exact cleanup. One group failed repeatedly from the canonical packed objects but succeeded after its exact blob bytes/hashes were materialized in a scratch store; the remaining groups use that verified path. This is a workaround observation, not a definitive cause claim. The workflow push trigger is branch-only; no deployment runs here.

All 169 groups transferred successfully, and the final integration branch was verified at `c601bef81c31c045d336619bc3979ed67fd57def` before deleting the exact temporary refs and obsolete feature branches. `PRUNING.json` records their identities. No temporary upload tag remains.

Root cause remains unproven: no claim that the network or compression implementation was repaired. Reproduction and complete error inspection: done. What changed: no known prior successful large upload in this session. Hypotheses: tested as above. Whole symptom explained: not done, varying transport/remote rejection remains unexplained. Both-direction root-cause proof and upstream regression test: not done; only a smaller-upload workaround is demonstrated. No application code change resulted from this investigation.

## Commit record

- Diff read: cleanup/recovery metadata and status documentation inspected, with hashes/ancestry controls in `PRUNING.json` and `BRANCH-SAFETY.json`.
- Scope single: record the authorized integration cleanup and its verification.
- No secrets: recovery archives stay local; committed records contain paths, hashes, ref names and fictional test evidence, not credentials or actual player saves.
- Branch correct: `codex/reconcile-worktrees-2026-10-14`; main/staging retained.
- Message shaped: imperative summary and reason, unsigned, no attribution trailer.
- Pull request shaped: not applicable: no pull request requested or opened.
- Push authorized: explicit owner request “Publish content and push the integration branch; no deployment.”
