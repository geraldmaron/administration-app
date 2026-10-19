import { type Campaign, type TradeMeasure } from "@admin/engine";
import { type NationId, type Organization, type RoleId } from "@admin/world";
import type { ScenarioCondition, ScenarioDef } from "./scenario.js";
type SharedBodyFilter = {
    readonly orgKind?: string;
    readonly tradeCompetence?: string;
};
/**
 * The bodies both governments sit in that meet the gate's narrowing, in a
 * stable order (the widest membership first, then by id) so the one the prose
 * names is the same on every build of the same campaign.
 */
export declare function sharedBodies(campaign: Campaign, counterpart: NationId, filter?: SharedBodyFilter): readonly Organization[];
/**
 * The name `{{sharedOrganization}}` renders as: the first body that every
 * positive membership gate accepts. Binding to only the first gate named a body
 * a later, narrower gate rejected, and made the rendered organization depend on
 * the order of conditions that mean the same thing in any order.
 */
export declare function sharedOrganizationName(campaign: Campaign, def: ScenarioDef, counterpart: NationId): string | undefined;
export declare function bordersHome(campaign: Campaign, counterpart: NationId): boolean;
/** What `{{ourTariffSector}}` renders as when no pinned retaliation can be found. */
export declare const UNKNOWN_TARIFF_SECTOR = "the original goods";
/**
 * The sector of the tariff this administration imposed that the family's
 * retaliation answers, in lower case.
 *
 * A week that arrives after the original tariff has left the desk cannot name
 * it from its own gates, and "the tariff that started this" asks the President
 * to remember which one. The family opener pinned the retaliation it dealt on
 * (the case's occurrence carries the retaliation measure), and the record of
 * that retaliation points at the measure it answers, so the answer is read off
 * the ledger by following the opener, never by guessing the newest one: a
 * neighbor that answers a second tariff mid-arc does not change which tariff
 * this arc is about. A scenario with no family, or a family whose opener
 * pinned no retaliation, falls back to the counterpart's newest landed one.
 */
export declare function answeredTariff(campaign: Campaign, family: {
    readonly id: string;
} | undefined, counterpart: NationId): TradeMeasure | undefined;
/** Whether that tariff is still in force: a draft to pause one the President has since lifted describes nothing. */
export declare function answeredTariffInForce(campaign: Campaign, family: {
    readonly id: string;
} | undefined, counterpart: NationId): boolean;
/**
 * The tariff this administration laid back on the counterpart's goods at the
 * retaliation gate's response sector, while it is in force. Newest first, so
 * a tariff re-laid after a lift is the one a week is about.
 */
export declare function responseTariff(campaign: Campaign, def: {
    readonly conditions: readonly ScenarioCondition[];
}, counterpart: NationId): TradeMeasure | undefined;
/**
 * What a reply that lifts one of our tariffs hands the engine: ours, and for a
 * mutual lift the retaliation the cast pinned, each pinned by the fields the
 * engine re-reads at commit.
 *
 * When a measure is already gone its pin is left empty rather than dropped,
 * so the engine refuses the reply with its own words instead of the answer
 * silently becoming a free choice. The `tariffInForce` gate keeps that rare.
 */
export declare function tariffLiftRequest(campaign: Campaign, def: Pick<ScenarioDef, "conditions" | "family">, counterpart: NationId, lift: {
    readonly theirs: boolean;
    readonly which?: "answered" | "response";
}, pinned: {
    readonly id: string;
} | undefined): {
    theirs?: {
        measure: string;
        sector: string;
        rate: number;
        imposedTurn: number;
    } | undefined;
    ours: {
        measure: string;
        sector: string;
        rate: number;
        imposedTurn: number;
    };
};
export declare function ourTariffSector(campaign: Campaign, family: {
    readonly id: string;
} | undefined, counterpart: NationId): string;
/**
 * The seat that answers for a memo when the scenario names its office, in the
 * cabinet the President actually seated. Undefined when it names none or the
 * campaign has no chair that fits, so readers fall back to speaker order.
 */
export declare function responsibleRole(campaign: Campaign, def: Pick<ScenarioDef, "responsibleOffice">): RoleId | undefined;
/** Whether a country has a coast, read off the player's own country or the cast counterpart. */
export declare function geographyMet(campaign: Campaign, counterpart: NationId, condition: {
    readonly field: "coastal" | "landlocked" | "bordered" | "chokepoint";
    readonly is: boolean;
    readonly of?: "player" | "counterpart";
}): boolean;
type GeographyGate = Extract<ScenarioCondition, {
    kind: "geography";
}>;
/** The gates that read the cast government's own geography, which the binder can apply while it ranks. */
export declare function counterpartGeography(conditions: readonly ScenarioCondition[]): readonly GeographyGate[];
/**
 * The best-ranked candidate that has the geography the week needs.
 *
 * A week that needs the counterpart's coast, land neighbor or chokepoint binds
 * the closest (or tensest, or band-matched) government that has one, rather
 * than the first-ranked government and then finding the gate shut: a gate read
 * after the pick would only ever deal the week when the top of the ranking
 * happened to qualify.
 */
export declare function firstWithGeography(campaign: Campaign, ranked: readonly NationId[], conditions: readonly ScenarioCondition[]): NationId | undefined;
export {};
