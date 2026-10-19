# BL-267 review record (inert gates)

Reviewed October 18, 2026, from a session that did not decide or revise these changes. Scope: the 37 items in regate job `bl267-inert-gate-regate` and the two hand edits in `packages/content/src/packs/pilot.ts`. Decision record: `bl267-inert-gate-decisions.json` beside this file. Per-item decisions are also recorded in `content/reviews/bl267-inert-gate-regate/review.json`. The batch is not provisional: the reviewer is not the author.

## Method

1. Diffed every `content/jobs/work/bl267-inert-gate-regate/*.out.json` against its `payload.original` in `content/jobs/bl267-inert-gate-regate.json`, key by key. For all 37 the only differing keys are `conditions`, `boosts` and `premise` (premise changed on three: one added, two reasons restated). Every change matches the decision record exactly. The pilot diff removes one condition from each of two scenarios and touches nothing else.
2. Read each subject, opening and `context.standing` (and `inaction`) against what was removed and what remains.
3. For each week whose remaining gate is a flag, found the reply that sets it in `content/corpus/shards/*.jsonl`. All ten flags have a setter.
4. Read the boost semantics in `scenario-cast-weight.ts` (`instability` is one minus stability, `removalPressure` is removal pressure, `warIntensity` is the hottest war the player is party to, `conditionSeverity` reads one condition kind), the `geography of: counterpart` filter in `scenario-cast.ts` (the `closest` pick ranks by trust and takes the first government that passes), and `auditGateOnNothing` in `scenario-grounding.ts`, which a boost silences and which is an error at critical.
5. Did not re-measure the 65 reachability boards; the inert readings are the decider's. Replies, rejoinders and impact bands are frozen in a regate and were not re-judged. No repetition grep: no prose changed.

Standard applied: a removed gate that was true on every board never distinguished a week, so removing it changes no dealing. I reject only where an added boost or premise does not read the state its story is about, or where a declaration is false.

## Per-id verdicts

### Ten weeks left reading nothing (gate-on-nothing warning)

- `the-administration-asks-for-more`: approve. Universal declaration is honest; the retention ask is one bureau's, and the "pay account" is local.
- `the-border-road-contract`: approve. Universal; the band list named every band, and the prose is about bids, not jobs.
- `the-bottling-plant-that-failed-its-own-test`: approve, with a note. The "why" rests on the declared `introduces` premise (Friday's failed sample) rather than saying "universal", which is enough of a declaration; a municipal plant's own test is not a federal delivery reading.
- `the-judge-under-pressure`: approve. Universal serious week. The prose says a threat arrived, not that protection failed across the board; "two officers at the courthouse door" is a local arrangement.
- `the-orchestra-choice`: approve. The §6.2 rule 2 case by name; the prose never mentions approval.
- `the-pardon-nobody-is-watching`: approve. Universal; department business on any board.
- `the-queue-that-doesnt-move`: approve, with a note. "Arrivals rose five weeks ago" is asserted with no reading. It is one checkpoint's fact and acceptable, but a migration-flow lean would be the honest bind if one becomes available.
- `the-quota-that-emptied-the-docks`: approve. The universal reason, restated without the coastal clause, is still true.
- `the-surplus-nobody-expected`: approve. Universal routine triumph. The twelve-million balance is account-level, which the absolute treasury bound never read.
- `the-surplus-nobody-planned-for`: approve. Universal; approval never appears in the prose.

### Flag carries the premise (11)

- `the-ferry-that-failed-the-inspection-nobody-saw`: approve. `stalled-on-the-memo` (set by `the-inquiry-that-will-take-its-time`).
- `the-hand-that-crossed-the-name`: approve. `restored-the-crossed-name-to-clemency` (set by `the-clemency-list-one-name-short`).
- `the-letter-asking-why`: approve. `released-the-amended-clemency-list` (same setter).
- `the-name-the-hunt-for-the-leak-produced`: approve. `hunted-the-leak` (set by `the-cabinet-memo`).
- `the-number-the-stack-returned`: approve. `reopened-the-old-sentencing-file` (set by `the-file-at-the-bottom-of-the-stack`).
- `the-order-they-say-we-ignored-before`: approve. `produced-the-court-file-incomplete` (set by `the-file-the-court-wants-produced`).
- `the-premium-the-dealers-kept-charging`: approve. `paid-a-surcharge-to-close` (set by `the-accounts-that-would-not-close`); the universal reason no longer names the removed bound.
- `the-return-on-the-yard-we-stood-behind`: approve. `guaranteed-the-shipyard-loan` (set by `the-yard-that-builds-the-boats`).
- `the-second-name-on-the-clemency-list`: approve. `granted-the-forgotten-clemency` (set by two scenarios).
- `the-second-official-the-dock-halls-asked-for`: approve. `removed-treasury-secretary-to-end-strike` (set by `the-transport-stops`).
- `the-water-came-over-the-yard-wall` (pilot): approve. The player's coast is always true; the flag supplies the yards and the declared surge supplies the hazard.

### Condition gate carries the premise (4)

- `the-cluster-in-the-market-district`: approve. The pandemic gate stays.
- `the-list-longer-than-the-money`: approve. The flood gate stays; the treasury bound of 18 was the absolute-figure trap.
- `the-schools-the-governor-wants-rebuilt-as-they-were`: approve. The earthquake gate stays.
- `the-provinces-the-writ-does-not-reach` (pilot): approve (re-checked). First pass: approve with a note, because the opening and a particular ("Marches in Washington: Third week") asserted a protest movement that the removed floor of 0.3 never distinguished. Revised: the protest floor is now at least 0.45, which holds on the one pilot board where insurgency at least 0.4 holds and fails the other nine, so the marches are now read. The in-play frequency the decider cites (protest at least 0.5 in about 31% of weeks, from the W2 sample) is theirs; I did not re-measure it.

### Introduces premise with an added lean (9)

- `the-campus-occupation`, `the-chair-who-marched-with-them-before-she-worked-here`, `the-pier-stands-empty`, `the-dockworkers-who-wont-cross-each-other`: approve. The incident is the week's own; an instability lean on an unrest week reads the state the story is about.
- `the-contested-mandate`: approve, with a note. Same as above. The W2 note stands: the prose presumes a recent election that no condition reads.
- `the-corridor-workers-want-widened`: approve. The new `introduces` premise is true: drivers have been parked two days and the stoppage is the week's incident, the standard W2 applied to the other labor stoppages.
- `the-result-the-lab-will-not-repeat`: approve. Premise and existing instability lean unchanged.
- `the-veterans-who-came-home-late`: approve. `warIntensity` is the honest lean for units held past relief, and the prose asserts no current war.
- `the-ward-that-ran-out-of-beds`: approve, with a note. The pandemic-severity lean is honest for a fever ward. The prose sets the week in "the first week of the fever season" and nothing gates the season; a `calendar` condition (season or months) would read it. This predates the regate.

### Counterpart coast (2)

- `the-request-for-a-neutral-port`: approve. The `belligerent` pick is not trust-ranked, so a counterpart-coast condition is a live gate, and a frigate needs a coast. Worth copying.
- `the-fishing-rights-nobody-wrote-down`: approve, with a note. Counterpart coast reads the premise and filters the trust-ranked `closest` pick to a coastal government. The shared shoal implies a maritime neighbor, which the most-trusted coastal government need not be. That cast issue predates the regate.

### A turn floor and, at most, a lean (3)

- `the-last-signature-on-the-charter` (routine): approve, with a note. Universal death week. "Our records office has a backlog" is the records office's queue, local to the week, not a VA delivery reading.
- `the-dormitory-fire-and-the-empty-chair`: approve, with a note. The `removalPressure` boost reads the stakes the week turns on (the President's seat at the memorial), so it is an honest lean. It also clears what would otherwise be a critical gate-on-nothing error; I accept it on the stakes reading. For a later prose pass: the subject says "head of government's empty seat", and the President is meant (§10).
- `the-shaft-the-state-crew-cannot-reach`: approve, with a note (re-checked after reject). First pass rejected the instability boost: the prose turns on "one heavy rig since the second was written off", which is state rescue capacity, not national stability, and the boost was there partly to keep a critical week off flat weight. The `stateGrievance` alternative I offered is not available: it needs `locus.state`, which a regate may not set, and early boards carry no grievance marks. Revised: instability boost dropped; `institutionState` INST-STATES delivery at most 0.62 (founding value about 0.645 on 64 of 65 boards) plus an `institutionStrain` boost. That reads the premise. Delivery is re-derived weekly from budget, morale, backlog and leadership (`institutions.ts`), so the gate opens when state capacity erodes in play, and the strain boost raises the week as it erodes further. The revised body differs from the original only in `conditions` and `boosts`, and no findings file remains. Note: the bound sits just under the founding value and is live on one preview board; how often it opens in play was not measured here.

## Batch-level findings from the review tiers

- `0 of 37 scenarios gate on a cabinetAttribute` and `25 of this batch's 31 conditions are turn or flag (81%, over the 80% ceiling)`. Both follow from a removal-only wave over pre-existing weeks and are not per-item defects, but the monoculture warning is now true of these 37 weeks as a set.

## Tally

39 reviewed (37 corpus, 2 pilot). After the re-check: approve 39, of which 31 clean and 8 with a note (`the-bottling-plant-that-failed-its-own-test`, `the-queue-that-doesnt-move`, `the-contested-mandate`, `the-ward-that-ran-out-of-beds`, `the-fishing-rights-nobody-wrote-down`, `the-last-signature-on-the-charter`, `the-dormitory-fire-and-the-empty-chair`, `the-shaft-the-state-crew-cannot-reach`). Reject 0. First pass rejected `the-shaft-the-state-crew-cannot-reach` and noted `the-provinces-the-writ-does-not-reach`; the decider revised both, and the re-check is recorded on each item above. The reviewer corrected nothing in flight. Publishing, `corpus build` and deploy were not attempted.
