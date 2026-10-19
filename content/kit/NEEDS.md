# What the corpus needs

Measured from the 330 scenarios the game ships. Use it when nobody has told you what to write, and to
pick the cells for a topic you were given. Priorities, in order: readers for dead arc branches, the cells below,
thin dilemma shapes, then plain volume. Write four or five scenarios per cell; more reads as one week written
five ways.

## Not yet: contested issues

Do not write scenarios whose subject is one of these. The game is building them as standing issues with their own
law, levers and audits, and a scenario written before that lands would be priced wrong:

- abortion and reproductive care
- guns
- immigration enforcement policy (border and arrival crises in the migration class stay open)
- race and civil rights
- voting and elections law
- LGBTQ issues
- policing and criminal-justice policy
- religion and speech
- drugs
- education policy
- climate regulation
- labor law as a culture-war issue
- healthcare mandates
- national symbols

## Suggested cells

Each cell takes the cast and severity its class is shortest of. Where that cast cannot carry the class's
scope (a week CATALOG.md describes as foreign with no counterpart in it), take the next shortest instead.

- espionage:band:critical:4 — 9 of 110 (8%); shortest of band casts and critical weeks
- hostage:none:routine:4 — 6 of 70 (9%); shortest of none casts and routine weeks
- terror:band:routine:4 — 11 of 110 (10%); shortest of band casts and routine weeks
- triumph:band:serious:4 — 7 of 70 (10%); shortest of band casts and serious weeks
- migration:band:critical:4 — 12 of 110 (11%); shortest of band casts and critical weeks
- tragedy:band:routine:4 — 8 of 70 (11%); shortest of band casts and routine weeks
- unrest:band:critical:4 — 20 of 165 (12%); shortest of band casts and critical weeks
- disaster:band:routine:4 — 15 of 110 (14%); shortest of band casts and routine weeks
- public-health:band:routine:4 — 15 of 110 (14%); shortest of band casts and routine weeks
- death:band:critical:4 — 11 of 70 (16%); shortest of band casts and critical weeks

## Arcs waiting for a reader

9 arcs are lopsided (some answers come back later, others never do), carrying 15 dead
branches; 237 more set flags nothing reads at all. A reader for a dead branch is a scenario gated on
that branch's flag ({ "kind": "flag", "flag": "<flag>", "is": true, "agedAtLeast": 6 }); DEEDS.md has what each
setter left behind. The worst first:

- the-audit-that-found-two-ledgers (economy) — Audit found two ledgers at customs
  - dead: keep-the-director-who-reported-it → kept-the-honest-director
  - dead: remove-the-director-anyway → removed-the-honest-director
- the-file-the-court-wants-produced (institution) — File the court has ordered produced
  - dead: reconstruct-and-produce-the-full-file → reconstructed-the-full-court-file
  - dead: ask-the-court-for-more-time-to-search → asked-the-court-for-more-time
- the-judge-under-pressure (justice) — Appellate judge received a threat against her family
  - dead: remove-judge-from-case → removed-judge-from-the-case
  - dead: delay-and-investigate → delayed-the-judgment
- the-signature-on-the-warehouse-contract (scandal) — Signature under the warehouse contract
  - dead: keep-her-and-call-it-an-audit-finding → kept-the-warehouse-director-over-the-contract
  - dead: suspend-her-pending-a-quiet-review → suspended-the-warehouse-director-pending-review
- the-watch-list-the-square-earned (terror) — Watch list built from names taken at the protest square
  - dead: purge-the-uncharged-names → purged-the-uncharged-square-names
  - dead: quarantine-the-list-for-review → quarantined-the-square-list
- three-answers-that-do-not-agree (scandal) — Three answers about one sentence
  - dead: the-three-answer-together → made-the-three-chairs-answer-together
  - dead: let-it-stand → left-the-memo-accounts-standing
- the-branch-with-the-line-outside-it (economy) — Branch with a queue outside it
  - dead: let-the-weak-banks-fail → let-the-weak-banks-fail
- the-inquiry-that-will-take-its-time (scandal) — Inquiry that will take its time
  - dead: offer-a-joint-review-with-them → offered-joint-memo-review
- the-river-over-the-levee (disaster) — River over the levee
  - dead: everything-to-the-rescue → put-rescue-before-the-levee

## Volume and mix by class

Targets: about 165 per spine class, 110 per regular, 70 per punctuation. Inside each class,
casts at 35% band, 25% tensest, 10% closest, 30% none, and severities at 40% routine, 40% serious, 20% critical.
"other" counts the special casts (war, outlet, bills, courts and the rest).

| class | tier | have | target | band | tensest | closest | none | other | routine | serious | critical |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tragedy | punctuation | 8 | 70 | 0% | 13% | 0% | 88% | 0% | 0% | 63% | 38% |
| terror | regular | 11 | 110 | 0% | 9% | 0% | 91% | 0% | 0% | 36% | 64% |
| unrest | spine | 20 | 165 | 5% | 10% | 0% | 85% | 0% | 50% | 50% | 0% |
| disaster | regular | 15 | 110 | 0% | 0% | 0% | 80% | 20% | 33% | 47% | 20% |
| public-health | regular | 15 | 110 | 0% | 7% | 0% | 60% | 33% | 27% | 67% | 7% |
| migration | regular | 12 | 110 | 0% | 25% | 17% | 58% | 0% | 42% | 50% | 8% |
| foreign-crisis | spine | 37 | 165 | 14% | 49% | 14% | 0% | 24% | 14% | 65% | 22% |
| war | regular | 37 | 110 | 3% | 16% | 0% | 5% | 76% | 30% | 43% | 27% |
| espionage | regular | 9 | 110 | 0% | 100% | 0% | 0% | 0% | 33% | 67% | 0% |
| hostage | punctuation | 6 | 70 | 83% | 17% | 0% | 0% | 0% | 0% | 0% | 100% |
| technology | punctuation | 11 | 70 | 0% | 55% | 0% | 36% | 9% | 45% | 45% | 9% |
| economy | spine | 32 | 165 | 3% | 6% | 6% | 84% | 0% | 47% | 53% | 0% |
| scandal | spine | 32 | 165 | 6% | 3% | 6% | 81% | 3% | 59% | 28% | 13% |
| justice | regular | 25 | 110 | 0% | 4% | 0% | 92% | 4% | 40% | 52% | 8% |
| institution | spine | 30 | 165 | 7% | 3% | 0% | 83% | 7% | 43% | 40% | 17% |
| culture | punctuation | 12 | 70 | 0% | 0% | 0% | 100% | 0% | 100% | 0% | 0% |
| death | punctuation | 11 | 70 | 0% | 0% | 45% | 55% | 0% | 36% | 64% | 0% |
| triumph | punctuation | 7 | 70 | 0% | 0% | 0% | 100% | 0% | 100% | 0% | 0% |

## Dilemma shapes, thinnest first

exposure 6, retaliation 26, foot-in-the-door 33, credulity-bet 42, allocation 50, loyalty-test 50, disclosure 55, containment 68
