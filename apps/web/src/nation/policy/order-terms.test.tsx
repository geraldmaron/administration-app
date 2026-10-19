// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EXECUTIVE_ORDERS } from "@admin/engine";
import { charterOf, orderDesk } from "@admin/player-core";
import { openingHarnessCampaign } from "../../map/harness/fixture";
import { OrderDocument } from "./OrderDocument";
import { orderTerms, riskTable } from "./order-terms";

const campaign = openingHarnessCampaign();
const first = EXECUTIVE_ORDERS[0]!;
const desk = orderDesk(campaign, charterOf(campaign), first.id)!;
const terms = orderTerms(campaign, desk);

describe("orderTerms", () => {
  it("carries the game's order id as the reference and names the terms the page and rail share", () => {
    expect(terms.reference).toBe(first.id);
    expect(terms.name).toBe(first.name);
    expect(terms.costNow.length).toBeGreaterThan(0);
    expect(terms.department.length).toBeGreaterThan(0);
    expect(terms.timing).toMatch(/signed|after signing/);
  });

  it("never invents a citation: the authority is the catalogue's or absent", () => {
    expect(terms.authority?.cite).toBe(first.authority?.cite);
  });
});

describe("riskTable", () => {
  it("keeps the one signing column, and drops the rows the terms already say", () => {
    const table = riskTable(desk);
    expect(table.columns).toHaveLength(1);
    const ids = table.rows.map((row) => row.id);
    expect(ids).toEqual(expect.arrayContaining(["challenge", "review", "politics"]));
    expect(ids).not.toContain("cost");
    expect(ids).not.toContain("does");
  });
});

describe("OrderDocument", () => {
  it("reads as an unsigned draft before the signature", () => {
    const html = renderToStaticMarkup(<OrderDocument campaign={campaign} terms={terms} />);
    expect(html).toContain("The White House");
    expect(html).toContain("Executive order");
    expect(html).toContain("Draft prepared");
    expect(html).toContain("Not yet signed");
    expect(html).toContain(first.id);
    expect(html).toContain("Responsible department");
    expect(html).toContain("Effective dates and review");
    expect(html).not.toContain("Signed ");
  });

  it("shows the committed terms as signed, with the President's name, and no draft marks", () => {
    const html = renderToStaticMarkup(<OrderDocument campaign={campaign} terms={terms} signedOn="March 3, 2029" recordId={`${first.id}:3`} />);
    expect(html).toContain("Signed March 3, 2029");
    expect(html).toContain(`${first.id}:3`);
    expect(html).toContain(campaign.founding.leader.name);
    expect(html).not.toContain("Draft prepared");
    expect(html).not.toContain("Not yet signed");
  });
});
