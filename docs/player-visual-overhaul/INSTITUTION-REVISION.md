# Office and Executive evidence revision — 2026-10-14

The supplied screenshots identify retained office-file patterns, not a completed subpage migration. This revision rebuilds office operations/performance, replaces the assessment card/expand pattern, adds deliberate shared dossier insets, and makes the delivery, services and roster views denser at tablet/desktop widths. Material tokens, actual presentation models, saved campaign data, actions and subject navigation are retained.

## What changed and why

- Shared dossier sections now have 16px interior padding, restrained borders and compact headings. Circled section numbers and the generic brand mark masquerading as a seal no longer appear in those headings/banners. Other dossier consumers inherit these shared changes; their full route coverage is not claimed here.
- The office's appointment/backlog/directive/acting-limit strip is replaced by an operational summary: explicit appointment authority, actual workload/directive counts, and the statutory acting limit with its unit. The limit is not presented as time remaining. Missing conditions are not turned into invented zeroes.
- Office performance uses four adjoining number/chart comparisons on desktop and two columns on phones. Its public operating values remain the existing `OfficeCondition` readings, on a stated 0–100% scale.
- Five assessed qualities use one comparison matrix with four ordinal bands, confidence and a visible consequence. The first sentence introduces the consequence; the complete existing explanation remains always visible in the Assessment basis section. Basis links move to that section; they do not expand or conceal content. Personal figures remain ordinal bands rather than precise hidden attribute scores.
- Delivery/services/full roster retain useful semantic tables and their sorting/grouping. Desktop/tablet comparisons continue down to a 38rem content breakpoint; phones reflow. The full roster's numeric band label occupies the full reading width so “Competence” does not split beside its figure.

## Institution identity

The old supplied department artwork was inspected and found to be stylized globe/shield symbols. Fifteen department insignia files were sourced from the Government Publishing Office's [executive-department catalogue](https://libguides.fdlp.gov/c.php?g=1506135), downloaded and bundled locally. All fifteen were visually inspected together; asset URLs, institution IDs, descriptions and retrieval date are in `assets/player/institutions/SOURCES.json`. The catalogue includes both seals and logos (USDA uses its logo); they are called insignia in the UI.

`institutionArtwork` resolves exact institution IDs or exact department names. `InstitutionMark` extends the existing semantic emblem component. Office headers/inspectors, department rows, public services and organization relationships use that same identity. Known office dossiers have their own sourced watermark. Unregistered bodies retain a named semantic icon in lists and a text file header; they are not given an unrelated department seal. The application logo remains unchanged. No new image-generation service, dependency, engine contract or save-schema change was introduced.

## Challenge

Strongest failure: richer identity and denser tables could become decorative bureaucracy, obscure uncertainty, or make long labels collide. Best alternative: targeted padding repairs using the old cards. Verdict: accepted with controls, in shared context. The targeted repair leaves the old oversized facts strip, hidden consequences and false seal identity intact. Controls: exact artwork mappings, no invented gauges/counts, public operating percentages distinct from personal ordinal bands, complete explanations available without disclosure, readable units, phone task parity, real action/back journeys and rendered inspection. This is not independent design approval or full application visual acceptance.

## Verification

Check: workspace compile, typecheck and lint
Command: `pnpm run build` then `pnpm run typecheck` then `pnpm run lint`
Result: pass
Observed: all workspace tasks completed. Final CSS refinements also compiled with `pnpm --filter @admin/web run build`.

Check: web unit suite
Command: `pnpm --filter @admin/web run test`
Result: pass
Observed: 70 files, 452 tests passed. Last rerun includes the text-only fallback dossier header.

Check: real Washington journeys at all six supported widths
Command: `E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web run test:e2e washington.spec.ts --workers=2`
Result: pass
Observed: 36 tests passed, including office selection, filtering, appointment comparison/authorization/receipt, resignation, person assessments and navigation. The personal-reading check now distinguishes ordinal bands from precise percentages.

Check: populated rendered layouts and accessibility
Command: `node /private/tmp/institution-review-final.cjs`
Result: pass for document overflow and Axe; rendered inspection identified subsequent refinements
Observed: 56 combinations: office, delivery, services and roster × two themes × 320/390/768/845/1280/1440/1920px. No document overflow, page errors or WCAG A/AA Axe findings. Office section padding measured 16px; old assessment disclosures count zero. Automated success did not catch a confidence-word collision and a rectangular raster watermark edge, both subsequently corrected.

Check: final assessment and detail corrections
Command: `node /private/tmp/institution-matrix-recheck.cjs`; `node /private/tmp/institution-detail-recheck.cjs`
Result: pass
Observed: six assessment rechecks at 768/845/1440 in both themes passed overflow/Axe after stacking confidence labels. Twelve final office/roster rechecks at 320/845/1440px in both themes passed with no overflow or Axe findings. Corrected captures were opened and inspected. `node /private/tmp/institution-roster-spacing.cjs` additionally measured all 30 rendered ordinal charts at 845px: labels fit their tracks, with at least 3px clearance before figures.

Check: applicable proof gates
Command: `node scripts/verify-css-architecture.mjs`; `node scripts/verify-disclosure.mjs`; `node scripts/verify-person-consequence-alignment.mjs`; `node scripts/report-metric-registry.mjs`; `node scripts/verify-metric-registry.mjs`
Result: pass
Observed: CSS ownership/layers valid; no precise personal score printing; consequence alignment valid; regenerated consumer inventory current (284 fields, 704 claimed readers). Existing metric baseline limitations remain unchanged.

## Surface inspection and limits

Inspected the fifteen-asset sheet; phone office/performance/assessment views; 768px service comparisons and the corrected assessment matrix; 845px delivery/roster; 1440px dark office identity. Selected inspected captures, raw browser results and command logs are retained under `evidence/institutions/`.

Outcome: office facts and assessments are purposeful compact evidence with interior spacing and genuine department identity; Executive comparison views remain dense at mid/large widths.
Surface: live application on port 5188, populated `washington-chairs` campaign in disposable browser contexts.
Observed: actual operational figures and chart values; no assessment expand control; complete basis below the matrix; proper department artwork; retained subject/actions and receipts.
Verdict: proven for the named surfaces and corrected captures.

Project/reuse inspected: existing office/person/Executive models and shared dossier, chart, navigation and sorting components. Interfaces extended only in web presentation (`Dossier.institution`, institution artwork/mark). Diff reviewed and whitespace clean. No commit, push or deployment. Full workspace tests/proof sweep were not repeated for this presentation revision: prior integration caveats, including full-run timeouts and committed-dist freshness, remain in `EXECUTIVE-REBUILD.md`. Safari/Firefox, assistive-technology review, unknown/error/crisis coverage and remaining route families are not certified by this pass. BL-136 remains open.
