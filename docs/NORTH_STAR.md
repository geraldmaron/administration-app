# North Star

What the game is meant to be and what it should feel like. How it is built is in `ARCHITECTURE.md`, the data shapes are in `SCHEMA.md`, the standing rules are in `DECISIONS.md`, what the player sees and does is in `DESIGN.md`, and where the work stands is in `PLAN.md`.

## 1. What the game is

The player is the **President of the United States**, taking office among the **196 governments** a President deals with: the 193 UN members plus Taiwan, Kosovo and Palestine. Their statistics mechanically matter. GDP, military strength, trade dependence and regime stability are read by resolvers and simulators, not shown as decoration. The world is in flight: other governments act against the President *and against each other*, non-state operators (cartels, insurgencies, hacker crews) run their own agendas, and relationships drift and hold grudges whether or not the President engages. No two campaigns feel the same, because five seeded sources of divergence (stat jitter, trait and agenda rolls, relationship perturbation, the person-pool draw, and founding choices) guarantee it, and a divergence probe test holds the guarantee (DECISIONS.md §1.13).

Every decision costs something to think about. Before the President commits, the game shows cost, odds, risk and ripples, with cabinet counsel that can disagree. An option with no cost, no opponent and no ripple is a content defect, caught by the audit (§7.4).

The player works in an **operations workspace** that is also a game: analytical surfaces under navy institutional navigation, documents that look like the government's own (letterheads, seals, classification banners), a situation room for crises, and maps where geography answers the question. A President can investigate, compare against benchmarks and against other governments, configure, review, authorize and observe the same work on a phone, a tablet and a desktop. Every power the President uses names the law that grants it, so playing teaches how the office actually works. `DESIGN.md` is the brief; DECISIONS §8 records the accepted direction.

The game ships as **one universal app for iOS, Android and the web**, built with Expo and Tamagui. Electron packages the same app's web export for Windows, macOS and Steam. The simulation is TypeScript and platform independent (DECISIONS.md §8.1).

**Hard constraints:**

- **All content is written ahead of time.** The game makes no model calls during play. The runtime is a deterministic selector, resolver and simulator over a bundled content pool (DECISIONS.md §7.1, §7.3).
- **Real living people are never named.** Heads of state, cabinet secretaries, journalists, opposition figures and every foreign leader are fictional, drawn from one person pool (§2) and persisted per campaign. Each foreign leader matches their real counterpart on the attributes in the leader table, which is never rendered (DECISIONS.md §4.10).
- **News organizations are fictional.** No real outlet appears in player-facing copy.
- **Real event *classes* may seed content; no real article prose is reproduced.**

**Pacing follows presidential attention.** The simulation keeps a weekly tick as its resolution, but the President is never asked to approve the passage of a meaningless week (§4).

## 2. Canon: every nation is the same shape

The United States is a record in the same table as the other 195 governments, with the same fields, plus `playable: true`. Nothing player-only is special-cased on the US. One shape means one validator and one set of rules (DECISIONS.md §4.1).

The United States gets the full authoring treatment on top of its real statistics: the constitutional charter (`charter-usa-constitution`, impeachment removal, American cabinet titles), its states and congressional districts, named places, and a starting person pool with drawn faces. All of its people are fictional. It passes the same validators every other nation does.

Authored content never targets a specific nation except in deliberate, audit-flagged set pieces. Content targets **bands** derived per nation (archetype, power tier, wealth tier, alignment band, stability band, military tier), so adding a nation needs a data record, not new content (DECISIONS.md §4.6, §7.6).

People are the fictional layer. One pool (`Person`) supplies cabinet candidates, foreign heads of government and ministers, opposition figures and journalists. A person's identity is never re-derived after it is persisted, and no runtime model call creates one (DECISIONS.md §4.9).

## 2b. The score

The score is a **metric set** (approval, treasury, stability, military readiness, standing) plus an **alignment vector** that places the President's accumulated decisions politically.

**The headline is approval.** It is the poll the public actually holds, derived from the six judgments a public makes: prosperity, security, services, integrity, competence and unity. The other readings are causes. Order at home, an army that can answer, a treasury that can pay and a country other capitals take seriously are reasons people think well of a government, and they reach the score the way reasons do: through the public, at the public's speed. The engine is the authority (`packages/engine/src/metrics.ts`, `opinion.ts`).

Every metric swing is explainable *in fiction*. Cabinet counsel names what moved it, a dispatch carries the causal thread, and the projection shows cost, odds, risk and ripples before the President commits. A President who loses ground can always trace why, in the voice of someone in their administration, without opening a debug panel. On the map, the delta lens shows a decision's consequences recoloring the places it touched.

## 3. Taking office

Founding is taking office. The player authors who the President is and appoints the cabinet. The charter is the Constitution, the flag is the flag, and the country's memberships are its real ones. The final seal fixes the campaign seed.

The charter decides how a President can lose power: impeachment and conviction, electoral defeat, or the end of the second term. Removal pressure is driven by approval, the President's alignment, their record, Congress and the metric floors, never by a scripted timer, and the chambers decide whether pressure becomes removal (DECISIONS.md §2.6).

Geography matters mechanically: distance decay on force projection, sea-lane and chokepoint dependence on trade, neighbor adjacency on border incidents and refugee flows, and disaster exposure by region. At home, a domestic act lands on the states and cohorts its declared signature reaches (DECISIONS.md §5.6).

## 4. The world in flight

Every other government runs a lightweight utility agent each week. It scores candidate moves against its rolled agendas, weighted by its traits, and constrained by what it can actually project and by geography. It acts against the President *and against other governments*, visibly, through the world feed and intelligence reports. Non-state operators run separate agendas, creating problems with no diplomatic counterparty, which is what stops every crisis from being solvable by talking to a capital.

The five instruments (diplomatic, economic, covert, military and assistance), each with five rungs, are available to every government on the same terms as the President, gated by capability rather than narrative convenience.

**Real time buys no world time.** The only thing that advances the world is a President who is present and presses Continue. Restoring a save advances nothing (DECISIONS.md §2.1).

**Time moves on attention.** When the President continues, the world runs until something genuinely needs them, a requested horizon is reached, a constitutional or statutory milestone arrives, or the presidency ends. A quiet fortnight is allowed to be quiet; a crisis may hand control back after days; several matters may arrive together. What happened while the world ran reaches the player as a concise digest rather than as mandatory interruptions (DECISIONS.md §2.2).

## 5. God Mode

God Mode is a one-time lifetime entitlement, sold through Steam and verified rather than asserted (DECISIONS.md §10.9). It appears as a single settings row for players who hold it (§10.1). It offers omniscience (true figures, hidden agendas, covert activity), direct world editing and invulnerability; time control is designed but not built. Every God Mode action is an `EffectPacket` through the same `apply()` gate normal play uses, so it cannot corrupt state in ways normal play cannot express (§10.6). A campaign that uses it is marked Sandbox for good and is never ranked: the sandbox sells freedom, not a competitive advantage (§10.4).

## 6. What the game refuses to be

- It is not a Civilization-style 4X with combat and city-building.
- It is not a Crusader Kings-style schemer with marriage and assassination as the primary loop.
- It is not a procedural narrative roguelike that generates text at runtime.
- It is not multiplayer. Each campaign is one player's world. There is no cloud save; the local save is the only copy (DECISIONS.md §8.7, §9.5).
- It is not real-time or wall-clock dependent. Absence costs the player nothing.
- It never features real living people. This is a permanent rule, not a scope limit.
- It has no ads.
- It is not pedagogical or didactic in tone.

The reference texture is closer to a season of a quality political drama than to a Paradox grand-strategy game.

**The register is a sharp newsroom.** Short ledes that commit to an angle, a stated reason the reader should care, and a particular (a name, a number, a refusal) in every paragraph that has one available. The discipline underneath is the harder half: no invented figures, no fabricated quotes, and no knowingness standing in for information. A piece that has been handed no particulars says less rather than reaching for mood. Wit is allowed where a fact carries it, never instead of one. `CONTENT_DOCTRINE.md` holds the full rule.

## 7. The always-true checklist

If any of these becomes untrue, something is wrong with the build:

- [ ] **No model calls at runtime.** Content is written ahead of time (DECISIONS.md §7.1).
- [ ] **No real living person named**, anywhere: cabinet, other governments, press, dispatch, operators. *(Held by the real-name guard, `packages/world/src/dataset/real-names.ts`, and its test.)*
- [ ] **No real news organization in player-facing copy.** *(Held by the content audit.)*
- [ ] **Every nation is the same shape.** The United States is a `Nation` record with `playable: true`; nothing player-only is special-cased (DECISIONS.md §4.1).
- [ ] **Every stat has a named consumer.** A field no rule reads does not belong in the schema; a dataset test asserts this (DECISIONS.md §4.2).
- [ ] **One mutation gate.** Every state change, whether from the President, another government, an operator, the weekly simulation or God Mode, flows through `apply(state, EffectPacket)` (DECISIONS.md §1.5).
- [ ] **Absence is not a currency.** Wall-clock time never advances the world (DECISIONS.md §2.1).
- [ ] **The world stops because it needs the President**: a matter, a horizon, a constitutional milestone or the end of the presidency, never a tick count (DECISIONS.md §2.2).
- [ ] **No two campaigns feel the same.** *(Held by `packages/engine/src/divergence.test.ts`.)*
- [ ] **Every decision costs something.** No option ships with zero cost, zero opponent and zero ripple (DECISIONS.md §7.4).
- [ ] **Every number carries its unit.** Money is stored in USD millions, and no simulation rule reads a display preference (DECISIONS.md §4.3).
- [ ] **God Mode cannot corrupt state.** Every God Mode action is an `EffectPacket` with `source: "godmode"` through the ordinary gate (DECISIONS.md §10.6).
- [ ] **Phone and desktop have task parity.** They differ in layout, never in what a President can do (DECISIONS.md §8.5; `DESIGN.md`).
- [ ] **Doc sync.** Schema, engine-contract, band, registry and scoring-constant changes update `SCHEMA.md` and `ARCHITECTURE.md` in the same change. *(The Doc Sync Contract in CLAUDE.md; `DOC_SYNC_MAP.md` maps each kind of change to what moves with it.)*

## 8. Where to find what

| If you want to understand… | Read |
|---|---|
| What the game is meant to be | This file |
| The standing rules and why | `DECISIONS.md` |
| What the player sees and does | `DESIGN.md` |
| The route from here to this North Star | `STRATEGY.md` |
| Where the work stands | `PLAN.md` |
| What is left, with full text | `BACKLOG.md` |
| The current program, its waves and proof | `audits/2026-10-10-map-first/PROGRAM.md` |
| End-to-end architecture | `ARCHITECTURE.md` |
| Data shapes and the validator | `SCHEMA.md` |
| How content is researched, written and reviewed | `CONTENT_DOCTRINE.md` |
| Content volume and cost | `CONTENT_PLAN.md` |
| The plain-words pitch | `ABOUT_THE_GAME.md` |
