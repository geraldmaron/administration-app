# Scenario harness assessment, 2026-10-17

Trigger: the shipped scenario `the-review-only-our-exporters-face` (foreign-crisis, serious) reads as a random drop-off. Scope: relevance to game state, context for the President, persistence, and a dynamic tier beside the authored corpus.

Method: source read by this session, plus three independent read-only Codex passes (relevance, dynamic capability, persistence and context). Counts come from the 327-scenario shipped corpus (`content/corpus/shards`). File:line citations from Codex were spot-checked, not all re-verified; the ones marked unverified need a recheck before they go in a backlog item. No code was changed. Nothing here is committed.

## Verdict

The harness treats a scenario as authored prose plus an eligibility filter. The game needs it to be a **premise the board supports, a briefing that orients a President, and a matter that stays open until something closes it**. Three contracts are missing: premise, context, matter lifecycle. A fourth capability, assembled scenarios from live state, is allowed by policy and mostly buildable from parts that exist.

## Findings

### 1. Relevance to game state

- The director (`packages/content/src/scenario-director.ts`) decides whether a class is warranted. Subject pressure reads wars, disasters, outbreaks, unrest and pursuits against the player. Presidency pressure reads approval, Congress and removal direction. It never reads growth, unemployment, inflation or the fiscal balance.
- 207 of 327 scenarios sit in classes with no subject-pressure logic (economy, scandal and others).
- 99 of 327 have no gate beyond the clock (35 empty, 64 turn-only). Examples: `the-revenue-shortfall` and `the-run-that-started-at-one-counter` have only `turn ≥ 3`. 26 of 32 economy scenarios carry no macro gate.
- A gate does not prove the premise: a scenario about ignoring a court order is gated only on a judiciary existing.
- Premises are not rechecked at deal, display or commit. 16 of 327 declare supported recheck bindings.
- The audit measures that a gate exists (`scenario-grounding.ts`), not that it matches the prose, replies and impacts. A boost satisfies it without its source being present.

### 2. Context for the President

- `context` is optional in the schema (`scenario.ts:567`) even though all 327 happen to carry some. Nothing requires: who is involved by name, what the baseline was, why this desk, what Washington already did, what authority the President holds, what each reply sets in motion.
- The responsible office is inferred from the first cabinet official who speaks (`apps/player/src/decision/letterhead.ts:35`). A foreign-crisis memo was issued by Treasury because finance spoke first.
- Locus resolution picks a random neighbor of the counterpart (`scenario-locus.ts:285`), so the place can contradict the story. The shared-membership gate keeps the match but not which organization it was (`scenario-cast.ts` `sharedMembership`), so prose says "the compact" with nothing behind it. The world data names only NATO and G7 as US–UK shared organizations, and says neither is a customs union.
- The memo lede falls back to the `standing` paragraph when no narrator exists, so history precedes the decision (`Situation.tsx`). Operational dialogue sits under Background although J2 records Advisers as the default.
- The filing date comes from the campaign calendar, not the dispute (`conversation/filing.ts`).
- Authority citation is selective (`apps/player/src/decision/authority.ts`), against DECISIONS §8.12.
- A reply can understate the instrument it commits: the "identical review" reply commits economic rung 3, which the engine calls targeted sanctions.

### 3. Persistence

Persistence exists and is better than the doctrine says:

- A dealt scenario freezes its definition, counterpart, script, subjects, place and bound live objects in `authoredSnapshot`; answering records the reply and closes the decision case with history kept (`scenario-cases.ts`, `scenario-case-effect.ts`).
- Families (opener, beat, close) pin counterpart and place, lapse after 112 inactive days, and show in Record Storylines.
- Flags are stamped with turn markers; `agedAtLeast` gives delayed callbacks; subjects inherit through predecessors.

But it is thin where it matters:

- 23 of 327 scenarios (7%) belong to a family. Only 1 declares `subjects`; none declare `entities`.
- Authored reply flags: 878 set, 85 read, 797 unread (90.8%). The doctrine's 93% is stale; the problem stands.
- 228 of 991 replies (23%) have an identifiable continuation or state hook.
- Closing the decision does not mean the dispute is resolved, and the game has no universal "which disputes did my decisions leave open?" view. Calendar and the country file already consume pending records and are reuse points.
- Prose-only organizations cannot be retrieved later as entities.

### 4. Dynamic scenarios

- DECISIONS §7.1 forbids model calls and unreviewed prose at play time. It does not forbid deterministic assembly from audited parts; CONTENT_DOCTRINE.md:246 has a precedent.
- The engine already produces state-derived situations: cases and clocks, standing conditions and disasters, incidents, intelligence assessments, operator crises, war and oversight ledgers, consequences, resolution sequences. Casting already binds live reports, oversight matters, bills, vacancies and court proceedings and fills placeholders.
- Note: comments say fourteen statutory clocks; `summons/due.ts` declares fifteen (including `removal-beat`).
- Strongest failure mode: individually valid fragments combine into a false situation or double-charge harm. Alternative: more complete authored scenarios with narrower gates. Conclusion: **accepted with controls**.

## Contracts to adopt

### A. Premise contract (required on every scenario)

`premise` is one of:
- `state`: typed predicates (reuse the existing condition vocabulary plus macro readings: growth, unemployment, inflation, fiscal balance) that the prose, replies and impacts assume. Checked at selection, deal, display and commit; an invalid case is withdrawn without an ignored-matter penalty.
- `universal`: with a written reason. The audit caps these per batch.
- `introduces`: the scenario creates the board fact it describes (a bank run in prosperity), and writes that record atomically on deal.

Audit errors: missing declaration, unsupported predicate, predicate not covering the prose assertion, scope mismatch, boost without its source. Review verifies the prose matches the declaration.

### B. Context contract

Authored (required, with severity and class variants): bound participants, event, baseline, arrival reason, the presidential decision, escalation history and clock for serious and critical, per-reply next step, and four particulars or a written exception. Foreign matters require a transmission and a bound organization or instrument; force and intelligence require target and uncertainty; domestic matters require jurisdiction; legal matters require proceeding or office references.

Engine-derived so authors cannot get them wrong: responsible office (from the bound matter or action, not speaker order), current occupants, dates, prior related Record entries, available acts and costs, deadlines, authority-registry citations. Locus and organization must be bound, not randomly drawn.

### C. Open-matter lifecycle

`opened → escalated → resolved | lapsed`, separate from answered. Built on existing cases, subjects and causal history. Record owns transitions and the original choice; Brief shows actionable changes; Calendar shows deadlines and expected returns; Executive shows workload by responsible office; country files show bilateral matters. Every flag a reply sets must be read by a scenario, a matter, or a consequence, or the gate fails (today a warning).

### D. Template tier

Typed skeleton scenario with slots filled from one selected source occurrence (an incident, conflict, condition, report), validated by the same gate. Needs typed source references, assessed quantities with units and observation dates, boundary-fill audits, and frozen template and fragment versions in saves. Reuse casting, `bindStorySubjects`, `renderText`, `contentPin` and `authoredSnapshot`. Review compositions, not fragments. Authored set pieces stay.

## Phasing

1. Audit first: add the premise and context checks as warnings, run across all 327, publish the damage count.
2. Schema and casting: bind the organization and locus, derive the responsible office, add `premise`.
3. Open-matter lifecycle and flag-reader enforcement.
4. Rewrite the authoring skill and brief around the President's six questions and the new contracts.
5. Pilot rewrite of `the-review-only-our-exporters-face` and one economy scenario.
6. Template tier pilot on one class with a live source (for example natural disasters).

## Open decisions for the owner

- Whether premise and context violations become errors for the existing corpus or stay warnings with a migration worklist.
- Whether the template tier is in scope before the current program closes.
- Doc-sync: schema and cast changes require `docs/SCHEMA.md`, `docs/ARCHITECTURE.md` and `docs/CONTENT_DOCTRINE.md` updates in the same change.

## Unverified

Runtime rendering, whether the gate passes today, template review cost and balance impact, and semantic classification of every premise. Counts are structural; semantic examples are lower bounds.

## Phase 1 result (2026-10-17): premise and context warnings, run over all 327

Code: `packages/content/src/scenario-audit-premise.ts` with `scenario-audit-premise.test.ts`. Entry point `auditPremiseAndContext(defs)`. It is **not** wired into `auditScenarios`, so the publish gate and the pack warning budgets (`core.test.ts`, `pilot.test.ts`) are unchanged. Every finding is a warning. Checked: the new tests pass, the existing audit and pack tests pass (302 tests), eslint is clean, `tsc --noEmit` is clean. Nothing is committed.

| Rule | Scenarios flagged | What it means | Precision |
|---|---|---|---|
| `premise-class-ungated` | 68 of 327 | Economy 26/32, unrest 14/20, war 11/37, disaster 10/15, public-health 7/15 read none of their class's board state | High. Economy count matches Codex's independent 26/32 |
| `premise-ungated` | 16 | Prose asserts a flood, drought, outbreak or recession with no condition reading it (13 disaster, 2 economic, 1 outbreak) | Medium. Keyword based, undercounts economy |
| `context-body-unbound` | 15 | Prose relies on "the compact", "the union", "the alliance" with no bound organization or subject slot | Medium. Includes the exporters scenario |
| `context-first-person-abroad` | 1 after tightening | "our trucks" on counterpart ground (the exporters scenario) | The first version flagged 6; hand-check found most were legitimate ("our side of the crossing", "assets in our territory"), so the pattern was narrowed to place nouns |
| `context-thin-particulars` | 96 | Serious or critical week with fewer than four particulars | High |
| `context-missing` | 0 | Every shipped scenario has a context block | n/a |

Under the first run, 159 of 327 scenarios carried at least one finding; the narrowing removes up to five of those, so treat it as roughly 155.

Dropped on evidence: a "memo issued by a non-lead office" rule flagged 195 scenarios because the class-to-department list order is not a ranking. It was removed rather than kept as noise. The speaker-department rule already covers the real cases. Note that the economic instrument belongs to Treasury in the ownership table, so Treasury preparing the exporters memo is defensible for its retaliation reply, and weaker as a claim for the whole memo than first stated. The stronger defect is that the issuer is an accident of speaker order rather than a declared field.

What the rules cannot see (stays for phase 2): a premise that is stated in the replies or impacts rather than the opening; a gate that exists but does not match the premise; a reply that understates its instrument rung; stale premises between deal and commit; flags with no reader (the existing arc audit covers this as a warning).

Decision for phase 2: promote `premise-class-ungated` first. It is the highest-precision rule and the one that answers the strong-economy example directly.

## Phase 2 result (2026-10-17): premise field, organization binding, home frontier

Built, uncommitted. Content tests 1,061 pass; `tsc --noEmit` clean for content, player-core and apps/player; eslint clean on the new files; `verify-kit-current`, `verify-metric-registry` (after regenerating its report), `verify-file-size` and `verify-doctrine-metric-alignment` pass. `verify-dist-freshness` was not run: it compares committed dist, which cannot pass on an uncommitted tree. Browser verification does not apply (no rendered surface changed).

What changed:

- **`premise` on `ScenarioDef`** (`universal` with a reason, or `introduces` with what it opens). `premise-class-ungated` is now an **error** in `auditScenario` for a new scenario in economy, war, disaster, public-health or unrest that reads none of its class's board state and declares no premise. The 68 shipped ids and 14 bundled-pack, reference and fixture ids are in `scenario-premise-debt.ts`, which may only shrink; a test fails if an id no longer needs its exemption, or if any undeclared scenario is not on the list.
- **`sharedMembership` narrowing** (`orgKind`, `tradeCompetence`) and **`{{sharedOrganization}}`**, bound in `scenario-cast-bodies.ts` from the scenario's own gate, deterministic (widest membership first, then id). Using the token without the gate is an error.
- **`sharesBorder` condition** and **`locus.frontier: "home"`**: the frontier is dateline-bound to the counterpart's border with the player's own country. The schema refuses a home frontier without a border condition and off a counterpart-ground border site.
- Brief text, kit (`content/kit/*`), doctrine §6.2 items 8 and 9, and the metric-registry content-gate map updated. Cast helpers moved out of `scenario-cast.ts` to keep it under the 800-line limit.

Finding that changes the pilot: the United States shares no economic body with anyone in the world data. A test pins this (`orgKind: economic, tradeCompetence: customs-union` and `fta` are live for no counterpart). The exporters scenario's premise, a shared compact with customs checkpoints, therefore cannot be made true by naming the organization. The pilot rewrite has to change the premise to something the data supports, for example a bilateral measure with a land neighbor at a real frontier (`sharesBorder` plus `frontier: home` plus a `tradeMeasure`), or the data has to be extended with a sourced trade body.

Not done in this phase: the responsible-office field for the memo issuer, the open-matter lifecycle, deal-time premise recheck, reply-rung audit, and any change to shipped scenarios.

### Phase 2 review round (Codex, read-only, then fixed)

Codex reviewed the diff adversarially and found four real defects, all fixed with tests:

1. **Border weeks failed reachability.** No preview board made a land neighbor the firmest friend, so a `sharesBorder` week read as never live and the publish gate would have rejected it. Added `preview-board-border.ts` (one board per neighbor) and wired it into `auditReachability`.
2. **Two membership gates could name the wrong body.** The token bound to the first gate only, so reordering equivalent conditions changed the organization shown. The schema now allows one positive `sharedMembership` gate per scenario, and the token binds the body every gate accepts.
3. **Class gating accepted unrelated state.** An economy week gated on military readiness, a disaster week gated on a recession, a public-health week gated on a wildfire all passed. The check now requires the right reading: treasury for the economy metric, named economic, hazard or pandemic conditions, `warState` or `coalition` for war. Tightening moved two more ids into the debt list (one shipped, one reference), now 70 shipped and 14 bundled; no other scenario changed.
4. **Token enforcement missed some fields.** It skipped particulars and the locus descriptor. It now scans every player-visible string through the audit's own `passages`.

Codex also checked and found clean: no frozen-save parse or re-render regression through `authoredSnapshot`, `castStillBound` or reopen; no missed `sharesBorder` switch in apps, CLI, scripts or player-core; shared-body ordering is deterministic; locus RNG use is unchanged when `frontier` is absent.

Re-verified after the fixes: 1,065 content tests, kit current, metric registry, file size, doctrine alignment, eslint on touched files, player-core and player typecheck.

## Phase 3 result (2026-10-17): exporters pilot rewritten, reviewed, not yet published

The `the-review-only-our-exporters-face` arc is replaced by `arc-the-duty-at-the-frontier`, authored as one arc job (`frontier-duty-arc-3`) and approved by an independent reviewer on the third read. Published and baked in the commit that follows this section was written; see "Published" below.

**New premise.** The President's own tariff is answered by a land neighbor's retaliatory duty, collected at the shared frontier. The week gates on `tradeMeasure` (a real retaliation in the trade ledger) and `sharesBorder`, casts to the retaliating neighbor, and datelines the frontier on the neighbor's border with the United States (`locus.frontier: home`, "Canada–United States frontier" on a real board). Nothing in it depends on an economic body the world does not hold.

| Scenario | Role | Reads |
|---|---|---|
| `the-duty-collected-at-the-frontier` | opener | the retaliation, `sharesBorder` |
| `the-offer-to-lift-both-duties-together` | close | flag from "answer in kind", aged 5 turns |
| `the-draft-from-the-crossing-talks` | close | flag from "send the Trade Representative", aged 4 turns |

The third reply (cover the duty for exporters) sets no flag, so no orphan flag is created; the Record carries it through its remembered line.

**What the review round caught (three reads, each reject specific).** An opener that assumed trucks and a sector; an invented motive; a transmission claiming the duty hit the sector our tariff hit (the engine does not pick it that way); closes that promised a lifted tariff and a halved duty the engine cannot deliver; counter replies that could not fail; invented Treasury costs; a stability swing attributed to an unsigned order; a "quarter" that contradicted a thirty-day pause; a gender on a negotiator the world data does not supply. The closes now commit only agreements in principle and announcements; the rejoinders say the lift is an order the Trade Representative drafts for the President's signature.

**Harness findings from doing the work.**
1. Cross-cell families cannot pass the per-cell ingest gate: an opener and its closes in different cast cells each fail `family-without-*` and `flag-condition-never-set` because every cell is gated as its own job. The workable path is one `arc:` cell with all members in a single output. Ingest from a kit file cannot do this. This is a deficiency of the chain tooling.
2. `tradeBoards` built retaliation boards without a neighbor preference or the deeds later beats wait on, so a border-gated trade week and its closes read as unreachable. Fixed in `preview-board-trade.ts`.
3. The renderer capitalised a token after a dotted abbreviation ("U.S. Light vehicles", also in the shipped `the-tariff-in-response`). Fixed in `nation-article.ts` with a test.
4. The kit's `binding.universal` sidecar and the new `premise` field are two declarations of the same idea. The sidecar is stripped before the corpus; `premise` is durable and audited. They should be reconciled so authors state it once.

**Held, for the owner.**
- Publishing. The publish tail must stop when `content/kit` or `packages/player-core` already carry other uncommitted changes, and `content/kit` does (this work's regenerated kit). Publish also commits locally and rewrites the bake. Retiring the old opener and its close (`corpus retire`) belongs in the same step.
- A real token for the original tariff's sector (the retaliation record already stores which U.S. tariff it answers). Close 2 currently says "the tariff that started this" and prints "The one their duty answers" as a particular.
- Whether scenarios may lift or pause a tariff. The engine has `liftMeasure` for the control plane but no scenario-reply commitment for it, so the closes cannot lift a duty; they hand the President the order to sign.
- A non-blocking wording fix the reviewer suggested in a binding sidecar sentence (the joint-check stability reason). The sidecar never reaches players.

**Verification.** Content tests 1,065 pass; the arc passes the job gate (shape, audit, reachability, binding); `verify-kit-current`, `verify-file-size`, `verify-metric-registry` (report regenerated) pass. The scenario was rendered on a real board (Canada, 48% on light vehicles) and read by the reviewer before the final wording; the final wording was not re-rendered end to end after the last edit.

### Published (2026-10-17)

- `corpus publish frontier-duty-arc-3` added the three scenarios (corpus 327 to 330 across 18 shards). The errors it printed are pre-existing corpus-wide ones, not introduced by this batch.
- Retired `the-morning-both-reviews-end` and `the-review-only-our-exporters-face` (bodies and flags stay resolvable for cases already in flight). The retire safety check refused the opener because it counted the already-retired close as a live reader; fixed in `scenario-deeds.ts` (`readersOf` ignores retired readers) with a test.
- Baked into `packages/player-core/src/content/bundled-corpus.generated.ts` (330 scenarios, set `admin-2026w34`); `verify-bundled-corpus-current` and `verify-kit-current` pass. The kit listings (`CORPUS.md`, `DEEDS.md`, `NEEDS.md`) regenerated.
- The old arc's flags (`mirrored-the-compact-checkpoint-review` and friends) are no longer set by any drawable scenario. Cases already in flight keep their frozen bodies.
- Not pushed, not deployed. Local commits only, unsigned.

### Open items resolved (2026-10-17)

- **player-core suite against the new bundle:** 212 files, 1,671 tests pass.
- **Original-tariff token:** `{{ourTariffSector}}` follows the family opener's pinned retaliation (opener case occurrence to retaliation record to the answered U.S. measure), falling back to "the original goods". An independent review rejected two earlier versions of it (newest-retaliation guess; a lifted tariff still named); both are fixed and tested.
- **Lifted tariff:** a new `tariffInForce` condition keeps `the-draft-from-the-crossing-talks` from being dealt once the answered tariff has been lifted. Close 2 was revised in place in the corpus (same id), re-baked, and approved by the independent reviewer. The close gets `tariffInForce` because it proposes pausing that tariff; close 1 concerns the tariff the player's own in-kind reply imposed and is covered by BL-244.
- **Scenario-reply lift or pause:** decided against building it. The control plane already lifts a measure under its statute with a citation; a second lifting path inside scenario replies would duplicate it. Recorded as CONTENT_DOCTRINE section 6.2 item 10.
- **Errors the shipped corpus already carries:** 62 errors across 52 scenarios (`commit-time-flash-forward` 43, `family-without-opener` 5, `locus-ground-mismatch` 2, `manufactured-clock` 2, `generic-place` 1, `nation-name-in-generic` 1); none belong to this arc or the retired one. Tracked as BL-251.
- **Deferred to the backlog with acceptance and evidence:** BL-244 premise recheck at deal, display and commit; BL-245 burn down the premise debt (84); BL-246 families that span cast cells and standalone family members; BL-247 one premise declaration; BL-248 open-matter lifecycle; BL-249 declared responsible office; BL-250 template tier.
