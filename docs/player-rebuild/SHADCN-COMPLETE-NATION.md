# Nation completion: budget, policy and emergency workspaces

2026-10-15. Branch `codex/shadcn-complete-nation`, persistent checkout `.worktrees/shadcn-complete-nation`, inspected base `12501c852`. Preview port 5294. No deployment or save-schema change.

## Intended outcome

A President can edit the allocation while comparing its actual consequences, distinguish instrument templates from issued signatures, inspect an exact stored signature, and authorize an emergency response without losing the incident context. Phone and desktop expose the same tasks. The canonical shared `NativeSelect` dependency is `42eb29c64`, applied in this isolated checkout as `98f293f0e`; the Nation commit does not own that dependency's files.

## Scope and source findings

- Budget's later CSS override stripped panel padding and surface hierarchy. The old sticky summary could cover the allocation controls on phone and desktop. Budget now has a responsive editor/evidence workbench, standard shared Card around the editor, normal-flow totals and comparisons that reflow against their panel width rather than the viewport alone. Unchanged native range controls retain keyboard editing and existing calculations.
- Policy put the global executive-order collection behind six unrelated domain cards on phone. Tabs now lead the task. Orders occupies the full data-width workspace. Proposals and implementation retain the domain rail on desktop; phone uses the shared Field/NativeSelect pattern and a portfolio-comparison Sheet with the same whole-card domain links.
- The order board previously mixed unsigned templates and issued signatures in one total and several repeated charts. Separate collections, scoped status counts, status selection and search now use existing Tabs, Field, Choice, ShareBar and Collection. `orderScope`, `orderStatus` and `orderQuery` are validated URL search values, preserved on reload and Back.
- A signed-order link previously opened the generic mutable order template. It now identifies its stored signature through `?record=…`. The shared Sheet reads only saved facts: signature, subject reference, reviewer, lifecycle and assessed challenge risk. It explicitly refuses to reconstruct complete historical terms that the save does not contain. A wrong reference shows a missing-signature state. Rescinded or expired signatures are no longer shown as in force.
- Emergency replaced its whole board with an action form. Incidents, geography and the selected response now remain together; actions and receipts use the existing shared Sheet and existing confirmation pipeline. The highest-priority actual incident leads when no selection was specified. An invalid explicit selection does not silently substitute a different incident. Historical stability evidence follows the operational workspace.
- Emergency prose claimed that a generic declaration opened the “heaviest orders.” Those blanket claims were removed. Existing statute-specific authority help and legal/appropriation predicates remain authoritative. This work changes neither Guard execution nor legal mechanics.

The change extends the existing presentation models and shared shadcn/Radix primitives. No second component library, new dependency, engine change, dataset or fabricated forecast was added. Searches covered current Card/Sheet/Field/Choice usage, Budget projections, the order pipeline, all OrderScreen consumers and existing browser journeys. Replaced order-stage/domain shelf CSS and duplicate UI composition were removed.

## Route and task coverage

| Surface | Exercised behavior | Evidence |
|---|---|---|
| `/nation/budget` | Keyboard allocation edit; changed-line indication; consequences; no page overflow | `budget-*.png` |
| Budget authority | Existing flow view opens and fits | Browser assertion |
| Federal books | Existing annual books open and fit | Browser assertion |
| `/nation/policy` proposals | Selected domain; compact phone picker; full portfolio Sheet; comparison surface | `policy-*.png` |
| Policy implementation | Existing stance, responsible official, timing and execution evidence fits | `implementation-*.png` |
| Policy orders | Actual/catalogue separation; search; reload; return context | `orders-*.png` |
| `/nation/policy/order/:id?record=:id` | Real clean-power signature; exact stored reference; inspect/close; Back returns to collection query | `signature-*.png` |
| `/nation/emergency` | Actual hurricane selection; mapped context; available response | `emergency-*.png` |
| Emergency action | Default wait; disabled unselected action; cancellation; focus returns to trigger | `emergency-action-*.png` |
| Emergency declare/end | Actual review, declaration, receipt, return, end, final receipt | Existing `nation-policy.spec.ts` journey |

Captures are retained under `docs/player-rebuild/captures/nation-<surface>-<theme>-<viewport>.png`. Captures are from real fixture campaigns imported through the normal player save interface. Disposable browser profiles use the isolated built preview; they do not touch the owner's campaign. Composed sizes are 390×844 and 1440×900 in light and dark. Screenshots reflect the application's internal scrolling workspace; a full-page screenshot does not imply every internal scroll position was visually inspected. Other sizes, additional order subject forms and expiry/court lifecycle visuals remain integration coverage, not a completed visual claim here.

## Validation record

Check: presentation model and generated package output
Command: `pnpm --filter @admin/player-core run build`
Result: pass
Observed: TypeScript build exited 0.

Check: exact signature routing and ended lifecycle
Command: `pnpm --filter @admin/player-core exec vitest run src/policy/order-pipeline.test.ts`
Result: pass
Observed: 9 tests passed, including exact encoded signature URL and rescission retaining earlier records.

Check: production player build, before typecheck
Command: `pnpm --filter @admin/web run build`
Result: pass
Observed: Vite production build completed; existing large-chunk warning remains.

Check: scoped player typecheck
Command: `pnpm --filter @admin/web exec tsc --noEmit`
Result: pass
Observed: Command exited 0.

Check: changed TypeScript/TSX lint
Command: `pnpm exec eslint apps/web/src/nation/budget/AllocationEditor.tsx apps/web/src/nation/budget/BudgetScreen.tsx apps/web/src/nation/emergency/EmergencyScreen.tsx apps/web/src/nation/emergency/EmergencyActs.tsx apps/web/src/nation/policy/OrderPipeline.tsx apps/web/src/nation/policy/OrderScreen.tsx apps/web/src/nation/policy/OrderRecord.tsx apps/web/src/nation/policy/PolicyScreen.tsx apps/web/src/nation/electorate/Cuts.tsx apps/web/src/routes/nation.policy.index.tsx 'apps/web/src/routes/nation.policy.order.$id.tsx' apps/web/tests/shadcn-complete-nation.spec.ts apps/web/tests/nation-policy.spec.ts packages/player-core/src/policy/order-pipeline.ts packages/player-core/src/policy/order-pipeline.test.ts`
Result: pass
Observed: Command exited 0.

Check: responsive Nation investigation and action journey
Command: `E2E_PORT=5294 E2E_ATTACH=1 pnpm --filter @admin/web exec playwright test shadcn-complete-nation.spec.ts --project=desktop-1440 --project=mobile-390 --workers=1`
Result: pass
Observed: 4 journeys passed (390 and 1440, both themes), including reload/Back context, compact domain navigation, portfolio Sheet and emergency cancellation/focus restoration.

Check: actual emergency declaration and ending through the new Sheet
Command: `E2E_PORT=5294 E2E_ATTACH=1 pnpm --filter @admin/web exec playwright test nation-policy.spec.ts --grep 'declare an emergency over a running condition' --project=desktop-1440 --project=mobile-390 --workers=1 --output=/private/tmp/shadcn-nation-emergency-results`
Result: pass
Observed: Both journeys passed, including nested review, saved declaration, receipt, ending and return.

Check: repository integration validation
Command: Root build, typecheck, lint, tests and applicable proof gates
Result: not run by this subagent
Observed: Parent owns the stable integration checkpoint; scoped checks above do not stand in for it.

## Adversarial decision and controls

Strongest failure: a rich historical inspector could imply that today's draft reconstructs what the President originally signed. Best alternative: keep the old generic page but remove historical implication. Accepted with controls: exact record IDs, stored facts only, explicit missing-term disclosure, missing-reference empty state and a regression test. There is no new historical save schema in this slice.

The compact mobile domain picker hides the simultaneous six-domain comparison. Control: the same portfolio cards remain one button away in a focused Sheet, with whole-card navigation, explicit labels and the same underlying presentation model. The desktop rail retains simultaneous comparison. Browser verification exercises both paths.

No legal authority is established by visual design, a generic declaration or classification styling. The UI continues to distinguish modeled scope, statutory findings, funding and the separate status of signed instruments. Current authority help is reused; no new unsourced legal citation is asserted.

## Closing gates

Project inspected and blast radius named above. Existing capabilities reused; no new dependency. Final command and surface results are recorded below. Diff reviewed by owned paths; no save/engine change. Remaining risk: full integration, the uncomposed viewport sizes and the full catalogue of subject-specific order forms require parent verification before application-wide acceptance.

Check: policy task parity after mobile domain navigation changed
Command: `E2E_PORT=5294 E2E_ATTACH=1 pnpm --filter @admin/web exec playwright test nation-policy.spec.ts --grep 'enact a stance' --project=desktop-1440 --project=mobile-390 --workers=1 --output=/private/tmp/shadcn-nation-policy-results`
Result: pass
Observed: Both actual enactment journeys passed, including review and receipt.

## Rendered inspection record

Opened and inspected the retained light phone Policy, Emergency and signature captures; light desktop Budget and Orders captures; dark phone signature and Policy captures; and dark desktop implementation and Emergency captures. Budget's overlapping sticky summary and narrow comparison columns were observed, corrected, rebuilt and captured again. Native selector controls were observed unstyled, then replaced with the canonical NativeSelect and captured again. The final captures show readable panel padding, distinct surfaces and the expected compact domain control.

The new signature inspector still has generous inherited heading spacing; compacting that inspector is a follow-up, not an inferred visual sign-off. The emergency-map image was captured before verifying a settled US camera/highlight; its geographic rendering is not visually accepted here. A passing no-overflow assertion does not establish that camera's correctness. Other retained screenshots are automated artifacts, not an assertion that each internal scroll position was manually walked.

Outcome: A President can edit an allocation with live consequences, distinguish catalogue from signatures, inspect the exact stored signature and use an emergency action without losing its board.
Surface: Built Vite preview at port5294, normal save import, actual Policy/Budget/Emergency routes.
Data: Existing hurricane-request and week-12 fixtures; browser actions produce a real clean-power signature and real emergency declarations in disposable campaigns.
Observed: Allocation responds to keyboard input; separate issued/catalogue counts and search persist; exact signature reference opens in Sheet; mobile portfolios remain navigable; declaration/end and policy enactment produce actual reviewed receipts; cancel restores focus.
Verdict: proven for these bounded journeys. Whole-application visual acceptance and stable emergency-map camera remain parent integration work.
