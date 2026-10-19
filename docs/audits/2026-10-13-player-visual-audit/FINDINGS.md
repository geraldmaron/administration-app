# Prioritized findings

Evidence strength is stated for every finding. Design judgments are recommendations, not reproduced functional defects.

## F1 · P1 · An adverse price rise is drawn as a fall

**Observed and source-confirmed** · BL-136 / BL-129

In the oil-shock fixture, LNG reads ▼ +31.9% since the oath at 1440×900. The triangle communicates decline while the signed value communicates growth.

Source: `apps/web/src/nation/economy/Markets.tsx:66–89`. Cause: SIGN is indexed by valence, so bad always draws a down triangle.

[Inspected evidence](evidence/markets/nation-economy-view-markets-measure-crude-1440x900-light-part3.png)

Change: Derive direction from numeric change. Retain consequence as a separate color and explicit adverse/favorable label. Reuse the existing direction/valence distinction used by Stat and MoveText.

Acceptance: An adverse increase displays an up indicator and adverse consequence; a favorable decrease displays down and favorable consequence. Zero stays neutral. Verify positive, negative, and flat changes in both themes without relying on color alone.

## F2 · P1 · Page maps bypass the saved palette preference

**Source-confirmed; preference-switch visual proof still required** · BL-138

MapView calls withDefaults(undefined) and supplies that default palette to usePalette. The existing BL-138 entry already records this defect.

Source: `apps/web/src/map/MapView.tsx:121–130`. Cause: Page maps initialize their own default settings instead of consuming the saved settings used by the player.

[Inspected evidence](evidence/core/washington-courts-1440x900-light-part1.png)

Change: Thread the existing persisted map preference through usePageMap and the map container's palette state. Keep map fills, keys, tables, and party swatches consistent.

Acceptance: Change each supported color-vision preference in Settings; verify a Nation party map, Courts map, their legends, and table markers before and after reload. Confirm actual canvas colors, not only a root attribute.

## F3 · P2 · Commodity identity and supplier connections stop at plain text

**Observed and source-confirmed** · BL-136 / BL-130

Commodity rows have no category glyph. Expanded supplier rows expose a name, bar, and share, but no nation link. The project already has COMMODITY_GLYPH and supplier nation IDs.

Source: `apps/web/src/nation/economy/Markets.tsx:75–80; CommodityDetail.tsx:23–35; apps/web/src/shell/glyphs.ts:91–104`. Cause: These consumers do not use existing semantic identity and Door/route helpers.

[Inspected evidence](evidence/markets/nation-economy-view-markets-measure-crude-1440x900-light-part2.png)

Change: Render COMMODITY_GLYPH beside each commodity name; supplier identity becomes a flag/name link to its dossier. Preserve the selected commodity, sort, and scroll on return.

Acceptance: Every CommodityId has a rendered glyph with adjacent text. Open a supplier and return to the same expanded commodity and sort; keyboard focus returns to the invoking supplier. Do not link narrative shock text to an invented entity.

## F4 · P2 · Detail charts stretch like sparklines but lack detail-chart context

**Observed and source-confirmed** · BL-136 / BL-138 / BL-134

Security's weekly readiness chart is a broad flat line with an elliptical endpoint. Commodity plots are independently fitted and lack visible range and date endpoints. Screen-reader summaries exist, but they do not provide equivalent visible context.

Source: `packages/ui-web/src/Series.tsx:27–83; packages/ui-web/src/styles/readings.css:233–265; apps/web/src/nation/economy/Markets.tsx:80`. Cause: A 240×64 SVG with preserveAspectRatio=none stretches marks to any container. The shared Series API receives values without time labels; callers often auto-fit each domain.

[Inspected evidence](evidence/core/world-security-1920x1080-dark-part1.png)

Change: Keep compact trends compact. Extend Series with optional visible range/time captions and a non-distorting endpoint. Use a common domain for comparisons of the same measure and unit. Expose readable values through existing table/disclosure patterns.

Acceptance: At 320 and 1920, endpoint shape remains consistent; detail plots name unit, time window, and domain. Sparse/one-point history is stated plainly. Independent scales are labeled, and unknown observations never become zero.

## F5 · P2 · Repeated readings and quiet states consume the situation's space

**Observed; design judgment** · BL-136 / BL-138

Security repeats 72% in its overview tile and a large readiness panel before reaching theaters. A short empty legal panel leaves a large unused column. The Record opens with a narrow feed beside an empty detail area.

Source: `apps/web/src/world/security/Kpis.tsx; Readiness.tsx; overview.css; apps/web/src/routes/record.index.tsx`. Cause: Summary, detail, and absence are given similar panel prominence regardless of state.

[Inspected evidence](evidence/core/world-security-1280x800-light-part1.png)

Change: Use one authoritative headline reading, then a compact driver/history detail. Keep an explicit quiet-state message but let the related situation section use the released space. Preserve the Record's explicit selection behavior; give its empty pane a concise orientation and meaningful linked filters.

Acceptance: On quiet and active-war fixtures, players can locate current commitments and their causes without passing a repeated full-size readiness panel. Every previously available detail remains reachable. Do not fabricate activity to fill empty space.

## F6 · P3 · Surface hierarchy relies heavily on outlines and colored strips

**Observed; design judgment** · BL-136 / BL-107

Dark Executive and Security use near-neighbor navy grounds, borders, and repeated colored top rules. Light screens use many similarly weighted white rectangles. Existing portraits, glyphs, maps, and formal documents are useful assets to retain.

Source: `packages/design/src/tokens.css; apps/web/src/world/security/overview.css:38–110; apps/web/src/nation/economy/economy.css:18–27`. Cause: Sibling and nested panels reuse ground-base, while status trim competes with subject identity and selected state.

[Inspected evidence](evidence/families/washington-1440x900-dark-part1.png)

Change: Assign existing ground tokens to explicit canvas, panel, inset evidence, and overlay roles. Reduce permanent status decoration; reserve stronger border/tonal separation for focus, selection, and raised layers. Keep shadows selective and text backgrounds opaque.

Acceptance: In both themes, page, panel, inset, selection, and dialog can be distinguished without reading labels. Status remains legible without a top strip. No blur or imagery reduces text/chart contrast.
