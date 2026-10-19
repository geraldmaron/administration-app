import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INTEL_AUTHORITY } from "@admin/engine";

const dir = new URL("./__fixtures__/authority-sources/", import.meta.url);

describe("person-level intelligence authority", () => {
  it("cites only a source the fetched manifest holds, and quotes text that source contains", () => {
    const manifest = JSON.parse(readFileSync(new URL("manifest.json", dir), "utf8")) as { sources: { key: string }[] };
    for (const entry of Object.values(INTEL_AUTHORITY)) {
      expect(manifest.sources.some((source) => source.key === entry.source)).toBe(true);
      expect(readFileSync(new URL(`${entry.source}.txt`, dir), "utf8").replace(/\s+/g, " ")).toContain(entry.quote);
    }
  });
});
