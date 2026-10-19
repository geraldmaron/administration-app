import { INSTRUMENT_IDS, RISK_IDS, rungBand } from "@admin/engine";
import { resolutionSequenceKey, sequenceKeysOf } from "./resolution-beat.js";
/**
 * Whether an authored step sequence can ever be played.
 *
 * The repeated way authored content dies in this codebase is a document that
 * clears every static rule and describes a situation no campaign produces. A
 * step sequence is keyed rather than conditioned, so the question has an exact
 * answer for once: enumerate the keys resolution can actually emit, and refuse
 * any document that answers to none of them.
 */
const RUNG_LEVELS = [1, 2, 3, 4, 5];
function bandsOf() {
    // Derived from the engine's own rung-to-band mapping rather than restated, so
    // a change to where the band edges sit moves this space with it.
    return [...new Set(RUNG_LEVELS.map(rungBand))];
}
/**
 * Every key a resolution can hand the selector.
 *
 * A failure always carries a named branch — the resolver partitions the whole
 * failure mass across them — so there is no branchless failure situation, and a
 * success or partial never carries one.
 */
export const SITUATION_KEYS = INSTRUMENT_IDS.flatMap((instrument) => bandsOf().flatMap((band) => [
    { instrument, rungBand: band, valence: "success" },
    { instrument, rungBand: band, valence: "partial" },
    ...RISK_IDS[instrument].map((riskId) => ({ instrument, rungBand: band, valence: "failure", riskId })),
]));
/** Whether one authored document answers to one situation. */
export function coversKey(def, key) {
    if (def.instrument !== key.instrument || def.valence !== key.valence)
        return false;
    if (!def.rungBands.includes(key.rungBand))
        return false;
    // No affinity is the floor for the cell: it fits any branch of its valence.
    if (!def.riskAffinity)
        return true;
    return key.riskId !== undefined && def.riskAffinity.includes(key.riskId);
}
/** Documents no instrument, rung and branch combination can ever reach. */
export function unreachableSequences(defs) {
    return defs
        .filter((def) => !SITUATION_KEYS.some((key) => coversKey(def, key)))
        .map((def) => ({ id: def.id, claimed: sequenceKeysOf(def).map(resolutionSequenceKey) }));
}
/** The other direction: situations a player can reach that no document answers. */
export function uncoveredSituationKeys(defs) {
    return SITUATION_KEYS.filter((key) => !defs.some((def) => coversKey(def, key))).map(resolutionSequenceKey);
}
