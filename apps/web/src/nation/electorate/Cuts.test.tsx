import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { electorateView, type CrosstabGroup } from "@admin/player-core";
import { openingHarnessCampaign } from "../../map/harness/fixture";
import { Cuts } from "./Cuts";

const campaign = openingHarnessCampaign();
const book = electorateView(campaign);

describe("community comparison", () => {
  it("offers every category and explains that population categories overlap", () => {
    const html = renderToStaticMarkup(<Cuts groups={book.cuts} topline={book.cutsAverage} campaign={campaign} trends={book.trends} />);
    for (const group of book.cuts) expect(html).toContain(`value="${group.id}"`);
    expect(html).toContain("Categories overlap");
    expect(html).toContain("0–100%");
  });

  it("retains both extreme opposition and complete support on the common scale", () => {
    const groups: readonly CrosstabGroup[] = [{ id: "age", name: "By age", rows: [
      { id: "young", name: "Young", support: 0, figure: "0%", word: "Opposed", stance: "neutral" },
      { id: "older", name: "Older", support: 1, figure: "100%", word: "Supportive", stance: "neutral" },
    ] }];
    const html = renderToStaticMarkup(<Cuts groups={groups} topline={0.5} campaign={campaign} trends={book.trends} />);
    expect(html).toContain("Young");
    expect(html).toContain("Older");
    expect(html).toContain("inset-inline-start:0%");
    expect(html).toContain("inset-inline-start:100%");
    expect(html).toContain("50%");
  });
});
