# W3-pack review record (BL-245, TypeScript packs, reference set, fixture)

Reviewed October 17, 2026, from a session that did not decide or apply. Scope: the 15 ids in `w3-pack-decisions.json` (1 gate, 8 universal, 6 introduces). Standard: the W2 review (`w2-review.md`).

## Method

1. `git diff` of `packs/core.ts`, `packs/pilot.ts`, `__fixtures__/plant-holiday.ts` and the three `content/reference/*.jsonl`. Every hunk is one added `premise` line, except `the-number-that-will-be-wrong-on-friday`, whose only change is `conditions` from `[]` to the one cyclePhase gate. For the three jsonl files I compared every record against `HEAD` key by key: only those two ids changed. Check (1) holds for all 15.
2. Read each opening and standing paragraph against the declared premise, then read the reply that sets each flag a reason leans on (`replies[].sets` in the packs).
3. Frequencies are the analyst's; I did not re-measure.

## Per-id verdicts

- `the-crowd-at-the-gate`: approve, with a residual. The blockade is the incident (the standing paragraph dates it to Tuesday and names no prior event), so `introduces` is true on the W2 standard. The class unrest readings look at the home streets, so none would make a foreign road true. Residual, not a premise defect: the prose and the premise's own wording ("the allied airfield", "our fuel convoy", "the fence is ours") presume a United States base in the closest ally, which no dataset reading or gate establishes (`lease-talks-opened` false only arms it). That is a BL-251 locus and capability item. If it cannot be grounded, the remedy is a hold, not a premise change.
- `the-deal-the-government-was-not-in`: approve. `let-the-strike-run` (aged 4) is set by `let-the-week-decide` in `the-morning-the-country-stopped`, and the prose says the government stayed out of the strike. The reply text ("say nothing, let the vote happen") is looser than "chose not to enter", but that is the same flag the W2 reviewer approved for three other weeks.
- `the-line-item-with-two-names`: approve. An internal double-booking found at reconciliation. The prose says it is a collision, not a lack of receipts, so no cycle state is asserted.
- `the-lot-numbers-on-the-recall`: approve. The finding is dated "this week". The public-health class reading is `pandemic` only, and a drug contaminant is not an outbreak, so no gate would be true. Same shape as the W2 `the-bottling-plant-that-failed-its-own-test`.
- `the-morning-the-country-stopped`: approve. A stoppage on its third day, with the power vote tonight, is the week's own incident on the W2 standard (`the-transport-stops`, `the-tram-drivers-who-parked-the-fleet`). A calendar winter gate is already there.
- `the-run-on-the-currency`: **reject.** The run is the incident, and a run in a boom is the doctrine's own example, so the declaration kind is right. The defect is the standing paragraph. It says the strike settlement "was paid with borrowing the Treasury had not scheduled" and "the bond sale that followed went badly enough to make the evening news". The only gate is `paid-the-winter-wages`, set by `sit-with-the-committee` ("pay the winter wages before the vote"). That flag records paying wages, not borrowing, and nothing records a bond sale. The decision's evidence says the flag "establishes that the strike was settled with unscheduled borrowing", which overstates it. These are asserted economy-class market events, the state a premise is meant to account for. Accept instead: trim the two clauses so the standing paragraph says only that the depot settlement was paid and that withdrawals began Thursday at two banks (a prose edit), then keep `introduces` as written. Alternative: a hold.
- `the-sentence-in-the-stump-speech`: approve, with a required follow-up. The `plank-balanced-budget` ticket gate establishes the promise, and a budget gap that forces cuts is an annual fact, not a cycle state, so `universal` does not dodge. The $310 billion figure and the "nine programs" are authored numbers read from nothing. That is a BL-251 item: drop the figure, or bind it to the Treasury before publish. I would not let the figure ship as a stated fact.
- `the-water-they-both-claim`: approve. The prose says their fleet has not moved and their planes are down, so a `warState` or `coalition` reading would be false, and `warState none` would deal while some other war runs. The `tension` 0.35 bound and the `tensest` cast already carry the months of tension. Same as W1 `the-column-on-the-border-road`.
- `the-clause-both-governments-signed`: approve. `sharedMembership` plus a `closest` cast establishes the compact. The subsidy is the week's own finding (an authored fact), not a cycle state. The standing paragraph is empty, so the week reads thin, but that is not a premise matter.
- `the-half-hull-in-the-shed`: approve. `split-the-hull-order` (aged 4) is set by `split-the-order` in the pilot pack, and the prose is its year-later bill.
- `the-water-came-over-the-yard-wall`: approve. The surge is the night's event. `kept-the-yards-on-naval-orders` supplies the yards, not the hazard, as the premise says. A cyclone gate would sit under the 10% floor and a river-flood reading would not fit a harbor surge.
- `plant-holiday-pittsburgh`: approve. A test fixture, not published content. An incentive request deals in any year, and the prose names no cycle state. The one-key edit does not touch the city-binding assertions.
- `the-plant-that-everyone-represents`: approve. Firm- and county-level; the prose denies that the closure is the economy's doing. It is not one of the three quoted exemplars.
- `the-number-that-will-be-wrong-on-friday`: approve the gate. `cyclePhase` expansion or peak holds in 69.8% of weeks and 12/12 campaigns, well over 10%. A "very good" employment print is a rising-cycle fact; a recovery from a trough is excluded, which the prose never claims. It was an unconditioned reference week before, so the gate is the right remedy and universal would have left the "good print" claim unestablished. Unverified: I did not run `reference-set.test.ts` to confirm nothing asserts the old empty conditions.
- `the-yards-and-the-money-that-runs-out`: approve, see the kit judgment below.

## Reference-kit effect

`the-yards-and-the-money-that-runs-out` is one of the three exemplars `referenceExemplars()` quotes in every scenario brief, and it now carries a `universal` premise. My judgment is that this teaches the right pattern, with one gap.

- Right: the declaration is accurate here (an appropriation clock is not a class reading), and the reason shows the form a writer must produce, a gate or fact that establishes the state plus why no economic reading is presumed. An exemplar with no premise would now fail the audit it is meant to teach.
- Gap: `BRIEF.md` (around line 930) teaches only the `universal` declaration and the one-third cap. It never mentions `introduces`, and it describes `universal` as for a week that "needs no four-condition gate". With two of three quoted exemplars shown only in a gated or universal form and no `introduces` example anywhere in the kit, a writer will learn `universal` as the default declaration, and the cap becomes the only control. Recommend one added sentence in the brief naming all three ways to satisfy the rule (gate on the class reading, `universal` with a reason, `introduces` for the incident that creates the state) and the one test between the last two: does the week itself make the state true. No change to the exemplar's premise.
- One minor point: the locus descriptor ("half of them idle since spring") sits next to a reason that says no economic reading is presumed. It is sector-level and consequence-level, so it holds, but the reason would be stronger without the word "economic" overreaching: "no cycle reading is presumed".

## Counts

- Reviewed 15. Approve 14, reject 1.
- By decision type: gate 1 (approve); universal 8 (8 approve); introduces 6 (5 approve, 1 reject).

## Rejection

1. `the-run-on-the-currency` (introduces): the standing paragraph asserts borrowing and a failed bond sale that the `paid-the-winter-wages` flag does not carry. Trim those two clauses and keep the premise, or hold.

Also needing a decision before publish, though not rejections: the $310B figure in `the-sentence-in-the-stump-speech`, and the US-airfield presumption in `the-crowd-at-the-gate`.
