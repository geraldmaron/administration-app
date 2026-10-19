import type { RngStream } from "./rng.js";
import type { GameDate } from "./state.js";
import { ImpactSpec, type ImpactEvent, type ImpactReport, type ImpactResponse } from "./impact-event.js";
export declare function openImpactEvent(input: ImpactSpec, date: GameDate): ImpactEvent;
/** One day only. The caller owns elapsed-calendar stepping and replay protection. */
export declare function stepImpactEvent(event: ImpactEvent, date: GameDate, response: ImpactResponse, rng: RngStream): ImpactEvent;
export declare function impactReport(event: ImpactEvent, date: GameDate): ImpactReport;
