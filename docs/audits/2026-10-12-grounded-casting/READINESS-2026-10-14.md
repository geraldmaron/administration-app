# Story readiness before the corpus rewrite — runtime prerequisites verified with controls

The owner asked to close runtime accounting, persistent-subject and traceability gaps before the corpus rewrite. This change extends BL-81, BL-147 and BL-157 and closes BL-155/156. Implementation is local on `codex/reconcile-worktrees-2026-10-14`, in commits `84136d248`, `720417b13`, `89519e108` and `d3a85ebc5`. It does not rewrite, mount, bake or publish scenarios. The owner already answered casting Q14–Q18; those decisions are implemented rather than reopened.

## What is implemented

- **Financial accountability:** one shared bounded cost distribution, moved intact into the engine. New authored position borrowing retains its estimate, then draws a separate deterministic outturn at successful commit. National-books precision determines the booked amount. Record preserves estimate, booked borrowing, variance, source and the planning-assumption label through save/reload. Untagged contractual obligations and old frozen decisions keep their existing terms.
- **Cost visibility:** the shared choice model now carries borrowing separately from immediate budget authority. It previously dropped the debt comparison and could label a borrowed program free. Choices show rounded estimates; Record shows the booked receipt. Sourced additional federal components and explicit coverage/exclusions are supported and audited. The audit and runtime now sum the same components.
- **Persistent subjects:** the existing entity registry and case registry own typed story bindings, including origin case/scenario/turn, subjects and place. Native person/institution ids connect unrelated cases; token aliases remain distinct. Explicit inheritance retains the original person after succession. Current-office slots select the current holder. Family/flag callbacks retain recorded identities and source-case causes. No second identity/history store was added.
- **Traceability:** true authored flag gates reach decision provenance, and reply memory refreshes causal marks. Record can search/filter every decision naming a subject, then return to the receipt. Prose, descriptors, map locales, effects, press and frozen briefing use the resolved place. Unsupported national/unlocated conditions do not acquire invented local addresses.
- **Grounded local context:** the existing city bake emits 489 context-only Natural Earth locality points. Small means a source population tier up to 100,000, not legal town status or agricultural suitability. Primary evidence flags Newark as a commercial port and International Falls as a road crossing. The 200 US economic cities are unchanged. Unsupported locality requirements fail closed. Callbacks retain their recorded locality even when the later scenario uses an ordinary city/coast site. The canonical place resolver and Record map pin retain its actual coordinates rather than substituting a state metro. Explicitly pinned ports do not inherit a small-place filter unless the author requests that tier. New unplaced scenes discount lifetime prior state usage; existing scenes stay pinned. This is a pacing assumption, not a measured geographic distribution.
- **Local officials/documents:** named fictional city mayors use the existing person generator and person-create effect at case raise. Their identities and municipal dossiers survive reload. Governor/member/mayor letters and readouts require explicit official bindings and retain domestic vocabulary checks. No unrestricted direct speaker, municipal election simulation, invented facility capacity or crop/frost model was added.
- **Reproducible regression inputs:** three content suites now read exact vendored test inputs rather than ignored authoring jobs. The navigation-door suite generates the existing fixture set into its own temporary directory, reads those real saves and cleans up. It no longer assumes browser fixtures happen to exist locally.
- **Authoring contract:** doctrine, decisions, schema, architecture, review checklist and generated kit explain these boundaries. The brief no longer falsely calls the Attorney General an invented office or lists the federal judiciary as forbidden; its examples now follow the existing playable-government vocabulary without relaxing the validator. The impact brief was moved into the existing brief-module pattern to keep the oversized parent from growing. No new dependency.

## Design challenge and controls

Review shares the implementation context; it is not an independent review.

1. **Strongest failure:** precise receipts could disguise unsupported cost assumptions. Control: broad estimates and planning variation are visibly labeled, with source/coverage retained. The rewrite must add case-specific arithmetic before claiming monetary realism.
2. **Best alternative:** preserve fixed costs and repair prose using existing components. That avoids uncertainty but leaves estimates indistinguishable from actuals and repeated subjects untraceable. Extending the existing books/cases/Record owners addresses those defects without another subsystem.
3. **Load-bearing claims:** receipt equals the actual debt delta; identity/place survives closure and reload; callback causes point to the source decision. Unit, integration and real browser journeys exercise these claims.
4. **Inverted assumption:** more detail can make the fiction less truthful. Small-place population proves no industry; a named mayor proves no municipal capability. Explicit unsupported requirements are refused rather than filled with plausible substitutes.
5. **Who bears the cost:** authors must research all federal components and maintain subject bindings; players must interpret estimates. Coverage errors block audit, existing official identities are reused and the UI separates authority from borrowing.
6. **Hostile-expert objection:** broad appropriation anchors and transport-overrun assumptions do not establish the true cost distribution of grants or disaster relief. Accepted. This is accountable planning uncertainty, not fitted realism. Broader economic calibration remains separate.

**Engineering decision: accepted with controls** for these runtime prerequisites. The checks and remaining limits are explicit below. Corpus readiness is not a claim that every existing scenario is now grounded.

## Verification record

Project inspected: AGENTS.md, CLAUDE.md, North Star, PLAN/BACKLOG and the touched source/tests. Blast radius: world locality schema/validator; engine person, case, packet and ledger contracts; content casting/audit; player presentation/Record; shared choices; authoring brief/kit. Additive optional fields preserve older saves without reconstructing unknown history.

Reuse checked: existing city bake/vendor input, fictional person generator/person-create effect, ENTITY_REGISTRY, case registry, national-books debt writer, causal marks, Record subject query and shared choice renderer. These owners were extended; no new dependency or parallel save store.

Check: clean workspace build before typecheck
Command: find . -name tsconfig.tsbuildinfo -not -path '*/node_modules/*' -delete; pnpm run build
Result: pass
Observed: every workspace build completed; Vite retains its existing large-chunk warning. Later Record wrapping CSS/markup received a web build.

Check: strict workspace types and lint
Command: pnpm run typecheck; pnpm run lint
Result: pass
Observed: every workspace package completed. An initial unused test import was fixed; thresholds were not changed.

Check: full workspace regression
Command: pnpm run test
Result: fail (completed aggregate; corrective reruns recorded separately)
Observed: /private/tmp/story-tests-final.log finished with 3 failed packages and 9 passing packages. Engine: 4,604 passed/1 graph-speed failure; content: 1,045 passed with one skipped file; player-core: 1,455 passed/5 unexecuted navigation tests after the new fixture-setup guard expired; studio-cli: 359 passed/1 session-context timeout. Web 447, Studio 92, desktop 1, UI 87, world 559, contracts 1, design 23 and API 32 passed. The graph and session-context suites passed unchanged isolated reruns. The navigation setup guard is corrected and its complete fresh-data rerun passed all five checks. The aggregate is not relabeled green.

Check: graph performance rerun
Command: pnpm --filter @admin/engine exec vitest run src/person-network-graph.test.ts
Result: pass
Observed: 4 passed; digest pins and the original performance bound retained.

Check: affected placement and continuity after source review
Command: pnpm --filter @admin/content exec vitest run src/scenario-settlements.test.ts src/scenario-locus.test.ts src/scenario-locus-draw.test.ts src/scenario-subjects.test.ts
Result: pass
Observed: final affected rerun passed 46, including saved locality/ordinary callback, explicit-port and actual-descriptor regression cases. The explicit-port case was first reproduced as a failing test, then corrected.

Check: meaningful accounting, local-official and authoring regressions
Command: pnpm --filter @admin/content exec vitest run src/scenario-subjects.test.ts src/scenario-settlements.test.ts src/scenario-local-officials.test.ts src/scenario-locus-draw.test.ts src/scenario-cost.test.ts src/impact-accounting.test.ts src/scenario-report.test.ts src/scenario-repair-preview.test.ts
Result: pass
Observed: 66 passed at the affected checkpoint; the later domestic-document vocabulary check passed in a separate 5-test run. Later explicit-port and Record-map regressions have separate focused reruns; the aggregate began before those final additions.

Check: unchanged session repair limits
Command: pnpm --filter @admin/studio-cli exec vitest run src/jobs/repair-session-context.test.ts
Result: pass
Observed: 7 passed at the original 90,000ms per-test limit; the case that timed out in the aggregate completed in 48,590ms. No authoring assertion or limit was changed.

Check: canonical locality and Record map coordinates
Command: pnpm --filter @admin/world exec vitest run src/dataset/places.test.ts src/validate/settlement-checks.test.ts; pnpm --filter @admin/player-core exec vitest run src/record/timeline.test.ts src/geo/place-of.test.ts
Result: pass
Observed: world 12 passed and player 16 passed, including exact sourced coordinates and contradictory-target refusal. Full workspace build/typecheck/lint passed after these final map changes; a clean emit followed before committing generated outputs.

Check: navigation fixtures in a fresh temporary directory
Command: pnpm --filter @admin/player-core exec vitest run src/shell/doors.test.ts
Result: pass after setup correction
Observed: all 5 navigation tests passed, 910.19s total including full fixture generation; the main route assertion took 25.607s at its unchanged 120-second limit. The newly introduced 15-minute setup guard expired during the two-term fixture. The pre-existing fixture log records that fixture alone at 527,301ms. Setup now has a separate 40-minute bound; the child times out 30 seconds earlier, so cleanup cannot orphan generation. Existing route assertions retain their 120-second limits, and no fixture, horizon or route check is removed. This is setup lifetime, not a relaxation of a simulation performance gate.

Check: subject identity on every reply path
Command: pnpm --filter @admin/engine exec vitest run src/conversation-provenance.test.ts src/conversations.test.ts src/scenario-accounting.test.ts
Result: pass
Observed: 69 passed. Two missing-entity regressions first failed before the correction, including an actual instrument reply. Resolver entity ordering and intelligence visibility are retained; declared subject ids are appended rather than overwritten. Engine build/typecheck/lint passed after this correction.

Check: frozen mayor case and dossier
Command: pnpm --filter @admin/player-core exec vitest run src/conversation/scenario-cases.test.ts src/dossier/person-dossier.test.ts
Result: pass
Observed: 20 passed, including materialization with the frozen case, municipal dossier and save/load.

Check: proof gates and generated authoring kit
Command: every scripts/verify-*.mjs, with committed-dist checks last; node studio-cli/dist/cli.js scenarios kit
Result: pass after corrective reruns
Observed: 50 ordinary gates executed; five findings were corrected and their gates rerun (helper classification, file size, derived metric report, temporary-name false positive and accounting seam classification). All 37 non-dist proof gates passed. Both committed-dist checks passed again after the final provenance/authoring commits; forced compilation changed no output, and the reversible stale-dist fixture was correctly rejected. Kit 97346f362eac is current; its refusal proof passes. The final brief suite passed 19 tests without updating snapshots. Raw logs: /private/tmp/story-gates-static.log and /private/tmp/story-gates-proofs.log.

Check: real browser accounting, history and municipal dossier
Command: E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web run test:e2e tests/scenario-accounting.spec.ts --workers=4 --output=/private/tmp/story-e2e-final-accepted
Result: pass
Observed: final wrapping recheck passed 12 journeys. Actual shipped shipyard prose/program is staged through player founding, with a test-only typed mayor slot. Browser import, choice, review, Record estimate/booked/variance, reload, subject-history link, Back and the municipal dossier/reload run at 320/390/768/1280/1440/1920 in both themes with reduced motion. Disposable browser contexts do not alter the user's saves. An extra cell-overflow assertion now covers subject descriptions.

Outcome: a player can compare an honest estimate, authorize the program, inspect the actual booked cost, follow the same subjects through history and reload their official dossiers.
Surface: actual player browser on port 5188, both themes and six viewports.
Data: the shipped shipyard decision with unchanged prose/program and a declared test-only municipal subject; existing campaign founding, books, cases and save import.
Observed: cost, receipt, subject filter/Back and mayor dossier journeys passed. Rendered review corrected an introduction-week error and subject-description wrapping. Four final actual-content captures in readiness-captures/ were opened and inspected: mobile-320 light estimate/receipt and desktop-1440 dark estimate/desktop-1280 dark receipt. Figures, labels, contrast, wrapping and retained subject identity are readable; browser checks cover all six widths.
Verdict: proven on the exercised decision/Record/history/dossier flow.

Check: controlled debt paths
Command: node docs/audits/2026-10-12-grounded-casting/probes/pilot.mjs readiness
Result: pass
Observed: four seeds compare original quoted booking with separate outturn on the same shipped reply over 26 weeks. This measures accounting propagation, not macroeconomic calibration. Final retained evidence: readiness-debt-path.json. Estimates approximately 76/221/84/102 million booked 88/434/113/72 million; week-26 differences against quoted booking are +12/+213/+29/−30 million. All source, subjects and intermediate points are retained.

Check: broad reconciliation balance
Command: pnpm --filter @admin/engine run test:balance
Result: still running from the preceding reconciliation
Observed: /private/tmp/reconcile-balance.log, session 77475. Macro/economy and preceding families completed; the three borrowing-policy workers remain active. They loaded the earlier reconciliation source. No result for this later change is inferred, no threshold is loosened and no duplicate multi-hour run is started.

Diff reviewed: runtime/content changes, new contracts/tests, bake/source evidence, generated kit/declarations and helper classifications. Implementation diff was reviewed and committed as 84136d248. The setup-lifetime correction, subject-provenance correction and authoring-guide alignment were reviewed and committed separately. Compiler output was checked against committed source; snapshot changes are confined to the intended guidance. No dependency, assertion threshold, scenario bake or publication was added.

All implementation-verification gates have a recorded result above: inspection/blast radius, reuse, real validation commands, observed player outcome, rendered inspection, diff review and residual risk. No independent review is implied.

Residual risk: the parallel workspace aggregate is not green and has timing sensitivity tracked under BL-137; its two original timing failures passed unchanged isolated reruns. The broad balance run remains incomplete and is not certified by these checks.

## What remains for the corpus rewrite

The shipped bake still contains 322 definitions and no case-specific financial bases. Rewrite research must supply supported premises, complete federal cost arithmetic, real causal mechanisms, explicit recurring-subject bindings and appropriate geographic requirements. Unsupported crop/fruit-belt claims need sourced data or retirement/rewriting. The historical nine pilot placement patches remain unapplied and unbaked; their current fitness must be reread with this source. The pilot's owner acceptance and governor-tilt sizing remain recorded in BL-147. Independent content review remains mandatory before publication. Nothing in this readiness work lifts the drafting/publishing hold or publishes the pending drafts.

## Commit record

- Diff read: full implementation diffs and final three-file documentation diff reviewed; see “Diff reviewed” above.
- Scope single: final documentation commit records “runtime prerequisites verified with controls”; no implementation or corpus changes included.
- No secrets: final diff checked; none found. Evidence paths contain local verification output, not credentials.
- Branch correct: `codex/reconcile-worktrees-2026-10-14`, matching “Implementation is local” above.
- Message shaped: “Record story readiness verification and remaining limits,” with a body explaining the retained failures and corpus boundary.
- Pull request shaped: not applicable; no pull request opened.
- Push authorized: local close-out follows the owner's “Finish closing the gaps”; no push or deployment performed.
