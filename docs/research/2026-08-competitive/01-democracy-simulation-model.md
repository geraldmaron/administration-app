# Competitive research: the Democracy series' core simulation model

Positech Games / Cliff Harris. Primary subject: **Democracy 4** (2020, active dev
through DLC as of 2026). Lineage: **Democracy 3** (2013) for the model that D4
inherited and extended. Researched 2026-08-27.

## 1. Scope

Covered: the neuron/effect simulation architecture, the CSV/text data model
(policies, simulation values, situations, dilemmas, events, country config),
voter groups and how individual voters aggregate into them, cynicism/apathy/
complacency/extremism/terrorism, the political capital economy, the election
model, and dilemma/event injection. Sourced from Cliff Harris's dev blog
(positech.co.uk/cliffsblog), the community-maintained but developer-endorsed
Steam modding guide (which quotes the shipped data-file format directly), a
Steam gameplay guide, the D4 Voting Systems DLC page, and review/discussion
snippets for the complaints angle.

Not covered: Democracy 2's simpler model (superseded), the mobile/iOS ports,
head-to-head numeric tuning (exact multipliers are mod-file-specific and not
worth transcribing), and multiplayer/Political Compass (social feature, not
simulation). The official Democracy 4 wiki (democracygame.fandom.com) returned
HTTP 402 on direct fetch during this research — its content is triangulated
below only where corroborated by other opened sources, and is flagged
`[unverified]` where it stands alone.

## 2. Findings

**F1. Every simulation object is a "neuron"; effects are directed, weighted,
lagged edges with an equation, not a fixed coefficient.**
The engine treats policies, simulation values (GDP, crime, health…), voter
groups, individual voters, ministers, situations, and dilemma options as one
undifferentiated node type, each holding a scalar (0→1 or -1→+1). A connection
between two neurons — a `SIM_NeuralEffect` — carries the target name, a small
equation over the source's current value (e.g. `0.04+(0.04*x)`, where `x` is
the source's value or, for a policy, its slider position), and an **inertia**
figure that is a trailing-average window in turns (e.g. `4` means the effect
is smoothed over the last 4 turns rather than snapping instantly). This is
why the game markets itself as running on a "neural network" — mechanically
it's simpler than that term implies: no training, no backprop, just a static
weighted directed graph re-evaluated every turn, with per-edge smoothing.
Source: [Speeding up Democracy 4 simulation processing](https://www.positech.co.uk/cliffsblog/2021/12/29/speeding-up-democracy-4-simulation-processing-atof-is-slow/); data-model confirmation in the [Modding Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2242250360).

**F2. The data model is fully CSV/text-driven and the effect syntax is public
and documented well enough to reimplement.**
`policies.csv` and `simulation.csv` define nodes; effects live in `#Effects`-
delimited columns using `target,equation,inertia` triples, chained with `+ - *
/ ^`. `situations.csv` defines threshold-triggered nodes with separate
`Inputs` (what turns them on/off) and `Outputs` (what they in turn drive).
Dilemmas and events are one text file per item with an `[influences]` block
(a weighted-likelihood formula, can include `_random_,min,max` noise) and
`OnImplement = CreateGrudge(target, value, decay)` scripts that inject a
temporary, exponentially-decaying effect rather than a permanent one. Country
configuration (`[CountryName].txt`) sets population-per-simulated-voter,
starting debt, wealth multiplier, apathy, an economic-cycle sine-wave phase,
and starting policy sliders — i.e. the entire "campaign setup" the modding
community and the shipped country roster both use is data, no code. Source:
[Modding Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2242250360).

**F3. The electorate is ~2,000 simulated individual voters, each carrying a
continuous 0–100% approval score and simultaneous membership across ~20
overlapping groups; group "happiness" is a fiction computed by averaging
individuals, not a first-class value voters read from.**
A country's population maps down to 2,000 agents (`population ÷ 2000` per
country config). Each agent has fractional membership pulls across ~20 named
groups (liberal/conservative, socialist/capitalist, income tier, parents,
religious, young, old, patriots, motorists, etc. — no single canonical list
was found in an opened primary source; the 402'd wiki would likely have it,
so treat the exact 20 as `[unverified]` in count though the mechanic is
confirmed by two independent opened sources). A voter's overall approval is
a pull-weighted blend of how the policies affecting each of their groups make
them feel, and a group's displayed "87% happy" is just the mean of its
members — which is why 100% group happiness at 100% membership can still
yield zero votes: every member also belongs to other groups pulling the other
way. Sources: [voter approval visualization post](https://www.positech.co.uk/cliffsblog/2022/03/02/on-the-visualization-of-voter-approval-distribution-in-democracy-4/); [Basic Gameplay Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2242836711).

**F4. Cynicism, complacency, and apathy are three distinct negative-feedback
dials that all fight the player independent of policy content.**
- *Cynicism*: a per-group trust score in the sitting government; high
  cynicism subtracts from that group's approval regardless of what you've
  actually done for them.
- *Complacency*: a group that has been kept very happy for a long time starts
  discounting past wins ("what have you done for me lately") — a group's
  complacency ceiling **rises with every re-election**, so a second- or
  third-term government faces a harder-to-please version of its own base
  than a first-term one did with identical policy.
- *Apathy* is a country-level config value that shapes how many voters with
  weak feelings (near the 50% approval midpoint) simply don't turn out;
  turnout is driven by strength of feeling (positive or negative), not by
  approval direction — a centrist, broadly-tolerated government can lose to
  low turnout as easily as an unpopular one loses to high opposition turnout.
Sources: [Cynicism search synthesis via fandom, corroborated by Basic Gameplay Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2242836711); complacency mechanic corroborated across the [Basic Gameplay Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2242836711) and community discussion snippets.

**F5. Political capital is a single fungible currency, generated per turn from
a formula (popularity + majority size + minister loyalty + emergency-powers
bonus + a decaying post-election honeymoon), and it exists specifically to
force sequencing under scarcity — it is the entire design's pacing valve.**
There is no separate "budget" resource for policy *changes* distinct from the
treasury cost of running them: introducing, cancelling, raising, or lowering a
policy slider costs political capital (per `policies.csv`'s `Introduce/Cancel/
Raise/Lower` fields), drawn from a pool whose max is roughly double the
per-turn income and which spikes right after an election, then tapers over
roughly the first two terms. This means the hardest political trade-offs in
the game are not "can we afford this" (a treasury question) but "is this
worth spending our only scarce non-treasury resource on this turn, versus the
other five things also worth doing" — i.e. political capital is what turns a
sandbox of independent policy toggles into a genuine sequencing puzzle.
Sources: [Modding Guide field docs](https://steamcommunity.com/sharedfiles/filedetails/?id=2242250360); [Basic Gameplay Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2242836711); numeric detail (12 PC emergency powers, 8 PC popularity, 25 PC majority/honeymoon, 3 PC/minister max) came up only in a Steam-community-post search snippet and is `[unverified]` at that precision.

## 3. Mechanics worth stealing

| # | Mechanic | Why it works | Cost given our systems | Fit |
|---|----------|--------------|------------------------|-----|
| M1 | **Per-effect inertia (trailing-average lag) on every causal edge, not just some** | Makes cause-and-effect feel like governing a real economy — nothing snaps instantly, and a player who reads only this turn's delta misreads the trend. It's also what makes "long-game" policies (education, culture) legible as a distinct strategic category from "lever" policies (interest rates). | We already have five metrics and six opinion drivers with *some* propagation; the gap is a uniform inertia parameter on every edge in the effect graph, not just scripted per-scenario delays. Cheap: our engine is already deterministic and turn-based (a week), so adding an N-turn moving-average buffer per edge is a data field + a ring buffer, no architecture change. | 5 |
| M2 | **Group complacency ceiling that rises with re-election** | Directly punishes the "coast on a winning coalition" strategy that our reviewers/testers will eventually find; it's a built-in difficulty ratchet tied to *success*, which is exactly the "pressure regime that ratchets as the player fails" gap we're already designing for its inverse (failure). Pairing both directions (fail → harder; succeed too long on one base → also harder) closes a loop neither currently covers. | We have opinion drivers and a mandate composite already; this is a scalar modifier per opinion driver keyed to consecutive terms/elections won while that driver stayed high. Cheap-to-medium: needs a new per-driver "years satisfied" counter and a lookup curve. | 4 |
| M3 | **Turnout driven by strength of feeling, not direction of feeling** | Prevents the degenerate "please everyone a little" strategy from being optimal, and it's a realistic, well-known political dynamic (base mobilization vs. persuasion) our target audience (25–45, politically literate) will recognize and respect. | We already model six opinion drivers and an election model; this changes the vote-counting formula from "sum of approval" to "sum of approval, weighted by |approval − 0.5|, with an apathy floor." Cheap: it's a formula change in the existing election model, not a new system. | 5 |
| M4 | **Fully data-driven effect graph with a public, small equation grammar (`target,equation,inertia`)** | This is *why* Democracy has 14+ years of active modding and a long tail of country/scenario content without dev involvement — the whole simulation surface is legible and editable as data. Directly matches our own "data-driven, CSV/JSON-authored" posture. | We are already schema/content-driven (zod schemas, authored JSON scenarios). The specific win to borrow isn't the file format, it's the discipline: every causal relationship in the game expressible as `(source, target, equation, lag)` tuples that a non-engineer (a content/balance designer) can read and tune without touching TypeScript. Medium cost: would mean externalizing some effect coefficients that currently live in engine code into an authored table our `packages/world` or `packages/content` validator can check. | 3 |
| M5 | **Political capital as the sole gate on *changing* policy, decoupled from treasury cost** | It's the mechanism that makes "which fights do we pick this turn" the central decision, rather than "can we afford it" (already covered by treasury). It also naturally produces the honeymoon-period pacing beat (new administrations can move fast, then must slow down) which is a strong narrative hook for a term-based game. | We already have removal pressure and a mandate composite but no capital-style action-rate limiter distinct from treasury. This is the highest-leverage, lowest-cost item on the list if it isn't already covered by an existing constraint — worth an explicit check against `docs/SCHEMA.md` before building, since "mandate" may already be doing this job informally. | 4 (pending confirmation it isn't a near-duplicate of mandate) |

## 4. Their weaknesses / our openings

1. **"Solved" endgame once the player learns the model.** Discussion and
   review snippets converge on the same complaint: once a player understands
   which policy combinations dominate, the game stops presenting real
   tension — a Steam discussion is literally titled *"Game feels too easy for
   me"* and reviewers note the balance "becomes unbalanced once players
   understand the mechanics." [Steam discussion](https://steamcommunity.com/app/1410710/discussions/0/3114782327992433817/). **Opening**: our
   design already leans on authored crisis prose and a pressure regime that
   *escalates with player failure* — extend that same ratchet to escalate
   with player *mastery* (see M2), so there's no stable "optimal build" that
   coasts.

2. **Visual and UX presentation reads as a spreadsheet / mobile-game menu,
   not a serious executive surface.** A reviewer described the interface as
   visually unappealing with "simplistic menus that resemble a mobile game
   and confusing graphs and charts." [Phenixx Gaming review, referenced in search synthesis](https://web.phenixxgaming.com/2024/07/05/democracy-4-pc-review/). **Opening**: this is
   precisely the gap our "serious executive operating surface, not a
   dashboard toy" positioning is built to fill — the simulation depth is
   real and worth emulating, but Democracy has never invested in making that
   depth feel like reading a real briefing rather than parsing a data table.

3. **Price-to-content friction from DLC fragmentation.** Reviews call out the
   base price feeling high relative to content, with mechanics like
   compulsory voting or campaign-focus selection locked behind a separate
   paid Voting Systems DLC rather than the base sim. [store page](https://store.steampowered.com/app/2004030/Democracy_4__Voting_Systems/); review synthesis above. **Opening**: not directly a
   mechanics lesson, but a signal that election-model depth (turnout
   mechanics, campaign framing) is something players actively want more of
   and will pay for — validates investing in our own election model rather
   than treating it as a formality between terms.

4. **Balance is manually tuned against telemetry, with the designer himself
   admitting most manual passes have "trivial effect... or even mak[e] things
   worse."** [Balancing Democracy 4 post](https://www.positech.co.uk/cliffsblog/2021/01/27/balancing-democracy-4-using-stats-and-number-crunching/). **Opening**: a system with as many
   authored, hand-tuned coefficients as ours (five metrics, six drivers,
   escalation ladders, state leans) will hit the same wall. Worth budgeting
   for a lightweight internal telemetry/dilemma-frequency dashboard (their
   4GB anonymized-trigger-log approach) before content volume makes manual
   tuning unreliable — this is a process lesson, not a mechanic, but it's
   cheap to set up now versus expensive to retrofit later.

## 5. Sources

- https://www.positech.co.uk/cliffsblog/2021/12/29/speeding-up-democracy-4-simulation-processing-atof-is-slow/
- https://www.positech.co.uk/cliffsblog/2022/03/02/on-the-visualization-of-voter-approval-distribution-in-democracy-4/
- https://www.positech.co.uk/cliffsblog/2014/02/07/democracy-3-social-engineering/
- https://www.positech.co.uk/cliffsblog/2021/01/27/balancing-democracy-4-using-stats-and-number-crunching/
- https://www.positech.co.uk/cliffsblog/2013/02/22/democracy-3-voter-type-income-design/
- https://steamcommunity.com/sharedfiles/filedetails/?id=2242250360 (Democracy 4 Modding Guide — quotes shipped CSV/text data format)
- https://steamcommunity.com/sharedfiles/filedetails/?id=2242836711 (Democracy 4 Basic Gameplay Guide)
- https://www.gamedeveloper.com/design/mixing-video-games-and-politics-with-i-democracy-3-i- (Cliff Harris interview)
- https://store.steampowered.com/app/2004030/Democracy_4__Voting_Systems/ (DLC store page)
- https://steamcommunity.com/app/1410710/discussions/0/3114782327992433817/ ("too easy" complaint thread)
- https://web.phenixxgaming.com/2024/07/05/democracy-4-pc-review/ (review — UI/price complaints)

Not opened directly (HTTP 402, content triangulated only, flagged
`[unverified]` above where relied on): democracygame.fandom.com wiki pages
for Cynicism, Terrorism, and Pressure Group.
