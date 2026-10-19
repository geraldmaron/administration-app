import { type EffectPacket } from "./effects.js";
import type { Campaign, GameDate } from "./state.js";
import type { DocketEntry } from "./state-week.js";
export type StagingSource<C> = (campaign: C, date: GameDate) => readonly DocketEntry[];
export type LapseSource<C> = (campaign: C, closing: readonly DocketEntry[], date: GameDate) => readonly EffectPacket[];
export type DocketSources = {
    readonly stagingSources?: readonly StagingSource<Campaign>[];
    readonly lapseSources?: readonly LapseSource<Campaign>[];
};
/**
 * Runs the held-docket sources for the day the campaign is already on.
 *
 * An absent docket becomes an empty list once sources are passed, even when
 * nothing is admitted, so the next day is not treated as another first day.
 */
export declare function settleHeldDocket(state: Campaign, options: DocketSources): Campaign;
