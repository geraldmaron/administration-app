# About the Game — The Administration

*A quick, non-technical overview of what the game is, who it's for, and why it's interesting to play. For implementation details see `ARCHITECTURE.md`. For the data schema see `SCHEMA.md`.*

---

## The Pitch

You run a country.

Not a fantasy kingdom, not an abstract city, not a civilization from prehistory to the stars. A real, modern country — the one you choose — with its real institutions, real neighbors, real economy, and the real political constraints that come with them. You inherit the chair, and the desk, and the morning briefing. From there on, the decisions are yours.

The Administration is a turn-based political simulation about **governing under pressure**. You don't build factories, paint provinces, or move units on a map. You read a situation, pick one of three imperfect responses, and live with what happens next.

---

## What a Turn Feels Like

Every turn you are handed a scenario. A scenario is a single decision point framed as a political situation — a cabinet crisis, a border incident, a budget fight, a natural disaster, a scandal, a diplomatic opening. The setting is always specific to your country: a petro-exporter gets petro-exporter problems; an island state gets island-state problems; a constitutional monarchy doesn't get asked to dissolve a congress it doesn't have.

You read the briefing. Your advisors — the ministers whose portfolios touch this decision — weigh in with short, pointed takes. You choose one of three options.

You do not see the exact numbers. You see tone, scale, direction. "This will cost politically." "This will cost fiscally." "This will anger the opposition." The consequences arrive as a short news article describing what happened next, followed by shifts in the metrics that matter: approval, economic health, military readiness, legislative loyalty, international standing, and the quieter signals that can turn into crises if you ignore them.

Then the next scenario arrives.

---

## The Term

You hold office for a finite term. Your job is to still be in office at the end of it, ideally with a country that is better off than when you started — or at least one whose problems are the ones you chose to have.

Choices accumulate. The opposition you ignored in turn 3 becomes the opposition leading the protests in turn 14. The central bank you overruled stops returning your calls. The neighbor you antagonized remembers. State changes persist, and future scenarios are shaped by the state of your country, the state of your institutions, and the state of your relationships.

The game is not about winning a score. It is about the credibility of the story you leave behind.

---

## The Player Fantasy

You're not playing a god, a general, or a founder. You're playing the **person in the chair when the phone rings at 3 a.m.** — someone with enormous formal power, real constraints, and a shrinking inbox full of problems none of which have clean answers.

The fantasy is competence under constraint. The pleasure is making hard calls with incomplete information, watching the consequences ripple, and feeling the weight of a modern state behaving like a modern state. It is meant to be **realistic**, in the sense that a petro-exporter cannot grow its way out of a collapsed oil market by passing a tax credit, a landlocked country cannot solve a trade dispute by deploying a navy, and a parliamentary system cannot govern without a coalition.

Realism is not delivered through simulation minutiae. It is delivered through the specificity of the scenarios themselves — shaped by your country's **archetypes**, institutions, and relationships — and the specificity of the consequences.

---

## What Makes It Different

| Most political games | The Administration |
|---|---|
| Abstract country builders | A specific, real country with real archetypes |
| Generic scenarios that fire anywhere | Scenarios gated on country shape, institutions, and state |
| Exact numbers surfaced to the player | Tone and direction; numbers hidden |
| Win conditions from a rulebook | A term to survive and a story to leave behind |
| Decisions evaluated in isolation | Decisions accumulate and shape future scenarios |
| Cabinet is a stat block | Cabinet is a chorus of advisors with opinions |

---

## The Shape of a Session

- **Opening turns.** You settle in. Scenarios are lower-stakes, establishing your posture and relationships.
- **Mid-term.** Pressures build. Crises triggered by earlier decisions start to land. Your initial posture either holds or cracks.
- **Late term.** Legacy starts to matter. Your opposition becomes louder. The scenarios begin to test whether your term has added up to anything.
- **Endgame.** The final briefings arrive. What you leave behind is what your choices made.

A session ends when your term ends — or when you lose the chair.

---

## Who It's For

- People who liked *Suzerain*, *Democracy*, or *Crisis in the Kremlin* and wished the writing was tighter and the specificity sharper.
- People who want the flavor of a high-stakes political career without the grind of a grand-strategy campaign.
- People who like reading — scenarios, briefings, news articles, advisor takes.
- Anyone who has ever looked at a headline and thought "I'd have handled that differently."

Not for people who want twitch gameplay, optimizer puzzles, or military-first grand strategy.

---

## Tone

Grounded. Journalistic. Dry when it needs to be funny. Never cartoonish. The news articles you receive read like actual wire reports. The advisor takes read like actual meeting transcripts. The scenarios read like actual briefs. Realism is the tone; realism is also the constraint.

---

## Further Reading

- `ARCHITECTURE.md` — how the game is built, end-to-end.
- `SCHEMA.md` — the data model underneath it all.
- `logic.md` — game-logic rules (metrics, crises, effects, phases).
