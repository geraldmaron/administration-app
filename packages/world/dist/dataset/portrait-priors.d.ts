import type { PortraitGenderPresentation } from "../schemas/portrait.js";
type GenderPrior = Readonly<Record<PortraitGenderPresentation, number>>;
/**
 * The share a cabinet chair draws against.
 *
 * A flagged share predates the cabinet now sitting (Hungary's 0.0 is the
 * previous government's), so it is a prior with the region's mean as its
 * floor: a data lag must not become a government that seats no women. An
 * unflagged zero is a researched fact, and stays one: the Saudi cabinet seats
 * none.
 */
export declare function cabinetWomenShareFor(nation: string): number | undefined;
/**
 * How a foreign government's chairs divide by presentation: the table's
 * leader for the lead chair, its women-in-cabinet share for every other.
 * Undefined where the table is silent, which leaves the draw on its global
 * weights.
 *
 * The lead chair never reads the cabinet's share: the Marshall Islands seats a
 * woman as President beside a cabinet the table records with none.
 */
export declare function nationGenderPriorFor(nation: string, role: string): GenderPrior | undefined;
export {};
