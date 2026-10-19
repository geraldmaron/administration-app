# Connected control plane program: selection, staging and inline management

Opened 2026-10-16. This is the program record for the five control-plane audits beside it (`01-act-catalog.md` to `05-interaction-patterns.md`). Backlog items are BL-171 to BL-211 in `docs/BACKLOG.md`. `docs/PLAN.md` carries the week-of status. Wave keys are `CP1` to `CP6` so they never collide with the universal player's `UP0`-`UP11` or the map-first program's `W0`-`W10`.

## 1. Purpose and the owner's words

The owner's direction, 2026-10-16, summarized: the player must be able to select one or more items in one interface (tariffs on several goods, troops to several countries, relief or the Guard to several states, sanctions, aid), with interactive, rule-bound feedback, and this must extend to every relevant surface. The game should be a fully connected control plane where relevant settings and decisions are updated inline, never behind a navigate-only button. The audits found the gaps. This program turns them into ordered work.

What the audits found, in numbers:

- 166 player acts are catalogued. 14 are single-target where a player plausibly wants several (audit 01, "Result in one paragraph").
- Of 42 rated screens, 13 are connected, 17 partial and 12 disconnected. 30 ranked gaps (audit 04, "Verdict first" and "Ranked gap list").
- Multi-select is offered in three places only: the budget editor, the appointments plan and the Compare subject picker (audit 04 (d)).
- Four separate review sheets each call themselves the one path (audit 05 §1.4).
- Five engine defects, all confirmed by reading source on 2026-10-16 (section 6).

The commit side already handles a run of packets as one act: `Prepared = EffectPacket | readonly EffectPacket[]` (`apps/player/src/review/authorize.ts:17-20`) and `store.commitAll` applies each packet to the state its predecessor left and saves once (`packages/player-core/src/campaign/store.ts:544-555`, read 2026-10-16). The gap is the surface, the preview and the review, plus the defects that would make a combined plan lie.

## 2. Principles

1. **Selection and staging are a first-class interaction.** Any list, table or map can select one or many subjects. A selection stages plan lines. Nothing commits from a selection.
2. **Inline over navigate.** A setting shown in a reading is changed there. A button that only navigates to the place where the change happens is a defect (audit 04, cross-cutting 9). The exception is a door to a subject's own screen, which stays a door (memory: marks link to their subject).
3. **One reviewed package.** Every consequential act, single or several, goes through one presidential review path with explicit named confirmation (DECISIONS §8.9). Several lines are reviewed once as one package, never as N reviews. Per-line refusal is settled before confirmation and named in the review. After confirmation nothing is ever partly applied (audit 05, load-bearing choices).
4. **Rules are computed in player-core and never typed into the UI.** Every bound, status, cost, verdict and reason comes from a fold over the engine's own builders on a scratch campaign. A screen maps a status to a tone and draws the engine's words (audit 05 §2.4). A figure the engine owns is never typed into copy (CONTENT_DOCTRINE §10.2).
5. **The list is the accessible twin of the map.** Every map selection has a list path that reaches the same plan lines by keyboard and screen reader. The map is never the only path (DECISIONS §8.8, audit 02 §3.8, audit 05 §2.11).
6. **Phone and desktop parity.** Every path works at 390×844 without drag or hover. Desktop adds a sticky plan rail and drag as an enhancement only (DECISIONS §8.5, audit 05 §2.12).
7. **Plain-language copy.** All new player text follows CONTENT_DOCTRINE §10.2 and passes `verify-player-prose`. Copy that says "one kind of goods per order" or "one decision at a time" is retired as each surface lands (audit 03 P15, audit 01 G07).

## 3. Architecture on one page

### 3.1 The Plan model

A **Plan** is an ordered list of **PlanLines** `{ id, kind, target, params, origin, seq }` held in player-core (`packages/player-core/src/plan/`). Each line kind is declared once in `PLAN_KINDS` with its builder, words, conflict keys, editor bounds, review tier and map place (audit 05 §2.2). First kinds: `act` (wraps `buildAct`, `packages/player-core/src/act/build.ts:147`), `nomination` (wraps `deskPlan`'s builder) and `end` (lift, stand down, withdraw). Later kinds: `locale-act`, `share`, `budget-line`, `posture`, `order`, `policy`.

### 3.2 Per-line scratch build (the fold)

`readPlan(campaign, plan)` sorts lines by `(rank, seq, id)` and builds each against a scratch campaign. A ready line's packets are applied to the scratch with the engine's own `apply()` before the next line is built. A refused line does not advance the scratch. This is `deskPlan`'s method (`packages/player-core/src/appointments/desk.ts:252-268`) generalized. It yields per-line status (`ready`, `refused`, `needs-authority`, `over-budget`, `conflict`, `moved`), the engine's reasons, the combined effect and a fingerprint (audit 05 §2.3).

The fold is what makes escrow, unit reservations, treasury and tariff ordinals honest across lines (audit 01 item 3, audit 02 §3.4). It cannot make pending force orders visible to the War Powers and readiness gates, because those gates read only what resolution writes (section 6). Those two gates change in the engine.

### 3.3 One presidential review path

All four review paths collapse into `authorizeAct` and the frame's `ReviewSheet` (BL-171). The review gains a package mode: numbered lines keyed by stable id, a "Won't be sent" block with reasons, the combined effect, the highest tier of any line and danger if any line is danger (audit 05 §2.6 `PackageReview`).

### 3.4 Batch commit

On confirm the authorize path re-reads the plan against `store.getState()`. If the board is unchanged and the fingerprint matches, it commits `[header, ...lines]` through one `commitAll`. If the board moved, it commits nothing and shows what moved, with "Review again" (audit 05 §2.7, the `useVaultRoom` shape at `apps/player/src/saves/useVaultRoom.tsx:32-60`). The basis identity check already refuses a stale board (`store.ts:390-397`).

### 3.5 Receipts and Record entries

A header packet with no effects goes first. Each line's packet carries the header's event id in `provenance.causeIds`, so the Record lists the lines as the package's consequences (audit 05 §2.8, `packages/player-core/src/record/record-entry.ts:266-267`). The receipt keeps every event id, not the last one (`authorize.ts:93`). The delta lens takes a set of regions. If an effect-less header packet is refused by `apply()`, an optional `bundle` field is added to the engine (BL-175). No campaign save field is added otherwise.

### 3.6 Amend and cancel

Every standing effect a line created (measure, operation, deployment, nomination, order) offers Change and End wherever it is drawn. End stages an `end` line. Change stages an end plus a new line as one package. Both go through the one review. The `?manage=` desk becomes the one-line case (audit 05 §2.9, BL-203).

### 3.7 Where the map fits

The map is a selection surface, never the only one. `MapView` gains `selectedKeys` and `onToggle`, region badges, force marks as real buttons and arcs, keeping `selected` and `onSelect` for single use (BL-181). The list beside it is built from the same lens rows. CP1 ships list paths only. The map joins in CP2, starting from the `/nation` stage map, which is the first surface built this way (map as the stage with inline state management, committed separately from this program).

### 3.8 Where the audits disagreed, and what this program follows

| Question | Audit positions | Followed | Why |
|---|---|---|---|
| Where the multi-line fold lives | 02 proposes engine `projectForcePlan` and `issueForcePlan` (§3.4). 03 proposes engine `imposeTariffPackage` (§5.4) and `issueActionPackage` (§6). 01 (E1) and 05 (§2.3) fold in player-core. | 01 and 05 | `deskPlan` already proves the fold in player-core, the commit path already takes a run, and one generic fold serves every kind without a new engine function per family. The engine changes only where a fold cannot reach (the gates, section 6). |
| Do force plans need engine changes | 05 says none expected for forces (BL-176 proposal). 02 says the War Powers and readiness gates must count pending legs (§1.11). | 02 | Verified: `warPowersStanding` reads `congress.unauthorized` and expired obligations only (`packages/engine/src/congress.ts:298-343`), written at resolution (`instrument-records.ts:102-106`). `forceAvailable` reads live readiness (`instrument-gates.ts:198-205`). A fold over issue packets changes neither. |
| Tariff retaliation for several lines on one partner | 03 wants one retaliation per partner in one engine packet. 05 folds per line. | 05 for CP1, 03 later behind an owner ruling (BL-186) | A per-line fold reproduces exactly what N separate acts do today, so CP1 adds no new rule. One answer per partner is a game-rule change that the owner should rule on. |
| Grouping a package | 02 adds `planId` to `IssuedInstrumentAct`. 03 adds `packageId` to `TradeMeasure`. 05 uses a header packet and `causeIds`. | 05 | No save field and no schema bump. `packageId` arrives only with BL-186 if the owner adopts it. |
| Orders over several subjects | 03 P14 wants `subjects[]` on one record. 01 G04 says N signatures already work. | 01 | Record ids embed the subject (`orders.ts:534-540`), so N signatures in one package already keep per-subject court stays, with no schema change. |
| The force surface | 02 proposes a separate route `/world/security/plan`. 05 extends the force act with map-and-list assignment. 01 proposes a theater board. | 05 for the surface, 02 for its states, totals and entry points | 04's named failure mode is a second copy of the act desks. One surface per act family plus the plan dock (BL-182) as the cross-surface tray avoids a parallel planner. 02's interaction states (§3.5) and live panel (§3.6) are adopted inside it. |
| The selection component | 01 extends `SortTable` with a selection column. 05 builds `SelectList` reusing `sortRows`. | 05 | `SortTable` rows are not press targets (`packages/ui/src/world/SortTable.tsx:111-179`, per audit 05 §1.1). Whole-row targets are the quality bar (memory: UI quality bar). |
| What "moving troops" means | 01 G02 leaves it open (command assignment or country deployment). 02 finds command reassignment cosmetic. | Country deployment first | Verified that reassignment has no simulation reader (section 6). Command moves wait on the owner (BL-200). |
| First critical path | 05: one review path. 02: the two gates. 03: receipts and expiry. | All of 05 and 02, and 03's receipts fix, in CP1. Expiry in CP2. | CP1 has no tariff durations, so the expiry defect cannot reach a player until CP2 adds them. |
| Platform text in CLAUDE.md | 02 (Platform note, BL-184), 03 (Which player) and 04 (How this was done) say CLAUDE.md still describes `apps/web`. | Not adopted | Refuted: CLAUDE.md line 9 and its table (lines 20-26) describe `apps/player` (Expo, Tamagui) as the player and `apps/web` as frozen. |

## 4. Wave ledger

Each wave lands with targeted checks during construction and a gate record in `gates/<wave>.md` saying what was actually run. Bulk sweeps run at the integration checkpoints (CP1, CP3, CP6), per the owner's cadence (CLAUDE.md "Before Starting Any Task" item 4, BL-137).

| Wave | Items | Depends on | What ships | How it is proven |
|---|---|---|---|---|
| **CP1 Several goods, several countries** | BL-171, BL-172, BL-173, BL-174, BL-175 (only if needed), BL-176, BL-177, BL-178, BL-179, BL-180 | nothing outside the program. **Integration checkpoint.** | One review path. The Plan fold. `SelectList`, `NumberStepper`, `PackageReview`, `PackageReceipt`. Package entries in the Record. The two force gates and the customs receipts fix. Tariffs on several goods from one country, and forces to several countries by the list path, each through one review. | Engine tests for the three defects with a balance run by hand. Player-core fold tests. Browser at 390×844 and 1440×900: three goods tariffed on one country in one review, two strikes plus a carrier presence with the second strike refused before review. Full build, typecheck, lint, test and gate sweep at the checkpoint. |
| **CP2 The map as stage, and the trade workspace** | BL-181, BL-182, BL-183, BL-184, BL-185, BL-186 (owner ruling), BL-187, BL-188, BL-189 (owner ruling), BL-190 (owner rulings) | CP1, UP7 `MapView` wiring, the committed `/nation` rebuild | Map multi-select with force marks and arcs. The plan dock persisted across surfaces. The trade workspace (goods by partners, bulk edit, presets, durations). Tariff expiry that reverses prices. Households and jobs readings. The map in World, Security, Command, Emergency and War. Planner entry points from the act desk, war and command files. | Fold and selector tests. Expiry-week engine test. Browser at both sizes: 3 goods from 2 partners with one rate, one 90-day line, one excluded cell, one review. A plan staged on one screen survives navigation and reload. Map and list selection mirror both ways by keyboard. |
| **CP3 States, emergencies, orders and policy** | BL-191, BL-192, BL-193, BL-194, BL-195 | CP1. BL-191 and BL-192 also need BL-181. **Integration checkpoint.** | States as a set on the Nation stage, the State page acting inline, emergencies and the Guard across states, orders for several subjects, the policy program in one review, results lists in place of options-as-columns. | Browser at both sizes: relief for three states in one review, renew two emergencies together, an order signed for two subjects, two policy domains enacted together. Full sweep at the checkpoint. |
| **CP4 Foreign sets, intelligence and commands** | BL-196, BL-197, BL-198, BL-199, BL-200 (owner ruling), BL-201 (owner ruling), BL-202 (owner rulings) | CP1. BL-201 needs BL-180. | Sanctions, aid and engagement on several countries from World, Org, Compare and the act desk. Report sharing with several governments. Command posture and commitments on one board. The id and dice defect fixed or ruled. | Engine id tests, and a balance run if the stream key changes. Browser: a sanction on three countries with one refused, a report shared with two governments, two command postures staged together. |
| **CP5 In motion: amend, cancel and inline settings** | BL-203, BL-204, BL-205 | CP2 (the dock) | Change and End wherever an effect shows, several measures lifted in one review, the In motion panel, inline settings on budget lines, tariff rates, posture and Nation lever cards. | Browser: lift two tariffs from the country page in one review, amend a tariff rate from its row, change a budget line in place and review it. |
| **CP6 Washington and the Brief** | BL-206, BL-207, BL-208, BL-209, BL-210, BL-211 | CP1, CP2 (dock), CP5 for the palette's starts. **Integration checkpoint.** | Appointments on the plan from every seat view, sign or veto and lobbying from rows, directives to several agencies, the Brief, clocks, calendar and bell starting the answer, nav counts, the command palette, the press door that carries its story. | Browser: fill two vacant chairs from the Executive board in one review, sign two bills from the desk, start an answer from the bell, open the palette with the keyboard and stage a tariff line. Full sweep and the program close-out. |

**Why CP1 is the smallest end-to-end slice.** Several goods and several countries both need one review path (four sheets would mean four batch reviews), the fold (per-line pricing on one basis is wrong), the package review and receipt, and a Record entry that groups the lines. Forces additionally need both gate fixes, or the screen would show a legal plan that half-executes (audit 02 §3.11, accepted with controls on that condition). Tariffs need the receipts fix, or the combined revenue headline would multiply a known overstatement (audit 03 §4.1). Everything else waits: the map (list paths satisfy DECISIONS §8.8's list twin), the dock (each CP1 plan lives in one surface), several partners for tariffs, durations and the engine tariff package.

## 5. Engine contract changes versus UI-only

Every engine change is deterministic (same seed and inputs give byte-identical output), keeps `apply()` as the only mutator, and updates `docs/SCHEMA.md` and `docs/ARCHITECTURE.md` in the same change where a listed surface moves (CLAUDE.md "Doc Sync Contract").

| Item | Engine change | Determinism requirement | Save compatibility | Balance run |
|---|---|---|---|---|
| BL-175 | **Engine, conditional.** Optional `bundle` on `EffectPacket` and `ActionRecord`, only if an effect-less header is refused | Omitted when absent, so existing packets hash the same | Additive optional field, old saves load unchanged, no version bump | No |
| BL-176 | **Engine defect.** `warPowersStanding` counts the President's pending major-rung acts | Derived from `issuedActs`, no draws | No state change | Recommended (player-only gate) |
| BL-177 | **Engine defect.** `forceAvailable` nets expected readiness spend of pending acts, at no jitter | Derived, no draws | No state change | **Required** (NPC acts pass the same gate) |
| BL-178 | **Engine defect.** `selectCustomsReceipts` stops applying the volume fall twice | Pure read | No state change | **Required** (treasury moves) |
| BL-184 | **Engine defect.** `expireTradeMeasures` reverses the price move, and a tariff may carry a duration | Pure, no draws | `expiresDate` already exists (`trade.ts:77`, per audit 03) | Recommended |
| BL-186 | **Engine, owner ruling.** `projectTariffPackage` and `imposeTariffPackage` in a new `trade-package.ts`, `packageId` optional on `TradeMeasure` and `RetaliationRecord` | Lines canonicalized by partner then sector before any id or roll | Optional fields. Bump `CURRENT_SCHEMA_VERSION` from 66 (`packages/engine/src/save.ts:125`, verified) with a no-op migration only if normalization is strict (UNCONFIRMED) | **Required** |
| BL-188 | **Engine, additive pure function.** `projectOpeningJoiners` | Pure read of `likelyJoinersOf` on a hypothetical conflict | No state change | No |
| BL-189 | **Engine, owner ruling.** `imposeTariff` applies `tariffCompetence`, and a trade treaty's bound schedules are read | Pure gate | No state change | If the ruling costs trust |
| BL-190 | **Engine only if the owner picks (b).** `coverage` per tariff line, or a trade court subject | Coverage scales incidence linearly | Optional field | If adopted |
| BL-197 | **Engine defect.** Ordinal ids for non-rate measures, and an owner ruling on the instrument stream key | New ids for new measures only. A stream key change alters every existing draw | Old ids kept, saves load | **Required** if the stream key changes |
| BL-200 | **Engine, owner ruling.** Reassignment feeds availability or reach, or the act is relabeled (UI copy) | Derived | No state change expected | Required for the engine option |
| BL-201 | **Engine, owner ruling.** `redeployCommitment` and its War Powers handling | Pure act | Possibly new commitment fields, SCHEMA updated | Required |
| BL-202 | **Engine, owner rulings.** Aid amount, mixed-force packages, tasking targets, plurilateral treaties | Each additive and optional on its request type | Each loads old saves unchanged | Required per adopted change |
| BL-207 | **Engine only if the owner raises the outreach cap** (`OUTREACH_DAILY_LIMIT`) | Constant | None | Required if changed |
| BL-211 | **Engine only if the owner changes the one-engagement-a-week rule** | Constant or rule | None | Required if changed |
| BL-171, BL-172, BL-173, BL-174, BL-179, BL-180, BL-181, BL-182, BL-183, BL-185, BL-187, BL-191 to BL-196, BL-198, BL-199, BL-203 to BL-206, BL-208 to BL-210 | **UI and player-core only.** No engine change | The fold uses the engine's builders and `apply()` unchanged. The same plan on the same campaign must give identical packets twice (BL-172 test) | No campaign field. The plan sidecar is player-core's own, versioned there, never in `Campaign` (audit 05 §3.4) | No |

## 6. Engine defects the audits found

Each was confirmed by reading the cited code on 2026-10-16. None was confirmed by a run. Each item's proof is a failing test written first, then passing after the fix.

### 6.1 Booked customs revenue is lower than the preview (BL-178)

The preview prints `tariffIncidence(...).revenue = edge.imports × rate × (1 − fall)` on the basis edge (`packages/engine/src/trade.ts:257`). The weekly books recompute `tariffIncidence` on the live campaign (`trade.ts:349-360`). The live edge comes from `sectorFlow`, which multiplies imports by `1 − volumeFall` for every tariff in force (`trade-volume.ts:115-155`, read by `tradeEdge` at `trade.ts:149-168`). So the tariff's own fall is applied twice, then scaled by a collection share of 0.6 to 1.0 (`trade.ts:350-351`). Booked is about base × rate × (1 − fall)² × share against a shown base × rate × (1 − fall). This breaks DECISIONS §3.7, "The price shown is the price charged" (audit 03 §4.1).

**Proof required:** a test signs a 25% tariff and asserts that the next week's annualized `selectCustomsReceipts` equals the shown revenue times the shown collection share, within rounding. The preview shows the net figure or labels the share. A balance run is recorded.

### 6.2 Expiring tariffs leave their price increase behind (BL-184)

`expireTradeMeasures` lifts with `{ kind: "trade", lift }` and no `priceMove` (`packages/engine/src/trade-effects.ts:125-138`). `liftMeasure` reverses the move (`trade.ts:636`). The reducer changes `sectorPrice` only when a `priceMove` is present. Harmless today because the only expiring measure has rate 0 (`trade-effects.ts:116-123`). It becomes wrong the moment a tariff line carries a duration (audit 03 §4.2).

**Proof required:** a tariff with a duration expires and `sectorPrice` returns by the amount `liftMeasure` would remove. Retaliation answering the expired line stays recorded.

### 6.3 War Powers second-front and readiness checks ignore orders still waiting to execute (BL-176, BL-177)

`warPowersStanding` returns `requires-authorization` only for expired obligations and `congress.unauthorized` (`packages/engine/src/congress.ts:298-343`). Those are written at resolution by `warPowersRecord` (`instrument-records.ts:102-106`), not at issue. `forceAvailable` reads live readiness (`instrument-gates.ts:198-205`), and readiness is spent only at resolution (`instruments-military.ts:52-57`, per audit 02). Both acts pass at issue. The later one is re-gated at execution and marked "did not execute ... Reserved funds and forces released" (`instrument-issued.ts:95-106`). The player was shown it as legal (audit 02 §1.11, items 1 and 2).

**Proof required:** with one pending unilateral rung-4 act against A, `projectAction` for rung 3, 4 or 5 against B returns `ok: false` with the second-front reason. Three timed strikes issued at 0.50 readiness: the third is refused at issue. Existing single-act tests unchanged. Balance run recorded for the readiness change.

### 6.4 Several acts on one target in one turn share ids and dice (BL-197)

- **Retaliation and measure ids.** `tariffOrderIds` picks the next free ordinal from the campaign it is given (`trade.ts:362-371`). Two tariff packets built on one basis take the same retaliation id `retaliation:<target>:<turn>`, and the same measure id if the sector matches. Applied in sequence, the reducer replaces the measure under its id and appends a second retaliation record with the same id (`trade-effects.ts`, reducer read 2026-10-16). The fold (BL-172) avoids this.
- **Non-rate measure ids** are `<kind>:<target>:<turn>` with no ordinal (`trade.ts:537`), so two measures of one kind on one target in one turn collide even when folded. Whether issue paths can reach this past the one-pending-act guard (`instrument-issued.ts:29-30`) is UNCONFIRMED.
- **Dice.** `jitter` opens `stream("instruments", actor, target, turn)` (`instrument-gates.ts:118-121`), seeded only by the campaign seed and the key (`rng.ts:59-66`), and a fresh stream with the same key replays the same numbers. Two acts on one target in one turn that resolve at once, or that are projected on one basis, draw identical numbers. Timed acts re-seed by act id at execution (`instrument-issued.ts:99`), so their execution draws are independent. This narrows audit 05 §1.6's statement (audit 05 §1.6, §3.2, §3.6-2).

**Proof required:** a test shows each collision today. After: the fold test asserts distinct ids for two lines on one partner. Non-rate measures take the ordinal scheme for new measures, with old ids kept and a save round trip. For dice, the owner rules between the plan conflict rule (no engine change) and a stream-key discriminator (changes existing draws, balance run required).

### 6.5 Moves between combatant commands have no simulation effect (BL-200)

`reassignForces` changes `assignment[branch]` (`packages/engine/src/security-effects.ts:118-122`). Its only readers are `assignedFormations` and `assignedShare` (`combatant-commands.ts:159-179`), read only by the command board's formation count (`packages/player-core/src/security/command-board.ts:96`) and the act's own share lookup (`packages/player-core/src/security/command-acts.ts:132`). Grep of `packages/engine/src` and `packages/player-core/src` on 2026-10-16 found no other reader. Gates, availability, placement, odds and war weeks ignore it, while the screen reads as moving troops (audit 02 §1.8, `apps/player/src/security/CommandActs.tsx:85-87` per audit 01).

**Proof required:** the owner chooses. Either a test shows a reassigned share changing availability or reach for that theater (with a balance run), or the act and its help are relabeled as administrative and the prose gate passes.

## 7. Cross-cutting deficiencies (audit 04)

| # | Deficiency (audit 04, "Cross-cutting deficiencies") | Where it is addressed |
|---|---|---|
| 1 | No command palette or global action search | BL-210 |
| 2 | No staged plan or draft outside budget and appointments | BL-172, BL-182 |
| 3 | No undo or amend of a pending act | BL-203 (amend and cancel), BL-182 (draft undo) |
| 4 | No bulk selection outside Compare and appointments | BL-173 (`SelectList`), then every surface item |
| 5 | No keyboard shortcuts | BL-210 |
| 6 | No "recent actions" panel | BL-204 |
| 7 | Four different routes from an alert to its act | BL-209 |
| 8 | Duplicate paths for the same act (nominate three ways, answer a governor two ways, engage three ways) | BL-206, BL-191, BL-196 |
| 9 | Buttons that exist only to navigate | BL-179, BL-183, BL-191, BL-196, BL-203, BL-205, BL-206, BL-209, BL-211 |
| 10 | Every consequential act forces its own review | BL-171, BL-174 |
| 11 | Context lost on navigation (scroll and selection restore UNCONFIRMED) | BL-209 acceptance (focus returns to the row), checked in every wave's browser pass |
| 12 | The Nation page is the target model but partly uncommitted | The `/nation` rebuild commits separately before BL-191 builds on it |

## 8. Verification rules for this program

**During construction (targeted).** Run the affected package's vitest, then `pnpm --filter @admin/player typecheck lint` for player work. Engine items run their own tests and, where section 5 says so, `pnpm --filter @admin/engine run test:balance` by hand. Parallel agents never run the workspace build, typecheck or lint (memory: parallel agents share the TS build). No bulk sweeps between slices (CLAUDE.md "Before Starting Any Task" item 4, BL-137).

**At each integration checkpoint (CP1, CP3, CP6).** The full order from CLAUDE.md "Branches and the merge flow": delete `tsconfig.tsbuildinfo`, `pnpm run build`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, every `scripts/verify-*.mjs`, and the balance harness when any engine item landed in the wave. Then the browser matrix at 390×844, 1440×900, 320 reflow, 1280×800 and 1920×1080.

**What must be observed in a real browser for each surface.** On the served web export (`expo export -p web`), not a stubbed fetch or helper test, at 390×844 and 1440×900 in light and dark, with realistic campaign data:

1. The selection: several rows selected by pointer and by keyboard alone (Space, Shift+Space, select all), with the live count announced.
2. The live feedback: a status for each line that changes when another line changes, drawn from the fold (for example, the second strike turning refused when the first is added, a tariff line clamped at its ceiling).
3. A refused line: its reason in the engine's words, and its absence from the commit.
4. The review: numbered lines, the "Won't be sent" block, the combined effect, the named confirmation, and focus never landing first on confirm.
5. The receipt and Record: every line listed, the package entry with its lines as consequences.
6. A reload mid-draft: the draft survives (address in CP1, sidecar from CP2) and a moved board reads as moved.
7. The map, where present: map and list selection mirror both ways, and the list path completes the task without the map.

Each wave's gate record names which of the seven were observed for which surface, at which sizes, and what was not run and why. A passing build is not visual approval (CLAUDE.md "Design workflow").

## 9. Open owner decisions

Listed, not decided.

1. **Tariff retaliation for a package.** One answer per partner on the weighted rate (audit 03 §5.4 option B), or one per line as today (BL-186).
2. **Command reassignment.** Make it feed availability or reach, or relabel it as administrative (BL-200).
3. **Redeploy.** Does moving a standing deployment count as withdrawal from the old host, and does it open a new War Powers obligation (BL-201)?
4. **Mixed-force packages** in scope or not (BL-202).
5. **Aid amount** as a parameter, or keep per-rung constants (BL-202).
6. **Collection fan-out.** Several targets for one element, restating the one-tasking-per-element-per-day rule (BL-202).
7. **Plurilateral treaties** in scope or not (BL-202).
8. **Instrument dice.** Keep the plan conflict rule, or add a discriminator to the stream key and accept changed draws (BL-197).
9. **Outreach slots.** Raise `OUTREACH_DAILY_LIMIT = 2` or keep it and show the meter (BL-207).
10. **Press.** Keep one engagement a week or allow several outlets (BL-211).
11. **Trade treaty breach.** Block the tariff, or allow it at a trust cost (BL-189).
12. **Tariff exclusions.** Cell deselection only, or `coverage` per line (BL-190).
13. **Legal exposure for trade.** Authority and citation only, or a modeled trade proceeding (BL-190).
14. **Plan size and hostilities review.** The draft cap (audit 02 proposes 12 legs) and whether a plan with more than one hostilities leg requires per-leg acknowledgment before confirm (BL-180, BL-182).
15. **Commodity purchase or refill act.** Wanted or not (audit 03 §6, recorded under BL-205 as a locked reason until decided).
16. **Per-member whip order.** Wanted or not (audit 05 §3.6-3, BL-207).

## 10. Audit coverage

Every finding maps to a BL id or to "not adopted" with a reason. "UNCONFIRMED" means the audit did not run it, and the owning item carries the check.

### Audit 01: act catalog

| Finding | Disposition |
|---|---|
| Item 2, commit path takes a run (`authorize.ts:20`, `store.ts:148,544`) | Basis of BL-172 and BL-174 |
| Item 3, builders must be chained | BL-172 |
| Item 4, appointments desk and budget draft as precedents | BL-172 (`nomination` kind), BL-206, BL-205 |
| Item 5, DECISIONS §8.9 requires a distinct review | Principle 3, BL-171 |
| Item 6, no multi-select table primitive | BL-173 |
| G01 tariffs, several goods and countries, `reviseTariff` | BL-179 (goods), BL-183 (countries). `reviseTariff` not adopted: Change is an end plus a new line in one package (BL-203), and BL-186 covers a package contract if the owner wants one |
| G02 troops to several destinations | BL-180, BL-181, BL-188. Command part BL-199 and BL-200. Country redeploy BL-201 |
| G03 one act on a set of countries, aid amount | BL-196. Aid amount BL-202 |
| G04 orders with several subjects | BL-193 |
| G05 acts on several states | BL-191, BL-192 |
| G06 policy program | BL-194 |
| G07 share a report with several governments | BL-198 |
| G08a posture of several commands | BL-199 |
| G08b tasking fan-out per element | BL-202 |
| G09 directives, removals, notices to several agencies | BL-208 |
| G10 several members or posts, outreach cap | BL-207 |
| G11 several acting seats, dismiss several | BL-206 |
| G12 commitments in bulk | BL-199 |
| G13 press to several outlets | BL-211 |
| G14 plurilateral treaties | BL-202 |
| E1 chained batch builder | BL-172 |
| E2 multi-row selection table | BL-173 (as `SelectList`, section 3.8) |
| E3 one review for a batch | BL-171, BL-173 |
| E4 state and country multi-select in the address | BL-191, BL-196 |
| E5 engine additions | BL-186, BL-202, BL-201 |
| A10 stand down a pending operation, several | BL-203 |
| A11 lift a trade measure, several | BL-203 |
| G1 attention settings, no bulk "set all" | Not adopted: settings already change per row inline, and no audit or owner statement asks for bulk |
| UNCONFIRMED: lift plus re-impose acceptability | BL-203 (Change stages both in one package and the review shows both), BL-186 for the retaliation side |
| UNCONFIRMED: `BillActs.tsx` line for bill text acts | BL-207 checks it |
| UNCONFIRMED: owner's meaning of moving troops | Section 3.8, decision 2 |
| UNCONFIRMED: cadence leaves room for batch tests | Section 8: targeted tests are allowed during construction |

### Audit 02: military and force movement

| Finding | Disposition |
|---|---|
| §1.11-1 pending legs ignored by the second front | BL-176 |
| §1.11-2 pending legs do not reserve readiness | BL-177 |
| §1.11-3 no redeploy | BL-201 |
| §1.11-4 reassignment is cosmetic | BL-200 |
| §1.11-5 one report obligation per target per turn (invariant) | BL-180 acceptance keeps it: one line per target per instrument |
| §2.3-1 two-country move takes two loops | BL-180 |
| §2.3-2 legality blind to staging | BL-176, BL-177, BL-172 |
| §2.3-3 no map selection | BL-181, BL-187 |
| §2.3-4 AUMF and force not stageable together | BL-188 |
| §2.3-5 changing a running deployment is a round trip | BL-203, BL-199 |
| §2.3-6 posture away from the act | BL-199, BL-188 |
| §1.2 `forcePackageFor(...).levels` not drawn (UNCONFIRMED) | BL-180 checks whether commitment levels belong on the leg editor |
| BL-171 proposal (War Powers gate) | BL-176 |
| BL-172 proposal (readiness gate) | BL-177 |
| BL-173 proposal (engine plan fold) | Merged into BL-172 as a player-core fold (section 3.8) |
| BL-174 proposal (`planId`, stand down by plan) | Not adopted as a save field: header packet grouping (BL-174) and stand-down by package (BL-203) give the same result with no schema change |
| BL-175 proposal (likely joiners) | BL-188 |
| BL-176 proposal (redeploy) | BL-201 |
| BL-177 proposal (map multi-select, marks, arcs) | BL-181 |
| BL-178 proposal (force planner) | BL-180 (list path, CP1), BL-181 and BL-188 (map and entries, CP2) |
| BL-179 proposal (entry points) | BL-188 |
| BL-180 proposal (reassignment) | BL-200 |
| BL-181 proposal (basing and staging) | BL-188 (read-only). A player choice of staging base is not adopted until the owner asks for it |
| BL-182 proposal (plan kinds) | BL-196 (economic, assistance, covert), BL-191 and BL-192 (locale), BL-199 (posture). The engine `projectLocalePlan` is not adopted: the player-core fold covers it |
| BL-183 proposal (mixed forces) | BL-202 |
| BL-184 proposal (stale CLAUDE.md platform text) | **Not adopted: refuted against CLAUDE.md**, which describes `apps/player` at line 9 and in its table |
| §5 UNCONFIRMED: NPC timed acts and BL-172 tempo | BL-177 balance run |
| §5 UNCONFIRMED: per-leg acknowledgment in the review machine | BL-180, decision 14 |
| §5 UNCONFIRMED: `resolveAction` re-gates at execution | Confirmed by reading `instrument-issued.ts:95-106` on 2026-10-16 (section 6.3) |

### Audit 03: trade and economic levers

| Finding | Disposition |
|---|---|
| §4.1 revenue shown is not revenue booked | BL-178 |
| §4.2 expiry strands the price move | BL-184 |
| §4.3 competence gate missing, treaty binding unread | BL-189 |
| §4.4 effects computed but not shown | BL-185 |
| §2.1 non-rate id collision (`trade.ts:537`) | BL-197 |
| §3.2 table: Economy panel, goods row, desk per good | BL-183, BL-179 |
| §3.2: Diplomacy measures, lift only | BL-203 |
| §3.2: expected retaliation has no control | BL-183 (retaliation by partner shown per line). A pre-emption act is not adopted: no engine act exists and no owner ask |
| §3.2: household prices not shown | BL-185 |
| §3.2: customs in the Books not linked to measures | BL-185 |
| §3.2: market levers one per commit | BL-205 |
| §3.2: trade stance separate from tariffs | BL-194 (the link and the plain statement) |
| §3.2: sanctions on several countries | BL-196 |
| §3.2: orders on several subjects | BL-193 |
| P1 tariff package engine contract | BL-186 |
| P2 trade selectors | BL-183 |
| P3 trade workspace | BL-183 |
| P4 receipts | BL-178 |
| P5 duration and expiry | BL-184 |
| P6 competence and treaty binding | BL-189 |
| P7 households and jobs | BL-185 |
| P8 lift several | BL-203 |
| P9 finer exclusions | BL-190 |
| P10 legal exposure | BL-190 |
| P11 sanctions, controls, freezes, embargoes, aid on several | BL-196 (fold), BL-197 (ids). Engine `issueActionPackage` not adopted (section 3.8) |
| P12 policy program | BL-194 |
| P13 market levers as one package | BL-205 |
| P14 orders over several subjects | BL-193. `subjects[]` not adopted (section 3.8) |
| P15 retire one-category copy | BL-179 and BL-183 |
| §6 budget bulk and presets | BL-205 |
| §6 commodity purchase or refill | Decision 15. Not built until ruled |
| "Which player" note on stale CLAUDE.md | **Not adopted: refuted against CLAUDE.md** |
| §5.4 save version (UNCONFIRMED normalization) | BL-186 |

### Audit 04: connectedness gaps

| Finding | Disposition |
|---|---|
| Gap 1 tariff board | BL-179, BL-183 |
| Gap 2 deployment workspace | BL-180, BL-181 |
| Gap 3 only Nation has a real map | BL-181, BL-187 |
| Gap 4 Brief as action queue, clock hop | BL-209 |
| Gap 5 Nation levers are doors | BL-205 |
| Gap 6 no staged plan across targets | BL-172, BL-182 |
| Gap 7 no "in motion" list | BL-204 |
| Gap 8 lifting leaves the country page | BL-203 |
| Gap 9 Executive board cannot fill | BL-206 |
| Gap 10 Congress Nominations read-only | BL-206 |
| Gap 11 sign or veto, whip, lobby on rows | BL-207 |
| Gap 12 trade partners table has no tariff column | BL-183 |
| Gap 13 levers on a different tab from prices | BL-205 |
| Gap 14 policy chair vacant, no fill | BL-206 |
| Gap 15 policy one domain at a time | BL-194 |
| Gap 16 State page sub-desks duplicate Nation | BL-191 |
| Gap 17 states one at a time | BL-191 |
| Gap 18 emergencies per item, map is a list | BL-192, BL-187 |
| Gap 19 Org page one member at a time | BL-196 |
| Gap 20 commitments edited elsewhere | BL-199 |
| Gap 21 dispatch drops the story | BL-211 |
| Gap 22 Record entries cannot change | BL-203 |
| Gap 23 court case page read-only | BL-203 |
| Gap 24 calendar rows are links | BL-209 |
| Gap 25 nav badges not populated | BL-209 |
| Gap 26 bell rows navigate only | BL-209 |
| Gap 27 taskings one row one act | BL-198 |
| Gap 28 Compare is read-only | BL-196 |
| Gap 29 theme control missing from the shell | Not adopted here: BL-136 already requires System/Light/Dark discoverable in the shell (DESIGN.md:192) |
| Gap 30 sign several ready orders | BL-193 |
| Cross-cutting 1-12 | Section 7 |
| UNCONFIRMED: where Docket "You need to respond" lands | BL-203 checks it with the court case page |
| UNCONFIRMED: scroll and selection restore on Back | Section 7 row 11 |
| UNCONFIRMED: Congress Overview selection | BL-207 checks it |
| "How this was done" note on stale CLAUDE.md | **Not adopted: refuted against CLAUDE.md** |

### Audit 05: interaction patterns

| Finding | Disposition |
|---|---|
| Recommendation: the Plan, fold, one review, `commitAll` | Section 3, BL-171 to BL-174 |
| Load-bearing choice 2: empty header packet (needs validation) | BL-174 test, BL-175 if it fails |
| §1.1 `CheckCard` keyboard (UNCONFIRMED), `Stepper` is a progress indicator, no `NumberStepper` | BL-173 |
| §1.1 `ReviewSheet` and `Receipt` lines keyed by label | BL-171, BL-173 |
| §1.1 `CompareChoices` is options-as-columns | BL-195 |
| §1.1 command palette legacy only | BL-210 |
| §1.1 `EvidencePanel` legacy only | Not adopted here: a port is UP2 catalog scope in the universal player program |
| §1.3 LocaleDesk receipt "isn't ready yet" | BL-191 |
| §1.3 Congress whip, engine act UNCONFIRMED | BL-207, decision 16 |
| §1.4 four review paths | BL-171 |
| §1.6 state shape, preview, packet ids, dice, review rows, partial failure, receipt, Record, delta lens, undo, save | BL-172, BL-197, BL-173, BL-174, BL-182, BL-203 |
| §2.10 command palette and inbox intents | BL-210, BL-209 |
| §3.6-1 bundle marker | BL-175 |
| §3.6-2 per-act dice key | BL-197, decision 8 |
| §3.6-3 whip | BL-207, decision 16 |
| BL-171 proposal | BL-171 |
| BL-172 proposal | BL-172 |
| BL-173 proposal | BL-179 |
| BL-174 proposal | BL-173 (components) and BL-182 (`PlanDock`) |
| BL-175 proposal | BL-174 |
| BL-176 proposal | BL-180 and BL-181 |
| BL-177 proposal | BL-196 |
| BL-178 proposal | BL-203 |
| BL-179 proposal, including DESIGN.md:194 biometric line | BL-195 |
| BL-180 proposal | BL-175 |
| BL-181 proposal | BL-205 |
| BL-182 proposal | BL-198 |
| BL-183 proposal | BL-210 |
| "Not attempted": tariffs draw dice (UNCONFIRMED) | BL-172 test covers two tariff lines on one partner. Retaliation rolls are keyed on the record id (`trade-effects.ts:38-45`, per audit 03), which the fold keeps distinct |
| "Not attempted": remaining budget authority selector | BL-172 (over-budget status) |
| "Not attempted": builders that omit `provenance` | BL-174 |
