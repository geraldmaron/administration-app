# Brief, decisions and Congress rebuild — integration checkpoint

2026-10-15. Persistent worktree `.worktrees/shadcn-complete-decisions`, branch `codex/shadcn-complete-decisions`, base `12501c852`. Shared dependencies applied: NativeSelect `42eb29c64` and narrow Stages `7c7f58799`. This is a bounded presentation rebuild, not whole-application acceptance.

## Delivered experience

The decision opens with a compact source/date/location card, quantified facts and linked parties beside timing, the cost of waiting and uncertainty. The duplicated numbered memorandum/banner composition is removed. Actual existing executive artwork and national flags provide identity; no classification or legal authority is invented.

Brief priority cards and queued matters use their inherent full-card/row target. Duplicate generic Open controls are removed. Subject dossiers and subject-filtered Record destinations remain independent shared buttons. National-history controls use shared selected buttons. Calendar and retained history remain in the single Brief route.

The legislative outreach dossier now combines the named officeholder, recognized party mark and home state with a compact assessed-position meter, a contextual bill destination and recorded approaches. The person card opens its real dossier; bill context and Back/focus survive that journey. Bills now separate their document from compact shared decision/process cards. Unknown chamber support is drawn as unresolved, with member context and actual prior votes in an evidence inspector. Public policy alignment never becomes an invented commitment.

The bill's free-text veto message is removed. Available objections are predefined policy disagreement, reconsidered provisions and, only when the existing bill reader supplies fiscal terms, a fiscal objection. The chosen message goes through the existing `deskPacket`/`vetoBill` narration contract. This expresses a presidential objection; it makes no unsupported constitutional finding. No engine or saved shape changed.

Case and statutory-clock obligations use shared Cards with compact labeled facts and chronological history. Scandal dossiers separate allegations, established facts and counsel's uncertain assessment; a compact intensity meter and shared stages replace the bespoke ring/chips. The shared narrow-stage fix was requested after an actual phone capture split “Developing”; the corrected vertical sequence was inspected on the real scandal route.

Forecast controls use shared buttons and concise source/confidence tags. Methodology lives in an inspector. Every projected chart exposes its actual dated median and low–high run range in the shared evidence-table pattern. Forecast cell alternatives also name their numeric level/range accessibly. No synthetic movement or observations were added.

## Route and state coverage

| Route or view | Change and observed state |
|---|---|
| `/brief` | Priority full-card navigation and secondary destinations; populated critical fixture; 390/1440, light/dark. |
| `/brief?view=calendar` | Retained actual institutional calendar; existing regression exercised month/Today controls at390 light/dark in this pass. |
| `/brief?view=history` and `/brief/digest?week=1` | Single-workspace history and retained redirect;390 light/dark regression passed before the subsequent stale legacy action spec was interrupted. |
| `/brief/decision/$id` | Rebuilt evidence board; whole-choice selection, forecast method Sheet and Escape focus;390/1440 light/dark. Real four-week paired forecast/table exercised at1440. |
| `/brief/clock/$id` | Active family obligation dossier inspected390/1440 light/dark. The separate statutory bill-clock branch also passed390/1440 in the residual journey. |
| `/brief/scandal/$id` | Running allegation, known facts, counsel and stage sequence inspected390/1440 light/dark. Resolved branch inspected in source; resolved fixture not exercised in this pass. |
| `/brief/metric/$id` | Existing known-metric redirect retained; unknown reading now uses shared empty-state/action presentation. Unknown clock/story/decision/metric all exercised390/1440. |
| Congress overview | Existing full fringe spectrum and persisted position/state/seat context retained; NativeSelect, shared workload buttons, inherent chair/roll-call row targets and leader outreach buttons extend it. Final workload/leader controls were exercised through the existing sign/outreach journeys; root’s broad integration capture remains separate. |
| Congress members | Shared Card, Input and NativeSelect; density and native phone selection; URL filters/sort/Back/reload regression passed390. Final1440 repeat pending. |
| Congress bills/nominations | Shared full-target Cards and stage tags; existing public assessment semantics retained. Bill-on-desk evidence/subject journey passed390/1440 both themes. Nomination panel was navigated by the Brief/Congress regression; no claim of every nomination stage inspected. |
| `/washington/congress/bill/$id` | Document, recorded passage, public member-evidence Sheet and linked outreach inspected390/1440 both themes. Predefined veto objections compiled/tested; actual signing, predefined veto, Record trace and reload passed390/1440. |
| `/washington/congress/post/$id?bill=…` | Rebuilt officeholder/position/request/outreach/history. Bill→post→person→Back retains bill and restores focus;390/1440 light/dark. Actual private-call outreach and the returned pending state also passed390/1440. |

## Verification record

Project inspected: engineering instructions, North Star/current status, route/readers, adapters, shared Card/Button/Field/NativeSelect/Sheet/Stages contracts, existing browser/unit tests and package scripts. Reuse searched across `packages/ui-web`, Brief, decision/modeling and Congress source. No new primitive or dependency was added by this workstream.

Blast radius: React route composition and presentation of existing campaign readers, navigation hit targets, shared projection presentation and test selectors. Existing authorization, data provenance, URL context, save writes and engine effects remain authoritative. Obsolete memorandum, ring/chip, profile-header, bespoke projection-button and superseded obligation CSS was removed with the replacement.

Check: Web production build, then strict typing, lint and focused readers/screens.
Command: `pnpm --filter @admin/web build`; `pnpm --filter @admin/web typecheck`; `pnpm --filter @admin/web lint`; `pnpm --filter @admin/web exec vitest run src/washington/congress/screens.test.tsx src/washington/congress/aisle.test.tsx src/washington/congress/search.test.ts src/brief/search.test.ts --maxWorkers=1 --minWorkers=1`.
Result: pass.
Observed: Build completed with the existing large-chunk warning; strict typing/lint completed;21 tests passed. The mocked overview renderer still emits the existing RouterProvider warning. Final commands include predefined veto and workload/row-control refinements.

Check: Populated Brief, decision, bill/outreach, obligation, allegation, unavailable routes and real forecast evidence.
Command: `E2E_ATTACH=1 E2E_PORT=5292 pnpm --filter @admin/web exec playwright test tests/shadcn-decision-workspaces.spec.ts --project=mobile-390 --project=desktop-1440 --workers=1`.
Result: pass.
Observed:11 passed,1 deliberately skipped expensive duplicate mobile forecast computation. Both themes/widths passed the ordinary interactions. Actual four-week forecast ran at1440 and its two alternatives exposed ten dated rows. Escape and Back focus, selected radio cards, subject/bill context, runtime errors and horizontal overflow were checked. The last predefined-veto/workload refinement followed this run; the dedicated residual checks below now cover its action/browser behavior.

Check: Existing calendar/history/full-fringe and persistent Congress context.
Command: `E2E_ATTACH=1 E2E_PORT=5292 pnpm --filter @admin/web exec playwright test tests/brief-congress-rebuild.spec.ts tests/washington-congress.spec.ts --project=mobile-390 --project=desktop-1440 --workers=1`.
Result: partial.
Observed: Three390 tests passed: light/dark calendar/history/fringe and filter/seat/Back/reload context. The legacy action spec retained the obsolete exact Brief heading and expected desk work on Overview; that run was interrupted, those selectors were updated to the actual title and Bills tab, and action verification is pending. No application failure is represented as a passing check.

Fixtures: `case-families`, `decision-case-backed`, `scandal-live` and `scandal-ended` generated through existing fixture builders and save roundtrips. `issued-report-decision` could not generate because its authored job output is absent in a fresh worktree; no substitute report was fabricated. The ordinary case-backed decision was used instead.

## Inspected captures

Committed evidence under `evidence/shadcn-decisions/`: `brief-light.png`390, `decision-board-light.png`1440, `outreach-dark.png`390, `clock-light.png`390, `scandal-dark.png`390, `forecast-observations.png`1440. Captures were opened and inspected; the stage screenshot includes the corrected shared vertical sequence. They document inspected states, not every route/state combination.

## Challenge and controls

This is a shared-context implementer challenge, not independent visual acceptance. Strongest failure: a cleaner card can make uncertain information look authoritative. Control: separate alleged/known/counsel assessments; label public support unknown; disclose run counts and ranges; permit only actual subject/cause destinations. The best alternative was targeted repairs to the retained memorandum/long evidence list. Rebuilding these compositions was accepted because the earlier layout buried facts and context and duplicated exact-click controls; existing comparison, chart, authorization and navigation mechanisms were retained.

Verdict: accepted with controls for integration. Observable outcomes are proved on the listed surfaces; root’s broader stable-integration checks, full viewport/state acceptance and workload-control capture remain required. No push, deploy, new scenarios, engine/save change or worktree deletion occurred.


## Residual proof completed after source checkpoint

Source checkpoint: `fe176f865`. No application source changed during these residual checks.

Check: Retained complete congressional action journeys on phone and desktop.
Command: `E2E_ATTACH=1 E2E_PORT=5292 pnpm --filter @admin/web exec playwright test tests/washington-congress.spec.ts --project=mobile-390 --project=desktop-1440 --workers=1 --output=/private/tmp/shadcn-decisions-congress-actions`.
Result: pass.
Observed:4/4 passed. Overview/workload, state selection, member spectrum, seat→dossier→Back, Bills tab→bill→sign→Record, and leader→private call→receipt→pending approach were exercised at390/1440. The stale exact heading and old Overview desk location in this legacy spec were corrected before the completed run.

Check: Statutory clock, predefined veto, persistent objection and loaded brand image.
Command: `E2E_ATTACH=1 E2E_PORT=5292 pnpm --filter @admin/web exec playwright test tests/shadcn-decision-workspaces.spec.ts --project=mobile-390 --project=desktop-1440 --workers=1 --grep 'statutory clock|Brief inherent.*dark' --output=/private/tmp/shadcn-decisions-residual-captures`.
Result: pass.
Observed:4/4 passed. `/brief/clock/bill-desk` rendered; no free-text veto field existed; the veto verb remained disabled until a predefined objection was selected; authorization recorded the actual objection and it survived Record reload. Dark decision board/radio/method/Back-focus checks also repeated at both widths with the executive artwork decoded before capture.

Additional inspected durable captures: `decision-board-dark.png`390 and `veto-objection.png`390. The narrow dark stage sequence and both decision-board compositions were manually opened and inspected, as were the forecast evidence table and mobile obligation/outreach surfaces. No overlapping text or horizontal overflow was observed in these checked states. Automated screenshot creation alone was not treated as visual acceptance.

Remaining limits: the resolved-scandal fixture was generated but not opened; not every nomination stage or every statutory clock was visually walked in this workstream. All six supported widths, assistive-technology behavior beyond exercised keyboard/focus interactions, contrast measurement and the repository-wide build/test/proof gates belong to the stable integration checkpoint. The existing suite’s mocked RouterProvider warning and large production-chunk warning remain disclosed. No claim of complete application migration is made here.

## Cabinet-graft route/view regression follow-up

The existing disclosure regression assumed the retired inline inquiry list, default Office record, default Person career and separate Weekly digest heading. It now opens the matching inquiry-card inspector, selects Office **Record** and Person **Career and counsel**, then checks the legacy digest redirect inside the single Brief history workspace. Office and career sections are required to be visibly mounted before either a zero or one event-link assertion can pass; this prevents a hidden/unmounted section from producing a vacuous concealed-state pass.

The original fixture's world-actor/event-ID/person/turn validation, exact inquiry stage and name visibility, Office and Person original-event link counts, Record search and deep-entry concealment, and retained-week attribution counts are unchanged. No product, engine, save or fixture source changed.

Check: Cabinet-graft disclosure and provenance through rebuilt routes/views.
Command: `E2E_ATTACH=1 E2E_PORT=5189 pnpm --filter @admin/web exec playwright test tests/cabinet-graft.spec.ts --project=mobile-390 --project=desktop-1440 --workers=1 --output=/private/tmp/shadcn-cabinet-graft-proof`.
Result: pass.
Observed:2/2 passed,56.0s at390 and56.8s at1440, through both opened and reported states. This uses the integrated5189 dev source in fresh browser contexts because this worktree's5292 source predates the Office/Person tab rebuild. It does not alter the user's browser storage or campaign. No build/typecheck rerun is claimed for this test/document-only follow-up.

This regression establishes disclosure and navigation behavior. Its pre-existing screenshots can capture an opening Sheet transition, so they are not used as fresh settled visual-acceptance evidence. All original provenance/disclosure assertions remain present.
