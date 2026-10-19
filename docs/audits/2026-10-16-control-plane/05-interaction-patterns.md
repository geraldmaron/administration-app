# 05 · Interaction patterns: one control plane for selecting, staging and authorizing

Date: 2026-10-16. Read-only audit of `apps/player` and `packages/ui` (the universal player, DECISIONS §8.1) plus `packages/player-core` and the engine contract they commit through. Nothing was built, run or tested; every claim about today's code cites the file and line it was read from, and anything not read is marked UNCONFIRMED.

## Recommendation first

Build one shared **Plan**: an ordered list of staged lines (an intent, a target and its parameters), held in player-core, that any surface can add to, edit and remove from. Player-core reads the plan by building each line's engine packet in order on a scratch copy of the campaign, exactly as `deskPlan` already does for nominations (`packages/player-core/src/appointments/desk.ts:252-268`). That fold produces every per-line verdict (legal, needs authority, over budget, conflicts) and the combined effect. The UI only draws those view models. The plan is authorized through **one** presidential review as one package and committed with the existing `store.commitAll` (`packages/player-core/src/campaign/store.ts:544-555`), which is already all-or-nothing in memory and saves once.

No engine change is needed for the first three adopters (tariffs, appointments, sanctions and aid). One engine question is open and listed under §3.6.

Before any of this, the four parallel review sheets must become one (§1.4). That is the first backlog item and the critical path.

| Load-bearing choice | Strongest failure mode | Best alternative | Verdict |
|---|---|---|---|
| Fold lines in player-core over a scratch campaign | The preview and the commit diverge because lines interact or the board moves while the President reads | An engine-native `applyPackage(intents)` that builds inside the engine | **Accepted with controls**: the fold order is the commit order, the reviewed plan carries a fingerprint, and the store's basis identity check refuses any moved board (`store.ts:394-395`) |
| Group a package in the Record with a header packet and `causeIds` | `apply()` may treat an effect-less packet oddly, or a gate may reject it | An additive optional `bundle` field on `EffectPacket` and `ActionRecord` | **Needs validation**: `apply()` checks only the narration (`packages/engine/src/effects.ts:723-726`); an empty-effects packet is UNCONFIRMED until a test applies one |
| All-or-nothing commit, with per-line refusal settled before review | A player wants "send what you can" | Commit line by line and report partial success | **Accepted**: refused lines are excluded before confirmation and named in the review; after confirmation nothing is ever partly applied |

## 1. What exists today

### 1.1 Selection and parameter primitives (`packages/ui/src/forms`, `primitives`, `world`, `map`)

| Primitive | What it does | Single-target assumption | Evidence |
|---|---|---|---|
| `ChoiceList` | One-of-many option cards, radio group, roving arrows | `value: T \| undefined`, `onChange(value: T)` | `packages/ui/src/forms/ChoiceList.tsx:73-90` |
| `CheckCard` | Any-of-many row with a check mark | Selection state lives in the caller; no list, no count, no bulk, no keyboard handler of its own (only `onPress`). Whether Tamagui maps Space to `onPress` on a focused `View` on the web is UNCONFIRMED | `ChoiceList.tsx:128-137` |
| `OptionCard` | The shared card both draw on, focusable, whole-card press | Styled shell only | `ChoiceList.tsx:20-42` |
| `Segmented` | Short one-of-many | `value: T \| undefined` | `forms/Segmented.tsx:53` |
| `Select` | Native-style picker | One value | `forms/Select.tsx:34-49` |
| `Slider` | One number, min/max/step, `valueText` | One value per control | `forms/slider-shared.tsx:21-33` |
| `Stepper` | A **progress indicator** (settled/current/blocked/ahead), not a numeric stepper | There is no −/+ numeric input in the catalog | `forms/Stepper.tsx:8-10,52` |
| `Toggle` | Boolean switch | One value | `forms/Toggle.tsx:46` |
| `CardGrid` | Responsive column grid with a `role` | Layout only | `primitives/CardGrid.tsx:4-24` |
| `Sticky` | Sticky column on the web, plain on native | Layout only | `primitives/Sticky.web.tsx:4`, `Sticky.tsx:7` |
| `Sheet` | Bottom sheet on phones, drawer on desktop | One open sheet per caller | `layers/Sheet.tsx:9-27` |
| `SortTable` | Sortable, paged table on desktop, cards on phones | Rows are not press targets and carry no selection; `highlight` marks one row by caller predicate | `world/SortTable.tsx:39-55,111-179` |
| `MapView` | The one map, lens rows, legend as key | `selected?: string`, `onSelect(regionKey)` | `map/types.ts:73-101` |
| `CompareChoices` | Options as columns with one prose cell per attribute row | One `selected`, one `verb`; and it is the options-as-columns table the owner retired on 2026-10-11 | `nation/CompareChoices.tsx:13-49`, `ChoiceRowView.cells` at `:24-31` |
| `CompareAuthorize` | Option cards against the baseline, one verb | One `selected`, one `onAuthorize` | `review/CompareAuthorize.tsx:15-32,166` |
| `ReviewSheet` | The review: terms, named confirm, progress, result | One `ReviewTermsView`; lines are keyed by `label`, so two lines with the same label collide | `review/ReviewSheet.tsx:38-54` (key at `:44`), `review/types.ts:68-87` |
| `Receipt` | Proof an act happened | One title, one date, lines keyed by `label` | `review/Receipt.tsx:8-27,50` |
| Command palette | Exists only in the frozen legacy package | None in `packages/ui`; the program lists `CommandSearch` as unbuilt catalog | `packages/ui-web/src/CommandPalette.tsx`; `docs/audits/2026-10-16-universal-player/PROGRAM.md` catalog "Context" |
| `EvidencePanel` | Legacy only | Not ported | `packages/ui-web/src/EvidencePanel.tsx` |

There is no `Section` primitive file in `packages/ui`; sections are composed from `Panel` (`packages/ui/src/nation/Panel.tsx`, `world/Panel.tsx`).

### 1.2 The act workspace (`apps/player/src/world/act`)

- **Selection.** One nation per route; the goal and option live in the address (`packages/player-core/src/act/config.ts:4-5,21-46`). `ActConfig` holds one `sector`, one `rate`, one `count` (`packages/player-core/src/act/catalogue.ts:170-186`).
- **Parameters.** `ActTermsForm` edits that single config: one goods `Select` and one rate `Slider` (`apps/player/src/world/act/Terms.tsx:84-102`), one force-count `Slider` (`:104-111`), partners as a `Toggle` per country (`:113-136`), the only multi-value field today.
- **The goods evidence is already a table with a per-row "Choose".** The comparison sheet lists every tariffable good with drawn buy/sell bars, sorted and paged, and each row's button replaces the one pick (`Terms.tsx:35-82`, button at `:73`). This is the natural first multi-select.
- **Preview.** `actWorkspace` prices the one chosen option on every config change (`apps/player/src/world/act/ActDesk.tsx:117-119`); `Summary` prints its lines keyed by label (`:41-63`).
- **Authorization.** `useActCommit.take` wraps `useAuthorize` with one build and one review (`apps/player/src/world/act/commit.ts:25-52`); the review lines are "What it does" and one "Law" line per authority, same label repeated (`ActDesk.tsx:82-83`).
- **Receipt.** `ActDone` keeps one title, one `eventId`, one before/after (`commit.ts:8-17`); the receipt screen opens only that last event (`apps/player/src/world/act/Done.tsx:46-47`).
- **Manage.** Ending a measure or operation is a separate desk reached by `?manage=<id>` (`apps/player/src/world/act/Manage.tsx:14-52`; links at `apps/player/src/world/nation/Views.tsx:186` and `apps/player/src/world/nation/Diplomacy.tsx:48`). One row per visit.

### 1.3 Other surfaces that carry an act

- **LocaleDesk.** One state, one matter, `CompareChoices` against waiting, one verb (`apps/player/src/nation/state/LocaleDesk.tsx:16-53`). Its receipt says the per-state change map "isn't ready yet" (`:76`).
- **Budget.** Already a multi-line draft: `BudgetDraftInput` keyed by account, edited in place, read by `budgetDraftReading` on every change, one submission (`apps/player/src/nation/budget/BudgetScreen.tsx:68-108`). The closest existing "inline editor": edit, see tradeoffs and Congress's response, submit once.
- **Appointments.** The one true batch today. `deskPicks` resolves conflicts between seats (`desk.ts:213-225`); `deskPlan` builds one packet per seat **on the state the ones before it leave**, reports refused picks with the engine's reason and sums the cost (`desk.ts:252-268`); the UI sends N nominations with one review (`apps/player/src/oversight/Appointments.tsx:73-110`). Its comparison is still rows × columns (`:84-90`).
- **Collection sharing.** Findings are multi-select `CheckCard`s, but recipients are one `Select`, and the copy tells the player "one decision at a time" (`apps/player/src/security/CollectionActs.tsx:113-152`, text at `:141`).
- **Command reassignment.** One destination, one branch, one share (`apps/player/src/security/CommandActs.tsx:63-83`).
- **Congress whip.** The aisle lists members by lens and slice with no act on them (`apps/player/src/congress/Aisle.tsx:54-89`). Whether the engine models a per-member whip act is UNCONFIRMED; `packages/engine/src/hill.ts` exports readers (`:128-599`), not a whip order.

### 1.4 Authorization: four paths, four review sheets

Each of these calls itself the one path:

| Path | Review it opens | Users | Evidence |
|---|---|---|---|
| `authorizeAct` / `useAuthorize` | The frame's `PresidentialReviewProvider` and `ReviewSheet`, with a tested state machine | 7 files | `apps/player/src/review/authorize.ts:100-131`, `use-authorize.ts:15-40`, `PresidentialReview.tsx:25-76`, `review-machine.ts:49-66` |
| `useNationAct` | Its own `Sheet` in `presidential-review-seam.tsx` | 9 files | `apps/player/src/nation/act.ts:56-90`, `apps/player/src/nation/presidential-review-seam.tsx:26-60` |
| `useActCommit` (Washington) | Its own `Sheet` in `review-seat.tsx`, which says it waits for the shared review to be wired | 9 files | `apps/player/src/congress/commit.tsx:47-84`, `apps/player/src/congress/review-seat.tsx:21-60` |
| `useChairActs` | Its own `Sheet` with an "I've read" toggle | 3 files | `apps/player/src/executive/acts.tsx:77-140` |

All four already accept "one packet or a run of packets that is one act" and route a run to `commitAll` (`authorize.ts:17-18,75-77`; `nation/act.ts:45-47`; `congress/commit.tsx:65`; `executive/acts.tsx:97`). So the **commit** side already handles N packets. Review, receipt and Record do not.

`PresidentialReviewProvider` refuses a second open while one is open (`PresidentialReview.tsx:37-38`); a plan must therefore be reviewed as one package, never as N reviews.

### 1.5 Commit, receipt, Record, save

- `commitAll` applies each packet to the state its predecessor produced, seats family cases once, publishes once and persists once (`store.ts:544-555`). If any `apply` throws, it throws before `publish`, so nothing is applied: all-or-nothing in memory.
- A stale `basis` is refused before anything applies (`store.ts:390-397`), with the player-facing words at `store.ts:111-112`.
- `apply()` writes exactly one ledger entry per packet (`packages/engine/src/effects.ts:723-780`) and stamps it `ev-<turn>-<ledgerLength>`, deterministic (`packages/engine/src/causality.ts:129-135`). A packet may name the events it answers to in `provenance.causeIds` (`causality.ts:46-49`; `packages/engine/src/effect-types.ts:578`).
- The Record already walks those links: an entry lists `causes`, `consequences`, `roots` and `downstreamCount` (`packages/player-core/src/record/record-entry.ts:209-272`).
- The receipt keeps only the newest event id (`authorize.ts:93`; `executive/acts.tsx:103`).
- The delta lens remembers one `camera` and one `selection` per change (`apps/player/src/review/last-change.ts:9-18`).
- A sidecar beside the campaign, outside its schema, already exists for the sitting (`packages/player-core/src/persistence/save-store.ts:145-151`).
- `useVaultRoom` is the existing pattern for "blocked by a precondition, let the player resolve it, re-run the same closure" (`apps/player/src/saves/useVaultRoom.tsx:32-60`). Stale-plan recovery reuses that shape.

### 1.6 What breaks at N targets

| Concern | Today | At N |
|---|---|---|
| State shape | `ActConfig` holds one sector, rate, count (`catalogue.ts:170-186`); `MapView.selected?: string` (`map/types.ts:87`) | No place to hold six goods or four destinations; the address cannot carry them sanely |
| Preview | One option priced per config (`ActDesk.tsx:119`) | Lines interact (shared retaliation, shared forces, shared budget); pricing each against the same basis is wrong |
| Packet ids | `tariffOrderIds` picks the next free ordinal from the campaign it is given (`packages/engine/src/trade.ts:362-371`) | Two tariffs on one country built against the **same** basis both take ordinal 1 and the same retaliation id. A sequential fold avoids it |
| Dice | Instrument rolls draw from `stream("instruments", actor, target, turn)` (`packages/engine/src/instrument-gates.ts:120`), seeded only by campaign seed and key (`packages/engine/src/rng.ts:59-66`) | Two rolled acts on the same target in the same turn draw the same numbers. Different targets are independent |
| Review rows | Keyed by label (`ReviewSheet.tsx:44`; `executive/acts.tsx:49`) | Duplicate labels collide; no numbering, no per-line status, no combined effect |
| Partial failure | A refusal throws the whole act (`authorize.ts:123-126`) | No way to say "5 of 6 can go; this one can't, because…" except in `deskPlan` |
| Receipt | One title and last event (`commit.ts:8-17`, `Done.tsx:46-47`) | Needs N lines with their own outcome ("they declined" is per line) and the package |
| Record | One entry per packet, no grouping | N unrelated entries the same day |
| Delta lens | One camera and selection (`last-change.ts:14-15`) | Needs a set of regions |
| Undo | None after commit; acts are counter-acted (lift, stand down) | Drafts need undo; committed packages need amend and cancel per line |
| Save | Nothing staged is saved; the act desk's config survives only in the address (`config.ts:4-5`) | A plan built across surfaces must survive a reload without entering the campaign save |

## 2. The shared layer

### 2.1 The core abstraction

> A **Plan** is an ordered list of **PlanLines** (kind, target, parameters), read by player-core's `readPlan` as a sequential fold over a scratch copy of the campaign, which yields every line's verdict and the combined effect, and authorized as one reviewed **Package**.

Everything else (selection lists, the map assignment, inline editors, the palette, the "what needs me" entry) is a way to add, edit or remove lines.

### 2.2 Player-core types (`packages/player-core/src/plan/`)

```ts
export type TargetRef =
  | { kind: "nation"; id: NationId } | { kind: "state"; id: StateId }
  | { kind: "office"; id: OfficeId } | { kind: "person"; id: PersonId }
  | { kind: "command"; id: CombatantCommandId } | { kind: "account"; id: BudgetAccount }
  | { kind: "measure"; id: string } | { kind: "report"; id: string };

/** Each kind's parameters. New kinds are added here and in PLAN_KINDS, nowhere else. */
export type LineParams = {
  act: { option: string; config: ActConfig };          // wraps buildAct (build.ts:147)
  nomination: { person: PersonId };                     // wraps deskPlan's builder
  "budget-line": { share: number };
  "locale-act": { cause: ConditionKind; option: string };
  share: { report: string; findings: readonly number[] };
  reassign: { to: CombatantCommandId; branch: MilitaryBranch; share: number };
  end: { what: "lift" | "stand-down" | "withdraw" };    // amend/cancel lines
};
export type PlanKind = keyof LineParams;

export type PlanLine<K extends PlanKind = PlanKind> = {
  readonly id: string;            // `${kind}:${targetKey}:${discriminator}`, stable across edits
  readonly kind: K;
  readonly target: TargetRef;
  readonly params: LineParams[K];
  readonly origin: string;        // the place href that staged it, for "edit where it came from"
  readonly seq: number;           // insertion order; ties broken by id
};

export type Plan = {
  readonly id: string;            // random per draft, never used for determinism
  readonly campaignId: string;
  readonly drafted: { turn: number; ledgerLength: number };
  readonly lines: readonly PlanLine[];
};

export type PlanKindDef<K extends PlanKind> = {
  readonly rank: number;                                    // fold order between kinds: ends before imposes
  readonly build: (campaign: Campaign, line: PlanLine<K>) => ActBuild;    // existing builders, pure
  readonly describe: (campaign: Campaign, line: PlanLine<K>) => LineCopy;  // title, params in words, target name, href
  readonly conflictKeys: (line: PlanLine<K>) => readonly string[];         // see §2.4
  readonly editor: (campaign: Campaign, line: PlanLine<K>) => EditorSpec;  // bounds from the engine, never typed in the UI
  readonly review: { tier: "full" | "confirm"; danger: (line: PlanLine<K>) => boolean; authority: (line: PlanLine<K>) => readonly string[] };
  readonly place: (line: PlanLine<K>) => { camera: string; selection?: string };
};
export const PLAN_KINDS: { readonly [K in PlanKind]: PlanKindDef<K> };
```

`EditorSpec` is a renderer-neutral description: `{ control: "number"; min; max; step; unit; valueText } | { control: "choice"; options } | { control: "set"; options }`. The `act` kind derives its bounds from `actWorkspace`'s `TariffTerms.room` and `ForceTerms.min/max` (`packages/player-core/src/act/workspace.ts:23-73`), so a bound is never typed into a screen.

### 2.3 Reading a plan

```ts
export type LineStatus = "ready" | "refused" | "needs-authority" | "over-budget" | "conflict" | "moved";
export type Reason = { code: string; words: string; lineIds: readonly string[]; cite?: string };

export type LineReading = {
  readonly lineId: string;
  readonly order: number;                       // 1-based position in the package
  readonly status: LineStatus;
  readonly reasons: readonly Reason[];          // the engine's words for a refusal
  readonly copy: LineCopy;
  readonly outcome?: ChoiceOutcome;             // player-core/src/choice/choice-outcome.ts:37
  readonly charged: number;                     // chargedBy (build.ts:50-56)
  readonly packets: readonly EffectPacket[];    // empty unless ready
};

export type PlanReading = {
  readonly lines: readonly LineReading[];
  readonly combined: { cost: ChoiceCost; effects: readonly ChoiceEffect[]; worstCase?: string };
  readonly blocking: readonly Reason[];         // anything that stops the whole package
  readonly sendable: number;                    // lines with status "ready"
  readonly tier: "full" | "confirm";            // the highest tier of any ready line
  readonly danger: boolean;                     // any ready line is danger
  readonly fingerprint: string;                 // hash of basis identity marker + ordered ready line ids + params
};

export function readPlan(campaign: Campaign, plan: Plan): PlanReading;
```

`readPlan` sorts lines by `(PLAN_KINDS[kind].rank, seq, id)`, then for each line calls `build` against `scratch`, and when it is ready sets `scratch = packets.reduce(apply, scratch)`. That is `deskPlan`'s method (`desk.ts:256-258`) generalized. A refused line does not advance `scratch`, so later lines are read as if it were not there, which is what the review will show. Combined effects are the metric difference between `campaign` and the final `scratch` through `readingMoves` (`record-entry.ts:122`), put on the same shared axis `ChoiceEffect` uses, so the combined bar and each line's bar are comparable.

### 2.4 Live rule feedback, computed and never typed

Each status comes from one place:

| Status | Source | Words |
|---|---|---|
| `refused` | The line's `build` returns `{ ok: false, reason }` against the scratch state | The engine's reason, unchanged (e.g. the stacking limit at `trade.ts:393-398`) |
| `needs-authority` | `PLAN_KINDS[k].review.authority` resolves to an authority record whose condition is unmet (Congress must act, a finding is required); the force-authorization gate (`packages/engine/src/force-authorization.ts:181`) is one source | The record's plain words and citation (DECISIONS §8.12) |
| `over-budget` | Sum of `charged` over ready lines against remaining budget authority. The exact selector is UNCONFIRMED; `authorityFlow` (`packages/player-core/src/budget/draft-consequence.ts:74`) is the candidate | "These six cost $X; $Y is left this year." Names the lines that tip it |
| `conflict` | Two lines share a conflict key: same tariff target and sector; lift and impose on one measure; two rolled instruments on one target in one turn (§1.6 dice); one person in two seats (already `deskPicks`, `desk.ts:213-225`); total forces past what is available (the fold raises the engine's own refusal) | Names both lines and offers "keep this one" on each |
| `moved` | The plan was drafted on another turn or ledger length than the campaign now in play | "Drafted in week 12, rechecked in week 14," then whatever changed |

Conflicts and budget are **package** reasons, so they live in `blocking` and are attached to every line they name. The UI never decides a status; it maps status to a tone and draws `words`.

### 2.5 The plan store and hook

`createPlanStore(storage)` in player-core mirrors `CampaignStore`'s `getState/subscribe` (`store.ts:120-123`):

```ts
type PlanStore = {
  getState(): Plan | undefined;
  subscribe(listener: () => void): () => void;
  add(line: Omit<PlanLine, "seq">): void;          // replaces a line with the same id
  edit(id: string, params: Partial<LineParams[PlanKind]>): void;
  remove(id: string): void;
  clear(): void;
  undo(): void; redo(): void;                       // draft edits only, last 50
};
```

The app adds `usePlan()` and `usePlanReading(campaign)` (`useMemo(readPlan)` keyed on campaign identity and plan). The plan persists in a sidecar beside the sitting (`save-store.ts:145-151` pattern), keyed by campaign id, versioned by player-core and never written into `Campaign`. A plan from an older turn is kept and read as `moved`, not dropped.

### 2.6 Components (`packages/ui`, view models only, no player-core import per DECISIONS §8.2)

**`SelectList<Row>`**: the multi-select results list.

```ts
type SelectRowView = {
  id: string; label: string; icon?: IconName; visual?: ReactNode;
  selected: boolean; disabledReason?: string;
  status?: { tone: "good" | "caution" | "bad" | "neutral"; words: string };
  readings: readonly RowReadingView[];      // cost, odds bar, effect bars on one shared axis
  editor?: ReactNode;                        // shown under the row only while selected
  door?: { label: string; onPress: () => void };  // the row's subject (marks link to their subject)
};
type SelectListProps = {
  label: string; noun: { one: string; many: string };
  rows: readonly SelectRowView[]; columns: readonly ReadingColumn[];
  onToggle: (id: string, on: boolean) => void;
  onToggleMany: (ids: readonly string[], on: boolean) => void;
  bulk?: readonly { id: string; label: string; onPress: (ids: readonly string[]) => void }[];
  sort?: SortState; page?: number; empty: string;
};
```

A whole row toggles; the subject door is a separate trailing control. Sort and paging reuse `sortRows` (`world/SortTable.tsx:27-37`). The bulk bar appears when anything is selected: count, select all shown, clear, and kind-specific bulk edits ("Set the rate for 4 goods"). Readings are drawn (bars and gauges in solid ink), never word tiles.

**`NumberStepper`**: −/value/+ with typed entry, `min/max/step/valueText`. Fills the catalog gap left by `Stepper` being a progress indicator (`forms/Stepper.tsx:8`). Used inside row editors where a slider is too wide.

**`PlanDock`**: the staged plan, mounted once in the frame next to the review provider. On desktop it is a sticky right rail, 340 wide like the act desk's rail (`ActDesk.tsx:136`). On phones it is a bottom bar holding the count, the combined cost reading and the verb, inside the lowest 112px that DESIGN already reserves for docked verbs (`docs/DESIGN.md:205`); it expands to a sheet. Lines are grouped by kind with their status, an "edit where it came from" door (`origin`), remove, and the combined effect.

**`AssignMap`**: map and list as one control. `MapView` gains `selectedKeys?: readonly string[]`, `onToggle?(key)`, and per-region `badges` (a count and unit glyph); `selected`/`onSelect` stay for single use. The list beside it is built from the same lens rows (DECISIONS §8.8) as a `SelectList` whose row editor is a `NumberStepper`. Three paths reach the same plan lines:

1. Press a resource chip ("2 carrier groups"), then press regions: each press adds or increments a line.
2. Drag a chip onto a region (web pointer only). An enhancement, never the only path.
3. Keyboard: tab into the list, Space to select a country, then the stepper sets the count. The map follows the list's selection both ways.

**`PackageReview`**: `ReviewSheet` extended, not forked. `ReviewTermsView` gains an optional `package` field:

```ts
type ReviewPackageView = {
  lines: readonly { id: string; order: number; title: string; target: string; params: string; cost: string; danger: boolean; law: readonly string[] }[];
  excluded: readonly { id: string; title: string; words: string }[];   // refused, conflict, needs authority
  combined: { cost: string; effects: readonly EffectView[] };
};
```

Lines are numbered and keyed by `id`. The verb counts what will go ("Sign 5 tariff orders"). Excluded lines sit in their own block, "Won't be sent," with the reason, so confirming is explicitly confirming the five. The result phase lists each line's outcome ("They declined the envoy" is a line outcome, not a failure).

**`PackageReceipt`**: `Receipt` with numbered lines, each with its own outcome badge and a door to its Record entry, plus one door to the package entry.

**`InlineSetting`**: for a setting shown inside a reading (a tariff rate on a country file, a budget line share, a command's posture). At rest it is the reading plus a "Change" control. Open, the editor sits in place, the reading draws a ghost mark from the current value to the new one with the line's computed effect, and two verbs follow: "Add to plan" (stages it) and "Review now" (a one-line package). It never commits on its own.

**`CommandBar`**: the palette, with "What needs me" as its empty state. It reads player-core `commandIndex(campaign)` and draws results. A "start" result opens the surface with its line already staged and focused, not committed.

### 2.7 Batch presidential review, stale state and refusal

1. **Press "Review N"** (dock, desk or palette). The app calls `readPlan(campaign, plan)` and holds `{ basis: campaign, fingerprint }`.
2. **Blocking reasons** keep the review closed and focus the first offending line in the dock, with its words. Nothing opens unreviewable.
3. **The review opens** with numbered ready lines, the excluded block and the combined effect. The tier is the highest of any line; danger if any line is danger.
4. **Confirm.** The authorize path re-reads the plan against `store.getState()`:
   - Board identical (`campaign === basis`) and fingerprint equal: commit `[header, ...lines.flatMap(packets)]` with one `commitAll`.
   - Board moved: commit nothing. The review moves to a result that names the `moved` lines and whatever now reads differently, and offers "Review again." That is the `useVaultRoom` shape: resolve, then re-run the same closure.
5. **Commit fails** (an `apply` throws): nothing was applied (`store.ts:544-555`). The result shows the engine's words against the line whose packet threw.
6. **Applied but not saved**: the existing save-error words and retry (`ReviewSheet.tsx:65-67`), once for the package.

Per-line refusal is settled before confirmation and never after it. A President cannot confirm six and get four.

### 2.8 Receipts, Record and the delta lens

- **Header packet.** One packet first in the run: actor `player`, narration "The President signed a package: 5 tariff orders on China," no effects. It is stamped `ev-<turn>-<ledgerLength>` (`causality.ts:134`), so player-core knows its id before committing.
- **Lines answer to it.** Each line packet's `provenance.causeIds` gets the header id appended. The Record then lists the lines as the package's consequences and the package as each line's cause (`record-entry.ts:266-267`). A packet that arrives without `provenance` needs an `origin` to carry `causeIds` (`causality.ts:46-47`). Which builders omit it is UNCONFIRMED; those lines link through `subjects` instead until checked.
- **Receipt.** It keeps every event id, not `at(-1)`.
- **Delta lens.** `LastChange` takes `selections: readonly string[]` alongside `selection` (`last-change.ts:14-15`), from each line's `place`.

### 2.9 Amend or cancel from where the effect shows

Every standing effect a line created (a measure, an operation, a deployment, a nomination in the Senate) gets an "Amend" and an "End" control wherever it is drawn: the country file's under-way rows (`world/nation/Views.tsx:186`), the trade measure rows (`world/nation/Diplomacy.tsx:48`), a command's commitments and a record entry still "Started, but not in effect yet" (`record-entry.ts:261`). "End" stages an `end` line (lift, stand down or withdraw, using the builders imported at `packages/player-core/src/act/build.ts:3-16`). "Amend" stages an `end` line plus a new line as one package. Neither commits in place; both go through the plan and the one review. The separate `?manage=` desk (`Manage.tsx`) becomes the one-line case of the same flow.

### 2.10 Command palette and "what needs me"

- `commandIndex(campaign)` in player-core returns `{ id, label, keywords, kind: "go" | "start", href, seed?: Omit<PlanLine, "seq"> }`. "Tariff on Chinese steel" resolves to a `start` with a seeded `act` line.
- `InboxItem` gains `intent?: { label: string; seed: Omit<PlanLine, "seq"> }` next to `href` and `actionable` (`packages/player-core/src/notifications/inbox.ts:21-33`), so an actionable matter offers "Start: answer with X" that stages the line and opens its surface.
- Opened with ⌘K or Ctrl+K and a shell button on both sizes. On phones it is a full-height sheet. The empty state lists what needs the President, from the inbox's actionable items.

### 2.11 Keyboard and screen reader

- `SelectList`: each row is a `checkbox` with an accessible name of label plus status words. Space toggles; Enter opens the row's editor; Shift+Space selects the range from the last toggled row; ⌘A or Ctrl+A selects all shown. A polite live region says "4 of 12 goods selected." The subject door is a separate tab stop.
- Editors: the stepper is a `spinbutton` with `aria-valuetext` from `valueText`; arrows step, Page Up and Page Down step by ten.
- Dock: a `region` named "Your plan, 5 lines, 1 needs attention." Every line can be removed by keyboard; focus moves to the next line or to the dock heading.
- Review: the confirm control is never first focus (already the rule, `ReviewSheet.tsx:100-106`). Lines are an ordered list and excluded lines a separate list; the combined effect has exact figures in text.
- Map: regions stay out of the tab order where the paired list is present; the list is the keyboard path (DECISIONS §8.8 list view).
- Status is never color alone: tone plus an icon plus words.

### 2.12 Phone and desktop

Task parity holds. Every path above works at 390×844 without drag or hover.

| | Phone (<768) | Desktop (≥1024) |
|---|---|---|
| `SelectList` | One card per line, mark at left, readings stacked under the name, editor expands in place, sort as buttons (as `SortTable` does today, `world/SortTable.tsx:135-157`) | Rows with drawn reading columns, sortable headers, editor row under the selected row |
| Plan | Bottom dock bar, expands to a sheet | Sticky right rail |
| Map assignment | Map panel above, list below, press-to-assign; the map shrinks to a strip while editing | Map and list side by side; drag enabled |
| Review | Full-height sheet, numbered lines, verb docked at the foot | Drawer at the side |
| Palette | Full-height sheet from a shell button | ⌘K or Ctrl+K overlay |

## 3. The UI ↔ engine contract

### 3.1 From N lines to one package

`packagePlan(campaign, plan, reading) → { header: EffectPacket; runs: { lineId: string; packets: readonly EffectPacket[] }[]; fingerprint: string }`, in player-core. The packets are those `readPlan` already built in fold order, with `causeIds` added. The app passes `[header, ...runs.flatMap(r => r.packets)]` to the existing authorize path's `Prepared` array (`authorize.ts:17-18`). No new commit API.

### 3.2 Determinism and ordering

- Fold order equals commit order: `(rank, seq, id)`. Rank is declared per kind (ends before imposes, nominations in desk order, budget before spending).
- `build` is pure over its campaign. Seeded draws come from the campaign seed and keys (`build.ts:27-29,93,112`; `rng.ts:59-66`). The same plan on the same campaign gives byte-identical packets.
- Two rolled instrument lines on one target in one turn are a `conflict`, because the engine stream key would give both the same draws (`instrument-gates.ts:120`).

### 3.3 Idempotence

- After a commit the campaign object changes, so a second press on the same basis is refused as stale (`store.ts:394-395`). That is the primary guard.
- `useAuthorize`'s in-flight ref (`use-authorize.ts:18-24`) stops a double press during commit.
- The package fingerprint is written to the plan sidecar on success. Re-opening a reviewed plan whose fingerprint was committed shows its receipt instead of a review.
- Save retry persists without re-applying (`store.ts:556-559`).

### 3.4 Save compatibility

- Campaign saves gain no field. The header packet and `causeIds` use existing shapes (`effect-types.ts:540-584`), so the schema version does not move.
- The plan sidecar is player-core's, versioned there. An unreadable sidecar is discarded with a notice, never blocking a load.

### 3.5 What player-core adds

`plan/` (types, `PLAN_KINDS`, `readPlan`, `packagePlan`, `createPlanStore`, conflict keys), `commandIndex`, `InboxItem.intent`, a `planViews` module that maps `PlanReading` to `SelectRowView`, `ReviewPackageView` and the dock's view, and `appointments/desk.ts` re-expressed as the `nomination` kind with its tests kept.

### 3.6 What the engine might add, only if unavoidable

1. **Empty-effects header packet.** If a test shows `apply()` or a gate rejects it, add an optional `bundle?: { id: string; index: number; size: number }` to `EffectPacket` and `ActionRecord`, omitted when absent (the existing pattern at `effects.ts:757-770`). Additive; old saves read unchanged.
2. **Per-act dice key.** Today the conflict rule makes this optional. Adding the ledger length to the instrument stream key would let two acts on one target in a turn roll independently, but it changes the draws every existing act makes. It is a balance-affecting change and is not proposed here.
3. **Whip.** A per-member whip order, if the owner wants it, is engine work. UNCONFIRMED whether one exists.

## 4. Staged adoption

| Stage | Surface | Why at this point | Depends on | Size |
|---|---|---|---|---|
| 0 | One review path | Four review sheets would mean four batch reviews; nothing below is safe until there is one | — | M |
| 1 | Plan model in player-core | Every surface needs it; `deskPlan` proves the method | 0 for wiring, not for the model | M |
| 2 | Shared components | `SelectList`, `NumberStepper`, `PlanDock`, `PackageReview`, `PackageReceipt` | 1 | L |
| 3 | **Tariffs on several goods** | The owner's named case. One country, no map, engine ids already handle several measures in a turn under a fold (`trade.ts:362-371`), and the goods table exists (`Terms.tsx:35-82`). Tariffs roll no dice: UNCONFIRMED, check `imposeTariff` | 1, 2 | M |
| 4 | Appointments onto the plan | Already a batch; moving it proves the model is general and retires a rows × columns comparison | 1, 2 | S |
| 5 | Sanctions and aid across several countries | The first cross-route plan; dice are per target, so independent | 3 | M |
| 6 | **Forces to several countries** | The owner's second named case; needs `AssignMap` and availability in the fold | 2, 5 | L |
| 7 | Nation states (locale acts across states) | Replaces `CompareChoices` on `LocaleDesk`; a map of states is the question | 2, 6 (map) | M |
| 8 | Budget lines as `InlineSetting` | Already a draft (`BudgetScreen.tsx:70`); lines become plan lines and the screen edits in place | 2 | S |
| 9 | Collection and covert targets | Removes "one decision at a time" (`CollectionActs.tsx:141`); covert lines need the dice conflict rule | 2, 5 | M |
| 10 | Congress bills (sign or veto several) and whip | Bills: UI only. Whip: engine dependency, UNCONFIRMED | 2; engine for whip | M (bills), L (whip) |
| 11 | Amend or cancel in place | Every standing effect a door into the plan | 3, 5 | M |
| 12 | Palette and "what needs me" | Starts every kind above directly | 1, 3 | M |

## 5. Backlog-ready items

Proposed ids follow the next free id (BL-170 is the highest in `docs/BACKLOG.md`). The integrator assigns final ids under the one-writer rule.

### BL-171 · One presidential review path for every act (M)
- **Problem:** four commit paths each open their own review sheet, with different copy, tiers and controls (§1.4). A package review cannot be built four times.
- **Acceptance:** every act in `apps/player` commits through `authorizeAct` and the frame's `ReviewSheet`. `presidential-review-seam.tsx`, `review-seat.tsx` and `useChairActs`'s sheet are deleted. Review and receipt lines are keyed by a stable id rather than by label. A grep for `new Promise<boolean>` review seams outside `src/review` returns nothing. The review-machine tests still pass; one test commits a two-packet run through it.
- **Evidence:** `apps/player/src/review/authorize.ts:100-131`; `apps/player/src/nation/presidential-review-seam.tsx:26-60`; `apps/player/src/congress/review-seat.tsx:21-60`; `apps/player/src/executive/acts.tsx:77-140`; `packages/ui/src/review/ReviewSheet.tsx:44`.
- **Split:** UI only.
- **Depends on:** none.

### BL-172 · Plan model and fold reader in player-core (M)
- **Problem:** there is no way to stage several acts, and pricing each against the same basis is wrong when they interact (shared ids, forces, budget).
- **Acceptance:** `packages/player-core/src/plan/` exports `Plan`, `PlanLine`, `PLAN_KINDS` (`act`, `nomination`, `end` at minimum), `readPlan`, `packagePlan` and `createPlanStore`. Tests show: two tariffs on one country and two sectors build distinct measure and retaliation ids; a refused line does not advance the fold; two rolled instruments on one target are a `conflict`; the same plan on the same campaign gives identical packets twice; `deskPlan`'s existing tests pass with it re-expressed as the `nomination` kind.
- **Evidence:** `packages/player-core/src/appointments/desk.ts:252-268`; `packages/engine/src/trade.ts:362-371`; `packages/engine/src/instrument-gates.ts:120`; `packages/player-core/src/act/build.ts:147`.
- **Split:** player-core only.
- **Depends on:** none (wiring needs BL-171).

### BL-173 · Tariffs on several goods in one order (M)
- **Problem:** a tariff covers one good per order and the form says so; setting three means three reviews and three receipts.
- **Acceptance:** on `/world/country/:id/act?option=tariff` the goods list is a `SelectList`: tick several goods, set a rate per good with a stepper or one rate for all from the bulk bar, and see each good's cost and status beside it with the combined effect at the foot. One review lists every good numbered, excludes any over the 100% limit with the engine's words, and signs once. The receipt lists each good, and the Record shows one package entry whose consequences are the per-good orders. Works with keyboard only and at 390×844.
- **Evidence:** `apps/player/src/world/act/Terms.tsx:35-102`; `packages/player-core/src/act/catalogue.ts:170-186`; `apps/player/src/world/act/Done.tsx:46-47`.
- **Split:** UI plus player-core; engine none, unless the header packet test fails (then BL-180).
- **Depends on:** BL-171, BL-172, BL-174.

### BL-174 · Shared selection, plan and package components in `packages/ui` (L)
- **Problem:** the catalog has no multi-select list, no numeric stepper (`Stepper` is a progress indicator), no plan dock, and review and receipt for one act only.
- **Acceptance:** `SelectList`, `NumberStepper`, `PlanDock`, `PackageReview` (as a `ReviewSheet` mode) and `PackageReceipt` render in the `/catalog` route in light, dark and high contrast at both sizes, with whole-row targets, drawn readings in solid ink, sort and paging, and the keyboard map in §2.11. axe is clean on the web export.
- **Evidence:** `packages/ui/src/forms/ChoiceList.tsx:128-137`; `packages/ui/src/forms/Stepper.tsx:8-10`; `packages/ui/src/world/SortTable.tsx:111-179`; `packages/ui/src/review/types.ts:68-80`.
- **Split:** UI only.
- **Depends on:** none to build; BL-172 to feed.

### BL-175 · Package entries in the Record and receipts (S)
- **Problem:** a run of packets writes unrelated Record entries, and the receipt opens only the last.
- **Acceptance:** a committed package writes a header entry, and each line's entry lists it as its cause. The package receipt opens the header and each line. The delta lens recolors every region a package touched. A test applies an empty-effects header packet through `apply()`.
- **Evidence:** `packages/engine/src/effects.ts:723-780`; `packages/engine/src/causality.ts:46-49,134`; `packages/player-core/src/record/record-entry.ts:266-267`; `apps/player/src/review/authorize.ts:93`; `apps/player/src/review/last-change.ts:14-15`.
- **Split:** player-core and UI; engine only through BL-180 if the header test fails.
- **Depends on:** BL-172.

### BL-176 · Map-and-list assignment for forces to several countries (L)
- **Problem:** forces go to one country per order, and the map holds one selection.
- **Acceptance:** from the force act, the President picks a unit type and assigns counts to several countries by pressing regions, by dragging on the web, or by list and stepper with the keyboard. The map and list show one selection both ways. Each line is checked in the fold against available forces, and an over-assignment names the lines that tip it. One review and one receipt cover all destinations.
- **Evidence:** `packages/ui/src/map/types.ts:73-101`; `apps/player/src/world/act/Terms.tsx:104-111`; `packages/player-core/src/act/workspace.ts:23-36`.
- **Split:** UI and player-core; engine none expected. Rolled military rungs per target are independent (`instrument-gates.ts:120`).
- **Depends on:** BL-173, BL-174, UP7 map wiring.

### BL-177 · Sanctions and aid across several countries (M)
- **Problem:** economic and assistance rungs act on one country per route.
- **Acceptance:** from a measure's family, the President selects several countries in a `SelectList` (with the map where geography answers it), sees each country's odds and cost and the combined effect, and authorizes one package. Lines that need Congress or an emergency say so in their status, citing the authority record.
- **Evidence:** `packages/player-core/src/act/catalogue.ts:24-29,189-206`; `apps/player/src/world/act/ActDesk.tsx:113-154`.
- **Split:** UI and player-core.
- **Depends on:** BL-173.

### BL-178 · Amend or cancel from where the effect shows (M)
- **Problem:** ending or changing a measure means visiting a separate `?manage=` desk, one row at a time; nothing can be amended.
- **Acceptance:** every under-way row, trade measure row and pending Record entry offers "Change" and "End." Each stages plan lines (End is one line; Change is an end plus a new line as one package) and goes through the one review. `Manage.tsx` becomes the one-line case.
- **Evidence:** `apps/player/src/world/act/Manage.tsx:14-52`; `apps/player/src/world/nation/Views.tsx:186`; `apps/player/src/world/nation/Diplomacy.tsx:48`; `packages/player-core/src/record/record-entry.ts:261`.
- **Split:** UI and player-core.
- **Depends on:** BL-172, BL-174.

### BL-179 · Retire options-as-columns comparisons on act surfaces (M)
- **Problem:** `CompareChoices` and the appointments comparison draw options as columns with prose cells, which the owner rejected on 2026-10-11 in favor of a results list.
- **Acceptance:** LocaleDesk, Levers, StateActs, EmergencyScreen and Appointments use the results-list rows (drawn cost, odds and effects on one axis, baseline as a reference row). `CompareChoices` has no callers and is deleted. DESIGN.md §"Shared patterns" is reconciled with the results-list rule. While there: its line 194 still describes a biometric scan that DECISIONS §8.9 removed on 2026-10-14.
- **Evidence:** `packages/ui/src/nation/CompareChoices.tsx:24-31`; callers at `apps/player/src/nation/state/LocaleDesk.tsx:34`, `apps/player/src/nation/economy/Levers.tsx:84`, `apps/player/src/nation/home/StateActs.tsx:133`, `apps/player/src/nation/emergency/EmergencyScreen.tsx:5`; `apps/player/src/oversight/Appointments.tsx:84-90`; `docs/DESIGN.md:194,201`.
- **Split:** UI only.
- **Depends on:** BL-174.

### BL-180 · Engine: package marker on packets, only if the header test fails (S)
- **Problem:** conditional. Needed only if BL-175 shows an effect-less header packet is refused or distorts the ledger.
- **Acceptance:** an optional `bundle` field on `EffectPacket` and `ActionRecord`, omitted when absent; old saves load unchanged; SCHEMA.md and ARCHITECTURE.md updated in the same change (Doc Sync Contract).
- **Evidence:** `packages/engine/src/effect-types.ts:540-584`; `packages/engine/src/effects.ts:757-770`.
- **Split:** engine.
- **Depends on:** BL-175's finding.

### BL-181 · Inline settings in readings (budget first) (S)
- **Problem:** settings shown in a reading cannot be changed there; the budget edits in a separate editor block.
- **Acceptance:** an `InlineSetting` on a budget line, a country's tariff rate and a command's posture: edit in place, see the ghost mark and computed effect, then "Add to plan" or "Review now." Nothing commits without the review.
- **Evidence:** `apps/player/src/nation/budget/BudgetScreen.tsx:68-108`; `apps/player/src/security/CommandActs.tsx:63-83`.
- **Split:** UI and player-core.
- **Depends on:** BL-172, BL-174.

### BL-182 · Several recipients and targets for collection and covert acts (M)
- **Problem:** a report goes to one government per decision, and the copy says so.
- **Acceptance:** recipients are a `SelectList` with each recipient's sharing limits as its status. One review lists every recipient and the findings each gets. Covert lines on one target in one turn show as a conflict.
- **Evidence:** `apps/player/src/security/CollectionActs.tsx:113-152` (text at `:141`).
- **Split:** UI and player-core.
- **Depends on:** BL-172, BL-174.

### BL-183 · Command palette and "what needs me" that start acts (M)
- **Problem:** the universal player has no command search, and inbox items open a place but cannot start the answer.
- **Acceptance:** ⌘K, Ctrl+K or a shell button opens the palette at both sizes. Typing "tariff steel China" offers a start that opens the act with the line staged. The empty state lists actionable inbox items, each with "Start." Every result is reachable by keyboard and announced.
- **Evidence:** `packages/ui-web/src/CommandPalette.tsx` (legacy only); `packages/player-core/src/notifications/inbox.ts:21-33`.
- **Split:** player-core (`commandIndex`, `InboxItem.intent`) and UI.
- **Depends on:** BL-172, BL-173.

## Not attempted

- Nothing was run. No build, test, server or screenshot. Every acceptance above is to be proved on the live surface at 390×844 and 1440×900.
- Not read: the engine's whip modelling, whether tariffs draw dice, the remaining-budget-authority selector, and which builders omit `provenance`. Each is marked UNCONFIRMED where it bears on the design.
- `CompareAuthorize` still draws options as cards, which the results-list rule also covers. It is left to BL-179's DESIGN reconciliation and not redesigned here.
