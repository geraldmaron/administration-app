# Strategy

How the game gets from where it is to the North Star. The phase plan is the map-first program; this file says why that is the route and what the route holds fixed.

## The obstacle

The simulation is built. What a President can do, and what happens because of it, already runs in the engine and is tested. The obstacle is that the player can't yet see and act on it: the engine models a country, its states, a world of 196 governments and the forces between them, and the player has to reach all of it on one surface that works at phone and desktop size.

## The route

**Rebuild the player around one context-aware map** ([the map-first program](audits/2026-10-10-map-first/PROGRAM.md); the brief is [DESIGN.md](DESIGN.md)). Every screen frames the place its subject happens and recolors the dots with what the screen is about, so the geography the engine already models becomes the way the player reads it.

The program runs in waves W0 to W9:

1. **W0** relocates what kept code depends on, deletes the previous player and its records, and leaves an empty, green shell.
2. **W1** proves the map renderer against its performance budget before anything is built on it, while the engine gains state approval, force placement and incident places.
3. **W2 to W3** build the map engine, the design system and the shell.
4. **W4** is the first playable loop: Brief, a decision, authorize, receipt and Record, on phone and desktop.
5. **W5 to W8** bring Nation, Washington, World and Record onto the map.
6. **W9** is parity and acceptance at every size.

`PLAN.md` holds each wave's status and `BACKLOG.md` holds the items.

## What the route holds fixed

- **TypeScript, one engine.** The player, the content validators and the balance harness run the same engine code (DECISIONS.md §1.1). There is no move to another engine or language.
- **Browser first, Electron for desktop and Steam.** One Vite build serves both (DECISIONS.md §8.1). iOS and Android store apps are not ship targets; the phone is served by the same web player at phone width.
- **Phone and desktop parity.** They differ in layout, never in what a President can do (DECISIONS.md §8.5).
- **Sell a complete first term.** The game ships when a first term is whole and playable, not when scenario counts reach a number.
- **Content ships with the player.** The corpus is baked into the build, and delivery stays solved before volume grows (DECISIONS.md §7.3).
- **God Mode is a lifetime unlock, not pay-to-win.** It is sold through Steam, shown as one settings row, and any campaign that uses it is never ranked (DECISIONS.md §10).

## The rule for new realism

A player-visible number is not finished because it is stored, rendered or unit-tested. It needs a producer, a reader, a surface, a calibration source and a proof. New realism work attaches to the existing causal graph, names the consequence the player sees, and carries its calibration and its proof. The capability ledger (`scripts/capability-ledger.json`) holds each engine act to the wave in which a player can reach it (DECISIONS.md §12.5).

## How the game is sold

Through Steam on desktop, and later on the web. God Mode is the one paid unlock. Whether Steam ownership is verified by `services/api` or by a client-side check is an open owner choice that has to be made before the settings row ships (DECISIONS.md §10.9).
