import { type StateId } from "@admin/world";
import type { Campaign, StateApprovalSample } from "./state.js";
/**
 * How a point of two-way share becomes a step in log-odds.
 *
 * The slope of the logit at one half. At a headline of 50% a state the map puts
 * three points above the country reads three points above it; toward either end
 * the logistic compresses the spread, so a state can never be read past 0% or
 * 100% and the mean still holds there.
 */
export declare const STATE_APPROVAL_LOGIT_SLOPE = 4;
/**
 * Approval lost per point of unemployment, before the weight the week gives
 * prosperity: the rate the prosperity judgment charges the country
 * (`opinion-causes.ts`'s unemployment term), so a state carries the same
 * price for a lost job the nation does.
 */
export declare const STATE_UNEMPLOYMENT_STRAIN = 2;
/**
 * The figure the states average to: the headline. The honeymoon is part of the
 * record every bloc reads now, the ballot's blocs included, so a state reading
 * carries it the way the country's does.
 */
export declare function stateApprovalTarget(campaign: Campaign): number;
/**
 * Every state's approval this week, 0..1, keyed in `STATE_IDS` order.
 *
 * Solved before it is clamped, never the other way round: a constant shift
 * clipped at zero would leave the opposed states pinned at the floor and the
 * mean above the headline in exactly the weeks removal pressure is reading it.
 */
export declare function stateApprovals(campaign: Campaign): Readonly<Partial<Record<StateId, number>>>;
/** One state's approval this week; undefined where the campaign carries no such state. */
export declare function stateApproval(campaign: Campaign, id: StateId): number | undefined;
/** This week's map of approval, rounded for the save, as the weekly history keeps it. */
export declare function stateApprovalSample(campaign: Campaign, turn: number): StateApprovalSample;
