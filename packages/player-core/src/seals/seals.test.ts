import { IC_ELEMENTS, INSTITUTION_IDS, PRESS_OUTLETS, institutionDef } from "@admin/engine";
import { cradles, organizations } from "@admin/world";
import { describe, expect, it } from "vitest";
import {
  DEVICE_IDS,
  SEALS,
  SEAL_COLORS,
  SEAL_HOUSE,
  SEAL_PRESIDENT,
  SEAL_SENATE,
  SEAL_VICE_PRESIDENT,
  SEAL_WHITE_HOUSE,
  chamberSeal,
  hasAuthoredSeal,
  monogramOf,
  sealFor,
  sealKindOf,
  type SealColor,
  type SealSpec,
} from "./index.js";

const EVERY_BODY = [
  ...INSTITUTION_IDS,
  ...IC_ELEMENTS.map((element) => element.id),
  ...organizations.map((org) => org.id),
  ...cradles.map((cradle) => cradle.id),
  ...PRESS_OUTLETS.map((outlet) => outlet.id),
  SEAL_PRESIDENT,
  SEAL_VICE_PRESIDENT,
  SEAL_WHITE_HOUSE,
  SEAL_HOUSE,
  SEAL_SENATE,
];

describe("the seal registry", () => {
  it("authors an emblem for every institution, intelligence element, organization, outlet and office of state", () => {
    expect(EVERY_BODY.filter((id) => !hasAuthoredSeal(id))).toEqual([]);
  });

  it("seals every judicial seat with its court's emblem", () => {
    const circuit = "INST-CIRCUIT-FIRST-SEAT-1";
    expect(institutionDef(circuit)?.id).toBe(circuit);
    expect(sealFor(circuit).device).toBe("scales");
    expect(sealFor("INST-SCOTUS-SEAT-1").device).toBe(sealFor("SEAL-SUPREME-COURT").device);
  });

  it("returns an aliased seal under the id it was asked for", () => {
    expect(sealFor("IC-CIA")).toEqual({ ...SEALS["INST-CIA"], id: "IC-CIA" });
  });

  it("names only devices and colors the design system draws", () => {
    const devices = new Set<string>(DEVICE_IDS);
    const colors = new Set<string>(SEAL_COLORS);
    const named = (spec: SealSpec) => [spec.field, spec.rim, spec.deviceColor, spec.ring?.color, spec.charge?.color, spec.charge?.field];
    for (const spec of Object.values(SEALS)) {
      expect(devices.has(spec.device), `${spec.id} device ${spec.device}`).toBe(true);
      if (spec.charge) expect(devices.has(spec.charge.device), `${spec.id} charge`).toBe(true);
      for (const color of named(spec).filter((c): c is SealColor => c !== undefined)) expect(colors.has(color), `${spec.id} color ${color}`).toBe(true);
    }
  });

  it("keys every seal by its own id and gives lettered devices their letters", () => {
    for (const [id, spec] of Object.entries(SEALS)) {
      expect(spec.id).toBe(id);
      if (spec.device === "monogram") expect(spec.monogram?.length ?? 0).toBeGreaterThanOrEqual(2);
      if (spec.monogram) expect(spec.monogram.length).toBeLessThanOrEqual(5);
    }
  });

  it("gives every outlet a masthead and nothing else one", () => {
    for (const outlet of PRESS_OUTLETS) expect(SEALS[outlet.id]?.shape).toBe("masthead");
    expect(Object.values(SEALS).filter((spec) => spec.shape === "masthead")).toHaveLength(PRESS_OUTLETS.length);
  });

  it("does not let two bodies of the same class share one emblem", () => {
    const signature = (spec: SealSpec) => [spec.shape, spec.field, spec.rim, spec.device, spec.deviceColor, spec.charge?.device, spec.monogram].join("|");
    const seen = new Map<string, string>();
    for (const spec of Object.values(SEALS)) {
      const key = signature(spec);
      expect(seen.get(key), `${spec.id} matches ${seen.get(key)}`).toBeUndefined();
      seen.set(key, spec.id);
    }
  });
});

describe("the generic emblem", () => {
  it("is lettered and shaped by the class of body, never passed off as an authored seal", () => {
    const unknown = sealFor("INST-OFFICE-OF-SPECIAL-COUNSEL", "Office of Special Counsel");
    expect(hasAuthoredSeal("INST-OFFICE-OF-SPECIAL-COUNSEL")).toBe(false);
    expect(unknown).toMatchObject({ device: "monogram", monogram: "OSC", shape: "roundel" });
    expect(sealFor("outlet-new-paper").shape).toBe("masthead");
    expect(sealFor("ORG-NEW-BLOC").shape).toBe("rosette");
  });

  it("classes ids by their prefix", () => {
    expect(["IC-X", "INST-SCOTUS-SEAT-1", "INST-X", "ORG-X", "outlet-x", "nation-x"].map(sealKindOf)).toEqual([
      "intelligence",
      "court",
      "federal",
      "international",
      "outlet",
      "generic",
    ]);
  });

  it("letters from a name's significant words, or from the id", () => {
    expect(monogramOf("x", "Department of the Treasury")).toBe("DT");
    expect(monogramOf("INST-ABC")).toBe("ABC");
  });
});

describe("chamber seals", () => {
  it("answer to the engine's chamber names", () => {
    expect(chamberSeal("house").id).toBe(SEAL_HOUSE);
    expect(chamberSeal("senate").id).toBe(SEAL_SENATE);
  });
});
