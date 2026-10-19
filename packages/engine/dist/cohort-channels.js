/**
 * The named policy channels through which an act reaches households that its
 * sector and federal terms do not (DECISIONS 5.8). A channel is a kind of
 * decision, not a kind of person: a signature names the channels the act moves,
 * and each cohort's reach says how directly that channel bears on its
 * households. A signed value is the direction: positive extends what the channel
 * delivers (coverage, protection, status, benefits), negative withdraws or
 * restricts it.
 */
export const DOMESTIC_CHANNELS = ["civilRights", "immigration", "healthAccess", "disabilityPrograms", "veterans"];
/** What each channel means, for a screen and for the writer who declares it. */
export const CHANNEL_MEANING = {
    civilRights: "enforcement of equal treatment in voting, employment, housing, policing and public services",
    immigration: "admission, legal status, enforcement and adjudication for people born abroad",
    healthAccess: "health coverage and the availability of care",
    disabilityPrograms: "disability benefits, accommodations and the medical-leave and care rules around them",
    veterans: "veterans' benefits, VA care and transition services",
};
/**
 * How directly a channel bears on a cohort's households, 0 to 1. These are
 * game-scale readings of published patterns, not measurements, and each row says
 * what it rests on. Anything not listed is zero, so a cohort is reached only
 * where a reason is written down.
 *
 * - civilRights: the statutes' coverage and the published mix of enforcement
 *   complaints by basis (race, sex, disability, national origin, service).
 * - immigration: who the law is about: people born abroad directly, and the
 *   households around them (a Hispanic or Asian household is far likelier to
 *   include someone foreign-born than the country's average).
 * - healthAccess: uninsured and public-coverage rates by group, plus who uses
 *   the most care (age, disability, pregnancy) and who lives far from it.
 * - disabilityPrograms: eligibility for the benefit and accommodation rules
 *   themselves, with service-connected disability inside the veteran cohort.
 * - veterans: eligibility for the VA and the GI Bill.
 */
export const CHANNEL_REACH = {
    "age-under-35": { healthAccess: 0.35 },
    "age-35-64": { healthAccess: 0.35 },
    "age-65-plus": { healthAccess: 0.8, disabilityPrograms: 0.35 },
    "income-struggling": { healthAccess: 0.6, disabilityPrograms: 0.3 },
    "income-comfortable": { healthAccess: 0.35 },
    "income-affluent": { healthAccess: 0.2 },
    "no-degree": { healthAccess: 0.4 },
    degree: { healthAccess: 0.3 },
    urban: {},
    suburban: {},
    rural: { healthAccess: 0.45 },
    "goods-producing": {},
    "frontline-services": { healthAccess: 0.4 },
    "professional-technical": {},
    "public-and-uniformed": { veterans: 0.2 },
    "not-in-the-workforce": { healthAccess: 0.55, disabilityPrograms: 0.35 },
    "race-hispanic": { civilRights: 0.6, immigration: 0.45, healthAccess: 0.5 },
    "race-black": { civilRights: 1, healthAccess: 0.45 },
    "race-asian": { civilRights: 0.5, immigration: 0.4, healthAccess: 0.25 },
    "race-white": { civilRights: 0.25, healthAccess: 0.3 },
    "race-other": { civilRights: 0.6, immigration: 0.2, healthAccess: 0.5 },
    "sex-female": { civilRights: 0.7, healthAccess: 0.55 },
    "sex-male": { civilRights: 0.2, healthAccess: 0.3 },
    "foreign-born": { civilRights: 0.6, immigration: 1, healthAccess: 0.5 },
    "us-born": { immigration: 0.05 },
    "with-disability": { civilRights: 1, healthAccess: 0.9, disabilityPrograms: 1 },
    "no-disability": { disabilityPrograms: 0.05 },
    veteran: { civilRights: 0.4, healthAccess: 0.4, disabilityPrograms: 0.35, veterans: 1 },
    "non-veteran": { veterans: 0.05 },
};
/** What a signature's channels add to one cohort's affinity. Pure, no roll. */
export function channelAffinity(cohort, signature) {
    const channels = signature.channels;
    if (!channels)
        return 0;
    const reach = CHANNEL_REACH[cohort];
    let total = 0;
    for (const channel of DOMESTIC_CHANNELS)
        total += (channels[channel] ?? 0) * (reach[channel] ?? 0);
    return total;
}
