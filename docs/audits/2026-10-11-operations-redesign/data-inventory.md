# Data size and presentation inventory

> **Current takeover rule — 2026-10-12:** This is historical evidence, not current visual acceptance. The owner requires application-wide visual-first layers, consistent help, target-only expansion, selectable themes and presidential review/processing. The current contract is `docs/audits/2026-10-11-simulation-depth/PROGRAM.md`, “Application-wide visual layers and presidential interaction,” and its handoff/BL-136/137. Light-only styling, previous polish claims, mandatory tool/agent assignments and bulk-first validation instructions here do not override that contract. Build with short local checks and batch expensive final validation; keep all work local with no additional cost. Historical counts/screenshots must be rechecked before use as current evidence.


Date: 2026-10-10. Scope: BRIEF.txt section 11. Read-only measurement on branch `feat/map-first` with uncommitted work in the tree. No build, typecheck, lint or render was run, so "presentation" below is read from source, not observed in a browser.

## How the counts were measured

Counts come from saves the repo's own fixture builders produce, plus the shipped world dataset. Three campaign sizes:

| Label | Save | Turn / date | Size on disk |
|---|---|---|---|
| min | `opening` | turn 1, 2029-01-20 | 9.7 MB |
| typical | `week-30` and `long-war` | turn 31 / 53 | 10.8 MB / 11.9 MB |
| large | `term-end` | turn 407, 2036-11-04 (about 8 years) | 29.3 MB |

Caveat: these are scripted fixtures, and `term-end` is advanced by a scripted policy, not a person. Counts that depend on what a President chooses to do (executive orders, treaties, nominations, court cases) are probably low in them. Those cells are marked "fixture-low".

Commands (scratch scripts live in `<scratch path>`, abbreviated `$S`):

| ID | Command | What it gave |
|---|---|---|
| M1 | `node scripts/make-fixture-saves.mjs --only opening,week-12,week-30,long-war,term-end --out $S/saves` | The five saves above (output reports turn, date, MB) |
| M2 | `node $S/shape.mjs` | Top-level `campaign.*` key counts for opening, week-30, long-war, term-end |
| M3 | `node $S/paths.mjs` then `grep` on `$S/paths.tsv` | Min and max nested array/record sizes across 56 saves (the 5 above plus the 51 in `apps/web/tests/.fixtures`) |
| M4 | `node $S/q.mjs` | Treaties, cases, nominations, bills, orders, conflicts, conditions across all `apps/web/tests/.fixtures/*.json` |
| M5 | `node $S/w.mjs`, `node $S/f.mjs`, `node $S/f2.mjs`, `node $S/f3.mjs` | World dataset counts via `packages/world/dist/index.js` (nations, cities, states, districts, organizations, force catalog, order of battle, basing) |
| M6 | `node $S/sel.mjs <fixtures>` (loads `loadSave` from engine dist, runs player-core selectors with an extensionless-import resolve hook copied from `scripts/make-fixture-saves.mjs:38`) | What each screen's reading actually returns: `briefMatters`, `runningClocks`, `worldRows`, `worldWatchlist`, `hillPosts`, `committeeReadings`, `benchReading`, `courtDocket`, `executiveTree`, `recordRows`, `stateRows`, `commodityBoard`, `inspectorsBoard` |
| M7 | `node $S/ov.mjs`, `ov2.mjs`, `ov3.mjs` | Fidelity tiers, unread-government counts, trade-partner rows, legislative proposals, security assessments, condition and feed sizes |
| M8 | `node $S/people.mjs`, `node $S/pool.mjs` | People by role; appointable and nominable pool sizes |
| M9 | `node $S/cat.mjs` | Engine catalog sizes (`BUDGET_ACCOUNTS`, `POLICY_DOMAINS`, `OFFICE_IDS`, `INSTITUTION_IDS`, `COMMITTEE_IDS`, `COMMODITY_IDS`, `TRADE_SECTOR_IDS` and others) |
| M10 | inline `node -e` over `packages/player-core/src/content/bundled-corpus.generated.ts` (parse the 18 JSONL shards, count records with `replies`) | Scenario count and reply counts |

## The table

"Count" is min / typical / large. "Presentation" names the pattern. "TR" is truncation risk: **High** means a collection is cut with no full-set path from that screen, **Med** means a full path exists but the count of what is hidden is not shown, **Low** means paged or filtered with a visible total, **None** means the whole set is rendered.

| Class | Source | Count (min / typical / large) | Growth | Presentation | File:line | TR |
|---|---|---|---|---|---|---|
| People | `packages/world` pool seeds `campaign.people` (`PersonRuntime`) | 6,885 / 6,884 / 6,888 (M2). Roles: 52 PMs, 44 presidents, 5 junta chairs, 50 governors, 40 agency heads, 28 committee chairs, 9 judges, 17 cabinet seats, 231 unseated US people (M8) | Flat; roles change, count does not | Never listed as a set. Reached through offices, cards and doors. Person file with counsel, circle, relationship map | `apps/web/src/washington/person/PersonScreen.tsx:260` (counsel `slice(0, 6)`), `PersonVisuals.tsx:72,80` (ties `slice(0, 8)`) | **High** (counsel, circle). No people index and shell search does not index people (`apps/web/src/shell/search-index.ts:61-72`) |
| Offices | `OFFICE_IDS` 87; `INSTITUTION_IDS` 76 (M9) | 87 offices / 76 institutions, all runs. Tree nodes: 3, 2, 15 (+29 agencies), 1 (+3), 10 (M6) | Flat | Section-by-section card tree, agencies in collapsed `<details>`, "only chairs that need you" toggle | `apps/web/src/washington/executive/ExecutiveTree.tsx:134-146`; `routes/washington.index.tsx:61` | Low. Face stack `slice(0, 4)` plus `+N` at `ExecutiveTree.tsx:91,102` shows a count but no list |
| Departments / institutions | `campaign.institutions` (`InstitutionRuntime`, 14 fields) | 76 / 76 / 76 (M2) | Flat; fields drift | Cards in tree; office screen with agencies list and commands | `OfficeScreen.tsx:91-120` | None |
| Legislators | `campaign.congress` (chambers hold only `seats/administration/opposition/independent`), `states[].delegation` (house counts by party, senate `[{party, seatClass, disposition}]`), `congress.leadership` 7, `congress.committees` 13 | 535 seats, but **no individual rank-and-file records**. Named: 7 leaders, 13 chairs, 13 ranking members (M3, M2) | Flat (recomposed at elections) | Hemicycle plus chamber facts; leader cards; committee ledger; per-state delegation dropdown | `washington/congress/Chambers.tsx:14-24`; `Hill.tsx:50` (7 post cards), `Hill.tsx:69-86` (13 committees); `Notices.tsx:73-100` (`Delegation`, one state at a time via `STATE_IDS.map` at line 85) | Med. Committee chairs and ranking members render as plain text, not doors (`Hill.tsx:75`, `hill-reading.ts:162-170` returns a name string) |
| Nominations | `campaign.nominations` (11 fields, `history`) | 0 / 0 / 0 in M2 saves; max 33 in `reelection-night` (M4). Cabinet appointable pool 7 per secretary, 14 agency head, 227 for a deputy office (M8) | Appends per vacancy; fixture-low | Priced comparison of a shortlist against "leave it open" | `packages/player-core/src/cabinet/shortlist.ts:42,49` (`SHORTLIST_SIZE = 4`); `judiciary/judicial-nominations.ts:33,89` (3); `washington/courts/Nominations.tsx:149,171-177` | **High**. Pool of 7 to 227 shown as 3 or 4, no "see all candidates" path (M8) |
| Court seats / judges | `people` role `role-judicial-seat` | 9 / 9 / 9 (M6 bench 9) | Flat | Ordered bench of seats left to right, judge file with vote table | `washington/courts/Bench.tsx:81-90`; `JudgeFile.tsx:35-45` | None |
| Court cases | `campaign.judiciary.cases` (small), `campaign.cases` (presidential cases) | 0 / 0-1 / 1 (M4: max 1 docket pending, 1 ruled; fixture-low) | Appends per challenged order or act | Two-column cards for pending, list for rulings, paper case screen with timeline and votes | `washington/courts/Docket.tsx:69-79`; `CaseScreen.tsx:44,63,99` | None now; no filter or paging when it grows |
| States | `worldDataset.states` (`StateRuntime`: lean, population, marks, claims, delegation, governor) | 51 / 51 / 51 (M5, M2). 50 governors; DC has none (M8) | Flat; marks and claims append | Strip of 51 dots sized by electoral votes, coded by a lens; each dot a door. No table | `nation/state/NationHome.tsx:59-90,152` | Med. No sortable or filterable list, no count of dots hidden by overlap at 320px. Not measured in a browser |
| Districts | `worldDataset.districts` (id, state, number, population, lean, incumbentParty) | 436 total; 1 to 52 per state (M5) | Flat | Ordered list per state dossier, each a door | `nation/state/Politics.tsx:64-68` | None. Seat holders are party-level only; no named member exists in data |
| Countries (nations) | `campaign.nations` (`base`, live `stats`, `traits`); dataset fidelity full 61, standard 59, thin 76 (M7) | 196 / 196 / 196 (195 foreign rows). Unread by the services: 56 / 79 / n/a (M7) | Flat; stats drift | Searchable, region-filtered, lens-ranked list, 24 per page with "Show N more", count line | `world/nation/WorldHome.tsx:178-208` (`PAGE_SIZE = 24`, count at `:173`, `:201`) | Low. Filter state lives in the address (`routes/world.index.tsx:13`) |
| Cities | `worldDataset.cities` | 538 (max 200 per nation) (M5) | Flat | Map layer and state metros list | `player-core/src/world/state-dossier.ts:130` (`stateMetros` limit 6) | Med. Metros limited to 6 per state, no full gazetteer |
| Organizations | `worldDataset.organizations` (15: 6 defense, 4 economic, 5 political), members up to 54 | 15 / 15 / 15 (M5) | Flat; membership changes | Org screen: member list, alignment ring, calls, commitments | `world/org/OrgScreen.tsx:62,129` | None |
| Commodities | `COMMODITY_IDS` 11 in 6 families; `campaign.markets.commodities` | 11 / 11 / 11 (M6, M9); some fixtures omit markets | Price series appended (window 104, `state-world.ts:67`) | Family groups of rows with series | `nation/economy/Markets.tsx:84-90` | None |
| Sectors | `SECTOR_IDS` 23; per-nation `sectors` 7-15; `TRADE_SECTOR_IDS` 28 | 7-15 per nation (M5, M9) | Flat | Top-5 sector table in US trade, state industry axes | `player-core/src/world/trade-partners.ts:80,134`; `world/nation/CountryEconomy.tsx:62-82`; `nation/state/Economy.tsx:49` | **High** for trade sectors: 5 of up to 28 edges, no full table |
| Bilateral relations | `campaign.relationships` directed dyads (trust, alignment, tension, tradeDependence, militaryThreat, treaties, grudges, history) | 8,547 / 8,547 / 8,547 dyads; USA outbound 195; out-degree 12 to 195 (M3 and a node check). History per dyad grows to 60; 491 dyads have history at term end | History appends, capped about 60 | Never listed. Seen as band words per country, "ties" 3 allies and 3 rivals, 8 map arcs, US-side tension top-10 panel | `player-core/src/world/nation-file.ts:82-107` (`TIES_PER_SIDE = 3`, `ARCS_SHOWN = 8`); `world/board-panels.ts:84` (`slice(0, 10)`); `world/standing.ts` | **High** for ties and arcs (no list of all ties); US-to-all is covered by the 195-row directory |
| Trade partners | `nation.stats.trade.tradeDependence` (12 to 78 per nation) | 12 / n/a / 78 per nation (M5) | Flat | Ranked list under the country file | `trade-partners.ts:81,106`; `CountryEconomy.tsx:86-96` | **High**. 6 shown of up to 78, no table of all partners, no import/export split per partner |
| Forces: asset types | `FORCE_ASSETS` 46 in 6 count nouns (formations 19+1, units 8, platforms 14) (M5) | 46 catalog entries | Flat | Labels only | `packages/world/src/schemas/force-asset.ts` | n/a |
| Forces: order of battle | `nation.stats.military.orderOfBattle`, only USA, CHN, RUS, NLD (M5); runtime benches via `selectForceBench` | USA 18 counted holdings; CHN, RUS, NLD present in data but 0 counted (not read) (M7) | Fielded and committed counts change weekly | Bands (`Steps`) per domain, then a 3-column table, then a US-presence list | `world/nation/CountryForces.tsx:18-57`; `player-core/src/world/nation-forces.ts:106-130` | Med. Table shows Fielded and Free only; Committed and below-readiness are computed (`nation-forces.ts:41-48`) and not shown |
| Forces: US basing | `US_BASING` 49 rows, `FEDERAL_SITES` 76, `US_MUNITIONS` 5 classes, munitions index 0 to 18 (M5, M3) | 49 | Flat | Presence list per host, map force marks | `CountryForces.tsx:60-69`; `world/war/WarScreen.tsx:189` | Low |
| Combatant commands | `COMBATANT_COMMANDS` 11 (7 geographic, 4 functional) (M9) | 11 | Flat | Cards, zone rows, assignment meters | `world/security/Desk.tsx:70-76`; `CommandScreen.tsx:55,89` | None |
| Operations / wars | `campaign.conflicts` (beats), `operators` (insurgencies), `pursuits` | Conflicts 0 / 2 / 6 (active 1-3). Operators 5 / 12 / 12. Pursuits 0 / 14 / 94 (26 active) (M2, M3) | Appends; conflicts keep closed ones | Watchlist rows, war screen with parties and last 8 beats | `world/nation/WorldHome.tsx:97-114`; `world/war/WarScreen.tsx:169` (`slice(0, 8)`, beats observed 3-4 so not yet binding) | Med. Beats cut to 8 with no full path; `MAX_REASONS = 2` at `WarScreen.tsx:15,37` |
| Treaties | `campaign.treaties` | 0 / 0 / 0 in M2; 1 in `treaty-pending` (M4; fixture-low) | Appends | Treaty screen, parties list | `world/treaty/TreatyScreen.tsx:33` | None |
| Policy proposals | Legislative proposals via `transmitComparison` (M7) | 10 / 13 / 19 | Grows ~ +1 per 10 weeks in term-end | Topic filter, count line, 4 per page "Show N more proposals" | `washington/congress/LegislativeAgenda.tsx:17,24,30,47,50,63` | Low |
| Policies (portfolio) | `POLICY_DOMAINS` 6, `POLICY_STANCES` 24 (M9) | 6 domains | Flat | List with pledges | `nation/policy/PolicyScreen.tsx:22-65` | None |
| Executive orders | `campaign.orders` (`ExecutiveOrderRecord`, `review`), `pendingRules` | 0 / 0-2 / 2 in M4 (fixture-low) | Appends per order | Order pipeline stages, order screen | `nation/policy/OrderPipeline.tsx:29-37`; `OrderScreen.tsx:98` | None now; no filter or paging as the record grows |
| Bills | `campaign.bills` (12 to 13 fields, `beats`) | 0 / 1-4 / 69 (all `law` at term end) (M2, M3) | Appends about 8 per year | Floor schedule stages for live bills; **3** "lately settled" | `washington/congress/FloorBusiness.tsx:42` (`settledBills(campaign, 3)`); `floor-schedule.ts:160-170` | **High**. 66 of 69 bills at term end are reachable only by deep link |
| Events / scenarios | Bundled corpus (18 JSONL shards): 322 scenarios, 3-4 replies each (M10); 109 core consequences; 84 resolution sequences (M9) | One decision at a time: 3-4 reply options | Dealt, not listed | Option cards in decision screen | `decision/Situation.tsx:40,109,209`; `decision/Decision.tsx` | None |
| Stories / press | `campaign.feed`, `feedDigest`, `press.engagements`, 24 news orgs | Feed 0 / 365 / 4,892; digest 0 / 149 / 2,906; engagements 0 (M2) | Appends; feed capped 12 per week (`engine/src/feed-cap.ts`) | Digest: 6 lead stories then `<details>` fold with the rest; coverage history `slice(0, 6)` | `routes/brief.digest.tsx:14,28-34`; `washington/press/Podium.tsx:40`; `player-core/src/reasons/recent-moves.ts:23` (country "recent moves" 3) | **High** for Podium outings and country moves (no full path). Digest is a good pattern |
| Obligations / clocks | `summons/registry` clocks, `campaign` due dates | 15 clocks; 3 / 3 / 1 with a due date; max 5 (M6) | Flat registry | Brief: "near" list, "later" in a fold; clocks without a due date do not appear | `brief/Sections.tsx:72-100` (`running.filter(due !== undefined)`); `routes/brief.clock.$id.tsx` | Med. 10 to 14 of 15 clocks have no entry on the Brief |
| Desk matters | `briefMatters` | 1 / 2-3 / up to 7 (M6) | Per-week | Lead card plus row list | `routes/brief.index.tsx:52,92-104` | None |
| Record entries | `ledger` (all actions) and `recordRows` (those with a causal id) | 1 / 1,438 (week 30) / 30,582 (term end); raw ledger 34,626 (M2, M6) | About 3,800 rows per year at term-end pace | Reverse-chronological timeline grouped by day, filter by actor, 40 per page | `routes/record.index.tsx:22,128,138-143`; `record-entry.ts:156-161` | Low-Med. The "older entries" button names the next page size, not the total remaining. Total appears only in an `aria-label` (`:106`). 4,044 ledger rows have no causal id and are not in the Record |
| Security assessments | `security.assessments` (14 fields) | 0 / 7 / 126 (M2) | About 16 per year | Full list of judgment cards, no filter | `world/security/Ledgers.tsx:160-180`, `SecurityScreen.tsx:99` | None, but 126 stacked cards with no filter or paging is a density problem |
| Oversight | `oversight.inspectors` 27, `matters` 0 to 11 (M3) | 27 inspectors; matters 0 / 0 / 3 | Matters append | Busy and quiet inspector lists, inquiry pipeline | `washington/oversight/Inspectors.tsx:39,48`; `Inquiries.tsx:44-69` | None |
| Conditions | `campaign.conditions` (resolved kept) | 0 / 64-112 / 864 total; 43 active at term end (M2, M3) | Appends (never pruned) | Home overview shows live ones | `nation/state/Conditions.tsx:9-10` | None. Save-size risk, not a UI risk |
| Player flags | `player.flags` | 1 / 263 / 3,191 (M2) | Appends | Not presented | n/a | Save-size only |

## Notes

### Truncated without a full-set path (fix list)

1. Settled bills: `FloorBusiness.tsx:42` passes 3. At term end 69 bills have become law. No list route exists. (`washington/congress/bill/$id` is reachable only by link.)
2. Appointee shortlists: `shortlist.ts:42,49` and `judicial-nominations.ts:33,89` cut a pool of 7 to 227 to 3 or 4. The comparison UI has no "see everyone eligible".
3. Trade partners: `trade-partners.ts:81,106` shows 6 of up to 78 (`CountryEconomy.tsx:86-96`). Trade sectors: `trade-partners.ts:80,134` shows 5 of up to 28 (`CountryEconomy.tsx:62-82`). Neither has a direction (import vs export) split per partner.
4. Country ties and arcs: `nation-file.ts:82-107` shows 3 allies, 3 rivals and 8 arcs of 12 to 195 dyads.
5. Person counsel and circle: `PersonScreen.tsx:260` (6 entries), `PersonVisuals.tsx:80` (8 ties).
6. Press outings `Podium.tsx:40` (6) and country recent moves (3, `recent-moves.ts:23`).
7. Metros per state limited to 6 (`state-dossier.ts:130`).
8. Shell search returns at most 30 results with no count (`search-index.ts:62,72`) and indexes only places and glossary terms, so it cannot find a person, country, state, bill or order. The World directory has its own search (`WorldHome.tsx:183-200`).
9. War beats `slice(0, 8)` (`WarScreen.tsx:169`). Not binding yet (observed 3 to 4).
10. Map marks cap at 25 clusters (`map/marks/cluster.ts:21,48`) but a "More" control is rendered (`MapMarks.tsx:141`), so this one has a path.

### Counts that need a visible total

- Record: `record.index.tsx:106` puts "N entries" only in an `aria-label`; sighted players see "Show 40 older entries" with no total. Same for the Brief's `RunningClocks` fold, which does say the count (`Sections.tsx:94`).
- Legislative proposals and the World directory already show "N of M" lines (`LegislativeAgenda.tsx:47`, `WorldHome.tsx:173`). Use these as the shared pattern.

### Scale observations (for stress targets, not measured in a browser)

- Largest realistic collections: Record 30,582 rows (computed in full on every render by `recordRows(campaign, filter)` at `record.index.tsx:128`; render cost not profiled), ledger 34,626, feed 4,892, people 6,888, dyads 8,547, security assessments 126, bills 69.
- Save size: 31 MB at term end. `MAX_ACTIVE_CAMPAIGNS = 5` (`player-core/src/persistence/save-store.ts:34`) means a full vault holds about 155 MB at that size. Not measured against browser storage quotas.
- The model does not plausibly reach 1,000 of anything except the Record, ledger, feed and flags. No collection that the player picks from (states 51, countries 196, offices 87) needs virtualization. The Record and Security assessments are the two that might.

### Unit and asset-count findings

- Catalog nouns exist: `FORCE_COUNT_NOUNS` = formations, hulls, airframes, satellites, teams, batteries (M5); `forceAssetNoun` is applied in sentences (`nation-forces.ts:191`, `act/force-cost-words.ts:28`, engine `commitments.ts:256`, `force-packages.ts:186`). So prose keeps the unit.
- `CountryForces.tsx:31-47` is the one place counts drop the unit: the "Fielded" and "Free" columns print bare integers in one column that mixes hulls, airframes, formations and teams (US air holdings are airframes: 1,550 fighters; Army holdings are 31 brigade combat teams). The unit is only the row label. A reader cannot sum or compare down the column. The Fielded-minus-Free gap (`committed`, `belowReadiness`) is not shown.
- Personnel is derived from the catalog's nominal crew (`forceAssetPersonnel`) or from basing bands (`geo/force-placement.ts:162-174`, "in the country total" uses a band midpoint). It drives map mark weight and command "weight" (`security/command-board.ts:62-82`). The World "Forces" lens shows only a relative word from `presenceWord` (`world-board.ts:73,102`). No screen labels these as personnel vs formations, so a bar and a table can read as the same quantity.
- Squadrons vs aircraft: the catalog has both `air.fighter-squadron` (formation, 300 crew) and `air.fighter` (airframes, 20 crew); the US order of battle uses airframes only. A redesigned table must carry the noun with the number.

### Placeholders for unknown, zero, not applicable, stale

Observed vocabulary, grep over `apps/web/src`, `packages/player-core/src`, `packages/ui-web/src`:

| State | How it is shown now | Where |
|---|---|---|
| Unknown to the services | "Unread" (a defined stance, 14 uses in `world-board.ts`); "The services have no read on ..." sentences with the hidden icon | `world/standing.ts`, `CountryEconomy.tsx:10`, `Relationship.tsx:28`, `CountryMoves.tsx:17`, `CountryForces.tsx:53` |
| Not yet asked or decided | "Not asked", "Not read", "Not yet signed", "Unknown" (confidence) | `security/assessment-reading.ts:113`, `world/treaty-screen.ts:171,266` |
| Zero / none | "None", "No money", "None placed", "No US forces", "Under 0.1%", "Nobody found" | `CountryEconomy.tsx:56,78`, `ActChoices.tsx:70`, `Desk.tsx:56`, `world-board.ts:102`, `trade-partners.ts:77` |
| Not available (action) | "Not available: <reason>" prefix | `executive/PricedCompare.tsx:68`, `world/nation/ActCompare.tsx:167`, several others |
| Held / not applicable in a comparison cell | A bare em dash | `ui-web/src/CompareAuthorize.tsx:137` (default for every missing cell), `player-core/src/act/preview.ts:128` (`HELD_SHORT`), `nation/budget/Request.tsx:28-29`, `washington/courts/Nominations.tsx:58-59`, `oversight/DirectiveComposer.tsx:66` |
| Stale | Only the stale-basis refusal sentence (`campaign/store.ts:109-113`). No data screen shows a read's age or "as of" date; only the World lede does (`WorldHome.tsx:235`) and the leaders note (`world/leaders.ts:132`) | |
| Map no-data | "No read on file" / "No view on file" legend text | `world/map-modes.ts:214` |

So the em dash is used for at least three meanings (not applicable to the held option, a value not yet computed because there is no draft, and a missing candidate attribute) at the same call sites. The deliberate states ("Unread", "None", "Not available: why") are in good shape; the bare dash is the gap. The map-harness uses an en dash (`map/harness/MapHarness.tsx:83-100`), dev-only. Stale values are not represented anywhere in the player UI.

### Knowledge rules (what the player may and may not see)

- Foreign standing is intelligence: a government is "unread" until `hasIntelOnNation` is true; its view of the United States is hidden when unread, and every reading is a band word, never a percent (`player-core/src/world/standing.ts` header). Counts: 56 unread at opening, 79 at `long-war` (M7).
- Foreign figures: 76 of 196 governments are `thin` fidelity; their file states a provenance sentence (`world/figure-provenance.ts:1-30`).
- Force counts print only where the services read the government and the dataset holds an order of battle (`CountryForces.tsx:7`); only 4 governments have one (M5).
- Nation traits (aggression, reliability, etc.) are not shown as numbers; temperament appears as readings when read (`CountryMoves.tsx:27`).
- Person attributes appear as words (competence and integrity at `Nominations.tsx:58-59`); impact numbers are hidden before a decision and revealed in the Record (memory note "Scenario impact system"). Not re-verified in this pass.
- Individual House and Senate members have no records, so there is nothing to hide; delegation counts are public (`states[].delegation`).

### Presentation-pattern summary

- Paged with visible total and filters: World directory (24), Legislative proposals (4), Record (40, total hidden from sighted users).
- Master/detail by door: every list row is a `Door` to a dossier (country, state, district, office, person, case, bill).
- Digest/priority queue: Brief (lead card plus rows), digest (6 plus fold).
- Dot strip, no table: 51 states.
- No sortable tables with multiple comparison columns exist anywhere in `apps/web/src` for repeated entities (countries, states, offices, bills). `<table>` appears only for the sector/force tables (`CountryEconomy.tsx:62`, `CountryForces.tsx:31`) and the judge vote record (`JudgeFile.tsx:35`). Section 11 asks for aligned tables where scanning matters; this is the largest structural gap against the brief.

### Not verified

- No browser render, no 320px or 1920px check, no profile of Record or assessment-list render cost.
- No treaty, court, order or nomination volume from real play; fixtures only.
- The 322-scenario count is a JSONL parse of the baked shards (M10), not the studio's published count.
- Route inventory for the 48-route snapshot in BRIEF.txt section 12 was not regenerated here. Current files under `apps/web/src/routes/` show 40 route modules and there is no `/summons` or `/government` route (the Brief and Washington screens appear to have replaced them); not reconciled.
