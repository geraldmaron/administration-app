# Lane bodies (BL-293): the Security Council, the SCO and the Israeli arsenal

Branch `lane/wd-bodies`. Probes GEO-7, GEO-8 and GEO-9 (`geopolitics.probe.test.ts` C and E).

## Sources opened (2026-10-25)

| Fact | Page |
|---|---|
| Council roster (5 permanent; ten elected: Bahrain, Colombia, DR Congo, Latvia, Liberia to 2027; Denmark, Greece, Pakistan, Panama, Somalia to 2026) | https://main.un.org/securitycouncil/en/content/current-members |
| Veto, abstention is not a veto, nine votes | https://main.un.org/securitycouncil/en/content/voting-system |
| Charter Art. 27 (procedural vs other matters, party to a dispute abstains in Chapter VI), Art. 25 | https://www.un.org/en/about-us/un-charter/chapter-5 |
| Charter Arts. 39, 41, 42, 43, 51 | https://www.un.org/en/about-us/un-charter/chapter-7 |
| SCO: ten members, "does not have the attributes of a defence alliance", charter 2002 in force 2003 | https://eng.sectsco.org/20170109/192193.html (also https://eng.sectsco.org/ for the current dated news) |
| Israel: "probably remained stable at around 90 warheads as of January 2026"; table 8A.10 lists 50 aircraft launchers (30 warheads), 50 Jericho II/III (50), 20 Popeye Turbo SLCM (10) | https://www.sipri.org/yearbook/2026/08 and its chapter PDF https://www.sipri.org/sites/default/files/YB26%2008%20World%20Nuclear%20Forces.pdf |

Not reachable or not used: the Bulletin Nuclear Notebook URL tried returned 404; SIPRI 2025 chapter 6 (https://www.sipri.org/yearbook/2025/06) opened but gives only the nine-state total in its summary.

## What changed

World:
- `packages/world/src/schemas/org-cradle-charter.ts`: new `CouncilRule` (`permanent`, `threshold`, `source`) and optional `Organization.council`. This is the only schema change; additive and optional, so no save migration and no dataset migration.
- `packages/world/src/validate/org-checks.ts`: `councilErrors` (a veto needs a seat; threshold cannot exceed the roster; a council is not a defense body; the rule names a link).
- `packages/world/src/dataset/orgs-cradles.ts`: `ORG-UNSC` (political, `council` set) and `ORG-SCO` (political, no `defenseScope`, no mutual-defense text), both in `ORGANIZATION_SOURCES` dated 2026-10-25. `applyMemberships` skips a body with a `council`.
- `packages/world/src/dataset/nations.ts`: Israel `{ warheads: 90, deliveryTriad: true, declared: false }`, sourced in a comment.
- Tests updated: `orgs-cradles.test.ts` (15 bodies became 17; new Council, SCO and not-mirrored tests), `org-checks.test.ts` (council rules), `trade.test.ts` (Iran's top-partner order now China, India, Turkey, Iraq, Saudi Arabia: India and Iran share the SCO and the gravity model counts a shared body of any kind. The old order had Turkey ahead of India, which is also the real order of their trade with Iran, so this is a side effect the integrator may want to accept or damp, not a gain).

Engine (new module, no shared contract file touched):
- `packages/engine/src/security-council.ts` and `security-council.test.ts`. Exports `councilVote`, `councilPosition`, `tallyCouncil`, `councilEffects`, `securityCouncil`. Not re-exported from `index.ts` (a shared contract file); the player-facing wiring will need that line.
- Probe `geopolitics.probe.test.ts` E: the presence check is replaced by seats, a veto test and an abstention test (as BL-293 asks); the SCO test is unchanged; the C comment now cites the opened SIPRI page.

## Why the Council is not mirrored onto nations

Everything that reads `nation.memberships` treats a shared body as a bond: the relationship graph adds alignment and damping, trade gravity counts shared bodies, and war joins give any shared body an obligation of 0.4 toward the partner (`compacts.ts#obligationWeight`). Mirroring a fifteen-seat universal forum would have made Panama owe Russia a war obligation. The roster stays authoritative on the organization record and the engine reads it there.

## How a vote works

`tallyCouncil` is Art. 27 and nothing else: nine affirmative votes; on a substantive measure any permanent "against" blocks; an abstention never blocks; a procedural measure carries no veto. `reason` is `adopted`, `vetoed` (nine or more votes and a permanent no) or `short-of-votes` (a permanent no on a draft that lacked nine is not recorded as a veto, since the draft failed on its own count).

`councilPosition` reads one member's vote from the existing relationship record: the sponsor votes for, the target against, a party to a dispute abstains on a recommendation (Art. 27 proviso), a member bound to the target by a treaty or a shared defense body and not to the sponsor votes against, otherwise `0.25` for a treaty tie to the sponsor plus half its disposition toward the sponsor minus its disposition toward the target decides yes, abstain or no against a margin that rises with the measure (recommendation 0.04, sanctions 0.12, force 0.25; no below -0.1). The margins and the 0.25 and 0.5 weights are planning values, not fitted.

`councilEffects` is the declared consequence of an adopted draft: a recommendation binds no one; sanctions bind members (Art. 25, Art. 41); a force authorization permits member states to act and obliges none (Art. 42; the Art. 43 agreements were never made). `usDomesticAuthority` and `militaryOutcome` are literal `"none"` on all four, so a resolution cannot be read as congressional authority or as a result in the field.

Observed on the shipped dataset (seed `sc-1`, sweep over all targets for five sponsors, planning values above): US sanctions on Iran are blocked by China and Russia; a US force authorization against Venezuela has nine votes and is vetoed; a US recommendation adopts with a Russian or Chinese abstention; across the sweep force authorizations almost never pass (1 of 195 for the United States).

## Nuclear predicates (regime-acts.ts is the NPC lane's; not edited)

| Site | Test | Reads `declared` |
|---|---|---|
| `instrument-gates.ts#outsideNuclearDeterrence` (force: blockade, strike, invasion) | `warheads > 0 && declared !== false && deliveryTriad` | yes, matches DECISIONS 6.9 |
| `regime-acts.ts#nuclearArmed` (used by `regime-rung.ts:106,118` and `regime-npc.ts:52`) | `warheads > 0 && deliveryTriad` | **no** |
| `forces.ts#declaredWarheads` (every printed count) | `declared === false` gives undefined | yes |
| `resolution.ts` drag, `forces.ts#nuclearReading`, `relationship-graph.ts#nuclearWeight`, `war-entry.ts` | `warheads` and `deliveryTriad` | no, by design: the fog hides the count, not the deterrent |

DECISIONS 6.15 says "a government that declares an arsenal it can deliver is refused as a target", and its comment in `regime-acts.ts` says the same, but the code does not test `declared`. With Israel now at 90 warheads and a delivery means, `nuclearArmed(ISR)` becomes true, so coup, political-action, capture and lethal operations against Israel would be refused, and NPC sponsors would skip it, which is the opposite of what 6.9 and 6.15 say for an undeclared arsenal (undeclared: not refused, but the odds are stiffened by the drag). Needed change for the NPC lane, one line:

```ts
return arsenal !== undefined && arsenal.warheads > 0 && arsenal.declared !== false && arsenal.deliveryTriad;
```

The gate text in `regime-rung.ts` ("a target without a declared arsenal it can deliver") already says this. The better shape is one shared predicate (`instrument-gates.ts` and `regime-acts.ts` both calling it); that is the NPC lane's call. `regime-acts.test.ts` should gain a case for an undeclared arsenal. I did not run that test with the one-line change.

## deliveryTriad: split not needed now

The field is read two ways: "can deliver" (the two refusal predicates) and "has three legs" (`nuclearReading` severity multiplier 1 vs 0.7, `nuclearWeight` 1 vs 0.75). It is `true` for the USA, Russia, China, GBR, FRA, IND, PAK and (now) Israel. Under either reading Israel is correct: SIPRI table 8A.10 lists aircraft, land missiles and submarine-launched cruise missiles. The United Kingdom (submarine-launched only) and Pakistan are `true` without three legs, and North Korea is `{ 30, false }` against SIPRI's 60 for January 2026; those are data questions outside this item. A split (for example `delivery: { air, land, sea }`) would need a schema migration and edits to `forces.ts`, `relationship-graph.ts`, `instrument-gates.ts`, `regime-acts.ts`, `war-entry.ts`, `player-core/src/world/nation-forces.ts`, `war-file.ts`, `war-powers-reading.ts`, `metric-copy.ts`, `stat-consumers.ts` and the generated figures. It is only needed if a rule must tell a submarine-only arsenal from a triad. Recommend leaving it, and renaming in prose only.

## Amendment text for the integrator

### docs/SCHEMA.md

Organization: add an optional field.

> `council?: { permanent: NationId[]; threshold: number; source: string }`. Present only on a body that votes. Each `permanent` government holds a veto on substantive questions and must be a member; `threshold` is the affirmative count a decision needs and cannot exceed the roster; `source` is a link to the founding text. A body with a `council` is not mirrored onto `Nation.memberships`.

Validator check set (`org-checks.ts`): add "a council's veto holders sit on it, its threshold fits its roster, it is not a defense body, and it names its source."

Registry: 17 bodies. `ORG-SCO` (political; 10 members; no defense scope) and `ORG-UNSC` (political; 15 seats; `council`), each with a dated source in `ORGANIZATION_SOURCES`.

Nation arsenal: Israel is `{ warheads: 90, deliveryTriad: true, declared: false }` (SIPRI Yearbook 2026, January 2026).

### docs/ARCHITECTURE.md

> **Security Council.** `security-council.ts` reads the registry's council rule. `tallyCouncil` applies Charter Art. 27 (nine votes; a permanent "against" on a substantive question vetoes; an abstention does not; a procedural question has no veto). `councilPosition` derives each member's vote from the relationship record, treaty and defense-body ties; `councilEffects` states what an adopted draft does and never grants domestic authority or a military result. Nothing in the loop calls it yet.

### docs/DECISIONS.md (new section, suggested 6.18 or the next free number)

> ### A Security Council resolution binds other governments and authorizes force abroad; it is never law at home or a result in the field
> The Council adopts a substantive draft on nine votes with no permanent member voting no. An abstention is not a veto. A procedural question needs nine and carries no veto. A party to a dispute abstains on a recommendation. A recommendation binds no one, sanctions bind members, a force authorization permits member states to act and obliges none. No resolution gives the President authority inside the United States, which comes from Congress, and none changes the odds or the outcome of the force it authorizes.
> **Why:** Art. 27 and Art. 25 of the Charter; Art. 42 authorizes and Art. 43 forces were never provided; the Council sits in no chain of command. A resolution read as authority or as victory would pay the President for a vote.
> **Where:** `packages/engine/src/security-council.ts`, `packages/world/src/dataset/orgs-cradles.ts`.

6.9 and 6.15 need no change in wording; 6.15's code must match its text (see above).

### docs/BACKLOG.md

- BL-293: data (Israel, SCO, Council roster) and the voting module are done; open: the Council is not yet reachable from play (no instrument, no desk matter, no NPC use), `index.ts` export, and the `regime-acts.ts` predicate above. Do not close until a player-reachable path exists or the acceptance is re-cut to the data and rules.

## Verification state

- World package: `cd packages/world && npx vitest run src`: 64 files, 565 tests pass.
- Engine tests resolve `@admin/world` through its stale `dist/`, which has no `ORG-UNSC` and no Israeli arsenal. The new module's behavioral tests and probes E and C therefore need the world dist rebuilt (`tsc -b` in `packages/world`, then the engine tests). I ran them with a throwaway config aliasing `@admin/world` to `packages/world/src/index.ts` instead: `security-council.test.ts` 14 pass; probes E (4) and C Israel (1) pass.
- `dist/` was not rebuilt or committed.

## Risks

- Trade gravity and relationship affinity now count the SCO (India, Pakistan, Iran, China, Russia, Belarus and the Central Asian four). Expect small shifts in founding relationship and trade partner order; one pinned test moved.
- Israel's arsenal now feeds war-entry premiums (`war-entry.ts`), the deterrence drag (`resolution.ts`) and the relationship graph's nuclear weight. Anything balance-tuned on Israel as unarmed needs the balance harness run by the integrator.
- The vote model's margins are planning values. They keep force authorizations rare and Russia and China opposed to US drafts against their partners, but they were not fitted to the Council's record.
