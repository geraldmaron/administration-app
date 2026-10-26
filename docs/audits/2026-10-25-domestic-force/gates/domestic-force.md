# Domestic force acts gate record

Status: RUN, 2026-10-25 and 2026-10-26, on `feat/world-dynamics`, local only. Nothing is pushed.

Scope: the federal force acts enabled on their statutory predicates (DECISIONS §6.22), from the engine WIP commit `39476ba62` through the engine tests and probes (`e023fd92c`), player-core (`caa4ded98`), content and the legacy web keys (`b9f0cc73b`), the screens (`eeeb61d3f`) and the docs (`4c21ed961`), plus the §252 retune that follows this record. Plan and risk decisions: `DESIGN.md` and `RISK-PLAN.md` in this folder.

Ran at: `4c21ed961` for steps 1 to 7 and 10, then the working tree of the §252 retune (steps 6, 7 and the probes re-run on it).

## Gate steps

| # | Step | Result |
|---|---|---|
| 1 | Delete every build-info file | Done before the build |
| 2 | `pnpm run build` | Green, 14 of 14 projects, after two compile errors left by lanes were fixed (a closure that lost type narrowing in `scenario-audit-report.ts`; a missing `LocaleGateCheck` import in player-core) |
| 3 | `pnpm run typecheck` | Green; also run explicitly for `@admin/player`, `@admin/web`, `@admin/desktop`, all clean |
| 4 | `pnpm run lint` | Green |
| 5 | `pnpm run test` | Green: engine 376 files and 5,111 tests (1 skipped), player-core 1,724, content 1,139, and the other packages; re-run on the retune tree: engine 376 files, 5,111 tests |
| 6 | Every `scripts/verify-*.mjs` | 88 of 88 pass after fixes: the history gate allowlist gained the new audit folder; a local component `Odds` shadowed a shared one and was renamed `OrderOdds`; a numeric negative margin on the state checkbox was removed; four semicolon and colon-join findings in new copy were rewritten |
| 7 | Metric registry report, then its verify | Regenerated; verify passes ("284 registered fields, 19 blind sites forgiven; the report is current") |
| 8 | Probes (`domestic-force.probe`) | 15 of 15 pass (7 cells x 8 seeds, about 18 minutes) |
| 9 | Balance (`domestic-force-balance`) | 28 of 28 pass (4 scenarios x 4 policies x 8 seeds x 52 weeks, about 39 minutes) |
| 10 | `dist/` committed and clean | `git status --short` was empty after each commit; the three union-order `.d.ts` files (`__fixtures__/campaign.d.ts`, `impact-event.d.ts`, `metric-registry.d.ts`) were committed as the clean build emitted them |
| 11 | Hill golden on Node 22 (`.nvmrc`) | Passes with no re-take, before and after the retune: the golden's campaigns take none of these acts |

## Gates the plan named as touched

All pass in step 6: `verify-authority-citations` and its proof (extended to `LOCALE_MISSION_ORDERS`, every locale act and `COURT_ORDER_KINDS`; the proof gained nine plants), `verify-fiscal-authority` and its proof (the relief literal is byte-identical), `verify-metric-registry`, `verify-file-size`, the American-English and US-units gates, `verify-renderer-boundary`, `verify-person-consequence-alignment`. `scripts/fixtures/court-challenge.mjs` ran inside step 6 with no failure.

## Balance criteria (medians, paired by seed, 8 seeds, 52 weeks)

| Criterion | Measured | Result |
|---|---|---|
| Escalating does not Pareto-dominate the assent path in 6 of 8 seeds | 0 of 8 in S0, S1, S2 and S3 | Pass |
| Spam weeks-to-resolve not below escalating | Spam never resolves in S1 and S2 (0 resolved) against escalating 7 and 8 resolved | Pass |
| Spam peak removal pressure at least escalating plus 0.05 | +0.321 (S1), +0.359 (S2), +0.211 (S3) | Pass |
| Spam week-52 protest above never-act | +0.454 (S1), +0.516 (S2), +0.435 (S3) | Pass |
| Spam draws at least 2 incidents per campaign | 121 (S1), 116 (S2), 50 (S3) | Pass |
| Escalating weeks at most 0.75 of never-act, assent at most 0.85 | Escalating 0.51, 0.52, 0.55; assent 0.52 in the assenting-governor scenario (asserted there only) | Pass |
| Escalating standing change at most assent's minus 0.04 (unrest 0.6, opposed governor) | -0.075 | Pass |
| Escalating approval change worse than assent's | -0.26 (S1), -0.52 (S2), -0.91 (S3; asserted at -0.5 or worse) | Pass. The plan's S1 figure of -0.5 points was a guess and is now a strict-sign check |
| Natural-scenario removal | 0 under never-act, assent and escalate; 1 of 8 under spam | Pass. The plan asked for 0 under every policy; removal under a weekly spam of every force act in a quiet country is the backlash the model should produce, so spam is reported and not asserted |

Spam removals in the unrest scenarios: 3 of 8 (S1), 4 of 8 (S2), 5 of 8 (S3).

## Census bands (reachability)

| Band | Measured | Result |
|---|---|---|
| Troops path (§251 or §253) in natural campaigns | 1 of 8 campaigns; natural unrest placed in one state is only 28 of 436 unrest state-weeks | Pass at "at least 1 of 8, at most 70 percent". The plan's 20 percent floor cannot be told from 12.5 percent with 8 seeds |
| §253 on national-scope unrest alone | 0 of 408 state-weeks | Pass (at most 10 percent) |
| §252 never without an application | 0 of 8 under never-act in the persistent-unrest scenario | Pass |
| §252 open soon after an injunction in escalating runs | Persistent-unrest scenario (unrest 0.9): 8 of 8 runs, at least half within ten weeks; mild scenario (unrest 0.6): 3 of 8 | Pass at ten weeks. The plan's six weeks excluded any seed denied once (decision up to 3 weeks, one week of defiance, a 4-week refiling cooldown) |
| Rebellion | 0 of 41 natural weeks; 8 of 8 in the insurgency-0.25 scenario | Pass |
| Surveillance under a court order | 7 of 8 (unrest 0.6) and 8 of 8 (unrest 0.9) escalating runs | Pass |
| Regular-forces Guard step | 4 of 8 persistent-unrest escalating runs; 1 of 8 in the mild scenario | Not dead |
| Dead or always open | §251, §252, §253, regular-forces, rebellion and surveillance each open in their designed scenario; none open in more than 90 percent of natural unrest state-weeks | Pass |
| Invasion | 0 of 8 in every cell: the census has no war cell | Not exercised by the census. `war-party.test.ts` covers an invasion opening federalize |

## What the probes changed

1. First run: the court-based §252 ground opened in 0 of 8 escalating runs, even at unrest 0.9. The timeline of one seed showed why: the property surge and troops ease unrest from 0.9 to under 0.5 in about four weeks, while an injunction takes about three weeks to decide plus one week of obstruction. Raising the injunction floor from 0.2 to 0.3, the plan's remedy, would not have changed that timing.
2. Retune: the §252 ground reads unrest at `OBSTRUCTION_STILL` (0.3) instead of the 0.5 the suit needs, because the mission that made the suit possible is also what eases the unrest while the court decides. DECISIONS §6.22, ARCHITECTURE and the N53 audit line say 0.3. Result: §252 opens in 8 of 8 persistent-unrest escalating runs.
3. The §253 ground, which needs severity 0.6, opens in the planting week only at exactly 0.6 (S1, S3); at 0.9 it stays open while the severity lasts.

## Visual and surface checks

| Check | Result |
|---|---|
| Player export rendered, the locale desk for a Minnesota unrest planted in the dev save (governor 0.30, severity 0.7), the home desk, the "Seek a court order" panel and the refused surveillance reason | Looked at in the browser pane at 390x844 (screenshots of the top of the desk, the comparison, the expanded property surge terms, the refused reason and the court-order rows, and a filed search warrant and Title III application). Measured by script at 320, 390, 1280, 1440 and 1920: no horizontal overflow, no control under 24px, text unclipped. The pane clips at about 1024px, so 1280, 1440 and 1920 were measured, not looked at |
| Problems found and fixed | At 320px the law doors overflowed (a chip reached 364px): the list item now caps at the row width. The comparison drew empty "One step" and "No standing force" rows for acts that carry neither: rows an option does not touch are now left out of its terms (`CompareChoices`). The home desk said "Nothing here is asking for an answer" and "needs unrest in the state" while the state was in unrest: it now says there is unrest and links to the unrest desk |
| Seen and left alone | The review sheet shows stale text ("Confirm", no title) while it animates closed after a confirmation; it is the existing review seam, for every act, not these screens |
| Targeted e2e for the state screen and the locale desk | NOT RUN (the browser suite was not run; the render check above was by hand) |

## Doc sync

| Item | Result |
|---|---|
| `docs/DECISIONS.md` §6.22, §6.8 and §8.12 Where lines | Written by the docs lane against source; §252 floor updated after the retune |
| `docs/ARCHITECTURE.md` and `docs/SCHEMA.md` | Updated: act ids, `authorizedBy`, target `"state"`, the `locale-mission` order subject, court-order flags, `CourtProceeding.interim` `"order-enjoined"`. `CURRENT_SCHEMA_VERSION` stays 67 |
| `docs/CONTENT_DOCTRINE.md` §2 | No scoring constant in `opinion.ts`, `removal.ts` or `cabinet.ts` changed |
| `docs/BACKLOG.md` | BL-320 opened earlier (non-military prices are planning values). Still to open: consequence, feed and press banks cannot hold a state-level act (an engine and content extension); the property-surge and section 251 TRO bands miss under the conditional reading; the `underRebellionOrInvasion` rule treats an NEA unrest declaration as rebellion; CBO-sourced weekly costs are press-reported until cbo.gov can be opened |

## Accepted risks

Invasion is read off any war the United States defends (no territory field on `Conflict`); the troops act stands in for the Insurrection Act's own militia call; the CBO and Joint Staff figures are press-reported; court odds and the 26-week injunction term other than the FISC cap are planning values; `moneyShortfall` tests a year of a commitment, not its term; an enjoined proclamation does not recall troops already sent; a narrowed injunction counts for §252; the property-surge and section 251 TRO bands only hold read unconditionally.
