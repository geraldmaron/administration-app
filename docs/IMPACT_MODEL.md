# Incident impact model — v1, calibration provisional

The engine separates an action being authorized, the event actually happening, and the reports the President receives. An operation can achieve its objective and still harm civilians. An outbreak can grow while its initial report remains incomplete. An economic loss is not automatically a withdrawal from the President's budget.

The executable definitions are `packages/engine/src/impact-event.ts`; coefficients are in `impact-catalog.ts`; calculations are in `impact-calculation.ts`; scheduling and accounting are in `impact-lifecycle.ts`. Version 1 is a provisional aggregate simulation model, not an empirically validated casualty predictor.

## Covered event families

| Family | Mechanism | Time behavior | Results |
|---|---|---|---|
| Strike | Package intensity, exposed civilians, independent harm probability, vulnerability, damage and care | Physical damage at execution; service recovery afterward | Deaths, injuries, asset damage, output loss, service interruption |
| Outbreak | Susceptible → exposed → infectious → recovered/dead; containment, latent/infectious periods, care overload | Daily transmission and progression; transmission stops after the modeled exposure window, existing cases continue resolving | Cumulative infections, severe illness, deaths, care demand, output/service loss |
| Cyber | Compromised share, remaining susceptible systems, spread, containment and restoration | Daily compromise and repair until services recover | Compromised records, downtime in person-days, current service disruption, output loss; no automatic deaths |
| Industrial | Fire, explosion, toxic release; exposure, intensity, vulnerability, evacuation and care | Explosion is acute; fire/release accrue harm over their exposure window; repair reduces duration | Deaths, injuries, displacement, assets, services and output |
| Natural | Earthquake, flood, cyclone, wildfire, drought, tornado, winter storm, heat wave | Acute hazards bill physical damage once; prolonged hazards distribute mortality through the event window | Deaths, injuries, displacement, assets, services and output |
| Infrastructure | Power, water, transportation, communications or healthcare outage | Outage declines with repair; explicitly declared excess mortality accrues while service is unavailable | Service person-days, output loss, optional indirect deaths |

Natural events and cyber-crew incidents have automatic producers in the existing condition/operator systems. Strikes use the shared model at execution. Industrial and infrastructure events have a validated `issueImpactIncident` producer API and calculation coverage; they do not yet have a new random incident generator. This avoids adding another unrelated event lottery.

## Units and invariants

- People are counts, never percentages of national population disguised as counts. Rates and shares are fractions from 0 to 1, except explicitly bounded per-day transmission and injury ratios.
- Money is **USD millions**; daily output is **USD millions/day**; service person-days are a flow integral, not a count of distinct people.
- Exposed population is the event footprint, not necessarily the country's population. Site data can replace country proxies. An author must provide a basis for exposure and calibration status.
- Deaths, injuries, infections, peak displacement, losses and records compromised are cumulative nonnegative totals. Current displacement, current disruption and current infectious cases are separate stocks.
- Outbreak susceptible + exposed + infectious + recovered + deaths equals the starting exposed population. New infections cannot exceed susceptible people. Departures cannot exceed infectious people.
- Each event has a stable ID and revision. Replaying or applying a stale event effect cannot subtract its deaths again.
- Report revisions do not apply physical harm. Only the increase in the event's cumulative death total reduces live population, and only if the event owns population accounting.
- No child count is generated from a country's median age or urbanization. Optional demographic exposure must name an assessment and sum to the exposed population. Age-specific mortality is then a simulated allocation, still explicitly unconfirmed in reports.

## Input specification (`ImpactSpec`)

| Field | Definition |
|---|---|
| `version` | Literal model version, currently 1 |
| `id`, `nation`, `title` | Stable incident identity, affected dataset nation and readable title |
| `source` | `action`, `condition`, `operator`, or `scenario` |
| `parentId` | Optional owning condition, operator, action or causal incident |
| `site` | Optional category (`military`, `residential`, `industrial`, `education`, `healthcare`, `transport`, `utilities`), assessment reference, and whether classification is confirmed |
| `exposure` | Population, assets, daily output, service users, care capacity, vulnerability, resilience, evidence class, basis and optional demographic counts |
| `mechanism` | Exactly one discriminated mechanism below |
| `accounting.population` | `self` applies new deaths; `parent` records this component without subtracting the same population again |
| `accounting.economy` | `self` contributes independent disruption pressure; `parent` leaves economic accounting to the owner |
| `calibration` | `provisional`/`calibrated`, explanatory basis, source references. `calibrated` requires references; the parser cannot verify their quality |

`ImpactExposure.population`, `serviceUsers`, and `careCapacity` are nonnegative integer counts. Service users cannot exceed exposed people. Care capacity is concurrent treatment capacity available to the footprint; it may include outside support and need not be bounded by the exposed population. `assetsUSDm` and `dailyOutputUSDm` are finite, nonnegative values. `vulnerability` and `resilience` are bounded fractions. Evidence is `site-assessment`, `regional-estimate`, or `country-proxy`. Optional `demographics` has children, adults, and an assessment reference; children + adults must equal exposed people.

### Mechanism-specific fields

| Kind | Required parameters |
|---|---|
| `strike` | `intensity`, `civilianHarmChance`, `casualtyRate`, `injuryRatio`, `damageShare`, `recoveryDays` |
| `outbreak` | `initialInfected`, `transmissionPerDay`, `latentDays`, `infectiousDays`, `fatalityFraction`, `severeFraction`, `durationDays` |
| `cyber` | `initialCompromisedShare`, `spreadPerDay`, `restorePerDay`, `dataExposureShare`, `durationDays` |
| `industrial` | `hazard`, `intensity`, `fatalityRate`, `injuryRatio`, `damageShare`, `displacementShare`, `durationDays` |
| `natural` | Same physical fields as industrial, with the natural-hazard enum |
| `infrastructure` | `service`, `outageShare`, `repairDays`, `dailyExcessMortalityRate` |

The runtime schema rejects unknown mechanism keys, nonfinite numbers, negative counts, impossible initial infections, invalid fractions, and parent-owned accounting with no parent ID. Duration fields range from 1 to 3,650 days. It does not assert that a valid parameter set is historically calibrated.

## Saved event (`ImpactEvent`)

| Field | Definition |
|---|---|
| `spec` | Frozen event inputs, coefficients and provenance |
| `revision` | Monotonic update number |
| `causedBy` | Optional original ledger event ID; daily assessments retain the causal link |
| `started`, `lastUpdated`, `elapsedDays` | Civil-calendar origin, last physical update, number of simulated daily steps |
| `status` | `active`, `recovering`, `resolved` |
| `state` | Susceptible, exposed, infected, recovered, care demand; disruption fraction; current displacement |
| `totals` | Deaths, child deaths (only meaningful with supplied demographic exposure), injuries/severe illness, cumulative infections, peak displaced, service person-days, asset loss, output loss, compromised records |
| `reports` | Latest twelve dated public assessments; totals do not depend on retained report history |

Saved campaigns add optional `impactEvents: Record<string, ImpactEvent>`. Existing saves need no fabricated incidents or retroactive casualties. New incidents acquire records when their producer runs. A save/reload consumes no time. The actual createSave/loadSave roundtrip is covered. Input specifications are runtime-validated when created; the broader save loader still trusts the persisted TypeScript event shape and does not yet revalidate every stored event field.

`ImpactEventEffect` contains `kind: "impactEvent"`, the updated event and `expectedRevision` (`null` means an initial insert). The sole writer validates new inputs, rejects decreasing totals and invalid revisions, compares the expected revision, and applies the **new** death delta against the current nation's population. A mismatched revision is a no-op.

## Calculations

All draws use named campaign RNG streams; reading a forecast cannot consume an outcome roll. Stochastic rounding converts fractional expected counts into whole people while preserving expectation. Individual outcomes vary; repeated calculations against the same seed, event, date and response reproduce exactly.

### Physical events

Exposure × mortality rate × intensity × vulnerability × evacuation/care mitigation determines expected deaths. A bounded seeded realization varies the result; deaths cannot exceed remaining exposed people. Injury counts are bounded by the remaining exposed population. Strike civilian harm has its own probability draw, separate from military success.

Damage is exposed asset value × damage share × intensity × resilience mitigation, charged once. Service disruption falls with recovery progress and resilience. Lost output is daily exposed output × current disruption, accumulated per day. Displaced people are a current stock and a separately retained peak, not added to the population repeatedly.

The active hazard window and recovery are aggregate assumptions. The current natural/industrial profiles do not simulate building inventories, individual evacuation routes or physical plume/weather dynamics.

### Outbreaks

Daily new exposure is transmission × infectious people × susceptible share × containment mitigation. Incubating cases progress at `exposed / latentDays`; infectious cases depart at `infected / infectiousDays`. Departures become recoveries or deaths, with mortality modified by vulnerability, care and unmet care demand. Existing latent/infectious cases finish after the transmission window closes.

This is an aggregate SEIR-style consequence model. It does not encode a real pathogen, clinical advice, transmission engineering, travel-network seeding, reinfection, vaccines or age-specific clinical rates. Those require additional datasets and calibration, not invented detail.

### Cyber

New compromise scales with current compromise × remaining unaffected share × spread × containment/resilience. Restoration reduces the disrupted share daily. Compromised records track a bounded cumulative estimate; restored service does not undo exposure of data. The cyber model itself causes no deaths. A healthcare/power outage with supported exposure can be represented as a linked infrastructure incident, with one declared accounting owner for overlapping channels.

### Economic and political ownership

Existing `conditionMacroPressure` owns condition economics. Condition-linked quantitative events therefore use `economy: parent`. Independent incidents contribute current daily output disruption, annualized relative to national GDP and capped at 10 percentage points, through the existing macro-pressure path. They do not directly overwrite growth, inflation, unemployment or debt.

Asset/output losses are damage assessments, not automatic appropriations. Recovery spending must still be authorized through existing budget/policy instruments. Existing strike standing, relationship and public-judgment effects remain in the action resolver; existing disaster response judgments remain in conditions. This model does not invent a second generic approval penalty.

### Scenario money

A scenario reply's declared money is not an incident: it is priced in `packages/content/src/scenario-cost.ts` (DECISIONS §6.16), not by the families above. The band says how the money is authorized and the week's severity how big it is; each pairing reads one sourced appropriation from `SCENARIO_COST_ANCHORS` (`packages/world/sources/scenario-costs-sources.md`), carried to 2026 dollars by CPI-U, times the horizon, scaled by output for another government and by `costOfLiving` to today's prices. A reply's `financial.basis` (quantity × unit cost × weeks) replaces the anchor when the fiction states its arithmetic. The amount is then drawn around its center: a log-normal multiplier from the engine's seeded stream, keyed by the campaign seed, the scenario, the reply and the turn, with bias 0.08 and spread 0.35 for a band or 0.15 for a basis, an out-of-range draw redrawn rather than clamped inside ×0.5 to ×2.5. A reply's authored `cost.treasury` is drawn the same way around the writer's figure (bias 0.03, spread 0.10) and kept to cents of a million. The jitter's parameters are planning values set against the transport-project overrun record (28% average; Flyvbjerg, Holm and Buhl, 2002), not fitted; the estimate the room speaks and the actual the Record books are still one figure, drawn at cast, and splitting them needs a draw at commit.

## Reports and player surfaces

`ImpactReport` carries date, revision, confidence (`low`, `medium`, `high`), stage (`initial`, `update`, `final`), ranges for deaths, injuries, infections, peak displacement, economic loss, current service disruption and compromised records, plus explanatory basis. Child-death estimates are omitted without supplied demographic evidence and their upper bound cannot exceed the reported total-death upper bound.

Country proxies remain low confidence. Site/regional assessments with provisional calibration remain medium at best; elapsed time alone does not turn uncertain data into a verified fact. Report intervals are provisional proportional uncertainty bands, not fitted statistical confidence intervals.

The Record has an **Impact assessments** view with period filters. Country dossiers reuse the same report component. It reads reported ranges, not private totals. Detail disclosure shows the basis and reported death-range history. Pending orders, completion accounts, feed entries and Record entries use the same event lifecycle.

Twelve retained daily reports support recent incident inspection, not a full multi-year incident history. The Record's period filter selects incidents by update date; it does not manufacture missing year-over-year observations.

## Runtime integration

- Player instrument authorization reserves budget/forces; execution rechecks capability and affordability on its due date. Stand-down releases reservations.
- `day-step.ts` settles due instruments and trade expiries, then advances incidents. The weekly `advanceTurn` helper catches incident records up across its elapsed calendar days.
- New acute conditions create an impact event; existing condition/response systems still control policy costs and response effectiveness.
- Cyber-crew actions create cyber impact events. Explicit industrial/infrastructure producers use `issueImpactIncident`.
- Incidents opened by a weekly phase (condition onsets, cyber-crew attacks) take `started` from `weekCloseDate` (`clock.ts`), the day the one-shot week ticks and the office-day cut runs its seventh group. Opened on day 3 of a week, such an incident is held unstepped until day 7 and steps from day 8, exactly as under the one-shot week; a mid-week save can therefore hold a `started` up to six days ahead of the calendar. Incidents a dated act opens (strike missions, `issueImpactIncident`) keep the calendar day they resolve on.
- Strike resolution emits an initial physical assessment through the shared model, including on a failed military objective. The incident remains available for recovery reports.
- The low-level `resolveAction` remains immediate for existing NPC/batch callers. Player order timing is implemented; moving all NPC planning and pursuit progression onto the issued-order queue remains a separate integration gap.

## Validation and remaining limits

Tests cover strict inputs, SEIR population conservation, response direction, all natural/industrial profiles, bounded physical loss, cyber recovery, deterministic replay, save/reload, single casualty accounting and macro ownership. The action tests cover issuance, cancellation, delayed completion and attention stops. See the dated audit for exact commands/results.

**Design verdict: accepted with controls.** Typed contracts, single accounting ownership, deterministic calculations and explicit uncertainty are implemented. Empirical calibration, a target-site dataset, reviewed real-world event distributions, clinical subgroups and a full NPC order lifecycle are not complete. Provisional coefficients must not be described as validated realism or as a release-ready balance pass.


## October 9 foreign-action terms

`civilianProtection: additional-assessment` is a bounded presidential instruction for limited strikes. It adds three preparation days and reduces the existing harm probability by a provisional 0.65 multiplier. It does not guarantee safety, identify a site, or change the independent military success roll. This calibration is a transparent game assumption pending balance validation, not a sourced empirical estimate.

A strike producer may supply `ResolutionRequest.assessedSite` with an assessed category/reference/confirmation and validated site exposure. Education and healthcare classifications affect the incident's described service footprint; service users, treatment capacity, assets and recovery feed the existing shared calculations. No category is sampled from country urbanization, and no child deaths are generated without explicit demographic assessment. Without an assessment the existing country-proxy basis remains visible. Delayed execution stores the issued-action ID as the event's parent and the execution ledger event as its cause, allowing receipts and Record to join terms and consequences. Periodic/final foreign-action incident assessments also enter the shared feed.

Partner solicitation is separate from harm evidence: partners answer after three simulated days using their current interests/compacts; a limited-strike partner can condition participation on additional assessment. Draft, refused and conditional requests do not alter odds or absorb standing cost. Only confirmed contributions participate in the existing coalition estimator at execution. A support-seeking order waits at least four days; cancellation during preparation releases escrow and forces. `advanceUntilAttention` returns existing `consequence-return` attention when those answers first arrive, before execution, so Continue cannot skip the opportunity to stand down. These response times and conditions are provisional aggregate policy modeling.


### Holistic mission and modeled intelligence assessment

Limited strikes support military-capacity, logistics and strategic-infrastructure objectives. Successful military-capacity attacks apply the existing readiness loss. Logistics attacks apply smaller readiness loss plus airlift/sealift damage and a ten-day transport outage. Infrastructure attacks apply modest readiness loss plus a fourteen-day service-network outage. Outage effects use the existing infrastructure mechanism, service person-days, output loss and recovery; they do not automatically invent indirect deaths. Civilian harm remains independent of objective success, with provisional mission risk multipliers (1/1.15/1.35). Additional assessment reduces that risk and costs preparation time, without guaranteeing safety.

`assessStrikeSite` produces a bounded fictional intelligence case for ordinary player planning, not claims about actual facilities in a real country. Primary mission contexts include installations, air defense and equipment depots; supply hubs and transport/logistics nodes; energy, transport, industrial supply and communications networks. Exposure contexts span military support areas (weight12), transport (8), industrial (6), utilities (6), mixed residential/commercial areas (10), education (1), healthcare (1), and no site case (12). These weights and footprint values are explicit provisional scenario calibration. School/hospital cases are rarer possible collateral contexts rather than the objective vocabulary. National urbanization cannot substantiate any category, and no victim demographics are inferred.

The operation seed fixes mission and exposure context without consuming RNG in preview. NGA capability gives low/moderate evidence confidence; use, occupancy and nearby facilities remain unconfirmed. Authorization persists `CivilianSiteAssessment` through `AssessmentEffect.siteIssue` and freezes the objective/reference/exposure in the issued request. Saving and delayed execution preserve those terms. For an assessed exposure, the harm draw gates damage/disruption: a miss does not force destruction of civilian services. Successful logistics/infrastructure mission outages own economic pressure; their collateral incident records parent-owned economy while retaining independent population accounting. Report revisions and recovery reuse the existing incremental accounting and causal IDs.
