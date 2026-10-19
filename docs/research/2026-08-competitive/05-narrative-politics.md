# Competitive research: narrative-driven political games

## 1. Scope

Covered in depth: **Suzerain** (Torpor Games, PC 2020 / Switch 2021 / mobile 2022 /
console 2025) and its **Kingdom of Rizia** DLC (2024) — the closest relative to
The Administration in the field: text-and-dialogue presidential decision-making
with authored consequence.

Covered briefly, each for one specific thing it proves about the text-decision
form: **Reigns** (swipe + four-meter balance + death-as-content), **Yes, Your
Grace** (petitioner triage against four resources), **Not Tonight**
(checkpoint/dystopia framing, gig-economy pressure), **Beholder** (surveillance
as the resource you spend), **Orwell** (information selection as the core verb).

Not covered: Suzerain's Switch/console-specific input scheme (no primary source
opened); frame-by-frame breakdown of the 100+ tracked variables (no public
variable list exists — Torpor has not published the articy:draft project).
Democracy 4 and Crusader Kings-style pure-simulation games are out of scope —
they're a separate research file in this set.

## 2. Findings

### Suzerain — structure and state tracking

1. **Decisions are dialogue trees resolved against hidden variables, not a
   flowchart the player can see.** Torpor built the game in articy:draft, using
   character "reaction points" so the conversation flow branches automatically
   based on a variable's current value — the player is never shown that a
   branch happened. Conditions gate which reply options even appear;
   instructions attached to a choice silently write to a variable. Suzerain
   ships "over 100 variables" tracking consequences and 350+ meaningfully
   distinct choices. [Wikipedia](https://en.wikipedia.org/wiki/Suzerain_(video_game)) · [Articy showcase](https://www.articy.com/en/showcase/suzerain/)

2. **The player is told what happened, not shown it happening.** Suzerain has
   no combat, no visible negotiation minigame, no economic simulation the
   player runs — a choice is made, and the game reports the outcome later
   through dialogue, a news brief, or a "Fiscal Review" event. This is a
   **narration layer, not a simulation layer**: the appearance of systemic
   depth is authored, not computed. [Steam discussion, budget indicator](https://steamcommunity.com/app/1207650/discussions/0/3806156942410628653/)

3. **The budget stat conflates a stock and a flow, and the developer admits
   it.** A single "Government Budget" number is asked to represent both the
   treasury (a reserve) and the deficit (a flow), which is mathematically
   incoherent — spending draws down the number, and taxes are not shown
   accumulating even when the in-fiction economy improves. Community members
   labeled this "ludo-narrative dissonance." A Torpor dev responded on Steam
   that the visible number is a "projected growth indicator," not an actual
   simulation, and that outright removing it "might have upset even more
   players" — i.e., they kept a stat that lies because players expect a
   number more than they want an honest one. [Steam discussion](https://steamcommunity.com/app/1207650/discussions/0/3806156942410628653/)

4. **Constitutional reform is a scripted late-game branch, not a general
   system.** The Reformist path amends the 1929 constitution to weaken the
   "Old Guard"; the Dictator path amends it to strengthen the executive. Both
   are hand-authored story arcs unlocked by specific earlier choices (e.g.,
   supporting one faction at a specific meeting unlocks the article-6/7
   discussion), not a reform mechanic the player can invoke freely at any
   point in a term. [Suzerain Wiki, Reform](https://suzerain.wiki.gg/wiki/Reform) · [Suzerain Wiki, Reformist](https://suzerain.wiki.gg/wiki/Reformist)

5. **Cabinet loyalty is values-alignment, not a favor economy.** Ministers
   don't trade support for patronage; each has a personal ideology and
   resigns when the player's policy trajectory crosses a threshold specific
   to that character (a named minister resigns over corruption, another over
   a dictator turn, another over ultraconservative policy, another over
   communism). The player manages a *coalition of consciences*, not a
   transactional cabinet. [Suzerain Fandom, Cabinet](https://suzerain.fandom.com/wiki/Cabinet) · [Steam discussion](https://steamcommunity.com/app/1207650/discussions/0/2962769352277767434/?ctp=4)

6. **Long-fuse consequence is authored as chained gates, not simulated
   propagation.** The canonical example: an early co-investment decision is
   compatible with peace; stripping that stake *later* silently blocks a
   favorable peace summit many chapters afterward. The design intent stated
   by the team is explicit — no single decision should be able to collapse
   the country; every major failure state requires a *string* of related
   choices to compound. This is achieved by hand-placed prerequisite checks
   on later content, authored by the writer who wrote both ends of the
   chain — there is no propagation engine computing it. [Neoseeker walkthrough](https://www.neoseeker.com/suzerain/walkthrough) · [Suzerain Wiki, Decision](https://suzerain.fandom.com/wiki/Decision)

7. **Endings are a compass-position scorecard, not branching final states.**
   Both the base game and Rizia end on a results screen showing the player's
   accumulated political-compass position and achievement stats rather than
   a small set of discrete "endings" in the visual-novel sense — replay value
   comes from exploring different compass regions and the ~350 choice points,
   not from hunting a finite ending list. [Wikipedia](https://en.wikipedia.org/wiki/Suzerain_(video_game))

### Suzerain — reception and complaints

8. **The central critical complaint is opacity, stated almost identically
   across outlets and forums**: no visible approval rating, only a vague
   "economic development" bar; one reviewer says they felt like they were
   "running a country blindfolded." A second, related complaint: **decisions
   are made without a concise summary**, forcing players to parse long
   dialogue chains to reconstruct what a choice actually costs before
   committing to it. [Search synthesis — see multiple sources: OpenCritic](https://opencritic.com/game/10629/suzerain/reviews), [Steam reviews](https://steamcommunity.com/app/1207650/reviews/?browsefilter=toprated)

9. **The second complaint is railroading disguised as choice**: some critics
   describe the game as "mechanically much closer to a visual novel than a
   real political game" — the cabinet surfaces options only at scripted
   beats, so a player who wants to act on the economy off-schedule cannot.
   Other critics explicitly contest this and praise the branching as
   avoiding binary choices. The disagreement itself is a finding: Suzerain's
   prose quality is strong enough that some players don't notice the rails,
   and some do. [Search synthesis, critic reviews]

10. **Commercially it is a real, durable seller, not a niche curiosity**: over
    500,000 copies on PC as of December 2024, ~$6.1M gross Steam revenue,
    won a Games for Change award and a German games-industry award. [Torpor SOTG report](https://www.torporgames.com/sotgreport)

11. **The mobile port is the most instructive data point for us.** It
    required a full rendering rework (3D → 2D) for battery/performance, a
    total UI re-adaptation for touch and small screens, and shipped
    free-to-download with the first ~1 hour free and the rest a $3.99–4.99
    unlock. Launch (Dec 2022) drew 60,000 installs; by Nov 2023 it had grown
    to 450,000 installs with 5,300+ reviews; a Dec 2024 relaunch bundling two
    years of free updates plus the Rizia DLC brought 45,000 *new* active
    users and an App Store front-page feature. Store ratings are strong
    (4.5/5 Google Play, 4.6/5 iOS). **The lesson: a text-heavy political
    sim's mobile audience is not a rounding error next to PC — it roughly
    matched or outpaced PC install counts once ported properly** — but it
    required real rendering and UI investment, not a straight web wrapper.
    [TouchArcade](https://toucharcade.com/2022/11/17/suzerain-mobile-release-date/) · [Torpor SOTG report](https://www.torporgames.com/sotgreport)

12. **Rizia (the DLC) is the team's own admission of what the base game
    under-delivered on.** It gives the player a monarch with fewer
    institutional checks and "more freedom in terms of the direction you want
    to take the country," explicitly pitched as an easier, more open
    sandbox next to the base game's tighter rails — 91% positive on Steam,
    but with recurring player reports of mechanically inconsistent outcomes
    (e.g., a coup firing despite overwhelming military and alliance support),
    i.e., the authored-gate approach still leaks when a gate doesn't check a
    stat a player thinks it should. [SUPERJUMP](https://www.superjumpmagazine.com/its-good-to-be-king-suzerains-kingdom-of-rizia/) · [Steam discussion](https://steamcommunity.com/app/1207650/discussions/0/4295944344107924110/)

### The smaller games — one lesson each

13. **Reigns** proves that a legible, brutal state model (four meters, swipe
    left/right, hit zero-or-max on any meter and you die) makes *shallow*
    mechanics feel high-stakes because the state is always fully visible and
    the failure condition is instant and legible — the opposite of
    Suzerain's opacity complaint. Death is treated as content (a new king,
    a new short reign) rather than a fail state to avoid. [Wikipedia](https://en.wikipedia.org/wiki/Reigns_(video_game))

14. **Yes, Your Grace** proves petitioner-triage-against-a-resource-quad
    (gold/supplies/army/contentment) scales into longer campaigns than Reigns
    while staying legible, because the four resources are numeric and always
    on-screen — it never hides the ledger the way Suzerain hides "economic
    development." [GameSpew](https://www.gamespew.com/2019/11/yes-your-grace-blends-resource-management-with-challenging-decision-making/)

15. **Not Tonight** proves the form works at street level, not just head-of-
    state level — a bouncer checking papers under an authoritarian regime,
    with heat/hunger/tiredness meters and moral-hazard side jobs (bribes,
    dealing) layered on top. Useful precedent if The Administration ever
    wants a "the decisions you didn't make, seen from below" texture. [GameSpew](https://www.gamespew.com/2018/08/the-post-brexit-dystopia-of-not-tonight/)

16. **Beholder** proves that an information-asymmetry verb (surveil, bug,
    search, then choose what to report) can *be* the whole decision economy
    instead of decoration on top of one. **Orwell** sharpens this further:
    the core verb is literally selecting which pieces of conflicting, biased
    evidence ("datachunks") to keep, and choosing one instantly and
    irreversibly discards the conflicting one — the player's information
    curation is itself the moral choice, not a precursor to it. [Beholder Fandom](https://beholder.fandom.com/wiki/Summary) · [Game Developer, Orwell design deep dive](https://www.gamedeveloper.com/design/game-design-deep-dive-decisions-that-matter-in-i-orwell-i-)

## 3. Mechanics worth stealing

| Mechanic | What it is | Why it works | Cost given our systems | Fit |
|---|---|---|---|---|
| Reaction-point branching on hidden variables | Dialogue flow silently rerouted by a variable check, no visible branch UI | Preserves narrative momentum; player never sees the seams | We already gate scenario availability on flags/bands per the multi-hop chain work in progress; this is the same pattern applied *inside* a scenario's reply tree, not just at scenario-selection. Low — extend `ScenarioDef` reply nodes with the same condition grammar already used for activation | 4 |
| Values-aligned cabinet resignation thresholds | Named advisers quit at *their own* ideological breakpoint, not a shared "loyalty" meter | Cabinet feels like people, not a slider; makes appointments a real bet | We have cabinet appointments + relationship data already (trust/tension/alignment on nations — extend the same shape to cabinet). Medium — needs per-character threshold authoring, which is a content-doctrine job, not an engine job | 4 |
| Chained-gate long-fuse consequence, hand-authored both ends | A late scenario checks a flag written by an early one; no propagation engine, just paired authoring | Delivers the "your choice detonated three hours later" payoff without needing a general causality simulator | This is close to zero net-new engineering — it's exactly our "scenario activation driven by player acts/neglect" work already in flight. The Suzerain lesson is about *authoring discipline* (never let one choice alone collapse the state; always require a string), which is a doctrine note, not code | 5 |
| Legible resource ledger always on screen (Reigns / Yes, Your Grace) | Numeric meters visible at all times, no hidden "vibes" stat | Directly answers Suzerain's #1 complaint (opacity/"running blind") | We already expose five metrics + mandate + removal pressure — we are ahead of Suzerain here by default. Near-zero cost: the discipline is to *never* add a stat we hide the way Suzerain hid "economic development" | 5 |
| Information-curation-as-choice (Orwell) | Player picks which of several conflicting facts to act on/report, discarding the rest irreversibly | Turns "what do I know" into the actual decision, not flavor text before one | Fits our advisers-who-can-be-wrong direction and "grievance memory" work. Medium — needs a UI pattern for presenting conflicting intel and a reply-consequence hook when the *wrong* one is chosen | 3 |

## 4. Their weaknesses / our openings

1. **Suzerain's #1 complaint across critics and forums is stat opacity** — no
   visible approval rating, a budget number the developer admits is fake.
   The Administration already ships five *visible* numeric metrics plus
   mandate/removal pressure. This is a competitive opening if we protect it:
   never hide a number a player would reasonably expect to see, and never
   let a displayed number diverge from what it claims to represent (the
   exact trap Suzerain fell into). [Steam discussion](https://steamcommunity.com/app/1207650/discussions/0/3806156942410628653/)

2. **Suzerain's economy is not a simulation — it is narration that resembles
   one**, and its own developer says so on the record. Democracy has the
   inverse problem (real simulation, no prose). The Administration's stated
   goal of being both is the differentiator nobody else in this set has
   attempted; the risk is doing Suzerain's job (prose) well and Democracy's
   job (simulation) badly, landing exactly on Suzerain's failure mode instead
   of avoiding it.

3. **Suzerain's reform/dictator arcs are one-shot scripted branches**, not a
   general mechanic the player can invoke on their own schedule — this is
   part of why some critics call it "closer to a visual novel." Our
   escalation-ladder instrument model (diplomatic/economic/covert/military,
   five rungs each) is already a general, player-invokable mechanic rather
   than a scripted one-time branch — worth keeping that generality rather
   than converging toward Suzerain's scripted-arc pattern for future systems
   like constitutional reform, if we ever add one.

4. **Rizia's own bug reports show that hand-authored gates leak** — a coup
   fired despite overwhelming military and alliance support because no gate
   checked those stats. Our multi-hop chain and pressure-regime work in
   flight needs an explicit test discipline (`verify-scenario-dead-gate` /
   `verify-engine-reachability`-style checks) for exactly this failure mode:
   a late consequence firing (or failing to fire) against stats nobody wired
   it to. This is a concrete argument for extending the existing reachability
   verification gates to cover long-fuse condition chains specifically, not
   just single-hop activation.

5. **Mobile is not an afterthought market for this genre** — Suzerain's
   mobile install base (450k by late 2023) is the same order of magnitude as
   its PC sales (500k), and a bundled relaunch alone drove 45,000 *new*
   users. Given we ship mobile-first, this is validation, not risk: the
   audience for prose-heavy presidential decision games reads comfortably on
   a phone once the UI is actually rebuilt for touch (not ported as-is) —
   which is already our stated approach (`src/layout`, one route tree, no
   `Platform.OS` forks). [TouchArcade](https://toucharcade.com/2022/11/17/suzerain-mobile-release-date/) · [Torpor SOTG report](https://www.torporgames.com/sotgreport)

## 5. Sources

- https://en.wikipedia.org/wiki/Suzerain_(video_game)
- https://www.articy.com/en/showcase/suzerain/
- https://steamcommunity.com/app/1207650/discussions/0/3806156942410628653/
- https://suzerain.wiki.gg/wiki/Reform
- https://suzerain.wiki.gg/wiki/Reformist
- https://suzerain.fandom.com/wiki/Cabinet
- https://steamcommunity.com/app/1207650/discussions/0/2962769352277767434/?ctp=4
- https://www.neoseeker.com/suzerain/walkthrough
- https://suzerain.fandom.com/wiki/Decision
- https://opencritic.com/game/10629/suzerain/reviews
- https://steamcommunity.com/app/1207650/reviews/?browsefilter=toprated
- https://www.torporgames.com/sotgreport
- https://toucharcade.com/2022/11/17/suzerain-mobile-release-date/
- https://www.superjumpmagazine.com/its-good-to-be-king-suzerains-kingdom-of-rizia/
- https://steamcommunity.com/app/1207650/discussions/0/4295944344107924110/
- https://en.wikipedia.org/wiki/Reigns_(video_game)
- https://www.gamespew.com/2019/11/yes-your-grace-blends-resource-management-with-challenging-decision-making/
- https://www.gamespew.com/2018/08/the-post-brexit-dystopia-of-not-tonight/
- https://beholder.fandom.com/wiki/Summary
- https://www.gamedeveloper.com/design/game-design-deep-dive-decisions-that-matter-in-i-orwell-i-
