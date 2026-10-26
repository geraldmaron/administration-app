# Opinion lane notes

## Doc amendments for the integrator

CONTENT_DOCTRINE.md section 2, the sentence "Prosperity reads the live economy against the term start, and prices that have already risen keep costing after inflation cools": add after it:

> Growth enters prosperity as a signed term at one weight (2 per unit of annual growth, read within plus or minus 10%): a contraction costs approval by the same amount a boom of the same size earns, and zero growth is neutral. A recession label itself still bills nothing.

CONTENT_DOCTRINE.md / the scandal paragraph (or DECISIONS press section where flag-authored scandals are described): add:

> An authored `scandal:` flag that arrives without a `flagset:` marker is not a story until `scandalPhase` dates it, the first week the engine sees it (it writes the marker once, in a background packet). From that week it ages like any dated scandal. The story id is derived from the flag alone, so an answer, legs or closing flag already filed against it still applies. Saves need no version bump: an old save's undated flag is dated on its next simulated week and then fades.

ARCHITECTURE.md (press/scandal section): `Scandal.brokeTurn` is never -1 any more and `ScandalReading.weeksRunning` is always present; `scandalPhase` emits the stamp packet.

## Wave 2 amendments

### DECISIONS §5.16 (replace the sentence "While a story is loud, its judgments revise at 0.20 a week instead of 0.06.")

> While a story is loud, its judgment revises at 0.20 a week instead of 0.06 only in the direction the story pushes it (`SALIENCE_PUSH`; every story in the table is bad news for its judgment, so the fast pace applies while the judgment is above its target). A loud judgment climbing back toward its target recovers at 0.06, so a fresh shock in one judgment cannot speed an unrelated recovery. The household price channel is unchanged: crude and pump shocks reach prosperity through CPI and the price-level scar (`commodity-pressure.ts`), and no separate gasoline term is added.

Where: `opinion.ts#SALIENCE_PUSH`, `opinion.ts#driftOpinion`.

### DECISIONS §5.17 (append)

> A public rallies less to each war after the first. The war's rally is divided by `1 + 1.0 × S`, where S sums, over every earlier war the country was party to and that earned a rally (ended wars included), `0.5^(weeks between openings / 52)`. Planning values, not fitted: the only anchor is ordering (Iraq 2003 rallied well below Afghanistan 2001). Nothing is stored; the factor is derived from the conflict ledger. Reachability: serial invasions are reachable only with a congressional authorization per war (an unauthorized second invasion is refused by the War Powers check) and are limited by readiness.

Where: `opinion-war.ts#rallyFatigueFactor`, `opinion-war.ts#RALLY_FATIGUE`.

CONTENT_DOCTRINE §2: add after the sentence on war rallies: "A second war inside the memory of an earlier rally earns a smaller one (`rallyFatigueFactor`); a loud judgment climbing back toward its target revises at the ordinary pace."

## Wave 3 amendments (BL-146, midterm seat refit)

Source: Gallup, Jeffrey M. Jones, "Midterm Seat Loss Averages 37 for Unpopular Presidents", September 12, 2018 (news.gallup.com/poll/242093), opened this session: net House seats of the president's party against job approval at 18 midterms, 1946-2014. The least-squares line (computed here from that table) is seats = -97.7 + 1.41 x approval points, r = .66 (Gallup's figure), residual SD about 17 seats; means -37 below 50% (n = 9) and -14 above (n = 9). 2018 and 2022 are not in the fetched table and are not used.

DECISIONS: add a rule (next free number in §5), or extend §5.13's neighbor:

> **The midterm moves the House by a share of the seats at risk, fitted to the post-1946 record.** The president's party's House change is a bounded fraction of the seats it holds in competitive states (the opposition's, in a good year): `(ballot share - 0.61) x 1.4`, bent toward a ceiling of 0.31 of the seats at risk. At the ballot share of a term with six laws that is about -30 at 40% approval, -10 at 60%, +6 at 70%, and about -48 at the floor, across starting seats of 230 to 260 and the state map (-28 to -35 at 40%). The residual the record leaves (SD 17 seats) is not modeled; the check is a band. The Senate keeps its own sensitivity (0.05) and structural drag (0.04). Planning values, not causal estimates.
> **Why:** the old 0.12 sensitivity, shrunk by state lean, gave -18 at 40% approval and -33 at the floor, below every postwar low-approval midterm but one, and ignored how many seats the party held (2010: 255 held, -63; 2014: 201, -13).
> **Where:** `packages/engine/src/election-seating.ts#HOUSE_MIDTERM`, `#midtermHouseSeatsMoved`.

ARCHITECTURE: the House midterm is `HOUSE_MIDTERM` in `election-seating.ts`; presidential-year coattails are unchanged (`COATTAIL_SENSITIVITY`).

Probe 4 is rewritten as a band over eight seeds (four per party). Seat-change distributions before and after, at six laws, are in the lane report.
