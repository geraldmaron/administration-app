import { type PlankId } from "@admin/world";
import type { Campaign, NationRuntime } from "./state.js";
/**
 * How many more weeks of government one stopgap buys.
 *
 * Six, because that is the length a real continuing resolution is written at
 * when the point of it is to get past a deadline rather than to fund a year:
 * long enough that passing one is a genuine reprieve, short enough that it
 * comes back around inside a term and the same fight has to be had again.
 */
export declare const CONTINUING_RESOLUTION_TURNS = 6;
/**
 * Whether the government is about to run out of money, or already has.
 *
 * Read off the date alone. A book enacted for the coming year moves
 * `throughTurn` past the window, so a book this close to its end has nothing
 * behind it, whether it is a full year's appropriation or a stopgap. Congress
 * offers the continuing resolution before September 30, not after the
 * government has closed.
 */
declare function fundingRunningOut(campaign: Campaign): boolean;
/**
 * The country the President governs, for the acts that arise out of its
 * condition.
 *
 * Exported because it moved here with the two revenue bills that read it and
 * the catalogue's own immigration bill reads the same country: one accessor for
 * every predicate that asks what shape the United States is in, rather than two
 * spellings of the same lookup.
 */
export declare function playerStats(campaign: Campaign): NationRuntime["stats"] | undefined;
export declare function fiscalAppetite(campaign: Campaign): number;
/**
 * The fiscal measures, by name rather than in a list, so the catalogue can
 * splice each one back into the place it has always occupied.
 */
export declare const FISCAL_ACTS: {
    fiscalResponsibility: {
        id: string;
        title: string;
        summary: string;
        sponsor: "opposition";
        appeal: number;
        track: "ordinary";
        cost: {
            stability: number;
        };
        nationEffects: {};
        alignment: {
            economicLeftRight: number;
        };
        recurs: number;
        arises: (campaign: Campaign) => boolean;
    };
    continuingResolution: {
        id: string;
        title: string;
        summary: string;
        sponsor: "bipartisan";
        appeal: number;
        track: "ordinary";
        cost: {};
        funds: {
            turns: number;
        };
        nationEffects: {};
        alignment: {};
        urgent: true;
        recurs: number;
        arises: typeof fundingRunningOut;
    };
    fullYearContinuingResolution: {
        id: string;
        title: string;
        summary: string;
        sponsor: "bipartisan";
        appeal: number;
        track: "ordinary";
        cost: {
            stability: number;
        };
        funds: {
            throughFiscalYear: true;
        };
        nationEffects: {};
        alignment: {};
        recurs: number;
        arises: (campaign: Campaign) => boolean;
    };
    debtLimitIncrease: {
        id: string;
        committee: string;
        title: string;
        summary: string;
        sponsor: "administration";
        appeal: number;
        track: "reconciliation";
        cost: {
            standing: number;
        };
        borrowingCeilingOfGdp: number;
        nationEffects: {};
        alignment: {};
        recurs: number;
        arises: (campaign: Campaign) => boolean;
        urgent: true;
    };
    debtLimitDeal: {
        id: string;
        title: string;
        summary: string;
        sponsor: "bipartisan";
        appeal: number;
        track: "ordinary";
        cost: {
            standing: number;
        };
        borrowingCeilingOfGdp: number;
        nationEffects: {};
        alignment: {
            economicLeftRight: number;
        };
        recurs: number;
        arises: (campaign: Campaign) => boolean;
        urgent: true;
    };
    taxReliefAndGrowth: {
        id: string;
        committee: string;
        title: string;
        summary: string;
        sponsor: "administration";
        appeal: number;
        track: "reconciliation";
        cost: {};
        nationEffects: {};
        alignment: {
            economicLeftRight: number;
        };
        domestic: {
            values: {
                economicLeftRight: number;
            };
            magnitude: "moderate";
            signature: string;
            reason: string;
        };
        recurs: number;
        arises: (campaign: Campaign) => boolean;
    };
    taxFairnessAndRevenue: {
        id: string;
        committee: string;
        title: string;
        summary: string;
        sponsor: "administration";
        appeal: number;
        track: "reconciliation";
        plank: PlankId;
        cost: {};
        nationEffects: {
            "politics.protestPressure": number;
        };
        alignment: {
            economicLeftRight: number;
        };
        domestic: {
            values: {
                economicLeftRight: number;
            };
            magnitude: "moderate";
            signature: string;
            reason: string;
        };
        recurs: number;
        arises: (campaign: Campaign) => boolean;
    };
};
/** Every act in this family, by id, for the readings that are about the money. */
export declare const FISCAL_ACT_IDS: ReadonlySet<string>;
export {};
