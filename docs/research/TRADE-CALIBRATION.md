# Trade calibration and source record

Research only. Nothing here is implemented. This is the evidence a later phase
would build a sectoral trade network from, plus an honest account of what the
engine does today and what the literature will and will not support.

Repo state read at commit `dc832315` (branch `feat/exec-ops-composition`),
2026-09-01. Every empirical claim below carries a citation to a document that
was opened for this note. Claims that could not be verified from a source I
actually opened are marked **[unverified]**.

---

## 1. What the tariff model actually does at HEAD

### 1.1 The mission's claim, checked

The claim under test was that a tariff in this game is essentially "treasury
delta plus bilateral relationship." **Confirmed for the instrument rung, and
incomplete as a description of the whole model.** There are three separate
places where a tariff exists at HEAD, and they do not talk to each other.

**(a) The instrument rung.** `packages/engine/src/instruments.ts:282-292` is
the entire "Tariff Increase" action:

```ts
    id: "economic-2",
    name: "Tariff Increase",
    gate: (ctx) => tradeAccess(liveNation(ctx.campaign, ctx.actor), ctx.target),
    resolve: (ctx) => [
      { kind: "relationship", from: ctx.actor, to: ctx.target, deltas: { tradeDependence: -0.05 * jitter(ctx) } },
      { kind: "metric", deltas: { treasury: 50 * jitter(ctx) } },
    ],
```

So the act is: one bilateral `tradeDependence` decrement of 0.05 (jittered
plus or minus 10 percent by `jitter`, `instruments.ts:106-109`), and a flat
`+50` treasury metric. The gate (`instruments.ts:266-269`) only asks that a
trade channel exist at all (`tradeDependence !== undefined && > 0`). The claim
is correct: treasury delta plus bilateral relationship, and nothing else.

What is absent from the rung, stated plainly:

- **No rate.** A tariff has no magnitude. There is no 10 percent versus 25
  percent; there is one button.
- **No sector.** The act cannot name steel or soybeans, even though the
  dataset has a closed 23-value `SectorId` enum
  (`packages/world/src/schemas/sector.ts:13-37`) and the engine already emits
  `kind: "sector"` effects elsewhere (`instruments.ts:145-164`, the embargo).
- **No price.** Nothing moves inflation, a consumer price, or a producer
  price. The wire copy at `packages/engine/src/wire.ts:73-79` says
  "importers are paying the new rate," which is a sentence no state in the
  simulation can be in.
- **No import volume.** The target's `trade.imports` and `trade.balance` are
  untouched. Only rung 5, the embargo, moves trade quantities
  (`instruments.ts:341`).
- **No incidence.** Nobody in the acting nation pays anything. The treasury
  goes up by 50 and no household, firm or sector is worse off.
- **No retaliation.** There is no reply mechanism at all; the target's NPC
  turn may or may not choose an unrelated instrument.
- **Constant revenue regardless of trade size.** `+50` is the same against
  Canada and against Fiji.
- **Repeatable without limit.** Unlike rungs at the top of three ladders
  (`notAlreadyStanding`, `instruments.ts:182-184`), rung 2 can be fired at the
  same target every week forever, each time paying 50.

**(b) The fiscal layer.** `packages/engine/src/fiscal.ts:64-69, 83, 118-134`
holds the only tariff quantity that answers to policy. Revenue is a fixed mix
(`REVENUE_MIX.tariff = 0.03` of total receipts) re-priced by the standing trade
program: `trade-open` x0.4, `trade-managed` x1.4, `trade-protective` x3. The
comment at `fiscal.ts:124-127` is careful and correct in spirit: the tariff line
is re-priced rather than added to, with the difference taken proportionally out
of income, corporate and other, "it moves where the same claim on it is
collected." But the multiplier is a stance-level dial with no tariff rate, no
import base, and no elasticity behind it.

**(c) The policy stance.** `packages/engine/src/policy.ts:313-327`
(`trade-protective`) is the only place a tariff touches prices: per-turn
`treasuryOfGdp -0.002`, `stability +0.01`, `standing -0.01`, and nation effects
`growth -0.0005`, `inflation +0.0012`, `unemployment -0.0008`,
`diplomaticReach -0.0015`. These are macro nudges attached to a stance, not
consequences of an act.

### 1.2 The three do not compose

Firing `economic-2` twenty times does not move the `fiscal.ts` tariff line by
one dollar, does not change the trade stance, and does not raise inflation.
Adopting `trade-protective` does not make `economic-2` collect more. A player
can be a free trader by policy and a serial tariffer by instrument at the same
time with no contradiction visible anywhere on the board.

### 1.3 What the dataset already supports (do not fork this)

Any sectoral trade work should extend what exists rather than invent a second
vocabulary:

- `packages/world/src/schemas/sector.ts:13-37` - the closed 23 `SectorId`s,
  deliberately ISIC/GICS-broad, with a comment forbidding invented ids.
- `packages/world/src/schemas/nation.ts:110-122` - `trade.exports`,
  `trade.imports`, `trade.balance`, `topExports: SectorId[]` (max 10),
  `topPartners: NationId[]` (max 45), `tradeDependence: Record<NationId, 0..1>`.
- `packages/world/src/schemas/nation.ts:124-133` - `energy.mix` and
  `energy.importDependence`.
- `campaign.sectors[nation][sector]` runtime with `employment` and
  `laborPressure`, already written by the embargo path
  (`instruments.ts:145-164`).

**There is no bilateral-by-sector trade matrix anywhere.** `tradeDependence` is
one scalar per ordered pair. That single absence is the whole reason a tariff
cannot be aimed at anything, and it is the load-bearing schema change a
sectoral network needs.

---

## 2. Proposed strategic sector taxonomy (28 sectors)

Not HTS codes, not NAICS. The test for a slot is: **has a US president in the
modern record had to make a distinct decision about this, with a distinct
constituency, a distinct instrument, and a distinct foreign counterpart?** If
two candidate sectors always move together on all four, they are one sector.

Each row names the existing `SectorId` it should roll up into, so the trade
taxonomy is a refinement of the closed 23 rather than a fork of it.

| # | Trade sector | Covers | Rolls up to `SectorId` | Why it earns a slot |
|---|---|---|---|---|
| 1 | `semiconductors` | Logic, memory, analog, packaging and test | `semiconductors` | The single most instrumented good in current US policy: Section 301 action on PRC semiconductor dominance concluded Dec 2025 (90 Fed. Reg. 60848), plus export controls, plus subsidy |
| 2 | `semiconductor-equipment` | Litho, deposition, etch, metrology; EDA tools | `semiconductors` | A different decision from chips: this is a BIS/ECRA chokepoint, licensed not tariffed, and allied concurrence is the whole game |
| 3 | `consumer-electronics` | Phones, laptops, appliances, TVs | `telecom-cyber` | Where a tariff meets a shelf price a voter reads; the washing-machine case is the cleanest pass-through evidence we have |
| 4 | `telecom-equipment` | Network gear, base stations, routers, undersea cable | `telecom-cyber` | Security-coded rather than price-coded; Entity List rather than tariff |
| 5 | `autos-light-vehicles` | Finished cars and light trucks | `auto` | Section 232 automobile tariffs, 2025- ; a named electoral geography |
| 6 | `auto-parts` | Powertrain, electronics, stampings, tires | `auto` | Rules of origin and input costs; a parts tariff hits the same plant the vehicle tariff was meant to protect |
| 7 | `aerospace-civil` | Airframes, engines, avionics, MRO | `aerospace` | The largest single US export surplus category and the standing target of EU counter-lists |
| 8 | `defense-articles` | USML items, munitions, platforms, FMS cases | `defense-industrial` | Not a tariff object at all: State/ITAR licensing and FMS. Belongs in the taxonomy precisely so the game learns it is not tariffable |
| 9 | `shipbuilding-maritime` | Hulls, yards, cranes, logistics services | `ports-shipping` | Live Section 301 action on PRC maritime, logistics and shipbuilding (90 Fed. Reg. 50947, suspended one year in Nov 2025) |
| 10 | `machine-tools` | CNC, robotics, industrial machinery | `steel-heavy` | Section 232 investigation into robotics and industrial machinery opened Sept 2025 (90 Fed. Reg. 46382); the classic input-cost sector |
| 11 | `steel` | Carbon, alloy, stainless, tube, rebar | `steel-heavy` | The single most litigated tariff object in US history: 2002 safeguard, 2018 Section 232, and the one sector where foreign exporters demonstrably ate part of the tariff |
| 12 | `aluminum` | Primary, secondary, semi-fabricated | `steel-heavy` | Different rate, different smelters, different power politics from steel; 2018 set steel at 25 percent and aluminum at 10 |
| 13 | `critical-minerals` | Rare earths, lithium, cobalt, graphite, gallium, processing | `mining` | The chokepoint the other side owns; an export-restriction sector, not an import-tariff sector |
| 14 | `bulk-mining` | Iron ore, copper, coal as commodity, potash rock | `mining` | Distinct from processed critical minerals in both price behavior and geography |
| 15 | `fertilizer` | Ammonia, urea, phosphates, potash | `chemicals` | Gas-price-coupled, import-dependent, and a farm-state price the president is blamed for within one season |
| 16 | `agriculture-row-crops` | Soy, corn, wheat, sorghum, cotton | `agriculture` | The retaliation target of record: soybeans alone were 71 percent of 2018-19 US farm retaliation losses |
| 17 | `agriculture-livestock` | Pork, beef, poultry, dairy | `agriculture` | Separately targeted, separately perishable, separately organized |
| 18 | `agriculture-specialty` | Fruit, nuts, vegetables, wine | `agriculture` | Florida citrus and California nuts are the named icons of counter-lists going back to 2002 |
| 19 | `food-processing` | Packaged food, beverages, spirits | `food-processing` | Bourbon and orange juice are chosen by retaliators for symbolism, not tonnage |
| 20 | `energy-crude` | Crude oil, condensate | `energy-oil` | Priced globally; a tariff on it is a tax on the pump price within weeks |
| 21 | `energy-refined` | Gasoline, diesel, jet fuel | `energy-oil` | Refining is regional and the political object is the retail price, not the barrel |
| 22 | `energy-gas-lng` | Pipeline gas, LNG, liquefaction | `energy-gas` | The export instrument of the last decade; supply is contract-bound and slow |
| 23 | `chemicals` | Petrochemicals, plastics, industrial gases | `chemicals` | The largest intermediate-input sector; a tariff here is an input-cost shock to twenty others |
| 24 | `pharmaceuticals-finished` | Branded and generic finished dose | `pharma` | Price and shortage are the same story to a voter, and the instrument is as often procurement as tariff |
| 25 | `pharmaceutical-ingredients` | APIs, precursors, excipients | `pharma` | A different dependence and a different country mix from finished dose; this is where the shortage actually starts |
| 26 | `medical-devices` | Devices, diagnostics, PPE | `healthcare` | The 2020 lesson: a stockpile question wearing a trade question's clothes |
| 27 | `textiles-apparel` | Yarn, fabric, apparel, footwear | `textiles` | The historical tariff sector, still the largest consumer-price transmission by volume, and the de minimis fight lives here |
| 28 | `batteries-solar` | Cells, modules, packs, inverters | `energy-renewables` | Section 201 safeguard on solar ran 2018-2026; the one sector with a live safeguard, a live 301, and a live subsidy simultaneously |

**Deliberately excluded:** lumber and building materials (a real perennial with
Canada, but it collapses into `housing-construction` politically), civil nuclear
and uranium (thin trade, heavy licensing, better modeled as a treaty object),
and all services. Services are the largest US export surplus and the taxonomy
above is goods-only. Modeling US trade as goods-only overstates the deficit and
understates what retaliation could reach. Flag this as a stated abstraction, not
an oversight.

---

## 3. Tariff pass-through

### 3.1 The headline range

**At the border, into duty-inclusive import prices: 85 to 100 percent of the
statutory rate, essentially complete, within one to two months. Central value
0.95.**

**At the shelf, into US consumer prices: 5 to 100+ percent, with a central
value far below the border figure and a lag of 3 to 12 months. Do not reuse the
border number here.**

These are two different quantities and the literature is consistent that they
differ by a large factor. Conflating them is the single most common modeling
error available.

### 3.2 The border evidence

- Fajgelbaum, Goldberg, Kennedy and Khandelwal, "The Return to Protectionism,"
  QJE 135(1):1-55 (2020), read in the NBER w25638 revision. Estimated inverse
  foreign export supply elasticity `omega* = -0.002 (se 0.05)`: they "cannot
  reject a horizontal supply curve," which is complete pass-through. Their event
  study finds "no differential change in before-duty import prices between
  targeted and untargeted source countries exporting the same product."
- Amiti, Redding and Weinstein, NBER w25672 / JEP 33(4):187-210 (2019):
  "complete passthrough of the tariffs into domestic prices of imported goods,"
  with a US real income reduction of $1.4 billion per month by end-2018.
- Amiti, Redding and Weinstein, NBER w26610 (2020), the longer-horizon check:
  with another year of data including the escalations, "U.S. tariffs continue to
  be almost entirely borne by U.S. firms and consumers."
- Cavallo, Gopinath, Neiman and Tang, AER: Insights 3(1):19-34 (2021), using
  BLS border microdata: the estimated ex-tariff price coefficient is `-0.057`,
  meaning "a 10 percent tariff would be associated with a 0.6 percent lower
  ex-tariff price and a 9.4 percent higher overall price faced by the importer."
  That is 94 percent pass-through at the border. Adding exchange-rate and
  foreign-PPI controls drives the tariff response to statistically zero.

### 3.3 The warning: do not cargo-cult 0.95 as universal

Four documented deviations, each with a mechanism:

1. **Undifferentiated goods and commodities absorb a real share.** Cavallo et
   al. split by the Rauch (1999) classification: differentiated goods had "no
   statistically significant decline in their pre-tariff export prices," while
   "the ex-tariff price of undifferentiated goods, such as agricultural goods or
   commodities, by contrast dropped by more than 25 percent of the tariff rate."
   Those goods were under 10 percent of affected US imports in 2018, which is
   why the aggregate looked complete. In a game where the president can tariff
   crude, soybeans or bulk minerals directly, that share is no longer small.
2. **Steel is the named exception.** Amiti, Redding and Weinstein (w26610) find
   that in steel "tariffs have caused foreign exporters to drop their prices
   substantially, enabling them to export relatively more than in sectors where
   tariff passthrough was complete." A model that gives steel the same
   pass-through as furniture will get the most-tariffed sector in US history
   wrong.
3. **Consumer prices are muted, sometimes drastically.** Cavallo et al. on two
   top-ten US retailers: a 10 percent tariff raised the price of a typical
   affected import from China by "about 0.35 percent relative to unaffected
   products in the same sector after 1 year," with an alternative specification
   giving 0.8 to 1.6 percent. That is 3.5 to 16 percent retail pass-through
   against 94 percent at the border. Retail gross margins on affected goods fell
   from 80-90 percent to 60-70 percent. The incidence sat with US firms, not
   consumers, in the first year, and the authors expect it to shift later.
4. **Consumer prices can also exceed 100 percent.** Flaaen, Hortacsu and
   Tintelnot, AER 110(7) (2020), NBER w25767: the 2018 washer tariffs raised
   washer prices "nearly 12 percent" and dryers, "a complementary good not
   subject to tariffs, increased by an equivalent amount," implying "a tariff
   elasticity of consumer prices of between 110 and 230 percent." Domestic
   producers raised prices under the umbrella, and the untariffed complement
   went along.

The honest reading: pass-through at the border is near-complete and stable;
pass-through to the citizen is sector-specific, market-structure-specific, and
ranges over more than an order of magnitude. **A single global constant is
defensible at the border and indefensible at the shelf.**

### 3.4 Direction of the incidence, by good class

Broda, Limao and Weinstein, "Optimal Tariffs: The Evidence," NBER w12033, adds
a complication worth recording rather than smoothing over. Estimating inverse
export supply elasticities for 15 non-WTO importers, they find the median
inverse elasticity is 1.6 overall, "between 1 and 3 for the typical 4-digit HS
good," and that importers "face much flatter export supply curves for
commodities, where the inverse elasticity is 0.5, than for differentiated
products, where it is 2.4" - that is, more buyer market power in differentiated
goods, with soybeans, barley and natural gas below 0.1.

That is the **opposite** ordering from what Cavallo et al. measure for the
United States in 2018, where commodities were the goods whose foreign price
fell. The reconciliation is sample: BLW measure small non-WTO importers, who
cannot move a world commodity price; the United States can, because it is a
large enough buyer of soybeans and crude that its own demand shift moves the
world price. **For a game where the player is the United States, use the
Cavallo ordering (commodities absorb, differentiated manufactures do not) and
record BLW as the reason not to generalize the rule to the 49 other nations.**

---

## 4. Import demand elasticity and substitutability

FGKK (QJE 2020) estimate a nested demand system, and the nesting is the useful
part for a game because it says at what level a tariff bites:

| Elasticity | Meaning | Estimate | Uncertainty |
|---|---|---|---|
| `sigma` | Substitution across source countries within a product (variety) | 2.53 | se 0.26; bootstrapped 90% CI [1.75, 3.02] |
| `eta` | Substitution across imported products within a sector | 1.53 | se 0.27 |
| `kappa` | Substitution between domestic goods and imports within a sector | 1.19 | se 0.49 |
| `sigma*` | Foreign demand for US export varieties | 1.04 | roughly unitary |
| `omega*` | Inverse foreign export supply | -0.002 | se 0.05; horizontal not rejected |

The quantity cascade those imply, and the most important single fact in this
document for game design:

> "Imports of varieties targeted by U.S. tariffs fell on average 31.7%; imports
> of targeted products fell 2.5%; and imports in targeted sectors fell 0.2%."
> (FGKK 2020)

A tariff on China moves Chinese shipments of that good enormously, moves total
US imports of that good slightly, and moves the sector barely at all. **A game
that reports the 31.7 percent as "imports fell by a third" is lying by an order
of magnitude.** Three different numbers, three different screens.

Broader elasticity context: Broda and Weinstein (QJE 2006) report far higher
substitution elasticities from cross-sectional variation (an average around 6.6
at SITC-5 and 12.6 at the tariff line for 1990-2001 US imports) **[unverified -
these figures come from a search summary of the paper; I opened the related BLW
w12033 but not Broda-Weinstein 2006 itself]**. FGKK note their own estimates are
"lower than those obtained from cross-sectional variation but in the range of
estimates from time-series." Use the FGKK numbers, which come from actual tariff
variation, and treat the higher cross-sectional numbers as the upper bound of
plausible substitutability.

**Sector deviations to model, with the mechanism rather than a number:**

- `energy-crude`, `energy-refined`: very low short-run demand elasticity, high
  supply substitutability across sources. Import share moves fast, quantity
  demanded barely at all. **[unverified - I did not open a primary source for
  petroleum demand elasticity in this pass; this is a design flag, not a
  calibration.]**
- `semiconductors`, `semiconductor-equipment`, `aerospace-civil`,
  `pharmaceutical-ingredients`: near-zero short-run substitutability, because
  qualification, certification or fab capacity is the constraint, not price. A
  standard `sigma = 2.53` badly overstates how fast these reroute.
- `agriculture-row-crops`, `bulk-mining`: highest substitutability across
  origins on the import side, and on the export side the reason retaliation
  hurts (buyers can go to Brazil in one season).
- `textiles-apparel`, `consumer-electronics`: high origin substitutability, and
  the reason the 2018 war reallocated to Vietnam rather than reshoring.

---

## 5. Retaliation

### 5.1 Base rate

From FGKK Table I Panel B (2018), the only clean modern count:

- **Six trading partners retaliated**: China, Mexico, Turkey, the EU, Canada,
  Russia.
- Retaliation covered **$127.1 billion, 8.2 percent of annual US exports**,
  across **7,763 products**.
- Average statutory rate on those exports went from **7.3 percent to 20.4
  percent**.
- China alone: 7,474 products, $92.5 billion, 6.0 percent of US exports.

Notably, several heavily affected partners did **not** retaliate against the
Section 232 metals tariffs. A useful base rate for a game is therefore not
"everyone retaliates": it is **roughly half to two thirds of major targeted
partners retaliate to a broad action, and the ones that do cover under a tenth
of your export book.** Small and alliance-dependent partners absorb.

The 2002 precedent shows the other resolution path. In DS248 the EU requested
consultations on 7 March 2002, days after the safeguard took effect on 20 March
2002; Japan, Korea, Switzerland, Canada, Venezuela, Norway, China, Mexico, New
Zealand and Brazil filed alongside. The panel report circulated 11 July 2003,
the Appellate Body report 10 November 2003, adoption 10 December 2003, and the
President terminated all ten measures by proclamation on **4 December 2003**,
six days before adoption, under Trade Act section 204. The EU had a
$2.2 billion counter-list ready and never had to fire it **[the $2.2 billion
figure and the Florida citrus targeting come from a search summary and
secondary reporting, not from a primary document I opened - unverified]**. The
lesson for the game: retaliation is often a **threat with a legal clock behind
it**, and the clock is 21 months from measure to adopted ruling.

### 5.2 Lag

2018 actions and replies, from FGKK Table I:

- US metals tariffs announced 23 March 2018; EU, Canada and Mexico exemptions
  lifted 1 June 2018.
- China: 6 April, 2 July, 23 August, 24 September 2018.
- Mexico 5 June, Turkey 21 June, EU 22 June, Canada 1 July, Russia 6 August.

**Typical lag: two weeks to three months from the US action taking effect, with
a second and third wave over the following six months.** Retaliation is not one
event; it is a sequence that tracks each US escalation.

### 5.3 Targeting logic

This is the part a game most needs and most often gets wrong. Retaliators do
not mirror your tariff. They pick your politics.

- FGKK: "the sector-level correlation between import and retaliatory tariffs is
  0.46" - correlated, but far from a mirror.
- "retaliatory tariff increases on U.S. agriculture exports are on average more
  than double the U.S. tariff increases in the crop, fishing, and beverage and
  tobacco sectors."
- The political mechanism, stated by the authors: US protection "was biased
  toward products made in electorally competitive counties," while
  "retaliations disproportionately targeted agricultural sectors, which tend to
  be concentrated in Republican-leaning counties," so "tradeable sector workers
  in heavily Republican counties were the most negatively affected."
- Rate structure was blunt: 99.8 percent of targeted US varieties got either 10
  or 25 percent, and retaliators clustered at the same two rates. FGKK conclude
  neither side was pursuing terms-of-trade optimization.

**Damage done, primary source.** USDA ERS, "The Economic Impacts of Retaliatory
Tariffs on U.S. Agriculture," ERR-304 (January 2022): direct US agricultural
export losses exceeded **$27 billion over 2018 through end-2019**, of which
**China was about 95 percent ($25.7 billion)**, EU $0.6 billion, Mexico $0.5
billion. Annualized losses for selected commodities were **$13.2 billion**.
Soybeans were **71 percent ($9.4 billion annualized)**, then sorghum ($854
million) and pork ($646 million); specialty crops about 6 percent ($837
million). State concentration: Iowa $1.46 billion, Illinois $1.41 billion,
Kansas $955 million. Product-line tariff increases ranged from **2 to 140
percent**. The report also notes trade deflection to non-retaliating buyers was
"small compared with direct losses."

### 5.4 Retaliation incidence falls on the US too

Cavallo et al.: "there is about a 33 percent pass-through of the retaliatory
tariff into ex-tariff US export prices after 12 months," so a 10 percent foreign
tariff cuts US ex-tariff export prices about 3.3 percent; affected US export
prices fell about 7 percent overall. Split by good type, differentiated US
exports showed no significant change (point estimate 8.7 percent) while
undifferentiated exports dropped a significant 38 percent. FGKK measure the
volume side: retaliatory tariffs produced a **9.9 percent decline in US exports
within products**, with complete pass-through of retaliation to foreign
consumers.

Asymmetry worth modeling: **the US absorbed a third of foreign retaliation in
its own export prices, while foreign exporters absorbed almost none of the US
tariff.** The reason is composition - undifferentiated goods are more than half
of affected US exports and under a tenth of affected US imports.

---

## 6. Trade diversion

Fajgelbaum, Goldberg, Kennedy, Khandelwal and Taglioni, "The US-China Trade War
and Global Reallocations," AER: Insights 6(2):295-312 (2024), read in the NBER
w29562 December 2023 revision, on HS6 global bilateral data for 48 bystander
countries:

- Bystanders increased exports **to the US** in products with high US tariffs
  on China, elasticity **0.31 (se 0.10)**, against a pre-war placebo of -0.19.
- Bystanders **did not** meaningfully reallocate exports to China.
- Bystander exports **to the rest of the world** also rose: elasticity **0.20
  (se 0.08)** with respect to US tariffs and **0.29 (se 0.08)** with respect to
  Chinese tariffs.
- Average bystander export growth in taxed products: **6.5 percent, standard
  deviation 6.1 percent across countries** under country-specific elasticities,
  against a standard deviation of only 1.4 percent under the homogeneous
  specification. Named winners: **Vietnam, Thailand, Korea, Mexico**.
- The headline conclusion: "the trade war created net export opportunities
  rather than simply shifting trade across destinations."
- Raw context, from their footnote 2: bystander exports to the rest of the world
  grew 10 percent from 2016/17 to 2018/19 in aggregate, so the regressions
  isolate relative growth in taxed products, not the raw total.

Design consequence: **diversion is not zero-sum bookkeeping.** A US tariff on
one partner should create a positive, heterogeneous, country-specific windfall
for third parties, largest where their goods substitute for the targeted
country's, and it should show up in their exports to everyone, not only to the
United States. Modeling diversion as "the trade moves to the next partner on the
list" gets both the size and the direction wrong.

---

## 7. Who owns which trade authority

Primary source for this section: CRS Report R48435, "Congressional and
Presidential Authority to Impose Import Tariffs" (version 5, read 2026-09-01),
and CRS Legal Sidebar LSB11398, "Supreme Court Rules Against Tariffs Imposed
Under the International Emergency Economic Powers Act (IEEPA)," 23 February
2026.

### 7.1 The constitutional baseline, and the 2026 change

Article I gives **Congress** the tariff power; the President acts only on
delegated authority. On **20 February 2026** the Supreme Court decided
*Learning Resources, Inc. v. Trump* and *Trump v. V.O.S. Selections, Inc.*,
holding in an opinion by Chief Justice Roberts that **IEEPA does not authorize
the President to impose tariffs**, invalidating both the trafficking tariffs on
Canada, Mexico and the PRC and the worldwide "reciprocal" tariffs. The Court
quoted the common ground that "the President enjoys no inherent authority to
impose tariffs during peacetime." It did **not** disturb Section 232, 301, 201
or 122. Refunds were not addressed, and Justice Kavanaugh's dissent noted the
United States may owe billions to importers.

**This is a load-bearing fact for a game set in a US presidency.** The IEEPA
"tariff by proclamation on Tuesday" path is closed as of February 2026. What
remains is slower, agency-gated, and statute-shaped. Following the ruling, the
President proclaimed tariffs under **Section 122** instead, a statute never used
for tariffs before, and CRS records real doubt that "balance-of-payments
deficits" reaches trade deficits at all.

### 7.2 The tariff statutes, from CRS Table 1

| Authority | Citation | Who must find what first | Max duration | Max rate |
|---|---|---|---|---|
| Section 232 | 19 U.S.C. 1862 | **Secretary of Commerce** must find imports threaten to impair national security | None | None |
| Section 201 | 19 U.S.C. 2251-2255 | **USITC** must find serious injury from an import surge | 4 years, extendable to 8 total | 50 percentage points above existing rate, with a phasedown requirement |
| Section 301 | 19 U.S.C. 2411-2420 | **USTR** determination | 4 years, extendable with no upper limit | None |
| Section 122 | 19 U.S.C. 2132 | None | 150 days | 15 percent, with uniformity requirements |
| Section 338 | 19 U.S.C. 1338 | None | None | 50 percent of value, offsetting only |

### 7.3 What each actor can and cannot do alone

**Commerce (BIS) - Section 232.** Commerce must run "an appropriate
investigation" and report **within 270 days** of initiation, seeking information
from other officers and holding public hearings. Only on a Commerce finding of
threat to national security may the President act; he must decide **within 90
days** of the report and **implement within 15 days** of deciding. Cannot do
alone: the President cannot start here. Congress retains a disapproval mechanism
by joint resolution subject to signature or veto, which makes it nearly
inoperative. Live examples: steel and aluminum 2018- , automobiles 2025- ,
robotics and industrial machinery investigation opened September 2025.

**Commerce (BIS) - export controls.** Separate authority entirely: the Export
Control Reform Act of 2018, 50 U.S.C. 4801 et seq., with no expiration date,
executed through the Export Administration Regulations (15 C.F.R. 730 et seq.).
BIS administers the Commerce Control List and the Entity List. ECRA requires an
**interagency process** for emerging and foundational technologies, and Defense
holds a concurrence role on referred licenses. Cannot do alone: munitions are
State's under ITAR (22 C.F.R. 120.3) and the US Munitions List; sanctions-based
export restrictions are Treasury's.

**USTR - Section 301.** May self-initiate or act on a petition from "any
interested person," and **must generally request consultations with the foreign
country upon initiating**. Statute splits **mandatory action** (trade-agreement
rights denied, or an unjustifiable practice burdening US commerce) from
**discretionary action** (unreasonable or discriminatory practice, and US action
is appropriate). Remedies are broad: duties, other import restrictions,
withdrawal of concessions, or an agreement with the foreign government. **No
rate cap.** Actions terminate automatically after four years unless a
beneficiary requests continuation, which is how the 2018 China tariffs survived
the 2022 review. In HMTX Industries LLC v. United States (Fed. Cir. 2025) the
court upheld USTR adding further tariff lists in response to Chinese
retaliation, so the escalation ladder inside a single 301 action is legally
live. Cannot do alone: acts "under the direction of the President."

**USITC - injury and the schedule.** In Section 201 the ITC is the gate: it
investigates on petition, on request from the President or USTR, on a Ways and
Means or Finance resolution, or by self-initiation; reports within **180 days**
(240 in critical circumstances); and the President then has **60 days** to take
"all appropriate and feasible action." He is not bound by the ITC's recommended
remedy and may act even where the ITC recommends nothing, so long as the injury
finding exists. In AD/CVD, **Commerce determines dumping margins and subsidy
rates and the USITC determines material injury**; both affirmative, and Commerce
issues the order, which Customs enforces (19 U.S.C. 1673 et seq.). Cannot do
alone: the ITC never imposes anything; it unlocks.

**Treasury (OFAC) - sanctions.** Administers transaction-based restrictions and
country embargoes under IEEPA and related authorities (50 U.S.C. 1701-1706, with
national emergencies under 50 U.S.C. 1601-1651). The February 2026 ruling
confirms IEEPA can "regulate" or "prohibit" imports but cannot **tax** them.
So: OFAC can stop a trade entirely and cannot price it. That distinction is
exactly the difference between an embargo rung and a tariff rung, and the game
should honor it.

**CBP - collection.** 19 U.S.C. 1500 gives the customs officer five duties:
fix the final appraisement, fix the final classification and rate of duty, fix
the final amount of duty and any increased or additional duties, taxes and fees,
liquidate the entry, and give notice of liquidation to the importer. CBP does
not decide policy; it decides what a container is, and therefore whether a
tariff was actually paid. It is also the surface for de minimis (19 U.S.C. 1321,
the $800 per person per day duty-free allowance), which the President continued
to suspend under IEEPA after the ruling and which is now itself in litigation.

**Congress.** Holds the power, delegates it, and as of the 119th Congress has
bills pending that would require a joint resolution of approval for presidential
tariffs, or repeal specific authorities including Section 338.

### 7.4 Design consequence

A tariff in this game should not be one button on a ladder. It should be an
**instrument selection with a named statute**, each with a different owner, a
different precondition, a different clock and a different ceiling. That is not
added realism for its own sake: it is the only way "the president wants a tariff
and cannot have one this quarter" becomes a playable situation, which is what
the record actually looks like.

---

## 8. Calibration table

Every quantity proposed for the game, with its provenance. `Abstraction used`
says what the game would do with the finding, which is always cruder than the
finding.

| SOURCE | CLAIM BEING MODELED | ABSTRACTION USED | CALIBRATION VALUE | UNCERTAINTY | KNOWN LIMITATION |
|---|---|---|---|---|---|
| Cavallo et al., AER:I 2021, Table 1 col 1 | Tariff passes into duty-inclusive import price at the border | Single `borderPassThrough` scalar per sector, applied same turn | 0.94 (differentiated manufactures) | 0.85-1.00; coefficient -0.057 on ex-tariff price | 2018-19 US-China sample; one trade war, one dollar regime |
| Cavallo et al., AER:I 2021, Table 1 col 3 | Undifferentiated goods absorb part of the tariff abroad | Lower `borderPassThrough` for commodity sectors | 0.70 for `agriculture-*`, `bulk-mining`, `energy-*` | ex-tariff price fell >25% of tariff; point estimate imprecise | Those goods were <10% of affected US imports, so the estimate rests on a thin slice |
| Amiti, Redding, Weinstein, NBER w26610 | Steel is the exception where foreign exporters cut price | Sector override for `steel` | 0.75 | "substantially" is not a number in the abstract I read | I read the abstract, not the coefficient table; treat as a direction, not a magnitude |
| Cavallo et al., AER:I 2021, retailer sample | Tariff reaches consumer prices weakly and slowly | `consumerPassThrough` over 3 turns | 0.10 central | 0.035-0.16 at one year | First-year only; authors expect incidence to shift to consumers later, so a multi-year campaign should ramp it |
| Flaaen, Hortacsu, Tintelnot, AER 2020 (NBER w25767) | Umbrella effect: domestic producers and untariffed complements raise prices too | Sector flag `umbrellaPricing` for concentrated consumer-durable sectors | 1.10-2.30 consumer-price elasticity | Wide; one product category | Washing machines are a 4-firm market with a near-universal tariff; do not generalize to apparel |
| FGKK, QJE 2020, Table IV | Foreign export supply is horizontal to the US | No terms-of-trade gain for the US by default | `omega* = 0` | -0.002, se 0.05 | Estimated with country-time and product-time fixed effects, so it cannot capture terms-of-trade effects working through wages; the authors say so explicitly |
| FGKK, QJE 2020, Table IV col 6 | Substitution across source countries within a product | `originSubstitution` | sigma = 2.53 | se 0.26; 90% CI [1.75, 3.02] | Short-run, 2018 |
| FGKK, QJE 2020, Table V | Substitution across imported products within a sector | `productSubstitution` | eta = 1.53 | se 0.27 | Depends on sigma being right |
| FGKK, QJE 2020, Table VI | Substitution between domestic and imported within a sector | `domesticSubstitution` | kappa = 1.19 | se 0.49 - the loosest of the four | Nearly unitary; a model that leans on reshoring is leaning on this number |
| FGKK, QJE 2020 | Foreign demand elasticity for US export varieties | `exportDemand` | sigma* = 1.04 | roughly unitary | |
| FGKK, QJE 2020, abstract | Quantity cascade from a tariff | Three separate reported numbers: partner-level, product-level, sector-level | -31.7% variety, -2.5% product, -0.2% sector | Averages across a heterogeneous 2018 program | The gap is the whole point; reporting only one is the failure mode |
| FGKK, QJE 2020 | Consumer and importer cost of the 2018 program | Annualized cost line on the fiscal screen | $51bn, 0.27% of GDP | Product of import share of value added 15%, targeted share 13%, average increase 14% | Short-run, no supply-chain reorganization |
| FGKK, QJE 2020 | Net aggregate welfare effect | Small negative, not a catastrophe | -$7.2bn, -0.04% of GDP; producer gains +$9.4bn | Not statistically distinguishable from zero | The redistribution is large and the net is small: a game that shows only the net will feel like nothing happened |
| FGKK, QJE 2020 | Regional dispersion | County or state variance in the effect | mean tradeable real wage -1.0%, sd across counties 0.5% | Model-based, immobile labor | Assumes no regional labor mobility, defensible only short-run |
| Flaaen and Pierce, FEDS 2019-086 (Federal Reserve Board) | Manufacturing employment channels | Three separate sector effects that net out | 25th-to-75th-percentile exposure shift: net **-1.4%**; protection **+0.3%**, input costs **-1.1%**, retaliation **-0.7%** | 90% CIs reported in the paper; interquartile framing | Relative across industries, not an aggregate level effect |
| Flaaen and Pierce, FEDS 2019-086 | Producer prices | `producerPrice` response to input-cost exposure | +4.1% for an interquartile shift in input-cost exposure | as above | Factory-gate, not consumer |
| FGKK, QJE 2020, Table I Panel B | Retaliation breadth | `retaliationCoverage` | 8.2% of US exports, $127bn, 7,763 products | One episode | 2018 only; a different administration or a WTO-functional world could differ |
| FGKK, QJE 2020, Table I Panel B | Retaliation intensity | `retaliationRate` | average statutory rate 7.3% -> 20.4% | Product-line range 2-140% per USDA ERS | |
| FGKK, QJE 2020, Table I Panel B dates | Retaliation lag | `retaliationLagTurns` | 2 weeks to 3 months, then waves | China replied in 4 rounds over 6 months | |
| FGKK, QJE 2020, Table I Panel B | Retaliation base rate | Probability a targeted major partner replies at all | 6 partners replied in 2018; roughly half to two thirds of majors | Not a frequency estimate from many episodes; it is one episode counted | This is the weakest number in the document. One trade war is not a base rate. Mark it as a designer's prior, not a finding |
| FGKK, QJE 2020 | Retaliation targeting is political, not mirrored | Target selection weighted by the target's electoral geography and by agriculture | sector correlation between US and retaliatory tariffs = 0.46; ag retaliation more than double US ag tariffs | | |
| Cavallo et al., AER:I 2021, Table 1 col 4 | US exporters eat part of foreign retaliation | `exportPriceAbsorption` | 0.33 after 12 months | differentiated 0.087 (ns), undifferentiated 0.38 | |
| FGKK, QJE 2020 | Export volume loss from retaliation | `exportVolumeLoss` | -9.9% within product | | |
| USDA ERS ERR-304 (Jan 2022) | Farm damage from retaliation | Sector damage for `agriculture-row-crops` | $27bn total 2018-2019; $13.2bn annualized; soy 71% ($9.4bn), sorghum $854m, pork $646m; China 95% of losses | Draws on Grant et al. (2021) product-line estimates | Direct losses only; excludes offsetting sales to non-retaliators, which the authors call small |
| FGKKT, NBER w29562 / AER:I 2024 | Trade diversion to third countries | `diversionElasticity` on bystander exports to the US | 0.31 (se 0.10) | placebo -0.19 | 48 bystanders, HS6, 2016/17 to 2018/19 |
| FGKKT, NBER w29562 | Diversion creates net new trade, not just reshuffling | Bystander exports to the rest of the world also rise | 0.20 (se 0.08) on US tariffs; 0.29 (se 0.08) on China tariffs | | |
| FGKKT, NBER w29562 | Heterogeneity of the windfall | Per-country diversion multiplier, not a uniform one | mean +6.5%, sd 6.1% across countries | sd is only 1.4% under homogeneous elasticities, so the heterogeneity is the finding | Winners were Vietnam, Thailand, Korea, Mexico in this episode; do not hardcode that list |
| Broda, Limao, Weinstein, NBER w12033 | Buyer market power varies by good type | Reason not to apply the US pass-through rule to the other 49 nations | median inverse export supply elasticity 1.6; commodities 0.5, differentiated 2.4 | median by country ranges 0.9-3 | Sample is 15 small non-WTO importers, and the ordering is the reverse of the US evidence. Do not mix the two in one formula |
| CRS R48435 Table 1 | Section 201 ceiling and clock | Instrument precondition and cap | ITC report 180 days (240 critical); President decides in 60 days; 4 years extendable to 8; max +50 points | Statutory, not estimated | |
| CRS R48435 | Section 232 clock | Instrument precondition | Commerce report within 270 days; President decides within 90 days; implements within 15 days; no rate or duration cap | Statutory | |
| CRS R48435 | Section 301 | Instrument precondition | USTR determination, consultations required on initiation; no rate cap; 4 years then auto-terminate unless continuation requested | Statutory | |
| CRS R48435 | Section 122 | Emergency-ish fallback instrument | 150 days, 15 percent cap | Statutory | Whether trade deficits satisfy its predicate is contested; the government itself argued they do not |
| CRS R48435 | Section 338 | Rarely used offsetting instrument | Up to 50 percent of value; no agency finding required | Statutory | CRS notes it "has sometimes been" treated as dormant |
| CRS LSB11398 (23 Feb 2026) | IEEPA cannot be used to tariff | Remove the instant-proclamation tariff path from the instrument set | Holding of 20 Feb 2026 | Refunds unresolved | Post-ruling practice is still moving; Section 122 use is under challenge |
| 19 U.S.C. 1500 | Collection is a separate step from imposition | CBP as the actor who determines whether a tariff was actually collected | five enumerated duties | Statutory | |
| `packages/engine/src/fiscal.ts:83` | Customs duties as a share of federal receipts | `REVENUE_MIX.tariff` | 0.03 at HEAD | **[unverified]** | I found no source in this pass for the customs share of US federal receipts. Historically it has been low single digits and it rose sharply in 2025. Verify against the Monthly Treasury Statement before anyone treats 0.03 as calibrated |

---

## 9. What could not be verified

- **USITC Publication 5405, "Economic Impact of Section 232 and 301 Tariffs on
  U.S. Industries" (Investigation 332-591, March 2023).** This is the single
  most relevant US government source for this note and I could not open it.
  usitc.gov returned HTTP 403 to every attempt (both PDF paths, and the press
  release), and the Wayback copy was not reachable from this environment.
  Search summaries attribute to it: Section 232 tariffs raised downstream prices
  0.2 percent and cut downstream production 0.6 percent on average, $3.5 billion
  less US downstream production in 2021; Section 301 tariffs cut imports from
  China 13 percent, raised US production 0.4 percent and US prices 0.2 percent.
  **All of those figures are [unverified] and must not be used until someone
  opens the report.** They are directionally consistent with Flaaen and Pierce,
  which I did open.
- **Broda and Weinstein (QJE 2006) elasticity magnitudes** - [unverified], from
  a search summary only.
- **The EU's $2.2 billion 2002 counter-list and its Florida citrus targeting** -
  [unverified]. The DS248 timeline and the 4 December 2003 termination are
  verified from the WTO case page.
- **Petroleum and pharmaceutical demand elasticities** - not researched in this
  pass. The sector deviations named in section 4 are design flags, not
  calibrated values.
- **Services trade** - out of scope of the proposed taxonomy and unresearched.
- **Anything after 23 February 2026.** The legal landscape is moving: Section
  122 tariffs, de minimis litigation in Axle of Dearborn, IEEPA refunds, and
  USTR's March 2026 multicountry 301 investigations covering 16 trading partners
  on excess capacity and 60 on forced labor were all open questions in the CRS
  documents read here.

## 10. Sources opened

1. Fajgelbaum, Goldberg, Kennedy, Khandelwal, "The Return to Protectionism,"
   QJE 135(1):1-55 (2020). Read via the published PDF.
2. Amiti, Redding, Weinstein, "The Impact of the 2018 Trade War on U.S. Prices
   and Welfare," NBER w25672 (2019) / JEP 33(4):187-210. Abstract page.
3. Amiti, Redding, Weinstein, "Who's Paying for the U.S. Tariffs? A Longer-Term
   Perspective," NBER w26610 (2020). Abstract page.
4. Cavallo, Gopinath, Neiman, Tang, "Tariff Pass-Through at the Border and at
   the Store," AER: Insights 3(1):19-34 (2021). Full text.
5. Flaaen, Hortacsu, Tintelnot, "The Production Relocation and Price Effects of
   US Trade Policy: The Case of Washing Machines," NBER w25767 / AER 110(7)
   (2020). Abstract page.
6. Flaaen and Pierce, "Disentangling the Effects of the 2018-2019 Tariffs on a
   Globally Connected U.S. Manufacturing Sector," Federal Reserve Board FEDS
   2019-086. Full text.
7. Fajgelbaum, Goldberg, Kennedy, Khandelwal, Taglioni, "The US-China Trade War
   and Global Reallocations," NBER w29562 (rev. Dec 2023) / AER: Insights 6(2)
   (2024). Full text.
8. Broda, Limao, Weinstein, "Optimal Tariffs: The Evidence," NBER w12033.
   Full text.
9. USDA Economic Research Service, "The Economic Impacts of Retaliatory Tariffs
   on U.S. Agriculture," ERR-304 summary (January 2022). Full text of the
   summary.
10. CRS Report R48435, "Congressional and Presidential Authority to Impose
    Import Tariffs" (version 5). Full text.
11. CRS Legal Sidebar LSB11398, "Supreme Court Rules Against Tariffs Imposed
    Under the International Emergency Economic Powers Act (IEEPA)"
    (23 February 2026). Full text.
12. CRS Report R46814, "The U.S. Export Control System and the Export Control
    Reform Act of 2018," via EveryCRSReport.
13. WTO, DS248 case page, "United States - Definitive Safeguard Measures on
    Imports of Certain Steel Products."
14. 19 U.S.C. 1500, via Cornell LII.
