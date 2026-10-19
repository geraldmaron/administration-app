import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { apply, type Campaign, type EffectPacket, type FeedItem } from "@admin/engine";
import { openingHarnessCampaign } from "../map/harness/fixture";
import { Dispatch } from "./Dispatch";
import { Ending } from "./Ending";
import { Legacy } from "./Legacy";
import { RecordScreen } from "./RecordScreen";
import { legacySearch } from "./legacy-search";
import { filterOf, isFiltered, recordHref, recordSearch, withoutEntry } from "./search";

vi.mock("../shell/Door", () => ({ Door: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("../shell/Screen", () => ({ Screen: ({ title, children }: { title: string; children: ReactNode }) => <main aria-label={title}>{children}</main> }));

function act(campaign: Campaign, summary: string, over: Partial<EffectPacket> = {}, approval = 0): EffectPacket {
  return {
    source: "action",
    actor: "player",
    turn: campaign.turn,
    narration: { summary },
    effects: [{ kind: "metric", deltas: { stability: 0.001 } }, { kind: "opinion", deltas: { unity: approval } }],
    provenance: { origin: "decision", systems: ["trade"], locales: ["MI"] },
    ...over,
  } as EffectPacket;
}

const opening = openingHarnessCampaign();
const first = apply(opening, act(opening, "Signed the tariff order. It raises duties on steel.", {}, -0.02));
const firstId = first.ledger.at(-1)!.causal!.eventId;
const second = apply(first, act(first, "Michigan plants answered the tariff.", { actor: "world", provenance: { origin: "world", causeIds: [firstId], systems: ["macro"], locales: ["MI"] } } as Partial<EffectPacket>, 0.01));
const secondId = second.ledger.at(-1)!.causal!.eventId;
const campaign = apply(second, act(second, "Signed the farm bill.", { provenance: { origin: "decision", systems: ["congress"] } } as Partial<EffectPacket>));

const noop = () => undefined;

function html(search = {}, selectedId?: string, from: Campaign = campaign): string {
  return renderToStaticMarkup(<RecordScreen campaign={from} search={recordSearch(search)} selectedId={selectedId} onSearch={noop} />);
}

describe("the Record's address", () => {
  it("keeps only keys it knows and drops every default", () => {
    expect(recordSearch({ view: "acts", q: "tariff", actor: "nobody", outcome: "hurt", entry: "ev-1", extra: 1 })).toEqual({ q: "tariff", outcome: "hurt", entry: "ev-1" });
    expect(recordSearch({ view: "promises" })).toEqual({ view: "promises" });
    expect(recordSearch({ q: "" })).toEqual({});
  });

  it("builds links that carry the filters, and the list link leaves the entry out", () => {
    const search = recordSearch({ q: "farm bill", actor: "player", entry: "ev-1" });
    expect(recordHref(search)).toBe("/record?q=farm+bill&actor=player&entry=ev-1");
    expect(recordHref(withoutEntry(search))).toBe("/record?q=farm+bill&actor=player");
    expect(recordHref({})).toBe("/record");
  });

  it("turns the search into the selector's filter and says when anything narrows it", () => {
    expect(filterOf({ q: "tariff", domain: "Economy" })).toEqual({ query: "tariff", domain: "Economy" });
    expect(isFiltered({})).toBe(false);
    expect(isFiltered({ outcome: "hurt" })).toBe(true);
    expect(isFiltered({ entry: "ev-1" })).toBe(false);
  });

  it("reads the legacy views the same way", () => {
    expect(legacySearch({ view: "timeline" })).toEqual({ view: "timeline" });
    expect(legacySearch({ view: "comparison" })).toEqual({});
  });
});

describe("the Record screen", () => {
  it("shows the count of entries beside the filters, and each entry as a link that keeps the filters", () => {
    const markup = html();
    expect(markup).toMatch(/\d+ entries/);
    expect(markup).toContain("Search the Record");
    expect(markup).toContain(`href="/record?entry=${encodeURIComponent(firstId)}"`);
    expect(markup).toContain('data-detail="closed"');
  });

  it("says how many entries match and offers a way back once a filter narrows the list", () => {
    const markup = html({ q: "tariff" });
    expect(markup).toMatch(/2 of \d+ entries match/);
    expect(markup).toContain("Clear filters");
    expect(html({ q: "tariff" })).toContain(`href="/record?q=tariff&amp;entry=${encodeURIComponent(secondId)}"`);
  });

  it("says plainly when nothing matches", () => {
    expect(html({ q: "zeppelin" })).toContain("No entry matches those filters");
    expect(html({ q: "zeppelin" })).toContain("0 of");
  });

  it("opens the selected entry with its terms, its readings, its assessments and its related records", () => {
    const markup = html({}, firstId);
    expect(markup).toContain('data-detail="open"');
    expect(markup).toContain("Terms as recorded");
    expect(markup).toContain("Readings before and after");
    expect(markup).toContain("Agency assessments it caused");
    expect(markup).toContain("No agency assessment followed this entry.");
    expect(markup).toContain("Related records");
    expect(markup).toContain("What followed");
    expect(markup).toContain("Michigan plants answered the tariff.");
    expect(markup).toContain('aria-current="true"');
  });

  it("names a missing entry as one this administration's Record does not hold", () => {
    expect(html({}, "ev-nope")).toContain("holds no such entry");
  });

  it("puts each other view in its own tab panel", () => {
    expect(html({ view: "promises" })).toContain('aria-selected="true"');
    expect(html({ view: "standing" })).toContain("Polarization");
    expect(html({ view: "arcs" })).toMatch(/Story arcs|No story arc has opened/);
    expect(html({ view: "assessments" })).toContain("No assessments in the last 90 days");
  });

  it("shows an empty term as empty", () => {
    expect(html({}, undefined, opening)).toContain("Nothing recorded yet");
  });
});

function item(over: Partial<FeedItem>): FeedItem {
  return { turn: 1, kind: "npc-action", visibility: "public", headline: "A rival moved.", ...over } as FeedItem;
}

const foreign = Object.keys(opening.nations).find((id) => id !== opening.founding.nation)!;
const withFeed: Campaign = {
  ...opening,
  feed: [
    item({ headline: "A quiet first week." }),
    item({ turn: 3, headline: "A source reports troop movements.", visibility: "intelligence", actor: foreign as never }),
    item({ turn: 2, headline: "A neighbor moved.", actor: foreign as never }),
    item({ turn: 4, headline: "The order took effect.", kind: "player-action" }),
  ],
};

describe("a dispatch", () => {
  const open = (index: number) => renderToStaticMarkup(<Dispatch campaign={withFeed} index={index} />);

  it("sets journalism, an official notice and an intelligence summary in three different forms", () => {
    expect(open(2)).toContain("dispatch--journalism");
    expect(open(3)).toContain("ui-document");
    expect(open(3)).not.toContain("dispatch--journalism");
    expect(open(1)).toContain("dispatch--intelligence");
    expect(open(1)).toContain("Restricted distribution");
    expect(open(1)).not.toContain("dispatch__byline");
  });

  it("names its source, its date and the governments it is about", () => {
    const markup = open(2);
    expect(markup).toContain("News report");
    expect(markup).toContain(`href="/world/nation/${foreign}"`);
    expect(markup).toContain("Back to the press");
  });

  it("says plainly when the files hold no such story", () => {
    expect(open(99)).toContain("The files hold no such story");
    expect(open(Number.NaN)).toContain("The files hold no such story");
  });
});

describe("the ending and the legacy", () => {
  const ended: Campaign = { ...campaign, termClock: { ...campaign.termClock, outcome: "term-limited" } };

  it("says there is no ending while the term runs, and where to go instead", () => {
    const markup = renderToStaticMarkup(<Ending campaign={campaign} />);
    expect(markup).toContain("There is no ending to read yet");
    expect(markup).toContain('href="/brief"');
    expect(renderToStaticMarkup(<Legacy campaign={campaign} search={{}} onView={noop} />)).toContain("A legacy is written when the term ends");
  });

  it("reads the outcome, the decisions that marked the term, and where to go next, with a way past it", () => {
    const markup = renderToStaticMarkup(<Ending campaign={ended} />);
    expect(markup).toContain("Key decisions and consequences");
    expect(markup).toContain('href="#ending-next"');
    expect(markup).toContain('href="/legacy"');
    expect(markup).toContain('href="/record"');
    expect(markup).toContain('href="/administrations"');
  });

  it("compares the readings at the oath with the end state in a table, with the change in words", () => {
    const markup = renderToStaticMarkup(<Legacy campaign={ended} search={{}} onView={noop} />);
    expect(markup).toContain("Inherited baseline and end state");
    expect(markup).toContain("At the oath");
    expect(markup).toContain("At the end");
    expect(markup).toMatch(/No change|Up \d|Down \d/);
  });

  it("puts the timeline and the commitments in their own views", () => {
    expect(renderToStaticMarkup(<Legacy campaign={ended} search={{ view: "timeline" }} onView={noop} />)).toContain("Timeline of decisions");
    expect(renderToStaticMarkup(<Legacy campaign={ended} search={{ view: "record" }} onView={noop} />)).toContain("What the record holds");
  });
});
