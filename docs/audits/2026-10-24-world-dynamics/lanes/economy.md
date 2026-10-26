# Lane notes: physical economy (Wave 1)

Branch `lane/wd-economy`, from `9b8ba9e59`. Items: BL-275 and BL-276. The integrator applies every doc amendment below; this lane edited no doc outside this file.

## Status

- **BL-275: landed in the engine, ready to close** once the §6.10 amendment, the ARCHITECTURE paragraph and the consumer-registry entry below are applied. Probes B3 (all three) and B4 pass. B12 still passes.
- **BL-276: partly landed.** Done: the gate, the one scoped reach record feeding both world supply and the target's pressure, sector scoping, and evasion that grows over time. Probes D0 and B8 pass. Not done: through the public act path, a US designation of a government with no recorded US imports still files an export control (`trade.ts#denialMeasureKind`) under the largest bilateral sector (`trade.ts#measuredSector`), so rung 3 on Iran lands an INST-BIS export control with no financial reach. `trade.ts` was out of bounds this wave; contract request 1 below.

## Probe results (before = `9b8ba9e59`, after = this branch)

| Probe | Before | After |
|---|---|---|
| B3 KWT vs NOR, week 12 of a full USA-IRN war | +0.009213 vs +0.003973, fail | −0.039721 vs +0.003836, pass |
| B3 QAT vs NOR | +0.009158, fail | −0.065160, pass |
| B3 IRQ vs NOR | +0.012611, fail | −0.033958, pass |
| B4 JPN hit ratio (passed/stopped) vs crude-rise ratio | 0.858 vs 0.785, fail | 0.589 vs 0.787, pass |
| B8 IRN growth change: US sanctions / US embargo / Chinese embargo | −0.000001 / −0.000002 / −0.001519, fail | −0.005761 / −0.046392 / −0.007629, pass |
| D0 rung 3 offered on IRN, PRK, CUB, BLR, NIC, VEN, RUS | IRN, PRK, CUB, BLR, NIC refused, fail | none refused, pass |
| B12a crude a year after reopening; low | 1.0134; 0.9868, pass | 1.0132; 0.9865, pass |
| B12b first vs second identical war peak | 1.3746 vs 1.3695, pass | 1.3369 vs 1.3318, pass |
| B1 crude peak, full-intensity war (report only) | 1.3808 | 1.3427 |

B1's peak falls because the route term no longer stops barrels the war already took from Iran's output (upstream deduplication, below). That moves it further from the audit's ≥1.5. METHODOLOGY already rules that magnitude unestablished. Calibrating it means fitting lost physical flow first (B1 todo); deduplication is the correct accounting for that fit.

Still failing, and owned by other items: B2 (nitrogen route, world data), B9 (tariff wedge, `tariff-prices.ts`), B11 (retaliation to output, `trade.ts`).

## What changed

All under `packages/engine/src`. No shared-contract file was edited.

1. **One scoped reach record** (`external-pressure.ts#Coercion`). It replaces `stopsImposerSales` with `sector?` (an economy `SectorId`; absent means the whole economy), `direction` (`target-sales | both`), `authority` (the register's institution, or the imposing government for another capital's embargo) and `financialReach` (0..1 of the target's in-scope sales to third parties reached this week).
   - Sanctions and export controls are scoped to their filed sector's rollup. Embargoes and asset freezes reach the whole economy.
   - Only the founding nation's designations, freezes and two-way embargoes carry reach (`DOLLAR_REACH` 0.8, a planning value). An import-only ban and an export control carry none, and neither does another capital's measure.
2. **Evasion that grows over time** (`evasionOn`, `EVASION`, planning values: ceiling 0.5, build half-life 365 days, decay half-life 730 days). It uses METHODOLOGY's shared approach-to-target form and is computed from the register's own dates. So lifting a measure, reimposing it, or refiling it under another sector does not reset the networks, and no new state is needed.
3. **The same record feeds both readers.** `reachedShare(campaign, coercion)` is read by `commodity-shocks.ts#sanctionShocks` (world supply, still × `SANCTION_BITE` 0.3) and by `external-pressure.ts#coercionPressure` (the target's growth, still × `COERCION_BITE` 0.5). `commodity-shocks.ts#buyerShare` and its `US_ID` special case are gone.
   - A measure reaches a commodity only when the commodity's new `CommodityDef.sector` is in scope.
   - An imposer's own export restriction reaches only what it sells the target.
4. **A denominator fix in `exportShare`.** Between two non-US governments it multiplied by the stored `tradeDependence`, which is partner share times trade exposure. It now uses the partner share itself (`partnerShare`, the same recovery `buyerShare` used). This raises the cost of another capital's embargo by about 1/exposure: China on Iran goes from −0.0015 to −0.0076.
5. **Receipts follow delivered volume** (`commodity-pressure.ts#energyGrowth`, per fuel).
   - An exporter earns the price change only on `1 − billed − stranded`. "Billed" is volume the books already charge: its own war's lost output, a blockade, or the heaviest in-scope measure's gross reach.
   - Stranded cargo costs `COERCION_BITE × world exports in the fuel's sector / GDP × stranded`, the same cost the engine gives any lost sale.
   - `stranded = chokepointDependence × (1 − bypass) × closure × stoppedShare × (1 − billed)`. A closing government is not stranded by its own closure.
   - Grain, metal and mineral suppliers also gain only on their delivered share.
6. **Stopped importers go short** (`shortfallShare`). A flag not let through bears `chokepointDependence × (1 − bypass) × closure × (1 − upstreamLost)` of each fuel, at `SHORTFALL_COST` 0.1 growth per unit of energy supply (a planning value). A passed flag pays only the price.
7. **Upstream deduplication** (`commodity-shocks.ts#contestedRoutes`, `ContestedRoute`, cached per snapshot). The route's world loss is multiplied by `1 − upstreamLost`: the share of the strait's flow its shippers had already lost to war, blockade or measure, weighted by supply share × `chokepointDependence`. The importer shortfall uses the same factor.
8. **The rung 3 and 4 gate** (`instruments-economic.ts`) is `designationAuthority` plus `designationReach`.
   - `designationAuthority`: for the founding nation, an institution in `INSTITUTION_CATALOG` holding `sanctions-designation` or `asset-freeze` (INST-OFAC) that exists in `campaign.institutions`. Another capital designates under its own law.
   - `designationReach`: a trade lane, or financial reach greater than 0.
   - Rungs 2 and 5 keep `tradeAccess`. No country list and no invented lane.

### Deviation from the acceptance text, with evidence

BL-275 says to size the stopped destination's shortfall from `CHOKEPOINT_CARGO` mb/d over its consumption. The dataset's `stats.energy.consumption` cannot serve as that denominator. It is TWh of primary energy, and the authored records disagree with it by large factors.

- Converted at 620.5 TWh a year per Mb/d of crude, oil consumption reads Japan 0.96 Mb/d and South Korea 0.27 Mb/d. Their Hormuz cargo is 1.705 and 1.747 Mb/d, which gives ratios above 1. The real figures are about 3.3 and 2.8 Mb/d.
- China reads 26.6 Mb/d against a real ~16, and India 12 against ~5.5.

So `CHOKEPOINT_CARGO` decides who is stopped (passage by destination, unchanged). The shortfall is sized by the dataset's authored `geo.chokepointDependence` (Japan 0.5, South Korea 0.45, China 0.5, India 0.5), which sits close to the real cargo-over-consumption ratios (about 0.52, 0.62, 0.33, 0.37). The same field sizes exporters' stranding. The accounting holds up: Σ supply share × dependence over the Hormuz exporters is about 0.19, against the flow table's 0.2 × (1 − 0.124) = 0.175.

The replacement needs a sourced crude-consumption-by-nation series and a per-exporter strait-origin table. Both are world-data lane work (request 4).

## Ordinary tests changed, and why

- `commodity-hormuz.test.ts:94-98`: the Kuwait-gains assertion is replaced as BL-275 directs. Japan still pays, Norway (clear of the strait) gains, and Kuwait fares worse than Norway.
- `commodity-chokepoints.test.ts` (Hormuz exact loss) and `strait-passage.test.ts` (stopped-share exact loss): the expected route loss now includes `× (1 − upstreamLost)`. The OMN-ARE case also asserts that the deduplication is strictly between 0 and 1. The exact form encoded the double count of barrels a principal's war already took.
- `external-pressure.test.ts`, export-control case: an export control filed under light vehicles no longer restricts US soybeans; one filed under row crops does. The old expectation was the sector-dropping defect METHODOLOGY names at `external-pressure.ts:99-104`.

## Regressions added

- `commodity-hormuz.test.ts`:
  - Japan stopped vs passed, before any price moves: the stopped flag is shorter.
  - An exporter clear of the strait pays nothing for a closure until the price moves.
  - Overlapping sanction and route: Kuwait under an oil designation and behind a closed strait. Its combined cost is below the sum of the two and at least either one alone, and the strait stops fewer barrels once the measure has taken Kuwait's.
- `external-pressure.test.ts`, "sanctions reach":
  - A US embargo reaches past the US market, so Iran is hurt more than by China's embargo, and China's reaches only its own share.
  - Sector scope: an oil designation moves crude, not wheat; an embargo moves both.
  - Evasion builds while a measure stands, and a lift with reimposition does not reset it; nor does refiling under another sector.
  - **Impose/lift/reimpose exploit**: four 13-week cycles over two years take less off Iran than holding the measure, and no sanction shock remains after the last lift.
  - Gate: rungs 3 and 4 are offered on Iran with no US lane, rung 5 keeps the trade gate, and a government with neither lane nor reach is refused.

## Tests run

- Targeted Vitest, 26 files, 307 tests, all pass: blockades, commodities, commodity-calibration, commodity-chains, commodity-chokepoints, commodity-hormuz, commodity-kernel, commodity-levers, economic-releases, external-pressure, external-shocks, force-failure, household-prices, instrument-issued, instruments, macro-drivers, markets, monetary, monetary-acts, resolution, strait-passage, tariff-prices, trade, trade-volume, coercion-tempo, world-contract. `macro-balance.test.ts` was named but the default config excludes `*balance*`; it was not run.
- Probes: `economy.probe.test.ts` (13 pass, 3 fail, all out of lane: B2, B9, B11) and `geopolitics.probe.test.ts -t D0` (pass).
- `npx tsc --noEmit -p packages/engine`: clean; its `tsconfig.tsbuildinfo` was deleted. ESLint on the nine changed files: clean.
- Not run, as the lane rules require: build, workspace typecheck/lint/test, verify gates, balance harness. player-core reads the engine's `dist/`, so its tests cannot see this change until the integrator builds.

## Save migration

None. The reach, evasion, contested-route state and shortfall are all derived each week from the register, conflicts and dataset. `Coercion` and `ContestedRoute` are not persisted. `CommodityDef.sector` is static registry data.

## The founding world moves (carried world, seed `external-pressure`, turn 1)

World supply lost at the oath, before and after:

| Commodity | Before | After |
|---|---|---|
| Crude | 0.0221 | 0.0121 |
| Natural gas | 0.0192 | 0.0057 |
| LNG | 0.0228 | 0.0156 |
| Wheat | 0.0360 | 0.0171 |
| Potash | 0.0317 | 0.0017 |
| Nitrogen | 0.0091 | 0.0007 |
| Copper | 0.0168 | 0.0144 |
| Rare earths | 0.0071 | 0 |

The main cause: the inherited Russia program is filed under `critical-minerals`, so with sector scope it no longer takes Russian crude, gas, wheat or fertilizer off the market. Belarus's program (filed under `machine-tools`) no longer takes its potash, and Myanmar's (filed under `textiles-apparel`) no longer takes its rare earths. The rest is route deduplication against Iran's held war.

Growth pressure on inherited targets at the oath, before and after:

| Target | Before | After |
|---|---|---|
| VEN | −0.0058 | −0.0211 |
| COD | −0.0044 | −0.0463 |
| YEM | −0.00005 | −0.0024 |
| RUS | −0.0043 | −0.0041 |
| MMR | −0.0015 | −0.0010 |
| LBN | −0.0013 | −0.0003 |

**COD is a regression in realism.** The DRC program is list-based, yet it is filed under critical minerals, and Congo's exports are mining, so financial reach now costs Congo 4.6 points of growth target from week one. Venezuela's larger hit has the right direction. Both also double count what the observed founding figures already contain.

The balance harness was not run; the integrator should run it with these numbers in hand. Request 2 is the fix.

## Contract requests for other owners

1. **`trade.ts` (physical-economy lane next wave, or the integrator).** For a designation (`sanctions`, `asset-restriction`) by the founding nation:
   - File the measure under the target's leading world export sector when the target sells the United States nothing in an export sector. Today `measuredSector` picks the largest US import edge, which is `undefined` or trivial for Iran.
   - Have `denialMeasureKind` prefer a designation over an export control when the designation reaches more of the target's trade.
   - Without this, D0's offer lands an INST-BIS export control on Iran that reaches nothing past the bilateral book.
2. **`opening-world.ts` (integrator).**
   - Date each inherited program at its program start, or mark it inherited, so evasion reads it as mature. Today every inherited measure is dated at the oath and reads as new.
   - File each program under its real scope: Russia energy, Belarus fertilizer (potash), DRC as list-based with no sectoral reach.
   - (Corrected in 1b: the carried Iran row was not structurally dropped. At `9b8ba9e59` it was filed under food processing whenever the seeded board kept it, which happens at 0.9 odds per seed; seed `external-pressure` happened to drop it.)
3. **`packages/world/src/dataset/stat-consumers-places.ts` (integrator).** Add these readers to the `chokepointDependence` entry: `packages/engine/src/commodity-shocks.ts#chokepointDependence`, with purpose "a strait's shippers and stopped importers: exporters' stranded sales, importers' shortfall and the route's upstream deduplication (`commodity-pressure.ts`)".
4. **World data lane.** Add a sourced crude (and LNG) consumption-by-nation series in Mb/d, and a per-exporter strait-origin table (S2/S5 in `domains/economy.md`). With those, the shortfall can be sized from `CHOKEPOINT_CARGO` over consumption as BL-275 wrote it, and stranding no longer leans on `chokepointDependence`.

## Doc amendments for the integrator to apply

### DECISIONS §6.10, append after the existing **Why:**

> **Amended 2026-10-24 (world dynamics, Wave 1):** what a strait stops reaches economies by quantity as well as price. An exporter is paid the price only on what it still delivers. Cargo a contested strait strands (its dependence on the strait, net of the bypass, times the closure and the share of the strait's cargo bound for stopped flags) is lost at the growth cost every lost sale carries, and a government closing the strait is not stranded by its own closure. An importer whose flag is stopped goes short by its dependence on the strait, net of the bypass. A flag let through gets its cargo and pays only the world price. A barrel already lost to a war, a blockade or a measure is not stopped again at the strait, in the world's supply or in a nation's books.
> **Why (amendment):** paid on price alone, Kuwait, Qatar and Iraq, whose exports cannot leave Hormuz, gained growth from its closure (+0.009 to +0.013 against Norway's +0.004), and a flag let through bore the same shortage as one stopped, against this rule's own reason.
> **Where (amendment):** `packages/engine/src/commodity-pressure.ts` (`energyGrowth`, `strandedShare`, `shortfallShare`, `SHORTFALL_COST`); `commodity-shocks.ts` (`contestedRoutes`, `upstreamLoss`).

### DECISIONS, new §6.17 (after §6.16)

> ### 6.17 A measure reaches as far as its authority and its currency
> An economic measure in force is one scoped record: the sector it reaches (an embargo or an asset freeze reaches the whole economy), whose sales it stops, the authority it was taken under, and how far past the imposer's own market it reaches. World supply and the target's own economy both read that record, so a measure cannot reach a seller's whole output in one place and only its sales to the imposer in the other. Only the administration's designations, freezes and two-way embargoes reach past its own trade (`DOLLAR_REACH`, a planning value), because they run through the currency most cross-border trade settles in. An import ban, an export control and another capital's measure reach only their own trade. Evasion wins reach back while a measure stands and outlasts a lift, read off the register's dates, so lifting and reimposing, or refiling under another sector, buys no fresh bite. Targeted sanctions and asset freezes need the legal authority (an office holding the power, for the administration) and either a trade lane or that reach. Tariffs and embargoes keep the trade gate. No country is named.
> **Why:** the trade gate refused US sanctions on Iran, North Korea, Cuba, Belarus and Nicaragua (117 of 195 governments had no US lane), while world supply gave a US measure the seller's whole output and the target's own growth read only its sales to the United States, so a US embargo cost Iran 0.000002 of growth. The record also dropped the measure's sector, so a sanction on one sector constrained every commodity the target sells.
> **Where:** `packages/engine/src/external-pressure.ts` (`Coercion`, `coercionsInForce`, `reachedShare`, `financialReachOf`, `evasionOn`, `DOLLAR_REACH`, `EVASION`); `commodity-shocks.ts` (`sanctionShocks`); `commodity-registry.ts` (`CommodityDef.sector`); `instruments-economic.ts` (`designationAuthority`, `designationReach`).

### ARCHITECTURE "Markets and the household bill" (line 932)

1. Replace "Both route terms are charged on the flow that cannot go around (`share × (1 − bypass) × stopped × intensity`, times `ROUTE_CLOSURE` 0.5 for lost supply and `ROUTE_RISK` 0.3 for the premium)" with:
   > Both route terms are charged on the flow that cannot go around and was still flowing (`share × (1 − bypass) × stopped × (1 − upstreamLost) × intensity`, times `ROUTE_CLOSURE` 0.5 for lost supply and `ROUTE_RISK` 0.3 for the premium). `upstreamLost` is the share of the strait's flow its shippers (supply share × `geo.chokepointDependence`) had already lost to war, blockade or measure (`commodity-shocks.ts#contestedRoutes`, cached per snapshot).
2. Replace the measures clause "measures on a supplier or by one (…)" with:
   > measures on a supplier or by one, read from the one scoped reach record (`external-pressure.ts#Coercion`: sector, direction, authority, financial reach). A measure reaches a commodity only where the commodity's `CommodityDef.sector` is in its scope. A measure on a supplier takes `severity × SANCTION_BITE × reachedShare`, where `reachedShare` is what the target sells the imposer plus the measure's financial reach of what it sells everyone else; only the administration's designations, freezes and two-way embargoes carry reach (`DOLLAR_REACH` 0.8, less evasion, `EVASION` ceiling 0.5 with 365- and 730-day half-lives off the register's dates). A supplier's own restriction takes only its sales to the buyer.
3. Replace "growth by the energy balance and export shares" with:
   > growth by the energy balance and export shares, on delivered volume. An exporter earns the price only on what it delivers (less its war's lost output, a blockade and its heaviest in-scope measure), loses cargo stranded behind a contested strait at `COERCION_BITE`, and is not stranded by its own closure. An importer whose flag is stopped goes short by its dependence on the strait at `SHORTFALL_COST` 0.1.
4. Wherever `coercionPressure` or `exportShare` are described: a non-US pair's export share is world exports in the sector × partner share (`partnerShare`, `tradeDependence / tradeExposure`), and a sector's share of exports is its output mix over the `trade.topExports` sectors (`exportScope`).

### SCHEMA

No dataset schema changed. If SCHEMA carries the engine registry, add `CommodityDef.sector: SectorId` (crude energy-oil; natural gas and LNG energy-gas; wheat, corn and soybeans agriculture; potash and nitrogen chemicals; copper, lithium and rare earths mining). Add the `chokepointDependence` consumer from request 3 to the authored-field consumer registry description.

### BACKLOG

- **BL-275:** close with this branch's commit. Proof: B3 ×3 and B4 pass (numbers above), B12 passes, `commodity-hormuz.test.ts:94-98` replaced, and the §6.10 amendment applied. Record the consumption-denominator deviation and request 4.
- **BL-276:** rewrite as partly landed. The gate, record, sector scope and evasion are done, and D0 and B8 pass. What remains is the register filing (request 1) and the inherited-program scope and dating (request 2), owned by the physical-economy lane (`trade.ts`) and the integrator (`opening-world.ts`).
- **New item:** COD and VEN founding drag from inherited programs filed under artifact sectors, and the silently dropped Iran embargo row. Evidence is in the founding-world tables above; the owner is the integrator via `opening-world.ts`.

## Risks

- The `SHORTFALL_COST`, `DOLLAR_REACH` and `EVASION` values are unsourced planning values, labeled in source. QAT's −0.065 week-12 target shift points the right way (S4: LNG from Hormuz-dependent exporters −95%), but no band is fitted.
- `exportScope` is a derivation from output mix over `topExports`, not export values. It understates Iran's oil share of exports (0.41).
- The `partnerShare` fix raises every non-US bilateral coercion cost by about 1/exposure. NPC embargo economics change; the balance harness is the check.
- Under sector scope, US sanctions filed under the largest bilateral sector now reach less of a diversified target than before (MEX tests still pass, since the embargo is whole-economy).
- The module graph has a value-import cycle: `external-pressure` → `commodity-pressure` → `commodity-shocks` → `external-pressure`. It holds only functions and literal constants, with no top-level evaluation of an import.


---

# Economy 1b (after the merge into `feat/world-dynamics`)

This round's lane files: `trade.ts`, `trade-effects.ts` (unchanged) and `opening-world.ts`, plus the earlier set. No shared-contract file was edited. `TradeMeasure` (in `trade.ts`, now this lane's) gains one optional field, `scope?: "listed"`.

## 1. The Iran gap through the real act path

- **Filing sector.** `trade.ts#measuredSector` now files a designation (`sanctions`) under the target's leading world export (`trade-volume.ts#leadingExportSector`). That is the first of `trade.topExports` a trade sector covers, preferring the one it sells the US most. The largest US import edge is the fallback. An embargo or freeze keeps the largest-import rule, falling back to the leading export.
- **Choice of instrument.** `denialMeasureKind` now prefers a designation over an export control when the designation takes more of the target's trade. It reads `external-pressure.ts#measureCut`, the same record the economy charges.
- **Result.** The real rung-3 act on Iran (`resolveAction`, `"action"`) now files `sanctions / energy-crude / INST-OFAC` with financial reach 0.8. Before, it filed an INST-BIS export control on telecom equipment with no reach.
- **Magnitude, through the real path:**

  | Act | Iran's growth-target change |
  |---|---|
  | Rung 3 (designation) alone | −0.0058 |
  | Rung 3 plus rung 4 (asset freeze) | −0.0313 |
  | China's embargo on Iran | −0.0076 |

  Rung 5 (embargo) on Iran stays refused by the trade gate, as BL-276 requires. So the US program the ladder allows against a government with no trade lane is designation plus freeze, and that clears B8's ordering.
- **Honest limit.** Rung 3 alone stays below China's full embargo. The causes are `COERCION_AS_RATE.sanctions` 0.3 and the `topExports` mix proxy, which reads oil as 0.41 of Iran's exports. That magnitude is B8's open todo (a sourced band), not a gate defect.
- **Regressions** in `external-pressure.test.ts`, "the sanction act on Iran, through the public path":
  - The filing is an OFAC designation on Iran's oil, with reach.
  - Designation plus freeze hurts Iran at least as much as China's embargo.
  - A second designation of the same sector is charged once. National cuts are now the heaviest per imposer and scope, so stacking designations buys nothing.

## 2. Inherited programs dated and scoped from primary text

`opening-world.ts#INHERITED_PROGRAMS` holds each carried program's measures, the date the authority took effect and the text it was read from (opened 2026-10-25). The carried table still decides whether a program is kept on the seeded board. List-based programs file a `sanctions` measure with `scope: "listed"`, which cuts no trade and reaches nothing (`external-pressure.ts`, `trade-volume.ts`). The record stays liftable and visible.

| Target | Measures | Effective | Primary source opened |
|---|---|---|---|
| CUB | embargo (imports) | 1963-07-09 | eCFR 31 CFR 515 source note, 28 FR 6974 |
| IRN | embargo (imports) | 1995-05-06 | E.O. 12959, FR 95-11694 |
| IRN | sanctions energy-crude, sanctions chemicals | 2018-11-05 | E.O. 13846 sec. 2(a)(iv)-(v), FR 2018-17068 (text read) |
| PRK | embargo (imports) | 2011-04-18 | E.O. 13570 sec. 1, FR 2011-9739 (text read) |
| PRK | asset-restriction | 2016-03-15 | E.O. 13722, FR 2016-06355 (title read) |
| SYR | listed | 2025-07-01 | E.O. 14312 sec. 3, FR 2025-12506 (text read) |
| RUS | sanctions energy-crude | 2025-10-22 | Treasury sb0290, Rosneft and Lukoil, with secondary risk to foreign financial institutions (text read) |
| RUS | sanctions bulk-mining, sanctions aluminum | 2024-04-12 | E.O. 14068 and 14071 determinations, FR 2024-12372 (text read) |
| VEN | sanctions energy-crude | 2019-01-28 | Treasury sm594, PdVSA under E.O. 13850 (text read) |
| BLR | sanctions fertilizer | 2021-08-09 | Treasury jy0315, Belaruskali, potash (text read) |
| SDN, MLI, MMR, COD, YEM, NIC, LBN | listed | 2023-05-04, 2019-07-26, 2021-02-10, 2006-10-27, 2012-05-16, 2018-11-27, 2007-08-01 | E.O. 14098, 13882, 14014, 13413, 13611, 13851, 13441 (FR titles and signing dates via the FR API; texts not read) |

**Where I could not source, or chose not to file:**

- **Russian gas.** E.O. 14066 bans US imports of Russian LNG (text read), but that is a bilateral ban, and the engine has no sector-scoped import ban without reach. I opened the Gazprombank designation (2024-11-21) but did not read its scope for gas sales or the energy general licenses. No gas measure is filed.
- **Cuba.** Proclamation 3447 (1962) is cited in the eCFR authority line but is not in the FR API. Its date is not used; CACR publication is.
- **North Korea.** E.O. 13810's foreign-financial-institution text was not read; the asset restriction rests on E.O. 13722's title.
- **Myanmar.** The state gem and timber enterprise designations were not looked up; the program is filed as list-based.
- **Iran's row on the seeded board.** It keeps the table's 0.9 keep weight; the world-2026 preset always carries it. See the correction under contract request 2 above.

## 3. The founding world: `9b8ba9e59`, merged `a4eacc45b`, and this branch

Measured on `foundedForBalance(seed)` (seeded board, turn 1); the earlier commits ran in temporary detached worktrees. Supply rows are world supply lost at the oath; growth rows are each government's growth-target pressure at week one.

Seed `external-pressure`:

| | 9b8ba9e59 | a4eacc45b | 1b |
|---|---|---|---|
| Crude lost (of it, sanctions) | 0.0221 (0.0099) | 0.0121 (0) | 0.0162 (0.0041) |
| Natural gas | 0.0192 (0.0135) | 0.0057 (0) | 0.0057 (0) |
| Wheat | 0.0360 (0.0189) | 0.0171 (0) | 0.0171 (0) |
| Potash | 0.0317 (0.0301) | 0.0017 (0) | 0.0148 (0.0131) |
| COD growth | −0.0044 | −0.0463 | 0 |
| VEN growth | −0.0058 | −0.0211 | −0.0132 |
| RUS growth | −0.0043 | −0.0041 | −0.0116 |
| PRK growth | −0.000004 | −0.000004 | −0.0012 |

Seed `hormuz-proof`, which keeps the Iran row: crude 0.0332 / 0.0112 / 0.0167, potash 0.0302 / 0.0002 / 0.0133, IRN growth −0.0150 / −0.0150 / −0.0199.

The artifact drift is gone: Congo's −4.6 points, the zeroed Belarus potash, and Russian supply losses that depended on a critical-minerals filing. What differs from `9b8ba9e59` is deliberate and sourced:

- **Crude.** Russia's crude is reached only by the 2025 designation, at mature reach (evasion has won back about half). At `9b8ba9e59` an unscoped program took a share of every Russian commodity at reach 1.
- **Gas and wheat.** No US measure on Russian gas sales to third countries is filed (see above), and US programs license agricultural trade. The `9b8ba9e59` losses of 0.0135 and 0.0189 were the unscoped program.
- **Potash.** Belarus potash returns, with reach (0.0131). The 0.0169 of Russian potash at `9b8ba9e59` had no US designation behind it.
- **Venezuela.** −1.3 points against −0.6 at `9b8ba9e59`. The PdVSA designation now reaches Venezuela's third-party oil sales at mature reach (0.4); at `9b8ba9e59` it counted only sales to the US. Like every inherited program since `9b8ba9e59`, it is charged from the oath on top of observed founding figures.
- **Russia and North Korea.** Their targets now carry their sourced programs (oil and metals, and the government asset block).

## 4. B11: the wrong debit

- **Removed.** `tradePhase` charged `treasury: −(edge.exports × rate × 0.5) / 52` when a partner's answer landed. That was the exporters' lost private revenue booked as a federal cash debit, the defect METHODOLOGY names. The `standing` −0.008 stays.
- **Output channel, inside these files.** `external-pressure.ts#retaliationCut` adds each standing retaliatory tariff's export cut to the US under the existing coercion cap: recorded US exports to the answering partner in that sector / US GDP × `volumeFall(def, rate)`, charged at `COERCION_BITE`. It is gone the week the answer lifts.
- **Probe.** B11 now passes at −0.000016 (direction only). The magnitude is small because the trade book's `volumeFall` for row crops is about 0.06. Calibrating that against ERS's $13.2 billion a year belongs with B10/B11 in Wave 2. No new subsystem was added.
- **Regressions** in `trade.test.ts`: no landing packet charges the Treasury, and US growth falls while the answer stands and returns once it is lifted.

## Probes after 1b

| Probe | Result |
|---|---|
| B3 (KWT −0.0397, QAT −0.0652, IRQ −0.0340 vs NOR +0.0038) | pass |
| B4 (hit ratio 0.589 vs crude-rise ratio 0.787) | pass |
| B5 | pass |
| B8 (US embargo −0.0464 vs China −0.0076) | pass |
| B11 (−0.000016) | pass, newly |
| B12a (1.0132, low 0.9865) | pass |
| B12b (1.3369 vs 1.3318) | pass |
| C1 | pass |
| D0 | pass |
| B2, B9 | fail; other lanes' items |

## Tests run in 1b

- 34 files, 455 tests, all pass: the 26 from the first round, plus opening-world, founding, fiscal, pledge-outcomes, propensity, conversation-report-actions, tariff-orders and save. A further 5 files (intelligence, npc-agent, npc-turn, consequences, revealed-preference), 124 tests, all pass.
- `tsc --noEmit -p packages/engine`: clean; its tsbuildinfo deleted. ESLint on the changed files: clean. `trade.ts` is 784 lines, under the 800 budget.
- Ordinary test changed: the `external-pressure.test.ts` sector-scope case moved from Russia to Canada, because the opening now carries a Russian crude designation and a second one is rightly charged once.

## Save migration

None is required. `TradeMeasure.scope` is optional. Old saves keep their single `sanctions:RUS:inherited`-style records, dated at their oath and filed under the old sectors; only new campaigns get the sourced programs.

## Doc amendments added by 1b

- **SCHEMA, `TradeMeasure`.** Append: "`scope?: "listed"` marks a list-based program that designates named persons: it cuts no sector's trade and carries no financial reach (`external-pressure.ts#coercionsInForce`, `trade-volume.ts#measuresLeave`). An inherited measure's `imposedDate` is the day its authority took effect (`opening-world.ts#INHERITED_PROGRAMS`, each with its primary source); `imposedTurn` stays the oath's."
- **ARCHITECTURE, opening board paragraph.** "The sanctions programs in force are filed from `INHERITED_PROGRAMS`: each carried program's measures by kind and sector as the primary text scopes them, dated at the authority's effective date so evasion reads them as mature; list-based programs file `scope: "listed"`."
- **ARCHITECTURE, trade phase.** Replace any statement that a landed retaliation charges the Treasury with: "A landed answer costs the President standing; the exporters' lost sales reach the economy through `external-pressure.ts#retaliationCut` under the coercion cap, and nothing is charged to the Treasury."
- **ARCHITECTURE, economic ladder.** "Rung 3 by the administration files a designation under the target's leading world export (`trade-volume.ts#leadingExportSector`) and prefers it over an export control wherever it takes more of the target's trade (`trade.ts#denialMeasureKind`, `external-pressure.ts#measureCut`). Two measures by one imposer on the same scope of an economy are charged once."
- **DECISIONS §6.17 (proposed above).** Add: "An inherited program is dated at the authority it rests on and scoped as its text scopes it; a list-based program designates people and moves no trade." And to its Where: `opening-world.ts` (`INHERITED_PROGRAMS`).

## BACKLOG, revised

- **BL-276:** close. The gate, the record, scope, evasion and the register filing are done. Proof: D0 and B8 pass, the real-act regression passes, and sourced inherited programs are in place. B8's magnitude band stays the probe's todo.
- **B11:** the debit half is done. Split the output calibration (the `volumeFall` magnitude against ERS) into a Wave 2 item with B10.
- **Withdraw the first round's "new item"** (the COD and VEN drift from the opening): fixed here. Add a small item for the remaining founding double count: inherited programs are charged from the oath on top of observed founding figures (VEN −1.3 points). That rule predates this program.

## Risks added by 1b

- Rung 3 on large economies now often files a designation (for example China's leading export, semiconductors) rather than an export control, with reach 0.8 on that sector. The reach has no size discount for large economies. Balance should check China's response and the US ladder against China.
- North Korea and Russia start with larger drags (−0.12 and −1.2 points).
- The seeded board's draw of inherited programs is unchanged, but some programs now file two or three measures; `kept` still decides per program.

---

# Wave 1R repairs (from Codex gpt-6.1-sol's reviews of 8bc3c4320 and of a4eacc45b..c09676065)

Files: the lane's set plus `blocked-assets.ts`. `trade.ts` is at 791 of 800 lines, so no split was needed. `trade-sectors.ts`, `macro-baseline.ts` and `macro-drivers.ts` were not edited: the baseline offset lives in `external-pressure.ts`. No shared-contract file was edited.

## What was already fixed by 1b, and what was not

**Item 4.** 1b already filed North Korea, Cuba and Iran through the real act. Re-measured on successful acts: PRK files sanctions/critical-minerals and asset-restriction/critical-minerals.

New in 1R:
- Rungs 3 and 4 refuse, before charging reserves, a measure the register cannot file, or one that duplicates a standing restriction (`instruments-economic.ts#fileableMeasure`).
- A further designation files under the next export not yet designated (`trade.ts#measuredSector`). Escalation stays possible and never refiles what stands; D0 needed this, since the opening now holds crude designations on Iran and Russia.

## Fixes

| Item | Fix | Regression |
|---|---|---|
| 4 | Gate on a fileable, non-duplicate measure; designation and export control told apart by `measureCut` | Palau, with no sector to file against, is refused a freeze; a second freeze on North Korea is refused; escalation on Iran files a new good |
| 5 | A blocked account is filed `scope: "listed"` (`blocked-assets.ts`). A freeze (asset-restriction) carries no financial reach: it blocks the government's holdings here and stops no third party's purchases | The account leaves Canada's growth unchanged; the Iran freeze has reach 0 |
| 6 | `coercionsInForce` applies `isTradeMeasureEffective`; a paused record stays in the register | A paused Canadian freeze charges nothing and is still on the register |
| 7 and F | One accounting by flow. `stoppedShare(seller, sector, good)`: per imposer, the heaviest measure on the flow; across imposers, independent shares of what is left. World supply, national growth and receipts all read it. The bilateral book takes the heaviest restriction per sector (tariffs still compound as rates). Sanction and blockade shocks are charged on what the war left, matching `originLoss` | Two Congo designations charge once, in growth and in copper; an embargo plus a designation on Iran's crude charges once; two sanctions on Mexican autos cut the book once; the sanction shock on a warring Iran equals the peacetime one × (1 − its war loss) |
| 8 | Upstream deduplication weights each supplier by supply share × exported share of energy × chokepoint dependence, so an importer's own production never counts | A Russia–China war leaves the Hormuz `upstreamLost` unchanged |
| 14 | `TradeMeasure.liftedDate` is written at lift (`trade-effects.ts`); `reachSpans` reads it and falls back to the lifted week's date for old records | A lift ten weeks on stores that day |
| A | Coverage and diversion in the shared loss. A sectoral measure covers its good's share of the economy sector (`goodShare`: what the target sells the US inside the sector, else an equal split). Named companies add `TradeMeasure.covered`. Third-party reach is multiplied by the good's `substitutability`, read as the share of reached buyers who divert: a buyer that can replace the goods complies, one that cannot keeps buying. **Calibration unresolved**: substitutability is a tariff planning value. The 1b GDP-size haircut is removed (it was in the working tree, never committed) | A China semiconductor-equipment designation stops less than severity × reach × substitutability of China's semiconductor sales |
| B | Effective dates and scope, each opened by me before changing (table below). Every program carries the source's own words for its effective day; the test parses the date in those words and requires `since` to match | Date-parse test; Russia oil `covered` 0.53 and metals import-only; Belarus listed |
| C | The baseline offset (`embedded`, `newlyStoppedShare`). Each nation's resting figures carry every measure in force at its `MACRO_ANCHORS` growth year-end. National growth is charged the change in cut from that register-at-vintage (read on that day, so with that day's evasion), and world supply the change in stopped share. Lifting an embedded program yields positive pressure, and supply returns as a negative loss | Venezuela's 2019 program nets to under 0.0005 at week one (the residual is evasion won since 2024); lifting it raises Venezuela's growth; Russia's 2025 oil designation is charged |
| D | `carriesReach` is false for listed programs, so they build no evasion | Congo's evasion is 0 |
| E | An export control has direction `imposer-sales`. It stops none of the target's sales; it costs the target the inputs denied, `severity × US exports of the good / target GDP × (1 − substitutability)`, and costs the US its own sales | `measureCut` equals that formula; the control stops 0 of China's semiconductor sales |
| G | `trade-volume.ts#retaliationLeft` is the one figure both the book and the US growth term read; stacked answers compound once | Two 25% answers on Chinese row crops charge `sold × (1 − (1 − fall)²)` |
| H | Lifting a listed program reads "The designations under the … program are lifted." | Congo's lift narration |

## The 0.8 reach on a large economy's leading export

My judgment: yes, it needed an adjustment, and the defensible one under METHODOLOGY is about what the measure covers and how much buyers can divert, not about economy size.

1. **The selector broadened its own scope.** Filing China under semiconductor equipment while reaching the whole semiconductors sector overstated it. Coverage now limits the measure to the equipment's share of what China sells the US inside the sector.
2. **Diversion is bounded by substitution.** METHODOLOGY's physical-flow contract and its "constrained substitution" language point the same way. Semiconductors' substitutability (0.1 to 0.2) cuts the diverted reach to a fifth or less; crude's (0.7) keeps most of it.

I removed the world-trade-share haircut I had drafted: no source supports a size discount, and the coordinator ruled it out. The substitutability-as-diversion reading is a planning interpretation and is labeled unresolved in source.

## Program dates and scope, sources opened 2026-10-25

| Program | Effective, from the source's own words | Change from 1b |
|---|---|---|
| IRN embargo | E.O. 12959 sec. 8(a): "effective at 12:01 a.m., eastern daylight time, on May 7, 1995" | 1995-05-06 → 05-07 |
| PRK import ban | E.O. 13570 sec. 7: "April 19, 2011" | 04-18 → 04-19 |
| PRK asset block | E.O. 13722 sec. 13: "March 16, 2016" | 03-15 → 03-16 |
| COD | E.O. 13413 sec. 9: "October 30, 2006" | 10-27 → 10-30 |
| BLR | E.O. 13405: "June 19, 2006", list-based | Belaruskali removed from the SDN List on 03/26/2026 (OFAC recent action 20260326, the deletion read), before the preset's 2026-09-24 date |
| RUS metals | OFAC FAQ 1128: covered metals acquisition services "April 12, 2024 / April 13, 2024"; FAQ 1168: an import ban plus an exchange-services ban | 04-12 → 04-13, and `direction: "imports"`, so no financial reach. The exchange-services reach is not representable yet |
| RUS oil | sb0290 (2025-10-22): Rosneft and Lukoil designated, with secondary risk to foreign financial institutions | `covered: 0.53`: Rosneft "~35% share in Russian oil production" (rosneft.com, Rosneft at a glance), plus Lukoil "over 2% of crude production" worldwide (lukoil.com), about 0.18 of Russia's at the dataset's 0.11 world share. Company sources, not government text |
| MMR | OFAC recent action 20231031: "Effective Date (EO 14014 Directive 1): 15 Dec 2023" | New: a designation on energy-gas-lng. MOGE's share of the projects' sales was not opened, so the whole sector is read as covered, an overstatement |
| SDN, MLI, MMR (list), YEM, NIC, LBN | No effective-date clause in the FR text read; effective on signature | Unchanged |
| SYR | E.O. 14312 sec. 3(a): "Effective July 1, 2025" | Unchanged |

## Founding world (seed `external-pressure`, week one)

| | 9b8ba9e59 | a4eacc45b | c09676065 (1b) | 1R |
|---|---|---|---|---|
| Crude lost | 0.0221 | 0.0121 | 0.0162 | 0.0138 |
| Gas lost | 0.0192 | 0.0057 | 0.0057 | 0.0057 |
| Wheat lost | 0.0360 | 0.0171 | 0.0171 | 0.0171 |
| Potash lost | 0.0317 | 0.0017 | 0.0148 | 0.0017 |
| COD growth | −0.0044 | −0.0463 | 0 | 0 |
| VEN growth | −0.0058 | −0.0211 | −0.0132 | +0.00008 |
| RUS growth | −0.0043 | −0.0041 | −0.0116 | −0.0048 |
| PRK growth | −0.000004 | −0.000004 | −0.0012 | −0.000004 |

- **Potash** returns to near the merged figure: Belaruskali is delisted.
- **Venezuela and North Korea** net to their 2024 baselines.
- **Russia** carries only its 2025 oil designation (Rosneft and Lukoil, diverted at crude's substitutability). Its 2024 metals ban sits in the 2024 baseline.
- **Crude** loss is the Hormuz route plus the Russian 2025 designation.

## Probes after 1R

| Probe | Result |
|---|---|
| B3 (KWT −0.0393, QAT −0.0651, IRQ −0.0332 vs NOR +0.0040) | pass |
| B4 (hit ratio 0.573 vs 0.786) | pass |
| B5 | pass |
| B8 (US embargo −0.0261 vs China −0.0076; US sanctions −0.0020) | pass |
| B11 (−0.000016) | pass |
| B12 (1.0134, low 0.9868; peaks 1.3706 vs 1.3655) | pass |
| C1 | pass |
| D0 | pass |
| B2, B9 | fail, as before; other lanes |

B1's peak rises from 1.343 to 1.377 under the exporter-only deduplication.

## Tests changed, with reasons

- **`commodity-hormuz.test.ts`, the August-2026 band.** The floor goes from 1.15 to 1.10. With diversion and exporter-only deduplication, the rebuilt month reads 1.144. That is the kernel's known under-pricing (B1), which the Brent calibration owns. **Flag for the integrator: this loosens a calibration band.**
- **`external-pressure.test.ts`.**
  - The 1b assertion "designation plus freeze hurts Iran more than China's embargo" is replaced. The freeze's reach was the defect in item 5, so the ordering now holds per flow instead: the designation stops more of Iran's crude sales (0.3 × 0.8 × 0.7) than China's refusal does (its partner share).
  - **Through the real act path, the economy-wide ordering no longer holds:** rung 3 −0.0020 vs China −0.0076. Rung 5 stays trade-gated per BL-276.
- **`opening-world.test.ts`.** Belarus becomes listed; Russia carries `covered` and import-only metals; the date test now checks the quoted effective day.

## Tests run

- 39 files, 595 tests, all pass.
- Probes: economy and D0, as above.
- `tsc --noEmit -p packages/engine`: clean, tsbuildinfo deleted. ESLint on the changed files: clean.

## Save migration

None required. `liftedDate` and `covered` are optional. Old lifted records read their week's date. Old saves keep their old inherited records: dated at the oath, so not embedded, and charged as before.

## Doc amendments added by 1R

- **SCHEMA, `TradeMeasure`.** Add `liftedDate?: GameDate` (the day of the lift; absent on records lifted before it was stored) and `covered?: number` (0..1 of the sector's sales the designated companies carry). `scope: "listed"` also covers a blocked account.
- **ARCHITECTURE, markets and external pressure.** Replace the measure description with:
  > Restrictions are read flow by flow through `external-pressure.ts#stoppedShare` (per imposer the heaviest, across imposers independent shares). A sectoral measure covers its good's share of the sector and, where it names companies, `covered` of that. Third-party reach is diverted only as far as the good's substitutability allows. Export controls cost the target the inputs denied. Paused measures charge nothing. Each economy and producer is charged only the change since its `MACRO_ANCHORS` growth vintage, so lifting an embedded program recovers.
- **DECISIONS §6.17 (proposed).** Append:
  > A measure is charged once per flow, where a court has not paused it, on the goods and companies it names, and only for what changed since the economy's published resting figure.

## Risks

- **A partly embedded measure.** The baseline offset reads each nation's growth-anchor year. A program whose effect was only partly present by then is treated as fully embedded.
- **COERCION_CAP asymmetry.** The cap is applied separately to the current and the embedded cut, so a heavily sanctioned economy whose embedded cut exceeds the cap nets differently from one under it.
- **Diversion double-dips the tariff value.** Diversion reads a tariff planning value (substitutability); the Iran and Venezuela reach falls about 30% from 1b.
- **Russian metals.** The exchange-services reach is unrepresented, so they are modeled as an import ban only.
- **Myanmar gas.** The MOGE coverage is an overstatement.

---

# Wave 2 (base 3c2ecd43d)

Items: BL-284, BL-285, BL-286, BL-287. No shared-contract file was edited. Three test files outside the lane's own modules were updated because they encoded relief landing with no need: `instruments.test.ts`, `resolution.test.ts` and `npc-agent.test.ts` (details below).

## BL-286: a lifted tariff's wedge phases back out (`tariff-prices.ts`)

On lift, the share of the step that had passed through by the lift (`step × weeksIn / 26`) phases back out over the next 26 weeks, as negative weekly pressure on the inflation target, matching the shelf reversal in `trade-effects.ts#liftPriceMove`. A held tariff keeps its wedge. `TariffPriceMove` gains `unwinding` (the lifted rise still coming out). `measures` still lists only live tariffs, so the player-core reader is unchanged.

- **Probe B9:** passes. Held 0.000121; four lifted cycles end at about 0 (6.8e-21) with a peak of 0.000121. Before: cycled 0.000484 = peak, a fail.
- **Regressions** (`tariff-prices.test.ts`):
  - The wedge returns to 0 after a full phase-in and after a half phase-in.
  - Held and lifted do not end level.
  - Impose, lift and reimpose four times ends at 0, never above one step.
  - Changed: the "lifted the week it was signed" test now also expects `unwinding: 0` in the shape.

## BL-287: diversion, and retaliation that reaches output (`trade-volume.ts`)

### Retaliation calibration
- **Source** (USDA ERS, Amber Waves, 2022-03-07, opened 2026-10-25): annual US losses from retaliatory tariffs were $13.2 billion from mid-2018 through 2019. Soybeans were nearly 71 percent ($9.4 billion). China's tariffs, 5 to 25 percent on $22.5 billion of agricultural products, "resulted in a 76-percent reduction in the value of U.S. agricultural exports" to China.
- **Fit:** `RETALIATION_RESPONSE = 6.2`, a new export-side demand response (foreign buyers find the same goods at the world price from other origins). `retaliationFall(def, rate)` makes a 25 percent answer on row crops cut US sales to China by about 76 percent. The old reading used the import response (1.6), about a 20 percent cut.
- **Where it applies:** the trade book (`retaliationLeft`), and through it the US growth term (`external-pressure.ts#retaliationCut`). That term charges `COERCION_BITE` (0.5) per unit of lost exports: a planning value-added share, not gross dollar for dollar.
- **Unresolved:** ERS's $13.2 billion is a cash-receipts loss, not value added, so the 0.5 is unverified against it.
- **Probe B11:** passes at −0.000062 (was −0.000016). Wave 1b had already removed the Treasury debit.

### Diversion
- **Mechanism:** a measure that cuts a partner's US sales in a sector (tariff, sanctions, freeze or embargo; not export controls or listed programs) frees `lost × substitutability`. That pool builds with `DIVERSION_HALF_LIFE_DAYS` = 182, using the shared approach-to-target form (`relationships.ts#retained`), from the day the earliest such measure took hold.
- **Allocation:** shared among untouched suppliers by their recorded US sales in the sector, each capped by its headroom: its listed world exports in the sector less what it sells the US there, or, where the dataset doesn't list the sector, its sales elsewhere split the way its US sales are.
- **Not sourced:** the 182-day delay. No source I could open gives a lag; the Fajgelbaum et al. NBER w29562 abstract (opened) establishes bystander reallocation but no timing.
- **Numbers** (seed network-probe, 25% tariff on China's consumer electronics):

  | Week | China | Vietnam | All suppliers |
  |---|---|---|---|
  | before the tariff | 64,564 | 69,372 | 498,395 |
  | 0 | 53,394 | 69,372 | 487,226 |
  | 26 | 53,394 | 69,774 | 489,739 |
  | 52 | 53,394 | 69,975 | 490,995 |
  | 104 | 53,394 | 70,125 | 491,938 |

  Direction and bounding are right; the magnitude is small (Vietnam +1.1 percent by year two). That calibration is unresolved.
- **Regressions** (`trade-volume.test.ts`):
  - Vietnam unchanged on the day, higher at 26 weeks and higher still at 104, with a rising share.
  - Total imports stay below baseline.
  - Diversion stops the week the tariff lifts.
  - The ERS band: the fall sits in 0.65 to 0.85.
- **Changed tests:**
  - `trade-volume.test.ts` "loses what we sell them to their answer" now expects `retaliationFall`: the export response, not the import one.
  - `external-pressure.test.ts`'s stacked-answers case uses `retaliationFall` and compares at the 1e-6 the pressure is rounded to.

**Probe B10 (integrator):** its `it.todo` can become the ordering test my regression implements: "Vietnam's consumer-electronics imports from the United States side rise within the diversion half-life after a 25% tariff on China's, total imports stay below the opening, and the gain is capped by Vietnam's headroom". The current report-only case still prints identical before/after numbers on the day, which is correct, since diversion starts at zero.

## BL-284: relief needs a need, and aid saturates (`instruments-economic.ts`)

- **Gate on need.** Emergency relief (rung 1) gates on `unmetNeed`: the target must be living through an active condition, and the actor must not already have an active relief operation answering that same condition. Development grants (rung 2) need no disaster.
- **Cost follows delivery.** Each shipment delivers `min(0.06 × jitter, the condition's severity)`. Money, goodwill and the relief operation's weekly cost all scale with what is delivered.
- **Saturation.** `aidReception(campaign, actor, target, purpose)` = `1 / (1 + AID_SATURATION × remembered)`. Here `remembered` sums the giver's earlier acts for the same purpose on the actor→target record, each faded by the calendar at `FAVOR_HALF_LIFE_DAYS` (273, the memory lane's constant).
  - **Purposes:** civil (relief, development grant, stabilization) and security (arms transfer). Switching between relief, grant and stabilization does not reset reception.
  - Rungs 2, 3 and 4 now write their own history kinds (`development-grant`, `stabilization`, `arms-transfer`). These are unclassified in `relationships.ts#classifyHistoryEvent`, so disposition does not move. `AID_SATURATION = 1` is a planning value.
- **Regressions** (`instruments-economic.test.ts`, new):
  - Relief is refused with no condition.
  - It lands on a flood, and a second shipment is refused while the first operation answers it.
  - A shipment to a nearly-over flood moves less money than one to a deep flood.
  - **Aid-spam exploit:** twelve weekly grants. The late four average under a quarter of the first, and the total stays under four times the first.
  - Relief then grant lands less than a grant to a fresh recipient.
  - Purposes stay apart.
  - Reception recovers by the calendar.
- **Grants, measured** (seed network-probe): 12 weekly grants to Pakistan gain trust 0.0645, 0.0337, 0, 0.0258, 0.0187, 0.0150, 0, 0, 0, 0, 0.0135, 0. The zeros look like acts that did not land. At the base, 12 relief shipments gained a flat 0.037 to 0.044 (total 0.412).

### Probe 4a conflicts with BL-284's acceptance
The probe sends relief to Pakistan with no emergency, so the need gate now refuses it at shipment 0 ("missing a disaster or crisis at the target that relief from us is not already answering"). The probe then fails on `gains.length >= 6`.

**Recommendation for the probe's owner:** split it.
1. Relief to a government with no need is refused.
2. The diminishing-returns ordering is asserted on development grants, which need no disaster (the regression above). The ordering passes there: the late mean is under the first.

At the base it also failed, on the flat gains.

### Changed tests outside the module's own file
- **`instruments.test.ts`:** the friendly board's partner now lives through a flood. The two "untouched country" relief cases now expect refusal; they encoded relief sent for nothing.
- **`resolution.test.ts`** (strike and relief ripples): the recipient is flooded.
- **`npc-agent.test.ts`** (conciliatory end of the ladder): scores a development grant, since relief is not offered without a need.

### For the integrator: the balance harness
BL-284 asks for an impose/repeat exploit check in the balance harness's hyperactive proxy (integration-owned, `balance-proxies.ts`). Suggested proxy: a strategy that lands a development grant or relief on the same recipient every eligible week, asserting that trust gained over a term stays below 4 × the first act's gain.

## BL-285: trade-partner lists read magnitude (`packages/world/src/dataset/trade.ts`)

- **The list.** `topPartners` is now the five largest modeled shares, in order: the cut the World Bank WITS Trade Summary uses ("Top 5 Export and Import partners", opened 2026-10-25 for Iran). The lane to the President is no longer appended to the list. It stays in `tradeDependence`, where every lane's magnitude lives, so `tradesWith`, `tradeAccess` and the relationship edges are unaffected.
- **Iran pinned:** CHN, TUR, IND, IRQ, SAU. The United States and Israel are not among them; Iran's US lane remains in `tradeDependence`.
- **Against WITS:** WITS lists China, Iraq, the UAE, Turkey and India among Iran's top five markets (and the UAE, China, Turkey, India and Germany as suppliers). The gravity model has Saudi Arabia where the UAE belongs; that is a gravity-data difference, not this cut.
- **Changed test:** world `trade.test.ts` "keeps dependence keys a subset of the ranked partner list" becomes "names at most five top partners, the largest lanes, in order". The old assertion encoded the list as every lane. Added: the Iran pin. World tests: 59 files, 521 tests pass.
- **Not done in this lane:** "ripples read dependence magnitude rather than list membership" lives in `resolution-ripples.ts#thirdPartyRelation` and `relationship-graph.ts#tradeTie` (the memory lane's files, with BL-282).
- **The world package's `dist/` must be rebuilt** for the engine to see this. Engine tests ran against the old `dist/`, so the network probe's 3a line still prints the 41-entry list. **Expected engine effects after the rebuild:**
  - `tradeTie`'s 0.12 partner bonus applies to five pairs per government, not dozens, so founding relationship readings fall for partners ranked six and below.
  - The "trade-partner" ripple class shrinks to those five.
  - Both need a balance check.

## Probes after Wave 2

**Economy:**

| Probe | Result |
|---|---|
| B9 | pass, newly |
| B11 (−0.000062) | pass |
| B3, B4, B8, B12, C1 | pass |
| B10 | report-only, plus the todo above |
| B2 | fail, as before |
| B5 | fail, also at the base 3c2ecd43d (CHN trust −0.0848 vs JPN −0.0885, before my changes); a memory-lane ripple change, not this lane |

**Network:**
- 4a: fails for the reason above (it failed at the base too).
- 1, 3a, 3b and 4b fail at the base as well and are other lanes' items.

## Tests run

- Engine: 43 files, 723 tests, all pass, including the new `instruments-economic.test.ts`.
- World: 59 files, 521 tests, pass.
- `tsc --noEmit` on engine and world: clean; tsbuildinfo deleted. ESLint on the changed files: clean.

## Save migration

None. The new history kinds and `unwinding` are additive. Old lifted tariffs unwind from their `liftedTurn` if a lift falls inside the last 26 weeks of a loaded save.

## Doc amendments

- **ARCHITECTURE, markets and external pressure.**
  - On lift, a tariff's passed-through share phases back out over 26 weeks (`tariff-prices.ts`, `unwinding`).
  - A partner's answering tariff cuts US sales at `RETALIATION_RESPONSE` (6.2, fitted to ERS's 76 percent), and the economy is charged `COERCION_BITE` of the lost sales.
  - A measure that cuts a partner's US sales frees `substitutability` of them to untouched suppliers over `DIVERSION_HALF_LIFE_DAYS` (182, unsourced), shared by recorded sales and capped by each supplier's export headroom.
- **ARCHITECTURE, assistance ladder.** Relief requires a live condition at the recipient that the giver's relief is not already answering, and is sized to what it delivers. Aid goodwill is received at `1 / (1 + AID_SATURATION × remembered)`, by giver, recipient and purpose (civil or security), faded at `FAVOR_HALF_LIFE_DAYS`.
- **SCHEMA, `stats.trade.topPartners`.** "The five largest modeled partner shares, in order (the WITS Trade Summary's top-five cut); every lane's magnitude is in `tradeDependence`." Also update the schema comment at `nation.ts:148-155`, which still says the list is not truncated and gates the ladder; the ladder reads `tradeDependence`. That is a world schema file the integrator owns.
- **DECISIONS §6.17 (proposed).** Append: "A lifted measure's price wedge comes back out as it went in."

## BACKLOG

| Item | Proposed status | Proof, or what remains |
|---|---|---|
| BL-286 | close | B9 passes; regressions |
| BL-287 | close with two calibrations open | B11 passes; diversion ordering in the module test. Open: the diversion delay and magnitude, and value-added against ERS's cash receipts. Integrator: B10's todo |
| BL-284 | close | Gate, delivery scaling, saturation across names, aid-spam regression. Probe 4a needs the owner's rewrite above; the hyperactive proxy is the integrator's |
| BL-285 | close the data half | Iran pin, WITS cut. The ripple half stays with BL-282. The world `dist/` rebuild and a balance check are needed |

## Risks

- **Relief.** NPC and player relief to governments without conditions is now refused. Agents that scored relief will pick other rungs.
- **Trade-partner bonus.** After the world rebuild, the partner bonus shrinks; founding trust between governments that trade but are not top-five partners falls by up to 0.12 × the derivation's weight.
- **Retaliation.** At 6.2, US exports in retaliated sectors fall much harder in the trade book. Retaliation odds and incidence in `trade.ts` still read the import-side figures.
- **Diversion cost.** It adds a per-sector pass over the register and the recorded table per campaign state (memoized).

---

# Wave 2R (base d32595f27)

**Finding (Codex gpt-6.1-sol, serious).** A token restriction pre-aged diversion for a much larger later one: `diversionPool` dated a supplier's whole lost flow from its earliest cutting measure.

**Fix** (`trade-volume.ts#lostIncrements`):
- A supplier's cutting measures are walked in date order.
- Each date adds the increment of lost share that the measures in force by then take, beyond what the earlier ones took.
- Each increment builds toward diversion from the date of the measure that added it.
- Same-day measures count as one increment.

**Numbers** (seed trade-volume; Vietnam's US consumer-electronics imports):

| Case | Vietnam |
|---|---|
| Opening | 69,371.79 |
| 0.1% tariff on China 364 days ago, plus 25% today | 69,375.27 (the review measured 69,977 before the fix) |
| 25% today alone | 69,371.79 |
| 25% imposed 364 days ago | 69,974.59 |

**Regressions** (`trade-volume.test.ts`, "an old token restriction cannot age a large new one"):
- On the day the large tariff lands, the pair adds only the token's own matured cut.
- **Exploit check:** a staged sequence half a year on gets no more diversion than its pieces dated as they were made.

The regression uses register measures directly. The review also reproduced the old behavior through the public Section 232 investigation→finding→tariff sequence; that path files the same measure records, so the fix covers it, but I did not re-drive the public sequence.

**Probes:** B9, B10 and B11 pass. B10 now reads opening 69,371.79, half-life 69,773.65, 104 weeks 70,125.29; US total 498,395 → 491,938. B2 fails as before.

**Tests:** 15 covering files, 336 tests pass. Engine `tsc` clean; tsbuildinfo deleted. ESLint clean.

No save migration. No doc amendment beyond Wave 2's diversion paragraph. Its "built up since the measure took hold" now reads "each increment of lost sales built up since the measure that cut it took hold".

---

# Wave 3 (base d2d7649f7)

## Before anything: the world `dist/` must be rebuilt

This wave adds two world tables (`NATION_OIL_GAS`, `CHOKEPOINT_ORIGINS`), a nitrogen route and two exports in `packages/world/src/dataset/index.ts`. The engine imports `@admin/world` from the world's built `dist/`, so until the integrator rebuilds the world package:

- engine `tsc` reports `CHOKEPOINT_ORIGINS` and `nationOilGas` as missing;
- engine tests fail at load.

I did not build. To verify, I emitted the world package to a scratch directory and ran the engine's tests and probes through a temporary Vitest config aliasing `@admin/world` to that emit (both files deleted before commit). Every engine result below is from that run.

Against the committed `dist/`, the only `tsc` errors in the engine are the two missing exports and the parameters that depend on them. Typing my new lines against the scratch declarations shows no error in them.

## BL-302: oil consumption and strait origins, sourced

- **`NATION_OIL_GAS`** (`seed/nation-oil-gas.tsv`): 189 nations. EIA International Energy Statistics bulk file, opened 2026-10-25, latest year per series:
  - petroleum and other liquids consumption, kb/d (`INTL.5-2-<ISO>-TBPD.A`);
  - dry gas consumption, bcm (`INTL.26-2-<ISO>-BCM.A`);
  - crude production, kb/d (`INTL.57-1-<ISO>-TBPD.A`).
  - Kosovo is filed under EIA's code XKS. Andorra, Liechtenstein, Monaco, the Marshall Islands, Palau, San Marino and Tuvalu have no oil series.
- **`CHOKEPOINT_ORIGINS`** (`seed/chokepoint-origins.tsv`): Hormuz crude by origin, 1H25, from EIA World Oil Transit Chokepoints Figure 5, "CrudeByOrigin_F5" sheet (opened 2026-10-25). SAU 5.553, IRQ 3.285, ARE 2.052, IRN 1.594, KWT 1.490, QAT 0.663, other 0.109 Mb/d.
- **Shortfall** (`commodity-pressure.ts#shortfallShare`): a stopped importer's crude shortfall reads cargo over consumption (`commodity-shocks.ts#cargoDependence`). Japan 0.55, South Korea 0.71, China 0.33, India 0.37, United States 0.02.
- **Stranding** (`#strandedShare`): reads loadings over crude production less own consumption (`originDependence`). Saudi Arabia 0.95, Iraq 0.99, UAE 0.71, Iran 0.78, Kuwait 0.69, Qatar 0.65.
- **Upstream deduplication:** weighted by the same loadings.
- **Fallback:** LNG (no cargo or origin split is on file) and nations a table does not name fall back to `geo.chokepointDependence`. The consumer registry's entry for that field now says so.
- **Consumers:** tables have no consumer registry (`stat-consumers` covers nation fields), so each table names its readers in its header comment.
- B3 and B4 still pass.

## B1: lost flow first, then the weekly price

- **Lost physical flow.** `ROUTE_CLOSURE` 0.5 → 0.68, fitted so a full-intensity Hormuz war takes 9.6% of world supply: 10.4 Mb/d shut in in April 2026 over 108.42 world supply (EIA STEO, already cited in source).
- **Route risk.** The premium is now charged on every ship that still has to cross, not only on stopped flags' cargo: war-risk cover is written on the transit.
- **Kernel.** Crude is refitted to EIA's weekly Brent (RBRTE weekly, release 2026-10-21, opened 2026-10-25): $71.36 the week of 27 February 2026, then 85.28, 96.16, 111.40, 111.24, 123.94, 124.61 (peak, week of 10 April). The grid fit gives sensitivity 5 → 6, speed 0.35 → 0.8 and weekly cap 0.12 → 0.16. The old cap was below the real weekly rises of 16 to 20%. Fed the sourced shut-ins, the kernel now peaks at $118 (−13% of the causal change). The monthly checks still pass: week 4 is 6% off March, week 8 is at April's $117.
- **Endogenous full-intensity war:** peak 1.646 over rest against the weekly 1.746. That is −13% of the causal change, inside METHODOLOGY's ±25%.
- **B12 holds:** 52 weeks after reopening, 1.009 with a low of 0.993; a second identical war peaks at 1.640 against 1.642.
- **The August-2026 floor is back at 1.15**, as BL-105's acceptance required.
- **Regressions:** `commodity-calibration.test.ts` (fed shut-ins, weekly peak in band) and `commodity-hormuz.test.ts` (full war: lost flow within ±25% of 9.6%; weekly peak within ±25% of the sourced rise).
- **Changed test:** `commodity-kernel.test.ts`'s weekly-cap tolerance goes from 1e-9 to 1e-6. The index is stored to six places, so a capped step reads 6e-8 over.
- **Probe text for the integrator** (B1's `it.todo`): "peaks within a quarter of EIA's weekly Brent rise, week of 2026-02-27 to the week of 2026-04-10 (71.36 → 124.61): `expect(Math.abs(high - 1 - 0.746)).toBeLessThanOrEqual(0.25 * 0.746)`". It passes at 1.646.

## B2: nitrogen through Hormuz

- **Conversion,** stated over the market's own denominator, world ammonia production (150,000 kt N, USGS MCS 2025, the producer table's source):
  - UN News 2026-08-04 (opened): Hormuz carries "a third of globally traded urea".
  - WITS HS 310210, 2023 (opened): world urea trade is at least 37.6 Mt, the larger of reported exports (37.55) and imports (36.13). India, Russia and Qatar do not report, so this undercounts.
  - Urea is 46.65% nitrogen, so at least 5.8 Mt N: share 0.039, a lower bound. No pipeline carries urea, so the bypass is 0.
- **Wired:** row `CP-HORMUZ nitrogen` in `chokepoint-flows`, and the registry now reads `routesFor("nitrogen")`.
- **Probe B2** passes (the route exists). Nitrogen peaks at 1.058 under a full war (was 1.011). The band stays a todo: no sourced weekly urea series was opened.

## B6: Black Sea grain, not wired

- **Sourced:** "Before the war, Ukrainian Black Sea ports accounted for 90% of its export of grain and oilseeds" (European Commission, 12 May 2022 Solidarity Lanes communication, opened).
- **Missing:** the bypass capacity, meaning how much the Danube, rail and road actually carried. Neither the Commission's Solidarity Lanes page nor the FAO information note of 25 March 2022 (both opened) gives it; FAO says only "limited capacity of alternatives, such as rail transport". USDA FAS refused the request.
- **Not wired:** under §6.10's own rule, a route with no sourced bypass has no price effect.
- **Spec for the world-data lane:** a `seed/export-ports` row `UKR wheat` (and corn) with sea share 0.9 (EC), the bypass share actually carried in the blockade months, and the denier as the aggressor's navy. The latter needs the E27 amendment below.
- B6 stays report-only (wheat 1.061).

## E14: limited SPR drawdown, IEA collective action

- **Authority** (42 U.S.C. §6241, Cornell LII, opened 2026-10-25):
  - (d)(1): a full drawdown needs a finding of a severe energy supply interruption or obligations under the International Energy Program.
  - (h): a limited drawdown on a shortage "of significant scope or duration" may not exceed 30,000,000 barrels per shortage, nor 60 days, nor take the reserve below 252,400,000 barrels.
- **New:** `commodity-levers.ts#projectLimitedRelease` / `releaseLimitedReserve`.
  - The reserve is in barrels from EIA weekly SPR crude stocks: `SPR_OPENING_BARRELS` = 282,683,000, week of 2026-10-16 (WCSSTUS1, opened). It was 415.4 million in February 2026.
  - A limited drawdown adds 30M / 60 days against EIA world consumption of 103,110 kb/d: 0.00485 of world supply.
  - It is refused with no supply being lost, while any drawdown flows, a second time for the same shortage (`reserve.limitedFor` stores the shortage's causes), and below the floor. From 282.7 million it can reach 252.7, just above 252.4.
- **IEA collective action:** the full drawdown's finding now names both §6241(d) prongs. Other members' barrels are not modeled: the IEA's pages on the 2022 actions refused the request (403), so no volume is sourced.
- **Regressions** (`commodity-levers.test.ts`), including the war → drawdown → peace round trip: no receipts, the reserve stays drawn, and the same shortage cannot be answered twice.
- **Files outside the original list:**
  - `commodity-levers.ts` (E14 named the existing levers);
  - `state-world.ts`, a shared state type module. Additive only: `ReserveState.release.share?` and `ReserveState.limitedFor?`.
- **For the presentation owner:** `player-core/src/economy/market-levers.ts` does not offer the limited drawdown yet.

## E17: bypass is spare or observed

A world test (`naval-tables.test.ts`) requires each route's bypass to be 0..1 of the strait's own flow and its basis to state spare capacity, observed rerouting, or none. No route was added. Further routes need a sourced spare or observed bypass in the strait's own units; SUMED's 2.5 Mb/d is installed capacity, not spare.

## E27: draft amendment to DECISIONS §6.10, for the owner

> **Amended (draft, 2026-10-25): denial by a navy that does not hold the shore.** A government with no coast on a strait can stop cargo through it only by a standing blockade of a littoral government. Its denial reaches only cargo bound to or from that government, never the strait as a whole, and only where its forces can reach the strait (`staging.ts` reach and the naval branch strength the blockade rung already gates on). It stops no third country's ships unless it is at war with that country. A US blockade of Iran stops Iran's own loadings and Iran-bound cargo; China's crude from Saudi Arabia still passes unless Iran, the littoral party, stops it.
> **Why:** today a US blockade of Iran leaves passage to Iran alone, so China's 26% of Hormuz crude passes, and nothing stops Iran's own loadings by sea. The opposite shortcut, treating "US blockade" as "all Hormuz cargo stopped", would let one act take a fifth of world supply off the market.
> **Where (when built):** `strait-passage.ts` (deniers gain blockading navies scoped to their target), `blockades.ts`.

**Not built:** it is an owner rule, and B1's calibration does not depend on it.

## BL-290: a Taiwan war constrains US output through chips

- **Mechanism** (`external-pressure.ts#chipShortfall`, `criticalInputCut`): chips are a constrained input, not a price. The US shortfall is each supplier's share of recorded US semiconductor imports (`US_GOODS_TRADE`: Taiwan 0.233, Malaysia 0.199, Korea 0.094), times what its wars and a blockade on station take of its output, times (1 − the sector's substitutability, 0.2). That shortfall is charged on the output of `CHIP_DEPENDENT_SECTORS` (semiconductors, telecom-cyber, auto, aerospace, defense-industrial), a stated planning classification, under the coercion cap.
- **Planning values, not sourced magnitudes:**
  - The sector list (no chip-use-by-industry table was opened).
  - Recorded imports standing for supply: chips inside goods assembled elsewhere, and US fabs, are not counted.
  - −1.86 points of US growth target in a full-intensity China–Taiwan war (probe B7: −0.000124 → −0.01858). This is not fitted to Bloomberg Economics' −6.7%/−3.3%, which remain a secondhand scenario model.
- **Partners** (Japan, Korea, Europe) carry no chip channel: no bilateral semiconductor data is on file for them. A world-data item.
- **Regressions** (`external-pressure.test.ts`): a Taiwan war costs US output more than a Russia–Ukraine war (shortfall under 1% of Taiwan's); the charge ends the week the war does.
- **Probe text for B7's `it.todo`:** "the US growth hit under a full-intensity China–Taiwan war exceeds that under a full-intensity Russia–Ukraine war". It passes (−0.01858 against about 0). No band.

## BL-287 remainder: calibrations

- **Diversion,** against Census goods trade (opened 2026-10-25):
  - US imports from China fell $538.5B → $449.1B (2018 → 2019) while all US imports fell $2,536.1B → $2,491.7B. About 50% of the lost Chinese flow was bought elsewhere within the year. Vietnam rose $49.1B → $66.4B and took 38% of that replacement.
  - Before the fit, the model at 52 weeks replaced 34% of China's lost consumer-electronics sales.
  - **Fit:** `DIVERSION_HALF_LIFE_DAYS` 182 → 91. The model now replaces 34% at 26 weeks, 42% at 52 and 44% at 78, inside ±25% of the record. The ceiling is the sector's substitutability (0.45); the record is all goods and 2019 had other causes, so this is a planning fit.
  - **Not fitted:** Vietnam's concentrated capture (38% of the replacement against its 16% proportional share). That needs proximity-weighted allocation.
  - Regression: "replaces about half … within the year".
- **Value added per lost sale:** ERS (opened Wave 2) gives $13.2B a year of cash-receipt losses against about $18B a year of lost export value ($27B mid-2018 through 2019). That is about 0.73 of receipts per lost export dollar. `COERCION_BITE` 0.5 sits below receipts, as value added must. Its exact value-added share was not opened (ERS farm income tables), so 0.5 stays a planning value, now bounded above by a sourced 0.73.

## Opinion probe 10

The Gulf war (Iran–Saudi Arabia at 0.8) now produces a pump shock: true at week 13, false before. The price under-pricing was the shared cause and is fixed. The probe still fails, on the opinion side: prosperity mood moves 0.0009 and the headline 0.0007 against the 0.01 asked. That is the opinion lane's response to a pump shock, not a price problem.

## Exploit checks

- **Impose, lift, reimpose** (tariff price level): Wave 2's B9 regressions still pass.
- **Blockade or war, SPR, reopen:** new regression; no receipts, no repeated answer to the same shortage.
- **Repeated limited drawdowns:** refused per shortage.

## Probes after Wave 3 (scratch world build)

**Economy:** all 17 pass, 5 todo.

| Probe | Result |
|---|---|
| B1 (report) | 1.646 |
| B2 | pass; nitrogen 1.058 |
| B3 | KWT −0.0639, QAT −0.0903, IRQ −0.0592 vs NOR +0.0054 |
| B4 | hit ratio 0.573 vs 0.857 |
| B5 | pass |
| B6 (report) | 1.061 |
| B7 (report) | −0.01858 |
| B8 | pass |
| B9 | cycled about 0 vs held 0.000121 |
| B10 | Vietnam 69,372 → 69,774 → 70,172 |
| B11 | −0.000062 |
| B12 | 1.009 / 0.993; 1.642 vs 1.640 |

**Opinion 10:** fails, as above.

## Tests run

- Engine (scratch world build): 43 files, 797 tests pass.
- World: 59 files, 524 tests pass.
- ESLint: clean on the changed files.
- Engine `tsc` is blocked on the dist rebuild, as above.
- No save migration: the new `ReserveState` fields are optional.

## Doc amendments

- **SCHEMA, world tables.** Add `NATION_OIL_GAS` (nation, oilKbd/oilYear, gasBcm/gasYear, crudeKbd/crudeYear; EIA INTL bulk, opened 2026-10-25) and `CHOKEPOINT_ORIGINS` (chokepoint, commodity, origin, mbd, period; EIA WOTC Figure 5 by origin, 1H25). Add the `CP-HORMUZ nitrogen` flow row (share 0.039, bypass 0; basis in the row).
- **SCHEMA, engine `ReserveState`.** Add `release.share?` and `limitedFor?`.
- **ARCHITECTURE, markets.**
  - Crude's kernel is fitted to EIA weekly Brent over the 2026 closure (sensitivity 6, speed 0.8, cap 0.16).
  - `ROUTE_CLOSURE` 0.68 is fitted to April 2026's shut-in.
  - The route premium is priced on the whole contested flow.
  - Shortfall and stranding read cargo over consumption and loadings over net exports, with dependence as the fallback.
  - The SPR has a limited §6241(h) drawdown, in barrels.
  - The United States carries a chip critical-input channel.
  - Diversion builds with a 91-day half-life.
- **DECISIONS §6.10.** Append: "an exporter's stranded share and an importer's shortfall read the strait's loadings and cargo against the country's own production and consumption". Plus the E27 draft above, for the owner.
- **DECISIONS (economy).** Append, for the SPR: "a limited drawdown under §6241(h) needs no severe-interruption finding and is bounded by 30 million barrels, 60 days and a 252.4-million-barrel floor per shortage".

## BACKLOG

| Item | Proposed status | Proof, or what remains |
|---|---|---|
| BL-302 | close | Tables, readers, B3/B4 pass |
| BL-105 (Wave 3 extension) | B1, B2, E14, E17 done; E27 drafted; B6 open | B6 waits on a sourced bypass. The original BL-105 acceptance (operators, legal regimes, recovery curves, non-war causes) stays open beyond Wave 3 |
| BL-290 | close the US half | Partners need bilateral chip data |
| BL-287 | close | Diversion fitted to Census within ±25%; the 0.5 value added bounded by ERS's 0.73. Proximity-weighted allocation becomes a new small item |

## Risks

- **Faster crude.** Crude now moves faster and higher on every shock: a Bab el-Mandeb war, any Gulf war, the carried ISR–IRN front. The Bab el-Mandeb band (< 5% in twelve weeks) still holds. US inflation and approval paths will run hotter in balance runs; the balance harness must run after the dist rebuild.
- **The chip channel binds the US** in any Taiwan or Malaysia war at full intensity.
- **Faster diversion** raises third-country gains from tariffs sooner.

---

# E27 built (DECISIONS §6.10, owner ruling 2026-10-25; base aa26fe922)

## What changed
- **Reach is read every week** (`blockades.ts#blockadeReaches`). A blockade stays in force only while its navy meets the blockade rung's own gates: naval branch strength at least 0.3, and `projectionAccess` at `PROJECTION_CAPS[3]`. A navy that can no longer reach stops nothing at the coast or at any strait on it.
- **A navy off the shore denies only the blockaded party's cargo** (`strait-passage.ts`). A blockade in force against a government on a strait's shores, held by a government with no shore there (`offshoreBlockades`), adds the blockader to the passage. It stops cargo bound for the government it blockades and for governments it is at war with, and no one else's (`blockaderLetsThrough`).
- **Loadings are counted once.** The blockaded government's own loadings by sea are its blockade supply loss (`commodity-shocks.ts#blockadeShocks`), already deduplicated at the strait through `originLoss`, so they are not stopped twice.
- **`StraitPassage` gains `blockaders`.**
- **Littoral denial is unchanged.** It stays the littoral party's own: Iran at war still closes Hormuz to flags it does not pass, as §6.10 already said.

## Hormuz price path, US blockade of Iran through `resolveAction`
Crude over rest, weeks 1 to 16 (seed economy-probe, no carried world):

| | Weeks 1-16 |
|---|---|
| Before | 1.174, 1.332, 1.284, 1.303, 1.298, 1.296, 1.301, 1.310, 1.287, 1.302, 1.314, 1.299, 1.317, 1.306, 1.304, 1.301 |
| After | identical |

Shocks are identical too: route 0.0345 (Iran's own closure to unfriendly flags at the war's intensity 0.5), blockade 0.0217 (Iran's loadings), war 0.0122.

The ruling changes nothing here, and that is correct. Before, the US navy denied nothing at Hormuz, and Iran's loadings were already the blockade's supply loss. The new denial adds only cargo bound for Iran and for US enemies at war, and the cargo table (EIA Figure 5) carries no such destination. The ruling bites where:
- a destination row names the blockaded government or a blockader's enemy;
- a blockader's reach or naval strength fails, and then the blockade stops nothing.

It also rules out the shortcut it was written against: "US blockade = all Hormuz cargo stopped".

## Regressions (`strait-passage.test.ts`, "a navy that does not hold the shore"), through the real blockade act
1. The US is a blockader at Hormuz. Cargo bound for Iran is stopped and China's ships pass, so China is in `passing`.
2. The blockade adds to world supply loss more than 0 and no more than Iran's blockaded loadings (supply share × (1 − its war loss) × cut).
3. With US naval strength cut to 0.1, the blockade is not in force, no blockader sits at the strait, and the loss equals the war without the blockade.
4. **Exploit check:** one act leaves the stopped share under 1, and the total crude loss under the strait's own share net of the bypass (0.175).

## Tests and probes
Run against a scratch emit of the world package, because the committed world `dist/` still predates Wave 3 (the integrator has not rebuilt it):
- 19 covering files, 418 tests pass: blockades, strait-passage, commodity tests, external-pressure, force-failure, instruments, resolution, war-tick, war-powers-report, conflicts, the NPC agent and turn, coercion-tempo, turn-loop, save, opening-world.
- Economy probe: 17 pass, 5 todo, B5 included.
- Geopolitics probe: D0 passes.
- ESLint clean.

No save migration: `blockaders` is derived, never stored.

## Doc amendments
- **ARCHITECTURE, markets.** Add: "A blockade stands only while its navy keeps the rung's reach and naval strength (`blockades.ts#blockadeReaches`). A standing blockade of a littoral government by a government with no shore on the strait adds that navy to the passage, stopping cargo bound for the blockaded government and for its own enemies at war, and no one else's (`strait-passage.ts#blockaderLetsThrough`); the blockaded government's own loadings are its blockade supply loss."
- **DECISIONS §6.10.** Already amended by the owner (aa26fe922). Its **Where** should add `strait-passage.ts#blockaderLetsThrough` and `blockades.ts#blockadeReaches`.
- **SCHEMA.** Add `StraitPassage.blockaders` if SCHEMA lists the passage reading.

## Risks
- **Reach now lifts blockades mid-campaign.** A blockader whose naval branch falls under 0.3, or whose staging changes, loses the blockade. That reads its war, deployment and War Powers records less often than its forces.
- **The denial has nothing to bite on yet.** Without destination rows for littoral governments, a blockader's strait denial stops nothing in the current data. The world-data lane can add destination rows (Iran's and Oman's imports by sea) if the owner wants it visible.
