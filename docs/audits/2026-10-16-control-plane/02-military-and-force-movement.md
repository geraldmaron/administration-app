# 02. Military and force movement: the engine's model, today's screens, and a force planner

Audit date 2026-10-16. Read-only: no code was edited and nothing was built, tested or run. Every file:line below was read in this session on branch `codex/reconcile-worktrees-2026-10-14`. Anything not confirmed in source is marked **UNCONFIRMED**.

**Owner feedback this answers:** moving troops should be an engaging, interactive interface that sends forces to one or more countries within the game's rules; the pattern should extend to every relevant surface; settings and decisions should be editable inline in one connected experience.

**Platform note.** The player is `apps/player` (Expo + Tamagui, DECISIONS §8.1 as amended 2026-10-16). `apps/web` is frozen. The project `CLAUDE.md` still describes the browser-first `apps/web` player; that text is stale against DECISIONS §8.1 and should be corrected separately.

## Summary

- **Outcome.** The engine already supports staging several force acts in one week. Each act escrows its money and reserves its units at issue (`instrument-issued.ts:47`, `capacity.ts:418-424`), and the store can commit a run of packets as one save (`store.ts:544-555`). The review path already takes an array of packets (`authorize.ts:18,75-77`). What is missing is a **plan-level projection and issue function**, two **gate fixes** so staged legs see each other, a **multi-select map**, and a **planner surface**.
- **The engine's current target limit, in one line:** every force act takes exactly one actor, one target nation, one rung and one unit-type package (`resolution.ts:53-65`), with at most one pending act per actor, target and instrument (`instrument-issued.ts:29`), and no act moves an existing deployment to another place.
- **Top risk.** Two unilateral strikes staged in the same week both pass the War Powers and readiness gates at issue. At execution, the second is refused silently: it reads as "did not execute" and the escrow is returned (`instrument-issued.ts:99-103`). A planner that sums legs without fixing this would show the player a legal plan that the engine will half-refuse.
- **Recommendation.** Build the planner on N ordinary `IssuedInstrumentAct` records committed as one reviewed run. Add `projectForcePlan` and `issueForcePlan` to the engine, make the War Powers and readiness gates count pending legs, and add an optional `planId`. Leave redeploy (moving a standing deployment) as a separate, owner-gated engine item.

---

## 1. The engine's model of force

### 1.1 What a force is

| Concept | Where | What it is |
|---|---|---|
| Aggregate strength | `NationStats.military.branchStrength.{land,air,naval,cyber,space}` read in gates, `instruments-military.ts:166,186,216-217` | 0..1 doctrine weight per arm. Every nation has these figures. |
| Readiness | `stats.military.readiness`, spent by `spendsReadiness` (`instruments-military.ts:52-57`) | 0..1 national figure. Rungs 3, 4 and 5 cost 0.05, 0.08 and 0.15 times the package scale times jitter (`capacity.ts:109-113`). They need 0.30, 0.45 and 0.60 to order (`capacity.ts:124-128`, `instrument-gates.ts:198-205`). Readiness recovers 0.02 a turn (`capacity.ts:106`). It is written on the nation and mirrored to the player's metric (`instruments-military.ts:40-50` comment). |
| Order of battle | `orderOfBattle[branch].units[]` (`capacity.ts:137-139`) | Counted units by type, for example `navy.aircraft-carrier`. Only a few governments author one (`forces.ts:12-15`, "Only three governments carry an authored order of battle"). If none is authored, availability is `undefined` and the gate passes (`instrument-gates.ts:241-245`). |
| Available units | `availableUnitsOfType` (`capacity.ts:180-197`) | Units of a type with readiness ≥ 0.5, times establishment and ready share, **minus committed units and minus units reserved by pending issued acts** (`capacity.ts:418-424`). |
| Domains | `forceDomains` (`forces.ts`) | Ground, air, sea, cyber and space readings, used for the contest and the dossier. They are read-only and are not something the player commits. |
| Placement on the map | `placeForces` (`player-core/src/geo/force-placement.ts:192-224`) | Derived every time and never stored. Active `basing` and `deployment` commitments draw at sourced installation anchors, or at seeded slots in a zone (`zone-slots.ts:60`, 24 slots per zone at `zone-slots.ts:11`). It is clustered by zoom (`force-clusters.ts:51`). |
| Glyphs | `packages/ui/src/icons/custom/unit-glyphs.tsx:8-67` | Silhouettes for fighter, bomber, transport, helicopter, carrier, surface combatant, submarine, armor, ground formation, missile and satellite. |

### 1.2 Force packages: what can be sent

There are four named packages, one per force rung (`force-packages.ts:38-73`):

| Package | Rung | Unit type | Floor / preferred (spec) | Sized against |
|---|---|---|---|---|
| Carrier presence | 2 Forward deploy | `navy.aircraft-carrier` | 1 / 1 | not sized |
| Surface blockade | 3 Blockade | `navy.surface-combatant` | 4 / 8 | target naval strength, floor 4 |
| Limited strike | 4 Limited strike | `air.fighter` | 48 / 200 | target air strength, floor 24 |
| Expeditionary corps | 5 Invasion | `army.brigade-combat-team` | 2 / 8 | target land strength, floor 2 |

- The preferred size is recomputed against the target, from the floor up toward the spec's preferred size along strength^1.5 (`force-packages.ts:97-121`). The minimum becomes `ceil(preferred/2)`, capped at the spec minimum (`:110`).
- The count is clamped to [min, min(available, floor(preferred × 1.5))] (`force-packages.ts:135,146-158`). Effects scale with count ÷ preferred, bounded to [0.2, 1.5] (`:136-144`).
- `issueAction` always overwrites `preferred` with the staff's own figure for this target, so a caller cannot inflate the scale (`instrument-issued.ts:34-40`).
- **One package equals one unit type.** The engine cannot send a mixed force, such as carriers plus destroyers, in one act. Rung 1 (Exercises) takes no package (`instruments-military.ts:131-138`).
- `force-package-brief.ts` defines `CommitmentLevel` (limited, standard, reinforced) and objectives. `forcePackageFor` exposes them as `levels` (`player-core/src/world/nation-forces.ts:212-224`). **UNCONFIRMED** whether any `apps/player` screen draws those levels. The terms form shows a slider (`apps/player/src/world/act/Terms.tsx:104-108`).

### 1.3 The military ladder: gates and what each rung accepts

All five rungs take `ResolutionRequest { actor, target: NationId, instrument, rung, force?, support?, civilianProtection?, strikeObjective? }` (`resolution.ts:53-65`). The target is always **one nation**. A sea, a theater, a base or a conflict cannot be a target.

| Rung | Gate (all must pass) | Resolve |
|---|---|---|
| 1 Exercises (`instruments-military.ts:131-138`) | Readiness ≥ 0.1 | +militaryThreat only |
| 2 Forward deploy (`:139-160`) | A shared border **or** `basesAbroad > 0` (a national stat, not a host-specific right); with a package, 1 uncommitted carrier | Report obligation "equipped for combat" (`war-powers-report.ts:205-210`); threat; a standing **deployment** commitment billed weekly (`:154-157`) |
| 3 Blockade (`:161-178`) | Naval ≥ 0.3; outside nuclear deterrence (`instrument-gates.ts:192-196`); readiness ≥ 0.30; munitions; ≥ 4 surface groups; coastal target; projection multiplier ≤ 2 (`instrument-gates.ts:159,166-172`); War Powers (`:264-293`); no blockade of its own already on that target (`blockades.ts:105`) | Opens or escalates a war; War Powers record; readiness spend; a deployment commitment; a blockade record that stands while the force does (`instruments-military.ts:104-127`) |
| 4 Limited strike (`:179-210`) | Deterrence; readiness ≥ 0.45; War Powers; munitions; **either** air ≥ 0.4 plus ≥ 200 fighters (sized) plus projection ≤ 1.5, **or** standoff missile reach (`instrument-gates.ts:92`) | Readiness; War Powers; strike mission effects; a deployment commitment for 2 weeks unless the strike is by missile (`:208`) |
| 5 Invasion (`:211-251`) | Land ≥ 0.5; air ≥ 0.4; (airlift + sealift)/2 ≥ 0.4; deterrence; readiness ≥ 0.60; War Powers; munitions; ≥ 8 brigade combat teams (sized); projection ≤ 1.3 | Target readiness and stability fall; opens a war; a **sustainment** commitment |

**Reach (DECISIONS §6.12).** `projectionAccess` measures from the nearest staging point: the US basing table's installations plus the capitals of treaty allies (`staging.ts:54-67`, `installations` at `:38-46`). The player **cannot choose** where to stage from, and basing rights are not modeled per operation. The staging table is static `US_BASING`, not the live commitments.

### 1.4 The lifecycle of a force order

1. **Projection.** `projectAction` (`resolution.ts:558`) runs the gate (`:551`) and returns `ActionProjection`: cost, successChance, contest, risks, ripples, deterrence, the conflict consequence (opens or escalates, `conflicts.ts:218-232`), consultation, capacity, coalition, costBasis and timing (`resolution.ts:91-155`).
2. **Issue.** `issueAction` (`instrument-issued.ts:26-66`). If timing is 0 days, it resolves immediately. Otherwise:
   - It refuses a second pending act with the same actor, target and instrument (`:29-30`).
   - It refuses if the escrowed cost exceeds the treasury (`:46-47`).
   - It writes an `IssuedInstrumentAct` (`state-legislature.ts:335-354`) whose id contains the ledger length, actor, target, instrument and rung (`instrument-issued.ts:49`), and it deducts the escrow.
   - The base preparation days for military rungs 1 to 5 are 2, 4, 5, 2 and 14 (`action-timing.ts:27`).
3. **Reservation.** While the act is pending, its package's units are subtracted from availability (`capacity.ts:418-424`). **Readiness is not reserved.** It is spent only at resolution (`instruments-military.ts:52-57`).
4. **Withdraw.** `withdrawInstrumentAct` refunds the escrow (`instrument-issued.ts:68-78`).
5. **Execution.** `resolveDueInstruments` re-runs `resolveAction` on the due date against live state, re-gating the act (`instrument-issued.ts:84-122`, re-check at `:99-103`). If the gate fails, the act is marked `expired` with the words "did not execute: … Reserved funds and forces released."

### 1.5 Commitments: what "a deployment" is after it lands

- The kinds are `aid | arms | deployment | basing | sustainment | program` (`state-commitments.ts:39`). Targets are `nation | conflict | org` (`:42-45`). The source is a budget line or `orderOfBattle {branch, unitType, count}` (`:53-55`).
- The id is `commitment:<kind>:<actor>:<target>:<turn>` with a numeric suffix on collision (`commitments.ts:74-96`). Location is derived for deployments (`commitment-locations.ts:17-29`).
- **Status changes are the only edits:** suspend, resume or wind down (`commitments.ts:299-330`), with a withdrawal grudge and deed on early wind-down. **No act resizes a deployment or moves it to another target.** Redeploying today means ending one commitment, which pays the withdrawal grudge, and ordering a new rung-2 act.
- Inherited basing is a set of zero-cost standing commitments opened at the oath (`basing.ts:79-160`). The player cannot open, close or move a base. The only base-adjacent act is military construction, which is appropriation-driven and tied to emergency construction orders (`military-construction.ts:14-38`), not foreign basing.

### 1.6 War Powers and Congress

- **Second-front rule.** `warPowersStanding` (`congress.ts:298-343`) gives the President one target at a time on his own authority. Rungs 3 to 5 need an AUMF when any of these holds: an expired 60-day obligation (`:308-321`); recent unilateral force against this target (`:326-332`); or recent unilateral force anywhere (`:333-338`, "opening a second front… is not something the office can do"). The window is `WAR_POWERS_WINDOW_TURNS` (`congress.ts:278`). A statute can withdraw unilateral latitude entirely (`instrument-gates.ts:276-283`).
- **Reports.** Every introduction opens `wpr:<target>:<turn>`, due within 2 days (`war-powers-report.ts:218-238`, `REPORT_WINDOW_DAYS = 2` at `:77`). The 60-day termination clock runs only for "hostilities" (rungs 3 to 5) that lack an authorization (`:136-140`, `:79`). A 30-day extension is available (`:80`). Sustained cost compounds after expiry (`:97-107`). The player can file, certify an extension or terminate (`:259,324,386`).
- **AUMF.** `issueForceAuthorization(campaign, target)` covers **one target per request** and is due in 3 days (`force-authorization.ts:41,181-…`). It refuses a duplicate (`:183-189`).
- **Joining a war.** `joinConflict(campaign, joiner, conflictId, side)` (`war-entry.ts:321-356`) goes through the same statute check (`:259-264`). **It takes no force size.** The player's cost is fixed metric deltas (`:303-313`), and DECISIONS §6.11 puts a corps floor on what the President commits.

### 1.7 Blockades, strikes, hull losses

- **Blockade.** A record that stands while its force does; a second blockade of the same coast adds nothing (`blockades.ts:43-120`; DECISIONS §6.9).
- **Strike.** The objective is `military-capacity | logistics | infrastructure`. Civilian protection can add 3 days for an additional assessment (`action-timing.ts:53`).
- **Hull losses.** Each week, in a war against an enemy that can fire on ships, the US loses hulls drawn from active navy `orderOfBattle` commitments toward that enemy or that conflict (`hull-losses.ts:74-81`). Each loss decrements the deployment and winds it down at zero (`:110-118`). The ships at risk are exactly the ships the player sent.

### 1.8 Combatant commands: the theater layer

- **Posture** (`combatant-commands.ts:549-591`). Routine, heightened or surge per command. Costs 0, 0.004 or 0.012 readiness a week (`:593-597`). Relieves 0, 5 or 10% of war pressure in that theater (`:606-616`). Posture is a real lever.
- **Reassign forces** (`:392-446`). Moves a **branch share** between commands and needs a Secretary of Defense. Its only reader is the command board's formation count (`player-core/src/security/command-board.ts:96`, via `assignedFormations` at `combatant-commands.ts:159-169`). **Finding:** reassignment has no effect on gates, availability, placement, odds or war weeks. It is cosmetic in the engine.
- **Amend the Unified Command Plan** (move a country between areas, `:448-…`) and **relieve a commander** (`:328`).

### 1.9 Domestic force

- **Guard federalization.** One state per request; needs an eligible emergency condition; the governor answers (`guard-federalization.ts:72-86`).
- **Locale acts** `relief | request-deployment | federalize | waiver | review | agents | troops | surveil` (`locale-acts.ts:21`). One state per act, through `takeLocaleAct(campaign, state, actId, cause)` (`:286-…`). Each is gated on a declaration, governor assent and a predicate.

### 1.10 Target limits at a glance

| Act | Engine entry | Target accepted | Amount accepted |
|---|---|---|---|
| Military rungs 1-5 | `issueAction` | one `NationId` | one package: one unit type, count within bounds |
| Economic rungs (sanctions, embargo) | `issueAction` | one `NationId` | none (tariff: one sector and one rate, `preview.ts:255`) |
| Covert rungs | `issueAction` | one `NationId` | `regimeAct` at rung 5 |
| Assistance rungs (relief, grant, arms, guarantee) | `issueAction` (`instruments-economic.ts:366-460`) | one `NationId` | none |
| AUMF | `issueForceAuthorization` | one `NationId` | none |
| Join a war | `joinConflict` | one conflict and one side | none |
| Commitment status | `setCommitmentStatus` | one commitment id | status only |
| Command posture / reassign / amend | `setCommandPosture` / `reassignForces` / `amendUnifiedCommandPlan` | one command / command to command / one country | posture / branch share / – |
| Guard / locale act | `requestGuardFederalization` / `takeLocaleAct` | one `StateId` | none |

### 1.11 Defects that matter to any multi-target plan

1. **Pending legs do not count toward the second front.** `warPowersStanding` reads only `congress.unauthorized` and expired obligations (`congress.ts:308-338`). Those are written at **resolution** by `warPowersRecord` (`instrument-records.ts:102-106`), not at issue. So two unilateral rung-4 acts against two countries can both be issued. The later one is refused at execution (`instrument-issued.ts:99-103`), long after the player was shown it as legal. This breaks DECISIONS §3.7 ("The price shown is the price charged") in spirit.
2. **Pending legs do not reserve readiness.** `forceAvailable` reads live readiness (`instrument-gates.ts:198-205`). Three strikes at 0.50 readiness each pass the 0.45 gate at issue. After the first spends roughly 0.08, the others fail at execution.
3. **No redeploy.** The only path is wind-down plus a fresh act (§1.5), which charges a withdrawal grudge for what the player experiences as a move.
4. **Reassignment is cosmetic** (§1.8). A planner must not present it as moving troops.
5. **One report obligation per target per turn.** `wpr:<target>:<turn>` (`war-powers-report.ts:230`) collides if two introductions hit the same target in one turn. The duplicate rule (`instrument-issued.ts:29`) prevents that today. Note it as an invariant a plan must keep.

---

## 2. How the player does it today

### 2.1 The path to send forces

| Step | Route / file | What happens |
|---|---|---|
| 1 | `/world` (`apps/player/src/world/overview/WorldScreen.tsx`) | A list of governments. The map is a `MapPanelSlot` with rows only (`apps/player/src/nation/MapPanelSlot.tsx:29-48`). `MapView` is built but not wired into screens (PROGRAM.md UP7: "not wired into screens"). |
| 2 | `/world/nation/:id` | Country file; "open act" |
| 3 | `/world/nation/:id/act` (`app/(game)/world/nation/[id]/act.tsx:22`, `ActDesk.tsx:117-154`) | **One government per page.** Pick a goal, then an instrument rung, then terms (a count slider, partners, strike objective; `Terms.tsx:104-141`), then a summary, then a comparison with doing nothing, then **one** authorize (`ActDesk.tsx:84-85`), then a receipt. |
| 4 | Back to `/world` and pick another country | Repeat from step 2. Nothing carries over: availability, escrow and War Powers standing are re-read from the committed campaign, and there is no running total. |

Act settings live in the address, one target per URL (`player-core/src/act/config.ts:1-5,21-46`; `actHref` at `catalogue.ts:189`).

### 2.2 The other force surfaces, each separate

| Surface | File | Act | One at a time because |
|---|---|---|---|
| Security desk, Operations | `apps/player/src/security/Operations.tsx:58-71` | "Change it" on one commitment row: pause, resume, end (`commitment-reading.ts:86-111`) | One row per sheet; `SecurityAct` carries one `id` (`security/params.ts:17-25`) |
| Security desk, Forces | `Operations.tsx:77-…` (`ForcesView`) | none (read-only holdings) | Shows free, abroad and not-ready, with no "send" from here |
| Command file | `security/CommandActs.tsx:18-142` | Posture, relieve, reassign (Select + share), amend UCP | One command and one act per sheet (`COMMAND_ACTS`, `params.ts:73`) |
| War file | `world/war/WarScreen.tsx:222-248` | Join (one side), end or leave | One war |
| War Powers | `world/war/WarPowers.tsx:48-96` | Extend, terminate | One obligation |
| AUMF | catalogue option `authorization` (`build.ts:139-143`) | Request a vote | One target, from inside that country's act desk |
| State desk | `nation/state/LocaleDesk.tsx:86-102` | Guard, troops, agents, relief | One state |

### 2.3 Where it forces one-at-a-time or many screens

1. **A two-country posture move takes at least two full loops** through the act desk and two reviews. Nothing shows the combined readiness, money, War Powers exposure or bench.
2. **Legality is per target and blind to staging** (§1.11). The second leg reads as available, because issuing the first changed nothing the gate reads.
3. **There is no map selection.** The only map is a row list, and `MapView` takes a single `selected?: string` (`packages/ui/src/map/types.ts:87`) with pins only of kind `needs | declared` (`:63-68`). It has no force marks and no multi-select. `placeForces` and `clusterForces` exist in player-core but are not used in `apps/player` (grep of `apps/player/src` and `app` returned none).
4. **Asking for an AUMF and ordering force are separate acts on the same page**, with no way to stage "ask Congress, then strike if it passes."
5. **Changing a running deployment** (pause or end) lives on the security desk, while ordering one lives on the country act desk. Adjusting forces is a round trip.
6. **Command posture,** the one real theater lever, sits in the command file, away from the act that needs the posture.

---

## 3. Target experience: the force planner

### 3.1 Shape

There is one surface, **Plan an operation** (`/world/security/plan`), opened from four places: the security desk; a country's act desk ("Add to a plan"); a war file; and a command file. Each entry pre-stages a leg. The planner holds **one draft** of legs. Each leg is one engine act (§1.10). The whole draft is authorized through the existing presidential review as **one package**. Under the hood that is N packets committed by `store.commitAll` in one save (`store.ts:544-555`), which `authorizeAct` already accepts (`authorize.ts:18,75-77`).

Layout:

- **Desktop (≥1024):** three regions. On the left is the **bench**: packages by service with free counts, drawn with unit glyphs. In the center is the **map**: `MapView` world camera with the forces lens, US force clusters, staging points, and selected targets outlined. On the right is the **plan**: legs list, plan totals, verdicts, and Review.
- **Tablet (768-1023):** the map on top and the plan below; the bench is a sheet.
- **Phone (<768):** the plan list is the screen. "Add a country" opens a searchable list, with the map as an optional toggle view (DESIGN.md §8.8 list twin). The bench and each leg's terms open as sheets. A sticky footer shows totals and **Review plan**.

The same selection works both ways. Choosing a country on the map or in the list adds it to `draft.targets` and highlights it in both places. Removing a leg un-highlights it on the map. The map is never the only path (DESIGN.md: "Every mark has a twin in the panel list").

### 3.2 Draft model (player-core, renderer-neutral)

```ts
type PlanLeg = {
  readonly key: string;                 // stable within the draft
  readonly kind: "instrument" | "authorization" | "posture" | "commitment-status";
  readonly target: NationId | CombatantCommandId | string; // nation, command, or commitment id
  readonly request?: ResolutionRequest; // instrument legs: exactly what issueAction takes
  readonly posture?: CommandPosture;
  readonly status?: CommitmentStatus;
};
type ForcePlanDraft = { readonly basisTurn: number; readonly legs: readonly PlanLeg[] };
```

The draft lives in the address, following the existing rule that "an act's settings live in the address" (`config.ts:1-5`). Each leg is encoded compactly (`legs=CHN.m4.120.lg,PRK.m2.1`) and parsed defensively like `parseActConfig`. Cap a draft at 12 legs (a planning value, owner to confirm). Leg order is declared and is the order of issue, because escrow and reservations fold in that order (DECISIONS §1.4).

### 3.3 Data the UI needs: player-core selectors to add

| Selector | Returns | Built from |
|---|---|---|
| `forceBench(campaign)` | Per package spec: unit type, glyph id, establishment, available, reserved by pending, committed abroad | `composeForcePackages` (`force-packages.ts:168`), `availableUnitsOfType`, `reservedInstrumentUnits` (export it) |
| `planTargets(campaign, rung)` | Per nation: open / closed / needs-AUMF / deterred, with the first missing capability, projection multiplier and nearest staging point | `projectAction` gate reasons, `stagingPoints` (`staging.ts:54`), `forceProjectionCost` |
| `forcePlanView(campaign, draft)` | Per leg: the `ActionProjection` against the folded state, its state (§3.5), and a cost line (`force-cost-words.ts`). Totals: escrow, weekly bill, readiness after execution versus each gate, War Powers obligations opened, second-front verdicts, munitions, wars opened or escalated, likely joiners, ripples merged by nation | engine `projectForcePlan` (§3.4) |
| `planMapRows(campaign, draft, lens)` | `MapRow[]` with selected targets, staging points and force placements | lens registry `forces` (`map/registry.ts:37`), `placeForces` |
| `planReview(view)` | `ReviewLine[]`: one block per leg plus totals and law citations | `authorizationSummary`, `actAuthorities` |
| `planSearch` / `parsePlan` | Address codec | the pattern in `config.ts` |

`packages/ui` needs: `MapView` multi-select (`selected?: readonly string[]` or `selectedSet`); force marks (cluster markers with glyph and count, rendered as real buttons per DESIGN.md "Marks"); a staging-to-target **arc** layer; and a `BenchPicker` (glyph, free count, stepper).

### 3.4 Engine contract changes: minimal, deterministic, save-compatible

1. **`projectForcePlan(campaign, requests, streams) → PlanProjection`** (new, pure). It folds `issueAction` over the requests, applying each issue packet to a working copy so that escrow, unit reservations and the gate fixes below are seen by later legs. It returns per-leg `ProjectionResult` plus aggregates. Streams are derived per leg as `${seed}:plan:${index}`, so a projection is reproducible and independent of UI order changes elsewhere. It writes nothing.
2. **`issueForcePlan(campaign, requests, streams, planId) → { ok: true; packets } | { ok: false; failures: {index, reason}[] }`** (new). The same fold, all or nothing. It returns the N issue packets for `authorizeAct` to commit as one `Prepared[]`. It keeps DECISIONS §1.7 (every leg still goes through `issueAction`, then `resolveAction`) and §1.8 (each leg is an act and returns its own packet).
3. **Second-front gate counts pending legs.** In `warPowersStanding` (`congress.ts:323-338`), count the President's pending `IssuedInstrumentAct`s at major rungs (3-5) that would resolve as unilateral, alongside `congress.unauthorized`. This also closes the single-act loophole in §1.11-1. It is derived from existing `issuedActs`, so the save shape does not change.
4. **Readiness gate nets pending draws.** In `forceAvailable` (`instrument-gates.ts:198-205`), subtract the expected `MILITARY_READINESS_COST[rung] × scale` of pending acts by the same actor, at no jitter. This is derived, with no save change. Re-run the balance harness, because the NPC tempo could shift: NPC acts also pass through `issueAction`, though they may resolve immediately (**UNCONFIRMED** how often NPC military acts are timed).
5. **Optional `planId?: string` on `IssuedInstrumentAct`** (`state-legislature.ts:335`). Absent on old saves, and it reads honestly as "no plan" (DECISIONS §9.3). It groups legs in Operations and the Record, and lets "stand down the plan" withdraw them together. Because this is a Campaign-state shape change, `docs/SCHEMA.md` and `docs/ARCHITECTURE.md` must update in the same change (doc-sync contract).
6. **Likely joiners for a war that does not exist yet.** `likelyJoinersOf` needs a `Conflict` (`war-join.ts:428`). Add `projectOpeningJoiners(campaign, actor, target)`, which builds the hypothetical conflict the leg would open (`openOrEscalate` input) and reads the same function. This is pure.
7. **Not in this change: redeploy.** `redeployCommitment(campaign, id, newTarget)` would move a standing deployment without the withdrawal grudge. It needs an owner rule (is a move a withdrawal to the old host?) and new War Powers handling. It is listed separately (BL-176).

Determinism: everything is a fold over a declared leg order with keyed streams. Nothing new is stored except the optional `planId`. NPCs keep their single-target path, which is unchanged except for gates 3 and 4.

### 3.5 Interaction states

| State | Trigger | Shown | Review button |
|---|---|---|---|
| Empty | No legs | "Pick forces, then a country on the map or in the list." The bench and target list are live. | Disabled, with the reason as text |
| Partial | A leg lacks a target or package | That leg's row is marked "Needs a country" or "Needs forces"; the totals exclude it | Disabled: "2 of 3 orders are complete" |
| Illegal | Any leg's `ProjectionResult.ok === false` in the fold | The leg row in danger color, carrying the engine's `missingCapability` verbatim. If a fix exists, it is offered inline: "Lower to 4 destroyers", "Remove the other strike", "Add a request to Congress first" | Disabled |
| Over budget | Folded escrow > treasury (`instrument-issued.ts:46-47`) | A totals bar over its limit, naming the leg that tips it | Disabled |
| Bench short | Folded reservations > available | The bench chip turns red ("8 asked, 5 free"); the leg is clamped or flagged | Disabled until resized |
| Needs authority | Second-front or AUMF-required verdict on a leg | A gold "Needs Congress" chip with the reason and citation (50 U.S.C. §1541-1548); a one-tap "Add AUMF request" leg that converts the strike into **ask first** | Enabled for the AUMF leg; the force leg is held |
| Needs a report | Any rung 2-5 leg | An informational chip, "Report to Congress due within 48 hours", plus a 60-day clock preview for rungs 3-5 without an AUMF | Enabled |
| Deterred | `outsideNuclearDeterrence` refuses | The target is unselectable on the map and in the list, with the reason | n/a |
| Stale | `campaign.turn !== draft.basisTurn` | "The week moved. Re-check the plan." Re-projects in place and shows what changed | Enabled after re-check |
| Ready | All legs open | Totals in good color; **Review plan** | Enabled |

Each leg row offers inline edits: package stepper, strike objective, partners, civilian protection, and remove. Each edit re-runs `forcePlanView`. No edit navigates away. The owner's request for inline settings is met by putting the existing `Terms.tsx` fields inside each leg row.

### 3.6 Live feedback panel

The panel is computed from the folded projection, never re-derived in the UI.

- **Odds per leg:** `successChance` with the contest layers (`resolution.ts:117-124`).
- **Money:** total up-front escrow, weekly standing bill, and cost basis (DECISIONS §6.8).
- **Readiness:** a gauge for now, after all legs execute, and each rung's gate line (DECISIONS memory: "draw readings").
- **War Powers:** obligations opened, reports due (48 h), and the 60-day clock start per hostilities leg. Any expired obligation that blocks the plan, linked to `/world/war/:id`.
- **Wars:** opens or escalates per leg (`ConflictConsequence.headline`), plus likely joiners per opened war (§3.4-6) and allied deterrence.
- **Reactions:** merged ripples by nation, partner responses pending (3 days, `action-support.ts:18-26`), and retaliation risk branches.
- **Hull exposure:** navy legs toward an enemy that can fire on ships are flagged "ships at risk each war week" (`hull-losses.ts:74-81`).

### 3.7 Review as one package

`authorizeAct` is called with `prepare: () => ({ packet: issueForcePlan(...).packets })` and a `ReviewSpec` whose lines are the per-leg terms plus totals and citations. The review never shows outcomes; it shows the terms already displayed (`authorize.ts:42-55`). Tier `full`, `danger` if any leg is rung 3 or higher. Terms that moved between press and confirm are refused with what moved (existing behavior, `authorize.ts:105-109`). The receipt lists each leg's issued act and due date and links to Operations. Stand-down is offered per leg and for the whole plan by `planId`.

### 3.8 Accessibility

- The list is the primary path. The plan legs form a `role="list"` with each leg a group labeled "Order 2 of 3: Limited strike on X, 120 fighters, needs Congress". The bench steppers are labeled sliders with value text (the existing `Slider valueText`, `Terms.tsx:108`).
- Map selection mirrors list selection. Map marks are real buttons with roving tabindex and an "N more" list (DESIGN.md "Marks"). Forced-colors mode shows the list (DESIGN.md line 89).
- Verdict changes announce through one `aria-live="polite"` totals region, debounced so a stepper drag does not flood a screen reader.
- Color is never the only cue. Every state carries a word and an icon (no washed-out color; solid inks).
- Focus returns to the edited leg after a sheet closes. Review opens with focus on its title.

### 3.9 Phone and desktop parity

Both sizes have the same capabilities (DECISIONS §8.5). Phone is list-first with sheets, desktop is three-pane, and both read the same `forcePlanView`. Verify at 390×844 and 1440×900, then 320px reflow, 1280×800 and 1920×1080 (project rule).

### 3.10 Extending the pattern to other "assign to several places" acts

| Act family | Leg kind | Engine entry today | Plan-level need |
|---|---|---|---|
| Sanctions, embargo, tariffs | instrument (economic) | `issueAction` | Fold is enough; ripples merged by trade partner |
| Foreign aid, arms transfers, security guarantees | instrument (assistance) | `issueAction` | Fold plus treasury total; recipients on the map |
| Covert operations | instrument (covert) | `issueAction` | Fold plus exposure chance per leg; intelligence visibility; finding requirement |
| Guard, troops, agents, relief to states | locale | `takeLocaleAct` / `requestGuardFederalization`, one state each | New `projectLocalePlan` fold over states (US map camera); governor assent per leg; declaration coverage |
| Disaster relief to several states | locale `relief` | same | same |
| Command posture across theaters | posture | `setCommandPosture` | Folded weekly readiness bill |

The same planner shell (bench or resource, map and list targets, legs, totals, one review) is parameterized by a **plan kind** that supplies the bench selector, the target filter, the leg terms form and the fold. Military is the first kind. The others reuse the shell.

### 3.11 Challenge before committing

- **Strongest failure mode:** a multi-leg review becomes a rubber stamp for several wars at once, and the game "plays itself" through batching (DECISIONS §3.6 says the force decision stays the President's). There is also the risk of shipping the planner before the gate fixes, which lets it present legal plans that half-execute.
- **Best alternative:** keep one act per review and add a "staging tray" that only pre-fills the next act desk. It is cheaper, but it fails the owner's ask for one connected decision and keeps the blind second-front problem.
- **Conclusion: accepted with controls.** The gate fixes (BL-171, BL-172) land before the planner. The review shows every leg as its own titled block with its own law and a `danger` tone. A plan with more than one hostilities leg requires the player to scroll through each leg before the confirm button enables (**UNCONFIRMED** that the review machine supports this; see BL-178). The draft cap is an owner-set planning value.

---

## 4. Backlog-ready items

Ids continue from the highest in `docs/BACKLOG.md` (BL-170). Sizes: S is up to a day, M a few days, L a week or more.

**BL-171: War Powers gate ignores pending force orders**
- Problem: a second unilateral front can be issued, then is refused at execution with escrow returned. The player was shown it as legal.
- Acceptance: with one pending unilateral rung-4 act against A, `projectAction` for rung 3, 4 or 5 against B returns `ok: false` with the second-front reason. Existing single-act tests are unchanged. A new engine test covers issue A, then issue B refused.
- Evidence: `congress.ts:298-343`; `instrument-records.ts:102-106`; `instrument-issued.ts:99-103`.
- Split: engine. Deps: none. Size: S. Doc sync: `docs/ARCHITECTURE.md` War Powers section; CONTENT_DOCTRINE is not affected.

**BL-172: Readiness gate ignores pending force orders**
- Problem: several timed force acts pass the readiness gate at issue and fail at execution.
- Acceptance: `forceAvailable` subtracts the expected spend of the actor's pending rung 3-5 acts. A test issues three strikes at 0.50 readiness and the third is refused at issue. The balance harness is run by hand (`pnpm --filter @admin/engine run test:balance`) and the result is recorded.
- Evidence: `instrument-gates.ts:198-205`; `instruments-military.ts:52-57`; `capacity.ts:109-128`.
- Split: engine. Deps: none. Size: S to M (balance run).

**BL-173: Engine plan fold: `projectForcePlan` and `issueForcePlan`**
- Problem: there is no way to price or issue several acts as one decision with legs that see each other.
- Acceptance: both functions are pure and deterministic (same seed and legs give identical output). Legs fold escrow and reservations. Issue is all or nothing with per-index failures. Each leg's packet is identical to a lone `issueAction` on the folded state. Packets commit through `store.commitAll` as one save. Tests cover two-leg reservation, over-budget refusal and leg-order dependence.
- Evidence: `instrument-issued.ts:26-66`; `capacity.ts:418-424`; `store.ts:544-555`.
- Split: engine. Deps: BL-171, BL-172. Size: M.

**BL-174: `planId` on issued instrument acts, plus stand-down by plan**
- Problem: a staged plan has no identity in Operations or the Record, and cannot be recalled together.
- Acceptance: optional `planId`; old saves load with it absent; `withdrawPlan(campaign, planId)` returns one packet refunding every pending leg; `docs/SCHEMA.md` and `docs/ARCHITECTURE.md` are updated in the same change.
- Evidence: `state-legislature.ts:335-354`; `instrument-issued.ts:68-78`.
- Split: engine and player-core. Deps: BL-173. Size: S.

**BL-175: Likely joiners for a war a leg would open**
- Problem: a plan cannot say who would join a war it starts.
- Acceptance: `projectOpeningJoiners(campaign, actor, target)` returns the same `LikelyJoiner[]` that `likelyJoinersOf` returns for the conflict the leg would open. Deterministic test.
- Evidence: `war-join.ts:428-452`; `conflicts.ts:218`.
- Split: engine. Deps: none. Size: S.

**BL-176: Redeploy a standing deployment (owner decision first)**
- Problem: moving forces means ending a commitment, which charges a withdrawal grudge, and then ordering a new act. There is no "move."
- Acceptance: an owner rule is recorded in DECISIONS (does a move count as withdrawal from the old host? does it open a new War Powers obligation?), then `redeployCommitment` is implemented with tests and doc sync.
- Evidence: `commitments.ts:299-330`; `instruments-military.ts:139-160`.
- Split: engine, gated on an owner decision. Deps: BL-173. Size: M.

**BL-177: Map multi-select, force marks and arcs in `packages/ui` MapView**
- Problem: `MapView` selects one region and draws no force marks, so a plan cannot be built on the map.
- Acceptance: `selected` accepts a set; force cluster marks are real buttons with glyph and count, and each has a list twin; a staging-to-target arc layer exists; keyboard roving and an "N more" list work; the web and native drawings behave the same; it is verified at 390 and 1440.
- Evidence: `packages/ui/src/map/types.ts:63-68,87`; `player-core/src/geo/force-placement.ts:192`; `force-clusters.ts:51`; DESIGN.md "Marks" and "Deployed forces".
- Split: UI. Deps: UP7 MapView wiring. Size: M.

**BL-178: Force planner surface `/world/security/plan`**
- Problem: force orders are one country per page, with no combined totals, no staging and no inline edits (§2.3).
- Acceptance:
  - A President can stage strikes on two countries plus a carrier presence on a third and see combined escrow, readiness after execution and War Powers verdicts before review.
  - An illegal leg shows the engine's reason inline.
  - One review authorizes every leg; the receipt lists each issued act.
  - The draft survives reload through the address.
  - It works at 390×844 and 1440×900 with list-only keyboard and screen-reader completion.
  - The review requires per-leg acknowledgment when there is more than one hostilities leg.
- Evidence: `ActDesk.tsx:117-154`; `Terms.tsx:104-141`; `authorize.ts:18,75-77`.
- Split: player-core (selectors in §3.3) and UI. Deps: BL-173, BL-177 (the list-only path can ship first). Size: L.

**BL-179: Entry points into the planner from the country, war and command files**
- Problem: the act desk, war file and command file each dead-end in a single act.
- Acceptance: "Add to a plan" on the act desk carries the chosen rung and package into a leg. The war file stages "AUMF, then strike." The command file stages a posture leg. Back returns to the origin.
- Evidence: `ActDesk.tsx:84-85`; `WarScreen.tsx:222-248`; `CommandActs.tsx:18-35`.
- Split: UI and player-core. Deps: BL-178. Size: M.

**BL-180: Combatant command reassignment does nothing in the simulation**
- Problem: "Move forces out of a command" changes only a displayed count, but the screen reads as moving troops.
- Acceptance: either the reassigned share feeds availability or reach for that theater (engine, with balance), or the act is relabeled and its help says it is administrative. The owner chooses.
- Evidence: `combatant-commands.ts:159-176,392-446`; `security-effects.ts:118-122`; `command-board.ts:96`; `CommandActs.tsx:64-93`.
- Split: engine or UI copy. Deps: owner decision. Size: S (copy) or M (engine).

**BL-181: Basing and staging are fixed tables the player cannot see or choose**
- Problem: reach is computed from the static `US_BASING` and allies. The plan cannot show or pick a staging base, and the forward-deploy gate reads a national `basesAbroad` stat rather than a host.
- Acceptance: the planner shows the staging point used per leg (read-only first). Any player choice of staging base is a separate owner-approved engine change.
- Evidence: `staging.ts:38-67`; `instruments-military.ts:143-148`.
- Split: player-core and UI (read-only); engine later. Deps: BL-178. Size: S.

**BL-182: Plan kinds for sanctions, aid, covert, locale and posture**
- Problem: every "assign to several places" act is one target per screen.
- Acceptance: the planner shell is parameterized by plan kind. Economic, assistance and covert reuse BL-173's fold. Locale acts get a `projectLocalePlan` fold over states with governor assent per leg. Each kind ships with a test and a browser capture at both sizes.
- Evidence: §1.10 table; `locale-acts.ts:286`; `guard-federalization.ts:72`.
- Split: engine (locale fold), player-core and UI. Deps: BL-178. Size: L.

**BL-183: Mixed-force packages (UNCONFIRMED need)**
- Problem: one act sends one unit type. A carrier group with escorts, or a strike with tankers, is not expressible.
- Acceptance: the owner decides whether mixed packages are in scope. If yes, the `ForcePackage` schema is extended additively, pricing and scaling are defined per component, and SCHEMA/ARCHITECTURE are updated.
- Evidence: `force-packages.ts:15-26,38-73`.
- Split: engine. Deps: owner decision. Size: L.

**BL-184: Stale `CLAUDE.md` platform text**
- Problem: the project guide describes `apps/web` as the player, which contradicts DECISIONS §8.1 (2026-10-16).
- Acceptance: the `CLAUDE.md` project, table and React sections match §8.1 and §8.2.
- Evidence: `CLAUDE.md` "Project" and its table; `docs/DECISIONS.md` §8.1.
- Split: docs. Deps: none. Size: S.

### Five most important

1. BL-171, the War Powers gate counting pending orders.
2. BL-172, the readiness gate counting pending orders.
3. BL-173, the plan fold `projectForcePlan` and `issueForcePlan`.
4. BL-178, the force planner surface.
5. BL-177, map multi-select with force marks.

## 5. Unconfirmed items

- Whether any `apps/player` screen draws `forcePackageFor(...).levels` (limited, standard, reinforced).
- How often NPC military acts are timed rather than immediate, which decides how much the BL-172 change shifts NPC tempo.
- Whether the review machine (`apps/player/src/review/review-machine.ts`) can require per-leg acknowledgment before confirmation.
- Whether `resolveAction` re-runs the full rung gate at execution. Read as yes from `resolution.ts:551` and the "did not execute" path at `instrument-issued.ts:101-103`, but not traced line by line.
