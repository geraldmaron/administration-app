# The cell catalog

A cell is class:cast:severity. Pick one cell per group of scenarios; every scenario in the group carries
the same "class", "severity" and "cast.pick". The brief's gate list explains each cast pick in full.

## Classes

Every scenario in this batch must actually be that. A week that would be filed under a different class if someone read it cold is the wrong scenario for this brief, however well it is written — the class is how the game finds this week later, and a mislabeled one is a cell counted that the pool does not really have.

- "tragedy": mass casualty at home — a school, a mine, a ferry. The dead are this country's own and the number is known.
- "terror": deliberate violence against civilians, and what the state does to the rest of its liberties in response
- "unrest": the street against the government: strikes, occupations, riots, a square that will not empty
- "disaster": natural, at home or abroad — the earthquake, the flood, the season that failed
- "public-health": outbreaks, contamination, a hospital system buckling
- "migration": borders, boats, the people arriving and the ones sent back
- "foreign-crisis": incidents, standoffs, summits gone wrong — another government is the problem
- "war": entering, leaving, escalating, staying out
- "espionage": spies caught in both directions, leaks, defectors
- "hostage": citizens taken, embassies under siege, the price of a life
- "technology": cyberattacks, grid failures, what surveillance is for
- "economy": crashes, strikes, bailouts, a run on the currency, the budget that cannot cover both
- "scandal": the government's own conduct, found out
- "justice": trials, pardons, amnesties — the rule of law bent or held
- "institution": courts defied, elections disputed, the military's loyalty, a chair who will not serve
- "culture": identity in public: sport, faith, art, what gets banned
- "death": the deaths of significant figures, at home and abroad
- "triumph": the good month, and what it gets spent on

## Severities

- "routine"
- "serious"
- "critical"

Each tier is described under SEVERITY in BRIEF.md.

## Casts

The cast is "cast": { "pick": "<one of these>", ... }. "nation" (a set-piece about one named country) is
not available through the kit: it needs an owner and a recorded reason.

### tensest

No rules beyond the brief's cast list.

### closest

No rules beyond the brief's cast list.

### band

No rules beyond the brief's cast list.

### warCounterpart

No rules beyond the brief's cast list.

### belligerent

No rules beyond the brief's cast list.

### none

Candidates
Domestic weeks bind locus.city to a dataset CityId so the board names the metro. Write {{city}} (and {{cityKind}} when the kind of place matters). Never free-text a city name except via the token.
- CITY-USA-pittsburgh — Pittsburgh, PA (industrial)
- CITY-USA-akron — Akron, OH (industrial)
- CITY-USA-albany — Albany, NY (interior)
- CITY-USA-albuquerque — Albuquerque, NM (interior)
- CITY-USA-allentown — Allentown, PA (industrial)


Candidates
Domestic weeks bind locus.city to a dataset CityId so the board names the metro. Write {{city}} (and {{cityKind}} when the kind of place matters). Never free-text a city name except via the token.
- CITY-USA-pittsburgh — Pittsburgh, PA (industrial)
- CITY-USA-akron — Akron, OH (industrial)
- CITY-USA-allentown — Allentown, PA (industrial)
- CITY-USA-appleton — Appleton, WI (industrial)
- CITY-USA-birmingham — Birmingham, AL (industrial)


### stricken

No rules beyond the brief's cast list.

### outlet

No rules beyond the brief's cast list.

### collectionReport

Issued-report binding
Use cast { "pick": "collectionReport", "bind": "target" | "recipient" | "home" } and exactly one condition { "kind": "collectionReport", "targetKind": "foreign-nation" | "domestic-state", "topic": "military-readiness" | "external-intent" | "domestic-security" | "financial-pressure" | "stability", "basis"?: "pursuit" | "state-condition" | "governor-request", "condition"?: <recorded state condition kind>, "confidence"?: "low" | "moderate" | "high", "exposed"?: boolean, "shared"?: boolean }. Confidence is a minimum. Recipient binding requires shared: true; home binding requires domestic-state and a state-condition or governor-request basis. A state-condition basis also requires condition.
Use only facts from the issued report: {{reportFinding}}, {{reportSource}}, {{reportGaps}}, {{reportSummary}}, {{reportConfidence}}, {{reportExposure}}, {{reportTarget}}, {{reportRecipient}} (shared only), {{reportFindingCount}}, {{reportAgeDays}}, and {{reportId}}. The report is frozen with the case; no nation statistic or guessed request becomes a finding. Put the numeric count or age token in particulars.
The report is classified. No reply.press is allowed. A report share proves the recipient received it, not that it asked for help. A reply can task or close collection only through commitment.collection against the pinned report; it cannot share a report. Instrument replies execute their actual rung against the bound counterpart; target and recipient can be different nations.


### tradeMeasure

No rules beyond the brief's cast list.

### liveBill

    - { "pick": "liveBill" } — a pending bill at markup or conference, frozen with the case.

Live-bill binding
Use cast { "pick": "liveBill" } and exactly one condition { "kind": "liveBill", "stage": "markup" | "conference", "act"?: "...", "responseText"?: "base" | "targeted" | "both" }. For markup, omit responseText and give one reply commitment.billText { "action": "propose" }. For conference, a single responseText matches one recommendation. A two-way conference choice uses responseText "both" and two replies recommending "house" and "senate"; the binder requires different text actually passed by each chamber. An optional act pins a specific amendable measure.
Write {{billTitle}} for the live measure and {{billProvision}} for a single proposed provision. A two-way conference choice uses {{billHouseProvision}} and {{billSenateProvision}} for the distinct passed texts. The binder freezes the bill id, stage, text and introduction turn; do not assert a chamber vote or future outcome the frozen state cannot support. The command uses the existing congressional action and costs no authored metric. Do not combine it with another typed action or impact.
A bill still belongs to Congress after the President's answer. Rejoinders may say the proposal or recommendation was delivered; they may not say Congress adopted it or the law changed at commit.


### judicialVacancy

    - { "pick": "judicialVacancy" } — a vacant Court seat and eligible nominee, frozen with the case.

Judicial vacancy binding
Use cast { "pick": "judicialVacancy" } and exactly one condition { "kind": "judicialVacancy" }. The binder chooses a genuinely vacant Court seat and two candidates accepted by openNomination. Give separate replies commitment.judicialNomination { "action": "submit", "candidate": "first" } and { "action": "submit", "candidate": "alternate" }; do not combine either typed action with authored cost, impact, or another command.
Write {{judicialSeat}} for the frozen office, {{judicialNominee}} and {{judicialAlternate}} for the names, and {{judicialNomineeRecord}} and {{judicialAlternateRecord}} for each person's public career and education. Either reply submits its candidate to vetting. It does not seat the nominee or promise Senate confirmation. A candidate or vacancy instance that changes before commit withdraws the answer.


### pendingOrderCase

    - { "pick": "pendingOrderCase" } — a filed, pending challenge to a signed executive order.

Pending order case binding
Use cast { "pick": "pendingOrderCase" } and exactly one matching gate. An ordinary { "kind": "pendingOrderCase" } gate freezes a filed, pending order challenge; one reply must carry commitment.orderRescission { "action": "rescind" }. An adverse lower judgment uses { "kind": "pendingOrderCase", "posture": "adverse-lower", "ruleState": "operative" } and three replies with commitment.orderReview choices "accept", "seek", and "seek-with-stay". The binder pins the engine-raised court-response case and its seven-day deadline. Do not combine either typed command with authored cost, impact, or another command.
Write {{courtOrder}} and {{courtQuestion}} for the pinned order and legal question. Rescission ends future operation of the order; it does not erase past injury, dismiss the lawsuit, decide the merits, or promise how a court will rule. The engine rechecks the proceeding and order at commit.
For an adverse lower judgment, accepting ends the order under the ruling; seeking review leaves the lower judgment in force. A separate stay request can be denied and does not pause the judgment when filed. Silence defaults to accepting the judgment at the engine case's own deadline. Do not claim an unimplemented-rule example until a real preview board reaches it.

