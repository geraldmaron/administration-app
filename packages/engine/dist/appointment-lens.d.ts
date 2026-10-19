import type { CareerArchetype, Person, StudyField } from "@admin/world";
import { type OfficeId } from "./institutions.js";
import type { SeatKind } from "./appointment-eligibility.js";
/**
 * What a seat hires: a weight per year in each career, the fields it hires and
 * what one of them is worth in years, the careers that only count for someone
 * who studied the seat's own field, and the years at which more stops adding.
 * An academic counts for the FDA only if what they taught was medicine or the
 * sciences; without that, an economist and an engineer topped the FDA and the
 * NIH because those bodies' second domains hire economists and engineers.
 */
export type SeatLens = {
    readonly weights: ReadonlyMap<CareerArchetype, number>;
    readonly primary: ReadonlySet<CareerArchetype>;
    readonly studies: ReadonlySet<StudyField>;
    readonly primaryStudies: ReadonlySet<StudyField>;
    readonly studyYears: number;
    readonly fieldBound: ReadonlySet<CareerArchetype>;
    readonly saturation: number;
};
/** What this seat hires. */
export declare function lensFor(office: OfficeId, kind: SeatKind): SeatLens;
/** A person's years in what the seat hires, and the careers they came from, heaviest first. */
export type Relevance = {
    readonly score: number;
    readonly years: number;
    /** Each counted career with its years, longest first. */
    readonly careers: readonly {
        readonly archetype: CareerArchetype;
        readonly years: number;
    }[];
    readonly studied: boolean;
    /** Whether anything in the life is in the seat's primary domain, which is the floor below the cabinet. */
    readonly primary: boolean;
};
export declare function relevanceOf(person: Pick<Person, "career" | "education">, lens: SeatLens): Relevance;
