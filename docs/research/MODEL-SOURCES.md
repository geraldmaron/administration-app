# Model sources

One row per modeled claim. The rule this file exists to enforce: **a source is
only listed here once someone has actually opened it.** A claim implemented from
general knowledge is listed as `NOT YET VERIFIED` with the primary source that
must be checked — never with a plausible-looking citation nobody read.

## Verification status legend

- `VERIFIED <date>` — the named primary source was opened and says this.
- `NOT YET VERIFIED` — implemented from general legal/economic knowledge. The
  named source is where it must be checked before the system it feeds ships.

## The constitutional calendar (`packages/engine/src/clock.ts`)

| Claim as modeled | Primary source to verify against | Status |
|---|---|---|
| Presidential terms begin at noon on January 20 | U.S. Const. amend. XX, §1 | NOT YET VERIFIED |
| A new Congress convenes January 3 | U.S. Const. amend. XX, §2 | NOT YET VERIFIED |
| Two-term limit | U.S. Const. amend. XXII | NOT YET VERIFIED |
| Federal Election Day is the Tuesday after the first Monday in November | 3 U.S.C. §1 (presidential electors); 2 U.S.C. §7 (Representatives) | NOT YET VERIFIED |
| Federal fiscal year begins October 1 | 31 U.S.C. §1102 | NOT YET VERIFIED |
| Presidential elections in years divisible by four; midterms in the intervening even years | 3 U.S.C. §1; U.S. Const. art. I §2 | NOT YET VERIFIED |

The date *arithmetic* itself is not a modeling claim and needs no source: it is
Howard Hinnant's civil-calendar algorithm, and it is verified in
`clock.test.ts` by round-tripping every date across a 500-year span and by
agreeing with the game's own `advanceCalendar` over 400 consecutive steps.

The Election Day rule is the one worth calling out, because the naive reading
("the first Tuesday in November") is wrong in any year November opens on a
Tuesday. `clock.test.ts` asserts the 2033 case specifically, where the two rules
give November 1 and November 8.

## Systems not yet modeled

Recorded so the gap is visible rather than assumed filled. Each needs its own
row here before it is implemented:

- Federal Vacancies Reform Act time limits (5 U.S.C. §§3345–3349d) — mission §9
- Senate confirmation process and cloture — mission §9
- Trade authorities: §232, §301, USITC, OFAC — mission §12
- Federal Reserve structure and terms — mission §13
- Combatant command structure (Unified Command Plan) — mission §14
- Intelligence Community 18-element structure (50 U.S.C. §3003) — mission §11
