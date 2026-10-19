import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Gauge } from "./Gauge";
import { ShareBar } from "./Bar";
describe("circular readings", () => {
  it("preserves the actual spoken value while bounding a ring visually", () => {
    const html = renderToStaticMarkup(<Gauge shape="ring" label="Coverage" value={1.2} valueText="120%" marks={[{ at: .5, label: "Target" }]} />);
    expect(html).toContain('aria-valuenow="100"');
    expect(html).toContain('aria-valuetext="120%. Target at 50%"');
    expect(html).not.toContain("NaN");
  });
  it("keeps supply names and figures readable without the graphic and handles no observations", () => {
    const html = renderToStaticMarkup(<ShareBar shape="ring" label="Supply" segments={[{ id: "a", label: "Country A", share: .75, figure: "75%" }, { id: "b", label: "Country B", share: .25, figure: "25%" }]} />);
    expect(html).toContain("Country A"); expect(html).toContain("75%");
    const empty = renderToStaticMarkup(<ShareBar shape="ring" label="Supply" segments={[]} />);
    expect(empty).not.toContain("100%"); expect(empty).not.toContain("NaN");
  });
});
