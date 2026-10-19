import { selectLedger } from "@admin/engine";
import { placeCounsel } from "./counsel";
/**
 * The owning place's current counsel, as the line a summons brief carries.
 * Where the place has nothing to report, the line says that rather than
 * filling the space.
 */
export function counselFor(campaign, key) {
    return placeCounsel(campaign, key).lines.join(" ");
}
export function ledgerAt(campaign, turn) {
    return selectLedger(campaign).filter((record) => record.turn === turn);
}
export function ledgerLine(campaign, turn, key, label) {
    const records = ledgerAt(campaign, turn);
    const first = records[0];
    if (first === undefined)
        return undefined;
    const more = records.length - 1;
    const detail = more > 0 ? `${first.description} (and ${more} more that week)` : first.description;
    return { key, label, detail };
}
export function voteLine(vote) {
    const chamber = vote.chamber === "house" ? "House" : "Senate";
    return `${chamber} ${vote.yeas}–${vote.nays}, ${vote.passed ? "passed" : "failed"}`;
}
export function historyOf(...lines) {
    return lines.filter((line) => line !== undefined);
}
