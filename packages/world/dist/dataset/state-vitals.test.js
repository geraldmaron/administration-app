import { describe, expect, it } from "vitest";
import { STATE_VITAL_ANCHORS } from "./state-vitals.js";
describe("the state vital anchors", () => {
    // Negative zero is the one value in this table that survives every other
    // check and still breaks the game. It is === 0, so a bounds assertion passes
    // it; it prints as "0", so a reading of the file hides it; and the weighted
    // mean it contributes to is unchanged. But JSON.stringify writes it as "0",
    // so a campaign carrying it does not come back as itself from a save, and
    // the failure surfaces four packages away as a round-trip mismatch on a
    // field nobody was editing. Centering a column on zero produces it whenever
    // a row lands exactly on the mean, which is why it has to be pinned here
    // rather than trusted not to reappear on the next vintage refresh.
    it("holds no negative zero", () => {
        const offenders = [];
        for (const [id, anchor] of Object.entries(STATE_VITAL_ANCHORS)) {
            for (const [field, value] of Object.entries(anchor)) {
                if (Object.is(value, -0))
                    offenders.push(`${id}.${field}`);
            }
        }
        expect(offenders).toEqual([]);
    });
    it("covers every state exactly once", () => {
        const ids = Object.keys(STATE_VITAL_ANCHORS);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.length).toBe(51);
    });
});
