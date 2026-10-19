import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LEGISLATIVE_ACTS, type Bill, type Campaign, type ChamberVote } from "@admin/engine";
import { congressSystem, settledBills } from "@admin/player-core";
import { NAMED_PALETTE, regionTable } from "../../map/__fixtures__/map-fixtures";
import { openingHarnessCampaign } from "../../map/harness/fixture";
import { resolveLens } from "../../map/lenses/registry";
import { ChamberPanel } from "./ChamberSeats";
import { Delegations } from "./Delegations";
import { Members } from "./Members";
import { SettledBills, Urgent } from "./FloorBusiness";
import { SenateNominationsView } from "./SenateNominations";
import { senateNominations } from "./senate-nominations";
import { countValence, ProjectedTally, RecordedTally } from "./Tally";
import { isCongressView, CONGRESS_VIEWS } from "./views";
import { RollCalls } from "./RollCall";

vi.mock("../../shell/Door", () => ({ Door: ({ href, children, className }: { href: string; children: unknown; className?: string }) => <a href={href} className={className}>{children as never}</a> }));

const table = regionTable();
const vote = (chamber: ChamberVote["chamber"], yeas: number, nays: number, required: number): ChamberVote => ({ chamber, yeas, nays, required, passed: yeas >= required });

function withSettledBills(base: Campaign, count: number): Campaign {
  const act = LEGISLATIVE_ACTS[0]!;
  const bills = Object.fromEntries(
    Array.from({ length: count }, (_, i): [string, Bill] => {
      const id = `bill:${act.id}:${i + 1}`;
      return [id, { id, act: act.id, title: `Settled bill ${i + 1}`, sponsor: "administration", introducedTurn: i + 1, status: "law", passage: [vote("house", 250, 180, 218), vote("senate", 60, 40, 51)], resolvedTurn: i + 2, enactedBy: "signed" }];
    }),
  );
  return { ...base, bills };
}

const base = openingHarnessCampaign();

describe("Congress views", () => {
  it("names the workspaces and rejects anything else", () => {
    expect(CONGRESS_VIEWS).toEqual(["overview", "bills", "nominations", "members", "delegations", "powers"]);
    expect(isCongressView("delegations")).toBe(true);
    expect(isCongressView("committees")).toBe(false);
    expect(isCongressView("map")).toBe(false);
    expect(isCongressView(undefined)).toBe(false);
  });
});

describe("chamber panel", () => {
  it("seats every recorded member, names who holds the chamber and draws each line it counts by", () => {
    const senate = congressSystem(base).chambers.find((chamber) => chamber.chamber === "senate")!;
    const html = renderToStaticMarkup(<ChamberPanel chamber={senate} mode="party" selection={{}} onSelect={() => undefined} />);
    expect(html.match(/class="hill-ring__seat"/g)).toHaveLength(senate.seats);
    expect(html).toContain("ui-party-mark");
    for (const label of ["Pass a bill", "End debate (cloture)", "Override a veto", "Uphold a veto"]) expect(html).toContain(label);
    expect(html).not.toContain("do not match the chamber");
    expect(html.match(/<a href="\/washington\/person\/[^"]+" data-member-seat="[^"]+" tabindex="-1">/g)).toHaveLength(senate.members.filter((member) => member.href).length);
  });

  it("colors every state's delegation on the Hill lenses", () => {
    for (const id of ["house", "senate", "delegation-warmth"]) {
      const lens = resolveLens(id, base, NAMED_PALETTE);
      const states = table.regions.filter((region) => region.layer === "states");
      expect(states).toHaveLength(51);
      expect(states.every((region) => lens.read(region, "state") !== null)).toBe(true);
    }
  });

  it("says so when the seated members disagree with the chamber's count", () => {
    const senate = congressSystem(base).chambers.find((chamber) => chamber.chamber === "senate")!;
    const html = renderToStaticMarkup(<ChamberPanel chamber={{ ...senate, recordsDisagree: true }} mode="party" selection={{}} onSelect={() => undefined} />);
    expect(html).toContain("do not match the chamber");
  });
});

describe("recorded vote and staff projection", () => {
  it("does not present stored forecasts as votes that were taken", () => {
    const bill = Object.values(withSettledBills(base, 1).bills)[0]!;
    const projected = { ...vote("senate", 55, 45, 51), cloture: vote("senate", 58, 42, 60) };
    expect(renderToStaticMarkup(<RollCalls campaign={base} bill={{ ...bill, passage: [projected] }} />)).toBe("");
    const debated = { ...projected, cloture: { ...projected.cloture, recordedTurn: 3 } };
    const html = renderToStaticMarkup(<RollCalls campaign={base} bill={{ ...bill, passage: [debated] }} />);
    expect(html).toContain("Recorded roll calls");
    expect(html).toContain("Senate passage: cloture");
    expect(html).not.toContain("Senate passage is a historical tally");
  });

  it("states a completed tally exactly and with a solid recorded treatment", () => {
    const html = renderToStaticMarkup(<RecordedTally votes={[vote("house", 250, 180, 218)]} />);
    expect(html).toContain("tally--recorded");
    expect(html).toContain("Recorded vote");
    expect(html).toContain("250 yea, 180 nay");
    expect(html).not.toContain("Staff projection");
  });

  it("names a missing vote instead of leaving a blank", () => {
    expect(renderToStaticMarkup(<RecordedTally votes={[]} />)).toContain("No vote was taken");
  });

  it("words a projection as one and never prints nays", () => {
    const html = renderToStaticMarkup(<ProjectedTally counts={[{ chamber: "house", name: "House", yeas: 230, required: 218, seats: 435, passed: true }]} />);
    expect(html).toContain("tally--projected");
    expect(html).toContain("Public support assessment");
    expect(html).toContain("218 of 435 needed · unresolved");
    expect(html).not.toContain("230");
    expect(html).not.toContain("nay");
    expect(html).not.toContain("Recorded vote");
  });
});

describe("settled bills", () => {
  it("reaches all 69 and says how many lead the view", () => {
    const campaign = withSettledBills(base, 69);
    expect(settledBills(campaign, Number.POSITIVE_INFINITY)).toHaveLength(69);
    const html = renderToStaticMarkup(<SettledBills campaign={campaign} />);
    expect(html).toContain("8 of 69 settled bills");
    expect(html).toContain("Show all 69");
    expect(html).toContain("Recorded vote");
  });

  it("shows a short list whole with no toggle", () => {
    const html = renderToStaticMarkup(<SettledBills campaign={withSettledBills(base, 3)} />);
    expect(html).not.toContain("Show all");
    expect(html.match(/Settled bill \d/g)).toHaveLength(3);
  });

  it("names the empty state", () => {
    expect(renderToStaticMarkup(<SettledBills campaign={base} />)).toContain("No bill has become law, been vetoed or died this term.");
  });
});

describe("urgent business", () => {
  it("says plainly that nothing awaits a signature", () => {
    expect(renderToStaticMarkup(<Urgent campaign={base} />)).toContain("Nothing awaits your signature or veto.");
  });
});

describe("nominations", () => {
  it("separates names before the Senate from names still being prepared", () => {
    const { before, preparing } = senateNominations(base, 0);
    expect(before).toEqual([]);
    expect(preparing).toEqual([]);
    expect(renderToStaticMarkup(<SenateNominationsView campaign={base} />)).toContain("No nomination is open.");
  });
});

describe("state delegations", () => {
  it("ranks every state and leaves a path to all of them", () => {
    const html = renderToStaticMarkup(<Delegations campaign={base} />);
    expect(html).toContain("1–10 of 51 delegations");
    expect(html).toContain("Show all 51");
    expect(html).toContain('aria-sort="descending"');
    expect(html.match(/aria-sort=/g)).toHaveLength(4);
  });
});

describe("voting members", () => {
  it("lists every seat in a sortable, paged table", () => {
    const html = renderToStaticMarkup(<Members campaign={base} />);
    const seats = base.congress.members?.length ?? 0;
    expect(seats).toBe(535);
    expect(html).toContain(`1–20 of ${seats} members`);
    expect(html.match(/aria-sort=/g)).toHaveLength(5);
    expect(html).toContain('aria-sort="ascending"');
  });
});

describe("count valence", () => {
  const count = (yeas: number) => ({ chamber: "senate" as const, name: "Senate", yeas, required: 51, seats: 100, passed: yeas >= 51, supportKnown: true });

  it("does not color private future totals as evidence", () => {
    expect(countValence({ ...count(70), supportKnown: false })).toBe("neutral");
  });

  it("reads a clear passage count as good and a short one as bad", () => {
    expect(countValence(count(60))).toBe("good");
    expect(countValence(count(40))).toBe("bad");
  });

  it("reads an override that clears its line as the President losing", () => {
    expect(countValence(count(70), true)).toBe("bad");
    expect(countValence(count(40), true)).toBe("good");
  });

  it("calls a count within two percent of the line a watch", () => {
    expect(countValence(count(52))).toBe("watch");
  });
});
