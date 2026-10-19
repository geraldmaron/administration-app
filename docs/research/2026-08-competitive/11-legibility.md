# Legibility: the UX of "why did that number move?"

## 1. Scope

Covered: Democracy 3/4's cause-tooltip system; Paradox's nested-tooltip pattern (CK3 → Victoria 3)
and its well-documented readability failure mode; Football Manager's prose-report approach to
explaining a deep sim to a mass audience; Dwarf Fortress and RimWorld's thought/memory attribution
to mood; Slay the Spire's pre-commitment intent display; a pass over explainable-AI (XAI) research
on causal attribution for lay users.

Deliberately not covered: general dashboard/BI tooling (Tableau, Looker) beyond the one XAI paper
cited — that literature is enterprise-analyst-facing, not player-facing, and the transfer is thin.
Also not covered: Football Manager's underlying attribute math (opaque, and not the point — the
point is what it shows instead of the math).

## 2. Findings

1. **Democracy 4's cause display is a bidirectional influence graph, not a tooltip stack.**
   The details screen for any value (GDP, a poll number) shows animated arrows in and out of that
   node: incoming arrows are causes, outgoing arrows are effects, arrow color is polarity
   (green/red) and arrow speed is magnitude. A player traces a bad GDP number backward through
   connected nodes — schools underfunded → poverty up → crime up → tourism down → GDP down — by
   following the graph, not by drilling through nested text.
   [Democracy 4 Basic Gameplay Guide, Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=2242836711)

2. **Democracy 4's designer explicitly rejects simplification as a goal.** Cliff Harris frames the
   game's density as thematic: "Running an entire country is nightmareishly complicated... Being
   President or Prime Minister is shockingly complex," and he compares deliberately overwhelming
   the player to Medal of Honor's Omaha Beach level — bad by a conventional metric, on purpose, to
   create atmosphere. He rejects the modern instinct to streamline. This is a legibility
   *non-goal* stated on the record, useful context for calibrating how far we should NOT go.
   [Democracy 4's overcomplexity is by design, Cliffski's Blog, 2023-02-19](https://www.positech.co.uk/cliffsblog/2023/02/19/democracy-4s-overcomplexity-is-by-design/)

3. **CK3/Victoria 3's nested tooltip system was explicitly sold as "the wiki next to your mouse
   pointer," aimed at fixing Victoria 2's reputation that nobody could explain how the economy
   worked** — hover a term, get a tooltip, hover a highlighted term inside that tooltip, get
   another tooltip, indefinitely. Paradox's stated intent was educational scaffolding, not just
   reference lookup. [PCGamesN, developer interview](https://www.pcgamesn.com/victoria-3/nested-tooltip-system)

4. **The same nesting pattern is the documented failure mode.** Players report tooltips that link
   to further tooltips whose destination isn't obvious, information that exists *only* inside a
   tooltip chain with no other path to it, and separately, modifier stacks (CK3) that accumulate
   silently from many small events until the total is unreadable — not because any one modifier is
   confusing, but because the *list* has no hierarchy: every contributor gets equal visual weight
   regardless of size. [Paradox Forums, Interface recommendations thread](https://forum.paradoxplaza.com/forum/threads/interface-recommendations.1551789/)

5. **Football Manager explains a deep numeric sim to a mass, non-technical audience mainly through
   staff prose, not exposed math.** Coach/analyst "reports" translate morale, form, and tactical
   fit into natural-language assessments; the coach's own Man Management attribute governs how
   well that translation happens, so explanation quality is itself a simulated, in-fiction skill
   rather than a raw UI feature. The player is told a story about the player, not shown their
   underlying attribute deltas.
   [FM24 Staff manual, Sports Interactive Community](https://community.sports-interactive.com/sigames-manual/football-manager-2024/staff-r4959/) ·
   [FM24 Squad/Team Dynamics manual](https://community.sports-interactive.com/sigames-manual/football-manager-2024/your-squad-team-report-and-dynamics-r4957/)

6. **RimWorld's mood bar decomposes into a literal signed list of named thoughts, each one an
   attributable event or state** ("ate without a table: −6", "slept in the cold: −9", "admired a
   great sculpture: +4"). The current mood bar is live; a separate white-triangle "mood target"
   marker shows where the bar is heading as thoughts expire, so the player can see both the
   current state and the trend line for free. [RimWorld Wiki: Mood](https://rimworldwiki.com/wiki/Mood)

7. **Dwarf Fortress goes one layer deeper: thoughts are explicitly tied to memory tier.** A dwarf's
   thought screen distinguishes an immediate reaction ("felt satisfied at work") from a recalled
   one ("felt satisfied *remembering* work"), and separately flags "core memories" in a distinct
   color with the year attached — a small vocabulary difference that tells the player whether a
   mood swing is about something that just happened or something the character is still carrying.
   Only 8 short-term + 8 long-term slots actually drive current mood even though the full history
   is still viewable, so old, unpromoted grievances silently drop off. [Dwarf Fortress Wiki: Memory (thought)](https://dwarffortresswiki.org/index.php/DF2014:Memory_(thought))

8. **Slay the Spire tells the player the consequence before they choose, not after.** The enemy
   Intent icon shows the exact damage number and hit count (or buff/debuff type) for the coming
   turn *before* the player commits their cards, adjusted live if the player's own buffs/debuffs
   would change it. Design commentary is explicit that this is why players "never feel cheated when
   they die" — losses read as bad decisions, not hidden dice rolls. [Slay the Spire Fandom Wiki: Intent] · [Cloudfall Studios, Game Design Tips from Slay the Spire](https://www.cloudfallstudios.com/blog/2020/11/2/game-design-tips-reverse-engineering-slay-the-spires-decisions)

9. **XAI research draws a hard line we should respect: a causal chain is not automatically an
   explanation for a lay user.** The literature explicitly warns that dumping an attribution
   chain on a non-expert doesn't make a system explainable — people reason causally, not
   statistically, so a raw list of contributing factors (Paradox's failure mode) reads as noise
   unless it is filtered to the few causes that actually matter and framed in the user's own
   terms. [arXiv 1706.07269, Explanation in AI: Insights from the Social Sciences](https://arxiv.org/pdf/1706.07269)

## 3. Mechanics worth stealing

**A. Signed, attributed contributor list (RimWorld mood) — the base pattern for our metrics.**
What it is: every metric shows its current value plus a short, ranked list of the specific things
currently pushing it, each with a signed magnitude and a name a human would say out loud ("closed
the Fairview plant: −4 stability", "kept the border promise: +2 standing"). Why it works: the
player never has to ask "why" — the answer is already the second thing they see, and it reads at
a glance because it's signed and sorted, not narrated. Cost: cheap. We already compute effect
packets per act; this is presentation, not a new subsystem — surface the packet's named
contributions instead of only the delta. Risk: at 5 layers, contributor lists can get long: cap
to the top N with signed magnitude, collapse the rest into "+ 12 smaller effects," expandable.
**Fit: 5/5.**

**B. Recency/permanence vocabulary on grievance marks (Dwarf Fortress memory tiers).**
What it is: a one-word register distinguishing "this happened last turn" from "they still bring
this up" from "this defines how they see you now" — not a numeric decay curve exposed to the
player, just a tier label the grievance memory already has access to. Why it works: it turns a
timestamp into a feeling, which is exactly what a *grievance* system should surface, and it costs
nothing extra in UI real estate — one word before the grievance text. Cost: low. Our grievance
memory already needs a decay/promotion model internally to bound its size; this exposes the tier
we're already computing. **Fit: 5/5.**

**C. Backward-traceable node graph (Democracy 4) — right pattern, wrong screen for mobile.**
What it is: click any number, see its direct causes as a short list, click a cause, see *its*
causes, recursively. Why it works: it matches how the player actually asks "why" — one hop at a
time, not the whole graph at once. Limits: Democracy 4's own version is a literal animated
node-and-arrow diagram meant for a desktop canvas at 800px+ height; that specific visualization
does not survive a 375px phone. What transfers is the *traversal model* (tap a cause, it becomes
the new subject, "back" retraces your path), not the bubble diagram. At five simulation layers
this also needs a hard depth cap and de-duplication (the same upstream event will legitimately
touch several metrics) or it degenerates into Paradox's wall. Cost: medium — this is a real nav
pattern (a stack of drill-down sheets), not just a tooltip. **Fit: 4/5.**

**D. Pre-commitment consequence preview (Slay the Spire intent).**
What it is: show the player the concrete cost/effect of a choice before they confirm it, not just
after. Why it works: it converts "the game did something to me" into "I chose this, knowingly."
Cost: this is closest to what we already do with reply cost/effect previews on a scenario card —
the finding here is to protect that pattern as sacred and extend it to acts we currently reveal
only after commit (executive orders, instrument escalation). **Fit: 4/5**, mostly already banked.

**E. Prose synthesis layer above the numeric layer (Football Manager reports).**
What it is: a named in-fiction voice (chief of staff, press secretary, a named advisor) who
periodically summarizes *why things are the way they are* in one or two sentences of plain
English, sourced from the same contributor data as the numeric breakdown, not a separate authored
system. Why it works: for a mobile, session-short, 25–45 audience, prose is faster to parse than a
list for the *first* read; the list is for the player who wants to verify or dig. Cost: medium —
needs a lightweight template/generation layer over the existing effect-packet data (not new
authored content per instance); the risk is it drifting into a second source of truth that can
contradict the numbers if not literally generated from the same packet. **Fit: 4/5.**

## 4. Their weaknesses / our openings

1. **Paradox's tooltip nesting has no sense of scale.** A −1 modifier and a −40 modifier render as
   the same size text in the same list; players have to read the whole stack to know what
   mattered, and small-event modifiers silently accumulate without ever being surfaced as a group
   ("the game constantly throws events that give small modifiers that end up accumulating").
   Evidence: [Paradox Forums, Interface recommendations](https://forum.paradoxplaza.com/forum/threads/interface-recommendations.1551789/).
   **Our opening:** sort every contributor list by magnitude and visually weight it (size or
   position, not just a plus/minus color), and fold sub-threshold contributors into one
   named bucket by default. This is a rule to write into our metric-detail component now, before
   we have five layers' worth of small effects to retrofit.

2. **Some Paradox information exists *only* inside a tooltip chain, with no page or screen you can
   navigate to independently.** That makes the explanation undiscoverable unless you happen to
   hover the right word first. **Our opening:** every contributor in our metric breakdown should
   also be a permanent, searchable entry in the grievance/history log — the tooltip is a shortcut
   to that record, never the record's only home.

3. **Democracy 4's causal graph is desktop-only by its own physical construction** (a canvas of
   moving arrows below 800px tall doesn't fit) and by the designer's own admitted philosophy of
   deliberately not simplifying for a mass audience. **Our opening:** we can take the traversal
   *logic* while rejecting Harris's anti-accessibility stance outright — a stack of drill-down
   sheets (one cause-list per tap, "back" to retrace) delivers the same backward-chaining on a
   phone that a graph delivers on a monitor, and is explicitly required by our stated mobile-first
   texture.

4. **Football Manager's prose reports are excellent at the top level but opaque underneath** — a
   player who wants to verify "is the report right" has no first-class path to the raw numbers;
   the prose is presented as authoritative rather than as a summary of inspectable data.
   **Our opening:** never let prose be the *only* surface. Every advisor sentence should link to
   the same contributor list a numeric drill-down would show, satisfying both the fast reader and
   the skeptical one from one data source.

## 5. Sources

- [Democracy 4 - Basic Gameplay Guide, Steam Community](https://steamcommunity.com/sharedfiles/filedetails/?id=2242836711)
- [Democracy 4's overcomplexity is by design — Cliffski's Blog, 2023-02-19](https://www.positech.co.uk/cliffsblog/2023/02/19/democracy-4s-overcomplexity-is-by-design/)
- [Democracy 4: GUI update — Cliffski's Blog, 2019-11-09](https://www.positech.co.uk/cliffsblog/2019/11/09/democracy-4-gui-update/)
- [Victoria 3 will use Crusader Kings 3's tooltip system — PCGamesN](https://www.pcgamesn.com/victoria-3/nested-tooltip-system)
- [Interface recommendations — Paradox Interactive Forums](https://forum.paradoxplaza.com/forum/threads/interface-recommendations.1551789/)
- [FM24 Staff manual — Sports Interactive Community](https://community.sports-interactive.com/sigames-manual/football-manager-2024/staff-r4959/)
- [FM24 Your Squad, Team Report and Dynamics — Sports Interactive Community](https://community.sports-interactive.com/sigames-manual/football-manager-2024/your-squad-team-report-and-dynamics-r4957/)
- [RimWorld Wiki: Mood](https://rimworldwiki.com/wiki/Mood)
- [Dwarf Fortress Wiki: DF2014:Memory (thought)](https://dwarffortresswiki.org/index.php/DF2014:Memory_(thought))
- [Slay the Spire Wiki: Intent — Fandom](https://slay-the-spire.fandom.com/wiki/Intent)
- [Game Design Tips from Slay the Spire — Cloudfall Studios](https://www.cloudfallstudios.com/blog/2020/11/2/game-design-tips-reverse-engineering-slay-the-spires-decisions)
- [Explanation in Artificial Intelligence: Insights from the Social Sciences — arXiv 1706.07269](https://arxiv.org/pdf/1706.07269)
