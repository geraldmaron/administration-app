# Phases I to K: people, Congress and the courts

Added to the simulation-depth program on 2026-10-11 at the owner's direction. The owner asked for:

- a relationship system between the people in the game
- a President who can move those relationships, so that a less divisive President who looks for common ground with the other party, or with particular members, can sway their votes
- Congress and Courts screens rich with data and visualizations
- much more about how the courts actually operate

Owner decisions recorded the same day:

- all 535 members of Congress are people who vote individually
- the work is folded into this program (BL-112) rather than opened as a new one
- the first deliverable is this design and its backlog items, with no code

Items: BL-120 (relationship ledger), BL-121 (members vote one by one), BL-122 (Congress screen), BL-123 (courts as a process), BL-124 (Courts screen).

## 1. What exists, verified 2026-10-11

| Area | Modeled in the engine | Not modeled |
|---|---|---|
| Person character | `Person` carries loyalty, ambition, integrity, charisma, competence and a three-axis ideology (`packages/world/src/schemas/person.ts:56-88`). Only loyalty moves in play (`packages/engine/src/effects.ts:411`). | Anything a person holds toward the President: trust, favors, grudges. |
| Ties between people | `PersonConnection` (school, party, career) with a strength (`schemas/person-network.ts:91`). Derived by `buildPersonNetwork` (`engine/src/person-network.ts:287`) and drawn on the person file. | Ties that move, or that change what anyone does. |
| Grudges | Between nations only (`engine/src/relationships.ts`, DECISIONS §4.8). | Between people. |
| Congress members | About eight named holders of a post, as `HillFigure` with a disposition and an influence (`state-legislature.ts:182`, `hill.ts:59-123`). Senate seats are light figures with no person (`state-geography.ts:80`). | The other ~527 members as people. |
| Votes | Three blocs (administration, opposition, independent) weighted by the room's mood (`congress-votes.ts:160`). | Any vote cast by an individual. |
| Courting | Three lobbying plays aimed at one post holder (`lobbying.ts:75-103`). A trade creates a `PoliticalPromise` (`state-legislature.ts:205`). | Courting any rank-and-file member, and any lasting memory of what was done. |
| Divisiveness | Polarization feeds approval (`opinion.ts:339`, `:512`). | Any effect on votes. No Congress file reads it. |
| Removal | Pressure reads the room's disposition (`removal.ts:504`), and the chambers decide removal. | Members who vote on impeachment and conviction. |
| Supreme Court | Nine justices as people, with split votes and opinions on challenges to executive orders (`judiciary.ts`, `court-votes.ts`, `judicial-review.ts`, `court-opinions.ts`). Senate confirmation is counted by caucus (`confirmation-count.ts`). | Vacancies (BL-86). Choosing which cases to hear, emergency applications, argument, the term calendar, and challenges to anything other than an order. |
| Lower courts | Nothing. `world/src/dataset/federal-sites.ts:38` names 94 districts and 13 circuits as places. | Benches, injunctions, appeals, circuit nominations. |

The House seat map is already sourced per seat. `world/src/dataset/house-delegations.ts` counts the Clerk's 119th Congress member data (one entry per seat, published 2026-09-02) into per-state rows. Per-seat data can be vendored from the same source.

## 2. Phase I: the relationship ledger (BL-120)

### State

A `Tie` runs from one person to the President. It is directed, and it remembers.

| Field | Meaning | Moved by |
|---|---|---|
| `rapport` | Warmth, −1 to 1 | Meetings, credit shared, public attacks, home-state help or harm |
| `trust` | Whether the President's word has held, 0 to 1 | Promises kept and broken; threats carried out or abandoned |
| `favors` | A ledger in both directions: what, for whom, when, due by, and whether open, called, repaid or defaulted | Trades and votes given as favors |
| `grudges` | Each with a cause, a weight, the turn it was made and a decay rate | Broken promises, a primary backed against them, public humiliation |

Placement and rules:

- The ledger lives on `PersonRuntime`, so it covers every person: members, cabinet, governors and foreign leaders. Members are the first consumer.
- It replaces `HillFigure.disposition` and the lobbying `PoliticalPromise`, so no second variant of either survives.
- Every change goes through `apply()` as a new effect kind (DECISIONS §1.5). Each change carries its cause (§1.6, §5.11).
- A grudge's decay is derived from existing attributes (integrity and ambition). It doesn't get a new trait, because §4.2 requires every authored field to have a named reader.

### Ties between people

- Members follow cues from people they're tied to: their party leader (scaled by that leader's influence), their state delegation's senior member, their committee chair and their faction.
- Factions are derived from ideology clusters within each party. They're a reading, not stored state (§1.10), and get fictional names.
- `PersonConnection` from the existing network supplies who is tied to whom. Ties don't drift between people in this phase.

### Acts aimed at a person

Each act runs through the one commit path (§1.7), and the price shown is the price charged (§3.7).

| Act | What it costs | Who resents it |
|---|---|---|
| Meeting or call | Office days (§2.4) | Nobody, unless it's repeated for nothing |
| Back a home-state project | Treasury, plus an open favor | Budget hawks; the President's own party if the member is from the other party |
| Share credit or name a bill | The President's own credit on the act | Party leadership |
| Campaign with them at home | Days, and approval in their state | The President's base if the member is from the other party |
| Public pressure in their state | Their rapport; works only if the President is popular there | The member, as a grudge if it fails |
| Back a primary challenge (own party only) | Party unity, plus a lasting grudge | The member and their faction |
| Appoint someone they recommend | The seat's competence and loyalty | Rival recommenders |

### Divisiveness becomes a cost

Crossing the aisle costs a member a penalty. Two things set it:

- polarization, which already exists in `opinion.ts`
- the President's record with the other party, derived from the ledger as the net rapport, favors kept and grudges held across that party's members

A divisive President raises the penalty for everyone across the aisle. A President who builds bridges lowers it for the members actually courted, and a little for their faction. The two sides can want different things, so this meets §1.14.

## 3. Phase J: 535 members who vote (BL-121)

### Members

- **Seats:** the per-seat party map from the Clerk's data, vendored with its source and date (§4.11). Vacancies stay vacant. The table stays tied to the apportioned totals.
- **People:** every seat is filled from the one person pool (§4.9) with new eligible roles, `representative` and `senator`. Each is fictional and checked by the real-name guard.
- **Character:** ideology is drawn from the member's party and their district's lean, with seeded jitter, which is a source of divergence under §1.13.
- **Per-seat facts:** seniority, committee seats and seat class (Senate) or next election (House).
- **Light figures retired:** `SenateSeat` and `StateDelegation.disposition` become readings over these people, and `HillFigure` becomes the posts held by member people.

### The vote

For each member and each question, the inputs are:

1. Distance from the bill on ideology. This uses the bill's declared position; bills that don't declare one need one authored.
2. The party whip, scaled by how hard leadership is pushing and by the leader's influence.
3. Exposure at home: district or state lean, the President's approval there, and how close the member's next election is.
4. Their tie to the President: rapport, trust, favors open and grudges held.
5. Cues from the people they follow.
6. The aisle-crossing penalty from Phase I.

The count is deterministic from campaign state. Any jitter is keyed by member and question on its own stream (§1.3) and never touches a promise (§1.12).

### What else reads the members

- `congress.disposition` stays as a derived reading over the members. Authored content and removal that read it today keep working (§1.10).
- Impeachment and conviction are counted member by member.
- Senate confirmation (`confirmation-count.ts`) is counted member by member too.
- Elections (midterm and general) replace members who lose or retire with new people from the pool, and the President's coattails feed those races.

### Documents to update in the same change

Under the Doc Sync Contract, these move together:

- `docs/SCHEMA.md` and `docs/ARCHITECTURE.md`
- the authored-field consumer registry
- `docs/CONTENT_DOCTRINE.md` §2 if a constant in `removal.ts` changes
- the save version, with a deterministic migration that fills the members of an older save from its seed

## 4. Phase K: courts as a process (BL-123)

### Benches

- **Supreme Court:** as it is now, plus vacancies (this closes BL-86).
  - Mortality comes from a sourced life table.
  - Retirement hazard rises with age and with tenure. It is higher when the sitting President shares the justice's appointing party and lean. This is the one place a judge's relationship to the President matters, and it is the real pattern of strategic retirement.
- **Thirteen circuits:** each seat is a light figure with an appointing party and a lean, from a sourced count of active judgeships and vacancies. A seat becomes a person, seeded by the seat's id, only when it is drawn onto a panel the player sees. That keeps the pool small and identities stable.
- **Ninety-four districts:** each is an aggregate bench with a lean, from the same source.
- **Lower-court vacancies:** senior status and mortality open seats, and circuit nominations go to the Senate's member-by-member count.

### A case's path

1. **Filed.** Any challengeable act can be challenged, not only executive orders: rules, enforcement of a statute, emergency declarations, and force used at home (BL-117). The plaintiff (a state attorney general, an advocacy group or a business) chooses a friendly district court, and the choice is shown.
2. **Temporary order or preliminary injunction,** with its scope. The current law on universal injunctions has to be researched from primary sources and dated before this rule is written.
3. **Circuit appeal** before a three-judge panel drawn from the circuit's seats, with possible rehearing by the full circuit.
4. **Emergency application** to the Supreme Court for a stay.
5. **Review granted** if four justices vote to hear it. A split between circuits raises the odds.
6. **Argument and opinion** on the term calendar: the term opens in October, argued cases are decided by the end of June, and the opinion has an author, concurrences and a dissent.

Every stage is a matter on the case system with a real clock (§3.5) and a declared default.

### The Solicitor General's standing

- The Court's trust in the administration's lawyer moves with the record: emergency applications won and lost, positions reversed, and arguments that overreach.
- It raises or lowers the odds of a stay and of review being granted.
- It is the only relationship lever toward the courts. The President has no act aimed at a judge.

## 5. Screens (BL-122, BL-124)

Both screens follow the operations redesign (BL-107, DECISIONS §8.8) and the shared choice and file patterns in `docs/DESIGN.md`. Both compose at 390×844 and 1440×900 and are checked at the other widths.

### Congress

- **Seat chart:** each chamber's hemicycle, one dot per member. A switch colors the dots by party, projected vote on the selected bill, or tie to the President.
- **District map:** the map earns its place here. Districts and states are colored by the same switch.
- **Persuadables plot:** members placed by ideology against exposure at home. The band where a member could be moved is shaded. Selecting a dot opens the member.
- **Whip board for a bill:** five columns (yes, leaning yes, undecided, leaning no, no) of faces. Each face carries what holds them there, such as "a favor owed" or "district leans against". The margin needed is marked.
- **Factions:** each faction's size, center and leader, and how the faction is leaning on live business.
- **Member file:** on the shared dossier frame: seat, committees, seniority, votes, favors in both directions, grudges with their causes, history with the President, the people they follow, and the acts available with their costs compared.

### Courts

- **Circuit map:** circuits colored by bench lean, with the President's live cases pinned where they were filed.
- **Case pipeline:** filed → injunction → circuit → emergency application → review → decision, with a count at each stage. Each case is a row that can be opened.
- **Bench spread:** each court's judges placed on the ideology axis.
- **Supreme Court agreement:** how often each pair of justices votes together, with each justice's lean, age and tenure.
- **Term calendar:** arguments and decisions to come, and the decision deadline at the end of June.
- **Vacancies and nominations:** open and likely seats, and the shortlist with a member-by-member Senate projection.
- **Solicitor General:** the standing reading, with what moved it.

Internal thresholds, turn gates and source predicates are never rendered (DESIGN.md, legislative work).

## 6. Order and dependencies

| Phase | Starts after | Why |
|---|---|---|
| I: the ledger | C3 | It doesn't collide with in-flight work, and both J and K read it. |
| J: members vote | D's caucus fix | D is rebuilding party, caucus and "your side". Members built on the old caucus model would be rebuilt twice. |
| K: courts | I | It reads Senate counts (better after J) and the ledger (for strategic retirement). The process itself is independent, so K can run in parallel with J. |
| Screens | Their engine phase | Each screen is verified in H's integrated pass. |

Research comes first, from primary sources, and is recorded with dates:

- the per-seat House data and Senate seat classes
- circuit and district judgeship counts by appointing party
- a mortality life table
- strategic retirement findings
- the current law on universal injunctions and the term calendar

## 7. Proof

- **Engine tests:**
  - every effect kind and act
  - vote counts that move when a tie moves and hold when it doesn't
  - a polarized President who loses crossover votes a bridge-builder keeps
  - deterministic counts per seed
  - vacancies by age
  - each stage of a case's path, with its default
- **Balance harness:**
  - Run the old bloc counter and the new count side by side over the same seeds before retiring the old one.
  - Report passage rate per term, vetoes overridden, removal outcomes and confirmations, as measured.
  - The bloc counter stays as a test-only cross-check until the new count's numbers are accepted.
- **Performance:** a weekly step with 535 members and the live bills, measured against the current p50.
- **Save:** an older save migrates to members deterministically, and a round trip neither gains nor loses a tie.
- **Screens:** driven at six widths with a realistic mid-term fixture, plus browser journeys: court a member and watch their whip-board face move; a case from filing to a decision.

## 8. Risks

| Risk | Disposition |
|---|---|
| Counting members one by one changes how often every bill passes, and therefore removal, which the chambers decide. | Accepted with controls: the side-by-side harness run, and no retune against a band edge. |
| Authored content gates on `congress.disposition`. | Accepted: it stays as a derived reading, so gates keep their meaning. Content that should name a member waits for Phase J. |
| Courting becomes a free button. | Every act carries a cost and someone who resents it; the content audit's rule against costless decisions (§7.4) applies to acts too. |
| The save and the pool grow by 535 people. | Needs validation: the size and time budget are measured in J's proof. |
| Lower-court judges named at scale bloat the pool. | Accepted: seats stay light figures until they're drawn onto a visible panel. |
| Collision with the uncommitted operations redesign on the Congress and Courts screens. | Screens wait until BL-107 is committed. |
