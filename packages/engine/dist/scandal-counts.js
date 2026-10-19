import { selectScandals } from "./press-scandal.js";
// Kept out of the barrel: a measurement the balance harness takes, not a
// reading any screen draws.
/**
 * Stories broken since a turn, counted by what opened them and, for the
 * President's own acts, by the charge: the measurement that says whether a
 * presidency can be in trouble without choosing to be.
 */
export function selectScandalOriginCounts(campaign, sinceTurn) {
    return selectScandals(campaign)
        .filter((scandal) => scandal.brokeTurn >= sinceTurn)
        .reduce((counts, scandal) => {
        const key = scandal.origin.kind === "own-act" ? `own-act:${scandal.charge}` : scandal.origin.kind;
        return { ...counts, [key]: (counts[key] ?? 0) + 1 };
    }, {});
}
