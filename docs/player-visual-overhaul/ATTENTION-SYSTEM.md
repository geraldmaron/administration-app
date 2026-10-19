# Shared attention and work queues — 2026-10-14

Status: implementation verified on the named component families. Full application visual acceptance remains open.

## System-level correction

The owner rejected Oversight's nested waiting panel and Policy's oversized signature cards, and explicitly required holistic consideration. The shared defect was a composition mismatch: simple navigation work borrowed decision-card geometry, generic Open buttons and repeated status prose. The prior reading-ledger pass addressed numerical composition, not this separate family.

One attention/work-list foundation now governs these consumers. Shared `.attention-worklist` and `.attention-action` rules live in the existing shell attention stylesheet. The original Collection, MatterRow, Door, tabs, attention observer and transient return-context implementation remain the capabilities used. No second queue component or dependency was added.

| Family | Rebuilt composition | Information retained |
| --- | --- | --- |
| Destination attention, including Policy and Budget | One subject/status/review row for standing work; no surrounding card or duplicate Open button | Original announcement, mark id/version, destination/query/anchor and actual ready status |
| Brief secondary queue and destination decision matters | Flat aligned evidence rows; subject/actions then deadline/consequence at intermediate widths | Reason, urgency, held time, deadline, inaction consequence, Open/Put off and actual authorization |
| Oversight priorities | Count, named category, short status and explicit review destination | Notices, inspector obstruction, public inquiry and actual eligible vacancy counts; no combined invented score |
| Country priorities | One full action row with semantic icon, subject and named destination | Risk words, unknown intelligence, dossier context and existing view/filter search |
| Congress bill queues | Subject/stage/support columns, two-column intermediate arrangement and full-width assessment | Signing deadline, public support/override uncertainty, thresholds, sponsor and actual bill destination |
| Senate nominations | Nominee/office plus stage/status; no empty assessment block during vetting | Days open, readable committee name, controversies and actual public confirmation assessment when available |

Executive's existing compact roster remains the reference. Executive agenda acts retain full comparisons because they authorize consequences. Press story bodies and Security assessments contain evidence rather than simple navigation work; their broader density review remains open. This pass does not certify every page in the application.

## Navigation and attention contracts

Standing marks gained optional subject/status presentation fields; original titles, attention identity/version and badge accounting remain intact. No campaign or save schema changed.

A browser journey reproduced that country subject changes used replace-history navigation: Back left the dossier. View changes now push history; sector/filter changes continue replacing in place. A second regression test exposed lost keyboard focus. The existing return-context helper now supports stable identified controls as well as links, and Screen restores transient context on search-address returns. Hash-only arrivals retain their existing anchor behavior. The persistent world browser test checks actual Back, overview address, focus and overflow.

Freshness remains in the existing observer/seen ledger. Absolute New badges overlapped titles and Put off controls after rows became compact; badges now participate in row/text flow. Native controls, explicit review, original deadline/inaction text and reduced-motion behavior remain.

## Observable controls for future surfaces

1. A simple subject/status/action item is a row, never a rounded card inside another rounded card. Use the shared attention styles and existing collection/navigation capabilities.
2. A number leads only when it is an actual count; units/categories stay visible. Severity uses shared semantic ink plus words or icons, never colored framing alone.
3. A decision queue reserves space for real deadline and consequence evidence. A blank assessment is replaced with its explicit unknown or pending status, never an invented chart.
4. Actions name their destination. Subject changes preserve history; filters preserve selection; Back restores orientation, scroll and keyboard focus.
5. Validate a family through populated, sparse/unknown and representative destinations, then trace every consumer. Do not accept a border-only check as design acceptance.

## Verification record

Check: repository build before typecheck and lint
Command: `pnpm run build`; `pnpm run typecheck`; `pnpm run lint`
Result: pass
Observed: final command sequence exited 0; logs: `/private/tmp/attention-build-final.log`, `/private/tmp/attention-typecheck-final.log`, `/private/tmp/attention-lint-final.log`.

Check: player unit suite
Command: `pnpm --filter @admin/web run test`
Result: pass
Observed: final run passed 70 files and 450 tests; log: `/private/tmp/attention-web-final.log`.

Check: real Policy/Congress/country workflows
Command: `E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web run test:e2e nation-policy.spec.ts washington-congress.spec.ts world.spec.ts --grep "country attention keeps|government's file|sign an order|Congress:" --project=mobile-320 --project=desktop-1440`
Result: pass
Observed: 10 passed. Actual order signing, Congress bill/leader actions, country dossier sections, and keyboard Back/focus return. `/private/tmp/attention-final-integration.log`.

Check: final bill-list integration
Command: `E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web run test:e2e washington-congress.spec.ts --project=mobile-320 --project=desktop-1440`
Result: pass
Observed: 4 passed after the final intermediate-width bill/nomination geometry correction; `/private/tmp/attention-congress-final.log`.

Check: realistic surface matrix
Command: `node /private/tmp/attention-final.cjs`; `node /private/tmp/attention-families.cjs`; `node /private/tmp/attention-expanded.cjs`
Result: pass
Observed: 28 Policy/Oversight layouts, 56 Brief/bill/nomination/country layouts and 14 expanded Oversight layouts; seven widths (320,390,768,845,1280,1440,1920), both themes. Axe runs at 320,845,1440. All 98 final layouts had no document overflow, page errors or Axe violations. Evidence under `evidence/attention/`.

Check: applicable proof gates
Command: `node scripts/verify-css-architecture.mjs`; `node scripts/verify-web-boundary.mjs`; `node scripts/verify-disclosure.mjs`
Result: pass
Observed: zero CSS findings, clean web boundary, no new hidden score disclosure; final output `/private/tmp/attention-gates.log`.

Check: aggregate workspace tests
Command: `pnpm run test`
Result: not run for this follow-up
Observed: prior reading-ledger correction passed the aggregate; it is not claimed as verification of these later edits. This follow-up reruns the full player unit suite and cross-route browser workflows; engine/data sources were not changed.

Check: diff and running server
Command: `git diff --check`; `curl --max-time 10 --silent --output /private/tmp/attention-server.html --write-out '%{http_code}\n' http://127.0.0.1:5188/nation/policy`
Result: pass
Observed: no whitespace errors; server returned HTTP 200. Unrelated worktree changes are preserved; no commit, stage, push or deployment.

Outcome: simple attention work is compact, consistent and directly linked across route families; consequential matters retain their evidence and explicit authorization.
Surface: actual player on the isolated worktree server, disposable browser contexts.
Data: washington-chairs (four ready orders and eligible vacancies), day-one-orders, opening, case-families (five secondary matters and a signing deadline), appointments-desk (four vetting nominees), war-joined (three country priorities).
Observed: inspected Policy 320/845 light/dark, Oversight priorities and expanded evidence, Brief phone/intermediate, bill support uncertainty, nomination status and country risk/unknown rows. Final matrix: 98 layouts, zero measured overflow, page errors or Axe violations.
Verdict: proven for named component families and journeys; owner visual acceptance remains open.

Shared-context challenge: compact rows could hide urgency, legal consequences or uncertainty. Best alternative is keeping full decision cards everywhere, at the cost of burying actual work below repetitive framing. Accepted with controls: retain urgency words, deadlines, full inaction text and assessment thresholds; share row geometry; test actual decisions and return paths. No independent aesthetic reviewer is claimed. Full application coverage, unexercised loading/error variants, Safari/Firefox and assistive-technology devices remain unverified; BL-136 stays open. Logo remains deferred.
