import { type Campaign, type GameDate, type PolicyDomain } from "@admin/engine";
import { type StateEconomyAxis, type StateId } from "@admin/world";
/**
 * The parts of a state's economy each domain's program lands on hardest,
 * on the six axes a state is described by. Presentation only: the map colors
 * a state by how much of its living sits in these, so the President sees where
 * a program would be felt before choosing one.
 */
export declare const POLICY_DOMAIN_AXES: Readonly<Record<PolicyDomain, readonly StateEconomyAxis[]>>;
/** The glyph each domain is drawn with. */
export declare const POLICY_DOMAIN_ICONS: Readonly<Record<PolicyDomain, string>>;
export declare function isPolicyDomain(value: string | undefined): value is PolicyDomain;
/** What the map's share lens for a domain is a share of, in words. */
export declare function domainShareWords(domain: PolicyDomain): string;
/** Each state's share of its economy in the domain's axes, 0..1, from the dataset. */
export declare function stateIndustryShares(domain: PolicyDomain): ReadonlyMap<StateId, number>;
/** A promise that rides on a domain: keeping or changing the program keeps or breaks it. */
export type PledgeAtStake = {
    readonly id: string;
    readonly title: string;
    readonly dueDate: GameDate;
    /** The stance that keeps it. */
    readonly stance: string;
    /** Hold: the program is kept by leaving it in place. Adopt: kept by putting it in place. */
    readonly kind: "hold" | "adopt";
};
/** Every open pledge whose deliverable is a program in this domain. */
export declare function pledgesOnDomain(campaign: Campaign, domain: PolicyDomain): readonly PledgeAtStake[];
export type PortfolioDomain = {
    readonly domain: PolicyDomain;
    readonly name: string;
    readonly question: string;
    readonly icon: string;
    readonly stance: {
        readonly id: string;
        readonly name: string;
        readonly summary: string;
        readonly inherited: boolean;
    };
    /** The other positions on the table. */
    readonly alternatives: number;
    readonly chair?: string;
    readonly minister?: string;
    /** The person running the department, for the portrait: the confirmed Secretary or the acting one. */
    readonly ministerId?: string;
    /** How well the chair carries it, 0..1. */
    readonly quality: number;
    readonly authority: string;
    /** Weeks before the standing program starts to bite. Zero once it does. */
    readonly standUpWeeks: number;
    /** Whether some position here can only be reached through a bill. */
    readonly byStatute: boolean;
    readonly pledges: readonly PledgeAtStake[];
    /** What the map's lens for this domain is a share of. */
    readonly shareWords: string;
};
/** The six domains of the standing program, in the engine's order. */
export declare function policyPortfolio(campaign: Campaign): readonly PortfolioDomain[];
