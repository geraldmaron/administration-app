# Verification and evidence limits

## Scope and execution

Audit only, at base `011d0c042fbb2e4e1bbb52c7b5b7b3d17e165fbb`. Existing screenshot, fixture and door-crawl tooling was reused. No reusable utility or application component was added. Browser contexts were disposable; the user's existing server and saves were left alone.

Commands observed completing in this session:

- `pnpm install --offline --frozen-lockfile`: exit 0 in the isolated worktree.
- `pnpm --filter @admin/web dev --host 127.0.0.1 --port 5187 --strictPort`: served the isolated player.
- `node scripts/dev/crawl-doors.mjs --port 5187 --fixtures week-30,decision-critical,long-war --per-shape 1 --json /private/tmp/player-visual-audit/doors.json`: exit 0, 139 doors, zero failures; see doors.json and doors.log.
- Existing `scripts/make-fixture-saves.mjs` and `scripts/dev/shoot-screens.mjs` generated fixtures and captured 324 combinations. Exact per-batch shell invocations are not retained in this package; their route/size/theme output and outcomes are retained in core.log, families.log, families-extra.log, markets.log, details.log, war.log and opening.log. Each capture process exited 0. Do not infer full visual acceptance from those exits.
- `node /private/tmp/player-visual-audit/states.cjs`: initial states and the awaited World → Chile → Back journey, both themes. See state-journeys.json. Dark search capture missed the overlay; this is not a passed search check.
- `node /private/tmp/player-visual-audit/report-render.cjs`: rendered the HTML report to 11 section images; report-render.json records all embedded images loaded and no section-level horizontal overflow.

The application used Vite source and checked-in package dist. No fresh build, typecheck, lint, full unit/e2e suite, balance check or proof sweep is claimed. Dist freshness was not independently rebuilt. Those checks belong to the later code implementation, in the specified build-before-typecheck sequence.

## Coverage and inspection

Six sizes: 320×568, 390×844, 768×1024, 1280×800, 1440×900, 1920×1080. Light and dark themes. Fixtures included week-30, opening-d, gulf-oil-shock, long-war, court-overview-recorded, decision-critical and engagement-week.

Captured combinations: core 48; remaining main families 192; selected markets 12; subject details 52; war tabs 12; early-term views 8. Additional shared-state captures are separate. There are 1508 PNGs including long-page parts, not 1508 independently reviewed states.

Manually inspected: all core first views across six sizes/both themes; detail first-view contact sheets across 1440/390/both themes (desktop dispatch single-shot excluded); 16 light desktop family first views; state contact sheets; full-size Security at 1280 light and 1920 dark, Markets 1440 light parts 1/3, Courts 1440 light, Executive 1440 dark; and all 11 rendered report sections. The report also shows the selected commodity detail and office dossier pairs at readable overview scale, linked to native resolution.

No document/surface overflow or console-error reports appeared in capture logs. Local `wide:` reports include deliberate scrollable tabs/tables and offscreen controls; they are not automatically defects. The helper resets body scroll before capture and caps long pages at six parts. It cannot prove deep-link initial scroll or complete long-page tails. Reproducing a wrap requires a named container and state, not merely one of those warnings.

The first scratch country probe sampled before the dossier heading changed and was invalid; its stale back-journey.json is excluded. The corrected states probe waited for the new heading and returned to World in both themes. This verifies destination and Back reachability, not focus/scroll/filter restoration.

Unverified routes and states are listed explicitly in COVERAGE.csv. Title captures show save loading, not a settled entry screen. Dark search missed the overlay. Consequential review/confirm/cancel, failure/retry/refusal paths, all unknown-information variants, alternate browser engines, 200% zoom, keyboard-only task parity, contrast, reduced motion and assistive technology remain implementation-stage checks. Source-confirmed palette bypass is not a completed live preference-switch test.

## Report design and figure checks

Design system: system sans body 16px; restrained navy/gray; heading hierarchy; consistent 44px page padding; tabular comparisons; source notes below findings; numbered footers 1–11. HTML text is selectable; native-resolution PNGs are linked, not upscaled. The large raw archive is a local review asset, not an email attachment. There is no PDF export or embedded-font claim.

Figure: Desktop usable-width comparison, report section 2
Claim: Larger monitors do not produce proportionally wider data space.
Data: measurements.json; live audit viewport measurements; CSS pixels, no time series or denominator.
Axes/scope: 1280, 1440, 1920 viewport widths; content widths 1128, 1152, 1200.
Missing: other viewport measurements are not implied.
Read-back: 1128 / 1152 / 1200 usable pixels.
Verdict: honest; a comparison table, not evidence of a wrapping defect.

Figure: Proposed role swatches, report section 4
Claim: Shared tonal roles can distinguish canvas, panel, evidence and overlay.
Data: SPECIFICATION.md proposals, not measured current colors.
Axes/scope: light and dark role assignments; no quantitative encoding.
Missing: contrast and live component acceptance remain unverified.
Read-back: paired light/dark role swatches, explicitly proposed.
Verdict: honest as a proposal, not an accessibility certification.

Figure: Brief paired captures, report section 5
Claim: Existing priority matter can anchor the composition.
Data: week-30 fixture, 1440×900 light/dark; current application capture.
Axes/scope: first visible screen, not whole campaign or redesigned output.
Missing: offscreen content remains outside the figure.
Read-back: priority matter and supporting readings visible; annotations describe proposed hierarchy.
Verdict: honest current-state illustration.

Figure: Markets paired captures, report section 6
Claim: Selected commodity evidence can carry identity and supplier navigation.
Data: gulf-oil-shock, crude selection, 1440×900 part 2, light/dark.
Axes/scope: current supplier/history detail; no newly modeled causal chart.
Missing: preceding and following sections are linked in the archive.
Read-back: supplier rows and existing history plot visible; annotations are prospective.
Verdict: honest; the existing chart's missing context is a finding, not endorsed design.

Figure: Security paired captures, report section 7
Claim: Repeated readiness panels compete with commitments.
Data: week-30, 1440×900 light/dark, current overview.
Axes/scope: first view of quiet command posture, not all wartime states.
Missing: active-war variants are separate archive captures.
Read-back: headline and readiness panel repeat the same measure.
Verdict: honest current-state illustration.

Figure: Institutional dossier paired captures, report section 8
Claim: Existing identity assets support a clearer mandate/evidence/action hierarchy.
Data: Energy office, week-30, 1440×900 light/dark.
Axes/scope: office first view; no causal flows asserted by screenshot.
Missing: lower-page acts and alternate office states not shown.
Read-back: office framing, chair identity and readings retained; proposed changes are textual annotations.
Verdict: honest current-state illustration.

Inspection record
- p1–11: clean; every section opened and inspected, including the last. Paired captures are overview illustrations with links to native resolution.
Renderer: Playwright Chromium section screenshots of REPORT.html, opened with image inspection tools.
Surfaces: 11 of 11 inspected.

Artifact record
- Design system: answered: see Report design ("system sans body 16px").
- Figures checked: answered: see six figure blocks ("honest current-state illustration"), 6 of 6 grouped figures/tables.
- Surfaces walked: answered: see Inspection record ("p1–11: clean"), 11 of 11.
- Furniture: answered: section/footer numbering 1–11 matched; local link targets validated during packaging.
- Export checked: answered: HTML rendered, all paired images loaded; selectable text and deliberately chosen system fonts; no PDF implied.
- Defects: no report rendering defects; evidence limitations accepted and recorded above, including the missed dark search and unsettled title captures.
- Residual risk: application coverage and accessibility limits listed above; settle them through the specified live implementation verification, not through this document's rendering checks.

Packaging check: `git diff --check` exited 0. `git status --short` showed only docs/BACKLOG.md and this audit directory. All REPORT.html local link/image targets existed. The separate audit server was stopped after capture; no application source was modified.
