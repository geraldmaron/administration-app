import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { TradeSectorRow } from "@admin/player-core";
import { TariffGoods } from "./TariffGoods";

const GOODS: readonly TradeSectorRow[] = Array.from({ length: 14 }, (_, index) => ({
  sector: `goods-${index}`, name: `Goods ${index}`, rollup: "steel-heavy",
  imports: 1000 - index * 10, exports: 500,
  importsText: `$${1000 - index * 10}M`, exportsText: "$500M",
  tariffable: true, tariffPercent: index === 3 ? 25 : 0,
}));

describe("the goods a tariff could reach", () => {
  it("offers every eligible category without requiring pagination", () => {
    const html = renderToStaticMarkup(<TariffGoods name="Canada" goods={GOODS} picked="goods-0" onPick={() => undefined} />);
    expect(html).toContain("Traded category");
    expect(html.match(/<option /g)).toHaveLength(14);
    expect(html).toContain('value="goods-13"');
    expect(html).toContain("Compare all 14 categories");
    expect(html).toContain("One category per order");
  });

  it("keeps a lower-ranked selection and its annual evidence in the plan", () => {
    const html = renderToStaticMarkup(<TariffGoods name="Canada" goods={GOODS} picked="goods-11" onPick={() => undefined} />);
    expect(html).toContain('<option value="goods-11" selected="">');
    expect(html).toContain("$890M");
    expect(html).toContain("$500M");
    expect(html).toContain("US imports / year");
    expect(html).toContain("US exports / year");
    expect(html).toContain("Annual trade with Canada, in US dollars");
  });

  it("distinguishes the rate already in force from the additional order", () => {
    const html = renderToStaticMarkup(<TariffGoods name="Canada" goods={GOODS} picked="goods-3" onPick={() => undefined} />);
    expect(html).toContain("25% in force");
  });
});
