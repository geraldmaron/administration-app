import { describe, expect, it } from "vitest";
import { CABINET_DEPARTMENT_INSTITUTIONS, FEDERAL_SITES } from "@admin/world";
import { INSTITUTION_CATALOG } from "./institution-catalog.js";

// The dataset keys federal headquarters by institution id without reading the
// engine, so the two lists are held together here, on the side that may read both.
describe("federal sites against the institution catalog", () => {
  it("gives every institution exactly one row, and no row to an institution the catalog lacks", () => {
    const catalog = INSTITUTION_CATALOG.map((institution) => institution.id).sort();
    expect(FEDERAL_SITES.map((site) => site.institution).sort()).toEqual(catalog);
  });

  it("names the catalog's departments as the cabinet departments", () => {
    const departments = INSTITUTION_CATALOG.filter((institution) => institution.kind === "department").map((institution) => institution.id);
    expect([...CABINET_DEPARTMENT_INSTITUTIONS].sort()).toEqual([...departments].sort());
  });
});
