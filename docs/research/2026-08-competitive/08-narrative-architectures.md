# Narrative architectures for consequence at scale

Research date: 2026-08-27. Scope note: this file, unlike its siblings, is not
about the political-sim genre — it surveys how non-political narrative games
structure large authored corpora so a player's act echoes later, possibly
across hops. That is the shape of our fuse/flag system: a scenario fires now,
a flag is written, a later scenario's gate reads it.

## 1. Scope

Covered, with primary sources opened directly: Failbetter Games' Quality-Based
Narrative (StoryNexus, Fallen London) via Emily Short's and Failbetter's own
writing; Weather Factory's verb/aspect crafting (Cultist Simulator, Book of
Hours); Disco Elysium's thought cabinet and red/white check system; Crusader
Kings 3's event-scripting language (triggers, on_actions, weighted lists,
cooldowns); RimWorld's storyteller/incident system and Tynan Sylvester's
"Simulation Dream" essay; Dwarf Fortress's Legends Mode and emergent-history
philosophy; Wildermyth's Legacy system.

**Not covered**: implementation-level modding tutorials, StoryNexus's
now-defunct authoring UI (the platform was shut down; only secondary
documentation of it survives), and other genres' branching-dialogue tools
(Ink, Yarn Spinner, Twine) — those are string/graph tools, not consequence
architectures, and a separate research pass if wanted.

One source access note: `emshort.blog` and `ifwiki.org` returned HTTP 403 to
the fetch tool (likely bot-blocking) — their content below is reconstructed
from search-result snippets of those exact pages, not from opening the full
page. Flagged inline as `[snippet-only]`.

## 2. Findings

1. **Storylets separate "is this available" from "what happens" as two
   independent authored fields, not one branch tree.** A storylet is "a slice
   of story and a set of responses," gated by a **requirement** (a boolean or
   threshold expression over qualities) and followed by an **effect** (a
   quality mutation). Content is authored as flat, addressable units with
   their own gate, not as nodes in a tree someone has to keep wired together.
   `[snippet-only]` [Storylets: You Want Them, Emily Short](https://emshort.blog/2019/11/29/storylets-you-want-them/) via search snippet; corroborated by [Failbetter, Echo Bazaar Narrative Structures pt. 2](https://www.failbettergames.com/news/echo-bazaar-narrative-structures-part-two).

2. **Every object in the world, not just the player character, is a quality
   — including relationships and possessions.** Failbetter's own writeup is
   explicit: "qualities *tell storylets what to do*" and everything from Jade
   held to standing with a faction is the same data type. This collapses
   "inventory," "reputation," and "plot flag" into one mechanism a storylet
   author reads uniformly. [Failbetter, Echo Bazaar Narrative Structures pt. 2](https://www.failbettergames.com/news/echo-bazaar-narrative-structures-part-two).

3. **Fallen London authors one-shot consequence with a quality that never
   resets ("Mark of Cain" pattern): completing a storyline sets a quality
   that permanently excludes the player from ever seeing that storyline's
   entry points again.** This is the direct analogue of "don't repeat this
   fuse" — it's not a played-flag on the scenario, it's a quality on the
   player that the *next* storylet's requirement reads. Failbetter names
   roughly sixty distinct narrative shapes ("Ventures," née "Questicles")
   built from this same requirement/effect vocabulary — chains where an
   opening storylet unlocks a middle chain that accumulates a quality toward
   a threshold that unlocks a resolution. [Failbetter, Echo Bazaar Narrative Structures pt. 2](https://www.failbettergames.com/news/echo-bazaar-narrative-structures-part-two).

4. **Crusader Kings 3 gates event firing at two independent layers: `trigger`
   (can this fire at all — hard boolean gate) and weighted probability
   inside an `on_action` (given several eligible events, which one wins).**
   Events don't run on a scheduler by themselves; game-loop `on_action` hooks
   (e.g. a yearly or quarterly "pulse") fire at fixed cadence and each pulls
   from an `events = {}` list (all that pass trigger fire), a
   `random_events = {}` list (weighted pick among passers), or `first_valid`
   (first passer wins). CK3 explicitly **dropped CK2's MTTH (mean-time-to-
   happen) system** because at large event-pool scale MTTH's flexibility
   became a liability — "difficult to govern how frequently an event should
   spawn" — and replaced it with the trigger + weighted-list + pulse
   architecture above, plus explicit `cooldown = { years = N }` blocks and
   `hidden = yes` background firing for bookkeeping events that shouldn't
   surface to the player. This is a documented, load-bearing retreat from
   the "compute a time-to-fire per event" approach we might otherwise reach
   for. [CK3 Dev Diary #30 — Event Scripting, Paradox forum](https://forum.paradoxplaza.com/forum/developer-diary/crusader-kings-3-dev-diary-30-event-scripting.1397140/); [CK3 Wiki, Event modding](https://ck3.paradoxwikis.com/Event_modding).

5. **Cultist Simulator and Book of Hours generate narrative meaning from
   combination, not from authored branches: a `verb` (a slot / activity) only
   accepts cards that carry a matching `aspect` (a tag on the card), and the
   *combination* of aspects present determines which authored `recipe`
   (and its prose) resolves.** New content is added by writing new cards with
   aspect tags and new recipes that key on aspect combinations, not by
   drawing new branches — "each new card or aspect multiplies possible
   combinations... without proportional increases in explicit narrative
   authoring." Weather Factory's own account of the design frames it as
   deliberately "strongly scripted but leav[ing] a lot of room for
   flexibility, discoverability, personalisation" rather than optimizing for
   procedural surprise. [Weather Factory, Cultist Simulator: Making Things Out of Other Things](https://weatherfactory.biz/cultist-simulator-making-things-out-of-other-things/).

6. **Disco Elysium's checks are typed by consequence-reversibility, not
   difficulty: white checks are retryable (fail now, succeed later once a
   condition changes — no story cost) and red checks are one-shot and
   narrative-forking (fail or succeed, the story moves and doesn't rewind).**
   A few checks are explicitly marked un-passable until a separate condition
   is met elsewhere in the game — the check *itself* is a gate whose
   requirement lives outside the dialogue tree that contains it. Failure is
   authored as a branch, not a dead end: "failure is not necessarily an
   ending, more of a branching path in a new direction." [Disco Elysium skill-check mechanics, aggregated from Gamers.Wiki and wiki.gg](https://gamers.wiki/en/games/disco-elysium/guides/how-to-pass-skill-checks-in-disco-elysium-white-red-and-dice-rolls); [Skills — Disco Elysium Wiki](https://discoelysium.wiki.gg/wiki/Skills).

7. **RimWorld's storyteller system is a documented reaction against
   "the simulation dream" — the belief that enough systemic complexity
   automatically produces good stories.** Tynan Sylvester's own essay says
   flatly that "anything in the Game Model that doesn't copy into the Player
   Model is worthless" and that Ultima Online's and BioShock's elaborate
   ecological simulations either got destroyed by players or became
   invisible noise. His alternative: fewer systems, chosen specifically for
   how much *apophenia* (the player's own pattern-making) they invite, with
   the game supplying scenario material and the player supplying the
   narrative meaning. RimWorld's storyteller (Cassandra/Phoebe/Randy) is a
   weighted-incident scheduler that adjusts weights by colony wealth,
   population, and recent-event history, and its most-cited design trick is
   making incidents *last* — a raid that steals rather than kills, a fire
   that burns for days, toxic fallout that lingers — so unrelated incidents
   have time to overlap and compound into something a player narrates as
   causal, even when the systems never modeled that causality directly.
   [Tynan Sylvester, The Simulation Dream](https://tynansylvester.com/2013/06/the-simulation-dream/); [RimWorld Wiki, Storytellers](https://rimworld.fandom.com/wiki/Storytellers).

8. **Dwarf Fortress generates its callback material before play even starts:
   world generation runs a full historical simulation (commonly ~1,000 years)
   producing named figures, wars, and grudges, and Legends Mode is a read
   interface onto that same event log the live game keeps appending to.**
   Adams frames the requirement for emergent narrative as two-sided: the
   simulation must give "consistent yet surprising" output, and dwarves need
   autonomy "outside of their official duties" to be actors whose choices
   are legible as choices. The player's later encounter with a hostile
   ex-citizen or a cursed ruin is a callback to a specific logged event, not
   a re-roll — this is architecturally the closest analogue in this set to a
   memory-of-omission system. [An Interview with Tarn Adams, Stanford DHS](https://dhs.stanford.edu/algorithmic-literacy/an-interview-with-tarn-adams/); [Dwarf Fortress Wiki context via search aggregation].

9. **Wildermyth explicitly authors the seams between procedural and
   handcrafted content rather than hiding them.** Designer Nate Austin
   describes the game as alternating "layers of handcrafted and procedural
   content": a fixed campaign skeleton (beginning/middle/end) with
   procedural character events slotted in based on combat outcomes and each
   character's personality, rendered through a fixed comic-panel visual
   grammar ("Library of Plays") so procedural content still reads as
   deliberately composed. Its Legacy system is the multi-generation payoff:
   characters who lived or died carry into the *next* playthrough's roster
   and can be referenced by later stories, so consequence crosses save
   files, not just turns. [Turn Based Lovers, 10 Turns Interview with Wildermyth developer](https://turnbasedlovers.com/10-turns-interview/with-wildermyth-developer/); [Wikipedia, Wildermyth, cross-checked against press materials].

## 3. Mechanics worth stealing

| Mechanic | What it is | Why it works | Cost to us | Fit |
|---|---|---|---|---|
| **Requirement/effect as two separate authored fields per scenario** | Split a scenario's "when can this fire" (requirement over flags/bands) from "what it writes" (effect on flags/bands) as two independently editable blocks, not implicit in prose branching. | Lets content-lead and continuity-editor audit gating and consequence separately; lets tooling statically check for orphaned flags (flags written, never read) or dead gates (requirements no scenario can ever satisfy) — exactly the failure class already logged in project memory ("Scenario dead-gate footguns"). | Low. We already have flags/bands and conditions; this is a discipline + a lint (`grep` for flags written vs. read), not new engine surface. | **5** |
| **The Mark-of-Cain pattern: a terminal quality that permanently excludes re-entry** | On resolving a consequence chain, write a flag whose only job is "never surface this fuse's origin storylets again," read by every future gate in that chain. | Directly solves "avoid repetition across playthroughs" for one-shot content without a separate dedup system — it's the same flag mechanism already used for gating, applied once more. | Very low — it's a convention for authors (always write a terminal flag on chain resolution), not new code. | **5** |
| **CK3's trigger + weighted-pool-at-fixed-cadence, explicitly not MTTH** | Replace "compute when a fuse detonates" with: a fixed pulse (e.g. weekly turn tick) evaluates all eligible fuses (hard trigger pass) and picks among them by weight, rather than each fuse independently owning a countdown. | CK3's own postmortem is that per-event MTTH became unmanageable at scale — exactly the scale problem multi-hop chains create for us. Weighted-pool-per-tick is more auditable: "what could fire this week" is one list, not N independent timers. | Medium — likely close to what the "scenario activation driven by multi-hop chains" system in progress already needs; this finding is validation for that direction plus a concrete argument against a per-scenario countdown-clock design. | **4** |
| **Verb/aspect combinatorial authoring (Cultist Simulator/Book of Hours)** | Content is generated from tagging (aspects on cards/state) crossed with a smaller set of authored recipes, rather than one scenario per outcome. | Multiplies apparent content without multiplying authored word count — new tags on existing world objects create new combinations for free. | High for us specifically: our stated texture is "authored prose is the primary content... not procedurally generated text," and this pattern trades authored specificity for combinatorial breadth. Fits a systems-heavy consequence *matrix* (e.g. instrument × rung × valence, which we already have per project memory) better than it fits scenario prose itself. | **2** — worth reusing for the consequence-card layer, wrong shape for scenario authoring. |
| **RimWorld's "make incidents last" so unrelated systems overlap** | Design consequence effects to have duration (a grievance that decays over N turns, a state's economic damage that lingers) rather than instantaneous deltas, so two unrelated fuses can be live at once and read as compounding. | This is Sylvester's concrete mechanism for apophenia — the player narrates causality between two things the engine never explicitly linked, for free, because they were both visibly active at once. | Low — our metrics/bands already carry state over turns; the change is authorial (write consequences with a decay curve, not a one-turn spike) more than engineering. | **4** |
| **Dwarf Fortress: generate the memory log before it's needed, not on demand** | A structured, appendable event log (who did what to whom, when) that both the simulation and the player-facing "Legends"-style view read from — the same log services live play and retrospective callback. | Removes the risk of a callback referencing something that was never actually recorded; the "grievance memory that records omissions" system in progress is this pattern already — this is corroboration, not new information. | Already underway per project scope. | **5** (validates existing design direction) |
| **Wildermyth's visible seam between authored skeleton and procedural fill** | Keep a fixed dramatic shape (a campaign's beginning/middle/end, or here: a scenario's opening beat and resolution frame) constant, and let the *specific* cast, numbers, and callback references vary procedurally within it, using one consistent presentation grammar so the seam doesn't read as a glitch. | Reduces authoring cost per fuse-chain instance without reducing legibility — the player always recognizes "this is a Presidential Cabinet Crisis," even though which cabinet member and which grudge fill it in varies. | Medium — depends on how parametric our scenario templates already are; likely already partially true given "state economic character... variable campaign pacing" in progress. | **3** |
| **Disco Elysium: type checks by consequence-reversibility, and let a check's requirement live outside its own dialogue node** | Two check classes (retryable/no-story-cost vs. one-shot/story-forking), plus checks whose pass condition is set by an unrelated earlier scenario, not by anything visible at the check itself. | Gives authors and players a legible signal for "this matters" vs. "this is exploration," and the externally-set-condition pattern is precisely a multi-hop fuse expressed as a check rather than a scenario gate. | Low-medium — our replies already have costs/consequences; adding a reversibility tag (routine retry vs. locked-in) to a reply is metadata, not new mechanics. | **4** |

## 4. Their weaknesses / our openings

1. **Failbetter's own quality-count problem.** Fallen London's quality list
   grew into the hundreds over years of live content, and Kennedy himself
   later said he regretted coining "quality-based narrative" because
   "quality" is misread as a measure of content quality rather than a
   prerequisite variable — a naming failure that reportedly confused the
   design community he was trying to build tooling language for.
   `[unverified — this is Kennedy's own retrospective framing per search
   snippet, not independently confirmed against a dated primary post]`
   **Opening**: name our fuse/flag vocabulary carefully and document it once
   (already true of "band," "flag," "instrument" in project memory) rather
   than letting "quality" or "state" become an overloaded catch-all term as
   the flag count grows into hundreds across multi-hop chains.
   [SimpleQBN, Videlais](https://videlais.github.io/simple-qbn/qbn.html).

2. **CK3's weighted on_action system is reported by modders as hard to
   balance once the event pool is large** — the dev diary itself frames the
   MTTH-to-weighted-pool migration as a response to exactly this problem
   recurring at scale, meaning the new system is a mitigation, not a
   solved problem. **Opening**: budget explicit review time (continuity-
   editor's stated remit already covers this) for periodic weight/coverage
   audits of the fuse pool as it grows past ~300 scenarios, rather than
   assuming the trigger+weight architecture is self-balancing once built.
   [CK3 Dev Diary #30](https://forum.paradoxplaza.com/forum/developer-diary/crusader-kings-3-dev-diary-30-event-scripting.1397140/).

3. **Cultist Simulator's combinatorial system was widely reported (in dev
   commentary on its own iteration) as initially producing recipes players
   couldn't parse** — Weather Factory's own account describes iterating
   specifically to make "recipes and combinations clearer," implying the
   first version failed legibility. **Opening**: since our texture is
   authored prose, not systemic combination, we're structurally immune to
   this specific failure — but it's a caution against ever leaning on the
   consequence-card matrix (instrument × rung × valence) to imply causality
   the player can't reconstruct; each card needs to name its trigger in
   plain language, not rely on the player inferring the aspect combination.
   [Weather Factory, Making Things Out of Other Things](https://weatherfactory.biz/cultist-simulator-making-things-out-of-other-things/).

4. **RimWorld's storyteller is criticized by long-time players (per the
   secondary sources above) for eventually becoming legible as "the
   algorithm," breaking the apophenia Sylvester designed for once players
   learn the weighting** `[unverified — inferred from aggregate community
   commentary in search results, not a single dated primary complaint
   thread opened directly]`. **Opening**: our content is hand-authored, so
   we don't have this specific risk (no procedural weight table to reverse-
   engineer), but the underlying lesson generalizes — a "pressure regime
   that ratchets difficulty as the player fails" (in progress per project
   scope) should avoid a single legible formula players can learn to game,
   the same failure mode CK3 explicitly designed away from with MTTH.

5. **None of these seven games solve "authoring-tool maintainability at
   corpus scale" convincingly in public writing** — Failbetter's own
   material is about play-facing mechanics, not their internal authoring
   tools; CK3's modding wiki documents the scripting language but not
   Paradox's internal review process for thousands of events; Wildermyth's
   interview discusses design philosophy, not tooling. **Opening**: this is
   unfilled space in the public record, not just our gap — our doc-sync
   contract, the dataset validator, and the continuity-editor's arc-ledger
   role are already further along in *documenting* authoring-tool discipline
   than anything found in these primary sources. Worth treating our own
   tooling docs as the differentiator here rather than assuming there's a
   published best practice to import.

## 5. Answers to the four framing questions

- **(a) Surfacing the right content from a large pool**: two-layer gating —
  a hard boolean `trigger`/requirement, then a weighted pick among survivors
  at a fixed cadence (CK3) — beats either a pure priority queue or pure
  randomness. StoryNexus's deck/card model is the same idea under different
  names (a card's presence in the deck is the trigger pass; draw order is
  the weighting).
- **(b) Avoiding repetition across playthroughs**: a terminal, permanently-
  set flag the fired content's own requirement reads (Fallen London's
  Mark-of-Cain) is the cheapest correct answer; Dwarf Fortress's persistent
  world-log is the more expensive, more powerful answer for content that
  needs to reference *what specifically* happened, not just *that*
  something happened.
- **(c) Making a callback land emotionally**: durable, decaying consequence
  state that overlaps with unrelated systems (RimWorld) generates player-
  authored causality for free; explicit external-condition checks (Disco
  Elysium) generate authored causality precisely. Both outperform an
  instantaneous flag-set-then-forgotten model.
- **(d) Authoring tools for a large branching corpus**: least publicly
  documented of the four; the strongest signal from this research is
  structural — separate the gate from the effect as distinct authored
  fields (nearly universal across all seven), because that separation is
  what makes any later tooling (lint, audit, dead-flag detection) possible
  at all.

## 6. Sources

- [Storylets: You Want Them — Emily Short](https://emshort.blog/2019/11/29/storylets-you-want-them/) `[snippet-only, 403 on direct fetch]`
- [Storylets Play Together — Emily Short](https://emshort.blog/2019/12/03/storylets-play-together/) `[snippet-only, 403 on direct fetch]`
- [Echo Bazaar Narrative Structures, part two — Failbetter Games](https://www.failbettergames.com/news/echo-bazaar-narrative-structures-part-two)
- [Quality-Based Narrative (2010) — SimpleQBN, Videlais](https://videlais.github.io/simple-qbn/qbn.html)
- [StoryNexus — IFWiki](https://www.ifwiki.org/StoryNexus) `[snippet-only, 403 on direct fetch]`
- [Cultist Simulator: Making Things Out of Other Things — Weather Factory](https://weatherfactory.biz/cultist-simulator-making-things-out-of-other-things/)
- [Book of Hours wiki cross-reference — search aggregation of Fandom/Weather Factory/Eldra Echo](https://weatherfactory.biz/boh-the-early-draft-edition/)
- [Crusader Kings 3 Dev Diary #30 — Event Scripting, Paradox forum](https://forum.paradoxplaza.com/forum/developer-diary/crusader-kings-3-dev-diary-30-event-scripting.1397140/) `[title page 403'd; content read via cached snippet]`
- [Event modding — CK3 Wiki](https://ck3.paradoxwikis.com/Event_modding)
- [How to Pass Skill Checks in Disco Elysium — Gamers.Wiki](https://gamers.wiki/en/games/disco-elysium/guides/how-to-pass-skill-checks-in-disco-elysium-white-red-and-dice-rolls)
- [Skills — Disco Elysium Wiki (wiki.gg)](https://discoelysium.wiki.gg/wiki/Skills)
- [The Simulation Dream — Tynan Sylvester](https://tynansylvester.com/2013/06/the-simulation-dream/)
- [Storytellers — RimWorld Wiki (Fandom)](https://rimworld.fandom.com/wiki/Storytellers)
- [An Interview with Tarn Adams — Stanford Digital Humanities Specialist](https://dhs.stanford.edu/algorithmic-literacy/an-interview-with-tarn-adams/)
- [10 Turns Interview with Wildermyth developer — Turn Based Lovers](https://turnbasedlovers.com/10-turns-interview/with-wildermyth-developer/)
