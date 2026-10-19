# Visualization audit, universal player (2026-10-17)

Scope: every drawn reading (charts, meters, tracks, bars, ticks, maps, dials, sparklines) on the static routes of `apps/player`, week-31 save. Read with `SURFACES.md`.

## How this was audited, and what it cannot say

- **Seen:** the first viewport of every static route at 1440x900 light, 390x844 light, and 1440x900 / 390x844 dark for brief, calendar, executive, congress, courts, nation, emergency, budget, world, security, record and compare. Evidence tag **[C]** below.
- **Not seen:** below the fold. The `-partN` captures are identical to part 1 on every route I opened (brief parts 1 to 4 at 390, brief parts 1 and 2 at 1440, nation parts 1 and 3 at 1440). The scroll container is not the window, so only the first screen of each route was ever photographed. Everything lower on a page is **[S]**, read from source only.
- **Not captured:** dynamic routes (person, office, bill, case, state, country, country act, war, treaty, org, command, record event, dispatch, decision). This session had no shell tool, so I could not run the Playwright href harvest or `shoot-screens.mjs`. Those instances are listed from source with **[S]** and lower confidence.
- **Captures may be older than HEAD.** Three components render in the captures differently from what HEAD's source draws: the Compare chart (captures: in-plot benchmark labels, dashed gold lines, benchmarks keyed as legend series; source `BenchmarkChart.tsx:249-365`: right-edge label column, solid gold landmarks, legend for series only), the Nation approval meter (captures: seven names joined in one line; source `Meter.tsx` plus `scale.ts:97` cuts to the gates and two neighbors), and the Oversight pressure meter (capture: a tick at 50%; source `Inquiries.tsx:51` passes no marks). Re-shoot after a clean Metro cache before fixing those three. Verdicts below say which one I am judging.
- Another agent was editing `packages/ui` while I read; nothing I read was in the modified list except review, SectionNav and act files, none of which are visualizations here.

Columns: **Measures** = what the mark stands for. **Title** = whether a title states it. **Unit/period** = unit and period shown. **Key** = every color, dash, tick and shape explained. **Help** = a how-to-read affordance (info icon, caption). **Color only?** = meaning carried by color alone. **Press** = marks are pressable and that is signaled. **Dark** = dark-theme legibility.

---

## /brief

| # | Instance (file:line) | Measures | Title | Unit/period | Key | Help | Color only? | Press | Dark | Verdict and fix |
|---|---|---|---|---|---|---|---|---|---|---|
| V1 | Sparkline x5 on the national condition cards, `brief/NationalCondition.tsx:39` -> `ui/data/Sparkline.tsx:13` [C] | Recent path of approval, budget authority, stability, readiness, standing | The card label names the metric; the line is untitled | None. No window ("last N weeks") and no axis | None. The dashed first stretch (the predecessor's path, `Sparkline.tsx:23`) is explained nowhere on screen | None | Valence tints the stroke (green, red); the arrow text beside it carries sign | Whole card is a link (`CardLink`), signaled by chevron-less card only | ok | **fix.** Add the window to the caption ("last 26 weeks") and a one-line key under the row of cards ("Dashed = before you took office"). The "$363.24B" figure collides with its sparkline at 1440 (`brief-1440x900-light-part1.png`, card 2): reserve the sparkline width or stack the figure above it. |
| V2 | Meter "Compared with past presidents" / "Compared with your term so far", `NationalCondition.tsx:50` -> `ui/data/Meter.tsx:25` | Where today sits among five landmarks and the term's own low and high | Meter label | Percent; no period | Source trims to gates plus two neighbors, names under ticks. Brief capture cuts off before this row [S] | None | Tick color encodes kind (gold landmark, green target, red gate, gray own record) with no key on the screen | Not pressable (card is) | ok | **needs re-shoot.** The Nation twin of this meter [C] showed seven ticks and a joined name line; if that persists, fall back to the ranked list, not a joined sentence. |
| V3 | Deadline window bar, `brief/Clocks.tsx:50-54` [C bar absent for the shown rows] | Share of a statutory window already used | None | Days; window length not stated | None | None | Bar color is urgency (red, amber, blue) only | Whole row pressable (`PressRow`), no hover cue visible | ok | **fix.** State "day 12 of 30" beside the bar; a "0 days" row (`Temporary leader at OMB`) shows a red figure with no bar at all [C], so the same card draws two kinds of rows. |

## /calendar

| # | Instance | Measures | Title | Unit/period | Key | Help | Color only? | Press | Dark | Verdict and fix |
|---|---|---|---|---|---|---|---|---|---|---|
| V4 | `TermTimeline`, `app/(game)/calendar/index.tsx:25` -> `ui/calendar/TermTimeline.tsx:51` [C 1440, 390] | The term as a track: elapsed share (gold fill) and the dated marks | "Term 1" plus caption "Day 210 · 1251 days left · ends January 20, 2033" | Days; term | At 1440 each tick has its name and date above or below it. At 390 `place()` returns null (`:22-35`) and the ticks sit unlabeled over a list (`calendar-390x844-light-part1.png`) | None | Past ticks gray, future ticks blue, fill gold; none explained | Not pressable. Marks look like links | ok (ticks hold) | **fix.** At 390 draw labels as a ranked list with each tick numbered 1 to 5 and the same number on the tick. Say once what gold fill and gray vs blue ticks mean ("Gold = served; blue = still ahead"). Make each mark a door to its agenda row. |
| V5 | `MonthGrid`, `ui/calendar/MonthGrid.tsx:14` [S] | Days with dated items | Month heading | Month | Not verified | Not verified | Not verified | Cells pressable | not seen | **unverified.** Month view is not the default and was not shot. |

## /washington (Executive)

| # | Instance | Measures | Title | Unit/period | Key | Help | Color only? | Press | Dark | Verdict and fix |
|---|---|---|---|---|---|---|---|---|---|---|
| V6 | Meter "Delivery" with marks "60% holds" and "40% fails", `executive/ExecutivePulse.tsx:40` [C] | Share of requested work delivered | Card eyebrow "WORK GETTING DONE" plus Meter label | Percent; no period | The two names print as one caption line "60% holds · 40% fails" under the track [C]; ticks are two different colors and the names are not tied to them | None | Tick color only distinguishes the two | No | ok | **fix.** Name each tick under itself (the Meter does this when it can; here both fell back to a list). Say what "holds" and "fails" mean: "Above 60% the branch holds its work; below 40% it is failing." |
| V7 | `Distribution` "Staffing", `ExecutivePulse.tsx:51` -> `ui/dossier/Bars.tsx:47` [C] | 63 top jobs split confirmed / stand-in / empty | Eyebrow "STAFFING · 63 TOP JOBS" | Count of jobs | Yes: dot, count, word under the bar [C] | None | No (words and counts) | No | ok | **ok.** The model for the others. |
| V8 | `Distribution` "Public services", `ExecutivePulse.tsx:61` [C] | 13 services split four ways | Eyebrow | Count | Yes | None | No | No | ok | **ok.** Headline "13/13 services measured" reads as 13 of 13 healthy; reword "13 of 13 measured". |
| V9 | `ReadBadge` four-dot pips on every office card, `ui/dossier/Readings.tsx:46` via `executive/RosterPanel.tsx:68` [C] | The holder's loyalty, competence, integrity, charisma | Word beside it ("Sound", "Disloyal") | None | **No.** Which dot is which trait is only in `aria-label` (`Readings.tsx:48`) | None | Dot color only (`READ_INK`) | Card is a door | ok | **fix.** Label the four dots (L C I C) or replace with `BandSteps` and the one deciding trait. Define "Sound" and "Disloyal" where first shown. |
| V10 | `StackBar` / `DeliveryKey` on the Work done tab, `executive/DeliveryBar.tsx:15,20` [S] | Inputs stacked, loss shaded | Row name | Percent of 100 | Yes (`BarKey`); the "lost" swatch is a flat `backgroundStrong` while the bar draws a faded block with a red edge (`Bars.tsx:23`), so the swatch does not match the mark | Key sentence | Partly | Row link | not seen | **fix.** Draw the swatch exactly as the bar draws loss (same fade and red edge). |

## /washington/office/press

| # | Instance | Measures | Title | Unit/period | Key | Help | Color only? | Press | Dark | Verdict and fix |
|---|---|---|---|---|---|---|---|---|---|---|
| V11 | Meter "Reporters' opinion of you", `news/PressKpis.tsx:70` [C] | Reporters' favor toward the President | Tile label plus Meter label (same words twice) | Percent; "this week" absent | One tick, "Even at 50%", but its mark `kind` is `"historical"` (gold landmark, `PressKpis.tsx:70`). A parity line is not a historical landmark | None | Tick color | Whole tile is a link | ok | **fix.** Drop the duplicate 39% (tile figure and meter figure) and the duplicate label; use `kind: "target"`-style neutral, or a Track with one strong mark. |
| V12 | `StackedBar` "This week's stories by tone", `PressKpis.tsx:71` -> `ui/news/StackedBar.tsx:20` [C] | Critical, even-handed, friendly stories | Tile label | Count of stories, week | **No key.** The caption "9 critical, 1 even-handed, 2 friendly" lists the words in the same order as the colors but does not tie word to color | Caption | Yes, red/gray/green | Tile link | ok | **fix.** Render `SegmentLegend` (exists, `StackedBar.tsx:43`) under the bar. |
| V13 | `WeekColumns` on the Outlets/Feed tabs, `news/DesksView.tsx:55` [S] | Stories per week by tone | Heading | Count per week | `SegmentLegend` likely | Not verified | Yes | Selectable columns | not seen | **unverified.** |

## /washington/congress

| # | Instance | Measures | Title | Unit/period | Key | Help | Color only? | Press | Dark | Verdict and fix |
|---|---|---|---|---|---|---|---|---|---|---|
| V14 | Three Meters "Congress toward you", "The House", "The Senate", `congress/Overview.tsx:41-43` [C] | How each body regards the administration, 0 to 100% | Meter labels; panel help (i) explains | Percent; no period | One mark (50%, drawn green) only on the first meter; the House and Senate meters have none. Figure reads "Even 59%" while the tick sits at 50%: **59% is right of the line yet the word is "Even"** (`congress-reading.ts:97` neutral band). The bands are never listed | Info icon (`Overview.tsx:39`) | Meter fill color = stance | Not pressable | ok | **fix.** Put the 50% mark on all three, and show the band ladder ("Against / Cool / Even / With you") as steps under the first meter. Replace "Even" with the word the band means ("Open to you"). |
| V15 | `Hemicycle` House and Senate, `congress/Chambers.tsx:67` -> `ui/legislature/Hemicycle.tsx:48` [S, below fold at 1440] | Seats by party; majority line | Panel title plus per-chamber heading with "lead–trail" | Seat counts | Yes: `PartyLegend` with counts, gold ring "Leadership", dashed spoke explained as "N needed for a majority" (`Hemicycle.tsx:78-100`) | Panel help describes pressing a dot | No | Seats pressable, but `SvgPress` with no hover or focus ring and 12px dots | ok | **fix.** Add a hover/focus ring and a one-line "Press a seat to open the member" under the legend. |
| V16 | `ThresholdBar`, `Chambers.tsx:80` -> `ui/legislature/ThresholdBar.tsx:32` [S] | One side's seats against pass / cloture / override | Row label plus `LawHelp` | Votes | Yes, a ticked list with cleared/short | `LawHelp` | No | No | ok | **fix (small).** The other side is drawn at 0.55 opacity (`ThresholdBar.tsx:48`); DESIGN says solid inks for data marks. |
| V17 | `PositionRidges` "Where you stand", `congress/Aisle.tsx:79` -> `PositionRidges.tsx:21` [S] | Each party's members by recorded position, the President as a pin | Panel title | Member count per ridge | Counts above medians; "You" pin; dashed median lines unexplained; the gold band means "the listed part of the scale" (docstring only) | Not verified | Party hue plus 0.45-opacity fills (`:61`) | Press anywhere on the ridge picks a position, no cue | not seen | **fix.** The axis reads "Left / Center / Right" with no subject (left on what: economy?). Name the axis, key the dashed median, solid fills. |
| V18 | `RollChart` term record, `congress/Record.tsx:82` -> `ui/legislature/RollChart.tsx:27` [S] | Yeas up and nays down per roll call, split by party | Panel title | Seat count against chamber size | **No key** inside the chart: gold tick (needed), pale columns (total only), pale-faint nays (`:54,56` opacity .45/.35) | None | Party hue plus opacity | Columns pressable via `SvgPress`, no cue | not seen | **fix.** Horizontal `ScrollView` (`RollChart.tsx:37`) violates "nothing scrolls sideways"; wrap rows or paginate. Add a key and solid nay ink. |
| V19 | `VoteCount` bills, rosters, nominations, `congress/BillCount.tsx:18,73`, `Bills.tsx:36`, `Rosters.tsx:27`, `courts/Nominations.tsx:31` [S] | Vote tally against the needed line | Row names | Votes | One gold tick named in caption (per DESIGN) | Not verified | Not verified | Not verified | not seen | **unverified.** |
| V20 | Meters on rosters and record, `congress/Rosters.tsx:124,153,161`, `Record.tsx:131,168` [S] | Stance, support | Labels | Percent | Not verified | Not verified | Not verified | Not verified | not seen | **unverified.** |

## /washington/courts

| # | Instance | Measures | Title | Unit/period | Key | Help | Color only? | Press | Dark | Verdict and fix |
|---|---|---|---|---|---|---|---|---|---|---|
| V21 | `BenchArc` Supreme Court, `courts/Bench.tsx:19` -> `ui/legislature/BenchArc.tsx:24` [C] | Nine justices ordered by how each has leaned on the economy; 5 votes needed | Panel title "The Supreme Court"; caption "votes to strike down an order"; axis "Left · Lean on the economy · Right" | None | **No key.** Seat fill is `partyDem` blue for left lean and `partyRep` red for right lean (`BenchArc.tsx:38`), tinted by strength (`:39`); the gold ring is the Chief, a dashed hollow is vacant. None of it is explained. Blue/red here means lean, but the same hues mean party on the Congress seating chart and in "picked by Democrats" below | Info icon explains order, not colors | Yes: hue and tint carry lean | Seats pressable (`:41`), no cue | ok | **fix.** Add a key (hue = lean not party, tint = how far, gold ring = Chief, dashed = open). Use a neutral left-right ramp instead of party hues. The center figure "5" is set in the serif face (`BenchArc.tsx:50`); use the sans figure style. |
| V22 | Meter "Your Solicitor General's standing", `Bench.tsx:42` [S] | A three-word assessment (Strained / Mixed / Strong) | Meter label | None | One tick, kind `historical` (gold), whose label is a full sentence (`Bench.tsx:42`) | None | Fill color | No | ok | **fix.** A three-band word is "steps" in DESIGN, not a continuous meter; use `BandSteps`. The tick name is prose; move it to a caption. |
| V23 | `AgreementMatrix`, `Bench.tsx:52` [S] | Share of shared votes where each pair agreed | Panel title and help | "together/shared" per cell | **No scale key.** Cell strength is opacity 0.25 to 1 on the accent (`:77`) | Help explains a cell | Opacity is the only encoding besides the n/N text | Cells not pressable | text is `inverse` on a 25%-opacity cell: low contrast in both themes | **fix.** Horizontal `ScrollRow` at 390. Use a stepped solid ramp with a 3-step key, `tone` that always meets 4.5:1, wrap or stack at phone width, and make cells open the pair. |
| V24 | Party bar "Appeals courts by region", `courts/Docket.tsx:161` [C partial] | Judges per circuit by appointing party | Panel title; help says what color means | Count | Text line "7 picked by Democrats · 4 by Republicans" beside the bar [C] | Help (i) | Party hues | Row link | ok | **fix.** Same blue/red as V21 with a different meaning on the same page. |
| V25 | Meter in `courts/Docket.tsx:33` [S] | Case reading | Not verified | Not verified | Not verified | Not verified | Not verified | Not verified | not seen | **unverified.** |

## /washington/oversight

| # | Instance | Measures | Title | Unit/period | Key | Help | Color only? | Press | Dark | Verdict and fix |
|---|---|---|---|---|---|---|---|---|---|---|
| V26 | Meter "Pressure from Congress", `oversight/Inquiries.tsx:51` [C] | Congress's investigative pressure, 0 to 100% | Meter label; caption under it | Percent; no period | Source has no marks and says so in a caption (`:52`); the capture still shows a 50% tick with no name (older bundle) | Caption "Counts public investigations only" | Red fill | No | ok | **needs re-shoot.** If it is gone, ok. Add what 0%, 50%, 100% would mean ("100% = every member investigating"), since the meter has no scale words. |
| V27 | Three tiny stage bars under "Opened, not yet public / Gathering documents / Reported", `Inquiries.tsx:60` [C] | Each stage's share of open inquiries | Stage names | Share of open, with count above | None | None | Accent fill only | No | ok | **fix.** With 0 open every bar is empty and the figure row says "0" three times; hide the block until there is an inquiry, or draw one stepper (`StagePath`) instead. |
| V28 | Appointments meter, `oversight/Appointments.tsx:28` [S] | Empty jobs | Not verified | Not verified | Not verified | Not verified | Not verified | Not verified | not seen | **unverified.** |

## /nation (overview)

| # | Instance | Measures | Title | Unit/period | Key | Help | Color only? | Press | Dark | Verdict and fix |
|---|---|---|---|---|---|---|---|---|---|---|
| V29 | Meter "Compared with past presidents", `nation/home/ConditionStrip.tsx:83` [C] | Approval against five landmarks | Meter label | Percent | In capture: seven names joined by " · " under the track, not under ticks, ticks in near-identical gold. Source (`scale.ts:97`) trims to gates plus neighbors | None | Tick kind color | Whole tile is a link to Compare, signaled by a chevron beside the figure | ok | **needs re-shoot,** then **fix** if the joined line remains: a joined sentence cannot be matched to ticks. |
| V30 | Meter "Compared with your term so far", `ConditionStrip.tsx:86` [C] | Stability against collapse line, term low, term high | Meter label | Percent | Names "Collapse line · Term low · Term high" in one line under the track [C] | None | Tick colors | Tile link | ok | **fix.** Same as V29. Do not draw a red tick without saying what happens at the red line. |
| V31 | Track "Compared with the 2020s", `ConditionStrip.tsx:93` [C] | National division against the 2020s level | Tile label "How divided the country is" and Track row label "Compared with the 2020s" (twice) | Percent against the era | Caption "The line is the 2020s level" | Caption | Gray fill, strong tick | No | ok | **fix.** The figure "0%" is a difference from the era, not a level; write "0 points from the 2020s". |
| V32 | Track electoral votes, `ConditionStrip.tsx:102` [C] | 412 of 538; line at 270 | Tile label | Electoral votes | Caption "The line is 270, the number that wins" | Caption | Green fill (valence) | Tile link opens the call map | ok | **ok.** Pattern to copy: tick plus a caption that names it. |
| V33 | `MapFrame` approval lens, `nation/home/StageMap.tsx:37` [C top edge only] | Approval by state | Frame title "The states by approval" + lens description "Slate gray means few…gold means many" | Percent | `MapKey` and `PinKey` render below (`StageMap.tsx:48-51`); the outline for selected and chosen states is not in the key | Section description, hint | Sequential ramp, with printed ranked list (`MapList`) | Pressable, hint text | the map is a dark panel in both themes | **fix.** Add "Outline = chosen" and the ramp's end values (low and high percent) to the key. Full map below fold [S]. |
| V34 | Sparklines and tracks in `nation/home/Course.tsx:25`, `Opinion.tsx:48,51,95`, `StatesTable.tsx:31,117`, `Groups.tsx:21,28,105`, `Blocs.tsx:23,60,70`, `Attention.tsx:86`, `StateActs.tsx:41,121`, `BatchActs.tsx:53` [S] | Opinion, groups, states | Not verified | Not verified | Not verified | Not verified | Not verified | Not verified | not seen | **unverified.** Each `Diverging` bar draws center-zero with no scale words (`Track.tsx:91`). |

## /nation/economy

| # | Instance | Measures | Title | Unit/period | Key | Help | Color only? | Press | Dark | Verdict and fix |
|---|---|---|---|---|---|---|---|---|---|---|
| V35 | Three radio cards Unemployment / Inflation / Growth, `nation/economy/Rates.tsx:221` [C] | Rate now and change since taking office | Panel "Key numbers" | Percent; "when you took office" | Text only | None | Sign arrow plus color | Cards are radios, selected has a blue border | ok | **ok,** with one fix: "Fair" under Unemployment is a band word with no meaning. |
| V36 | Three-row table This week / When you took office / Normal level, `Rates.tsx:247-249` [C] | The same figure three ways | None | Percent | Notes beside each | None | No | No | ok | **fix.** At week 31 all three rows read 4.0%, a table with no information. Fold into one line ("4.0% now, 4.0% at the oath, 4.0% normal (BLS 2024)") and draw the three as marks on one Track. |
| V37 | `BenchmarkChart` rates and peers, `Rates.tsx:60,102,122`; compare, `Rates.tsx:266` [S] | Rate over time against the real record | Chart title | Percent, monthly or quarterly (badge, `Rates.tsx:51`) | Series keyed; a "Normal level" benchmark is `historical` kind (`Rates.tsx:131`) | Table toggle | Dash plus color | No | not seen | **unverified.** Normal level is a rest value, closer to a target than a landmark. |
| V38 | Markets: `ShareBar` `Markets.tsx:62`, `Track` `:68`, `Diverging` `:143`, `BenchmarkChart` `:34,184,201` [S] | Commodity price, equity index, spreads | Chart titles | Index points, "starting at 100 when you took office" (`:201`) | Crash line `danger` kind with label sentence | Not verified | Not verified | Rows open sheets | not seen | **unverified.** |
| V39 | `Sparkline` and `TrackRow` in `economy/Panels.tsx:54,103,104` [S] | Not verified | Not verified | Not verified | Not verified | Not verified | Not verified | Not verified | not seen | **unverified.** |

## /nation/budget

| # | Instance | Measures | Title | Unit/period | Key | Help | Color only? | Press | Dark | Verdict and fix |
|---|---|---|---|---|---|---|---|---|---|---|
| V40 | `TrackRow` "Weeks of funding left", `nation/budget/BudgetScreen.tsx:30` [C] | Weeks left of 52; a tick at 8 | Row name | Weeks of 52 | The tick is named only in prose: "below the dark tick at 8 weeks" (`:32`). The mark carries a label that is never drawn (`Track.tsx:63-65` prints no text) | The sentence | Red fill plus badge "Money running out" | No | ok | **fix.** Draw "8 weeks: a shutdown is close" under the tick; drop "the dark tick". |
| V41 | `FigureBand` four tiles, `BudgetScreen.tsx:34-42` [C] | Authority held, added, promised, net per week | Band label "Budget authority (money you can spend)" | Dollars, per week | Text notes | Caption below | Green for net | No | ok | **fix.** "$0M" beside "$27.94B" mixes units; "Limit $363.24B" equals "Available now $363.24B" so one tile is redundant at the cap. |
| V42 | `BenchmarkChart` debt vs output, `budget/Books.tsx:80` [S] | Debt as a share of a year's output over 10 years "if nothing changes" | Long chart title states measure and period | Ratio, years | Danger line "Debt equal to a full year's output" | Table toggle | Dot dash plus red | No | not seen | **ok on paper.** The title is a 21-word sentence; shorten it, move "if nothing changes" to a caption. Forecast vs history are not visually distinct. |
| V43 | `TrackRow`s in Weekly flow and debt limit, `Books.tsx:88,125,132`; `Draft.tsx:24-83`; `Allocation.tsx:51,79` [S] | Weekly flows, draft shares | Row names | Dollars | None drawn | Notes beneath | Good/bad ink only | Inputs on Draft | not seen | **unverified.** |

## /nation/policy

| # | Instance | Measures | Title | Unit/period | Key | Help | Color only? | Press | Dark | Verdict and fix |
|---|---|---|---|---|---|---|---|---|---|---|
| V44 | Slim `Track` on each area card, `nation/policy/PolicyScreen.tsx:48` [C] | How well the chair carries the policy out | None; figure "+33%" with no label | Percent of plan | **No.** A center tick "Everything as planned" has a label that is not drawn; "+33%" means? | aria-label only | Green fill | Card is a button (selected state is a blue ring) | ok | **fix.** Label the figure ("Carried out: 33% above baseline?"), or show a word ("On plan"). Name the tick once above the list. |
| V45 | `TrackRow` "How well it's carried out", `PolicyScreen.tsx:139` [S] | Same | Row name | Percent | Caption says "The dark tick" (`:141`) | None | Tone | No | not seen | **fix.** Same as V40. |
| V46 | `Track` "Where it matters most", `PolicyScreen.tsx:114` [S] | States ranked by industry share | Panel note says what it shows | Percent | **Bar is scaled to the leading state** (`entry.share / top`, `:114`) while the figure is the raw share, so the top state's bar is full at, say, 14% | Panel note | Accent | Whole row opens the state | not seen | **fix.** Scale every bar to a fixed maximum or print the scale ("longest bar = Texas, 14%"). |
| V47 | Order pipeline `ShareBar`, `OrderPipeline.tsx:45`; `OrderRecord.tsx:33,61`; `OrderScreen.tsx:87` [S] | Pipeline stages, effect size | Not verified | Not verified | Not verified | Not verified | Not verified | Not verified | not seen | **unverified.** |

## /nation/emergency

| # | Instance | Measures | Title | Unit/period | Key | Help | Color only? | Press | Dark | Verdict and fix |
|---|---|---|---|---|---|---|---|---|---|---|
| V48 | Slim `Track` "Severity" on each incident, `nation/emergency/EmergencyScreen.tsx:59` [C] | Incident severity 43% | Label "Severity" | Percent of an unstated scale | None; the bands behind the fill color (`VALENCE_TRACK`) are not shown | Row note below the Response panel (`row.severity.note`) | Brown fill (light) / amber (dark) plus the number | Row radio, blue ring | ok | **fix.** Add cut lines (`Track` has a `cuts` prop, `Track.tsx:27`) at the band edges and name them (Minor, Serious, Severe). |
| V49 | `MapFrame` "Problems at home by state", `emergency/EmergencyMap.tsx:27` [C top edge] | Each state's most serious problem | Frame title plus description "Each state's color shows its most serious ongoing problem. Gold marks a declared emergency." | Severity | `MapKey` plus `PinKey` below (`:41-42`) | Hint "Pick a state with a problem" | Fill color plus pins | Pressable | the map is dark on dark in dark theme, ocean and land close | **ok,** minor: the selected-state outline is not in the key. |
| V50 | `TrackRow` "Until it ends", `EmergencyScreen.tsx:120` [S] | Weeks to lapse of 52 | Row name | Weeks | Caption | Caption | Tone | No | not seen | **ok.** |

## /world

| # | Instance | Measures | Title | Unit/period | Key | Help | Color only? | Press | Dark | Verdict and fix |
|---|---|---|---|---|---|---|---|---|---|---|
| V51 | Six summary tiles, `ui/world/Panel.tsx:76` via `world/overview` [C] | Wars, world view, treaties, in-progress, trade partners, intelligence coverage | Tile label, **truncated** with an ellipsis in three tiles ("How the world se…", "Countries we can…"; `Panel.tsx:95` `numberOfLines={1}`) | Counts; no period | **Top border color (3px, `Panel.tsx:88-89`) is the only marker of valence and is explained nowhere**: brown, green, slate across the six tiles | None | Yes for the top border | Whole tile is a link, chevron at right | ok | **fix.** Remove top-border color or give each tile a word chip. Let the label wrap to two lines; stop clipping captions at three lines (`:112`) where the clipped half is the point ("0 alliances in force, 0 waiting on the Senate, 72 countries side with you or lean your…"). |
| V52 | `Segments` bar in "How the world sees us" and "Countries we can read", `Readings.tsx:75` (`keyed` false) [C] | 99 countries split trust / neutral / wary / hostile / unread; and read vs unread | Tile label | Count of countries | **No key in the tile.** The same colors are explained by group headers further down ("Trusts you 31") with squares [C]; the tile bar is not tied to them | Caption "31 trust you and 0 are hostile…" | Yes | Tile link | ok | **fix.** Pass `keyed` here. "Neutral" as the big word above a bar that is mostly slate reads like a status; show "99 of 195 read" first. |
| V53 | Wars rows with `ShareBar` "Fighting … Simmering", `world/overview/Sections.tsx:33-41` [C] | War intensity | Fixed word "Fighting" at the left (the name of the metric) | None | The right word "Simmering" is the value, so the row reads "Fighting [bar] Simmering", as if the bar ran from one state to the other | None | Brown (watch) or red (bad) fill | Row link | ok | **fix.** Label "How hot", value at right, and mark the three levels on the track (Simmering, Fighting, Heavy). |
| V54 | "The world" lens: group headers with swatch and flag chips (Trusts you 31, Neutral 65, Wary 3…), `world/overview/MapPanel.tsx` [C] | Each government's view of the US | Panel "The world" plus lens control and one-line description | Count | Yes: swatch, name, count, flags | Description sentence | No (names listed) | Flag chips are doors | ok | **ok.** Best key on the screen. The 14px swatch is small next to 22px flags. |
| V55 | `StandingPanel` `CompareChart`, `world/overview/StandingPanel.tsx:78`; `GovernmentsTable` `ShareBar`/`Sparkline`, `GovernmentsTable.tsx:25,44`; world map below the fold [S] | Standing over the term; per-country trust | Not verified | Not verified | Not verified | Not verified | Not verified | Not verified | not seen | **unverified.** |

## /world/security

| # | Instance | Measures | Title | Unit/period | Key | Help | Color only? | Press | Dark | Verdict and fix |
|---|---|---|---|---|---|---|---|---|---|---|
| V56 | Five tiles each with a full-width bar, `security/Overview.tsx:24-27` [C] | Commands on alert, forces ready, operations, intelligence, war powers | Tile label | "of 11", percent, "operations" | The **bar is full green at "0 of 11 on high alert"**, full green at 100% ready, full slate at "0 of 1 item": three different meanings of "full" with no scale. Under a 0 figure a full bar reads as an error | Caption text | Yes | Tile link | ok | **fix.** Draw alert as a count against 11 (empty at 0), readiness as the 100% fill, and remove the bar from tiles whose figure is a plain count. |
| V57 | `CompareChart` "Military readiness over your term", `Overview.tsx:60` -> `BenchmarkChart` [C top] | Readiness by week against its record | Chart title | Percent, weeks | One series; label "This presidency 72" lacks the % (capture) and is drawn in a **serif face** (`security-1440x900-light-part1.png`, bottom) | Table toggle | Blue line | No | ok | **fix.** SVG labels use the `SourceSans3_*` face names (`BenchmarkChart.tsx:55-56`) and fall back to the browser serif; load the sans family for SVG text or set a CSS fallback stack. |
| V58 | Command tiles with a top border by posture, `Overview.tsx:119` [S] | Alert level per command | Tile name | Posture word | The posture word sits in the tile; border color repeats it | Not verified | Border color plus word | Tile link | not seen | **ok.** Same top-border device as V51 but backed by a word here. |
| V59 | `StatuteClock`, `Overview.tsx:90`; `WarPowers.tsx:119,120`; `ui/world/Clock.tsx:15` [S] | Days left of a 60-day clock | Row label states it | Days of window | Words "N of M days left" | Label | Valence plus words | Row link | not seen | **ok.** |
| V60 | `Meter` in `security/Intel.tsx:161`, `ShareBar` charge rows `Overview.tsx:66` [S] | Intel reading; weekly cost per command | Labels | Points per week | Not verified | Not verified | Not verified | Row link | not seen | **unverified.** |

## /record

| # | Instance | Measures | Title | Unit/period | Key | Help | Color only? | Press | Dark | Verdict and fix |
|---|---|---|---|---|---|---|---|---|---|---|
| V61 | `WeekColumns` "Your term, month by month", `record/RecordWorkspace.tsx:59` -> `ui/news/WeekColumns.tsx:82` [C] | Record entries per month, you vs the world | Title names period; **does not say it counts entries** | Axis 0 / 135 / 270 with no unit; month labels | `SegmentLegend` "You 0 · The world 1521" [C] | None | Gold vs blue plus counts | Columns have `onSelect` unset here, so none is pressable (`role="img"`) | ok (blue lightens) | **fix.** Title "Record entries each month". Say the gold outline marks the current month. "You 0" with a gold swatch next to 1521 blue reads as a wasted series; hide when zero or explain ("You: no entries yet"). Columns look like buttons: add a hover outline or press to filter the list to that month. |
| V62 | `BenchmarkChart` term approval and polarization, `record/RecordSections.tsx:125,148`; Meters `:60,147` [S] | Term trend vs landmarks | Chart titles | Percent, weeks | Series plus benchmarks | Table toggle | Dash and color | No | not seen | **unverified.** |
| V63 | `StageTrack`, `CausalChain`, `MoveTable` on event detail, `record/RecordDetail.tsx:50`, `ui/record/Evidence.tsx` [S] | What an action caused | Section names | Points | Not verified | Not verified | Not verified | Chain links | not seen | **unverified.** |

## /compare

| # | Instance | Measures | Title | Unit/period | Key | Help | Color only? | Press | Dark | Verdict and fix |
|---|---|---|---|---|---|---|---|---|---|---|
| V64 | `CompareChart` -> `BenchmarkChart`, `compare/CompareWorkspace.tsx:188` -> `CompareChart.tsx:55` [C 1440 and 390, light and dark] | Approval over 26 weeks against six landmarks | Panel "Approval over 26 weeks", **then a second title "Approval" inside the chart** | Percent; weeks on x | In capture: dashed gold lines with in-plot bold serif names, "Typical honeymoon" printed over the series line and over "Modern ceiling", the president's label cut to "This pres… 60%" at 390, and a six-entry legend that keys the benchmarks as if they were series (`compare-1440x900-light-part1.png`, `compare-390x844-light-part1.png`) | "Table" toggle; unit line under chart | Dash plus gold | None | gold labels pass | **needs re-shoot, then fix.** HEAD's code (`BenchmarkChart.tsx:46-71,249-365`) already does the end-column design, so the capture is probably stale. If a re-shoot still shows it: labels are in a serif face (see V57), collide, and truncate. Also drop the duplicate "Approval" title. |
| V65 | Verdict list "How your approval compares", `compare/CompareWorkspace.tsx` [C] | Each landmark vs now | Panel title | Points and percent | Chips Better / Worse / Same / "No difference" | None | Chip color plus word | Rows not pressable | ok | **fix (small).** "At the oath: No difference" (outlined chip) and "Four weeks ago: Same" (filled chip) say the same thing two ways. |
| V66 | Subject chip "You" floating above the chart [C] | Which lines are drawn | None | None | n/a | None | n/a | Looks like a chip button | ok | **fix.** It is an orphan: a one-chip row between the control card and the chart. Make it the chart's own key row ("Lines: You, + Add a subject"). |
| V67 | `CompareMatrix`, `CompareWorkspace.tsx:55`; `world/nation/Compare.tsx:49` [S] | Many subjects by many metrics | Caption | Per metric | Not verified | Not verified | Not verified | Sort by header | not seen | **unverified.** |

## /handbook, /handbook/terms, /settings, /administrations, /legacy, /more

| # | Instance | Verdict |
|---|---|---|
| V68 | Settings color-vision cards, three dots per choice (`settings` [C]) | **ok.** Each swatch set is named and explained in words. |
| V69 | Handbook explainers' drawings, `ui/handbook/ExplainerParts.tsx` [S] | **unverified.** |
| V70 | Legacy `BenchmarkChart` and `TermLine`, `ending/Legacy.tsx:65,82`; `ending/Ending.tsx:30,63,76,97` [S] | **unverified.** At week 31 `/legacy` shows only "Your presidency is still going" [C], no chart. |

## Dynamic-route instances found in source, not captured

All **[S]**; each needs a capture before a verdict.

| # | Instance (file:line) | Route | Note from reading the component |
|---|---|---|---|
| D1 | `FanChart`, `decision/projection/ProjectionParts.tsx:134` -> `ui/review/FanChart.tsx:43` | decision | Bands drawn at 0.08 and 0.18 opacity (a band, so allowed); axis text 10px (`FanChart.tsx:69`) vs 11px in `BenchmarkChart`; the dashed baseline is keyed only by the list beside it. |
| D2 | `TieMap`, `dossier/PersonNetwork.tsx:102`; `CareerBands`, `dossier/PersonRecord.tsx:118`; `BandSteps`, `dossier/PersonReadings.tsx:53,79` | person | Not verified. |
| D3 | `ShareBar`, `world/war/WarScreen.tsx:79,118`; `Segments`, `world/sets/OrgScreen.tsx`; `StepReading`, `world/sets/TreatyScreen.tsx`, `world/nation/Diplomacy.tsx`, `Views.tsx`; `PairedBars` + `PairedKey`, `world/nation/Economy.tsx` | war, org, treaty, country | `PairedBars` buy/sell is explained by `PairedKey` (`ui/world/Clock.tsx:49`). |
| D4 | `StagePath`, `congress/BillScreen.tsx:25`, `courts/CaseParts.tsx:34` | bill, case | Not verified. |
| D5 | Tracks on state dossiers, `nation/state/StateScreen.tsx:53`, `Overview.tsx:45,103`, `Demographics.tsx:36`, `People.tsx:91,100`, `StateViews.tsx:61-92,190`, `LocaleDesk.tsx:60-61` | state | Not verified. |
| D6 | `Meter` on decisions and receipts, `decision/parts.tsx:55`, `DecisionReceipt.tsx:13`, `ClockScreen.tsx:20`, `ScandalScreen.tsx:18`, `world/act/readings.tsx:127`, `ActReceipt.tsx:21`, `nation/ActDone.tsx:20` | decision, act, clock | Receipts reuse the Meter for before/after; check that the before tick is named. |
| D7 | `Sparkline` + `BenchmarkChart`, `world/nation/Head.tsx:89,115` | country | Not verified. |

---

## The 15 worst, ranked

Rank weights: how much a reader is left guessing, how many screens share the defect, how far the mark is from the owner's reference-line direction.

1. **V64 / V57 Compare and readiness charts.** Labels in a serif fallback face, drawn over the data and each other, president's label truncated at 390, benchmarks keyed as series. Fix the SVG font once in `BenchmarkChart.tsx:55-56` (and `BenchArc.tsx:44-53`, `FanChart.tsx:69`); re-shoot to see whether the end-column layout already ships. Touches every chart.
2. **V29 / V30 / V2 Nation and Brief meters with up to seven near-identical gold ticks** and a joined name line that cannot be matched to ticks. Enforce the `nearestMarks` cut and the stacked-name layout, then the ranked-list fallback.
3. **V21 Supreme Court `BenchArc`.** No key; party hues reused for lean; serif center figure. Blue/red means lean here, party two inches away.
4. **V23 `AgreementMatrix`.** Opacity heat map with no scale, low-contrast text on faint cells, sideways scroll at phone width.
5. **V51 / V52 World summary tiles.** Unexplained top-border colors, truncated labels and captions, unkeyed segmented bars.
6. **V4 Calendar `TermTimeline` at 390.** Five identical blue ticks with no labels on them; gold fill and gray/blue ticks unexplained; marks look pressable and are not.
7. **V14 Congress "Even 59%" meters.** The word contradicts the tick; the band ladder is never shown; the tick exists on one of three meters.
8. **V6 / V9 Executive delivery ticks and four unlabeled trait dots** on every office card.
9. **V12 / V11 Press tone bar with no key** and a parity tick typed as a historical landmark; the 39% printed twice.
10. **V44 / V46 Policy area bars.** An unnamed center tick, an unlabeled "+33%", and a "where it matters most" bar scaled to the leader instead of to the figure.
11. **V56 Security tiles.** A full green bar under "0 of 11 on high alert" and under "0 of 1 item".
12. **V61 Record activity columns.** Title omits what is counted; axis has no unit; looks pressable, is not.
13. **V40 Budget funding tick** named only as "the dark tick" in a sentence.
14. **V53 Wars rows "Fighting [bar] Simmering".** The metric's name reads like one end of the scale.
15. **V17 / V18 Position ridges and roll-call chart.** Translucent fills, unnamed axes, sideways scroll, no key for the gold tick and the pale columns.

Close behind: V48 emergency severity bar with no band cuts; V1 sparklines with no window and a figure that overlaps its line; V36 the three-identical-rows economy table.
