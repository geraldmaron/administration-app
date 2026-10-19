# Browser comment revision — 2026-10-14

Status: implementation in progress in the existing isolated worktree. Logo deferred. Scope: lighter shared section inset and controls; Budget tradeoffs/thresholds, rebuilt Executive operating board, roster and evidence views/search/group/sort, Courts bench and empty/populated flow. No engine/save schema changes or new dependencies.

## Budget diagnosis

Reproduction
- Command: `node /private/tmp/comment-repro.cjs` (import opening-d through Saves, open /nation/budget at 845×988 dark, set first allocation slider to End).
- Environment: separate dev server on 5188 and disposable Playwright context.
- Data: existing opening-d fixture; changing the first line produces the congressional assessment.
- Frequency: deterministic in the reproduced capture; matches the supplied annotated screenshot.
- Observed: House summary width 697px, height 200px; Senate height 280px. Both compute `grid-template-columns: 56px 553px 72px` and contain zero element children.
- Expected: chamber and threshold readings use available space with normal prose wrapping.

Hypothesis: a former bar-grid container now holds an anonymous text item, placing all summary text in its first 56px track.
Refuted by: no grid, a wider first track, or structured children occupying the intended tracks.
Test: read full DOM text, computed tracks and children in the actual page before editing; opened the reproduced capture. Confirmed the same plain-text VoteBar markup in HEAD, so this precedes the current visual edits.
Verdict: supported.

Cause
- Statement: VoteBar emits plain text into the three-track `.budget-vote__bar` grid intended for a label, bar and figure.
- Evidence: actual DOM/computed-style measurements above, full source and HEAD comparison.
- Accounts for: extreme word wrapping, tall chamber paragraphs and large unused horizontal space; viewport-specific outer layout changes do not remove the inner 56px track.
- Unexplained: bulk in the tradeoff panel is a separate composition issue (nested framing, generous cell type/inset), not this grid defect.
- Confidence: high for the grid defect.

Reuse search: existing Field/Choice/SortPicker/sortRows, Cabinet and roster controls, ChairRead/ReadBadge, Portrait, court-system presentation models, court bench and stage components. Extend these sources instead of adding a competing widget library or new data model. Existing node assessments stay bands, not invented numeric scores.

Load-bearing choice: thinner sections must not erase grouping or focus. Accepted with controls: clear headings/dividers, readable labels and units, explicit unknown support, keyboard/focus checks and both-theme viewport inspection. Empty courts must not imply a populated pipeline or guarantee an appeal sequence.


## Executive supersedes the first card attempt

The owner rejected the intermediate cards as text-heavy. The completed direction and verification status now live in `EXECUTIVE-REBUILD.md`; the old KPI/card implementation is removed. The full roster, delivery and service layouts are included in the rebuild. No claim is made that untouched person dossiers or the review ceremony meet this direction.
