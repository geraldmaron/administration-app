VERDICT: Accepted with controls

Owner steering, 2026-10-14: adopt a Material 3 inspired design system across shared components and core compositions; extend chart types and gauges. Logo work comes last, after the broader interface changes. This supersedes the original requirement to retain the logo and permanent navy chrome.

# A living presidential workspace

Status: representative implementation is available in the separate player-visual-overhaul worktree. See EXECUTION.md and VERIFICATION.md for completed work and remaining acceptance. The interactive Economy mockup remains the design reference. This plan expands the earlier audit specification: the goal is a richer information experience, not merely repairing six defects or adding shadows.

## Recommendation

Build each core page as a connected situation: what is changing, the evidence behind it, the subjects involved, the decisions available, and what happened afterward. Pair a strong visual composition with progressively deeper information. Make motion explain changes in state and relationships. Use the existing simulation, routes, artwork and semantic registries.

The Economy mockup is the first design checkpoint. It combines a dominant temporal reading, a supply comparison, a traversable relationship chain, and a dense commodity comparison. It uses actual data from the gulf-oil-shock fixture. The displayed March 31, 2029 date belongs to that fictional campaign, not the real world. Replay uses recorded weekly prices; supplier and disruption panels remain explicitly labeled current snapshots.

## What the experience should feel like

A working presidential intelligence surface: clear enough to act, rich enough to investigate. A quiet navy frame establishes continuity. One situation headline sets context. The main visual answers the page's central question. Supporting evidence has lower visual weight; linked subjects are recognizable through name, glyph, flag or portrait. Detail opens in context, with a reliable route to a full dossier and a reliable return.

Depth is functional. Canvas anchors the workspace; opaque working panels carry primary information; inset evidence differentiates supporting readings; selected subjects gain a stronger border and tonal contrast; floating detail and confirmation rise above that context. Reserve shadows for separation, not decoration. Retain the logo, navy, blue, red, white and gold identity. The mockup's star seal is a placement proxy; production retains the actual logo.

## Page composition

**Brief — the situation and the next decision.** Place the priority matter and its deadline beside a compact evidence constellation: involved people/countries, relevant readings and the last recorded change. Below it, a dated change stream connects each update to its subject and receipt. Expand a reading in place; follow a subject to its dossier; return to the same matter. Quiet weeks have an honest summary, not an artificial crisis. Keep decision comparison and confirmation distinct.

**Economy — trace pressure through the system.** Use a large, labeled history chart as the anchor, an aligned supplier/share or sector comparison beside it, then a focused connection view and the full commodity board. Selecting a commodity updates the chart, stocks, suppliers, drivers and exposure together. Do not combine prices with unlike units into one ranking. Normalizing a comparison must name its baseline. Keep the list available when the relationship view is open.

**Security — commitments, capacity and uncertainty.** Pair geographic context with active theaters and the assets actually committed. A service/asset selection highlights its command, location, readiness and responsible office. A dated timeline distinguishes deployments, changes in posture and recorded operations. Show uncertainty as labeled ranges or unknowns only when the model supplies them. Avoid fictional travel tracks or animated aircraft whose positions are not modeled. Never sum ships, aircraft and formations into a single force-strength total.

**Institutional dossiers — people exercising authority.** Lead with the actual office/person identity, mandate and current matter. Connect authority, resources and delivery through aligned evidence groups. Display relationships as association unless the engine defines influence. Actions appear next to their prerequisites and consequences. Use actual portraits, department marks, linked committees/courts and receipts.

**Record — the durable consequence.** Make chronology, subject identity and consequence the primary reading. Selecting an event exposes before/after values and the exact linked subjects when recorded. Subject filters persist through dossier visits. Distinguish the player's acts, automatic world changes and later outcomes; do not manufacture attribution from temporal proximity.

Entry, founding, saves, settings and help inherit the same identity and surface roles, with simpler compositions appropriate to their tasks.

## Motion with meaning

| Trigger | Visible behavior | Truth and accessibility control |
|---|---|---|
| A simulation revision completes | Update the latest point, delta and related readings together; transition marks over roughly 300–500ms, then settle | Values derive from the committed revision. No ambient random fluctuation or implication of real-time markets |
| Player scrubs history | Move a shared time cursor; update the selected reading and readable value label | Only panels with historical data follow the cursor; others say current snapshot |
| Player requests replay | One finite playback of recorded observations; pause, scrub and replay controls remain available | Clearly labeled replay; stop at the latest observation; no autoplay loop or game advancement |
| A subject is selected | Highlight its direct connections and dim unrelated marks modestly; move the focus of the evidence panel | Keep labels readable; no global hairball or inference of hidden relationships |
| Player follows a relationship | Preserve subject identity as detail opens; brief position/opacity transition around 160–220ms | Full URL carries selection; Back restores parent filter, scroll and invoking focus |
| A new event is recorded | Insert the dated row with one restrained emphasis, then settle | Announce a concise update once; never announce every animation frame |
| Simulation work is pending | Show a stable pending state using the existing progress contract | Do not animate final values before the result exists; errors preserve prior valid readings |

Reduced motion removes interpolation and movement while retaining the exact final information, selection and status. Replay remains explicit stepwise history traversal. Pause ongoing replay when the view is hidden or the user leaves. Where a motion trigger does not exist in the game, the UI remains still. A wall-clock ticker is not part of this proposal.

## Interconnectedness: a navigable subject graph

Use a focused neighborhood around the selected subject, not a permanent all-world network. Each edge must declare its meaning: supplies, input with lag, reported supply pressure, authority, assignment, participation, or recorded consequence. Edge labels and accessible lists carry that meaning; geometry and animation do not substitute for it.

The Economy source already exposes commodity suppliers with nation IDs, input commodities with prose about lag, supply-pressure descriptions, and a domestic reader label. It does not expose all pressures as typed navigable subjects. Therefore:

1. Use supplier nation IDs immediately for dossier links, and commodity input IDs for related market selection.
2. Preserve structured lag metadata in the presentation model when available from the registry; do not parse text to recover it.
3. Add typed subject references to the presentation-model pressure entries by tracing their existing structured source. Do not turn a sentence containing a country or war name into a guessed link.
4. Treat a domestic reader as an exposure channel until a precise existing reading/route is resolved. Do not invent an impact percentage or forecast.
5. Use recorded event references for action → result → Record. Association alone never becomes a causal arrow.

Proposed presentation-only contracts: `SubjectRef` (existing domain kind/id, label and route target), `Relationship` (from/to, relation kind, evidence reference, as-of revision, optional explicitly modeled lag), `ObservationSeries` (measure, unit, baseline, observed points, provenance and optional supplied uncertainty), and a return-context contract for route selection/filter plus scroll and focus. First search for and extend equivalent existing types; these are required capabilities, not instructions to create duplicate abstractions. No engine or save-schema change is assumed. An unavailable relationship stays textual and is marked as such.

## Shared visual and data language

Use the earlier specification's semantic ground roles as the starting palette, then validate their use in the actual compositions. Navigation blue means navigation/selection. Party color means affiliation. Severity uses labeled semantic status. Quantitative series use distinct lines/markers and explicit legends. Positive direction and favorable consequence remain separate.

Use real subject identity throughout: existing COMMODITY_GLYPH and FORCE_ASSET_GLYPH mappings, institution and action registries, Flag and persisted portraits. The isolated mockup uses host-provided icons as placeholders; production uses the game's established silhouettes and actual logo. No generated crisis photography or decorative invented officials.

Prose and analytical data have different measures. Keep narrative passages around 68ch; use the proposed wider data measure only where comparison benefits. Use container width to determine columns. Preserve value/unit pairs and aligned numeric columns. Descriptions wrap naturally. On phones, stack situation → main reading → relationships → supporting comparisons; all actions and readable data remain available. Convert dense relationship diagrams to a labeled vertical chain/list rather than shrinking text.

## Sequenced implementation backlog

### Wave 1 — truthful data and shared foundation

Extend existing tokens, WorkSurface, Series, map settings and semantic glyph consumers. Repair direction/valence and map preference propagation first. Add visible chart units, baseline, dates/observation labels, sparse-history treatment, readable values and screen-space markers. Reuse current data loading and transition infrastructure.

Acceptance: the existing adverse-positive commodity case renders an upward indicator with adverse meaning; both-theme map preferences affect maps and legends; zero/unknown/one-point/constant data remain honest; no distorted endpoints; all six sizes preserve numbers and units. No new library is required.

### Wave 2 — Economy as the complete vertical slice

Extend Markets, CommodityDetail, the existing commodity models and route helpers. Implement coordinated selection, real history scrub/replay, supplier links, typed supported relations and the commodity comparison. Persist measure/sort/direction in validated route search. Implement consistent return focus/scroll. Future/current supplier data must never appear to follow a historical cursor.

Acceptance: select crude → replay/pause/scrub → inspect a pressure → open Saudi Arabia → Back. The same commodity, time cursor, sort and invoking focus return. The final plotted values match the existing view model; no simulation turn advances during replay. Both themes and phone layouts support the same task. This is the first integration checkpoint.

### Wave 3 — connected Brief, Security and one dossier

Extend existing Brief matter cards, security views, asset figures, office/person pages and Record links. Carry shared subject identity and as-of revision through the journey. Apply semantic animation on actual updates, not every render. Use an existing crisis and a quiet/sparse campaign to prove state-sensitive composition.

Acceptance: Brief → relevant evidence → subject → permitted act → review/cancel or result → Record → Back remains intelligible. In Security, assets retain their units, uncertainty is explicit and linked details retain context. Reduced motion and keyboard access work through the entire flow. This is the second integration checkpoint.

### Wave 4 — remaining families and integration

Extend existing Nation, Congress, Courts, Oversight, World, Press, Record and utility routes with the proven patterns. Keep successful page structures where they already answer the right question. Resolve every unverified coverage-ledger item or record an explicit reason it remains out of acceptance.

Acceptance: both themes at 320, 390, 768, 1280, 1440 and 1920 widths; long labels and realistic dense campaigns; empty/unknown/loading/error/retry/stale/refusal and confirmation states; keyboard/focus/200% text/contrast/reduced motion. Inspect long-page tails and nested scroll containers. BL-136 stays open until this evidence exists.

For code implementation, use the repository's real build-before-typecheck sequence, lint, tests, applicable proof gates and browser verification at stable integration checkpoints. This design prototype is not application validation.

## Challenge and decision gate

**Strongest failure:** an attractive moving diagram implies live knowledge, causal precision or historical snapshots the game never had. Control: every panel declares time scope; edges require modeled relations; animation only consumes observed revisions/history.

**Best alternative:** repair arrows, links and chart labels and keep current compositions. This is lower risk but does not deliver the requested visible interconnectedness or temporal exploration. Retain these repairs as Wave 1, then prove the richer approach in Economy before broad rollout.

**Load-bearing claims:** commodity series, supplier shares, stocks, named pressures and reader labels were extracted from the existing fixture/view model. Typed pressure destinations, historical supplier shares, quantified domestic impact and full cross-page restoration are not established capabilities; they are dependencies or intentionally excluded.

**Inverted assumption:** if extra motion and richness make the situation harder to understand, default to a settled chart and a one-hop connection view; deeper exploration remains optional. The design must answer what changed, why it matters and what is known without requiring animation.

**Who pays:** phone/low-vision users pay for dense layouts; maintainers pay for parallel chart and subject systems. Controls are phone task parity, visible labels, readable data alternatives and extension of existing primitives.

**Hostile expert:** independently fitted sparklines can imply false comparisons; cumulative supply losses can double count; a relationship chain can imply a numerical transmission model. Controls: label independent scales, keep components separate, normalize explicitly, and never encode unprovided effect sizes.

Decision: accepted with controls for a prototype and staged implementation proposal. Shared-context self-review, not independent review. The next decision is whether this Economy composition and interaction model express the desired visual direction. No application redesign begins in this phase.
