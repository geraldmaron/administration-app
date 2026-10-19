# 03 · Trade and economic levers: what the engine models, how the player sets it, and one reviewed package

Audit date 2026-10-16. Read-only: no code was edited, and no build, test or server was run. Every claim below cites the file and line it was read from. Anything inferred from reading rather than observed in a run is marked UNCONFIRMED.

**Owner feedback this answers:** "When setting up tariffs, if trading more than one item type, I would expect the player to be able to select one or more items to set tariffs on in the same interface ... I would expect this pattern to extend to any and all relevant surfaces. I expect a fully connected experience such that relevant settings and decisions can be updated inline."

**Which player this designs for.** DECISIONS §8.1 (`docs/DECISIONS.md:441`, owner direction 2026-10-16) makes `apps/player` (Expo, Tamagui) the player and freezes `apps/web`: "no new feature lands in it". The project `CLAUDE.md` still says the player ships as `apps/web`; that sentence is stale against DECISIONS. Today's flows below are read from `apps/player`, with `apps/web` cited only where it shows the same limit. All new UI work lands in `apps/player` and `packages/ui`.

## 1. The answer first

- **One tariff order covers one country, one trade category and one additional rate. The help text is confirmed.** `imposeTariff(campaign, target, sectorId, rate)` takes a single `NationId`, a single `TradeSectorId` and a single number (`packages/engine/src/trade.ts:373-378`) and writes a single `TradeMeasure` whose `sector` and `target` are scalars (`trade.ts:52-58`). The player's act config carries one `sector?: string` and one `rate?: number` (`packages/player-core/src/act/catalogue.ts:175-176`), and the route is keyed by one nation (`apps/player/app/(game)/world/nation/[id]`). The option is named "Tariff on one kind of goods" (`catalogue.ts:134`). The `apps/web` help text "one tracked category and an additional rate per order" (`apps/web/src/help/authorities.ts:65`) and the `apps/player` copy "Each tariff order here covers one kind of goods and adds one rate" (`apps/player/src/world/parts.tsx:113`) both match the engine.
- **The multi-line pattern the owner wants already exists in two places, but trade isn't one of them.** The budget draft takes every account at once (`packages/engine/src/budget-draft.ts:26,38`), and the nominations desk builds N packets under one review by folding them (`packages/player-core/src/appointments/desk.ts:259-275`). The commit boundary already accepts "a run of packets that is one act" (`apps/player/src/review/authorize.ts:18,76`; `packages/player-core/src/campaign/store.ts:148-152,544-555`). The engine also has a multi-domain policy program (`packages/engine/src/policy-draft.ts:49,123,421`) that no player screen calls. The Policy screen calls the single-stance `enactPolicy` (`apps/player/src/nation/policy/PolicyScreen.tsx:3,85`).
- **Recommendation:** add one engine function, `imposeTariffPackage`, that returns a single packet for N tariff lines. Each line stays its own separately liftable `TradeMeasure` with an optional `packageId`, and each partner gets one retaliation record. On top of it, build one Trade package workspace in `apps/player` with a goods × countries selection, per-line rate, duration and exclusion, bulk edit, presets, live per-line and combined readings, and one presidential review. The weaker alternative is N linked packets under one review with no engine change. Section 5.4 compares the two. It's rejected because it stacks retaliation and splits the Record entry.
- **Four defects found on the way.** None is caused by the owner's ask, and all four affect what a package would show:
  1. Booked customs receipts don't match the revenue the tariff preview shows (§4.1).
  2. Measures that expire leave their price move behind (§4.2).
  3. The direct tariff path skips the customs-union/FTA gate that the ladder rung applies, and a signed trade agreement's "schedules bound" promise isn't enforced (§4.3).
  4. Neither player displays the household price effect of tariffs in force (§4.4).

## 2. What the engine models, lever by lever

Notation: **targets** is what one application takes, **N** is how many one application accepts, and **bounds** are what the engine refuses.

### 2.1 The trade register (`packages/engine/src/trade.ts`)

There are 28 trade sectors: 24 carry tariffs, 2 carry export controls and 2 carry licensing. Count from `instrument:` in `packages/engine/src/trade-sectors.ts`. Each sector names the institution whose authority it moves under (USTR, Commerce, USDA, DOE, FDA, HHS, BIS, State).

A measure is `{ kind, sector, target, rate 0..1, imposedTurn/Date, authority, origin "us"|"retaliation", actor?, liftedTurn?, expiresDate?, direction?, causedBy? }` (`trade.ts:52-89`). There are exactly five kinds: tariff, sanctions, asset-restriction, export-control and embargo (`trade.ts:45-50`). Quota, agreement and exclusion were deleted because nothing constructed them, and `scripts/verify-trade-measure-kinds.mjs` fails on any declared kind that has no constructor (`trade.ts:40-44`).

Edges are derived on every call, never stored. Imports and exports for a partner × sector come from the recorded opening, moved by the economies and by the measures in force (`trade.ts:149-168`; `trade-volume.ts:115-141,144-155`).

| Lever | Targets | N per application | Bounds and refusals | Authority and gates | Effects the engine forecasts or applies | Evidence |
|---|---|---|---|---|---|---|
| **Tariff (direct)** | one partner, one tariff-instrument sector, one additional rate | 1 × 1 × 1 | rate must be finite, > 0 and ≤ 1 (`trade.ts:388-390`). Standing plus new must be ≤ 1, the "total ban" ceiling (`trade.ts:391-397`). The sector must be tariff-instrument (`trade.ts:381-387`) and traded with that partner (`trade.ts:398-401`). The player is whole percent, 1 to the remaining room (`player-core/src/act/preview.ts:255-265`). | `authority` = the sector's institution, recorded only (`trade.ts:416`). No statute gate, no investigation step and no court proceeding: judicial subjects cover executive orders and others, not trade measures (`court-procedure.ts:8`). The tariff-competence (customs union/FTA) gate is **not** called on this path (§4.3). | `tariffIncidence`: revenue (net of lost volume), border price rise, shelf price rise, import fall, diversion share, domestic gain, input-cost rise, employment effect, retaliation chance and retaliation sector (`trade.ts:200-223,245-297`). Applies a sector price move of +shelf rise (`trade.ts:420`). Relationship: tension +0.3×rate, trust −0.2×rate, trade dependence −0.4×import fall (`trade.ts:436-441`). Retaliation is queued if a seeded roll falls under its chance: 0.8×rate, due in 4 turns (`trade.ts:421-434,346`; roll at `trade-effects.ts:38-45`). CPI: `tariffPriceStep` = shelf rise × partner share × household weight, phased over 26 weeks (`tariff-prices.ts:22,66-73,79-92`). | `trade.ts:373-463` |
| **Tariff increase (ladder rung economic-2)** | one partner; the sector is chosen by the engine (the first tariffable edge, largest import first) | 1 × 1, at a fixed 10% | `TARIFF_INCREASE_RATE = 0.1` (`instruments-economic.ts:80`). Silently drops the measure if `imposeTariff` refuses (`:110-111`). | `tariffCompetence` and a live trade channel (`instruments-economic.ts:128-133`; `instrument-gates.ts:72-84`) | the same packet as the direct tariff, plus trade dependence −0.05×jitter | `instruments-economic.ts:82-113` |
| **Sanctions / export control (economic-3)** | one partner; the kind and sector are chosen by the engine: export-control where the partner buys licensed or controlled goods, sanctions otherwise | 1 | needs reserves ≥ 2000 and a trade channel (`instruments-economic.ts:141-143`) | OFAC for sanctions, BIS for export controls (`trade.ts:477-482,494-505`) | target reserves −5%×jitter, tension; a measure with rate 0, weighed as rate 0.3 or 0.4 (`trade-volume.ts:35-40`) for volume and retaliation (`trade.ts:527-571`); a commodity supply shock if the target is a producer: share × severity × `SANCTION_BITE` 0.3, with US measures reaching the whole output (`commodity-shocks.ts:58,177-206`) | `instruments-economic.ts:136-162` |
| **Asset freeze (economic-4)** | one partner | 1 | GDP ≥ 20,000 (`:169`) | OFAC | target reserves ×0.85, trust; asset-restriction measure weighed as 0.55 | `instruments-economic.ts:163-180` |
| **Blocked assets (order-asset-seizure)** | one foreign subject per signature | 1 | needs an active external emergency against that owner (`blocked-assets.ts:38-45`) | executive order with a declared emergency (`orders.ts:268-273`); court suspension suppresses its effect without lifting it (`order-authority.ts:35-42`) | writes a `BlockedAsset` and an asset-restriction measure; released when the order or emergency ends (`blocked-assets.ts:47-76`) | `blocked-assets.ts` |
| **Full embargo (economic-5)** | one partner | 1 | reserves ≥ 5000, exports ≥ 5000, and not already standing (`instruments-economic.ts:186-190`) | OFAC; flag `embargo:<actor>:<target>` | both directions cut to 0 (`trade-volume.ts:124-128`); the actor's exports cut by up to 25%; a standing enforcement program (`instruments-economic.ts:191-228`) | `instruments-economic.ts:181-229` |
| **Timed import suspension** | one partner; imports only | 1 | 1 to 365 days, whole number (`trade-effects.ts:117`) | INST-USTR; only from a conversation commitment (`conversations.ts:591`) | rate 0 embargo, `direction: "imports"`, `expiresDate`; lifted by `expireTradeMeasures` (`trade-effects.ts:116-138`) | `trade-effects.ts:116-123` |
| **Lift** | one measure id | 1 | must be live and the administration's own (`trade.ts:610-613`) | none | reverses the price move; relationship thaws by the measure's weight; clears the embargo flag (`trade.ts:609-652`) | `trade.ts:609-652` |
| **Retaliation (world)** | answers one measure | 1 per measure | the answer's rate is not capped | none | lands a tariff on the partner's most politically salient US export (salience × exports), the same sector whatever was tariffed (`trade.ts:331-337`); treasury −(exports × rate × 0.5)/52 once; standing −0.008 (`trade.ts:664-727`) | `trade.ts:664-727` |
| **Trade agreement (treaty)** | one counterpart | 1 | minimum trust −0.1; needs Senate ratification (`treaties.ts:83-91`) | Article II; the Senate whip count is forecast (`player-core/src/act/preview.ts:205-235`) | trust +0.1, alignment +0.1, tension −0.06. Its summary says "Tariff schedules bound at their current levels", but no reader of a trade treaty was found in `imposeTariff` (§4.3) | `treaties.ts:83-91` |
| **Tariff exclusions** | not modeled | — | — | — | The `exclusion` kind was removed (`trade.ts:40-44`). The finest grain is the 28 sectors; there are no product lines. | — |
| **Quotas, tariff-rate quotas** | not modeled | — | — | — | removed with the other dead kinds | `trade.ts:40-44` |
| **Customs revenue** | read, not set | — | — | collection capacity scales receipts by 0.6 + 0.4 × capacity (`trade.ts:350-351`) | weekly receipts = sum of `tariffIncidence(...).revenue` × share / 52 (`trade.ts:349-360`), booked through `national-books.ts:224` | `trade.ts:349-360` |

**Identity rules a package must keep.** Same-turn tariffs on one partner get ordinal-suffixed measure and retaliation ids, so each signature stays separately liftable with its own retaliation cause (`trade.ts:362-371`; `docs/ARCHITECTURE.md:100`). Non-rate measures use `id = <kind>:<target>:<turn>` with no ordinal (`trade.ts:537`), so two sanctions on one partner in one week would collide. That's UNCONFIRMED in a run; read from source.

### 2.2 Commodity and supply levers (`packages/engine/src/commodity-*.ts`)

There are 11 commodities in 6 families: crude, natural gas, LNG, wheat, corn, soybeans, potash, nitrogen, copper, lithium and rare earths (`commodity-registry.ts:116-149`). They're priced by a kernel from supply shocks: war, route, blockade, sanction, harvest and release (`commodity-shocks.ts:18`). They're a separate vocabulary from the 28 trade sectors, and no tariff writes a commodity shock. Sanctions do (`commodity-shocks.ts:191-206`).

| Lever | Targets | N | Bounds and refusals | Authority and gates | Effects | Evidence |
|---|---|---|---|---|---|---|
| **SPR drawdown** | the reserve (no parameters) | 1 at a time | refused if a release is already flowing, if the fill is below 0.45, or if there's no severe interruption (crude ≥ 1.1 × norm, or a standing shock) | DOE; the finding of a severe interruption (`commodity-levers.ts:39-43,50-63`) | sells 45% of the opening fill over 26 weeks as a supply shock; the risk is the depleted reserve | `commodity-levers.ts:18-21,70-99` |
| **Emergency fuel waiver** | the pump (no parameters) | 1 at a time | refused if one is already in force, or if the pump is under 1.1 × the oath price with no interruption | EPA | standing −0.005; 20 weeks; relief read by the pump price (`household-prices.ts:58`) | `commodity-levers.ts:24,102-145` |
| **Lean on the Fed** | direction ease or tighten | 1 per act | `projectFedLean` refusals | — | nudges the Fed's weighting by at most 0.05 at its next meeting (`player-core/src/economy/market-levers.ts:44-55`) | `market-levers.ts:73-78` |
| **Commodity purchase, refill, or export restriction by the US** | not modeled | — | — | — | No purchase or refill act exists. `projectReserveRelease` says refilling "takes an appropriation and years" (`commodity-levers.ts:52`). | — |

### 2.3 Budget, policy and orders

| Lever | Targets | N per application | Bounds | Authority and gates | Evidence |
|---|---|---|---|---|---|
| **Budget draft** | any subset of budget accounts, each a share of national income | **many**: `Partial<Record<BudgetAccount, number>>` | ≥ 0; each account capped by `accountCap` | appropriation; one packet names every changed account (`budget-draft.ts:75-100`) | `budget-draft.ts:26,38-64` |
| **Policy program** | any subset of the six domains (fiscal, industry, trade, civil, security, defense), each a stance id | **many** in the engine (`PolicyDraftInput`); **one** in the player (`enactPolicy(stanceId)`) | a revenue domain needs its statute passed first (`policy-draft.ts:349-353,392,421-433`); the enactment lump goes through the obligation guard | domain chair, Congress for statute | `policy-draft.ts:49,123,421`; `policy-draft.ts:513` |
| **Trade policy stance** | trade domain: continuity, open, managed, protective | 1 | — | — | moves stats and alignment, not `TradeMeasure`s (`policy-catalog.ts:183-230`). A "Protective tariffs" stance and an actual tariff are two unlinked levers. |
| **Executive order** | one order × at most one subject (`ports-of-entry`, `foreign`, `entry-class`, `state`, `grant`, ...) | 1 × 1 | `orderAvailability` (`orders.ts:391`) | ground, challenge chance, legal reviewer, court review (`orders.ts:456-472,603-623`) | `orders.ts:578`; `order-subjects.ts:41-51` |
| **Assistance ladder** (relief, grant, stabilization, arms, guarantee) | one partner | 1 | rung gates | — | `instruments-economic.ts:362+`. Rung details weren't read for this audit (UNCONFIRMED). |

## 3. How the player sets these today, and every screen break

### 3.1 Tariff, end to end (`apps/player`)

1. **Country page, Economy view** (`apps/player/src/world/nation/Economy.tsx`). The goods list is a sortable, one-at-a-time expandable row (`:40`). An expanded tariffable row has one button, "Set up a tariff on X" (`:82-86`), which **navigates** to the act route with `option=tariff&sector=X` (`countryActHref`, `world/params.ts:59-60`).
2. **Act desk** (`apps/player/src/world/act/ActDesk.tsx:72-91`). The terms are a single `Select` "Kind of goods" with the help text "Each tariff covers one kind of goods" (`Terms.tsx:41-42`), and a single slider "Added tariff" from 1 to the room left (`Terms.tsx:97-99`). "Compare all N kinds of goods" opens a sheet whose only action per row is "Choose", which **replaces** the pick (`Terms.tsx:63-79`).
3. **Assessment.** Six rows against doing nothing: what it does, revenue, prices at home, trade with them, chance they hit back, when (`player-core/src/act/assessment-ties.ts:90-106`). Domestic gain, input-cost rise and employment effect are computed by `tariffIncidence` and never shown.
4. **Authorize.** One packet, review tier `full` (`ActDesk.tsx:83`; `player-core/src/act/build.ts:126-138`).
5. **Receipt** (`world/act/Done.tsx`). To tariff a second category, the player returns to the act desk (`Done.tsx:54`) and repeats steps 2 to 4. To tariff the same category from a second country, the player leaves for that country's page.

`apps/web` has the same limit. Its `TariffGoods` selects with a radio (`apps/web/src/world/nation/TariffGoods.tsx:65`) under the hint "One category per order" (`:94`).

### 3.2 Every place the player must leave one screen to change what another shows

| From (what the player is reading) | To change it, the player must go to | Evidence |
|---|---|---|
| National Economy, "Trade in goods" panel ("You set both on each country's page") | partner row → country page → Economy view → act desk | `apps/player/src/nation/economy/Panels.tsx:101,117` |
| Country Economy goods row | act desk, a new route, one category | `world/nation/Economy.tsx:84` |
| Act desk, goods X for country A | the same desk again for goods Y; another country's desk for country B, since the route is keyed by nation | `ActDesk.tsx`; `catalogue.ts:175-176` |
| Country Diplomacy, measures in force | "manage" route, one measure per review, lift only (no rate change) | `world/nation/Diplomacy.tsx:48`; `world/act/Manage.tsx:47`; `world/nation/Views.tsx:186` |
| Expected retaliation (world overview KPIs) | no inline control. The answer can't be negotiated or pre-empted from there. | `apps/player/src/world/overview/Sections.tsx:10` |
| Tariff effect on household prices | not shown in either player. `appliedTariffPrices` is defined but has no caller in `apps/player` or `apps/web` (grep). | `player-core/src/economy/tariff-prices.ts:25` |
| Customs revenue in the Books | budget screen. No link back to the measures that produce it. | `engine/src/national-books.ts:224`; `apps/player/src/nation/budget/Books.tsx` |
| Market levers (SPR, waiver, Fed) | one lever per commit. Two levers take two reviews. | `apps/player/src/nation/economy/Levers.tsx:58-60`; `market-levers.ts:73-78` |
| Trade policy stance (Policy screen) | separate from tariffs. One domain per adoption. | `PolicyScreen.tsx:85`; `policy-catalog.ts:183-230` |
| Sanctions or embargo on several countries | one country's act desk at a time; the coalition `partners` multi-select is "who joins", not "who is targeted" | `Terms.tsx:113-136`; `preview.ts:97-106` |
| Executive order on several subjects | one subject per signature | `OrderScreen.tsx:54,97`; `orders.ts:578` |

## 4. Defects found that a package would surface

### 4.1 The revenue shown is not the revenue booked (DECISIONS §3.7)

The preview prints `tariffIncidence(...).revenue`, which is the basis edge's imports × rate × (1 − fall) (`trade.ts:257`; `assessment-ties.ts:99`). The weekly books recompute `tariffIncidence` on the **live** campaign (`trade.ts:355`). The live edge already carries this tariff's volume fall (`trade-volume.ts:149-153`), so the fall is applied a second time. The total is also multiplied by the collection share of 0.6 to 1.0 (`trade.ts:350-351`).

Booked revenue is therefore about (1 − fall)² × share, against a shown (1 − fall). That's derived from the code and UNCONFIRMED by a test. DECISIONS §3.7 says "The price shown is the price charged" (`docs/DECISIONS.md:138-140`). A combined revenue figure across N lines would multiply this error.

### 4.2 Expiry strands the price move

`expireTradeMeasures` lifts a measure with `{ kind: "trade", lift }` and no `priceMove` (`trade-effects.ts:133`). `liftMeasure` reverses the move (`trade.ts:636`). It's harmless today because the only expiring measure has rate 0 (`trade-effects.ts:120`). It becomes wrong the moment a tariff line carries a duration.

### 4.3 Gates missing on the direct tariff path

- The `tariffCompetence` gate (customs union, or FTA co-membership: `instrument-gates.ts:72-84`) is applied by ladder rung 2 (`instruments-economic.ts:132`) but not by `imposeTariff`, which the act desk calls (`build.ts:129`). The US holds no customs-union or FTA membership in `orgs-cradles.ts`, and CPTPP lists the US as a non-member (`orgs-cradles.ts:166-173`). So today this is UNCONFIRMED to matter for the player, but the two paths disagree.
- A ratified trade agreement's "Tariff schedules bound at their current levels" (`treaties.ts:86`) isn't consulted by `imposeTariff`. No reader of treaty kind `trade` was found outside `treaties.ts` (grep). A package that tariffs a treaty partner should at least show the breach.

### 4.4 Effects computed but not shown

These are computed and never shown on the tariff path in `apps/player`: `domesticGain`, `inputCostRise` and `employmentEffect` (`trade.ts:270-278`), applied tariff CPI by measure (`player-core/src/economy/tariff-prices.ts:25`), and `selectTradeExposure` (`trade.ts:738-748`).

## 5. Target experience: one Trade package workspace

### 5.1 Where it lives and how it opens

- **One route, `/world/trade` (new), plus the same component inline as a sheet.** Every existing trade door opens it, pre-filled:
  - Country Economy row → the package with {that country × that category}.
  - National Economy partner table → {that partner}, with every category listed.
  - National Economy household price row → {that category}, with every supplier listed.
  - Diplomacy measure row → the package showing that line as "in force", editable (raise, lower, lift, set expiry).
- Opening from a country keeps the country page underneath; opening from the national economy keeps that screen. Closing returns focus (DESIGN.md:191). The act desk's tariff option becomes "Trade package" and renders the same component with the country preselected, so there is one tariff UI, not two.
- DESIGN.md:266 already requires Trade to appear in both Nation policy and World act, cross-linked. The package is the shared surface that requirement points at.

### 5.2 Selection: rows are lines, not a matrix of inputs

- **Desktop (≥ 1024): a goods × countries grid used only to select.** Rows are the 24 tariffable categories and columns are partners, ranked by US imports. Each cell draws the import volume as a bar plus the rate in force. A click toggles the cell into the package, and a row or column header selects the whole row or column.
  - The grid is capped at the top 12 partners by default. "Add a partner" searches all 196.
  - Cells with no imports are inert and say why (the "We don't buy any of these" copy from `Economy.tsx:90`). Licensed or controlled categories say "set under export controls, not tariffs" and offer the export-control line kind instead.
- **Phone (390) and tablet: no grid.** A two-step list: pick partners (multi-select chips), then pick goods (a checkbox list ranked by combined imports from the chosen partners). The same selection model drives both layouts (DECISIONS §8.1 one route tree; `docs/DECISIONS.md:470`).
- **The package itself is a results list of lines** (memory: choices as a results list, not a compare table). Each line is one partner × one category. It shows:
  - the rate in force, the additional rate (stepper and slider) and the resulting total;
  - duration: "Until lifted" or a date / N weeks, 1 to 365 days, the same bound as `temporaryImportSuspension`;
  - drawn readings: revenue a year, shelf price rise, import fall, retaliation chance as a gauge, employment effect;
  - a remove control, and an expand for the full incidence.
- **Grouping:** lines group by partner, with group subtotals, toggleable to group by category. Sorting and paging come from the shared table pieces (memory: tables sort and page).

### 5.3 Editing, bulk edit, presets and constraints

- **Bulk edit:**
  - "Apply to selected" sets rate and/or duration on every checked line.
  - "Raise by N points" adds to each line's additional rate.
  - "Match highest" levels lines up.
  - Each bulk action clamps per line to that line's room (100 − standing). Any line that was clamped is listed afterwards ("3 lines held at their 100% ceiling").
- **Presets** are named selections plus rates, built from data and never hardcoded partner lists:
  - "Everything we buy from {partner}": all tariffable categories with imports > 0.
  - "{Category} from every supplier": all suppliers with dependence ≥ 1%, the engine's own materiality line (`trade.ts:234`).
  - "Strategic goods only": `strategic: true` sectors.
  - "Match their tariff on us": per category, the rate of a landed retaliation measure.
  - "Last package": re-open the most recent `packageId`.
- **Exclusions, v1: deselection, said plainly.** A row or column selection followed by unchecking cells is the exclusion, and the review lists "Excluded: Canada (steel), Mexico (steel)". The model has no product lines, so the copy must say "excludes a whole category for that partner" and never "product exclusion". A finer exclusion needs the engine change in BL-proposal 9.
- **Constraints, shown on the line before authorize, in the engine's words:**
  - the room left before 100% (`trade.ts:391-397`);
  - not traded (`trade.ts:398-401`);
  - not a tariff instrument (`trade.ts:381-387`);
  - the competence gate (§4.3);
  - a treaty partner whose schedule is bound (§4.3), as a caution, not a block, until an engine rule exists;
  - the authority institution per line (`def.authority`, `trade.ts:416`), with the legal topic chip (`apps/player/src/world/law.ts:54`).
- **Legal exposure: show only what the engine models.** No legal-challenge probability exists for trade measures (§2.1, court subjects). The package shows the authority each line is taken under and the help citation. It must not invent an odds figure (DESIGN.md:193, "no fabricated ... probability"). A modeled exposure is a separate engine item (BL-proposal 10).

### 5.4 The engine contract: one package, one packet

**Option A: N linked packets under one review (no engine change).** Fold `imposeTariff` line by line, each built on the state left by the lines before it, as `deskPlan` does (`desk.ts:262-263`), and commit with `commitAll`.
- Strongest failure mode: every line against one partner queues its own retaliation record on the same salient US export (`trade.ts:331-337,421-434`), each at 0.8 × its rate with no ceiling. Five lines against one partner in one week can yield five stacked answers on soybeans.
- It also writes N Record entries for what the President signed as one act, and line i's preview depends on the order of the lines.

**Option B (recommended): `imposeTariffPackage(campaign, lines)` returns one packet.** The signature is in §5.5. Under it:
- Lines are canonicalized (partner id, then sector id) before any id or hash, so the UI's selection order can't change the result. That keeps the engine deterministic (DECISIONS §1).
- Each line is validated exactly as `imposeTariff` validates today. Any refused line refuses the whole package with that line named. A partial package is never committed silently.
- Each line writes its own `TradeMeasure`, so each is still separately liftable, with `id` from `tariffOrderIds`, a new optional `packageId`, and an optional `expiresDate` from its duration. The per-sector price moves are summed.
- **One retaliation record per partner.** It's sized on the package's import-weighted rate against that partner, rolled by the existing `willRetaliate` on the record id, and carries `answering: <first measure id>` plus the package id. Its rate is `min(0.8 × weighted rate, 1 − rate already on that export)`.
- **One relationship effect per partner**, on the weighted rate, with the same coefficients as `trade.ts:436-441`. One narration and one Record entry name the package ("Tariffs on 7 kinds of goods from 3 countries").
- **The preview is the same function on the same state.** `projectTariffPackage` returns per-line incidence (evaluated against the basis, as now) and package totals. Totals are revenue, CPI step (sum of `tariffPriceStep`), import fall in dollars, and expected retaliation by partner, as sector and rate. That satisfies §3.7 once §4.1 is fixed.

**Conclusion: accepted with controls.** The controls:
1. Canonical ordering.
2. All-or-nothing refusal.
3. A test that a one-line package produces the same measure, price move and relationship deltas as `imposeTariff` (today's retaliation record id format is kept for one-line packages).
4. Doc sync for `docs/SCHEMA.md` and `docs/ARCHITECTURE.md` in the same change, since `TradeMeasure` and `RetaliationRecord` are part of `Campaign` state.

**Save compatibility.** `packageId?` on `TradeMeasure` and on `RetaliationRecord` is optional. A save without it reads as single-line packages, which is what every existing measure is. `expiresDate` already exists (`trade.ts:77`). If `normalizeCampaign` validates trade state strictly, bump `CURRENT_SCHEMA_VERSION` from 66 (`save.ts:125`) with a no-op migration. The normalization rules weren't read for this audit (UNCONFIRMED).

Lifting:
- `liftMeasures(campaign, ids[])` folds `liftMeasure` into one packet (and one Record entry). This is the same pattern; no new state.
- "Lift the package" is `liftMeasures` over the measures with that `packageId`.
- Rate change on an existing line = lift + re-impose inside one package, so the old measure keeps its history.

### 5.5 Data, selectors and files

**Engine** (`packages/engine/src`):
- `trade.ts`:
  - `type TariffLine = { target: NationId; sector: TradeSectorId; rate: number; days?: number }`
  - `projectTariffPackage(campaign, lines): { ok, lines: TariffLineReading[], totals, retaliation: RetaliationPreview[] } | { ok: false, line, reason }`
  - `imposeTariffPackage(campaign, lines): TradeResult-like with packet`
  - `liftMeasures(campaign, ids)`
  - Also the §4.1 receipts fix.
- `trade-effects.ts`: `expireTradeMeasures` reverses the price move (§4.2).
- Both are pure, with no new phase. The file-size gate matters here: `trade.ts` is 771 lines against an 800 budget, so the package code goes in a new `trade-package.ts`.

**player-core** (`packages/player-core/src/trade/`, new):
- `tradePackageDraft(campaign, seed: { nations?, sectors?, measureIds? })` gives the selectable grid: rows, columns, cells with imports, rate in force, room and the reason a cell is inert.
- `packageLines(draft, selection, edits)` gives the lines with clamping.
- `applyBulk(lines, op)` covers set rate, raise by, match highest and set duration, and returns the clamped list.
- `PACKAGE_PRESETS` with `presetSelection(campaign, preset, context)`.
- `tradePackageReading(campaign, lines)` wraps `projectTariffPackage` into drawn-reading words and stances. It reuses `RETALIATION_STANCE` (`act/preview.ts:82-88`) and `priceStep` (`economy/tariff-prices.ts:9`).
- `buildTradePackage(campaign, lines): ActBuild` with receipt lines. Widen `ActBuild.packet` to `EffectPacket | readonly EffectPacket[]` (`act/build.ts:38-50`) only if Option A is ever needed.
- `parseTradePackage` / `tradePackageSearch` keep the package in the address, so a draft survives reload and can be shared (the `act/config.ts:20-60` pattern). Lines serialize as `NATION.sector.rate.days`.
- `ModelingAct` gains `{ act: "trade-package"; lines }` so the projection band and `ChoiceProjection` work unchanged (`modeling/acts.ts:44-66,99-101`).

**apps/player:**
- `src/trade/PackageWorkspace.tsx`: grid or list, lines, bulk bar, presets, totals.
- The route `app/(game)/world/trade.tsx`.
- `Terms.tsx` renders the workspace for the tariff option.
- Doors from `Economy.tsx:82-86`, `Panels.tsx:101`, `Diplomacy.tsx:48`.
- The review lines name every line, grouped by partner, with the totals.

### 5.6 Review and receipt

- **One `CompareAuthorize`.** The baseline card "Leave tariffs as they are" against the package card. Its rows are the package totals, each drawn with a per-partner breakdown on expand.
- **One review at tier `full`.** The verb is "Impose N tariffs". The lines list partners × categories, rates, durations and exclusions. Per DESIGN.md:194, the review shows terms, never the outcome.
- **One commit.** The receipt lists every line, then the retaliation expected by partner and date, with "Lift" and "Change" links on each line that reopen the package with the line preselected.

## 6. The same pattern on every relevant surface

| Surface | Today | Package form | Engine change? |
|---|---|---|---|
| **Sanctions, export controls, asset freeze, embargo** | one partner per ladder act; kind and sector chosen by the engine (`trade.ts:494-515`) | Partners multi-select, kind per line. Readings per partner: chance it works, cost, reserves hit, commodity supply shock, retaliation. One packet. | Yes. `issueActionPackage` folds the per-target `issueAction` into one packet. Fix the non-rate id collision (`trade.ts:537`) by adding the ordinal scheme. |
| **Lift several measures** | one per review (`Manage.tsx:47`) | Check measures on the Diplomacy list or the package. One review. | Small: `liftMeasures` (§5.4). |
| **Aid (assistance ladder)** | one partner per act | Partners × rung, money summed against obligation room; the review shows the total charged | Yes, the same fold as sanctions |
| **Budget lines** | already many-in-one (`BudgetScreen.tsx:72,91`) | Add bulk ("+0.1 points to all defense lines"), presets (the last enacted budget, the request) and a link from each line's capability to the act it funds | No |
| **Policy levers** | one domain per adoption (`PolicyScreen.tsx:85`), though the engine takes a program | A program draft: a stance per domain on one screen, combined outlook from `projectPolicyDraft`, statute blockers per line (`policy-draft.ts:421-433`), one review via `enactPolicyDraft` | No; the UI wires an existing engine path |
| **Executive orders with several provisions** | one order × one subject (`orders.ts:578`) | Several subjects of the same order, for example the entry suspension for three nations, in one signature with per-subject availability | Yes: `subjects[]` on the record, with the per-subject court effect kept. Order 3 in the sequence because court review is per record (`order-authority.ts:6-33`). |
| **Market levers** | one per commit (`Levers.tsx:58-60`) | SPR plus waiver plus Fed lean as one package against waiting; `leverComparison` already prices each column | No; fold the packets |
| **Commodity purchase or refill** | not modeled | Out of scope until an engine act exists. Show "Refill takes an appropriation" as the locked reason. | Yes, if wanted (owner decision) |

## 7. Backlog-ready items

Ids are proposals. One writer per file: the integrator assigns real `BL-` numbers; the next free id at audit time is BL-171 (`docs/BACKLOG.md`). Size: S under a day, M a few days, L a week or more.

**P1. Tariff package engine contract (`imposeTariffPackage`, `projectTariffPackage`)**
- Problem: one tariff order = one partner × one category × one rate (`trade.ts:373-378`). The owner wants several items in one act. Folding N `imposeTariff` calls stacks retaliation on one export (`trade.ts:331-337,421-434`).
- Acceptance:
  1. One call with K lines across M partners returns one packet: K measures, each separately liftable; at most M retaliation records; M relationship effects; one Record entry.
  2. A one-line package equals `imposeTariff` on measure, price move and relationship deltas.
  3. Line order doesn't change the result.
  4. Any invalid line refuses the package and names the line.
  5. The preview totals equal the effects applied (§3.7).
  6. Saves at v66 load.
  7. `docs/SCHEMA.md` and `docs/ARCHITECTURE.md` are updated.
- Evidence: `trade.ts:52-89,362-463`; `trade-effects.ts:38-45`.
- Split: engine. Depends on P4. Size L.

**P2. Trade package selectors in player-core**
- Problem: `ActConfig` holds one sector and rate (`catalogue.ts:175-176`), and there's no grid, bulk or preset model.
- Acceptance:
  1. `tradePackageDraft`, `packageLines`, `applyBulk` (clamps and reports clamped lines), `PACKAGE_PRESETS` and `tradePackageReading` are added.
  2. Address round-trip parse and serialize.
  3. A `ModelingAct` "trade-package".
  4. Unit tests for clamping, presets on fixture campaigns, and the round-trip.
- Evidence: `act/preview.ts:237-265`; `act/config.ts:20-60`; `modeling/acts.ts:44-66`.
- Split: player-core. Depends on P1. Size M.

**P3. Trade package workspace in apps/player**
- Problem: tariffs are set one category per order on one country's desk (`Terms.tsx:41,84-102`), and every trade surface sends the player elsewhere (§3.2).
- Acceptance:
  1. At 390×844 and 1440×900, a player selects 3 categories from 2 partners, applies one rate to all selected, sets one line's duration to 90 days, excludes one cell, sees per-line and total revenue, CPI step, import fall and retaliation by partner update on each change, and authorizes once.
  2. The receipt lists all lines.
  3. The country Economy row, the national partner table and the Diplomacy measure row each open the workspace pre-filled.
  4. The act desk's tariff option renders the same component.
  5. Checked at 320px reflow, 1280×800 and 1920×1080.
- Evidence: `Terms.tsx`; `Economy.tsx:82-86`; `Panels.tsx:101`; `Diplomacy.tsx:48`; DESIGN.md:201,266.
- Split: UI. Depends on P2. Size L.

**P4. Booked customs receipts match the previewed revenue**
- Problem: receipts recompute incidence on a live edge that already carries the tariff's volume fall, then scale by collection share. The shown revenue overstates the booked revenue (§4.1).
- Acceptance:
  1. A test signs a 25% tariff and asserts that the annualized `selectCustomsReceipts` the next week equals the shown revenue × the shown collection share, within rounding.
  2. The preview either shows the net-of-collection figure or labels the collection share.
- Evidence: `trade.ts:257,349-360`; `trade-volume.ts:149-153`; DECISIONS §3.7.
- Split: engine (+1 line of copy). Size S/M.

**P5. Tariff duration and expiry reverse the price move**
- Problem: tariffs have no duration in the player, and `expireTradeMeasures` doesn't reverse `priceMove` (§4.2).
- Acceptance:
  1. A tariff line with `days` gets `expiresDate`.
  2. On expiry, `sectorPrice` returns by the same amount `liftMeasure` would remove.
  3. Retaliation answering an expired line stays recorded.
  4. Test the expiry week.
- Evidence: `trade-effects.ts:116-138`; `trade.ts:636`.
- Split: engine. Size S.

**P6. Direct tariff path applies tariff competence and shows trade-treaty binding**
- Problem: ladder rung 2 checks `tariffCompetence`; the act desk path doesn't. A trade treaty's bound schedules are not read (§4.3).
- Acceptance:
  1. `imposeTariff` (and the package) refuse with the competence reason where rung 2 would.
  2. A line against a ratified trade-treaty partner shows a breach caution in the preview.
  3. An owner decision is recorded on whether that breach blocks or costs trust.
- Evidence: `instrument-gates.ts:72-84`; `instruments-economic.ts:132`; `build.ts:129`; `treaties.ts:86`.
- Split: engine + UI copy. Size S (plus an owner decision).

**P7. Show what a tariff does to households and jobs**
- Problem: `appliedTariffPrices` has no caller in either player, and employment, input-cost and domestic-gain readings are computed but hidden (§4.4).
- Acceptance:
  1. The national Economy screen lists each tariff in force with its CPI step and phase-in weeks.
  2. The package readings include the employment effect and input-cost rise.
  3. Each row links to its line in the package.
- Evidence: `player-core/src/economy/tariff-prices.ts:25`; `trade.ts:270-278`; `assessment-ties.ts:97-104`.
- Split: UI (selectors exist). Depends on P3 for the links. Size S.

**P8. Lift or change several measures in one review**
- Problem: lift is one measure per review (`Manage.tsx:47`; `trade.ts:609`).
- Acceptance:
  1. `liftMeasures(ids)` produces one packet and one Record entry.
  2. Diplomacy and the package let the player check several and lift once.
  3. "Lift the package" works by `packageId`.
- Evidence: `trade.ts:609-652`; `world/act/Manage.tsx`.
- Split: engine S + UI S. Depends on P1 for `packageId`. Size S.

**P9. Tariff exclusions finer than a whole category (owner decision first)**
- Problem: there are no product lines, so an "exclusion" can only drop a partner × category cell.
- Acceptance:
  1. The owner chooses (a) keep cell deselection as the exclusion, with copy saying so, or (b) add `coverage 0..1` per line (the share of the category's imports covered), applied to revenue, volume and price.
  2. If (b), the incidence scales linearly and `verify-trade-measure-kinds` stays green, since no new kind is added.
- Evidence: `trade.ts:40-44,245-297`.
- Split: decision, then engine M. Size S/M.

**P10. Legal exposure for trade measures (owner decision first)**
- Problem: the owner asks for legal exposure in the live readings. Trade measures have no court subject or challenge odds (`court-procedure.ts:8`), and inventing one breaks DESIGN.md:193.
- Acceptance: either (a) the package shows the authority and citation per line and no odds (v1), or (b) an engine trade-proceeding subject with sourced challenge rates is designed separately.
- Evidence: `trade.ts:416`; `apps/player/src/world/law.ts:54`.
- Split: decision. Size S (a), L (b).

**P11. Multi-target sanctions, export controls, freezes, embargoes and aid**
- Problem: the economic and assistance ladders take one partner per act (`instruments-economic.ts:115-230,362+`). Non-rate measure ids collide within a turn (`trade.ts:537`).
- Acceptance:
  1. One act with N partners produces one packet with per-partner gates, refusals named per partner, and ordinal ids.
  2. The readings sum cost and show the commodity supply shock per producer.
  3. One review.
- Evidence: as cited. Split: engine M + UI M. Depends on P3's components. Size L.

**P12. Policy program draft in the Policy screen**
- Problem: the engine takes a multi-domain program (`policy-draft.ts:49,123,421`), but the screen adopts one stance at a time (`PolicyScreen.tsx:85`).
- Acceptance:
  1. Stances can be changed in two domains, the combined outlook and the per-line statute blockers are shown, and both are enacted in one review via `enactPolicyDraft`.
  2. The trade-domain line links to the Trade package.
- Evidence: as cited. Split: UI. Size M.

**P13. Market levers as one package**
- Problem: SPR, waiver and Fed are one per commit (`Levers.tsx:58-60`).
- Acceptance: SPR and waiver are authorized together against waiting in one review, and the comparison column shows their combined pump outlook.
- Evidence: `market-levers.ts:57-78`; `lever-comparison.ts:107`.
- Split: player-core S + UI S. Size S.

**P14. Executive orders over several subjects**
- Problem: one subject per signature (`orders.ts:578`; `order-subjects.ts:41-51`).
- Acceptance:
  1. An order that accepts subjects is signed for 2 or more subjects at once, with per-subject availability shown.
  2. A court stay on one subject leaves the others operative.
  3. Saves at v66 load.
- Evidence: `order-authority.ts:6-42`; `state-orders.ts:24`.
- Split: engine L + UI M. Size L. Order it after P1 to P3.

**P15. Retire one-category copy**
- Problem: the help and labels say one category per order (`parts.tsx:113`; `Terms.tsx:41`; `catalogue.ts:134`).
- Acceptance: the copy describes the package once P3 lands; the prose gate and the American-English gates stay green.
- Split: UI. Depends on P3. Size S.

### Sequencing

1. P4 and P5 (engine fixes; no UI).
2. P1, then P2, then P3 and P15. This is the owner's ask.
3. P7 and P8.
4. P12 and P13 (existing engine paths).
5. P11, then P14.
6. P6, P9 and P10 move once their owner decisions are recorded.
