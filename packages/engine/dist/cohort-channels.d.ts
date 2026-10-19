import type { CohortId } from "@admin/world";
import type { DomesticSignature } from "./domestic-signature.js";
/**
 * The named policy channels through which an act reaches households that its
 * sector and federal terms do not (DECISIONS 5.8). A channel is a kind of
 * decision, not a kind of person: a signature names the channels the act moves,
 * and each cohort's reach says how directly that channel bears on its
 * households. A signed value is the direction: positive extends what the channel
 * delivers (coverage, protection, status, benefits), negative withdraws or
 * restricts it.
 */
export declare const DOMESTIC_CHANNELS: readonly ["civilRights", "immigration", "healthAccess", "disabilityPrograms", "veterans"];
export type DomesticChannel = (typeof DOMESTIC_CHANNELS)[number];
/** What each channel means, for a screen and for the writer who declares it. */
export declare const CHANNEL_MEANING: Readonly<Record<DomesticChannel, string>>;
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
export declare const CHANNEL_REACH: Readonly<Record<CohortId, Readonly<Partial<Record<DomesticChannel, number>>>>>;
/** What a signature's channels add to one cohort's affinity. Pure, no roll. */
export declare function channelAffinity(cohort: CohortId, signature: DomesticSignature): number;
