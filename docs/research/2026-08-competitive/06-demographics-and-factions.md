# Demographics and factions in grand strategy — how the best-in-class games model a population that has opinions

## 1. Scope

Covered: Victoria 3's pop system in depth (definition/storage, standard of living,
radicalism/loyalty, interest groups, laws-as-multi-turn-gamble, revolutions/civil
war, and its own community's criticism of that system). Briefer, concrete passes on
Crusader Kings 3 (character-carried politics: factions, vassal opinion, schemes,
stress), Stellaris (ethics/factions/pop happiness), and Hearts of Iron IV (political
power as currency, national spirits as modifiers).

Not covered: EU4's estates/absolutism, Democracy 4's voter-groups-and-policies
model (adjacent and possibly higher-fit than any Paradox title — flagged as a gap,
not researched here), Cliff Harris/Positech postmortems (the brief's suggested
primary source; not consulted in this pass), any modded pop systems, and Victoria
2's pop system (the predecessor Victoria 3 diverged from — not compared).

## 2. Findings

1. **A Victoria 3 pop is a fixed 5-tuple key, not a simulated household.** Every
   unique combination of *culture × religion × profession × workplace × state*
   is one pop record; the game stores aggregate counts and stats per key, and
   people "flow" between keys (assimilation, promotion, migration) as continuous
   transfers rather than discrete individual events. This is the direct answer
   to "how do you model a population without modeling individuals": collapse the
   population into a cross-product of a small number of categorical axes, and
   store one row per occupied cell of that cross-product, not one row per person.
   [Pops — Victoria 3 Wiki](https://vic3.paradoxwikis.com/Pops)

2. **Standard of living is derived from wealth, not tracked independently.**
   Wealth rises when weekly income exceeds a needs-basket cost (at 0.2× the
   surplus) and falls when income undershoots it (at 0.1× the deficit, i.e.
   decay is slower than growth) — one asymmetric formula replaces any need to
   track savings, debt, or consumption history per pop. "In the absence of
   other modifiers, a pop's standard-of-living level is equal to its wealth
   level." [Pops — Victoria 3 Wiki](https://vic3.paradoxwikis.com/Pops)

3. **Radicalism is caused by a short, named list of triggers, and its only
   counter is loyalism — a mirror-image stock fed by the same triggers in
   reverse.** Falling standard of living (either below the pop's *expected*
   minimum or just falling in absolute terms), discrimination against the
   pop's culture/religion, and job loss from production changes are the
   documented radicalization triggers; raising standard of living (or a rare
   event) is the only way to convert a pop to loyalist. Radical/loyalist stock
   is a pop-level property that aggregates upward into national "radicals" and
   "turmoil" totals. [How To Avoid Revolution In Victoria 3 —
   TheGamer](https://www.thegamer.com/victoria-3-radicals-turmoil-revolution-secession/),
   [Victoria 3: How To Reduce Radicalism — Gamer
   Tweak](https://gamertweak.com/radicalism-victoria-3/)

4. **Interest groups are a fixed roster of eight coalitions, each keyed to a
   set of professions/strata, and their political weight (clout) is a direct
   sum of the wealth of the pops that belong to them** — Armed Forces
   (servicemen/officers), Devout (clergy), Industrialists (capitalists),
   Intelligentsia (academics), Landowners (aristocrats), Petite Bourgeoisie
   (clerks/shopkeepers), Rural Folk (peasants/farmers), Trade Unions
   (laborers/machinists). Government legitimacy is a function of how much
   clout is held by the interest groups actually represented in government —
   a government of low-clout groups is illegitimate regardless of the player's
   own popularity. [Interest group content — Victoria 3
   Wiki](https://vic3.paradoxwikis.com/Interest_group_content), [Victoria 3:
   How To Manage Your Interest Groups —
   TheGamer](https://www.thegamer.com/victoria-3-interest-groups-political-parties-approval-bolster-suppression-clout-traits-ideaologies/)

5. **Law enactment is a 3-stage, multi-week gamble with a named event-outcome
   table, not a single roll.** Every law attempt passes through three named
   stages (drafting/review/implementation, or initiative/research/voting under
   a democracy); each stage resolves via one of four outcomes — success,
   progress (event that raises success probability), controversy (event that
   swings probability ±10–15%), or stagnation (event that lowers probability or
   adds a setback). Three accumulated setbacks kill the bill outright and lock
   it out for two years; a bill retains nonzero odds even at 1%, so failure is
   never mathematically certain going in. This is the single most directly
   transferable mechanic to our bill system. [Law enactment events — Victoria 3
   Wiki](https://vic3.paradoxwikis.com/Law_enactment_events), [Dev Diary #80 —
   Paradox
   Interactive](https://www.paradoxinteractive.com/games/victoria-3/news/dev-diary-80-law-enactment-and-revolution-clock-in-13)

**Fact vs. inference, stated explicitly:**
- Fact: pops are a categorical cross-product with aggregate stats, not
  individuals (finding 1); wealth drives SoL via one asymmetric formula
  (finding 2); radicalism has a short trigger list countered only by
  standard-of-living gains (finding 3); interest groups are a fixed roster
  whose clout is summed pop wealth (finding 4); laws resolve through a 3-stage
  event gamble (finding 5).
- Inference: the "pops are a spreadsheet" and "turmoil is illegible" complaints
  (§4) trace back to the same design choice that makes the system
  computationally cheap — aggregation into faceless categorical buckets — so
  legibility and scale are in direct tension, and any system we copy inherits
  that tension unless we deliberately spend UI budget against it.
- Recommendation: see §3 and the closing recommendation.

## 3. Mechanics worth stealing

### A. The categorical cross-product as the pop model itself
**What it is:** define a population unit as a tuple over a small, fixed set of
axes (Victoria 3: culture × religion × profession × workplace × state) and store
one aggregate record per occupied combination, with people moving between
combinations as continuous transfers.
**Why it works:** it is the only approach in the survey that scales to
millions of "people" with O(combinations) storage, not O(people) — and
combinations stay bounded even as population grows.
**Cost given our systems:** we already have 50 states and six opinion drivers.
A cohort = state × 1–2 demographic axes (e.g. urban/rural × income tier, or
region × industry) would slot directly into the state economic-character work
already in flight. No new engine primitive needed — cohorts are rows in a
table keyed by a tuple, exactly like our existing per-state records.
**Fit: 5/5.** This is the direct precedent for "a demographic cohort layer,"
and it's the cheapest possible version of Victoria 3's idea: we'd cap total
cohorts in the low hundreds (50 states × 2–4 axis combinations), not the
tens of thousands Victoria 3 tolerates.

### B. Asymmetric wealth-to-satisfaction formula
**What it is:** one derived value (satisfaction/SoL) rises slowly toward a
target and falls faster away from it, using two different rate constants
against the same underlying driver (income vs. expected-cost basket).
**Why it works:** it produces "hard to win back, easy to lose" dynamics
without needing a stock of grudges or history — a single number plus one
formula gets you sticky discontent.
**Cost:** trivial — this is a two-constant formula we could bolt onto a
cohort's existing satisfaction/opinion tracking. No new data model.
**Fit: 4/5.** Cheap and effective, but we already have a "grievance memory"
system being designed that likely subsumes this; treat this as the fallback
if grievance memory turns out too expensive to compute weekly.

### C. Radicalism/loyalty as one bipolar stock with a short, named trigger list
**What it is:** a single -100..+100 stock per cohort/pop, moved only by a
short enumerated list of triggers (discrimination, SoL drop, job loss on the
downside; SoL gains or rare events on the upside), aggregated upward into a
national or state-level "turmoil" figure that gates other systems (tax
efficiency, building efficiency, coup/civil-war eligibility).
**Why it works:** it's legible to design (a handful of named causes) even
though the community found the *aggregate result* illegible to players (see
§4.2) — the failure was presentation, not the underlying stock design.
**Cost:** low. We already have "removal pressure" as a composite; a per-cohort
radicalism stock that rolls up into removal pressure and mandate is additive,
not a new subsystem.
**Fit: 4/5.** High value, but only if we invest in exposing *why* a specific
cohort radicalized (see our opening in §4.2) rather than repeating Victoria
3's mistake of hiding it in a tooltip.

### D. Fixed-roster interest groups with clout = summed member wealth/weight
**What it is:** a small, closed set of factions (8 in Victoria 3), each
mapped to specific professions/strata, whose political weight is a
transparent sum over their members' individual weight (wealth in Victoria 3).
Legitimacy is gated on clout distribution, not player popularity alone.
**Why it works:** it turns "who has power" into an auditable sum instead of a
hidden dial, and it naturally creates a coalition-math minigame (which
laws move which groups' clout) that constrains the player the same way real
lawmaking does.
**Cost:** we already have Congress as two aggregate chambers + seven named
leaders and a party system. A closed roster of interest groups mapped onto
our demographic cohorts (e.g., "labor," "business," "rural," "urban
professional") with clout = sum of cohort weight is a natural extension —
arguably we should merge this into the party system rather than add a
seventh discrete layer.
**Fit: 3/5.** High conceptual fit, but risk of layer proliferation — we
already have parties, chambers, and named leaders; adding interest groups
on top without collapsing something else risks the exact "too many
opinion dials" critique voters give Victoria 3's own UI.

### E. Multi-stage law enactment as a named event gamble
**What it is:** a bill's fate resolves over 3 stages, each an event roll from
a 4-outcome table (success / progress / controversy / stagnation), with a
setback counter that fails the bill after 3 accumulated setbacks and locks it
out for a cooldown period. Nonzero odds always remain.
**Why it works:** it turns bill-passing from a single dice roll into a small
narrative arc with visible momentum, which is exactly the kind of texture our
authored-prose, weekly-turn game rewards — we can *narrate* the "controversy"
stage as a specific scenario/consequence card instead of an anonymous
percentage shift.
**Cost:** we already have bills. Converting "will this bill pass" from a
single check into a 2–3 week resolution arc with named intermediate states
(progress/controversy/stagnation) and a setback counter is a moderate but
bounded change to the bill state machine — reuses our existing scenario/
consequence card infrastructure to *render* each stage's event, rather than
requiring new content types.
**Fit: 5/5.** This is the most directly reusable mechanic in the whole
survey for a game whose bills are already the central verb.

### F. CK3: politics carried by named individuals, not classes (contrast case)
**What it is:** vassal opinion is a per-character stat; factions form when an
individual's opinion of the liege drops below a threshold (-50); "schemes"
are individual, time-boxed actions (sway, seduce, blackmail) with success
rates keyed to specific character stats and traits; "stress" penalizes
acting against a character's own traits.
**Why it works:** it makes politics personal and legible by construction —
you always know *exactly* who is unhappy and why, the opposite failure mode
from Victoria 3's aggregate opacity.
**Cost:** we already have seven named congressional leaders and cabinet
appointees; giving each a CK3-style opinion stat plus named grievance
triggers is cheap and composable with the existing "grievance memory that
records omissions" work already in flight — arguably that system *is* our
version of this.
**Fit: 4/5.** Not a new system for us — it validates the direction the
grievance-memory work is already headed, and argues for keeping named-leader
opinion legible (each leader shows "why I'm upset") rather than folding
leaders into an anonymous cohort average.

### G. Stellaris: faction approval as a 0–100 value from issue-fulfillment checklist
**What it is:** each faction (roughly one per ethic) has an approval score
starting at 50, moved by whether the player's policies satisfy or violate a
short list of faction-specific "issues"; approval feeds back into member pop
happiness, and factions need 5+ member pops to exist or they auto-disband.
**Why it works:** the checklist model (does policy X satisfy issue Y: yes/no)
is the cheapest possible approval formula — no continuous simulation, just a
per-policy lookup table scored against a per-faction issue list.
**Cost:** near-zero — this is close to what our "six opinion drivers" likely
already do per faction/party; the main addition would be an explicit
per-party "issues we care about" table if one doesn't already exist.
**Fit: 3/5.** Probably already subsumed by our opinion-driver system; worth a
direct comparison against our existing driver implementation before building
anything new.

### H. HOI4: political power as a single spendable currency
**What it is:** one resource (political power, ~2/day) spent on internal and
external political actions (national focuses, party popularity shifts,
advisor hires, diplomacy); national spirits are named, stackable modifiers
attached to the country, acquired/removed by focuses or events.
**Why it works:** collapses "how much political capital do I have" into one
number the player always sees, instead of a derived, hidden legitimacy score.
**Cost:** we may already have an equivalent in "mandate." Worth checking
whether mandate is currently spendable as a currency or purely a passive
score — if the latter, HOI4's model argues for giving the player an explicit,
bankable pool they choose how to spend, rather than mandate only gating
outcomes automatically.
**Fit: 2/5.** Interesting but likely redundant with mandate; flagged for
comparison, not adoption, unless mandate is confirmed to be non-spendable.

## 4. Their weaknesses / our openings

1. **Radicalism has no ceiling and no player-visible off-ramp once it
   compounds.** Players report accumulating tens of millions of radicals even
   at the *highest* standard of living in the game, and describe the system as
   effectively un-fixable once it spirals — "the lower class is living like
   kings but radicals still going up by the millions." **Opening:** our
   pressure-regime work (ratcheting difficulty as the player fails) should
   explicitly design a *recovery path* — a named, player-legible way to walk a
   cohort back down from high grievance — rather than only a one-way ratchet.
   [Please explain radicals — Steam Community
   discussion](https://steamcommunity.com/app/529340/discussions/0/3489753940068314656/)

2. **Turmoil and radical causes are hidden in tooltips; players can't see
   *who* is angry or *why* at the moment they need to act.** Hovering turmoil
   on a state shows a radical-pop count with no breakdown of cause or
   identity. This is a UI failure layered on top of a sound underlying
   mechanic (finding 3/mechanic C above). **Opening:** since our engine is
   deterministic and replayable from a seed, and our texture is "read a
   document, decide" rather than a dashboard, we can afford to *narrate* the
   top grievance driver per cohort as prose in the weekly briefing — turning
   Victoria 3's biggest legibility complaint into content our authored-prose
   pipeline is already built to produce.

3. **The interest-group/clout system is criticized as removing meaningful
   player agency over individual pops** — "by design, players have no direct
   control over pops," and information players felt should be visible is
   deliberately withheld. **Opening:** because our scale is ~50 states and a
   handful of cohorts per state (not millions of pops), we can afford to make
   *every* cohort individually addressable by the player (visible satisfaction,
   named top grievance, direct-address scenario hooks) — a legibility
   guarantee Victoria 3 structurally cannot make at its population scale, and
   a genuine differentiator for us.
   [Turmoil is too vague — Steam Community
   discussion](https://steamcommunity.com/app/529340/discussions/0/3470613599086702201/)

4. **Community response to the complexity is to mod in *more* spreadsheets,
   not fewer** — the most popular Victoria 3 mods increase graph/stat density
   rather than simplifying, suggesting the core audience wants legibility
   through *more data*, not less system. **Opening:** validates that going
   deep on a small, well-instrumented cohort model (few cohorts, fully
   explained) will satisfy the demand this genre's players demonstrably have,
   without needing Victoria 3's scale to do it.
   [Victoria 3's top mods turn it back into a spreadsheet simulator —
   Wargamer](https://www.wargamer.com/victoria-3/spreadsheet-mods)

## 5. Sources

- [Pops — Victoria 3 Wiki](https://vic3.paradoxwikis.com/Pops)
- [Interest group content — Victoria 3 Wiki](https://vic3.paradoxwikis.com/Interest_group_content)
- [Victoria 3: How To Manage Your Interest Groups — TheGamer](https://www.thegamer.com/victoria-3-interest-groups-political-parties-approval-bolster-suppression-clout-traits-ideaologies/)
- [How To Avoid Revolution In Victoria 3 — TheGamer](https://www.thegamer.com/victoria-3-radicals-turmoil-revolution-secession/)
- [Victoria 3: How To Reduce Radicalism [Causes] — Gamer Tweak](https://gamertweak.com/radicalism-victoria-3/)
- [Please explain radicals — Steam Community discussion](https://steamcommunity.com/app/529340/discussions/0/3489753940068314656/)
- [Turmoil is too vague — Steam Community discussion](https://steamcommunity.com/app/529340/discussions/0/3470613599086702201/)
- [Victoria 3's top mods turn it back into a spreadsheet simulator — Wargamer](https://www.wargamer.com/victoria-3/spreadsheet-mods)
- [Law enactment events — Victoria 3 Wiki](https://vic3.paradoxwikis.com/Law_enactment_events)
- [Dev Diary #80 — Law Enactment and Revolution Clock in 1.3 — Paradox Interactive](https://www.paradoxinteractive.com/games/victoria-3/news/dev-diary-80-law-enactment-and-revolution-clock-in-13)
- [Crusader Kings 3: How to Handle Factions — GameRant](https://gamerant.com/crusader-kings-3-how-to-handle-factions-guide/)
- [Crusader Kings 3: 7 Tips For Keeping Vassals Happy — GameRant](https://gamerant.com/crusader-kings-3-ck3-tips-keeping-vassals-happy/)
- [Factions — Stellaris Wiki](https://stellaris.paradoxwikis.com/Factions)
- [Factions — Stellaris Wiki (Fandom mirror, consulted for cross-check)](https://stellaris.fandom.com/wiki/Factions)
- [National spirit — Hearts of Iron 4 Wiki](https://hoi4.paradoxwikis.com/National_spirit)
- [Command power — Hearts of Iron 4 Wiki](https://hoi4.paradoxwikis.com/Command_power)
