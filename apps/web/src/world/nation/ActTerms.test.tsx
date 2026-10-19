import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ActTerms, TradeSectorRow } from "@admin/player-core";
import { ActTermsForm } from "./ActTerms";
import { ActSummary } from "./ActSummary";

const TEST_LAW = { statute: "s301", name: "Section 301", cite: "19 U.S.C. §2411", purpose: "Unfair trade practices", available: true, reason: "The Trade Representative made the finding.", orders: "tariff", roomPercent: 100, limits: "No cap below a total ban, lasts until lifted.", courts: "" } as const;

const GOODS: readonly TradeSectorRow[] = [
  { sector: "steel", name: "Steel", rollup: "steel-heavy", imports: 900, exports: 100, importsText: "$900M", exportsText: "$100M", tariffable: true, tariffPercent: 10 },
  { sector: "auto-parts", name: "Auto parts", rollup: "auto", imports: 600, exports: 300, importsText: "$600M", exportsText: "$300M", tariffable: true, tariffPercent: 0 },
];

describe("the terms of an act", () => {
  it("draws the tariff's goods as a comparison with the picked goods checked", () => {
    const terms: ActTerms = { tariff: { sectors: [{ sector: "steel", name: "Steel" }, { sector: "auto-parts", name: "Auto parts" }], sector: "auto-parts", rate: 15, standing: 0, room: 85, law: TEST_LAW, laws: [TEST_LAW] } };
    const html = renderToStaticMarkup(<ActTermsForm name="Canada" terms={terms} config={{}} onConfig={() => undefined} goods={GOODS} />);
    expect(html).toContain("Traded category");
    expect(html).toContain('<option value="auto-parts" selected="">');
    expect(html).toContain("Additional rate: 15%");
  });

  it("names what a force sends with its glyph and unit", () => {
    const terms: ActTerms = { force: { min: 1, max: 6, count: 4, unitType: "navy.surface-combatant", countText: "4 surface combatants", preferredText: "4 surface combatants", purpose: "Show of force." } };
    const html = renderToStaticMarkup(<ActTermsForm name="Iran" terms={terms} config={{}} onConfig={() => undefined} />);
    expect(html).toContain('data-glyph="unitSurfaceCombatant"');
    expect(html).toContain("What it sends: 4 surface combatants");
  });
});

describe("the summary above the verb", () => {
  it("reads target, terms, cost, authority and reversibility as one list", () => {
    const html = renderToStaticMarkup(
      <ActSummary
        nation="CAN"
        name="Canada"
        chosen={{ option: { id: "tariff", goal: "trade", family: "tariff", name: "Tariff on one kind of goods", ref: { kind: "tariff" } }, preview: { state: "open" } as never }}
        terms={{ tariff: { sectors: [{ sector: "steel", name: "Steel" }], sector: "steel", rate: 25, standing: 0, room: 75, law: TEST_LAW, laws: [TEST_LAW] } }}
        assessment={{ rows: [{ label: "Revenue", baseline: { text: "None" }, act: { text: "$1.00B a year coming in" } }] } as never}
      />,
    );
    for (const label of ["Target", "Terms", "Cost", "Authority", "Can it be undone"]) expect(html).toContain(`<dt>${label}</dt>`);
    expect(html).toContain("25% on steel");
    expect(html).toContain("$1.00B a year coming in");
  });
});
