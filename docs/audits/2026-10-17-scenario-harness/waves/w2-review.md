# W2 review record (BL-245, unrest, disaster, public health)

Reviewed October 17, 2026, from a session that did not decide or revise. Scope: the 29 scenarios that cleared regate job `w2-premise-unrest-disaster-health`. Out of scope: `four-counties-quoting-the-flood-bridge` (gate, needs a bind), `the-reserve-with-no-rules-written-for-it` and `the-overtime-ward-runs-on` (holds).

## Method

1. Diffed every `content/jobs/work/w2-premise-unrest-disaster-health/*.out.json` against the same id in `content/corpus/shards/{unrest,disaster,public-health}-000.jsonl`. For all 29 the only differing key is `premise`. Check (1) holds.
2. Read each opening and `context.standing` against the declared premise and the scenario's conditions.
3. For every flag a `universal` or `introduces` reason leans on, grepped the corpus for which reply sets it (`replies[].sets`) and read that reply. This caught two flags that are set by an unrelated scenario.
4. Checked `heat-wave` is a disaster condition (`scenario-audit-premise.ts`), and that a `collectionReport` with basis `governor-request` and condition `pandemic` is an open state request for pandemic relief (`collection-report.ts`, the `relief:` signature), so the world holds one only when that request exists.
5. Frequencies are the analyst's (48 campaigns); I did not re-measure. Replies and impact bands are frozen and were not re-read.

Standard applied. An incident reported at the opening is the week's own incident even when it is a few days old (a walkout "since Tuesday", a gate held five days): the week is the first the player sees of it and no other system tracks it. I reject only when the prose asserts a board state or a continuing state that neither a gate, a flag that actually carries it, nor the week itself supplies.

## Per-id verdicts

### Unrest, introduces (11)

- `the-pier-stands-empty`: approve. The walkout is "this morning". The week is the strike.
- `the-campus-occupation`: approve. The occupation is the incident; it is five days old at the opening but nothing earlier creates it. The 22.6% unrest reading would starve calm boards of a campus week.
- `the-factory-shutdown-spreads`: **reject.** Two defects. The prose blames `{{counterpart}}`'s tariffs and says so twice ("the cause here, which means {{counterpart}}'s problem"), with conditions `[]` and a `band` cast, so no tariff or trade measure is established. Second, the standing paragraph says two plants stopped within a month of the schedule and the third before it existed, so the shutdown is not this week's event. Accept instead: a `tradeMeasure` cast (the `tradeMeasure` pick exists), or a rewrite that drops the tariff attribution and opens on the layoffs and the gate. Re-declare `introduces` after either.
- `the-harvest-fails`: approve, with a note. The march on the steps is the incident. "The drought was real" is backstory in frozen prose; no drought condition is asserted as a board state, and drought is not an unrest reading. If the prose is ever revised, say "a poor harvest" and not "the drought".
- `the-contested-mandate`: approve, with a note. The sit-in is the incident. The standing paragraph says the count closed five days ago and was certified twice, which presumes a recent election; I did not verify how the engine times elections, and no condition reads one. If an election calendar reading exists, gate on it. Otherwise this is a prose item for BL-251.
- `the-transport-stops`: approve. The walkout is "this morning"; the wage study is 11 weeks old and only background.
- `the-tram-drivers-who-parked-the-fleet`: approve. The stoppage is the event; "third day" is within the week's own incident.
- `the-dockworkers-who-wont-cross-each-other`: approve. The sympathy line goes up that morning. The `coastal` geography gate already limits it to a port.
- `the-hall-vote-that-shut-the-refinery-gate`: approve. The vote "before the morning shift" is the incident. Observation, not a premise defect: the flag `ordered-them-back-to-work` is set only by `the-transport-stops` (the transport corps), while the prose says the refinery workers were ordered back. That is a BL-251 prose mismatch.
- `the-chair-who-marched-with-them-before-she-worked-here`: approve. Same reasoning as the campus occupation; the gate is held five days and nothing earlier creates it.

### Unrest, universal (4)

- `the-shifts-the-strike-left-uneven`: approve. `let-the-strike-run` (aged 9) is set by `the-strike-that-crossed-three-industries` (hold wages and wait the strike out); a leftover shift settlement is the state it presumes.
- `the-square-that-fills-again-on-fridays`: **reject.** The reason is a dodge. The flag proves the player let a strike run its course. It does not prove a standing crowd: the prose asserts nine weeks of Fridays, a repeat group of organizers and "the same four names" on the permits, and no gate or flag carries a crowd. That is the "crowd no gate establishes" case. Accept instead: rewrite the opening so the permit request is the event (the first or newest Friday application) and keep `universal` for the permit question, or hold it. Do not relabel as `introduces`: a nine-week crowd is not self-creating.
- `the-panels-everyone-wants-now`: approve. `commissioned-wage-study-review` (aged 5) is set by `the-transport-stops`; the sector letters are the follow-up. Note: the prose says the panel "worked" and the finding was accepted, which the flag does not record (it only records the commission). Minor, frozen prose.
- `the-hospital-halls-that-kept-the-wards-open`: approve. `negotiated-cross-industry-wage-floor` (aged 4) is set by `the-strike-that-crossed-three-industries`; a staff letter after the floor needs no street state. The `cyclePhase` expansion or peak gate is in the original.

### Disaster, introduces (6)

- `the-generators-that-failed`: approve. The failure is "twenty minutes into the evening list". Note for BL-251: the prose says the player approved roadwork in place of the generators, a history no gate or flag supports.
- `the-night-the-exits-were-chained`: approve. The fire is the incident. `made-public-admission` is set by `the-generators-that-failed`, so the flag is an arming gate only and the prose does not lean on it.
- `the-frost-that-took-the-belt`: approve. The frost is the loss and the week reports it as it is counted.
- `the-span-they-reopened-too-soon`: approve. This is the doctrine's case for `introduces`. The quake damage is last night's, the week opens the morning after, and no quake condition reading is asserted. Gating on `earthquake` would starve it below the 10% floor, so the week creating the closure is right. Note: it deals in any world, so a week with no earlier tremor is the player's first quake, which is fine for a disaster.
- `the-crew-still-on-the-levee`: **reject.** The reason says "the flag explains why the crew is there", but `sent-the-team` is set only by `six-at-the-checkpoint` (authorize a hostage rescue). The prose is about "the levee ... from the last flood" and "since you sent the team out after the last flood". The slide is the incident, but the levee posting is a flood arc that the gate does not carry. Accept instead: replace the flag with `held-the-levee-line` (aged at least 6), which `the-river-over-the-levee` sets, then keep `introduces` for the slide. A gate edit, outside regate.

### Disaster, universal (3)

- `the-bridge-the-flood-took-with-it`: **reject.** The reason is false. `split-the-budget-line` is set by `the-rearmament-line-that-ate-the-clinics` (an economy week splitting a rearmament and clinic shortfall), not by any flood relief. The prose asserts "the county bridge the flood took", "the budget line you split off for the flood" and a flood five weeks ago. Nothing establishes the flood. Accept instead: change the flag gate to `opened-the-flood-to-relief` (set by `the-river-over-the-levee`), aged at least 5, and keep `universal` with a reason that names it. The prose "split off" would then need to read as relief funding; that is a prose edit.
- `the-crossing-we-decided-not-to-rebuild`: approve, with a dependency. `deferred-the-flood-bridge` (aged 6) is set by `the-bridge-the-flood-took-with-it`, so the premise is true to the flag. It stays sound only once that scenario's gate is repaired as above; until then the only way to hold the flag is through a scenario whose own flood premise is false.
- `the-span-that-was-built-for-two-weeks`: approve. `built-a-temporary-span-at-the-crossing` (aged 8) is set by `the-crossing-that-flooded-overnight`; the surveys disagree about a deck the player ordered. No hazard is running.

### Public health, introduces (4)

- `the-bottling-plant-that-failed-its-own-test`: approve. The Friday sample is the incident.
- `the-case-that-came-back-negative-twice`: approve. The overnight positive is the incident. `testing-ordered-at-borders` (aged 6) is set by `the-fever-through-the-district`. The standing paragraph says testing has run "six months", while the flag is six weeks; minor.
- `the-result-the-lab-will-not-repeat`: approve. The single positive is the incident.
- `the-ward-that-ran-out-of-beds`: approve, borderline. The ward went over on Tuesday and stayed over, so the overflow is reported rather than created at the opening. It is one hospital's capacity, which no board reading tracks, and the "fever season" is a calendar fact, not a pandemic. I accept it on the same standard as the occupations. If the owner wants the stricter reading, the replacement is a hold with a rewrite so the overflow happens in the week.

### Public health, universal (3)

- `the-clinics-that-stopped-charging`: approve. `accepted-mass-displacement` (aged 5) is set by `the-border-empties`; a fee arrangement is a budget question, not an outbreak. "Since the winter" is looser than five weeks; frozen prose.
- `the-energy-aid-kept-for-the-cold`: approve. `conditionActive heat-wave` is a real disaster condition and the cast is bound to it, so the heat wave the prose asserts is established. `universal` is the right declaration because the public-health class reading is `pandemic` only.
- `the-ward-that-was-patched-and-not-repaired`: approve. The `collectionReport` on a `domestic-state` with basis `governor-request` and condition `pandemic` exists only when an open pandemic relief request is on the record, so "the active pandemic" is established. Note: the scenario's title does not describe its body (a governor's request for federal help); BL-251.

## The 19 introduces as a group

Eighteen are single-onset events: a morning walkout or stoppage (pier, transport, trams, dockworkers, refinery vote), a failure or fire (generators, theater), a quake, frost, slide, a failed sample, an unconfirmed case, a lab result. For these the week is the incident and the declaration is true. Six are reported a few days after onset (campus, chair, harvest, mandate, trams, ward); I accepted them because the subject is the incident itself and no board system tracks it, and flagged the mandate and the ward as the edge cases. The 19th, `the-factory-shutdown-spreads`, is not self-creating (a counterpart tariff and a weeks-old closure) and is rejected. Nineteen of 32 is plausible for these three classes, whose weeks are onset events by nature. `the-crew-still-on-the-levee` is also in the 19 but is rejected on its gate, not on the declaration.

## Counts

- Reviewed 29. Approve 25, reject 4.
- By decision type: introduces 19 (17 approve, 2 reject); universal 10 (8 approve, 2 reject).

## Rejections

1. `the-factory-shutdown-spreads` (introduces): counterpart tariff asserted and shutdown weeks old. Use a `tradeMeasure` cast or rewrite.
2. `the-crew-still-on-the-levee` (introduces): `sent-the-team` is a hostage-rescue flag. Gate on `held-the-levee-line`.
3. `the-bridge-the-flood-took-with-it` (universal): `split-the-budget-line` is an economy flag. Gate on `opened-the-flood-to-relief`.
4. `the-square-that-fills-again-on-fridays` (universal): a nine-week crowd that no gate carries. Rewrite to make the permit request the event, or hold.

Publish and the `PREMISE_DEBT_SHIPPED` edit stay with the integrating session. The 25 approvals do not depend on the four rejections, except `the-crossing-we-decided-not-to-rebuild`, which should ship only with, or after, the repair of `the-bridge-the-flood-took-with-it`.
