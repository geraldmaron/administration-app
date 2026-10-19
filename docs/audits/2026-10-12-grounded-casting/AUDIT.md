# Grounded casting: where scenarios happen and who is in them

Adversarial audit, 2026-10-12. Branch `codex/simulation-depth-completion`. Read-only: no source was changed, nothing was built, no workspace tests, verify sweeps or Playwright were run. Every number below comes from a probe in `probes/` run against the committed `dist/` and the baked shards in `content/corpus/shards/` (322 scenarios, 18 shards). The TypeScript packs (`packages/content/src/packs/`) are not in these counts unless said.

Labels: **Fact** is observed in source or probe output this session. **Inference** is my reading of facts. **Recommendation** is what I propose.

## 0. Summary

**Outcome.** The owner's complaint is accurate and measurable. A home-ground scenario that does not author a city or state is placed by a uniform seeded draw over every state that has a city of the right kind. The place appears on the dateline and the map pin, but not in the prose, not in the effects, not in the Record, and not in the follow-up. Follow-ups re-draw. People are chosen by habit: 189 of 322 scenarios open with the Secretary of the Interior speaking, and the board's governors, members of Congress and committee chairs are almost never cast.

**Recommendation.** Replace the locus-plus-seeded-draw with one **binding** step that every scenario goes through: the scenario declares the place and people it needs as slots with hard requirements (physical facts its prose asserts) and soft preferences (board state), the binder fills them from data at raise time, and the result is stored once on the campaign. Prose tokens, map, effects, causal stamps, Record, director pacing and follow-ups all read that one record. Arcs (today's families) become **threads** that pin place and people, not only a nation. This generalizes a pattern the code already uses for six kinds of live record (report, trade measure, bill, judicial vacancy, court case, oversight matter); places and people are the missing kinds.

**Verdict.** Accepted with controls. The controls are a data slice first (the dataset cannot yet say where an industry employs people), a 20-scenario pilot read in three bound places each before the corpus is migrated, and a reachability measurement across seeds as a publish gate.

**Top risks.** (1) Mail-merge prose replaces drop-off prose. (2) Requirements stack until a scenario is never dealt. (3) The binder claims reasons the data cannot support. (4) The same governor becomes the campaign's quest-giver.

**Next actions.** Owner answers §11. Then slices S0 (data) and S1 (binding record) in parallel, S2 binder, a 20-scenario pilot, then migration.

## 1. The intent, challenged

The brief's four points hold up, with three corrections.

1. **"Never random" is the wrong target; "never unmotivated" is the right one.** Variety across campaigns is part of replay. A frost in the fruit belt should land in one of the states that has a fruit belt, chosen among them by the board and a seeded draw, not always the largest. What the owner objects to is a draw over places that do not fit.
2. **Persistence must be of what happened, not reuse for convenience.** The thread that opened in Toledo returns to Toledo. An unrelated scenario next month should not return to Toledo because Toledo is "bound". Persistence without a recency rule produces the same governor every month.
3. **"Feeds the dynamic system" needs a narrow interface.** Bound effects should land on records the engine already keeps (state marks, pending claims, governor disposition, city and sector rows, causal stamps), under the engine's existing caps, rather than as new pathways into approval. The approval-model audit (`docs/audits/2026-10-12-approval-model/AUDIT.md` §8) proposes rebuilding state approval; a binding that writes marks and lean survives that rebuild.
4. **"Reads as a place" conflicts with casting unless the facts travel with the binding.** Prose cannot hardcode a fact that varies by binding. Either the requirement guarantees it (a port scenario only binds port cities, so "the cranes" is true everywhere it lands), or a token or particular carries it.

## 2. The model as implemented

```
ScenarioDef
  cast.pick ............ who the counterpart nation is (tensest, closest, band, none, stricken, outlet, report, bill ...)
  locus { site, ground, descriptor, city?, state?, sector?, bind?: "condition" }   scenario.ts:186-205
  family { id, role } .. arc membership                                          scenario.ts:541-552
  opening[].speaker .... cabinet roleHint | narrator | player                     scenario-speaker.ts:28, :84
        |
        v
bindCounterpart() ......... nation only; family members read the opener's nation   scenario-cast.ts:158
scenarioLive() ............ bind:"condition" needs a matching live condition       scenario-cast.ts:388-399
        |
        v
castBound()
  boundPlace() tokens ..... {{city}} from AUTHORED locus.city only                 scenario-text.ts:165-187
                            {{state}} from bound condition, else AUTHORED state     scenario-text.ts:144-150
                            {{governor}} from that state
  resolveLocus() .......... 1. bind:"condition" -> condition's place               scenario-locus.ts:82-117
                            2. authored city -> pin
                            3. capital -> Washington, D.C.
                            4. home non-capital -> seededState(seed, def.id):       scenario-locus.ts:264-272
                               UNIFORM over states with a city of the site's kind
                            5. foreign non-capital -> offset from capital,
                               "Coastal district, <nation>"                         scenario-locus.ts:208-224
        |
        v
case raise .............. locus frozen in authoredSnapshot while open             scenario-cases.ts:113
Situation.tsx ........... prints placeName + descriptor                            Situation.tsx:174-180
        |
        v  (reply committed)
decisionProvenance ...... entities = [USA, counterpart]; NO locales                conversation-provenance.ts:21-37
gazetteerEffects ........ city/state/sector from AUTHORED locus only               scenario-gazetteer.ts:54-66
domestic signature ...... routeDomestic over ALL states by affinity                domestic-signature.ts (engine):167
family run .............. pins counterpart nation only                             scenario-families.ts:28-47
Record eventPlace ....... reads causal locales; none -> camera "us"                event-place.ts:29-41
```

**Fact.** One scenario can therefore have four different places: the prose place (authored city/state or the condition's state), the map pin (the seeded state when nothing is authored), the effect place (authored only), and the Record place (none, so the whole country). They agree only when the writer authored a city or state.

**Fact.** The engine already places its own world events with data. `placeUsOnset` (`packages/engine/src/us-placement.ts:63`) gates acute conditions to the hazard eligibility table (`packages/world/src/dataset/state-hazards.ts`), keeps hurricanes to port cities, and weights by population. The scenario layer does not reuse this for scenarios that create their own event.

## 3. Measured findings

Probe commands are in §12. Counts are over the 322 baked scenarios.

### F1. Most home scenarios are dropped by a draw that ignores fit

**Fact.** 296 scenarios stand on home ground; 167 sit at `capital` (Washington). Of the rest, 104 home-ground, non-capital scenarios author no city, no state and no bind, so `seededState` places them. Only 22 author a city, 18 a state, 2 a sector, 7 bind to a condition (`corpus-binding.mjs`).

**Fact.** The draw is uniform over states with a city of the site's kind (`scenario-locus.ts:240-272`). Six seeds of `the-yard-that-builds-the-boats` ("one company town", "the only slipway in the country"): Virginia Beach, Providence, Los Angeles, Savannah, Los Angeles, Houston. On seed `probe-a` the unplaced economy, disaster and unrest scenarios land as follows (`seed-placement.mjs`):

| Scenario | Landed | Fit |
|---|---|---|
| `the-frost-that-took-the-belt` ("most of the fruit belt") | Little Rock, AR | none in the data says fruit |
| `the-campus-occupation` | Fargo, ND | a city site; any city qualifies |
| `the-provinces-the-writ-no-longer-reaches` | Little Rock, AR | "uplands", "garrison town" |
| `the-fleet-that-limped-on-half` | Gulfport, MS | port |
| `the-clinics-that-never-got-the-difference-back` ("rural clinics") | Huntington, WV | |

**Inference.** The prior places review (`docs/audits/2026-10-10-map-first/e5-places-review.md`) left these on the seeded draw because "each fits several states". That was the right call about authoring a single state and the wrong conclusion for the draw: "fits several states" is an eligibility set, and the draw ignores it. BL-65's acceptance ("US-area sites resolve to a seeded state or city") encodes the drop-off the owner is rejecting.

### F2. Follow-ups do not return to the place

**Fact.** A family pins only `counterpart: NationId` (`packages/engine/src/scenario-families.ts:31`). A domestic family's counterpart is the United States, so the pin says nothing about where. `seededState` keys its draw on the scenario's own id (`scenario-locus.ts:269`), so every member of an arc draws its own state.

**Fact.** In the rearmament arc, opener then close on six seeds: Indianapolis to Huntington WV, Chicago to Manchester NH, Des Moines to Hartford, New York to Burlington VT, Cincinnati to Louisville, Jackson MS to Boston. Across the six families whose opener stands on home ground, opener and later member landed in the same place on 14 of 36 seed-pairs; 12 of those 14 are Washington to Washington.

**Fact.** Flag callbacks carry most of the corpus's continuity, not families: 102 setter-to-reader pairs, of which 9 are inside one family and 97 stand on home ground. Excluding pairs where both sit at the capital, the follow-up landed in the setter's place on **9 of 188** seed-pairs (`flag-callbacks.mjs`). Example: `the-crossing-at-the-gate` sets `held-arrivals-at-gate`, read by `the-held-line`: Bellingham to Buffalo, Detroit to Buffalo, Burlington to Detroit, Las Cruces to Tucson.

### F3. Flags are reused across unrelated stories

**Fact.** `split-the-budget-line` is set by `the-rearmament-line-that-ate-the-clinics` (a defense budget choice) and gates `the-bridge-the-flood-took-with-it`, which opens "Five weeks on, the county bridge the flood took is still in the river" with no flood condition. `sent-the-team`, set by `six-at-the-checkpoint` (Washington), gates `the-crew-still-on-the-levee`, authored to St. Louis. **Inference.** Without a thread, a flag is the only handle a follow-up has, so writers reach for whatever flag exists, and the fiction asserts a history the board never had.

### F4. Authored cities are undeclared set pieces that repeat

**Fact.** St. Louis is the authored city of three scenarios, Seattle and Philadelphia two each (`corpus-binding` city tally). `the-span-they-reopened-too-soon` drops a span of Seattle's elevated line in "last night's quake" with no condition gate at all. `the-price-of-bread-in-the-north` puts a federal bread subsidy in Montana in every campaign. **Inference.** This is the opposite failure from F1: a fixed place, so the same city every run and an event the board does not have. `setPiece` is declared on 0 scenarios.

### F5. People are chosen by habit, not jurisdiction

**Fact.** Opening speakers are cabinet chairs, narrator or player only (`scenario-speaker.ts:84-92`). 189 of 322 scenarios open with `roleHint: "interior"`, which the US charter resolves to `role-interior-minister`, the Secretary of the Interior (`packages/world/src/dataset/usa.ts:62`), whose catalog jurisdiction is `public-lands` (`packages/engine/src/institution-catalog.ts:55`). A keyword screen finds public lands, parks, tribal matters, leasing, dams, water rights or wildfire in only 4 of those 189 openings. Resolved on `probe-a`, the Interior Secretary opens the campus occupation (Fargo), the dock strike (Houston), the fever cluster and the northern border checkpoint.

**Fact.** The board seats people the corpus never casts. On `probe-a`: 8,053 people (1,558 American), 50 seated governors, 535 members of Congress each with a state and seat, 13 committees with chairs. `{{governor}}` is filled by the binder (`scenario-text.ts:56-67`) and used by **0** scenarios; 8 mention a governor in prose without the token. No token exists for a House member, a senator, a committee chair, an agency head or a mayor. Mayors are not modeled at all.

**Fact.** A governor who "wants you to pay" (`the-schools-the-governor-wants-rebuilt-as-they-were`) cannot be moved by the answer. Outside the collection-report cast (0 shipped), a position reply has no field that writes a state mark, opens or answers a state claim, or moves a governor's disposition (`scenario.ts:395-450`).

### F6. Effects and the Record do not follow the place

**Fact.** `gazetteerEffects` lands city, state lean and sector only on the authored `locus.city`, `locus.state`, `locus.sector` (`scenario-gazetteer.ts:54-66`). A condition-bound scenario's `stateLean` reaches no state. 6 of 977 replies carry `gazetteer`, 17 carry `domestic`. `routeDomestic` spreads a domestic signature over every state by affinity with no term for the scenario's own place (`packages/engine/src/domestic-signature.ts:167`).

**Fact.** A committed decision is stamped with nations only (`conversation-provenance.ts:26`). The Record frames an entry by its first causal locale (`event-place.ts:29-40`), so every domestic scenario decision frames the whole country. The place survives only in the open case's snapshot (`scenario-cases.ts:113`). `stateGrievance` with `scope: "locus"` reads the authored state only and is used by 0 scenarios.

### F7. Foreign ground ignores the gazetteer it has

**Fact.** The dataset carries 538 cities, 338 of them outside the US across 195 nations (Hamburg, Munich, Lagos, Kano, Mumbai, Monterrey). A foreign `coast`, `interior` or `city` site never uses them: Germany resolves to "Coastal district, Germany", Nigeria to "Interior, Nigeria", as offsets of 0.5 to 1.6 degrees from the capital (`scenario-locus.ts:208-224`), which can land off the coast or across a border. A `border` site picks a neighbor uniformly per scenario and turn, so two border weeks against Brazil named Venezuela and Uruguay. `pickNeighbor`'s comment says it prefers "the neighbor the player is most entangled with"; the code sorts by id and rolls uniformly (`scenario-locus.ts:274-284`).

**Fact.** Four home-ground scenarios use the `chokepoint` site, and the United States' chokepoint is the Panama Canal, so `the-fuel-price-spike` and `the-case-that-came-back-negative-twice` place a domestic event in Panama.

### F8. The prose was written world-neutral and still reads that way

**Fact.** Excerpts: "We have owned that paper mill since the last government" (`the-mill-that-cannot-make-payroll`); "Three district offices in the uplands have moved their staff to the nearest garrison town" (`the-provinces-the-writ-no-longer-reaches`); "The district commissioner at the northern checkpoint called at seven" and "its head teacher has already said yes" (`the-border-empties`); "Renewal of the bread subsidy comes up with the budget" (`the-price-of-bread-in-the-north`). **Inference.** These were written when the player could be any government. With the seat fixed as the US presidency (AGENTS.md §5), they describe institutions the United States does not have, so no binding could ground them; they need rewriting or retiring, not tokens.

### F9. The kit cannot teach the binding vocabulary that exists

**Fact.** `content/kit/BRIEF.md:169` lists the placeholders without `{{state}}`, `{{governor}}`, `{{season}}`, `{{sinceDeed}}` or `{{outlet}}`; neither `bind: "condition"` nor the `stricken` cast appears anywhere in the kit; rule 17 (`BRIEF.md:225`) still calls `ground` optional, which the schema made required (`scenario.ts:195`). `CONTENT_DOCTRINE.md` §6 still says 18 of 303 scenarios bind a city; the corpus now has 22 of 322.

### F10. Smaller defects found on the way

- `Portland, ME, Maine`: the place name repeats the state for cities whose dataset name carries one.
- The unbound-disaster rule is a warning (`scenario-audit-bind.ts:152-162`); 9 home scenarios gate on an active condition without binding to it.
- The director paces by class and severity (`CLASS_COOLDOWN = 6`, `scenario-director.ts:57`) and has no notion of a place or person recently featured.

## 4. Reading the shipped scenarios

Fifteen read in full (`read-scenarios.mjs`). What separates the ones that read as a place from the drop-offs is whether the place was **chosen by what is happening** and whether a **person with standing** is in it.

**Read as a place.** `the-grid-that-cannot-promise-the-morning-peak` binds to the running winter storm, names "the grid serving {{state}}", and gives the operator's reserve reading every five minutes. `the-axle-plant-notices-in-a-market-with-no-openings` binds Akron and fills it: 1,850 notices, "one opening for every three people", "The union local has called its meeting for the east gate". `the-schools-the-governor-wants-rebuilt-as-they-were` binds to the quake and has a governor with a demand. These are the model, and each is still incomplete: the governor is a role, not the seated person; the answer moves nobody; the Record forgets where it was.

**Dropped off.** `the-yard-that-builds-the-boats` ("Four thousand jobs, one company town") lands in Los Angeles. `the-frost-that-took-the-belt` has no state and no person; the Interior Secretary speaks for growers. `the-quota-that-emptied-the-docks` ("a coastline deciding whether fishing is still a living here") lands on any port. `the-dockworkers-who-wont-cross-each-other` names no port, no union, no employer. `the-campus-occupation` ("Three thousand students have held the university's central lawn") names no university, governor or member, and the Interior Secretary handles it.

**Wrong history.** `the-border-empties` casts the *closest* nation and has families arriving "toward us" through a northern checkpoint that lands in Detroit, Duluth or Tucson; its follow-up `the-town-on-the-wrong-side-of-the-seal` casts the *tensest* nation and lands in a different state on 3 of 4 seeds. `the-bridge-the-flood-took-with-it` follows a defense budget choice (F3).

**Inference.** The drop-off is three missing things at once: no reason for the place, no person who belongs to it, and no memory of it afterward. Fixing only the first (better placement) leaves scenarios that are correctly located and still about nobody.

## 5. Adversarial questions

**Templated casting, set pieces, or a hybrid?** Set pieces give the best prose and are wrong as the default here: they fire regardless of the board (F4), repeat across campaigns, and covering 50 states by class would need far more content than 322. Templated casting with unmotivated draws is what we have. The answer is a hybrid: templated slots with data eligibility by default, and a small declared set-piece tier for stories that only exist in one real place (a named river's levee system), gated on the board and owned.

**Reachability.** Every hard requirement shrinks the boards that can deal a scenario. A refinery fire that requires a refining state *and* an active hurricane is rarely live. Rule: a requirement is hard only when the prose asserts a physical fact it guarantees (cranes need a port); everything else is a scored preference. The gate measures the eligible set on the preview board and the deal rate across seeds, and a scenario whose eligible set is one place must declare itself a set piece.

**Pacing.** A persistent binding plus scoring that favors "the governor most opposed to you" picks the same governor every month. The director gets a place and person recency term, read from the binding records: damped inside a window, exempt for thread members (whose whole point is return).

**Saves and an eight-year campaign.** The save is the campaign JSON (`packages/player-core/src/persistence/payload-codec.ts:2-4` notes about 12 MB at 208 weeks). A binding record is a few ids and a short reasons list per raised decision; I did not measure the added bytes. Officeholders change over eight years: governors lose, members retire, people die. A binding stores both the office and the person, and a later thread member reads either "the governor now" or "the governor then", declared per slot. A thread that outlives its person's office says so in a token (`{{governor.then}}`), never by silently swapping names.

**Foreign ground and casting neutrality.** AGENTS.md §5 forbids naming a nation in a non-set-piece scenario and forbids rank-plus-invented-surname. A binding resolved per campaign from the dataset is the same mechanism as `{{counterpart}}`: the prose never contains the name, the board supplies it. Foreign cities come from the gazetteer by kind; foreign people come from seated offices only, and I did not trace which foreign offices the dataset seats as persons (`probe-a` holds 45 Turkish persons; their offices were not traced), so foreign person slots need validation before they are offered. NPC-world events abroad have no state-level placement today; `placeUsOnset` returns nothing outside the US (`us-placement.ts:70`). A foreign binding falls back to dataset city, then capital, never an offset.

**What the writer needs, and how the gate checks it.** A writer needs a card per slot listing exactly what the binder will supply (name, kind, size band, state, top economy axes, hazards, live condition caption; for a person, office, party, disposition band, how long in office) and what it will not. The gate checks that every place-asserting noun is backed by a requirement, every name is a token, every callback reads a thread, and every speaker has jurisdiction. A reviewer reads each scenario rendered in three different bound places.

## 6. Recommended redesign: the binding contract

### 6.1 What a scenario declares

`locus` is replaced by `where`, `who` and `thread`. Sketch (TypeScript shape, not final):

```ts
where: {
  ground: "home" | "counterpart";
  scale: "seat" | "facility" | "city" | "district" | "state" | "border" | "water";
  from:
    | { kind: "condition"; condition?: ConditionKind }   // the live engine record's place
    | { kind: "record"; record: "claim" | "emergency" | "report" | "bill" | "order-case" }
    | { kind: "thread"; thread: ThreadId }                 // inherit an earlier binding
    | { kind: "fit" }                                       // choose from data
    | { kind: "set-piece"; city?: CityId; state?: StateId }// owned, declared, gated
  requires?: {                                              // hard: what the prose asserts
    cityKinds?: CityKind[]; sectors?: SectorId[]; hazards?: DisasterKind[];
    federalSite?: InstitutionId; frontier?: "north" | "south"; minPopulation?: number;
  };
  prefers?: PlaceTerm[];                                    // soft, closed vocabulary, scored
};
who?: Array<{
  slot: string;                                             // "governor", "member", "chair", ...
  office: "governor" | "senator" | "house-member" | "committee-chair"
        | "secretary" | "agency-head" | "mayor";
  of: "where" | { domain: string };                         // the bound place, or a jurisdiction
  holder: "now" | "then";                                   // for thread members
  prefers?: PersonTerm[];
}>;
thread?: { opens: ThreadId } | { continues: ThreadId } | { closes: ThreadId };
```

Opening speakers stay cabinet, narrator or player, with one change: the cabinet speaker is derived from the scenario's domain through the institution catalog's `jurisdictions` unless the writer argues otherwise in the brief. A bound person outside the cabinet speaks through a relayed document, the way a foreign government does today (`ScenarioTransmission`, `scenario.ts:235-251`): the governor's letter, the member's call readout. This keeps the presentation rule that a governor does not text the President.

### 6.2 Eligibility from data

Hard requirements filter against facts the dataset holds or will hold after slice S0:

| Requirement | Source today | Gap |
|---|---|---|
| port, industrial, border, financial city | `City.kind` (US: 42 port, 34 industrial, 12 border, 6 financial, 105 interior) | none |
| hazard | `STATE_DISASTER_ELIGIBILITY` | no frost or fruit; drought, winter storm exist |
| live condition place | `NationCondition.state/city` via `placeAt` | none |
| federal facility | `packages/world/src/dataset/federal-sites.ts` | none |
| House district and its place name | `worldDistricts`, `DISTRICT_PLACES` (436) | no city-to-district link; derivable at bake from the vendored district topology (needs validation) |
| industry presence by state | six economy axes on `State.character.economy` | **no state-by-sector table**; "where auto employs people" cannot be answered today |
| towns below metro size | none in the gazetteer | 771-line Natural Earth US places file is vendored (`scripts/vendor/ne-us-places.tsv`) but not a dataset row |

Eligibility is computed once per turn per distinct requirement set and cached, the same way `liveSelectors` binds each distinct cast once per turn. A scenario is live only if its eligible set is non-empty; place scoring runs only for the scenario actually raised, so the pool cost stays what it is.

### 6.3 Scoring

Score each eligible place, deterministically, from a closed vocabulary: requirement strength (sector share or city size, log-scaled), live condition severity there, net state grievance (`state.marks`), open pending claims, governor disposition and party against the administration, how close the state's lean is to even, state approval, whether the state's delegation sits on the committee of jurisdiction, and a recency penalty for any place featured in the last N weeks. Then draw among the top three, weighted by score, from a stream keyed on the occurrence (not the scenario id), so the same scenario in two campaigns lands in different fitting places and the same campaign replays identically. People slots score the same way among officeholders who fit `of` (the governor of the bound state is one person; "a member whose district is affected" is several).

The binder keeps the winning terms as `why`: "port city", "auto is 2nd-largest axis here", "governor opposed (disposition 0.31)", "drought running since week 12". The writer's card and the Situation screen read `why`; the prose never invents a reason that is not in it.

### 6.4 The binding record, stickiness and persistence

```ts
type Binding = {
  occurrence: string;              // scenarioOccurrenceKey
  scenario: string; raisedTurn: number;
  place: { nation; state?; city?; district?; sector?; condition?; lat; lon; name; precision };
  people: Record<string, { person: PersonId; office: string; seat: string }>;
  why: readonly BindReason[];
  thread?: ThreadId;
};
campaign.bindings: Record<string, Binding>;
campaign.threads: Record<ThreadId, ThreadRun>;   // replaces scenarioFamilies
// ThreadRun = today's ScenarioFamilyRun + place + people (pinned at the opener)
```

1. **Written at raise**, frozen into the case snapshot as today's locus is, and kept after the case closes, because a lapsed decision also happened somewhere.
2. **Threads pin place and people** when the opener is answered (DECISIONS §7.8's timing kept). Members inherit them and may add slots relative to them (the House member for the inherited city's district).
3. **A callback that asserts continuity must read a thread.** A scenario gated on another scenario's flag, on home ground, with callback language ("again", "last time", "the same", "since you") and no `thread.continues` is refused. Accidental cross-story flags (F3) stop being a way to build an arc.
4. **Standalone scenarios bind fresh** each occurrence, under the recency penalty.
5. **Office turnover.** `holder: "now"` resolves the current officeholder; `"then"` resolves the pinned person and fails liveness if they are dead, which withdraws the scenario rather than addressing a dead governor.

### 6.5 What reads the binding

| Reader | Today | After |
|---|---|---|
| Prose tokens | `boundPlace` from authored fields | from `Binding`; every slot is a token, plus fact tokens for name-level facts |
| Map pin, Brief camera | `resolveLocus`, seeded | `Binding.place` |
| Gazetteer effects | authored city/state/sector | bound city/state/sector |
| Local reach (new) | none | bounded state mark, claim opened or answered, governor/senate-seat disposition step, delegation disposition; under `STATE_ROUTE_CAP` and `STATE_ROUTE_TURN_CAP` |
| Domestic signature | all states by affinity | same, plus the bound state as the focal state |
| Causal stamp | nations only | `locales: [state, city, district]`, `entities: [...nations, ...personIds]` |
| Record timeline | frames "us" | frames the bound state (no Record code change: `eventPlace` already reads locales) |
| Record arcs | title, disposition | plus place and people |
| Person dossier | none | "dealt with the President on ..." via causal entities (`causality.ts:297` already filters by locale; entities are the same shape) |
| Director | class and severity pacing | plus place and person recency |
| Conditions | `stateGrievance scope:"locus"` reads authored state | reads the binding; new `boundPerson` gate (disposition, party, tenure) |

### 6.6 What the brief and kit give the writer

For every slot the brief prints a **place card** or **person card**: what is guaranteed (from `requires`), what may vary (from the eligible set, with three sample bindings rendered from preview boards), and the tokens available. Example card for `where: { scale: "city", requires: { cityKinds: ["port"] } }`: guaranteed a port metro of the stated size band in a coastal state; varies across 42 US ports; tokens `{{city}}`, `{{state}}`, `{{governor}}`, `{{member}}`; facts in particulars: population band, top two economy axes, live condition caption if any. The kit's placeholder list and rules 6, 17 and 38 are rewritten from the token registry rather than by hand, so F9 cannot recur.

### 6.7 Prose rules and gate checks

| Rule (finding kind) | Check | Severity |
|---|---|---|
| `asserted-feature-unbacked` | place nouns (port, dock, crane, refinery, mill, mine, plant, orchard, levee, border crossing, coast) must map to a `requires` that guarantees them; generalizes `locus-asserts-landform` | error |
| `callback-without-thread` | flag-gated home follow-up with callback language and no `thread` | error |
| `speaker-outside-jurisdiction` | opening speaker's department lacks the scenario's domain in the institution catalog | error for Interior outside public lands; warning otherwise |
| `single-place-needs-set-piece` | eligible set of one place without `where.from.kind: "set-piece"` and an owner | error |
| `unbound-token` | a token whose slot is not declared | error (parse) |
| `home-foreign-institution` | home-ground prose naming institutions the US lacks (district commissioner, provinces, garrison town, state-owned firm as default) | error |
| `unbound-disaster` | promoted from warning | error |
| reachability | eligible set non-empty on the preview board; deal rate measured on N seeds | publish gate |
| three-place read | reviewer reads the scenario rendered in three bound places | review record |

### 6.8 How bindings feed metrics and the Record

The binding changes **where** existing effects land and adds one small reach; it does not add a metric. A reply declares `local: { mark?: { signature, valence, weight }, claim?: "open" | "answer", person?: { slot, disposition: ±step } }`. These compile to the engine's existing `GrievanceMark`, `PendingClaim` and governor or senate-seat disposition, which already feed state lean, state approval and the delegation. Every packet from the decision carries the binding's locales and person ids, so the Record, the map and the dossier can trace a movement in Ohio to the Toledo decision. A balance-harness run is required before slice S3 lands, because concentrating effects on one state changes state lean distributions.

### 6.9 Foreign ground and world events

Foreign `city`, `coast`, `interior` resolve to a gazetteer city of fitting kind in the counterpart nation, then the capital; the offset and "Coastal district" labels are retired. `border` scores neighbors by tension, conflict and relationship with the player and pins the result in the thread. Home ground cannot use `water`/`chokepoint`; a US maritime story binds a port city. Foreign person slots are offered only for offices the dataset seats per campaign, after validation.

### 6.10 Pacing

Director gains `placeRecency` and `personRecency` multipliers read from `campaign.bindings`, with thread members exempt and a cap on how many open threads may share a person.

## 7. Migration of the 322

No compatibility is kept. Each scenario is rewritten to the new shape or retired; the probe in `probes/corpus-binding.mjs --list-unplaced` produces the worklist.

1. **Capital, institutional (167).** Keep at `seat`. Re-check each against the prior review's note that 14 capital sites are not the seat of government (harbor concert hall, bank queue, central hospital); those move to `fit`.
2. **Home, unplaced (104).** Rewrite to `where.from: fit` with requirements derived from the prose, a person slot where a person with standing exists, and prose that uses the tokens. Retire those whose premise is not American (F8: the state-owned mill, the bread subsidy, the uplands provinces), or rewrite them around a real US institution.
3. **Authored city or state (22 city, 18 state).** Convert to `fit` with matching requirements unless the place is the story; those become owned set pieces with a condition gate. St. Louis keeps at most one.
4. **Condition-bound (7).** Convert directly; add the governor as a person slot and give replies `local` reach where the prose already implies it.
5. **Foreign ground (26).** Rebind to gazetteer cities and scored neighbors.
6. **Speakers (189 Interior openings).** Re-cast by jurisdiction: a mechanical proposal from the domain, then a human pass.
7. **Arcs.** Convert the 11 families to threads. Review the 97 home-ground flag callbacks: those that are one story become threads; those that only borrowed a flag (F3) get their own gate or are retired.
8. **Packs.** The TypeScript packs (core, pilot) go through the same pass.

Through the writers' room, in batches, each with an independent review (AGENTS.md §5).

## 8. Build slices

| Slice | Content | Acceptance |
|---|---|---|
| **S0 data** | state-by-sector presence table with sources; city-to-district link at bake; decide the town tier (§11 Q1) | dataset validator covers the new rows; `stat-consumers.ts` names each consumer; each figure cites a source opened by the author |
| **S1 record** | `Binding`, `ThreadRun` on `Campaign`, replacing `scenarioFamilies`; save round trip | unit: a thread member resolves to the opener's place and people on six seeds (100%, against today's 14 of 36); save, load, continue keeps bindings |
| **S2 binder** | `where`/`who`/`thread` schema, eligibility cache, scoring, top-three draw, recency, tokens, `resolveLocus` retired | port requirement binds only port cities on 50 seeds; no standalone with three or more eligible places lands in one place on more than 40% of 50 seeds; foreign city site never yields "Coastal district"; home ground never yields Panama |
| **S3 effects** | gazetteer to the bound place, `local` reach, provenance locales and entities, director recency | Record row for a bound decision frames the bound state; the bound state's marks carry the signature; balance harness run and recorded |
| **S4 gate and kit** | §6.7 rules with `-proof` twins; reachability over seeds; kit regenerated from the token registry; doctrine §4 and §6 rewritten | each new rule fails on a fixture; kit lists every token the binder fills |
| **Pilot** | 20 scenarios across classes migrated and reviewed with the three-place read | owner reads the pilot in the running game before S5 and S6 |
| **S5 surfaces** | Situation shows the place card (`why`) and people chips linking dossiers; Record arcs show place and people; map pins persist after close | e2e at 390x844 and 1440x900 at the integration checkpoint |
| **S6 migration** | §7 | zero seeded draws on home ground; zero Interior openings outside its jurisdiction; every home callback with continuity language reads a thread |

## 9. Doc-sync surfaces

Under CLAUDE.md's doc-sync contract: `Campaign` state changes (`scenarioFamilies` replaced, `bindings` added), so `docs/SCHEMA.md` and `docs/ARCHITECTURE.md` change in the same commit as S1. Also: `docs/DECISIONS.md` §7.6 (set pieces) and §7.8 (families become threads that pin place and people); `docs/CONTENT_DOCTRINE.md` §4, §6.2, §10 and the stale count in §6; `content/kit/BRIEF.md` rules 6, 17, 38 and `content/kit/DOCTRINE.md`; AGENTS.md §5 (people reach prose only as board tokens; domestic relayed voices); `packages/world/src/dataset/stat-consumers.ts` for any new world field; `scripts/verify-scenario-dc-fallback.mjs` and its baseline replaced by a binding gate, `scripts/verify-locus-ground.mjs` rewritten; `docs/DESIGN.md` if the Situation and Record surfaces change; `docs/BACKLOG.md` BL-65's acceptance rewritten (it currently accepts the seeded draw), plus new items for F3, F7, F10. I did not edit any of these.

## 10. Strongest failure mode, best alternative, verdict

**Strongest failure mode.** The prose turns into a mail merge. Tokens fill names, but sentences built to survive any of 42 ports say nothing a port would recognize, and the binder's `why` claims reasons the data cannot support ("auto employs people here" read off a six-axis industrial share). The drop-off feeling is replaced by a form-letter feeling, at the cost of a corpus rewrite. Second: requirements stack until good scenarios are rarely dealt.

**Controls.** Hard requirements only for asserted physical facts; S0 before any sector requirement is offered; the three-place read in review; a deal-rate gate; the pilot read by the owner in the game before migration.

**Best alternative.** Place-authored set pieces as the primary model: each scenario written for one real place, variety from pool size. Better sentences, true specificity. Rejected as the default because it ignores the board (a Seattle quake with no quake), repeats the same city every campaign, and needs content volume far beyond 322 to cover the country; kept as a declared tier.

**Verdict: accepted with controls.** The binding record, threads, provenance and jurisdiction rules are ready to build. The scoring vocabulary and the sector requirement **need validation** against S0 data and the pilot.

## 11. Owner questions

1. **Town tier.** (a) Metros and district place names only; (b) add the vendored Natural Earth places as a town tier, so "one company town" can bind; (c) source a county table. Recommend (b): the file is already in the repo and gives towns below metro size.
2. **Mayors and local figures.** (a) Offices without names ("the mayor", "the union local's president"); (b) seat mayors for the 200 cities as generated persons; (c) also generate local figures per binding, stored on it. Recommend (b) plus (a) for local figures, revisiting (c) after the pilot.
3. **Bound people's voice.** Allow a relayed document from a governor or member (letter, call readout) as the domestic counterpart of a foreign transmission? Recommend yes.
4. **World-neutral premises.** Retire or rewrite scenarios built on institutions the US lacks (F8)? Recommend retire where the premise is the institution, rewrite where it is incidental.
5. **Set-piece tier.** Allow a small number of owned scenarios bound to a named real place, gated on the board? Recommend yes, one per place.
6. **Local reach.** Should an answer move the bound governor's or senator's standing, and how far per decision? Needs a balance run before a number is set.
7. **Thread pin timing.** Keep pinning at the opener's answer (DECISIONS §7.8) or at its raise? Recommend answer, as today.

## 12. Probes

All read-only, run from the repository root with `node`. None writes outside stdout.

- `probes/corpus-binding.mjs` counts grounds, sites, place fields, binds, casts, families, token use, speakers, gazetteer and domestic replies, governor mentions. `--list-unplaced` prints the migration worklist; `--list-families` prints arc membership.
- `probes/seed-placement.mjs [ids]` deals named scenarios on six seeds through `resolveLocus` from `packages/content/dist`, checks family place persistence, and prints landed states with their top economy axes.
- `probes/flag-callbacks.mjs` pairs every flag setter with its readers and measures same-place persistence on four seeds.
- `probes/read-scenarios.mjs ids | "" pattern` prints a scenario's cast, locus, conditions, opening and remembered lines for reading.

The speaker resolution (F5), foreign resolution (F7) and person-graph counts were one-off `node --input-type=module` calls against the same `dist/` using `castBound`, `resolveLocus` and `sealedCampaign("probe-a")`; their output is quoted where used.
