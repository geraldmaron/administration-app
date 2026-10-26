# Lane: home events (Wave 3)

BL-294 (BR-02, BR-03), BL-295 (BR-08, BR-09), BL-296 (BR-07). Branch `lane/wd-home`, based on `d2d7649f7`.

## What changed

### BL-295: hazard calibration and Stafford eligibility

1. **The home queue reads the national record** (`condition-onset.ts`). The United States no longer draws from its authored `geo.disasterExposure` times 0.06. Each acute kind opens at the annual rate in `US_SIGNIFICANT_HAZARDS_PER_YEAR` (world, `state-hazards.ts`): NOAA NCEI billion-dollar events, 2005 to 2024 (severe storms 8.4 a year as the tornado kind, tropical cyclones 2.0, flooding 1.45, wildfire 0.8, winter storms and freezes 0.75, drought and heat 0.45 each), cut to the costliest four in ten (`HOME_SIGNIFICANT_SHARE`, 0.4, a design value); earthquakes (OpenFEMA, 0.4 a year) and outbreaks (HHS/ASPR disease public-health emergencies, 0.2 a year) are taken whole. The weekly chance is `1 − exp(−rate × 7/365)` times the existing season weight. Abroad is unchanged (authored exposure × 0.012).
2. **Onset severity has a tail** (`onsetSeverity`): `0.2 + 0.8 × u^(5/3)` off the same single draw, mean 0.50 as before, median 0.45, one in ten above 0.87, maximum 1. Applies abroad too; the mean (and so the average bill) is unchanged.
3. **Placement reads hazard exposure inside the gate** (`us-placement.ts`). Region-scope draws weight a state by its recorded events a year (`STATE_HAZARD_EXPOSURE`: SPC tornadoes 1995 to 2024; OpenFEMA flood, cyclone, winter-storm, earthquake and fire declarations 2005 to 2024), plus add-half smoothing so an eligible state the record never named stays reachable. City-scope tornadoes weight a city by SPC tracks within fifteen miles of it (`CITY_TORNADOES_PER_YEAR`); other recorded kinds share their state's rate among its cities by population. Heat and pandemic still read population, drought every eligible state alike. New `nationFootprint`: a nationwide hazard reaches the eligible states of one Census region, drawn through the same weights; a nationwide epidemic reaches every state.
4. **Impacts fitted to a comparable incident series** (`impact-catalog.ts`, `impact-adapters.ts`). Per natural hazard, `fatalityRate`, `damageShare` and a new `HAZARD_FOOTPRINT_SHARE` (the share of the filed place's people inside the event, replacing the flat 0.05) are fitted so mean deaths and mean loss per event match the costliest 40 percent of NOAA billion-dollar events of that type, 2005 to 2024. `IMPACT_CALIBRATION.sourceRefs` now cites NOAA NCEI, NWS hazstat, OpenFEMA and SPC; status stays `provisional` because exposures are still country proxies and the earthquake, outbreak, cyber, industrial and strike rows are unfitted, which its basis says.
5. **Stafford requests follow affected geography and state capacity** (`obligations.ts`). A hazard asks from its state, or for a nationwide one from its footprint states (`statesOwedBy`, exported, keyed on the condition so every reader agrees); a standing condition still asks every state at the national share; a home event asks no state unless it happened in one. A governor files a request when the state's share of estimated public damage reaches half of the statewide per-capita indicator ($1.94, Federal Register 2026-19855, 44 C.F.R. 206.48(b)(1)); `beyondStateCapacity` is that damage at or above the full indicator. Public damage is the impact record's first-day asset loss times a public share (a quarter for hazards that destroy structures; 0.005 for heat and drought, set where even a severe nationwide heat wave stays under the indicator, as all twenty years of the OpenFEMA record did). The plan, resources and cost-share certifications stay `true`: they are what every request certifies (44 C.F.R. 206.36), and the legal test stays at the declaration (`stafford.ts`, unchanged).
6. **Fiscal-crisis referent written down, no rate asserted.** The condition models loss of market access (`STANDING_PRESSURE["fiscal-crisis"]`, "market access, read off the country alone"): a government unable to borrow on terms it can pay, the episode that ends in an IMF program, a restructuring or a forced consolidation. Its denominator is market-access crises, not defaults; candidate series (Laeven-Valencia sovereign debt crises; IMF arrangements approved per year) were not opened. The 21 spells a year abroad is not tested against anything.

### BL-294: home event families

Each family was traced trigger → record → response before building:

| Family | Before (trace) | Now |
|---|---|---|
| Cyberattack | Trigger: `emergingOperators` walked hosts alphabetically and kinds in table order and stopped at the cap, so twelve slots filled with cartels, insurgencies and market blocs from Afghanistan to Azerbaijan and **no intrusion crew rooted anywhere in any measured run**. Record: a crew's act only ever opened an impact event on its own host. Response: none at home (impact events are not Desk matters). | `operators.ts`: emergence slots go to the lowest draw over pressure (the `claimOnsetSlots` rule), so crews root where pressure is (Sudan, Brazil, Kazakhstan, Bolivia across seeds). An intrusion crew picks its victim (`cyberVictim`): weight = victim GDP × (1 + 2 × the host's hostility to it) × (1 − 0.5 × the victim's counterintelligence). The outage impact record, feed line and stability cost go to the victim. The ordinary intrusions stay records; one in two notable intrusions into American systems that week opens a `cyberattack` condition (`CYBER_ESCALATION`, design), answered by CISA and the FBI. |
| Work stoppage | No kind, no record, no path. | `work-stoppage` condition: 0.3 a year in a calm labor market plus 0.7 at a full real-wage squeeze (US inflation four points over its own normal), anchored to BLS major stoppages doubling (15 a year 2005-2017, 31 in 2024) when prices outran wages; one at a time; nation scope; answered by industry (labor) policy. |
| Bank failure | No kind. | `bank-failure` condition: 0.02 a year in calm water, up to 1 a year while the ten-year has risen 1 to 3 points since the oath or the cycle is in a slump (every $10 billion FDIC failure 2005-2024 fell in one of two stress windows); one episode at a time; placed in a state by population; answered by fiscal policy. |
| Mass-casualty attack | No kind. | `mass-casualty-attack` condition, an incident (one afternoon): 1.1 a year, the Mother Jones count of public mass shootings killing ten or more, 2005-2024; city scope by population; FBI, ATF and the states respond; the state it happened in gets a claim. |
| Hostage or wrongful detention | No kind. | `wrongful-detention` condition: 0.8 a year per unit of captor weight, summed over governments whose trust toward Washington is at or below −0.2, weighted by hostility × (1 − press freedom); the founding world carries about 2.3 units (China, Cuba, Iran, Kazakhstan, North Korea, Russia; Belarus on some seeds), about 1.9 a year. Foley Foundation: 422 U.S. nationals 2001 to July 2023, 14 new cases in 2025; about one in ten is taken as a President's file. The beat names the captor. Nation scope; no state claim. |

The five are a third condition family, `"event"` (`HOME_EVENT_CONDITIONS`, `conditionFamily`), home only, in the same record, store, flag, Desk row, `conditionActive` gate and response roster as every other condition. They join the home queue (one opening a week, shared with the hazards). Onset is `condition-home-events.ts` (new). None is Stafford-eligible; none writes what its onset reads (tested).

**BR-03, domestic actor conflict: traced, not built here.** None of the three missing families has an eligible cause in this lane's files:

- *Governor against legislature.* `packages/world/src/schemas/state.ts:4` states the design ("Not fifty legislatures"); no state carries a legislature's party control, so no veto, override or special-session cause exists to read. `state-legislature.ts` is the federal Congress. Needs a dataset decision (NCSL partisan composition by state) before any event.
- *Federal Reserve independence.* `INST-FED` is in the catalog (`institution-catalog.ts:607`) and reached only by a presidential directive (`directives.ts:225`). An unprompted fight needs a cause on the institutions or oversight side (for example a committee inquiry into the Fed when inflation runs over target). Institutions lane.
- *Primary challenge.* The only writer is `cabinet-revolt.ts:78`, a disloyal Secretary sounding out a challenge to the President, which the idle runs never reached. Members of Congress have no primaries (`election-seating.ts`, elections lane). The eligible cause the item names (a member out of step with the district before the filing deadline) needs the election calendar's primary dates.

Committee inquiries and cabinet leaks pass and were not touched.

### BL-296: recurrence contract and scenario signatures

1. **The contract** (`scenario-director.ts`, `recurrenceKind`, `recurrenceAllows`). A unique incident (`once`) happens once a campaign; an arc member (`family`) follows its family; an episode-bound matter (a cast that binds a subject: report, trade measure, bill, judicial vacancy, court case, oversight matter; or a `conditionActive` gate) comes back only for a new episode (a new subject, or a gated condition that opened after its last occurrence) and never inside the class cooldown; recurring business rests `RECURRING_REST_TURNS` (13 weeks) after it was last raised. Before: every non-once, non-family template could return six weeks after it was raised.
2. **Scenario matters carry an attention signature** (`player-core/src/conversation/scripts.ts`, `scenarioMatterSource`): `hard` or `open`, the Desk's own level rule. A staged occurrence stops the world once and again only if it turns hard; its id already names the occurrence, so a new episode is a new matter.

## Files

- **Owned, edited:** `packages/engine/src/condition-onset.ts`, `condition-kinds.ts`, `conditions.ts`, `us-placement.ts`, `impact-catalog.ts`, `impact-adapters.ts`, `obligations.ts`, `operators.ts`; `packages/world/src/dataset/state-hazards.ts`; `packages/content/src/scenario-director.ts`; `packages/player-core/src/conversation/scenario-recurrence.test.ts`; and the tests of the owned modules: `condition-home-rate`, `condition-incidents`, `condition-onset`, `conditions`, `impact-event`, `law-eight`, `obligations`, `operators`, `us-placement`.
- **New:** `packages/engine/src/condition-home-events.ts` and `.test.ts`; `packages/world/src/dataset/state-hazards.test.ts`; `packages/world/sources/hazard-exposure-sources.md` (DECISIONS §4.11 provenance).
- **Outside the brief's list, additive rows only, flagged:** `packages/engine/src/condition-impacts.ts` (IMPACTS and hazard words for the five kinds; `condition-*` in the program's lane table), `article-condition.ts` and `article-domestic.ts` (footprint `"event"`, onset ledes and cost lines), `response.ts` (`RESPONSE_MEMBERS` rows), `apps/player/src/nation/glyphs.ts` and the frozen `apps/web/src/shell/glyphs.ts` (glyph rows; both are `Record<ConditionKind, …>` and would not compile otherwise), `packages/player-core/src/conversation/scripts.ts` (the scenario signature, which BL-296 assigns here).
- **Other lanes' tests edited** (they encoded "any condition files a Stafford request"): `orders.test.ts` and `executive-authority.test.ts` compute the obligation packets on a copy of the fixture nation scaled to its own states (the fixture nation has 5 million people and Michigan alone has 10), then apply those packets to the campaign under test unchanged.
- **Not edited:** state type modules, `save.ts`, `effects.ts`, `effect-types.ts`, `resolution.ts`, `index.ts`, `world-events.ts`, `attention.ts`, `advance.ts`, the probes, `dist/`.

## Save migration

None. `ConditionKind` gains five members; no save stores a family or validates kinds; an old save has none of them. `NationCondition` is unchanged (the captor is in the onset beat). The world `dist/` must be rebuilt before the engine sees the new tables: engine tests here ran with `@admin/world` aliased to source.

## Proof

Probes run against this tree with `@admin/world` (engine) and `@admin/engine`, `@admin/content`, `@admin/world` (player-core) aliased to source by configs outside the repository. Before: the unmodified tree at `d2d7649f7` with the shipped probe configs (world read from its committed `dist/`, current as of `d32595f27`).

**Events probe** (`events.probe.test.ts`, three idle 208-week runs, `ev-1` to `ev-3`): 11 failed, 11 passed, 5 todo → **4 failed, 18 passed, 5 todo**.

| Assertion | Before | After |
|---|---|---|
| A acute conditions at home, 4 to 12 a year | 4.67, pass | 4.75, pass |
| A NYC share of city-scope tornadoes under 0.02 | 0.098, fail | 0.003, **pass** |
| A Stafford requests for one nation-scope heat wave under 51 | 51, fail | 0, **pass** |
| A catalog cites a source | none, fail | 4 references, **pass** |
| A report: onset severity range | 0.300 to 0.700 | 0.200 to 1.000 |
| A report: hurricanes per run; heat, tornado deaths a year | 0, 1, 3; 0.17; 68.7 | 0, 1, 3; 3.5; 31.6 |
| B cyberattack at home | 0, fail | 4, **pass** |
| B mass-casualty attack | 0, fail | 5, **pass** |
| B labor strike | 0, fail | 0, **fail** (see below) |
| B bank failure | 0, fail | 1, **pass** |
| B hostage or wrongful detention | 0, fail | 3, **pass** |
| C governor/legislature, Fed, primary | 0, 0, 0, fail | 0, 0, 0, fail (traced above, other lanes) |
| C investigations, leaks (controls) | 2, 6 | 7, 7 |
| C deaths, Congress deaths, judicial seats, coups a year, exits (controls) | 16/14/19; 9/8/14; 13/15/14; 5.17 (23, 15, 24); OPEC+ 1 | 16/14/19; 9/8/14; 13/15/14; 5.17 (22, 17, 23); OPEC+ 1 |
| C report: fiscal-crisis spells a year | 20.9 | 21.0 |
| E passive cabinet bands | pass | pass, identical |

B labor strike: the hazard on these three seeds summed to 1.27 and 1.67 expected stoppages over four years on `ev-1` and `ev-2` (calm labor market, no squeeze) and none fired; across six seeds the rate is 0.33 a year (seven in 24 years, all on seeds with a squeeze). The probe's "at least one in three runs" is a floor the methodology rules out; the honest target is the rate (below). Not tuned to pass.

**Engagement probe** (player-core, deferring President, one year each; answering President two years): stops per 30 days **8.14 → 6.74** on `ev-1` (99 → 82 stops) and **6.66 → 6.49** on `ev-2` (81 → 79): did not rise. Answering everything for two years: 129 answered, 1 repeat within 56 days and 10 within 90 → 106 answered, **0 within 56 and 3 within 90** (each a new subject of an episode-bound template). One removal stop per episode on both seeds; every 30-day window busy; first-year scenario overlap 0.21 → 0.15. B2 (no scenario gated on cyclone, wildfire or tornado) fails before and after: content.

**Event counts by class against sourced base rates** (six idle 208-week runs, `ev-1` to `ev-6`, 24 campaign-years, production scheduler):

| Class | Simulated a year | Sourced base rate it is drawn from | Target |
|---|---|---|---|
| Tornado / severe storm | 3.08 | NOAA billion-dollar severe storms 8.4 × 0.4 = 3.36 | rate |
| Hurricane | 0.54 | NOAA tropical cyclones 2.0 × 0.4 = 0.80 | rate |
| Flood | 0.50 | NOAA flooding 1.45 × 0.4 = 0.58 | rate |
| Wildfire | 0.25 | NOAA 0.8 × 0.4 = 0.32 | rate |
| Winter storm | 0.08 | NOAA 0.75 × 0.4 = 0.30 | rate |
| Drought, heat wave | 0.25, 0.25 | NOAA drought class 0.9, split, × 0.4 = 0.18 each | rate |
| Earthquake | 0.13 | OpenFEMA 0.4 | rate |
| Outbreak | 0.13 | HHS disease emergencies 0.2 | rate |
| Cyberattack (President's file) | 0.63 (of 1.58 intrusions into US systems) | design share of operator intrusions | design |
| National strike | 0.33 | BLS major stoppages 15 to 31 a year; national share design | 0.3 to 1.0 |
| Large bank failure | 0.13 | FDIC: 12 failures of $10B+ in 20 years, in two windows | 0.02 to 1.0 by stress |
| Mass killing (10+) | 1.38 | Mother Jones 1.1 | rate |
| American held abroad | 1.13 | Foley 14 to 27 new cases a year; one in ten design | about 1.9 |
| Unrest, recession, fiscal crisis (unchanged mechanisms) | 0.71, 0.21, 0.04 | | |

Simulated rates sit under the targets where the home slot (one opening a week) and the one-at-a-place rule refuse onsets, most for detentions (one nation-scope case at a time).

Deaths and losses a year at home over the same runs, against NOAA (costliest-40% subset per event, times the rate above) and NWS 30-year averages: tornado 65.9 deaths and $14.2B (NOAA subset 55 and $13.4B; NWS tornado 73); hurricane 336 deaths and $62.1B (NOAA all tropical cyclones 321 and $62.6B); winter storm 32.3 (NWS winter 33); heat 24.3 (NWS heat 180, most of which is not attached to a significant event); flood 4.6 (NWS 94: NOAA files most flood deaths under the storm that caused them); outbreak 186 (unfitted). Stafford requests 10.2 a year; 97.5 percent carry the capacity finding.

**Regression tests:**
- `us-placement.test.ts`: NYC under 0.02 of city-scope tornadoes and below Oklahoma City; region-scope tornadoes in TX, KS and OK over five times the Northeast's; Oregon reachable for an earthquake through the floor and below California; heat still population-weighted; a nationwide hurricane's footprint is one Census region of eligible states, a nationwide epidemic the whole country; hurricanes weighted by record (Florida over Texas whatever their populations).
- `obligations.test.ts`: footprint claims in one region; a recession asks every state; a strike and a detention ask none; no heat-wave request even at severity 0.9; capacity read at the per-capita indicator; a mild local flood in a large state carries no capacity finding; a request without the finding cannot be declared.
- `condition-home-events.test.ts`: each family's eligible cause moves its chance in the right direction; one-at-a-time episodes; a cyberattack file only in a week of an intrusion; captors are hostile governments and are named; a mass killing is a city incident; no home event writes what its onset reads.
- `condition-onset.test.ts`: severity mean 0.5, median under 0.46, one in ten over 0.85, maximum near 1.
- `operators.test.ts`: an intrusion crew reaches the United States from abroad; the stability cost lands only when the victim is the United States; emergence is not alphabetical.
- `scenario-recurrence.test.ts`: recurring business is not back at 56 days or 12 weeks and is at 13; an episode-bound template does not recur inside one episode and does after a new one opens, never inside the class cooldown.
- `state-hazards.test.ts` (world): every kind sourced; keys are real states and cities; NYC far below Oklahoma City.

**Tests updated because they encoded the old behavior:** `condition-home-rate.test.ts` (the 0.06 constant; the wildfire city now leads by fire record then population), `conditions.test.ts` (home no longer reads authored exposure; the exposure tests now use a foreign nation, plus one that home strikes from the record), `us-placement.test.ts` (state weight by record, not population), `obligations.test.ts` (a nationwide hazard no longer claims all 51 states), `law-eight.test.ts` and `condition-incidents.test.ts` (the new family and incident kind), `impact-event.test.ts` (the calibration now has references, so the "calibrated needs references" check passes an empty list explicitly), `scenario-recurrence.test.ts` (56 days was the old contract), `orders.test.ts` and `executive-authority.test.ts` (see Files).

**Tests run** (targeted): engine, with world aliased to source: the 24 files that import the changed modules (article-coherence, condition-concurrency, condition-fixtures, condition-home-rate, condition-incidents, condition-onset, condition-seasons, conditions, condition-home-events, condition-program-attention, divergence, fiscal-authority, executive-authority, impact-event, impact-week-clock, law-eight, macro-drivers, obligations, macro, operators, policy, orders, response, us-placement): all pass. Content (director and attention pacing): 52 pass. Player-core conversation, campaign, desk and summons, with sources aliased: 53 files, 463 pass, then the recurrence test, 3 pass. World `state-hazards.test.ts`: 5 pass. `npx tsc --noEmit -p packages/world` clean (its `tsconfig.tsbuildinfo` deleted). A non-emitting typecheck of engine, world, content and player-core together against source (config outside the repository) is clean except one player-core error in `persistence/payload-codec.ts` that this lane did not touch and that comes from the combined lib settings. Not run, per lane rules: build, workspace typecheck, lint, the full suite, verify gates, balance harness, `apps/player` typecheck.

## Doc amendments for the integrator

**DECISIONS §6.5, append:**
> **Amended 2026-10-25 (world dynamics Wave 3, home events):** a third family, home events (`HOME_EVENT_CONDITIONS`: cyberattack, work stoppage, bank failure, mass-casualty attack, wrongful detention), uses the same record. Each family opens from a sourced base rate and an eligible cause read off the campaign, at home only, and only for the cases that reach a President; the ordinary run of each family (intrusions, strikes, bank closures, detentions) is the population the case is drawn from, not a record per event, so more incidence does not mean more stops. A home event is never Stafford-eligible and asks no state for relief unless it happened in one.
> **Where:** `packages/engine/src/condition-home-events.ts`; `condition-kinds.ts`.

**DECISIONS, new §6.5a "The home queue reads the country's own record":**
> At home, an acute condition opens at the annual rate of its kind in the national record (`US_SIGNIFICANT_HAZARDS_PER_YEAR`, NOAA NCEI billion-dollar events, OpenFEMA earthquakes, HHS disease emergencies), cut to the costliest four in ten for the billion-dollar series, as a weekly hazard. Inside the eligibility gate a hazard lands where its record says (state and city exposure tables), not where people live, except heat and disease. A nationwide hazard reaches one Census region of eligible states; a nationwide epidemic reaches every state. Impact fatality and loss per event are fitted to the same series.
> **Why:** a population weight put one city-scope tornado in ten in New York City, and a nationwide heat wave filed a governor's request from every state.
> **Where:** `condition-onset.ts`; `us-placement.ts`; `impact-catalog.ts`; `packages/world/src/dataset/state-hazards.ts`; `packages/world/sources/hazard-exposure-sources.md`.

**DECISIONS, new §6.5b "A request is not a declaration":**
> A governor asks for a major-disaster declaration only from a state the hazard reached, and only when the state's share of estimated public damage reaches half the statewide per-capita indicator; the request carries a capacity finding when the damage reaches the indicator. Whether a declaration is lawful is decided when the President declares.
> **Where:** `obligations.ts` (`statesOwedBy`, `governorAsk`); `stafford.ts`.

**DECISIONS §2.2, replace "Matters without a signature (scenarios) stop on every look until their own contract lands." with:**
> A staged scenario carries a signature too: its level (hard, or open for soft and ambient). It stops the world once per occurrence and again only if it turns hard; its id names the occurrence, so a new episode is a new matter.

and in "Proposed attention budget", replace the measured figures with "measured 6.7 and 6.5 on the engagement probe's two seeds with scenario signatures on, 2026-10-25". The number is still the attention lane's to set.

**DECISIONS, new §7.13 "A scenario recurs by what kind of matter it is":**
> A unique incident (`once`) happens once a campaign. An arc member follows its family. An episode-bound scenario (one that binds a subject, or gates on a running condition) comes back only for a new episode and never inside the class cooldown. Recurring business rests thirteen weeks after it was last raised.
> **Why:** a template that could return six weeks after it was raised brought the same question back ten times inside ninety days in two years of answering everything.
> **Where:** `packages/content/src/scenario-director.ts` (`recurrenceKind`, `recurrenceAllows`); `packages/player-core/src/conversation/scenario-recurrence.test.ts`.

**SCHEMA.md** (line 387, the `StateDisasterEligibility` paragraph): replace "the engine (`placeUsOnset`, `packages/engine/src/conditions.ts`) picks uniformly within the eligible set, so a state on the list can be hit as often as any other state on it" with "the engine (`placeUsOnset`, `packages/engine/src/us-placement.ts`) weights inside the eligible set by `STATE_HAZARD_EXPOSURE` (recorded events a year per state, with `HAZARD_EXPOSURE_FLOOR` for a state the record never names) and, for city-scope tornadoes, `CITY_TORNADOES_PER_YEAR`". Add after it: "`US_SIGNIFICANT_HAZARDS_PER_YEAR` and `US_HAZARD_RATE_SERIES` (same file) are the home onset rates by kind and the series each came from; sources in `packages/world/sources/hazard-exposure-sources.md`. These are typed dataset constants, not zod schemas."
SCHEMA.md §7b (conditions): `ConditionKind` gains `cyberattack`, `work-stoppage`, `bank-failure`, `mass-casualty-attack` (an incident kind) and `wrongful-detention`; `conditionFamily` returns `"acute" | "standing" | "event"`.
SCHEMA.md "Stafford declarations" (line 1787): append "A request is filed only from a state the hazard reached (`statesOwedBy`); `beyondStateCapacity` is the state's share of estimated public damage at or above the statewide per-capita indicator times its population; the three certifications are true on every request filed."

**ARCHITECTURE.md:**
- Line 879: replace "Onset draws for the home country run at their own rate, `HOME_DISASTER_ONSET_RATE` (0.06), scaling the player's own country only" with "Onset draws for the home country read the national record (`US_SIGNIFICANT_HAZARDS_PER_YEAR`, cut to `HOME_SIGNIFICANT_SHARE` 0.4 for the billion-dollar series) as a weekly hazard, scaling the player's own country only".
- Line 976, "Conditions: two families, one mechanic": becomes three families; add "`HOME_EVENT_CONDITIONS`, the five home events, opened by `condition-home-events.ts` from sourced base rates and eligible causes read off the campaign".
- Operators (wherever `operators.ts` is described): emergence slots go to the lowest draw over pressure, not to the front of the alphabet; an intrusion crew picks its victim by output, hostility and counterintelligence, and the outage, feed line and stability cost go to the victim.

## Proposed probe edits (integration owns the probes)

1. **A todos → bands** (six seeds, 208 weeks): deaths per significant event by hazard within a factor of two of the NOAA costliest-40% means (tornado 16.4, cyclone 382, flood 13.3, wildfire 52.8, winter storm 80.8, heat 126); severity tail: share of onsets at or above 0.9 between 0.05 and 0.15 (measured analytically 0.077). Hurricanes: rate 0.3 to 1.2 a year across seeds.
2. **B → rates across six seeds**, in place of "at least one in three runs": cyberattack files 0.2 to 2 a year; national strikes 0.1 to 1.5; large bank failures 0.01 to 1; mass killings 0.5 to 2.2 (Mother Jones 1.1); Americans held 0.5 to 4.
3. **D2 todo → assertion**: for a President who answers everything, no recurring-business template recurs within 91 days, and no episode-bound template recurs inside one episode (measured: 0 within 56 days, 3 within 90, each a new subject).

## Requests for other lanes

1. **World data lane.** The US `geo.disasterExposure` (`nations.ts:171`) is no longer read for the home queue; it still feeds anything else that reads exposure. Either keep it as the abroad-style reading or align it to the record shares.
2. **Content (writers' room).** Readers for the five new kinds (`conditionActive` gates) and for cyclone, wildfire and tornado (engagement B2). The director's `subjectPressure` maps no class to the new kinds yet.
3. **Institutions, elections, governors owners.** BR-03 as traced above: a state legislature dataset decision, a Fed cause on the oversight side, member primaries on the election calendar.
4. **Attention lane.** Before this lane the most repeated stop on `ev-1` was one unrest condition in Syracuse (7 stops in a year); with scenario signatures on, the top repeat is the removal summons (one per rung). A standing condition's stance flipping across a band edge is the remaining re-stop to look at.

## Risks and what is left

- **Balance.** Home conditions rose from about 6 to about 10 a year (5.2 hazards, 3.6 home events, the rest standing), each billing its `IMPACTS` row; hurricanes and winter storms now reach whole metros, so deaths and losses are an order of magnitude higher where they were far under the record. The stop count fell, but approval, stability and reserves under the balance harness are not measured here. Wave 4's 12-seed run has to read them.
- **Unfitted rows:** earthquake (153 mean deaths an event, no comparable series opened), outbreak (186 deaths a year), cyber, industrial and strike impacts.
- **Cyber crew hosts** come from the existing host-weakness pressure formula, so state-linked crews in Russia or China do not root; the victim weighting is what brings intrusions to the United States.
- **Design shares** carry no benchmark: the significant share (0.4), the cyber escalation (0.5), the strike and detention presidential shares, the public loss shares, the request threshold (half the indicator).
- **Not done:** BR-03 families (other lanes' files), content readers, probe edits (integration), world `dist/` rebuild.
