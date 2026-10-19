# Appointments: the statutory rules, sourced

Research note for slice A0 of `PLAN.md`, 2026-10-13. Every rule below was read from the statute text on the Legal Information Institute's U.S. Code pages (law.cornell.edu), fetched 2026-10-13. A rule that has no primary text behind it is marked as a design choice, never as law.

## What became a hard rule

| Seat | Rule as enforced | Source opened | Notes |
|---|---|---|---|
| Secretary of Defense | Appointed from civilian life; not within 7 years after relief from active duty as a regular commissioned officer below O-7, not within 10 years at O-7 or above | 10 U.S.C. §113(a)(1)-(2), https://www.law.cornell.edu/uscode/text/10/113 | The 7/10 split dates from Pub. L. 117-81 §901(a) (2021). Congress has twice legislated a one-time exception (Pub. L. 115-2, 2017; Pub. L. 117-1, 2021); the game models no waiver. **Grade is not modeled**, so the engine enforces the 7-year floor that binds every officer, and treats a candidate whose uniformed service totals 20 years or more as a flag officer held to 10. That threshold is a modeling assumption, not statute |
| Secretaries of the Army, Navy and Air Force | Appointed from civilian life; not within 7 years after relief from active duty as a regular commissioned officer | 10 U.S.C. §7013(a), https://www.law.cornell.edu/uscode/text/10/7013 ; §8013(a), https://www.law.cornell.edu/uscode/text/10/8013 ; §9013(a), https://www.law.cornell.edu/uscode/text/10/9013 | The plan recalled five years; the current text says seven for all three |
| Chairman of the Joint Chiefs of Staff | Appointed from the officers of the regular components: a serving officer, never a civilian | 10 U.S.C. §152(a)(1), https://www.law.cornell.edu/uscode/text/10/152 | §152(b)(1) also requires prior service as Vice Chairman, a service chief or a combatant commander, and §152(b)(2) lets the President waive it. The person graph records none of those posts and the President may waive the rule, so it is a **ranking preference** (years in command), not a floor |

How "active duty" is read off a person: the generator gives every person a career whose last post runs to their present age (`rollBackground`, `packages/engine/src/people.ts`). A person whose last post is `military-command` is serving. Otherwise the years since relief are `age - (startAge + years)` of their latest `military-command` post. Nothing new is stored on a person to answer it.

## What stayed a preference, and why

| Seat | Rule as implemented | Source opened | Why not a floor |
|---|---|---|---|
| Attorney General | Strong ranking weight: reading law counts as much as a decade of practice, on top of the practice itself | 28 U.S.C. §503, https://www.law.cornell.edu/uscode/text/28/503 | The statute sets no professional qualification: "The President shall appoint, by and with the advice and consent of the Senate, an Attorney General of the United States." Owner decision 2026-10-13: a strong preference |
| Courts of appeals | Home circuit is a ranking preference, read from birthplace | 28 U.S.C. §44(c), https://www.law.cornell.edu/uscode/text/28/44 | The statute is a hard residency rule ("each circuit judge shall be a resident of the circuit for which appointed at the time of his appointment"), except in the District of Columbia; Federal Circuit judges reside within fifty miles of D.C. **The person graph has a birthplace, not a residence**, and enforcing residency off birthplace would bar people the law allows. Kept as a preference until residence is modeled |

## Design floors that are not law

| Seat | Floor | Source opened | Status |
|---|---|---|---|
| Supreme Court and courts of appeals | A legal career: read law, or practiced law or sat as a judge (`hasLegalCareer`). The generator draws a field and a career separately, so a lawyer of twenty years can carry another degree; the practice is the career | 28 U.S.C. §1 (composition of the Court), https://www.law.cornell.edu/uscode/text/28/1 ; §44 as above | Neither sets a professional qualification. Owner decision 2026-10-13: a hard floor for judges, stated in the game as the administration's standard, not as a legal requirement |

## Not modeled, and not sourced here

- **Blue slips.** A Senate Judiciary Committee practice, not statute. No primary text was opened; nothing in the engine reads it.
- **PA versus PAS classes** for the Secret Service, OFAC, NSA, DIA, NGA, NRO and NCSC heads are the catalog's (`packages/engine/src/institution-catalog.ts`). They were not re-sourced in this pass. The appointments desk leaves every office without a confirming chamber off the list, and `openNomination` refuses one, so no rule depends on the classification being exact beyond that.
- **Elevation of a sitting associate justice to Chief Justice.** Allowed in law; not modeled. A nomination still requires a nominee who holds no other office, and seating one justice in another seat needs a second vacancy the pipeline does not write.

## Probe commands for the integrator

The plan's §3.4 probes ran against committed `dist/`; this branch did not build, so they were not rerun. After the integration build, run them from the repo root:

```bash
node --input-type=module -e '
import "./scripts/register-player-core.mjs";
const { foundFixture } = await import("./scripts/fixtures/_campaign.mjs");
const { appointmentPool, dismissMinister, removeOfficer, apply, vacancyBenchEffects } = await import("./packages/engine/dist/index.js");
let c = foundFixture({ seedText: "appointments-probe", leaderName: "Avery Bell" });
for (const role of ["role-treasury-minister", "role-defense-minister", "role-attorney-general"]) { const r = dismissMinister(c, role); if (r.ok) c = apply(c, r.packet); }
for (const body of ["INST-FDA", "INST-CDC", "INST-NIH", "INST-JCS"]) { const r = removeOfficer(c, body); if (r.ok) c = apply(c, r.packet); }
const holder = c.institutions["INST-SCOTUS-SEAT-1"].leader;
c = apply(c, { source: "simulate", actor: "world", turn: c.turn, narration: { summary: "probe" }, effects: [
  { kind: "person", person: holder, changes: { currentRole: undefined, judicialRetired: true } },
  { kind: "institution", institution: "INST-SCOTUS-SEAT-1", vacate: true }, ...vacancyBenchEffects(c, "OFF-SCOTUS-SEAT-1")] });
for (const office of ["OFF-TREASURY-SEC", "OFF-DEFENSE-SEC", "OFF-JUSTICE-SEC", "OFF-FDA-HEAD", "OFF-CDC-HEAD", "OFF-NIH-HEAD", "OFF-EPA-ADMIN", "OFF-DCIA", "OFF-JOINTCHIEFS-HEAD", "OFF-SCOTUS-SEAT-1"]) {
  const pool = appointmentPool(c, office);
  console.log(office, pool.length);
  for (const row of pool.slice(0, 5)) console.log("  ", row.person.base.name, row.person.base.education.field, row.person.base.career.map((p) => p.archetype + " " + p.years).join(", "), "[" + row.reasons.map((r) => r.kind).join(",") + "]");
}'
```

Rerun with the seed texts `appointments-pool-a`, `appointments-pool-b` and `appointments-pool-c` (the pool test's seeds) for the four-seed table. The before table is §3.4 of `PLAN.md`. The engine's pool tests (`appointment-pool.test.ts`) hold the after state as assertions on four seeds.
