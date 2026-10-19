# Presidential authority review 04: scenario replies

Reviewed 2026-10-16. The scope is every reply in the authored corpus (`content/corpus/shards/*.jsonl`): 991 replies across 327 scenarios. 111 replies trigger an engine act and 880 are statements or directives that change no engine state. Every act-triggering reply was reviewed, and every statement-only reply was read. Each reply was checked against reviews 01 to 03 and against the primary sources listed at the end.

This document gives verdicts and fixes by reply id. It doesn't quote reply text. The review's draft quoted the replies that describe coercive or unlawful acts, and that draft wasn't kept. The ids, shard and line numbers below find each reply.

## Summary

| Verdict | Replies | Of which trigger an act |
|---|---|---|
| Accurate | 819 | 64 |
| Misframed | 87 | 16 |
| Overstated | 43 | 6 |
| Missing gate | 42 | 25 |

By kind of action the reply takes:

| Kind | Replies | Accurate | Overstated | Missing gate | Misframed |
|---|---|---|---|---|---|
| Directive to an agency | 442 | 398 | 19 | 9 | 16 |
| Diplomacy | 99 | 97 | 1 | 0 | 1 |
| Use of force | 86 | 59 | 4 | 9 | 14 |
| No act | 82 | 75 | 3 | 3 | 1 |
| Public statement | 64 | 62 | 0 | 1 | 1 |
| Appointment or removal | 60 | 46 | 3 | 2 | 9 |
| Covert action or intelligence | 49 | 26 | 5 | 9 | 9 |
| Emergency | 31 | 22 | 2 | 1 | 6 |
| Clemency | 30 | 3 | 0 | 0 | 27 |
| Tariff or sanction | 26 | 10 | 6 | 8 | 2 |
| Legislation | 22 | 21 | 0 | 0 | 1 |

Most of the corpus is sound. Diplomacy, statements and legislation are almost all accurate. The problems cluster in eight patterns, and each one maps to a fix that reviews 01 to 03 already call for. Fixing the engine act fixes the act-triggering replies. The statement-only replies need a content pass, because their prose promises something the President can't do.

## The eight patterns

### 1. Clemency written to another country's procedure (27 misframed, all in nine clemency scenarios)

The President's pardon power is Art. II, §2, cl. 1. It reaches federal offenses only, needs no one's agreement, and runs through the Office of the Pardon Attorney by custom rather than law. The nine clemency scenarios (`the-clemency-list-one-name-short` and its siblings) treat clemency as a list a board hands up, with options that read like a parliamentary or state procedure. **Fix:** rewrite the nine to U.S. procedure as part of review 03's clemency act (R38). Content, high.

### 2. Domestic force and crowd control (14 misframed, 9 missing gate under use of force and emergency)

Replies that clear a square, a campus or a downtown by force, seal neighborhoods, or set checkpoints treat the President as the commander of local policing. Federal troops act domestically only under the Insurrection Act (10 U.S.C. §§251-255) or a narrow statute, the Posse Comitatus Act (18 U.S.C. §1385) bars the rest, and *Trump v. Illinois* (2025) read §12406 narrowly (review 01, N50-N53). Federal quarantine power is 42 U.S.C. §264 and reaches interstate and foreign spread; sealing a neighborhood is a state power. **Fix:** route these replies through review 01's gated Insurrection Act and §12406 acts, or rewrite them as requests to a governor. Statement-only replies that promise a federal clearance get rewritten to what the President can ask for. Content plus engine gate, high.

### 3. Sanctions, freezes and embargoes with no declared emergency (8 missing gate under tariff or sanction, more under directives)

Freezing a government's assets, blocking landings or restricting cargo needs a declared national emergency under IEEPA (50 U.S.C. §1701) first. Twelve replies (for example `freeze-the-assets-immediately`, `freeze-their-state-assets`, `restrict-their-cargo-pending-findings`, `condemn-and-sanction`) skip it. **Fix:** review 02's emergency gate on the sanctions ladder (S2-S4) covers the act-triggering ones automatically. Engine gate, high.

### 4. Tariffs as a free lever (6 overstated)

`escalate-tariffs-across-fuel`, `match-the-toll`, `retaliate-economically`, `mirror-the-tariff` and two others raise a tariff directly. There is no general tariff power. Each needs a statute, a finding and its clock, and *Learning Resources v. Trump* (2026) held IEEPA authorizes no tariffs (review 02, T1). **Fix:** these become the first users of the statute-specific tariff authorities. Engine, critical (rides on T1).

### 5. Spending that has no appropriation (about 15 overstated)

Replies that borrow against next year, cover a shortfall quietly, rebuild with borrowed funds, repay a grant quietly or build an annex now spend money Congress didn't provide. The Antideficiency Act (31 U.S.C. §1341) forbids obligating funds beyond an appropriation, and §1301 confines funds to their purpose. Tax changes, Social Security contribution rates and benefit cuts (`temporary-consumption-tax`, `raise-contribution-rates`, `trim-future-benefits` and others) are Congress's under Art. I, §8. **Fix:** rewrite these as a request to Congress, a reprogramming within the same account, or a supplemental appropriation request. The "quietly" variants become a counsel's-objection hard case, because the act is a crime when done knowingly (31 U.S.C. §1350). Content, high.

### 6. The President acting as a judge (about 12 overstated)

Replies that sign a warrant, authorize a search on one source, remove a judge from a case, assign or route a docket, borrow a judge from another district, certify an election, commission a recount or split contested seats give the President powers that belong to courts or to the states. Warrants are issued by judges, including the FISA court for foreign-intelligence searches (50 U.S.C. §§1822-1824), except the Attorney General's narrow emergency authorization with a court application after it. Judges are assigned by their own circuits and the Chief Justice (28 U.S.C. §292). States run elections. **Fix:** rewrite each as what the President can do (ask the Attorney General to seek a warrant, ask for an expedited review, comment publicly with the cost that carries) or remove the option. Content, high.

### 7. Covert action and surveillance without a finding or a warrant (9 missing gate, 9 misframed, 5 overstated)

Sabotage, entry raids, extraction and running an asset need a presidential finding reported to the intelligence committees (50 U.S.C. §3093), the same gate review 01 asks for on covert rungs 2-5. Tracking a person's location over time needs a warrant after *Carpenter v. United States* (2018). Replies that make access standing policy or track continuously skip both. **Fix:** act-triggering replies inherit review 01's finding gate. Tracking replies route to a warrant request. Engine gate plus content, high.

### 8. Personnel and the courts (9 misframed, 3 overstated under appointment or removal)

Replies that "seat" a judge or a loyalist read as if the President installs judges. Article III judges are nominated and confirmed (Art. II, §2, cl. 2) and serve during good behavior. Replies that remove a protected officer anyway, court-martial a captain or reassign a witness skip the officer's protections, the military justice process, where unlawful command influence is barred (10 U.S.C. §837), or the whistleblower rules (5 U.S.C. §2302). **Fix:** "seat" becomes "nominate" with confirmation odds. The other replies show the protection and its cost. Content, medium.

### Smaller patterns

- **Arms transfers** (`approve-the-transfer`, `send-an-arms-transfer`, `rush-heavier-arms-to-the-invaded-state`, `arm-them-directly`) need the Arms Export Control Act notice or a drawdown authority. They are missing gates, the same as review 01's N37. Engine gate, medium.
- **Deposit guarantees** (`guarantee-all-deposits`, `guarantee-deposits-publicly`, `quietly-backstop-the-bank`) overstate what the President decides. The FDIC's systemic-risk exception needs the FDIC, the Fed and the Treasury Secretary after consulting the President. **Fix:** recommend it to Treasury, with the outcome not certain. Content, medium.
- **Strikes and work stoppages** (`requisition-emergency-fuel-crews`, `order-the-cranes-run-by-substitutes`, `deploy-emergency-transport-corps`) go beyond the Taft-Hartley path, a board of inquiry and then a court injunction (29 U.S.C. §§176-178), and *Youngstown* bars seizure without a statute. Content, medium.
- **Immigration** (`grant-residency-quietly`) has no presidential path. Residency comes through the statute. Content, low.

## How these fold into the plan

The act-triggering replies (47 flagged) are fixed by the engine gates in reviews 01 to 03 and need no separate content change unless their prose promises a different outcome. The statement-only replies (125 flagged) need a content pass. That pass belongs to the writers' room (`content-lead`, then `content-reviewer` in a separate session) and is backlog item BL-226 in `00-SYNTHESIS.md`.

## Sources

Opened by the review agent on 2026-10-16 (local copies kept in the session scratchpad, not the repo): U.S. Constitution (archives.gov); 5 U.S.C. §§552a, 2302; 10 U.S.C. §§837, 12304; 16 U.S.C. §824a; 18 U.S.C. §§1512, 1519, 2339B, 3142; 22 U.S.C. §1741; 28 U.S.C. §292; 29 U.S.C. §§176, 178; 31 U.S.C. §§1301, 1341, 1532, 5302; 41 U.S.C. §6301; 42 U.S.C. §264; 50 U.S.C. §§1822, 1824 (govinfo.gov); Executive Order 13526; *Carpenter v. United States*, 585 U.S. 296 (2018) (supremecourt.gov). Statutes cited above that aren't in this list (IEEPA, the Insurrection Act, Posse Comitatus, 50 U.S.C. §3093, 31 U.S.C. §1350, the AECA) are cited as reviews 01 and 02 opened them, or are UNCONFIRMED here.

Not checked: the Vienna Convention protection of diplomatic accounts, 50 U.S.C. §1705, 10 U.S.C. §394, the history of troops in labor strikes (1970 postal strike, 2002 port lockout), and the reported 2025 removal of the BLS commissioner.

## Every flagged reply

Shard paths are under `content/corpus/shards/`.

### Overstated

| Scenario | Reply | Kind | Triggers an act | Where |
|---|---|---|---|---|
| `the-contested-mandate` | `split-the-difference-seats` | appointment or removal | no | `unrest-000.jsonl:7` |
| `the-judge-under-pressure` | `remove-judge-from-case` | appointment or removal | no | `justice-000.jsonl:5` |
| `the-seat-the-nominee-finally-took` | `route-the-docket-elsewhere` | appointment or removal | no | `institution-000.jsonl:15` |
| `the-authority-they-said-they-would-never-use` | `invoke-the-search-power-now` | covert action or intelligence | no | `terror-000.jsonl:8` |
| `the-clerk-who-photographed-the-manifest` | `sign-the-warrant-tonight` | covert action or intelligence | no | `espionage-000.jsonl:5` |
| `the-surveyors-held-at-the-crossing-point` | `pay-the-border-captain-quietly` | covert action or intelligence | yes | `foreign-crisis-000.jsonl:24` |
| `the-warrant-that-rests-on-one-source` | `authorize-the-warrant-on-one-source` | covert action or intelligence | no | `institution-000.jsonl:21` |
| `the-warrant-with-a-blank-line` | `authorize-the-warrant-on-the-evidence-as-is` | covert action or intelligence | no | `justice-000.jsonl:7` |
| `the-grant-that-built-the-wrong-clinic` | `quietly-repay-the-grant` | diplomacy | no | `scandal-000.jsonl:12` |
| `the-audit-reaches-the-palace` | `narrow-the-investigation` | directive to an agency | no | `justice-000.jsonl:4` |
| `the-auditor-who-found-the-gap-in-the-harbor-fund` | `quietly-cover-the-shortfall` | directive to an agency | no | `economy-000.jsonl:15` |
| `the-bench-that-never-got-its-judge` | `borrow-a-judge-from-another-district` | directive to an agency | no | `justice-000.jsonl:15` |
| `the-branch-with-the-line-outside-it` | `cap-withdrawals-temporarily` | directive to an agency | no | `economy-000.jsonl:21` |
| `the-contested-mandate` | `certify-and-enforce` | directive to an agency | no | `unrest-000.jsonl:7` |
| `the-contested-mandate` | `commission-the-recount` | directive to an agency | no | `unrest-000.jsonl:7` |
| `the-currency-that-lost-a-tenth-of-itself-overnight` | `raise-rates-sharply` | directive to an agency | no | `economy-000.jsonl:23` |
| `the-frost-that-took-the-belt` | `rebuild-with-borrowed-funds` | directive to an agency | no | `disaster-000.jsonl:6` |
| `the-fund-that-outlasted-the-chair-who-built-it` | `raise-contributions-now` | directive to an agency | no | `economy-000.jsonl:22` |
| `the-holding-cell-past-midnight` | `put-the-clock-on-him` | directive to an agency | no | `terror-000.jsonl:7` |
| `the-names-the-square-gave-us` | `sweep-the-whole-list` | directive to an agency | no | `terror-000.jsonl:10` |
| `the-pension-recalculation` | `raise-contribution-rates` | directive to an agency | no | `economy-000.jsonl:8` |
| `the-quartermasters-arithmetic` | `borrow-against-next-year` | directive to an agency | no | `war-000.jsonl:5` |
| `the-revenue-shortfall` | `temporary-consumption-tax` | directive to an agency | no | `economy-000.jsonl:7` |
| `the-seat-the-nominee-finally-took` | `assign-the-election-docket` | directive to an agency | no | `institution-000.jsonl:15` |
| `the-tax-break-for-new-factories` | `approve-full-tax-break` | directive to an agency | no | `economy-000.jsonl:6` |
| `the-tax-break-for-new-factories` | `offer-five-year-break` | directive to an agency | no | `economy-000.jsonl:6` |
| `the-ward-that-ran-out-of-beds` | `build-the-tent-annex-now` | directive to an agency | no | `public-health-000.jsonl:8` |
| `what-the-released-families-are-owed` | `grant-residency-quietly` | directive to an agency | no | `migration-000.jsonl:9` |
| `the-forty-eight-hours-you-wrote-in` | `extend-under-emergency-order` | emergency | no | `terror-000.jsonl:6` |
| `the-hall-vote-that-shut-the-refinery-gate` | `requisition-emergency-fuel-crews` | emergency | no | `unrest-000.jsonl:17` |
| `the-difference-is-a-real-number` | `borrow-against-next-year` | no act | no | `economy-000.jsonl:26` |
| `the-dockworkers-who-wont-cross-each-other` | `order-the-cranes-run-by-substitutes` | no act | no | `unrest-000.jsonl:15` |
| `the-fund-that-outlasted-the-chair-who-built-it` | `trim-future-benefits` | no act | no | `economy-000.jsonl:22` |
| `the-academic-seized` | `escalate-and-freeze` | tariff or sanction | no | `foreign-crisis-000.jsonl:11` |
| `the-factory-shutdown-spreads` | `retaliate-economically` | tariff or sanction | yes | `unrest-000.jsonl:4` |
| `the-pension-recalculation` | `freeze-and-gradually-cut` | tariff or sanction | no | `economy-000.jsonl:8` |
| `the-tariff-in-response` | `escalate-tariffs-across-fuel` | tariff or sanction | yes | `foreign-crisis-000.jsonl:5` |
| `the-tariff-that-answered-a-tariff` | `mirror-the-tariff` | tariff or sanction | yes | `war-000.jsonl:7` |
| `the-toll-on-the-narrow-road` | `match-the-toll` | tariff or sanction | yes | `foreign-crisis-000.jsonl:4` |
| `the-judge-under-pressure` | `delay-and-investigate` | use of force | no | `justice-000.jsonl:5` |
| `the-pier-stands-empty` | `hold-the-line` | use of force | no | `unrest-000.jsonl:2` |
| `the-reserves-borrowed-against-next-year` | `borrow-against-next-year` | use of force | yes | `war-000.jsonl:35` |
| `the-transport-stops` | `deploy-emergency-transport-corps` | use of force | no | `unrest-000.jsonl:8` |

### Missing Gate

| Scenario | Reply | Kind | Triggers an act | Where |
|---|---|---|---|---|
| `the-accounts-that-would-not-close` | `replaced-the-auditor` | appointment or removal | no | `institution-000.jsonl:1` |
| `the-file-the-defense-has-now-asked-for` | `drop-the-two-cases` | appointment or removal | yes | `justice-000.jsonl:17` |
| `intrusions-in-the-command-net` | `plant-counter-access` | covert action or intelligence | yes | `technology-000.jsonl:3` |
| `the-academic-seized` | `authorize-extraction` | covert action or intelligence | yes | `foreign-crisis-000.jsonl:11` |
| `the-asset-turns-both-ways` | `reverse-the-asset-again` | covert action or intelligence | yes | `foreign-crisis-000.jsonl:7` |
| `the-asset-under-watch` | `authorize-extraction` | covert action or intelligence | yes | `espionage-000.jsonl:1` |
| `the-consulate-with-the-shutters-down` | `authorize-the-entry-raid` | covert action or intelligence | yes | `hostage-000.jsonl:2` |
| `the-final-assignment` | `give-her-the-assignment` | covert action or intelligence | yes | `espionage-000.jsonl:2` |
| `the-fuel-stockpiled-at-the-rail-head` | `sabotage-the-rail-spur` | covert action or intelligence | yes | `war-000.jsonl:3` |
| `the-line-before-the-second-wave` | `continuous-tracking-with-oversight` | covert action or intelligence | no | `public-health-000.jsonl:2` |
| `the-line-before-the-second-wave` | `obtain-tracking-data-once` | covert action or intelligence | no | `public-health-000.jsonl:2` |
| `the-branch-with-the-line-outside-it` | `guarantee-all-deposits` | directive to an agency | no | `economy-000.jsonl:21` |
| `the-clinics-that-never-got-the-difference-back` | `increase-rearmament-again-at-the-clinics-expense` | directive to an agency | no | `economy-000.jsonl:17` |
| `the-frost-that-took-the-belt` | `emergency-relief-now` | directive to an agency | no | `disaster-000.jsonl:6` |
| `the-mill-that-cannot-make-payroll` | `cover-the-mills-payroll` | directive to an agency | no | `economy-000.jsonl:19` |
| `the-rearmament-line-draws-on-the-clinics-again` | `draw-from-clinics-again` | directive to an agency | no | `economy-000.jsonl:16` |
| `the-run-that-started-at-one-counter` | `guarantee-deposits-publicly` | directive to an agency | no | `economy-000.jsonl:14` |
| `the-ward-that-was-patched-and-not-repaired` | `close-the-wing` | directive to an agency | yes | `public-health-000.jsonl:10` |
| `the-ward-that-was-patched-and-not-repaired` | `repair-around-the-patients` | directive to an agency | yes | `public-health-000.jsonl:10` |
| `the-ward-that-was-patched-and-not-repaired` | `shut-the-two-bays` | directive to an agency | yes | `public-health-000.jsonl:10` |
| `the-crude-the-refineries-have-no-room-to-run` | `order-an-emergency-sale` | emergency | no | `economy-000.jsonl:32` |
| `the-access-we-were-told-was-once` | `make-the-access-standing-policy` | no act | no | `technology-000.jsonl:8` |
| `the-ally-asking-for-more-than-words` | `arm-and-advise-the-ally` | no act | no | `war-000.jsonl:11` |
| `the-rearmament-line-that-ate-the-clinics` | `let-rearmament-draw-continue` | no act | no | `economy-000.jsonl:11` |
| `the-run-that-started-at-one-counter` | `quietly-backstop-the-bank` | public statement | no | `economy-000.jsonl:14` |
| `six-at-the-checkpoint` | `condemn-and-sanction` | tariff or sanction | no | `hostage-000.jsonl:1` |
| `the-accounts-frozen-in-both-directions` | `freeze-their-assets-in-turn` | tariff or sanction | yes | `war-000.jsonl:6` |
| `the-boats-they-will-not-return` | `freeze-their-landings` | tariff or sanction | yes | `foreign-crisis-000.jsonl:3` |
| `the-cargo-fire-at-dawn` | `restrict-their-cargo-pending-findings` | tariff or sanction | yes | `tragedy-000.jsonl:2` |
| `the-frozen-accounts-demand` | `use-freeze-as-negotiating-currency` | tariff or sanction | yes | `foreign-crisis-000.jsonl:9` |
| `the-request-to-freeze-their-assets` | `freeze-a-token-amount-and-signal-more` | tariff or sanction | yes | `foreign-crisis-000.jsonl:19` |
| `the-request-to-freeze-their-assets` | `freeze-the-assets-immediately` | tariff or sanction | yes | `foreign-crisis-000.jsonl:19` |
| `the-sanctions-request-from-the-guarantor-network` | `freeze-their-state-assets` | tariff or sanction | yes | `war-000.jsonl:30` |
| `the-advisors-who-asked-for-rifles` | `arm-them-directly` | use of force | yes | `war-000.jsonl:37` |
| `the-ally-that-is-losing-its-own-war` | `send-an-arms-transfer` | use of force | yes | `war-000.jsonl:17` |
| `the-ally-wants-advanced-systems` | `approve-the-transfer` | use of force | yes | `foreign-crisis-000.jsonl:6` |
| `the-convoy-they-want-us-to-escort` | `escort-with-our-own-ships` | use of force | no | `war-000.jsonl:12` |
| `the-escort-request` | `escort-the-convoy-without-joining` | use of force | yes | `war-000.jsonl:32` |
| `the-invasion-widens` | `rush-heavier-arms-to-the-invaded-state` | use of force | yes | `war-000.jsonl:33` |
| `the-massing-past-the-ridge` | `strike-the-marshaling-yard` | use of force | yes | `war-000.jsonl:2` |
| `the-second-charter-no-underwriter-will-cover` | `escort-the-second-sailing` | use of force | no | `economy-000.jsonl:27` |
| `the-shipment-that-isnt-humanitarian` | `send-the-arms-transfer` | use of force | yes | `war-000.jsonl:29` |

### Misframed

| Scenario | Reply | Kind | Triggers an act | Where |
|---|---|---|---|---|
| `the-audit-reaches-the-palace` | `negotiate-the-exit` | appointment or removal | no | `justice-000.jsonl:4` |
| `the-audit-that-found-two-ledgers` | `remove-the-director-anyway` | appointment or removal | no | `economy-000.jsonl:20` |
| `the-inspector-calls-the-papers` | `attack-their-competence` | appointment or removal | no | `scandal-000.jsonl:7` |
| `the-inspectors-take-the-reassignment` | `accept-their-silence-with-reassignment` | appointment or removal | no | `scandal-000.jsonl:14` |
| `the-seat-on-the-high-bench` | `seat-the-reliable-friend` | appointment or removal | no | `institution-000.jsonl:3` |
| `the-seat-that-outlived-the-judge-who-filled-it` | `seat-an-independent-jurist` | appointment or removal | no | `death-000.jsonl:7` |
| `the-seat-that-outlived-the-judge-who-filled-it` | `seat-another-loyalist` | appointment or removal | no | `death-000.jsonl:7` |
| `the-seat-that-sat-empty-through-spring` | `seat-the-independent-nominee` | appointment or removal | no | `institution-000.jsonl:8` |
| `the-seat-that-sat-empty-through-spring` | `seat-the-reliable-nominee` | appointment or removal | no | `institution-000.jsonl:8` |
| `the-clemency-list-one-name-short` | `order-an-internal-review-before-releasing-anything` | clemency | no | `justice-000.jsonl:8` |
| `the-clemency-list-one-name-short` | `release-the-list-as-amended` | clemency | no | `justice-000.jsonl:8` |
| `the-clemency-list-one-name-short` | `restore-the-name-and-release-the-list` | clemency | no | `justice-000.jsonl:8` |
| `the-file-at-the-bottom-of-the-stack` | `grant-the-quiet-clemency` | clemency | no | `justice-000.jsonl:14` |
| `the-file-at-the-bottom-of-the-stack` | `let-the-sentence-run-its-course` | clemency | no | `justice-000.jsonl:14` |
| `the-file-at-the-bottom-of-the-stack` | `reopen-full-review-of-the-file` | clemency | no | `justice-000.jsonl:14` |
| `the-hand-that-crossed-the-name` | `keep-her-and-change-the-rule` | clemency | no | `justice-000.jsonl:22` |
| `the-hand-that-crossed-the-name` | `name-her-and-take-the-file` | clemency | no | `justice-000.jsonl:22` |
| `the-hand-that-crossed-the-name` | `retire-her-quietly` | clemency | no | `justice-000.jsonl:22` |
| `the-letter-asking-why` | `put-him-on-this-years-list` | clemency | no | `justice-000.jsonl:23` |
| `the-letter-asking-why` | `send-the-standard-reply` | clemency | no | `justice-000.jsonl:23` |
| `the-letter-asking-why` | `tell-them-the-truth` | clemency | no | `justice-000.jsonl:23` |
| `the-man-in-the-infirmary-from-the-same-stack` | `count-the-stack-first` | clemency | no | `justice-000.jsonl:24` |
| `the-man-in-the-infirmary-from-the-same-stack` | `release-the-man-in-the-infirmary` | clemency | no | `justice-000.jsonl:24` |
| `the-man-in-the-infirmary-from-the-same-stack` | `sign-both-releases` | clemency | no | `justice-000.jsonl:24` |
| `the-number-the-stack-returned` | `open-the-doors-in-one-order` | clemency | no | `justice-000.jsonl:21` |
| `the-number-the-stack-returned` | `rehear-every-file` | clemency | no | `justice-000.jsonl:21` |
| `the-number-the-stack-returned` | `stage-the-quiet-releases` | clemency | no | `justice-000.jsonl:21` |
| `the-pardon-nobody-has-asked-about` | `pardon-in-daylight` | clemency | no | `justice-000.jsonl:16` |
| `the-pardon-nobody-has-asked-about` | `pardon-quietly` | clemency | no | `justice-000.jsonl:16` |
| `the-pardon-nobody-has-asked-about` | `send-it-back-to-the-court` | clemency | no | `justice-000.jsonl:16` |
| `the-pardon-nobody-is-watching` | `defer-the-decision-to-next-cycle` | clemency | no | `justice-000.jsonl:10` |
| `the-pardon-nobody-is-watching` | `deny-the-clemency` | clemency | no | `justice-000.jsonl:10` |
| `the-pardon-nobody-is-watching` | `grant-the-clemency` | clemency | no | `justice-000.jsonl:10` |
| `the-second-name-on-the-clemency-list` | `commission-a-formal-clemency-standard` | clemency | no | `justice-000.jsonl:13` |
| `the-second-name-on-the-clemency-list` | `deny-and-draw-the-line` | clemency | no | `justice-000.jsonl:13` |
| `the-second-name-on-the-clemency-list` | `grant-the-second-clemency` | clemency | no | `justice-000.jsonl:13` |
| `the-defector-who-drew-the-valve-map` | `force-the-station-offline-for-inspection` | covert action or intelligence | yes | `technology-000.jsonl:7` |
| `the-detainee-in-foreign-custody` | `deploy-independent-forensic-team` | covert action or intelligence | yes | `death-000.jsonl:3` |
| `the-file-that-was-never-inquired-into` | `classify-the-question-for-now` | covert action or intelligence | no | `justice-000.jsonl:11` |
| `the-improper-surveillance` | `use-the-evidence` | covert action or intelligence | no | `justice-000.jsonl:3` |
| `the-ledger-they-already-read` | `feed-the-false-ledger` | covert action or intelligence | yes | `espionage-000.jsonl:3` |
| `the-ledger-they-already-read` | `roll-up-the-network` | covert action or intelligence | yes | `espionage-000.jsonl:3` |
| `the-line-that-answered-back` | `force-a-counter-access-line` | covert action or intelligence | yes | `technology-000.jsonl:6` |
| `the-name-one-meeting-gave-us` | `watch-the-clerk` | covert action or intelligence | yes | `espionage-000.jsonl:8` |
| `the-officer-offering-to-walk-across` | `accept-the-approach-now` | covert action or intelligence | yes | `espionage-000.jsonl:4` |
| `the-neighbors-empty-granary` | `stand-behind-their-currency` | diplomacy | yes | `foreign-crisis-000.jsonl:15` |
| `the-bank-advertising-our-guarantee` | `charge-a-fee-for-the-guarantee` | directive to an agency | no | `economy-000.jsonl:29` |
| `the-bank-advertising-our-guarantee` | `end-the-guarantee-on-a-date` | directive to an agency | no | `economy-000.jsonl:29` |
| `the-charging-order-drafted-before-the-mayors-letter-arrived` | `sign-the-charging-order` | directive to an agency | no | `justice-000.jsonl:25` |
| `the-count-two-hands-signed` | `move-the-recount-to-a-friendlier-panel` | directive to an agency | no | `institution-000.jsonl:20` |
| `the-crude-the-refineries-have-no-room-to-run` | `waive-the-clean-fuel-rules` | directive to an agency | no | `economy-000.jsonl:32` |
| `the-figure-they-are-asking-for-again` | `pay-through-another-channel` | directive to an agency | no | `hostage-000.jsonl:3` |
| `the-file-the-defense-has-now-asked-for` | `hand-the-file-over` | directive to an agency | yes | `justice-000.jsonl:17` |
| `the-gate-the-judge-ordered-open` | `investigate-and-delay` | directive to an agency | no | `justice-000.jsonl:2` |
| `the-inspector-calls-the-papers` | `negotiate-outside-employment` | directive to an agency | no | `scandal-000.jsonl:7` |
| `the-knot-in-the-wood` | `opened-to-scrutiny` | directive to an agency | no | `death-000.jsonl:1` |
| `the-night-the-exits-were-chained` | `held-accountable` | directive to an agency | no | `disaster-000.jsonl:2` |
| `the-order-from-the-bench` | `re-detained-on-new-grounds` | directive to an agency | no | `institution-000.jsonl:2` |
| `the-provinces-the-writ-no-longer-reaches` | `reassert-uplands-by-force` | directive to an agency | no | `unrest-000.jsonl:11` |
| `the-roof-contract-with-a-familiar-name` | `quietly-amend-the-contract-file` | directive to an agency | no | `scandal-000.jsonl:9` |
| `the-timestamp-nobody-outside-will-ever-see` | `leave-it-exactly-as-filed` | directive to an agency | no | `scandal-000.jsonl:20` |
| `the-two-reviews-that-disagree` | `act-on-the-theft-reading` | directive to an agency | no | `economy-000.jsonl:24` |
| `the-case-that-came-back-negative-twice` | `stop-the-movement-now` | emergency | no | `public-health-000.jsonl:13` |
| `the-cluster-in-the-market-district` | `seal-the-hall-without-warning` | emergency | no | `public-health-000.jsonl:7` |
| `the-cordon-they-swore-never-again` | `quiet-checkpoints-not-a-cordon` | emergency | no | `public-health-000.jsonl:9` |
| `the-cordon-they-swore-never-again` | `seal-the-neighborhoods-again` | emergency | no | `public-health-000.jsonl:9` |
| `the-fever-through-the-district` | `require-testing-at-borders` | emergency | no | `public-health-000.jsonl:1` |
| `the-ruling-at-sundown` | `deny-the-authority` | emergency | no | `justice-000.jsonl:1` |
| `the-campus-occupation` | `clear-the-campus-firmly` | legislation | no | `unrest-000.jsonl:3` |
| `the-inspector-who-changed-her-mind` | `reach-her-with-a-new-offer` | no act | no | `scandal-000.jsonl:15` |
| `the-watch-list-the-square-earned` | `fold-the-square-list-in` | public statement | no | `terror-000.jsonl:5` |
| `the-counterpart-is-gone` | `use-transition-to-renegotiate-terms` | tariff or sanction | yes | `death-000.jsonl:5` |
| `the-review-only-our-exporters-face` | `open-a-compliance-review-on-their-goods` | tariff or sanction | yes | `foreign-crisis-000.jsonl:14` |
| `shared-warning-recipient-support` | `offer-contingent-assistance` | use of force | yes | `foreign-crisis-000.jsonl:33` |
| `the-border-empties` | `militarize-the-border` | use of force | yes | `migration-000.jsonl:3` |
| `the-column-on-the-border-road` | `mobilize-the-reserves` | use of force | yes | `war-000.jsonl:1` |
| `the-delegation-that-walked` | `grant-the-armed-escort` | use of force | yes | `foreign-crisis-000.jsonl:28` |
| `the-downtown-stand` | `clear-the-square-by-force` | use of force | no | `unrest-000.jsonl:6` |
| `the-downtown-stand` | `hold-the-line-firm` | use of force | no | `unrest-000.jsonl:6` |
| `the-fever-through-the-district` | `seal-the-affected-areas` | use of force | no | `public-health-000.jsonl:1` |
| `the-mutiny-nobody-will-call-that` | `court-martial-the-captain` | use of force | no | `war-000.jsonl:36` |
| `the-mutiny-nobody-will-call-that` | `send-the-rotation-and-try-the-captain` | use of force | no | `war-000.jsonl:36` |
| `the-question-of-committing-our-own` | `pledge-to-defend-without-troops-yet` | use of force | yes | `war-000.jsonl:18` |
| `the-seat-on-the-high-bench` | `seat-the-independent` | use of force | no | `institution-000.jsonl:3` |
| `the-square-that-fills-on-fridays` | `clear-the-square` | use of force | no | `unrest-000.jsonl:1` |
| `the-square-that-would-not-empty-by-dark` | `clear-the-square-by-force` | use of force | no | `unrest-000.jsonl:16` |
| `the-warrant-that-rests-on-one-source` | `leak-it-to-force-a-resignation` | use of force | no | `institution-000.jsonl:21` |