# Domestic force acts: design brief

Status: design, 2026-10-25. Enables the locale acts locked in `packages/engine/src/locale-acts.ts` (federal agents, active-duty troops, Guard federalization, resident surveillance) on their statutory predicates. Legal brief: `docs/audits/2026-10-16-presidential-authority/01-national-security.md` N48 to N58. Law is cited on every act (DECISIONS §8.12).

## Decision

Each coercive locale act signs a catalogue order behind the scenes, and that order record is the legal instrument. That gives the acts the Attorney General's review (`order-review.ts`), filing odds (`legal-exposure.ts`), state plaintiffs (`state-suits.ts`), a proceeding with an interim-relief clock, a TRO that suspends the order (`order-authority.ts`), rescission and the removal-pressure counts. The investigative priority goes through `issueDirective`. Troops and the federalized Guard commit real formations through `openCommitment`. Easing unrest uses the existing condition-attention and protest-pressure channels: no new condition writer, no new turn phase. The direct "order surveillance of residents" stays refused, now citing 50 U.S.C. §1812 and EO 12333 §2.3, with "Set an investigative priority" as its lawful neighbor.

Strongest failure mode: troops become the cheap fix for unrest. Accepted with controls (two-week minimum, near-certain suit on §§252-253 with a TRO freeing the brigade, governor and mark costs, incident tempo that turns a third act in eight weeks net-inflammatory). Validate with an 8-seed probe.

## Engine contract (`packages/engine/src`)

### Ids
```ts
export type LocaleActId =
  | "relief" | "request-deployment" | "waiver" | "review"
  | "property-surge" | "immigration-operation" | "task-force"   // replaces "agents"
  | "federalize" | "proclaim" | "troops"
  | "priority" | "surveil";
```
Separate ids, not a mission parameter: `takeLocaleAct(campaign, state, actId, cause)` and every Record-keyed UI table keep their shape. No save stores a `LocaleActId`.

### `LocaleAct` additions
```ts
export type LocaleActGroup = "relief" | "enforcement" | "military" | "investigation";
export type LocaleOccasion = "any" | "disorder" | "enforcement";
// group; occasion (replaces predicate "disorder"; "enforcement" = routine federal law, never "unprovoked");
// predicate?: "request" | "federal-service" | "insurrection" | "proclaimed";
// answersClaim: boolean | "with-assent";
// authority?: OrderAuthority (every act except waiver/review); orderId?: string (the localeOnly order it signs);
// mission?: { attention; weeks; protest };
// commitment?: { amountPerTurn; weeks; line: OutlayFunction; forces?: { branch; unitType; count } };
// governor?: { opposed; assenting }; mark?: { valence: 1|-1; weight; signature; when: "always"|"opposed" };
// opinion?: { integrity?; competence?; polarize? }; stability?; readiness?; boundary?: true (surveil)
```

### Acts and magnitudes
Money in USD millions at US GDP 27,498,847, through `treasuryOfGdp` and `playerGdp` (verify-fiscal-authority). Unit costs are planning values at about $300k per loaded officer-year; mark them as such in comments. Protest deltas write national `politics.protestPressure` through a clamped `nationStat`, and apply only when unrest reaches the state (zero on the home path). Keep the relief entry's literal `    treasuryOfGdp: -0.00025,` byte-identical (verify-fiscal-authority-proof edits it).

| id | Law | Occasion / gate | Up front | Mission attention / weeks | Protest | Governor shift | Coercion (kind odds / severity) |
|---|---|---|---|---|---|---|---|
| property-surge | 40 U.S.C. §1315 | disorder; no consent | $15M (-5.5e-7); standing 0.005; excepted | 0.5 / 6 | -0.010 | -0.02 if opposed | agents 0.10 / 0.8 |
| immigration-operation | 8 U.S.C. §1357 | enforcement; no consent; every state | $65M (-2.4e-6); standing 0.01 | none | +0.015 r | -0.04 r if opposed, else -0.01 | agents 0.14 / 1.0 |
| task-force | 28 U.S.C. §533 | disorder; governor assent | $40M (-1.5e-6); standing 0 | 0.75 / 8 | -0.010 | +0.02 | agents 0.07 / 0.7 |
| federalize | 10 U.S.C. §12406 | federal-service predicate | $20M (-7.3e-7), then commitment $13M/wk x 8; standing 0.03 | 1.0 while the commitment lives | -0.020 | -0.04 if not assenting | troops 0.18 / 1.2 |
| proclaim | 10 U.S.C. §254 | insurrection predicate | $0; standing 0.01 | none | -0.005 | -0.02 (tiers 252/253) | none |
| troops | 10 U.S.C. §251 or §§252-253 by tier | live proclamation from an earlier week | $25M (-9e-7), then commitment 1 BCT + $10M/wk x 8; standing 0.02 (251) / 0.06 (252-253) | 1.0 while the commitment lives | -0.030 | +0.02 (251) / -0.04 | troops 0.22 / 1.5 |
| priority | 28 U.S.C. §509 (memorandum to the AG) | disorder; one per week | $0 | 0.3 / 8, only if the directive is carried | -0.005 | 0 | surveillance 0.06 / 0.6 |
| surveil | refused: 50 U.S.C. §1812; EO 12333 §2.3 | always refused | n/a | n/a | n/a | n/a | n/a |

`r = min(1, foreign-born share / 0.14)` from `character.cohorts.nativity["foreign-born"]`; no share gate (ICE operates in every state).

Other effects:
- immigration-operation: `domestic` signature `{ channels: { immigration: -0.35 }, magnitude: "moderate", signature: "order:immigration-operation" }` filtered to the subject state (mirror `orders.ts:723-725`); mark -1 at 0.3 r.
- task-force: mark +1 at 0.2 (`answered:task-force`).
- federalize: integrity -0.008 and polarize 0.008 when the governor is not assenting; stability +0.006; readiness -0.003; mark -1 at 0.4 when opposed; answers the claim only with assent.
- proclaim: polarize 0.004.
- troops: tiers 252/253 integrity -0.01, polarize 0.01, mark -1 at 0.5; tier 251 competence +0.004, mark +1 at 0.3, answers the claim; stability +0.008 and readiness -0.008 in every tier.
- priority: integrity -0.006, polarize 0.004.
- property-surge: polarize 0.003, stability +0.004.

Rationale in brief: attention 1.0 for troops and Guard matches what `request-deployment` buys through the answered mark, at a far higher political price; protest -0.03 only nudges the unrest floor, most easing comes from attention (about 7 to 10 weeks to resolve versus about 20 unattended at severity 0.5); a first troop use nets about -0.013 protest, a third act inside 8 weeks nets about +0.03 (repeated force backfires); governor and mark deltas stay inside the existing ±0.04 cap. One BCT (31 on hand) matches Little Rock 1957 and Los Angeles 1992 scale. Add `domestic-deployment-2025` to `FORCE_COST_ANCHORS` only after the source is opened (reported DoD estimate about $134M for about 4,700 troops over 60 days in Los Angeles); until then the $10M/week is a labeled planning value.

### Predicates (new `locale-missions.ts`)
```ts
export function unrestReaching(c, s): NationCondition | undefined   // active home unrest with state === s, or nation-scope (state undefined)
export const INSURRECTION_SEVERITY = { request: 0.4, obstruction: 0.5, rights: 0.6 } as const;
export const OBSTRUCTION_WEEKS = 2;            // §252: a federal mission in the state >= 2 weeks and unrest still >= 0.5
export const PROCLAMATION_VALID_TURNS = 4;     // §254 must precede the order by at least one week
export const REBELLION_INSURGENCY_FLOOR = 0.2; // US rests at 0.05
export type InsurrectionGround = "251" | "252" | "253";
export function insurrectionGround(c, s): InsurrectionGround | undefined
//  251: governorAssents && severity >= 0.4
//  252: live property-surge|task-force|immigration-operation record in s, turn <= now-2, authority operative, severity >= 0.5
//  253: severity >= 0.6 && !governorAssents && no answered:relief:unrest mark in s within 6 turns
export function liveProclamation(c, s): ExecutiveOrderRecord | undefined // order-insurrection-proclamation, subject.state === s, turn in [now-4, now-1], operative
export function federalServiceGround(c, s): "invasion" | "rebellion" | "proclamation" | undefined
//  invasion: active conflict with USA as defender; rebellion: insurgencyPressure >= 0.2; proclamation: liveProclamation(s)
export function missionAttention(c, condition): number
```
`missionAttention` reads live mission order records and live `authorizedBy` commitments whose order authority is operative, plus marked `investigative-priority:<state>` flags (directive carried). Placed condition: largest weight. Nation-scope: sum of weight x population share, capped at 1. `conditionAttention` (`conditions.ts` ~218-229) gains one `Math.max(…, missionAttention(...))` term. Import rule: `locale-missions.ts` imports only `state.js`, `order-authority.js`, `obligations.js`, `condition-kinds.js` (no cycle with `conditions.ts`). Do not reuse `underRebellionOrInvasion` (it treats an NEA declaration over unrest as rebellion).

Refusal strings (the text after "This needs "):
- federalize: "an invasion, a rebellion, or an Insurrection Act proclamation in force here: 10 U.S.C. §12406, which Trump v. Illinois (2025) reads as reaching only where the military could lawfully execute the laws. A declaration or a protest is none of them."
- proclaim: "one of the Insurrection Act's occasions: the governor's request (§251), obstruction that a federal mission here has not overcome (§252), or violence denying rights the state will not protect (§253)."
- troops: "a proclamation ordering the insurgents to disperse, issued an earlier week and still in force (10 U.S.C. §254). Without it, the Posse Comitatus Act (18 U.S.C. §1385) bars the armed forces from executing the laws."
- surveil: "a FISA or Title III court order, the exclusive means for electronic surveillance (50 U.S.C. §1812), and the Attorney General's procedures for collection on U.S. persons (Executive Order 12333 §2.3). No presidential order supplies either; set an investigative priority instead." Keep "Attorney General" (`domestic-coercion.test.ts:140` asserts it).

Posse Comitatus: the troops order's subject carries `mission` (251 "assist state authorities", 252 "enforce federal law and court orders", 253 "suppress violence denying rights"). The commitment is bound to that state and order; moving forces needs a new act. The exposure grounds plead §1385 beyond the stated mission.

### Mission orders (new `locale-mission-orders.ts`)
`LOCALE_MISSION_ORDERS: readonly ExecutiveOrder[]` in the `order-families.ts` pattern, type-only imports from `orders.ts`; `orders.ts` `BY_ID` is built from `[...EXECUTIVE_ORDERS, ...LOCALE_MISSION_ORDERS]` (one line). Not in `EXECUTIVE_ORDERS`, so the policy desk, `availableOrders` and the tests that iterate the catalogue are unaffected.

| order id | domain | overreach | roleHints | exposure (salience; classes; basis; reach; constitutionalShare) |
|---|---|---|---|---|
| order-property-surge | security | 0.15 | interior, security, home | copy of the `order-force-protection` row |
| order-immigration-operation | security | 0.30 | interior, security, home | 0.8; advocacy 0.6, individuals 0.5; residents; cohort foreign-born; 0.5 |
| order-joint-task-force | security | 0.05 | attorney, justice, law | 0.2; advocacy 0.1; none; none; 0.1 |
| order-guard-federalization | emergency | 0.45 | defense | 0.9; advocacy 0.4; proprietary; subject-state; 0.5 |
| order-insurrection-proclamation | emergency | 0.20 | none | 0.5; advocacy 0.2; none; none; 0.3 |
| order-insurrection-request | emergency | 0.10 | defense | 0.4; advocacy 0.15; none; none; 0.2 |
| order-insurrection-enforcement | emergency | 0.55 | defense | 0.95; advocacy 0.5, individuals 0.3; proprietary; subject-state; 0.5 |

Pleaded grounds: the §12406 or §252/§253 predicate missing; orders not issued through the governor; §1385 beyond the stated mission; Tenth Amendment; Fourth Amendment stops without reasonable suspicion; First Amendment retaliation. Private plaintiffs are fictional names. The enforcement row reaches the 0.95 filing cap, as in the Los Angeles case.

### Campaign-state shapes (SCHEMA.md and ARCHITECTURE.md change in the same commit)
- `order-subjects.ts` `OrderSubject` and `state-orders.ts` `ExecutiveOrderRecord.subject`: add `{ kind: "locale-mission"; state: StateId; act: LocaleActId; ground?: InsurrectionGround }`.
- `orders.ts` has about 4 free lines of its 800: move `orderRecordId` into `order-subjects.ts` and export it, keyed on `subject.state` for this kind. The contested draw becomes `stream("executive-order", orderId, turn, ...(subject?.kind === "locale-mission" ? [subject.state] : []))` so two states in one week draw independently (confirm `stream` is variadic). `orderSubjectRefusal` gets one branch delegating to the locale predicates. `legal-exposure.ts` `subjectState` gets `locale-mission` -> `subject.state`.
- `state-commitments.ts`: `CommitmentTarget.kind` gains `"state"`; `Commitment` gains `authorizedBy?: string` (an order record id). `commitments.ts`: `targetName` handles `state`; `commitmentDeed` writes `deed-toward` only for `nation`; `expired(...)` is also true when `authorizedBy` is set and `prospectiveOrderAuthority !== "operative"` (a TRO, rescission or strike-down releases the brigade next week and stops the bill; commitments only). `commitment-locations.ts`: `state` returns undefined.
- No save migration: optional fields and widened unions. `CURRENT_SCHEMA_VERSION` stays 67.

### `takeLocaleAct` / `takeHomeAct`
Signatures unchanged. Move the take functions into new `locale-act-effects.ts` (keeps `locale-acts.ts` under 800 lines). Steps: availability; if `orderId`, `signOrder(campaign, charter, orderId, createRngStreams(campaign.seed), subject)` (charter from `worldDataset.charters`, as in `conversation-report-actions.ts:28`) and take its effects, counsel and provenance; for `priority`, `issueDirective(campaign, { institution: "INST-DOJ", kind: "enforcement-posture", subject: "Investigative priority: violent disorder in <State>" })` plus a marked flag `investigative-priority:<state>`; money line and `openCommitment` (target `{ kind: "state", id }`, `authorizedBy` the record id); nation-stat, opinion, governor and mark effects; claim answer; `coercionOutcome` (for `occasion: "enforcement"` always `provoked = true`). One packet narrated by the locale act. Home acts are coercive acts whose occasion is not "any": `UNPROVOKED_STANDING` applies and there is no protest easing.

Also fix `conversation-report-actions.ts` `localeProjection` to quote the packet's metric deltas (it ignores unrequested standing), and widen `ReplyCommitment.locale.act` (`conversations.ts` ~137) to `"relief" | "review" | "property-surge" | "task-force" | "priority"`.

### Public API for player-core
```ts
export type LocaleGateCheck = { label: string; met: boolean; cite?: string };
export type LocaleActProjection = {
  act: LocaleAct; availability: LocaleAvailability; gates: readonly LocaleGateCheck[];
  order?: { orderId: string; subject: OrderSubject; projection: OrderProjection };
  commitment?: LocaleAct["commitment"]; mission?: LocaleAct["mission"];
  protestDelta: number; governorShift: number; ground?: InsurrectionGround;
};
export function localeActProjection(c, s, id, cause?): LocaleActProjection;
export function liveLocaleMissions(c, s): readonly { act: LocaleActId; recordId?: string; sinceTurn: number; status: ProspectiveOrderAuthority }[];
export { unrestReaching, insurrectionGround, federalServiceGround, liveProclamation, LOCALE_MISSION_ORDERS };
```
Export all of it from `index.ts`.

## Player-core view model (`world/locale-act-options.ts`)
`LocaleActOption` gains: `group`; `authority?: { cite; name; limit; recordId? }` (from `orderAuthorityRecord`); `gates: { label; met; cite? }[]`; `litigation?: { filingChance; meritsChance; plaintiffs; counsel?: { name; objects }; reasoning }` (plaintiffs from `challengeParties`, counsel from `projection.review`); `commitment?: { forcesText?; weeklyText; weeks }`; `eases?: { attention; weeks; protest }`; `governorShift?`; `step?: { after: "proclaim"; text }` (troops); `refusedByLaw?: { reason; neighbor: "priority" }` (surveil renders as "Why you can't order this", never a button). Coercive options only when `cause === "unrest"`; immigration-operation only from `homeActOptions`. Add `localeMissions(c, s)` returning `{ name; since; status: "in force" | "paused by a court" | "ended" }[]`. Fix `localeMatters` to include `unrestReaching(c, s)` for every state (today nation-scope unrest shows only while a claim is open).

## Lane plan (no overlapping files; one builder at a time)
1. Engine (Opus). New: `locale-missions.ts`, `locale-mission-orders.ts`, `locale-act-effects.ts`. Edit: `locale-acts.ts`, `orders.ts`, `order-subjects.ts`, `state-orders.ts`, `order-exposure.ts`, `legal-exposure.ts`, `conditions.ts` (1 term), `state-commitments.ts`, `commitments.ts`, `commitment-locations.ts`, `conversation-report-actions.ts`, `conversations.ts` (type), `index.ts`. World: `force-cost-anchors.ts` and `sources/force-costs-sources.md` only if the source is opened. Rebuild and commit `dist/`.
2. Engine tests (QA). Rewrite `authority-boundaries.test.ts`, `domestic-coercion.test.ts` (44-48, 123-143), `emergency.test.ts` (176-198), `war-party.test.ts` (109-125; an invasion now opens federalize), `fiscal-authority.test.ts` (338-345; skip zero-cost acts proclaim, priority, surveil). Add `locale-missions.test.ts` (predicates, TRO release, attention, two states one week). Extend `commitments.test.ts`, `legal-exposure.test.ts`, `orders.test.ts`.
3. Player-core. `world/locale-act-options.ts` (+test), `world/state-relationship.ts`, `modeling/acts.ts` (verify), authority records (`authority/records-security.ts` 8 U.S.C. §1357, `records-offices.ts` 28 U.S.C. §533, `records-domestic.ts` 32 U.S.C. §502(f)), `glossary/world.ts` (rewrite the N50 entry near line 705; add proclamation and investigative priority), `scripts/verify-authority-citations.mjs` and its `-proof` twin to check `LOCALE_MISSION_ORDERS` and every act's `authority`.
4. apps/player UI. `nation/state/locale-acts.tsx`, `LocaleDesk.tsx`, `StateViews.tsx` (~273 copy), `home/StateActs.tsx`, `home/BatchActs.tsx` (BATCHABLE = relief, request-deployment, property-surge, task-force, waiver, review). Frozen `apps/web`: only add the new Record keys in `LocaleActDesk.tsx` and `LocaleReceipt.tsx` so types hold.
5. Content. Widen `packages/content/src/scenario.ts` ~446 enum with property-surge, task-force, priority (federalize, proclaim and troops are multi-week sequences, not one reply). `scenario-cast.ts` ~575 cause becomes `ConditionKind`. A coercive locale act needs report condition `unrest`: put the audit rule outside `scenario-audit.ts` (frozen at 1569 lines). Add consequence, feed and dispatch lines for the new acts. Regenerate the bundled corpus if touched.
6. Docs. DECISIONS new §6.x "Federal force at home moves only on its statute's predicate" and the §8.12 Where line; ARCHITECTURE (~1461, ~1463, commitment and order-record sections); SCHEMA.md; BACKLOG per repo rules (close N51-N54, N57 with proof; open items for `underRebellionOrInvasion`, the N48 relief gate, the cost basis of relief and waiver); audit N51-N54 verdict lines; capability-ledger rows 52-53; a gate record.

Gates touched: `verify-authority-citations` (+proof), `verify-fiscal-authority` (+proof; keep the literal), `verify-metric-registry` (new metric writers in `locale-act-effects.ts`; regenerate `metric-registry-report.json`), `verify-file-size`, American-English and US-units copy gates, `verify-renderer-boundary`, `scripts/fixtures/court-challenge.mjs`.

## Risks to validate before close
- Dominance: probe weeks-to-resolve and removal pressure for each path over 8 seeds (the balance harness takes no locale acts).
- Reachability: at US rest insurgency is 0.05 against the 0.2 floor, so "rebellion" is rare by design; §253 needs severity >= 0.6, governor below 0.45 and no answered state action. Count how often each ground is reachable.
- Legal realism: the §252 predicate is a game reading of "impracticable by the ordinary course of judicial proceedings"; the copy must say so. Sources named here (Martin v. Mott, Laird v. Tatum, EO 12804, 2025 deployment costs) were not opened in design and must be opened before any figure or quote ships.
- `orders.ts` file budget (4 lines free).

## Addendum: court orders the administration requests (lane 1b, after lane 1)

Gap found after the first design: courts only act against the President (TRO, strike-down). Nothing lets Justice apply for an order, and surveillance and the §252 ground have nothing to read.

### Mechanism
A court-order application is a Justice filing the President directs, decided on a clock, leaving a record other acts read. Reuse, do not duplicate: the filing goes through `issueDirective` to `INST-DOJ` (a new directive kind or the nearest existing one, verified against `directives.ts`); the decision follows the court machinery's clock pattern (`docket.ts`, `specialized-court-matters.ts`, `state-judiciary.ts`); the record lives in marked flags or an existing record store if one fits, and widens Campaign state only if it cannot. Verify what exists before choosing.

Kinds (each cites its law, §8.12):
- `fisa-order` (50 U.S.C. §1805, the Foreign Intelligence Surveillance Court): needs a foreign-power or agent-of-a-foreign-power predicate that the engine can read (an existing intelligence product, counterintelligence finding or foreign-power link on a domestic target). Never granted for protest or unrest alone (First Amendment proviso, §1805(a)(2)(A)).
- `title-iii-order` (18 U.S.C. §2518): needs probable cause of a listed federal crime; district court; 30-day term, renewable.
- `injunction-enforcement` (28 U.S.C. §1331 suit by the United States): Justice sues a state or party to enforce federal law; a granted order is the "federal court order" that §252 reads when defied.
- `search-warrant` (Fed. R. Crim. P. 41): small, fast, probable cause.

### Decision and odds
Granted, narrowed or denied on a seeded draw keyed by kind, state and week. Odds read evidence quality (intel capability, an existing investigation or priority memorandum on that state, the predicate's strength) and the bench (existing judge or court leaning where `state-judiciary` carries it). Denial is not free: it leaves a record, costs standing if it leaks (existing scandal flag path), and a refusal blocks the dependent act for a cool-down. Expiry and renewal are explicit; an expired order stops enabling its act.

### Wiring
- Surveillance: `surveil` (direct presidential order) stays refused. Add a lawful act `surveil-under-order` (or extend `priority`) that is available only while a live `fisa-order` or `title-iii-order` covers that state; it carries the surveillance coercion risk, the committee-inquiry flag, and exposure if the order was narrowed. Citations: 50 U.S.C. §§1805, 1812; 18 U.S.C. §2518; EO 12333 §2.3.
- Insurrection Act §252: `insurrectionGround` reads a live granted `injunction-enforcement` order that the state has defied (unrest still at or above the §252 severity and no state action mark after the grant) as the obstruction predicate, in place of or alongside the two-week-mission proxy. §253 is unchanged.
- Litigation back-pressure: a suit lost or an order narrowed feeds the existing loss count `legal-exposure.ts` `loudness` already reads.

### Surfaces
Engine: new file for the application, decision and selectors; touch only the lane-1 files that must change (`locale-missions.ts`, `locale-acts.ts` or `locale-act-effects.ts`, `directives.ts` kind if needed, `index.ts`). Then: player-core option and a "Seek a court order" desk row with the odds drawn, the order's term and what it enables; the app row; glossary terms (FISC, Title III order, warrant, injunction); authority records for each statute; scenario/consequence copy; DECISIONS, ARCHITECTURE and SCHEMA if state widens; tests; the probe for reachability.
