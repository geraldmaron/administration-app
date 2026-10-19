import { describe, expect, it } from "vitest";
// @ts-expect-error — the patcher is plain ESM beside the dev server, not built TypeScript.
import { immediateKeySpan, literalFor, readScalarAtPath, writeScalarAtPath } from "../nation-source.mjs";
// @ts-expect-error — same.
import { objectLiteralSpan } from "../source-patch.mjs";

// A miniature of the real file's hazards: a provenance comment carrying an
// apostrophe, a key name that also appears one level deeper, a key that is the
// tail of a longer identifier, and numbers written with `_` grouping.
const SOURCE = `
const x = NationInput.parse({
  id: USA_ID,
  // The nation's own calibration note {  with an unbalanced brace
  identity: { name: "United States", capital: "Washington, D.C." },
  geo: { region: REGION, coastline: true, lat: 38.9 },
  stats: {
    energy: { production: 22_000, mix: { nuclear: 0.08 } },
    military: {
      netProduction: 5,
      production: 1,
      branchStrength: { land: 0.7, naval: 0.85 },
    },
  },
  doctrine: { posture: "assertive" },
});
`;

const span = () => objectLiteralSpan(SOURCE, SOURCE.indexOf("NationInput.parse({") + "NationInput.parse(".length);

const write = (path: string, value: unknown) => {
  const [start, end] = span();
  return writeScalarAtPath(SOURCE, start, end, path, value) as { ok: boolean; source?: string; reason?: string };
};

describe("finding a key at its own level", () => {
  it("does not match a key nested deeper", () => {
    const [start, end] = span();
    const found = immediateKeySpan(SOURCE, start, end, "nuclear");
    expect(found).toBeUndefined();
  });

  it("does not match the tail of a longer identifier", () => {
    const [start, end] = span();
    const militaryStart = SOURCE.indexOf("{", SOURCE.indexOf("military:"));
    const [ms, me] = objectLiteralSpan(SOURCE, militaryStart);
    const found = immediateKeySpan(SOURCE, ms, me, "production");
    // `netProduction` sits above `production`; matching it would rewrite the
    // wrong field with no error to show for it.
    expect(SOURCE.slice(found!.valueStart, found!.valueEnd).trim()).toBe("1");
    expect(start).toBeLessThan(ms);
    expect(me).toBeLessThan(end);
  });

  it("is not derailed by an apostrophe in a provenance comment", () => {
    const [start, end] = span();
    expect(immediateKeySpan(SOURCE, start, end, "doctrine")).toBeDefined();
  });
});

describe("writing a scalar", () => {
  it("writes a string, quoted", () => {
    const result = write("identity.capital", "Claire");
    expect(result.ok).toBe(true);
    expect(result.source).toContain('capital: "Claire"');
  });

  it("writes into a path three levels deep, leaving its sibling alone", () => {
    const result = write("stats.military.branchStrength.naval", 0.5);
    expect(result.source).toContain("naval: 0.5");
    expect(result.source).toContain("land: 0.7");
  });

  it("writes a number over one the author grouped with underscores", () => {
    const result = write("stats.energy.production", 23000);
    expect(result.source).toContain("production: 23000");
    expect(result.source).not.toContain("22_000");
  });

  it("writes a boolean", () => {
    expect(write("geo.coastline", false).source).toContain("coastline: false");
  });

  it("changes nothing outside the value it targets", () => {
    const result = write("doctrine.posture", "defensive");
    expect(result.source!.length).toBe(SOURCE.length + "defensive".length - "assertive".length);
    expect(result.source).toContain("The nation's own calibration note");
  });
});

describe("what the patcher refuses rather than guesses at", () => {
  it("refuses a path that is not written out for this nation", () => {
    expect(write("stats.economy.inflation", 0.04)).toMatchObject({ ok: false });
  });

  it("refuses to overwrite a constant reference with the value it resolves to", () => {
    // `id: USA_ID` is a branded constant; writing "USA" over it both loses the
    // indirection and stops compiling.
    expect(write("id", "CAN")).toMatchObject({ ok: false, reason: expect.stringMatching(/constant `USA_ID`/) });
  });

  it("refuses to overwrite an object with a scalar", () => {
    expect(write("stats.energy.mix", 1)).toMatchObject({ ok: false, reason: expect.stringMatching(/not a scalar/) });
  });

  it("refuses a non-finite number, which would be written as the identifier NaN", () => {
    expect(() => literalFor(Number.NaN)).toThrow(/non-finite/);
  });

  it("refuses a value it has no literal form for", () => {
    expect(() => literalFor(["a"])).toThrow(/refusing to write/);
  });
});

describe("reading a scalar back out of source", () => {
  const read = (path: string) => {
    const [start, end] = span();
    return readScalarAtPath(SOURCE, start, end, path) as { ok: boolean; value?: unknown; reason?: string };
  };

  it("reads a number written with underscore grouping as the number it is", () => {
    expect(read("stats.energy.production")).toMatchObject({ ok: true, value: 22000 });
  });

  it("reads a string without its quotes", () => {
    expect(read("identity.capital")).toMatchObject({ ok: true, value: "Washington, D.C." });
  });

  it("reads a boolean", () => {
    expect(read("geo.coastline")).toMatchObject({ ok: true, value: true });
  });

  it("reads a scalar three levels deep, not its similarly-named cousin", () => {
    expect(read("stats.military.branchStrength.naval")).toMatchObject({ ok: true, value: 0.85 });
    expect(read("stats.military.production")).toMatchObject({ ok: true, value: 1 });
  });

  it("refuses a constant reference rather than reporting its resolved value", () => {
    expect(read("id")).toMatchObject({ ok: false });
  });

  it("round-trips what the writer writes, which is what staleness compares", () => {
    const [start, end] = span();
    const written = writeScalarAtPath(SOURCE, start, end, "stats.economy.inflation", 0.055) as { ok: boolean; source?: string };
    // The fixture has no stats.economy, so the write is refused — the property
    // that matters is proven on a field the fixture does carry.
    expect(written.ok).toBe(false);
    const bumped = writeScalarAtPath(SOURCE, start, end, "stats.energy.production", 23500) as { source: string };
    const [s2, e2] = objectLiteralSpan(bumped.source, bumped.source.indexOf("NationInput.parse({") + "NationInput.parse(".length);
    expect(readScalarAtPath(bumped.source, s2, e2, "stats.energy.production")).toMatchObject({ ok: true, value: 23500 });
  });
});
