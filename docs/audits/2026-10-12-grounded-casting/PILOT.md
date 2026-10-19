# Grounded casting: the 20-scenario pilot

Measured 2026-10-13 on `feat/casting-pin-pilot`, on top of the first change (`b6b51703f`). This report is for the owner to judge whether the drafting hold lifts. Every number below came from `probes/pilot.mjs`, run from the repo root against the committed `dist/` and the committed corpus bake (322 scenarios). Nothing here was built by the workspace build, and no scenario file was changed: the placement declarations are a patch file the integrator applies and bakes.

## Outcome

**The pilot does not show the first slice is enough, and it does not show it is wrong.** Two kinds of fix worked and one did not.

- **Site corrections worked.** Two scenarios whose declared site contradicted their own prose now read right in all three places (a valley bridge was datelined in border towns; a Treasury ledger was datelined in Little Rock, Miami and St. Louis).
- **Sector declarations helped on average and flipped no scenario.** Over 60 boards the declared axis moves the landed state up the ranking (mean rank of the 50 states, 1 is best, for the naval yard 20.4 to 15.3), but on the three boards the owner will read, no scenario went from a miss to a hit through a sector alone. The weight is `sqrt(population) x axis share`, and the defense and agriculture axes are mostly 0.05 to 0.15, so population still decides most draws.
- **The fruit belt is unfixable with the data in the repo.** "Fruit" is not a `SectorId`, the state economy axes are hand-authored shares (not QCEW; QCEW is not vendored), and no frost hazard exists. Declaring `agriculture` moves the frost toward farm states (mean rank 26.5 to 16.5) and still lands it in Kansas and North Carolina. It needs a crop-level source the owner has not approved.
- **The boatyard improved on average, not on the three boards.** The yard now draws defense-heavy states more often (top-10 in 33 of 60 boards, from 22), but two of its three boards still land in a state ranked 16th and 24th for defense.

Deal rate is unchanged for all 20, by construction and by measurement. Placement does not gate a scenario, and over three 416-week campaigns every one of the 20 was staged and answered the same number of times with and without the declarations.

## What was declared

Nine of the 20 carry a declaration (`pilot-placements.json`). It uses only what the first change reads: `locus.sector` (folded to a state economy axis by `SECTOR_AXIS`) and `locus.site`. No prose changed. Running `auditScenario` on each patched scenario gives the same findings as before (no rule gained or lost).

| Scenario | Declaration | Why |
|---|---|---|
| the-yard-that-builds-the-boats | sector `defense-industrial` | A patrol boat yard, the country's only slipway for a navy hull |
| the-fleet-that-limped-on-half | sector `defense-industrial` | A naval yard with patrol boats on the slipway |
| the-return-on-the-yard-we-stood-behind | sector `defense-industrial` | Follows the boatyard; also returns to its place through the flag |
| the-fuel-price-spike | site `coast`, sector `energy-oil` | A home refinery on the coast, not a strait. The site was already treated as a port; the sector adds nothing the `energy` topic did not |
| the-reserve-with-no-rules-written-for-it | sector `agriculture` | Upland grazing and an orchard belt |
| the-frost-that-took-the-belt | sector `agriculture` | Recorded as unfixable (above); kept so the owner sees the miss |
| the-span-that-was-built-for-two-weeks | site `border` to `interior` | A valley crossing; nothing in the prose is a border |
| the-rearmament-line-draws-on-the-clinics-again | site `city` to `capital` | The scene is the Treasury ledger |
| the-clinics-that-never-got-the-difference-back | site `city` to `interior` | Rural clinics; an interior city is still a metro (see misses) |

Eleven carry none. Eight of those already read right in all three places and are controls. The fishing quota was left alone on purpose: no sector fits fishing, and calling it `agriculture` to move the draw would misstate the scenario.

**Left out of the pilot.** The audit names 21 unplaced economy, disaster and unrest scenarios. Two are premised on an institution the United States lacks (`the-provinces-the-writ-no-longer-reaches`, `the-mill-that-cannot-make-payroll`, a state-owned mill), which the owner's Q14 answer sends to retire-or-rewrite case by case. They are not touched. The 20th slot is `the-return-on-the-yard-we-stood-behind`, a follow-up to the boatyard, so the pilot also tests the thread.

## How "reads right" was judged

A place reads right when all three hold. This is my judgment against a stated rule, not the owner's, and the owner should re-read the places themselves.

1. The dataset city's kind matches the scenario's site (a port for a harbor, an interior city for an inland scene).
2. Where a sector is declared, the state is in the top 15 of 50 on that axis. The bar is lenient on purpose: the axes are hand-authored.
3. Nothing in the prose contradicts the place (a rural clinic in Dallas does; a harbor fund in Houston does not).

Where a state's disaster eligibility applies (flood, drought), I checked it against `STATE_DISASTER_ELIGIBILITY`: the flood bridges' states (Colorado, Oregon, Oklahoma, Wisconsin, Louisiana) are all flood-eligible.

## Three places, before and after

Boards `pilot-a`, `pilot-b`, `pilot-c`. "Before" is the first change without declarations; "after" adds them. A tick means reads right by the rule above. Axis ranks are in brackets where an axis is declared.

| Scenario | Before (a, b, c) | After (a, b, c) | Right before | Right after |
|---|---|---|---|---|
| the-yard-that-builds-the-boats | New Orleans [23], Atlantic City [27], Los Angeles [12] | Savannah [16], Portland ME [24], Los Angeles [12] | 1 of 3 | 1 of 3 |
| the-fleet-that-limped-on-half | New York [46], Miami [2], Miami [2] | Atlantic City [27], Miami [2], Miami [2] | 2 of 3 | 2 of 3 |
| the-return-on-the-yard-we-stood-behind | Mobile [4], Mobile [4], Baltimore [5] | Mobile [4], Mobile [4], Honolulu [1] | 3 of 3 | 3 of 3 |
| the-fuel-price-spike | Houston, Houston, Houston | Houston, Houston, Houston | 3 of 3 | 3 of 3 |
| the-reserve-with-no-rules-written-for-it | Raleigh [13], Raleigh [13], Salisbury MD [43] | Jackson MS [9], Raleigh [13], Lafayette LA [29] | 2 of 3 | 2 of 3 |
| the-frost-that-took-the-belt | Salisbury MD [43], Wichita [5], Raleigh [13] | same | 0 of 3 | 0 of 3 |
| the-quota-that-emptied-the-docks | Boston, Anchorage, Baltimore | same | 3 of 3 | 3 of 3 |
| the-span-that-was-built-for-two-weeks | McAllen, Bellingham, Las Cruces | Columbia SC, Salt Lake City, Jackson MS | 0 of 3 | 3 of 3 |
| the-bridge-the-flood-took-with-it | Denver, Salem OR, Oklahoma City | same | 3 of 3 | 3 of 3 |
| four-counties-quoting-the-flood-bridge | Milwaukee, Salem OR, Lafayette LA | same | 3 of 3 | 3 of 3 |
| the-port-development-or-the-farming-subsidy | New York, Los Angeles, Atlantic City | same | 2 of 3 | 2 of 3 |
| the-auditor-who-found-the-gap-in-the-harbor-fund | Miami, Houston, Mobile | same | 3 of 3 | 3 of 3 |
| the-second-charter-no-underwriter-will-cover | Los Angeles, Atlantic City, Miami | same | 2 of 3 | 2 of 3 |
| the-dockworkers-who-wont-cross-each-other | Anchorage, Savannah, New Orleans | same | 3 of 3 | 3 of 3 |
| the-corridor-workers-want-widened | San Diego, Duluth, Buffalo | same | 2 of 3 | 2 of 3 |
| the-rearmament-line-draws-on-the-clinics-again | Little Rock, Miami, St. Louis | Washington, Washington, Washington | 0 of 3 | 3 of 3 |
| the-clinics-that-never-got-the-difference-back | Birmingham, Dallas, Virginia Beach | Birmingham, Dallas, Richmond | 0 of 3 | 0 of 3 |
| the-campus-occupation | Louisville, Virginia Beach, Philadelphia | same | 3 of 3 | 3 of 3 |
| the-grocery-card-that-resets-once-a-year | Hartford, Indianapolis, Albuquerque | same | 3 of 3 | 3 of 3 |
| the-two-reviews-that-disagree | Raleigh, Denver, Indianapolis | same | 3 of 3 | 3 of 3 |

**Read right in all three places: 10 of 20 before, 12 of 20 after.** The two that flipped are the two site corrections (the span and the Treasury ledger). The two that did not flip but were named in the audit (the boatyard and the fruit belt) are the two the sector fit does not reach on these boards.

**Misses, by cause.**

- **Atlantic City.** It is the only New Jersey port in the gazetteer, so any coast scenario that draws New Jersey lands there: a naval yard, a container-port development and a relief charter on a pier. The dataset calls it a port. It is a resort town. The fix is in the dataset (add Newark or Port Elizabeth, or change the kind), not in any scenario.
- **Rural clinics in a metro.** Interior and city sites draw big cities. "Rural clinics" and a "town hall" land in Dallas and Raleigh. Only the town tier the owner approved (Q16) fixes this.
- **Duluth for a freight border crossing.** The dataset lists it as a border city; the prose is a truck toll corridor.
- **The yard and the fruit belt**, above.

**Prose that contradicts a fit, for the owner to decide (not rewritten).** None of the 20 names a place that contradicts a declared fit. Three describe a kind of place the draw cannot supply: "the fruit belt" (a region), "rural clinics" and "the town" (below the city tier), and a "company town" shipyard (a town, in a city list).

## The thread works

The boatyard's answer sets `guaranteed-the-shipyard-loan`; its follow-up waits on that flag. On five boards, with the yard answered, the follow-up lands where the yard did on all five (Savannah, Portland ME, Los Angeles, Houston, Miami). The cold draw for the follow-up, with no earlier scene, landed in Mobile or Honolulu on the same boards. In two long campaigns the pair was Georgia then Georgia (after: Florida then Florida) and Massachusetts then Massachusetts (after: Hawaii then Hawaii).

## Deal rate

Three 416-week campaigns (`long-a`, `long-b`, `long-c`), the whole shipped pool, the first committable reply taken each week. Staged and answered counts for the 20 are identical with and without the declarations in all three campaigns. That is expected: liveness never reads the locus. It is also a limit. The first-reply policy leaves some flag-gated follow-ups unreached in a given campaign (the bridge pair and the span were never staged in any of the three), which is a pool and gating fact the pilot did not change. The reachability gate, not this run, is the right tool for whether a gated scenario reaches any board.

## Repetition inside one campaign

Home scenarios answered at a seeded place, over 416 weeks, by the state they landed in. The same scenario always returns to the same state in one campaign, because the draw is keyed on the seed and the scenario id, so I counted both events and different scenarios.

| Campaign | Seeded events | Most-drawn state, by events | By different scenarios | Population share |
|---|---|---|---|---|
| long-a | 116 | Texas 15 (13%) | Texas 6 of 53 (11%) | 9% |
| long-b | 128 | Texas 36 (28%) | Texas 12 of 52 (23%) | 9% |
| long-c | 116 | New York 12 (10%) | not recorded | 6% |

Authored and condition-bound places run hotter on small states (Washington, Maryland, Ohio and Michigan at 14% to 21% of those events, population shares of 2% to 4%), which this pilot does not touch.

**This is a miss in the first change, not in the pilot.** One campaign in three put roughly a quarter of its seeded scenarios in Texas. The cause is the fit weight: many scenarios carry the `energy`, `tech` or `war` topic, each pulls toward the top state on that axis, and Texas ranks seventh on energy and is among the most populous states. The pilot changes none of this (before and after are the same to the event on `long-a` and `long-b`, apart from one scenario). A used-state discount (a state already drawn this campaign counts for less) or a smaller exponent on the axis share would flatten it; neither is built.

## Thread retention

An opener now pins its thread when it is raised. Over a 416-week campaign that answered everything, the ledger held 7 to 8 runs at most (the closed arcs the ledger already kept). With nothing ever answered (`POLICY=never`), it held at most 3 at once and ended with 1: raised openers expired after 112 days instead of piling up.

## Governor standing

A home reply datelined in a state moves that state's governor by the sign of the opinion reading the reply already carries, capped at 0.04 on the 0..1 disposition scale per answer. One 416-week campaign (`long-a`, first reply each week), with and without the shifts stripped from every reply:

| | Answers | Carrying a shift | Worst gap from delegation | Mean gap |
|---|---|---|---|---|
| Shifts on | 416 | 114 | 0.768 | 0.0049 |
| Shifts stripped | 416 | 0 | 0.768 | 0.0049 |

The two campaigns are indistinguishable at that grain. A single answer does move the governor (a reply in Kentucky took its governor from 0.125 to 0.140; one in New Jersey from 0.857 to 0.842), but `governorPhase` pulls every governor back toward its delegation at 0.02 a week, so a shift is gone within one to two weeks and the campaign-wide gap does not register it. The 0.768 worst gap is a governor flipping at an election, not a shift. The effect is real, tiny and transient, which is what a cap of two weeks of drift buys. If the owner wants a standing that lasts, the shift has to move the governor's drift target, not just its disposition; that is a design change, not a cap change.

## What this report cannot show

- Whether the owner reads these places the way I did. The rule above is mine.
- Anything about the 322. Twenty scenarios, nine declarations, three boards.
- The effect of QCEW or any sourced fit. None is vendored.

## Recommendation

Keep the hold on drafting until two things are decided, and migrate the 322 only after them. First, the dataset: add a second New Jersey port and decide how the town tier (Q16) will carry "rural" and "town". Second, the weight: add a used-state discount so one state cannot take a quarter of a campaign. Site corrections are cheap, correct and safe to migrate once each is read against its prose (`corpus-binding.mjs --list-unplaced` gives the worklist by site kind; deciding which sites contradict their prose takes a reading, which this pilot did for 20). Sector declarations are safe but small; migrating them is worth doing only with the weight change.

## Commands

```
node docs/audits/2026-10-12-grounded-casting/probes/pilot.mjs places
node docs/audits/2026-10-12-grounded-casting/probes/pilot.mjs fit 60
node docs/audits/2026-10-12-grounded-casting/probes/pilot.mjs thread
node docs/audits/2026-10-12-grounded-casting/probes/pilot.mjs long 416 long-a long-b long-c
POLICY=never node docs/audits/2026-10-12-grounded-casting/probes/pilot.mjs long 416 long-a
node docs/audits/2026-10-12-grounded-casting/probes/pilot.mjs governor 416 long-a
```

`long` takes about 5 to 7 minutes a seed (it runs the pool twice). All six ran in one process at a time.
