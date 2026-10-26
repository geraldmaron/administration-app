# The Administration: player design

**This is the single design brief for the player.** The accepted operations workspace uses analytical surfaces in selectable light and dark themes, navy institutional identity, grouped tasks, full-data collections, formal documents and a shared comparison/authorization flow. The owner’s 2026-10-12 application-wide visual and interaction contract below supersedes light-only styling and single-click consequential authorization. Every screen is a workspace. One map component, `MapView`, appears inside a page only where location, reach or exposure answers the question, at most one per screen, with its key and a list view drawn from the same lens rows. The simulation decides what is true; the interface explains it and offers the next action. [DECISIONS §8.8](DECISIONS.md#88-one-map-drawn-in-the-page-where-geography-answers-the-question) and the [operations brief](audits/2026-10-11-operations-redesign/BRIEF.txt) supersede the earlier persistent-map shell below. Map rendering specifications apply to `MapView` and the title globe; the spatial screen class, tile-grid maps, earlier universal panel widths, navy work surfaces and map-on-every-route rules do not.

**Identity:** use the canonical app identity (`assets/player/brand/README.md`). Institutional mastheads and navigation frame theme-aware work surfaces; red, white, blue and gold remain the anchors:

- **Blue:** selection and navigation.
- **Gold:** institutional identity and current state.
- **Red:** force, destructive acts and urgent risk.

Party and data colors are separate validated palettes. The dark map ground is reserved for the map panel and the title globe.

**Parity:** a President can investigate, configure, review, authorize and observe the same work at 320, 390×844, 768, 1280×800, 1440×900 and 1920×1080. Phone and desktop differ in layout, never in what can be done.

## 1. The map

### Layers (back to front)

1. **Map:** a canvas lit like a table, back to front: the sea with light pooled toward the middle and a 10° graticule; a glow along every coast; land filled in the lens colors; real terrain (Natural Earth shaded relief, high-passed so flat ground is neutral) overlaid on the fills; a hatch over each region whose value is a mix; borders weighted by level; the selection lifted off the board as a block. Over the canvas and under the pins, the locale names. Over the canvas, under every mark and card, a vignette and a fine grain.
2. **Marks:** real DOM buttons projected from lon/lat for pins, capitals, offices, force clusters, incident pulses and arcs. They are clustered by zoom, capped at about 25 visible, and sit in one `role="group"` with roving tabindex. "N more" opens the list. Every mark has a twin in the panel list.
3. **Cards:** opaque surfaces a screen lays on the map at a place (`MapCard`): a matter where it is happening, a war's sides at their capitals. Each has a leader line to its place, rides the camera like the marks, keeps off other cards and every pin, stays inside the visible map, and is held back past three. On a phone (under 768px) cards line up in a swipeable rail along the bottom of the map strip. Every card repeats something the panel holds, so a card the map has no room for loses nothing.
4. **Chrome:** the top bar (logo, date, Continue or clock, attention count, search) and the mode navigation (a rail on desktop, a tab bar on phone).
5. **Lens control:**
   - **Desktop:** a floating chip with the lens name, legend and switcher.
   - **Phone:** a 28px row in the sheet header: the lens name, a 96×8 legend bar with min and max labels, and a tap target that opens the switcher.
6. **Work surface:** an opaque navy panel with a restrained star field, a red/white/blue header rule, and consistent spacing. Maps remain visible beside the work; text never relies on the map for contrast.
   - Desktop and tablet: all route classes share the same standard panel measure, `clamp(420px, 48vw, 640px)`, bounded by the available room. A labeled **Expand panel** control widens it up to 960px; **Restore standard panel** returns it. Route class controls map behavior, not an automatic width jump.
   - Phone: every route opens at full height above the five-tab bar. The handle lowers the sheet to inspect the map.
   - Landscape phone (height under 480): a 340px side panel with a left mode rail.
7. **Overlays:** search (⌘K on desktop, the search icon on phone; it also holds the glossary) and the authorize confirmation.

### Screen classes

Every screen declares one class. The class decides what the map does.

| Class | The map is | Examples | Map behavior |
|---|---|---|---|
| **Spatial** | The content | World and its nations, a state, a war, a command, an organization, a treaty | Full, live, interactive. Standard panel; phone opens at full and can be lowered. |
| **Hybrid** | Evidence beside the work | Congress, bill whip, budget dependence, policy domain, economy, press reach, Brief | Live with the screen's lens. Standard panel with explicit expansion; phone sheet opens at full so the task is immediately readable; lower it to inspect the map. |
| **Workspace** | Not part of the task | Decision comparison, budget editor, appointments, courts, settings, founding stages | The render loop pauses on a static last frame, with no pulses or recolor. Desktop shows a 200px interactive locator in the panel corner; phone opens the sheet at full and the map pauses. |

Courts and the judge view have no honest geography. They keep the previous camera and never fly.

### Ground: one surface, with depth

A dot lattice over every region was too loud, and once the ground was filled (owner decision 2026-10-10) the dots that stayed meant three unrelated things: a mix, a tiny region and the selection. A player could not learn what a dot says. Each visual channel now has one job (owner decision 2026-10-10, "one surface, depth"), and **a dot on the board is a place, never a value or a texture**: a pin, a capitol, a metro.

| Job | Drawn as |
|---|---|
| A value | **Fill.** Quiet land (`--map-board-land`) where the lens is silent; the lens color where it speaks. |
| A mix (a split delegation, a split Senate pair) | **Proportional hatch.** Diagonal bands in the two colors, in proportion (28 of 52 seats is 54/46), over the majority color, at a fixed 7px screen pitch that travels with the land. A region too small for the bands to read still shows its majority. |
| Terrain | Natural Earth shaded relief, overlaid on the fills. |
| Borders | A dark seam (`--map-board-border`, 1.4px) under a light line (`--map-board-line`) weighted by level: a country edge (1px) over a state edge (0.8px) over a district edge (0.55px). |
| The selection | **Lift.** The selected region rises off the board: a cast shadow, an edge wall stacked to 5px, its face in the full lens color and hatch with the lines between its parts, a light selection tint and a glowing outline. Everything else recedes toward the sea (the detach fade). |
| A selected government's provinces | **Inner lines** on its lifted face at a state's weight, and their names in small haloed text under the government's own. Geography only: the game keeps no data per province, so a province is never picked or colored by a lens. Its capital and cities from the dataset are pinned. |
| The sea | A soft swell anchored to the plane and a pale shelf band along every coast, under the land; texture, never information. |
| A region too small to fill (DC, Rhode Island, a microstate) | Its name on a **callout**: moved into the margin on a leader line. It stays pickable by its centroid. |

1. **The title screen** keeps the slowly turning dotted world: the dots are the game's mark, kept for the one moment that introduces it, and the dot sizing rules in the renderer (pitch from the focus's on-screen size, octave crossfade, 1.5 device-pixel floor) apply only there.
2. **Locale names** (`apps/web/src/map/labels/`) are written over the canvas, under the pins, decorative to assistive technology because every name is also in the panel, the list and the tooltip:
   - **Where:** each name sits at its region's pole of inaccessibility (baked in `regions.json`), never a centroid that falls outside a crescent.
   - **How long:** the longest form the shape has room for: "Pennsylvania", then "PA"; "PA-7 · Allentown", then "PA-7"; "United Kingdom", then "UK". A government with no short form readers know is written whole or not at all, never as a code (DEU). A state or a microstate (at region zoom) too small for even its short form moves onto a callout.
   - **Which:** placed greedily by priority (the selection, then larger area); a name that would touch another name, a pin or its label, or the edge of the uncovered map is left out. A phone writes at most 16, a desktop 48.
   - **Behind a selection:** the selection's names lead; neighboring states and governments are named quietly for context, and other districts are not named at all.
   - **Set:** governments and states in tracked capitals with a dark halo; a seat and a callout on a small navy chip, like a pin's name, so it reads on any party fill. Names hide while the camera flies.
   - **A seat's place** is the most populous place inside it, or for a seat with none of its own the nearest metro within 80km ("Chicago area"), or the nearest place ("near Faribault"), baked into `packages/world` from the gazetteer's metros and Natural Earth's US places so the map and the panel name a seat the same way.

**Settings:** map density (fine, standard, bold) sets the title globe's dot pitch; high contrast whitens the border line, brightens the seams and drops the detach fade to 35%.

### Renderer (`apps/web/src/map/`)

- **Projection:**
  - Canvas 2D at the device pixel ratio, with d3-geo runtime projection. d3-geo and topojson-client become web dependencies.
  - The projection blends Natural Earth (world zoom, rotated to the focus longitude) into azimuthal equal-area centered on the focus (country zoom and deeper).
- **Geometry:**
  - Simplified at bake time into levels of detail for motion and for rest.
  - The up-front budget of about 1.5MB covers world 110m and simplified states. World 50m, full states and districts load lazily.
- **Motion:**
  - During a flight, the last rendered frame is cached as a bitmap and moved with an affine transform. Marks, arcs and cards project through the same transform every flight frame, so they ride the land instead of waiting for the landing; they take no clicks until it lands.
  - A target the current view's seam splits (its antimeridian falls inside the target's longitudes: Russia, New Zealand, Pacific states) crossfades in instead of flying, because its on-screen rectangle spans the whole map and no flight path from it is honest.
  - Full re-projection happens once the camera settles.
  - Lens recolor re-fills paths without re-projecting.
- **Hit testing:** an offscreen id-color buffer rendered with the rest geometry. It works with the blended projection, which has no closed-form inverse.
- **Disputed and small geographies:** a bake-time mapping from map features to the game's 196 governments, covering Taiwan, Kosovo, Palestine and Western Sahara. Each mapping is authored and validated: every government resolves to a geometry or to a point mark.
- **Accessibility:**
  - The canvas is `role="img"` with a polite description of the focus and lens.
  - Every Spatial and Hybrid screen has a ranked list for the lens. That list is the accessible data table.
  - Arrow keys on the map step through that sorted list, not through geometry.
  - Forced-colors mode shows the list instead of the canvas.
- **Performance budget:** 60fps desktop, at least 45fps under a 4× CPU-throttled phone profile, first paint under 1s. It is measured in a W1 spike before the design system is built on it.
- **Fallback:** a pre-baked plate with an affine camera. It keeps lens recolor and detachment, but loses azimuthal close-ups and rotation. The fallback is the camera contract's degraded mode, decided in the spike, and never a silent swap.

### Camera

- **Route.** The camera is a pure function of the route. Each route declares a `Focus`: `world | region | nation | state | district | point | set | zone`, plus ids and a zoom cap.
- **Resolver.** A player-core resolver turns a Focus into bounds:
  - Organizations and treaties: their members.
  - Wars: the belligerents plus their theater zones.
  - Geographic commands: their area, computed live from assignments, including in-play overrides.
  - Offices: their HQ.
  - Decisions and incidents: their resolved place.
- **Framing.** The camera frames inside the visible map area, minus the rail, panel, sheet and tab bar. Insets update when a sheet detent settles, never during a drag.
- **User movement.** Pan and zoom are ephemeral offsets that reset on route change. A recenter control restores the route's framing.
- **Back.** Browser back goes to the previous route and re-derives the camera. There is no separate camera history.
  - Escape or a tap on empty sea calls `history.back()` only when a detail layer is open.
  - Tapping the active mode goes to that mode's root. Tapping another mode returns to the last route visited in it.
  - A cold deep link has a declared parent route for back.
- **Motion rules:**
  - Fly (van Wijk smooth zoom, 600–1100ms) only when the target is outside the current framing or zoom changes by more than about 1.5 levels. Otherwise pan or zoom in 250ms or less.
  - Flights can be interrupted and retargeted.
  - The panel content appears immediately and never waits for the camera.
  - The **camera** setting offers Fly, Quick (the default after the first session) and Cut. Reduced motion means Cut.
- **Continue.** Running the clock never moves the camera except to the stop's subject. After a multi-week advance, the digest replays the period's pulses on request.
- **US home view:** adds small Alaska and Hawaii inset viewports. Selecting either flies to the real place.

### Lenses: the fill carries the context

- **Contract.** A lens has:
  - `level` (`nation | state | district`).
  - `value(regionId)`.
  - `scale`: categorical, sequential or diverging.
  - `encoding`: a fill color; or a **mix** (colors with weights), drawn as a proportional hatch.
  - A legend.
  - A no-data treatment: quiet land.
- **Effective level** is the lower of the requested level and what the zoom supports. At country zoom, a district lens renders as a state-level proportional hatch. True district shapes appear at state zoom and inside a detached state. The House also offers a hex-cartogram view where each district gets equal area, so urban seats aren't erased.
- **Proportional hatch.** A region with a mixed value shows bands in the same proportion: a state whose House delegation is 28 of 52 shows a 54/46 hatch, and a split Senate seat pair is the 1:1 case. The bands are anchored to the land, so a pan never makes them crawl.
- **Limits:** each screen declares one default lens and at most 4 alternatives. Others are grouped under More (Politics, Economy, Conditions). The lens choice persists per mode.
- **Timing:** recolor takes 400ms when the level changes, 200ms for a lens swap, and is instant under reduced motion.
- **Palettes:**
  - Lightness-first ramps.
  - At least 3:1 against the navy canvas.
  - Checked under protan, deutan and tritan simulation.
  - Party blue is a lighter cyan-blue, so it never sinks into navy. Red against blue is never the only distinction.
  - Exact values always appear in the list, the hover or focus tooltip, and the panel.

| Level | Lenses (data source) |
|---|---|
| State | Approval (E1, shown beside the electoral call); partisan lean; governor party; Senate delegation (hatch); House delegation (hatch or hex); conditions and claims; emergencies; jobs, prices and crime against national; federal dependence; industry share; population, electoral votes and GRP |
| District | Holding party; lean; claims and marks. Approval is shown at state level only, because there is no district data to make it honest. |
| Nation | Standing toward the US; blocs; trade share; military band; stability; conflict involvement; posture level; US deployments (radius) |

**Delta lens:** after an act is authorized, and in the digest, the map can play a delta lens in which the fills recolor from the old value to the new one over the affected places. This is the game's payoff moment and its clearest view of consequences.

### Selection and detachment

1. On click or tap, the URL changes. The camera moves under the motion rules above.
2. **Detach (about 280ms):**
   - Other regions fade to about 22% alpha (35% in high contrast), receding toward the sea.
   - The target lifts as a block: its shadow, an edge wall, its face in the full lens colors and hatch with a light solid tint, and a crisp 1.5px glowing outline.
   - It gets a soft shadow and lifts (about −6px y, scale 1.03 about its centroid).
   - Inner district lines, the capitol pin, the metro pins and the district names appear.
3. **Context:**
   - Desktop: the panel opens the dossier immediately.
   - Phone: the sheet rises to peek (the name, the lens value and Open). Open goes to half and doesn't navigate.
   - Hover on desktop shows a tooltip with the name and lens value.
4. A district inside a detached state detaches a second level, as `?district=` on the state route.
5. Back reverses the lift. Sets (organization members, treaty parties, a command area, war belligerents in two side colors) use the same machinery.

### Deployed forces

**Recommended: a three-tier hierarchy of static world data plus derived, seeded placement. No position is persisted.**

1. **Theater:** the geographic combatant commands. Each area is derived from current nation assignments (including in-play overrides) plus the maritime zones whose bounds fall inside it. Functional commands (cyber, special operations, space, strategic, transportation) have no area. They appear as cards in the security panel and are never drawn as regions.
2. **Zone:** a host-nation polygon, or one of about 12 authored maritime zones.
3. **Anchor:** a sourced point per installation. Composite rows ("Yokosuka, Camp Zama and Yokota") are split into separate installations, or else marked zone-level. The point-in-polygon check allows a coastal tolerance.

**Placement and display:**

- Units with no anchor take a seeded slot inside their zone. Slots are Poisson-disk points baked per zone, picked by a hash of `(campaign.seed, commitment.id)`.
- A deployment that targets a conflict rather than a nation is placed in the belligerents' zones.
- **Honesty rule:** only sourced anchors draw as exact installations. Slotted units are zone-level markers labeled with the zone, never a precise site.
- **Clustering by zoom:**
  - World: one marker per command, sized by personnel.
  - Region: one per zone or host.
  - Close: one per anchor, with branch glyphs.
  - Clicking a cluster frames it.
- **Wars:** belligerents detach in side colors, with an arc between capitals and forces in theater zones. There are no front lines, because the engine models fronts abstractly.
- **Non-state operators:** a seeded slot among their host's cities.

### Visual-first interfaces — owner requirement, 2026-10-12

The application is visual first. Each institutional or analytical screen leads with a meaningful visual model of its subject and the President's current task: process, geography, participation, relationships, delivery or change over time. Selection connects that model to the relevant details and actions. Prose explains the model; decorative icons and isolated metric cards do not satisfy this requirement. Exact readings and accessible lists remain available, with full phone/desktop task parity. Unknown facts, observed history and forecasts must remain visibly distinct.

Courts and the other interfaces created by the simulation-depth program require a further visual pass. Its surface-specific requirements and acceptance procedure are recorded in `docs/audits/2026-10-11-simulation-depth/PROGRAM.md`, “Visual-first completion requirements.” Existing functional and screenshot checks establish the outcomes they tested, not visual-first acceptance. This pass remains required before that program is complete.

### Application-wide layers and presidential actions — owner requirement, 2026-10-12

Every player page and its nested states must meet the visual-first contract, not only Courts or newly built screens. The complete route reconciliation and family-specific data views are in `docs/audits/2026-10-11-simulation-depth/PROGRAM.md`, “Application-wide visual layers and presidential interaction.” Shared requirements:

- Consistent subject-named info/? help, backed by existing glossary/definitions; concise local help and focused deeper explanation. Critical cost, authority and deadline stay visible.
- Expand only the selected detail/chart/help target through a coherent popover/inspector/dialog system. Preserve parent scroll, filters and inputs; close returns focus. Do not expand a whole page to inspect one component.
- Discoverable System/Light/Dark in Settings and shell, persisted locally with first-paint resolution. Theme all surfaces, overlays, charts and loading/error states; semantic icons/accent communicate role and state. Color-vision, high contrast and reduced motion compose with each theme.
- Rich data views connect temporal, geographic, institutional and distributional context to real selectors and accessible exact figures. Count cards and decorative charts alone are insufficient; no fabricated history, probability or hidden-data exposure.
- Consequential acts use compare → focused presidential review with simulated biometric/temperature presentation → explicit confirmation → visible resolution/recorded-result activity → dated outcome on the subject screen and Record. The scan is fictional local presentation, never actual sensor collection or authentication. Skipping animation never skips confirmation.
- Actual progress and paced replay are labeled distinctly. Reveal named recorded votes when a vote actually occurs; submission cannot impersonate passage. Preserve the single authoritative commit, stale-terms refusal and save-only retry. Continue/load/save/forecast use appropriate visible processing states without choosing for the player.

Current primitives are candidates for reuse, not aesthetic precedent. Build the best coherent local experience without paid services/assets, network generation or runtime model calls. The full contract remains implementation work, not proof that existing pages satisfy it.

### Shared patterns

- **Compare and authorize.** Every consequential act uses one pattern: the options as a results list (one row each, the same drawn readings in the same place on every row), each read as its change from today, then terms with a live preview, focused presidential review, explicit confirmation (one named verb), visible resolution, a receipt with the delta lens, and the Record entry. There is no do-nothing or keep-the-same option to pick (DECISIONS §8.13): today is the zero every reading is drawn from, and not acting is approving nothing. A consequence of waiting on a clock is said as a line beside the options. Every comparison in the universal player is built this way: the act workspace on its own rows, and every other desk on the shared `CompareAuthorize`, `ActChooser`, `CompareChoices` and `ActCompare`, which draw the same results-list rows (`packages/ui/src/review/Results.tsx`), start with nothing picked (a lone open option starts picked) and take a `waiting` line. A locked option stays readable and its verb stays off. Silence that is a real reply in a story stays a reply; silence the engine takes no act for is a waiting line.
  - **A card is picked anywhere on it.** Its head carries the option's character: an emblem and an accent band (force red, accord blue, principle and statute gold, waiting plain; selection stays the blue ring), the name, and a verdict strip of valence chips (its price, how many moves go in your favor and against you, its odds when they are in doubt). The option's own voice (what you would say, what the act is) follows as the lead row.
  - **Readings are drawn.** A signed move is a bar from one zero line, its length against the largest move on that row across every card, its color the model's verdict, its figure in words beside it; a band (slight, moderate, major) is the same bar cut into three steps. A political pull is drawn on the side it pulls to, in neutral ink. Row names carry an icon in sentence case.
  - **Rows line up and nothing scrolls sideways.** Cards wrap to the next line rather than scroll at any width, one to a line on a phone; the cards on one line share every row's height (subgrid), so a cost is read straight across.
  - **A locked option says so in its head before it is picked**, with its reason (said once above the cards when every locked option shares it), and its readings dim but keep their color. Where a screen opens on its comparison (a decision, a running story, a locale act), the verb and its review dock in the surface's foot below the scrolling body, so on a phone the verb sits in the lowest 112px and never covers a column. A refused act (Congress votes the book down, a governor says no) still gets its receipt, marked refused rather than checked off.
- **Dossier template** (person, nation, state, office, organization, command):
  - A header (identity, name, current condition with its date).
  - For a person, their record in the role first, open: a judge's cases and votes, a member's roll calls, a governor's or leader's standing with the President. Every mention of a person (a seat dot, a bench card, a leader's name) opens this dossier.
  - Readings with a comparison period.
  - "What you can do" (acts with projections, costs, risks, and the unmet condition when locked).
  - Relationships, a timeline of Record entries for the subject, and provenance.
  - Long dossiers split into anchored sections (Overview, Politics, Economy, Acts). The sticky action bar shows the current section's acts.
- **Readings by kind.** A column of horizontal bars reads as a dated chart, so a reading is drawn by what it is:
  - **Trend** (`@admin/ui-web`): a figure, its change over the comparison period colored good or bad, and its recent path with what came before the administration drawn faint. For any reading with a history (the Now readings).
  - **Compact reading:** use the existing Gauge, Bar or Sparkline for a measured share or trend; briefing clocks use an icon and explicit remaining time. The unused circular Ring primitive has been removed.
  - **Dial** (`Gauge`): at most one or two headline readings on a screen (approval, electors, removal pressure with its lines).
  - **Strip:** every member of a set on one axis as a dot sized by its weight (every state by the lens, sized by electoral votes). Each dot is a door to its dossier, and pointing at one lifts it on the map in place.
  - **Meter:** a filled continuous track for proportions and comparisons, with explicit units and denominator. No draggable-looking bead on a read-only display.
  - **Steps:** discrete assessed bands for people, diplomatic standing, force classes and temperament. Keep the band word and confidence; never imply a precise percentage from a category.
  - **Office performance:** compact icon-marked ring scorecards, followed by workload facts, the holder's assessment and then chair actions. Do not lead a functioning department with its dismissal control.

**Readings say what they are, and every name is a door (owner requirement, 2026-10-17).** The owner found charts with no key and no word on how to use them, and asked that a reader who knows politics, law and design never have to guess. The audit, journey map and rulings are in `docs/audits/2026-10-17-ui-uniformity/`.

- **Every drawn reading sits in a `ReadingFrame`** (`packages/ui/src/data/ReadingFrame.tsx`). The frame carries:
  - a title saying what the reading measures;
  - its unit and period;
  - a visible `Key` for every color, dash, tick, ring and shape it draws;
  - "How to read this", with a door to its Handbook term where the glossary has one;
  - a press hint when the reading's marks open something.
- **A primitive that keys itself passes `keyed`** instead of sitting in a frame. This is for a share bar in a titled tile, where the key is the whole of how it is read. `scripts/verify-reading-keys.mjs` holds the rule.
- **A figure never contradicts its mark.** A band word (Even, Fair, Sound, Strained) shows its ladder or defines it in the help.
- **Direction and time are carried by shape as well as color.** An arrow on a sparkline, a filled pin for ahead and a hollow one for passed, a filled seat for a clear lean and a ring for a slight one. On a map a solid dot is a state waiting on the President and a hollow ring a declared emergency. In a read badge a graded trait is a dot and ambition, which is pressure and never a grade, is a diamond.
- **A drawn line takes the ink its meaning has.** A chart series that is not "you" can carry its own ink (`ChartSeries.ink`) and its key follows it, so a trust line is never the blue a sparkline key calls steady. A band benchmark draws both edges at full strength under its see-through fill, so a line on a boundary reads as on the boundary. A map lens that mirrors a bar uses the bar's inks and cuts (the Emergency map's minor, serious and severe).
- **Segmented bars never shorten a word.** At a narrow width their segments wrap onto further lines.
- **Data marks are solid inks.** Translucency is only for interaction dimming and for range bands.
- **A group whose every figure is zero folds to one quiet line.** Counts on tabs show only above zero.
- **Every name is a door.** A person, office, member, judge, state, country, bill, case, war, treaty, organization or command opens its subject. Inside a row that is itself a door, the name opens a `Peek` over the row (`packages/ui/src/layers/Peek.tsx`): face or emblem, role, standing and "Open file". A bill's sponsor is a caucus, and it opens the member list filtered to that caucus.
- **Back returns to where the President came from,** with its filters and scroll, and falls back to the screen's declared parent on a cold link (`apps/player/src/shell/navigate.ts`, `BackButton`). No "Back to X" pushes a new screen.
- **Every act ends on one `ResultView`.** It shows the verdict, the readings the act moved (each a door to its history), a Record door and the next waiting matter as the primary way on. There is no Close step between the review and the result, and the result never repeats its doors. Nothing advances on its own.
- **A country's and a state's acts share one address shape:** `/world/nation/:id/act` and `/nation/state/:id/act` (`cause=` for the matter answered, `power=1` for federal power where nothing is there to answer).
- **Continue stays on the screen it ran from** and says what happened. When a matter holds it, the control stays visible but disabled at every width, with its reason and a door to the matter.
- **Search** (Cmd/Ctrl-K or `/`, and the bar's search control) reaches people, offices, members, judges, states, countries, bills, wars, treaties, orders, commands and Handbook terms from any screen. Its index is `packages/player-core/src/search/`.
- **Depth:**
  - ground is the page;
  - a panel is `Surface` base, with a soft contact shadow;
  - a card inside a panel is raised, with a lighter shadow;
  - a chart well is sunken and flush;
  - a sheet, peek or inspector is elevated.
- **Headings:** the page title is level 1, a section is level 2 (`SectionHeader`, `Panel`), and a card or reading frame is level 3. A frame under a card's own title is a label. Nothing goes deeper (`scripts/verify-heading-levels.mjs`).
- **Tabs and section chips keep one line** and scroll sideways through `ScrollStrip`, which shows an edge arrow when items are hidden past it. A view tab is underlined in blue when selected. A section chip is navy with a gold mark, because it says "you are here" (§3, Color).
- **Spacing and radius name tokens** (`scripts/verify-spacing-tokens.mjs`). Legal citations and case names use the interface face and wrap rather than truncate; monospace is only for strings a player copies.
- **A reading that has a comparable metric offers a door to `/compare`.**

**Federal identity across working surfaces.** Every screen header carries the
restrained star canton, one leading star and the red/white/blue rule. Office,
person and country files reuse the dossier banner and marked sections; motifs
stay out of plots and behind no essential text. Use agency emblems and consistent
action icons. Reserve bright color for readings, current selection and status;
avoid neon glow, decorative chart variety and fabricated official classifications.
- **Story first.** Where a matter is involved, a face, the situation and the clock come before the readings.
- **First run.** A 3–5 step walkthrough on the first decision teaches the map, the lens control, the sheet and the comparison. Glossary terms are reachable from search and from inline term links. Screen help opens an explainer in a side sheet, drawn (cast, step track, thresholds, influences, worked example), with a door to its Handbook chapter.

### Reference lines (owner direction, 2026-10-17)

A reference line (a historical landmark, a gate the rules act on, a target, the national figure) is judged by the question its place answers, not by one rule for every chart. Across all of them: chart and tick labels use the app's sans face, inks are theme roles at full strength (a band behind the data is the only fill drawn see-through), a label is never cut short or drawn over another at 390×844 or 1440×900, and when the names do not fit where the lines are, they move to a list rather than shrink. Each kind is drawn its own way, the same everywhere: a landmark thin solid gold, a target heavier solid green, a gate the rules read red dashes, a danger level red dots, the term's own record neutral.

| Place | Where it shows | Lines it can carry | The question | Pattern |
|---|---|---|---|---|
| `BenchmarkChart` (`packages/ui/src/data/BenchmarkChart.tsx`), through `CompareChart` | Nation opinion and overview approval, state overview and unemployment, security readiness, country file compare, international standing, metric reading, rates, compare workspace, Record term approval and polarization, ending and legacy, markets, budget books | Five approval landmarks, the collapse line, U.S. averages, the Fed goal, a crash line, a band | Where does my line sit against the record over time? | Every line ends in its name and figure in one column at the right edge, stacked with leaders so lines a few points apart (55%, 58%, 61%) never collide. When the longest name will not fit that column (phones, long names), the column holds figures only and the benchmarks become a ranked list under the chart, highest first, with the President's reading slotted where it falls. The legend keys series only, and only when there is more than one. |
| `Meter` marks (`packages/ui/src/data/Meter.tsx`) | Brief "Compared with past presidents" and "Compared with your term so far", Nation condition strip, and every one- or two-mark meter (half the country, the 60% and 40% delivery lines, funding warnings, before and after on receipts) | Up to five | Is this reading good or bad against its benchmarks right now? | Fewer marks: every gate plus the nearest mark below and above the reading, the two it sits between. Each tick named under itself with its figure, its edge on the tick, stacking to a second row before overlapping; on a card too narrow for that, the names list under the track in track order. The Brief's own-record marks (opening, term low and high) are their own neutral kind, not targets. |
| `Track` marks (`packages/ui/src/nation/Track.tsx`) | State approval "Half the state", group support against the whole country, the 2020s division level, electoral votes to win, demographics against the U.S. | One | Above or below the one line that matters? | Kept as a single solid tick; the row text or caption beside it names the line. Strong marks in the primary ink, quiet ones in the secondary ink, never translucent. |
| `FanChart` baseline (`packages/ui/src/review/FanChart.tsx`) | Decision projections | One comparison line per metric | Which option ends higher? | Kept: the baseline is a series, dashed in the secondary ink and keyed by the projection's own list. Axis figures in the sans face. |
| `ThresholdBar` (`packages/ui/src/legislature/ThresholdBar.tsx`) | Congress chamber standing | Three (majority, cloture, override) | Which lines does the caucus clear alone? | Kept: ticks carry only the vote numeral, and a list beside the bar names each line with whether it is cleared. |
| `VoteCount`, `Hemicycle` majority spoke | Bills, nominations, the chamber | One | Does the count reach the line? | Kept: one gold tick or spoke, named in the caption or party key. |
| `ChangeBar` zero line (`packages/ui/src/review/Results.tsx`) | Every option's readings | One | Does this option raise or lower it from today? | Kept: the zero is today and is the same on every row. |
| Oversight pressure meter (`apps/player/src/oversight/Inquiries.tsx`) | Oversight, investigations received | Was one | How much pressure is Congress applying? | The 50% tick named nothing (its label was a disclaimer), so it is gone; the disclaimer is a caption under the meter. |
| `StatuteClock`, `Sparkline`, `TermLine` | War powers, deployments; Brief readings; ending | None | — | No reference line. The sparkline's dashed stretch is the predecessor's own path, not a benchmark. |

### Phone layout budget (390×844; 320×568 in brackets)

Safe areas are 47 top and 34 bottom.

| Element | Height |
|---|---|
| Top bar | 44 |
| Tab bar plus safe area | 84 |
| Usable between bars | 669 [454] |
| Peek detent (handle, title row, verb) | 112 [100]; map strip about 557 [354] |
| Half detent | 334, map strip about 335. Dropped below 600px height. |
| Full detent | 669; the map pauses |

**Gesture rules:**

- The sheet drags only from its handle and header.
- Content scrolls inside the sheet. Swiping down from the top of the content at full detent collapses it.
- The canvas owns pan and pinch only inside the visible strip, with `touch-action: none`. It never starts a pan within 24px of the left or bottom edge.
- The primary verb sits in the lowest 112px.
- Layout uses `dvh` and `env(safe-area-inset-*)`.

## 2. Modes and screens

**Five modes, each with a home camera:**

- **Brief:** what needs me now.
- **Washington:** the government as institutions and people.
- **Nation:** the country, its states and the domestic program.
- **World:** other governments, alliances, wars and forces.
- **Record:** what happened and why.

**Rules:**

- **Record never authorizes anything.** Anything live that needs a verb lives in Brief or in the institution that owns it.
- **Congress belongs to Washington,** but its camera is the country, because its composition is geographic. The Washington mode stays highlighted.
- **Trade** appears in both Nation policy and World act, and the two are cross-linked. Search maps tariff, sanction and embargo to both.

Every panel follows the shared patterns in §1:

1. Story first where a matter is involved.
2. Readings with comparison periods.
3. One sticky verb.
4. Related doors that move the camera.

**Class:** S = Spatial, H = Hybrid, W = Workspace (§1).

### Brief (home)

| Screen | Class | Focus and lens | Panel contents | Actions |
|---|---|---|---|---|
| `/brief` | H | Every place a matter waits on you (one matter: its place). Its lens is the dimension the top matter moves. Each placed matter is a card at its place; hovering a row previews its place. | The top matter (face, situation, clock). Needs you (decisions, deadlines, cases and scandals, ranked, each with clock and place). Running clocks. The Now strip (approval with its six judgments, treasury and debt, stability, readiness, standing; each with weekly delta, linking to its metric). Standing (removal pressure against thresholds), collapsed when calm. On phone, peek shows the top matter and Continue. | Continue until something needs you (named stop reasons); open matter |
| `/brief/decision/:id` | W | Subject's place, frozen; locator on desktop | Situation (summary, source, date; actors with faces, flags and stance; stakes as readings; clock and cost of waiting). Compare and authorize (every option plus the wait baseline, on the same rows: cost now, added debt, each metric effect, risk, who gains and who objects, confidence, adviser lean with faces). Terms with live preview. Review. | Commit reply, then a receipt with the delta lens and the Record entry |
| `/brief/clock/:id` | H | The deadline's place | What it requires, what lapses and what that costs, who is waiting | The act door |
| `/brief/scandal/:id` | H | Involved places | Heat over time, involved people, responses compared against staying silent | Commit response |
| `/brief/metric/:id` | — | — | Retired 2026-10-12: redirects to the screen that owns the reading (approval → `/nation`, treasury → `/nation/budget?view=authority`, stability → `/nation/emergency`, economy and markets → `/nation/economy`, readiness → `/world/security`, standing → `/world`). | None |
| `/brief/digest` | W | None | Briefing history, one week at a time: the five national readings at the week's close against where it opened, the states that moved, the President's acts, the world and the wire, each linking to its subject or Record entry. Reached from the Brief's "Briefing history" and from `place.digest()`. | Pick a week; open item |
| `/calendar` | W | None | Every dated thing in one agenda and month: decisions, legal deadlines, votes, hearings, elections and the term line, each row naming its people and places as doors, the term track and month grid keyed | Open the matter or subject |

### Washington (home camera: DC metro, list-first)

The executive tree is the primary surface; the map shows where things are. Selecting an office zooms to its HQ and rings its pin. This is a short move, because every HQ sits within the metro frame.

| Screen | Class | Focus and lens | Panel contents | Actions |
|---|---|---|---|---|
| `/washington` | H | DC metro. Pins clustered and colored by staffing (confirmed, acting, vacant), with an alert ring for proposals, resignations and inquiries. | Opens on delivery, not staffing: the branch's delivery dial with what it is losing and to what, then every top-level directed office weakest first, each a bar stacked from its inputs (capacity, staff, funding, morale, a strong head) with what it loses (open chair, backlog, politicization, a weak head) hatched over the end so the solid part stops at its figure. Then the departments' services, worst first: each a status chip (keeping up, falling behind, delayed, clearing by refusal, failing, stopped), why, the body doing the work, what the President can do, and its waiting cases as one bar stacked by age (within its standard, past it, over 26 weeks) in weeks of normal intake, with the share late, decided wrong and refused beneath. Staffing is a one-line bar at the head of the roster. Executive tree (White House, Executive Office, the departments, their agencies) with holder portrait, status, and competence and loyalty gauges. Needs-attention filter. Doors to Congress, Courts and Oversight. | Open office or person |
| `/washington/office/:id` | H | HQ point | Emblem, HQ address, holder. Staffing, capacity, backlog, implementation quality. Holder's five assessment readings. Pending proposals and resignation offers. Subordinate agencies. Commands (Defense). Record. | Nominate (the shared seat row, opened in place: candidates as a results list with why each was ranked, fit, banded readings, the Senate count as a staff projection and who objects, against leaving the seat open, through the one review), acting, dismiss; answer proposals and resignations; reconcile a faction |
| `/washington/office/press` | H | US or world, lens = outlet reach | The press secretary's office: podium, framing offers on recent decisions, coverage trend | Press actions; take the hit; frame a decision |
| `/washington/person/:id` | H | The person's place (office HQ, state or capital) | Portrait, role, standing. Five readings with consequence lines and trend. Faction, network, career timeline, counsel given, where named. | Dismiss, remove, withdraw nomination (compared against keeping) |
| `/washington/congress` | H | US. Senate lens (hatch) or House (hex or hatch). | Chamber control (hemicycles, majority line), disposition toward you, leaders and posts, committees (investigating flags), floor business by stage with vote projection, notices owed, war-powers and appropriations status | Transmit; notify committees; certify extension; select a state to see its delegation |
| `/washington/congress/bill/:id` | H | US, lens = projected support by delegation | Stage pipeline, whip count per chamber, effects, override projection | Sign or veto (compared); lobby |
| `/washington/congress/post/:id` | H | Holder's state | Post, holder, disposition, influence, lobbying approaches compared | Issue lobbying |
| `/washington/courts` | W | Previous camera; no flight | Bench (seats by recorded lean, drawn filled for a clear lean and ringed for a slight one, keyed; a justice opens their file, and an old `?judge=` address lands on the bench first so Back returns to it), docket pipeline (your acts under challenge, with strike-down odds), nominations | Nominate (the shared seat rows; a Supreme Court seat is never preselected), withdraw |
| `/washington/courts/case/:id` | W | Previous camera | What is challenged, effects reversed if lost, unreversed cost, timeline | The case's response path |
| `/washington/oversight` | H | Pins of agencies under inquiry | Inquiries pipeline, directive composer with statutory-limit preview, inspectors (with removal notice), the appointments desk (`?view=appointments`, `&seat=` for one seat): the pipeline strip, then every open Senate-confirmed seat as a shared seat row grouped Cabinet, Agencies and boards, Courts, each with its recommended name and opening in place to its candidates | Issue directive; file removal notice; remove officer; send the chosen nominations in one review |

### Nation (home camera: contiguous US plus Alaska and Hawaii insets)

| Screen | Class | Focus and lens | Panel contents | Actions |
|---|---|---|---|---|
| `/nation` | S | US. Default lens is approval by state, beside the electoral call. Pointing at a state in the strip lifts it in place. | National readings (approval and electors as dials). Every state on one strip for the lens, sized by electoral votes; each dot opens its dossier (the map's list is the accessible table). Active conditions and emergencies. | Open state |
| `/nation/state/:id/act` | W | The state | The desk for one matter (`cause=`) or for federal power (`power=1`): options as a results list, terms, the one review | Commit; Back returns to the state |
| `/nation/state/:id` | S | State detached; districts inside recolored by the lens; `?district=` detaches a district | Sections: **Overview** (flag, governor party and disposition, electoral votes, approval with trend and electoral call, lean, population, GRP). **Politics** (Senate seats, House delegation, districts). **Economy** (jobs, prices and crime against national; industry share; federal dependence; metros). **Conditions** (claims and marks with city pins, emergencies). **Acts.** District view: holding party, lean, claims and marks, state context. | Locale acts (relief, deployment request, federalize, waiver, review) with governor-assent rule, cost and projection; declare an emergency |
| `/nation/economy` | H | US, lens = jobs or prices against national, or GRP | Cycle reading. Readings with history and baselines. This presidency against a chosen stretch of the published United States record (unemployment, inflation, growth), lined up by months since each began, with a table of every figure and an account of the transforms applied. Markets (commodities, equities, Fed path, release calendar). Household readings. Trade balance. | Fed ease or tighten, reserve release, fuel waiver (compared against waiting) |
| `/nation/budget` | W | Locator, lens = federal dependence | Fiscal books (revenue, outlays, deficit, debt series). Allocation editor with live draft projection. Appropriation status and funding deadline. | Request appropriation |
| `/nation/policy` | H | US, lens = the selected domain's industry share | Portfolio by domain with current stance. Stance spectrum compare (per-turn effects, enactment cost, alignment shift, pledges at stake). Order pipeline. | Enact stance; draft order |
| `/nation/policy/order/:id` | W | Affected states in locator | Projection, price effects, strike-down risk, terms | Sign order |
| `/nation/emergency` | H | Lens = conditions by state | Active declarations with renewal windows, conditions board, incidents | Declare, renew, end; request Guard federalization |

### World (home camera: whole world)

| Screen | Class | Focus and lens | Panel contents | Actions |
|---|---|---|---|---|
| `/world` | S | World. Default lens is standing toward the US. | Watchlist (movers), in-flight events and wars, ranked list for the lens, search | Open nation, organization, war |
| `/world/nation/:id` | S | Country detached; arcs to tie partners; US anchors in-country | Sections: **Overview** (flag, leader, government type, posture word and level). **Relationship** (standing, their view, rapport, envoy, measures in force). **Economy** (trade share and partners, GDP, stability). **Forces** (bands, holdings, nuclear, US commitments toward them). **Moves** (aims, program, recent moves, organizations, coverage, third-party ties). | Lift a measure; set commitment status; open act |
| `/world/nation/:id/act` | W | No map; the country's file holds it | Three sections and a bar pinned to the foot. **Where things stand:** their trust, ours and the tension as drawn steps; everything under way with End on its row. **Your options:** every option from every goal in one results list, goal chips as a filter with open counts and a Checked view that compares options from any goal on one scale (chance, money now and each week, time, every change from today, what could go wrong); a locked row is drawn disabled with its floor as a meter and the act that gets there first. **Plan:** the picked option's terms beside what it changes from today, the law and the staff's findings. **Bar:** what is picked, the next step in words, and the one verb that opens the review. | Issue act; impose a tariff on one or more goods in one order, or order its investigation; engage; sign treaty; request force authorization; end what is under way |
| `/world/org/:id` | S | Members set-detached | Coalition alignment, US role, members ranked by standing, pledges and commitments | Engage; pledge |
| `/world/war/:id` | S | Belligerents in side colors, joiners lit, arc, theater zones with forces; a card on each side's principal | Intensity, war support, exhaustion, forces by party, war-powers clock and reports, join price and risks, peace projection | Join; leave; terminate force; file war-powers report; seek peace or settle; call a compact |
| `/world/security` | H | World, deployments lens (force clusters) | Daily intelligence items by urgency. Geographic commands (posture, forces; hovering lights the area) and functional command cards. Readiness by service. War powers. Covert findings. Collection taskings. Assessments. Commitments. Pending authorizations. | Sign or close finding; task or close collection; commission or press assessment; set commitment status |
| `/world/security/command/:id` | S | Command area set-detached, zones and anchors expanded | Posture, commander, forces by zone and base, commitments | Set posture; relieve commander; reassign forces; amend the unified command plan |
| `/world/treaty/:id` | S | Parties set-detached | Terms, likelihood, Senate ratification projection | Ratify; withdraw |

### Record (camera follows the selected entry; read-only)

| Screen | Class | Focus and lens | Panel contents |
|---|---|---|---|
| `/record` | S | Event density; scrubbing the timeline plays pulses | Timeline with filters (domain, subject, outcome), story arcs, promises and due pledges, polarization, inherited quarter |
| `/record/event/:id` | S | Event place, delta lens | What happened, readings before and after, state (issued, under way, resolved), cause link and downstream links |
| `/record/press` | — | — | Retired 2026-10-12: redirects to the one Press page, `/washington/office/press` (desks, coverage by week, the feed, responding, running stories, press abroad). |
| `/record/press/dispatch/:id` | H | Story place | Article |

### Outside the modes

- `/`: the title screen on the slowly turning dotted world.
- `/founding`: Workspace, 8 focused steps (person, record, politics, ticket, platform, staff, cabinet, oath), each showing what it commits you to, then the seal and the day-one orders. The map frames the US and lights the home state when the persona has one.
- `/administrations`: 5 slots.
- `/settings`, `/administrations` and `/handbook` keep the game frame (rail, Continue, bell) while a presidency is open, and stand alone when none is.
- `/compare`: one metric drawn for the United States against chosen countries, states, its own earlier weeks and the published United States record, on shared axes with a table. Every reading with a comparable metric opens it.
- `/catalog`: development builds only.
- `/handbook`: the glossary and the explainers read in order, as twelve chapters from the first week to the Record (`packages/player-core/src/glossary/handbook.ts`). A chapter opens with what you can do after reading it, draws each explainer with the same renderer as screen help, lists its terms, and ends with doors to the screens it describes. `/handbook/:chapter` is one chapter; `/handbook/terms` is every term from A to Z with a filter. It holds no explanation of its own, so a screen's help and the Handbook never disagree. Reached from the utilities beside Settings, from search, and from "Read the chapter" in every explainer's sheet.
- `/settings`:
  - System/Light/Dark (also discoverable in the shell), camera (Fly, Quick, Cut), map density, high contrast, color-vision palettes, attention policy.
  - The God Mode entitlement: one row, shown to entitled players only (owner decision 2026-10-10).
- `/recovery`.
- `/ending`: the final electoral calls as a lens. This is the finale on the map.
- `/legacy`.

## 3. Tokens and type

The universal player draws from the desk tokens (`packages/design/src/tokens/desk.ts`, 2026-10-24): the President's desk at night, one lit work plane in a dark room. `packages/ui/src/theme/from-design.ts` projects them into Tamagui themes under the role names every component reads. The legacy DOM player still reads `color.ts` and `tokens.css` until it is deleted. Components never write a color, a size or a duration of their own. The published design system (tokens, components, brand book and audit) is the reference for the whole system; this section states the rules the code holds.

### Color

Four themes: Night (the design center) and Day, each with an AAA contrast variant. Contrast composes with the player's System, Light or Dark choice under DECISIONS §8.9 instead of replacing it. Each theme is one flat set of roles, and a zone re-maps them for everything inside it (`Zone`, or `Pane zone=`):

| Zone | What it is | What changes |
|---|---|---|
| desk (default) | the work plane | graphite planes, cool ink, signal blue for action |
| paper | an issued document | warm stock and black ink; actions turn to ink; destructive acts take the deepest red |
| situation | classified material, the crisis room | near-black in every theme, amber as its accent |
| theater | the map and spatial views | the deepest ground becomes the plane |
| chrome | the command bar and navigation | translucent glass over the ground |

| Anchor | Job |
|---|---|
| Signal (blue) | Selection, links, the primary action, "you" in a chart. Continue and Advance are primary. |
| Brass (gold) | Presidential authority: signing (`Button kind="seal"`), the seal, the current stage, a draft's new value. |
| Alarm (red) | Force, destruction, the irreversible, a failed save. |

Status is state, never category: info, success, warning, danger and pending, each with a wash. Success is teal, off the red–green axis. A pending state is outlined and dashed, never filled. Party and data palettes are separate and keep their color-vision variants. Every text pair a usage note names holds 4.5:1 (7:1 in the contrast themes), and boundaries, the focus ring and meaningful marks hold 3:1. Two tests hold this: `packages/design/src/tokens/desk.test.ts` measures the roles, and `packages/ui/src/theme/desk-themes.test.ts` measures every theme and zone a component can sit under, with translucent grounds composited.

**Settings rewrite tokens, components never read them.** High contrast (and the system's "more contrast") selects the contrast variant of the active scheme. The color-vision setting swaps the party and diverging palettes: under protan and deutan the Republican hue turns orange; under tritan the Democratic hue turns cyan. It reaches every data ink the same way: the bench's lean (`divergeCool`, `divergeWarm`) and the gain and loss of a track, a diverging bar, a sparkline and its key (`goodInk`, `badInk`) take the diverging palette's cool and warm steps instead of green and red.

### Type study

Three families, each with one job (`deskType` in `desk.ts`; faces loaded through expo-font):

- **Geist** carries the interface: page, pane and card titles, labels, readings, controls and chart text. Figures use its tabular numerals, never a monospace.
- **Newsreader** is ceremony, voice and paper: `hero` (the title screen, the oath, a term's end), `headline` (a matter's title), `voice` (the President's or an adviser's own words) and `document`. It never titles a working page.
- **Geist Mono** is readouts: the game clock (`clock`) and strings a player may copy (`code`). A statute citation or a case name is read as prose and takes the interface face.

The scale is in `rem` of a 16px root so the player's own text size scales all of it. `Text`'s `variant` (`packages/ui/src/primitives/Text.tsx`) is the only way to choose a step; `weight`, `tone`, `serif`, `mono` and `tabular` modify it, and no screen or shared piece passes `fontSize`, `lineHeight` or `fontWeight` of its own (`scripts/verify-shared-components.mjs` counts the ones still forgiven). Nothing is set below 12px. SVG chart text, which does not follow `rem`, is pinned to the caption step as `CHART_LABEL_SIZE`.

| Variant | Size | Weight | Use |
|---|---|---|---|
| caption | 12 | 400 | a fact's name, a note under a figure, counts, tab labels, chart ticks |
| eyebrow | 12, uppercase, tracked | 600 | the kicker over a page or pane title, never a figure's name |
| label | 13 | 500 | a row's or card's name, a figure's name, control text |
| body | 15 | 400 | reading text |
| title | 17 | 600 | a card's heading, a receipt's headline |
| heading | 20 | 600 | a pane's title (level 2) |
| display | 28 | 600 | a working page's title |
| figure · figureXl | 26 · 44 | 500 | a reading's figure; one headline reading on a stage (`tabular-nums`) |
| headline | 30, Newsreader | 500 | a matter's title |
| voice | 19, Newsreader italic | 400 | the President's or an adviser's own words |
| hero | 60, Newsreader | 500 | ceremony only |
| document | 18, Newsreader | 400 | paper in the fiction |
| clock · code | 15 · 12, Geist Mono | 500 | the game clock; copyable strings |

**One role, one step.** A name sits one step below what it names, and the shared piece for the role holds that pairing so no screen re-decides it:

| Role | Shared piece | Name | Value |
|---|---|---|---|
| A reading with its figure | `Reading` (`Stat` delegates to it), world `Tile`, `FigureBand` | label, secondary | figure, heading or title, tabular |
| Facts in a grid | record `Fact`, `FactGrid` | caption, secondary | label, tabular |
| Terms as rows | nation `Facts` | label, secondary | body |

Tertiary ink is for notes and sources under a value, not for a name. A local component under a shared piece's name is a one-off the gate counts; extend the shared piece, or name the local one for what makes it different.

### Space, shape and motion

- **Space:** a 4-point scale (2, 4, 8, 12, 16, 24, 32, 48). Every top-level panel on a screen is inset by `--panel-pad` (24, 16 under 480px wide), set once on the work surface; section titles in a panel use the title step (18) in the display face. A card or row with one destination is a whole-card door; the substance of a screen is open without a click, and only sources, methodology and raw tables fold. The workspace measure (1200) is centered on a wide screen, and a grid of a fixed number of tiles picks a column count that divides it, so no row is left short.
- **Radius:** chip 6, control 10, card 16, sheet 24 (`deskRadius`). Depth is light, not outline: a plane is lifted by its lit top edge and a tight shadow, and a card's character is a band across its top (`Pane band=`), never a colored side border.
- **Fit:** a component's shape follows the room it is given, not the window. `Fit` and `useMeasuredWidth` measure a box (React Native has no container queries); `Reading` is a row under 200px, a tile to 340px, and a tile with its history beside the figure above that; `Pane` tightens its padding under 480px of its own width.
- **Editing:** a value the President sets is an `InlineField` where it is read. A change to something the simulation acts on is a draft (gold, with today's value struck beside it) until it is reviewed and signed; view settings and filters pass `immediate` and set at once. Drafts wait in the `Drafts` tray (the command bar's brass count; a right-hand sheet on desktop, a bottom sheet with half and full detents as buttons on phone), grouped by the authority that would act on them: Takes effect on signing, Sent to Congress, Needs the Senate. Each is signed on its own in `SignOff` inside the tray: the route, the law it rests on, the terms in order, then one ordinary press of its named verb ("Sign the order", "Send to Congress"); the Signed stamp plays after the commit. A draft whose terms moved since it was made says Out of date and is priced again on review. A screen's own verb for a drafted act (the budget's "Send budget to Congress") opens that draft's sign-off rather than a second review. First consumers: budget lines and the tariff order.
- **Measures:** controls are 44px tall, 36 when compact. The phone bar is 44px, the desktop bar 56; the rail is 88px; the docked panel is 420–520px and the wide Hybrid panel 65% of the room up to 960px; the phone detents are 112 (peek) and 334 (half).
- **Motion:** 120ms for a control, 200ms for a sheet or panel, 280ms for a detach, 400ms to settle, on a standard and an emphasized curve. Reduced motion makes every duration zero. The camera's own timing belongs to the map.

### Consistent choices, navigation and legislative work

Short map/filter choices stay on one line. When measured labels cannot fit, the shared Choice renders a labeled native select with the same value and options; it does not wrap a final option onto another row. Rich choices remain cards. Narrow consequential comparisons use full-width option cards and full-width alternate readings, so a long bill title cannot squeeze the consequence into a sliver.

Country, state, Economy, Congress and Security files share the numbered **In this file** disclosure. It navigates to the existing sections without changing the camera or route. Section order matches the file; urgent work comes before background dossiers.

World opens with **Situation**: live conflicts, US involvement, pending commitments and the coverage of diplomatic assessments. Unknown relationships stay unknown. **Governments** is a named directory with search, region and lens controls, pagination, and preserved query state when returning from a country. A government is a readable flag/name/capital row, not a tiny coin in a chart.

Congress puts floor business and the **Legislative agenda** before institutional background. Players browse currently relevant proposals by policy area, review one against waiting, and transmit through the existing committee/floor process. Purpose, competing interests, annual funding, assessed effects and current vote counts are visible. Internal eligibility thresholds, turn gates and source predicates are never rendered. A receipt links the action to the Record; transmission grants no law benefits.
