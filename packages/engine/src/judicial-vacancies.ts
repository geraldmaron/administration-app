import type { Campaign } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
import { campaignFoundingDate } from "./clock.js";
import { JUDICIARY_SEAT_INSTITUTIONS, syntheticJudicialProvenance } from "./judiciary.js";
import { createRngStreams } from "./rng.js";
import { CIRCUIT_SEATS } from "./lower-bench.js";
import { institutionDef } from "./institutions.js";
import { vacancyBenchEffects } from "./appointment-bench.js";
import { lifeTableQx } from "./officeholder-mortality.js";

// The judges' own adjustments to the shared life table (officeholder-mortality.ts).
// They are drawn here once a year and nowhere else.
export function judicialDeathChance(age: number): number {
  const qx = lifeTableQx(age);
  // Research note §2.2: judge/US-population ratios are empirical estimates,
  // not a claim that these fictional people carry observed health histories.
  return qx * (age < 65 ? 0.2 : age < 75 ? 0.25 : 0.6);
}

export function judicialRetirementChance(age: number, serviceYears: number, friendlyEarlyTerm: boolean): number {
  // This models pension-eligible voluntary retirement under 28 U.S.C.
  // §371(c)'s age/service pairs, not a legal bar on earlier resignation.
  // Earlier voluntary resignation is outside this first vacancy hazard.
  // The 1.2% baseline is a model calibration; the relative age and party
  // effects come from COURTS-RESEARCH.md §3.1.
  if (age < 65 || serviceYears < 10 || age + serviceYears < 80) return 0;
  const ageFactor = 1.06 ** (age - 65);
  const lateTenure = serviceYears > 25 ? 1.03 ** (serviceYears - 25) : 1;
  return Math.min(0.2, 0.012 * ageFactor * lateTenure * (friendlyEarlyTerm ? 2.6 : 1));
}

/** One yearly draw per occupied Article III seat; anonymous circuit judges stay unnamed. */
export const judicialVacancyPhase: TurnPhase = (state: Campaign) => {
  const year = state.calendar.year;
  const foundingYear = campaignFoundingDate(state).year;
  if (year <= foundingYear) return [];
  const effects: Effect[] = [];
  const headlines: string[] = [];
  const circuitIds = CIRCUIT_SEATS.map((seat) => seat.id);
  for (const institutionId of [...JUDICIARY_SEAT_INSTITUTIONS, ...circuitIds]) {
    const seat = state.institutions[institutionId];
    const person = seat?.leader ? state.people[seat.leader] : undefined;
    const anonymous = seat?.lowerBenchSeat && !seat.leader;
    if (!seat || seat.vacancy || (!person?.alive && !anonymous) || seat.judicialAssessmentYear === year) continue;
    const ageAtFounding = person?.base.age ?? seat.lowerBenchSeat?.modeledAgeAtFounding;
    if (ageAtFounding === undefined) continue;
    const provenance = seat.judicialProvenance ?? (person
      ? syntheticJudicialProvenance(state.seed, institutionId, person.base.id, ageAtFounding, foundingYear)
      : undefined);
    if (!provenance) continue;
    const age = ageAtFounding + year - foundingYear;
    const serviceYears = year - provenance.serviceStartYear;
    const earlyTerm = ((year - foundingYear - 1) % 4) < 2;
    const friendly = earlyTerm && state.congress.administrationParty === provenance.appointingParty;
    // A panel's first appearance must not change this incumbent's mortality
    // stream: anonymous and materialized circuit seats share the same key.
    const occupant = seat.lowerBenchSeat ? `${provenance.serviceStartYear}:${provenance.appointingParty}` : person!.base.id;
    const draw = createRngStreams(state.seed).stream("judicial-vacancy", institutionId, occupant, year);
    const died = draw.next() < judicialDeathChance(age);
    const retired = !died && draw.next() < judicialRetirementChance(age, serviceYears, friendly);
    if (died || retired) {
      if (person) effects.push({ kind: "person", person: person.base.id,
        changes: died ? { alive: false, currentRole: undefined } : { currentRole: undefined, judicialRetired: true } });
      effects.push({ kind: "institution", institution: institutionId, vacate: true,
        changes: { judicialProvenance: provenance, judicialAssessmentYear: year } });
      // The candidates this seat brings with it where the cast has no judges
      // to offer, drawn once, now, and stored.
      const office = institutionDef(institutionId)?.offices[0]?.id;
      if (office) effects.push(...vacancyBenchEffects(state, office));
      headlines.push(seat.lowerBenchSeat
        ? `A ${seat.lowerBenchSeat.circuit} Circuit judge ${died ? "dies in office" : "takes senior status"}; a circuit seat is vacant.`
        : `${person!.base.name} ${died ? "dies in office" : "retires"}; a Supreme Court seat is vacant.`);
    } else {
      effects.push({ kind: "institution", institution: institutionId,
        changes: { judicialProvenance: provenance, judicialAssessmentYear: year } });
    }
  }
  if (effects.length === 0) return [];
  effects.push(...headlines.map((headline): Effect => ({ kind: "feed", items: [{ turn: state.turn + 1,
    kind: "governance", visibility: "public", headline,
    facts: { stake: "The President may nominate a successor, subject to Senate confirmation.", topicTags: ["judiciary"] } }] })));
  return [{ source: "simulate", actor: "world", turn: state.turn + 1,
    provenance: { origin: "scheduled", confidence: "observed", visibility: "public", systems: ["judiciary", "nominations"] },
    narration: { summary: headlines.length ? headlines.join(" ") : "The Article III seats remain occupied this year." }, effects }] satisfies readonly EffectPacket[];
};
