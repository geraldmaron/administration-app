import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LEGISLATIVE_ACTS, type Bill, type Campaign, type ChamberVote } from "@admin/engine";
import { hillPostReading, hillPosts } from "@admin/player-core";
import { openingHarnessCampaign } from "../../map/harness/fixture";
import { BillScreen } from "./BillScreen";
import { CongressScreen } from "./CongressScreen";
import { PostScreen } from "./PostScreen";
vi.mock("../../map/MapView", () => ({ MapView: ({ title }: { title: string }) => <section aria-label={title} /> }));

vi.mock("../../shell/Door", () => ({ Door: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("../../shell/Screen", () => ({ Screen: ({ title, children }: { title: string; children: ReactNode }) => <main aria-label={title}>{children}</main> }));
vi.mock("./HillAct", () => ({
  useHillCommit: () => ({ busy: false, problem: "", committed: undefined, by: undefined, commit: async () => undefined, commitFrom: async () => undefined, dismiss: () => undefined }),
  HillAct: ({ title }: { title: string }) => <section aria-label={title} />,
}));

const act = LEGISLATIVE_ACTS[0]!;
const base = openingHarnessCampaign();
const vote = (chamber: ChamberVote["chamber"], yeas: number, nays: number, required: number): ChamberVote => ({ chamber, yeas, nays, required, passed: yeas >= required });

function billOf(status: Bill["status"], extra: Partial<Bill> = {}): { readonly campaign: Campaign; readonly bill: Bill } {
  const bill: Bill = { id: `bill:${act.id}:1`, act: act.id, title: act.title, sponsor: "administration", introducedTurn: 1, status, passage: [vote("house", 250, 180, 218), vote("senate", 60, 40, 51)], ...extra };
  return { campaign: { ...base, bills: { [bill.id]: bill } }, bill };
}

describe("the bill page", () => {
  it("opens a law with its recorded vote, the document, history and no projection", () => {
    const { campaign, bill } = billOf("law", { enactedBy: "unsigned", resolvedTurn: 3, beats: [{ turn: 2, stage: "floor", outcome: "advanced" as never, account: "The floor took it up." }] });
    const html = renderToStaticMarkup(<BillScreen campaign={campaign} bill={bill} act={act} />);
    expect(html).toContain("Law without signature");
    expect(html).toContain("Recorded vote");
    expect(html).not.toContain("Staff projection");
    expect(html).toContain("ui-document");
    expect(html).toContain("Estimated fiscal and national effects");
    expect(html).toContain("The floor took it up.");
    expect(html).not.toContain("Legislative outreach");
    expect(html).not.toContain("The map shows");
  });

  it("shows a tax bill's annual revenue loss and horizon in its document", () => {
    const taxAct = LEGISLATIVE_ACTS.find((entry) => entry.id === "act-tax-relief-and-growth")!;
    const bill: Bill = { id: `bill:${taxAct.id}:1`, act: taxAct.id, title: taxAct.title, sponsor: "bipartisan", introducedTurn: 1, status: "law", passage: [], enactedBy: "signed", resolvedTurn: 2 };
    const campaign: Campaign = { ...base, bills: { [bill.id]: bill } };
    const html = renderToStaticMarkup(<BillScreen campaign={campaign} bill={bill} act={taxAct} />);
    expect(html).toContain("a year in lost revenue");
    expect(html).toContain("The yearly change lasts 4 years");
    expect(html).not.toContain("No direct fiscal or national effect is modeled.");
  });

  it("shows a law's ongoing national effect without inventing a fiscal charge", () => {
    const reform = LEGISLATIVE_ACTS.find((entry) => entry.id === "act-immigration-reform")!;
    const bill: Bill = { id: `bill:${reform.id}:1`, act: reform.id, title: reform.title, sponsor: "bipartisan", introducedTurn: 1, status: "law", passage: [], enactedBy: "signed", resolvedTurn: 2 };
    const campaign: Campaign = { ...base, bills: { [bill.id]: bill } };
    const html = renderToStaticMarkup(<BillScreen campaign={campaign} bill={bill} act={reform} />);
    expect(html).toContain("basic rate while the program runs");
    expect(html).not.toContain("No direct fiscal or national effect is modeled.");
    expect(html).not.toContain("a year in additional spending");
  });

  it("opens a bill still in committee with a staff projection, an assessed next stage and outreach", () => {
    const { campaign, bill } = billOf("in-progress", { stage: "referral", setbacks: 0 });
    const html = renderToStaticMarkup(<BillScreen campaign={campaign} bill={bill} act={act} />);
    expect(html).toContain("Support unknown");
    expect(html).toContain("As of");
    expect(html).not.toContain("tally--recorded");
    expect(html).toContain("Assessed next stage");
    expect(html).toContain("Legislative outreach");
    expect(html).toContain("No weekly action has been recorded on this bill yet.");
  });

  it("puts the presidential decision and its deadline before the text when the bill is on the desk", () => {
    const { campaign, bill } = billOf("on-the-desk");
    const html = renderToStaticMarkup(<BillScreen campaign={campaign} bill={bill} act={act} />);
    expect(html).toContain("Presidential decision");
    expect(html).toMatch(/Deadline [A-Z]/);
    expect(html.indexOf("Presidential decision")).toBeLessThan(html.indexOf("ui-document"));
    expect(html).toContain("Recorded vote on passage");
    expect(html).toContain("Support unknown");
    expect(html).toContain("Awaiting signature");
  });

  it("marks a vetoed bill as vetoed in the document", () => {
    const { campaign, bill } = billOf("vetoed");
    expect(renderToStaticMarkup(<BillScreen campaign={campaign} bill={bill} act={act} />)).toContain("ui-document__state--danger");
  });
});

describe("the Hill post page", () => {
  it("runs from the officeholder to the request, a labeled assessment, outreach and history", () => {
    const post = hillPostReading(base, hillPosts(base)[0]!.id)!;
    const html = renderToStaticMarkup(<PostScreen campaign={base} post={post} />);
    const order = ["Officeholder", "Assessed position", "The request", "Legislative outreach", "Recorded approaches"].map((heading) => html.indexOf(heading));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).toContain("Staff assessment");
    expect(html).toContain("No approaches recorded for this member.");
  });

  it("keeps the originating bill in the request", () => {
    const { campaign, bill } = billOf("in-progress", { stage: "referral" });
    const post = hillPostReading(campaign, hillPosts(campaign)[0]!.id)!;
    const html = renderToStaticMarkup(<PostScreen campaign={campaign} post={post} context={{ bill }} />);
    expect(html).toContain(`/washington/congress/bill/${encodeURIComponent(bill.id)}`);
    expect(html).toContain("Bill in view");
    expect(html).toContain(bill.title);
  });
});

describe("the Congress page", () => {
  it("keeps the overview distinct from focused working lists", () => {
    const html = renderToStaticMarkup(<CongressScreen campaign={base} view="overview" onView={() => undefined} />);
    expect(html).toContain("Congressional operating picture");
    expect(html).toContain("The chambers");
    expect(html).toContain("Bills in Congress");
    for (const label of ["Overview", "Bills and agenda", "Nominations", "Members", "Delegations", "War powers and funding"]) expect(html).toContain(label);
    const bills = renderToStaticMarkup(<CongressScreen campaign={base} view="bills" onView={() => undefined} />);
    expect(bills).toContain("Settled bills");
    expect(bills).not.toContain("Where the members come from");
    expect(bills).not.toContain("Where you stand with them");
  });

  it.each([
    ["bills", "Settled bills"],
    ["nominations", "No nomination is open."],
    ["delegations", "State delegations"],
    ["powers", "Notices, war powers and appropriations"],
  ] as const)("shows the %s view", (view, text) => {
    expect(renderToStaticMarkup(<CongressScreen campaign={base} view={view} onView={() => undefined} />)).toContain(text);
  });
});
