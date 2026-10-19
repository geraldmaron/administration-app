import type { PersonId, RoleId } from "@admin/world";
import type { Campaign, GameDate } from "./state.js";

// The Record of staff forecasts: what an adviser said a choice would do to
// approval, filed when the President acted on it, kept beside what happened.
// Only the forecast is stored. What happened is read from the approval record
// when the due week has closed (DECISIONS 1.10), so a forecast's outcome is
// never a second account that could disagree with the first.

export type ForecastConfidence = "low" | "moderate" | "high";

export type ForecastRecord = {
  readonly id: string;
  readonly turn: number;
  readonly date: GameDate;
  /** The seat that made the forecast, and who sat in it. */
  readonly role: RoleId;
  readonly person?: PersonId;
  /** What was decided and which option was taken, in the screen's words. */
  readonly subject: string;
  readonly option: string;
  readonly horizonWeeks: number;
  readonly dueTurn: number;
  /** Approval forecast at the due week: the median of the runs and their range, 0 to 1. */
  readonly approval: { readonly median: number; readonly low: number; readonly high: number };
  readonly confidence: ForecastConfidence;
};

export type ForecastEffect = { readonly kind: "forecast"; readonly record: ForecastRecord };

/** A campaign's forecasts beyond this are dropped oldest first: a term of weekly decisions, without growing the save without bound. */
export const FORECAST_RECORD_LIMIT = 200;

export function applyForecast(state: Campaign, effect: ForecastEffect): Campaign {
  const kept = (state.forecasts ?? []).filter((record) => record.id !== effect.record.id);
  return { ...state, forecasts: [...kept, effect.record].slice(-FORECAST_RECORD_LIMIT) };
}

/** Approval at the close of `turn`, while the metric record still holds it; the live figure for the week now running. */
export function approvalAtTurn(campaign: Campaign, turn: number): number | undefined {
  if (turn === campaign.turn) return campaign.player.metrics.approval;
  const history = campaign.player.metricHistory;
  const index = history.length - (campaign.turn - turn);
  return index >= 0 && index < history.length ? history[index]!.approval : undefined;
}

export type ForecastOutcome =
  | { readonly state: "pending" }
  /** The due week closed; `within` says whether approval landed inside the forecast's range. */
  | { readonly state: "settled"; readonly approval: number; readonly within: boolean; readonly error: number }
  /** The due week is older than the metric record keeps. */
  | { readonly state: "unrecorded" };

export function forecastOutcome(campaign: Campaign, record: ForecastRecord): ForecastOutcome {
  if (campaign.turn <= record.dueTurn) return { state: "pending" };
  const approval = approvalAtTurn(campaign, record.dueTurn);
  if (approval === undefined) return { state: "unrecorded" };
  return { state: "settled", approval, within: approval >= record.approval.low && approval <= record.approval.high, error: approval - record.approval.median };
}

export type AdviserForecasts = {
  readonly role: RoleId;
  readonly person?: PersonId;
  readonly records: readonly { readonly record: ForecastRecord; readonly outcome: ForecastOutcome }[];
};

/** Every adviser's forecasts with what happened, one entry per seat and person, newest forecast last. */
export function selectForecastRecord(campaign: Campaign): readonly AdviserForecasts[] {
  const byAdviser = new Map<string, AdviserForecasts>();
  for (const record of campaign.forecasts ?? []) {
    const key = `${record.role}:${record.person ?? ""}`;
    const entry = byAdviser.get(key) ?? { role: record.role, ...(record.person ? { person: record.person } : {}), records: [] };
    byAdviser.set(key, { ...entry, records: [...entry.records, { record, outcome: forecastOutcome(campaign, record) }] });
  }
  return [...byAdviser.values()];
}
