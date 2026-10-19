import { describe, expect, it } from "vitest";
// The engine's modules sit on import cycles (the ladder, the people and the
// diplomacy modules read each other). Any of them must be loadable first
// without one reading another's half-built exports at load time; each import
// below runs in a fresh module graph.
const ENTRY_POINTS = [
    "./index.js",
    "./action-timing.js",
    "./counsel.js",
    "./resolution.js",
    "./cabinet-week.js",
    "./cabinet-initiative.js",
    "./execution.js",
    "./engagement.js",
    "./orders.js",
    "./order-contribution.js",
    "./national-books.js",
    "./offshore-leasing.js",
    "./lower-bench.js",
    "./court-calendar.js",
    "./solicitor-general.js",
    "./lobbying.js",
    "./loyalty.js",
    "./treaty-counterpart.js",
    "./temperament.js",
    "./foreign-leader.js",
];
describe("loading an engine module first", () => {
    for (const entry of ENTRY_POINTS) {
        it(`loads ${entry} on its own`, async () => {
            const { vi } = await import("vitest");
            vi.resetModules();
            await expect(import(/* @vite-ignore */ entry)).resolves.toBeDefined();
        });
    }
});
