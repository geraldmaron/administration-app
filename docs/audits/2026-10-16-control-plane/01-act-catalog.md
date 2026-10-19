# Act catalog and single-target gap audit (2026-10-16)

Read-only audit. No code was edited, built, tested or run. Every claim is from reading source on branch `codex/reconcile-worktrees-2026-10-14`. Interaction counts are counted from component structure, not measured in a browser, and are marked `≈`. Anything not traced to a line is marked UNCONFIRMED.

## Owner feedback this answers

Players should be able to select one or more targets inside one interface (several goods for tariffs, several countries for troop moves), the same pattern should reach every relevant surface, and settings and decisions should be updatable inline in a fully connected experience.

## Result in one paragraph

166 player acts are catalogued (variants counted the way `docs/audits/2026-10-10-map-first/capability-ledger.md` counts them). 14 are single-target gaps where a player plausibly wants several (G08 has two parts). Most of the engine is already N-callable: nearly every act is a pure function `(campaign, ...ids) -> {ok, packet}` and the store already commits a run of packets in one save (`commitAll`). The blocker is mostly the player surface, which models "one act, one target, one review". Three real engine limits exist (tariff edit, per-element tasking, country-level troop redeployment) plus three game-rule caps that need an owner decision before any multi-select UI (outreach slots, one press engagement per week, bilateral-only treaties).

## How acts are made, and why it matters for batching

1. Every act is an engine function that takes a `Campaign` and returns an `EffectPacket` (or refuses with a reason). `apply()` in `packages/engine/src/effects.ts:723` is the only mutator. No act reads UI state.
2. The player commit path already accepts a run: `Prepared = EffectPacket | readonly EffectPacket[]` (`apps/player/src/review/authorize.ts:20`), applied by `store.commitAll(packets, onProgress, {basis})` (`packages/player-core/src/campaign/store.ts:148`, implementation `:544`). `commitAll` applies packets in order, each to the state its predecessor produced, and saves once. Its own doc comment says this exists because "sending forty-four names to the Senate wrote a multi-megabyte save forty-four times".
3. Builders must be chained for honest batches. `commitAll` applies in order, but each packet is built from one `Campaign`. Builders that read standing state will mis-price or collide if all N are built on the same basis. Evidence: `tariffOrderIds` derives its ordinal from `campaign.trade.measures` (`trade.ts:363`); `imposeTariff` checks `standing + rate > MAX_RATE` against the basis (`trade.ts:345`, `:373`); `issueAction` ids embed `campaign.ledger.length` and reserve treasury against `campaign.player.metrics.treasury` (`instrument-issued.ts:26-47`); force packages draw on uncommitted units (`instruments-military.ts:149`). A batch helper must `apply()` each packet and build the next against the result. UNCONFIRMED by execution: no batch of this kind exists today to run.
4. One working precedent already does multi-target correctly: `AppointmentDesk` (`apps/player/src/oversight/Appointments.tsx:72-111`) lets the player pick a nominee per seat, shows a "Not sent" row for refused lines (`:81`), and commits all through one review with `packet={() => deskPlan(campaign, picks).packets}`. The budget draft (`apps/player/src/nation/budget/Allocation.tsx`, `BudgetDraftInput = Partial<Record<BudgetAccount, number>>` at `budget-draft.ts:26`) is the second precedent: every account is a slider in one draft.
5. Constraint from `docs/DECISIONS.md` §8.9 (`:486-490`): consequential acts need a distinct review and explicit named confirmation, and this "supersedes earlier ... inline-single-click interpretations". So "update inline" must mean inline staging with one batched review, not one-click commits. The batched review in item 4 is the compliant shape.
6. Shared UI has no multi-select table. `SortTable` has only a `highlight` row hook (`packages/ui/src/world/SortTable.tsx:111`), `ChoiceList` is single-select (`packages/ui/src/forms/ChoiceList.tsx:90`), `CheckCard` is the only multi-select primitive (`:128`), and `Toggle` is one boolean (`forms/Toggle.tsx:46`). Every gap below needs one new primitive: a table row with a selection control and an inline editor (rate, count, share).

## Reading the tables

- **Card.** Target cardinality the engine function accepts today. `1 nation` means a single `NationId` argument; `1 state` a single `StateId`; `set` a list; `rate/cat` one numeric per category.
- **Batch.** Whether N separate applications in one turn work with no engine change. `Y` = yes; `Y*` = yes only if builders are chained (item 3 above); `Rule` = a game rule caps it (named); `New` = needs an engine contract change.
- **Surface.** Where the player does it, under `apps/player/src` (or `app/` for routes). `≈n` = interactions from entry to confirmed receipt.
- **Gap.** `GAP Gnn` links to the ranked list; `ok` = no real wish for several; `precedent` = already multi-target.

Surfaces share two shells. ActDesk (`world/act/ActDesk.tsx`) is: country page, goal, act, terms, compare, verb, review sheet (`≈7`). The Set shell (`world/acts.tsx` `SetAct`, `:99-122`) is: pick option, verb, review (`≈3`). The ActFrame shell (`security/ActFrame.tsx`) is: open card, pick act, set fields, compare, verb, review (`≈6`). The Chooser shell (`congress/ActChooser.tsx`) is `≈4`.

## Catalog

### A. Foreign instruments and bilateral diplomacy (37)

Common contract: `ResolutionRequest` has `actor: NationId`, `target: NationId`, `instrument`, `rung`, optional `force?: ForcePackage` (one branch, one unit type, one count), `support`, `civilianProtection`, `strikeObjective`, `regimeAct` (`resolution.ts:53-65`, `force-packages.ts:16-26`). One request is one target. Duplicate guard: one outstanding act per (actor, target, instrument) (`instrument-issued.ts:29-30`), so many targets are legal and many rungs on one target are not. Route is per nation: `app/(game)/world/nation/[id]/act.tsx`.

| # | Act (n) | Defined | Card | Parameters and bounds | Batch | Surface | Gap |
|---|---|---|---|---|---|---|---|
| A1 | Diplomatic 1-5: Private Warning, Public Statement, Recall Ambassador, Coalition Pressure, Sever Relations (5) | `instruments.ts:60-120` | 1 nation | none; gated on `diplomaticReach` 0.05/0.2/0.35/0.5/0.65, `legitimacy` >= 0.4 on rung 4 | Y* (rungs 1-2 resolve at once, `action-timing.ts:27`) | ActDesk, `≈7` | GAP G03 |
| A2 | Economic 1,3,4,5: Trade Advisory, Targeted Sanctions, Asset Freeze, Full Embargo (4) | `instruments-economic.ts:117-200` | 1 nation | none; gates: reserves 150/2000/5000, GDP >= 20,000 for freeze, one live embargo per pair (`notAlreadyStanding`) | Y* | ActDesk, `≈7` | GAP G03 |
| A3 | Tariff (rung economic-2, collapsed in the catalogue) (1) | `trade.ts:373`; `act/catalogue.ts:134`; `act/build.ts:126` | 1 nation + 1 sector + 1 rate | sector: one `TradeSectorId` with `instrument === "tariff"`; rate: fraction > 0, total with standing <= `MAX_RATE = 1` (`trade.ts:345`); UI integer percent 1..room (`act/preview.ts:255-265`, `world/act/Terms.tsx:97`) | Y* for distinct (target, sector); same pair needs chaining | `Terms.tsx:41-42` single `Select`, slider `:97`; ≈7 from country, ≈6 via Economy tab button (`world/nation/Economy.tsx:84`) | **GAP G01** |
| A4 | Covert 1-5: Surveillance, Influence, Sabotage, Proxy Support, Covert Regime Action (5) | `instruments.ts:164-250` | 1 nation | rung 5 `regimeAct` in {political-action, coup-support, capture, kill} (`act/config.ts:18`); rung 4/5 spend intel capability (`COVERT_CAPABILITY_COST`); reach gate for 3-5 | Y* (intel capability spent per act) | ActDesk, `≈7` | GAP G03 |
| A5 | Military 1-5: Exercises, Forward Deploy, Blockade, Limited Strike, Expeditionary Invasion (5) | `instruments-military.ts:131-250` | 1 nation + 1 package | package: rung 2 carrier 1..1 (min 1, preferred 1, ceiling floor(1.5x)=1), rung 3 surface combatants min 4 pref 8, rung 4 fighters min 48 pref 200, rung 5 brigade combat teams min 2 pref 8; ceiling `floor(preferred x 1.5)` (`force-packages.ts:38-84`, `:135`, `:140`); `strikeObjective` x3, `civilianProtection` x2 (`world/act/Terms.tsx:138-151`) | Y* (uncommitted units and readiness consumed per act) | ActDesk slider `Terms.tsx:107` single count, `≈7` | **GAP G02** |
| A6 | Assistance 1-5: Relief Shipment, Development Grant, Stabilization Package, Arms Transfer, Security Guarantee (5) | `instruments-economic.ts:362-460` | 1 nation | NO amount parameter: aid is a per-rung constant (60/240/700 in `aidFlow` calls at `:370,:387,:403`); gated on borrowing capacity, reserves 150/1000/4000 | Y* | ActDesk, `≈7` | GAP G03, plus New for an amount |
| A7 | Engagement: call, envoy, visit, summit, declaration (5) | `engagement.ts:340`; `ENGAGEMENT_KINDS` `:35` | 1 nation | none; target decides (`receiveDecision`), refused ones still booked | Y | ActDesk (meet family), `≈7` | GAP G03 |
| A8 | Sign treaty: alliance, trade, arms-control, executive-agreement (4) | `treaties.ts:268`; `TREATY_TERMS` `:73` | 1 counterpart | none; `minTrust` per kind; bilateral only: `counterpart: NationId` | Y (bilateral) | ActDesk (sign family), `≈7` | GAP G14 |
| A9 | Request authorization to use force (1) | `force-authorization.ts:181` | 1 nation | none; refuses if already authorized or pending | Y | ActDesk, `≈7`; also `WarPowers.tsx:34` | ok |
| A10 | Stand down a pending operation (1) | `instrument-issued.ts:68` | 1 act id | refunds `reservedTreasury` | Y | `world/act/Manage.tsx`, `≈4` | GAP G03 |
| A11 | Lift a trade measure (tariff, sanction, freeze, embargo, export control) (1) | `trade.ts:609` | 1 measure id | none; lifting thaws the relationship by measure weight | Y | `Manage.tsx` via `Diplomacy.tsx:48`, `≈4` per measure | GAP G01 |

### B. Treaties, wars and compacts (12)

| # | Act (n) | Defined | Card | Parameters and bounds | Batch | Surface | Gap |
|---|---|---|---|---|---|---|---|
| B1 | Send treaty to the Senate (1) | `treaties.ts:481` | 1 treaty id | none | Y | Set shell, `world/sets/TreatyScreen.tsx:105`, `≈3` | ok |
| B2 | Withdraw from treaty (1) | `treaties.ts:680` | 1 treaty id | none | Y | `TreatyScreen.tsx:106`, `≈3` | ok |
| B3 | Join a war: aggressor / defender (2) | `war-entry.ts:321` | 1 conflict + side | statute and munitions gates | Y | `world/war/WarScreen.tsx:225`, `≈3` | ok |
| B4 | Leave a war (1) | `peace.ts:391` | 1 conflict | refusal if alongside nobody | Y | `WarScreen.tsx:231` | ok |
| B5 | Offer terms (1) | `peace.ts:243` | 1 conflict | refused if already offered | Y | `WarScreen.tsx:231` | ok |
| B6 | Settle war (1) | `peace.ts:272` | 1 conflict | none | Y | `WarScreen.tsx:231` | ok |
| B7 | Cool the front (1) | `peace.ts:321` | 1 conflict | none | Y | `WarScreen.tsx:231` | ok |
| B8 | Call on a compact (1) | `compacts.ts:450` | 1 org + 1 conflict | refused if already called | Y | `WarScreen.tsx:236` | ok |
| B9 | File War Powers report (1) | `war-powers-report.ts:259` | 1 obligation | authority claimed, scope, estimatedWeeks (choices 4 sets, `WarPowers.tsx:87-89`) | Y | `WarPowers.tsx:82` | ok |
| B10 | Certify extension (1) | `war-powers-report.ts:324` | 1 obligation | necessity: 4 fixed sentences (`congress-acts.ts` `extensionGrounds`) | Y | `WarPowers.tsx:58` | ok |
| B11 | Terminate force (bring troops home) (1) | `war-powers-report.ts:386` | 1 obligation | none | Y | `WarPowers.tsx:96`, `≈3` | GAP G02 (companion) |


### C. Security, commands and intelligence (24)

| # | Act (n) | Defined | Card | Parameters and bounds | Batch | Surface | Gap |
|---|---|---|---|---|---|---|---|
| C1 | Set command posture: routine, heightened, surge (3) | `combatant-commands.ts:549` | 1 command (of 11) | refused if equal; routine held at heightened during engagement; costs readiness weekly (`POSTURE_READINESS_COST` `:593`) | Y | ActFrame `security/CommandActs.tsx:19-33`, `≈6` | **GAP G08** |
| C2 | Relieve commander (1) | `combatant-commands.ts:328` | 1 command + reason | reason from `RELIEF_REASONS` | Y | `CommandActs.tsx:36-51` | ok |
| C3 | Reassign forces between commands (1) | `combatant-commands.ts:392` | 1 from + 1 to + 1 branch + 1 share | share > 0, moved = `min(share, source.assignment[branch])`; UI offers only 5%, 10%, 25% (`REASSIGN_SHARES`, `player-core/security/command-acts.ts:127`); refused with no Secretary of Defense | Y* (source share shrinks per move) | ActFrame `CommandActs.tsx:85-87`: `Select` destination, `Select` service, one share; `≈6` | **GAP G02** |
| C4 | Amend Unified Command Plan (1) | `combatant-commands.ts:448` | 1 nation + 1 destination command | rationale required, geographic commands only | Y | `CommandActs.tsx` AmendPanel | GAP G02 (companion) |
| C5 | Set commitment status: active, suspended, wound-down (3) | `commitments.ts:299` | 1 commitment id | cannot reopen wound-down | Y | `security/CollectionActs.tsx` (`commitmentChoices/Order`) | **GAP G12** |
| C6 | Task collection (foreign nation, domestic state, domestic politics reachable; two person kinds gated off) (3) | `intelligence.ts:464`; `TaskingRequest` `:400` | 1 element + 1 target string | one tasking per element per day (`intelligence.ts:483-487`); discipline and focus choices (`CollectionActs.tsx:65-82`) | Y across different elements; same element: Rule/New | `CollectionActs.tsx:28-90` single `Select` for government or state | **GAP G08b** |
| C7 | Close a tasking (1) | `intelligence.ts:622` | 1 id | none | Y | `CollectionActs.tsx:95` | ok |
| C8 | Commission assessment: intent, capability, stability (3) | `assessments.ts:579` | 1 question + 1 nation | duplicate within a week refused | Y | `IntelActs.tsx` (`commissionOrder`) | ok |
| C9 | Press an assessment: harden, soften (2) | `assessments.ts:638` | 1 assessment | ask text required | Y | `IntelActs.tsx` | ok |
| C10 | Sign covert finding: full-committees, gang-of-eight, withheld (3) | `findings.ts:141` | 1 objective + 1 nation | notification tier; withheld needs reasons | Y | `IntelActs.tsx` (`signOrder` `covert-reading.ts:143`) | ok |
| C11 | Close finding (1) | `findings.ts:283` | 1 id | none | Y | `IntelActs.tsx` | ok |
| C12 | Share collection report (1) | `intelligence.ts:587` | engine: SET of recipients plus SET of finding indexes; UI: 1 recipient | recipients must be distinct, trusted (trust >= 0.4 or a treaty), not the target (`:575-580`); partial findings allowed | **Y, engine already takes an array** | `CollectionActs.tsx:113-147` single `Select`, finding `CheckCard`s; copy at `:141` says "one decision at a time" | **GAP G07** |
| C13 | Refer to Attorney General (1) | `intel-authority.ts:168` | 1 subject | domestic only, once per subject | Y | `CollectionActs.tsx` (`referOrder` `collection-reading.ts:261`) | ok |

Section C total = 3+1+1+1+3+3+1+3+2+3+1+1+1 = 24 (C1 to C13).

### D. Executive and domestic (43)

| # | Act (n) | Defined | Card | Parameters and bounds | Batch | Surface | Gap |
|---|---|---|---|---|---|---|---|
| D1 | Sign executive order x13: border-controls, price-controls, asset-seizure, relief-program (`orders.ts:203-310`); amend-targeting-prohibition, entry-suspension, force-protection, regulatory-review, grant-conditions, energy-leasing, clean-energy, defense-production, emergency-construction (`order-families.ts:36-230`) (13) | `orders.ts:578` | 1 order + optional 1 subject | subject kinds `OrderSubject` (`order-subjects.ts:41-51`): ports-of-entry, foreign nation, entry-class nation, rule-review, lease area, federal site, state+cause, grant bill, construction. Record id embeds the subject (`orders.ts:534-540`), so the same order for different subjects in one turn is already distinct; same subject twice is refused (`:392-394`) | **Y\*, subjects already distinct per turn** | `nation/policy/OrderScreen.tsx:97` + single `Select` `order-subjects.tsx:63-66`; `≈6` | **GAP G04** |
| D2 | Rescind order (1) | `order-lifecycle.ts:34` | 1 record id | none | Y | `policy/order/[id]` | ok |
| D3 | Declare emergency: nation / state scope (2) | `emergency.ts:152` | 1 scope + 1 condition cause | scope nation or one state; id embeds scope, cause, turn (`emergency.ts:39`) | Y | `nation/emergency/EmergencyScreen.tsx`, `emergency-acts.ts:36-60`, `≈6` | **GAP G05** |
| D4 | Renew emergency (1) | `emergency.ts:226` | 1 id | none | Y | `emergency-acts.ts:62-85` | ok |
| D5 | End emergency (1) | `emergency.ts:204` | 1 id | none | Y | same | ok |
| D6 | Declare armed-forces emergency (1) | `emergency.ts:187` | 1 conflict | none | Y | order flow | ok |
| D7 | Declare external-threat emergency (1) | `external-emergency.ts:41` | 1 pursuit | finding choice | Y | order flow | ok |
| D8 | Stafford disaster declaration (1) | `stafford.ts:18` | 1 state | none | Y | order flow | GAP G05 |
| D9 | Request Guard federalization (1) | `guard-federalization.ts:72` | 1 state | RNG draw | Y | `emergency-acts.ts` `guard` kind | GAP G05 |
| D10 | Locale acts at a state: relief, request-deployment, waiver, review (4; federalize, agents, troops and surveil are declared but refused outright, `locale-acts.ts:205-212`, `:228`) | `locale-acts.ts:286`, `:361` | 1 state + 1 condition cause | cost `localeActCost` = `treasuryOfGdp` x GDP; `relief` needs a state request unless paying unrequested standing | Y* | `nation/home/StateActs.tsx`, `nation/state/LocaleDesk.tsx`; state selection is single: `StatesTable.tsx:132` `selected?: string`, `home/search.ts` `state` | **GAP G05** |
| D11 | Enact policy stance, one act per domain: fiscal, industry, trade, civil, security, defense (6) | `policy-draft.ts:513` wraps `projectPolicyDraft`+`enactPolicyDraft` (`:123`, `:421`) | engine: SET (domain->stance map, `PolicySet` `policy.ts:222`); UI: 1 domain | 4 stances per domain (24 total, `policy-catalog.ts`); revenue-statute gate per line (`policy-draft.ts:422-430`); enactment lump needs authority | **Y, engine already multi-domain; `enactPolicyDraft` has no caller in apps/player or player-core** | `nation/policy/PolicyScreen.tsx:85` `enactPolicy(campaign, selected)`, `≈5` per domain | **GAP G06** |
| D12 | Request appropriation (budget) (1) | `appropriation.ts:185` | engine and UI: SET, `rate/cat` over 5 accounts | each account share 0..`accountCap` (`budget-draft.ts:44-46`), `DRAFT_STEP` 0.0005 | precedent | `nation/budget/Allocation.tsx`, `Request.tsx:68` | precedent |
| D13 | Request budget resolution (reconciliation) (1) | `reconciliation.ts:44` | 1 bill | none | Y | bill screen | ok |
| D14 | Market levers: Fed ease, Fed tighten, release Strategic Reserve, fuel waiver (4) | `monetary-acts.ts:59`; `commodity-levers.ts:70`, `:116` | none | fixed size; reserve drawdown fixed `RELEASE_DRAW` | n/a | `nation/economy/Levers.tsx` via `economy/market-levers.ts:73` | ok |
| D15 | Offshore lease sale: initiate, accept-bid, decline-bid (3); buy federal clean power (1) (4) | `offshore-leasing.ts:113`; `clean-power-purchasing.ts:54` | 1 area / none | one clean-power purchase on record | Y | order follow-ups `policy/OrderFollowups.tsx` | ok |
| D16 | Seal founding (1) | founding flow | n/a | profile, ticket, mandate | n/a | `app/founding` | ok |

Section D total: 13+1+2+1+1+1+1+1+1+4+6+1+1+4+4+1 = 43.

### E. Cabinet, appointments, oversight (17)

| # | Act (n) | Defined | Card | Parameters and bounds | Batch | Surface | Gap |
|---|---|---|---|---|---|---|---|
| E1 | Open nomination / fill vacant offices (2) | `nomination.ts:307`, `:231` | engine: 1 office + 1 nominee, desk composes SET | candidate pool `appointmentPool` ranked by fit; Supreme Court seat has no default | precedent | `oversight/Appointments.tsx` desk (multi-seat, one review); `executive/ChairActs.tsx:96-112` single-chair view | precedent |
| E2 | Withdraw nomination (1) | `nomination.ts:352` | 1 nomination | none | Y | office page | ok |
| E3 | Name acting head (1) | `appointments.ts:365` | 1 seat + 1 person | time limit per office | Y | `ChairActs.tsx:96-113` radio list, one seat | GAP G11 |
| E4 | Dismiss minister (1) | `appointments.ts:170` | 1 role | none | Y | `ChairActs.tsx:19-33` | ok |
| E5 | Answer resignation offer: accept, decline (2) | `cabinet-agenda-acts.ts:91` | 1 offer | expires if unanswered | Y | `executive/AgendaActs.tsx:46-60` | ok |
| E6 | Grant minister proposal (1) | `cabinet-agenda-acts.ts:192` | 1 proposal | none | Y | `AgendaActs.tsx:30-40` | ok |
| E7 | Reconcile cabinet faction (1) | `cabinet-faction.ts:228` | 1 faction | none | Y | `AgendaActs.tsx:62+` | ok |
| E8 | Remove officer below cabinet (1) | `career-incumbents.ts:271` | 1 institution + cause | at-will or listed causes `REMOVAL_CAUSES` | Y | `oversight/Officers.tsx:35-45` single `Select` | GAP G09 |
| E9 | File inspector-general removal notice (1) | `inspectors-general.ts:264` | 1 institution + reason | reason from `REASONS` | Y | `oversight/Inspectors.tsx:38-52` | GAP G09 |
| E10 | Issue directive: investigation, targeting, enforcement-posture, sanctions-tempo, monetary (5) | `directives.ts:455`; `DirectiveRequest` `:393` | 1 institution + 1 kind + 1 subject string | institution must hold the function (`holdsFunction`); id `directive:<inst>:<kind>:<turn>` so N institutions are distinct; barred ones succeed as a refusal memo | Y | `oversight/Directives.tsx:44-65` three `Select`s | GAP G09 |
| E11 | Notify committees of a finding (1) | `findings.ts:254` | 1 finding | statement from fixed list | Y | `oversight/Notices.tsx:22-33` | ok |

Section E counts: E1 2 + E2 1 + E3 1 + E4 1 + E5 2 + E6 1 + E7 1 + E8 1 + E9 1 + E10 5 + E11 1 = 17.

### F. Congress, legislation, courts, press, decisions (28)

| # | Act (n) | Defined | Card | Parameters and bounds | Batch | Surface | Gap |
|---|---|---|---|---|---|---|---|
| F1 | Sign / veto bill (2) | `legislation.ts:336`, `:374` | 1 bill | veto objection from list; signing window `signing-window.ts` | Y | `congress/BillActs.tsx:40-47` | ok |
| F2 | Transmit legislative act to the Hill (1) | `legislation.ts:475` | 1 act | none | Y | `congress/commit.tsx` | ok |
| F3 | Lobby a Hill post: call, trade, public (3) | `lobbying.ts:567` | 1 post | `OUTREACH_DAILY_LIMIT = 2` slots per day (`lobbying-person.ts:229`, spent at `:223-228`); a post already worked this week is refused (`lobbying.ts:553-556`) | **Rule** | `BillActs.tsx:137-153` single `Select` | **GAP G10** |
| F4 | Member outreach, direct or through a broker (1) | `member-outreach.ts:18` | 1 member (+1 broker) | broker costs 2 slots; refused when a request to that member is outstanding | **Rule** (same 2-slot cap) | `dossier/PersonActs.tsx:112-113` | GAP G10 |
| F5 | Propose bill text; recommend conference text (2) | `bill-text-actions.ts:6`, `:21` | 1 bill | text choice | Y | `BillActs.tsx` (UNCONFIRMED which line) | ok |
| F6 | Answer lower-court order review: accept, seek, seek-with-stay (3) | `judicial-review.ts:347` | 1 proceeding | only when an adverse in-force ruling awaits | Y | `courts/CaseScreen.tsx` | ok |
| F7 | Respond to scandal: come-clean, fight-it, give-them-someone (3) | `scandal-response.ts:299` | 1 scandal | none | Y | `decision/ScandalScreen.tsx:87-92` | ok |
| F8 | Case disposition: defer, decline, allow-default (3) + defer matter (1) (4) | `player-core/desk/case-detail.ts:102`; `campaign/stop-brief.ts:124` | 1 case | none | Y | `decision/CaseScreen.tsx` | ok |
| F9 | Commit a scenario reply (1) | `conversations.ts:626` | 1 option of N | content-driven options | n/a | `decision/Decision.tsx:67-94` | ok |
| F10 | Press secretary takes the hit (1) | `press/press-office.ts:286` | none | none | Y | `news/PressAct.tsx` | ok |
| F11 | Press action: interview, press conference, leak (3) | `press-issued.ts:88`; `PRESS_PLAYS` `press.ts:366` | 1 outlet (interview, leak) or the whole corps (conference) | **one engagement per week**: `pressSlotTaken` (`press-issued.ts:57-62`, used `:89`) | **Rule** | `news/PressAct.tsx`; ids `press-office.ts:179` | **GAP G13** |
| F12 | Frame a recent order: resolve, restraint, necessity, regret (4) | `press-framing.ts:291` | 1 order record | window `FRAMING_WINDOW_TURNS`, not already framed | Y | `news/PressAct.tsx`; `press-office.ts:249` | ok |

Section F counts: 2+1+3+1+2+3+3+4+1+1+3+4 = 28.

### G. Settings and time controls that change the simulation (5)

| # | Act (n) | Defined | Card | Parameters | Batch | Surface | Gap |
|---|---|---|---|---|---|---|---|
| G1 | Attention policy: pause / wait / log per source (1 family, 23 sources) | player-core `AttentionSetting`; read by `store.handOffAndContinue(..., {settings})` | rate/cat: one choice per source | `LAST_CALL_DAYS` for "wait" | already per-row inline | `settings/AttentionSettings.tsx:20-60` | precedent (no bulk "set all") |
| G2 | Enable God mode (1) | `god.ts:38` | none | entitlement-gated | n/a | `settings/GodModeRow.tsx:65` | ok |
| G3 | Time: continue until attention, hand off and continue, step one day (3) | `store.ts` | none | horizon days | n/a | `shell/ContinueButton.tsx`, `shell/advance.ts` | ok |

Section G total: 1+1+3 = 5.

**Totals:** A 37, B 12, C 24, D 43, E 17, F 28, G 5 = 166.

### Not catalogued (internal or non-simulation)

The 60 names in `scripts/engine-internal-actions.json` are composed behind another act, driven by the weekly loop, or God-mode tools with no caller (`enactBudget`, `openCommitment`, `recordBranchPoint`, `editNationStat`, `editCity`, `editRelationship`, `spawnConflict`, `settleConflict`, `grantMetrics`, `setGodFlag`, `seatByDecree`, the `*Packets` phase functions, and similar). Appearance, map and guidance, saves and administrations are device state with no simulation effect.

## Multi-target precedents to extend (do not reinvent)

| Precedent | Evidence | What to copy |
|---|---|---|
| Appointments desk | `oversight/Appointments.tsx:72-111`, `player-core/appointments/desk.ts` `deskPlan` | a row per target, an inline editor per row, a combined cost row, a "Not sent" row of refusals, one review |
| Budget draft | `nation/budget/Allocation.tsx:30-60`, `budget-draft.ts:38` | a slider per category with "now" and "limit" marks, a diff against current |
| Partners toggles | `world/act/Terms.tsx:113-136` | a `Toggle` per partner nation inside one act |
| Finding checklist | `security/CollectionActs.tsx:144-147` | `CheckCard` per finding feeding `findingIndexes` |
| Attention settings | `settings/AttentionSettings.tsx` | a `Select` per row, changes live |

## Ranked gap list

Ranking weighs owner statement first, then how often a player hits it, then cost. Engine status is verified at the cited lines.

**G01. Tariffs: several goods, several countries, a rate per good.** Owner-visible symptom: to tariff three goods from one country the player repeats the whole seven-step ActDesk flow three times; to tariff one good from five countries, fifteen-plus steps. Engine today: `imposeTariff(campaign, target, sector, rate)` is one target, one sector, one additive rate (`trade.ts:373`), the total on a pair is capped at 100% (`trade.ts:345`), each call is its own liftable measure with its own retaliation record (`trade.ts:363-371`). N calls for distinct (target, sector) pairs are legal. Two things the engine lacks: it has no "set the rate to X" (only add, or lift then re-add; a lift thaws the relationship, `trade.ts:609-640`), and a lift/re-add composition would also fire a new retaliation record, so lowering a rate by composition is UNCONFIRMED as acceptable. UI-only: add and stage new tariffs for many goods and countries; lift several measures in one review (`Manage.tsx` handles one id). Engine change (minimal): a `reviseTariff(campaign, target, sector, newRate)` in `trade.ts` that replaces a standing measure's rate in one packet without the relationship thaw or a new retaliation clock. Interaction: one trade board per country (and a "this good, many countries" view) listing every tariffable good with a rate slider and "now" marker; moved rows are staged, a summary shows total revenue and retaliation odds per row, and one review commits the diff. Builders chain through `apply()` between rows.

**G02. Troop and force movement to one or more destinations.** Owner-visible symptom: `Move forces out of <command>` moves one service share to one destination command at a time (`CommandActs.tsx:85-87`); a country-level deployment sends one package (one carrier, or 8 combat ships, 200 fighters, 8 brigades) to one country (`force-packages.ts:38-84`, `resolution.ts:59`). Nothing moves forces from country A to country B. Engine today: command level is fully N-callable. `reassignForces(from, to, branch, share)` (`combatant-commands.ts:392`) recomputes `moved = min(share, source.assignment[branch])` on each application, so a chained sequence of moves out of one command into several is correct; `setCommandPosture` and `amendUnifiedCommandPlan` likewise. Country level: UI-only for several targets of the same package type (distinct targets pass the duplicate guard, `instrument-issued.ts:29`) bounded by uncommitted units; but there is no redeploy-between-countries act. Engine change (needed only for country-to-country redeployment): a deployment-plan act in `commitments.ts` or a new `redeployForces` that re-targets an existing `deployment` commitment's `forces` to another target zone (`commitments.ts:68-72` `located`). Interaction: a theater board of the 11 commands by 6 branches as a grid; drag or type a share from a source cell into one or more destination commands, each destination capped by what the source holds; staged moves show remaining share, and a single "Order the moves" review lists every leg. Country deployments appear as chips on the same board with their package size slider. UNCONFIRMED whether the owner means command assignment or country deployment; the board should do both, since command moves are UI-only.

**G03. One act on a set of countries (sanctions, asset freeze, embargo, aid, diplomatic steps, engagement, covert).** Symptom: the act route is per country (`app/(game)/world/nation/[id]/act.tsx`); a coalition sanction on five governments is five complete flows. Engine: every instrument request is one target but N targets pass the guards (`instrument-issued.ts:29-30`); treasury, readiness, intel capability and munitions are consumed per act, so chaining reveals which later targets become unaffordable. UI-only. A fixed aid size per rung (`instruments-economic.ts` `aidFlow` 60/240/700) means an amount slider is New: add an optional `amount` to `ResolutionRequest` scaled like `forceScale`. Interaction: from the World screen, a country table with row checkboxes and a "Take action on N countries" bar that opens the ActDesk with a shared act and terms and a per-country odds and cost column; refused rows listed as "Not sent". Also lets a player stand down several pending operations (A10).

**G04. Executive orders with a subject: several states, governments, sites or areas.** Symptom: `SubjectPicker` is one `Select` (`order-subjects.tsx:63-66`), so relief for four states or asset blocks on three governments means four or three separate order flows and a week-long wait per same-subject retry. Engine: the order record id embeds the subject (`orders.ts:534-540`) and only the same subject twice per turn is refused (`orders.ts:392-394`), so N signatures for N subjects already work. UI-only, with each order priced after the previous (cost and court exposure accrue per record). Interaction: the order page lists its eligible subjects as rows with a checkbox and the per-subject cost and challenge odds; "Sign for N" opens one review listing each signature.

**G05. Acts on several states (emergency, Stafford, Guard, relief and other locale acts).** Symptom: the Nation map and States table select one state (`StatesTable.tsx:132`, `home/search.ts` `state`), and every state act is a per-state flow with its own review. A hurricane across three states is three emergencies and three relief flows. Engine: `declareEmergency`, `declareStaffordDisaster`, `requestGuardFederalization`, `takeLocaleAct` each take one `StateId`; ids embed state and turn (`emergency.ts:39`), so they are N-callable. UI-only. Interaction: multi-select states on the map or the table (the selection becomes a set), then the state-act panel lists each act once with per-state cost and the governor's assent in rows; commit as one review.

**G06. Policy program: change several domains in one program.** Symptom: six policy domains are changed one at a time, with a review each (`PolicyScreen.tsx:85`). Engine: already supports a multi-domain program: `projectPolicyDraft(campaign, {domain: stance, ...})` and `enactPolicyDraft` (`policy-draft.ts:123`, `:421`) price and commit the whole set together, including the revenue-statute gate per line; `enactPolicyDraft` has no caller in `apps/player` or `packages/player-core`. UI-only. Interaction: a program board with a stance chip per domain, a combined weekly cost, enactment cost and one review.

**G07. Share an intelligence report with several governments.** Symptom: the screen says "You can send one report to several governments, one decision at a time" (`CollectionActs.tsx:141`). Engine: `shareCollectionReport(campaign, reportId, recipients: readonly NationId[], findingIndexes)` already takes the set and refuses a bad recipient for the whole call (`intelligence.ts:587-593`). UI-only: swap the `Select` (`:143`) for a `CheckCard` list of eligible governments with each one's reason string, and add `shareCollectionReport`'s array form to `shareReportOrder` (`collection-reports.ts:70`).

**G08. Set the posture of several commands; fan out intelligence tasking.** (a) Posture: `setCommandPosture` is per command (`combatant-commands.ts:549`); show the 11 commands as a row list on the same theater board as G02 with one staged posture each. UI-only. (b) Tasking: `taskCollection` allows one tasking per element per day (`intelligence.ts:483-487`), so a fan-out to several targets is UI-only only across different elements (e.g. CIA and NSA on three countries each costs three elements). Several targets for one element needs New: `targets: readonly string[]` on `TaskingRequest` (`intelligence.ts:400`) with one tasking record per target, and the daily-slot rule restated as a per-element cap.

**G09. Directives, officer removals and inspector notices to several agencies.** Symptom: `Select` for one agency (`Directives.tsx:62`, `Officers.tsx:45`, `Inspectors.tsx:51`). Engine: `issueDirective` ids embed institution, kind and turn (`directives.ts:455`), so many institutions are distinct; removals and notices are per institution. UI-only. Interaction: an agency table with rows for the chosen instruction, each row with its own subject.

**G10. Work several members or posts in one sitting.** Rule-bound: the engine allows two outreach slots per day (`lobbying-person.ts:229`, `OUTREACH_DAILY_LIMIT = 2`, a broker costs two) and one lobbying per post per week (`lobbying.ts:553-556`). A multi-select is UI-only but its useful size is two, so the owner decides first: raise the cap (an engine constant) or keep it and show remaining slots as part of the selection. Interaction: a member list with a slot meter; picks beyond the meter are disabled.

**G11. Fill several acting seats or dismiss several ministers.** `ChairActs.tsx` is per chair; `appointActing` and `dismissMinister` take one seat. UI-only, folded into the existing appointments desk (precedent): add an "acting" mode to its seat rows.

**G12. Commitments in bulk.** `setCommitmentStatus` takes one id (`commitments.ts:299`). UI-only: a commitments table with row selection and one status choice.

**G13. Press to several outlets.** Rule-bound: one engagement per week (`press-issued.ts:57-62`). A multi-outlet leak or interview would be an engine rule change. Recommend leaving the rule and exposing the choice as a ranked outlet list; flag as a design decision.

**G14. Plurilateral treaties.** `signTreaty` takes one counterpart (`treaties.ts:268`). Needs New: `counterparts: NationId[]`, a record shape for a multilateral treaty, and a Senate count that covers it. Largest change; rank last.

**Not a gap.** Single-target acts where a player would not plausibly want several (a war, a bill, a case, a finding, an emergency renewal, a veto) stay as they are.

## Cross-cutting enablers (build once, serve all gaps)

| # | Enabler | File and minimal change |
|---|---|---|
| E1 | Chained batch builder | `packages/player-core/src/act/` (new `batch.ts`): fold `apply()` between builders, return `{packets, lines, refused}`; feeds `Prepared` arrays (`authorize.ts:20`) and `store.commitAll` unchanged |
| E2 | Multi-row selection and inline-editor table | `packages/ui/src/world/SortTable.tsx`: add a selection column and an `editor` cell; today only `highlight` exists (`:111`) |
| E3 | One review for a batch | reuse `ReviewSpec` lines (`authorize.ts:37-48`); precedent is the appointments desk review (`Appointments.tsx:79-90`) |
| E4 | State and country multi-select | `StatesTable.tsx` and the World table: `selected?: string` becomes a set; `home/search.ts` and `world/params.ts` carry it in the address |
| E5 | Engine additions | `trade.ts` `reviseTariff` (G01); optional `amount` on `ResolutionRequest` (G03); `targets[]` on `TaskingRequest` (G08b); country redeploy (G02); plurilateral treaty (G14) |

## UNCONFIRMED

- Interaction counts (`≈n`) are from component structure, not from a browser run.
- Whether chained `commitAll` batches produce the expected ledger and Record entries for every act: no such batch exists to run.
- Whether lowering a tariff by lift plus re-impose is acceptable (relationship thaw and retaliation record side effects): needs the owner and the trade balance owner.
- Which line in `BillActs.tsx` carries `proposeBillText` and `recommendBillConferenceText`, and whether the housing variants (`bill-text-actions.ts:38`, `:43`) have a surface.
- Whether the owner means command assignment or country deployment by "moving troops" (G02).
- That the cadence rule in `CLAUDE.md` (no bulk test runs until the stable checkpoint) leaves room for the batch builder tests; not checked.
