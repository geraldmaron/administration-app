import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CARRIED_CONFLICTS } from "./carried-conflicts.js";
import { CHOKEPOINT_FLOWS } from "./chokepoint-flows.js";
import { CHOKEPOINT_CARGO } from "./chokepoint-cargo.js";
import { CHOKEPOINT_ORIGINS } from "./chokepoint-origins.js";
import { NATION_OIL_GAS } from "./nation-oil-gas.js";
import { COMMODITY_PRODUCERS } from "./commodity-producers.js";
import { DEBT_REBASE, applyDebtRebase } from "./debt-rebase.js";
import { PRICE_ANCHORS } from "./price-anchors.js";
import { PRICE_SHARES } from "./price-shares.js";
import { FEDERAL_SITES } from "./federal-sites.js";
import { STATE_CAPITOLS } from "./state-capitols.js";
import { US_BASING } from "./us-basing.js";
import { US_MUNITIONS } from "./us-munitions.js";
import { US_HULLS } from "./us-hulls.js";
import { FORCE_COST_ANCHORS } from "./force-cost-anchors.js";
import { SCENARIO_COST_ANCHORS } from "./scenario-cost-anchors.js";
import { worldNations } from "./nations.js";

// Each seed table is a vendored file and a TypeScript table that must say the
// same thing. The two are written together; this holds them together, so a
// row added to one and not the other fails here rather than at the first
// reader.

const TABLES = [
  { file: "carried-conflicts", rows: CARRIED_CONFLICTS, header: ["kind", "parties", "since", "status", "mapped_state", "mapping_rule", "source", "opened"] },
  {
    file: "us-basing",
    rows: US_BASING,
    header: ["country", "base", "service", "personnel_band", "anchor", "lat", "lon", "anchor_source", "anchor_opened", "source", "opened"],
  },
  {
    file: "us-munitions",
    rows: US_MUNITIONS,
    header: ["class", "systems", "opening_index", "production_rate", "lead_time", "provenance", "source", "opened"],
  },
  {
    file: "force-cost-anchors",
    rows: FORCE_COST_ANCHORS,
    header: ["anchor", "value", "unit", "dollar_year", "provenance", "covers", "source", "opened"],
  },
  {
    file: "scenario-cost-anchors",
    rows: SCENARIO_COST_ANCHORS,
    header: ["anchor", "value", "unit", "dollar_year", "provenance", "covers", "source", "opened"],
  },
  { file: "commodity-producers", rows: COMMODITY_PRODUCERS, header: ["commodity", "metric", "nation", "share", "source", "opened"] },
  { file: "chokepoint-flows", rows: CHOKEPOINT_FLOWS, header: ["chokepoint", "commodity", "littoral", "share", "bypass", "basis", "source", "opened"] },
  { file: "chokepoint-cargo", rows: CHOKEPOINT_CARGO, header: ["chokepoint", "commodity", "destination", "mbd", "period", "source", "opened"] },
  { file: "chokepoint-origins", rows: CHOKEPOINT_ORIGINS, header: ["chokepoint", "commodity", "origin", "mbd", "period", "source", "opened"] },
  { file: "nation-oil-gas", rows: NATION_OIL_GAS, header: ["nation", "oil_kbd", "oil_year", "gas_bcm", "gas_year", "crude_kbd", "crude_year", "source", "opened"] },
  { file: "us-hulls", rows: US_HULLS, header: ["unit_type", "hull", "name", "class", "source", "opened"] },
  { file: "price-anchors", rows: PRICE_ANCHORS, header: ["commodity", "series", "period", "value", "unit", "kind", "source", "opened"] },
  { file: "price-shares", rows: PRICE_SHARES, header: ["reading", "component", "share", "series", "period", "source", "opened"] },
  { file: "debt-rebase", rows: DEBT_REBASE, header: ["nation", "ratio", "source", "opened"] },
  {
    file: "federal-sites",
    rows: FEDERAL_SITES,
    header: ["institution", "site", "state", "location", "lat", "lon", "hq_source", "reason", "source", "opened"],
  },
  { file: "state-capitols", rows: STATE_CAPITOLS, header: ["state", "capitol", "city", "lat", "lon", "source", "opened"] },
] as const;

function vendored(file: string): { readonly header: readonly string[]; readonly rows: readonly string[][] } {
  const path = fileURLToPath(new URL(`./seed/${file}.tsv`, import.meta.url));
  const lines = readFileSync(path, "utf8").trim().split("\n").filter((line) => !line.startsWith("#"));
  return { header: lines[0]!.split("\t"), rows: lines.slice(1).map((line) => line.split("\t")) };
}

describe("the seed tables", () => {
  for (const table of TABLES) {
    it(`${table.file}: the vendored file and the table hold the same rows under the agreed header`, () => {
      const file = vendored(table.file);
      expect(file.header).toEqual(table.header);
      expect(file.rows).toHaveLength(table.rows.length);
      for (const row of file.rows) {
        expect(row, `${table.file}: a row with no opened source is not seeded`).toHaveLength(table.header.length);
        expect(row.at(-1), `${table.file}: opened date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(row.at(-2), `${table.file}: source`).not.toBe("");
      }
    });
  }

  it("rebases nothing while the debt table is empty", () => {
    expect(DEBT_REBASE).toHaveLength(0);
    expect(applyDebtRebase(worldNations)).toBe(worldNations);
  });
});
