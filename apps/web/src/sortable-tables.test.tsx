import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Campaign } from "@admin/engine";
import { deskRows, nationFile, type ExecutiveNode } from "@admin/player-core";
import { openingHarnessCampaign } from "./map/harness/fixture";
import { ByState } from "./nation/economy/ByState";
import { Trade } from "./nation/economy/Household";
import { Markets } from "./nation/economy/Markets";
import { Ledger } from "./nation/budget/Books";
import { StatesTable } from "./nation/state/StatesTable";
import { Desks } from "./washington/press/Desks";
import { RosterTable } from "./washington/executive/RosterTable";
import type { RosterRow } from "./washington/executive/roster";
import { TradeView } from "./world/nation/TradeView";

const campaign = openingHarnessCampaign();
const sortable = (element: ReactElement): number => (renderToStaticMarkup(element).match(/<th scope="col" aria-sort="(?:none|ascending|descending)"/g) ?? []).length;

const node = (office: string): ExecutiveNode => ({ institution: `INST-${office}` as never, office, name: office, abbr: office, title: office, href: `/washington/office/${office}`, emblem: "building", staffing: "vacant", alerts: [], children: [] });
const rosterRow = (office: string, depth: 0 | 1): RosterRow => ({ node: node(office), depth, needsYou: false });

describe("tables of comparable rows sort by their column headers", () => {
  it("ranks the states' economy by any column, unemployment highest first", () => {
    const html = renderToStaticMarkup(<ByState campaign={campaign} />);
    expect(html).toMatch(/aria-sort="descending"[^>]*><button[^>]*><span class="ui-sort__label">Unemployment/);
    expect(html.match(/<th scope="col" aria-sort/g)).toHaveLength(5);
  });

  it("sorts trade partners, largest share first", () => {
    const html = renderToStaticMarkup(<Trade campaign={campaign} />);
    expect(html).toMatch(/aria-sort="descending"[^>]*><button[^>]*><span class="ui-sort__label">Share of US goods trade/);
  });

  it("sorts the commodity board, and leaves the mixed-unit price column plain", () => {
    const html = renderToStaticMarkup(<Markets campaign={campaign} search={{}} onChange={() => undefined} />);
    expect(html).toContain('aria-sort="none"');
    expect(html).toContain('<th scope="col" class="eco-table__num">Price / index</th>');
  });

  it("sorts the budget lines in the books' own order until a header is pressed", () => {
    expect(sortable(<Ledger campaign={campaign} />)).toBe(4);
  });

  it("sorts the states table, by name first", () => {
    const rows = [{ id: "OH", name: "Ohio", href: "/nation/state/OH", governor: undefined, party: undefined, reading: "50% approve", rank: 0.5, history: [], conditions: 0, declared: false }] as const;
    const html = renderToStaticMarkup(<StatesTable rows={rows} readingLabel="Approval" withRecord={false} />);
    expect(html).toMatch(/aria-sort="ascending"[^>]*><button[^>]*><span class="ui-sort__label">State/);
    expect(html.match(/<th scope="col" aria-sort/g)).toHaveLength(4);
    expect(renderToStaticMarkup(<StatesTable rows={rows} readingLabel="Approval" withRecord />).match(/<th scope="col" aria-sort/g)).toHaveLength(5);
  });

  it("sorts the press desks", () => {
    expect(sortable(<Desks desks={deskRows(campaign)} />)).toBe(5);
  });

  it("sorts the roster and keeps a department's agencies under it", () => {
    const html = renderToStaticMarkup(<RosterTable campaign={campaign as Campaign} rows={[rosterRow("CONF", 0), rosterRow("AGENCY", 1)]} caption="Roster" />);
    expect(html.match(/<th scope="col" aria-sort="none"/g)).toHaveLength(4);
  });

  it("exposes category sorting alongside annual trade totals", () => {
    const file = nationFile(campaign, "CAN" as never)!;
    const html = renderToStaticMarkup(<TradeView file={file} sector={undefined} onSector={() => undefined} />);
    expect(html).toMatch(/<label class="ui-sort-picker">/);
    expect(html).toContain('value="imports:descending"');
    expect(html).toContain('value="tariff:ascending"');
    expect(html).toContain("Trade with the United States, a year");
    expect(html).toContain("trade-categories");
  });
});
