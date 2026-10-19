import type { Nation, Person, RoleId } from "@admin/world";
import { type OpeningElectorate } from "./opinion.js";
import type { MetricSet } from "./state.js";
export type OpeningMetric = Exclude<keyof MetricSet, "approval">;
export type OpeningContribution = {
    readonly metric: OpeningMetric;
    readonly delta: number;
    /** The seat responsible, or the lead role where it is the player themselves. */
    readonly role: RoleId;
    readonly person: string;
    readonly reason: string;
};
/**
 * Why one performance reading opens where it does, stated in the same terms the
 * normalization is done in: what the office is expected to command, what the
 * country actually holds, and the daylight between the two.
 */
export type OpeningExpectation = {
    readonly metric: Exclude<OpeningMetric, "treasury">;
    /** The nation's own absolute capability, on its own 0..1 scale. */
    readonly held: number;
    /** What a government at this nation's tier is expected to command. */
    readonly expected: number;
    /** The reading the player actually opens on. */
    readonly opening: number;
    readonly reason: string;
};
export type OpeningPosition = {
    /** The nation ungoverned: what the country brings before anyone is seated. */
    readonly baseline: MetricSet;
    /**
     * How each performance reading was normalized against peer expectation. The
     * baseline is not the nation's raw stats, so this is the account of the
     * daylight between the two — without it a player could read why their cabinet
     * moved them and not why they started where they did.
     */
    readonly expectations: readonly OpeningExpectation[];
    readonly contributions: readonly OpeningContribution[];
    /** Baseline plus every contribution, clamped, with approval settled last. */
    readonly metrics: MetricSet;
};
/**
 * How each performance reading is derived from the nation, with its reason.
 *
 * Each metric is normalized against the tier that actually sets the expectation
 * for it: what is asked of a country's diplomacy follows its weight in the
 * world, what is asked of its forces follows its military tier, and what is
 * asked of its domestic order follows its wealth — a rich country whose writ is
 * contested is a worse government than a poor one with the same reading.
 */
export declare function openingExpectations(nation: Nation): readonly OpeningExpectation[];
export declare function foundingBaseline(nation: Nation, electorate?: OpeningElectorate): MetricSet;
/**
 * The metrics a campaign actually opens on, and the reason for every point of
 * daylight between them and the nation's own.
 *
 * `cabinet` is the seated slate keyed by chair, `leadRole` the one the player
 * themselves occupies. Pure and total: the same nation and the same people
 * always produce the same opening, which is what lets the founding screen show
 * it live while the player is still choosing.
 */
export declare function openingPosition(nation: Nation, cabinet: Readonly<Partial<Record<RoleId, Person>>>, leadRole: RoleId, leaderExtras?: (baselineTreasury: number) => readonly OpeningContribution[], electorate?: OpeningElectorate): OpeningPosition;
