# Grounded casting: adversarial verification of AUDIT.md

Verified 2026-10-13 on `codex/simulation-depth-completion`. Read-only apart from this file. All four probes were read before running and were run one at a time from the repo root against committed `packages/*/dist` and `content/corpus/shards` (322 scenarios, 18 shards). No builds, workspace tests, verify sweeps or Playwright. One-off checks were scripts in the session scratchpad that import the same `dist/`.

## Outcome

The audit's measurements reproduce exactly. Two framings overstate (the Interior count and "regardless of fit"), and one denominator is inflated. Its biggest gap is three existing mechanisms it never mentions: the department-ownership table with its `speaker-department-mismatch` audit, the typed state verbs in `locale-acts.ts`, and the existing `setPiece` field. The redesign repeats each of them, which is the "second variant" problem. Its foreign-ground fix would put "interior" and "coast" events in the capital for 139 of 195 foreign nations. It never considers an incremental fix that covers most of the complaint. **Redesign verdict: needs validation.** Build the incremental slice first. Treat the full `where`/`who` binder as a later step, gated on the pilot.

## 1. Measured claims

| # | Claim | Verdict |
|---|---|---|
| 1a | 104 home non-capital scenarios unplaced, placed by uniform state draw | **PARTLY CONFIRMED** |
| 1b | Fruit-belt frost in Arkansas; company-town boatyard in Los Angeles | **CONFIRMED** |
| 1c | Prose, pin, effects, Record resolve place separately | **CONFIRMED** |
| 1d | Arcs pin only the nation; 14 of 36 arc pairs, 9 of 188 flag pairs same place | **CONFIRMED** (denominator caveat) |
| 1e | Follow-ups triggered by unrelated stories (defense budget -> flood bridge) | **CONFIRMED** |
| 1f | 189 of 322 scenarios "open with" the Secretary of the Interior | **PARTLY CONFIRMED** |
| 1g | 0 scenarios use `{{governor}}` | **CONFIRMED** |
| 1h | Foreign sites ignore the city list (Germany -> "Coastal district") | **CONFIRMED**, but the stated fix is wrong for most nations |
| 1i | Domestic fuel-price scenario placed at the Panama Canal | **CONFIRMED**; a third case missed |

**1a.** `node docs/audits/2026-10-12-grounded-casting/probes/corpus-binding.mjs` reproduces every count: home 296, capital 167, `homeNonCapitalNoPlaceField` 104, city 22, state 18, sector 2, bind 7, gazetteer replies 6, domestic 17, families 11. The code is a uniform draw over distinct states (`packages/content/src/scenario-locus.ts:263-271`, `seededState`), keyed on `(seed, def.id)` only. What the audit leaves out is that the draw **does** filter by site kind (`SITE_CITY_KINDS`, `scenario-locus.ts:229-234`). `--list-unplaced` splits the 104 into border 32, interior 27, city 23, coast 19 and chokepoint 3. The 32 border scenarios land in one of 12 US border-kind cities and the 19 coast scenarios in one of 42 ports, so the coarse fit is real. What the draw ignores is industry, hazard and frontier side: a "northern checkpoint" can land in Tucson. "Regardless of industry" applies to roughly the 21 economy, disaster and unrest scenarios, not all 104.

**1b.** `seed-placement.mjs` output matches the audit line for line. `the-yard-that-builds-the-boats` lands in Virginia Beach, Providence, Los Angeles, Savannah, Los Angeles and Houston. `the-frost-that-took-the-belt` lands in Little Rock with economy axes services 0.30 and industrial 0.25. Also: its `conditions` are `[]`, so it fires in any month, with no drought, winter or frost condition behind it.

**1c.** These are separate code paths:
- Tokens: `boundPlace` reads only the authored `locus.city`/`locus.state` or the bound condition (`scenario-text.ts:144-187`).
- Pin: `resolveLocus` takes the seeded state (`scenario-locus.ts:121-125`).
- Effects: `gazetteerEffects` reads only the authored `def.locus.*` (`scenario-gazetteer.ts:47-77`).
- Record: `decisionProvenance` sets `entities` to nations only and stamps no locales (`packages/engine/src/conversation-provenance.ts:21-41`), so `eventPlace` falls back to camera `"us"` (`packages/player-core/src/record/event-place.ts:29-41`).

The fix is cheap: `castBound` already computes `resolveLocus` (`scenario-cast.ts:656`) in the same pass that compiles reply effects (`scenario-cast.ts:525-539`).

**1d.** `ScenarioFamilyRun` stores `counterpart` only (`packages/engine/src/scenario-families.ts:28-47`). The seed-placement probe gives "same place on 14 of 36 seed-pairs", of which 12 are Washington to Washington. `flag-callbacks.mjs` gives 102 pairs, 9 in-family, 97 home, and "9 of 188" excluding capital-to-capital. **Caveat:** 72 of those 188 seed-pairs are capital-to-state, for example a Treasury-office budget call followed by a local consequence, where a different place is legitimate. The fair figure is **9 of 116** seed-pairs where both ends are non-capital. That is still damning. I recomputed it by deduplicating and splitting the probe's 97 rows (97 unique, no double count).

**1e.** `read-scenarios.mjs` confirms it. `the-rearmament-line-that-ate-the-clinics` (capital, defense stance) sets `split-the-budget-line`. `the-bridge-the-flood-took-with-it` gates only on that flag (agedAtLeast 5) and opens "The budget line you split off for the flood". `six-at-the-checkpoint` (a hostage case) sets `sent-the-team`, and `the-crew-still-on-the-levee` reads it as "since you sent the team out after the last flood".

**1f.** 189 is the number of scenarios with **any** Interior beat in the opening. Interior is the **first** speaker in 95 and the first cabinet speaker in 105 (inline count over the shards). The `corpus-binding` field `speakerKinds` counts beats (interior 197), not scenarios. The keyword finding reproduces at 4 of 189 (`regional-theater-divide`, `the-reserve-with-no-rules-written-for-it`, `the-defector-who-drew-the-valve-map`, `the-broadcasting-choice`). The audit did not say that the repo already measures this. Running `auditSpeakerDepartments` (`packages/content/src/scenario-audit-speakers.ts`, in `dist/`) over the corpus gives 631 findings in 249 scenarios, 365 of them Interior beats in 197 scenarios. That rule is a warning only, by design (its header).

**1g.** Neither a raw `{{governor` grep nor the probe finds a use in the shards. `proseNamesGovernorWithoutToken` = 8. A looser regex finds 11, including three condition-bound scenarios where the token would already fill: `the-schools-…`, `the-grid-…` and `the-energy-aid-kept-for-the-cold`. Person-graph counts check out: 8,053 people, 1,558 with nationality USA, 50 states with a governor. I did not recount House and Senate seats.

**1h.** Foreign `coast`, `interior` and `city` sites always produce `"Coastal district, X"`, `"Interior, X"` or `"Provincial city, X"` (`scenario-locus.ts:198-218`). Run on Germany, Nigeria and Brazil, an interior site gives "Interior, Germany", "Interior, Nigeria" and "Interior, Brazil". `domesticSite` never fires abroad because no non-US city has a `state` (0 of 338). `pickNeighbor`'s comment contradicts its code (`:274-284`). **Not measured by the audit:** 139 of the 195 foreign nations have only their capital in the gazetteer, 56 have any non-capital city, and 44 have a port. The audit's §6.9 fallback ("dataset city, then capital, never an offset") would put most foreign coast and interior events in the capital.

**1i.** `CP-PANAMA` is the US's only chokepoint in the dataset. The audit names two Panama cases. A third, `the-reef-line-at-low-tide` (foreign-crisis, home ground), also lands at "Panama Canal". `the-cargo-fire-at-dawn` has `locus.city` Baltimore and is fine. Separately, the claim that the US "holds" the Panama Canal is a dataset question the audit does not raise.

**Other claims checked and confirmed:** the two set-piece examples (Seattle quake with `conditions: []`, the Montana bread subsidy), the city tally (St. Louis 3; Seattle, Philadelphia and Washington D.C. 2 each), `setPiece` on 0 scenarios, the stale "18 of 303" line (`docs/CONTENT_DOCTRINE.md:171` and `content/kit/DOCTRINE.md:171`), `BRIEF.md:169` missing tokens, `unbound-disaster` as a warning (`scenario-audit-bind.ts:152-162`), `CLASS_COOLDOWN = 6`, the `Portland, ME, Maine` duplication, and the save-size note (`payload-codec.ts:4`).

## 2. What the audit missed

1. **Speaker ownership already exists.** `packages/engine/src/department-ownership.ts` has a US `scenarioClasses` table. `scenarioClassDepartments` is used by `counsel.ts:140` to route counsel by class and by the `speaker-department-mismatch` audit. The proposed `speaker-outside-jurisdiction` rule derives jurisdiction from `institution-catalog` instead, which is a second variant. **Required:** promote or extend the existing rule and table rather than add one.
2. **State-aimed verbs already exist.** `packages/engine/src/locale-acts.ts` defines `relief`, `request-deployment`, `federalize`, `waiver`, `review`, `agents`, `troops` and `surveil`. They carry `needsGovernorAssent` and `answersClaim`, are compiled from a reply's `localeAct` (`scenario-cast.ts:554-555`) and run through `takeLocaleAct` (`conversations.ts:687-688`). `governorAnswer` (`governors.ts:482-510`) already stamps `locales: [state]`. Today these only reach a state through a report-pinned governor request (0 shipped). The audit's new `local: { mark, claim, person }` reply field (§6.8) should instead extend `localeAct` so it can target the **bound** state. The audit's claim that no field answers a claim outside the report cast is true as a corpus statement, but it omits that the mechanism is built.
3. **A set-piece field already exists.** `setPiece: { reason, owner }` (`scenario.ts:553`) is allowed only with `cast.pick: "nation"` (`scenario-audit.ts:508-516`). The proposed `where.from.kind: "set-piece"` should extend that field, not add a parallel one.
4. **The binding pieces it lists are accurate.** `bind: "condition"` with withdrawal (`scenario-cast.ts:388-399`), the six frozen live records (report, matter, trade measure, bill, judicial vacancy, order case; `player-core/src/conversation/scenario-cases.ts:107-121`), the `stricken` and `outlet` casts, and `locus-asserts-landform` (`scenario-audit-place.ts`) are all real. The audit cites them correctly.
5. **BL-65 (`docs/BACKLOG.md:283-291`): PARTLY CONFIRMED.** The acceptance does say "US-area sites resolve to a seeded state or city". But it also says "Scenarios that name or imply a state carry it", and the W8 note sends the work to `locus.city` binding through the writers' room. The seeded draw was the fallback for unimplied places, not the goal. The item's "Missing" line ("260 of 322 resolve to DC or a random offset") is stale against the current code.

## 3. The redesign, attacked

**Reachability.** The audit is right that hard requirements shrink the pool. It misses three concrete cases:
- **Foreign `city` requirements against 139 one-city nations.** The cast picks the nation first, so a foreign scenario either becomes unreachable on most boards or degrades to the capital.
- **A data gap S0 does not close.** "Fruit" is not a `SectorId`. `agriculture` is one of 23 sectors (`packages/world/src/schemas/sector.ts:13-37`), and no hazard table has frost. The flagship example stays unfixable unless S0 goes below sector level or adds a frost hazard.
- **A per-board cascade.** `from: condition` combined with `who: holder "then"` (withdraw if the person died) stacks with the existing `bind` withdrawal.

**Required:** measure the deal rate per scenario over a simulated campaign, not only "eligible set non-empty on the preview board". Keep a non-capital foreign fallback that names an area, not the capital.

**Repetition.** S2's 40%-of-50-seeds gate is measured **across** campaigns. Two risks are not:
- **Within one campaign,** the same state or governor can recur across different scenarios. **Required:** a within-campaign concentration measure over a long simulated run, compared with population share, with thread members exempt.
- **Across campaigns,** "requirement strength, log-scaled", which is dataset-fixed, plus top-three selection will keep picking the same big ports (Houston, Los Angeles). The across-campaign gate should be run on the scoring as built, not assumed.

**Saves.** DECISIONS §9.3 says a new campaign field is optional on load and its absence reads as empty memory. §9.4 requires a migration or a clear refusal. The plan replaces `scenarioFamilies` with `threads` with "no compatibility kept". S1's acceptance tests only a round trip of a new save. **Required:**
- `threads` is optional, with a cheap derivation from `scenarioFamilies` (a place-less pin) or an explicit schema-version bump.
- An S1 test loads a pre-change save with an open family.
- A rule bounds how long `campaign.bindings` is kept, because "kept after the case closes" grows without limit over 416 weeks on a save that is already about 12 MB before gzip.

Old open-case snapshots are safe: `frozenCast` withdraws an unreadable snapshot (`scenario-cases.ts:63-75`).

**Casting neutrality (AGENTS.md §5).** Board-filled place and person tokens comply, the same way `{{counterpart}}` does. The risks are elsewhere:
- A foreign gazetteer city's name entering authored particulars or `why` text that a writer copies.
- The capital fallback naming a capital in a non-set-piece scenario.

**Required:** the place `why` and foreign city names render only through tokens, and the lexicon gate runs on rendered text across three bound places.

**A smaller change gets most of the value.** The audit's only alternative was set pieces. An incremental slice, built from existing pieces and needing no schema replacement or corpus-wide rewrite, covers most of what the owner complained about:
1. Weight `seededState` by fit using data already shipped: the state economy axis through `SECTOR_AXIS` when a sector is declared, `STATE_DISASTER_ELIGIBILITY` for scenarios gated on an acute condition (as `placeUsOnset` already does), and population.
2. Add an optional `place` to `ScenarioFamilyRun` and have beats and closes inherit it. Convert the real flag callbacks (F3 pairs) to families.
3. Pass the resolved locus into `gazetteerEffects` and into `decisionProvenance` locales, so effects and the Record follow the pin.
4. Home `chokepoint` becomes a port. Foreign sites use a gazetteer city of fitting kind where one exists, and otherwise keep an area label.
5. Fix speakers through the existing ownership rule.
6. Use `{{governor}}` where it already fills.

That leaves out the person slots, mayors, town tier and scoring vocabulary. Those should wait for the pilot to show the incremental slice is not enough.

**Data sources (opened 2026-10-13).**
- **BLS QCEW** (`data.bls.gov/cew/data/api/2024/1/industry/<naics>.csv`). It works without a key and carries location quotients. Disclosure suppression is heavy at fine detail: for NAICS 3361 (motor vehicles), 21 of 43 state private rows and 324 of 367 county rows are suppressed. For NAICS 1113 (fruit and tree nuts), 6 of 49 are suppressed, and the top states are CA, WA, FL, OR and NY, not AR. The `bls.gov` HTML page returned 403 to curl.
- **Census CBP.** The methodology page says CBP excludes Crop and Animal Production (NAICS 111 and 112), so it cannot place a fruit belt. The 2022 CBP API call redirected to `missing_key.html`, which suggests a key is now required.

**Required for S0:** use QCEW at sector or 3-digit level with location quotients as the primary source, and show suppressed cells as unknown, never zero. Use CBP only for non-farm establishment counts. Agriculture needs a crop-level source; USDA NASS was not opened this session and is unverified.

**Verdict on the redesign: needs validation**, not "accepted with controls". Required changes:
1. Reuse `department-ownership`, `localeAct`/`locale-acts` and `setPiece`; no parallel variants.
2. Replace the capital fallback abroad.
3. Make S0 crop-aware or drop crop-asserting requirements.
4. Add a within-campaign repetition measure and a deal-rate measure over simulated campaigns.
5. Comply with §9.3/§9.4 on saves, with a retention rule for bindings.
6. Land the incremental slice above before S2, and judge the pilot against it.

## Commands run

```
node docs/audits/2026-10-12-grounded-casting/probes/corpus-binding.mjs
node docs/audits/2026-10-12-grounded-casting/probes/corpus-binding.mjs --list-unplaced   # split by site/class
node docs/audits/2026-10-12-grounded-casting/probes/seed-placement.mjs
node docs/audits/2026-10-12-grounded-casting/probes/flag-callbacks.mjs                   # plus dedupe/capital split
node docs/audits/2026-10-12-grounded-casting/probes/read-scenarios.mjs <ids>
scratchpad: spk.mjs (auditSpeakerDepartments over shards), foreign.mjs (gazetteer, US chokepoints, foreign resolveLocus)
inline node: first-speaker counts, keyword screen, people/governor counts, per-nation city histogram
curl: data.bls.gov QCEW CSV (3361, 1113); census.gov CBP methodology; api.census.gov CBP (redirect to missing_key)
```
