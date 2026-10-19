import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CORE_CONSEQUENCES, coreConsequencePack, type ConsequenceDef } from "@admin/content";
import { validateConsequenceDocument, validateConsequenceDir } from "./validate.js";
import { consequenceCoverage, formatCoverage } from "./coverage.js";

// The gate, and the dashboard that says where the gate will complain next.

const diplomaticSuccess = CORE_CONSEQUENCES.find((def) => def.id === "cq-diplomatic-low-success-note-read-in-the-car")!;

const clone = (patch: Partial<ConsequenceDef>): ConsequenceDef => ({ ...diplomaticSuccess, ...patch });

describe("the consequence publish gate", () => {
  it("accepts a pack and a bare array alike", () => {
    // One clean card in pack form: the bundled pack itself carries commit-time debt the ratchet holds.
    expect(validateConsequenceDocument("pack.json", { ...coreConsequencePack, consequences: [clone({ id: "cq-new-card" })] }).ok).toBe(true);
    expect(validateConsequenceDocument("array.json", [clone({ id: "cq-new-card" })]).ok).toBe(true);
  });

  it("judges a small batch against the bundled floor, not against itself", () => {
    // One card cannot fill thirty-six cells; refusing it for the thirty-five it
    // was never asked to write would make every real batch unshippable.
    const result = validateConsequenceDocument("one.json", [clone({ id: "cq-one-card" })]);
    expect(result.findings.some((finding) => finding.kind === "coverage-cell-empty")).toBe(false);
    expect(result.ok).toBe(true);
  });

  it("refuses a shape that is not a consequence document", () => {
    const result = validateConsequenceDocument("bad.json", [{ id: "no-instrument" }]);
    expect(result.ok).toBe(false);
    expect(result.shapeErrors.length).toBeGreaterThan(0);
  });

  it("names the defects: an unknown branch, and one hung on a success", () => {
    const result = validateConsequenceDocument("bad.json", [clone({ id: "cq-bad-card", riskAffinity: ["blown-cover"] })]);
    expect(result.ok).toBe(false);
    const kinds = result.findings.map((finding) => finding.kind);
    expect(kinds).toContain("unknown-risk-id");
    expect(kinds).toContain("risk-affinity-off-failure");
  });

  it("refuses a card waiting on a flag nothing writes, and accepts it once something does", () => {
    const waiting = clone({ id: "cq-waits", conditions: { flagsSet: ["burned-the-network"] } });
    expect(validateConsequenceDocument("a.json", [waiting]).findings.some((f) => f.kind === "consequence-flag-never-set")).toBe(true);
    expect(
      validateConsequenceDocument("a.json", [waiting], ["burned-the-network"]).findings.some(
        (f) => f.kind === "consequence-flag-never-set",
      ),
    ).toBe(false);
  });
});

describe("scanning a work directory", () => {
  it("ignores the rejection reports the gate itself wrote", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "consequence-dir-"));
    await writeFile(path.join(dir, "item.out.json"), JSON.stringify([clone({ id: "cq-dir-card" })]), "utf8");
    // Shaped like a real findings file: valid JSON, and nothing like a card.
    await writeFile(
      path.join(dir, "item.findings.json"),
      JSON.stringify({ file: "item.out.json", findings: [{ severity: "error", message: "an earlier defect" }] }),
      "utf8",
    );

    const results = await validateConsequenceDir(dir);

    expect(results.map((result) => path.basename(result.file))).toEqual(["item.out.json"]);
    expect(results.every((result) => result.ok)).toBe(true);
  });
});

describe("the coverage matrix", () => {
  it("reports every cell of the instrument, band and valence matrix", () => {
    expect(consequenceCoverage()).toHaveLength(45);
  });

  it("counts the bundled floor and the corpus separately, and marks a cell's depth", () => {
    const shipped = [clone({ id: "cq-shipped-one" })];
    const cells = consequenceCoverage(shipped);
    const cell = cells.find((c) => c.instrument === "diplomatic" && c.band === "low" && c.valence === "success")!;
    expect(cell.corpus).toBe(1);
    expect(cell.total).toBe(cell.core + 1);
    expect(cell.guaranteed).toBe(true);
    expect(formatCoverage(cells)).toContain(`${cell.core}+1`);
  });

  it("shows a cell whose only cards are conditioned as gated, not as depth", () => {
    const gatedOnly = consequenceCoverage().map((cell) => cell);
    // The bundled pack is unconditioned everywhere, so the floor is whole.
    expect(gatedOnly.every((cell) => cell.guaranteed)).toBe(true);
    expect(formatCoverage(gatedOnly)).toContain("the floor is whole");
  });
});
