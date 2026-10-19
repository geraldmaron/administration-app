# AI Directors and Dynamic Difficulty

## 1. Scope

Covered: Left 4 Dead's AI Director (the canonical case); RimWorld's storyteller
system and its wealth-scaling exploit; Darkest Dungeon's stress/affliction
system as a "punishing on purpose" design; XCOM's hidden rubber-banding and
the community backlash on discovery; Resident Evil 4's hidden difficulty
system; Alien: Isolation's two-tier Director/Alien AI; Slay the Spire's
Ascension mode as a telegraphed, player-chosen escalation; general DDA /
flow-channel theory and the visible-vs-hidden debate.

Not covered: implementation-level pseudocode for any of these systems (traced
to the level the sources publish, no more); mobile/gacha "rubber-band
monetization" difficulty tuning (different problem — retention economics, not
drama); racing-game rubber-banding beyond its use as the field's cautionary
example. `[unverified]` is used inline wherever a claim rests on an aggregator
rather than a primary source.

## 2. Findings

1. **The L4D Director runs a four-state cycle, not a single dial.** Build-up
   (spawns ramp, mob size set by current player stress) → sustained peak
   (spawns continue at full population) → peak fade (no new spawns, existing
   threats persist, waits for stress to decay) → relax (near-zero threat
   population, lasts ~30-45 seconds, ends early if players start moving
   again). The "breather" is not a flat rest period — it's a phase gated by
   *measured player stress decaying below a threshold*, then time-boxed.
   Source: [The Director, Left 4 Dead Wiki](https://left4dead.fandom.com/wiki/The_Director)
   (mirrors Valve's own Director Scripts documentation), corroborated by
   [Valve Developer Community — Director Scripts](https://developer.valvesoftware.com/wiki/Left_4_Dead_2/Scripting/Director_Scripts).
   Michael Booth's GDC 2009 talk "The AI Systems of Left 4 Dead" is the
   original primary source; I could not extract readable text from the PDF
   (binary/compressed), so I'm citing the wiki's documentation of the same
   shipped scripts rather than the talk itself. **Fact.**

2. **RimWorld's threat scaling keys off wealth (+ population, + difficulty
   setting), not player skill or story position** — and this is public,
   documented, and exploitable. Cassandra Classic escalates a raid every
   ~10.6 days, minimum 1.9-day spacing; Phoebe Chillax stretches that to an
   8-24 day cycle so she can never double up; Randy Random drops the schedule
   entirely and applies a ±50% raw multiplier. Source:
   [RimWorld Wiki — Storytellers, via search excerpt of rimworldwiki.com]
   `[unverified — primary wiki page returned HTTP 403/402 on direct fetch;
   figures corroborated across two independent search extractions]`.
   **Fact**, moderately confident.

3. **The RimWorld wealth-exploit is not a rumor — players openly coordinate
   around it, and Ludeon has not fixed it.** On the official Steam forum,
   players confirm outright: "you can stall" raid difficulty by not
   recruiting or not accumulating goods, and recommend lowering the
   threat-scale slider or setting "Adaptation Growth" to 0%. One player
   describes the alternative "Wealth Independent" mode as "a trap" because
   once a colony takes losses under that mode, difficulty only ratchets up
   with no relief. Source:
   [Steam Community — "Possible to stall difficulty?"](https://steamcommunity.com/app/294100/discussions/0/600785448933294763/).
   Separately, players elsewhere call the wealth-hiding play required to
   avoid this "bad game design," and modders built "Raid Limiter" /
   "Unlimited Threat Scale" specifically to route around it. **Fact.**

4. **RimWorld does have a failure-state safety valve, but it is one-directional
   and separate from wealth scaling**: an "adaptation" mechanic reduces raid
   difficulty after colonists are downed or killed, then decays that discount
   back to baseline over time. It is not a hard floor against death spirals —
   it softens the next raid after a loss, it doesn't stop the wealth curve
   from making the raid after that one just as bad. `[unverified — described
   consistently across two search extractions, not confirmed against a
   directly opened wiki page]`. **Fact** (moderate confidence).

5. **Darkest Dungeon's stress/affliction system is explicitly designed to be
   unfair and to cost players some of the audience.** Red Hook's Tyler Sigman,
   on the record: "It's punishing. Sometimes unfairly... part of it is
   intentional," and the studio was reportedly comfortable if some players
   quit — treating that as evidence the tone was landing, not a failure to
   fix. Source: [Game Developer — "Darkest Dungeon: Designing for despair, and
   kicking you when you're down"](https://www.gamedeveloper.com/business/-i-darkest-dungeon-i-designing-for-despair-and-kicking-you-when-you-re-down).
   The mechanical shape: a stress meter per hero that, at 100, forces a
   virtue/affliction check; failing produces a persistent debuff (paranoid,
   masochistic, abusive, etc.) drawn from real stress-response patterns, not
   a random debuff table. **Fact.**

6. **XCOM's dynamic difficulty is real, documented, and the part players
   noticed (percentage-based "misses at point-blank range") is not actually
   the DDA — it's a UI/calculation quirk that looks like rubber-banding but
   isn't.** Confirmed hidden DDA: on Easy, displayed hit percentages are
   scaled up from the true odds; hit chances also shift based on recent
   miss/loss streaks. Separately, flanking bonuses are calculated at the
   *start* of the turn, so a soldier who moves to flank mid-turn still rolls
   against the enemy's pre-move cover — which produces "impossible" misses
   that have nothing to do with adaptive difficulty but get blamed on it
   anyway. Source: [Game Developer — "More Than Meets the Eye: The Secrets of
   Dynamic Difficulty Adjustment"](https://www.gamedeveloper.com/design/more-than-meets-the-eye-the-secrets-of-dynamic-difficulty-adjustment).
   Player reaction on the ground, from the Steam forums: genuine anger,
   comparisons to NBA Jam's "one set of rules for you, one for them," and a
   community response split between distrust and RNG-literacy pushback.
   Source: [Steam Community — XCOM rubber-band AI
   thread](https://steamcommunity.com/app/200510/discussions/0/613939294266695590/).
   **Fact + inference**: hidden DDA *itself* wasn't what triggered the
   backlash — an unrelated targeting-order quirk was, and it got attributed
   to the (real, but different) hidden system once players learned one
   existed. That's the actual ethics lesson: once a game is known to fudge
   numbers anywhere, players attribute *every* bad outlier to the fudge,
   including outliers the fudge didn't cause.

7. **Resident Evil 4's hidden difficulty system is the closest thing the
   industry has to a best-case "hidden and it worked."** It tracked
   headshots, damage taken, continues used, and inventory management to set
   an internal rank that adjusted enemy aggression/damage, item drop
   frequency, and even whether bonus crossbow enemies spawned later. Capcom
   never confirmed it existed; it was reverse-engineered by players and
   popularized years later by Mark Brown (Game Maker's Toolkit /
   Pocket Gamer). Reaction on discovery was positive, retroactively — framed
   as "an elegant balance," not a betrayal. Source:
   [Engadget — "Resident Evil 4 secretly adjusted its difficulty for
   you"](https://www.engadget.com/2015-06-03-resident-evil-4-difficulty.html).
   **Fact.**

8. **Alien: Isolation's Director never touches difficulty numbers — it
   controls information, and the Alien AI stays "honest."** A two-tier
   design: an omniscient Director AI tracks the player's true position and
   periodically tells the Xenomorph AI only to head toward the player's
   *general area*, never the exact location. The Xenomorph's own behavior
   tree (search, ambush, stalk, wander) runs on that imperfect information
   and its own sensors, so it can still be legitimately evaded — the game
   never lets the monster "cheat" to find the player. Source:
   [Game Developer — "The Perfect Organism: The AI of Alien:
   Isolation"](https://www.gamedeveloper.com/design/the-perfect-organism-the-ai-of-alien-isolation)
   and corroborating summary at
   [AI and Games — "Revisiting the AI of Alien:
   Isolation"](https://www.aiandgames.com/p/revisiting-alien-isolation).
   **Fact.**

9. **Slay the Spire's Ascension is the visible-difficulty counter-case to
   everything above: escalation the player opts into, one increment at a
   time, with each level naming exactly what it changes** (higher enemy
   stats, "shrooms"/curse cards added to the deck, worse shop economics,
   etc.), and increments stack — Ascension 5 carries every effect from 1
   through 5. Because each level is discrete and named, a run's difficulty
   is knowable *before* the first card is drawn, and a strong player can
   read their own early-run performance against a level they already know
   the terms of. `[unverified — summarized from Fandom wiki via search
   extraction; direct fetch returned HTTP 402]`. **Fact**, high confidence
   given cross-source agreement.

10. **The field's own literature treats invisibility as the goal, and treats
    *detectability* — not adjustment per se — as the failure mode.** The
    recurring formulation across sources: "for DDA to be most successful, it
    should be invisible — the player should never feel it happening,"
    contrasted against Mario Kart rubber-banding, which is loud, external,
    and reads as the AI getting handed a different rulebook mid-race.
    Source: [Game Developer — "More Than Meets the Eye"](https://www.gamedeveloper.com/design/more-than-meets-the-eye-the-secrets-of-dynamic-difficulty-adjustment).
    **Inference from a stated design norm**, not a controlled study — no
    source here reports player-preference data comparing disclosed vs
    undisclosed DDA head to head.

## 3. Mechanics worth stealing

**A. Stress-gated relax phase, not a timer-gated one (from L4D).**
What it is: the "breather" ends when *measured pressure* decays past a
threshold, not when a clock runs out — with a floor and ceiling on duration
so it can't be gamed by stalling. Why it works: it makes the calm feel earned
rather than scheduled, and prevents a bored player from padding the clock.
Cost given our systems: low. We already compute a mandate/removal-pressure
composite per turn; a "breathing week" that ends when composite pressure
drops below a threshold (bounded 1-2 weeks either way) is a small state
machine on top of numbers we already have. **Fit: 5/5** — this directly
validates and sharpens the "breathing week" already in design. Recommendation:
don't make it a fixed week — gate it on pressure decay with a min/max
duration, matching L4D's relax state (30-45s real-time bounded, ends early on
player movement).

**B. Named, stacking severity tiers the player opts into (from Slay the
Spire's Ascension).** What it is: discrete, labeled difficulty increments the
player chooses, each with a stated mechanical change, that stack. Why it
works: it converts "the game got harder" from a hidden judgment into a
legible contract the player signed. Cost given our systems: low-to-medium —
we'd need to decide whether *pressure regime intensity* is something the
player can see a name and description for (e.g., "Contested," "Crisis
Footing," "Emergency Powers Pressure") rather than a silent internal number.
**Fit: 4/5.** This is the strongest lever for answering the visible-vs-hidden
question below in our favor: name the tiers, even if the exact thresholds
that trigger them stay hidden.

**C. Two-tier separation of "what escalates" from "what executes" (from
Alien: Isolation).** What it is: an omniscient director that adjusts
*pressure inputs* (what shows up, how often) without ever letting individual
systems cheat their own logic. Why it works: it keeps the ratchet legible and
fair at the moment-to-moment level even while the macro system is
aggressively adaptive — nothing the player experiences directly "lies" to
them; only the frequency/timing of inputs is centrally directed. Cost: low —
this is close to our existing architecture already (engine computes bands/
pressure; scenario activation consumes them). The discipline to take from
this is negative: never let the pressure regime alter the *odds or honesty*
of an individual scenario's stated costs/consequences — only which scenarios
get selected and how often. **Fit: 5/5**, because it's as much a guardrail as
a mechanic — it forecloses a specific bad implementation (secretly worse math
on "hard mode" scenarios) before anyone builds it.

**D. Post-loss adaptation discount that decays (from RimWorld).** What it is:
after a real loss, immediately soften the next escalation step, then let that
softening fade back to baseline over a few turns. Why it works: it's a
narrow, cheap death-spiral valve that doesn't require re-architecting the
whole escalation curve — it's a temporary multiplier, not a state reset.
Cost: low, it's a decaying modifier on whatever drives pressure-regime
severity. **Fit: 4/5.** Caveat from finding 4: build the decay so it's a true
floor-then-recovery, not RimWorld's asymmetric version where the *scaling
driver itself* (wealth) keeps climbing underneath the temporary discount —
otherwise you've only delayed the spiral, not stopped it.

**E. Track the real driver, don't let the exploit anti-pattern in (anti-lesson
from RimWorld).** What it is a warning against: RimWorld couples "you're
doing well" to a single legible number (wealth) a player can simply decline
to increase. Why it's a trap: it converts "escalating difficulty" into
"optimal play is under-performing on purpose," which is corrosive to a game
whose whole premise is that the player *should* want to govern well. Cost to
avoid it: the pressure regime must be driven by something the player cannot
cost-lessly suppress by declining to act — success/failure *outcomes*
(scenarios resolved well vs. badly, removal pressure trend) rather than a
single accumulation stat like treasury or mandate score alone, since those
map too directly onto "just don't grow the number." **Fit: N/A (constraint,
not a mechanic)** — treat as a hard design requirement, not optional.

## 4. Their weaknesses / our openings

1. **RimWorld's exploit is a category error the field hasn't widely
   corrected**: coupling threat scaling to an accumulation stat instead of to
   performance invites players to freeze the accumulation stat. Our opening:
   we already have "removal pressure" and multi-hop consequence chains as
   candidate drivers — neither is a single number the player can trivially
   flatline without also flatlining their ability to play the game (unlike
   RimWorld wealth, which you can decline to grow while still surviving
   fine). Evidence: findings 2-4 above; Steam thread confirming the exploit is
   common knowledge and Ludeon's own "Wealth Independent" alternative mode is
   worse, not better, per players.

2. **XCOM shows that even a technically well-scoped hidden DDA system gets
   blamed for unrelated bugs once players know it exists at all — trust, once
   spent on "the game fudges numbers," doesn't come back cheap.** Evidence:
   finding 6. Our opening: if we run any hidden adjustment, we should be far
   more conservative about *scope* than XCOM was — hidden adjustment should
   touch scenario *selection frequency*, never displayed costs, odds, or
   consequence math, so that a player who suspects manipulation can verify
   from the record that nothing was faked, only that pressure changed what
   showed up.

3. **Darkest Dungeon's "we're fine if some players quit" stance is not
   available to us the same way** — DD's audience opted into brutality as the
   genre premise; ours is a broader 25-45 audience playing a governance
   simulation, not a horror-roguelike. Evidence: finding 5. Our opening:
   escalating pressure needs the L4D framing (drama, rising and falling) far
   more than the DD framing (punishment, unfairness as a feature) — our valve
   needs to be more generous than DD's, because we don't have DD's
   self-selected tolerance for unfairness.

4. **Nobody in this set has solved "visible escalation that still surprises
   you.**" L4D is invisible-but-fair; Slay the Spire is visible-but-chosen
   (you pick your Ascension level before the run, so there's no mid-run
   surprise). Nobody combines "the player can see the tier name and general
   shape of what's coming" with "the specific timing and content still
   surprises them turn to turn." That's open space: name the pressure regime
   tiers and their general character (openings B above), while keeping
   scenario *selection* within a tier as unpredictable as it is today.

## 5. Answers to the four questions

**(a) Visible or hidden?** Named-tier-visible, mechanism-hidden. The field's
consensus (finding 10) is that *detectable* adjustment erodes trust, but
that's a claim about players noticing math being fudged mid-encounter (XCOM),
not about players knowing a difficulty concept exists (Slay the Spire names
its tiers explicitly and nobody calls that dishonest). The synthesis: tell
the player the pressure regime exists and roughly where they stand in it
("Crisis Footing" or equivalent), the way Slay the Spire names Ascension
levels — but keep the exact scoring/threshold math opaque, the way L4D never
surfaces its intensity number. This gets us legibility without giving players
a number to game.

**(b) Prevent a death spiral without making failure impossible?** Use a
decaying post-loss discount (mechanic D) bounded by a hard floor, combined
with L4D's stress-gated relax phase (mechanic A) rather than a fixed cooldown
— the valve should open when measured pressure crosses a threshold, not on a
calendar, and it should have a minimum *and* maximum duration so it can't be
farmed. Critically, per finding 4's caveat: the floor must apply to the
underlying driver of escalation, not just a temporary multiplier on top of an
undiscounted driver, or the spiral resumes the moment the discount decays.

**(c) Prevent the RimWorld inverse exploit — deliberate underperformance to
stay easy?** Never key the regime to a single accumulation stat the player
can flatline while still functioning (findings 2-4, mechanic E). Key it to
resolved outcomes — how scenarios were handled, trend in removal pressure,
chain-consequence severity — not to a treasury or mandate balance a player
can simply decline to grow. If any accumulation stat must be an input, blend
it with a performance signal so freezing the stat alone doesn't freeze the
regime.

**(d) Escalation as drama vs. punishment?** Two things separate L4D's
"drama" read from Darkest Dungeon's "punishment" read, per findings 1 and 5:
(1) L4D's peaks are followed by a *guaranteed, legible* relax phase — drama
needs a return to baseline the player can count on, not just occasional
mercy; (2) L4D's peaks are driven by external threats (hordes) the player
didn't cause, while DD's stress is caused by the player's own choices
compounding on their own characters — DD reads as punishment partly because
the player did it to themselves and Red Hook says so on the record. For a
presidency sim, most pressure-regime escalation should read as the world/
opposition escalating in response to the player's weak position (L4D
framing: external threat responding to detected weakness), with player
failure as the *trigger* for the escalation rather than its direct cause —
that framing carries much less of the "the game is punishing me personally"
read that Darkest Dungeon deliberately embraces and that our broader audience
won't tolerate the same way.

## 6. Sources

- [The Director — Left 4 Dead Wiki](https://left4dead.fandom.com/wiki/The_Director)
- [Director Scripts — Valve Developer Community](https://developer.valvesoftware.com/wiki/Left_4_Dead_2/Scripting/Director_Scripts)
- [Game Developer — The Discomfort Zone: The Hidden Potential of Valve's AI Director](https://www.gamedeveloper.com/design/the-discomfort-zone-the-hidden-potential-of-valve-s-ai-director)
- [Steam Community — RimWorld: "Possible to stall difficulty?"](https://steamcommunity.com/app/294100/discussions/0/600785448933294763/)
- [Game Developer — Game Design Deep Dive: Darkest Dungeon's Affliction System](https://www.gamedeveloper.com/design/game-design-deep-dive-i-darkest-dungeon-s-i-affliction-system)
- [Game Developer — Darkest Dungeon: Designing for despair, and kicking you when you're down](https://www.gamedeveloper.com/business/-i-darkest-dungeon-i-designing-for-despair-and-kicking-you-when-you-re-down)
- [Game Developer — More Than Meets the Eye: The Secrets of Dynamic Difficulty Adjustment](https://www.gamedeveloper.com/design/more-than-meets-the-eye-the-secrets-of-dynamic-difficulty-adjustment)
- [Steam Community — XCOM: "Dynamic Game Difficulty Balancing AKA: Rubber Band AI"](https://steamcommunity.com/app/200510/discussions/0/613939294266695590/)
- [Engadget — Resident Evil 4 secretly adjusted its difficulty for you](https://www.engadget.com/2015-06-03-resident-evil-4-difficulty.html)
- [Game Developer — The Perfect Organism: The AI of Alien: Isolation](https://www.gamedeveloper.com/design/the-perfect-organism-the-ai-of-alien-isolation)
- [AI and Games — Revisiting the AI of Alien: Isolation](https://www.aiandgames.com/p/revisiting-alien-isolation)

Sources referenced from search-tool extraction only (direct fetch blocked by
paywall/403, so treat with the `[unverified]` caveats noted inline above):
RimWorld Wiki "Storytellers" / "AI Storytellers" pages (rimworldwiki.com),
Slay the Spire Wiki "Ascension" page (slay-the-spire.fandom.com). Valve's
original GDC 2009 talk ("The AI Systems of Left 4 Dead," Michael Booth) was
located but its PDF could not be parsed to readable text in this session; the
Left 4 Dead Wiki / Valve Developer Community pages cited above document the
same shipped Director scripts and are used in its place.
