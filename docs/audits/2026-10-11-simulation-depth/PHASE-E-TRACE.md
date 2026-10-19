# Phase E trace: spatial posture

Read-only trace for Phase E of the simulation-depth program (requirement 6). Read against source at `feat/map-first` `537603adf` on 2026-10-11, with the working tree as it stood that evening: `save.ts` carried uncommitted versions v58 to v63 (v63 is I1's tie ledger), and the operations-redesign screens were uncommitted. None of the engine files traced below (`basing.ts`, `geography.ts`, `force-packages.ts`, `capacity.ts`, `combatant-commands.ts`, `instruments-military.ts`, `instrument-gates.ts`, `instrument-issued.ts`, `commitments.ts`, `war-tick.ts`, `war-entry.ts`) had uncommitted changes. Line numbers are from that tree; re-grep before trusting one.

Each claim is labeled. **Fact** means read in source at the cited line, or observed in a run named here. **Inference** means reasoned from facts and not run. **Recommendation** is a proposal.

## Finding dispositions

| Finding | Disposition | Evidence |
|---|---|---|
| C02 bases are descriptive, accounting inherited | **Confirmed.** A base is a label with a sourced point. It costs nothing, holds no formations, gates nothing, and closing one buys nothing and costs trust | `basing.ts:83-97` opens every installation as a commitment with `amountPerTurn: 0` and a `budgetLine` source (no formations). Its only readers are `selectBases` (`basing.ts:163`, read by `player-core/security/pdb.ts:77` and `world/war-file.ts:129`) and the map's `placeForces` (`player-core/geo/force-placement.ts:110-160`). Every rule that reads reach reads the authored count `stats.military.basesAbroad` (750 for the United States, `world/dataset/nations.ts:183`) instead: the forward-deploy gate (`instruments-military.ts:118`), the contest's reach layer (`contest.ts:130`), `warfighting.ts:102,166,168`, `bands.ts:42,217`. Details in §2. |
| C03 nation-to-nation projection | **Confirmed, with one nuance.** Distance is capital to capital, from Washington, never from a base. It is directional only through the projecting side's lift. And distance lowers military odds twice | `geography.ts:26-38`; capital coordinates (`nations.ts:171`, Washington 38.9, -77.0). Odds: `contest.ts:131,141` divides the reach layer by distance, then `resolution.ts:386-392` divides the contest's chance by the same multiplier again. Details in §3. |
| C04 the availability fallback mints capacity | **Confirmed for every government but the President's. Not reachable for the player in natural play.** Formations never bind a foreign government. Readiness is the only limit on its tempo | `force-packages.ts:157,174`; `capacity.ts:163-164,187-188`; `instrument-gates.ts:204-205,215-220`; `instrument-records.ts:159` (a foreign government's rung opens no commitment). Run: §4. |

## 1. What exists for each requirement-6 noun

| Noun | State type and where it lives | Created by | Written by (effects, acts) | Read by (rules) | What the player sees |
|---|---|---|---|---|---|
| **Place** (installation) | No place type. An installation is a row of `US_BASING` (`world/dataset/us-basing.ts:34`, 50 rows, 29 hosts), with a sourced `lat`/`lon` or `anchor: "zone-level"`. On the campaign it is a `Commitment` of kind `basing` whose `location.base` names the row (`state-commitments.ts:139`, `state-world.ts:115-118`) | `openingBaseCommitments` at the oath (`basing.ts:104-114`, called from `opening-world.ts:378`) | `commitment` effect only. `setCommitmentStatus` can wind one down (`commitments.ts:299`) | No rule. Display only: `selectBases` (`basing.ts:163`) and `placeForces` | A pin at its sourced point on the forces lens (`apps/web/src/map/marks/sources.ts:119`, `use-map-layer.ts:101`); the PDB's line "N installations hold forces abroad" (`pdb.ts:77-79`); the war file's bases list (`war-file.ts:129`); the command file's zone rows (`command-board.ts:171-175`); the commitment ledger with a wind-down option (`player-core/security/commitment-reading.ts:85-118`) |
| **Access agreement** | **None.** No host consent, basing right, overflight or transit right anywhere. The nearest record is `TreatyRecord` with kind `executive-agreement` (`state-legislature.ts:721-735`) | n/a | n/a | n/a | n/a |
| **Formation** | `orderOfBattle.<branch>.units[]` (`world/schemas/nation.ts:78-92`), authored only for USA, CHN, RUS and NLD (checked by script over the built dataset: 4 of 196). A unit is a type, a count and a static readiness | Authored | Nothing writes a unit. Counts are scaled at read time by `establishmentScale × readyShare` (`capacity.ts:72-91,165`) | `availableUnits`, `availableUnitsOfType` (`capacity.ts:157-194`); `forceShortfall` (`commitments.ts:264-276`) | Holdings tables (`apps/web/src/world/forces/HoldingsTable.tsx`, via `player-core/world/nation-forces.ts`) |
| **Task group** | **None.** The nearest is a `Commitment` of kind `deployment` or `sustainment` with an `orderOfBattle` source (`state-commitments.ts:54-56`) and a `location.theater` (a zone) | `packageCommitment` (`instruments-military.ts:84-101`) when a rung 2 to 5 lands, through `standingCommitment` → `openCommitment` (`instrument-records.ts:146-181`) | `commitment` effect; `commitmentPhase` lapses termed ones (`commitments.ts:509-520`); `releaseWarCommitments` (`war-tick.ts:13`) | `committedUnits*` (`capacity.ts:241-269`), `commitmentDrag` (`capacity.ts:303-314`), `theaterScale` via `committedPersonnelToward` (`war-tick.ts:73-76`, `capacity.ts:279-293`), `commandEngagement` (`combatant-commands.ts:515-530`) | A seeded pin in the target's zone (`force-placement.ts:232`); ledger row with weekly cost |
| **Deployment order** | `IssuedInstrumentAct` (`instrument-issued.ts:48-58`), status `in-progress` until its `dueDate` | `issueAction` (`instrument-issued.ts:26-65`); every military rung has a non-zero lead time (`action-timing.ts:26`, military days `[2,4,5,2,14]`) | `issuedAct` effect; `withdrawInstrumentAct` (`:68-76`); `resolveDueInstruments` (`:84-119`) | `reservedInstrumentUnits` (`capacity.ts:416-422`); the duplicate refusal for the same actor, target and instrument (`instrument-issued.ts:29-30`) | Pending operation with a due date, forecast and recall (act manage screens) |
| **Reservation** | No separate type: an issued act's `request.force.count` *is* the reservation, and `reservedTreasury` is the money escrow | `issueAction` | Released by withdraw (`:74`) or at execution (`executionState`, `:78-82`) | `committedUnits` and `committedUnitsOfType` add it (`capacity.ts:242,259`) | "Reserved budget authority and forces are released" (`:73`) |
| **Command, assignment, posture** | `UnifiedCommandState` under `campaign.security.unifiedCommand` (`combatant-commands.ts:66-103`): per-command `assignment` share of each service, `posture` (`routine`/`heightened`/`surge`), commander, reliefs, missions; `aorOverrides` and `amendments` | `foundingUnifiedCommand` (`:291-309`) | `command` effect (`security-effects.ts:86-140`) from `relieveCommander` (`:328`), `reassignForces` (`:392`), `amendUnifiedCommandPlan` (`:448`), `setCommandPosture` (`:549`), `commandPhase` confirmations (`:629-667`); a cabinet agenda act can set posture (`cabinet-agenda-acts.ts:263`) | Posture: `commandPhase` readiness bill (`:637`), `posturePressureFactor` in the war week (`war-tick.ts:357`), `cabinet-initiative.ts:109-112`. Assignment: **nothing but the command board** (`command-board.ts:96`). Chain execution: **nothing but player-core** (`command-board.ts:94,220`, `command-acts.ts:103-104`) | Command screen and cards with posture, chain, formations, zones, amendments (`apps/web/src/world/security/CommandScreen.tsx`, `CommandActs.tsx`) |
| **Readiness** | `NationRuntime.stats.military.readiness`, mirrored onto `player.metrics.militaryReadiness` (`effects.ts:117-126,250-288`) | Authored | Rung bill (`instruments-military.ts:56-60`), posture (`combatant-commands.ts:661-662`), war attrition (`war-tick.ts:150-159`), join (`war-entry.ts:306`), refit (`capacity.ts:385-414`) | Gates (`instrument-gates.ts:175-182`), `readyShare` scaling the bench (`capacity.ts:86-91`) | Readiness metric; capacity quote on a projection |
| **Directional assessment** | **None stored.** `forceProjectionCost(from, to)` and `forceProjectionProfile(nation)` are computed on read (`geography.ts:26`, `warfighting.ts:161-170`) | n/a | n/a | Gates, price, odds, timing, war entry (§3) | Projection odds and price; the contest's "Getting there" layer (`contest.ts:136-145`) |
| **Map layers** | Derived, never stored (`force-placement.ts:28-35`) | n/a | n/a | n/a | World lenses `standing`, `forces`, `trade` (`player-core/world/world-board.ts:30`); force pins and clusters (`sources.ts:112-139`); command areas (`force-placement.ts:76-82`) |

## 2. C02: bases are descriptive and accounting is inherited

**Facts.**

1. A base is opened as a commitment that costs zero and draws no formations. `inherited()` writes `resource.amountPerTurn: 0` and `source: { kind: "budgetLine", line: "defense" }` (`basing.ts:83-97`). The file's own comment states the design: it "costs nothing on top of the budget it was inherited inside, and it draws no formation from the order of battle" (`basing.ts:8-12`).
2. Nothing mechanical reads a base. `selectBases` and `placeForces` are the only readers of `location.base` or `kind === "basing"` outside the load migration (`commitment-locations.ts:56-73`). Reach, odds and gates read `stats.military.basesAbroad`, an authored integer that no effect writes.
3. The forward-deploy rung's gate is "a shared border or a base abroad" (`instruments-military.ts:116-120`), read from `basesAbroad > 0`. A President who closed every installation would still pass it, because 750 never changes.
4. A base can be closed. The security desk offers wind-down on any commitment (`commitment-reading.ts:85-118` → `setCommitmentStatus`, `commitments.ts:299`). Wind-down records a withdrawal deed and may add a grudge (`commitments.ts:315-330`). It saves $0 a week, frees no formation, changes no reach and removes the pin and the PDB count. **So closing a base costs trust and buys nothing.**
5. Inherited commitments are excluded from the weekly "kept promises" standing credit (`commitments.ts:550`) and charged nothing (`amountPerTurn: 0` into `commitments.ts:532-541`).
6. The Gulf and Red Sea deployments (`BOARD_DEPLOYMENTS`, `basing.ts:51-68`) are planning-value bands with a `theater` zone. They also cost nothing and hold no formation, so the readiness arithmetic counts their ships as at home.

**What upkeep and cost read, and whether anything is counted twice or never.**

| Cost | Where it is counted | Counted twice? Never? |
|---|---|---|
| Upkeep of stationed forces | Inside `military.budget × price` on the federal defense line (`national-books.ts:373`). Not on budget authority | Once, implicitly. Never shown as a per-base figure |
| Upkeep of the two board deployments | Same: zero on the commitment, implicitly inside the defense line | **Inference:** the comment says the stationed totals undercount rotations and the band is "above the stationed totals" (`basing.ts:44-50`), so the extra rotation is plausibly counted **never** |
| Host-nation support, access payments | Not modeled | Never |
| Closing a base | Saves nothing (point 4) | A real saving is never credited |

## 3. C03: nation-to-nation projection

**Facts.**

1. `distanceKm` is great-circle distance between the two governments' `geo.lat`/`lon` (`geography.ts:10-19`), which are capital coordinates (Washington 38.9, -77.0 at `nations.ts:171`; Beijing 39.9, 116.4 at `:291`; Caracas 10.48, -66.9 at `:771`).
2. `forceProjectionCost(from, to)` (`geography.ts:26-38`): 1 across a shared border; otherwise `1 + (km/8000) × (1 - 0.7 × lift)`, where lift is the *projecting* side's mean of air and sea lift.
3. **It is directional only through lift.** Distance and borders are symmetric (a script over the built dataset found 632 neighbor edges, 0 asymmetric). Computed by hand from the formula: United States onto China 1.52, China onto the United States 1.86 (11,148 km, lift 0.90 against 0.55); United States onto Venezuela 1.15, Venezuela onto the United States 1.37 (3,315 km, lift 0.90 against 0.15).
4. It never reads where forces stand: not `US_BASING`, not `basesAbroad`, not a deployment's zone, not a carrier at sea, not host access, not the target's air defense or coastline, not chokepoints on the route.
5. Its consumers: up-front price (`resolution.ts:254-261`, `force-costs.ts:143-146`, DECISIONS §6.8: "distance factor applies to the up-front price only"); gates `projectionAccess` at caps 2, 1.5 and 1.3 for rungs 3, 4, 5 (`instrument-gates.ts:156-162`, used at `instruments-military.ts:144,174,209` and `instruments-economic.ts:454`); covert reach cap 2.5 (`instruments.ts:135-139`); lead time, capped at 2× (`action-timing.ts:29-31`); war-join cap and price (`war-entry.ts:82,194`); the contest's reach layer (`resolution.ts:309` → `contest.ts:131,141`); and success odds (`resolution.ts:386-392`).
6. **Distance lowers military and covert odds twice.** The reach layer divides the actor's side by the multiplier (`contest.ts:141`), and `chanceFrom` then divides the contest's base chance by the multiplier again through `projectionOdds` (`geography.ts:42-45`). The comment at `resolution.ts:382-385` says the reach penalty "stays outside the layered edge", which the reach layer contradicts. How much the first division moves the base chance depends on the reach layer's weight in `contest-dials.ts`; not measured here.
7. The rung 2 forward deploy has no projection gate at all (`instruments-military.ts:113-129`).

**Inference.** Because projection starts from Washington, a carrier already on station in the Gulf, or a wing at Kadena, prices and times a strike on Iran or North Korea exactly as it would from home. That is the core of what a "directional assessment" in requirement 6 has to fix.

## 4. C04: the availability fallback mints capacity

**The code path (facts).**

1. `availableUnitsOfType` returns `undefined` when the actor ships no order of battle (`capacity.ts:187-188`), and so does `availableUnits` (`:163-164`). Only USA, CHN, RUS and NLD ship one.
2. `composeOne` turns `undefined` into a full package: `max = packageCeiling(spec)`, `defaultCount = spec.preferred`, no `closedReason` (`force-packages.ts:173-176`). `clampForce` does the same (`:157`).
3. The gate `packageFormations` reads `availableUnitsOfType`; on `undefined` it falls to `formationsAvailable`, which returns `{ ok: true }` on `undefined` (`instrument-gates.ts:204-205,215-220`).
4. `forceShortfall` also passes any count when there is no order of battle (`commitments.ts:268-271`).
5. **A foreign government's rung never commits anything.** `standingCommitment` returns early for any actor that is not the founding nation, writing only the forces it owes a war it already joined (`instrument-records.ts:159`; `joinedWarCommitment`, `commitments.ts:712-727`). Foreign governments act through `resolveAction` directly (`npc-turn.ts:283`), never `issueAction`, so they never reserve either. Their requests carry no `force` (no `force` field in `npc-turn.ts` or `npc-agent.ts`).
6. So for a foreign government, formations never shrink with use, whether or not it ships an order of battle. Only readiness binds it: each rung bills readiness (`instruments-military.ts:56-60`) and the gates require 0.3, 0.45 and 0.6 for rungs 3, 4 and 5 (`capacity.ts:124-128`), recovering 0.02 a week (`:106`).
7. **The President is not affected in natural play.** `composeForcePackages` is called only with the founding nation (`player-core/world/nation-forces.ts:213`), the founding nation is always the United States, and the US order of battle carries all four package types (carriers 11, surface combatants 90, fighters 1,550, brigade combat teams 31; `nations.ts:203,216,219,231`). Its rungs commit through `openCommitment` and reserve through `issueAction`.

**The scenario, run.** A script in the session scratchpad (`c04.mjs`, not in the repo) imported the committed `packages/engine/dist` build, took the engine's test fixture (`__fixtures__/campaign.ts`), added the missing Alpland→United States relationship, and had Alpland blockade the United States (rung 3) repeatedly in the same week through `resolveAction` with a landing stream.

| Alpland's order of battle | Result |
|---|---|
| None (192 of 196 governments) | Packages composed at full ceiling (`surface-blockade: available=undefined max=7`, `limited-strike max=103`). Eight blockades in a row all landed. Formations free: `undefined` throughout. Commitments written for Alpland: 0. Readiness fell 0.800 → 0.399; the ninth would still pass the 0.3 gate. |
| 6 surface combatants | Six blockades landed, each "needing" four hulls. Free hulls fell 6 → 3 only because `readyShare` fell with readiness, never by commitment. Commitments written: 0. The seventh was refused for hulls, not readiness. |

**Verdict.** "Unlimited" holds for formations and fails for tempo. In natural play a foreign government's tempo is bounded by the readiness gate and by how often its turn comes (about every twentieth week, `force-record.ts:21-26`). It is never bounded by having spent the same ships on another target, so a foreign government can blockade one country and invade another with the same brigades.

**Two smaller availability defects (facts, impact inferred).**

- Two arithmetics of "free". The gate uses `availableUnitsOfType`: units at readiness ≥ 0.5, scaled by `establishmentScale × readyShare`, minus commitments and reservations (`capacity.ts:180-194`). `forceShortfall` uses raw authored count minus commitments, with no scale, no readiness filter and no reservations (`commitments.ts:264-290`). When an appropriation has grown a branch, `establishmentScale` exceeds 1 (`capacity.ts:72-78`), the gate can offer more units than `forceShortfall` allows, and the landed rung then silently opens no commitment (`instrument-records.ts:177-181`): its effects land, no formation is held, no weekly cost runs. Not run.
- The command board's "formations" figure sums every branch's assigned count across unit types (`command-board.ts:96`), so 1,550 fighters and 31 brigades add into one number.

**Tests that touch this.** `force-packages.test.ts` (20 tests) and `basing.test.ts` (5) both passed (`npx vitest run src/basing.test.ts src/force-packages.test.ts`, 1.8 s). No test covers the `undefined` branch or a foreign government's repeated use.

## 5. Commands, readiness, theater settings and force by zone

**Facts.**

- **Posture.** `setCommandPosture` writes it (`combatant-commands.ts:549-583`). `effectivePosture` holds an engaged theater at heightened or above (`:537-540`), engagement being a war in its area, an unterminated War Powers obligation, or an active order-of-battle commitment toward a country in it (`:507-530`). `commandPhase` sums `POSTURE_READINESS_COST` (routine 0, heightened 0.004, surge 0.012 a week, `:593-597`) over all eleven commands and bills it to **national** readiness (`:637,661-662`). The benefit is `POSTURE_PRESSURE_RELIEF` (0.05 or 0.1 off the US side's war pressure, `:606-616`), read only in the war week (`war-tick.ts:350-359`). Posture changes no gate, odds, price or timing.
- **Assignment.** Each command holds a share of each service (`:75`). `assignedFormations` = national available × share (`:159-169`). Its only non-test reader is the command board (`command-board.ts:96`). **No gate, price or odds reads which command holds a formation.** The comment "A theater cannot help itself to another theater's bench" (`:35-36`) and ARCHITECTURE's "what a theater may actually employ" describe nothing the engine enforces. A deployment to the Gulf lowers every theater's count in proportion, because the national bench is subtracted first.
- **Chain of command.** `commandChain`'s `execution` (`:230-254`) is read only by player-core (`command-board.ts:94,220`; `command-acts.ts:103-104`). `commandAuthority` (`:213`) has no reader outside its file. A relieved commander or an empty Pentagon degrades no order's odds. The Secretary of Defense's competence reaches war attrition through `commandQuality` (`war-tick.ts:89-99`), which is a separate path.
- **Force placed by zone.** A deployment to a government stands in that government's zone; one to a war stands on the defender's ground (`commitment-locations.ts:17-29`). There is no origin and no route. The map gives it a seeded slot in that zone (`force-placement.ts:232`).

**Every place a military cost is debited.** "Treasury" is budget authority (`fiscal.ts:589-600`); "books" is the federal statement and debt.

| # | Cost | Debited at | Account | Note |
|---|---|---|---|---|
| 1 | Order escrow | `instrument-issued.ts:46,63` at issue; refunded at `:74` (recall) and `:109` (execution, landed or not) | Treasury | Nets to zero; the charge is #2 |
| 2 | Up-front force price | `resolution.ts:269` (`-basis.upFront`, from `force-costs.ts:118-147`, with the reach multiplier) | Treasury | Once, at execution |
| 3 | Weekly cost of forces held out | `instruments-military.ts:91-94` sets `amountPerTurn`; charged by `commitmentPhase` (`commitments.ts:532-541`), shortfall paid in stability (`:542-546`) | Treasury | Once a week. Kept off the federal outlay lines on purpose (`national-books.ts:357-363`); `commitmentOutlay` (`:311-321`) is a display line on the statement (`fiscal.ts:173`) |
| 4 | Inherited bases and board deployments | `basing.ts:89` (`amountPerTurn: 0`) | none | Inside #5 implicitly |
| 5 | Defense establishment | `national-books.ts:373` (`military.budget × price`) | Books | Appropriation above sustainment also draws treasury (`fiscal.ts:596-600`, comment) |
| 6 | War outlay | `national-books.ts:351,373` (`warOutlayShare × potential`, `fiscal-impulse.ts:119-133`: 2% aggressor, 3% defender, 0.5% joiner, × intensity) | Books | Independent of forces sent |
| 7 | War reserve drain | `war-tick.ts:152,174` (`-treasury × reserveDrain`, 1% to 4% × intensity a week) | Treasury | Independent of forces sent; scales with how much authority is held, not with what the war costs |
| 8 | Rung readiness | `instruments-military.ts:56-60` (`MILITARY_READINESS_COST × forceScale × jitter`) | Readiness | Quoted unscaled (§7) |
| 9 | Posture readiness | `combatant-commands.ts:637,661-662` | Readiness | National, not per theater |
| 10 | War attrition | `war-tick.ts:150-159` | Readiness | Comment at `:166-169` guards against charging it twice |
| 11 | Commitment drag | `capacity.ts:303-321` lowers the recovery ceiling | Readiness ceiling | Not a debit; caps recovery |
| 12 | Joining a war | `war-entry.ts:302-312` (standing, readiness, stability) | Metrics | **No money and no formations:** `joinerCommitment` returns nothing for the founding nation (`commitments.ts:676`), and the player's join writes no commitment |
| 13 | Munitions | `munitions.ts:57,249` (drawn per war week, restocked on a lead) | Munitions index | No money: a restock is never paid for |

**Inference on "reconciled once".** A US war is charged on three treasury channels (#2, #3, #7) and one federal channel (#6), each with its own estimate. #3 prices the forces actually sent; #6 and #7 price the war's intensity whatever was sent. Nothing reconciles them: a war with one brigade committed and a war with eight carry the same #6 and #7. A joined war (#12) carries #6 and #7 and nothing for forces. The two board deployments and the rotations they stand for are counted nowhere beyond the defense line.

## 6. Reservations and deployment orders

**Facts.**

- An issued act reserves its package: `reservedInstrumentUnits` adds the force count of every `issued`, `in-progress` or `awaiting-response` instrument act to `committedUnits*` (`capacity.ts:242,259,416-422`). The gate at issue reads that, so a second order cannot reserve units the first holds. Test: `force-packages.test.ts` "holds a preparing package out of the shared bench and releases it on recall".
- At execution the act's own reservation is removed only in the resolver's view (`executionState`, `instrument-issued.ts:78-82`), and the gate runs again on live state. If the bench has thinned, the act expires and releases its escrow (`:100-103,109`). **For the President, two orders cannot spend the same unit.**
- The same actor, target and instrument cannot hold two pending orders (`:29-30`).
- **A foreign government reserves nothing and commits nothing** (§4), so its orders can spend the same unit as often as readiness allows.
- A base reserves nothing (`basing.ts:10-12`).
- No order names a command, an origin or a route, and a reservation is not tied to a theater's assignment (§5).

## 7. Randomness in this area (DECISIONS §1.2, §1.3, §1.12)

**Facts.**

- Gates and projections draw nothing. `projectAction` passes streams into the gate context (`resolution.ts:550-565`), but no military gate calls `jitter` or a stream; `strikesByMissile` is deterministic (`instrument-gates.ts:105-108`).
- Map placement uses `hashIndex` on `${seed}:${commitment.id}` (`force-placement.ts:232`), a keyed hash, not a stream. Strike site context uses `hashIndex` (`strike-assessment.ts:38,50`).
- War draws use keyed streams: `("conflict", id, turn)` (`war-tick.ts:376`) and the join draw (`war-join.ts:222`).
- `jitter` keys a fresh stream on `("instruments", actor, target, turn)` (`instrument-gates.ts:116-119`), so every call in one resolution returns the same value. Its comment says the key includes the rung; it does not.
- **§1.12 and §3.7 breach: the readiness bill is jittered and scaled, but quoted bare.** The projection quotes `capacityCost(instrument, rung)` = `MILITARY_READINESS_COST[rung]` (`resolution.ts:576`, `instruments.ts:282-292`). The charge is that figure × `forceScale` (0.2 to 1.5, `force-packages.ts:135-154`) × `jitter` (0.9 to 1.1) (`instruments-military.ts:58`). A reinforced invasion is quoted 0.15 and can charge up to about 0.25. §1.12: variance "never applies to ... a figure quoted to the player before they decide".
- An issued act resolves on `createRngStreams(makeCampaignSeed(`${seed}:${act.id}`))` (`instrument-issued.ts:99`), a different seed from the one the projection was shown on. The forecast says it is "reassessed at execution" (`:57`), so the odds moving is disclosed; the readiness charge moving is not.

## 8. Save

**Facts.** The committed save is v57 (`git show HEAD:packages/engine/src/save.ts`, line 68). The working tree is at v63, uncommitted: `CURRENT_SCHEMA_VERSION = 63`, `MIN_READABLE_SCHEMA_VERSION = 51`, `SUPPORTED_SCHEMA_VERSIONS` 51 to 63 (`save.ts:102-110`). The pattern (DECISIONS §9.3, §9.4): a new field is optional and absent on an older save; `normalizeCampaign` runs fill steps first and derivations last (`save.ts:203-208`); a version-gated migration runs in `loadSave` before normalization (`:228-231`, `withTieLedger` for v63). Forces already have one migration: `withTypedLocations` (v56, `commitment-locations.ts:76`).

**Shapes Phase E would change (inference).**

| Shape | Change | Save impact |
|---|---|---|
| `Commitment` (`state-commitments.ts:60-140`) | An origin place, a command, a transit status | Optional fields; absent reads as "stationed at home, no command named" |
| `CommitmentLocation` (`state-world.ts:115-118`) | Unchanged, or `origin` beside `base`/`theater` | Optional |
| Access agreements | New: per host, the rights held | New optional campaign field, or terms on `TreatyRecord` (`state-legislature.ts:725-735`) |
| `IssuedInstrumentAct.request.force` (`state.ts`) | Origin, command | Optional |
| `CommandRuntime.assignment` | Unchanged if assignment becomes binding by derivation | None |
| Foreign governments' commitments | Already the `Commitment` shape | None; more records |

Any version Phase E adds is v64 or later and must land after I1 commits v63.

## Proposed slice plan

**Recommendation.** Six slices, test-first, one balance-moving slice at a time. Collisions noted are with I1 (the relationship ledger in `hill.ts`, `lobbying.ts`, `political-promises.ts`, `effects.ts`, the state files and `save.ts` v63) and with the uncommitted operations redesign (`CommandScreen.tsx`, `Desk.tsx`, `WarScreen.tsx`, `CountryForces.tsx`, `command-board.ts`, `security-board.ts`, `war-screen.ts`, `nation-file.ts`).

| Slice | Scope | Files | Moves balance? | Proof | Depends on |
|---|---|---|---|---|---|
| **E0 Pin the defects** | Failing-then-skipped or expected-current tests: foreign re-spend (the §4 scenario), distance counted twice in odds, readiness quote ≠ charge, a war joined with no forces, assignment read by no gate, a closed base saving nothing, gate vs `forceShortfall` disagreement | New `*.test.ts` in `packages/engine/src` | No | Each test fails for the stated reason on the current tree | Nothing; can start now |
| **E1 One bench, honestly spent** (C04) | One availability function. A government with no authored order of battle gets a derived bench (from `activeHeadcount` and `branchStrength` through the force-asset catalog's nominal personnel), labeled as derived. A foreign government's landed rung opens a commitment on that bench, so formations bind everyone. `forceShortfall` reads the same function as the gate. Readiness quote = charge: quote scaled by the package, no jitter on the bill | `capacity.ts`, `force-packages.ts`, `instrument-gates.ts`, `commitments.ts`, `instrument-records.ts`, `instruments-military.ts`, `instruments.ts`; `world/dataset/stat-consumers.ts` if a derived field is read | **Yes** (foreign tempo, war-join sizing, the player's readiness) | E0 tests pass; harness before and after, diagnosed not retuned | E0; a harness baseline first (BL-89 is red) |
| **E2 Places and access** | A place is an installation row with its point. Access per host (basing, transit, overflight) held as terms on an `executive-agreement` treaty record rather than a new store, opened at the oath for every host on `US_BASING`. The host can suspend it, reading its own trust and tension (two parties that can disagree, §1.14). A base costs its upkeep from the defense line explicitly, so closing one returns money | `basing.ts`, `treaties.ts`, `state-legislature.ts` or a new `access.ts`, `effects.ts` dispatch, `save.ts` (v64) | Yes, mildly (forward-deploy gate reads access instead of `basesAbroad`) | Host-revocation test; a closed base returns its upkeep; save round-trip from v63 | **I1 committed** (effects, state, save) |
| **E3 Directional reach** (C03) | `assessReach(campaign, actor, target)`: nearest usable origin (home, a base with access, a group on station), distance from there, the projecting side's lift, the target's defenses; one division for odds, not two | `geography.ts`, `resolution.ts`, `contest.ts`, `action-timing.ts`, `instrument-gates.ts`, `war-entry.ts` | **Yes** (odds, price, lead time) | Asymmetry test (A onto B ≠ B onto A for reasons the reading names); a Gulf group shortens and cheapens a Gulf strike; harness | E2 |
| **E4 Task groups, orders and commands that bind** | A deployment order names its command and origin; transit takes days from E3; a theater draws from its assigned bench or the order needs a reassignment; a joined war commits a formation; the chain's `execution` reaches the order's odds | `combatant-commands.ts`, `instrument-issued.ts`, `commitments.ts`, `commitment-locations.ts`, `war-entry.ts`, `resolution.ts`, `save.ts` | **Yes** | Two theaters cannot share a bench; a relieved commander lowers odds in that theater only; reservation by command; harness | E1, E3 |
| **E5 Costs reconciled once** | One war cost: the weekly cost of forces sent (#3) is the treasury charge; the federal war line (#6) is derived from the same forces, not from intensity alone; the treasury reserve drain (#7) is removed or tied to the same figure. Rotation counted for board deployments | `war-tick.ts`, `fiscal-impulse.ts`, `national-books.ts`, `commitments.ts`, `basing.ts`; `docs/DECISIONS.md` §6.8 | **Yes** (and it is what BL-89 waits on) | A per-cause ledger test: each dollar of a war appears once per account; harness; owner decision on BL-89's "what makes a reckless presidency fail" | E4; owner decision |
| **E6 Map layers and screens** | Extend the current map: a bases layer (installation pins with access status), a posture layer (command areas tinted by effective posture), task groups as arcs (`MapArcs.tsx`) from origin to station, reach drawn from the chosen origin. No dotted map. Phone and desktop parity | `player-core/geo/*`, `player-core/security/command-board.ts`, `apps/web/src/map/marks/sources.ts`, `use-map-layer.ts`, `world/security/*`, `world/war/*` | No | Live captures at 390×844 and 1440×900, plus 320 reflow, 1280×800, 1920×1080 | E2 to E4; **operations redesign committed** |

**Strongest failure mode.** E1, E3, E4 and E5 each move tempo, odds or money for every government at once, and the balance harness is already red (BL-89: R1.1 and `population-balance`). Movement cannot be attributed to a slice if the baseline is not re-measured between slices, and a red harness invites retuning instead of diagnosis. Second: E2 and E4 add stored state through the same `effects.ts` dispatch, state files and `save.ts` that I1 is rewriting, so landing them early is a merge collision on the save version.

**Best alternative.** A narrow Phase E: E0, E1 and E3 only, plus the readiness-quote fix, with no new stored state. Access, task groups and command-bound orders would be *derived* from existing commitments and treaty records rather than stored, and the cost reconciliation would wait for the owner's BL-89 decision. It avoids every save collision and moves balance twice instead of four times. It does not deliver access agreements or deployment orders as things the player handles, which requirement 6 names.

**Conclusion: accepted with controls.** Run E0 now. Measure the harness before E1 and after each balance-moving slice, and record per-seed figures in the gate record. Do not start E2 until I1 is committed, or E6 until the operations redesign is. Take E5 to the owner with BL-89 rather than choosing the war-cost model alone.

## Not done in this trace

- The balance harness, the gate sweep and e2e were not run (instruction for this trace).
- The weight of the contest's reach layer in `contest-dials.ts` was not read, so how much the double distance penalty moves odds is unmeasured.
- The gate-vs-`forceShortfall` disagreement (§4) was reasoned from source, not run.
- The §4 scenario ran against the committed `dist`, not the TypeScript source; the source files it exercises had no uncommitted changes, but `verify-dist-freshness` was not run.
