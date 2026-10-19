# Visual overhaul implementation specification

Status: proposed implementation, not applied. Audit base: `011d0c042fbb2e4e1bbb52c7b5b7b3d17e165fbb`. Owner direction: modern presidential workspace; all player surfaces; preserve simulation and authored content.

## 1. Sequence and ownership

1. **Correct visual meaning (BL-136 / BL-138).** Fix F1 direction/valence and F2 map preference propagation. These changes precede cosmetic work. Reuse the existing Stat/MoveText semantics and `mapSettingsOf` rather than adding parallel formatting or settings state.
2. **Shared foundations (BL-136).** Apply the role/color and chart contracts below to existing design tokens, WorkSurface, Series, Stat, Layer and their CSS. Keep defaults compatible while consumers migrate. Update TypeScript and CSS token projections together.
3. **Representative surfaces.** Migrate Brief, Economy/Markets, Security and the Energy office dossier using the four annotated directions in REPORT.html. Verify their real journeys and both themes before applying the pattern elsewhere.
4. **Remaining families.** Apply the same roles to Nation/state, Budget/Policy/Emergency, Executive/person, Congress/Courts/Oversight, World/nation/war/command/organization/treaty, Record/Press, entry/founding/saves/settings/help and shared states. Retain successful compositions; do not rebuild merely to make every page identical.
5. **Stable integration checkpoint.** Run the repository's required validation sequence and fresh browser matrix. Close existing backlog items only against their full acceptance, including the unverified states in COVERAGE.csv and VERIFICATION.md. No push or deploy.

## 2. Layout, depth and color contract

Keep current typography, logo, navy navigation, party semantics, and red/blue/gold anchors. No dependency or icon-library change. No new global navigation structure.

Use existing token names with these proposed assignments. These are implementation values, not a claim that the current application uses them:

| Role / existing token suffix | Light | Dark |
|---|---|---|
| Canvas / ground-sunken | #EEF2F6 | #0B1220 |
| Panel / ground-base | #FFFFFF | #131F31 |
| Inset evidence / ground-raised | #F5F7FA | #1C2B42 |
| Modal / ground-overlay | #FFFFFF | #23354F |
| Quiet separator / border-subtle | #D6DEE8 | #344863 |

Leave strong/focus borders and high-contrast overrides intact until their tests verify the new backgrounds. Quiet separators are not the sole boundary of controls. Canvas has no shadow; base panels may use existing shadow-rest; floating detail uses shadow-float; modal uses shadow-overlay with existing scrim. Hover is not a permanent elevation. No translucent text/data panels. Remove repeating colored top rules where the same state is already conveyed by labeled values; preserve explicit urgent/warning indicators.

Keep the current 1200px workspace default. The measurements show usable content widths of 1128, 1152 and 1200px at 1280, 1440 and 1920 respectively. Do not widen all prose in response to an unconfirmed wrapping complaint. Add an optional `measure: "standard" | "data"` presentation prop to WorkSurface; standard remains current behavior, data permits 1344px at sufficiently wide viewports. Use data only on Markets, Forces, and comparable tabular collections, after their fit checks. Bound reading paragraphs to 68ch. Preserve the existing phone insets and control targets.

Use container width to determine data-grid columns, with 2/3/6 summary cells only where each cell retains its minimum readable width. Long labels may wrap at word boundaries; signed numbers and their units may not split. Do not hide overflow to claim a pass, globally apply nowrap, shrink type, or force every title onto one line. Intentional local table/tab scrolling must remain keyboard reachable and visibly discoverable.

## 3. Public presentation interfaces

- Extend `CommodityRow` in player-core with `changeDirection: "up" | "down" | "flat"`, derived from the same unrounded `rise` used for `sinceOath`. Do not parse the formatted string. Keep stance independent. This is a view-model addition; no engine/save changes.
- Extend `SeriesProps` with optional `timeRange: readonly [string, string]`, `unitLabel: string`, and `showDomain: boolean`. Existing callers remain valid. In detail usage, print domain bounds using the supplied formatter and time endpoints from existing market/history data. Never invent dates where only observation order exists; label those as observations/decisions.
- Keep chart lines responsive, but render endpoint markers in screen-space sizing rather than stretching circles with the plot. Preserve accessible summaries and add the existing value-list/disclosure treatment for detail plots. Do not replace all Trend/Sparkline uses with a large chart.
- Supply page maps with the same derived device settings already used by the shell. Do not expose a second map preference. Ensure container palette attributes and map/legend/table color selection agree.
- Reuse `COMMODITY_GLYPH`, `AssetName`, `AssetFigure`, department mappings, Icon and Flag. Do not invent a new subject-card abstraction during this pass. Commodity glyphs are 18–20px in rows, asset identity retains its current 24px glyph; screen/section identity uses existing badge sizes. Adjacent visible text carries the name; icons remain decorative to assistive technology.

## 4. Connected information and storytelling

**Brief:** retain the priority matter, deadline/if-you-wait comparison, national condition and recent changes. Make the matter the primary panel; present supporting evidence at a quieter depth. Show existing linked subject identity or a flag/portrait only when the live matter resolves it. Link to the exact decision, subject and relevant Record entry, rather than a generic front page. Use existing narrative; no new scenarios or fabricated scenes.

**Economy:** retain the tabbed room. In Markets, put a compact selected-commodity identity and its price/change/stocks ahead of its evidence when entered by `measure`. The broad unselected Markets landing may retain its rates overview. Add mapped icons to every commodity row, distinguish units from indices, and label independently scaled histories. Supplier names become flag/name links using the existing nation route helper. Keep shock causes textual unless the model gives a genuine target. A relative supplier bar must state that its longest bar is the largest supplier; use a 0–100% domain for a share comparison if that legend would be confusing.

Persist commodity sorting in validated route search (`sort`: registry/name/change/stocks; `direction`: ascending/descending) using existing useSort/SortPicker. The existing `measure` parameter identifies the expanded commodity. Browsing details updates that parameter without adding a history entry for each disclosure. Leaving for a supplier creates a normal history entry; Back restores measure, sort, scroll and invoking-link focus. Do not introduce arbitrary return URLs or change saved game state.

**Security:** keep distinct theaters/forces/intelligence/operations views. Use one headline readiness figure, its actual history/drivers, and the legal obligation summary. In a quiet state, the legal summary is compact and does not reserve a tall empty column. Place theaters/commitments immediately after that summary. Preserve asset glyphs and each asset's own unit; never add ships, aircraft and formations into one total. Use reported evidence and dated uncertainty for intelligence. A capability graphic must not suggest a probability or force strength the model does not provide.

**Institutional dossier:** retain the office name/department glyph, actual chair portrait, authority and delivery readings. Visually connect mandate → resources → delivery → current matter using existing data and existing linked rows. A causal arrow is allowed only where the view model documents that relationship; otherwise use aligned groups. Keep acts beside the relevant authority and preserve the established review tiers. Portraits identify the persisted fictional person, not a decorative stand-in.

Use existing route helpers, Door and section anchors throughout. Navigation can animate opacity/position with current motion tokens; no camera travel for non-geographic tasks. Reduced motion removes animation. Expansion preserves parent state, scroll and focus, and closing restores the invoking control.

## 5. Acceptance and validation

For each slice, run the existing targeted tests relevant to changed behavior and a live user journey with real fixture data. Add meaningful regression cases for up/adverse, down/favorable and flat commodity changes; map preference propagation; supplier Back restoration; one-point/constant/negative/unknown chart data; and long numeric values at constrained container widths. Screenshot checks alone cannot establish semantic correctness.

At the stable integration checkpoint, follow CLAUDE.md: clean stale build-info as prescribed; `pnpm run build` before `pnpm run typecheck`; then `pnpm run lint`, `pnpm run test`, the `scripts/verify-*.mjs` gates and required balance check if landing a wave. Regenerate tracked dist with changed package sources; verify committed dist freshness at the appropriate commit stage. Run `pnpm --filter @admin/web run test:e2e` against the rebuilt player. Never treat no tests, a stale build, or an uninspected PNG as visual acceptance.

Browser acceptance covers 320×568, 390×844, 768×1024, 1280×800, 1440×900 and 1920×1080 in light and dark; selected, populated, sparse, unknown and error states; 200% text/zoom; keyboard-only navigation; focus restoration; reduced motion; high contrast and color-vision preferences. Verify local scroll containers and nested child bounds, not only document width. Inspect the beginning and end of each long surface: the audit screenshot helper caps at six parts and does not prove the tail was captured.

Required journeys: Brief → decision → review → cancel; authorized act → result → Record; Markets → expanded commodity → supplier → Back; Security → service/asset → office → Back; Courts → case/person → Back; Record filter → entry → linked subject → Back. Verify reload persistence where applicable. Preserve cancel, stale-data, refusal, retry, and save-error distinctions.

## 6. Backlog reconciliation and boundaries

BL-136 remains open. Existing themes and shared primitives are implemented; their existence is not application-wide visual acceptance. BL-138 retains the map preference defect and remaining per-family checks. BL-130's sampled route destinations were reachable in this audit; missing supplier links and return-state coverage remain separate concerns. BL-129's existing semantic icon registry is the implementation source, not a reason to acquire another library. BL-112/Courts visual acceptance is not closed by a quiet Courts overview capture.

No new scenario writing, economic calibration, simulation changes, save migration, external imagery procurement, tracking service, paid dependency or deployment is included. Existing artwork and licensed/bundled assets are the default. New illustrative imagery requires a concrete identity/context gap; it must never masquerade as evidence of a simulated event.

Per-finding observable acceptance criteria: [FINDINGS.md](FINDINGS.md).

## 7. Icon adoption contract

The source of truth remains `apps/web/src/shell/glyphs.ts`; the following are existing mappings to adopt, not a second registry:

| Subject | Existing mapping / consumer |
|---|---|
| Crude; natural gas/LNG | commodityCrudeOil; sectorEnergyGas |
| Wheat/corn; soybeans | sectorAgriculture; commoditySpecialtyCrops |
| Potash/nitrogen; copper | commodityFertilizer; sectorMining |
| Lithium; rare earths | commodityBatteries; commodityCriticalMinerals |
| Ground formation; armor; helicopter | FORCE_ASSET_GLYPH → unitGroundFormation, unitArmoredVehicle, unitHelicopter |
| Carrier; surface combatant; submarine | unitAircraftCarrier, unitSurfaceCombatant, unitSubmarine |
| Fighter; bomber; transport; satellite | unitFighterJet, unitBomber, unitTransportAircraft, unitSatellite |
| Cyber assets | sectorTelecomCyber |
| Presidency/executive office; legislature; judiciary | INSTITUTION_KIND_GLYPH → westWing, subjectChamber, court |
| Department/component; intelligence; military | building, intel, shield; preserve department-specific emblems where present |
| Regulator/independent agency; field; state government | gavel, mapPin, flag |
| Meet/sign/assist/tariff | ACT_FAMILY_GLYPH → summit, sign, instrumentAssistance, subjectTrade |
| Diplomatic/economic/covert/military/Congress acts | instrumentDiplomatic, instrumentEconomic, instrumentCovert, instrumentMilitary, subjectCapitol |

Use the existing Icon paths and weight; do not mix emoji or a second stroke family. Decorative glyphs have adjacent visible labels; icon-only controls retain their accessible name and existing hit area. Shared glyphs intentionally group related commodities; text distinguishes them. Acceptance: each rendered row resolves through its existing typed registry, every asset retains its own unit, and each institution/action keeps the same identity across cards, detail, and receipts in both themes.

## 8. Slice completion contract

- Shared foundations extend tokens, WorkSurface, Series and Layer. Accept only when both themes distinguish all surface roles, selected/focus states remain visible, data cells preserve value/unit pairs at the six sizes, and chart sparse/unknown cases and reduced motion work.
- Representative surfaces extend existing Brief, Markets, Security and office components. Accept only after their listed journeys preserve destination identity and Back context; quiet, populated and crisis states retain all prior actions and information.
- Remaining families extend their existing route components and shared primitives. Accept only when every COVERAGE.csv route/state has new inspected evidence or an owner-approved retained design with reason; no inaccessible phone-only or desktop-only task is introduced.
- Integration extends the repository's existing proof and browser workflows. Accept only after the prescribed command sequence and live checks, including keyboard/focus, contrast, text zoom, preference persistence and long-page tails. Record each command and observed outcome; automation does not substitute for visual inspection.
