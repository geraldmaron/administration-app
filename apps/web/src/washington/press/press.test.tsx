import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Campaign, FeedItem } from "@admin/engine";
import { openingHarnessCampaign } from "../../map/harness/fixture";
import { PressScreen } from "./PressScreen";
import { feedHref, filterOf, isFiltered, pressSearch, pressViewForSection } from "./press-search";

vi.mock("../../shell/Door", () => ({ Door: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("../../shell/Screen", () => ({ Screen: ({ title, lede, children }: { title: string; lede?: string; children: ReactNode }) => <main aria-label={title}><p>{lede}</p>{children}</main> }));
vi.mock("../congress/HillAct", () => ({ useHillCommit: () => ({ committed: undefined, by: undefined }), HillAct: () => null }));

const opening = openingHarnessCampaign();
const foreign = Object.keys(opening.nations).find((id) => id !== opening.founding.nation)!;

function story(turn: number, outletId: string, stance: "hostile" | "friendly", headline: string, over: Partial<FeedItem> = {}): FeedItem {
  return { turn, kind: "npc-action", visibility: "public", headline, desk: { outletId, stance }, actor: foreign as never, ...over } as FeedItem;
}

const campaign: Campaign = {
  ...opening,
  turn: 5,
  feed: [story(4, "outlet-frontier-channel", "hostile", "A rival condemned the order."), story(5, "outlet-main-street-radio", "friendly", "A neighbor praised the order.")],
};

const noop = () => undefined;

describe("the press page's address", () => {
  it("keeps only filters it knows and drops everything else", () => {
    expect(pressSearch({ outlet: "outlet-frontier-channel", topic: "conflict", tone: "critical", week: 4, view: "trend" })).toEqual({ outlet: "outlet-frontier-channel", topic: "conflict", tone: "critical", week: 4 });
    expect(pressSearch({ topic: "gossip", tone: "angry", week: "4", outlet: "" })).toEqual({});
  });

  it("builds links that land on the feed with the filter carried, and reads them back", () => {
    expect(feedHref({ outlet: "outlet-rampart", week: 3 })).toBe("/washington/office/press?outlet=outlet-rampart&week=3#press-feed");
    expect(feedHref({})).toBe("/washington/office/press#press-feed");
    expect(filterOf({ tone: "friendly" })).toEqual({ tone: "friendly" });
    expect(isFiltered({})).toBe(false);
    expect(isFiltered({ week: 4 })).toBe(true);
  });
});

describe("focused press navigation", () => {
  it("keeps view state out of coverage filters and sends filtered links to coverage", () => {
    expect(pressSearch({ view: "analysis" })).toEqual({ view: "analysis" });
    expect(pressSearch({ view: "coverage" })).toEqual({ view: "coverage" });
    expect(filterOf({ view: "response" })).toEqual({});
    expect(isFiltered({ view: "response" })).toBe(false);
    expect(feedHref({ view: "analysis", outlet: "desk" })).toBe("/washington/office/press?outlet=desk#press-feed");
    expect(pressViewForSection("press-respond")).toBe("response");
    expect(pressViewForSection("#press-desks")).toBe("analysis");
  });
});

describe("the press page", () => {
  const html = (search = {}) => renderToStaticMarkup(<PressScreen campaign={campaign} search={search} onSearch={noop} />);

  it("prioritizes coverage while analysis, response and foreign coverage keep focused workspaces", () => {
    const markup = html();
    expect(markup).toContain('id="press-feed"');
    expect(markup).not.toContain('id="press-desks"');
    expect(markup).toContain("Corps toward you");
    expect(html({ view: "analysis" })).toContain('id="press-weeks"');
    expect(html({ view: "analysis" })).toContain('id="press-desks"');
    expect(html({ view: "response" })).toContain('id="press-respond"');
    expect(html({ view: "response" })).toContain('id="press-stories"');
    expect(html({ view: "abroad" })).toContain('id="press-abroad"');
  });

  it("links each desk to its stories and each story to its dispatch and the government it names", () => {
    const markup = html();
    expect(html({ view: "analysis" })).toContain('href="/washington/office/press?outlet=outlet-frontier-channel#press-feed"');
    expect(markup).toContain('href="/record/press/dispatch/0"');
    expect(markup).toContain(`href="/world/nation/${foreign}"`);
  });

  it("narrows the feed to one desk and says how many of the stories that is", () => {
    const markup = html({ outlet: "outlet-frontier-channel" });
    const feed = markup.slice(markup.indexOf('id="press-feed"'));
    expect(feed).toContain("1 of 2 stories");
    expect(feed).toContain("A rival condemned the order.");
    expect(feed).not.toContain("A neighbor praised the order.");
  });

  it("says plainly when a filter holds nothing", () => {
    expect(html({ week: 99 })).toContain("No story matches these filters.");
  });
});
