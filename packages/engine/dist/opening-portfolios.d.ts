import type { Person, PersonTrait } from "@admin/world";
import type { OpeningMetric } from "./opening-position.js";
export type PortfolioPush = {
    readonly metric: OpeningMetric;
    readonly attribute: "competence" | "integrity" | "charisma";
    readonly weight: number;
    readonly reason: (person: Person, favorable: boolean) => string;
};
export declare const PORTFOLIOS: Readonly<Record<string, readonly PortfolioPush[]>>;
/**
 * Which metrics a chair's holder's *disposition* can act on.
 *
 * A minister acts through their ministry. Without this, a cautious treasury
 * minister raised military readiness and a reclusive interior minister cost the
 * government standing abroad — the trait table applied whole to every seat, so
 * every disposition reached every metric regardless of what the person actually
 * had authority over. Stability is on every list because cabinet cohesion is
 * every minister's business; defense carries treasury too, because procurement
 * is where a defense ministry's money actually goes.
 *
 * The head of government is exempt: they chair the room and speak for the
 * country, so their disposition genuinely does reach everything.
 */
export declare const PORTFOLIO_REACH: Readonly<Record<string, readonly OpeningMetric[]>>;
export declare const GENERIC_REACH: readonly OpeningMetric[];
export declare const GENERIC_PORTFOLIO: readonly PortfolioPush[];
export type TraitPush = {
    readonly metric: OpeningMetric;
    readonly delta: number;
    readonly note: string;
};
export declare const TRAIT_PUSHES: Readonly<Record<PersonTrait, readonly TraitPush[]>>;
export declare const LEADER_PORTFOLIO: readonly PortfolioPush[];
/**
 * The smallest movement worth reporting, in points.
 *
 * Surfaces draw these as whole points, so anything under half a point renders
 * as "+0" — a line that occupies a row, names a person, and tells the player
 * nothing. Below the floor it is not a contribution, it is rounding, and it is
 * dropped from the sum as well as from the list so that what is shown adds up
 * to what is applied.
 */
