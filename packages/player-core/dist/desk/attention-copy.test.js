import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
const here = path.dirname(fileURLToPath(import.meta.url));
// The removal row's reason string used to type "52%" and "60%" instead of
// reading `BEAT_THRESHOLDS` through `formatRatio`, so a retune of the rungs in
// a later wave would drift past this row silently.
describe("the Desk's removal row reads the engine's own rungs", () => {
    it("carries no typed 52% or 60% in attention.ts", () => {
        const source = readFileSync(path.join(here, "attention.ts"), "utf8");
        expect(source.includes("52%")).toBe(false);
        expect(source.includes("60%")).toBe(false);
    });
});
