# Visual overhaul execution

Status: shared foundations and representative surfaces implemented locally; full application visual acceptance remains open. The owner subsequently requested a complete Material 3 inspired refresh and different visualization types. That direction supersedes the conservative chrome treatment below. The logo is explicitly deferred until the broader changes are visible.

Implementation worktree: `~/.codex/worktrees/player-visual-overhaul/admin-app`.
Base: `011d0c042fbb2e4e1bbb52c7b5b7b3d17e165fbb`. Audit and original checkouts are preserved. Dev server: `http://127.0.0.1:5188/nation/economy?view=markets`.

## Delivered

- Material 3 inspired shared foundations: theme-aware tonal navigation, filled pill selection, larger display typography, 24px working-card corners, 28px sheets, rounded buttons and segmented choices, cobalt primary and restrained status colors. Token CSS/TypeScript remain in parity. The former permanently dark navy frame is replaced by the active theme’s surfaces.
- WorkSurface data measure extends to 1344px; prose stays bounded at 68ch. Responsive Series uses its actual container width, printed units/domain/time labels, missing-observation gaps, readable observation lists, keyboard scrub and finite recorded replay. Reduced motion disables interpolation; replay pauses when hidden.
- Economy coordinates all eleven commodities with quote/history, supplier flags and shares, stocks, current pressures, modeled exposures and input lags. Current snapshots stay explicitly current during historical replay. Mixed-unit comparisons retain their units. Commodity price precision and direction come from actual readings.
- Subject Doors retain exact URL, selection, scroll and invoking focus through dossier visits and back navigation. Context is bounded in memory, with no save changes.
- New visualization variants extend existing primitives: Series supports area history with separate filled runs around unknown gaps; Gauge supports a full-circle ring; ShareBar supports supplier composition rings with readable legends. Economy adds a diverging comparison of percentage change on a common axis, and a traversable supplier→commodity→domestic exposure diagram. Unassigned supplier coverage is shown explicitly.
- Brief connects selected geography to its dossier and subject-filtered Record; recorded readings can be explored. Security removes the duplicated readiness KPI, puts its compact history beside a new ring assessment, and retains supporting comparisons. Institutional offices lead with actual mandate, person and linked authority. Record’s unselected state shows actual recent entries and explains the evidence structure.
- Page maps now honor saved color-vision and contrast settings. The actual lean map was checked before/after a saved Protanopia preference and reload.

## Reuse and boundaries

Inspected and extended existing Series, WorkSurface, Choice, sort controls, Door, Screen, mapSettingsOf, commodity presentation helpers and input registry, semantic glyph registry, Record filters, and office/force dossiers. No second chart framework, new dependency, engine/save schema changes, authored scenarios or Studio redesign. No push, deployment or commit requested or performed.

## Remaining implementation and acceptance

The core slice is reviewable, not a claim that all proposed family compositions are complete. Congress/courts/intelligence/people, comprehensive geographic asset connections, richer consequence compositions and all nested empty/error/confirmation variants retain their existing capabilities. They need their own visual acceptance and any further redesign specified in PLAN.md. The route ledger explicitly marks unverified final states. Replaying prices does not reconstruct historical suppliers or causal chains: those relationships remain current snapshots. Pressure prose has no typed subject identity, so it is not converted into guessed links.

See VERIFICATION.md for exact commands, failures and reruns. See ADVERSARIAL.md for the shared-context challenge and controls. BL-136 stays open.
