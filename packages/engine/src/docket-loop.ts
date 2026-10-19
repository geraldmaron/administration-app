// One office day's held documents: lapse what closes today, then admit what
// the sources stage for today. With no sources passed, the day is unchanged.
import { isSameDate } from "./clock.js";
import { apply, type DocketEffect, type EffectPacket } from "./effects.js";
import type { Campaign, GameDate } from "./state.js";
import type { DocketEntry } from "./state-week.js";

export type StagingSource<C> = (campaign: C, date: GameDate) => readonly DocketEntry[];

export type LapseSource<C> = (campaign: C, closing: readonly DocketEntry[], date: GameDate) => readonly EffectPacket[];

export type DocketSources = {
  readonly stagingSources?: readonly StagingSource<Campaign>[];
  readonly lapseSources?: readonly LapseSource<Campaign>[];
};

function book(state: Campaign, effect: DocketEffect): EffectPacket {
  return {
    source: "simulate",
    actor: "world",
    turn: state.turn,
    background: true,
    narration: { summary: "The desk updated the documents it is holding." },
    effects: [effect],
  };
}

function closingToday(state: Campaign): readonly DocketEntry[] {
  const held = state.docket ?? [];
  return held.filter((entry) => isSameDate(entry.closes, state.calendar));
}

function foldLapses(state: Campaign, sources: readonly LapseSource<Campaign>[]): Campaign {
  const closing = closingToday(state);
  if (closing.length === 0) return state;
  const packets = sources.flatMap((source) => source(state, closing, state.calendar));
  const charged = packets.reduce((acc, packet) => apply(acc, packet), state);
  return apply(charged, book(charged, { kind: "docket", remove: closing.map((entry) => entry.id) }));
}

function foldAdmissions(state: Campaign, sources: readonly StagingSource<Campaign>[]): Campaign {
  const admit = sources.flatMap((source) => source(state, state.calendar));
  if (admit.length === 0) return state;
  return apply(state, book(state, { kind: "docket", admit }));
}

/**
 * Runs the held-docket sources for the day the campaign is already on.
 *
 * An absent docket becomes an empty list once sources are passed, even when
 * nothing is admitted, so the next day is not treated as another first day.
 */
export function settleHeldDocket(state: Campaign, options: DocketSources): Campaign {
  if (options.stagingSources === undefined && options.lapseSources === undefined) return state;
  const lapsed = foldLapses(state, options.lapseSources ?? []);
  const admitted = foldAdmissions(lapsed, options.stagingSources ?? []);
  if (admitted.docket !== undefined) return admitted;
  return { ...admitted, docket: [] };
}
