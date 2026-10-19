import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { allReadings, dueSummonses } from "./registry";
import { runningClocks } from "./running-index";
const base = openingCampaign();
describe("runningClocks", () => {
    it("carries every clock the registry knows about, each a door to its own summons", () => {
        const readings = allReadings(base);
        const rows = runningClocks(base);
        expect(rows).toHaveLength(readings.length);
        for (const row of rows) {
            expect(row.href).toBe(`/brief/clock/${row.id}`);
        }
    });
    it("takes its title from the clock's own composed brief, not a second copy of it", () => {
        for (const reading of allReadings(base)) {
            const row = runningClocks(base).find((r) => r.id === reading.spec.id);
            expect(row?.title).toBe(reading.brief.title);
        }
    });
    it("carries a due date only for a clock that currently has a live subject", () => {
        const running = new Set(dueSummonses(base).map((s) => s.spec.id));
        for (const row of runningClocks(base)) {
            if (running.has(row.id)) {
                expect(row.due).toBeDefined();
            }
            else {
                expect(row.due).toBeUndefined();
            }
        }
    });
});
