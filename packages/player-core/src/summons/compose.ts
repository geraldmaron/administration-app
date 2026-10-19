import { selectLedger, type ActionRecord, type Campaign, type ChamberVote } from "@admin/engine";
import type { PlaceKey } from "../navigation/places";
import { placeCounsel } from "./counsel";
import type { SummonsHistoryLine } from "./types";

/**
 * The owning place's current counsel, as the line a summons brief carries.
 * Where the place has nothing to report, the line says that rather than
 * filling the space.
 */
export function counselFor(campaign: Campaign, key: PlaceKey): string {
  return placeCounsel(campaign, key).lines.join(" ");
}

export function ledgerAt(campaign: Campaign, turn: number): readonly ActionRecord[] {
  return selectLedger(campaign).filter((record) => record.turn === turn);
}

export function ledgerLine(
  campaign: Campaign,
  turn: number,
  key: string,
  label: string,
): SummonsHistoryLine | undefined {
  const records = ledgerAt(campaign, turn);
  const first = records[0];
  if (first === undefined) return undefined;
  const more = records.length - 1;
  const detail = more > 0 ? `${first.description} (and ${more} more that week)` : first.description;
  return { key, label, detail };
}

export function voteLine(vote: ChamberVote): string {
  const chamber = vote.chamber === "house" ? "House" : "Senate";
  return `${chamber} ${vote.yeas}–${vote.nays}, ${vote.passed ? "passed" : "failed"}`;
}

export function historyOf(
  ...lines: readonly (SummonsHistoryLine | undefined)[]
): readonly SummonsHistoryLine[] {
  return lines.filter((line): line is SummonsHistoryLine => line !== undefined);
}
