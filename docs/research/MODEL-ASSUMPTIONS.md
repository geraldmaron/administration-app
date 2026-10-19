# Model assumptions

What each modeled system deliberately abstracts away, and what that costs. The
purpose is that a later reader can tell an abstraction from a bug.

## The campaign clock (`packages/engine/src/clock.ts`)

**Abstraction.** Real Gregorian dates, exactly. No time of day: Inauguration Day
is January 20, not noon on January 20, because nothing in the simulation
resolves at finer than a day.

**Known limitation — the two calendars have not yet been reconciled.** The game
holds two incompatible notions of a year, and this work did not merge them:

1. `packages/engine/src/calendar.ts` + `clock.ts` — the real Gregorian calendar,
   365/366 days, leap years correct. This is what the player sees.
2. `packages/engine/src/pace.ts` — a 364-day fiction year with `TERM_DAYS = 1456`,
   chosen so a term divides evenly by every turn granularity and an election
   always lands on a turn boundary. This is what `elections.ts` computes with
   (`TERM_TURNS`, `MIDTERM_TURNS`).

So the *displayed* midterm date and the turn on which `electionPhase` actually
fires are computed by two different rules and will drift apart over a full term.
`selectNextMilestones` is honest about the calendar; the election arithmetic is
honest about the turn. **They do not yet agree.**

This was left rather than fixed because reconciling them changes when elections
fire, which moves every figure in `balance.test.ts` and `term-balance.test.ts` —
tests that were *already failing* at the time for unrelated reasons (the
dependency map that recorded them is in git history). Doing both at once
would make it impossible to say which change moved which number. Sequenced
deliberately: fix the balance failures first, then reconcile the calendars
against a known-good baseline.

**A second live inconsistency, inherited.** `advanceTurn` hardcodes
`DAYS_PER_TURN = 7` while `CampaignPace` offers weekly/biweekly/monthly and is
never stored on the Campaign. A campaign founded at any pace advances the
calendar seven days per turn.

## The causal ledger (`packages/engine/src/causality.ts`)

**Abstraction.** Provenance is stamped by `apply()` onto the existing
`ActionRecord`. There is no second history and no separate event store.

**Assumption.** The graph is a DAG because a cause is always an event that
already existed when the effect was stamped, so an edge can only point
backwards. `selectRootCausesOf` and `selectDecisionLegacy` nonetheless carry a
visited set, and `causality.test.ts` proves both terminate on a hand-built cycle,
because a corrupted save must not lock the Record.

**Known limitation — the graph is closed forward, not backward.** Every entry
written from this change on carries a stamp. Entries on a save written before it
have none, and there is no honest way to infer one: `causal` is therefore
optional on `ActionRecord`, and `findOrphanedCauses` reports only edges that
point at events genuinely absent from the ledger.

**Known limitation — coverage is opt-in.** `apply()` stamps every packet with an
id and an origin derived from `source`, so nothing is unnameable. But
`causeIds`, `locales`, `entities` and `systems` are only as complete as the call
sites that supply them, and **no existing call site supplies them yet**. The
machinery is proven end-to-end in `causality.test.ts` against the mission's own
tariff → steel → autos → Michigan → governor chain; wiring the thirty-one turn
phases to name their causes is not done.

## The attention model (`packages/engine/src/attention.ts`)

**Abstraction.** Three matters maximum, hard before soft, deduplicated by
subject and flood-controlled by actor, locale and institution. Ambient never
competes and never stops time.

**Assumption.** "Materially identical" is equality on an opaque `subject` string
the producing system chooses. This is deliberately not similarity scoring: a
subject a system had to name is a subject it thought about, and a fuzzy match
would silently hide genuinely different problems.

**Known limitation.** `deferred` is returned but nothing yet persists it across
stops, so a matter crowded out of one stop is re-raised by its source at the
next one rather than remembered. That is correct for standing conditions and
wrong for one-shot events; a durable queue is owed.

## Presence, and what it is allowed to buy (retired 2026-09-10)

**Abstraction.** Elapsed real time is never converted into world time. What
buys world time is a player pressing Continue, and what a press buys is decided
by the engine's horizon in days.

**What was here.** An activity gate banked the milliseconds a player was
genuinely at the desk — pausing on background, hidden, idle and any open
decision surface — so that presence itself could be spent as world time. It was
implemented, tested and mounted, and nothing ever consumed it. It was deleted
rather than left standing, because a mechanism with no buyer reads as unfinished
wiring to every reader who finds it.

**What restoring it would take.** A decision first: what session-active time is
allowed to buy that a press does not. Banking it precisely was never the hard
part.
