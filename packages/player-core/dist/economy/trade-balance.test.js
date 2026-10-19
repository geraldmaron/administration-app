import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { tradeBalance } from "./trade-balance";
const base = openingCampaign();
describe("the trade balance", () => {
    it("builds on the committed volumes: exports less imports, both non-negative", () => {
        const reading = tradeBalance(base);
        expect(reading.imports).toBeGreaterThanOrEqual(0);
        expect(reading.exports).toBeGreaterThanOrEqual(0);
        expect(reading.balance).toBeCloseTo(reading.exports - reading.imports, 6);
    });
});
