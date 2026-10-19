import { campaignFoundingDate } from "./clock.js";
import { JUDICIARY_SEAT_INSTITUTIONS, syntheticJudicialProvenance } from "./judiciary.js";
import { createRngStreams } from "./rng.js";
import { CIRCUIT_SEATS } from "./lower-bench.js";
import { institutionDef } from "./institutions.js";
import { vacancyBenchEffects } from "./appointment-bench.js";
// CDC/NCHS United States Life Tables, 2024, qx total, ages 45-95. The
// campaign's fictional justices do not have a biological-sex field, so a
// portrait's gender presentation is not used as a mortality input.
const LIFE_TABLE_QX_TOTAL = [
    0.002786, 0.002942, 0.003133, 0.003359, 0.003615, 0.003898, 0.004205,
    0.004529, 0.004873, 0.005252, 0.005652, 0.006104, 0.006656, 0.007316,
    0.008040, 0.008779, 0.009511, 0.010252, 0.011021, 0.011837, 0.012723,
    0.013783, 0.014771, 0.015845, 0.016966, 0.018110, 0.019489, 0.021136,
    0.022936, 0.025125, 0.027586, 0.030376, 0.032830, 0.037438, 0.041077,
    0.046154, 0.051126, 0.057587, 0.063598, 0.070988, 0.078467, 0.088254,
    0.099057, 0.110928, 0.123911, 0.138036, 0.153317, 0.169746, 0.187293,
    0.205902, 0.225491,
];
export function judicialDeathChance(age) {
    const qx = LIFE_TABLE_QX_TOTAL[Math.max(0, Math.min(50, Math.floor(age) - 45))];
    // Research note §2.2: judge/US-population ratios are empirical estimates,
    // not a claim that these fictional people carry observed health histories.
    return qx * (age < 65 ? 0.2 : age < 75 ? 0.25 : 0.6);
}
export function judicialRetirementChance(age, serviceYears, friendlyEarlyTerm) {
    // This models pension-eligible voluntary retirement under 28 U.S.C.
    // §371(c)'s age/service pairs, not a legal bar on earlier resignation.
    // Earlier voluntary resignation is outside this first vacancy hazard.
    // The 1.2% baseline is a model calibration; the relative age and party
    // effects come from COURTS-RESEARCH.md §3.1.
    if (age < 65 || serviceYears < 10 || age + serviceYears < 80)
        return 0;
    const ageFactor = 1.06 ** (age - 65);
    const lateTenure = serviceYears > 25 ? 1.03 ** (serviceYears - 25) : 1;
    return Math.min(0.2, 0.012 * ageFactor * lateTenure * (friendlyEarlyTerm ? 2.6 : 1));
}
/** One yearly draw per occupied Article III seat; anonymous circuit judges stay unnamed. */
export const judicialVacancyPhase = (state) => {
    const year = state.calendar.year;
    const foundingYear = campaignFoundingDate(state).year;
    if (year <= foundingYear)
        return [];
    const effects = [];
    const headlines = [];
    const circuitIds = CIRCUIT_SEATS.map((seat) => seat.id);
    for (const institutionId of [...JUDICIARY_SEAT_INSTITUTIONS, ...circuitIds]) {
        const seat = state.institutions[institutionId];
        const person = seat?.leader ? state.people[seat.leader] : undefined;
        const anonymous = seat?.lowerBenchSeat && !seat.leader;
        if (!seat || seat.vacancy || (!person?.alive && !anonymous) || seat.judicialAssessmentYear === year)
            continue;
        const ageAtFounding = person?.base.age ?? seat.lowerBenchSeat?.modeledAgeAtFounding;
        if (ageAtFounding === undefined)
            continue;
        const provenance = seat.judicialProvenance ?? (person
            ? syntheticJudicialProvenance(state.seed, institutionId, person.base.id, ageAtFounding, foundingYear)
            : undefined);
        if (!provenance)
            continue;
        const age = ageAtFounding + year - foundingYear;
        const serviceYears = year - provenance.serviceStartYear;
        const earlyTerm = ((year - foundingYear - 1) % 4) < 2;
        const friendly = earlyTerm && state.congress.administrationParty === provenance.appointingParty;
        // A panel's first appearance must not change this incumbent's mortality
        // stream: anonymous and materialized circuit seats share the same key.
        const occupant = seat.lowerBenchSeat ? `${provenance.serviceStartYear}:${provenance.appointingParty}` : person.base.id;
        const draw = createRngStreams(state.seed).stream("judicial-vacancy", institutionId, occupant, year);
        const died = draw.next() < judicialDeathChance(age);
        const retired = !died && draw.next() < judicialRetirementChance(age, serviceYears, friendly);
        if (died || retired) {
            if (person)
                effects.push({ kind: "person", person: person.base.id,
                    changes: died ? { alive: false, currentRole: undefined } : { currentRole: undefined, judicialRetired: true } });
            effects.push({ kind: "institution", institution: institutionId, vacate: true,
                changes: { judicialProvenance: provenance, judicialAssessmentYear: year } });
            // The candidates this seat brings with it where the cast has no judges
            // to offer, drawn once, now, and stored.
            const office = institutionDef(institutionId)?.offices[0]?.id;
            if (office)
                effects.push(...vacancyBenchEffects(state, office));
            headlines.push(seat.lowerBenchSeat
                ? `A ${seat.lowerBenchSeat.circuit} Circuit judge ${died ? "dies in office" : "takes senior status"}; a circuit seat is vacant.`
                : `${person.base.name} ${died ? "dies in office" : "retires"}; a Supreme Court seat is vacant.`);
        }
        else {
            effects.push({ kind: "institution", institution: institutionId,
                changes: { judicialProvenance: provenance, judicialAssessmentYear: year } });
        }
    }
    if (effects.length === 0)
        return [];
    effects.push(...headlines.map((headline) => ({ kind: "feed", items: [{ turn: state.turn + 1,
                kind: "governance", visibility: "public", headline,
                facts: { stake: "The President may nominate a successor, subject to Senate confirmation.", topicTags: ["judiciary"] } }] })));
    return [{ source: "simulate", actor: "world", turn: state.turn + 1,
            provenance: { origin: "scheduled", confidence: "observed", visibility: "public", systems: ["judiciary", "nominations"] },
            narration: { summary: headlines.length ? headlines.join(" ") : "The Article III seats remain occupied this year." }, effects }];
};
