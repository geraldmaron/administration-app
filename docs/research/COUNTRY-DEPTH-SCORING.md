# Country Depth Scoring and Tiering

Research note. Dated 2026-09-01. Branch `feat/exec-ops-composition`.

**Status: research only.** Nothing here has been implemented. No dataset file was
changed to produce it. It defines the model a later phase would apply when the
world dataset is expanded past its current 50 nations, so that expansion is a
scored decision rather than a taste one.

---

## 1. The current roster, confirmed against HEAD

The mission's claim of 50 is **correct**. `packages/world/src/dataset/nations.ts`
exports 50 `NationId` constants and a `worldNations` array with 50 entries, and
the two sets match. The United States is the only record with `playable: true`.

| # | id | Name | # | id | Name |
|---|----|------|---|----|------|
| 1 | USA | United States | 26 | ISR | Israel |
| 2 | CHN | China | 27 | ARE | United Arab Emirates |
| 3 | DEU | Germany | 28 | TUR | Turkey |
| 4 | NGA | Nigeria | 29 | YEM | Yemen |
| 5 | POL | Poland | 30 | SYR | Syria |
| 6 | SAU | Saudi Arabia | 31 | EGY | Egypt |
| 7 | SGP | Singapore | 32 | ZAF | South Africa |
| 8 | IRQ | Iraq | 33 | ETH | Ethiopia |
| 9 | PRK | North Korea | 34 | COD | DR Congo |
| 10 | BLR | Belarus | 35 | RWA | Rwanda |
| 11 | VNM | Vietnam | 36 | MAR | Morocco |
| 12 | IDN | Indonesia | 37 | DZA | Algeria |
| 13 | ISL | Iceland | 38 | GBR | United Kingdom |
| 14 | BRA | Brazil | 39 | FRA | France |
| 15 | COL | Colombia | 40 | ITA | Italy |
| 16 | VEN | Venezuela | 41 | ESP | Spain |
| 17 | CUB | Cuba | 42 | UKR | Ukraine |
| 18 | CAN | Canada | 43 | RUS | Russia |
| 19 | MEX | Mexico | 44 | SWE | Sweden |
| 20 | IND | India | 45 | CHE | Switzerland |
| 21 | PAK | Pakistan | 46 | HUN | Hungary |
| 22 | BGD | Bangladesh | 47 | JPN | Japan |
| 23 | AFG | Afghanistan | 48 | KOR | South Korea |
| 24 | KAZ | Kazakhstan | 49 | TWN | Taiwan |
| 25 | IRN | Iran | 50 | AUS | Australia |

Two things worth recording while the file is open, because they constrain any
expansion plan:

- The file's own header states the first twelve entries (through Iceland) exist
  to cover every `NationArchetype` at least once, "so the band system has no
  empty tier". Several low-salience roster members are there for archetype
  coverage, not for strategic weight. Section 5 handles that explicitly.
- The file is 1,980 lines. `scripts/verify-file-size.mjs` exempts authored data
  tables by name, and the nation roster is on that exempt list, so length is not
  itself a blocker. It is still worth noting that adding 30 to 50 nations at the
  current per-entry cost roughly doubles the file.

---

## 2. What a new entry must satisfy

Read from `packages/world/src/schemas/nation.ts` and
`packages/world/src/schemas/dataset.ts`.

`NationInput` is `Nation` minus `bands` and `memberships` (both derived at
assembly). Everything else is required by zod:

| Group | Required fields |
|---|---|
| Top level | `id`, `playable`, `identity`, `geo`, `stats`, `sectors` (min 1), `traits`, `doctrine` |
| `identity` | `name`, `adjective`, `capital`, `government` (CharterId), `languages` (min 1), `currency`. Optional: `currencyPerUsd`, `definiteArticle` |
| `geo` | `region`, `lat`, `lon`, `neighbors`, `coastline`, `chokepoints`, `disasterExposure` (every key inside it optional) |
| `stats.demography` | `population`, `urbanization`, `medianAge`, `growthRate`, `literacy`, `birthRate`, `deathRate`, `netMigration` |
| `stats.economy` | `gdp`, `gdpPerCapita`, `growth`, `inflation`, `unemployment`, `costOfLiving`, `debt`, `reserves`, `sovereignRating` |
| `stats.trade` | `exports`, `imports`, `balance`, `topExports`, `topPartners`, `tradeDependence` |
| `stats.energy` | `production`, `consumption`, `importDependence`, `mix` |
| `stats.military` | `budget`, `activeHeadcount`, `reserveHeadcount`, `readiness`, `doctrineQuality`, `branchStrength` (5 axes), `airliftCapacity`, `sealiftCapacity`, `arsenal`, `basesAbroad`. **`orderOfBattle` is optional** |
| `stats.security` | `crimeIndex`, `corruptionIndex`, `insurgencyPressure`, `borderControl`, `intelCapability`, `counterIntel` |
| `stats.politics` | `regimeStability`, `legitimacy`, `factionalism`, `pressFreedom`, `protestPressure` |
| `stats.softPower` | `diplomaticReach`, `culturalReach`, `aidGiven`, `aidReceived` |
| `traits` | 8 scalars + `agendas` (min 1, max 3) |
| `doctrine` | `posture`, `redLines`, `alignmentPull` |
| `partySystem` | Optional in the schema; **required by the dataset validator on every shipped nation** |

**The single most important constraint on tiering: the schema is strict, so a
Tier C nation cannot omit a `NationStats` field.** Every one of the roughly 55
scalars above has to carry a number. What a tier can actually vary is the depth
*around* those fields: the optional `orderOfBattle` decomposition, the number of
agendas and red lines, how many `disasterExposure` keys are set, the sector-mix
granularity, and everything outside the `Nation` record entirely.

Most of the surrounding graph is derived rather than authored, which lowers the
marginal cost of a new nation considerably:

- `bands` (`dataset/bands.ts`) and `memberships` (`orgs-cradles.ts`) are computed.
- `stats.trade.topPartners` and `tradeDependence` are overwritten at assembly by
  the gravity model in `dataset/trade.ts`; the header of `nations.ts` says
  editing them by hand "has no effect".
- `geo.neighbors` and `geo.chokepoints` are filled by `dataset/geography.ts`.
- Cities are baked (`dataset/cities.ts`, "2-5 per large nation" for non-US).
- People are generated from role pools (`dataset/people.ts`), not hand-written.
- `WorldDataset.relationships` is `[]` in `dataset/index.ts`; edges are derived.

### 2.1 The authored-field consumer registry

`packages/world/src/dataset/stat-consumers.ts` states the rule in its own header:
"Every authored field has to be read by something. A field nobody consumes is
research effort spent on a number that cannot change any outcome, and it is
worse than useless: it reads as depth the simulation does not actually have."

The registry covers `NationStats`, `Nation.geo`, `NationTraits`, `Person`,
`NationBands`, cities, states, districts, sector-mix entries and parties. Each
entry is either `{ path, readBy }` (a live rule reads it) or `{ path, owedBy }`
(a written-down debt). A paired test walks the schema and fails on any leaf that
is missing from the registry, and it pins the exact "owed" set so the debt list
cannot quietly grow.

**Consequence for this work: tiering must not introduce new fields.** A tier is
an authoring-depth policy over the fields that already exist. Any proposal to add
a `tier` marker to the `Nation` record would itself need a registry entry naming
the rule that reads it, and would also trip the doc-sync contract in
`CLAUDE.md`. The recommendation in section 7 keeps tier out of the schema and in
this document plus the per-entry comment convention `nations.ts` already uses.

---

## 3. The depth score

### 3.1 What the score is measuring

The player is the President of the United States. The question a depth score has
to answer is not "how important is this country in the world" but **"how much
authored depth does this country need before it can carry a decision the
President of the United States would actually face?"** Those diverge. Ireland is
a minor military power and a top-twelve US goods trading partner. Yemen is a
negligible economy sitting on Bab el-Mandeb.

So the model is deliberately US-relative on three of its eight axes, and the
US-relative axes carry more weight than the absolute-mass ones.

### 3.2 Axes, weights, and why

| # | Axis | Weight | Why this weight |
|---|---|---:|---|
| A | GDP | 20 | Economic mass is the upstream driver of nearly everything else the engine reads: trade flows, the defense budget it can sustain, the aid it gives, the sovereign rating. Highest-weight absolute axis, but not higher than trade exposure, because mass the US never touches generates few presidential decisions. |
| B | US trade exposure | 20 | The single best predictor of how often a country appears on a US President's desk in peacetime. It is also the axis the engine's economic instrument ladder reads directly (`tradeAccess` gates on `topPartners`), so a country with real US trade needs a real trade record or the ladder can never be aimed at it. Tied with GDP rather than below it. |
| C | Alliance / adversarial importance | 18 | Treaty obligation and named adversary status are what convert a distant event into a US decision. Weighted just under the two money axes because it is the axis with the most judgment in it; the band definitions in 3.3 are written to keep that judgment rule-bound. |
| D | Military power | 15 | Determines whether the country can act rather than only be acted upon, and it is the axis the engine's force and deterrence rules read. Below the alliance axis because raw spending without a relationship to the US produces fewer decisions than a relationship without spending. |
| E | Population | 8 | Real but largely derivative of GDP at this scale. Kept as a separate axis because it separates countries with the same GDP but very different demographic weight (Bangladesh vs Romania), which the engine's demography and migration rules do read. |
| F | Energy and minerals | 8 | A supply position the US cannot route around is leverage independent of GDP. Sized to matter for DR Congo and Guyana without letting a single commodity outrank a whole economy. |
| G | Chokepoint control | 6 | Narrow but sharp. It applies to about a dozen countries and, where it applies, it is decisive; the dataset already models it as a mechanic in `geography.ts` with a `closableByOneState` flag. Low weight because a zero here is the normal case. |
| H | Regional importance | 5 | The residual: whether the region's politics move when this country moves. Lowest weight because it is the least independently measurable axis and correlates heavily with A, B and D. |

Total: 100.

### 3.3 Normalization

Every axis is scored **0 to 10 in bands**, then multiplied by its weight divided
by 10. Bands rather than a continuous formula, for two reasons. First, the money
axes are heavy-tailed: linear normalization against the United States would give
roughly 70 countries a rounded score of zero on GDP and trade, and a log
transform would be reproducible by machine but not by hand. Second, banding makes
the score robust to the data quality actually available. Several roster members
publish nothing reliable; a band survives a 30 percent error in an estimate,
a continuous score does not.

The bands are chosen so each step is roughly a factor of 2.5, and so the top band
is genuinely rare.

**A. GDP** (World Bank NY.GDP.MKTP.CD, current US$, 2024)

| Points | Threshold |
|---:|---|
| 10 | >= $5T |
| 8 | $2T to $5T |
| 6 | $1T to $2T |
| 4 | $500B to $1T |
| 2 | $200B to $500B |
| 1 | $75B to $200B |
| 0 | < $75B |

**B. US goods trade exposure** (US Census Bureau, two-way goods trade with the
United States, full year 2025; exports plus imports)

| Points | Threshold |
|---:|---|
| 10 | >= $250B |
| 8 | $100B to $250B |
| 6 | $40B to $100B |
| 4 | $15B to $40B |
| 2 | $5B to $15B |
| 1 | $1B to $5B |
| 0 | < $1B |

The United States scores 10 by definition; it is the seat of play, not a
competitor in its own ranking.

**C. Alliance / adversarial importance** (rule-bound judgment)

| Points | Rule |
|---:|---|
| 10 | Treaty ally the US is obliged to defend *and* hosts major US forces or nuclear-sharing; **or** a peer competitor under declared strategic competition (China, Russia) |
| 8 | NATO member with substantial US force posture, or a Major Non-NATO Ally with a standing US commitment in an active theater; **or** a named state adversary of consequence (Iran, North Korea) |
| 6 | NATO member or MNNA without major US basing |
| 4 | Substantial partner or substantial friction, no treaty tie (India, Vietnam, Saudi Arabia on the January 2025 list, Ukraine, Iraq) |
| 2 | Routine bilateral relationship with real programs |
| 0 | Negligible, ruptured, or comprehensively sanctioned with no working channel |

NATO membership is taken from nato.int (32 members). MNNA status is taken from
the State Department fact sheet dated January 20, 2025 (19 designees, plus Taiwan
treated as an MNNA by statute without formal designation).

**D. Military power** (SIPRI military expenditure, retrieved through World Bank
MS.MIL.XPND.CD, 2024 where published)

| Points | Threshold |
|---:|---|
| 10 | >= $80B |
| 8 | $40B to $80B |
| 6 | $15B to $40B |
| 4 | $5B to $15B |
| 2 | $1B to $5B |
| 0 | < $1B |

Plus **+2, capped at 10, for a declared or widely assessed nuclear arsenal**
(USA, RUS, CHN, GBR, FRA, IND, PAK, ISR, PRK). The adjustment exists because
spending alone misprices the two countries whose entire strategic significance is
an arsenal: North Korea would otherwise band at 2, and Israel at 8 without the
thing that makes it a nuclear question.

**E. Population** (World Bank SP.POP.TOTL, 2024)

| Points | Threshold |
|---:|---|
| 10 | >= 250M |
| 8 | 100M to 250M |
| 6 | 50M to 100M |
| 4 | 20M to 50M |
| 2 | 8M to 20M |
| 1 | 2M to 8M |
| 0 | < 2M |

**F. Energy and minerals leverage** (EIA, USGS Mineral Commodity Summaries 2025)

| Points | Rule |
|---:|---|
| 10 | Swing producer or dominant supplier the US cannot route around within a decade (Saudi Arabia on crude; Russia on oil, gas and palladium; China on rare earths, graphite and gallium; DR Congo on cobalt) |
| 8 | Major hydrocarbon exporter, or a top-three world producer of a mineral on which US net import reliance exceeds 50 percent (Chile on copper and lithium; Australia on lithium and rare earths; Indonesia on nickel and cobalt; Qatar, UAE, Kuwait, Algeria, Canada) |
| 6 | Significant exporter and a named leading US import source in the USGS net-import-reliance table |
| 4 | Meaningful regional producer, not a US supply dependency |
| 2 | Minor production of note |
| 0 | None |

**G. Chokepoint control** (EIA World Oil Transit Chokepoints and Today in Energy)

| Points | Rule |
|---:|---|
| 10 | Borders a chokepoint with no practical alternative route and can close it unilaterally (Iran, Oman: Strait of Hormuz, about 20 million b/d in 2024) |
| 8 | Controls a canal or artificial passage carrying a large share of world trade (Egypt: Suez and SUMED; Panama: Panama Canal) |
| 6 | Borders a major natural strait (Indonesia, Malaysia, Singapore: Malacca; Yemen, Djibouti: Bab el-Mandeb; Turkey: Turkish Straits; Denmark: Danish Straits; Taiwan: Taiwan Strait) |
| 4 | Significant secondary passage, Arctic or Baltic approach, or a bypass pipeline terminus (UAE, Saudi Arabia, Greece, Romania, Sri Lanka, Iceland, Brunei) |
| 0 | None |

**H. Regional importance**

| Points | Rule |
|---:|---|
| 10 | The pivotal state of its region; the region's politics move when it moves |
| 8 | One of two or three that set the region's agenda |
| 6 | Sets the agenda for a sub-region |
| 3 | Matters within its sub-region without setting it |
| 0 | Follower |

### 3.4 Reproducing a score by hand

`score = 2.0A + 2.0B + 1.8C + 1.5D + 0.8E + 0.8F + 0.6G + 0.5H`, where each
letter is that axis's 0-10 band. Worked example, **Thailand**:

- A GDP $529B (2024) -> band 4
- B US two-way goods trade $110.8B (2025) -> band 8
- C MNNA, no major permanent US basing -> 6
- D milex $5.5B (2024) -> band 4
- E population 71.7M -> band 6
- F meaningful regional energy and mineral production, not a US dependency -> 4
- G borders the Strait of Malacca approaches and the Kra corridor -> 4
- H sets the mainland Southeast Asia agenda alongside Vietnam -> 6

`2.0(4) + 2.0(8) + 1.8(6) + 1.5(4) + 0.8(6) + 0.8(4) + 0.6(4) + 0.5(6)`
`= 8 + 16 + 10.8 + 6 + 4.8 + 3.2 + 2.4 + 3 = 54.2` -> **Tier B**.

---

## 4. Tiers

| Tier | Score | Meaning |
|---|---|---|
| **A** | >= 60 | Full strategic model. The country can be the subject of a scenario, not only its setting. |
| **B** | 35 to 59.9 | Medium. Credible as a counterparty, an ally under pressure, or a second-order consequence. |
| **C** | 15 to 34.9 | Lightweight. Present so the map is not a lie and so regional effects have somewhere to land. |
| **-** | < 15 | Below the floor. Not recommended for addition. |

Cutoffs were set after scoring, by looking for the natural breaks rather than by
picking round numbers first. Both breaks are real: there is a 1.4-point gap
between Indonesia at 60.2 and Turkey at 55.4, and the 35 line separates a cluster
running down to Chile at 36.2 from Peru at 33.3.

### 4.1 Floor rules (overrides, applied after scoring)

Three overrides, each with a stated reason. They only ever raise a country to
Tier C; nothing is ever promoted into A or B by override.

- **F1, roster floor.** A country already shipped in `worldNations` is never
  below Tier C. Removing a nation invalidates saves and orphans any content that
  targets it, and the dataset validator's referential-integrity checks would fail
  on the dangling ids. Removal is a separate decision with its own cost, not a
  side effect of a scoring pass.
- **F2, archetype floor.** A country that is the dataset's only instance of a
  `NationArchetype` is never below Tier C. `nations.ts` states in its header that
  the first twelve entries exist so the band system "has no empty tier"; dropping
  the sole occupant of an archetype would empty a tier that band-targeted content
  is written against.
- **F3, adversary floor.** A country under comprehensive US sanctions, or against
  which the US has conducted named military operations in the last decade, is
  never below Tier C regardless of score. The score measures decision frequency
  through economic and alliance channels; these countries generate presidential
  decisions through a channel the score does not have an axis for.

Six roster members are held at Tier C by these floors: Belarus (9.7, F1+F3),
Rwanda (8.3, F1), Yemen (8.3, F1+F3), Afghanistan (4.7, F1+F3), Syria (4.7,
F1+F3) and Cuba (3.1, F1+F3). They are marked **C\*** below.

**This is a finding, not a rounding error.** The model, applied honestly, says
six of the fifty countries currently shipped would not clear the admission floor
if they were being considered today. That is the expected result of a roster
whose first twelve entries were chosen for archetype coverage rather than for
salience to a US President. The floors preserve them and record why.

---

## 5. Absent countries, scored and tiered

All 33 countries the mission names, plus a sweep of 34 further candidates run
through the same model to catch anything the mission list missed. Sorted by
score. Axis columns are the 0-10 bands.

| Country | ISO | Score | Tier | A GDP | B Trade | C Ally | D Mil | E Pop | F Energy | G Choke | H Region |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Netherlands | NLD | **61.6** | A | 6 | 8 | 8 | 6 | 2 | 4 | 4 | 6 |
| Thailand | THA | **54.2** | B | 4 | 8 | 6 | 4 | 6 | 4 | 4 | 6 |
| Philippines | PHL | **47.4** | B | 2 | 4 | 8 | 4 | 8 | 4 | 4 | 6 |
| Belgium | BEL | **41.5** | B | 4 | 6 | 6 | 4 | 2 | 2 | 0 | 3 |
| Argentina | ARG | **40.8** | B | 4 | 4 | 6 | 2 | 4 | 6 | 0 | 6 |
| Norway | NOR | **39.9** | B | 4 | 2 | 6 | 4 | 1 | 8 | 4 | 3 |
| Malaysia | MYS | **39.2** | B | 2 | 6 | 4 | 2 | 4 | 4 | 6 | 6 |
| Qatar | QAT | **38.9** | B | 2 | 2 | 6 | 6 | 1 | 8 | 4 | 3 |
| **Ireland** | IRL | **36.5** | B | 4 | 8 | 4 | 2 | 1 | 0 | 0 | 3 |
| Denmark | DNK | **36.3** | B | 2 | 4 | 6 | 4 | 1 | 2 | 6 | 3 |
| Chile | CHL | **36.2** | B | 2 | 4 | 4 | 4 | 2 | 8 | 0 | 6 |
| Peru | PER | **33.3** | C | 2 | 4 | 4 | 2 | 4 | 8 | 0 | 3 |
| Romania | ROU | **31.9** | C | 2 | 2 | 6 | 4 | 2 | 2 | 4 | 3 |
| Finland | FIN | **31.1** | C | 2 | 2 | 6 | 4 | 1 | 2 | 4 | 3 |
| Oman | OMN | **30.3** | C | 1 | 1 | 4 | 4 | 1 | 6 | 10 | 3 |
| Greece | GRC | **29.9** | C | 2 | 1 | 6 | 4 | 2 | 2 | 4 | 3 |
| Czechia | CZE | **29.5** | C | 2 | 2 | 6 | 4 | 2 | 2 | 0 | 3 |
| Kuwait | KWT | **29.5** | C | 1 | 1 | 6 | 4 | 1 | 8 | 0 | 3 |
| Austria | AUT | **28.7** | C | 4 | 4 | 2 | 4 | 2 | 0 | 0 | 3 |
| Kenya | KEN | **27.2** | C | 1 | 1 | 6 | 2 | 6 | 2 | 0 | 6 |
| **Bahrain** | BHR | **26.5** | C | 0 | 1 | 8 | 2 | 0 | 4 | 4 | 3 |
| Portugal | PRT | **26.5** | C | 2 | 2 | 6 | 2 | 2 | 2 | 0 | 3 |
| New Zealand | NZL | **25.7** | C | 2 | 2 | 6 | 2 | 1 | 2 | 0 | 3 |
| **Bulgaria** | BGR | **24.1** | C | 1 | 1 | 6 | 2 | 1 | 2 | 4 | 3 |
| **Ecuador** | ECU | **22.9** | C | 1 | 4 | 2 | 2 | 2 | 4 | 0 | 3 |
| **Slovakia** | SVK | **22.1** | C | 1 | 2 | 6 | 2 | 1 | 0 | 0 | 3 |
| Jordan | JOR | **20.9** | C | 0 | 2 | 6 | 2 | 2 | 0 | 0 | 3 |
| **Dominican Republic** | DOM | **20.3** | C | 1 | 4 | 4 | 0 | 2 | 0 | 0 | 3 |
| **Guatemala** | GTM | **20.3** | C | 1 | 4 | 4 | 0 | 2 | 0 | 0 | 3 |
| **Panama** | PAN | **20.3** | C | 1 | 2 | 4 | 0 | 1 | 0 | 8 | 3 |
| **Croatia** | HRV | **20.1** | C | 1 | 1 | 6 | 2 | 1 | 0 | 0 | 3 |
| **Costa Rica** | CRI | **19.5** | C | 1 | 4 | 4 | 0 | 1 | 0 | 0 | 3 |
| Tunisia | TUN | **18.9** | C | 0 | 1 | 6 | 2 | 2 | 0 | 0 | 3 |
| Uzbekistan | UZB | **18.5** | C | 1 | 1 | 2 | 2 | 4 | 4 | 0 | 3 |
| **Sri Lanka** | LKA | **17.7** | C | 1 | 1 | 2 | 2 | 4 | 0 | 4 | 3 |
| **Trinidad and Tobago** | TTO | **17.5** | C | 0 | 2 | 4 | 0 | 0 | 6 | 0 | 3 |
| Angola | AGO | **17.1** | C | 1 | 1 | 2 | 0 | 4 | 6 | 0 | 3 |
| **Djibouti** | DJI | **15.9** | C | 0 | 0 | 6 | 0 | 0 | 0 | 6 | 3 |
| Libya | LBY | **15.7** | C | 0 | 1 | 2 | 2 | 1 | 6 | 0 | 3 |
| Cote d'Ivoire | CIV | **15.5** | C | 1 | 1 | 2 | 0 | 4 | 4 | 0 | 3 |
| Ghana | GHA | **15.5** | C | 1 | 1 | 2 | 0 | 4 | 4 | 0 | 3 |
| **Guyana** | GUY | **15.5** | C | 0 | 2 | 2 | 0 | 0 | 8 | 0 | 3 |
| Myanmar | MMR | **15.5** | C | 0 | 0 | 0 | 4 | 6 | 4 | 0 | 3 |
| Tanzania | TZA | **15.1** | C | 1 | 0 | 2 | 0 | 6 | 4 | 0 | 3 |
| Luxembourg | LUX | 14.8 | - | 1 | 1 | 6 | 0 | 0 | 0 | 0 | 0 |
| Cambodia | KHM | 14.7 | - | 0 | 4 | 2 | 0 | 2 | 0 | 0 | 3 |
| Azerbaijan | AZE | 14.5 | - | 0 | 0 | 2 | 2 | 2 | 6 | 0 | 3 |
| Serbia | SRB | 14.5 | - | 1 | 1 | 2 | 2 | 1 | 2 | 0 | 3 |
| Honduras | HND | 14.3 | - | 0 | 2 | 4 | 0 | 2 | 0 | 0 | 3 |
| Papua New Guinea | PNG | 13.5 | - | 0 | 0 | 4 | 0 | 2 | 4 | 0 | 3 |
| El Salvador | SLV | 13.5 | - | 0 | 2 | 4 | 0 | 1 | 0 | 0 | 3 |
| Zambia | ZMB | 13.1 | - | 0 | 0 | 2 | 0 | 4 | 6 | 0 | 3 |
| Uganda | UGA | 12.9 | - | 0 | 0 | 2 | 2 | 6 | 0 | 0 | 3 |
| Mongolia | MNG | 12.7 | - | 0 | 0 | 4 | 0 | 1 | 4 | 0 | 3 |
| Georgia | GEO | 11.5 | - | 0 | 1 | 4 | 0 | 1 | 0 | 0 | 3 |
| Mozambique | MOZ | 11.5 | - | 0 | 0 | 2 | 0 | 4 | 4 | 0 | 3 |
| Brunei | BRN | 10.8 | - | 0 | 0 | 2 | 0 | 0 | 6 | 4 | 0 |
| Cameroon | CMR | 9.9 | - | 0 | 0 | 2 | 0 | 4 | 2 | 0 | 3 |
| Armenia | ARM | 8.9 | - | 0 | 0 | 2 | 2 | 1 | 0 | 0 | 3 |
| Nepal | NPL | 8.3 | - | 0 | 0 | 2 | 0 | 4 | 0 | 0 | 3 |
| Senegal | SEN | 8.3 | - | 0 | 0 | 2 | 0 | 2 | 2 | 0 | 3 |
| Bolivia | BOL | 7.9 | - | 0 | 0 | 0 | 0 | 2 | 6 | 0 | 3 |
| Lebanon | LBN | 7.9 | - | 0 | 1 | 2 | 0 | 1 | 0 | 0 | 3 |
| Sudan | SDN | 7.9 | - | 0 | 0 | 0 | 0 | 6 | 2 | 0 | 3 |
| Zimbabwe | ZWE | 7.9 | - | 0 | 0 | 0 | 0 | 2 | 6 | 0 | 3 |
| Turkmenistan | TKM | 7.1 | - | 0 | 0 | 0 | 0 | 1 | 6 | 0 | 3 |

**Bold** rows are countries the mission did not name that the model still places
at or above the Tier C admission floor of 15. Fourteen of them: Ireland, Bahrain,
Bulgaria, Ecuador, Slovakia, Dominican Republic, Guatemala, Panama, Croatia,
Costa Rica, Sri Lanka, Trinidad and Tobago, Djibouti, Guyana.

Only one, **Ireland**, clears the Tier B line, and it does so on a single axis:
$152.9B of two-way goods trade with the United States in 2025, which is more than
France, Italy or India. Any expansion that adds Belgium and Denmark but not
Ireland is scoring on intuition rather than on trade.

Three mission-named countries fall below the floor: **Lebanon** (7.9), **Uganda**
(12.9) and **Senegal** (8.3). None is in the current roster, so no floor rule
rescues them. The honest recommendation is to leave them out. If regional texture
in the Levant and West Africa is wanted for its own sake, they enter as Tier C at
Tier C's cost, and this document records that the reason was texture rather than
score.

Panama deserves a note. It scores 20.3, well into Tier C, and it is the only
country in the sweep with an 8 on the chokepoint axis outside Egypt. If a future
scenario batch touches canal transit or hemispheric shipping, Panama's tier
should be revisited rather than the score overridden.

---

## 6. The current roster, tiered by the same model

Applied uniformly, so the model is not one standard for newcomers and another for
incumbents. **C\*** marks a country held at Tier C by a floor rule from section
4.1 rather than by its score.

| Country | ISO | Score | Tier | A GDP | B Trade | C Ally | D Mil | E Pop | F Energy | G Choke | H Region |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| United States | USA | **100.0** | A | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| China | CHN | **96.4** | A | 10 | 10 | 10 | 10 | 10 | 10 | 4 | 10 |
| Canada | CAN | **80.6** | A | 8 | 10 | 10 | 6 | 4 | 10 | 4 | 8 |
| United Kingdom | GBR | **78.6** | A | 8 | 8 | 10 | 10 | 6 | 6 | 0 | 8 |
| Japan | JPN | **77.4** | A | 8 | 8 | 10 | 8 | 8 | 2 | 4 | 10 |
| France | FRA | **77.0** | A | 8 | 8 | 10 | 10 | 6 | 4 | 0 | 8 |
| Germany | DEU | **76.4** | A | 8 | 8 | 10 | 10 | 6 | 2 | 0 | 10 |
| India | IND | **76.4** | A | 8 | 8 | 6 | 10 | 10 | 4 | 4 | 10 |
| Russia | RUS | **72.8** | A | 8 | 1 | 10 | 10 | 8 | 10 | 4 | 10 |
| Mexico | MEX | **69.0** | A | 6 | 10 | 8 | 6 | 8 | 4 | 0 | 8 |
| South Korea | KOR | **68.4** | A | 6 | 8 | 10 | 8 | 6 | 2 | 0 | 8 |
| Italy | ITA | **64.8** | A | 8 | 8 | 8 | 6 | 6 | 2 | 0 | 6 |
| Australia | AUS | **64.4** | A | 6 | 6 | 8 | 6 | 4 | 8 | 4 | 10 |
| Saudi Arabia | SAU | **64.4** | A | 6 | 4 | 6 | 10 | 4 | 10 | 4 | 10 |
| Brazil | BRA | **64.0** | A | 8 | 6 | 6 | 6 | 8 | 6 | 0 | 10 |
| Taiwan | TWN | **62.8** | A | 4 | 10 | 8 | 6 | 4 | 2 | 6 | 6 |
| Indonesia | IDN | **60.2** | A | 6 | 6 | 4 | 4 | 10 | 8 | 6 | 10 |
| Turkey | TUR | **55.4** | B | 6 | 4 | 6 | 6 | 6 | 4 | 6 | 8 |
| Spain | ESP | **55.2** | B | 6 | 6 | 8 | 6 | 4 | 2 | 0 | 6 |
| United Arab Emirates | ARE | **51.4** | B | 4 | 4 | 6 | 6 | 2 | 8 | 6 | 8 |
| Israel | ISR | **51.0** | B | 4 | 4 | 8 | 10 | 2 | 0 | 0 | 8 |
| Vietnam | VNM | **48.2** | B | 2 | 8 | 4 | 4 | 8 | 4 | 4 | 6 |
| Poland | POL | **47.2** | B | 4 | 4 | 8 | 6 | 4 | 2 | 0 | 6 |
| Singapore | SGP | **46.8** | B | 4 | 6 | 4 | 6 | 1 | 4 | 6 | 6 |
| Iran | IRN | **45.6** | B | 2 | 0 | 8 | 4 | 6 | 8 | 10 | 8 |
| Sweden | SWE | **43.0** | B | 4 | 4 | 6 | 4 | 2 | 4 | 4 | 6 |
| Colombia | COL | **42.8** | B | 2 | 4 | 6 | 6 | 6 | 4 | 0 | 6 |
| Pakistan | PAK | **40.4** | B | 2 | 2 | 6 | 6 | 10 | 2 | 0 | 6 |
| Egypt | EGY | **40.2** | B | 2 | 2 | 6 | 2 | 8 | 4 | 8 | 8 |
| South Africa | ZAF | **38.4** | B | 2 | 4 | 4 | 2 | 6 | 8 | 0 | 10 |
| Switzerland | CHE | **36.7** | B | 4 | 8 | 2 | 4 | 2 | 0 | 0 | 3 |
| Morocco | MAR | **34.6** | C | 1 | 2 | 6 | 4 | 4 | 4 | 4 | 6 |
| Nigeria | NGA | **34.4** | C | 2 | 2 | 4 | 2 | 8 | 6 | 0 | 10 |
| Iraq | IRQ | **33.8** | C | 2 | 2 | 4 | 4 | 4 | 8 | 0 | 6 |
| Ukraine | UKR | **32.6** | C | 1 | 1 | 4 | 8 | 4 | 4 | 0 | 6 |
| Algeria | DZA | **31.2** | C | 2 | 1 | 2 | 6 | 4 | 8 | 0 | 6 |
| Kazakhstan | KAZ | **30.8** | C | 2 | 2 | 4 | 2 | 4 | 8 | 0 | 6 |
| Hungary | HUN | **28.9** | C | 2 | 4 | 6 | 2 | 2 | 0 | 0 | 3 |
| North Korea | PRK | **25.1** | C | 0 | 0 | 8 | 4 | 4 | 0 | 0 | 3 |
| DR Congo | COD | **25.0** | C | 1 | 1 | 2 | 0 | 8 | 10 | 0 | 6 |
| Bangladesh | BGD | **22.5** | C | 2 | 2 | 2 | 2 | 8 | 0 | 0 | 3 |
| Ethiopia | ETH | **18.6** | C | 1 | 1 | 2 | 0 | 8 | 2 | 0 | 6 |
| Venezuela | VEN | **18.6** | C | 1 | 2 | 0 | 0 | 4 | 8 | 0 | 6 |
| Iceland | ISL | **15.2** | C | 0 | 1 | 6 | 0 | 0 | 0 | 4 | 0 |
| Belarus | BLR | 9.7 | **C\*** | 1 | 0 | 0 | 2 | 2 | 2 | 0 | 3 |
| Rwanda | RWA | 8.3 | **C\*** | 0 | 0 | 2 | 0 | 2 | 2 | 0 | 3 |
| Yemen | YEM | 8.3 | **C\*** | 0 | 0 | 0 | 0 | 4 | 0 | 6 | 3 |
| Afghanistan | AFG | 4.7 | **C\*** | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 3 |
| Syria | SYR | 4.7 | **C\*** | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 3 |
| Cuba | CUB | 3.1 | **C\*** | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 3 |

Three findings worth acting on separately from any expansion:

1. **Ukraine sits in Tier C at 32.6** and is the widest gap in the table between
   score and narrative weight. The score is honest about why: a $191B economy,
   $3.8B of US goods trade, and no treaty tie. The military axis (band 8, $64.7B
   of 2024 expenditure) is the only place its actual salience shows up. If the
   content plan intends Ukraine to be a Tier B setting, that is a deliberate
   override to be recorded, not evidence the model is wrong.
2. **Ireland (36.5) outranks eleven countries currently in the roster.** So do
   Thailand (54.2) and the Netherlands (61.6). Any argument that the roster is
   already the right fifty has to answer those three.
3. **Six roster members clear no bar without a floor rule.** See section 4.1.

---

## 7. What each tier must author

The schema is strict, so all three tiers author the complete `NationInput`
record. The tiers differ in the depth of the optional structures inside it, and
in the surrounding entity graph. No tier omits a required field, and no tier
introduces one.

### Tier A: full strategic model

Everything Tier B authors, plus:

- **`stats.military.orderOfBattle`** for all six branches, with `headcount` on
  each and `capabilities` and `units` populated on at least the branches the
  country actually projects with. This is the field the schema itself calls out
  as the tiering expressed in shape rather than in a comment: "only the nations
  whose formations the game actually moves pay the authoring cost of naming
  them." Branch headcounts must be re-based onto `activeHeadcount` so the
  validator's order-of-battle sum check passes, exactly as the US entry documents.
- **Three `traits.agendas`** (the schema maximum), each with a distinct
  weight, so campaign-time jitter has room to produce different behavior.
- **Two or more `doctrine.redLines`**, at least one of which a scenario can
  actually cross with an instrument the engine has.
- **`doctrine.alignmentPull`** populated. It is currently unauthored everywhere,
  per the `nations.ts` header. Tier A is where that debt should be paid first.
- **All six `geo.disasterExposure` keys** set, not only the two or three that are
  obviously relevant.
- **Full sector mix** with named `topExports`, three or more entries.
- **Authored cities beyond the capital**: 4 to 5 populated places, so a scenario
  can name a place that is not the capital.
- **Per-entry provenance comment** giving the calibration rationale, matching the
  convention every existing entry uses.

### Tier B: medium

Everything Tier C authors, plus:

- **Two or three `traits.agendas`.**
- **At least one `doctrine.redLine`** that content can target.
- **Three or more `geo.disasterExposure` keys.**
- **Two or three named `stats.topExports`** and a sector mix with more than the
  minimum single entry.
- **2 to 3 authored cities** beyond the capital.
- **Per-entry provenance comment.**

Tier B may legitimately leave out: `orderOfBattle` entirely, `alignmentPull`,
the third agenda, and cities beyond three.

### Tier C: lightweight

The floor. Required because the schema requires it:

- The complete `NationInput` record: identity, geo, all of `NationStats`,
  at least one `sectors` entry, `traits` with at least one agenda, and
  `doctrine` with a posture (an empty `redLines` array is valid).
- **`partySystem`**, because the dataset validator requires it on every shipped
  nation even though the schema marks it optional. `contest: "none"` with an
  empty `parties` array is a legitimate answer and the schema says so: "an
  absent slate is the reading, not a gap in the research."
- **Capital city only.**
- **A one-line provenance comment**, minimum, saying what the figures are and are
  not.

Tier C may legitimately leave out: `orderOfBattle`, `alignmentPull`, all red
lines, agendas beyond the first, `disasterExposure` keys that do not apply,
`identity.currencyPerUsd` (required only on playable nations), any non-capital
city, and any hand-authored relationship, since edges are derived.

Tier C may **not** leave out any `NationStats` scalar. Where a figure is genuinely
unknowable, the entry carries a plausible estimate and the comment says it is an
estimate. That is what the file already does for North Korea, and the standard
should not be relaxed for newcomers.

### Recommended intake order, if expansion proceeds

The model's own ranking, filtered for what the schema makes cheap:

1. **Netherlands** (Tier A, 61.6). The only absent country in Tier A, and it
   would be the roster's fourth-largest US trading partner in Europe.
2. **Thailand, Philippines** (Tier B). Both fill a genuine Southeast Asia gap
   next to Vietnam, Indonesia and Singapore, and both are MNNAs.
3. **Belgium, Argentina, Norway, Malaysia, Qatar, Ireland, Denmark, Chile**
   (Tier B). Eight records at Tier B cost.
4. Tier C in score order, as content demand arises. A Tier C record is cheap
   enough that intake can be demand-driven rather than planned.

---

## 8. Sources

Every figure in section 3's band tables and sections 5 and 6 comes from one of
these. Each was opened during this pass.

| Source | Used for | URL | Retrieved |
|---|---|---|---|
| World Bank, GDP (current US$), NY.GDP.MKTP.CD | Axis A, all countries, 2024 | https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?date=2024&format=json | 2026-09-01 (indicator last updated 2026-07-13) |
| World Bank, Population, total, SP.POP.TOTL | Axis E, all countries, 2024 | https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?date=2024&format=json | 2026-09-01 |
| World Bank, Military expenditure (current US$), MS.MIL.XPND.CD, sourced by the World Bank from the SIPRI Military Expenditure Database | Axis D, 2024 where published | https://api.worldbank.org/v2/country/all/indicator/MS.MIL.XPND.CD?date=2024&format=json | 2026-09-01 |
| SIPRI Military Expenditure Database (the origin of the World Bank series above) | Axis D provenance | https://www.sipri.org/databases/milex | not opened directly; cited as the World Bank series' stated origin |
| US Census Bureau, Trade in Goods with [country], full-year 2025 totals | Axis B, all countries | https://www.census.gov/foreign-trade/balance/ (per-country pages `cNNNN.html`) | 2026-09-01 |
| US Census Bureau, Schedule C country codes | mapping ISO to Census country pages | https://www.census.gov/foreign-trade/schedules/c/countryname.html | 2026-09-01 |
| US Department of State, Bureau of Political-Military Affairs, "Major Non-NATO Ally Status" fact sheet, January 20, 2025 | Axis C, MNNA designations (19 designees plus Taiwan by statute) | https://www.state.gov/major-non-nato-ally-status | 2026-09-01 |
| NATO, "Member countries" | Axis C, 32 members and accession years | https://www.nato.int/cps/en/natohq/topics_52044.htm | 2026-09-01 |
| European Union, "EU countries" | Axis C, 27 members and accession years | https://european-union.europa.eu/principles-countries-history/eu-countries_en | 2026-09-01 |
| EIA Today in Energy, "Amid regional conflict, the Strait of Hormuz remains critical oil chokepoint", June 16, 2025 | Axis G: Hormuz about 20 million b/d in 2024, about 20% of global petroleum liquids consumption; about one-fifth of global LNG trade; Saudi Arabia 38% of Hormuz crude flows (5.5 million b/d) | https://www.eia.gov/todayinenergy/detail.php?id=65504 | 2026-09-01 |
| EIA Today in Energy, "The Strait of Hormuz is the world's most important oil transit chokepoint", November 21, 2023 | Axis G: 21 million b/d in 2022; Hormuz lies between Oman and Iran | https://www.eia.gov/todayinenergy/detail.php?id=61002 | 2026-09-01 |
| EIA Today in Energy, "Red Sea chokepoints are critical for international oil and natural gas flows", December 4, 2023 | Axis G: Suez, SUMED (2.5 million b/d capacity, in Egypt) and Bab el-Mandeb carried about 12% of seaborne-traded oil and about 8% of world LNG trade in 1H2023 | https://www.eia.gov/todayinenergy/detail.php?id=61025 | 2026-09-01 |
| USGS, Mineral Commodity Summaries 2025, Figure 2 (2024 US net import reliance and leading import sources 2020-23) | Axis F: rare earths 80% reliant (China, Malaysia, Japan, Estonia); graphite 100% (China, Canada, Mexico, Mozambique); cobalt 76% (Norway, Finland, Japan, Canada); chromium 77% (South Africa, Kazakhstan); platinum 85% (South Africa); potash 93% (Canada, Russia, Belarus, Israel); lithium >50% (Chile, Argentina); nickel 48% (Canada, Norway, Australia, Brazil); refined copper 45% (Chile, Canada, Mexico, Peru) | https://pubs.usgs.gov/periodicals/mcs2025/mcs2025.pdf | 2026-09-01 |
| USGS MCS 2025, Cobalt chapter | Axis F: DR Congo about 76% of world cobalt mine production in 2024, Indonesia about 10%; China the leading refiner and consumer | same PDF | 2026-09-01 |
| USGS MCS 2025, Copper chapter, world mine production 2024e (thousand tons) | Axis F: Chile 5,300; DR Congo 3,300; Peru 2,600; China 1,800 mine / 12,000 refinery; world total 23,000 | same PDF | 2026-09-01 |
| USGS MCS 2025, Lithium chapter, world mine production 2024e (tons) | Axis F: Australia 88,000; Chile 49,000; China 41,000; Argentina 18,000; Brazil 10,000 | same PDF | 2026-09-01 |
| USGS MCS 2025, Nickel chapter, world mine production 2024e (tons) | Axis F: Indonesia 2,200,000 of a 3,700,000 world total; Philippines 330,000; world reserves: Indonesia 55,000,000 | same PDF | 2026-09-01 |
| USGS MCS 2025, Rare earths chapter, world mine production 2024 (tons REO) | Axis F: China 270,000 of a 390,000 world total; United States 45,000; Burma 31,000 | same PDF | 2026-09-01 |
| USGS MCS 2025, Graphite and Niobium chapters | Axis F: China about 78% of world graphite production in 2024; Brazil about 92% of world niobium | same PDF | 2026-09-01 |

### Sources deliberately not used

- **OPEC membership list** (https://www.opec.org/member-countries.html): the
  server returned HTTP 403 to every request in this pass. OPEC membership is not
  load-bearing for any score here; the energy axis is scored on EIA and USGS
  production and reliance data instead. If a later phase wants OPEC membership as
  a modeled fact, it needs its own verification.
- **UNCTAD and USTR**: not opened. Their bilateral trade series would duplicate
  the Census figures, which are the primary record for US goods trade and were
  retrieved directly. Cited here only to say they were not used, so nothing in
  this document rests on them.
- **IMF World Economic Outlook**: not opened. World Bank national accounts cover
  every scored country except Taiwan, North Korea, Cuba, Syria and Yemen, all of
  which are handled in section 9.

---

## 9. Unverified register

Everything below is marked `[unverified]` in the sense the mission asked for: it
was used in the model but not confirmed against a primary source in this pass. In
every case the band is stated along with how sensitive it is, because a band that
survives the uncertainty is a different problem from one that does not.

| Country | Figure | Value used | Band | Sensitivity |
|---|---|---|---|---|
| Taiwan | GDP 2024 | ~$800B `[unverified]` | A = 4 | Robust. Any value from $500B to $1T gives band 4. The World Bank does not publish Taiwan. |
| Taiwan | Population | 23.4M `[unverified]` | E = 4 | Robust. Band 4 spans 20M to 50M. |
| Taiwan | Defense spending | ~$30B, FY2026 regular MND budget, from secondary reporting only `[unverified]` | D = 6 | Robust. Band 6 spans $15B to $40B, and both the older ~$16.5B figure and the FY2026 ~$30B figure land in it. |
| UAE | Military expenditure | ~$22B `[unverified]` | D = 6 | **Sensitive.** SIPRI has not published a UAE figure since 2014; the World Bank series is empty. A true value below $15B would drop UAE to band 4 and its score from 51.4 to 48.4, which does not change its tier. Tier B holds either way. |
| Qatar | Military expenditure | $15.41B, 2022, latest World Bank/SIPRI value | D = 6 | **Sensitive.** Sits directly on the band boundary. A 2024 value below $15B drops Qatar to band 4 and its score from 38.9 to 35.9, still Tier B but only just. |
| Vietnam | Military expenditure | $5.5B, 2018, latest World Bank/SIPRI value | D = 4 | Moderately robust. Band 4 spans $5B to $15B; a modest real increase since 2018 keeps it there or promotes it. |
| North Korea | GDP | not published; scored 0 | A = 0 | Robust. Every credible estimate is well under the $75B band floor. |
| North Korea | Military expenditure | $1.6B, 2018 World Bank/SIPRI | D = 2, +2 nuclear = 4 | Robust in effect. The nuclear adjustment dominates and no plausible spending figure changes the tier. |
| Cuba, Syria, Yemen | GDP | not published; scored 0 | A = 0 | Robust for Syria and Yemen. **Cuba is uncertain**: estimates at the official exchange rate exceed $100B, which would be band 1 and would raise Cuba from 3.1 to 5.1. Still below the floor; Cuba is retained by floor rules F1 and F3 regardless. |
| Uzbekistan, Libya, Djibouti, Turkmenistan, Sudan, Afghanistan | Military expenditure | latest available World Bank/SIPRI year where any exists, else 0 | D = 0 to 2 | Immaterial. None is within 5 points of a tier boundary. |
| Saudi Arabia | MNNA status | The January 20, 2025 State Department fact sheet lists 19 designees and does not include Saudi Arabia. Reporting from November 2025 describes a Saudi MNNA designation `[unverified against state.gov as of this retrieval]`. | C = 6 | If confirmed, Saudi Arabia moves from band 6 to band 8 on axis C, raising its score from 64.4 to 68.0. Tier A either way. |
| Axis C, F, G, H generally | Judgment axes | Rule-bound, not measured | - | These four axes carry 37 of the 100 points. The rules in section 3.3 constrain them, but a second reader would not reproduce every assignment exactly. The tier boundaries are far enough from most scores that this rarely matters; the cases where it does are Chile (36.2), Ireland (36.5) and Denmark (36.3), all within 1.5 points of the Tier B/C line. |

### Data hygiene note

The US Census country-page scrape in this pass initially mismapped five Census
country codes (Ethiopia, Tanzania, Uganda, Senegal and Uzbekistan resolved to
Djibouti, Seychelles, the British Indian Ocean Territory, Mauritania and Georgia
respectively). All five were caught by an implausibility check against the
country name embedded in each page and re-fetched. Any later phase that
re-derives the trade axis should map through the Census Schedule C name table
rather than through a hand-written FIPS mapping, and should assert the country
name on the fetched page before trusting the number.
