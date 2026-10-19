import { describe, expect, it } from "vitest";
import { worldDataset } from "../dataset/index.js";
import { checkSettlements } from "./settlement-checks.js";
describe("settlement integrity", () => {
    const place = worldDataset.settlements[0];
    it("accepts the sourced locality table", () => {
        expect(checkSettlements(worldDataset)).toEqual([]);
    });
    it("rejects duplicate identities, dangling states and an oversized unflagged locality", () => {
        expect(checkSettlements({ ...worldDataset, settlements: [place, place] }).some((error) => error.message.includes("duplicate"))).toBe(true);
        expect(checkSettlements({ ...worldDataset, settlements: [{ ...place, state: "ZZ" }] }).some((error) => error.kind === "dangling-reference")).toBe(true);
        expect(checkSettlements({ ...worldDataset, settlements: [{ ...place, population: 100001, commercialPort: undefined, roadBorderCrossing: undefined }] }).some((error) => error.message.includes("size tier"))).toBe(true);
    });
});
