# Surface audit, universal player (2026-10-17)

Scope: type hierarchy, spacing, alignment, depth, redundant cards, unexplained figures, overflow, empty/loading/error states, dark-theme contrast, component consistency, and guess-the-label wording on every static route, week-31 save. Charts and marks are in `VISUALS.md` (V-numbers).

Capture names are `<route-slug>-<w>x<h>-<theme>[-partN].png` in the session scratchpad `caps/`. Line numbers are in the `ui-uniformity` worktree at HEAD.

## What this audit saw, and what it did not

- **Seen:** the first viewport only, of every static route at 1440 light, 390 light, and a dark subset (brief, calendar, executive, congress, courts, nation, emergency, budget, world, security, record, compare at 1440; compare at 390). The `-partN` files are identical to part 1 on every route I compared, so nothing below the first screen was photographed. Below-the-fold claims are marked **[S]** (source only).
- **Not captured:** all dynamic routes (person, office, bill, case, state, country, country act, war, treaty, org, command, record event, dispatch, decision). No shell tool was available to harvest ids and run `shoot-screens.mjs`. Nothing here speaks for them except the shared-layer findings, which apply to them by construction.
- **Not exercised by the fixture:** loading, error and in-flight states. The week-31 save is populated; I could not trigger them. `Empty`, `Loading` and `ErrorState` exist in `packages/ui/src/primitives/States.tsx:63-73` but are used in two files in the whole app (`app/administrations.tsx`, `record/RecordSections.tsx`), so the states a route shows when empty are mostly one-off sentences.
- **Stale bundle risk:** the Compare chart, the Nation approval meter and the Oversight pressure tick render in the captures differently from HEAD's source (see `VISUALS.md`, header). Re-shoot those three before acting on them.
- **Design brief vs code:** `docs/DESIGN.md` section 3 names Archivo and Geist; the code ships Source Sans 3 and Source Serif 4 (`packages/ui/src/theme/tamagui.config.ts:7-18`) and a system Menlo stack for mono (`:57-58`). Either the brief or the font files are out of date; pick one before fixing type.

---

## Cross-cutting patterns (fix once in the shared layer)

Each lists every instance I found. Route-by-route detail follows.

### X1. Legal citations set in monospace
`LegalCitation.tsx:24` sets every citation in `mono` (`Text mono`, `Text.tsx:47`, the system Menlo stack). A statute or case name is not a string the player copies; DESIGN reserves mono for things like the campaign seed. It also makes citations the loudest text on the page (caps, wide tracking, bold).
- Instances [C]: Calendar (`calendar-1440x900-light-part1`), Congress "U.S. Const. art. I, §9, cl. 7", Courts `Youngstown Sheet & Tube Co. v. Sawyer, 343 U.S. 579 (1952)` (a case name, in mono, and truncated to "Youngstown Sheet & Tube Co. v. Sawyer, …" at 390 by `numberOfLines={1}`, `LegalCitation.tsx:24`), Oversight (two chips), Budget (four chips in a row, `nation-budget-1440x900-light-part1`), Policy (four chips including the Youngstown case and "Exec. Order No. 12866, 58 Fed. Reg. 51735 (1993)"), Emergency (two), World (two), Security (two plus two more in "Legal deadlines"), Handbook terms ("THE LAW BEHIND IT", `handbook-terms-1440x900-light-part1`).
- Fix: sans, `caption` strong with `tabular`, citation first and title second as now; remove `numberOfLines={1}` or allow two lines; keep `Document.tsx:63` and `Classification.tsx:57` (portion marks) if the brief wants them.

### X2. Three `Panel` components, two `LawHelp` components, three ways to say "the law behind this"
- `ui/nation/Panel.tsx:13` (title 18, icon 22, `note`, `actions`).
- `ui/world/Panel.tsx:29` (title 18, icon 22, `count` pill, `lede`, `aside`).
- `apps/player/src/congress/parts.tsx:37` (title 18, **icon 20**, `help`, `action`; no lede or note).
- `congress/parts.tsx:27` `LawHelp` is an info button; `nation/Law.tsx:29` `LawHelp` is a gold-edged card whose title is `variant="label"` (14px, `Law.tsx:42`) holding the citations. Same name, different job.
- Result: "Congress this week" and "Congress controls the money" look like peers and are not: the first is an 18px panel title, the second a 14px card title (`nation-budget-1440x900-light-part1`, `nation-emergency-1440x900-light-part1`, `nation-policy-1440x900-light-part1`: "National emergencies and when they run out", "Congress controls the money", "What your orders can and can't do"). Instances by route: Congress, Courts, Oversight use the `congress/parts` Panel; Nation, Economy, Budget, Policy, Emergency use `nation`; World, Security use `world`.
- Fix: one `Panel` with `count`, `lede`/`note`, `help`, `actions`, `aside`; one `LawHelp` card named for what it is (`LawCard` already exists in `ui/handbook/LawCard.tsx`).

### X3. The same job done by four tab/segment controls, with three selected looks
- Underline tabs: `ui/nation/ViewTabs.tsx:15` and `SectionNav` (Economy "Overview / Markets / Trade / Budget and debt / What you can do", Policy "Options / Orders / How it's going", Budget, Security "Theaters / Forces / Intelligence / Operations").
- Pill buttons in a horizontal `ScrollView`: `congress/parts.tsx:14` (Congress, Courts, Oversight "Judges · 9 / Cases · 0 / Nominations · 0"), and Nation's "Overview / Map / All states / Needs you / Opinion / Run the country".
- `Segmented` (Executive views, Press section, Record sections, Who acted, Compare time span, world lens, Settings theme).
- Selected state: blue fill (Congress, Segmented), near-black fill (Nation chips, `nation-1440x900-light-part1`), gold fill (Nation map lens "Approval"), blue underline (Economy). Four selected looks for one meaning.
- At 390 the pill strips clip the last pill without a fade or edge cue: "Nomin…" (`washington-congress-390x844-light-part1`), "Insp…" (`washington-oversight-390x844-light-part1`), "Needs yo…" (`nation-390x844-light-part1`), and Economy's underline strip clips "W…" (`nation-economy-390x844-light-part1`). The overflow log's wide elements on congress, oversight, nation, economy, budget and security at 390 are these strips (the log names the Members/Appointments/Opinion tab icons: `svg.user-bold`, `svg.user-plus-bold`, `svg.list-checks-duotone`), so they are scrolling by design but give no sign that more exists.
- Fix: one tab component (pill or underline, not both), one selected style, and a right-edge fade plus a count ("1 of 6") when it scrolls.

### X4. Zero-value and duplicate cards
Cards whose whole content is a zero or "nothing", or that repeat a neighbor:
- Congress `Door` trio "Bills on the floor · 0 this week", "Nominees waiting on the Senate · 0 waiting", "Awaiting your signature · Nothing to sign" (`congress/Overview.tsx:47-51`, `washington-congress-1440x900-light-part1`), plus tab chips "Nominations · 0" and "War powers and funding · 0".
- Courts stat row "OPEN CASES 0 · WAITING ON YOU 0 · SEATS FILLED 9/9 · NEXT COURT DATE Not scheduled" directly above a panel "Nothing from the courts needs you" that says the same thing (`washington-courts-1440x900-light-part1`), plus tab chips "Cases · 0", "Nominations · 0".
- Oversight "At a glance" with 0 / 0 / 0 / 0 / 4, a panel "Reports you owe the intelligence committees" that says "You don't owe the committees any reports", three stage counts of 0 with three empty bars (`Inquiries.tsx:55-63`), and chips "Investigations · 0", "Instructions · 0", "Inspectors general · 0" (`washington-oversight-1440x900-light-part1`).
- Emergency `FigureBand` (`EmergencyScreen.tsx:35-38`): "Emergencies declared 0 / Places covered", "No emergency declared 1 / Worth a look", "Cost to standing this week None". The second tile's label is the opposite of the first's number (declared 0, undeclared 1), and the fourth reads "None" in green as a value.
- World: tile "In progress abroad 0 items" and, a screen later, a panel "In progress abroad 0" saying "Nothing is in progress" (`world/overview/Sections.tsx:74`, `world-1440x900-light-part1`); tile "Treaties in force 0".
- Security: "Commands on high alert 0 of 11", "Urgent intelligence 0 of 1 item", "War Powers 0 open" plus a panel "Legal deadlines 0" with a sentence (`world-security-1440x900-light-part1`).
- Brief: "Waiting on others: Nothing you ordered is waiting on an answer" is a full card (`brief-1440x900-light-part1`); the same nomination appears in "Also waiting" and in "Deadlines".
- Executive: "Work done isn't measured" on each of the first three office cards.
- Economy: three rows each reading 4.0% (`Rates.tsx:247-249`).
- Fix: when a group is all zeros, render one quiet line ("All clear: nothing waiting in Congress this week") with the three doors as links below it, using `Empty` (`States.tsx:68`); show counts on tabs only when above zero.

### X5. SVG text falls back to a serif face; three label sizes
`BenchmarkChart.tsx:55-56`, `BenchArc.tsx:44-53`, `FanChart.tsx:69` pass `SourceSans3_*` face names as SVG `fontFamily`. In captures the chart text renders in the browser's serif (`compare-1440x900-light-part1`, `world-security-1440x900-light-part1`: "This presidency 72"). Axis labels are 10px (`FanChart.tsx:69`), 11px (`BenchmarkChart.tsx:47`), 12px (`BenchArc.tsx:44`). DESIGN's reference-line rule says chart labels use the sans face. Also `BenchArc.tsx:50` deliberately sets its center figure in `FONT_FACES.serif[700]`.

### X6. Translucent data marks
Against "solid inks for data marks": `ThresholdBar.tsx:48` (0.55), `BenchArc.tsx:39,43` (tint by `fillOpacity`), `RollChart.tsx:54,56` (0.45 and 0.35), `PositionRidges.tsx:61` (0.45), `Bench.tsx:77` agreement matrix (opacity 0.25 to 1 on accent, with `inverse` text on top). Bands (`Track.tsx:54`, `FanChart.tsx:79`) are the allowed exception.

### X7. Sideways scroll inside content
`RollChart.tsx:37` (horizontal `ScrollView`), `Bench.tsx:62` `ScrollRow` around the agreement matrix, the tab strips in X3. At 390 the matrix is 64px per column times seven columns.

### X8. Seven different "headline number" tiles
`ExecutivePulse.tsx:6` Card, `ConditionStrip.tsx:20` Tile, `PressKpis.tsx:23` Tile, `ui/world/Panel.tsx:76` Tile, `ui/nation/Panel.tsx:66` FigureBand, `congress/parts.tsx:90` Figure (courts and oversight "At a glance"), `brief/NationalCondition.tsx:20` Reading, plus `ui/data/Stat.tsx:65`. They differ in figure size (`heading` 22 vs `figure` 28), label case (eyebrow caps vs sentence), caption size, border (only the world tile has a 3px colored top), and whether the whole card is a link.

### X9. Page-header grammar
- Eyebrow is a date and place on Executive, World, Security ("AUGUST 18, 2029 · WASHINGTON", `Page.tsx:49-55`); an institution on Congress, Courts, Calendar, Budget ("UNITED STATES CONGRESS", "THE FEDERAL JUDICIARY"); a topic on Oversight ("ACCOUNTABILITY"); a sentence on Nation ("THE COUNTRY AND WHAT IT THINKS"); a department plus a date on Press. Pick one: institution.
- The seal is `emblem` in the title row; at 390 it wraps above the eyebrow (`Page.tsx:46-48`, `flexBasis={320}`), costing about 100px before the title on Congress, Courts, Oversight, Executive, Nation, Economy, Budget, Policy, Emergency, Security (`washington-congress-390x844-light-part1` and its siblings). At 1440 it sits beside the title.
- Citation chips and the (i) icon in `actions` wrap on 390 and strand the icon on its own row: `world-security-390x844-light-part1`, `world-390x844-light-part1`, `washington-office-press-390x844-light-part1`.
- Title size is `display` (28 to 36) on desktop and `heading` (22) on phone (`Page.tsx:57`); fine. The lede is a full sentence on some pages and a count line on others ("63 top jobs. 5 need you.").

### X10. Depth is thin in light theme
Every panel is `Surface` `base` with a 1px border and no shadow; `elevated` is used 9 times in the whole player, and only the Brief hero reads as lifted. `raised` (90 uses) differs from `base` by a tint that is hard to see in light theme (`washington-congress-1440x900-light-part1`: "The chambers" panel and the cards inside it). The Nation map band and the Brief decision card are the only strongly layered blocks. Sheet has a shadow (`Sheet.tsx:52-54`). Fix: define three real levels (ground, card with a hairline and a soft 1-2px shadow, popover) in the theme, and use `sunken` for chart wells.

### X11. Chrome costs height at 1440x900
The shell draws two "UNCLASSIFIED" bars (top and bottom, about 22px each), a 56px top bar and then a 41px section strip on Nation pages: about 120px of 900 before content. The left rail ends at "World" with a small chevron (`brief-1440x900-light-part1`): **Security, Press, Record and the rest of the World group sit below the rail's fold and are reachable only by scrolling a 120px-tall list.** Handbook, Administrations, Settings pin at the foot and take another 120px.

### X12. Bare band words
Words that stand in for a reading with no definition on the screen: "Even" (Congress), "Fair" (Economy), "Sound" and "Disloyal" (Executive), "Continuity" (Policy), "Neutral" and "Wary" (World), "Simmering" (World), "Strained / Mixed / Strong" (Courts), "Worth a look" (Emergency), "Priority · Soon" and "Stops time" (Brief), "Acting" (office chip). Fix: each band word links to its ladder in a popover, or the band ladder is drawn under the first instance.

### X13. Ad hoc empty states
See "Not exercised" above. Instances of sentences-as-empty-states: `Clocks.tsx:20-28`, `Inquiries.tsx:64`, `Bench.tsx:57-58`, `Sections.tsx:63-65`, `Overview.tsx:101`. None has an icon, a next step, or the same box.

### X14. A floating button over the phone tab bar
`⚡` button at the bottom left over the Brief tab label on 390 captures of oversight, nation, economy, budget, policy, emergency (`washington-oversight-390x844-light-part1`, `nation-390x844-light-part1`, `nation-budget-390x844-light-part1`). It is not in brief or congress captures. I could not find its source in this pass; confirm it is a dev-only overlay (the top-right "DEVELOPMENT" pill suggests so) and keep it out of the review captures.

---

## Per-route defects

Format: **ID** defect. *Capture* `file`. `file:line`. Fix.

### /brief
- **B1** Section titles: "Also waiting" and "How the country is doing" are `heading` 22/700 (`brief/Matters.tsx:136`, `NationalCondition.tsx:63`); "Waiting on others" and "Deadlines" are `title` 18/600 in cards (`Clocks.tsx:17`). That is the heading-outside, title-inside rule, but the weight difference reads as two voices. *brief-1440x900-light-part1*.
- **B2** "Deadlines" shows "0 days" in red for a nomination due today, then "43 days", "444 days" in large figures; the unit is a 12px tertiary afterthought, and a deadline already at 0 has no bar. `Clocks.tsx:39-47`. Truncated text "serve under t…" from `numberOfLines={2}` (`Clocks.tsx:55`).
- **B3** Zero-value "Waiting on others" card and the duplicate of "Temporary leader at OMB" in both "Also waiting" and "Deadlines" (X4).
- **B4** Decision hero subtitle "ROUTINE: border, waiting on your answer." leaks an all-caps tag into prose. Hero reads "Priority · Soon", "DECISION", "Stops time" in a row of three chips with different shapes (pill, plain caps, outlined pill). *brief-1440x900-light-part1*.
- **B5** Figure "$363.24B" runs into its sparkline (card 2, `NationalCondition.tsx:35-39`); `Flat this week` in gray and `0.1 pts` in red for a 0.1 change: color noise. See V1.
- **B6** "Put off until August 25, 2029" (1440) vs "Put off" (390): a long date inside a button. `Matters.tsx`.
- Dark: ok (`brief-1440x900-dark-part1`). The dark hero card is nearly the same as the page in dark; it loses its lift.

### /calendar
- **C1** Mono citation chip (X1). *calendar-1440x900-light-part1*.
- **C2** Row bodies are full paragraphs set in 12px caption: "The Energy Secretary, Candice Walton, proposes signing Turn federal purchasing to clean power. Candice Walton believes…" (the sentence also reads "signing Turn", a copy join error). `ui/calendar/Agenda.tsx`.
- **C3** Timeline ticks at 390 unlabeled (V4). *calendar-390x844-light-part1*.
- **C4** Dark: past-mark labels use `tertiary` (`TermTimeline.tsx:40`); "Inauguration" is visibly dimmer than "Midterm elections" in `calendar-1440x900-dark-part1`; verify 4.5:1.
- **C5** Chips "Needs you" and "On the calendar" use two pale tints plus the row eyebrow "LEGAL DEADLINE" / "WAITING ON": three labels for one row's status.

### /washington (Executive)
- **E1** Figure and its unit are top-aligned, so "75%" and the 12px unit sentence sit on different baselines (`ExecutivePulse.tsx:14-20`, `Row top`, `paddingTop="xs"`). *washington-1440x900-light-part1*.
- **E2** Delivery ticks and four-dot trait pips (V6, V9).
- **E3** "Work done isn't measured" on three cards in a row (X4).
- **E4** Three selects "All offices / Government role / Needs you first" use a right-pointing chevron, which reads as "go", not "open a list". The toggle label "Off" sits left of the switch, away from the row's right edge.
- **E5** Filter row, view switch, count line "31 offices shown" and the section title "The White House (3)" stack with uneven gaps (24, 24, 8, 16).
- **E6** At 390 the three summary cards stack to 1000px before any office is shown. *washington-390x844-light-part1*.

### /washington/office/press
- **P1** 39% appears three times in one tile (title figure, meter label, meter figure). V11.
- **P2** Tone bar with no key (V12).
- **P3** The "Stories 12 this week" tile has no reading, so it is 80px of blank inside a 160px card. `PressKpis.tsx:72`.
- **P4** Lead story: a flooded-street photograph above "An energy shortage in Mali is declared over." and a dek that repeats the headline ("An energy shortage in Mali is over."). Art does not match the story; headline/dek duplication. *washington-office-press-1440x900-light-part1*. `ui/news/ArticleCard.tsx:86`.
- **P5** The (i) help is an orphan at the far right of the header, away from the title it explains.

### /washington/congress
- **G1** "Even 59%" (V14) and the unexplained tick colors.
- **G2** Door trio and zero chips (X4). The three doors have equal weight to the "Needs your attention" block below, which is the only item that matters this week.
- **G3** "Needs your attention" is a 14px amber label followed by a 12px sentence and a mono chip: three type styles for one warning (`Overview.tsx:54-58`).
- **G4** At 390 the 88px seal precedes the eyebrow (X9) and the tab strip clips "Nomin…" (X3).
- **G5** Panel title "Congress this week" is 18/600 and the info icon is 16px beside it with a 6px gap; Courts' info icons sit at the far right of the panel. Placement differs by panel.
- Dark: ok (`washington-congress-1440x900-dark-part1`).

### /washington/courts
- **K1** Redundant stat row and "Nothing from the courts needs you" (X4). "Not scheduled" is set in the same 22px bold as the numerals, so an absence looks like a value.
- **K2** Case name in mono, truncated at 390 (X1). *washington-courts-390x844-light-part1*.
- **K3** Supreme Court bench: no key; serif "5" (V21).
- **K4** "The year ahead" holds one date line and "No court dates are set yet." inside a card sized to match the bench: 200px of mostly blank.
- **K5** Info icons (i) on every panel title at 16px, light gray; on the light theme they are close to the card tint.

### /washington/oversight
- **O1** At-a-glance zeros and a brown "4" for empty jobs (X4); two citation chips top right that wrap under the title at 390.
- **O2** "Checks on you" is a small outlined pill left of the paragraph; it looks like a button and is not. *washington-oversight-1440x900-light-part1*.
- **O3** The paragraph under the tabs is 12px, 100% width at 1440 (about 150 characters per line). `OversightScreen.tsx`.
- **O4** Pressure meter tick (V26), three empty stage bars (V27).
- **O5** "Appointments · 4" is the only non-zero tab and it is last.

### /nation
- **N1** Two navigation layers at the top: a section strip (Overview and map / Policy / Budget / Economy / Emergencies) and a pill row (Overview / Map / All states / Needs you / Opinion / Run the country). *nation-1440x900-light-part1*. The strip is pure white on a pale-blue page; its "Nation" label repeats the page title.
- **N2** "How the country is doing" is the same title as the Brief's, with four readings here and five there. `ConditionStrip.tsx:68`, `NationalCondition.tsx:64`.
- **N3** The Stability tile has a 24px gap above its meter caused by equal-height stretch (`ConditionStrip.tsx:43` `flexGrow` spacer). The "How divided" tile says "Compared with the 2020s" twice (move line and Track label, `:88,91`).
- **N4** Meter tick names (V29, V30).
- **N5** The map band is a dark block on a light page: strong depth, but the toggle row ("Select several states Off · Or hold Shift as you pick") floats at 12px on the dark ground.
- **N6** Selected styles differ in one screen: black "Overview" pill, gold "Approval" pill (X3).

### /nation/economy
- **Y1** Three identical 4.0% rows (V36); the radios in "Key numbers" are cards, the rows below are a table: two layouts for the same data.
- **Y2** "Fair" (X12); the badge "The economy is in an expansion." sits right-aligned and floats with a chart icon and no label saying who says so.
- **Y3** The "Compare with" control chain: segmented ("US history / Over time / Real countries / Countries in your game") then a select "2017–2019" then an outlined chip "Compared by month" then a gray phrase "Before the pandemic". Four elements, three styles, for one choice. `Rates.tsx:51`. *nation-economy-1440x900-light-part1*.
- **Y4** At 390, tab strip clips "W…" (X3).
- **Y5** Section strip "Nation" label on the left is blue (link) here and black on Nation: breadcrumb color differs.

### /nation/budget
- **U1** The funding tick is described as "the dark tick" in a sentence (V40). *nation-budget-1440x900-light-part1*.
- **U2** "$0M" next to "$27.94B"; "Limit $363.24B" equals "Available now" (V41).
- **U3** "Congress controls the money" is four citation chips and a 14px title (X1, X2). It is a legal frame with no content of its own.
- **U4** Four red cues for one fact (left edge, badge, bar, "6 of 52"); the funding panel title "Funding" (18) sits under a 22px page title with only a 4px red edge as emphasis.
- **U5** Overflow at 390: log lists a wide card-and-tab element (SectionNav strip) on budget, economy, security.

### /nation/policy
- **L1** Unlabeled "+33%" and center tick (V44). All five cards show the stance "Continuity", so the list says nothing that differs between rows except one bar. *nation-policy-1440x900-light-part1*.
- **L2** "You can choose from 3 other options here. Some are set by law…" is loose 16px text between two cards with no container, breaking the rhythm (`PolicyScreen.tsx:92-95`).
- **L3** Four citation chips in "What your orders can and can't do" including a case name and a Federal Register cite, all mono, each with a 12px title under it (X1).
- **L4** At 390 the list becomes a select ("Fiscal") plus a "Compare policy areas" button: two controls for "which area". *nation-policy-390x844-light-part1*.

### /nation/emergency
- **M1** Four-tile band with contradictory labels (X4). *nation-emergency-1440x900-light-part1*.
- **M2** Panel titles at three sizes in one screen: "National emergencies and when they run out" 14px (X2), "Problems, most serious first" and "Where conditions are running" 18px.
- **M3** Severity bar and its bands (V48). The two-panel row is unbalanced: the left card ends at 520px, the map card runs on.
- **M4** In dark theme the map's sea and the page are both near-black (`nation-emergency-1440x900-dark-part1`): the map edge is lost.

### /world
- **W1** Summary tiles: truncated labels and captions, top-border colors (V51). *world-1440x900-light-part1*.
- **W2** "195" (header and tile) vs the game's 196 governments (CLAUDE.md); confirm the denominator.
- **W3** Header lede "We know how 99 of 195 countries see you. Their average view of you: neutral." The last clause is a fragment with no unit.
- **W4** Duplicate: the "In progress abroad" tile and panel (X4).
- **W5** Wars: "Fighting [bar] Simmering" (V53).
- **W6** Flag chips: 22px flags with 12px names; "21 more" and "55 more" as plain text links with no underline or chevron.
- **W7** Overflow at 1440 (`caps.log`, /world): a fixed-width flex row with padding and radius; I could not identify it from the class names. Likely the lens segmented control (`Views of us / Trend / Sides / Trade / US forces`). Unresolved.

### /world/security
- **S1** Bars under zero figures (V56). *world-security-1440x900-light-part1*.
- **S2** Header chips wrap and strand the (i) at 390 (X9).
- **S3** "Military readiness" panel: a 22px "72%" under a 14px "Readiness now", then "- No change this week" with a hyphen glyph instead of an arrow, then a source line, then a chart title in `title`, all at different leading.
- **S4** Chart label font (V57, X5).
- **S5** Two panels side by side with unequal content: left is 600px tall, right ends at 160px; the right column is empty below "Legal deadlines".

### /record
- **R1** Chart title omits unit; legend "You 0" (V61). *record-1440x900-light-part1*.
- **R2** The orientation card "See what each action led to" repeats the page lede and the three icon rows say "What happened / What changed / How it connects" with captions: it is tutorial text above the data it explains, and it vanishes when an entry is opened.
- **R3** Filter stack: search, "Who acted" segmented, Topic/Place selects, Outcome select on its own row: the third select wraps alone at 1440, leaving a short row.
- **R4** Section switch "Actions and results / Promises / Storylines / How you're doing / Damage reports" is a segmented control that turns into one select at 390 ("Actions and results ›", `record-390x844-light-part1`); the Tabs-vs-select switch is not the same pattern as Congress's scrolling pills.

### /compare
- **Q1** Chart labels, legend, duplicated title (V64). *compare-1440x900-light-part1*, *compare-390x844-light-part1*.
- **Q2** Orphan "You" chip (V66).
- **Q3** The first card holds a select "Approval" with a 12px helper "share of Americans who approve · higher is better" and a Time span segmented control: good. But the chart's own title repeats "Approval", then the panel title says "Approval over 26 weeks".
- **Q4** "Better / Worse / Same / No difference" chips (V65).
- **Q5** Overflow at 390 (`caps.log`): a fixed-width element with a line-clamped, break-word span, probably the chart legend or the verdict list. Unresolved.

### /handbook
- **H1** No shell chrome (rail, bars) and a "Back" link instead: a different frame from every game screen. *handbook-1440x900-light-part1*.
- **H2** Chapter cards have unequal heights in each row (card 5 shorter than 4 and 6, card 8 shorter than 7 and 9): ragged bottoms. Not subgrid.
- **H3** The intro paragraph is in the serif face at about 19px, a different voice from everything else; DESIGN keeps serif for in-fiction paper.
- **H4** Chapter numbers are blue discs here and gold-outlined circles in the terms sidebar.

### /handbook/terms
- **T1** The law card inside a term (`THE LAW BEHIND IT`) uses 12px text and a mono citation; the body is 16. *handbook-terms-1440x900-light-part1*.
- **T2** Letter chips run "4, A to W" with no X, Y, Z: fine, but "4" as a chip label for a term starting with a digit is cryptic.
- **T3** Search field is 48px tall with a 12px helper above it; no results count until typing.

### /settings
- **ST1** The High contrast row: label and helper left, but the "Off" label and switch sit mid-card (x=768 to 836 of a 1240 card) instead of at the right edge. *settings-1440x900-light-part1*.
- **ST2** Panel titles "Appearance and accessibility" and "Map" are 18/600 with 12px helpers directly under: tight (4px) against the 16px between helper and the next label.
- **ST3** Two radio card styles on one page (color-vision cards have swatches; camera cards do not).

### /administrations
- **A1** "Start a new presidency" is a full-width pale-gold button (about 1240 x 44) with dark text: washed out and too wide for a one-word verb. *administrations-1440x900-light*.
- **A2** "Rename / Export / Discard" are three identical text-only buttons; Discard, the destructive one, has no red, icon or separation.
- **A3** "President Fixture President" is shown twice in the card (title and the "President" field).
- **A4** The empty state "No other presidencies are saved" is a nicely sized `Empty`: use it as the model for X13.

### /legacy
- **LG1** The card has the same fill as the ground, so only a hairline shows; four lines of verse in 16px serif in a 1240px box leaves the screen 80% empty. *legacy-1440x900-light*.
- **LG2** "Open the Record" uses a back-arrow icon for a forward move.
- **LG3** No shell chrome (see H1).

### /more
- **MO1** At 1440 this page lists every item already in the rail: a duplicate of navigation. It is a phone page; on desktop the route should redirect or the rail should be the only list. *more-1440x900-light-part1*.
- **MO2** Group cards have unequal heights with large blank areas (Brief card: two rows in a 230px card; Press and Record: one row each).
- **MO3** "Recovery" carries a warning triangle icon in the utilities list: the icon says "danger" for a repair tool.

---

## Dark theme notes (the 12 dark captures I read)

- Ink on the near-black ground is strong; gold eyebrows and citation chips hold. No illegible text found at first viewport.
- The Brief decision card and the Emergency map lose their edge (B-dark, M4). Raised and base surfaces in `washington-congress-1440x900-dark-part1` differ by about one step: layering is weaker than in light theme.
- Past-mark labels on the Calendar timeline are the dimmest text I saw (C4).
- Charts: the Compare gold labels pass; the green tick on the Congress meter against the blue fill is hard to see (`washington-congress-1440x900-dark-part1`, x=833).
- Not verified numerically: no contrast ratios were computed.

## Overflow at 390 (from `caps.log`)

| Route | Wide element (as far as I can tell) | Judgment |
|---|---|---|
| congress, oversight, nation | Tab pills in a horizontal `ScrollView` (`congress/parts.tsx:16`) | Scrolls by design; no edge cue (X3) |
| economy, budget, security | The section tab strip | Scrolls by design; "W…" clipped |
| compare | A fixed-width element with a clamped break-word span | Unidentified; check the legend row |
| world (1440) | A fixed-width padded rounded flex row | Unidentified; probably the lens control |

No horizontal page scroll was visible in any 390 capture; every overflow was inside a clipped strip.
