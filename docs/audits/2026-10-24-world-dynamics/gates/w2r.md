# Wave 2R gate: repairs from the Wave 2 review

Date 2026-10-25. Branch `feat/world-dynamics`. Coordinator session; lanes in their own worktrees, merged one at a time with `--no-ff`.

**Status: landed.** Every serious finding from the independent review of Wave 2 is repaired and merged, `0cb88edee` to `d2d7649f7`, plus one coordinator commit (`727715986`). Not a close-out: no workspace build, no full suite, no verify gates and no balance run at this point; those are Wave 4's. Backlog items were not changed by this wave, since every finding below was a defect inside an item already recorded as landed in Wave 2.

## The review

Codex (gpt-6.1-sol), read-only, on a detached checkout of `f5fce5413` (the eight Wave 2 lanes merged, before integration). Verdict: needs validation; no fatal defect; eight serious, one minor. It found no unbounded observer-approval farm, no rally farm and no double count between observer trust and NPC response intent, and it confirmed the distinction between Slaughter's FTC merits holding and Cook's stay ruling against the opinions.

| # | Finding | Lane | Repair | Merge |
|---|---|---|---|---|
| 1 | Same-week replies recruited partners and discharged response intent wrongly: `isReply` compared turns while the answer check counted same-turn acts | NPC | Reply and discharge read ledger position; regressions in both orders | `6c13cd030` |
| 2 | An AG vacancy let DOJ targeting carry unjudged; special-counsel supervision read an expired acting | Institutions | Both read the authoritative chair-runner; DOJ casework refused with nobody holding the AG's authority | `0ff6ff4be` |
| 3 | Appointing an acting first, then nominating, escaped 5 U.S.C. 3345(b) | Institutions | `nominationEndsActing` on submission, first-assistant exception kept | `0ff6ff4be` |
| 4 | Repeated short policy deferrals escaped GAO review | Institutions | Review on the day a deferral ends; a new deferral of the same account inherits the finding | `0ff6ff4be` |
| 5 | Budget spending ignored impoundment releases earlier in the same packet list | Institutions | Spending computed from the snapshot after impoundment packets | `0ff6ff4be` |
| 6 | A defeated appointed senator kept a chair or leadership post | Succession | `holdsSeat` prunes posts against the seated roster before reseating | `d2d7649f7` |
| 7 | The daily scheduler applied deaths up to two days early | Succession | The phase runs on the week's last office day; a death lands at its week's close, never before its date | `d2d7649f7` |
| 8 | A token tariff pre-aged diversion for a later large tariff | Economy | Each increment of lost flow builds from its own measure's date | `0cb88edee` |
| 9 (minor) | An order's subject never reached the filing draw; federal sites never resolved to a state | Litigation | Subject threaded through `projectOrder`; federal sites resolve to their host state; the order desk projects with the subject (`727715986`) | `b955e0942` |

## What ran

- Each lane ran its own targeted engine tests, its probes and `tsc --noEmit -p packages/engine` in its worktree (NPC 123 tests; institutions 257; succession 20 files; economy 336; litigation 167).
- On the merged tree, the coordinator ran the seven covering test files together (`succession`, `turn-phases`, `npc-response`, `impoundment`, `legal-exposure`, `trade-volume`, `directives`): 128 passed. Player-core `src/policy` against a rebuilt engine: 36 passed; that build was discarded and `dist/` left as committed.

## Not run

The workspace build, typecheck and lint; the full engine, player-core and content suites; both probe suites end to end; the verify gates; the balance harness; any browser check. The Hill golden moves with repair 7 and was not re-taken; it is re-taken once, with attribution, at the Wave 3 integration.

## Carried

- When a nominee stops acting and nobody eligible is left, the office's functions fall to the agency head (5 U.S.C. 3348(b)(2)); that branch has no regression.
- A death drawn early in a week lands up to six days late (never early); the trade-off is recorded in `lanes/succession.md`.
- The public Section 232 investigation, finding and tariff sequence was not re-driven after repair 8; it files the same records the regressions use.
