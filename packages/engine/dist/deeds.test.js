import { describe, expect, it } from "vitest";
import { BOUND_DEED_PREFIXES, DEED_FAMILIES, DEED_FLAGS, DEED_OUTCOMES, RECEIVED_DEED_FAMILIES, UNBOUND_DEED_PREFIXES, deedFlag, deedFromFlag, deedReceivedFlag, deedTowardFlag, } from "./deeds.js";
import { INSTRUMENT_IDS } from "./instruments.js";
const RUNG_BANDS = ["low", "mid", "high"];
describe("deed grammar", () => {
    it("carries the instrument ladder verbatim, plus the four non-instrument families", () => {
        expect(DEED_FAMILIES.slice(0, INSTRUMENT_IDS.length)).toEqual(INSTRUMENT_IDS);
        expect(DEED_FAMILIES).toEqual([...INSTRUMENT_IDS, "pledge", "withdrawal", "order", "neglect-answered"]);
        expect(DEED_FAMILIES).toHaveLength(9);
    });
    // A pledge, a wind-down, an order and an answered obligation are this
    // government's own machinery. No other capital can take one of them against
    // it, so the received half of the vocabulary is the ladder and nothing else.
    it("narrows the received families to the ladder, so no unreachable flag is printed", () => {
        expect(RECEIVED_DEED_FAMILIES).toEqual(INSTRUMENT_IDS);
        for (const family of ["pledge", "withdrawal", "order", "neglect-answered"]) {
            expect(RECEIVED_DEED_FAMILIES).not.toContain(family);
        }
    });
    it("has exactly two outcomes and no partial", () => {
        expect(DEED_OUTCOMES).toEqual(["landed", "failed"]);
        expect(DEED_OUTCOMES).not.toContain("partial");
    });
    it("builds the unbound flags with direction in the prefix and no country in either", () => {
        expect(deedFlag("military", "high", "landed")).toBe("deed:military:high:landed");
        expect(deedFlag("pledge", "mid", "failed")).toBe("deed:pledge:mid:failed");
        expect(deedReceivedFlag("covert", "mid", "landed")).toBe("deed-received:covert:mid:landed");
    });
    // The defect this grammar guards against: one string covering both "we ran
    // this operation" and "this was run on us", which are opposite facts for
    // content to answer.
    it("says an act taken and an act suffered differently, at identical family, band and outcome", () => {
        expect(deedReceivedFlag("covert", "mid", "landed")).not.toBe(deedFlag("covert", "mid", "landed"));
        expect(deedFromFlag("PAK", "covert", "mid", "landed")).not.toBe(deedTowardFlag("PAK", "covert", "mid", "landed"));
    });
    it("builds the bound flags as <prefix>:<nation>:<family>:<band>:<outcome>", () => {
        expect(deedTowardFlag("PAK", "military", "high", "landed")).toBe("deed-toward:PAK:military:high:landed");
        expect(deedFromFlag("PAK", "military", "high", "landed")).toBe("deed-from:PAK:military:high:landed");
    });
    // What an obligation to answer a capital needs: the counterparty off the
    // string alone, with no ledger read to recover it.
    it("puts the counterparty in the nation slot of both bound forms, readable without any other state", () => {
        const nation = (id) => id;
        const theyStruckUs = deedFromFlag(nation("PAK"), "military", "high", "landed");
        const weRepliedToThem = deedTowardFlag(nation("PAK"), "diplomatic", "mid", "landed");
        const weRepliedToSomeoneElse = deedTowardFlag(nation("IND"), "diplomatic", "mid", "landed");
        const counterparty = (flag) => flag.split(":")[1];
        expect(counterparty(theyStruckUs)).toBe("PAK");
        expect(counterparty(weRepliedToThem)).toBe("PAK");
        expect(counterparty(weRepliedToSomeoneElse)).toBe("IND");
        // So an obligation opened by the first is discharged by the second and not
        // by the third, decided on the two strings alone.
        const owed = counterparty(theyStruckUs);
        expect(weRepliedToThem.startsWith(`deed-toward:${owed}:`)).toBe(true);
        expect(weRepliedToSomeoneElse.startsWith(`deed-toward:${owed}:`)).toBe(false);
    });
    it("enumerates 9 x 3 x 2 taken plus 5 x 3 x 2 suffered = 84 unbound flags, via the builders, no duplicates", () => {
        expect(DEED_FLAGS).toHaveLength(84);
        expect(new Set(DEED_FLAGS).size).toBe(84);
        const expected = new Set();
        for (const family of DEED_FAMILIES) {
            for (const band of RUNG_BANDS) {
                for (const outcome of DEED_OUTCOMES) {
                    expected.add(deedFlag(family, band, outcome));
                }
            }
        }
        for (const family of RECEIVED_DEED_FAMILIES) {
            for (const band of RUNG_BANDS) {
                for (const outcome of DEED_OUTCOMES) {
                    expected.add(deedReceivedFlag(family, band, outcome));
                }
            }
        }
        expect(new Set(DEED_FLAGS)).toEqual(expected);
        expect(DEED_FLAGS.filter((flag) => flag.startsWith("deed:"))).toHaveLength(54);
        expect(DEED_FLAGS.filter((flag) => flag.startsWith("deed-received:"))).toHaveLength(30);
    });
    it("is checkable by membership in both directions, the shape a reachability gate needs", () => {
        // Direction one: every exported flag splits into segments the closed
        // vocabularies recognize. This is what a validator runs against a flag
        // string lifted out of authored content.
        for (const flag of DEED_FLAGS) {
            const segments = flag.split(":");
            expect(segments).toHaveLength(4);
            const [prefix, family, band, outcome] = segments;
            expect(UNBOUND_DEED_PREFIXES).toContain(prefix);
            const families = prefix === "deed" ? DEED_FAMILIES : RECEIVED_DEED_FAMILIES;
            expect(families).toContain(family);
            expect(RUNG_BANDS).toContain(band);
            expect(DEED_OUTCOMES).toContain(outcome);
        }
        // The bound forms take the same walk one segment later, with the nation in
        // the slot the prefix promises.
        for (const prefix of BOUND_DEED_PREFIXES) {
            const flag = prefix === "deed-toward"
                ? deedTowardFlag("PAK", "pledge", "low", "failed")
                : deedFromFlag("PAK", "economic", "low", "failed");
            const [head, nation, family, band, outcome] = flag.split(":");
            expect(flag.split(":")).toHaveLength(5);
            expect(head).toBe(prefix);
            expect(nation).toBe("PAK");
            expect(DEED_FAMILIES).toContain(family);
            expect(RUNG_BANDS).toContain(band);
            expect(DEED_OUTCOMES).toContain(outcome);
        }
        // Direction two: a flag built from an invented segment is rejected by the
        // same membership check, so a typo like "deed:military:hgih:landed"
        // (the classic silent dead gate) is catchable — and
        // so is a plausible-looking direction nobody defined.
        const typo = "deed:military:hgih:landed";
        const [, , band] = typo.split(":");
        expect(RUNG_BANDS).not.toContain(band);
        expect(UNBOUND_DEED_PREFIXES).not.toContain("deed-against".split(":")[0]);
    });
    it("keeps the four prefixes disjoint, so no flag can be read as two directions", () => {
        const prefixes = [...UNBOUND_DEED_PREFIXES, ...BOUND_DEED_PREFIXES];
        expect(new Set(prefixes).size).toBe(4);
        for (const flag of DEED_FLAGS) {
            const matches = prefixes.filter((prefix) => flag.split(":")[0] === prefix);
            expect(matches).toHaveLength(1);
        }
    });
    it("never encodes a duration: the flag carries no turn or fiction-time segment", () => {
        for (const flag of DEED_FLAGS) {
            expect(flag.split(":")).toHaveLength(4);
            expect(flag).not.toMatch(/\d/);
        }
        for (const bound of [
            deedTowardFlag("PAK", "military", "high", "landed"),
            deedFromFlag("PAK", "military", "high", "landed"),
        ]) {
            expect(bound.split(":")).toHaveLength(5);
            expect(bound).not.toMatch(/\d/);
        }
    });
});
